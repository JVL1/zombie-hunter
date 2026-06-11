import Phaser from 'phaser';
import { Assets } from '../assets';

// Apply the Light2D pipeline when running on WebGL (no-op on canvas fallback).
export function lit<T extends Phaser.GameObjects.GameObject>(obj: T): T {
  const scene = obj.scene;
  if (scene.sys.renderer && scene.sys.renderer.type === Phaser.WEBGL) {
    (obj as unknown as { setPipeline: (name: string) => void }).setPipeline('Light2D');
  }
  return obj;
}

export function flashSprite(
  sprite: Phaser.GameObjects.Sprite,
  color = 0xffffff,
  ms = 80,
  restoreTint?: number
) {
  sprite.setTintFill(color);
  sprite.scene.time.delayedCall(ms, () => {
    if (!sprite.active) return;
    if (restoreTint !== undefined) {
      sprite.setTint(restoreTint);
    } else {
      sprite.clearTint();
    }
  });
}

export function knockback(body: Phaser.Physics.Arcade.Body, fromX: number, force: number) {
  const dir = body.center.x < fromX ? -1 : 1;
  body.setVelocityX(dir * force);
  body.setVelocityY(-force * 0.4);
}

// Ghost copy of a sprite that fades out — used for dash trails.
export function afterimage(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, tint = 0x66ddff) {
  const ghost = scene.add
    .image(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
    .setFlipX(sprite.flipX)
    .setScale(sprite.scaleX, sprite.scaleY)
    .setAlpha(0.45)
    .setTint(tint)
    .setDepth(sprite.depth - 1);
  scene.tweens.add({
    targets: ghost,
    alpha: 0,
    duration: 220,
    onComplete: () => ghost.destroy(),
  });
}

export function shockwave(scene: Phaser.Scene, x: number, y: number, maxScale = 2.4) {
  const ring = scene.add.image(x, y, Assets.RING).setScale(0.2).setAlpha(0.9).setDepth(20);
  scene.tweens.add({
    targets: ring,
    scale: maxScale,
    alpha: 0,
    duration: 320,
    ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  });
}

export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = '#ffffff',
  size = 14
) {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: `${size}px`,
      color,
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(30);
  scene.tweens.add({
    targets: t,
    y: y - 36,
    alpha: 0,
    duration: 650,
    ease: 'Quad.easeOut',
    onComplete: () => t.destroy(),
  });
}

export function dustPuff(scene: Phaser.Scene, x: number, y: number, count = 6) {
  scene.add
    .particles(x, y, Assets.P_DUST, {
      speed: { min: 25, max: 70 },
      angle: { min: 200, max: 340 },
      scale: { start: 1.2, end: 0 },
      lifespan: 320,
      quantity: count,
      emitting: false,
      gravityY: 60,
    })
    .explode(count);
}
