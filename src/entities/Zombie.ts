import Phaser from 'phaser';
import { ZombieAnims, ZombieAnimSet } from '../assets';
import { PowerUpType, ZOMBIE, ZombieVariant, ZombieVariantDef } from '../config';
import { SynthAudio } from '../core/SynthAudio';
import { dustPuff, flashSprite, floatText, knockback, lit } from '../fx/Effects';
import { Hittable } from './Hittable';

export type { ZombieVariant } from '../config';

enum ZombieState {
  PATROL,
  CHASE,
  WINDUP,
  LUNGE,
  RECOVER,
}

// Patrols until the player gets close, then chases. In melee range it
// telegraphs a lunge (flash + crouch) before leaping. If the player is on a
// platform above, it hops pathetically and fails — Henry's favorite feature.
export class Zombie extends Phaser.Physics.Arcade.Sprite implements Hittable {
  health: number;
  maxHealth: number;
  private anims_: ZombieAnimSet;
  private variant: ZombieVariant;
  private vdef: ZombieVariantDef;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private state_ = ZombieState.PATROL;
  private stateUntil = 0;
  private nextLungeAt = 0;
  private patrolDirection = 1;
  private patrolTimer = 0;
  private lastJumpAttempt = 0;
  private nextGroanAt = 0;
  private dying = false;
  private windupTween: Phaser.Tweens.Tween | null = null;
  private healthBar: Phaser.GameObjects.Rectangle | null = null;
  private healthBarBg: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, variant: ZombieVariant = 'zombie') {
    const v: ZombieVariantDef = ZOMBIE.variants[variant];
    super(
      scene,
      x,
      y,
      v.sheet ? `${v.sheet}-idle` : v.base === 'urban' ? 'urban-idle-sheet' : 'zombie-idle-sheet',
      0
    );
    this.variant = variant;
    this.vdef = v;
    this.anims_ = ZombieAnims[v.animSet ?? v.base];

    scene.add.existing(this);
    scene.physics.add.existing(this);
    lit(this);

    this.maxHealth = v.hp;
    this.health = this.maxHealth;

    this.setCollideWorldBounds(true);
    // Swim variants (Level 4) are neutral-buoyancy: no gravity, they hover.
    if (v.movement === 'swim') (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    if (v.base === 'urban') {
      this.body!.setSize(40, 80);
      this.body!.setOffset(44, 48);
    } else {
      this.body!.setSize(32, 64);
      this.body!.setOffset(32, 32);
    }
    this.setScale(v.scale);
    if (v.tint !== undefined) this.setTint(v.tint);

    this.play(this.anims_.idle);
    this.nextGroanAt = scene.time.now + 2000 + Math.random() * 4000;
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  getDamage(): number {
    return this.vdef.contactDamage;
  }

  // Hittable: contact-hit damage (alias of getDamage), and a sword-hit apply
  // that reports whether this hit was the killing blow. takeDamage stays the
  // canonical mutator — takeHit just wraps it so the scene's shared combat path
  // reads one boolean instead of re-checking isDead().
  get contactDamage(): number {
    return this.getDamage();
  }

  takeHit(amount: number): boolean {
    this.takeDamage(amount);
    return this.isDead();
  }

  get isLunging(): boolean {
    return this.state_ === ZombieState.LUNGE;
  }

  // Buff orb this monster drops on death (undefined for regular zombies)
  get powerUp(): PowerUpType | undefined {
    return this.vdef.powerUp;
  }

  // Henry's name for this power monster (undefined for regular zombies)
  get displayName(): string | undefined {
    return this.vdef.displayName;
  }

  takeDamage(amount: number) {
    if (this.dying) return;
    this.health -= amount;
    flashSprite(this, 0xffffff, undefined, this.vdef.tint);
    floatText(this.scene, this.x, this.y - 40, `${amount}`, '#ffdd55');
    if (this.body) {
      knockback(this.body as Phaser.Physics.Arcade.Body, this.target?.x ?? this.x - 1, 160);
    }
    if (this.health > 0) {
      this.play(this.anims_.hurt, true);
      this.updateHealthBar();
      // Getting hit interrupts a windup — kill the crouch tween too
      if (this.state_ === ZombieState.WINDUP) {
        this.state_ = ZombieState.RECOVER;
        this.stateUntil = this.scene.time.now + 300;
        this.windupTween?.stop();
        this.windupTween = null;
        this.setScale(this.vdef.scale);
      }
    }
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  die() {
    if (this.dying) return;
    this.dying = true;
    this.destroyHealthBar();
    this.setVelocity(0, 0);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.enable = false;
    this.play(this.anims_.dead, true);
    this.once(`animationcomplete-${this.anims_.dead}`, () => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        delay: 900,
        duration: 600,
        onComplete: () => this.destroy(),
      });
    });
  }

  update(time: number, delta: number) {
    if (this.dying || !this.body || !this.active) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.healthBar) this.positionHealthBar();

    // Occasional groan when the player is near
    if (this.target && time > this.nextGroanAt) {
      const dist = Phaser.Math.Distance.BetweenPoints(this, this.target);
      if (dist < 320) {
        SynthAudio.groan(
          this.variant === 'zanter' ? 0.6 : this.vdef.base === 'urban' ? 0.8 : 1 + Math.random() * 0.3
        );
      }
      this.nextGroanAt = time + 3000 + Math.random() * 4000;
    }

    // Level 4 swimmers take a completely separate 2D movement path. Everything
    // below is the grounded land-zombie logic and never runs for them, so land
    // zombies (movement undefined/'ground') stay bit-identical.
    if (this.vdef.movement === 'swim') {
      this.swimUpdate(time, delta);
      return;
    }

    switch (this.state_) {
      case ZombieState.WINDUP:
        this.setVelocityX(0);
        if (time >= this.stateUntil) {
          this.state_ = ZombieState.LUNGE;
          this.stateUntil = time + ZOMBIE.lungeMs;
          const dir = this.target && this.target.x < this.x ? -1 : 1;
          this.setVelocity(dir * ZOMBIE.lungeSpeed, -130);
          this.play(this.anims_.attack, true);
        }
        return;
      case ZombieState.LUNGE:
        if (time >= this.stateUntil) {
          this.state_ = ZombieState.RECOVER;
          this.stateUntil = time + ZOMBIE.lungeRecoverMs;
        }
        return;
      case ZombieState.RECOVER:
        this.setVelocityX(body.blocked.down ? 0 : body.velocity.x);
        if (time >= this.stateUntil) {
          this.state_ = ZombieState.CHASE;
        }
        return;
      default:
        break;
    }

    if (!this.target) {
      this.patrol(delta);
      return;
    }

    const dist = Phaser.Math.Distance.BetweenPoints(this, this.target);
    const aggro =
      this.state_ === ZombieState.CHASE ? dist < ZOMBIE.deaggroRange : dist < ZOMBIE.aggroRange;

    if (!aggro) {
      this.state_ = ZombieState.PATROL;
      this.patrol(delta);
      this.updateWalkAnim(body);
      return;
    }

    this.state_ = ZombieState.CHASE;
    const dx = Math.abs(this.target.x - this.x);
    const playerAbove = dx < 120 && this.y - this.target.y > 60;

    if (playerAbove) {
      // Can't reach — hop sadly in place
      this.setVelocityX(0);
      this.tryFailedJump(time);
    } else if (
      dx < ZOMBIE.lungeRange &&
      Math.abs(this.y - this.target.y) < 50 &&
      time >= this.nextLungeAt &&
      body.blocked.down
    ) {
      // Telegraphed lunge: crouch-flash, then leap
      this.state_ = ZombieState.WINDUP;
      this.stateUntil = time + ZOMBIE.lungeWindupMs;
      this.nextLungeAt = time + ZOMBIE.lungeCooldownMs;
      this.setVelocityX(0);
      this.setFlipX(this.target.x < this.x);
      flashSprite(this, 0xff8866, ZOMBIE.lungeWindupMs - 60, this.vdef.tint);
      this.windupTween = this.scene.tweens.add({
        targets: this,
        scaleY: this.vdef.scale * 0.92,
        scaleX: this.vdef.scale * 1.06,
        duration: ZOMBIE.lungeWindupMs - 60,
        yoyo: true,
        onComplete: () => {
          this.windupTween = null;
          this.setScale(this.vdef.scale);
        },
      });
    } else {
      const dir = this.target.x < this.x ? -1 : 1;
      this.setVelocityX(dir * this.vdef.chaseSpeed);
      this.setFlipX(dir < 0);
      this.updateWalkAnim(body);
    }
  }

  private updateWalkAnim(body: Phaser.Physics.Arcade.Body) {
    if (this.anims.currentAnim?.key === this.anims_.hurt && this.anims.isPlaying) return;
    this.play(Math.abs(body.velocity.x) > 5 ? this.anims_.walk : this.anims_.idle, true);
  }

  // Swim variants move in 2D, so the walk/idle decision uses total speed — a
  // straight-up/down chase has near-zero velocity.x and would otherwise freeze
  // the swimmer into its idle pose while it visibly moves toward the player.
  private updateSwimAnim(body: Phaser.Physics.Arcade.Body) {
    if (this.anims.currentAnim?.key === this.anims_.hurt && this.anims.isPlaying) return;
    const moving = Math.hypot(body.velocity.x, body.velocity.y) > 5;
    this.play(moving ? this.anims_.walk : this.anims_.idle, true);
  }

  private tryFailedJump(time: number) {
    if (time - this.lastJumpAttempt < ZOMBIE.jumpFailIntervalMs) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body.blocked.down) return;
    this.lastJumpAttempt = time;
    this.setVelocityY(-160);
    SynthAudio.groan(1.4);
    this.scene.time.delayedCall(420, () => {
      if (this.active && this.body && (this.body as Phaser.Physics.Arcade.Body).blocked.down) {
        dustPuff(this.scene, this.x, this.y + 30, 5);
      }
    });
  }

  private patrol(delta: number) {
    this.patrolTimer += delta;
    if (this.patrolTimer >= 2000) {
      this.patrolDirection *= -1;
      this.patrolTimer = 0;
    }
    this.setVelocityX(this.patrolDirection * this.vdef.patrolSpeed);
    this.setFlipX(this.patrolDirection < 0);
  }

  // ── Swim movement (Level 4 'drowned') ─────────────────────────────────────
  // Neutral-buoyancy 2D swimmer: direct-velocity diagonal chase, gentle bob on
  // patrol, and a dodgeable telegraph burst that fires along the 2D vector to
  // the player (no ground/`blocked.down` gate — there is no floor underwater).
  // Reuses the WINDUP/LUNGE/RECOVER states + timings and the shared state fields
  // (`state_`/`stateUntil`/`nextLungeAt`/`windupTween`) so takeDamage's
  // windup-interrupt logic still works.
  private swimUpdate(time: number, delta: number) {
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.state_) {
      case ZombieState.WINDUP:
        this.setVelocity(0, 0);
        if (time >= this.stateUntil) {
          this.state_ = ZombieState.LUNGE;
          this.stateUntil = time + ZOMBIE.lungeMs;
          // Burst toward the player along the 2D vector captured right now.
          const tx = this.target?.x ?? this.x;
          const ty = this.target?.y ?? this.y;
          const ang = Math.atan2(ty - this.y, tx - this.x);
          this.setVelocity(Math.cos(ang) * ZOMBIE.lungeSpeed, Math.sin(ang) * ZOMBIE.lungeSpeed);
          this.setFlipX(tx < this.x);
          this.play(this.anims_.attack, true);
        }
        return;
      case ZombieState.LUNGE:
        if (time >= this.stateUntil) {
          this.state_ = ZombieState.RECOVER;
          this.stateUntil = time + ZOMBIE.lungeRecoverMs;
        }
        return;
      case ZombieState.RECOVER:
        // Coast on the leftover burst velocity; no ground zeroing underwater.
        if (time >= this.stateUntil) this.state_ = ZombieState.CHASE;
        return;
      default:
        break;
    }

    if (!this.target) {
      this.swimPatrol(time, delta);
      this.updateSwimAnim(body);
      return;
    }

    const dist = Phaser.Math.Distance.BetweenPoints(this, this.target);
    const aggro =
      this.state_ === ZombieState.CHASE ? dist < ZOMBIE.deaggroRange : dist < ZOMBIE.aggroRange;

    if (!aggro) {
      this.state_ = ZombieState.PATROL;
      this.swimPatrol(time, delta);
      this.updateSwimAnim(body);
      return;
    }

    this.state_ = ZombieState.CHASE;
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;

    if (dist < ZOMBIE.lungeRange && time >= this.nextLungeAt) {
      // Telegraphed dodgeable burst — crouch-flash windup, then a 2D lunge.
      this.state_ = ZombieState.WINDUP;
      this.stateUntil = time + ZOMBIE.lungeWindupMs;
      this.nextLungeAt = time + ZOMBIE.lungeCooldownMs;
      this.setVelocity(0, 0);
      this.setFlipX(dx < 0);
      flashSprite(this, 0xff8866, ZOMBIE.lungeWindupMs - 60, this.vdef.tint);
      this.windupTween = this.scene.tweens.add({
        targets: this,
        scaleY: this.vdef.scale * 0.92,
        scaleX: this.vdef.scale * 1.06,
        duration: ZOMBIE.lungeWindupMs - 60,
        yoyo: true,
        onComplete: () => {
          this.windupTween = null;
          this.setScale(this.vdef.scale);
        },
      });
    } else {
      // Direct-velocity 2D chase: swim straight at the player, any direction.
      const len = Math.hypot(dx, dy) || 1;
      this.setVelocity((dx / len) * this.vdef.chaseSpeed, (dy / len) * this.vdef.chaseSpeed);
      this.setFlipX(dx < 0);
      this.updateSwimAnim(body);
    }
  }

  private swimPatrol(time: number, delta: number) {
    this.patrolTimer += delta;
    if (this.patrolTimer >= 2000) {
      this.patrolDirection *= -1;
      this.patrolTimer = 0;
    }
    this.setVelocityX(this.patrolDirection * this.vdef.patrolSpeed);
    // Gentle vertical bob around neutral so it hovers rather than drifting off.
    this.setVelocityY(Math.sin(time / 500) * 18);
    this.setFlipX(this.patrolDirection < 0);
  }

  private updateHealthBar() {
    if (!this.healthBar) {
      const barY = this.y - 46 * this.vdef.scale;
      this.healthBarBg = this.scene.add.rectangle(this.x, barY, 30, 4, 0x111111).setDepth(15);
      this.healthBar = this.scene.add.rectangle(this.x, barY, 28, 2, 0x44dd44).setDepth(16);
    }
    const pct = Math.max(0, this.health / this.maxHealth);
    this.healthBar.width = 28 * pct;
    this.healthBar.fillColor = pct > 0.5 ? 0x44dd44 : pct > 0.25 ? 0xdddd44 : 0xdd4444;
  }

  private positionHealthBar() {
    const barY = this.y - 46 * this.vdef.scale;
    this.healthBarBg?.setPosition(this.x, barY);
    this.healthBar?.setPosition(this.x - (28 - this.healthBar.width) / 2, barY);
  }

  private destroyHealthBar() {
    this.healthBar?.destroy();
    this.healthBarBg?.destroy();
    this.healthBar = null;
    this.healthBarBg = null;
  }

  override destroy(fromScene?: boolean) {
    this.destroyHealthBar();
    super.destroy(fromScene);
  }
}
