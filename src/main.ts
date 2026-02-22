import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';

class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenu' });
  }

  create() {
    this.add.text(400, 300, 'Zombie Hunters', {
      fontSize: '48px',
      color: '#ff0000',
    }).setOrigin(0.5);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 800 },
      debug: true,
    },
  },
  scene: [PreloadScene, MainMenuScene],
};

new Phaser.Game(config);
