import Phaser from 'phaser';
import { GameState } from '../systems/GameState';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Victory' });
  }

  create() {
    const { width, height } = this.scale;
    const gs = GameState.getInstance();
    const level = gs.currentLevel;

    this.add.text(width / 2, height / 3, 'LEVEL COMPLETE!', {
      fontSize: '48px',
      color: '#ffd700',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, `Key #${level} Collected!`, {
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
      if (level < 2) {
        const nextLevel = level + 1;
        gs.currentLevel = nextLevel;
        this.scene.start('Level' + nextLevel);
        this.scene.launch('HUD');
      } else {
        this.scene.start('MainMenu');
      }
    });
  }
}
