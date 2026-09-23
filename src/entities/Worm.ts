import Phaser from 'phaser';
import { Assets } from '../assets';
import { WORLD } from '../config';
import { Juice } from '../core/Juice';
import { SynthAudio } from '../core/SynthAudio';
import {
  createWormState,
  feed,
  hit,
  isContactActive,
  isDead as wormDead,
  isHittable,
  isMouthOpen,
  mouthSegment,
  tick,
  type WormState,
} from '../core/worm';
import { dustPuff, floatText, lit } from '../fx/Effects';
import type { WormBossDef } from '../levels';
import type { BossEncounter } from './BossEncounter';
import type { Player } from './Player';

const FRAME_CLOSED = 0;
const FRAME_OPEN = 1;
const FRAME_CHOMP = 2;
const FRAME_DIZZY = 3;

const SEGMENTS = 7;
const HEAD_REACH = 70; // how far the exposed head leans out toward the player
const CHOMP_LUNGE = 40; // extra lean during a chomp snap
const ARCH_HEIGHT = 190; // how high the body arches above the ground
const HEAD_BODY = 52; // square head hitbox, in frame px (scaled by def.scale)
const STAR_COUNT = 3;

// The scene owns the sour-candy pocket; the King asks through these hooks.
export interface WormCandyHooks {
  // Spend one candy from the player's pocket. False = pocket empty.
  spendCandy(): boolean;
  // A sword hit knocks a candy loose here (the scene applies the cooldown).
  knockLoose(x: number, y: number): void;
}

// THE GUMMY WORM KING — Level 5's boss, designed by Wes (5).
//
// Sprite glue over the pure `src/core/worm.ts` reducer: this Sprite is the
// crowned head, a chain of segment images arches from the dirt mound to the
// head, and a small zone at the mouth is the feed target. Every phase and
// timing decision lives in the pure state.
//
// Implements `BossEncounter`, like the walker Boss and the Kraken. The scene
// must call `setTarget(player)`, `setCandyHooks(...)`, and `setFrozen(bool)`
// around the boss cinematic.
export class Worm extends Phaser.Physics.Arcade.Sprite implements BossEncounter {
  private wormState: WormState;
  private readonly def: WormBossDef;
  private readonly juice: Juice;
  private readonly minX: number;
  private readonly maxX: number;
  private target: Player | null = null;
  private hooks: WormCandyHooks | null = null;

  private readonly segments: Phaser.GameObjects.Image[] = [];
  private readonly stars: Phaser.GameObjects.Image[] = [];
  private readonly mound: Phaser.GameObjects.Image;
  private readonly mouth: Phaser.GameObjects.Zone;
  private headLight: Phaser.GameObjects.Light | null = null;

  private risen = false;
  private frozen = false;
  private defeated = false;
  private enrageApplied = false;
  private faceDir = -1; // which way the head leans (toward the player at the pop)
  private lastDustAt = 0;
  // >= 0 while the rise cinematic plays (time it started); -1 otherwise.
  private introStartedAt = -1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    _y: number,
    juice: Juice,
    def: WormBossDef,
    bounds: { minX: number; maxX: number }
  ) {
    super(scene, x, WORLD.groundY + 80, Assets.WORM_HEAD, FRAME_CLOSED);
    if (def.kind !== 'worm') {
      throw new Error(`Worm expects a worm boss def, got kind='${def.kind}'`);
    }
    this.def = def;
    this.juice = juice;
    this.minX = bounds.minX;
    this.maxX = bounds.maxX;
    this.wormState = createWormState(def, scene.time.now, x, bounds.minX, bounds.maxX);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    lit(this);
    this.setScale(def.scale);
    // Depth 2: behind the ground tiles (3), so he rises OUT of the ground.
    this.setDepth(2.6);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.setImmovable(true);
    body.setSize(HEAD_BODY, HEAD_BODY);
    body.setOffset((80 - HEAD_BODY) / 2, 46 - HEAD_BODY / 2);
    body.enable = false; // dormant until the fight starts
    this.setVisible(false); // only the mound shows until he rises

    for (let i = 0; i < SEGMENTS; i++) {
      const seg = scene.add.image(x, WORLD.groundY + 60, Assets.WORM_SEGMENT, i % 2);
      seg.setDepth(2.5).setVisible(false);
      lit(seg);
      this.segments.push(seg);
    }
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push(scene.add.image(x, 0, Assets.DIZZY_STAR).setDepth(7).setVisible(false));
    }

    // The dirt mound: the King's lair before the fight, and the warning sign
    // of where he will pop up during it. Sits on the ground surface.
    this.mound = scene.add.image(x, WORLD.groundY + 4, Assets.DIRT_MOUND).setOrigin(0.5, 1);
    this.mound.setDepth(3.5);
    lit(this.mound);

    this.mouth = scene.add.zone(x, 0, 44, 36);
    scene.physics.add.existing(this.mouth);
    const mb = this.mouth.body as Phaser.Physics.Arcade.Body;
    mb.setAllowGravity(false);
    mb.enable = false;

    if (scene.sys.renderer.type === Phaser.WEBGL) {
      this.headLight = scene.lights.addLight(x, WORLD.groundY - 80, 260, 0xffb0d0, 0.9);
    }
  }

  setTarget(target: Player) {
    this.target = target;
  }

  setCandyHooks(hooks: WormCandyHooks) {
    this.hooks = hooks;
  }

  setFrozen(frozen: boolean) {
    const wasFrozen = this.frozen;
    this.frozen = frozen;
    // The cinematic ends: he dives back under and the loop begins.
    if (wasFrozen && !frozen && this.risen && !this.defeated) {
      const now = this.scene.time.now;
      this.wormState = {
        ...createWormState(this.def, now, this.wormState.x, this.minX, this.maxX),
        phase: 'dig',
        phaseStartedAt: now,
        phaseEndsAt: now + this.def.digMs,
      };
    }
  }

  // --- BossEncounter interface ---

  get healthRatio(): number {
    return this.wormState.hp / this.wormState.maxHp;
  }

  get contactBodies(): Phaser.Physics.Arcade.Body[] {
    return [this.body as Phaser.Physics.Arcade.Body];
  }

  get contactDamage(): number {
    return this.def.contactDamage;
  }

  get contactDamageActive(): boolean {
    return (
      this.risen &&
      !this.frozen &&
      !this.isDead() &&
      isContactActive(this.wormState, this.def, this.scene.time.now)
    );
  }

  isDead(): boolean {
    return wormDead(this.wormState);
  }

  // Cinematic: the King bursts out of his mound with a roar, mouth wide open.
  triggerRise() {
    if (this.risen) return;
    this.risen = true;
    this.faceDir = this.target && this.target.x > this.wormState.x ? 1 : -1;
    SynthAudio.roar();
    this.juice.shake(0.008, 700);
    dustPuff(this.scene, this.wormState.x, WORLD.groundY - 6, 14);
    this.setFrame(FRAME_OPEN);
    // Rise to the exposed pose over ~0.6s (the render pass reads `introT`).
    this.introStartedAt = this.scene.time.now;
  }

  wireAttackHitbox(
    hitbox: Phaser.GameObjects.Rectangle,
    damage: number,
    isSlam: boolean,
    onHit: (x: number, y: number, died: boolean) => void
  ): void {
    if (!this.risen || this.isDead()) return;
    void isSlam; // the scene applies the pogo + hit-stop

    const collider = this.scene.physics.add.overlap(hitbox, [this.mouth, this], () => {
      if (this.isDead() || this.frozen) return;
      const hitSet = hitbox.getData('hitSet') as Set<unknown>;
      if (hitSet.has(this)) return; // one connect per swing
      const now = this.scene.time.now;

      // FEED first (Wes's idea): a swing on the open mouth with a sour candy
      // in the pocket makes him eat it. The mouth wins over a body hit.
      const onMouth = this.scene.physics.overlap(hitbox, this.mouth);
      if (onMouth && isMouthOpen(this.wormState, this.def, now) && this.hooks?.spendCandy()) {
        hitSet.add(this);
        const res = feed(this.wormState, this.def, now);
        this.wormState = res.state;
        if (res.fed) this.onFed();
        return;
      }

      if (!isHittable(this.wormState)) return;
      hitSet.add(this);
      const wasDizzy = this.wormState.phase === 'dizzy';
      const res = hit(this.wormState, this.def, damage, now);
      this.wormState = res.state;
      if (res.dealt > 0) {
        floatText(this.scene, this.x, this.y - 50, `${res.dealt}`, wasDizzy ? '#ffe24a' : '#ffffff', wasDizzy ? 18 : 12);
      }
      // Not dizzy: the hit knocks a sour candy loose instead (Josh's rule).
      if (!wasDizzy && !this.isDead()) this.hooks?.knockLoose(this.x, this.y - 30);
      onHit(this.x, this.y, this.isDead());
    });
    hitbox.once('destroy', () => collider.destroy());
  }

  update(time: number, delta: number) {
    if (!this.risen || this.defeated) return;

    if (!this.frozen && this.introStartedAt < 0) {
      const { state, effects } = tick(this.wormState, this.def, time, delta, this.target?.x ?? this.x);
      this.wormState = state;
      if (effects.shake) this.onShake();
      if (effects.pop) this.onPop();
      if (effects.chomp) SynthAudio.chomp();
      if (effects.dig) dustPuff(this.scene, this.wormState.x, WORLD.groundY - 6, 8);
      if (effects.summon) {
        this.scene.events.emit('worm-summon', {
          x: this.wormState.x,
          count: this.def.summon.count,
          maxAlive: this.def.summon.maxAlive,
        });
      }
      if (state.enraged && !this.enrageApplied) this.applyEnrage();
    }

    this.render(time);
  }

  // ------------------------------------------------------------------

  private onShake() {
    this.juice.shake(0.003, this.wormState.phaseEndsAt - this.wormState.phaseStartedAt);
    SynthAudio.groan(0.6);
  }

  private onPop() {
    this.faceDir = this.target && this.target.x > this.wormState.x ? 1 : -1;
    SynthAudio.chomp();
    SynthAudio.groan(0.8);
    this.juice.shake(0.007, 250);
    dustPuff(this.scene, this.wormState.x, WORLD.groundY - 6, 12);
  }

  private onFed() {
    SynthAudio.sour();
    this.juice.zoomPunch(0.06, 250);
    floatText(this.scene, this.x, this.y - 70, 'SOURRRR!', '#d8ff3a', 20);
    this.scene.time.delayedCall(350, () => {
      if (!this.defeated) floatText(this.scene, this.x, this.y - 70, 'DIZZY! HIT HIM!', '#ffe24a', 16);
    });
  }

  private applyEnrage() {
    this.enrageApplied = true;
    SynthAudio.roar();
    this.juice.shake(0.008, 500);
    floatText(this.scene, this.x, this.y - 80, 'THE KING IS MAD!', '#ff5a3a', 18);
    this.headLight?.setColor(0xff8a5a);
  }

  // Place the head, the arch of segments, the mound, the mouth zone, and the
  // stars from the pure state. `lift` 0..1 is how far out of the ground he is.
  private render(time: number) {
    const s = this.wormState;
    const now = time;
    let lift = 0;
    let frame = FRAME_CLOSED;
    let lunge = 0;

    if (this.introStartedAt >= 0) {
      // Cinematic rise, then hold the roar until setFrozen(false).
      lift = Math.min(1, (now - this.introStartedAt) / 600);
      frame = FRAME_OPEN;
      if (!this.frozen && lift >= 1) this.introStartedAt = -1;
    } else {
      const p = Phaser.Math.Clamp((now - s.phaseStartedAt) / Math.max(1, s.phaseEndsAt - s.phaseStartedAt), 0, 1);
      switch (s.phase) {
        case 'under':
        case 'shake':
          lift = 0;
          break;
        case 'pop':
          lift = Phaser.Math.Easing.Back.Out(p);
          frame = FRAME_CHOMP;
          break;
        case 'exposed': {
          lift = 1;
          const seg = mouthSegment(s, this.def, now);
          frame = seg === 'open' ? FRAME_OPEN : seg === 'chomp' ? FRAME_CHOMP : FRAME_CLOSED;
          if (seg === 'chomp') lunge = CHOMP_LUNGE;
          break;
        }
        case 'dizzy':
          lift = 0.92;
          frame = FRAME_DIZZY;
          break;
        case 'dig':
          lift = 1 - p;
          break;
        case 'dead':
          lift = 1;
          frame = FRAME_DIZZY;
          break;
      }
    }

    const baseX = s.x;
    const visible = lift > 0.02;
    // Head: arcs up out of the mound, then leans over toward the player so
    // the open mouth sits at sword height (a kid never needs to jump to feed).
    const headRestY = WORLD.groundY - 34 * this.def.scale;
    const sway = Math.sin(now * 0.004) * 6 * lift;
    const hx = baseX + this.faceDir * (HEAD_REACH + lunge) * lift + sway;
    const hy = Phaser.Math.Linear(WORLD.groundY + 70, headRestY, lift) + (lunge ? 6 : 0);
    this.setPosition(hx, hy);
    this.setFrame(frame);
    this.setFlipX(this.faceDir > 0);
    this.setVisible(visible);
    this.setRotation(s.phase === 'dizzy' ? Math.sin(now * 0.012) * 0.18 : 0);

    // Segment arch from the mound (t=0) to just behind the head (t=1).
    const peakY = WORLD.groundY - ARCH_HEIGHT * lift;
    for (let i = 0; i < this.segments.length; i++) {
      const t = (i + 1) / (this.segments.length + 1);
      const sx = Phaser.Math.Linear(baseX, hx, t);
      // A parabola through ground (t=0), the peak (t≈0.45), and the head (t=1).
      const arc = 4 * t * (1 - t);
      const sy = Phaser.Math.Linear(WORLD.groundY + 10, hy - 20, t) - arc * (WORLD.groundY - peakY) * 0.9;
      const seg = this.segments[i];
      seg.setPosition(sx + Math.sin(now * 0.005 + i) * 3 * lift, sy);
      seg.setScale(this.def.scale * (1.05 - t * 0.25));
      seg.setVisible(visible);
    }

    // Mound shows where he lurks; it jitters during the shake warning.
    const shaking = s.phase === 'shake' && this.introStartedAt < 0;
    this.mound.setPosition(baseX + (shaking ? Phaser.Math.Between(-3, 3) : 0), WORLD.groundY + 4);
    this.mound.setScale(shaking ? 1.15 : 1, shaking ? 1.1 + Math.sin(now * 0.05) * 0.1 : 1);
    if (shaking && now - this.lastDustAt > 160) {
      this.lastDustAt = now;
      dustPuff(this.scene, baseX + Phaser.Math.Between(-30, 30), WORLD.groundY - 4, 3);
    }

    // Bodies follow the head. The mouth zone sits on the lower face.
    const body = this.body as Phaser.Physics.Arcade.Body;
    const up = visible && lift > 0.5 && !this.isDead();
    body.enable = up;
    const mb = this.mouth.body as Phaser.Physics.Arcade.Body;
    mb.enable = up;
    this.mouth.setPosition(hx, hy + 12 * this.def.scale);

    // Dizzy stars orbit the crown.
    const dizzy = s.phase === 'dizzy' && this.introStartedAt < 0;
    this.stars.forEach((star, i) => {
      const a = now * 0.006 + (i * Math.PI * 2) / STAR_COUNT;
      star.setVisible(dizzy);
      star.setPosition(hx + Math.cos(a) * 34, hy - 52 + Math.sin(a) * 10);
    });

    if (this.headLight) this.headLight.setPosition(hx, hy);
  }

  // Wiggle-and-flop death. Returns the key-drop spot above the body.
  playDeath(): { x: number; y: number } {
    this.defeated = true;
    this.stars.forEach((s) => s.setVisible(false));
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    (this.mouth.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setFrame(FRAME_DIZZY);
    const spot = { x: this.x, y: WORLD.groundY - 140 };

    SynthAudio.roar();
    this.scene.tweens.add({
      targets: this,
      rotation: this.faceDir * 1.4,
      y: WORLD.groundY - 20,
      duration: 700,
      ease: 'Bounce.easeOut',
    });
    this.scene.tweens.add({
      targets: [this, ...this.segments, this.mound],
      alpha: 0,
      delay: 900,
      duration: 900,
      onComplete: () => this.destroy(),
    });
    return spot;
  }

  override destroy(fromScene?: boolean) {
    if (this.scene) {
      this.scene.tweens.killTweensOf([this, ...this.segments, this.mound]);
      if (this.headLight) this.scene.lights.removeLight(this.headLight);
    }
    this.headLight = null;
    this.segments.forEach((s) => s.destroy());
    this.segments.length = 0;
    this.stars.forEach((s) => s.destroy());
    this.stars.length = 0;
    this.mound?.destroy();
    this.mouth?.destroy();
    super.destroy(fromScene);
  }
}
