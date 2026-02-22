import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { Level1Scene } from './scenes/Level1Scene';
import { HUDScene } from './scenes/HUDScene';
import { VictoryScene } from './scenes/VictoryScene';
import { GameOverScene } from './scenes/GameOverScene';

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
  scene: [PreloadScene, MainMenuScene, Level1Scene, HUDScene, VictoryScene, GameOverScene],
};

new Phaser.Game(config);
