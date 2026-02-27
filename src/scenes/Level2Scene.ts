import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { ZombieDeer } from '../entities/ZombieDeer';
import { ZombieWolf } from '../entities/ZombieWolf';
import { PlantZombie } from '../entities/PlantZombie';
import { SpiderHybrid } from '../entities/SpiderHybrid';
import { CrabSpiderBoss, CrabSpiderState } from '../entities/CrabSpiderBoss';
import { createSplatter } from '../systems/Splatter';
import { spawnPoisonCloud } from '../systems/PoisonCloud';
import { CrackingGround } from '../systems/CrackingGround';
import { GameState } from '../systems/GameState';
import { SoundManager } from '../systems/SoundManager';
import { MusicManager } from '../systems/MusicManager';
import { Damageable } from '../systems/Combat';

export class Level2Scene extends Phaser.Scene {
  private player!: Player;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.GameObjects.Group;
  private contactCooldown = new Map<Phaser.Physics.Arcade.Sprite, number>();
  private boss: CrabSpiderBoss | null = null;
  private bossTriggered = false;
  private bossHealthBar!: Phaser.GameObjects.Rectangle;
  private bossHealthBarBg!: Phaser.GameObjects.Rectangle;
  private bossNameText!: Phaser.GameObjects.Text;
  private lastBossHitTime = 0;
  private soundManager!: SoundManager;
  private bgLayers!: { sprite: Phaser.GameObjects.TileSprite; factor: number }[];
  private crackingGround: CrackingGround | null = null;
  private webDecorations: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super({ key: 'Level2' });
  }

  create() {
    this.soundManager = new SoundManager();
    GameState.getInstance().currentLevel = 2;
    const mm = MusicManager.getInstance();
    mm.init(this);
    mm.play('level');

    // Reset per-scene state
    this.contactCooldown.clear();
    this.bossTriggered = false;
    this.boss = null;
    this.crackingGround = null;
    this.webDecorations = [];

    // World bounds
    this.physics.world.setBounds(0, 0, 3200, 600);

    // --- Forest parallax backgrounds ---
    const bg1 = this.add.tileSprite(0, 0, 3200, 600, 'forest-bg-1').setOrigin(0, 0);
    bg1.setScrollFactor(0).setDepth(-4);
    const bg2 = this.add.tileSprite(0, 0, 3200, 600, 'forest-bg-2').setOrigin(0, 0);
    bg2.setScrollFactor(0).setDepth(-3);
    const bg3 = this.add.tileSprite(0, 0, 3200, 600, 'forest-bg-3').setOrigin(0, 0);
    bg3.setScrollFactor(0).setDepth(-2);
    const bg4 = this.add.tileSprite(0, 0, 3200, 600, 'forest-bg-4').setOrigin(0, 0);
    bg4.setScrollFactor(0).setDepth(-1);

    this.bgLayers = [
      { sprite: bg1, factor: 0.1 },
      { sprite: bg2, factor: 0.3 },
      { sprite: bg3, factor: 0.5 },
      { sprite: bg4, factor: 0.7 },
    ];

    // --- Forest ground ---
    this.ground = this.physics.add.staticGroup();
    for (let x = 0; x < 3200; x += 32) {
      this.ground.create(x + 16, 584, 'forest-ground-tile');
    }

    // --- Platforms per zone ---
    // Zone 1: Forest Edge (0-800)
    this.createPlatform(200, 480, 3);
    this.createPlatform(500, 420, 4);
    this.createPlatform(700, 360, 3);

    // Zone 2: Tree Canopy (800-1600)
    this.createPlatform(850, 480, 3);
    this.createPlatform(950, 400, 4);
    this.createPlatform(1050, 320, 3);
    this.createPlatform(1200, 380, 5);
    this.createPlatform(1400, 300, 3);
    this.createPlatform(1500, 420, 4);

    // Zone 3: Dense Undergrowth (1600-2200)
    this.createPlatform(1650, 460, 6);
    this.createPlatform(1800, 380, 4);
    this.createPlatform(2000, 440, 5);
    this.createPlatform(2100, 360, 3);

    // Zone 4: Spider Territory (2200-2800)
    this.createPlatform(2300, 400, 4);
    this.createPlatform(2500, 340, 3);
    this.createPlatform(2650, 420, 4);

    // Web decorations in Zone 4 (visual only)
    this.addWebDecorations();

    // --- Player ---
    this.player = new Player(this, 100, 500);
    this.physics.add.collider(this.player, this.ground);

    // Camera
    this.cameras.main.setBounds(0, 0, 3200, 600);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Debug toggle
    this.input.keyboard!.addKey('D').on('down', () => {
      this.physics.world.drawDebug = !this.physics.world.drawDebug;
      if (!this.physics.world.drawDebug) {
        this.physics.world.debugGraphic.clear();
      }
    });

    // Launch HUD
    this.scene.launch('HUD');

    // --- Spawn enemies ---
    this.enemies = this.add.group();
    this.spawnEnemies();

    // Enemy-ground collision
    this.physics.add.collider(this.enemies, this.ground);

    // Player-enemy contact damage
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
      const e = enemy as Phaser.Physics.Arcade.Sprite;
      const now = this.time.now;
      const lastHit = this.contactCooldown.get(e) ?? 0;
      if (now - lastHit > 1000) {
        this.contactCooldown.set(e, now);
        const dmg = (e as unknown as { getDamage(): number }).getDamage();
        this.player.takeDamage(dmg);
        this.soundManager.play('player-hurt');
      }
    }, undefined, this);

    // --- Sword combat ---
    this.events.on('player-attack', (hitbox: Phaser.GameObjects.Rectangle) => {
      this.soundManager.play('sword-swing');
      this.handleSwordHit(hitbox, GameState.getInstance().swordDamage);
    });

    this.events.on('player-slam', (hitbox: Phaser.GameObjects.Rectangle) => {
      this.soundManager.play('sword-swing');
      const slamDamage = Math.floor(GameState.getInstance().swordDamage * 1.5);
      this.handleSwordHit(hitbox, slamDamage, true);
    });

    this.events.on('player-died', () => {
      this.scene.stop('HUD');
      this.scene.start('GameOver');
    });

    // --- Damage events from systems ---
    this.events.on('poison-damage', (dmg: number) => {
      this.player.takeDamage(dmg);
    });
    this.events.on('laser-damage', (dmg: number) => {
      this.player.takeDamage(dmg);
    });
    this.events.on('shockwave-damage', (dmg: number) => {
      this.player.takeDamage(dmg);
    });
    this.events.on('lava-death', () => {
      this.player.takeDamage(9999);
    });

    // --- Boss (hidden in cocoon) ---
    this.boss = new CrabSpiderBoss(this, 3000, 500, 568);
    this.boss.setTarget(this.player);
    this.physics.add.collider(this.boss, this.ground);

    // Boss contact damage
    this.physics.add.overlap(this.player, this.boss as Phaser.Physics.Arcade.Sprite, () => {
      if (!this.boss || this.boss.getState() !== CrabSpiderState.FIGHTING || this.boss.isDead()) return;
      const now = this.time.now;
      if (now - this.lastBossHitTime > 1000) {
        this.lastBossHitTime = now;
        this.player.takeDamage(this.boss.getDamage());
        this.soundManager.play('player-hurt');
      }
    }, undefined, this);
  }

  update(time: number, delta: number) {
    this.player.update();

    this.enemies.getChildren().forEach((e) => {
      const enemy = e as Phaser.Physics.Arcade.Sprite & { update(t: number, d: number): void };
      if (enemy.update) enemy.update(time, delta);
    });

    // Parallax
    const camX = this.cameras.main.scrollX;
    for (const layer of this.bgLayers) {
      layer.sprite.tilePositionX = camX * layer.factor;
    }

    // Boss trigger
    if (!this.bossTriggered && this.player.x > 2700) {
      this.bossTriggered = true;
      this.triggerBossEncounter();
    }

    // Boss update
    if (this.boss && !this.boss.isDead() && this.boss.getState() === CrabSpiderState.FIGHTING) {
      this.boss.update(time, delta);
    }

    // Boss health bar
    if (this.bossHealthBar && this.boss && !this.boss.isDead()) {
      const pct = this.boss.health / this.boss.maxHealth;
      this.bossHealthBar.width = 300 * pct;
    }
  }

  private createPlatform(x: number, y: number, tileCount: number) {
    for (let i = 0; i < tileCount; i++) {
      this.ground.create(x + i * 32 + 16, y, 'forest-platform-tile');
    }
  }

  private addWebDecorations() {
    const webPositions = [
      { x: 2250, y: 300 }, { x: 2400, y: 250 }, { x: 2550, y: 280 },
      { x: 2700, y: 200 }, { x: 2850, y: 260 }, { x: 2950, y: 180 },
      { x: 3050, y: 300 }, { x: 3100, y: 220 },
    ];
    for (const pos of webPositions) {
      const web = this.add.sprite(pos.x, pos.y, 'web-decoration');
      web.setAlpha(0.5);
      web.setDepth(-1);
      this.webDecorations.push(web);
    }
  }

  private spawnEnemies() {
    // Zone 1: Forest Edge — zombie deer
    for (const x of [300, 550, 750]) {
      const deer = new ZombieDeer(this, x, 500);
      deer.setTarget(this.player);
      this.enemies.add(deer);
    }

    // Zone 2: Tree Canopy — zombie wolves
    for (const x of [900, 1100, 1350, 1550]) {
      const wolf = new ZombieWolf(this, x, 500);
      wolf.setTarget(this.player);
      this.enemies.add(wolf);
    }

    // Zone 3: Dense Undergrowth — plant zombies + wolves
    for (const x of [1700, 1900, 2050]) {
      const plant = new PlantZombie(this, x, 500);
      plant.setTarget(this.player);
      this.enemies.add(plant);
    }
    for (const x of [1800, 2100]) {
      const wolf = new ZombieWolf(this, x, 500);
      wolf.setTarget(this.player);
      this.enemies.add(wolf);
    }

    // Zone 4: Spider Territory — spider hybrids
    for (const x of [2350, 2550, 2700]) {
      const spider = new SpiderHybrid(this, x, 500);
      spider.setTarget(this.player);
      this.enemies.add(spider);
    }
  }

  private handleSwordHit(hitbox: Phaser.GameObjects.Rectangle, damage: number, isSlam: boolean = false) {
    // Hit enemies
    this.physics.add.overlap(hitbox, this.enemies, (_hitbox, enemy) => {
      const e = enemy as unknown as Damageable & Phaser.Physics.Arcade.Sprite & {
        die(): void;
        shouldSpawnPoisonCloud?: () => boolean;
      };
      if (!e.isDead()) {
        e.takeDamage(damage);
        this.soundManager.play('splat');
        if (isSlam) {
          this.cameras.main.shake(100, 0.005);
          this.player.pogoBounce();
        }

        if (e.isDead()) {
          this.onEnemyKilled(e);
        } else {
          createSplatter(this, { x: e.x, y: e.y, isKill: isSlam });
        }
      }
    });

    // Hit boss
    if (this.boss && this.boss.getState() === CrabSpiderState.FIGHTING && !this.boss.isDead()) {
      this.physics.add.overlap(hitbox, this.boss, () => {
        if (this.boss && !this.boss.isDead()) {
          this.boss.takeDamage(damage);
          if (isSlam) {
            this.cameras.main.shake(100, 0.005);
            this.player.pogoBounce();
          }
          if (this.boss.isDead()) {
            this.onBossDefeated();
          } else {
            createSplatter(this, { x: this.boss.x, y: this.boss.y, isKill: isSlam });
          }
        }
      });
    }
  }

  private onEnemyKilled(enemy: Damageable & Phaser.Physics.Arcade.Sprite & {
    die(): void;
    shouldSpawnPoisonCloud?: () => boolean;
  }) {
    this.soundManager.play('splat', { volume: 1.5 });
    createSplatter(this, { x: enemy.x, y: enemy.y, isKill: true });

    // Plant zombie: spawn poison cloud on death
    if (enemy.shouldSpawnPoisonCloud?.()) {
      spawnPoisonCloud(this, enemy.x, enemy.y, this.player);
    }

    // Drop coin
    const coin = this.physics.add.sprite(enemy.x, enemy.y - 20, 'coin');
    coin.setBounce(0.5);
    this.physics.add.collider(coin, this.ground);
    this.physics.add.overlap(this.player, coin, () => {
      this.soundManager.play('coin-pickup');
      GameState.getInstance().coins += 5;
      coin.destroy();
    });

    enemy.die();
  }

  private triggerBossEncounter() {
    if (!this.boss) return;

    this.cameras.main.stopFollow();
    this.cameras.main.pan(3000, 300, 1000, 'Power2');

    this.time.delayedCall(1200, () => {
      if (!this.boss) return;

      this.soundManager.play('boss-roar');
      MusicManager.getInstance().play('boss');
      this.boss.triggerEmerge();

      // Lock arena bounds
      this.physics.world.setBounds(2600, 0, 600, 600);
      this.cameras.main.setBounds(2600, 0, 600, 600);
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

      // Set up cracking ground
      this.crackingGround = new CrackingGround(this, this.player, 568, 4);
      this.boss!.setCrackingGround(this.crackingGround);

      // Show boss health bar after emergence
      this.time.delayedCall(1500, () => {
        this.showBossHealthBar();
      });
    });
  }

  private showBossHealthBar() {
    this.bossNameText = this.add.text(400, 50, 'CRAB-SPIDER ABOMINATION', {
      fontSize: '14px',
      color: '#ff0000',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.bossHealthBarBg = this.add.rectangle(400, 70, 304, 14, 0x333333)
      .setScrollFactor(0).setDepth(100);

    this.bossHealthBar = this.add.rectangle(400, 70, 300, 10, 0xff0000)
      .setScrollFactor(0).setDepth(101);
  }

  private onBossDefeated() {
    if (!this.boss) return;

    const bossX = this.boss.x;
    const bossY = this.boss.y;

    createSplatter(this, { x: bossX, y: bossY, isKill: true });

    // Boss death animation
    this.boss.setTint(0x333333);
    this.tweens.add({
      targets: this.boss,
      scaleX: 0.8,
      scaleY: 0.5,
      angle: 90,
      duration: 600,
    });

    // Hide health bar
    if (this.bossHealthBar) this.bossHealthBar.destroy();
    if (this.bossHealthBarBg) this.bossHealthBarBg.destroy();
    if (this.bossNameText) this.bossNameText.destroy();

    // Dissolve web decorations
    for (const web of this.webDecorations) {
      this.tweens.add({
        targets: web,
        alpha: 0,
        duration: 1000,
        delay: Math.random() * 500,
        onComplete: () => web.destroy(),
      });
    }

    // Seal all lava cracks
    if (this.crackingGround) {
      this.crackingGround.sealAll();
    }

    // Destroy boss and drop key
    this.time.delayedCall(800, () => {
      if (this.boss) {
        this.boss.destroy();
        this.boss = null;
      }

      const key = this.physics.add.sprite(bossX, bossY - 20, 'key');
      key.setBounce(0.5);
      this.physics.add.collider(key, this.ground);
      this.physics.add.overlap(this.player, key, () => {
        GameState.getInstance().collectKey(1); // Key index 1
        key.destroy();

        this.time.delayedCall(1500, () => {
          this.scene.stop('HUD');
          this.scene.start('Victory');
        });
      });
    });
  }
}
