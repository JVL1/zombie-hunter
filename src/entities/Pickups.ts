import Phaser from 'phaser';
import { Assets, OrbTextures } from '../assets';
import { POWERUPS, PowerUpType, WATER } from '../config';
import { GameState } from '../core/GameState';
import { SynthAudio } from '../core/SynthAudio';
import { floatText, lit } from '../fx/Effects';

export type PickupKind = 'coin' | 'heart' | 'key' | 'orb' | 'scuba';

// Coins/hearts/keys/orbs/scuba gear dropped into the world. Coins magnet to the
// player when close; scuba (Level 4) is a static, buoyant air-tank pickup.
export class Pickup extends Phaser.Physics.Arcade.Sprite {
  kind: PickupKind;
  powerUp?: PowerUpType;
  private magnetRange: number;
  private floatTween?: Phaser.Tweens.Tween;
  private buoyant = false;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: Exclude<PickupKind, 'orb'>);
  constructor(scene: Phaser.Scene, x: number, y: number, kind: 'orb', powerUp: PowerUpType);
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: PickupKind,
    powerUp?: PowerUpType
  ) {
    const tex =
      kind === 'coin'
        ? Assets.COIN
        : kind === 'heart'
          ? Assets.HEART
          : kind === 'key'
            ? Assets.KEY
            : kind === 'scuba'
              ? Assets.SCUBA_PICKUP
              : OrbTextures[powerUp!];
    super(scene, x, y, tex);
    this.kind = kind;
    this.powerUp = powerUp;
    this.magnetRange = kind === 'coin' ? 80 : 0;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    lit(this);
    this.setDepth(4);
    this.setCollideWorldBounds(true);
    if (kind === 'scuba') {
      // Static air tank: no launch pop, no bounce, no sink. The scene calls
      // floatInWater() on it (it spawns below the surface) for the gentle bob.
      (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      this.setVelocity(0, 0);
    } else {
      this.setBounce(0.5);
      this.setVelocity((Math.random() - 0.5) * 120, -180);
    }

    if (kind === 'coin') {
      // Fake spin
      scene.tweens.add({
        targets: this,
        scaleX: 0.25,
        duration: 280,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      // Glow pulse for hearts, keys, and power orbs
      scene.tweens.add({
        targets: this,
        scale: 1.15,
        duration: 450,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    if (
      (kind === 'key' || kind === 'orb' || kind === 'scuba') &&
      scene.sys.renderer.type === Phaser.WEBGL
    ) {
      const color = kind === 'orb' && powerUp ? POWERUPS[powerUp].color : 0xffdd66;
      const light = scene.lights.addLight(x, y, 140, color, 1.2);
      const follow = () => {
        if (this.active) light.setPosition(this.x, this.y);
      };
      scene.events.on('update', follow);
      this.once('destroy', () => {
        scene.events.off('update', follow);
        scene.lights.removeLight(light);
      });
    }
  }

  magnetize() {
    this.magnetRange = Number.POSITIVE_INFINITY;
  }

  // Water levels: keep a pickup spawned below the surface from sinking out of
  // reach. Dynamic bodies overwrite a direct y-tween each physics step, so the
  // gentle bob oscillates the body's velocity instead — a symmetric sine yoyo
  // whose integral over a full cycle is zero, so the pickup never drifts away.
  floatInWater() {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    this.buoyant = true;
    body.setAllowGravity(false);
    this.setBounce(0);
    this.startBob();
    this.once('destroy', () => {
      this.floatTween?.stop();
      this.floatTween = undefined;
    });
  }

  // Gentle in-place bob: oscillate the body's velocity on a symmetric sine yoyo
  // (a direct y-tween is clobbered by the dynamic body each step). Zero net drift.
  // Re-callable — the magnet stops the bob while homing; if the player then leaves
  // range before collecting, we restart it so the pickup never drifts off.
  private startBob() {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    this.setVelocity(0, 0);
    this.floatTween?.stop();
    this.floatTween = this.scene.tweens.add({
      targets: body.velocity,
      y: { from: -WATER.buoyancyVelocity, to: WATER.buoyancyVelocity },
      duration: WATER.buoyancyPeriodMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  updateMagnet(player: Phaser.Physics.Arcade.Sprite) {
    if (!this.active || this.magnetRange === 0 || !this.body) return;
    const dist = Phaser.Math.Distance.BetweenPoints(this, player);
    if (dist < this.magnetRange) {
      // The bob tween would fight the magnet's velocity — stop it once we start
      // homing (matters for underwater orbs that magnetize on the boss trigger).
      if (this.floatTween) {
        this.floatTween.stop();
        this.floatTween = undefined;
      }
      const angle = Phaser.Math.Angle.BetweenPoints(this, player);
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      this.setVelocity(Math.cos(angle) * 320, Math.sin(angle) * 320);
    } else if (this.buoyant && !this.floatTween) {
      // Homed toward the player but they left before collecting — the retained
      // 320px/s velocity (gravity off) would carry this pickup off underwater.
      // Re-settle it in place and resume the bob so it stays reachable.
      this.startBob();
    }
  }

  // Returns true when the pickup was consumed (key handled by caller).
  collect(player: Phaser.Physics.Arcade.Sprite): boolean {
    const gs = GameState.getInstance();
    switch (this.kind) {
      case 'coin':
        gs.coins += 5;
        gs.save();
        SynthAudio.coin();
        floatText(this.scene, this.x, this.y - 10, '+5', '#ffd700', 12);
        break;
      case 'heart':
        gs.heal(15);
        SynthAudio.heart();
        floatText(this.scene, player.x, player.y - 40, '+15 HP', '#ff6688', 13);
        break;
      case 'key':
        SynthAudio.key();
        break;
      case 'scuba':
        // No self-contained effect: the scene grants scuba air + plays the SFX.
        break;
      case 'orb':
        if (this.powerUp) {
          gs.grantBuff(this.powerUp, this.scene.time.now);
          SynthAudio.key();
          floatText(
            this.scene,
            this.x,
            this.y - 10,
            `${POWERUPS[this.powerUp].name}!`,
            `#${POWERUPS[this.powerUp].color.toString(16).padStart(6, '0')}`,
            14
          );
        }
        break;
    }
    this.destroy();
    return true;
  }
}
