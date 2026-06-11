import Phaser from 'phaser';
import { Assets } from '../assets';
import { GAME_H, GAME_W } from '../config';
import { SynthAudio } from '../core/SynthAudio';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create() {
    this.add.image(0, 0, Assets.SKY).setOrigin(0).setTint(0x663333);
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x1a0000, 0.6);

    const title = this.add
      .text(GAME_W / 2, 200, 'YOU GOT EATEN', {
        fontFamily: 'monospace',
        fontSize: '56px',
        fontStyle: 'bold',
        color: '#c41e1e',
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScale(0.3)
      .setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 500, ease: 'Back.easeOut' });

    this.add
      .text(GAME_W / 2, 260, 'The zombies feast tonight...', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#997777',
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(GAME_W / 2, 360, 'PRESS ENTER TO HUNT AGAIN', {
        fontFamily: 'monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#eeeedd',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    // Slow blood drips
    this.add.particles(0, -10, Assets.P_BLOOD, {
      x: { min: 0, max: GAME_W },
      speedY: { min: 40, max: 110 },
      lifespan: 6000,
      quantity: 1,
      frequency: 180,
      scale: { start: 1.5, end: 1 },
      alpha: { start: 0.8, end: 0.3 },
    });

    this.input.keyboard!.on('keydown-ENTER', () => {
      SynthAudio.uiSelect();
      this.scene.start('Level1');
    });

    const padCheck = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const pad = this.input.gamepad?.getPad(0);
        if (pad?.A) {
          padCheck.remove();
          SynthAudio.uiSelect();
          this.scene.start('Level1');
        }
      },
    });
  }
}
