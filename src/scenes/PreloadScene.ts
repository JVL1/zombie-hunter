import Phaser from 'phaser';
import { generateCityTextures } from '../art/city';
import { generateCommonTextures } from '../art/common';
import { generateForestTextures } from '../art/forest';
import { bakeTint } from '../art/helpers';
import { generateRailTextures } from '../art/rail';
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
    generateCommonTextures(this);
    generateCityTextures(this);
    generateForestTextures(this);
    generateRailTextures(this);
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
}
