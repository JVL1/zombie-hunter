import Phaser from 'phaser';
import { Assets } from '../assets';
import { GAME_H, GAME_W, WORLD } from '../config';
import { lit } from '../fx/Effects';
import { levelByNumber } from '../levels';
import { BaseLevelScene } from './BaseLevelScene';

// Level 4 — The Zombified Lake: Henry's Sunken Beast lurks in blood-red murk.
// Everything here is decorative theme dressing on top of the water system
// (swim/air/vents/fish/eel/kraken) the base already drives from def.water.
// Geometry, solids, and the functional vent emitters all belong to the def —
// this subclass only paints the mood.
const SURFACE_Y = 120; // matches def.water.surfaceY — moonlight enters here

export class Level4Scene extends BaseLevelScene {
  constructor() {
    super(levelByNumber(4));
  }

  protected buildBackdrop() {
    super.buildBackdrop();
    const isWebGL = this.sys.renderer.type === Phaser.WEBGL;

    // Blood-red murk: a screen-locked wash tinting the whole view red. Depth 9
    // sits it OVER the play field (terrain 3 / entities 4-6 / ambience) so it
    // actually washes the foreground — at depth 1 it hid behind the already-red
    // parallax and did nothing. Kept below the intro banner (50) and boss
    // letterbox/health bar (100+) so those stay legible. Rectangle fill renders
    // on canvas (setTint would not). Depth + alpha are a feel call — tune with Henry.
    this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0x3a0808, 0.16)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(9);

    // Moonlight shafts filtering down from the surface — the level's lamppost
    // analog. Angled, low-alpha, breathing (not flickering like fire), with an
    // optional WebGL glow at the surface entry point. Deliberately NOT lit() —
    // these are emissive; the Light2D pipeline would darken the beam under the
    // dark ambient. (Mirrors Level2's moonbeams — the one lit() exception here.)
    for (const x of [500, 1150, 1900, 2650, 3150]) {
      const shaft = this.add
        .image(x, SURFACE_Y, Assets.MOONBEAM)
        .setOrigin(0.5, 0)
        .setScale(1.1, 2.2)
        .setRotation(0.18)
        .setAlpha(0.28)
        .setDepth(1);
      this.tweens.add({
        targets: shaft,
        alpha: { from: 0.18, to: 0.34 },
        duration: 4500,
        yoyo: true,
        repeat: -1,
      });
      if (isWebGL) {
        const light = this.lights.addLight(x, SURFACE_Y + 40, 220, 0xbcd4ff, 0.4);
        this.tweens.add({
          targets: light,
          intensity: { from: 0.28, to: 0.48 },
          duration: 4500,
          yoyo: true,
          repeat: -1,
        });
      }
    }
  }

  protected buildTerrain() {
    super.buildTerrain();

    // Broken hulls: extra decorative stones/planks scattered over a few of the
    // def's platform bands so the wreck route reads as sunken debris, not clean
    // slabs. No physics — the def owns every walkable solid.
    const wrecks: Array<[number, number, string, number]> = [
      [640, 336, Assets.LAKE_STONE, 0],
      [700, 344, Assets.LAKE_PLATFORM, 0.12],
      [1120, 236, Assets.LAKE_STONE, -0.1],
      [1620, 366, Assets.LAKE_PLATFORM, -0.08],
      [2120, 276, Assets.LAKE_STONE, 0.14],
      [3020, 316, Assets.LAKE_PLATFORM, 0.1],
    ];
    for (const [x, y, key, rot] of wrecks) {
      lit(
        this.add
          .image(x, y, key)
          .setRotation(rot)
          .setAlpha(0.9)
          .setDepth(3)
      );
    }
  }

  protected buildAmbience(_isWebGL: boolean) {
    // Floating debris drift — flecks of silt and skin wandering sideways/up
    // through the water column. Sparse and low-alpha so it reads as mood, not
    // snow. A wide emit zone spreads each emitter across the world.
    for (const x of [700, 1600, 2500, 3200]) {
      const driftZone: Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig = {
        type: 'random',
        source: new Phaser.Geom.Rectangle(
          -350,
          -160,
          700,
          360
        ) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource,
      };
      this.add
        .particles(x, 280, Assets.P_DUST, {
          speedX: { min: 6, max: 22 },
          speedY: { min: -14, max: -4 },
          lifespan: { min: 4000, max: 7000 },
          alpha: { start: 0.22, end: 0 },
          scale: { start: 0.8, end: 0.3 },
          frequency: 340,
          emitZone: driftZone,
        })
        .setDepth(4);
    }

    // Blood wisps — threads of blood curling slowly upward. The "blood in the
    // water" that names the level.
    for (const x of [420, 1300, 2200, 2900]) {
      this.add
        .particles(x, 420, Assets.P_BLOOD, {
          speedX: { min: -10, max: 10 },
          speedY: { min: -28, max: -12 },
          lifespan: { min: 3500, max: 6000 },
          alpha: { start: 0.28, end: 0 },
          scale: { start: 0.6, end: 1.4 },
          frequency: 420,
        })
        .setDepth(5);
    }

    // Decorative bubble columns — purely cosmetic, placed away from the def's 6
    // functional vents. A couple of lazy streams rising to the surface.
    for (const x of [1750, 2450]) {
      this.add
        .particles(x, WORLD.groundY - 20, Assets.VENT_BUBBLE, {
          speedX: { min: -6, max: 6 },
          speedY: { min: -70, max: -40 },
          lifespan: { min: 5000, max: 7000 },
          alpha: { start: 0.4, end: 0 },
          scale: { start: 0.5, end: 1.1 },
          frequency: 600,
        })
        .setDepth(6);
    }
  }
}
