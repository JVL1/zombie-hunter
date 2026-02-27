import Phaser from 'phaser';

export function spawnPoisonCloud(
  scene: Phaser.Scene,
  x: number,
  y: number,
  player: Phaser.Physics.Arcade.Sprite,
  tickDamage: number = 5,
  duration: number = 1000
) {
  const cloud = scene.add.sprite(x, y, 'poison-cloud');
  cloud.setAlpha(0.6);
  scene.physics.add.existing(cloud, true);

  let lastTick = 0;
  const overlap = scene.physics.add.overlap(player, cloud, () => {
    const now = scene.time.now;
    if (now - lastTick > 500) {
      lastTick = now;
      scene.events.emit('poison-damage', tickDamage);
    }
  });

  scene.tweens.add({
    targets: cloud,
    alpha: 0,
    duration,
    onComplete: () => {
      overlap.destroy();
      cloud.destroy();
    },
  });
}
