import Phaser from 'phaser';
import { Assets, LakeAnims } from '../assets';
import { FISH } from '../config';
import { flashSprite, floatText, lit } from '../fx/Effects';
import { Hittable } from './Hittable';

// Zombie Fish: a small, no-gravity pack darter. It wanders near its school
// anchor until the player enters aggro range, then darts straight at the player
// at FISH.dartSpeed, re-aiming every FISH.reaimMs. Sword-killable and dealing
// contact damage — both routed through BaseLevelScene's shared Hittable combat
// plumbing (same reward path as a zombie: coins + kill streak).
export class Fish extends Phaser.Physics.Arcade.Sprite implements Hittable {
  private health = FISH.hp;
  private dying = false;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private readonly anchorX: number;
  private readonly anchorY: number;
  private nextAimAt = 0;
  private wanderUntil = 0;
  private aggroing = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, Assets.FISH_SHEET, 0);
    this.anchorX = x;
    this.anchorY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    lit(this);
    this.setDepth(5);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    // 20×12 hittable body centered inside the 24×16 frame.
    body.setSize(20, 12);
    body.setOffset(2, 2);
    this.setCollideWorldBounds(true);

    this.play(LakeAnims.FISH_SWIM);
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  get contactDamage(): number {
    return FISH.contactDamage;
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  takeHit(amount: number): boolean {
    if (this.dying) return false;
    this.health -= amount;
    flashSprite(this, 0xffffff);
    floatText(this.scene, this.x, this.y - 16, `${amount}`, '#ffdd55');
    return this.isDead();
  }

  die() {
    if (this.dying) return;
    this.dying = true;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.setVelocity(0, 0);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 260,
      onComplete: () => this.destroy(),
    });
  }

  update(time: number) {
    if (this.dying || !this.body || !this.active) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    const dist = this.target
      ? Phaser.Math.Distance.BetweenPoints(this, this.target)
      : Number.POSITIVE_INFINITY;

    const aggro = !!this.target && dist < FISH.aggroRange;
    if (aggro) {
      // Dart: re-aim a straight-line burst at the player on a fixed cadence.
      if (time >= this.nextAimAt) {
        this.nextAimAt = time + FISH.reaimMs;
        const ang = Math.atan2(this.target!.y - this.y, this.target!.x - this.x);
        this.setVelocity(Math.cos(ang) * FISH.dartSpeed, Math.sin(ang) * FISH.dartSpeed);
      }
    } else {
      // On the aggro→wander falling edge, re-evaluate this frame so the fish sheds
      // its 200px/s dart velocity immediately instead of coasting until wanderUntil.
      if (this.aggroing) this.wanderUntil = 0;
      if (time >= this.wanderUntil) {
        // Wander near the school anchor: drift randomly while close, head back when far.
        this.wanderUntil = time + Phaser.Math.Between(FISH.wanderMinMs, FISH.wanderMaxMs);
        const anchorDist = Phaser.Math.Distance.Between(this.x, this.y, this.anchorX, this.anchorY);
        const ang =
          anchorDist > FISH.schoolRadius
            ? Math.atan2(this.anchorY - this.y, this.anchorX - this.x)
            : Math.random() * Math.PI * 2;
        this.setVelocity(Math.cos(ang) * FISH.wanderSpeed, Math.sin(ang) * FISH.wanderSpeed);
      }
    }
    this.aggroing = aggro;

    if (Math.abs(body.velocity.x) > 1) this.setFlipX(body.velocity.x < 0);
  }
}
