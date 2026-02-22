import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Zombie } from '../entities/Zombie';
import { Boss, BossState } from '../entities/Boss';
import { createSplatter } from '../systems/Splatter';
import { GameState } from '../systems/GameState';
import { SoundManager } from '../systems/SoundManager';

export class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private zombies!: Phaser.GameObjects.Group;
  private contactCooldown = new Map<Zombie, number>();
  private boss!: Boss;
  private bossTriggered = false;
  private bossHealthBar!: Phaser.GameObjects.Rectangle;
  private bossHealthBarBg!: Phaser.GameObjects.Rectangle;
  private lastBossHitTime = 0;
  private soundManager!: SoundManager;

  constructor() {
    super({ key: 'Level1' });
  }

  create() {
    this.soundManager = new SoundManager(this);

    // Set world bounds wider than screen for scrolling
    this.physics.world.setBounds(0, 0, 3200, 600);

    // Create ground — tiled across the level width
    this.ground = this.physics.add.staticGroup();
    for (let x = 0; x < 3200; x += 32) {
      this.ground.create(x + 16, 584, 'ground-tile');
    }

    // Add some platforms
    this.createPlatform(300, 450, 5);
    this.createPlatform(700, 350, 4);
    this.createPlatform(1100, 400, 6);
    this.createPlatform(1600, 350, 4);
    this.createPlatform(2000, 450, 5);
    this.createPlatform(2500, 350, 3);

    // Create player
    this.player = new Player(this, 100, 500);
    this.physics.add.collider(this.player, this.ground);

    // Camera follows player
    this.cameras.main.setBounds(0, 0, 3200, 600);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Debug toggle (press D)
    this.input.keyboard!.addKey('D').on('down', () => {
      this.physics.world.drawDebug = !this.physics.world.drawDebug;
      if (!this.physics.world.drawDebug) {
        this.physics.world.debugGraphic.clear();
      }
    });

    // Launch HUD overlay
    this.scene.launch('HUD');

    // Spawn zombies
    this.zombies = this.add.group();
    const positions = [400, 600, 900, 1200, 1500, 1800, 2100, 2400];
    for (const x of positions) {
      const zombie = new Zombie(this, x, 500);
      zombie.setTarget(this.player);
      this.zombies.add(zombie);
    }

    // Zombie-ground collision
    this.physics.add.collider(this.zombies, this.ground);

    // Player-zombie contact damage
    this.physics.add.overlap(this.player, this.zombies, (player, zombie) => {
      const z = zombie as unknown as Zombie;
      const now = this.time.now;
      const lastHit = this.contactCooldown.get(z) ?? 0;
      if (now - lastHit > 1000) {
        this.contactCooldown.set(z, now);
        this.player.takeDamage(z.getDamage());
      }
    }, undefined, this);

    // Sword-zombie combat
    this.events.on('player-attack', (hitbox: Phaser.GameObjects.Rectangle) => {
      this.soundManager.play('sword-swing');
      this.physics.add.overlap(hitbox, this.zombies, (_hitbox, zombie) => {
        const z = zombie as unknown as Zombie;
        if (!z.isDead()) {
          z.takeDamage(GameState.getInstance().swordDamage);
          this.soundManager.play('splat');
          if (z.isDead()) {
            this.onZombieKilled(z);
          } else {
            createSplatter(this, { x: z.x, y: z.y, isKill: false });
          }
        }
      });

      // Sword-boss combat
      if (this.boss && this.boss.getState() === BossState.FIGHTING && !this.boss.isDead()) {
        this.physics.add.overlap(hitbox, this.boss, () => {
          if (!this.boss.isDead()) {
            this.boss.takeDamage(GameState.getInstance().swordDamage);
            if (this.boss.isDead()) {
              this.onBossDefeated();
            } else {
              createSplatter(this, { x: this.boss.x, y: this.boss.y, isKill: false });
            }
          }
        });
      }
    });

    this.events.on('player-died', () => {
      this.scene.stop('HUD');
      this.scene.start('GameOver');
    });

    // Create boss at end of level
    this.boss = new Boss(this, 2950, 520);
    this.boss.setTarget(this.player);
    this.physics.add.collider(this.boss, this.ground);

    // Boss contact damage
    this.physics.add.overlap(this.player, this.boss, () => {
      if (this.boss.getState() !== BossState.FIGHTING || this.boss.isDead()) return;
      const now = this.time.now;
      if (now - this.lastBossHitTime > 1000) {
        this.lastBossHitTime = now;
        this.player.takeDamage(this.boss.getDamage());
      }
    }, undefined, this);
  }

  update(time: number, delta: number) {
    this.player.update();
    this.zombies.getChildren().forEach((z) => {
      (z as Zombie).update(time, delta);
    });

    // Boss trigger check
    if (!this.bossTriggered && this.player.x > 2700) {
      this.bossTriggered = true;
      this.triggerBossEncounter();
    }

    // Boss update
    if (this.boss && this.boss.getState() === BossState.FIGHTING) {
      this.boss.update(time, delta);
    }

    // Boss health bar update
    if (this.bossHealthBar && this.boss && !this.boss.isDead()) {
      const healthPercent = this.boss.health / this.boss.maxHealth;
      this.bossHealthBar.width = 300 * healthPercent;
    }
  }

  private createPlatform(x: number, y: number, tileCount: number) {
    for (let i = 0; i < tileCount; i++) {
      this.ground.create(x + i * 32 + 16, y, 'platform-tile');
    }
  }

  private onZombieKilled(zombie: Zombie) {
    this.soundManager.play('splat', { volume: 1.5 });
    createSplatter(this, { x: zombie.x, y: zombie.y, isKill: true });

    // Drop coin
    const coin = this.physics.add.sprite(zombie.x, zombie.y - 20, 'coin');
    coin.setBounce(0.5);
    this.physics.add.collider(coin, this.ground);
    this.physics.add.overlap(this.player, coin, () => {
      this.soundManager.play('coin-pickup');
      GameState.getInstance().coins += 5;
      coin.destroy();
    });

    zombie.destroy();
  }

  private triggerBossEncounter() {
    // Stop camera following player
    this.cameras.main.stopFollow();

    // Pan camera to boss area
    this.cameras.main.pan(2900, 300, 1000, 'Power2');

    // After delay, boss rises
    this.time.delayedCall(1200, () => {
      this.boss.triggerRise();

      // Lock world bounds to boss arena
      this.physics.world.setBounds(2600, 0, 600, 600);

      // Re-follow player within locked bounds
      this.cameras.main.setBounds(2600, 0, 600, 600);
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

      // Show boss health bar
      this.showBossHealthBar();
    });
  }

  private showBossHealthBar() {
    // Boss name text
    const bossNameText = this.add.text(400, 50, 'MUTATED ZOMBIE', {
      fontSize: '16px',
      color: '#ff0000',
      fontStyle: 'bold',
    });
    bossNameText.setOrigin(0.5);
    bossNameText.setScrollFactor(0);
    bossNameText.setDepth(100);

    // Health bar background
    this.bossHealthBarBg = this.add.rectangle(400, 70, 304, 14, 0x333333);
    this.bossHealthBarBg.setScrollFactor(0);
    this.bossHealthBarBg.setDepth(100);

    // Health bar fill
    this.bossHealthBar = this.add.rectangle(400, 70, 300, 10, 0xff0000);
    this.bossHealthBar.setScrollFactor(0);
    this.bossHealthBar.setDepth(101);
  }

  private onBossDefeated() {
    createSplatter(this, { x: this.boss.x, y: this.boss.y, isKill: true });

    // Throne crumbles
    this.boss.destroyThrone();

    // Hide health bar
    if (this.bossHealthBar) this.bossHealthBar.destroy();
    if (this.bossHealthBarBg) this.bossHealthBarBg.destroy();

    // Drop key #1
    const key = this.physics.add.sprite(this.boss.x, this.boss.y - 20, 'key');
    key.setBounce(0.5);
    this.physics.add.collider(key, this.ground);
    this.physics.add.overlap(this.player, key, () => {
      GameState.getInstance().collectKey(0);
      key.destroy();

      // Transition to Victory after 1500ms
      this.time.delayedCall(1500, () => {
        this.scene.start('Victory');
      });
    });

    this.boss.destroy();
  }
}
