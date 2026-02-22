import Phaser from 'phaser';
import { Assets, PlayerAnims } from '../assets';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload() {
    // Show loading text
    const loadText = this.add
      .text(400, 300, 'Loading...', {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      loadText.setText(`Loading... ${Math.round(value * 100)}%`);
    });

    // --- Player sprite sheet (single sheet, 80x64 per frame, 10 cols x 7 rows) ---
    this.load.spritesheet(Assets.PLAYER_SHEET, 'assets/sprites/player/player-spritesheet.png', {
      frameWidth: 80,
      frameHeight: 64,
    });
    this.load.spritesheet(Assets.PLAYER_SWORD, 'assets/sprites/player/player-sword.png', {
      frameWidth: 80,
      frameHeight: 64,
    });

    // --- Zombie Man sprite sheets (96x96 per frame) ---
    this.load.spritesheet(Assets.ZOMBIE_IDLE, 'assets/sprites/zombies/zombie-man-idle.png', {
      frameWidth: 96,
      frameHeight: 96,
    });
    this.load.spritesheet(Assets.ZOMBIE_WALK, 'assets/sprites/zombies/zombie-man-walk.png', {
      frameWidth: 96,
      frameHeight: 96,
    });
    this.load.spritesheet(Assets.ZOMBIE_ATTACK, 'assets/sprites/zombies/zombie-man-attack.png', {
      frameWidth: 96,
      frameHeight: 96,
    });
    this.load.spritesheet(Assets.ZOMBIE_HURT, 'assets/sprites/zombies/zombie-man-hurt.png', {
      frameWidth: 96,
      frameHeight: 96,
    });
    this.load.spritesheet(Assets.ZOMBIE_DEAD, 'assets/sprites/zombies/zombie-man-dead.png', {
      frameWidth: 96,
      frameHeight: 96,
    });

    // --- Urban Zombie sprite sheets (128x128 per frame) ---
    this.load.spritesheet(
      Assets.URBAN_ZOMBIE_IDLE,
      'assets/sprites/zombies/urban-zombie-idle.png',
      { frameWidth: 128, frameHeight: 128 }
    );
    this.load.spritesheet(
      Assets.URBAN_ZOMBIE_WALK,
      'assets/sprites/zombies/urban-zombie-walk.png',
      { frameWidth: 128, frameHeight: 128 }
    );
    this.load.spritesheet(
      Assets.URBAN_ZOMBIE_ATTACK,
      'assets/sprites/zombies/urban-zombie-attack.png',
      { frameWidth: 128, frameHeight: 128 }
    );
    this.load.spritesheet(
      Assets.URBAN_ZOMBIE_HURT,
      'assets/sprites/zombies/urban-zombie-hurt.png',
      { frameWidth: 128, frameHeight: 128 }
    );
    this.load.spritesheet(
      Assets.URBAN_ZOMBIE_DEAD,
      'assets/sprites/zombies/urban-zombie-dead.png',
      { frameWidth: 128, frameHeight: 128 }
    );

    // --- Backgrounds ---
    this.load.image(Assets.CITY_BG_SKY, 'assets/backgrounds/city-bg-sky.png');
    this.load.image(Assets.CITY_BG_LAYER1, 'assets/backgrounds/city-bg-layer1.png');
    this.load.image(Assets.CITY_BG_LAYER2, 'assets/backgrounds/city-bg-layer2.png');
    this.load.image(Assets.CITY_RUIN_BG_1, 'assets/backgrounds/city-ruin-bg-1.png');
    this.load.image(Assets.CITY_RUIN_BG_2, 'assets/backgrounds/city-ruin-bg-2.png');
    this.load.image(Assets.CITY_RUIN_BG_3, 'assets/backgrounds/city-ruin-bg-3.png');
    this.load.image(Assets.CITY_RUIN_BG_4, 'assets/backgrounds/city-ruin-bg-4.png');

    // --- City tileset ---
    this.load.image(Assets.CITY_FLOOR_TILES, 'assets/tiles/city/floor-tiles.png');
    this.load.image(Assets.CITY_BUILDING_TILES, 'assets/tiles/city/building-tiles.png');
    this.load.image(Assets.CITY_DECORATION_TILES, 'assets/tiles/city/decoration-tiles.png');
  }

  create() {
    // --- Player animations (from single sprite sheet, rows of 10) ---
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

    // --- Zombie Man animations (separate sheets, 96x96) ---
    this.anims.create({
      key: 'zombie-idle',
      frames: this.anims.generateFrameNumbers(Assets.ZOMBIE_IDLE, { start: 0, end: 7 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: 'zombie-walk',
      frames: this.anims.generateFrameNumbers(Assets.ZOMBIE_WALK, { start: 0, end: 7 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'zombie-attack',
      frames: this.anims.generateFrameNumbers(Assets.ZOMBIE_ATTACK, { start: 0, end: 4 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: 'zombie-hurt',
      frames: this.anims.generateFrameNumbers(Assets.ZOMBIE_HURT, { start: 0, end: 2 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: 'zombie-dead',
      frames: this.anims.generateFrameNumbers(Assets.ZOMBIE_DEAD, { start: 0, end: 4 }),
      frameRate: 8,
      repeat: 0,
    });

    // --- Urban Zombie animations (separate sheets, 128x128) ---
    this.anims.create({
      key: 'urban-zombie-idle',
      frames: this.anims.generateFrameNumbers(Assets.URBAN_ZOMBIE_IDLE, { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: 'urban-zombie-walk',
      frames: this.anims.generateFrameNumbers(Assets.URBAN_ZOMBIE_WALK, { start: 0, end: 9 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'urban-zombie-attack',
      frames: this.anims.generateFrameNumbers(Assets.URBAN_ZOMBIE_ATTACK, { start: 0, end: 4 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: 'urban-zombie-hurt',
      frames: this.anims.generateFrameNumbers(Assets.URBAN_ZOMBIE_HURT, { start: 0, end: 3 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: 'urban-zombie-dead',
      frames: this.anims.generateFrameNumbers(Assets.URBAN_ZOMBIE_DEAD, { start: 0, end: 4 }),
      frameRate: 8,
      repeat: 0,
    });

    // --- Generate placeholder textures for assets we don't have yet ---
    this.generatePlaceholder('coin', 0xf1c40f, 16, 16, 'circle');
    this.generatePlaceholder('key', 0xffd700, 16, 24);
    this.generatePlaceholder('sword-hitbox', 0xffffff, 40, 32, 'rect', 0.3);
    this.generatePlaceholder('throne', 0x8b4513, 80, 96);
    this.generatePlaceholder('blood', 0xcc0000, 4, 4);
    this.generatePlaceholder('skin', 0xccaa88, 4, 4);
    this.generatePlaceholder('brain', 0xff69b4, 5, 5);
    this.generatePlaceholder('ground-tile', 0x555555, 32, 32);
    this.generatePlaceholder('platform-tile', 0x777777, 32, 32);

    this.scene.start('MainMenu');
  }

  private generatePlaceholder(
    key: string,
    color: number,
    w: number,
    h: number,
    shape: 'rect' | 'circle' = 'rect',
    alpha: number = 1
  ) {
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(color, alpha);
    if (shape === 'circle') {
      gfx.fillCircle(w / 2, h / 2, w / 2);
    } else {
      gfx.fillRect(0, 0, w, h);
    }
    gfx.generateTexture(key, w, h);
  }
}
