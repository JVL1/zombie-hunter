import Phaser from 'phaser';

export interface LaserConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  direction: number;
  player: Phaser.Physics.Arcade.Sprite;
  damage: number;
  chargeTime?: number;
  beamSpeed?: number;
  onChargeStart?: () => void;
  onFire?: () => void;
}

export function fireLaser(config: LaserConfig) {
  const {
    scene, x, y, direction, player, damage,
    chargeTime = 1500, beamSpeed = 600,
    onChargeStart, onFire,
  } = config;

  const chargeGlow = scene.add.circle(x, y, 12, 0xff0000, 0.8);
  chargeGlow.setDepth(10);
  onChargeStart?.();

  scene.tweens.add({
    targets: chargeGlow,
    scaleX: 1.5,
    scaleY: 1.5,
    alpha: 1,
    yoyo: true,
    repeat: Math.floor(chargeTime / 200),
    duration: 100,
  });

  scene.time.delayedCall(chargeTime, () => {
    chargeGlow.destroy();
    onFire?.();

    const beam = scene.physics.add.sprite(x, y, 'laser-beam');
    beam.setDepth(10);
    (beam.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    beam.setVelocityX(direction * beamSpeed);

    const overlap = scene.physics.add.overlap(player, beam, () => {
      scene.events.emit('laser-damage', damage);
      overlap.destroy();
    });

    scene.time.delayedCall(2000, () => {
      overlap.destroy();
      beam.destroy();
    });
  });
}
