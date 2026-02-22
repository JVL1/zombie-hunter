import Phaser from 'phaser';
import { Damageable, flashSprite, knockback } from '../systems/Combat';

export enum BossState {
  SITTING,
  RISING,
  FIGHTING,
  DEAD,
}

export class Boss extends Phaser.Physics.Arcade.Sprite implements Damageable {
  health: number;
  maxHealth: number;
  private damage = 20;
  private speed = 100;
  private state = BossState.SITTING;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private throne: Phaser.GameObjects.Rectangle;
  private attackTimer = 0;
  private chargeSpeed = 300;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    health: number = 150
  ) {
    super(scene, x, y, 'boss');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHealth = health;
    this.health = health;

    this.setCollideWorldBounds(true);
    this.setBounce(0.1);

    // Initially no movement — sitting on throne
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setImmovable(true);

    // Create throne behind boss
    this.throne = scene.add.rectangle(x, y + 20, 80, 96, 0x8b4513);
    this.setDepth(1); // Boss renders in front of throne
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  getState(): BossState {
    return this.state;
  }

  getDamage(): number {
    return this.damage;
  }

  triggerRise() {
    if (this.state !== BossState.SITTING) return;
    this.state = BossState.RISING;

    this.scene.tweens.add({
      targets: this,
      y: this.y - 30,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        this.state = BossState.FIGHTING;
        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        this.setImmovable(false);
      },
    });
  }

  takeDamage(amount: number) {
    if (this.state !== BossState.FIGHTING) return;

    this.health -= amount;
    flashSprite(this.scene, this);
    knockback(
      this.body as Phaser.Physics.Arcade.Body,
      this.target?.x ?? this.x - 1,
      100
    );
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  destroyThrone() {
    this.scene.tweens.add({
      targets: this.throne,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.3,
      duration: 500,
      onComplete: () => this.throne.destroy(),
    });
  }

  update(time: number, delta: number) {
    if (this.state !== BossState.FIGHTING || !this.target) return;

    this.attackTimer += delta;

    const direction = this.target.x < this.x ? -1 : 1;
    this.setFlipX(direction < 0);

    if (this.attackTimer > 2000) {
      this.setVelocityX(direction * this.chargeSpeed);
      if (this.attackTimer > 2500) {
        this.attackTimer = 0;
      }
    } else {
      this.setVelocityX(direction * this.speed);
    }
  }
}
