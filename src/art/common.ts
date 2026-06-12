import type Phaser from 'phaser';
import { Assets } from '../assets';
import { GAME_H, GAME_W } from '../config';

export function generateCommonTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // --- Night sky gradient with stars ---
  g.fillGradientStyle(0x0b0b1e, 0x0b0b1e, 0x251438, 0x251438, 1);
  g.fillRect(0, 0, GAME_W, GAME_H * 0.6);
  g.fillGradientStyle(0x251438, 0x251438, 0x5a2e30, 0x5a2e30, 1);
  g.fillRect(0, GAME_H * 0.6, GAME_W, GAME_H * 0.4);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * GAME_W;
    const y = Math.random() * GAME_H * 0.55;
    g.fillStyle(0xffffff, 0.2 + Math.random() * 0.6);
    g.fillRect(x, y, Math.random() < 0.15 ? 2 : 1, Math.random() < 0.15 ? 2 : 1);
  }
  g.generateTexture(Assets.SKY, GAME_W, GAME_H);
  g.clear();

  // --- Blood moon ---
  for (let r = 46; r > 38; r -= 2) {
    g.fillStyle(0xff8866, 0.05);
    g.fillCircle(48, 48, r);
  }
  g.fillStyle(0xffd9b0, 1);
  g.fillCircle(48, 48, 36);
  g.fillStyle(0xe8b890, 0.7);
  g.fillCircle(38, 40, 7);
  g.fillCircle(56, 58, 5);
  g.fillCircle(58, 36, 4);
  g.fillCircle(42, 60, 3);
  g.generateTexture(Assets.MOON, 96, 96);
  g.clear();

  // --- Soft glow ---
  for (let r = 32; r > 4; r -= 4) {
    g.fillStyle(0xffffff, 0.05 + (32 - r) * 0.004);
    g.fillCircle(32, 32, r);
  }
  g.generateTexture(Assets.GLOW, 64, 64);
  g.clear();

  // --- Coin ---
  g.fillStyle(0xb8860b, 1);
  g.fillCircle(7, 7, 7);
  g.fillStyle(0xffd24a, 1);
  g.fillCircle(7, 7, 5.5);
  g.fillStyle(0xfff0a0, 1);
  g.fillCircle(5, 5, 2);
  g.generateTexture(Assets.COIN, 14, 14);
  g.clear();

  // --- Heart ---
  g.fillStyle(0xff4466, 1);
  g.fillCircle(5, 5, 4.5);
  g.fillCircle(12, 5, 4.5);
  g.fillTriangle(1, 7, 16, 7, 8.5, 16);
  g.fillStyle(0xff8899, 1);
  g.fillCircle(4.5, 4.5, 1.8);
  g.generateTexture(Assets.HEART, 17, 16);
  g.clear();

  // --- Key ---
  g.lineStyle(4, 0xffd24a, 1);
  g.strokeCircle(10, 8, 6);
  g.fillStyle(0xffd24a, 1);
  g.fillRect(8, 14, 4, 16);
  g.fillRect(12, 22, 6, 3);
  g.fillRect(12, 27, 5, 3);
  g.generateTexture(Assets.KEY, 20, 32);
  g.clear();

  // --- Shockwave ring ---
  g.lineStyle(5, 0xffffff, 1);
  g.strokeCircle(32, 32, 28);
  g.generateTexture(Assets.RING, 64, 64);
  g.clear();

  // --- Fog blob ---
  for (let r = 0; r < 5; r++) {
    g.fillStyle(0xaaaacc, 0.06);
    g.fillEllipse(80, 40, 150 - r * 24, 70 - r * 12);
  }
  g.generateTexture(Assets.FOG, 160, 80);
  g.clear();

  // --- Pixel + particles ---
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 2, 2);
  g.generateTexture(Assets.PIXEL, 2, 2);
  g.clear();

  const particle = (key: string, color: number, w: number, h: number, hi?: number) => {
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    if (hi) {
      g.fillStyle(hi, 1);
      g.fillRect(0, 0, Math.ceil(w / 2), Math.ceil(h / 2));
    }
    g.generateTexture(key, w, h);
    g.clear();
  };
  particle(Assets.P_BLOOD, 0xb01010, 5, 5, 0xd03030);
  particle(Assets.P_SKIN, 0xc9a886, 4, 4);
  particle(Assets.P_BRAIN, 0xe06a9a, 5, 5, 0xf48ab8);
  particle(Assets.P_DUST, 0x9d9d8c, 4, 4);
  particle(Assets.P_EMBER, 0xff8833, 3, 3, 0xffcc55);
  particle(Assets.P_SPARK, 0xffeeaa, 3, 3);
  particle(Assets.P_FIREFLY, 0xd8ff7a, 3, 3, 0xfdffd0);
  particle(Assets.P_SMOKE, 0x777770, 6, 6, 0x9a9a92);
  particle(Assets.P_SPEEDLINE, 0xcfd4dc, 14, 2);

  // Rain streak
  g.fillStyle(0xaaccee, 0.9);
  g.fillRect(0, 0, 2, 12);
  g.generateTexture(Assets.P_RAIN, 2, 12);
  g.clear();

  // --- Blood decals (3 puddle variants) ---
  const decal = (key: string, seed: number) => {
    g.fillStyle(0x7a0d0d, 0.95);
    g.fillEllipse(24, 10, 34 + seed * 4, 9);
    g.fillEllipse(14 - seed * 2, 11, 14, 6);
    g.fillEllipse(36 + seed * 2, 9, 12, 5);
    g.fillStyle(0x5e0a0a, 0.9);
    g.fillEllipse(24, 11, 20, 5);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x7a0d0d, 0.9);
      g.fillCircle(4 + Math.random() * 40, 8 + Math.random() * 6, 1.5);
    }
    g.generateTexture(key, 48, 16);
    g.clear();
  };
  decal(Assets.DECAL_1, 0);
  decal(Assets.DECAL_2, 1);
  decal(Assets.DECAL_3, 2);

  g.destroy();
}
