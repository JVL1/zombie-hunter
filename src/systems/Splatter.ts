import Phaser from 'phaser';

export interface SplatterConfig {
  x: number;
  y: number;
  isKill: boolean; // true = big burst on death, false = small burst on hit
  tint?: number;   // override color for special zombie types
}

export function createSplatter(scene: Phaser.Scene, config: SplatterConfig) {
  const { x, y, isKill } = config;
  const quantity = isKill ? 30 : 8;
  const speed = isKill ? 250 : 120;

  // Blood particles
  scene.add.particles(x, y, 'blood', {
    speed: { min: speed * 0.5, max: speed },
    angle: { min: 0, max: 360 },
    scale: { start: 1.5, end: 0.2 },
    lifespan: isKill ? 800 : 400,
    quantity,
    emitting: false,
    gravityY: 300,
  }).explode();

  // Skin chunks
  scene.add.particles(x, y, 'skin', {
    speed: { min: speed * 0.3, max: speed * 0.8 },
    angle: { min: 0, max: 360 },
    scale: { start: 1.2, end: 0.3 },
    lifespan: isKill ? 700 : 350,
    quantity: Math.floor(quantity * 0.5),
    emitting: false,
    gravityY: 400,
  }).explode();

  // Brain bits — only on kill
  if (isKill) {
    scene.add.particles(x, y, 'brain', {
      speed: { min: 50, max: 200 },
      angle: { min: 200, max: 340 },
      scale: { start: 1.5, end: 0.5 },
      lifespan: 1000,
      quantity: 10,
      emitting: false,
      gravityY: 350,
    }).explode();
  }
}
