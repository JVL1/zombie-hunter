// Pure Gummy Worm King reducer (Level 5) — mirrors kraken.ts. No Phaser imports.
//
// Wes's boss. The loop:
//   UNDER (a dirt mound slides toward the player)
//   → SHAKE (the ground shakes: a warning, the mound stops)
//   → POP (he bursts out — hurts on contact)
//   → EXPOSED (his mouth opens, snaps shut in a CHOMP, stays shut, repeats)
//       fed a sour candy while the mouth is open → DIZZY (full damage)
//       exposedMs runs out                       → DIG
//   DIZZY runs out → DIG → UNDER
// A hit when he is not dizzy does a little "chip" damage. At half health he
// enrages: faster, shorter warnings, and he summons gummy cubs.
import type { WormBossDef } from '../levels';

export type WormPhase = 'under' | 'shake' | 'pop' | 'exposed' | 'dizzy' | 'dig' | 'dead';
export type MouthSegment = 'open' | 'chomp' | 'closed';

const ENRAGE_RATIO = 0.5;

export interface WormState {
  phase: WormPhase;
  phaseStartedAt: number;
  phaseEndsAt: number;
  hp: number;
  maxHp: number;
  enraged: boolean;
  x: number; // mound / body x
  minX: number;
  maxX: number;
  chompCycle: number; // last exposed cycle index that emitted a chomp (-1 = none)
  nextSummonAt: number; // Infinity until enraged
}

export interface WormEffects {
  shake: boolean; // SHAKE started
  pop: boolean; // POP started
  chomp: boolean; // a chomp snap started
  dig: boolean; // DIG started
  under: boolean; // back under the ground
  summon: boolean; // enraged cub summon is due
}

const noEffects = (): WormEffects => ({
  shake: false,
  pop: false,
  chomp: false,
  dig: false,
  under: false,
  summon: false,
});

export function createWormState(
  def: WormBossDef,
  now: number,
  x: number,
  minX: number,
  maxX: number
): WormState {
  return {
    phase: 'under',
    phaseStartedAt: now,
    phaseEndsAt: now + def.underMs,
    hp: def.hp,
    maxHp: def.hp,
    enraged: false,
    x: clamp(x, minX, maxX),
    minX,
    maxX,
    chompCycle: -1,
    nextSummonAt: Number.POSITIVE_INFINITY,
  };
}

export function isDead(state: WormState): boolean {
  return state.hp <= 0 || state.phase === 'dead';
}

// Where the exposed King is in his open → chomp → closed cycle.
export function mouthSegment(state: WormState, def: WormBossDef, now: number): MouthSegment | null {
  if (state.phase !== 'exposed') return null;
  const cycle = def.mouthOpenMs + def.chompMs + def.mouthClosedMs;
  const t = (now - state.phaseStartedAt) % cycle;
  if (t < def.mouthOpenMs) return 'open';
  if (t < def.mouthOpenMs + def.chompMs) return 'chomp';
  return 'closed';
}

// The feed window: exposed with the mouth open.
export function isMouthOpen(state: WormState, def: WormBossDef, now: number): boolean {
  return mouthSegment(state, def, now) === 'open';
}

// Sword hits land only while he is above the ground.
export function isHittable(state: WormState): boolean {
  return state.phase === 'pop' || state.phase === 'exposed' || state.phase === 'dizzy';
}

// Contact hurts only during the eruption and a chomp snap — never while dizzy.
export function isContactActive(state: WormState, def: WormBossDef, now: number): boolean {
  if (state.phase === 'pop') return true;
  return mouthSegment(state, def, now) === 'chomp';
}

// A sour candy in the open mouth: he makes a sour face and gets dizzy.
export function feed(
  state: WormState,
  def: WormBossDef,
  now: number
): { state: WormState; fed: boolean } {
  if (isDead(state) || !isMouthOpen(state, def, now)) return { state: { ...state }, fed: false };
  return {
    state: { ...state, phase: 'dizzy', phaseStartedAt: now, phaseEndsAt: now + def.dizzyMs },
    fed: true,
  };
}

// Apply a sword hit. Returns the damage actually dealt (0 while he is under).
export function hit(
  state: WormState,
  def: WormBossDef,
  damage: number,
  now: number
): { state: WormState; dealt: number } {
  if (isDead(state) || !isHittable(state) || damage <= 0) return { state: { ...state }, dealt: 0 };

  const dealt =
    state.phase === 'dizzy'
      ? Math.round(damage * def.dizzyDamageMultiplier)
      : Math.max(1, Math.round(damage * def.chipDamageRatio));
  const hp = Math.max(0, state.hp - dealt);
  const enraged = state.enraged || hp <= state.maxHp * ENRAGE_RATIO;
  const becameEnraged = enraged && !state.enraged;

  return {
    state: {
      ...state,
      hp,
      phase: hp === 0 ? 'dead' : state.phase,
      enraged,
      nextSummonAt: becameEnraged ? now + def.summon.intervalMs / 2 : state.nextSummonAt,
    },
    dealt,
  };
}

export function tick(
  state: WormState,
  def: WormBossDef,
  now: number,
  dtMs: number,
  playerX: number
): { state: WormState; effects: WormEffects } {
  const effects = noEffects();
  if (isDead(state)) return { state: { ...state, phase: 'dead' }, effects };

  let s: WormState = { ...state };

  if (s.enraged && now >= s.nextSummonAt) {
    effects.summon = true;
    s.nextSummonAt = now + def.summon.intervalMs;
  }

  switch (s.phase) {
    case 'under': {
      // The mound slides toward the player (clamped dt: tab-suspension safe).
      const speed = s.enraged ? def.enragedBurrowSpeed : def.burrowSpeed;
      const step = (speed * Math.min(dtMs, 100)) / 1000;
      const dx = playerX - s.x;
      s.x = clamp(s.x + Math.sign(dx) * Math.min(Math.abs(dx), step), s.minX, s.maxX);
      if (now >= s.phaseEndsAt) {
        s = enter(s, 'shake', now, s.enraged ? def.enragedShakeMs : def.shakeMs);
        effects.shake = true;
      }
      break;
    }
    case 'shake':
      if (now >= s.phaseEndsAt) {
        s = enter(s, 'pop', now, def.popMs);
        effects.pop = true;
      }
      break;
    case 'pop':
      if (now >= s.phaseEndsAt) {
        s = enter(s, 'exposed', now, def.exposedMs);
        s.chompCycle = -1;
      }
      break;
    case 'exposed': {
      if (now >= s.phaseEndsAt) {
        s = enter(s, 'dig', now, def.digMs);
        effects.dig = true;
        break;
      }
      const cycle = def.mouthOpenMs + def.chompMs + def.mouthClosedMs;
      const index = Math.floor((now - s.phaseStartedAt) / cycle);
      if (mouthSegment(s, def, now) === 'chomp' && s.chompCycle !== index) {
        s.chompCycle = index;
        effects.chomp = true;
      }
      break;
    }
    case 'dizzy':
      if (now >= s.phaseEndsAt) {
        s = enter(s, 'dig', now, def.digMs);
        effects.dig = true;
      }
      break;
    case 'dig':
      if (now >= s.phaseEndsAt) {
        s = enter(s, 'under', now, s.enraged ? def.enragedUnderMs : def.underMs);
        effects.under = true;
      }
      break;
  }

  return { state: s, effects };
}

function enter(s: WormState, phase: WormPhase, now: number, durationMs: number): WormState {
  return { ...s, phase, phaseStartedAt: now, phaseEndsAt: now + durationMs };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}
