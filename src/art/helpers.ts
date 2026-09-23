import type Phaser from 'phaser';

type SheetSource = CanvasImageSource & {
  width: number;
  height: number;
};

export function bakeTint(scene: Phaser.Scene, srcKey: string, destKey: string, tint: string): void {
  const src = scene.textures.get(srcKey).getSourceImage() as HTMLImageElement;
  const canvas = scene.textures.createCanvas(destKey, src.width, src.height);
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

// Build a baked spritesheet on a real 2D canvas (Canvas + WebGL safe) and
// register numbered frames 0..n. Each painter draws frame-local (origin at the
// frame's top-left, clipped to the frame). For art with no source PNG.
export function makeSheet(
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

export function bakeSheet(
  scene: Phaser.Scene,
  srcKey: string,
  destKey: string,
  frameWidth: number,
  frameHeight: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
  if (!scene.textures.exists(srcKey)) return;
  const src = scene.textures.get(srcKey).getSourceImage() as SheetSource;
  const output = document.createElement('canvas');
  output.width = src.width;
  output.height = src.height;

  const ctx = output.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(src, 0, 0);
  draw(ctx, src.width, src.height);

  const canvas = scene.textures.addCanvas(destKey, output);
  if (!canvas) return;
  canvas.refresh();

  const cols = Math.floor(src.width / frameWidth);
  const rows = Math.floor(src.height / frameHeight);
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      canvas.add(idx++, 0, c * frameWidth, r * frameHeight, frameWidth, frameHeight);
    }
  }
}
