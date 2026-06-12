import type Phaser from 'phaser';
import { Assets } from '../assets';

// Level 3 (Rotten Railroad) tiles and props — rusted steel, gravel ballast
// and train wrecks in the same blocky pixel language.
export function generateRailTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Shared train wheel: dark steel disc with a lighter hub
  const wheel = (cx: number, cy: number) => {
    g.fillStyle(0x16161a, 1);
    g.fillCircle(cx, cy, 10);
    g.fillStyle(0x2e2e36, 1);
    g.fillCircle(cx, cy, 3);
  };

  // --- Rail ground: gravel ballast, wooden tie, steel rail across the top ---
  g.fillStyle(0x3a342c, 1);
  g.fillRect(0, 0, 32, 32);
  g.fillStyle(0x4a443a, 1);
  g.fillRect(3, 12, 3, 2);
  g.fillRect(24, 10, 3, 2);
  g.fillRect(8, 22, 2, 2);
  g.fillRect(27, 24, 3, 2);
  g.fillRect(15, 28, 3, 2);
  g.fillStyle(0x2a251f, 1);
  g.fillRect(6, 16, 3, 2);
  g.fillRect(22, 18, 2, 2);
  g.fillRect(10, 9, 2, 2);
  g.fillRect(28, 14, 2, 2);
  g.fillStyle(0x33241a, 1);
  g.fillRect(12, 4, 8, 28);
  g.fillStyle(0x8a8d94, 1);
  g.fillRect(0, 4, 32, 3);
  g.fillStyle(0xb0b4bc, 1);
  g.fillRect(0, 4, 32, 1);
  g.generateTexture(Assets.RAIL_GROUND_TOP, 32, 32);
  g.clear();

  // --- Rail fill: packed gravel/earth, grayer than the forest dirt ---
  g.fillStyle(0x2a2620, 1);
  g.fillRect(0, 0, 32, 32);
  g.fillStyle(0x383228, 1);
  g.fillRect(4, 6, 5, 4);
  g.fillRect(20, 18, 6, 5);
  g.fillRect(10, 24, 4, 3);
  g.fillStyle(0x1c1814, 1);
  g.fillRect(14, 4, 6, 4);
  g.fillRect(2, 20, 4, 4);
  g.generateTexture(Assets.RAIL_GROUND_FILL, 32, 32);
  g.clear();

  // --- Boxcar roof slab: ribbed steel with rust, the walkable tile ---
  g.fillStyle(0x4a3f38, 1);
  g.fillRect(0, 0, 32, 16);
  g.fillStyle(0x6a5a4c, 1);
  g.fillRect(0, 0, 32, 3);
  g.fillStyle(0x2e2620, 1);
  g.fillRect(0, 13, 32, 3);
  g.fillRect(7, 3, 1, 10);
  g.fillRect(15, 3, 1, 10);
  g.fillRect(23, 3, 1, 10);
  g.fillStyle(0x7a4a30, 1);
  g.fillRect(10, 6, 4, 3);
  g.fillRect(25, 9, 4, 3);
  g.fillRect(2, 8, 3, 2);
  g.generateTexture(Assets.TRAIN_CAR_TOP, 32, 16);
  g.clear();

  // --- Boxcar side: decoration body that sits under the walkable roof ---
  g.fillStyle(0x5a4438, 1);
  g.fillRoundedRect(4, 0, 184, 70, 6);
  g.fillStyle(0x2e2e36, 1);
  g.fillRect(0, 50, 6, 10);
  g.fillRect(186, 50, 6, 10);
  g.lineStyle(3, 0x3a2c24, 1);
  g.strokeRect(76, 10, 40, 52);
  g.lineBetween(96, 10, 96, 62);
  g.fillStyle(0x77492f, 1);
  g.fillRect(20, 8, 4, 30);
  g.fillRect(34, 20, 3, 38);
  g.fillRect(140, 6, 4, 26);
  g.fillRect(160, 26, 3, 34);
  g.fillRect(58, 44, 3, 22);
  wheel(35, 78);
  wheel(57, 78);
  wheel(135, 78);
  wheel(157, 78);
  g.generateTexture(Assets.TRAIN_CAR, 192, 88);
  g.clear();

  // --- Locomotive: long nose, tall rear cab (the zombie driver sits here) ---
  g.fillStyle(0x4e4036, 1);
  g.fillRoundedRect(14, 50, 132, 52, 6);
  g.fillStyle(0x42362c, 1);
  g.fillRoundedRect(138, 14, 58, 88, 6);
  g.fillStyle(0x1e1e26, 1);
  g.fillRect(148, 26, 22, 20);
  g.fillStyle(0x6a5a4c, 1);
  g.fillCircle(26, 76, 16);
  g.fillStyle(0x4e4036, 1);
  g.fillCircle(26, 76, 10);
  g.fillStyle(0x2c2620, 1);
  g.fillRect(34, 22, 14, 30);
  g.fillRect(30, 16, 22, 8);
  g.fillStyle(0x3a342c, 1);
  g.fillTriangle(0, 118, 30, 118, 30, 80);
  wheel(52, 108);
  wheel(76, 108);
  wheel(124, 108);
  wheel(150, 108);
  wheel(176, 108);
  g.generateTexture(Assets.LOCOMOTIVE, 200, 120);
  g.clear();

  // --- Signal lamp: track-side pole, red lens glows beside the rails ---
  g.fillStyle(0x2c2c33, 1);
  g.fillRect(7, 14, 4, 92);
  g.fillStyle(0x222228, 1);
  g.fillRect(3, 106, 12, 4);
  g.fillStyle(0x1c1c22, 1);
  g.fillRoundedRect(2, 0, 14, 18, 3);
  g.fillStyle(0xff4433, 1);
  g.fillCircle(9, 9, 4.5);
  g.generateTexture(Assets.SIGNAL_LAMP, 18, 110);
  g.clear();

  // --- Throne of train parts (Henry's design): stacked wheels for the base,
  // a riveted boiler-door back plate, connecting-rod armrests and a bent
  // rail arching over the top like a crown ---
  g.lineStyle(6, 0x8a8d94, 1);
  g.beginPath();
  g.arc(75, 52, 42, Math.PI, Math.PI * 2);
  g.strokePath();
  g.fillStyle(0x5a4438, 1);
  g.fillCircle(75, 72, 46);
  g.fillStyle(0x6a5040, 1);
  g.fillCircle(75, 72, 34);
  g.fillStyle(0x2c2620, 1);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.fillCircle(75 + Math.cos(a) * 40, 72 + Math.sin(a) * 40, 2.5);
  }
  g.lineStyle(7, 0x8a8d94, 1);
  g.lineBetween(16, 104, 52, 78);
  g.lineBetween(134, 104, 98, 78);
  g.fillStyle(0x16161a, 1);
  g.fillCircle(28, 118, 15);
  g.fillCircle(62, 120, 15);
  g.fillCircle(88, 120, 15);
  g.fillCircle(122, 118, 15);
  g.fillStyle(0x2e2e36, 1);
  g.fillCircle(28, 118, 5);
  g.fillCircle(62, 120, 5);
  g.fillCircle(88, 120, 5);
  g.fillCircle(122, 118, 5);
  g.generateTexture(Assets.THRONE_TRAIN, 150, 135);
  g.clear();

  g.destroy();
}
