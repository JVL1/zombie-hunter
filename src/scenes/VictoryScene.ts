import Phaser from 'phaser';
import { Assets } from '../assets';
import { GAME_H, GAME_W } from '../config';
import { GameState } from '../core/GameState';
import { SynthAudio } from '../core/SynthAudio';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Victory' });
  }

  create() {
    const gs = GameState.getInstance();
    gs.save();

    this.add.image(0, 0, Assets.SKY).setOrigin(0).setTint(0x88aa88);
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.5);

    this.add
      .text(GAME_W / 2, 130, 'LEVEL 1 CLEARED!', {
        fontFamily: 'monospace',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#ffd700',
        stroke: '#3a2a00',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_W / 2, 185, 'The Abandoned City is yours', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#aaaacc',
      })
      .setOrigin(0.5);

    // Key showcase
    const key = this.add.image(GAME_W / 2, 270, Assets.KEY).setScale(3);
    this.tweens.add({
      targets: key,
      y: 260,
      scale: 3.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.add
      .text(GAME_W / 2, 325, `KEY 1 of 5 COLLECTED`, {
        fontFamily: 'monospace',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffd700',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_W / 2,
        390,
        `coins: ${gs.coins}      best combo: x${gs.bestStreak}`,
        { fontFamily: 'monospace', fontSize: '16px', color: '#cccccc' }
      )
      .setOrigin(0.5);

    const prompt = this.add
      .text(GAME_W / 2, 460, 'PRESS ENTER — Level 2 coming soon!', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#eeeedd',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    // Gold confetti
    this.add.particles(0, -10, Assets.P_SPARK, {
      x: { min: 0, max: GAME_W },
      speedY: { min: 60, max: 160 },
      speedX: { min: -30, max: 30 },
      lifespan: 4000,
      quantity: 2,
      frequency: 60,
      scale: { start: 1.4, end: 0.4 },
      rotate: { min: 0, max: 360 },
      tint: [0xffd700, 0xff8833, 0xffeeaa],
    });

    this.input.keyboard!.on('keydown-ENTER', () => {
      SynthAudio.uiSelect();
      this.scene.start('MainMenu');
    });
  }
}
