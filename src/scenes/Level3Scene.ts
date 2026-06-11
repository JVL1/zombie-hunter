import Phaser from 'phaser';
import { Assets } from '../assets';
import { GAME_W, WORLD } from '../config';
import { lit } from '../fx/Effects';
import { TRAIN, levelByNumber } from '../levels';
import { BaseLevelScene } from './BaseLevelScene';

// Level 3 — The Abandoned Railroad: Henry's zombie-driven train. The train is
// parked (static physics, no moving-platform bugs) but "moving" — speed lines
// streak past while the camera is over it, smoke pours from the stack, the
// fog rushes by, and a zombie driver idles in the cab.
export class Level3Scene extends BaseLevelScene {
  private speedLines!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super(levelByNumber(3));
  }

  protected buildTerrain() {
    super.buildTerrain();

    // Locomotive. The texture is drawn nose-left/cab-right; flipped so the
    // nose points the direction the train "moves" (right — speed lines streak
    // left and the smoke trails back). Flipped, the cab sits at ~x 1330 and
    // the smokestack at ~x 1450.
    lit(
      this.add
        .image(TRAIN.locomotiveX, WORLD.groundY - 60, Assets.LOCOMOTIVE)
        .setFlipX(true)
        .setDepth(3)
    );
    this.roofRow(TRAIN.locomotiveX, TRAIN.locoRoofY);

    // Boxcars: decoration body (no physics) + a walkable roof slab. The 88px
    // corridor under the roof solids lets the player and small zombies pass
    // beneath; a Zanter (116px body) can't fit and hops sadly at the entrances.
    for (const x of TRAIN.carXs) {
      lit(this.add.image(x, WORLD.groundY - 44, Assets.TRAIN_CAR).setDepth(3));
      this.roofRow(x, TRAIN.carRoofY);
    }
  }

  // Row of roof slab solids (32x16 each, TRAIN.roofW total) centered on a
  // car/locomotive — the invariant tests model walkable spans off roofW
  private roofRow(centerX: number, y: number) {
    const left = centerX - TRAIN.roofW / 2;
    for (let i = 0; i < TRAIN.roofW / 32; i++) {
      lit(this.solids.create(left + i * 32 + 16, y, Assets.TRAIN_CAR_TOP).setDepth(3));
    }
  }

  protected buildBackdrop() {
    super.buildBackdrop();
    // Track-side signal lamps, red lenses glowing over the rails
    const isWebGL = this.sys.renderer.type === Phaser.WEBGL;
    for (const x of [950, 1250, 2550, 2950]) {
      lit(this.add.image(x, WORLD.groundY - 55, Assets.SIGNAL_LAMP).setDepth(2));
      if (isWebGL) {
        // Lens sits near the pole top (texture y=9 of 110)
        const light = this.lights.addLight(x, WORLD.groundY - 101, 130, 0xff4433, 0.7);
        this.flickerLights.push({ light, base: 0.7, seed: Math.random() * 100 });
      }
    }
  }

  protected buildAmbience(_isWebGL: boolean) {
    // The zombie driver — pure scenery, not in the zombies group. He's just…
    // driving. Faces the nose (right; the sheets natively face right).
    lit(this.add.sprite(1330, 326, Assets.URBAN_IDLE, 0).play('urban-idle').setDepth(4));

    // Smoke pouring from the stack, drifting up and back (left — trailing the
    // train's rightward "motion")
    this.add
      .particles(1450, 340, Assets.P_SMOKE, {
        speedX: { min: -90, max: -60 },
        speedY: { min: -40, max: -15 },
        scale: { start: 1, end: 2.4 },
        alpha: { start: 0.5, end: 0 },
        lifespan: 1800,
        frequency: 70,
      })
      .setDepth(4);

    // Speed lines — screen-space like the rain, but horizontal. Only emit
    // while the camera is over the train (gated in update()).
    this.speedLines = this.add
      .particles(0, 0, Assets.P_SPEEDLINE, {
        x: GAME_W + 20,
        y: { min: 40, max: 380 },
        speedX: { min: -700, max: -520 },
        lifespan: 1600,
        frequency: 90,
        alpha: { start: 0.35, end: 0 },
      })
      .setScrollFactor(0)
      .setDepth(8);
    this.speedLines.emitting = false;
  }

  update(time: number, delta: number) {
    // The "moving train" illusion runs while the camera is over the train:
    // speed lines streak past and the fog rushes by 3x faster. The camera
    // deadzone trails the player by ~535px moving right, so 820 switches the
    // effect on as the player climbs the locomotive's cab end (x≈1355), not
    // a car and a half later. Gate BEFORE super.update() so the fog drift
    // this frame already uses the new multiplier.
    const camX = this.cameras.main.scrollX;
    const overTrain = camX > 820 && camX < 2400;
    this.speedLines.emitting = overTrain;
    this.fogDriftMultiplier = overTrain ? 3 : 1;
    super.update(time, delta);
  }
}
