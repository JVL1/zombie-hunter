import Phaser from 'phaser';
import { Assets, CandyAnims } from '../../assets';
import { CANDY } from '../../config';
import { flashSprite, floatText, lit } from '../../fx/Effects';
import type { Hittable } from '../Hittable';

type ChocoState = 'walk' | 'melt' | 'puddle' | 'reform';

const FRAME_MELTING = 2;
const FRAME_PUDDLE = 3;
const CHASE_RANGE = 380;

// Chocolate Zombie (Wes's pick). Sneaky: when you get close it melts into a
// puddle, slides under you, and pops back up BEHIND you. A puddle can't be hit
// and can't hurt you — the baked puddle frame (two eyes peeking out of the
// goo) is the Canvas-safe cue that it is on the move.
export class Chocolate extends Phaser.Physics.Arcade.Sprite implements Hittable {
  private health = CANDY.chocolate.hp;
  private dying = false;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private mode: ChocoState = 'walk';
  private modeUntil = 0;
  private nextMeltAt = 0;
  private puddleTargetX = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, Assets.CHOCO_SHEET, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    lit(this);
    this.setDepth(5);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(CANDY.chocolate.bodyW, CANDY.chocolate.bodyH);
    body.setOffset((40 - CANDY.chocolate.bodyW) / 2, 60 - CANDY.chocolate.bodyH);
    this.setCollideWorldBounds(true);
    this.play(CandyAnims.CHOCO_WALK);
    this.nextMeltAt = scene.time.now + 800;
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  get contactDamage(): number {
    return CANDY.chocolate.contactDamage;
  }

  get untouchable(): boolean {
    return this.mode === 'puddle';
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  takeHit(amount: number): boolean {
    if (this.dying || this.untouchable) return false;
    this.health -= amount;
    flashSprite(this, 0xffffff);
    floatText(this.scene, this.x, this.y - 30, `${amount}`, '#ffdd55');
    return this.isDead();
  }

  die() {
    if (this.dying) return;
    this.dying = true;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setVelocity(0, 0);
    this.anims.stop();
    this.setFrame(FRAME_PUDDLE); // melts away for good
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 500,
      onComplete: () => this.destroy(),
    });
  }

  update(time: number) {
    if (this.dying || !this.body || !this.active) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const target = this.target;

    switch (this.mode) {
      case 'walk': {
        if (!target) break;
        const dx = target.x - this.x;
        const dist = Math.abs(dx);
        body.setVelocityX(dist < CHASE_RANGE && dist > 6 ? Math.sign(dx) * CANDY.chocolate.walkSpeed : 0);
        if (dist < CANDY.chocolate.meltRange && time >= this.nextMeltAt && body.blocked.down) {
          // Aim for a spot on the far side of the player.
          this.puddleTargetX = target.x + (Math.sign(dx) || 1) * CANDY.chocolate.reformBehindPx;
          this.startMode('melt', time, CANDY.chocolate.meltMs);
          body.setVelocityX(0);
          this.anims.stop();
          this.setFrame(FRAME_MELTING);
        }
        break;
      }
      case 'melt':
        if (time >= this.modeUntil) {
          this.startMode('puddle', time, CANDY.chocolate.puddleMaxMs);
          this.setFrame(FRAME_PUDDLE);
        }
        break;
      case 'puddle': {
        const dx = this.puddleTargetX - this.x;
        const blocked = body.blocked.left || body.blocked.right;
        if (Math.abs(dx) < 8 || blocked || time >= this.modeUntil) {
          body.setVelocityX(0);
          this.startMode('reform', time, CANDY.chocolate.meltMs);
          this.setFrame(FRAME_MELTING);
        } else {
          body.setVelocityX(Math.sign(dx) * CANDY.chocolate.puddleSpeed);
        }
        break;
      }
      case 'reform':
        if (time >= this.modeUntil) {
          this.mode = 'walk';
          this.nextMeltAt = time + CANDY.chocolate.meltCooldownMs;
          this.play(CandyAnims.CHOCO_WALK);
        }
        break;
    }
  }

  private startMode(mode: ChocoState, time: number, ms: number) {
    this.mode = mode;
    this.modeUntil = time + ms;
  }
}
