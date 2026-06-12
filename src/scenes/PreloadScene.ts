import Phaser from 'phaser';
import { bakeTint } from '../art/helpers';
import { Assets, PlayerAnims } from '../assets';
import { GAME_H, GAME_W } from '../config';

// Loads the real pixel-art sprites and procedurally generates every other
// texture: night sky, moon, tiles, throne of crushed cars, pickups, particles.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload() {
    const barBg = this.add.rectangle(GAME_W / 2, GAME_H / 2, 320, 18, 0x222233);
    const bar = this.add.rectangle(GAME_W / 2 - 158, GAME_H / 2, 1, 12, 0xcc2222).setOrigin(0, 0.5);
    const label = this.add
      .text(GAME_W / 2, GAME_H / 2 - 30, 'SHARPENING SWORDS...', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ccccdd',
      })
      .setOrigin(0.5);
    this.load.on('progress', (v: number) => {
      bar.width = 316 * v;
    });
    this.load.on('complete', () => {
      barBg.destroy();
      bar.destroy();
      label.destroy();
    });

    this.load.spritesheet(Assets.PLAYER_SHEET, 'assets/sprites/player/player-spritesheet.png', {
      frameWidth: 80,
      frameHeight: 64,
    });
    this.load.spritesheet(Assets.PLAYER_SWORD, 'assets/sprites/player/player-sword.png', {
      frameWidth: 80,
      frameHeight: 64,
    });

    const zm = (key: string, file: string) =>
      this.load.spritesheet(key, `assets/sprites/zombies/${file}`, {
        frameWidth: 96,
        frameHeight: 96,
      });
    zm(Assets.ZOMBIE_IDLE, 'zombie-man-idle.png');
    zm(Assets.ZOMBIE_WALK, 'zombie-man-walk.png');
    zm(Assets.ZOMBIE_ATTACK, 'zombie-man-attack.png');
    zm(Assets.ZOMBIE_HURT, 'zombie-man-hurt.png');
    zm(Assets.ZOMBIE_DEAD, 'zombie-man-dead.png');

    const uz = (key: string, file: string) =>
      this.load.spritesheet(key, `assets/sprites/zombies/${file}`, {
        frameWidth: 128,
        frameHeight: 128,
      });
    uz(Assets.URBAN_IDLE, 'urban-zombie-idle.png');
    uz(Assets.URBAN_WALK, 'urban-zombie-walk.png');
    uz(Assets.URBAN_ATTACK, 'urban-zombie-attack.png');
    uz(Assets.URBAN_HURT, 'urban-zombie-hurt.png');
    uz(Assets.URBAN_DEAD, 'urban-zombie-dead.png');

    this.load.image(Assets.RUIN_BG_2, 'assets/backgrounds/city-ruin-bg-2.png');
    this.load.image(Assets.RUIN_BG_3, 'assets/backgrounds/city-ruin-bg-3.png');
    this.load.image(Assets.RUIN_BG_4, 'assets/backgrounds/city-ruin-bg-4.png');
  }

  create() {
    this.createAnimations();
    this.generateTextures();
    this.generateForestTextures();
    this.generateRailTextures();
    // Pre-tint the pale ruin layers into a night palette (runtime tint on
    // TileSprites is WebGL-only; baking it works on the canvas fallback too)
    bakeTint(this, Assets.RUIN_BG_2, Assets.RUIN_NIGHT_FAR, '#52527e');
    bakeTint(this, Assets.RUIN_BG_3, Assets.RUIN_NIGHT_MID, '#3c3c66');
    bakeTint(this, Assets.RUIN_BG_4, Assets.RUIN_NIGHT_NEAR, '#2a2a4c');
    // Level 2: same ruin layers re-baked into a mossy palette — reads as a
    // decayed forest swallowing the city
    bakeTint(this, Assets.RUIN_BG_2, Assets.FOREST_NIGHT_FAR, '#3d5240');
    bakeTint(this, Assets.RUIN_BG_3, Assets.FOREST_NIGHT_MID, '#2e4231');
    bakeTint(this, Assets.RUIN_BG_4, Assets.FOREST_NIGHT_NEAR, '#1f3023');
    // Level 3: same ruin layers re-baked into a rusty dusk palette for the
    // rotten railroad
    bakeTint(this, Assets.RUIN_BG_2, Assets.RAIL_NIGHT_FAR, '#5c4a3a');
    bakeTint(this, Assets.RUIN_BG_3, Assets.RAIL_NIGHT_MID, '#43352a');
    bakeTint(this, Assets.RUIN_BG_4, Assets.RAIL_NIGHT_NEAR, '#2e241c');
    this.scene.start('MainMenu');
  }

  private createAnimations() {
    for (const anim of Object.values(PlayerAnims)) {
      this.anims.create({
        key: anim.key,
        frames: this.anims.generateFrameNumbers(Assets.PLAYER_SHEET, {
          start: anim.start,
          end: anim.end,
        }),
        frameRate: anim.frameRate,
        repeat: anim.repeat,
      });
    }

    const mk = (key: string, sheet: string, end: number, frameRate: number, repeat: number) =>
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(sheet, { start: 0, end }),
        frameRate,
        repeat,
      });

    mk('zombie-idle', Assets.ZOMBIE_IDLE, 7, 6, -1);
    mk('zombie-walk', Assets.ZOMBIE_WALK, 7, 8, -1);
    mk('zombie-attack', Assets.ZOMBIE_ATTACK, 4, 10, 0);
    mk('zombie-hurt', Assets.ZOMBIE_HURT, 2, 10, 0);
    mk('zombie-dead', Assets.ZOMBIE_DEAD, 4, 8, 0);

    mk('urban-idle', Assets.URBAN_IDLE, 5, 6, -1);
    mk('urban-walk', Assets.URBAN_WALK, 9, 8, -1);
    mk('urban-attack', Assets.URBAN_ATTACK, 4, 10, 0);
    mk('urban-hurt', Assets.URBAN_HURT, 3, 10, 0);
    mk('urban-dead', Assets.URBAN_DEAD, 4, 8, 0);
  }

  private generateTextures() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

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

  // Level 2 (Broken Down Forest) tiles and props — same blocky pixel language
  // as the city set, swapped to earth/moss tones.
  private generateForestTextures() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

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

  // Level 3 (Rotten Railroad) tiles and props — rusted steel, gravel ballast
  // and train wrecks in the same blocky pixel language.
  private generateRailTextures() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

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
}
