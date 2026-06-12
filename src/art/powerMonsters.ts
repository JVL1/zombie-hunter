import type Phaser from 'phaser';
import { Assets } from '../assets';
import { ZOMBIE } from '../config';
import { bakeSheet } from './helpers';

// Power-monster variant sheets, BAKED (not runtime-tinted) so they read on the
// Canvas renderer too. Each variant gets all 5 anim sheets re-baked from its
// base family with a multiply tint plus a coarse painted overlay — these are
// 96px zombies seen at game speed, not portraits.

const ANIM_NAMES = ['idle', 'walk', 'attack', 'hurt', 'dead'] as const;
type AnimName = (typeof ANIM_NAMES)[number];

const SRC_SHEETS: Record<'zombie' | 'urban', Record<AnimName, string>> = {
  zombie: {
    idle: Assets.ZOMBIE_IDLE,
    walk: Assets.ZOMBIE_WALK,
    attack: Assets.ZOMBIE_ATTACK,
    hurt: Assets.ZOMBIE_HURT,
    dead: Assets.ZOMBIE_DEAD,
  },
  urban: {
    idle: Assets.URBAN_IDLE,
    walk: Assets.URBAN_WALK,
    attack: Assets.URBAN_ATTACK,
    hurt: Assets.URBAN_HURT,
    dead: Assets.URBAN_DEAD,
  },
};

const FRAME_SIZE: Record<'zombie' | 'urban', number> = { zombie: 96, urban: 128 };

// Multiply-tint colors per power variant
const VARIANT_COLORS: Record<string, string> = {
  vulture: '#5a3a8a', // dark purple
  rage: '#aa2222', // red
  titan: '#8a8a7a', // stone
  crystal: '#3ad8cc', // cyan
};

// Same frame counts / rates as PreloadScene.createAnimations for each base family
const ANIM_DEFS: Record<
  'zombie' | 'urban',
  Record<AnimName, { end: number; frameRate: number; repeat: number }>
> = {
  zombie: {
    idle: { end: 7, frameRate: 6, repeat: -1 },
    walk: { end: 7, frameRate: 8, repeat: -1 },
    attack: { end: 4, frameRate: 10, repeat: 0 },
    hurt: { end: 2, frameRate: 10, repeat: 0 },
    dead: { end: 4, frameRate: 8, repeat: 0 },
  },
  urban: {
    idle: { end: 5, frameRate: 6, repeat: -1 },
    walk: { end: 9, frameRate: 8, repeat: -1 },
    attack: { end: 4, frameRate: 10, repeat: 0 },
    hurt: { end: 3, frameRate: 10, repeat: 0 },
    dead: { end: 4, frameRate: 8, repeat: 0 },
  },
};

// Dark wing triangles painted BEHIND the body pixels (destination-over keeps
// the zombie on top; wings show where they poke past the silhouette).
function drawWings(ctx: CanvasRenderingContext2D, w: number, h: number, fs: number): void {
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#3a2458';
  const s = fs / 96;
  for (let y = 0; y + fs <= h; y += fs) {
    for (let x = 0; x + fs <= w; x += fs) {
      const cx = x + fs / 2;
      const cy = y + 46 * s;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + dir * 8 * s, cy);
        ctx.lineTo(cx + dir * 36 * s, cy - 18 * s);
        ctx.lineTo(cx + dir * 12 * s, cy + 14 * s);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

// 3-4 light cyan shard rects jutting from the torso of each frame.
function drawShards(ctx: CanvasRenderingContext2D, w: number, h: number, fs: number): void {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(180, 248, 242, 0.9)';
  const s = fs / 96;
  for (let y = 0; y + fs <= h; y += fs) {
    for (let x = 0; x + fs <= w; x += fs) {
      const cx = x + fs / 2;
      const cy = y + fs / 2;
      ctx.fillRect(cx - 11 * s, cy - 13 * s, 4 * s, 12 * s);
      ctx.fillRect(cx + 1 * s, cy - 5 * s, 3 * s, 10 * s);
      ctx.fillRect(cx - 4 * s, cy + 4 * s, 5 * s, 9 * s);
      ctx.fillRect(cx + 9 * s, cy - 16 * s, 3 * s, 9 * s);
    }
  }
}

// Bakes `${sheet}-idle/walk/attack/hurt/dead` for every variant in
// ZOMBIE.variants that declares a baked sheet. Must run AFTER the base zombie
// spritesheets have loaded (bakeSheet early-returns on a missing source).
export function generatePowerMonsterSheets(scene: Phaser.Scene): void {
  for (const [name, v] of Object.entries(ZOMBIE.variants)) {
    if (!v.sheet || !v.animSet) continue;
    const color = VARIANT_COLORS[name];
    if (!color) continue;
    const fs = FRAME_SIZE[v.base];
    for (const anim of ANIM_NAMES) {
      const srcKey = SRC_SHEETS[v.base][anim];
      bakeSheet(scene, srcKey, `${v.sheet}-${anim}`, fs, fs, (ctx, w, h) => {
        const src = scene.textures.get(srcKey).getSourceImage() as HTMLImageElement;
        // Multiply tint over the whole sheet
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
        // Rage: hot glow via lighten composite (before the silhouette clip)
        if (name === 'rage') {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(255, 70, 40, 0.4)';
          ctx.fillRect(0, 0, w, h);
        }
        // Multiply/lighter fill transparent areas too — clip back to silhouette
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(src, 0, 0);
        // Per-frame painted overlays (titan: none — the 1.5x scale sells it)
        if (name === 'vulture') drawWings(ctx, w, h, fs);
        else if (name === 'crystal') drawShards(ctx, w, h, fs);
        ctx.globalCompositeOperation = 'source-over';
      });
    }
  }
}

// Registers the pm-{variant}-{anim} animations. MUST run after
// generatePowerMonsterSheets — generateFrameNumbers on a not-yet-baked sheet
// key fails. Frame counts/rates clone the variant's base family.
export function registerPowerMonsterAnims(scene: Phaser.Scene): void {
  for (const v of Object.values(ZOMBIE.variants)) {
    if (!v.sheet || !v.animSet) continue;
    for (const anim of ANIM_NAMES) {
      const def = ANIM_DEFS[v.base][anim];
      scene.anims.create({
        key: `${v.animSet}-${anim}`,
        frames: scene.anims.generateFrameNumbers(`${v.sheet}-${anim}`, {
          start: 0,
          end: def.end,
        }),
        frameRate: def.frameRate,
        repeat: def.repeat,
      });
    }
  }
}
