import Phaser from 'phaser';
import { Assets, CandyAnims } from '../assets';
import { BOSS, CANDY, GAME_H, GAME_W, POWERUPS, SHOP, WATER, WORLD, ZOMBIE, ZombieVariant } from '../config';
import { AirState, createAirState, grantScuba, restoreAir, scubaHit, tickAir } from '../core/air';
import {
  collect as collectSourCandy,
  createSourCandyState,
  knockLoose,
  tryFeed,
  type SourCandyState,
} from '../core/sourCandy';
import { DamageOutcome } from '../core/damage';
import { GameState } from '../core/GameState';
import { InputController } from '../core/InputController';
import { Juice } from '../core/Juice';
import { SynthAudio } from '../core/SynthAudio';
import { inVent, shouldCrackScuba } from '../core/water';
import { Boss } from '../entities/Boss';
import type { BossEncounter } from '../entities/BossEncounter';
import { Chocolate } from '../entities/candy/Chocolate';
import { Gumball } from '../entities/candy/Gumball';
import { GummyBear } from '../entities/candy/GummyBear';
import { Eel } from '../entities/Eel';
import { Fish } from '../entities/Fish';
import { Hittable } from '../entities/Hittable';
import { Kraken } from '../entities/Kraken';
import { AttackEvent, DamageSource, Player, SlamEvent } from '../entities/Player';
import { Pickup } from '../entities/Pickups';
import { Worm } from '../entities/Worm';
import { Zombie } from '../entities/Zombie';
import { dustPuff, floatText, lit, shockwave } from '../fx/Effects';
import { GoreSystem } from '../fx/Splatter';
import { CandyDef, CandyEnemyKind, LevelDef, WaterDef } from '../levels';

// A self-driving non-zombie enemy (Level 4 fish/eel, Level 5 gummy bears,
// gumballs, chocolate zombies): a Hittable that also updates from the scene
// clock. The base owns the group + all combat plumbing; def.water and
// def.candy populate it. Left empty, it is a no-op on Levels 1-3.
type ExtraEnemy = Phaser.GameObjects.GameObject &
  Hittable & { update(time: number, delta: number): void };

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
  // Fish/eel and candy enemies live in their own group so land-zombie wiring
  // is untouched; both groups flow through the same Hittable combat/contact/
  // straggler plumbing.
  protected extraEnemies!: Phaser.GameObjects.Group;
  protected pickups!: Phaser.GameObjects.Group;

  // Level 5 (Wes's Sugar Rush Zone): marshmallow bounce pads and the player's
  // sour candy pocket. Null/empty on every other level (no def.candy).
  protected pads: Phaser.Physics.Arcade.StaticGroup | null = null;
  private sourCandy: SourCandyState | null = null;
  private portalOpen = false;
  private contactCooldown = new Map<Hittable, number>();

  // Breathing/scuba runtime for water levels. Null on Levels 1-3 (no def.water);
  // Task 13 only establishes it + the scuba grant, Task 15 drives the tick loop.
  protected air: AirState | null = null;
  // Water levels only: the intro banner freezes air drain (mirrors the boss
  // cinematic freeze) until it fades; and a ~2s cadence records the underwater
  // safe respawn anchor.
  private introFreezeActive = false;
  private safePosTimer = 0;

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
    this.events.off('player-hurt');
    this.events.off('boss-shockwave');
    this.events.off('boss-summon');
    this.events.off('gummy-split');
    this.events.off('worm-summon');

    this.boss = null;
    this.pads = null;
    this.sourCandy = null;
    this.portalOpen = false;
    this.bossTriggered = false;
    this.cinematic = false;
    this.air = null;
    this.introFreezeActive = false;
    this.safePosTimer = 0;
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
      // Level 4: clamp swim ('drowned') variants below the water surface. No-op
      // for non-swim variants and for every Level 1-3 zombie (no def.water).
      if (this.def.water) zombie.setWaterProfile(this.def.water);
      this.zombies.add(zombie);
    }
    this.physics.add.collider(this.zombies, this.solids);

    // --- Water enemies (fish/eel) ---
    // Empty infrastructure here; Task 15 populates it from def.water on Level 4.
    // No solid collider — fish/eel are neutral-buoyancy hoverers, not grounded.
    this.extraEnemies = this.add.group();

    // --- Pickups ---
    this.pickups = this.add.group();
    this.physics.add.collider(this.pickups, this.solids);
    this.physics.add.overlap(this.player, this.pickups, (_p, pickupObj) => {
      const pickup = pickupObj as Pickup;
      // A full candy pocket leaves the candy on the ground for later.
      if (
        pickup.kind === 'sourCandy' &&
        (!this.sourCandy || this.sourCandy.count >= CANDY.sourCandyCap)
      ) {
        return;
      }
      const wasKey = pickup.kind === 'key';
      const wasScuba = pickup.kind === 'scuba';
      const wasSourCandy = pickup.kind === 'sourCandy';
      pickup.collect(this.player);
      if (wasKey) this.onKeyCollected();
      if (wasScuba) this.onScubaCollected();
      if (wasSourCandy) this.onSourCandyCollected();
    });

    // --- Water level: breathing state, swim profiles, vents, fish/eel (L4) ---
    if (this.def.water) {
      this.setupWaterLevel(this.def.water);
    }

    // --- Candy level: marshmallows, candy enemies, sour candy (L5, Wes) ---
    if (this.def.candy) {
      this.setupCandyLevel(this.def.candy);
    }

    // --- Contact damage --- (zombies + water enemies share the cooldown map)
    this.physics.add.overlap(this.player, this.zombies, (_p, zombieObj) => {
      this.handleContact(zombieObj as Zombie);
    });
    this.physics.add.overlap(this.player, this.extraEnemies, (_p, enemyObj) => {
      this.handleContact(enemyObj as ExtraEnemy);
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
      onComplete: () => {
        // Water levels freeze air drain until the intro banner clears (Task 15).
        this.introFreezeActive = false;
        banner.destroy();
      },
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
    if (h.isDead() || h.untouchable || this.player.isDying) return;
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
      const wc = this.physics.add.overlap(hitbox, this.extraEnemies, (_hb, enemyObj) => {
        this.applyHit(hitbox, enemyObj as ExtraEnemy, damage, isFinisher, false);
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
      const wc = this.physics.add.overlap(hitbox, this.extraEnemies, (_hb, enemyObj) => {
        this.applyHit(hitbox, enemyObj as ExtraEnemy, damage, true, true);
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
    // A melted chocolate puddle: the sword passes over it (no hit, no FX).
    if (h.isDead() || !h.active || h.untouchable) return;
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

    const streak = this.gameState.registerKill(this.time.now);
    if (streak >= 2) {
      floatText(this, h.x, h.y - 60, `COMBO x${streak}`, '#ff8833', 15);
    }

    this.addPickup(new Pickup(this, h.x, h.y - 20, 'coin'));
    if (h instanceof Zombie) {
      // Persistent ground blood decal only for grounded enemies — a floating
      // fish/eel would otherwise stain open water. (Design call; revisit w/ Henry.)
      this.gore.stampDecal(h.x, (h.body as Phaser.Physics.Arcade.Body).bottom, true);
      if (h.powerUp) {
        this.addPickup(new Pickup(this, h.x, h.y - 30, 'orb', h.powerUp));
        if (h.displayName) {
          const hex = `#${POWERUPS[h.powerUp].color.toString(16).padStart(6, '0')}`;
          floatText(this, h.x, h.y - 84, `${h.displayName} DOWN!`, hex, 16);
        }
      }
      if (Math.random() < ZOMBIE.heartDropChance) {
        this.addPickup(new Pickup(this, h.x + 14, h.y - 24, 'heart'));
      }
    }
    // Wes/Josh: Gumball Zombies drop the sour candy for the Worm King fight.
    if (h instanceof Gumball) {
      this.addPickup(new Pickup(this, h.x, h.y - 24, 'sourCandy'));
    }

    this.contactCooldown.delete(h);
    h.die();
  }

  // ------------------------------------------------------------------
  // Boss encounter
  // ------------------------------------------------------------------

  private createBoss() {
    // The one concrete construction site — everything downstream is the interface.
    // Branch on the discriminant: the walker Boss throws on a kraken def and the
    // Kraken throws on a walker def, so the def must reach the right constructor.
    // The Kraken has no ground; it spawns submerged and rises via triggerRise.
    const bx = this.def.bossSpawnX;
    const by = WORLD.groundY - 80;
    let boss: Boss | Kraken | Worm;
    if (this.def.boss.kind === 'kraken') {
      boss = new Kraken(this, bx, by, this.juice, this.def.boss);
    } else if (this.def.boss.kind === 'worm') {
      // The Gummy Worm King digs anywhere inside the locked arena.
      const worm = new Worm(this, bx, by, this.juice, this.def.boss, {
        minX: this.def.arenaLeft + 70,
        maxX: this.def.worldWidth - 70,
      });
      worm.setCandyHooks({
        spendCandy: () => this.spendSourCandy(),
        knockLoose: (x, y) => this.knockSourCandyLoose(x, y),
      });
      boss = worm;
    } else {
      boss = new Boss(this, bx, by, this.juice, this.def.boss);
    }
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
    // Freeze the kraken's bubbles for the WHOLE cutscene, including the rise
    // (triggerRise fires 1300ms in) — no-op on the walker (no setFrozen).
    this.boss.setFrozen?.(true);

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
        // Sour candies ride along too — the Worm King fight needs them.
        if (pickup.active && (pickup.kind === 'orb' || pickup.kind === 'sourCandy')) {
          pickup.magnetize();
        }
      });

      // Clear stragglers before shrinking the world
      this.zombies.getChildren().slice().forEach((z) => (z as Zombie).destroy());
      this.extraEnemies.getChildren().slice().forEach((e) => (e as ExtraEnemy).destroy());
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
        this.boss?.setFrozen?.(false); // kraken bubbles resume as the fight begins

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
    // Ground blood decals only for the grounded walker — the floating kraken has
    // no ground contact, so a ground-line stamp reads wrong; its playDeath owns
    // the underwater sink-and-dissolve gore instead.
    if (this.def.boss.kind === 'walker') {
      this.gore.stampDecal(bossX, bossBottom, true);
      this.gore.stampDecal(bossX - 40, bossBottom, true);
      this.gore.stampDecal(bossX + 40, bossBottom, true);
    }

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
    this.extraEnemies
      .getChildren()
      .slice()
      .forEach((eObj) => {
        const e = eObj as ExtraEnemy;
        this.gore.burst(e.x, e.y, false);
        e.destroy();
      });
    this.contactCooldown.clear();

    // The level key floats down at the encounter's returned spot (== bossY - 60)
    this.time.delayedCall(800, () => {
      this.addPickup(new Pickup(this, keySpot.x, keySpot.y, 'key'));
    });

    // Boss bounty: a burst of coins around the corpse
    for (let i = 0; i < SHOP.bossCoinBurst; i++) {
      const spread = (i - (SHOP.bossCoinBurst - 1) / 2) * 18;
      this.addPickup(new Pickup(this, bossX + spread, bossY - 40, 'coin'));
    }
  }

  // Single spawn path for every pickup so the underwater buoyancy rule applies
  // uniformly: on a water level, anything dropped below the surface floats
  // (gravity off + gentle bob) instead of sinking to the lake bed out of reach.
  private addPickup(pickup: Pickup): Pickup {
    this.pickups.add(pickup);
    if (this.def.water && pickup.y > this.def.water.surfaceY) {
      pickup.floatInWater();
    }
    return pickup;
  }

  private onScubaCollected() {
    // grantScuba is pure — reassign the returned state. SynthAudio.key() is the
    // placeholder ping (reused until Henry wants a custom scuba sound).
    if (this.air) this.air = grantScuba(this.air);
    SynthAudio.key();
  }

  // ------------------------------------------------------------------
  // Water system (Level 4 — all gated on def.water; a no-op on Levels 1-3)
  // ------------------------------------------------------------------

  // One-time setup: breathing state, swim profiles, vent bubbles, fish/eel, and
  // the scuba-crack / revive-air / HUD-cleanup listeners.
  private setupWaterLevel(water: WaterDef) {
    this.air = createAirState();
    this.introFreezeActive = true; // air is frozen until the intro banner fades
    this.player.setWaterProfile(water);

    // Scuba pickup — collect grants scuba via onScubaCollected.
    this.addPickup(new Pickup(this, water.scuba.x, water.scuba.y, 'scuba'));

    // Vent bubble columns — purely visual (no per-bubble physics bodies). The
    // inVent refill is a geometric test in tickWater, not a physics zone.
    for (const vent of water.vents) {
      this.add
        .particles(vent.x, WORLD.groundY, Assets.VENT_BUBBLE, {
          x: { min: -vent.width / 2, max: vent.width / 2 },
          // Fill the whole topY→lakebed refill band so the breathable column is
          // visible wherever the inVent geometry test (same vent.topY) accepts it.
          y: { min: vent.topY - WORLD.groundY, max: 0 },
          speedY: { min: -60, max: -110 },
          speedX: { min: -10, max: 10 },
          scale: { start: 0.6, end: 1.3 },
          alpha: { start: 0.6, end: 0 },
          lifespan: { min: 1800, max: 3200 },
          frequency: 130,
          quantity: 1,
        })
        .setDepth(2);
    }

    // Fish schools + eels populate the (else-empty) extraEnemies group; all
    // combat/contact/straggler plumbing already flows through it.
    for (const school of water.fishSchools) {
      for (let i = 0; i < school.count; i++) {
        const fish = new Fish(
          this,
          school.x + Phaser.Math.Between(-40, 40),
          school.y + Phaser.Math.Between(-30, 30)
        );
        fish.setTarget(this.player);
        fish.setDepth(5);
        this.extraEnemies.add(fish);
      }
    }
    for (const anchor of water.eels) {
      const eel = new Eel(this, anchor.x, anchor.y);
      eel.setTarget(this.player);
      eel.setDepth(5);
      this.extraEnemies.add(eel);
    }

    // Scuba cracks only when a NON-drowning hit actually lands on the body
    // (hurt / potioned / revived) — an i-frame-ignored or shield-absorbed hit
    // must not crack it. Registered after the create() events.off sweep so it
    // can't stack across scene restarts.
    this.events.on(
      'player-hurt',
      ({ outcome, source }: { outcome: DamageOutcome; source: DamageSource }) => {
        if (!this.air || this.air.scubaDurability <= 0) return;
        if (!shouldCrackScuba(outcome, source)) return;
        const res = scubaHit(this.air);
        this.air = res.state;
        if (res.broke) this.shatterScuba();
      }
    );

    // Extra Life revive underwater: air is scene-owned (survives the revive) but
    // topped to 50% so a revive mid-drown doesn't immediately re-drown. Scuba is
    // untouched.
    this.events.on('player-revived', () => {
      if (this.air) this.air = restoreAir(this.air, 0.5);
    });

    // Drop the HUD air snapshot when the scene ends (Task 16's HUD reads it).
    this.events.once('shutdown', () => this.registry.remove('airHud'));
  }

  private shatterScuba() {
    floatText(this, this.player.x, this.player.y - 50, 'SCUBA DESTROYED!', '#ff5555', 16);
    const shatter = this.add
      .particles(this.player.x, this.player.y, Assets.VENT_BUBBLE, {
        speed: { min: 40, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.4, end: 0 },
        alpha: { start: 0.9, end: 0 },
        lifespan: 500,
        emitting: false,
      })
      .setDepth(7);
    shatter.explode(16);
    this.time.delayedCall(700, () => shatter.destroy());
  }

  // Per-frame breathing tick: drain/refill air, apply drown damage, surface the
  // warning, record the safe respawn anchor, and publish the HUD snapshot.
  private tickWater(delta: number) {
    if (!this.air || !this.def.water) return;
    const water = this.def.water;
    const player = this.player;

    const playerInVent = inVent(player.x, player.y, water.vents);
    const frozen = this.cinematic || this.introFreezeActive;

    const { state, effects } = tickAir(this.air, delta, {
      breathing: player.canBreathe,
      inVent: playerInVent,
      frozen,
    });
    this.air = state;

    // Drowning bypasses the shield but still respects i-frames (resolveDamage),
    // so a post-revive tick in the same frame is safely ignored.
    for (let i = 0; i < effects.damageTicks; i++) {
      player.takeDamage(WATER.drownTickDamage, player.x, 'drowning');
    }
    if (effects.warningStarted) {
      floatText(this, player.x, player.y - 60, 'YOU NEED TO GO UP TO BREATHE', '#66ddff', 14);
    }

    // Record a safe underwater respawn anchor ~every 2s while not drowning —
    // lastGroundedPos is stale underwater (the player is never grounded there).
    if (!frozen) {
      this.safePosTimer += delta;
      const notDrowning = this.air.airMs > 0 || this.air.scubaDurability > 0;
      if (this.safePosTimer >= 2000 && notDrowning && !player.isDying) {
        this.safePosTimer = 0;
        const b = this.physics.world.bounds;
        player.setReviveAnchor(
          Phaser.Math.Clamp(player.x, b.x + 30, b.right - 30),
          Phaser.Math.Clamp(player.y, b.y + 30, b.bottom - 30)
        );
      }
    }

    this.registry.set('airHud', {
      airMs: this.air.airMs,
      maxAirMs: WATER.airMs,
      scubaDurability: this.air.scubaDurability,
      warned: this.air.warned,
      drowning: this.air.airMs <= 0 && this.air.scubaDurability === 0,
    });
  }

  // ------------------------------------------------------------------
  // Candy system (Level 5, Wes — all gated on def.candy; no-op elsewhere)
  // ------------------------------------------------------------------

  private setupCandyLevel(candy: CandyDef) {
    this.sourCandy = createSourCandyState();

    // Marshmallow bounce pads: static solids. Landing on top launches the
    // player; enemies and pickups just treat them as candy blocks.
    const pads = this.physics.add.staticGroup();
    this.pads = pads;
    for (const pad of candy.marshmallows) {
      const sprite = pads.create(pad.x, pad.y + CANDY.marshmallowH / 2, Assets.MARSHMALLOW, 0) as
        Phaser.Physics.Arcade.Sprite;
      sprite.setDepth(3.4);
      lit(sprite);
    }
    this.physics.add.collider(this.player, pads, (_p, padObj) => {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (!body.touching.down) return; // side bumps don't bounce
      const pad = padObj as Phaser.Physics.Arcade.Sprite;
      const fromSlam = this.player.bounceOnPad();
      SynthAudio.boing();
      pad.setFrame(1);
      this.time.delayedCall(140, () => {
        if (pad.active) pad.setFrame(0);
      });
      dustPuff(this, pad.x, pad.y - 10, fromSlam ? 10 : 5);
      if (fromSlam) {
        this.juice.shake(0.004, 120);
        floatText(this, this.player.x, this.player.y - 40, 'SUPER BOING!', '#ffb0d8', 14);
      }
    });
    this.physics.add.collider(this.zombies, pads);
    this.physics.add.collider(this.extraEnemies, pads);
    this.physics.add.collider(this.pickups, pads);

    // Candy enemies are grounded, so they collide with the solids.
    this.physics.add.collider(this.extraEnemies, this.solids);
    for (const e of candy.enemies) this.spawnCandyEnemy(e.kind, e.x);

    // A dead gummy bear splits into two cubs (Wes's idea).
    this.events.on('gummy-split', ({ x, y }: { x: number; y: number }) => {
      for (const dir of [-1, 1]) {
        const cub = new GummyBear(this, x + dir * 12, y, true);
        cub.setTarget(this.player);
        cub.setVelocity(dir * 130, -260);
        this.extraEnemies.add(cub);
      }
      floatText(this, x, y - 40, 'SPLIT!', '#ff8fb8', 14);
    });

    // The enraged Worm King summons gummy cubs; the cap counts live cubs only.
    this.events.on(
      'worm-summon',
      ({ x, count, maxAlive }: { x: number; count: number; maxAlive: number }) => {
        const alive = this.extraEnemies
          .getChildren()
          .filter((e) => e.active && e instanceof GummyBear && !e.isDead()).length;
        const room = Math.max(0, maxAlive - alive);
        for (let i = 0; i < Math.min(count, room); i++) {
          const side = i % 2 === 0 ? -1 : 1;
          let cx = Phaser.Math.Clamp(x + side * 100, this.def.arenaLeft + 60, this.def.worldWidth - 60);
          if (Math.abs(cx - this.player.x) < 70) {
            cx = Phaser.Math.Clamp(
              cx + (cx >= this.player.x ? 80 : -80),
              this.def.arenaLeft + 60,
              this.def.worldWidth - 60
            );
          }
          const cub = new GummyBear(this, cx, WORLD.groundY - 30, true);
          cub.setTarget(this.player);
          this.extraEnemies.add(cub);
          dustPuff(this, cx, WORLD.groundY - 10, 8);
        }
      }
    );

    this.events.once('shutdown', () => this.registry.remove('candyHud'));
  }

  // Spawn with the body bottom 8px above the ground (same rule as zombies).
  private spawnCandyEnemy(kind: CandyEnemyKind, x: number) {
    const lift = WORLD.groundY - 8;
    let enemy: GummyBear | Gumball | Chocolate;
    if (kind === 'gummy') enemy = new GummyBear(this, x, lift - 20);
    else if (kind === 'gumball') enemy = new Gumball(this, x, lift - 16);
    else enemy = new Chocolate(this, x, lift - 30);
    enemy.setTarget(this.player);
    this.extraEnemies.add(enemy);
  }

  private onSourCandyCollected() {
    if (!this.sourCandy) return;
    this.sourCandy = collectSourCandy(this.sourCandy);
    SynthAudio.heart();
    floatText(this, this.player.x, this.player.y - 44, 'SOUR CANDY!', '#d8ff3a', 13);
    // The first candy teaches the trick.
    if (this.sourCandy.count === 1 && !this.registry.get('sourCandyHintShown')) {
      this.registry.set('sourCandyHintShown', true);
      floatText(this, this.player.x, this.player.y - 64, 'FEED IT TO THE WORM KING!', '#ffe24a', 12);
    }
  }

  // Worm hook: spend one candy on an open-mouth hit.
  private spendSourCandy(): boolean {
    if (!this.sourCandy) return false;
    const res = tryFeed(this.sourCandy, true);
    this.sourCandy = res.state;
    return res.fed;
  }

  // Worm hook: a sword hit knocks a candy loose, on a cooldown, with a small
  // cap on candies lying around (so the arena never fills up).
  private knockSourCandyLoose(x: number, y: number) {
    if (!this.sourCandy || this.def.boss.kind !== 'worm') return;
    const onField = this.pickups
      .getChildren()
      .filter((p) => p.active && (p as Pickup).kind === 'sourCandy').length;
    if (onField >= 2) return;
    const res = knockLoose(this.sourCandy, this.time.now, this.def.boss.candyKnockCooldownMs);
    this.sourCandy = res.state;
    if (res.drop) this.addPickup(new Pickup(this, x, y, 'sourCandy'));
  }

  // The 5-key portal (Level 5): the keys fly in, it swirls open, and walking
  // into it ends the level.
  private openPortal(portalX: number) {
    if (this.portalOpen) return;
    this.portalOpen = true;
    const cam = this.cameras.main;
    const portalY = WORLD.groundY - 64;

    floatText(this, this.player.x, this.player.y - 90, 'THE PORTAL IS OPEN!', '#c88aff', 20);

    // Every key the player holds flies from the HUD slots into the portal.
    this.gameState.keys.forEach((has, i) => {
      if (!has) return;
      const key = this.add
        .image(136 + i * 24, 62, Assets.KEY)
        .setScrollFactor(0)
        .setDepth(60)
        .setScale(0.8);
      this.tweens.add({
        targets: key,
        x: portalX - cam.scrollX,
        y: portalY - cam.scrollY,
        scale: 0.3,
        delay: 150 * i,
        duration: 700,
        ease: 'Cubic.easeIn',
        onComplete: () => key.destroy(),
      });
    });

    this.time.delayedCall(1300, () => {
      SynthAudio.portal();
      this.juice.shake(0.005, 400);
      const portal = this.physics.add.staticSprite(portalX, portalY, Assets.PORTAL, 0);
      portal.setDepth(4).setScale(0);
      portal.play(CandyAnims.PORTAL_SWIRL);
      this.tweens.add({ targets: portal, scale: 1, duration: 600, ease: 'Back.easeOut' });
      if (this.sys.renderer.type === Phaser.WEBGL) {
        this.lights.addLight(portalX, portalY, 260, 0xc88aff, 1.4);
      }
      floatText(this, portalX, portalY - 90, 'WALK IN!', '#ffffff', 16);

      let entered = false;
      this.physics.add.overlap(this.player, portal, () => {
        if (entered || this.player.isDying) return;
        entered = true;
        SynthAudio.victory();
        this.tweens.add({ targets: this.player, alpha: 0, scale: 0.2, duration: 500 });
        cam.fadeOut(800, 40, 0, 60);
        this.time.delayedCall(900, () => {
          this.scene.stop('HUD');
          this.scene.start('Victory');
        });
      });
    });
  }

  private onKeyCollected() {
    if (this.def.portal) {
      // Level 5: the fifth key opens the portal instead of ending the level.
      this.gameState.collectKey(this.def.keyIndex);
      floatText(this, this.player.x, this.player.y - 60, `KEY #${this.def.keyIndex + 1}!`, '#ffd700', 20);
      SynthAudio.stopMusic();
      this.time.delayedCall(700, () => this.openPortal(this.def.portal!.x));
      return;
    }
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

    // Breathing/air tick (water levels only) — after player.update() so
    // canBreathe reflects this frame's position (except during the cinematic,
    // where player.update() is skipped but `frozen` suppresses the breathing
    // read anyway). Air is frozen through the intro banner + boss cinematic.
    if (this.def.water) this.tickWater(delta);

    // Level 5: the HUD shows the sour candy pocket (hidden on other levels).
    if (this.sourCandy) {
      this.registry.set('candyHud', { count: this.sourCandy.count, cap: CANDY.sourCandyCap });
    }

    for (const z of this.zombies.getChildren().slice()) {
      if (z.active) (z as Zombie).update(time, delta);
    }

    for (const e of this.extraEnemies.getChildren().slice()) {
      if (e.active) (e as ExtraEnemy).update(time, delta);
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
