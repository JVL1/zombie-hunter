import Phaser from 'phaser';
import { Assets } from '../assets';
import { Damageable, flashSprite, knockback } from '../systems/Combat';

export type ZombieVariant = 'zombie' | 'urban-zombie';

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
  private variant: ZombieVariant;
  private dying = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    health: number = 30,
    variant: ZombieVariant = 'zombie'
  ) {
    const idleKey = variant === 'urban-zombie' ? Assets.URBAN_ZOMBIE_IDLE : Assets.ZOMBIE_IDLE;
    super(scene, x, y, idleKey, 0);

    this.variant = variant;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHealth = health;
    this.health = health;

    this.setCollideWorldBounds(true);
    this.setBounce(0.1);

    // Adjust physics body for zombie sprites
    if (variant === 'urban-zombie') {
      this.body!.setSize(40, 80);
      this.body!.setOffset(44, 48);
    } else {
      this.body!.setSize(32, 64);
      this.body!.setOffset(32, 32);
    }

    this.play(this.animKey('idle'));
  }

  private animKey(action: string): string {
    return this.variant === 'urban-zombie' ? `urban-zombie-${action}` : `zombie-${action}`;
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
    this.play(this.animKey('hurt'), true);
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  die() {
    if (this.dying) return;
    this.dying = true;
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.play(this.animKey('dead'));
    this.once('animationcomplete-' + this.animKey('dead'), () => {
      this.destroy();
    });
  }

  update(_time: number, delta: number) {
    if (this.isDead() || this.dying) return;

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

    // Update animation (unless hurt is playing)
    if (this.anims.currentAnim?.key !== this.animKey('hurt')) {
      if (Math.abs(this.body!.velocity.x) > 0) {
        this.play(this.animKey('walk'), true);
      } else {
        this.play(this.animKey('idle'), true);
      }
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
