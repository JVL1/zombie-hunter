import Phaser from 'phaser';
import { Assets } from '../assets';
import { WORLD } from '../config';
import { lit } from '../fx/Effects';
import { levelByNumber } from '../levels';
import { BaseLevelScene } from './BaseLevelScene';

// Level 2 — The Broken Down Forest: dead trees, drifting fireflies,
// moonbeams through the canopy, and zombie horde packs.
export class Level2Scene extends BaseLevelScene {
  constructor() {
    super(levelByNumber(2));
  }

  protected buildBackdrop() {
    super.buildBackdrop();
    // Dead trees rooted along the ground (texture is 150 tall, grounded at its bottom edge)
    [260, 700, 1150, 1600, 2050, 2500, 2950].forEach((x, i) => {
      lit(
        this.add
          .image(x, WORLD.groundY - 75, Assets.DEAD_TREE)
          .setDepth(2)
          .setFlipX(i % 2 === 1)
      );
    });
  }

  protected buildAmbience(isWebGL: boolean) {
    // Firefly clusters — the forest's fire-barrel analog: gentle wandering glow
    for (const x of [600, 1400, 2200, 3000]) {
      const y = WORLD.groundY - 120;
      // Geom.Rectangle is a valid random-zone source at runtime; Phaser's
      // RandomZoneSourceCallback typing just can't see it (generic mismatch)
      const wanderZone: Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig = {
        type: 'random',
        source: new Phaser.Geom.Rectangle(
          -120,
          -90,
          240,
          160
        ) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource,
      };
      this.add.particles(x, y, Assets.P_FIREFLY, {
        speed: { min: 4, max: 18 },
        lifespan: { min: 2500, max: 5000 },
        alpha: { start: 0.9, end: 0 },
        scale: { start: 1, end: 0.4 },
        frequency: 260,
        emitZone: wanderZone,
      });
      if (isWebGL) {
        const light = this.lights.addLight(x, y, 150, 0xaaffaa, 0.55);
        this.flickerLights.push({ light, base: 0.55, seed: Math.random() * 100 });
      }
    }

    // Moonbeams slicing through the canopy — the lamppost analog
    for (const x of [900, 1900, 2750]) {
      const beam = this.add
        .image(x, 0, Assets.MOONBEAM)
        .setOrigin(0.5, 0)
        .setAlpha(0.5)
        .setDepth(-5);
      this.tweens.add({
        targets: beam,
        alpha: { from: 0.35, to: 0.55 },
        duration: 4000,
        yoyo: true,
        repeat: -1,
      });
      if (isWebGL) {
        const light = this.lights.addLight(x, WORLD.groundY - 40, 200, 0xcfe8c0, 0.5);
        this.flickerLights.push({ light, base: 0.5, seed: Math.random() * 100 });
      }
    }
  }
}
