import type Phaser from 'phaser';
import { Assets } from '../assets';

// Level 2 (Broken Down Forest) tiles and props — same blocky pixel language
// as the city set, swapped to earth/moss tones.
export function generateForestTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // --- Forest ground: dark soil with mossy grass lip ---
  g.fillStyle(0x2b2218, 1);
  g.fillRect(0, 0, 32, 32);
  g.fillStyle(0x3f5a2e, 1);
  g.fillRect(0, 0, 32, 6);
  g.fillStyle(0x55763c, 1);
  g.fillRect(0, 0, 32, 2);
  g.fillStyle(0x1a140e, 1);
  g.fillRect(5, 11, 1, 10);
  g.fillRect(6, 20, 7, 1);
  g.fillRect(21, 9, 1, 13);
  g.fillStyle(0x47643a, 1);
  g.fillRect(10, 6, 5, 2);
  g.fillRect(24, 7, 4, 2);
  g.fillRect(2, 8, 3, 2);
  g.generateTexture(Assets.FOREST_GROUND_TOP, 32, 32);
  g.clear();

  // --- Forest fill: packed dirt with embedded stones ---
  g.fillStyle(0x231b13, 1);
  g.fillRect(0, 0, 32, 32);
  g.fillStyle(0x32281c, 1);
  g.fillRect(4, 6, 5, 4);
  g.fillRect(20, 18, 6, 5);
  g.fillRect(10, 24, 4, 3);
  g.fillStyle(0x171108, 1);
  g.fillRect(14, 4, 6, 4);
  g.fillRect(2, 20, 4, 4);
  g.generateTexture(Assets.FOREST_GROUND_FILL, 32, 32);
  g.clear();

  // --- Log platform: fallen-log slab ---
  g.fillStyle(0x4a3826, 1);
  g.fillRect(0, 0, 32, 16);
  g.fillStyle(0x6a5238, 1);
  g.fillRect(0, 0, 32, 3);
  g.fillStyle(0x2c2218, 1);
  g.fillRect(0, 13, 32, 3);
  g.fillStyle(0x33271a, 1);
  g.fillCircle(9, 8, 2);
  g.fillCircle(23, 7, 2);
  g.generateTexture(Assets.LOG_PLATFORM, 32, 16);
  g.clear();

  // --- Mossy stump stepping stone ---
  g.fillStyle(0x4a3a28, 1);
  g.fillRoundedRect(0, 0, 36, 14, 4);
  g.fillStyle(0x4f6a3c, 1);
  g.fillRoundedRect(0, 0, 36, 4, 2);
  g.fillStyle(0x35291d, 1);
  g.fillRect(8, 8, 6, 2);
  g.fillRect(22, 9, 7, 2);
  g.generateTexture(Assets.STUMP_STONE, 36, 14);
  g.clear();

  // --- Dead tree: twisted bare trunk, background prop ---
  g.fillStyle(0x241c14, 1);
  g.fillRect(26, 120, 10, 30);
  g.fillRect(28, 90, 9, 32);
  g.fillRect(30, 60, 8, 32);
  g.fillRect(28, 30, 8, 32);
  g.fillRect(30, 4, 7, 28);
  g.fillStyle(0x2c2218, 1);
  g.fillRect(22, 42, 8, 3);
  g.fillRect(14, 38, 9, 3);
  g.fillRect(8, 32, 7, 3);
  g.fillRect(36, 24, 8, 3);
  g.fillRect(43, 18, 8, 3);
  g.fillRect(50, 12, 6, 3);
  g.fillRect(24, 12, 7, 3);
  g.fillRect(18, 6, 7, 3);
  g.fillRect(38, 72, 9, 3);
  g.fillRect(46, 66, 7, 3);
  g.generateTexture(Assets.DEAD_TREE, 64, 150);
  g.clear();

  // --- Throne tree: the Pack King's dead-tree throne (Henry's design) ---
  g.fillStyle(0x1c1610, 1);
  g.fillRoundedRect(30, 30, 90, 90, 8);
  g.fillStyle(0x2e2418, 1);
  g.fillRect(14, 100, 14, 40);
  g.fillRect(18, 64, 13, 40);
  g.fillRect(24, 30, 12, 38);
  g.fillRect(30, 8, 10, 26);
  g.fillRect(122, 100, 14, 40);
  g.fillRect(119, 64, 13, 40);
  g.fillRect(114, 30, 12, 38);
  g.fillRect(110, 8, 10, 26);
  g.fillStyle(0x241c12, 1);
  g.fillRoundedRect(0, 110, 150, 14, 6);
  g.fillRoundedRect(6, 120, 138, 12, 6);
  g.fillRoundedRect(0, 128, 150, 12, 6);
  g.fillStyle(0x2c2218, 1);
  g.fillRect(32, 0, 4, 16);
  g.fillRect(22, 6, 4, 14);
  g.fillRect(14, 12, 12, 4);
  g.fillRect(114, 0, 4, 16);
  g.fillRect(124, 6, 4, 14);
  g.fillRect(124, 12, 12, 4);
  g.fillRect(72, 14, 6, 18);
  g.fillStyle(0x44603a, 1);
  g.fillRect(18, 70, 8, 5);
  g.fillRect(118, 46, 9, 5);
  g.fillRect(60, 112, 12, 5);
  g.generateTexture(Assets.THRONE_TREE, 150, 140);
  g.clear();

  // --- Moonbeam: soft vertical light shaft ---
  g.fillStyle(0xbfd8a8, 0.04);
  g.fillRect(0, 0, 90, 300);
  g.fillStyle(0xbfd8a8, 0.05);
  g.fillRect(12, 0, 66, 290);
  g.fillStyle(0xbfd8a8, 0.06);
  g.fillRect(24, 0, 42, 280);
  g.fillStyle(0xbfd8a8, 0.08);
  g.fillRect(34, 0, 22, 270);
  g.fillStyle(0xbfd8a8, 0.1);
  g.fillRect(40, 0, 10, 120);
  g.generateTexture(Assets.MOONBEAM, 90, 300);
  g.clear();

  g.destroy();
}
