import Phaser from 'phaser';
import { Assets } from '../../assets';
import { CANDY } from '../../config';
import { SynthAudio } from '../../core/SynthAudio';
import { dustPuff, flashSprite, floatText, lit } from '../../fx/Effects';
import type { Hittable } from '../Hittable';

type GumballState = 'patrol' | 'shake' | 'roll' | 'rest';

const FRAME_A = 0;
const FRAME_B = 1;
const FRAME_ANGRY = 2;
const RADIUS = 16;
const PATROL_LEG_MS = 1800;

// Gumball Zombie (Wes's pick). A round zombie that rolls at you like a bowling
// ball. It wobbles angrily first (the warning), rolls fast in a straight line,
// bounces off walls, and stops after a set distance. When it dies, the scene
// drops a sour candy for the Gummy Worm King fight.
export class Gumball extends Phaser.Physics.Arcade.Sprite implements Hittable {
  private health = CANDY.gumball.hp;
  private dying = false;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private mode: GumballState = 'patrol';
  private modeUntil = 0;
  private rollDir = 1;
  private rolled = 0;
  private patrolDir = 1;
  private lastX: number;
  private readonly baseX: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, Assets.GUMBALL_SHEET, FRAME_A);
    this.baseX = x;
    this.lastX = x;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    lit(this);
    this.setDepth(5);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(RADIUS, 2, 2); // 36x36 frame
    this.setCollideWorldBounds(true);
    this.modeUntil = scene.time.now + PATROL_LEG_MS;
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  get contactDamage(): number {
    return CANDY.gumball.contactDamage;
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  takeHit(amount: number): boolean {
    if (this.dying) return false;
    this.health -= amount;
    flashSprite(this, 0xffffff);
    floatText(this.scene, this.x, this.y - 22, `${amount}`, '#ffdd55');
    return this.isDead();
  }

  die() {
    if (this.dying) return;
    this.dying = true;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setVelocity(0, 0);
    this.scene.tweens.add({
      targets: this,
      scale: 1.5,
      alpha: 0,
      duration: 220,
      onComplete: () => this.destroy(),
    });
  }

  update(time: number) {
    if (this.dying || !this.body || !this.active) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.mode) {
      case 'patrol': {
        // Slow lazy roll back and forth around its spawn point.
        body.setVelocityX(this.patrolDir * CANDY.gumball.patrolSpeed);
        if (time >= this.modeUntil || body.blocked.left || body.blocked.right) {
          this.patrolDir = this.x > this.baseX ? -1 : 1;
          this.modeUntil = time + PATROL_LEG_MS;
        }
        this.setFrame(Math.floor(time / 300) % 2 === 0 ? FRAME_A : FRAME_B);
        if (this.target && body.blocked.down) {
          const dx = this.target.x - this.x;
          if (Math.abs(dx) < CANDY.gumball.aggroRange && Math.abs(this.target.y - this.y) < 120) {
            this.mode = 'shake';
            this.modeUntil = time + CANDY.gumball.shakeMs;
            this.rollDir = Math.sign(dx) || 1;
            body.setVelocityX(0);
          }
        }
        break;
      }
      case 'shake':
        // The warning: an angry wobble in place.
        this.setFrame(FRAME_ANGRY);
        this.setRotation(Math.sin(time * 0.06) * 0.25);
        if (time >= this.modeUntil) {
          this.mode = 'roll';
          this.rolled = 0;
          SynthAudio.groan(1.6);
          dustPuff(this.scene, this.x, this.y + RADIUS, 6);
        }
        break;
      case 'roll': {
        body.setVelocityX(this.rollDir * CANDY.gumball.rollSpeed);
        // Measure the distance really moved: scene updates and physics steps
        // do not run 1:1, so speed × delta over-counts.
        this.rolled += Math.abs(this.x - this.lastX);
        if ((this.rollDir < 0 && body.blocked.left) || (this.rollDir > 0 && body.blocked.right)) {
          // Bonk! Bounce off the wall and keep rolling the other way.
          this.rollDir = -this.rollDir;
          dustPuff(this.scene, this.x + this.rollDir * -RADIUS, this.y, 5);
        }
        if (this.rolled >= CANDY.gumball.rollDistance) {
          this.mode = 'rest';
          this.modeUntil = time + CANDY.gumball.rollCooldownMs;
          body.setVelocityX(0);
        }
        this.setFrame(FRAME_ANGRY);
        break;
      }
      case 'rest':
        body.setVelocityX(0);
        this.setFrame(FRAME_A);
        if (time >= this.modeUntil) {
          this.mode = 'patrol';
          this.modeUntil = time + PATROL_LEG_MS;
        }
        break;
    }

    // Roll the ball: rotation follows the ground actually covered (not while
    // shaking).
    if (this.mode !== 'shake') {
      this.rotation += (this.x - this.lastX) / RADIUS;
    }
    this.lastX = this.x;
  }
}
