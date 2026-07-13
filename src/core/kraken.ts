// Pure kraken boss reducer — mirrors damage.ts and air.ts. No Phaser imports.
import type { KrakenBossDef } from '../levels';

export type KrakenPhase = 'guarded' | 'window' | 'dead';

export interface KrakenTentacleState {
  alive: boolean;
  regrowAt: number | null;
  hp: number;
}

export interface KrakenState {
  hp: number;
  maxHp: number;
  phase: KrakenPhase;
  tentacles: KrakenTentacleState[];
  activeGuard: number | null;
  enraged: boolean;
  windowEndsAt: number;
  nextBubbleAt: number;
  tentacleMaxHp: number;
  regrowMs: number;
  headWindowMs: number;
  bubbleIntervalMs: number;
  enragedBubbleIntervalMs: number;
  guardCursor: number;
}

export interface KrakenEffects {
  fireBubble: boolean;
}

export function createKrakenState(def: KrakenBossDef, now = 0): KrakenState {
  // Tentacles collectively add half a boss health bar, split evenly. Rounding
  // up keeps per-tentacle HP integral for the Phaser entity and HUD glue.
  const tentacleMaxHp = Math.ceil(def.hp / (def.tentacles * 2));
  return {
    hp: def.hp,
    maxHp: def.hp,
    phase: 'guarded',
    tentacles: Array.from({ length: def.tentacles }, () => ({
      alive: true,
      regrowAt: null,
      hp: tentacleMaxHp,
    })),
    activeGuard: def.tentacles > 0 ? 0 : null,
    enraged: false,
    windowEndsAt: 0,
    nextBubbleAt: now + def.bubble.intervalMs,
    tentacleMaxHp,
    regrowMs: def.regrowMs,
    headWindowMs: def.headWindowMs,
    bubbleIntervalMs: def.bubble.intervalMs,
    enragedBubbleIntervalMs: def.bubble.enragedIntervalMs,
    guardCursor: 0,
  };
}

export function hitTentacle(
  state: KrakenState,
  index: number,
  damage: number,
  now: number
): KrakenState {
  if (isDead(state) || state.phase !== 'guarded' || index !== state.activeGuard) {
    return { ...state };
  }

  const hp = Math.max(0, state.tentacles[index].hp - Math.max(0, damage));
  const tentacles = state.tentacles.map((tentacle, tentacleIndex) =>
    tentacleIndex === index ? { ...tentacle, hp } : tentacle
  );

  if (hp > 0) {
    return { ...state, tentacles };
  }

  tentacles[index] = { alive: false, regrowAt: now + state.regrowMs, hp: 0 };
  return {
    ...state,
    phase: 'window',
    tentacles,
    activeGuard: null,
    guardCursor: index,
    windowEndsAt: now + state.headWindowMs,
  };
}

export function hitHead(state: KrakenState, damage: number, now: number): KrakenState {
  if (isDead(state) || state.phase !== 'window' || now >= state.windowEndsAt) {
    return { ...state };
  }

  const hp = Math.max(0, state.hp - Math.max(0, damage));
  const enraged = state.enraged || hp <= state.maxHp * 0.5;
  const becameEnraged = enraged && !state.enraged;

  return {
    ...state,
    hp,
    phase: hp === 0 ? 'dead' : state.phase,
    activeGuard: hp === 0 ? null : state.activeGuard,
    enraged,
    nextBubbleAt: becameEnraged
      ? Math.min(state.nextBubbleAt, now + state.enragedBubbleIntervalMs)
      : state.nextBubbleAt,
  };
}

export function tick(
  state: KrakenState,
  now: number
): { state: KrakenState; effects: KrakenEffects } {
  let fireBubble = false;

  if (isDead(state)) {
    return {
      state: { ...state, phase: 'dead', activeGuard: null },
      effects: { fireBubble },
    };
  }

  const enraged = state.enraged || state.hp <= state.maxHp * 0.5;
  const interval = enraged ? state.enragedBubbleIntervalMs : state.bubbleIntervalMs;
  let nextBubbleAt = state.nextBubbleAt;
  if (now >= nextBubbleAt) {
    fireBubble = true;
    nextBubbleAt += (Math.floor((now - nextBubbleAt) / interval) + 1) * interval;
  }

  const tentacles = state.tentacles.map((tentacle) =>
    !tentacle.alive && tentacle.regrowAt !== null && now >= tentacle.regrowAt
      ? { alive: true, regrowAt: null, hp: state.tentacleMaxHp }
      : tentacle
  );

  if (state.phase !== 'window' || now < state.windowEndsAt) {
    return {
      state: { ...state, tentacles, enraged, nextBubbleAt },
      effects: { fireBubble },
    };
  }

  const activeGuard = nextAliveTentacle(tentacles, state.guardCursor);
  if (activeGuard !== null) {
    return {
      state: {
        ...state,
        phase: 'guarded',
        tentacles,
        activeGuard,
        guardCursor: activeGuard,
        windowEndsAt: 0,
        enraged,
        nextBubbleAt,
      },
      effects: { fireBubble },
    };
  }

  // If every guard is down, the head stays vulnerable until the first regrowth.
  const regrowTimes = tentacles.flatMap((tentacle) =>
    tentacle.regrowAt === null ? [] : [tentacle.regrowAt]
  );
  // every dead tentacle has a regrowAt, so regrowTimes is always non-empty here.
  return {
    state: {
      ...state,
      tentacles,
      activeGuard: null,
      windowEndsAt: Math.min(...regrowTimes),
      enraged,
      nextBubbleAt,
    },
    effects: { fireBubble },
  };
}

export function isDead(state: KrakenState): boolean {
  return state.hp <= 0 || state.phase === 'dead';
}

function nextAliveTentacle(tentacles: KrakenTentacleState[], afterIndex: number): number | null {
  for (let offset = 1; offset <= tentacles.length; offset += 1) {
    const index = (afterIndex + offset) % tentacles.length;
    if (tentacles[index].alive) return index;
  }
  return null;
}
