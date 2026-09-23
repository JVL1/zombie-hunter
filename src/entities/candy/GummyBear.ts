import Phaser from 'phaser';
import { Assets } from '../../assets';
import { CANDY } from '../../config';
import { flashSprite, floatText, lit } from '../../fx/Effects';
import type { Hittable } from '../Hittable';

const FRAME_STAND = 0;
const FRAME_SQUASH = 1;
const FRAME_STRETCH = 2;
const CUB_SPAWN_GRACE_MS = 400; // the swing that split the parent can't pop the cubs

// Gummy Bear Zombie (Wes's pick). Squishy and bouncy: it hops at the player.
// When a full-size bear dies it emits 'gummy-split' and the scene spawns two
// small cubs. Cubs die for good (they never split).
export class GummyBear extends Phaser.Physics.Arcade.Sprite implements Hittable {
  readonly isCub: boolean;
  private health: number;
  private dying = false;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private nextHopAt = 0;
  private wasGrounded = true;
  private squashUntil = 0;
  private readonly graceUntil: number;

  constructor(scene: Phaser.Scene, x: number, y: number, isCub = false) {
    super(scene, x, y, Assets.GUMMY_SHEET, FRAME_STAND);
    this.isCub = isCub;
    this.health = isCub ? CANDY.gummy.cubHp : CANDY.gummy.hp;
    this.graceUntil = isCub ? scene.time.now + CUB_SPAWN_GRACE_MS : 0;
    this.nextHopAt = scene.time.now + Phaser.Math.Between(200, 700);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    lit(this);
    this.setDepth(5);
    if (isCub) this.setScale(CANDY.gummy.cubScale);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // Feet on the frame bottom (40x40 frame).
    body.setSize(CANDY.gummy.bodyW, CANDY.gummy.bodyH);
    body.setOffset((40 - CANDY.gummy.bodyW) / 2, 40 - CANDY.gummy.bodyH);
    body.setDragX(500);
    this.setCollideWorldBounds(true);
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  get contactDamage(): number {
    return this.isCub ? CANDY.gummy.cubContactDamage : CANDY.gummy.contactDamage;
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  takeHit(amount: number): boolean {
    if (this.dying || this.scene.time.now < this.graceUntil) return false;
    this.health -= amount;
    flashSprite(this, 0xffffff);
    floatText(this.scene, this.x, this.y - 20, `${amount}`, '#ffdd55');
    return this.isDead();
  }

  die() {
    if (this.dying) return;
    this.dying = true;
    if (!this.isCub) {
      // Wes: hit a gummy bear and it splits into two little gummy bears!
      this.scene.events.emit('gummy-split', { x: this.x, y: this.y });
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.setFrame(FRAME_SQUASH);
    this.scene.tweens.add({
      targets: this,
      scaleY: this.scaleY * 0.2,
      scaleX: this.scaleX * 1.4,
      alpha: 0,
      duration: 280,
      onComplete: () => this.destroy(),
    });
  }

  update(time: number) {
    if (this.dying || !this.body || !this.active) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down;

    // Landing squash
    if (grounded && !this.wasGrounded) {
      this.squashUntil = time + 120;
      body.setVelocityX(0);
    }
    this.wasGrounded = grounded;

    if (!grounded) {
      this.setFrame(FRAME_STRETCH);
      return;
    }
    this.setFrame(time < this.squashUntil ? FRAME_SQUASH : FRAME_STAND);

    if (!this.target || time < this.nextHopAt) return;
    const dx = this.target.x - this.x;
    if (Math.abs(dx) > CANDY.gummy.aggroRange) return;

    // Hop at the player. Cubs hop faster (tiny and frantic).
    this.nextHopAt =
      time + (this.isCub ? CANDY.gummy.cubHopIntervalMs : CANDY.gummy.hopIntervalMs);
    const dir = Math.sign(dx) || 1;
    body.setVelocity(dir * CANDY.gummy.hopSpeed, CANDY.gummy.hopVelocity * (this.isCub ? 0.8 : 1));
    this.setFrame(FRAME_STRETCH);
  }
}
