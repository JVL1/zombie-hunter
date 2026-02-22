import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  create() {
    // Player — blue rectangle
    const playerGfx = this.make.graphics({ x: 0, y: 0, add: false });
    playerGfx.fillStyle(0x3498db);
    playerGfx.fillRect(0, 0, 32, 48);
    playerGfx.generateTexture('player', 32, 48);

    // Zombie — green rectangle
    const zombieGfx = this.make.graphics({ x: 0, y: 0, add: false });
    zombieGfx.fillStyle(0x2ecc71);
    zombieGfx.fillRect(0, 0, 32, 48);
    zombieGfx.generateTexture('zombie', 32, 48);

    // Boss — large red rectangle
    const bossGfx = this.make.graphics({ x: 0, y: 0, add: false });
    bossGfx.fillStyle(0xe74c3c);
    bossGfx.fillRect(0, 0, 64, 72);
    bossGfx.generateTexture('boss', 64, 72);

    // Throne — brown rectangle
    const throneGfx = this.make.graphics({ x: 0, y: 0, add: false });
    throneGfx.fillStyle(0x8b4513);
    throneGfx.fillRect(0, 0, 80, 96);
    throneGfx.generateTexture('throne', 80, 96);

    // Coin — yellow circle
    const coinGfx = this.make.graphics({ x: 0, y: 0, add: false });
    coinGfx.fillStyle(0xf1c40f);
    coinGfx.fillCircle(8, 8, 8);
    coinGfx.generateTexture('coin', 16, 16);

    // Key — gold rectangle
    const keyGfx = this.make.graphics({ x: 0, y: 0, add: false });
    keyGfx.fillStyle(0xffd700);
    keyGfx.fillRect(0, 0, 16, 24);
    keyGfx.generateTexture('key', 16, 24);

    // Sword hitbox — transparent white
    const swordGfx = this.make.graphics({ x: 0, y: 0, add: false });
    swordGfx.fillStyle(0xffffff, 0.3);
    swordGfx.fillRect(0, 0, 40, 32);
    swordGfx.generateTexture('sword-hitbox', 40, 32);

    // Particle textures — small squares
    const bloodGfx = this.make.graphics({ x: 0, y: 0, add: false });
    bloodGfx.fillStyle(0xcc0000);
    bloodGfx.fillRect(0, 0, 4, 4);
    bloodGfx.generateTexture('blood', 4, 4);

    const skinGfx = this.make.graphics({ x: 0, y: 0, add: false });
    skinGfx.fillStyle(0xccaa88);
    skinGfx.fillRect(0, 0, 4, 4);
    skinGfx.generateTexture('skin', 4, 4);

    const brainGfx = this.make.graphics({ x: 0, y: 0, add: false });
    brainGfx.fillStyle(0xff69b4);
    brainGfx.fillRect(0, 0, 5, 5);
    brainGfx.generateTexture('brain', 5, 5);

    // Ground tile
    const groundGfx = this.make.graphics({ x: 0, y: 0, add: false });
    groundGfx.fillStyle(0x555555);
    groundGfx.fillRect(0, 0, 32, 32);
    groundGfx.lineStyle(1, 0x666666);
    groundGfx.strokeRect(0, 0, 32, 32);
    groundGfx.generateTexture('ground-tile', 32, 32);

    // Platform tile
    const platGfx = this.make.graphics({ x: 0, y: 0, add: false });
    platGfx.fillStyle(0x777777);
    platGfx.fillRect(0, 0, 32, 32);
    platGfx.generateTexture('platform-tile', 32, 32);

    this.scene.start('MainMenu');
  }
}
