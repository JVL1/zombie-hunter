import Phaser from 'phaser';

export interface Damageable {
  health: number;
  maxHealth: number;
  takeDamage(amount: number): void;
  isDead(): boolean;
}

export function flashSprite(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite
) {
  sprite.setTint(0xff0000);
  scene.time.delayedCall(100, () => {
    sprite.clearTint();
  });
}

export function knockback(
  body: Phaser.Physics.Arcade.Body,
  fromX: number,
  force: number = 200
) {
  const direction = body.x > fromX ? 1 : -1;
  body.setVelocityX(direction * force);
  body.setVelocityY(-100);
}
