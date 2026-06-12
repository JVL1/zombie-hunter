import Phaser from 'phaser';
import { Assets, PlayerAnims } from '../assets';
import { COMBAT, PLAYER, SHOP } from '../config';
import { resolveDamage } from '../core/damage';
import { GameState } from '../core/GameState';
import { InputController } from '../core/InputController';
import { SynthAudio } from '../core/SynthAudio';
import { afterimage, dustPuff, flashSprite, floatText, lit } from '../fx/Effects';

export interface AttackEvent {
  hitbox: Phaser.GameObjects.Rectangle;
  damage: number;
  comboStep: number;
  isFinisher: boolean;
}

export interface SlamEvent {
  hitbox: Phaser.GameObjects.Rectangle;
  damage: number;
}

// The zombie hunter. Modern platformer feel: coyote time, jump buffer,
// variable jump height, double jump, dash with i-frames, 3-hit sword combo,
// air slam with pogo bounce.
export class Player extends Phaser.Physics.Arcade.Sprite {
  private controls: InputController;
  private gameState = GameState.getInstance();
  private swordOverlay: Phaser.GameObjects.Sprite;
  private lamp: Phaser.GameObjects.Light | null = null;

  // Jump state
  private lastGroundedAt = -Infinity;
  private jumpsLeft = PLAYER.maxJumps;
  private wasGrounded = false;

  // Dash state
  private dashing = false;
  private dashReadyAt = 0;
  private dashTrailEvent: Phaser.Time.TimerEvent | null = null;

  // Attack state
  private attacking = false;
  private comboStep = 0;
  private comboWindowUntil = 0;
  private attackReadyAt = 0;
  private slamHitbox: Phaser.GameObjects.Rectangle | null = null;

  // Damage state
  private invulnUntil = 0;
  private dying = false;
  private lastGroundedPos: { x: number; y: number };

  constructor(scene: Phaser.Scene, x: number, y: number, input: InputController) {
    super(scene, x, y, Assets.PLAYER_SHEET, 0);
    this.controls = input;
    this.lastGroundedPos = { x, y };

    scene.add.existing(this);
    scene.physics.add.existing(this);
    lit(this);

    this.setCollideWorldBounds(true);
    this.body!.setSize(24, 48);
    this.body!.setOffset(28, 16);
    this.setDragX(PLAYER.drag);
    this.setMaxVelocity(PLAYER.maxRun, 900);

    this.swordOverlay = scene.add.sprite(x, y, Assets.PLAYER_SWORD, 0);
    lit(this.swordOverlay);

    // Sprite art faces left by default; flipX=true means facing right
    this.setFlipX(true);
    this.swordOverlay.setFlipX(true);
    this.play(PlayerAnims.IDLE.key);

    if (scene.sys.renderer.type === Phaser.WEBGL) {
      this.lamp = scene.lights.addLight(x, y, 240, 0xffd9a0, 1.1);
      const bladeTint = this.gameState.currentSword.bladeTint;
      if (bladeTint) this.swordOverlay.setTint(bladeTint);
    }
  }

  get facing(): number {
    return this.flipX ? 1 : -1;
  }

  get isDying(): boolean {
    return this.dying;
  }

  get isInvulnerable(): boolean {
    return this.dashing || this.scene.time.now < this.invulnUntil;
  }

  get isSlamming(): boolean {
    return this.slamHitbox !== null;
  }

  override setDepth(value: number): this {
    super.setDepth(value);
    if (this.swordOverlay) this.swordOverlay.setDepth(value + 1);
    return this;
  }

  update() {
    if (!this.body || this.dying) return;
    const now = this.scene.time.now;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down;

    // --- Landing ---
    if (grounded && !this.wasGrounded) {
      if (body.deltaYFinal() >= 0) {
        dustPuff(this.scene, this.x, this.y + 24, 5);
        SynthAudio.land();
      }
      if (this.slamHitbox) this.landSlam();
    }
    this.wasGrounded = grounded;

    if (grounded) {
      this.lastGroundedAt = now;
      this.jumpsLeft = PLAYER.maxJumps;
      this.lastGroundedPos.x = this.x;
      this.lastGroundedPos.y = this.y;
    }

    // --- Dash ---
    if (this.controls.dashJustPressed && !this.dashing && now >= this.dashReadyAt && !this.slamHitbox) {
      this.startDash();
    }

    if (!this.dashing) {
      // --- Horizontal movement ---
      if (this.controls.left) {
        this.setAccelerationX(-PLAYER.accel);
        this.setFlipX(false);
      } else if (this.controls.right) {
        this.setAccelerationX(PLAYER.accel);
        this.setFlipX(true);
      } else {
        this.setAccelerationX(0);
      }

      // --- Jump (buffered + coyote + double) ---
      const canCoyote = now - this.lastGroundedAt <= PLAYER.coyoteMs;
      if (this.controls.jumpJustPressed || grounded) {
        if (this.controls.consumeBufferedJump()) {
          if (grounded || canCoyote) {
            this.doJump(false);
          } else if (this.jumpsLeft > 0 && this.jumpsLeft < PLAYER.maxJumps) {
            this.doJump(true);
          } else if (this.jumpsLeft === PLAYER.maxJumps) {
            // Was airborne without jumping (walked off ledge, past coyote)
            this.jumpsLeft = PLAYER.maxJumps - 1;
            this.doJump(true);
          }
        }
      }

      // Variable jump height: release early to cut the jump short
      if (!this.controls.jumpHeld && body.velocity.y < PLAYER.jumpCutVelocity) {
        this.setVelocityY(PLAYER.jumpCutVelocity);
      }
    }

    // --- Attack ---
    if (this.controls.attackJustPressed) {
      this.tryAttack();
    }

    // --- Slam fast-fall ---
    if (this.slamHitbox) {
      this.setVelocityY(Math.max(body.velocity.y, PLAYER.slamFallSpeed));
      this.slamHitbox.setPosition(this.x, this.y + 38);
    }

    // --- Animation ---
    if (!this.attacking) {
      this.updateAnimation(grounded, body);
    }

    // --- Sync sword overlay + lamp ---
    this.swordOverlay.setPosition(this.x, this.y);
    this.swordOverlay.setFlipX(this.flipX);
    this.swordOverlay.setFrame(this.frame.name);
    this.swordOverlay.setAlpha(this.alpha);
    if (this.lamp) {
      this.lamp.setPosition(this.x, this.y - 10);
    }
  }

  private updateAnimation(grounded: boolean, body: Phaser.Physics.Arcade.Body) {
    if (!grounded) {
      this.play(body.velocity.y < 0 ? PlayerAnims.JUMP.key : PlayerAnims.FALL.key, true);
    } else if (Math.abs(body.velocity.x) > 150) {
      this.play(PlayerAnims.RUN.key, true);
    } else if (Math.abs(body.velocity.x) > 10) {
      this.play(PlayerAnims.WALK.key, true);
    } else {
      this.play(PlayerAnims.IDLE.key, true);
    }
  }

  private doJump(isDouble: boolean) {
    this.setVelocityY(PLAYER.jumpVelocity);
    this.jumpsLeft--;
    if (isDouble) {
      SynthAudio.doubleJump();
      dustPuff(this.scene, this.x, this.y + 16, 4);
    } else {
      SynthAudio.jump();
    }
  }

  private startDash() {
    this.dashing = true;
    this.dashReadyAt = this.scene.time.now + PLAYER.dashCooldownMs;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.setAccelerationX(0);
    this.setDragX(0); // constant speed for the whole dash
    this.setMaxVelocity(PLAYER.dashSpeed, 900);
    this.setVelocity(this.facing * PLAYER.dashSpeed, 0);
    SynthAudio.dash();

    this.dashTrailEvent = this.scene.time.addEvent({
      delay: 30,
      repeat: Math.floor(PLAYER.dashMs / 30),
      callback: () => afterimage(this.scene, this),
    });

    this.scene.time.delayedCall(PLAYER.dashMs, () => {
      if (!this.body) return;
      this.dashing = false;
      body.setAllowGravity(true);
      this.setDragX(PLAYER.drag);
      this.setMaxVelocity(PLAYER.maxRun, 900);
      this.dashTrailEvent?.remove();
      this.dashTrailEvent = null;
    });
  }

  private tryAttack() {
    const now = this.scene.time.now;
    if (this.attacking || now < this.attackReadyAt || this.dying) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const airborne = !body.blocked.down;
    const falling = body.velocity.y > -50;

    if (airborne && falling && !this.slamHitbox) {
      this.startSlam();
      return;
    }
    if (this.slamHitbox) return;

    // 3-hit combo: step advances if within the combo window
    this.comboStep = now <= this.comboWindowUntil ? (this.comboStep % 3) + 1 : 1;
    const isFinisher = this.comboStep === 3;
    const damage = Math.floor(
      this.gameState.swordDamage * COMBAT.comboMultipliers[this.comboStep - 1]
    );

    const speed = this.gameState.currentSword.swingSpeed;
    this.attacking = true;
    SynthAudio.swing(this.comboStep);
    this.play(PlayerAnims.ATTACK.key, true);
    this.anims.timeScale = speed;
    this.once(`animationcomplete-${PlayerAnims.ATTACK.key}`, () => {
      this.anims.timeScale = 1;
      this.attacking = false;
      this.comboWindowUntil =
        this.scene.time.now + COMBAT.comboWindowMs;
      this.attackReadyAt =
        this.scene.time.now +
        (isFinisher ? COMBAT.finisherCooldownMs : COMBAT.swingCooldownMs) / speed;
      if (isFinisher) this.comboStep = 0;
    });

    const reach =
      COMBAT.hitboxW +
      this.gameState.currentSword.reachBonus +
      (isFinisher ? COMBAT.finisherReachBonus : 0);
    const offsetX = this.facing * (18 + reach / 2);
    const hitbox = this.scene.add.rectangle(this.x + offsetX, this.y, reach, COMBAT.hitboxH);
    hitbox.setVisible(false);
    this.scene.physics.add.existing(hitbox, false);
    (hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    hitbox.setData('hitSet', new Set());

    const event: AttackEvent = { hitbox, damage, comboStep: this.comboStep, isFinisher };
    this.scene.events.emit('player-attack', event);

    this.scene.time.delayedCall(140, () => {
      if (hitbox.active) hitbox.destroy();
    });
  }

  private startSlam() {
    this.attacking = true;
    SynthAudio.swing(2);
    this.play(PlayerAnims.ATTACK.key, true);
    this.anims.timeScale = this.gameState.currentSword.swingSpeed;
    this.once(`animationcomplete-${PlayerAnims.ATTACK.key}`, () => {
      this.anims.timeScale = 1;
      this.attacking = false;
    });

    const damage = Math.floor(this.gameState.swordDamage * COMBAT.slamDamageMultiplier);
    const hitbox = this.scene.add.rectangle(this.x, this.y + 38, 36, 44);
    hitbox.setVisible(false);
    this.scene.physics.add.existing(hitbox, false);
    (hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    hitbox.setData('hitSet', new Set());
    this.slamHitbox = hitbox;

    const event: SlamEvent = { hitbox, damage };
    this.scene.events.emit('player-slam', event);

    // Safety: end the slam even if we never land (shouldn't happen)
    this.scene.time.delayedCall(1500, () => {
      if (this.slamHitbox === hitbox) this.endSlam();
    });
  }

  private landSlam() {
    this.scene.events.emit('player-slam-land', { x: this.x, y: this.y + 24 });
    this.endSlam();
  }

  private endSlam() {
    if (this.slamHitbox) {
      this.slamHitbox.destroy();
      this.slamHitbox = null;
    }
  }

  // Bounce off an enemy hit by the slam — refunds the double jump for chaining.
  pogoBounce() {
    this.setVelocityY(PLAYER.slamPogoVelocity);
    this.jumpsLeft = Math.max(this.jumpsLeft, 1);
    this.endSlam();
  }

  // NOTE: any future out-of-bounds kill volume (pits, crushers) must route
  // through takeDamage — never call die() directly, or shields/potions/Extra
  // Lives in the resolveDamage pipeline won't fire.
  takeDamage(amount: number, fromX: number) {
    if (this.dying) return;
    const gs = this.gameState;
    const { state, outcome } = resolveDamage(
      {
        health: gs.health,
        maxHealth: gs.maxHealth,
        potions: gs.potions,
        shieldHits: gs.shieldHits,
        lives: gs.lives,
      },
      amount,
      this.isInvulnerable
    );
    if (outcome === 'ignored') return; // i-frames/dash: no knockback, no sound

    gs.health = state.health;
    gs.potions = state.potions;
    gs.shieldHits = state.shieldHits;
    gs.lives = state.lives;
    const spentConsumable =
      outcome === 'absorbed' || outcome === 'potioned' || outcome === 'revived';
    if (spentConsumable) gs.save();

    if (outcome === 'revived') {
      SynthAudio.hurt();
      this.revive();
      return;
    }

    this.invulnUntil = this.scene.time.now + PLAYER.hurtInvulnMs;
    if (outcome === 'absorbed') {
      SynthAudio.shield();
      flashSprite(this, 0xffd700); // shield gold — no health (red) flash
    } else {
      SynthAudio.hurt();
      flashSprite(this, 0xff4444);
    }

    const dir = this.x < fromX ? -1 : 1;
    this.setVelocity(dir * PLAYER.contactKnockback, -180);

    // Invulnerability blink
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 90,
      yoyo: true,
      repeat: Math.floor(PLAYER.hurtInvulnMs / 180),
      onComplete: () => this.setAlpha(1),
    });

    if (outcome === 'potioned') {
      floatText(this.scene, this.x, this.y - 50, 'POTION!', '#ff6688', 14);
    }

    if (outcome === 'dead') {
      this.die();
    }
  }

  // Extra Life consumed: resolveDamage already restored health — reset the body
  // and return to the last safe ground with a grace period.
  revive() {
    if (this.dying) return;
    this.attacking = false;
    this.anims.timeScale = 1;
    this.endSlam();
    if (this.dashing) {
      this.dashing = false;
      (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
      this.setDragX(PLAYER.drag);
      this.setMaxVelocity(PLAYER.maxRun, 900);
      this.dashTrailEvent?.remove();
      this.dashTrailEvent = null;
    }
    this.setAccelerationX(0);
    this.setVelocity(0, 0);
    this.setAlpha(1);
    // Clamp to the CURRENT physics bounds — the boss arena may have shrunk the
    // world since the player last stood on the ground.
    const b = this.scene.physics.world.bounds;
    const x = Phaser.Math.Clamp(this.lastGroundedPos.x, b.x + 30, b.right - 30);
    this.setPosition(x, this.lastGroundedPos.y);
    this.invulnUntil = this.scene.time.now + SHOP.reviveInvulnMs;
    flashSprite(this, 0xffd700);
    this.scene.events.emit('player-revived');
  }

  private die() {
    this.dying = true;
    this.attacking = false;
    this.anims.timeScale = 1;
    this.endSlam();
    this.dashTrailEvent?.remove();
    this.setAccelerationX(0);
    this.setVelocityX(0);
    this.setAlpha(1);
    this.play(PlayerAnims.DEATH.key, true);
    this.once(`animationcomplete-${PlayerAnims.DEATH.key}`, () => {
      this.scene.events.emit('player-died');
    });
  }

  override destroy(fromScene?: boolean) {
    this.swordOverlay?.destroy();
    if (this.lamp && this.scene) this.scene.lights.removeLight(this.lamp);
    super.destroy(fromScene);
  }
}
