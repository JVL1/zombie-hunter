import type Phaser from 'phaser';
import { Assets } from '../assets';

export function generateShopTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // --- Blacksmith anvil (64x40): heavy iron block on a stump base ---
  // Horn + face
  g.fillStyle(0x3a3a44, 1);
  g.fillRect(6, 6, 52, 10);
  g.fillRect(2, 6, 8, 6); // horn tip
  g.fillStyle(0x55555f, 1);
  g.fillRect(6, 6, 52, 3); // worked top highlight
  // Waist
  g.fillStyle(0x2c2c34, 1);
  g.fillRect(24, 16, 16, 10);
  // Base block
  g.fillStyle(0x33333c, 1);
  g.fillRect(16, 26, 32, 6);
  // Stump under it
  g.fillStyle(0x4a3220, 1);
  g.fillRect(14, 32, 36, 8);
  g.fillStyle(0x33220f, 1);
  g.fillRect(14, 38, 36, 2);
  // Hot ember glow on the face
  g.fillStyle(0xff8833, 1);
  g.fillRect(40, 4, 8, 2);
  g.fillStyle(0xffcc44, 1);
  g.fillRect(42, 3, 4, 2);
  g.generateTexture(Assets.SHOP_ANVIL, 64, 40);
  g.clear();

  // --- Apocalypse potion shack (120x100): planks, slanted roof, glowing window ---
  // Roof
  g.fillStyle(0x3a2a1a, 1);
  g.fillTriangle(0, 34, 60, 0, 120, 34);
  g.fillStyle(0x4e3a24, 1);
  g.fillTriangle(8, 32, 60, 4, 112, 32);
  // Walls: vertical planks
  g.fillStyle(0x5c4226, 1);
  g.fillRect(10, 34, 100, 66);
  g.fillStyle(0x4a3220, 1);
  for (let x = 22; x < 110; x += 14) g.fillRect(x, 34, 2, 66);
  // Doorway
  g.fillStyle(0x241808, 1);
  g.fillRect(70, 56, 28, 44);
  // Window glowing potion-green
  g.fillStyle(0x2a3a22, 1);
  g.fillRect(20, 52, 30, 26);
  g.fillStyle(0x66ff88, 1);
  g.fillRect(23, 55, 24, 20);
  g.fillStyle(0xbfffcc, 1);
  g.fillRect(26, 58, 8, 6);
  // Window cross frame
  g.fillStyle(0x3a2a16, 1);
  g.fillRect(34, 52, 2, 26);
  g.fillRect(20, 64, 30, 2);
  // Hanging sign: a tiny potion bottle
  g.fillStyle(0x33220f, 1);
  g.fillRect(54, 38, 12, 14);
  g.fillStyle(0x66ff88, 1);
  g.fillRect(57, 43, 6, 7);
  g.fillStyle(0xddddcc, 1);
  g.fillRect(58, 40, 4, 3);
  g.generateTexture(Assets.SHOP_SHACK, 120, 100);
  g.clear();

  // --- Counter slab (200x24): thick worn wood ---
  g.fillStyle(0x5c4226, 1);
  g.fillRect(0, 0, 200, 24);
  g.fillStyle(0x7a5a34, 1);
  g.fillRect(0, 0, 200, 5);
  g.fillStyle(0x33220f, 1);
  g.fillRect(0, 20, 200, 4);
  // Plank seams + knots
  g.fillStyle(0x4a3220, 1);
  g.fillRect(48, 5, 2, 15);
  g.fillRect(104, 5, 2, 15);
  g.fillRect(158, 5, 2, 15);
  g.fillRect(24, 10, 5, 3);
  g.fillRect(132, 12, 6, 3);
  g.generateTexture(Assets.SHOP_COUNTER, 200, 24);
  g.clear();

  // --- 12x12 HUD consumable icons (Task 11 consumes these) ---
  // Potion: red flask with a cork
  g.fillStyle(0xddddcc, 1);
  g.fillRect(5, 0, 2, 2); // cork
  g.fillStyle(0x884444, 1);
  g.fillRect(4, 2, 4, 2); // neck
  g.fillStyle(0xcc2233, 1);
  g.fillRect(2, 4, 8, 7); // body
  g.fillRect(3, 11, 6, 1);
  g.fillStyle(0xff7788, 1);
  g.fillRect(3, 5, 2, 3); // shine
  g.generateTexture(Assets.SHOP_ICON_POTION, 12, 12);
  g.clear();

  // Shield: blue kite shield with a bright boss
  g.fillStyle(0x2a4a8a, 1);
  g.fillRect(1, 0, 10, 7);
  g.fillRect(2, 7, 8, 2);
  g.fillRect(3, 9, 6, 1);
  g.fillRect(4, 10, 4, 1);
  g.fillRect(5, 11, 2, 1);
  g.fillStyle(0x6699ee, 1);
  g.fillRect(2, 1, 8, 2); // rim highlight
  g.fillStyle(0xbbddff, 1);
  g.fillRect(5, 4, 2, 4); // boss stripe
  g.generateTexture(Assets.SHOP_ICON_SHIELD, 12, 12);
  g.clear();

  // Extra life: golden heart
  g.fillStyle(0xffd24a, 1);
  g.fillRect(1, 2, 4, 3);
  g.fillRect(7, 2, 4, 3);
  g.fillRect(1, 5, 10, 3);
  g.fillRect(3, 8, 6, 2);
  g.fillRect(5, 10, 2, 2);
  g.fillStyle(0xffeeaa, 1);
  g.fillRect(2, 3, 2, 2); // shine
  g.generateTexture(Assets.SHOP_ICON_LIFE, 12, 12);
  g.clear();

  g.destroy();
}
