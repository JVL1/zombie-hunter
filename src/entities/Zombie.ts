import Phaser from 'phaser';
import { Damageable, flashSprite, knockback } from '../systems/Combat';

export class Zombie extends Phaser.Physics.Arcade.Sprite implements Damageable {
  health: number;
  maxHealth: number;
  private damage = 10;
  private speed = 60;
  private aggroRange = 200;
  private patrolDirection = 1;
  private patrolTimer = 0;
  private patrolInterval = 2000; // ms
  private target: Phaser.Physics.Arcade.Sprite | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    health: number = 30
  ) {
    super(scene, x, y, 'zombie');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHealth = health;
    this.health = health;

    this.setCollideWorldBounds(true);
    this.setBounce(0.1);
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  getDamage(): number {
    return this.damage;
  }

  takeDamage(amount: number) {
    this.health -= amount;
    flashSprite(this.scene, this);
    knockback(
      this.body as Phaser.Physics.Arcade.Body,
      this.target?.x ?? this.x - 1,
      150
    );
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  update(_time: number, delta: number) {
    if (this.isDead()) return;

    if (!this.target) {
      this.patrol(delta);
      return;
    }

    const distToPlayer = Phaser.Math.Distance.BetweenPoints(this, this.target);

    if (distToPlayer < this.aggroRange) {
      // Chase player
      const direction = this.target.x < this.x ? -1 : 1;
      this.setVelocityX(direction * this.speed * 1.5);
      this.setFlipX(direction < 0);
    } else {
      this.patrol(delta);
    }
  }

  private patrol(delta: number) {
    this.patrolTimer += delta;
    if (this.patrolTimer >= this.patrolInterval) {
      this.patrolDirection *= -1;
      this.patrolTimer = 0;
    }
    this.setVelocityX(this.patrolDirection * this.speed);
    this.setFlipX(this.patrolDirection < 0);
  }
}
