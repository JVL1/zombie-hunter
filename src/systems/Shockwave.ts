import Phaser from 'phaser';

export function spawnShockwave(
  scene: Phaser.Scene,
  x: number,
  y: number,
  player: Phaser.Physics.Arcade.Sprite,
  damage: number = 10,
  speed: number = 300
) {
  for (const direction of [-1, 1]) {
    const wave = scene.physics.add.sprite(x, y, 'shockwave');
    wave.setDepth(5);
    (wave.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    wave.setVelocityX(direction * speed);

    scene.add.particles(x, y, 'dust', {
      follow: wave,
      speed: { min: 20, max: 60 },
      angle: { min: 240, max: 300 },
      scale: { start: 1, end: 0 },
      lifespan: 400,
      quantity: 1,
      frequency: 50,
      gravityY: 100,
    });

    const overlap = scene.physics.add.overlap(player, wave, () => {
      scene.events.emit('shockwave-damage', damage);
      overlap.destroy();
    });

    scene.time.delayedCall(1500, () => {
      overlap.destroy();
      wave.destroy();
    });
  }
}
