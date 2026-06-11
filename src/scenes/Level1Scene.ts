import Phaser from 'phaser';
import { Assets } from '../assets';
import { BOSS, GAME_H, GAME_W, WORLD, ZOMBIE } from '../config';
import { GameState } from '../core/GameState';
import { InputController } from '../core/InputController';
import { Juice } from '../core/Juice';
import { SynthAudio } from '../core/SynthAudio';
import { Boss, BossState } from '../entities/Boss';
import { AttackEvent, Player, SlamEvent } from '../entities/Player';
import { Pickup } from '../entities/Pickups';
import { Zombie } from '../entities/Zombie';
import { dustPuff, floatText, lit, shockwave } from '../fx/Effects';
import { GoreSystem } from '../fx/Splatter';

interface ParallaxLayer {
  sprite: Phaser.GameObjects.TileSprite;
  factor: number;
}

// Level 1 — The Abandoned City, at night, in the rain.
export class Level1Scene extends Phaser.Scene {
  private controls!: InputController;
  private juice!: Juice;
  private gore!: GoreSystem;
  private gameState = GameState.getInstance();

  private player!: Player;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private zombies!: Phaser.GameObjects.Group;
  private pickups!: Phaser.GameObjects.Group;
  private contactCooldown = new Map<Zombie, number>();

  private boss: Boss | null = null;
  private bossTriggered = false;
  private cinematic = false;
  private lastBossHitTime = 0;
  private bossHealthBar: Phaser.GameObjects.Rectangle | null = null;
  private bossHealthBarBg: Phaser.GameObjects.Rectangle | null = null;
  private bossNameText: Phaser.GameObjects.Text | null = null;

  private bgLayers: ParallaxLayer[] = [];
  private fogFar!: Phaser.GameObjects.TileSprite;
  private fogNear!: Phaser.GameObjects.TileSprite;
  private flickerLights: Array<{ light: Phaser.GameObjects.Light; base: number; seed: number }> =
    [];

  constructor() {
    super({ key: 'Level1' });
  }

  create() {
    // Scene event listeners would stack across restarts — clear ours first
    this.events.off('player-attack');
    this.events.off('player-slam');
    this.events.off('player-slam-land');
    this.events.off('player-died');
    this.events.off('boss-shockwave');

    this.boss = null;
    this.bossTriggered = false;
    this.cinematic = false;
    this.bgLayers = [];
    this.flickerLights = [];
    this.contactCooldown.clear();
    this.gameState.resetRun();

    this.controls = new InputController(this);
    this.juice = new Juice(this);

    const isWebGL = this.sys.renderer.type === Phaser.WEBGL;
    if (isWebGL) {
      this.lights.enable().setAmbientColor(0x595972);
      const cam = this.cameras.main;
      cam.postFX.addVignette(0.5, 0.5, 0.93, 0.42);
      cam.postFX.addBloom(0xffffff, 1, 1, 1.1, 0.6, 2);
    }

    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    this.buildBackdrop();
    this.buildTerrain();
    this.buildAmbience(isWebGL);

    // --- Player ---
    this.player = new Player(this, 100, 420, this.controls);
    this.player.setDepth(6);
    this.physics.add.collider(this.player, this.solids);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD.width, WORLD.height);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setDeadzone(110, 70);

    // --- Gore (decals render above terrain) ---
    this.gore = new GoreSystem(this, WORLD.width, WORLD.height, 4);

    // --- Zombies ---
    this.zombies = this.add.group();
    // First zombie sits outside aggro+patrol reach of the spawn point
    const positions = [500, 700, 950, 1250, 1550, 1850, 2150, 2450];
    positions.forEach((x, i) => {
      const zombie = new Zombie(this, x, 420, i % 3 === 2 ? 'urban' : 'zombie');
      zombie.setTarget(this.player);
      zombie.setDepth(5);
      this.zombies.add(zombie);
    });
    this.physics.add.collider(this.zombies, this.solids);

    // --- Pickups ---
    this.pickups = this.add.group();
    this.physics.add.collider(this.pickups, this.solids);
    this.physics.add.overlap(this.player, this.pickups, (_p, pickupObj) => {
      const pickup = pickupObj as Pickup;
      const wasKey = pickup.kind === 'key';
      pickup.collect(this.player);
      if (wasKey) this.onKeyCollected();
    });

    // --- Contact damage ---
    this.physics.add.overlap(this.player, this.zombies, (_p, zombieObj) => {
      const z = zombieObj as Zombie;
      if (z.isDead() || this.player.isDying) return;
      const now = this.time.now;
      const last = this.contactCooldown.get(z) ?? 0;
      if (now - last > ZOMBIE.contactCooldownMs) {
        this.contactCooldown.set(z, now);
        this.player.takeDamage(z.getDamage(), z.x);
      }
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
  }

  // ------------------------------------------------------------------
  // World building
  // ------------------------------------------------------------------

  private buildBackdrop() {
    this.add.image(0, 0, Assets.SKY).setOrigin(0).setScrollFactor(0).setDepth(-10);

    const moonGlow = this.add
      .image(770, 95, Assets.GLOW)
      .setScrollFactor(0.04)
      .setDepth(-9.6)
      .setScale(4)
      .setTint(0xffbb88)
      .setAlpha(0.5);
    void moonGlow;
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
    mkLayer(Assets.RUIN_NIGHT_FAR, 0.12, -9);
    mkLayer(Assets.RUIN_NIGHT_MID, 0.3, -8);
    mkLayer(Assets.RUIN_NIGHT_NEAR, 0.55, -7);

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

  private buildTerrain() {
    this.solids = this.physics.add.staticGroup();

    // Ground: two tile rows across the level
    for (let x = 0; x < WORLD.width; x += 32) {
      lit(this.solids.create(x + 16, WORLD.groundY + 16, Assets.GROUND_TOP).setDepth(3));
      lit(this.solids.create(x + 16, WORLD.groundY + 48, Assets.GROUND_FILL).setDepth(3));
    }

    // Floating platforms (concrete slabs)
    const platforms: Array<[number, number, number]> = [
      [300, 400, 5],
      [700, 310, 4],
      [1100, 355, 6],
      [1600, 310, 4],
      [2000, 400, 5],
      [2500, 310, 3],
    ];
    for (const [x, y, count] of platforms) {
      for (let i = 0; i < count; i++) {
        lit(this.solids.create(x + i * 32 + 16, y, Assets.PLATFORM).setDepth(3));
      }
    }

    // Stepping-stone staircases (Henry & Josh's vertical combat feature).
    // First stone must leave >56px under it so the player can walk beneath.
    const stairs: Array<[number, number, number, number, number]> = [
      [450, 408, 4, 40, 50],
      [950, 412, 3, 40, 55],
      [1400, 408, 5, 35, 45],
      [2100, 408, 4, 40, 55],
    ];
    for (const [startX, baseY, steps, stepH, stepOff] of stairs) {
      for (let i = 0; i < steps; i++) {
        lit(this.solids.create(startX + i * stepOff, baseY - i * stepH, Assets.STONE).setDepth(3));
      }
    }
  }

  private buildAmbience(isWebGL: boolean) {
    // Fire barrels with ember plumes + flickering light
    for (const x of [550, 1300, 1900, 2700]) {
      const y = WORLD.groundY - 15;
      lit(this.add.image(x, y, Assets.BARREL).setDepth(3));
      this.add.particles(x, y - 14, Assets.P_EMBER, {
        speed: { min: 12, max: 45 },
        angle: { min: 250, max: 290 },
        scale: { start: 1, end: 0 },
        alpha: { start: 0.9, end: 0 },
        lifespan: { min: 500, max: 1100 },
        frequency: 90,
        gravityY: -40,
      });
      if (isWebGL) {
        const light = this.lights.addLight(x, y - 10, 190, 0xff7733, 1.0);
        this.flickerLights.push({ light, base: 1.0, seed: Math.random() * 100 });
      }
    }

    // Broken lampposts — cold, unreliable light
    for (const x of [800, 2350]) {
      lit(this.add.image(x, WORLD.groundY - 60, Assets.LAMPPOST).setDepth(2));
      if (isWebGL) {
        const light = this.lights.addLight(x - 6, WORLD.groundY - 116, 170, 0xbbccff, 0.8);
        this.flickerLights.push({ light, base: 0.8, seed: 7 + Math.random() * 100 });
      }
    }

    // Rain (screen-space)
    this.add
      .particles(0, 0, Assets.P_RAIN, {
        x: { min: -40, max: GAME_W + 60 },
        y: -20,
        speedY: { min: 480, max: 580 },
        speedX: { min: -70, max: -50 },
        lifespan: 1300,
        quantity: 3,
        frequency: 18,
        alpha: { start: 0.55, end: 0.25 },
        rotate: -7,
      })
      .setScrollFactor(0)
      .setDepth(8);

    // Lightning
    const scheduleLightning = () => {
      this.time.delayedCall(7000 + Math.random() * 8000, () => {
        if (!this.scene.isActive()) return;
        this.cameras.main.flash(140, 190, 200, 235, false);
        this.time.delayedCall(120, () => this.cameras.main.flash(90, 150, 160, 200, false));
        SynthAudio.thunder();
        scheduleLightning();
      });
    };
    scheduleLightning();
  }

  // ------------------------------------------------------------------
  // Combat wiring
  // ------------------------------------------------------------------

  private wireCombatEvents() {
    this.events.on('player-attack', ({ hitbox, damage, isFinisher }: AttackEvent) => {
      const collider = this.physics.add.overlap(hitbox, this.zombies, (_hb, zombieObj) => {
        const z = zombieObj as Zombie;
        this.applyHit(hitbox, z, damage, isFinisher, false);
      });
      hitbox.once('destroy', () => collider.destroy());
      this.wireBossHit(hitbox, damage, isFinisher, false);
    });

    this.events.on('player-slam', ({ hitbox, damage }: SlamEvent) => {
      const collider = this.physics.add.overlap(hitbox, this.zombies, (_hb, zombieObj) => {
        const z = zombieObj as Zombie;
        this.applyHit(hitbox, z, damage, true, true);
      });
      hitbox.once('destroy', () => collider.destroy());
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
        this.player.takeDamage(BOSS.shockwaveDamage, x);
      }
    });
  }

  private applyHit(
    hitbox: Phaser.GameObjects.Rectangle,
    z: Zombie,
    damage: number,
    big: boolean,
    isSlam: boolean
  ) {
    if (z.isDead() || !z.active) return;
    const hitSet = hitbox.getData('hitSet') as Set<unknown>;
    if (hitSet.has(z)) return;
    hitSet.add(z);

    z.takeDamage(damage);
    SynthAudio.splat(big);
    this.gore.burst(z.x, z.y, z.isDead());

    if (isSlam) {
      this.player.pogoBounce();
      this.juice.hitStop(60);
      this.juice.shake(0.005, 100);
    } else if (big) {
      this.juice.hitStop(50);
      this.juice.shake(0.004, 90);
    }

    if (z.isDead()) {
      this.onZombieKilled(z);
    }
  }

  private wireBossHit(
    hitbox: Phaser.GameObjects.Rectangle,
    damage: number,
    big: boolean,
    isSlam: boolean
  ) {
    if (!this.boss || !this.boss.isVulnerable || this.boss.isDead()) return;
    const collider = this.physics.add.overlap(hitbox, this.boss, () => {
      if (!this.boss || this.boss.isDead()) return;
      const hitSet = hitbox.getData('hitSet') as Set<unknown>;
      if (hitSet.has(this.boss)) return;
      hitSet.add(this.boss);

      const died = this.boss.takeDamage(damage);
      SynthAudio.splat(big);
      this.gore.burst(this.boss.x, this.boss.y, big);
      if (isSlam) {
        this.player.pogoBounce();
        this.juice.hitStop(60);
      }
      if (died) this.onBossDefeated();
    });
    hitbox.once('destroy', () => collider.destroy());
  }

  private onZombieKilled(z: Zombie) {
    SynthAudio.splat(true);
    this.gore.stampDecal(z.x, (z.body as Phaser.Physics.Arcade.Body).bottom, true);

    const streak = this.gameState.registerKill(this.time.now);
    if (streak >= 2) {
      floatText(this, z.x, z.y - 60, `COMBO x${streak}`, '#ff8833', 15);
    }

    this.pickups.add(new Pickup(this, z.x, z.y - 20, 'coin'));
    if (Math.random() < ZOMBIE.heartDropChance) {
      this.pickups.add(new Pickup(this, z.x + 14, z.y - 24, 'heart'));
    }

    this.contactCooldown.delete(z);
    z.die();
  }

  // ------------------------------------------------------------------
  // Boss encounter
  // ------------------------------------------------------------------

  private createBoss() {
    this.boss = new Boss(this, 2950, WORLD.groundY - 80, this.juice);
    this.boss.setTarget(this.player);
    this.physics.add.collider(this.boss, this.solids);

    this.physics.add.overlap(this.player, this.boss, () => {
      if (!this.boss || this.boss.getState() !== BossState.FIGHTING || this.boss.isDead()) {
        // Charging/leaping also hurt
        if (
          !this.boss ||
          (this.boss.getState() !== BossState.CHARGING &&
            this.boss.getState() !== BossState.LEAPING)
        ) {
          return;
        }
      }
      const now = this.time.now;
      if (now - this.lastBossHitTime > 1000 && !this.player.isDying) {
        this.lastBossHitTime = now;
        this.player.takeDamage(this.boss.getDamage(), this.boss.x);
      }
    });
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
    cam.pan(2900, 280, 1100, 'Power2');

    this.time.delayedCall(1300, () => {
      if (!this.boss) return;
      this.boss.triggerRise();

      // Clear stragglers before shrinking the world
      this.zombies.getChildren().slice().forEach((z) => (z as Zombie).destroy());
      this.contactCooldown.clear();

      this.time.delayedCall(1100, () => {
        this.physics.world.setBounds(BOSS.arenaLeft, 0, WORLD.width - BOSS.arenaLeft, WORLD.height);
        cam.setBounds(BOSS.arenaLeft, 0, WORLD.width - BOSS.arenaLeft, WORLD.height);
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
      .text(GAME_W / 2, 38, 'MUTATED ZOMBIE', {
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
    const bossX = this.boss.x;
    const bossY = this.boss.y;
    const bossBottom = (this.boss.body as Phaser.Physics.Arcade.Body).bottom;

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

    this.boss.destroyThrone();
    this.bossHealthBar?.destroy();
    this.bossHealthBarBg?.destroy();
    this.bossNameText?.destroy();
    this.bossHealthBar = null;

    const corpse = this.boss;
    this.boss = null;
    corpse.setVelocity(0, 0);
    corpse.play('urban-dead', true);
    this.time.delayedCall(1600, () => corpse.destroy());

    // Key #1 floats down
    this.time.delayedCall(800, () => {
      this.pickups.add(new Pickup(this, bossX, bossY - 60, 'key'));
    });
  }

  private onKeyCollected() {
    this.gameState.collectKey(0);
    floatText(this, this.player.x, this.player.y - 60, 'KEY #1!', '#ffd700', 20);
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

    if (!this.cinematic) {
      this.player.update();
    }

    for (const z of this.zombies.getChildren().slice()) {
      if (z.active) (z as Zombie).update(time, delta);
    }

    for (const p of this.pickups.getChildren()) {
      (p as Pickup).updateMagnet(this.player);
    }

    // Parallax + fog drift
    const camX = this.cameras.main.scrollX;
    for (const layer of this.bgLayers) {
      layer.sprite.tilePositionX = (camX * layer.factor) / layer.sprite.scaleX;
    }
    this.fogFar.tilePositionX = camX * 0.2 + time * 0.008;
    this.fogNear.tilePositionX = camX * 0.9 + time * 0.015;

    // Light flicker
    for (const f of this.flickerLights) {
      f.light.setIntensity(
        f.base + Math.sin(time * 0.013 + f.seed) * 0.12 + (Math.random() - 0.5) * 0.1
      );
    }

    // Boss
    if (!this.bossTriggered && this.player.x > BOSS.triggerX) {
      this.triggerBossEncounter();
    }
    if (this.boss && !this.boss.isDead()) {
      this.boss.update(time, delta);
      if (this.bossHealthBar) {
        this.bossHealthBar.width = 360 * Math.max(0, this.boss.health / this.boss.maxHealth);
      }
    }
  }
}
