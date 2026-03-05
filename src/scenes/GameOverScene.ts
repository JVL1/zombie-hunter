import Phaser from 'phaser';
import { GameState } from '../systems/GameState';
import { MusicManager } from '../systems/MusicManager';
import { SynthAudio } from '../systems/SynthAudio';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create() {
    MusicManager.getInstance().stop();
    SynthAudio.getInstance().play('game-over');

    const { width, height } = this.scale;

    this.add.text(width / 2, height / 3, 'GAME OVER', {
      fontSize: '56px',
      color: '#cc0000',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 50, 'Press ENTER to retry', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.input.keyboard!.once('keydown-ENTER', () => {
      const gs = GameState.getInstance();
      const level = gs.currentLevel;
      gs.reset();
      gs.currentLevel = level;
      this.scene.start('Level' + level);
      this.scene.launch('HUD');
    });
  }
}
