// Pure water-level geometry + rules — no Phaser imports. Mirrors air.ts/damage.ts.
// The type-only imports below are erased at compile time, so this stays runtime
// Phaser-free (vitest imports it in plain Node).
import type { DamageSource } from '../entities/Player';
import type { DamageOutcome } from './damage';

export interface VentRegion {
  x: number;
  topY: number;
  width: number;
}

// The player is in a vent column when its x is within the vent's width band and
// its y is at or below the vent top (the column runs topY -> lakebed). While in a
// vent, air refills. Geometric test only — no physics zone/body.
export function inVent(px: number, py: number, vents: readonly VentRegion[]): boolean {
  return vents.some((v) => px >= v.x - v.width / 2 && px <= v.x + v.width / 2 && py >= v.topY);
}

// Scuba cracks ONLY when a non-drowning hit actually lands on the body
// (hurt / potioned / revived). A hit ignored by i-frames ('ignored') or fully
// absorbed by a shield ('absorbed') must not crack it, a killing blow ('dead')
// is game-over regardless, and drowning damage never cracks scuba.
export function shouldCrackScuba(outcome: DamageOutcome, source: DamageSource): boolean {
  if (source === 'drowning') return false;
  return outcome === 'hurt' || outcome === 'potioned' || outcome === 'revived';
}
