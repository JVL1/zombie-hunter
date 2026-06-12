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

export function bakeSheet(
  scene: Phaser.Scene,
  srcKey: string,
  destKey: string,
  frameWidth: number,
  frameHeight: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
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

  const tex = scene.textures.get(destKey);
  const cols = Math.floor(src.width / frameWidth);
  const rows = Math.floor(src.height / frameHeight);
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tex.has(String(idx))) {
        idx++;
        continue;
      }
      tex.add(idx++, 0, c * frameWidth, r * frameHeight, frameWidth, frameHeight);
    }
  }
}
