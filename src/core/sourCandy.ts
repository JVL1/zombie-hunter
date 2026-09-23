// Pure sour-candy reducer (Level 5) — mirrors air.ts. No Phaser imports.
//
// Wes's idea: feed the Gummy Worm King a super sour candy and he gets dizzy.
// Gumball Zombies drop candies, and a sword hit on the King knocks one loose
// (on a cooldown). The player holds a few and feeds one with a sword hit on
// the King's open mouth.
import { CANDY } from '../config';

export interface SourCandyState {
  count: number;
  lastKnockAt: number; // time of the last knock-loose drop (-Infinity = never)
}

export function createSourCandyState(): SourCandyState {
  return { count: 0, lastKnockAt: Number.NEGATIVE_INFINITY };
}

// Pick one up. Returns the same count when the pocket is full.
export function collect(state: SourCandyState, cap: number = CANDY.sourCandyCap): SourCandyState {
  return { ...state, count: Math.min(cap, state.count + 1) };
}

// Feed one to the King. Only works with a candy in hand AND his mouth open.
export function tryFeed(
  state: SourCandyState,
  mouthOpen: boolean
): { state: SourCandyState; fed: boolean } {
  if (!mouthOpen || state.count <= 0) return { state: { ...state }, fed: false };
  return { state: { ...state, count: state.count - 1 }, fed: true };
}

// A sword hit on the King knocks a candy loose, at most once per cooldown.
export function knockLoose(
  state: SourCandyState,
  now: number,
  cooldownMs: number
): { state: SourCandyState; drop: boolean } {
  if (now - state.lastKnockAt < cooldownMs) return { state: { ...state }, drop: false };
  return { state: { ...state, lastKnockAt: now }, drop: true };
}
