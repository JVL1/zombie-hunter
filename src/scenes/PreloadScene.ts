import Phaser from 'phaser';
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
    // Pre-tint the pale ruin layers into a night palette (runtime tint on
    // TileSprites is WebGL-only; baking it works on the canvas fallback too)
    this.bakeTint(Assets.RUIN_BG_2, Assets.RUIN_NIGHT_FAR, '#52527e');
    this.bakeTint(Assets.RUIN_BG_3, Assets.RUIN_NIGHT_MID, '#3c3c66');
    this.bakeTint(Assets.RUIN_BG_4, Assets.RUIN_NIGHT_NEAR, '#2a2a4c');
    this.scene.start('MainMenu');
  }

  private bakeTint(srcKey: string, destKey: string, tint: string) {
    const src = this.textures.get(srcKey).getSourceImage() as HTMLImageElement;
    const canvas = this.textures.createCanvas(destKey, src.width, src.height);
    if (!canvas) return;
    const ctx = canvas.getContext();
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, src.width, src.height);
    // Multiply fills transparent areas too — clip back to the original silhouette
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    canvas.refresh();
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
}
