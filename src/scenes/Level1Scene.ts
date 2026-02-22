import Phaser from 'phaser';
import { Player } from '../entities/Player';

export class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private ground!: Phaser.Physics.Arcade.StaticGroup;

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
  }

  update() {
    this.player.update();
  }

  private createPlatform(x: number, y: number, tileCount: number) {
    for (let i = 0; i < tileCount; i++) {
      this.ground.create(x + i * 32 + 16, y, 'platform-tile');
    }
  }
}
