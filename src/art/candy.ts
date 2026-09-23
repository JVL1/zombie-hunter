import type Phaser from 'phaser';
import { Assets, CandyAnims } from '../assets';
import { CANDY } from '../config';
import { makeSheet } from './helpers';

// Level 5 (The Sugar Rush Zone) — Wes's candy world, gone rotten. Every
// texture is painted on a real 2D canvas (makeSheet), so each one reads on the
// Canvas renderer, where setTint is a no-op. Colors are faded pinks, moldy
// greens, and dark chocolate under a night sky: it is candy, but it is a zombie
// game. The pink-purple parallax bands are bakeTint'ed from the ruin layers in
// PreloadScene, like the other themes.

type Ctx = CanvasRenderingContext2D;

function circle(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// A few fixed sprinkle positions/colors so the tiles stay seamless and stable.
const SPRINKLE_COLORS = ['#f4e6a0', '#8fd8ff', '#ff8fb8', '#b6f08a', '#ffffff'];

function sprinkles(ctx: Ctx, spots: Array<[number, number, number]>): void {
  spots.forEach(([x, y, a], i) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = SPRINKLE_COLORS[i % SPRINKLE_COLORS.length];
    ctx.fillRect(-2, -0.75, 4, 1.5);
    ctx.restore();
  });
}

// Zombie eyes: sunken sockets with a mean glowing pupil.
function zombieEyes(ctx: Ctx, cx: number, cy: number, gap: number, r: number, glow = '#e8ff5a'): void {
  for (const dir of [-1, 1]) {
    circle(ctx, cx + dir * gap, cy, r + 1, '#2a0f18');
    circle(ctx, cx + dir * gap, cy, r, glow);
    circle(ctx, cx + dir * gap, cy, r * 0.45, '#3a0a0a');
  }
}

// --- Gummy Bear Zombie (40x40 frame, feet on the frame bottom) ---
// squash > 0 flattens it (landing), squash < 0 stretches it (hop).
function drawGummy(ctx: Ctx, squash: number): void {
  const sx = 1 + squash * 0.25;
  const sy = 1 - squash * 0.25;
  ctx.save();
  ctx.translate(20, 40);
  ctx.scale(sx, sy);
  const body = '#c43c5a'; // rotten cherry gummy
  const shade = '#8e2440';
  const shine = 'rgba(255,210,220,0.55)';
  // legs
  ellipse(ctx, -7, -4, 5, 4, shade);
  ellipse(ctx, 7, -4, 5, 4, shade);
  // belly
  ellipse(ctx, 0, -14, 12, 12, body);
  // arms reaching out, zombie-style
  ellipse(ctx, -12, -18, 4, 3, shade);
  ellipse(ctx, 12, -18, 4, 3, shade);
  // head + ears
  circle(ctx, -8, -34, 4, shade);
  circle(ctx, 8, -34, 4, shade);
  ellipse(ctx, 0, -28, 10, 9, body);
  // moldy green blotch
  ellipse(ctx, 5, -11, 4, 3, '#6f9a3c');
  // gummy shine
  ellipse(ctx, -5, -18, 3, 6, shine);
  // face
  zombieEyes(ctx, 0, -29, 4, 2.2);
  ctx.fillStyle = '#3a0a0a';
  ctx.fillRect(-3, -23, 6, 2);
  ctx.restore();
}

// --- Gumball Zombie (36x36 frame) --- angry = the pre-roll shake pose.
function drawGumball(ctx: Ctx, faceShift: number, angry: boolean): void {
  const cx = 18;
  const cy = 18;
  circle(ctx, cx, cy, 16, '#3a5fa8'); // faded blue gumball
  // sugar speckles
  for (const [dx, dy] of [
    [-8, -9],
    [9, -6],
    [-10, 6],
    [6, 10],
    [0, -12],
  ]) {
    circle(ctx, cx + dx, cy + dy, 1.4, '#9fb8e8');
  }
  ellipse(ctx, cx - 6, cy - 7, 5, 3, 'rgba(255,255,255,0.45)'); // shine
  // bite mark (zombie gumball)
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  circle(ctx, cx + 15, cy + 8, 4, '#000');
  ctx.restore();
  // face
  const fx = cx + faceShift;
  zombieEyes(ctx, fx, cy - 2, 5, angry ? 3 : 2.4, angry ? '#ff5a3a' : '#e8ff5a');
  if (angry) {
    // angry brows
    ctx.strokeStyle = '#1a0a10';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx - 9, cy - 8);
    ctx.lineTo(fx - 2, cy - 5);
    ctx.moveTo(fx + 9, cy - 8);
    ctx.lineTo(fx + 2, cy - 5);
    ctx.stroke();
  }
  ctx.fillStyle = '#1a0a10';
  ctx.fillRect(fx - 4, cy + 6, 8, 2);
  ctx.fillStyle = '#f4f0e0';
  ctx.fillRect(fx - 3, cy + 6, 2, 2);
  ctx.fillRect(fx + 1, cy + 6, 2, 2);
}

// --- Chocolate Zombie (40x60 frame, feet on the bottom) ---
// melt 0 = solid, 1 = half melted, 2 = puddle. step = walk leg swap.
function drawChocolate(ctx: Ctx, melt: number, step: number): void {
  const dark = '#3b2014';
  const mid = '#5a3220';
  const light = '#7a4a2e';
  if (melt >= 2) {
    // puddle — a flat blob with two eyes peeking out (Canvas-visible cue)
    ellipse(ctx, 20, 56, 19, 4.5, dark);
    ellipse(ctx, 20, 55, 15, 3, mid);
    ellipse(ctx, 14, 54, 4, 1.2, light);
    circle(ctx, 16, 54, 1.6, '#e8ff5a');
    circle(ctx, 24, 54, 1.6, '#e8ff5a');
    return;
  }
  const sag = melt * 16; // melting slumps the body down
  // legs
  const lx = step ? 3 : -3;
  roundRect(ctx, 11 + lx, 44, 7, 16, 3, dark);
  roundRect(ctx, 22 - lx, 44, 7, 16, 3, dark);
  // body: a chocolate bar with a grid
  roundRect(ctx, 9, 18 + sag, 22, 30 - sag * 0.6, 4, mid);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  for (let y = 26 + sag; y < 44; y += 7) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(30, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(20, 19 + sag);
  ctx.lineTo(20, 46);
  ctx.stroke();
  // arms out
  roundRect(ctx, 2, 24 + sag, 9, 5, 2, dark);
  roundRect(ctx, 29, 24 + sag, 9, 5, 2, dark);
  // head (a round chocolate truffle)
  circle(ctx, 20, 12 + sag, 9, mid);
  ellipse(ctx, 17, 8 + sag, 3, 2, light);
  zombieEyes(ctx, 20, 12 + sag, 4, 2);
  // drips
  ctx.fillStyle = dark;
  for (const [x, len] of [
    [12, 5 + melt * 8],
    [21, 3 + melt * 10],
    [28, 6 + melt * 7],
  ]) {
    roundRect(ctx, x, 40 + sag * 0.3, 3, len, 1.5, dark);
  }
}

// --- Gummy Worm King head (80x80 frame) ---
// mode: 0 closed / 1 open / 2 chomp / 3 dizzy (Wes's sour face).
function drawWormHead(ctx: Ctx, mode: 0 | 1 | 2 | 3): void {
  const cx = 40;
  const cy = 46;
  // two-tone gummy worm: sour-orange top, rotten-pink band, green chin
  circle(ctx, cx, cy, 28, '#e0713a');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#d4507a';
  ctx.fillRect(cx - 30, cy + 2, 60, 12);
  ctx.fillStyle = '#6fae3c';
  ctx.fillRect(cx - 30, cy + 14, 60, 20);
  ctx.restore();
  // sugar crystals on the skin
  for (const [dx, dy] of [
    [-18, -12],
    [14, -16],
    [20, 4],
    [-22, 8],
    [-6, -22],
  ]) {
    ctx.fillStyle = 'rgba(255,255,240,0.7)';
    ctx.fillRect(cx + dx, cy + dy, 2, 2);
  }
  ellipse(ctx, cx - 10, cy - 14, 7, 5, 'rgba(255,230,200,0.45)'); // shine

  // the crown — he is the KING
  ctx.fillStyle = '#e8c23a';
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy - 24);
  ctx.lineTo(cx - 16, cy - 38);
  ctx.lineTo(cx - 8, cy - 30);
  ctx.lineTo(cx, cy - 42);
  ctx.lineTo(cx + 8, cy - 30);
  ctx.lineTo(cx + 16, cy - 38);
  ctx.lineTo(cx + 16, cy - 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#b8902a';
  ctx.fillRect(cx - 16, cy - 27, 32, 3);
  circle(ctx, cx, cy - 33, 2.4, '#d42a4a');
  circle(ctx, cx - 11, cy - 30, 1.8, '#3ad8cc');
  circle(ctx, cx + 11, cy - 30, 1.8, '#3ad8cc');

  // eyes
  if (mode === 3) {
    // dizzy spiral eyes
    ctx.strokeStyle = '#2a0f18';
    ctx.lineWidth = 1.6;
    for (const dir of [-1, 1]) {
      const ex = cx + dir * 11;
      const ey = cy - 8;
      circle(ctx, ex, ey, 7, '#fff8e0');
      ctx.beginPath();
      for (let t = 0; t < Math.PI * 5; t += 0.2) {
        const r = t * 0.4;
        const px = ex + Math.cos(t * dir) * r;
        const py = ey + Math.sin(t * dir) * r;
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  } else {
    for (const dir of [-1, 1]) {
      circle(ctx, cx + dir * 11, cy - 8, 7, '#2a0f18');
      circle(ctx, cx + dir * 11, cy - 8, 5.5, mode === 2 ? '#ff4a2a' : '#e8ff5a');
      circle(ctx, cx + dir * 11, cy - 8, 2.2, '#2a0a0a');
    }
    // mean brows
    ctx.fillStyle = '#7a2a1a';
    ctx.beginPath();
    ctx.moveTo(cx - 19, cy - 18);
    ctx.lineTo(cx - 4, cy - 13);
    ctx.lineTo(cx - 4, cy - 10);
    ctx.lineTo(cx - 19, cy - 15);
    ctx.closePath();
    ctx.moveTo(cx + 19, cy - 18);
    ctx.lineTo(cx + 4, cy - 13);
    ctx.lineTo(cx + 4, cy - 10);
    ctx.lineTo(cx + 19, cy - 15);
    ctx.closePath();
    ctx.fill();
  }

  // mouth
  if (mode === 1) {
    // wide open: the feed target — a big dark mouth with a pink tongue
    ellipse(ctx, cx, cy + 12, 14, 12, '#2a0610');
    ellipse(ctx, cx, cy + 19, 8, 4, '#e0607a');
    ctx.fillStyle = '#f4f0e0';
    for (const dx of [-9, -3, 3, 9]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx - 2, cy + 1);
      ctx.lineTo(cx + dx + 2, cy + 1);
      ctx.lineTo(cx + dx, cy + 6);
      ctx.closePath();
      ctx.fill();
    }
  } else if (mode === 2) {
    // chomp: jaws slammed shut, teeth interlocked
    roundRect(ctx, cx - 14, cy + 8, 28, 8, 3, '#2a0610');
    ctx.fillStyle = '#f4f0e0';
    for (let dx = -12; dx <= 10; dx += 5) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + 8);
      ctx.lineTo(cx + dx + 4, cy + 8);
      ctx.lineTo(cx + dx + 2, cy + 13);
      ctx.closePath();
      ctx.fill();
    }
  } else if (mode === 3) {
    // sour face: puckered mouth + tongue out
    circle(ctx, cx, cy + 12, 5, '#2a0610');
    ellipse(ctx, cx + 3, cy + 18, 4, 6, '#e0607a');
  } else {
    // closed grin
    ctx.strokeStyle = '#2a0610';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 10);
    ctx.quadraticCurveTo(cx, cy + 16, cx + 12, cy + 10);
    ctx.stroke();
  }
}

function drawWormSegment(ctx: Ctx, stripe: string): void {
  circle(ctx, 22, 22, 20, '#e0713a');
  ctx.save();
  ctx.beginPath();
  ctx.arc(22, 22, 20, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = stripe;
  ctx.fillRect(0, 16, 44, 12);
  ctx.restore();
  ellipse(ctx, 15, 13, 6, 4, 'rgba(255,230,200,0.45)');
  ctx.fillStyle = 'rgba(255,255,240,0.7)';
  ctx.fillRect(28, 10, 2, 2);
  ctx.fillRect(10, 30, 2, 2);
}

// Portal swirl (96x128 frame), phase 0..1 rotates the arms.
function drawPortal(ctx: Ctx, phase: number): void {
  const cx = 48;
  const cy = 64;
  ellipse(ctx, cx, cy, 44, 60, 'rgba(90,30,140,0.35)');
  ellipse(ctx, cx, cy, 38, 54, '#3a1060');
  ellipse(ctx, cx, cy, 30, 44, '#5a1c8a');
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(0.7, 1);
  ctx.strokeStyle = '#c88aff';
  ctx.lineWidth = 3;
  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath();
    for (let t = 0; t < 1; t += 0.04) {
      const a = t * Math.PI * 3 + arm * ((Math.PI * 2) / 3) + phase * Math.PI * 2;
      const r = 6 + t * 50;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r * 0.9;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
  ellipse(ctx, cx, cy, 10, 14, '#f0d8ff');
  ellipse(ctx, cx, cy, 5, 7, '#ffffff');
}

export function generateCandyTextures(scene: Phaser.Scene): void {
  // --- Ground top (32x32): rotten pink frosting dripping over dark cake ---
  makeSheet(scene, Assets.CANDY_GROUND_TOP, 32, 32, [
    (ctx) => {
      ctx.fillStyle = '#4a2a22';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#c86a8e';
      ctx.fillRect(0, 0, 32, 7);
      // frosting drips (seamless: none cross the tile edge)
      for (const [x, len] of [
        [3, 5],
        [11, 9],
        [19, 4],
        [26, 7],
      ]) {
        roundRect(ctx, x, 4, 4, len, 2, '#c86a8e');
      }
      ctx.fillStyle = '#e094b0';
      ctx.fillRect(0, 0, 32, 2);
      ctx.fillStyle = '#7a8a3a'; // mold fleck
      ctx.fillRect(22, 2, 3, 2);
      sprinkles(ctx, [
        [5, 3, 0.4],
        [15, 2, -0.7],
        [24, 4, 1.2],
        [29, 2, 0.1],
      ]);
      ctx.fillStyle = '#3a1f1a';
      ctx.fillRect(6, 22, 5, 3);
      ctx.fillRect(20, 26, 6, 2);
    },
  ]);

  // --- Ground fill (32x32): chocolate cake layers ---
  makeSheet(scene, Assets.CANDY_GROUND_FILL, 32, 32, [
    (ctx) => {
      ctx.fillStyle = '#3a211c';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#5a2e3a'; // jam layer
      ctx.fillRect(0, 14, 32, 3);
      ctx.fillStyle = '#2c1814';
      ctx.fillRect(4, 5, 4, 3);
      ctx.fillRect(20, 22, 5, 3);
      ctx.fillRect(12, 27, 3, 2);
    },
  ]);

  // --- Wafer bar platform (32x16) ---
  makeSheet(scene, Assets.CANDY_PLATFORM, 32, 16, [
    (ctx) => {
      ctx.fillStyle = '#c8a064';
      ctx.fillRect(0, 0, 32, 16);
      ctx.fillStyle = '#e0bc80';
      ctx.fillRect(0, 0, 32, 3);
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(0, 13, 32, 3);
      ctx.strokeStyle = '#a07e48';
      ctx.lineWidth = 1;
      for (let x = 4; x < 32; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 3);
        ctx.lineTo(x + 0.5, 13);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, 8.5);
      ctx.lineTo(32, 8.5);
      ctx.stroke();
      ctx.fillStyle = '#6f8a3a'; // mold
      ctx.fillRect(25, 5, 3, 2);
    },
  ]);

  // --- Gumdrop stepping stone (36x14) ---
  makeSheet(scene, Assets.CANDY_STONE, 36, 14, [
    (ctx) => {
      ctx.fillStyle = '#4a9a4a';
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.quadraticCurveTo(2, 0, 18, 0);
      ctx.quadraticCurveTo(34, 0, 36, 14);
      ctx.closePath();
      ctx.fill();
      ellipse(ctx, 12, 4, 6, 2, 'rgba(220,255,210,0.5)');
      ctx.fillStyle = '#e8f4e0';
      for (const [x, y] of [
        [7, 8],
        [15, 6],
        [24, 9],
        [29, 7],
        [20, 11],
      ]) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    },
  ]);

  // --- Marshmallow bounce pad (64x28): frame 0 rest, frame 1 squashed ---
  const W = CANDY.marshmallowW;
  const H = CANDY.marshmallowH;
  const pillow = (ctx: Ctx, top: number) => {
    roundRect(ctx, 1, top, W - 2, H - top, 10, '#e8dcd4');
    roundRect(ctx, 1, H - 7, W - 2, 7, 4, '#c8b8b0'); // shadow base
    ellipse(ctx, W / 2 - 10, top + 6, 16, 4, '#fffaf6'); // soft top highlight
    ctx.fillStyle = '#b8c88a'; // a little mold, it IS a zombie world
    ctx.fillRect(W - 14, top + 8, 4, 3);
    // "boing" arrow chevrons so a kid can read "jump on me"
    ctx.strokeStyle = '#d88aa8';
    ctx.lineWidth = 2;
    for (const dy of [0, 5]) {
      ctx.beginPath();
      ctx.moveTo(W / 2 - 6, top + 14 + dy);
      ctx.lineTo(W / 2, top + 10 + dy);
      ctx.lineTo(W / 2 + 6, top + 14 + dy);
      ctx.stroke();
    }
  };
  makeSheet(scene, Assets.MARSHMALLOW, W, H, [(ctx) => pillow(ctx, 0), (ctx) => pillow(ctx, 9)]);

  // --- Props ---
  makeSheet(scene, Assets.LOLLIPOP_TREE, 48, 120, [
    (ctx) => {
      roundRect(ctx, 22, 40, 4, 80, 2, '#d8d0c0');
      circle(ctx, 24, 24, 22, '#b83a6a');
      ctx.strokeStyle = '#f0c8d8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let t = 0; t < Math.PI * 6; t += 0.15) {
        const r = t * 1.1;
        const px = 24 + Math.cos(t) * r;
        const py = 24 + Math.sin(t) * r;
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.save(); // a bite taken out
      ctx.globalCompositeOperation = 'destination-out';
      circle(ctx, 44, 14, 7, '#000');
      ctx.restore();
    },
  ]);
  makeSheet(scene, Assets.CUPCAKE, 64, 64, [
    (ctx) => {
      ctx.fillStyle = '#6a3a2a';
      ctx.beginPath();
      ctx.moveTo(10, 34);
      ctx.lineTo(54, 34);
      ctx.lineTo(48, 64);
      ctx.lineTo(16, 64);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4a261c';
      ctx.lineWidth = 2;
      for (let x = 18; x < 48; x += 7) {
        ctx.beginPath();
        ctx.moveTo(x, 36);
        ctx.lineTo(x + 1, 62);
        ctx.stroke();
      }
      circle(ctx, 20, 30, 12, '#b86a8a');
      circle(ctx, 44, 30, 12, '#b86a8a');
      circle(ctx, 32, 20, 14, '#c87a9a');
      circle(ctx, 32, 6, 5, '#a82a3a'); // cherry
      sprinkles(ctx, [
        [24, 18, 0.5],
        [38, 16, -0.4],
        [30, 26, 1.1],
        [18, 28, -1],
        [45, 27, 0.2],
      ]);
    },
  ]);
  makeSheet(scene, Assets.CHOCOLATE_RIVER, 64, 24, [
    (ctx) => {
      ctx.fillStyle = '#3a1f14';
      ctx.fillRect(0, 6, 64, 18);
      ctx.fillStyle = '#5a3220';
      ctx.beginPath();
      ctx.moveTo(0, 8);
      for (let x = 0; x <= 64; x += 4) ctx.lineTo(x, 6 + Math.sin((x / 64) * Math.PI * 2) * 3);
      ctx.lineTo(64, 12);
      ctx.lineTo(0, 12);
      ctx.closePath();
      ctx.fill();
      ellipse(ctx, 20, 14, 6, 1.5, '#7a4a2e');
      ellipse(ctx, 50, 18, 5, 1.2, '#7a4a2e');
    },
  ]);
  makeSheet(scene, Assets.P_SPRINKLE, 6, 3, [
    (ctx) => {
      roundRect(ctx, 0, 0, 6, 3, 1.5, '#ff9ecf');
    },
  ]);

  // --- Enemies ---
  makeSheet(scene, Assets.GUMMY_SHEET, 40, 40, [
    (ctx) => drawGummy(ctx, 0),
    (ctx) => drawGummy(ctx, 1),
    (ctx) => drawGummy(ctx, -1),
  ]);
  makeSheet(scene, Assets.GUMBALL_SHEET, 36, 36, [
    (ctx) => drawGumball(ctx, 0, false),
    (ctx) => drawGumball(ctx, 3, false),
    (ctx) => drawGumball(ctx, 0, true),
  ]);
  makeSheet(scene, Assets.CHOCO_SHEET, 40, 60, [
    (ctx) => drawChocolate(ctx, 0, 0),
    (ctx) => drawChocolate(ctx, 0, 1),
    (ctx) => drawChocolate(ctx, 1, 0),
    (ctx) => drawChocolate(ctx, 2, 0),
  ]);

  // --- Sour candy (18x18): a wrapped super-sour green-yellow candy ---
  makeSheet(scene, Assets.SOUR_CANDY, 18, 18, [
    (ctx) => {
      ctx.fillStyle = '#c8f03a';
      ctx.beginPath(); // wrapper twists
      ctx.moveTo(0, 5);
      ctx.lineTo(5, 9);
      ctx.lineTo(0, 13);
      ctx.closePath();
      ctx.moveTo(18, 5);
      ctx.lineTo(13, 9);
      ctx.lineTo(18, 13);
      ctx.closePath();
      ctx.fill();
      circle(ctx, 9, 9, 6, '#e8ff3a');
      circle(ctx, 9, 9, 4, '#a8e020');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 6, 2, 2); // sugar sparkle
      ctx.fillRect(11, 10, 1, 1);
    },
  ]);

  // --- Gummy Worm King ---
  makeSheet(scene, Assets.WORM_HEAD, 80, 80, [
    (ctx) => drawWormHead(ctx, 0),
    (ctx) => drawWormHead(ctx, 1),
    (ctx) => drawWormHead(ctx, 2),
    (ctx) => drawWormHead(ctx, 3),
  ]);
  makeSheet(scene, Assets.WORM_SEGMENT, 44, 44, [
    (ctx) => drawWormSegment(ctx, '#d4507a'),
    (ctx) => drawWormSegment(ctx, '#6fae3c'),
  ]);
  makeSheet(scene, Assets.DIRT_MOUND, 96, 32, [
    (ctx) => {
      ctx.fillStyle = '#4a2a1c';
      ctx.beginPath();
      ctx.moveTo(0, 32);
      ctx.quadraticCurveTo(48, -6, 96, 32);
      ctx.closePath();
      ctx.fill();
      // cookie crumbs
      for (const [x, y, r] of [
        [22, 22, 4],
        [40, 14, 5],
        [58, 16, 4],
        [74, 24, 3],
        [32, 27, 3],
      ]) {
        circle(ctx, x, y, r, '#8a5a34');
      }
      sprinkles(ctx, [
        [30, 18, 0.3],
        [50, 11, -0.8],
        [66, 20, 1],
      ]);
    },
  ]);
  makeSheet(scene, Assets.DIZZY_STAR, 16, 16, [
    (ctx) => {
      ctx.fillStyle = '#ffe24a';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 7.5 : 3.2;
        const px = 8 + Math.cos(a) * r;
        const py = 8 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      circle(ctx, 7, 7, 1.5, '#fffbe0');
    },
  ]);

  // --- The 5-key portal (96x128, 3-frame swirl) ---
  makeSheet(scene, Assets.PORTAL, 96, 128, [
    (ctx) => drawPortal(ctx, 0),
    (ctx) => drawPortal(ctx, 1 / 3),
    (ctx) => drawPortal(ctx, 2 / 3),
  ]);
}

// MUST run after generateCandyTextures (anims read the baked sheets).
export function registerCandyAnims(scene: Phaser.Scene): void {
  scene.anims.create({
    key: CandyAnims.PORTAL_SWIRL,
    frames: scene.anims.generateFrameNumbers(Assets.PORTAL, { start: 0, end: 2 }),
    frameRate: 8,
    repeat: -1,
  });
  scene.anims.create({
    key: CandyAnims.CHOCO_WALK,
    frames: scene.anims.generateFrameNumbers(Assets.CHOCO_SHEET, { frames: [0, 1] }),
    frameRate: 4,
    repeat: -1,
  });
}
