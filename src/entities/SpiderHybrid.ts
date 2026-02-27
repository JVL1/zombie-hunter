import Phaser from 'phaser';
import { Damageable, flashSprite, knockback } from '../systems/Combat';
import { fireLaser } from '../systems/LaserAttack';

export class SpiderHybrid extends Phaser.Physics.Arcade.Sprite implements Damageable {
  health: number;
  maxHealth: number;
  private damage = 10;
  private speed = 90;
  private aggroRange = 250;
  private laserCooldown = 3000;
  private lastLaserTime = 0;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private dying = false;
  private skitterDirection = 1;
  private skitterTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, health: number = 40) {
    super(scene, x, y, 'spider-hybrid', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.maxHealth = health;
    this.health = health;
    this.setCollideWorldBounds(true);
    this.setBounce(0.1);
    this.body!.setSize(36, 28);
    this.body!.setOffset(4, 4);
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) { this.target = target; }
  getDamage(): number { return this.damage; }

  takeDamage(amount: number) {
    this.health -= amount;
    flashSprite(this.scene, this);
    knockback(this.body as Phaser.Physics.Arcade.Body, this.target?.x ?? this.x - 1, 120);
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
    if (!this.target) { this.skitter(delta); return; }
    const dist = Phaser.Math.Distance.BetweenPoints(this, this.target);
    if (dist < this.aggroRange) {
      this.skitter(delta);
      if (time - this.lastLaserTime > this.laserCooldown) {
        this.lastLaserTime = time;
        const direction = this.target.x < this.x ? -1 : 1;
        fireLaser({
          scene: this.scene,
          x: this.x,
          y: this.y,
          direction,
          player: this.target,
          damage: 8,
          chargeTime: 0,
          beamSpeed: 400,
        });
      }
    } else {
      this.skitter(delta);
    }
  }

  private skitter(delta: number) {
    this.skitterTimer += delta;
    if (this.skitterTimer >= 800) { this.skitterDirection *= -1; this.skitterTimer = 0; }
    this.setVelocityX(this.skitterDirection * this.speed);
    this.setFlipX(this.skitterDirection < 0);
  }
}
