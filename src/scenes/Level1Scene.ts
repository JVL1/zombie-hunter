import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Zombie } from '../entities/Zombie';
import { createSplatter } from '../systems/Splatter';

export class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private zombies!: Phaser.GameObjects.Group;
  private contactCooldown = new Map<Zombie, number>();

  constructor() {
    super({ key: 'Level1' });
  }

  create() {
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
        // TODO: player.takeDamage will be added in Task 7
      }
    }, undefined, this);

    // Sword-zombie combat
    this.events.on('player-attack', (hitbox: Phaser.GameObjects.Rectangle) => {
      this.physics.add.overlap(hitbox, this.zombies, (_hitbox, zombie) => {
        const z = zombie as unknown as Zombie;
        if (!z.isDead()) {
          z.takeDamage(10); // Base sword damage
          if (z.isDead()) {
            this.onZombieKilled(z);
          } else {
            createSplatter(this, { x: z.x, y: z.y, isKill: false });
          }
        }
      });
    });
  }

  update(time: number, delta: number) {
    this.player.update();
    this.zombies.getChildren().forEach((z) => {
      (z as Zombie).update(time, delta);
    });
  }

  private createPlatform(x: number, y: number, tileCount: number) {
    for (let i = 0; i < tileCount; i++) {
      this.ground.create(x + i * 32 + 16, y, 'platform-tile');
    }
  }

  private onZombieKilled(zombie: Zombie) {
    createSplatter(this, { x: zombie.x, y: zombie.y, isKill: true });
    zombie.destroy();
  }
}
