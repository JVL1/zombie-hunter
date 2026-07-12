import Phaser from 'phaser';

// The seam between BaseLevelScene and a concrete boss. The walker `Boss` and the
// Level-4 `Kraken` both implement this so the scene never type-guards on a
// concrete class: cinematic trigger, HP bar, contact damage, sword hits, and the
// corpse/key drop all go through the interface.
//
// Deliberately body-count agnostic: `contactBodies` is an array (walker: its one
// body; kraken: head + tentacles) and there is no `throne` assumption anywhere.
export interface BossEncounter {
  // health / maxHealth, for the HUD boss bar.
  readonly healthRatio: number;

  // Bodies that can hurt the player on contact (and that collide with solids).
  readonly contactBodies: Phaser.Physics.Arcade.Body[];

  // Contact-hit damage dealt to the player.
  readonly contactDamage: number;

  // True only while the boss is in a state that hurts the player on contact.
  // Encodes the walker's FIGHTING/CHARGING/LEAPING gating without leaking its
  // internal state enum to the scene.
  readonly contactDamageActive: boolean;

  // Kept as a METHOD (not a getter) to match the concrete Boss's existing
  // `isDead()` — the lower-churn reconcile; every scene call site stays `isDead()`.
  isDead(): boolean;

  // Cinematic hook: begin the rise-from-throne (or surface) sequence.
  triggerRise(): void;

  update(time: number, delta: number): void;

  // Wire a player sword/slam hitbox against this boss's own hittable body/bodies.
  // The encounter owns the overlap, the per-swing `hitSet` multi-hit guard, and
  // its own `takeDamage`; it reports each connect back through `onHit(x, y, died)`
  // so the scene keeps owning the FX (splat/gore), the slam feedback
  // (pogo + hit-stop), and `onBossDefeated`. `hitbox` is a
  // `Phaser.GameObjects.Rectangle` — the type Player actually emits.
  wireAttackHitbox(
    hitbox: Phaser.GameObjects.Rectangle,
    damage: number,
    isSlam: boolean,
    onHit: (x: number, y: number, died: boolean) => void
  ): void;

  // Optional cinematic freeze. The Kraken pauses/holds its bubbles during the
  // boss cutscene (including the rise); the walker has no projectiles and does
  // not implement it, so the scene calls it with optional chaining.
  setFrozen?(frozen: boolean): void;

  // Play the corpse presentation and return the key-drop spot.
  playDeath(): { x: number; y: number };
}
