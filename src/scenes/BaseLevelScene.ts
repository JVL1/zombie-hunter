import Phaser from 'phaser';
import { Assets } from '../assets';
import { BOSS, GAME_H, GAME_W, POWERUPS, SHOP, WORLD, ZOMBIE, ZombieVariant } from '../config';
import { GameState } from '../core/GameState';
import { InputController } from '../core/InputController';
import { Juice } from '../core/Juice';
import { SynthAudio } from '../core/SynthAudio';
import { Boss } from '../entities/Boss';
import type { BossEncounter } from '../entities/BossEncounter';
import { Hittable } from '../entities/Hittable';
import { AttackEvent, Player, SlamEvent } from '../entities/Player';
import { Pickup } from '../entities/Pickups';
import { Zombie } from '../entities/Zombie';

// A self-driving water enemy (Fish/Eel): a Hittable that also updates from the
// scene clock. The base owns the group + all combat plumbing; Task 15 populates
// it from def.water. Left empty, it is a no-op on Levels 1-3.
type WaterEnemy = Phaser.GameObjects.GameObject &
  Hittable & { update(time: number, delta: number): void };
import { dustPuff, floatText, lit, shockwave } from '../fx/Effects';
import { GoreSystem } from '../fx/Splatter';
import { LevelDef } from '../levels';

interface ParallaxLayer {
  sprite: Phaser.GameObjects.TileSprite;
  factor: number;
}

interface SummonEvent {
  x: number;
  variant: ZombieVariant;
  count: number;
  maxAlive: number;
}

// Shared level machinery: world building, combat wiring, the boss encounter,
// and the update loop — all parameterized by a LevelDef. Subclasses provide
// the theme (ambience, optional backdrop/terrain overrides).
export abstract class BaseLevelScene extends Phaser.Scene {
  protected controls!: InputController;
  protected juice!: Juice;
  protected gore!: GoreSystem;
  private gameState = GameState.getInstance();

  protected player!: Player;
  protected solids!: Phaser.Physics.Arcade.StaticGroup;
  protected zombies!: Phaser.GameObjects.Group;
  // Fish/eel live in their own group so land-zombie wiring is untouched; both
  // groups flow through the same Hittable combat/contact/straggler plumbing.
  protected waterEnemies!: Phaser.GameObjects.Group;
  protected pickups!: Phaser.GameObjects.Group;
  private contactCooldown = new Map<Hittable, number>();

  private boss: BossEncounter | null = null;
  private bossTriggered = false;
  private cinematic = false;
  private lastBossHitTime = 0;
  private bossHealthBar: Phaser.GameObjects.Rectangle | null = null;
  private bossHealthBarBg: Phaser.GameObjects.Rectangle | null = null;
  private bossNameText: Phaser.GameObjects.Text | null = null;

  private bgLayers: ParallaxLayer[] = [];
  protected fogFar!: Phaser.GameObjects.TileSprite;
  protected fogNear!: Phaser.GameObjects.TileSprite;
  protected fogDriftMultiplier = 1;
  // Accumulated fog-drift time. Multiplying absolute elapsed time by
  // fogDriftMultiplier would retroactively re-scale the whole session when the
  // multiplier changes (a visible fog teleport) — so only accumulate deltas.
  private fogTime = 0;
  protected flickerLights: Array<{ light: Phaser.GameObjects.Light; base: number; seed: number }> =
    [];

  protected constructor(protected def: LevelDef) {
    super({ key: def.sceneKey });
  }

  create() {
    // Scene event listeners would stack across restarts — clear ours first
    this.events.off('player-attack');
    this.events.off('player-slam');
    this.events.off('player-slam-land');
    this.events.off('player-died');
    this.events.off('player-revived');
    this.events.off('boss-shockwave');
    this.events.off('boss-summon');

    this.boss = null;
    this.bossTriggered = false;
    this.cinematic = false;
    this.bgLayers = [];
    this.flickerLights = [];
    this.contactCooldown.clear();
    this.lastBossHitTime = 0;
    this.fogDriftMultiplier = 1;
    this.fogTime = 0;
    this.bossHealthBar = null;
    this.bossHealthBarBg = null;
    this.bossNameText = null;
    this.gameState.resetRun();

    this.controls = new InputController(this);
    this.juice = new Juice(this);

    const isWebGL = this.sys.renderer.type === Phaser.WEBGL;
    if (isWebGL) {
      this.lights.enable().setAmbientColor(this.def.ambientColor);
      const cam = this.cameras.main;
      cam.postFX.addVignette(0.5, 0.5, 0.93, 0.42);
      cam.postFX.addBloom(0xffffff, 1, 1, 1.1, 0.6, 2);
    }

    this.physics.world.setBounds(0, 0, this.def.worldWidth, WORLD.height);

    // The base owns the solids group and fog strips so terrain/backdrop
    // overrides can't leave create()/update() dereferencing undefined state
    this.solids = this.physics.add.staticGroup();
    this.buildBackdrop();
    this.buildFog();
    this.buildTerrain();
    this.buildAmbience(isWebGL);

    // --- Player ---
    this.player = new Player(this, this.def.playerSpawnX, 420, this.controls);
    this.player.setDepth(6);
    this.physics.add.collider(this.player, this.solids);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.def.worldWidth, WORLD.height);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setDeadzone(110, 70);

    // --- Gore (decals render above terrain) ---
    this.gore = new GoreSystem(this, this.def.worldWidth, WORLD.height, 4);

    // --- Zombies ---
    this.zombies = this.add.group();
    // First zombie sits outside aggro+patrol reach of the spawn point
    for (const spawn of this.def.zombieSpawns) {
      const zombie = new Zombie(this, spawn.x, spawn.y ?? this.zombieSpawnY(spawn.variant), spawn.variant);
      zombie.setTarget(this.player);
      zombie.setDepth(5);
      this.zombies.add(zombie);
    }
    this.physics.add.collider(this.zombies, this.solids);

    // --- Water enemies (fish/eel) ---
    // Empty infrastructure here; Task 15 populates it from def.water on Level 4.
    // No solid collider — fish/eel are neutral-buoyancy hoverers, not grounded.
    this.waterEnemies = this.add.group();

    // --- Pickups ---
    this.pickups = this.add.group();
    this.physics.add.collider(this.pickups, this.solids);
    this.physics.add.overlap(this.player, this.pickups, (_p, pickupObj) => {
      const pickup = pickupObj as Pickup;
      const wasKey = pickup.kind === 'key';
      pickup.collect(this.player);
      if (wasKey) this.onKeyCollected();
    });

    // --- Contact damage --- (zombies + water enemies share the cooldown map)
    this.physics.add.overlap(this.player, this.zombies, (_p, zombieObj) => {
      this.handleContact(zombieObj as Zombie);
    });
    this.physics.add.overlap(this.player, this.waterEnemies, (_p, enemyObj) => {
      this.handleContact(enemyObj as WaterEnemy);
    });

    this.wireCombatEvents();
    this.createBoss();

    this.events.on('player-died', () => {
      SynthAudio.stopMusic();
      SynthAudio.gameOver();
      this.cameras.main.fadeOut(900, 0, 0, 0);
      this.time.delayedCall(1000, () => {
        this.scene.stop('HUD');
        this.scene.start('GameOver');
      });
    });

    this.scene.launch('HUD');

    // Audio: should already be unlocked from the menu, but cover direct loads
    this.input.keyboard!.on('keydown', () => SynthAudio.unlock());
    SynthAudio.unlock();
    SynthAudio.startMusic();

    cam.fadeIn(500, 0, 0, 0);

    // Debug physics toggle
    this.input.keyboard!.addKey('P').on('down', () => {
      this.physics.world.drawDebug = !this.physics.world.drawDebug;
      if (!this.physics.world.drawDebug) this.physics.world.debugGraphic.clear();
    });

    // Level intro banner
    const banner = this.add
      .text(GAME_W / 2, 170, this.def.name, {
        fontFamily: 'monospace',
        fontSize: '30px',
        color: '#ffd700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50);
    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 1400,
      duration: 1100,
      onComplete: () => banner.destroy(),
    });
  }

  // ------------------------------------------------------------------
  // Theme hooks — subclasses provide ambience and may override the rest
  // ------------------------------------------------------------------

  protected abstract buildAmbience(isWebGL: boolean): void;

  protected buildBackdrop(): void {
    this.buildBackdropBase();
  }

  protected buildTerrain(): void {
    this.buildTerrainBase();
  }

  // ------------------------------------------------------------------
  // World building
  // ------------------------------------------------------------------

  protected buildBackdropBase() {
    this.add.image(0, 0, Assets.SKY).setOrigin(0).setScrollFactor(0).setDepth(-10);

    this.add
      .image(770, 95, Assets.GLOW)
      .setScrollFactor(0.04)
      .setDepth(-9.6)
      .setScale(4)
      .setTint(0xffbb88)
      .setAlpha(0.5);
    this.add.image(770, 95, Assets.MOON).setScrollFactor(0.04).setDepth(-9.5);

    const scale = GAME_H / 324;
    const mkLayer = (key: string, factor: number, depth: number) => {
      const ts = this.add
        .tileSprite(0, 0, GAME_W / scale + 4, 324, key)
        .setOrigin(0)
        .setScale(scale)
        .setScrollFactor(0)
        .setDepth(depth);
      this.bgLayers.push({ sprite: ts, factor });
    };
    this.def.parallax.forEach((layer, i) => {
      mkLayer(layer.key, layer.factor, -9 + i);
    });

  }

  // Screen-space fog is base-owned (created in create(), not in an
  // overridable hook) — update() drifts it unconditionally every frame
  private buildFog() {
    this.fogFar = this.add
      .tileSprite(0, GAME_H - 220, GAME_W, 80, Assets.FOG)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-6)
      .setAlpha(0.5)
      .setScale(1, 1.6);
    this.fogNear = this.add
      .tileSprite(0, GAME_H - 130, GAME_W, 80, Assets.FOG)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(9)
      .setAlpha(0.28)
      .setScale(1.4, 1.4);
  }

  protected buildTerrainBase() {
    // Ground: two tile rows across the level
    for (let x = 0; x < this.def.worldWidth; x += 32) {
      lit(this.solids.create(x + 16, WORLD.groundY + 16, this.def.textures.groundTop).setDepth(3));
      lit(this.solids.create(x + 16, WORLD.groundY + 48, this.def.textures.groundFill).setDepth(3));
    }

    // Floating platforms (concrete slabs)
    for (const [x, y, count] of this.def.platforms) {
      for (let i = 0; i < count; i++) {
        lit(this.solids.create(x + i * 32 + 16, y, this.def.textures.platform).setDepth(3));
      }
    }

    // Stepping-stone staircases (Henry & Josh's vertical combat feature).
    // First stone must leave >56px under it so the player can walk beneath.
    for (const [startX, baseY, steps, stepH, stepOff] of this.def.stairs) {
      for (let i = 0; i < steps; i++) {
        lit(
          this.solids
            .create(startX + i * stepOff, baseY - i * stepH, this.def.textures.stone)
            .setDepth(3)
        );
      }
    }
  }

  // ------------------------------------------------------------------
  // Combat wiring
  // ------------------------------------------------------------------

  // Shared contact-damage gate for both zombies and water enemies, keyed by the
  // one cooldown map so a swimmer and a zombie can't stack hits within a tick.
  private handleContact(h: Hittable) {
    if (h.isDead() || this.player.isDying) return;
    const now = this.time.now;
    const last = this.contactCooldown.get(h) ?? 0;
    if (now - last > ZOMBIE.contactCooldownMs) {
      this.contactCooldown.set(h, now);
      this.player.takeDamage(h.contactDamage, h.x, 'contact');
    }
  }

  private wireCombatEvents() {
    this.events.on('player-attack', ({ hitbox, damage, isFinisher }: AttackEvent) => {
      const zc = this.physics.add.overlap(hitbox, this.zombies, (_hb, zombieObj) => {
        this.applyHit(hitbox, zombieObj as Zombie, damage, isFinisher, false);
      });
      const wc = this.physics.add.overlap(hitbox, this.waterEnemies, (_hb, enemyObj) => {
        this.applyHit(hitbox, enemyObj as WaterEnemy, damage, isFinisher, false);
      });
      hitbox.once('destroy', () => {
        zc.destroy();
        wc.destroy();
      });
      this.wireBossHit(hitbox, damage, isFinisher, false);
    });

    this.events.on('player-slam', ({ hitbox, damage }: SlamEvent) => {
      const zc = this.physics.add.overlap(hitbox, this.zombies, (_hb, zombieObj) => {
        this.applyHit(hitbox, zombieObj as Zombie, damage, true, true);
      });
      const wc = this.physics.add.overlap(hitbox, this.waterEnemies, (_hb, enemyObj) => {
        this.applyHit(hitbox, enemyObj as WaterEnemy, damage, true, true);
      });
      hitbox.once('destroy', () => {
        zc.destroy();
        wc.destroy();
      });
      this.wireBossHit(hitbox, damage, true, true);
    });

    this.events.on('player-slam-land', ({ x, y }: { x: number; y: number }) => {
      SynthAudio.slam();
      shockwave(this, x, y, 1.8);
      dustPuff(this, x, y, 10);
      this.juice.shake(0.006, 130);
    });

    this.events.on('boss-shockwave', ({ x }: { x: number; y: number }) => {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (
        body.blocked.down &&
        Math.abs(this.player.x - x) < BOSS.shockwaveRange &&
        !this.player.isInvulnerable
      ) {
        this.player.takeDamage(BOSS.shockwaveDamage, x, 'contact');
      }
    });

    // Boss summons minions: cap counts only live (non-dying) zombies so
    // corpses mid-death-animation don't starve the cap during gore-heavy fights
    this.events.on('boss-summon', ({ x, variant, count, maxAlive }: SummonEvent) => {
      const alive = this.zombies
        .getChildren()
        .filter((z) => z.active && !(z as Zombie).isDead()).length;
      const room = Math.max(0, maxAlive - alive);
      for (let i = 0; i < Math.min(count, room); i++) {
        const side = i % 2 === 0 ? -1 : 1;
        let zx = Phaser.Math.Clamp(
          x + side * (90 + i * 30),
          this.def.arenaLeft + 60,
          this.def.worldWidth - 60
        );
        // Never materialize on top of the player — that's an unreactable hit
        if (Math.abs(zx - this.player.x) < 70) {
          zx = Phaser.Math.Clamp(
            zx + (zx >= this.player.x ? 80 : -80),
            this.def.arenaLeft + 60,
            this.def.worldWidth - 60
          );
        }
        const z = new Zombie(this, zx, this.zombieSpawnY(variant), variant);
        z.setTarget(this.player);
        z.setDepth(5);
        this.zombies.add(z);
        dustPuff(this, zx, WORLD.groundY - 10, 8);
      }
    });
  }

  // Spawn with the body bottom 8px ABOVE the ground so every variant lands
  // cleanly. A body that spawns overlapping the ground-top tile is flagged
  // embedded — arcade skips separation, it sinks through onto the fill row
  // and then wedges against tile seams whenever it walks (frozen zombies).
  private zombieSpawnY(variant: ZombieVariant): number {
    const v = ZOMBIE.variants[variant];
    const bodyBottomOffset = (v.base === 'urban' ? 64 : 48) * v.scale;
    return WORLD.groundY - 8 - bodyBottomOffset;
  }

  private applyHit(
    hitbox: Phaser.GameObjects.Rectangle,
    h: Hittable,
    damage: number,
    big: boolean,
    isSlam: boolean
  ) {
    if (h.isDead() || !h.active) return;
    const hitSet = hitbox.getData('hitSet') as Set<unknown>;
    if (hitSet.has(h)) return;
    hitSet.add(h);

    const died = h.takeHit(damage);
    SynthAudio.splat(big);
    this.gore.burst(h.x, h.y, died);

    if (isSlam) {
      this.player.pogoBounce();
      this.juice.hitStop(60);
      this.juice.shake(0.005, 100);
    } else if (big) {
      this.juice.hitStop(50);
      this.juice.shake(0.004, 90);
    }

    if (died) {
      this.onEnemyKilled(h);
    }
  }

  private wireBossHit(
    hitbox: Phaser.GameObjects.Rectangle,
    damage: number,
    big: boolean,
    isSlam: boolean
  ) {
    if (!this.boss) return;
    // The encounter owns the overlap, the per-swing hitSet guard, and its own
    // takeDamage; it reports each connect back here so the scene keeps owning the
    // FX, the slam feedback, and onBossDefeated. (The vulnerable/dead early-out
    // now lives inside wireAttackHitbox.)
    this.boss.wireAttackHitbox(hitbox, damage, isSlam, (x, y, died) => {
      SynthAudio.splat(big);
      this.gore.burst(x, y, big);
      if (isSlam) {
        this.player.pogoBounce();
        this.juice.hitStop(60);
      }
      if (died) this.onBossDefeated();
    });
  }

  // Shared kill-reward path for every Hittable. Coins + kill-streak credit are
  // universal (design ruling: fish/eel reward like a zombie kill); the power-orb
  // and heart drops are zombie-variant specific, so they stay behind an
  // instanceof branch that fish/eel simply skip.
  private onEnemyKilled(h: Hittable) {
    SynthAudio.splat(true);
    this.gore.stampDecal(h.x, (h.body as Phaser.Physics.Arcade.Body).bottom, true);

    const streak = this.gameState.registerKill(this.time.now);
    if (streak >= 2) {
      floatText(this, h.x, h.y - 60, `COMBO x${streak}`, '#ff8833', 15);
    }

    this.pickups.add(new Pickup(this, h.x, h.y - 20, 'coin'));
    if (h instanceof Zombie) {
      if (h.powerUp) {
        this.pickups.add(new Pickup(this, h.x, h.y - 30, 'orb', h.powerUp));
        if (h.displayName) {
          const hex = `#${POWERUPS[h.powerUp].color.toString(16).padStart(6, '0')}`;
          floatText(this, h.x, h.y - 84, `${h.displayName} DOWN!`, hex, 16);
        }
      }
      if (Math.random() < ZOMBIE.heartDropChance) {
        this.pickups.add(new Pickup(this, h.x + 14, h.y - 24, 'heart'));
      }
    }

    this.contactCooldown.delete(h);
    h.die();
  }

  // ------------------------------------------------------------------
  // Boss encounter
  // ------------------------------------------------------------------

  private createBoss() {
    // The one concrete construction site — everything downstream is the interface.
    const boss = new Boss(this, this.def.bossSpawnX, WORLD.groundY - 80, this.juice, this.def.boss);
    boss.setTarget(this.player);
    this.boss = boss;

    // Solids collision + player contact damage wire against the encounter's own
    // body/bodies (walker: one; kraken: head + tentacles). The FIGHTING/CHARGING/
    // LEAPING gate is now the encounter's contactDamageActive flag.
    for (const body of boss.contactBodies) {
      this.physics.add.collider(body.gameObject, this.solids);
      this.physics.add.overlap(this.player, body.gameObject, (_p, bossObj) => {
        if (!this.boss || !this.boss.contactDamageActive) return;
        const now = this.time.now;
        if (now - this.lastBossHitTime > 1000 && !this.player.isDying) {
          this.lastBossHitTime = now;
          this.player.takeDamage(
            this.boss.contactDamage,
            (bossObj as Phaser.GameObjects.Sprite).x,
            'contact'
          );
        }
      });
    }
  }

  private triggerBossEncounter() {
    if (!this.boss) return;
    this.bossTriggered = true;
    this.cinematic = true;

    // Letterbox bars
    const barTop = this.add
      .rectangle(GAME_W / 2, -30, GAME_W, 60, 0x000000)
      .setScrollFactor(0)
      .setDepth(100);
    const barBot = this.add
      .rectangle(GAME_W / 2, GAME_H + 30, GAME_W, 60, 0x000000)
      .setScrollFactor(0)
      .setDepth(100);
    this.tweens.add({ targets: barTop, y: 26, duration: 400 });
    this.tweens.add({ targets: barBot, y: GAME_H - 26, duration: 400 });

    const cam = this.cameras.main;
    cam.stopFollow();
    cam.pan(this.def.bossSpawnX - 50, 280, 1100, 'Power2');

    this.time.delayedCall(1300, () => {
      if (!this.boss) return;
      this.boss.triggerRise();

      this.pickups.getChildren().forEach((pickupObj) => {
        const pickup = pickupObj as Pickup;
        if (pickup.active && pickup.kind === 'orb') pickup.magnetize();
      });

      // Clear stragglers before shrinking the world
      this.zombies.getChildren().slice().forEach((z) => (z as Zombie).destroy());
      this.waterEnemies.getChildren().slice().forEach((e) => (e as WaterEnemy).destroy());
      this.contactCooldown.clear();

      this.time.delayedCall(1100, () => {
        this.physics.world.setBounds(
          this.def.arenaLeft,
          0,
          this.def.worldWidth - this.def.arenaLeft,
          WORLD.height
        );
        cam.setBounds(
          this.def.arenaLeft,
          0,
          this.def.worldWidth - this.def.arenaLeft,
          WORLD.height
        );
        cam.startFollow(this.player, true, 0.12, 0.12);
        this.showBossHealthBar();
        this.cinematic = false;

        this.tweens.add({ targets: barTop, y: -30, duration: 400 });
        this.tweens.add({ targets: barBot, y: GAME_H + 30, duration: 400, onComplete: () => {
          barTop.destroy();
          barBot.destroy();
        } });
      });
    });
  }

  private showBossHealthBar() {
    this.bossNameText = this.add
      .text(GAME_W / 2, 38, this.def.boss.name, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ff3333',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);
    this.bossHealthBarBg = this.add
      .rectangle(GAME_W / 2, 58, 364, 16, 0x1a1a1a)
      .setScrollFactor(0)
      .setDepth(101)
      .setStrokeStyle(2, 0x550000);
    this.bossHealthBar = this.add
      .rectangle(GAME_W / 2 - 180, 58, 360, 10, 0xdd2222)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(102);
  }

  private onBossDefeated() {
    if (!this.boss) return;
    // Read the corpse anchor through the interface: the first contact body's
    // gameObject is the boss sprite (its x/y match the old this.boss.x/y) and its
    // body.bottom is the ground contact used for the blood decals.
    const bossSprite = this.boss.contactBodies[0].gameObject as Phaser.GameObjects.Sprite;
    const bossX = bossSprite.x;
    const bossY = bossSprite.y;
    const bossBottom = this.boss.contactBodies[0].bottom;

    SynthAudio.roar();
    this.juice.slowMo(900, 0.3);
    this.juice.zoomPunch(0.12, 500);
    this.juice.shake(0.012, 400);

    this.gore.burst(bossX, bossY - 30, true);
    this.gore.burst(bossX - 30, bossY + 10, true);
    this.gore.burst(bossX + 30, bossY, true);
    this.gore.stampDecal(bossX, bossBottom, true);
    this.gore.stampDecal(bossX - 40, bossBottom, true);
    this.gore.stampDecal(bossX + 40, bossBottom, true);

    // Corpse presentation (throne sink + death anim + delayed destroy) lives in
    // the encounter now; it returns the key-drop spot.
    const keySpot = this.boss.playDeath();
    this.bossHealthBar?.destroy();
    this.bossHealthBarBg?.destroy();
    this.bossNameText?.destroy();
    this.bossHealthBar = null;
    this.boss = null;

    // Summoned minions pop when their king dies — no stragglers past the fight
    this.zombies
      .getChildren()
      .slice()
      .forEach((zObj) => {
        const z = zObj as Zombie;
        this.gore.burst(z.x, z.y, false);
        z.destroy();
      });
    this.waterEnemies
      .getChildren()
      .slice()
      .forEach((eObj) => {
        const e = eObj as WaterEnemy;
        this.gore.burst(e.x, e.y, false);
        e.destroy();
      });
    this.contactCooldown.clear();

    // The level key floats down at the encounter's returned spot (== bossY - 60)
    this.time.delayedCall(800, () => {
      this.pickups.add(new Pickup(this, keySpot.x, keySpot.y, 'key'));
    });

    // Boss bounty: a burst of coins around the corpse
    for (let i = 0; i < SHOP.bossCoinBurst; i++) {
      const spread = (i - (SHOP.bossCoinBurst - 1) / 2) * 18;
      this.pickups.add(new Pickup(this, bossX + spread, bossY - 40, 'coin'));
    }
  }

  private onKeyCollected() {
    this.gameState.collectKey(this.def.keyIndex);
    floatText(
      this,
      this.player.x,
      this.player.y - 60,
      `KEY #${this.def.keyIndex + 1}!`,
      '#ffd700',
      20
    );
    SynthAudio.stopMusic();
    this.time.delayedCall(1500, () => {
      SynthAudio.victory();
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.time.delayedCall(900, () => {
        this.scene.stop('HUD');
        this.scene.start('Victory');
      });
    });
  }

  // ------------------------------------------------------------------

  update(time: number, delta: number) {
    this.controls.update();

    if (this.cinematic) {
      // Slide buff expiries forward every frozen frame — giant/aura effects
      // must never flicker off mid-cutscene.
      this.gameState.extendBuffs(delta, this.time.now);
    } else {
      this.player.update();
    }

    for (const z of this.zombies.getChildren().slice()) {
      if (z.active) (z as Zombie).update(time, delta);
    }

    for (const e of this.waterEnemies.getChildren().slice()) {
      if (e.active) (e as WaterEnemy).update(time, delta);
    }

    for (const p of this.pickups.getChildren()) {
      (p as Pickup).updateMagnet(this.player);
    }

    // Parallax + fog drift
    const camX = this.cameras.main.scrollX;
    for (const layer of this.bgLayers) {
      layer.sprite.tilePositionX = (camX * layer.factor) / layer.sprite.scaleX;
    }
    this.fogTime += delta * this.fogDriftMultiplier;
    this.fogFar.tilePositionX = camX * 0.2 + this.fogTime * 0.008;
    this.fogNear.tilePositionX = camX * 0.9 + this.fogTime * 0.015;

    // Light flicker
    for (const f of this.flickerLights) {
      f.light.setIntensity(
        f.base + Math.sin(time * 0.013 + f.seed) * 0.12 + (Math.random() - 0.5) * 0.1
      );
    }

    // Boss
    if (!this.bossTriggered && this.player.x > this.def.triggerX) {
      this.triggerBossEncounter();
    }
    if (this.boss && !this.boss.isDead()) {
      this.boss.update(time, delta);
      if (this.bossHealthBar) {
        this.bossHealthBar.width = 360 * Math.max(0, this.boss.healthRatio);
      }
    }
  }
}
