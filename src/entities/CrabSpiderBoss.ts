import Phaser from 'phaser';
import { Damageable, flashSprite, knockback } from '../systems/Combat';
import { fireLaser } from '../systems/LaserAttack';
import { spawnShockwave } from '../systems/Shockwave';
import { CrackingGround } from '../systems/CrackingGround';

export enum CrabSpiderState {
  IN_COCOON,
  EMERGING,
  FIGHTING,
  DEAD,
}

export class CrabSpiderBoss extends Phaser.Physics.Arcade.Sprite implements Damageable {
  health: number;
  maxHealth: number;
  private damage = 15;
  private speed = 80;
  private bossState = CrabSpiderState.IN_COCOON;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private attackTimer = 0;
  private attackInterval = 3500;
  private skitterDirection = 1;
  private skitterTimer = 0;
  private cocoon: Phaser.GameObjects.Sprite | null = null;
  private crackingGround: CrackingGround | null = null;
  private groundY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    groundY: number,
    health: number = 250
  ) {
    super(scene, x, y, 'crab-spider-boss', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHealth = health;
    this.health = health;
    this.groundY = groundY;

    this.setScale(1);
    this.setCollideWorldBounds(true);
    this.setBounce(0.1);

    // Start immobile in cocoon
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setImmovable(true);
    this.setVisible(false);

    // Create cocoon sprite
    this.cocoon = scene.add.sprite(x, y, 'cocoon');
    this.cocoon.setDepth(1);
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  setCrackingGround(cg: CrackingGround) {
    this.crackingGround = cg;
  }

  getState(): CrabSpiderState {
    return this.bossState;
  }

  getDamage(): number {
    return this.damage;
  }

  triggerEmerge() {
    if (this.bossState !== CrabSpiderState.IN_COCOON) return;
    this.bossState = CrabSpiderState.EMERGING;

    // Cocoon pulses then bursts
    this.scene.tweens.add({
      targets: this.cocoon,
      scaleX: 1.2,
      scaleY: 1.2,
      yoyo: true,
      repeat: 2,
      duration: 200,
      onComplete: () => {
        if (this.cocoon) {
          // Silk strand particles
          this.scene.add.particles(this.cocoon.x, this.cocoon.y, 'web-decoration', {
            speed: { min: 100, max: 250 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            lifespan: 600,
            quantity: 15,
            emitting: false,
          }).explode();

          this.cocoon.destroy();
          this.cocoon = null;
        }

        // Boss appears
        this.setVisible(true);
        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        this.setImmovable(false);

        this.scene.time.delayedCall(500, () => {
          this.bossState = CrabSpiderState.FIGHTING;
        });
      },
    });
  }

  takeDamage(amount: number) {
    if (this.bossState !== CrabSpiderState.FIGHTING) return;

    this.health -= amount;
    flashSprite(this.scene, this);
    knockback(
      this.body as Phaser.Physics.Arcade.Body,
      this.target?.x ?? this.x - 1,
      80
    );
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  update(time: number, delta: number) {
    if (this.bossState !== CrabSpiderState.FIGHTING || !this.target) return;

    // Speed increase below 50% HP
    const enraged = this.health < this.maxHealth * 0.5;
    const currentSpeed = enraged ? this.speed * 1.5 : this.speed;
    const currentInterval = enraged ? 2500 : this.attackInterval;

    // Skitter sideways (crab movement)
    this.skitterTimer += delta;
    if (this.skitterTimer >= 600) {
      this.skitterDirection *= -1;
      this.skitterTimer = 0;
    }

    // Bias skitter toward player
    const playerDir = this.target.x < this.x ? -1 : 1;
    const moveX = this.skitterDirection * currentSpeed * 0.5 + playerDir * currentSpeed * 0.5;
    this.setVelocityX(moveX);
    this.setFlipX(playerDir < 0);

    // Attack timer
    this.attackTimer += delta;
    if (this.attackTimer >= currentInterval) {
      this.attackTimer = 0;

      // Randomly choose: laser (50%) or stomp (50%)
      if (Math.random() < 0.5) {
        this.attackLaser();
      } else {
        this.attackStomp();
      }
    }
  }

  private attackLaser() {
    if (!this.target) return;
    const direction = this.target.x < this.x ? -1 : 1;
    fireLaser({
      scene: this.scene,
      x: this.x + direction * 30,
      y: this.y - 10,
      direction,
      player: this.target,
      damage: 25,
      chargeTime: 1500,
      beamSpeed: 600,
      onChargeStart: () => { this.setTint(0xff3333); },
      onFire: () => { this.clearTint(); },
    });
  }

  private attackStomp() {
    if (!this.target) return;
    spawnShockwave(this.scene, this.x, this.groundY, this.target, 10, 300);
    this.scene.cameras.main.shake(150, 0.008);

    // 30% chance to crack the ground
    if (Math.random() < 0.3 && this.crackingGround) {
      this.crackingGround.openCrack(this.x);
    }
  }

  destroyCocoon() {
    if (this.cocoon) {
      this.cocoon.destroy();
      this.cocoon = null;
    }
  }
}
