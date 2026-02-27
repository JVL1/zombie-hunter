import Phaser from 'phaser';
import { Damageable, flashSprite, knockback } from '../systems/Combat';

export class ZombieDeer extends Phaser.Physics.Arcade.Sprite implements Damageable {
  health: number;
  maxHealth: number;
  private damage = 10;
  private speed = 120;
  private chargeSpeed = 220;
  private aggroRange = 250;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private dying = false;
  private patrolDirection = 1;
  private patrolTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, health: number = 25) {
    super(scene, x, y, 'zombie-deer', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.maxHealth = health;
    this.health = health;
    this.setCollideWorldBounds(true);
    this.setBounce(0.1);
    this.body!.setSize(40, 32);
    this.body!.setOffset(4, 4);
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) { this.target = target; }
  getDamage(): number { return this.damage; }

  takeDamage(amount: number) {
    this.health -= amount;
    flashSprite(this.scene, this);
    knockback(this.body as Phaser.Physics.Arcade.Body, this.target?.x ?? this.x - 1, 150);
  }

  isDead(): boolean { return this.health <= 0; }

  die() {
    if (this.dying) return;
    this.dying = true;
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setTint(0x666666);
    this.scene.time.delayedCall(300, () => this.destroy());
  }

  update(time: number, delta: number) {
    if (this.isDead() || this.dying) return;
    if (!this.target) { this.patrol(delta); return; }
    const dist = Phaser.Math.Distance.BetweenPoints(this, this.target);
    if (dist < this.aggroRange) {
      const direction = this.target.x < this.x ? -1 : 1;
      this.setVelocityX(direction * this.chargeSpeed);
      this.setFlipX(direction < 0);
    } else {
      this.patrol(delta);
    }
  }

  private patrol(delta: number) {
    this.patrolTimer += delta;
    if (this.patrolTimer >= 2000) { this.patrolDirection *= -1; this.patrolTimer = 0; }
    this.setVelocityX(this.patrolDirection * this.speed);
    this.setFlipX(this.patrolDirection < 0);
  }
}
