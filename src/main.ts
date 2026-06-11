import Phaser from 'phaser';
import { GAME_H, GAME_W } from './config';
import { GameOverScene } from './scenes/GameOverScene';
import { HUDScene } from './scenes/HUDScene';
import { Level1Scene } from './scenes/Level1Scene';
import { Level2Scene } from './scenes/Level2Scene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { PreloadScene } from './scenes/PreloadScene';
import { VictoryScene } from './scenes/VictoryScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL where available (required for lighting/postFX); canvas fallback still playable
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#0a0a14',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1000 },
      debug: false,
    },
  },
  input: {
    gamepad: true,
  },
  scene: [PreloadScene, MainMenuScene, Level1Scene, Level2Scene, HUDScene, VictoryScene, GameOverScene],
};

const game = new Phaser.Game(config);
// Exposed for debugging and automated playtesting
(window as unknown as { game: Phaser.Game }).game = game;
