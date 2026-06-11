import Phaser from 'phaser';
import { Assets } from '../assets';
import { GAME_H, GAME_W } from '../config';
import { GameState } from '../core/GameState';
import { SynthAudio } from '../core/SynthAudio';
import { LEVELS, levelByNumber } from '../levels';

// Title screen: night city skyline, rain, blood moon, flickering title.
export class MainMenuScene extends Phaser.Scene {
  private starting = false;
  private padAWasUp = false;

  constructor() {
    super({ key: 'MainMenu' });
  }

  create() {
    this.starting = false;
    this.padAWasUp = false;

    this.add.image(0, 0, Assets.SKY).setOrigin(0);
    this.add.image(740, 100, Assets.GLOW).setScale(4.5).setTint(0xffbb88).setAlpha(0.5);
    this.add.image(740, 100, Assets.MOON);

    const scale = GAME_H / 324;
    this.add
      .tileSprite(0, 0, GAME_W / scale + 4, 324, Assets.RUIN_NIGHT_FAR)
      .setOrigin(0)
      .setScale(scale);
    this.add
      .tileSprite(0, 0, GAME_W / scale + 4, 324, Assets.RUIN_NIGHT_MID)
      .setOrigin(0)
      .setScale(scale);
    this.add
      .tileSprite(0, 0, GAME_W / scale + 4, 324, Assets.RUIN_NIGHT_NEAR)
      .setOrigin(0)
      .setScale(scale);

    // Readability scrim behind the text block
    this.add.rectangle(GAME_W / 2, 300, GAME_W, 480, 0x05050c, 0.45);

    // Rain
    this.add.particles(0, 0, Assets.P_RAIN, {
      x: { min: -40, max: GAME_W + 60 },
      y: -20,
      speedY: { min: 480, max: 580 },
      speedX: { min: -70, max: -50 },
      lifespan: 1300,
      quantity: 3,
      frequency: 18,
      alpha: { start: 0.5, end: 0.2 },
      rotate: -7,
    });

    // Title with drop shadow + blood red flicker
    const shadow = this.add
      .text(GAME_W / 2 + 5, 165, 'ZOMBIE HUNTERS', {
        fontFamily: 'monospace',
        fontSize: '64px',
        fontStyle: 'bold',
        color: '#000000',
      })
      .setOrigin(0.5)
      .setAlpha(0.7);
    const title = this.add
      .text(GAME_W / 2, 160, 'ZOMBIE HUNTERS', {
        fontFamily: 'monospace',
        fontSize: '64px',
        fontStyle: 'bold',
        color: '#c41e1e',
        stroke: '#3a0505',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: title,
      alpha: 0.82,
      duration: 90,
      yoyo: true,
      repeat: -1,
      repeatDelay: 2200 + Math.random() * 1500,
    });
    void shadow;

    this.add
      .text(GAME_W / 2, 215, 'a Henry & Josh production', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#8888a0',
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(GAME_W / 2, 320, 'PRESS ENTER TO HUNT', {
        fontFamily: 'monospace',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#eeeedd',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: prompt,
      alpha: 0.25,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Replay hint — only once at least one level has been cleared
    if (GameState.getInstance().currentLevel > 1) {
      this.add
        .text(
          GAME_W / 2,
          355,
          `1-${Math.min(GameState.getInstance().currentLevel, LEVELS.length)}: replay a cleared level`,
          {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#8888a0',
          }
        )
        .setOrigin(0.5);
    }

    this.add
      .text(
        GAME_W / 2,
        420,
        '←→ move      ↑ / SPACE jump & double jump      A / J attack\n' +
          'SHIFT dash      attack while falling = SWORD SLAM      🎮 gamepad works',
        {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#9090a8',
          align: 'center',
          lineSpacing: 8,
        }
      )
      .setOrigin(0.5);

    // Unlock audio on any interaction; ENTER / click / gamepad A starts
    this.input.keyboard!.on('keydown', () => SynthAudio.unlock());
    this.input.on('pointerdown', () => SynthAudio.unlock());
    this.input.keyboard!.on('keydown-ENTER', () => this.startGame());
    this.input.on('pointerdown', () => this.startGame());

    // Number keys replay cleared levels (kid-friendly: show friends Level 1 after beating it)
    const keyNames = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'];
    for (let n = 1; n <= LEVELS.length; n++) {
      this.input.keyboard!.on(`keydown-${keyNames[n - 1]}`, () => {
        if (this.starting) return;
        const gs = GameState.getInstance();
        if (n > gs.currentLevel) return; // locked
        gs.currentLevel = n; // retry/GameOver routing follows the replayed level
        gs.save();
        this.starting = true;
        SynthAudio.unlock();
        SynthAudio.uiSelect();
        this.scene.start(levelByNumber(n).sceneKey);
      });
    }
  }

  update() {
    // Edge-triggered: A may still be held from Victory's gamepad advance — require a release first
    const pad = this.input.gamepad?.getPad(0);
    if (!pad) return;
    if (!pad.A) {
      this.padAWasUp = true;
      return;
    }
    if (this.padAWasUp) {
      SynthAudio.unlock();
      this.startGame();
    }
  }

  private startGame() {
    if (this.starting) return;
    this.starting = true;
    SynthAudio.unlock();
    SynthAudio.uiSelect();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(550, () =>
      this.scene.start(GameState.getInstance().currentLevelDef.sceneKey)
    );
  }
}
