import Phaser from 'phaser';
import { Assets, LakeAnims } from '../assets';
import { Juice } from '../core/Juice';
import { SynthAudio } from '../core/SynthAudio';
import {
  createKrakenState,
  hitHead,
  hitTentacle,
  isDead as krakenDead,
  tick,
  type KrakenState,
} from '../core/kraken';
import { lit } from '../fx/Effects';
import type { KrakenBossDef } from '../levels';
import type { BossEncounter } from './BossEncounter';
import type { Player } from './Player';

const BUBBLE_TTL_MS = 4000;
const BUBBLE_MAX = 12;
const SPREAD_RAD = Phaser.Math.DegToRad(20);
const TENTACLE_RADIUS = 96; // px from head center to a guard tentacle's anchor
const GUARD_PUSH = 20; // extra px the active guard leans toward the player
const HEAD_BODY = 60; // square head hitbox side, in source pixels (scaled by def.scale)

// THE SUNKEN BEAST — Level 4's multi-body kraken boss (Henry's Sunken Beast).
//
// Sprite glue over the pure `src/core/kraken.ts` reducer: the head is this
// Sprite, the guard tentacles are child physics sprites, and every phase / timing
// decision lives in the pure state. Each frame `update` calls the reducer's
// `tick`, stores the returned state, and reacts to `effects.fireBubble`.
//
// Implements the same `BossEncounter` seam the walker `Boss` does so
// BaseLevelScene never type-guards on the concrete class. Two hooks the scene
// (Task 15) must wire beyond construction: `setTarget(player)` (aim + bubble
// contact) and `setFrozen(bool)` (freeze bubbles + stop firing during the boss
// cinematic — the walker has no projectiles so the scene never needed this).
export class Kraken extends Phaser.Physics.Arcade.Sprite implements BossEncounter {
  private krakenState: KrakenState;
  private readonly def: KrakenBossDef;
  private readonly juice: Juice;
  private target: Player | null = null;

  private readonly tentacles: Phaser.Physics.Arcade.Sprite[] = [];
  // Fixed guard anchors around the head, one per core tentacle (1:1).
  private readonly anchors: { angle: number; dx: number; dy: number }[] = [];
  private bodiesCache: Phaser.Physics.Arcade.Body[] = [];

  private bubbles: Phaser.Physics.Arcade.Group;
  private bubbleOverlap: Phaser.Physics.Arcade.Collider | null = null;
  private headLight: Phaser.GameObjects.Light | null = null;

  private risen = false; // dormancy: no ticking / no contact until triggerRise
  private frozen = false; // cinematic freeze for bubbles (scene-driven)
  private enrageApplied = false;
  private defeated = false;

  constructor(scene: Phaser.Scene, x: number, y: number, juice: Juice, def: KrakenBossDef) {
    super(scene, x, y, Assets.KRAKEN_HEAD, 0);
    if (def.kind !== 'kraken') {
      throw new Error(`Kraken expects a kraken boss def, got kind='${def.kind}'`);
    }
    this.def = def;
    this.juice = juice;
    this.krakenState = createKrakenState(def, scene.time.now);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    lit(this);

    this.setScale(def.scale);
    this.setDepth(6);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.setImmovable(true);
    // Centered square head hitbox on the 96x96 frame (scales with def.scale).
    this.body!.setSize(HEAD_BODY, HEAD_BODY);
    this.body!.setOffset((96 - HEAD_BODY) / 2, (96 - HEAD_BODY) / 2);
    body.enable = false; // dormant: no contact until risen

    this.play(LakeAnims.KRAKEN_IDLE);

    // Build one guard tentacle per core tentacle, fanned across the front
    // (player-facing) arc. They map 1:1 to state.tentacles[i].
    const n = def.tentacles;
    for (let i = 0; i < n; i++) {
      // Fan from 140deg to 220deg (left / up-left / down-left in screen coords).
      const angle = Phaser.Math.DegToRad(n === 1 ? 180 : 140 + (80 * i) / (n - 1));
      const dx = Math.cos(angle) * TENTACLE_RADIUS;
      const dy = Math.sin(angle) * TENTACLE_RADIUS;
      this.anchors.push({ angle, dx, dy });

      const t = scene.physics.add.sprite(x + dx, y + dy, Assets.TENTACLE_SEGMENT, 0);
      t.setDepth(5);
      t.setScale(def.scale * 0.9, def.scale * 2.4); // elongated segment stack
      t.setRotation(angle - Math.PI / 2);
      lit(t);
      const tb = t.body as Phaser.Physics.Arcade.Body;
      tb.setAllowGravity(false);
      t.setImmovable(true);
      tb.enable = false; // dormant until risen
      this.tentacles.push(t);
    }

    // Contact bodies: head FIRST (onBossDefeated reads [0] for the corpse anchor),
    // then every tentacle. The scene wires colliders/overlaps against this array
    // ONCE at creation, so all bodies must exist now; a killed tentacle is
    // represented by disabling its body (not by shrinking the array).
    this.bodiesCache = [this.body as Phaser.Physics.Arcade.Body, ...this.tentacles.map((t) => t.body as Phaser.Physics.Arcade.Body)];

    if (scene.sys.renderer.type === Phaser.WEBGL) {
      this.headLight = scene.lights.addLight(x, y, 320, 0x33ffcc, 0.8);
    }

    this.bubbles = scene.physics.add.group({ allowGravity: false, maxSize: BUBBLE_MAX });
  }

  // Task 15 must call this after construction (mirrors Boss.setTarget). Needed to
  // aim bubbles and to wire bubble->player contact damage.
  setTarget(target: Player) {
    this.target = target;
    // Tear down any prior overlap so a repeat setTarget can't stack colliders
    // (which would double bubble damage) or leak. The collider is stored so
    // destroy() can remove it — symmetric with the attack-hitbox teardown.
    this.bubbleOverlap?.destroy();
    // Single sprite (player) first, group second — Phaser invokes the overlap
    // callback as (sprite, groupMember) regardless of argument order (it swaps a
    // group-first call internally). Passing the group first here made the params
    // arrive reversed, so takeDamage was called on the bubble → runtime crash.
    // This matches every other overlap(single, group, ...) in the codebase.
    this.bubbleOverlap = this.scene.physics.add.overlap(
      target,
      this.bubbles,
      (playerObj, bubbleObj) => {
        if (this.isDead()) return; // a dead kraken's in-flight bubbles stop hurting
        const bubble = bubbleObj as Phaser.Physics.Arcade.Sprite;
        if (!bubble.active) return;
        (playerObj as Player).takeDamage(this.def.bubble.damage, bubble.x, 'projectile');
        this.killBubble(bubble);
      }
    );
  }

  // Task 15 must call setFrozen(true) when the boss cinematic begins and
  // setFrozen(false) when it ends — bubbles freeze in place and firing pauses.
  setFrozen(frozen: boolean) {
    this.frozen = frozen;
    this.bubbles.getChildren().forEach((obj) => {
      const bubble = obj as Phaser.Physics.Arcade.Sprite;
      const body = bubble.body as Phaser.Physics.Arcade.Body | null;
      if (!bubble.active || !body) return;
      if (frozen) {
        body.setVelocity(0, 0);
      } else {
        body.setVelocity(bubble.getData('vx') as number, bubble.getData('vy') as number);
      }
    });
  }

  // --- BossEncounter interface ---

  get healthRatio(): number {
    return this.krakenState.hp / this.krakenState.maxHp;
  }

  get contactBodies(): Phaser.Physics.Arcade.Body[] {
    return this.bodiesCache;
  }

  get contactDamage(): number {
    return this.def.contactDamage;
  }

  get contactDamageActive(): boolean {
    return this.risen && !this.frozen && !this.isDead();
  }

  isDead(): boolean {
    return krakenDead(this.krakenState);
  }

  triggerRise() {
    if (this.risen) return;
    this.risen = true;
    // Reset the reducer's timers to "now" so the bubble cadence starts at the
    // rise, not at dormant construction time.
    this.krakenState = createKrakenState(this.def, this.scene.time.now);

    SynthAudio.roar();
    this.juice.shake(0.007, 600);

    (this.body as Phaser.Physics.Arcade.Body).enable = true;
    this.tentacles.forEach((t) => ((t.body as Phaser.Physics.Arcade.Body).enable = true));

    // Emerge: rise a touch and pulse. No throne, no ground — it surfaces.
    this.scene.tweens.add({
      targets: this,
      y: this.y - 40,
      duration: 900,
      ease: 'Power2',
    });
    this.scene.tweens.add({
      targets: this,
      scaleX: this.def.scale * 1.08,
      scaleY: this.def.scale * 1.08,
      duration: 450,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  wireAttackHitbox(
    hitbox: Phaser.GameObjects.Rectangle,
    damage: number,
    isSlam: boolean,
    onHit: (x: number, y: number, died: boolean) => void
  ): void {
    if (!this.risen || this.isDead()) return;

    // Tentacle-before-head routing with a per-swing single-hit guard: one swing
    // lands on at most ONE target, tentacle priority. `this` in the shared
    // per-swing hitSet is the "a hit already landed this swing" sentinel.
    const targets: Phaser.GameObjects.GameObject[] = [...this.tentacles, this];
    const collider = this.scene.physics.add.overlap(hitbox, targets, (_hb, targetObj) => {
      if (this.isDead()) return;
      const hitSet = hitbox.getData('hitSet') as Set<unknown>;
      if (hitSet.has(this)) return; // already connected this swing
      const now = this.scene.time.now;
      const guardIdx = this.krakenState.activeGuard;
      const target = targetObj as Phaser.GameObjects.Sprite;

      // Active guard tentacle takes the hit.
      if (
        guardIdx !== null &&
        target === this.tentacles[guardIdx] &&
        this.krakenState.tentacles[guardIdx].alive
      ) {
        hitSet.add(this);
        this.krakenState = hitTentacle(this.krakenState, guardIdx, damage, now);
        onHit(target.x, target.y, this.isDead());
        return;
      }

      // Head: only in the open window, and only if the swing isn't also touching
      // the active guard (tentacle wins the tie regardless of callback order).
      // Redundant defense: the core invariant is activeGuard !== null iff
      // phase === 'guarded', so whenever guardIdx !== null the phase gate below
      // already blocks the head. Kept so a future core change can't silently
      // open a head-while-guarded path.
      if (target === this) {
        if (
          guardIdx !== null &&
          this.krakenState.tentacles[guardIdx].alive &&
          this.scene.physics.overlap(hitbox, this.tentacles[guardIdx])
        ) {
          return;
        }
        if (this.krakenState.phase === 'window') {
          hitSet.add(this);
          this.krakenState = hitHead(this.krakenState, damage, now);
          onHit(target.x, target.y, this.isDead());
        }
      }
    });
    // isSlam is applied by the scene (pogo + hit-stop); kept for signature parity.
    void isSlam;
    hitbox.once('destroy', () => collider.destroy());
  }

  update(time: number, delta: number) {
    if (!this.risen || this.defeated) return;

    const { state, effects } = tick(this.krakenState, time);
    this.krakenState = state;

    if (state.enraged && !this.enrageApplied) this.applyEnrage();

    this.syncTentacles();

    if (effects.fireBubble && !this.frozen && !this.isDead()) this.fireBubbles(time);
    this.updateBubbles(delta);

    if (this.headLight) this.headLight.setPosition(this.x, this.y);
  }

  // Swap to the pre-baked red-eyed head texture + anim ONCE. Canvas-safe: this is
  // a texture swap, never a setTint (which no-ops on the Canvas renderer).
  private applyEnrage() {
    this.enrageApplied = true;
    this.setTexture(Assets.KRAKEN_HEAD_ENRAGED);
    this.play(LakeAnims.KRAKEN_ENRAGED, true);
    // Swing the head light from its calm cyan to an angry red-orange. Light2D
    // multiplies the diffuse texture, so the resting cyan light was desaturating
    // the baked red eyes into muddy amber — recoloring it here makes the enraged
    // "red-eyed and mad" cue actually read on WebGL (a no-op on Canvas: null light).
    this.headLight?.setColor(0xff4422).setIntensity(1.1);
    SynthAudio.roar();
    this.juice.shake(0.008, 500);
    this.juice.zoomPunch(0.08, 300);
  }

  // Reflect the pure state onto the tentacle sprites each frame: dead tentacles
  // hide (and their bodies stop hurting); the active guard leans toward the
  // player and scales up so the kid can read which one to hit.
  private syncTentacles() {
    const active = this.risen && !this.isDead();
    for (let i = 0; i < this.tentacles.length; i++) {
      const core = this.krakenState.tentacles[i];
      const sprite = this.tentacles[i];
      const anchor = this.anchors[i];
      const body = sprite.body as Phaser.Physics.Arcade.Body;

      sprite.setVisible(core.alive);
      body.enable = core.alive && active;
      if (!core.alive) continue;

      const isGuard = i === this.krakenState.activeGuard;
      const push = isGuard ? GUARD_PUSH : 0;
      sprite.x = this.x + anchor.dx + Math.cos(anchor.angle) * push;
      sprite.y = this.y + anchor.dy + Math.sin(anchor.angle) * push;
      const s = this.def.scale;
      sprite.setScale(isGuard ? s * 1.05 : s * 0.9, isGuard ? s * 2.7 : s * 2.4);
    }
  }

  private fireBubbles(time: number) {
    if (!this.target) return;
    const count = this.krakenState.enraged ? this.def.enragedSpreadCount : 1;
    const aim = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    for (let i = 0; i < count; i++) {
      const angle = count === 1 ? aim : aim + (i - (count - 1) / 2) * SPREAD_RAD;
      this.spawnBubble(angle, time);
    }
  }

  private spawnBubble(angle: number, time: number) {
    const bubble = this.bubbles.get(this.x, this.y, Assets.LASER_BUBBLE) as
      | Phaser.Physics.Arcade.Sprite
      | null;
    if (!bubble) return; // pool exhausted
    bubble.setActive(true).setVisible(true);
    const body = bubble.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false);
    const vx = Math.cos(angle) * this.def.bubble.speed;
    const vy = Math.sin(angle) * this.def.bubble.speed;
    bubble.setData('vx', vx);
    bubble.setData('vy', vy);
    bubble.setData('ttl', BUBBLE_TTL_MS);
    body.setVelocity(this.frozen ? 0 : vx, this.frozen ? 0 : vy);
    lit(bubble);
  }

  private updateBubbles(delta: number) {
    const bounds = this.scene.physics.world.bounds;
    this.bubbles.getChildren().forEach((obj) => {
      const bubble = obj as Phaser.Physics.Arcade.Sprite;
      if (!bubble.active) return;
      // Cull off the (arena) world bounds.
      if (
        bubble.x < bounds.x ||
        bubble.x > bounds.right ||
        bubble.y < bounds.y ||
        bubble.y > bounds.bottom
      ) {
        this.killBubble(bubble);
        return;
      }
      if (this.frozen) return; // paused: TTL holds while frozen
      const ttl = (bubble.getData('ttl') as number) - delta;
      if (ttl <= 0) this.killBubble(bubble);
      else bubble.setData('ttl', ttl);
    });
  }

  private killBubble(bubble: Phaser.Physics.Arcade.Sprite) {
    const body = bubble.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.setVelocity(0, 0);
      body.enable = false;
    }
    bubble.setActive(false).setVisible(false);
  }

  private clearBubbles() {
    this.bubbles.getChildren().slice().forEach((obj) => this.killBubble(obj as Phaser.Physics.Arcade.Sprite));
    this.bubbles.clear(true, true);
  }

  // Sink-and-burst death: no throne, no ground — the Beast sinks and dissolves.
  // Returns the key-drop spot ~80px above the head (clear of the tentacle fan,
  // reachable by swimming). The scene's onBossDefeated also stamps generic gore
  // at contactBodies[0] (the head) and floats the key here.
  playDeath(): { x: number; y: number } {
    this.defeated = true;
    this.clearBubbles();
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const spot = { x: this.x, y: this.y - 80 };

    SynthAudio.roar();
    const sinkTargets: Phaser.GameObjects.GameObject[] = [this, ...this.tentacles];
    this.scene.tweens.add({
      targets: sinkTargets,
      y: '+=140',
      alpha: 0,
      duration: 1500,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    });
    return spot;
  }

  override destroy(fromScene?: boolean) {
    this.bubbleOverlap?.destroy(); // drop the collider before the group it points at
    this.bubbleOverlap = null;
    if (this.scene) {
      this.scene.tweens.killTweensOf([this, ...this.tentacles]);
      if (this.headLight) this.scene.lights.removeLight(this.headLight);
      this.headLight = null;
    }
    this.tentacles.forEach((t) => t.destroy());
    this.tentacles.length = 0;
    if (this.bubbles) this.bubbles.destroy(true);
    super.destroy(fromScene);
  }
}
