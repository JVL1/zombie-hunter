import Phaser from 'phaser';
import { Assets } from '../assets';
import { GAME_H, GAME_W, WORLD } from '../config';
import { lit } from '../fx/Effects';
import { levelByNumber } from '../levels';
import { BaseLevelScene } from './BaseLevelScene';

// Level 5 — The Sugar Rush Zone. Wes (5) designed it: a candy world gone
// rotten, with gummy bear, gumball, and chocolate zombies, bouncy marshmallows,
// and the Gummy Worm King. The base drives the whole candy system from
// def.candy (pads, enemies, sour candy, portal) — this subclass only paints
// the mood: a cupcake skyline, a chocolate river, lollipop trees, and
// sprinkles falling from the sky.
export class Level5Scene extends BaseLevelScene {
  constructor() {
    super(levelByNumber(5));
  }

  protected buildBackdrop() {
    super.buildBackdrop();

    // A faint candy-pink wash over the night sky. A Rectangle fill renders on
    // Canvas (a setTint on the sky would not).
    this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0xff7ac0, 0.07)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-5.5);

    // Cupcake skyline, far away (slow parallax).
    for (let x = 60; x < this.def.worldWidth * 0.6 + GAME_W; x += 150) {
      const s = 1.2 + ((x * 7) % 5) * 0.12;
      lit(
        this.add
          .image(x, WORLD.groundY - 34, Assets.CUPCAKE)
          .setOrigin(0.5, 1)
          .setScale(s)
          .setScrollFactor(0.6)
          .setAlpha(0.75)
          .setDepth(-5)
      );
    }

    // The chocolate river flows behind the ground (Wes's pick was the
    // marshmallows, so the river is scenery, not a hazard).
    this.add
      .tileSprite(0, WORLD.groundY - 30, this.def.worldWidth, 24, Assets.CHOCOLATE_RIVER)
      .setOrigin(0, 0)
      .setScrollFactor(0.85)
      .setDepth(-4);
  }

  protected buildTerrain() {
    super.buildTerrain();
    const isWebGL = this.sys.renderer.type === Phaser.WEBGL;

    // Lollipop trees along the path — scenery only, no physics.
    for (const x of [260, 980, 1560, 2140, 2700, 3060, 3560]) {
      lit(
        this.add
          .image(x, WORLD.groundY + 2, Assets.LOLLIPOP_TREE)
          .setOrigin(0.5, 1)
          .setDepth(2)
      );
      if (isWebGL) {
        const light = this.lights.addLight(x, WORLD.groundY - 96, 180, 0xff8ac8, 0.7);
        this.flickerLights.push({ light, base: 0.7, seed: x });
      }
    }
  }

  protected buildAmbience(_isWebGL: boolean) {
    // Sprinkles fall from the sky like candy rain.
    this.add
      .particles(0, -10, Assets.P_SPRINKLE, {
        x: { min: 0, max: GAME_W },
        speedY: { min: 45, max: 95 },
        speedX: { min: -18, max: 18 },
        rotate: { start: 0, end: 360 },
        lifespan: 8000,
        alpha: { start: 0.85, end: 0.4 },
        frequency: 110,
      })
      .setScrollFactor(0)
      .setDepth(8);
  }
}
