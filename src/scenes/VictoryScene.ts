import Phaser from 'phaser';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Victory' });
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 3, 'LEVEL COMPLETE!', {
      fontSize: '48px',
      color: '#ffd700',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, 'Key #1 Collected!', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 80, 'Press ENTER to continue', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.input.keyboard!.once('keydown-ENTER', () => {
      this.scene.start('MainMenu'); // Later: go to shop, then Level 2
    });
  }
}
