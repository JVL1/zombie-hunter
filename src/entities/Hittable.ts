import Phaser from 'phaser';

// A world enemy the player can damage with a sword/slam and be hurt by on
// contact. Zombie, Fish, and Eel all implement it, so BaseLevelScene's combat
// plumbing — the per-swing hit apply, the shared contact-cooldown map, gore +
// kill credit, and the boss-trigger straggler sweep — is written once against
// this shape instead of the concrete Zombie class.
export interface Hittable {
  readonly x: number;
  readonly y: number;
  readonly active: boolean;
  // Arcade body; the kill path reads body.bottom for the ground blood decal.
  readonly body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null;
  // Contact-hit damage this enemy deals to the player.
  readonly contactDamage: number;
  isDead(): boolean;
  // Apply a sword/slam hit; returns true when THIS hit dropped it to dead.
  takeHit(dmg: number): boolean;
  // Play the death presentation and destroy.
  die(): void;
}
