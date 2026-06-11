import Phaser from 'phaser';
import { Assets, ZombieAnims } from '../assets';
import { BOSS } from '../config';
import { Juice } from '../core/Juice';
import { SynthAudio } from '../core/SynthAudio';
import { dustPuff, flashSprite, knockback, lit, shockwave } from '../fx/Effects';
import type { BossDef } from '../levels';

export enum BossState {
  SITTING,
  RISING,
  FIGHTING,
  CHARGE_WINDUP,
  CHARGING,
  STUNNED,
  SUMMONING,
  LEAPING,
  DEAD,
}

// The Mutated Zombie — Level 1 boss on a throne of crushed cars.
// Walks you down, telegraphs charges, and at half health it ENRAGES:
// red glow, faster, and starts leaping into ground slams with shockwaves.
export class Boss extends Phaser.Physics.Arcade.Sprite {
  health: number;
  maxHealth: number;
  enraged = false;

  private bossState = BossState.SITTING;
  private stateUntil = 0;
  private attackTimer = 0;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private throne: Phaser.GameObjects.Image;
  private throneLight: Phaser.GameObjects.Light | null = null;
  private juice: Juice;
  private anims_ = ZombieAnims.urban;
  private chargeDir = 1;
  private def: BossDef;
  private nextSummonAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, juice: Juice, def: BossDef) {
    super(scene, x, y, Assets.URBAN_IDLE, 0);
    this.juice = juice;
    this.def = def;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    lit(this);

    this.maxHealth = def.hp;
    this.health = def.hp;

    this.setScale(def.scale);
    if (def.tint !== undefined) this.setTint(def.tint);
    this.setCollideWorldBounds(true);
    // All bosses are urban-base sprites for now — urban body values
    this.body!.setSize(40, 80);
    this.body!.setOffset(44, 48);

    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setImmovable(true);

    this.throne = scene.add.image(x, y + 8, def.throneTexture).setDepth(this.depth - 1);
    lit(this.throne);
    this.setDepth(6);

    if (scene.sys.renderer.type === Phaser.WEBGL) {
      this.throneLight = scene.lights.addLight(x, y - 30, 260, 0xff3322, 0.9);
    }

    this.play(this.anims_.idle);
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  getState(): BossState {
    return this.bossState;
  }

  getDamage(): number {
    return this.def.contactDamage;
  }

  get isVulnerable(): boolean {
    return this.bossState !== BossState.SITTING && this.bossState !== BossState.RISING;
  }

  triggerRise() {
    if (this.bossState !== BossState.SITTING) return;
    this.bossState = BossState.RISING;
    SynthAudio.roar();
    this.juice.shake(0.006, 600);

    this.scene.tweens.add({
      targets: this,
      y: this.y - 36,
      duration: 900,
      ease: 'Power2',
      onComplete: () => {
        this.bossState = BossState.FIGHTING;
        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        this.setImmovable(false);
        // The opening move is always a readable charge, never a summon
        this.nextSummonAt = this.scene.time.now + 2500;
      },
    });
  }

  takeDamage(amount: number): boolean {
    if (!this.isVulnerable || this.bossState === BossState.DEAD) return false;

    // Bonus damage while stunned from a wall hit
    const final = this.bossState === BossState.STUNNED ? Math.floor(amount * 1.5) : amount;
    this.health -= final;
    // Enrage check BEFORE the flash so the restore tint captures the rage red
    // on the very hit that triggers it
    if (this.health <= this.maxHealth * BOSS.enrageThreshold && !this.enraged) {
      this.enrage();
    }
    flashSprite(this, 0xffffff, undefined, this.enraged ? 0xff6655 : this.def.tint);
    if (this.body) {
      knockback(this.body as Phaser.Physics.Arcade.Body, this.target?.x ?? this.x - 1, 90);
    }
    if (this.health <= 0) {
      this.health = 0;
      this.bossState = BossState.DEAD;
      return true;
    }
    this.play(this.anims_.hurt, true);
    return false;
  }

  private enrage() {
    this.enraged = true;
    SynthAudio.roar();
    this.setTint(0xff6655);
    this.juice.shake(0.008, 500);
    this.juice.zoomPunch(0.08, 300);
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  destroyThrone() {
    if (this.throneLight) this.scene.lights.removeLight(this.throneLight);
    this.scene.tweens.add({
      targets: this.throne,
      alpha: 0,
      scaleX: 0.6,
      scaleY: 0.25,
      y: this.throne.y + 40,
      duration: 700,
      ease: 'Quad.easeIn',
      onComplete: () => this.throne.destroy(),
    });
  }

  update(time: number, delta: number) {
    if (!this.target || !this.body || this.bossState === BossState.DEAD) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dir = this.target.x < this.x ? -1 : 1;

    switch (this.bossState) {
      case BossState.FIGHTING: {
        this.attackTimer += delta;
        this.setFlipX(dir < 0);
        const walkSpeed = this.enraged ? this.def.enragedWalkSpeed : this.def.walkSpeed;
        this.setVelocityX(dir * walkSpeed);
        if (this.anims.currentAnim?.key !== this.anims_.hurt || !this.anims.isPlaying) {
          this.play(this.anims_.walk, true);
        }

        const interval = this.enraged ? this.def.enragedAttackIntervalMs : this.def.attackIntervalMs;
        if (this.attackTimer > interval && body.blocked.down) {
          this.attackTimer = 0;
          if (this.def.summon && time >= this.nextSummonAt) {
            this.startSummon(time);
          } else if (this.def.canLeap && this.enraged && Math.random() < 0.45) {
            this.startLeap(dir);
          } else if (this.def.canCharge) {
            this.startChargeWindup(dir, time);
          }
        }
        break;
      }

      case BossState.CHARGE_WINDUP:
        this.setVelocityX(0);
        if (time >= this.stateUntil) {
          this.bossState = BossState.CHARGING;
          this.stateUntil = time + BOSS.chargeMs;
          this.setVelocityX(this.chargeDir * BOSS.chargeSpeed);
          this.play(this.anims_.attack, true);
          SynthAudio.groan(0.6);
        }
        break;

      case BossState.CHARGING:
        this.setVelocityX(this.chargeDir * BOSS.chargeSpeed);
        // Smashed into the arena wall — stunned and takes bonus damage
        if (body.blocked.left || body.blocked.right) {
          this.bossState = BossState.STUNNED;
          this.stateUntil = time + BOSS.wallStunMs;
          this.setVelocityX(0);
          this.juice.shake(0.008, 200);
          SynthAudio.slam();
          dustPuff(this.scene, this.x + this.chargeDir * 40, this.y, 10);
        } else if (time >= this.stateUntil) {
          this.bossState = BossState.FIGHTING;
        }
        break;

      case BossState.STUNNED:
        this.setVelocityX(0);
        this.setAngle(Math.sin(time / 40) * 4);
        if (time >= this.stateUntil) {
          this.setAngle(0);
          this.bossState = BossState.FIGHTING;
        }
        break;

      case BossState.SUMMONING:
        this.setVelocityX(0);
        if (time >= this.stateUntil) {
          SynthAudio.roar();
          this.scene.events.emit('boss-summon', {
            x: this.x,
            variant: this.def.summon!.variant,
            count: this.enraged ? this.def.summon!.enragedCount : this.def.summon!.count,
            maxAlive: this.def.summon!.maxAlive,
          });
          this.nextSummonAt = time + this.def.summon!.intervalMs;
          this.bossState = BossState.FIGHTING;
        }
        break;

      case BossState.LEAPING:
        if (body.blocked.down && body.velocity.y >= 0 && time >= this.stateUntil) {
          // Landed: shockwave
          this.bossState = BossState.FIGHTING;
          this.attackTimer = -400;
          SynthAudio.slam();
          this.juice.shake(0.01, 250);
          shockwave(this.scene, this.x, this.y + 60, 3);
          dustPuff(this.scene, this.x, this.y + 60, 14);
          this.scene.events.emit('boss-shockwave', { x: this.x, y: this.y + 60 });
        }
        break;

      default:
        break;
    }
  }

  private startChargeWindup(dir: number, time: number) {
    this.bossState = BossState.CHARGE_WINDUP;
    this.chargeDir = dir;
    this.stateUntil = time + BOSS.chargeWindupMs;
    this.setVelocityX(0);
    flashSprite(this, 0xff5533, BOSS.chargeWindupMs - 80, this.enraged ? 0xff6655 : this.def.tint);
    dustPuff(this.scene, this.x - dir * 30, this.y + 50, 6);
  }

  // Telegraphed green flash, then a roar and a 'boss-summon' scene event.
  // Stays vulnerable the whole time — it's a punish window for brave kids.
  private startSummon(time: number) {
    this.bossState = BossState.SUMMONING;
    this.stateUntil = time + 500;
    this.setVelocityX(0);
    flashSprite(this, 0x88ff88, 440, this.enraged ? 0xff6655 : this.def.tint);
  }

  private startLeap(dir: number) {
    this.bossState = BossState.LEAPING;
    this.stateUntil = this.scene.time.now + 300; // min air time before landing counts
    this.setVelocity(dir * 200, BOSS.jumpSlamVelocity);
    this.play(this.anims_.attack, true);
    SynthAudio.groan(0.5);
  }

  override destroy(fromScene?: boolean) {
    if (this.throneLight && this.scene) this.scene.lights.removeLight(this.throneLight);
    super.destroy(fromScene);
  }
}
