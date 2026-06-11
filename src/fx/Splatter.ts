import Phaser from 'phaser';
import { Assets } from '../assets';

// Gore: particle bursts on hit/kill, plus persistent blood decals stamped onto
// a level-wide RenderTexture so the carnage stays on the ground.
export class GoreSystem {
  private scene: Phaser.Scene;
  private decals: Phaser.GameObjects.RenderTexture;
  private decalKeys = [Assets.DECAL_1, Assets.DECAL_2, Assets.DECAL_3];

  constructor(scene: Phaser.Scene, worldW: number, worldH: number, depth: number) {
    this.scene = scene;
    this.decals = scene.add.renderTexture(0, 0, worldW, worldH).setOrigin(0).setDepth(depth);
    this.decals.setAlpha(0.85);
  }

  burst(x: number, y: number, isKill: boolean) {
    const configs: Array<{ key: string; qty: number }> = isKill
      ? [
          { key: Assets.P_BLOOD, qty: 22 },
          { key: Assets.P_SKIN, qty: 8 },
          { key: Assets.P_BRAIN, qty: 6 },
        ]
      : [
          { key: Assets.P_BLOOD, qty: 8 },
          { key: Assets.P_SKIN, qty: 3 },
        ];

    for (const { key, qty } of configs) {
      this.scene.add
        .particles(x, y, key, {
          speed: { min: 60, max: isKill ? 240 : 150 },
          angle: { min: 180, max: 360 },
          scale: { start: 1.4, end: 0.2 },
          lifespan: { min: 300, max: 700 },
          quantity: qty,
          emitting: false,
          gravityY: 500,
          rotate: { min: 0, max: 360 },
        })
        .explode(qty);
    }
  }

  // Stamp a permanent blood splat (call with the ground-surface y).
  stampDecal(x: number, groundY: number, big = false) {
    const key = this.decalKeys[Math.floor(Math.random() * this.decalKeys.length)];
    const scale = (big ? 1.4 : 0.9) + Math.random() * 0.5;
    const w = 48 * scale;
    this.decals.drawFrame(key, undefined, x - w / 2, groundY - 6);
    if (big) {
      // Extra spray around the main stamp
      for (let i = 0; i < 2; i++) {
        const off = (Math.random() - 0.5) * 70;
        this.decals.drawFrame(
          this.decalKeys[Math.floor(Math.random() * this.decalKeys.length)],
          undefined,
          x + off - 16,
          groundY - 4
        );
      }
    }
  }
}
