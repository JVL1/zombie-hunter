import type Phaser from 'phaser';
import { Assets } from '../assets';

export function generateCityTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // --- Ground tiles: cracked asphalt with sidewalk lip ---
  g.fillStyle(0x2e2e38, 1);
  g.fillRect(0, 0, 32, 32);
  g.fillStyle(0x4d4d5c, 1);
  g.fillRect(0, 0, 32, 6);
  g.fillStyle(0x5f5f70, 1);
  g.fillRect(0, 0, 32, 2);
  g.fillStyle(0x1f1f27, 1);
  g.fillRect(6, 10, 1, 9);
  g.fillRect(7, 18, 8, 1);
  g.fillRect(22, 8, 1, 14);
  g.fillStyle(0x3a3a46, 1);
  g.fillRect(12, 24, 3, 2);
  g.fillRect(26, 14, 2, 2);
  g.generateTexture(Assets.GROUND_TOP, 32, 32);
  g.clear();

  g.fillStyle(0x232329, 1);
  g.fillRect(0, 0, 32, 32);
  g.fillStyle(0x2c2c34, 1);
  g.fillRect(4, 6, 5, 4);
  g.fillRect(20, 18, 6, 5);
  g.fillRect(10, 24, 4, 3);
  g.fillStyle(0x191920, 1);
  g.fillRect(14, 4, 6, 4);
  g.fillRect(2, 20, 4, 4);
  g.generateTexture(Assets.GROUND_FILL, 32, 32);
  g.clear();

  // --- Platform slab: broken concrete ---
  g.fillStyle(0x3c3c4a, 1);
  g.fillRect(0, 0, 32, 16);
  g.fillStyle(0x555568, 1);
  g.fillRect(0, 0, 32, 3);
  g.fillStyle(0x262630, 1);
  g.fillRect(0, 13, 32, 3);
  g.fillStyle(0x2e2e3a, 1);
  g.fillRect(9, 5, 1, 8);
  g.fillRect(23, 4, 1, 9);
  g.generateTexture(Assets.PLATFORM, 32, 16);
  g.clear();

  // --- Stepping stone ---
  g.fillStyle(0x4a4a42, 1);
  g.fillRoundedRect(0, 0, 36, 14, 4);
  g.fillStyle(0x6a6a58, 1);
  g.fillRoundedRect(0, 0, 36, 4, 2);
  g.fillStyle(0x35352f, 1);
  g.fillRect(8, 8, 6, 2);
  g.fillRect(22, 9, 7, 2);
  g.generateTexture(Assets.STONE, 36, 14);
  g.clear();

  // --- Fire barrel ---
  g.fillStyle(0x5c3320, 1);
  g.fillRoundedRect(0, 6, 24, 24, 3);
  g.fillStyle(0x40231a, 1);
  g.fillRect(0, 10, 24, 3);
  g.fillRect(0, 20, 24, 3);
  g.fillStyle(0xff7722, 1);
  g.fillRect(4, 2, 16, 6);
  g.fillStyle(0xffcc44, 1);
  g.fillRect(8, 0, 8, 5);
  g.generateTexture(Assets.BARREL, 24, 30);
  g.clear();

  // --- Broken lamppost ---
  g.fillStyle(0x33333c, 1);
  g.fillRect(8, 10, 4, 110);
  g.fillRect(0, 8, 20, 4);
  g.fillStyle(0x222228, 1);
  g.fillRect(4, 116, 12, 4);
  g.fillStyle(0xffeeaa, 1);
  g.fillRect(0, 0, 8, 8);
  g.generateTexture(Assets.LAMPPOST, 20, 120);
  g.clear();

  // --- Throne of crushed cars (Henry's design) ---
  const car = (x: number, y: number, w: number, h: number, body: number, win: number) => {
    g.fillStyle(body, 1);
    g.fillRoundedRect(x, y, w, h, 6);
    g.fillStyle(win, 1);
    g.fillRect(x + w * 0.18, y + 4, w * 0.2, h * 0.35);
    g.fillRect(x + w * 0.6, y + 4, w * 0.2, h * 0.35);
    g.fillStyle(0x111114, 1);
    g.fillCircle(x + w * 0.2, y + h, 6);
    g.fillCircle(x + w * 0.8, y + h, 6);
  };
  car(10, 96, 120, 26, 0x6b4a2a, 0x2a3a4a);
  car(18, 64, 104, 26, 0x4a5a66, 0x222c36);
  car(26, 32, 88, 26, 0x705a32, 0x303a30);
  g.fillStyle(0x3a3a40, 1);
  g.fillRect(30, 20, 3, 14);
  g.fillRect(60, 16, 3, 18);
  g.fillRect(95, 22, 3, 12);
  g.generateTexture(Assets.THRONE, 140, 130);
  g.clear();

  g.destroy();
}
