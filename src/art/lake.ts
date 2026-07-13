import type Phaser from 'phaser';
import { Assets, LakeAnims } from '../assets';

// Level 4 (The Zombified Lake) — a drowned world under blood-red murk. Wreck
// tiles and props are drawn with Phaser Graphics (single frames, Canvas-safe);
// the enemy spritesheets are built on real 2D canvases via `createCanvas` and
// their frames registered by hand, so every frame reads on the Canvas renderer
// (setTint is a no-op there — the enraged kraken's red eyes are BAKED, not
// tinted). The blood-red parallax bands are `bakeTint`ed from the ruin layers
// in PreloadScene, alongside the other themes. The anim keys live in
// assets.ts (LakeAnims) beside PlayerAnims/ZombieAnims — the contract for
// Tasks 11 (kraken) and 12 (fish/eel).

// Build a baked spritesheet on a real 2D canvas (Canvas + WebGL safe) and
// register numbered frames 0..n, mirroring helpers.bakeSheet's frame loop but
// drawing from scratch (no source PNG for these non-humanoid enemies).
function makeSheet(
  scene: Phaser.Scene,
  key: string,
  frameW: number,
  frameH: number,
  frames: Array<(ctx: CanvasRenderingContext2D) => void>,
): void {
  const cols = frames.length;
  const tex = scene.textures.createCanvas(key, frameW * cols, frameH);
  if (!tex) return;
  const ctx = tex.getContext();
  frames.forEach((draw, i) => {
    ctx.save();
    ctx.translate(i * frameW, 0);
    ctx.beginPath();
    ctx.rect(0, 0, frameW, frameH);
    ctx.clip();
    draw(ctx);
    ctx.restore();
  });
  tex.refresh();
  for (let i = 0; i < cols; i++) tex.add(i, 0, i * frameW, 0, frameW, frameH);
}

// --- Enemy frame painters (drawn frame-local, origin at the frame's top-left) ---

// Rotting fish, wiggle phase -1..1 sets the tail sweep.
function drawFish(ctx: CanvasRenderingContext2D, phase: number): void {
  const cx = 12;
  const cy = 8;
  // tail
  ctx.fillStyle = '#5a1f22';
  ctx.beginPath();
  ctx.moveTo(cx + 5, cy);
  ctx.lineTo(cx + 11, cy - 4 + phase * 3);
  ctx.lineTo(cx + 11, cy + 4 + phase * 3);
  ctx.closePath();
  ctx.fill();
  // body
  ctx.fillStyle = '#7a2b2e';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // sickly-green belly rot
  ctx.fillStyle = '#4c6b3a';
  ctx.beginPath();
  ctx.ellipse(cx - 1, cy + 2, 5, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // top fin
  ctx.fillStyle = '#5a1f22';
  ctx.beginPath();
  ctx.moveTo(cx - 2, cy - 4);
  ctx.lineTo(cx + 2, cy - 7 - phase);
  ctx.lineTo(cx + 3, cy - 4);
  ctx.closePath();
  ctx.fill();
  // dead white eye + red pupil
  ctx.fillStyle = '#e8e6d8';
  ctx.beginPath();
  ctx.arc(cx - 5, cy - 1, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c01818';
  ctx.beginPath();
  ctx.arc(cx - 5, cy - 1, 0.8, 0, Math.PI * 2);
  ctx.fill();
}

// Eel body as a chain of segments along a vertical offset function.
function drawEel(ctx: CanvasRenderingContext2D, wave: (t: number) => number, mouth: number): void {
  const startX = 4;
  const baseY = 16;
  ctx.strokeStyle = '#3f5a2c';
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const x = startX + t * 38;
    const y = baseY + wave(t);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // lighter dorsal streak
  ctx.strokeStyle = '#5c7a3e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const x = startX + t * 38;
    const y = baseY + wave(t) - 1.6;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // head at the leading (right) end
  const hx = startX + 38;
  const hy = baseY + wave(1);
  ctx.fillStyle = '#3f5a2c';
  ctx.beginPath();
  ctx.arc(hx, hy, 5, 0, Math.PI * 2);
  ctx.fill();
  // gaping jaw — mouth 0..1 opens it
  ctx.fillStyle = '#1c0a0a';
  ctx.beginPath();
  ctx.moveTo(hx + 1, hy - mouth * 4);
  ctx.lineTo(hx + 8, hy - mouth * 5 - 1);
  ctx.lineTo(hx + 8, hy + mouth * 5 + 1);
  ctx.lineTo(hx + 1, hy + mouth * 4);
  ctx.closePath();
  ctx.fill();
  // fang glints when open
  if (mouth > 0.4) {
    ctx.fillStyle = '#e8e6d8';
    ctx.fillRect(hx + 5, hy - mouth * 4, 1, 3);
    ctx.fillRect(hx + 5, hy + mouth * 3, 1, 3);
  }
  // eye
  ctx.fillStyle = '#f2d23a';
  ctx.beginPath();
  ctx.arc(hx - 2, hy - 2, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

// Drowned kraken head, 96x96 frame. `enraged` swaps amber eyes for glowing red
// (baked, so it reads on Canvas); `pulse` 0..1 breathes the eye glow / mantle.
function drawKrakenHead(ctx: CanvasRenderingContext2D, enraged: boolean, pulse: number): void {
  const cx = 48;
  const cy = 44;
  // rising tentacle stubs behind the mantle
  ctx.fillStyle = '#4a1230';
  for (const dir of [-1, 1]) {
    for (const off of [18, 30]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * off, cy + 20);
      ctx.quadraticCurveTo(cx + dir * (off + 14), cy + 40, cx + dir * (off + 6), cy + 60);
      ctx.lineTo(cx + dir * (off - 6), cy + 58);
      ctx.quadraticCurveTo(cx + dir * (off + 2), cy + 40, cx + dir * (off - 6), cy + 22);
      ctx.closePath();
      ctx.fill();
    }
  }
  // bulbous mantle
  ctx.fillStyle = '#7a1f4a';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 6, 30, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  // wet highlight
  ctx.fillStyle = '#9c2c60';
  ctx.beginPath();
  ctx.ellipse(cx - 8, cy - 18, 12, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // rot blotches
  ctx.fillStyle = '#4c6b3a';
  ctx.beginPath();
  ctx.arc(cx + 14, cy - 2, 6, 0, Math.PI * 2);
  ctx.arc(cx + 6, cy + 14, 5, 0, Math.PI * 2);
  ctx.fill();
  // brow ridge (angrier when enraged)
  ctx.fillStyle = '#5a153a';
  ctx.beginPath();
  const browDrop = enraged ? 6 : 2;
  ctx.moveTo(cx - 24, cy + browDrop);
  ctx.lineTo(cx - 6, cy - 2);
  ctx.lineTo(cx + 6, cy - 2);
  ctx.lineTo(cx + 24, cy + browDrop);
  ctx.lineTo(cx + 20, cy + browDrop + 4);
  ctx.lineTo(cx, cy + 2);
  ctx.lineTo(cx - 20, cy + browDrop + 4);
  ctx.closePath();
  ctx.fill();
  // eyes — baked color per phase
  const eyeGlow = enraged ? '#ff2a1a' : '#f2d23a';
  const eyeCore = enraged ? '#ffe6a0' : '#fff4c0';
  const glowR = 9 + pulse * (enraged ? 4 : 2);
  for (const dir of [-1, 1]) {
    const ex = cx + dir * 13;
    const ey = cy + 8;
    // outer glow
    ctx.globalAlpha = enraged ? 0.5 : 0.3;
    ctx.fillStyle = eyeGlow;
    ctx.beginPath();
    ctx.arc(ex, ey, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // iris
    ctx.fillStyle = eyeGlow;
    ctx.beginPath();
    ctx.arc(ex, ey, 6, 0, Math.PI * 2);
    ctx.fill();
    // slit pupil
    ctx.fillStyle = '#160606';
    ctx.fillRect(ex - 1, ey - 5, 2, 10);
    // core spark
    ctx.fillStyle = eyeCore;
    ctx.beginPath();
    ctx.arc(ex - 2, ey - 2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // hooked beak
  ctx.fillStyle = '#1c0e12';
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 22);
  ctx.lineTo(cx + 8, cy + 22);
  ctx.lineTo(cx, cy + 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a2028';
  ctx.fillRect(cx - 2, cy + 22, 4, 6);
}

export function generateLakeTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // --- Lakebed ground top (32x32): silt with algae fuzz and pebbles ---
  g.fillStyle(0x243028, 1);
  g.fillRect(0, 0, 32, 32);
  g.fillStyle(0x35452f, 1);
  g.fillRect(0, 0, 32, 5);
  g.fillStyle(0x4a6a3a, 1); // algae tips catching the murk-light
  g.fillRect(2, 0, 3, 3);
  g.fillRect(11, 0, 2, 4);
  g.fillRect(20, 0, 3, 2);
  g.fillRect(27, 0, 2, 3);
  g.fillStyle(0x1a231c, 1);
  g.fillRect(7, 14, 4, 3);
  g.fillRect(22, 20, 5, 3);
  g.fillStyle(0x30402c, 1);
  g.fillRect(14, 24, 3, 2);
  g.fillRect(26, 11, 2, 2);
  g.generateTexture(Assets.LAKE_GROUND_TOP, 32, 32);
  g.clear();

  // --- Lakebed fill (32x32): darker sediment ---
  g.fillStyle(0x18201a, 1);
  g.fillRect(0, 0, 32, 32);
  g.fillStyle(0x212b1f, 1);
  g.fillRect(4, 6, 5, 4);
  g.fillRect(20, 18, 6, 5);
  g.fillRect(10, 24, 4, 3);
  g.fillStyle(0x101610, 1);
  g.fillRect(14, 4, 6, 4);
  g.fillRect(2, 20, 4, 4);
  g.generateTexture(Assets.LAKE_GROUND_FILL, 32, 32);
  g.clear();

  // --- Sunken wreck platform (32x16): waterlogged deck plank + rivets/barnacles ---
  g.fillStyle(0x3a4a52, 1);
  g.fillRect(0, 0, 32, 16);
  g.fillStyle(0x54666e, 1);
  g.fillRect(0, 0, 32, 3);
  g.fillStyle(0x232f34, 1);
  g.fillRect(0, 13, 32, 3);
  g.fillStyle(0x2c3a40, 1); // plank seams
  g.fillRect(10, 3, 1, 10);
  g.fillRect(21, 3, 1, 10);
  g.fillStyle(0x6a7c58, 1); // barnacle/algae clumps
  g.fillRect(4, 9, 3, 3);
  g.fillRect(25, 8, 3, 4);
  g.fillStyle(0x8a9a70, 1);
  g.fillRect(5, 9, 1, 1);
  g.fillRect(26, 9, 1, 1);
  g.generateTexture(Assets.LAKE_PLATFORM, 32, 16);
  g.clear();

  // --- Debris stepping stone (36x14): barnacled hull chunk ---
  g.fillStyle(0x3c4640, 1);
  g.fillRoundedRect(0, 0, 36, 14, 4);
  g.fillStyle(0x525e54, 1);
  g.fillRoundedRect(0, 0, 36, 4, 2);
  g.fillStyle(0x263029, 1);
  g.fillRect(8, 8, 6, 2);
  g.fillRect(22, 9, 7, 2);
  g.fillStyle(0x6a7c58, 1); // barnacles
  g.fillCircle(6, 6, 1.6);
  g.fillCircle(30, 7, 1.6);
  g.generateTexture(Assets.LAKE_STONE, 36, 14);
  g.clear();

  // --- Scuba pickup world sprite (26x24): yellow air tank + mask, glinting ---
  g.fillStyle(0xd9a11a, 1); // tank body
  g.fillRoundedRect(3, 4, 12, 18, 5);
  g.fillStyle(0xf2c94c, 1);
  g.fillRoundedRect(4, 5, 4, 15, 2); // highlight
  g.fillStyle(0x8a8f96, 1); // valve
  g.fillRect(7, 0, 4, 5);
  g.fillStyle(0x1c2228, 1); // mask strap
  g.fillRect(13, 8, 12, 3);
  g.fillStyle(0x2a3238, 1); // mask frame
  g.fillRoundedRect(15, 10, 11, 9, 3);
  g.fillStyle(0x7fd6ff, 1); // glass
  g.fillRoundedRect(16, 11, 9, 6, 2);
  g.fillStyle(0xd8f4ff, 1); // glass glint
  g.fillRect(17, 12, 3, 2);
  g.generateTexture(Assets.SCUBA_PICKUP, 26, 24);
  g.clear();

  // --- Vent bubble particle (8x8): rising air bubble ---
  g.fillStyle(0xbfeaff, 0.35);
  g.fillCircle(4, 4, 3.6);
  g.fillStyle(0xbfeaff, 0.55);
  g.lineStyle(1, 0xdff6ff, 0.9);
  g.strokeCircle(4, 4, 3);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(2.8, 2.8, 1);
  g.generateTexture(Assets.VENT_BUBBLE, 8, 8);
  g.clear();

  // --- Laser bubble projectile (16x16): angry glowing red orb ---
  for (let r = 8; r >= 5; r--) {
    g.fillStyle(0xff3344, 0.12);
    g.fillCircle(8, 8, r);
  }
  g.fillStyle(0xff2a3a, 1);
  g.fillCircle(8, 8, 5.5);
  g.fillStyle(0xff8aa0, 1);
  g.fillCircle(8, 8, 3);
  g.fillStyle(0xffe0e6, 0.95);
  g.fillCircle(6.2, 6.2, 1.4);
  g.generateTexture(Assets.LASER_BUBBLE, 16, 16);
  g.clear();

  // --- Tentacle segment (28x28): suckered red-purple arm chunk, tileable ---
  g.fillStyle(0x7a1f4a, 1);
  g.fillRoundedRect(2, 4, 24, 20, 8);
  g.fillStyle(0x9c2c60, 1); // top-lit ridge
  g.fillRoundedRect(4, 5, 20, 6, 4);
  g.fillStyle(0x4a1230, 1); // underside shadow
  g.fillRoundedRect(4, 18, 20, 5, 4);
  g.fillStyle(0xc65a88, 1); // suckers
  for (const [sx, sy] of [
    [9, 12],
    [16, 10],
    [22, 14],
    [13, 17],
  ] as const) {
    g.fillCircle(sx, sy, 2.4);
    g.fillStyle(0x5a153a, 1);
    g.fillCircle(sx, sy, 1);
    g.fillStyle(0xc65a88, 1);
  }
  g.generateTexture(Assets.TENTACLE_SEGMENT, 28, 28);
  g.clear();

  // --- Scuba HUD icon, 5 crack stages (16x16): diver mask, cracks grow 0..4 ---
  // Stage 0 pristine glass; each stage adds a spreading fracture, stage 4 nearly
  // shattered. Baked lines (Canvas-safe) — Task 16 indexes by durability.
  const crackStage = (key: string, stage: number) => {
    // mask frame
    g.fillStyle(0x2a3238, 1);
    g.fillRoundedRect(1, 3, 14, 10, 3);
    g.fillStyle(0x1c2228, 1);
    g.fillRect(1, 12, 14, 2); // strap shadow
    // glass
    g.fillStyle(0x7fd6ff, 1);
    g.fillRoundedRect(2, 4, 12, 7, 2);
    g.fillStyle(0xd8f4ff, 1);
    g.fillRect(3, 5, 3, 2); // glint
    // cracks: draw `stage` fractures from a shared impact point
    const cracks: Array<[number, number, number, number]> = [
      [8, 7, 3, 3],
      [8, 7, 12, 4],
      [8, 7, 5, 10],
      [8, 7, 13, 9],
    ];
    g.lineStyle(1, 0x16242c, 1);
    for (let i = 0; i < Math.min(stage, 4); i++) {
      const [x0, y0, x1, y1] = cracks[Math.min(i, cracks.length - 1)];
      g.lineBetween(x0, y0, x1, y1);
      // secondary splinter for later stages
      if (i >= 2) g.lineBetween((x0 + x1) / 2, (y0 + y1) / 2, x1 - 2, y1);
    }
    // stage 4: heavy shatter web + missing shard
    if (stage >= 4) {
      g.lineStyle(1, 0x16242c, 1);
      g.lineBetween(4, 5, 12, 10);
      g.lineBetween(12, 5, 4, 10);
      g.fillStyle(0x2a3238, 1);
      g.fillTriangle(9, 5, 13, 5, 12, 8); // knocked-out corner
    }
    g.generateTexture(key, 16, 16);
    g.clear();
  };
  crackStage(Assets.SCUBA_HUD_0, 0);
  crackStage(Assets.SCUBA_HUD_1, 1);
  crackStage(Assets.SCUBA_HUD_2, 2);
  crackStage(Assets.SCUBA_HUD_3, 3);
  crackStage(Assets.SCUBA_HUD_4, 4);

  g.destroy();

  // --- Non-humanoid enemy sheets (real-canvas baked, frames registered) ---

  // Fish: 3-frame wiggle (tail sweeps down / mid / up), 24x16.
  makeSheet(scene, Assets.FISH_SHEET, 24, 16, [
    (ctx) => drawFish(ctx, -1),
    (ctx) => drawFish(ctx, 0),
    (ctx) => drawFish(ctx, 1),
  ]);

  // Eel: 3 state frames coil / telegraph / lunge, 48x32.
  makeSheet(scene, Assets.EEL_SHEET, 48, 32, [
    // coil — tight S, jaw shut
    (ctx) => drawEel(ctx, (t) => Math.sin(t * Math.PI * 2.4) * 8, 0),
    // telegraph — rearing back, jaw cracking open
    (ctx) => drawEel(ctx, (t) => Math.sin(t * Math.PI * 1.4) * 6 - t * 3, 0.5),
    // lunge — straightened out, jaw gaping
    (ctx) => drawEel(ctx, (t) => Math.sin(t * Math.PI) * 2, 1),
  ]);

  // Kraken head: 2-frame idle bob (amber eyes), 96x96.
  makeSheet(scene, Assets.KRAKEN_HEAD, 96, 96, [
    (ctx) => drawKrakenHead(ctx, false, 0),
    (ctx) => drawKrakenHead(ctx, false, 1),
  ]);

  // Kraken head ENRAGED: 2-frame pulse, red glowing eyes BAKED into the frames
  // (Canvas-visible — never relies on setTint).
  makeSheet(scene, Assets.KRAKEN_HEAD_ENRAGED, 96, 96, [
    (ctx) => drawKrakenHead(ctx, true, 0.3),
    (ctx) => drawKrakenHead(ctx, true, 1),
  ]);
}

// Registers the fish/eel/kraken anims from the baked sheets. MUST run after
// generateLakeTextures — generateFrameNumbers on a not-yet-baked sheet fails.
// The eel state frames are single-frame anims so its state machine can `play`
// each pose by key; fish and kraken loop.
export function registerLakeAnims(scene: Phaser.Scene): void {
  scene.anims.create({
    key: LakeAnims.FISH_SWIM,
    frames: scene.anims.generateFrameNumbers(Assets.FISH_SHEET, { frames: [0, 1, 2, 1] }),
    frameRate: 6,
    repeat: -1,
  });

  scene.anims.create({
    key: LakeAnims.EEL_COIL,
    frames: scene.anims.generateFrameNumbers(Assets.EEL_SHEET, { frames: [0] }),
    frameRate: 1,
    repeat: -1,
  });
  scene.anims.create({
    key: LakeAnims.EEL_TELEGRAPH,
    frames: scene.anims.generateFrameNumbers(Assets.EEL_SHEET, { frames: [1] }),
    frameRate: 1,
    repeat: 0,
  });
  scene.anims.create({
    key: LakeAnims.EEL_LUNGE,
    frames: scene.anims.generateFrameNumbers(Assets.EEL_SHEET, { frames: [2] }),
    frameRate: 1,
    repeat: 0,
  });

  scene.anims.create({
    key: LakeAnims.KRAKEN_IDLE,
    frames: scene.anims.generateFrameNumbers(Assets.KRAKEN_HEAD, { start: 0, end: 1 }),
    frameRate: 2,
    repeat: -1,
  });
  scene.anims.create({
    key: LakeAnims.KRAKEN_ENRAGED,
    frames: scene.anims.generateFrameNumbers(Assets.KRAKEN_HEAD_ENRAGED, { start: 0, end: 1 }),
    frameRate: 3,
    repeat: -1,
  });
}
