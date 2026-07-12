import Phaser from 'phaser';
import { Assets, LakeAnims } from '../assets';
import { EEL, ZOMBIE } from '../config';
import { flashSprite, floatText, lit } from '../fx/Effects';
import { Hittable } from './Hittable';

enum EelState {
  IDLE,
  TELEGRAPH,
  LUNGE,
  RETURN,
}

// Zombie Eel: an anchored wreck ambusher. It coils at its anchor until the
// player enters aggro range, telegraphs (reusing the ZOMBIE lunge windup timing
// so its tell reads like a land zombie's crouch-flash), lunges EEL.lungeDistance
// along the player vector, then swims back to the anchor to re-coil. Sword-
// killable and dealing contact damage — routed through the shared Hittable
// combat plumbing (coins + kill streak, same as a zombie).
export class Eel extends Phaser.Physics.Arcade.Sprite implements Hittable {
  private health = EEL.hp;
  private dying = false;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private readonly anchorX: number;
  private readonly anchorY: number;
  private eelState = EelState.IDLE;
  private eelStateUntil = 0;
  private nextLungeAt = 0;
  private lungeTargetX = 0;
  private lungeTargetY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, Assets.EEL_SHEET, 0);
    this.anchorX = x;
    this.anchorY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    lit(this);
    this.setDepth(5);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    // Hittable body inside the 48×32 frame; leaves the drawn tail slack out.
    body.setSize(40, 20);
    body.setOffset(4, 6);

    this.play(LakeAnims.EEL_COIL);
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  get contactDamage(): number {
    return EEL.contactDamage;
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  takeHit(amount: number): boolean {
    if (this.dying) return false;
    this.health -= amount;
    flashSprite(this, 0xffffff);
    floatText(this.scene, this.x, this.y - 24, `${amount}`, '#ffdd55');
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
      duration: 320,
      onComplete: () => this.destroy(),
    });
  }

  update(time: number) {
    if (this.dying || !this.body || !this.active) return;

    switch (this.eelState) {
      case EelState.TELEGRAPH:
        this.setVelocity(0, 0);
        if (time >= this.eelStateUntil) {
          this.eelState = EelState.LUNGE;
          this.eelStateUntil = time + ZOMBIE.lungeMs;
          // Capture the strike vector at the moment the windup ends so it stays
          // dodgeable — commit to a fixed 300px lunge along it.
          const tx = this.target?.x ?? this.x;
          const ty = this.target?.y ?? this.y;
          const ang = Math.atan2(ty - this.y, tx - this.x);
          this.lungeTargetX = this.x + Math.cos(ang) * EEL.lungeDistance;
          this.lungeTargetY = this.y + Math.sin(ang) * EEL.lungeDistance;
          this.setVelocity(Math.cos(ang) * EEL.lungeSpeed, Math.sin(ang) * EEL.lungeSpeed);
          this.setFlipX(tx < this.x);
          this.play(LakeAnims.EEL_LUNGE, true);
        }
        return;
      case EelState.LUNGE: {
        const reached =
          Phaser.Math.Distance.Between(this.x, this.y, this.lungeTargetX, this.lungeTargetY) < 12;
        if (reached || time >= this.eelStateUntil) this.eelState = EelState.RETURN;
        return;
      }
      case EelState.RETURN: {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.anchorX, this.anchorY);
        if (dist < 6) {
          this.setVelocity(0, 0);
          this.setPosition(this.anchorX, this.anchorY);
          this.eelState = EelState.IDLE;
          this.nextLungeAt = time + ZOMBIE.lungeCooldownMs;
          this.play(LakeAnims.EEL_COIL, true);
          return;
        }
        const ang = Math.atan2(this.anchorY - this.y, this.anchorX - this.x);
        this.setVelocity(Math.cos(ang) * EEL.returnSpeed, Math.sin(ang) * EEL.returnSpeed);
        return;
      }
      default:
        break;
    }

    // IDLE — coiled at the anchor; strike when the player enters reach.
    this.setVelocity(0, 0);
    if (!this.target || time < this.nextLungeAt) return;
    const dist = Phaser.Math.Distance.BetweenPoints(this, this.target);
    if (dist < EEL.aggroRange) {
      this.eelState = EelState.TELEGRAPH;
      this.eelStateUntil = time + ZOMBIE.lungeWindupMs;
      this.setFlipX(this.target.x < this.x);
      flashSprite(this, 0xff8866, ZOMBIE.lungeWindupMs - 60);
      this.play(LakeAnims.EEL_TELEGRAPH, true);
    }
  }
}
