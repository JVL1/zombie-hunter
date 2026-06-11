import { Assets } from '../assets';
import { GAME_W, WORLD } from '../config';
import { SynthAudio } from '../core/SynthAudio';
import { lit } from '../fx/Effects';
import { levelByNumber } from '../levels';
import { BaseLevelScene } from './BaseLevelScene';

// Level 1 — The Abandoned City, at night, in the rain.
export class Level1Scene extends BaseLevelScene {
  constructor() {
    super(levelByNumber(1));
  }

  protected buildAmbience(isWebGL: boolean) {
    // Fire barrels with ember plumes + flickering light
    for (const x of [550, 1300, 1900, 2700]) {
      const y = WORLD.groundY - 15;
      lit(this.add.image(x, y, Assets.BARREL).setDepth(3));
      this.add.particles(x, y - 14, Assets.P_EMBER, {
        speed: { min: 12, max: 45 },
        angle: { min: 250, max: 290 },
        scale: { start: 1, end: 0 },
        alpha: { start: 0.9, end: 0 },
        lifespan: { min: 500, max: 1100 },
        frequency: 90,
        gravityY: -40,
      });
      if (isWebGL) {
        const light = this.lights.addLight(x, y - 10, 190, 0xff7733, 1.0);
        this.flickerLights.push({ light, base: 1.0, seed: Math.random() * 100 });
      }
    }

    // Broken lampposts — cold, unreliable light
    for (const x of [800, 2350]) {
      lit(this.add.image(x, WORLD.groundY - 60, Assets.LAMPPOST).setDepth(2));
      if (isWebGL) {
        const light = this.lights.addLight(x - 6, WORLD.groundY - 116, 170, 0xbbccff, 0.8);
        this.flickerLights.push({ light, base: 0.8, seed: 7 + Math.random() * 100 });
      }
    }

    // Rain (screen-space)
    this.add
      .particles(0, 0, Assets.P_RAIN, {
        x: { min: -40, max: GAME_W + 60 },
        y: -20,
        speedY: { min: 480, max: 580 },
        speedX: { min: -70, max: -50 },
        lifespan: 1300,
        quantity: 3,
        frequency: 18,
        alpha: { start: 0.55, end: 0.25 },
        rotate: -7,
      })
      .setScrollFactor(0)
      .setDepth(8);

    // Lightning
    const scheduleLightning = () => {
      this.time.delayedCall(7000 + Math.random() * 8000, () => {
        if (!this.scene.isActive()) return;
        this.cameras.main.flash(140, 190, 200, 235, false);
        this.time.delayedCall(120, () => this.cameras.main.flash(90, 150, 160, 200, false));
        SynthAudio.thunder();
        scheduleLightning();
      });
    };
    scheduleLightning();
  }
}
