import { describe, expect, it } from 'vitest';
import type { KrakenBossDef } from '../levels';
import {
  bubbleDue,
  createKrakenState,
  hitHead,
  hitTentacle,
  isDead,
  tick,
  type KrakenState,
} from './kraken';

const def: KrakenBossDef = {
  kind: 'kraken',
  name: 'THE SUNKEN BEAST',
  hp: 400,
  scale: 2,
  contactDamage: 14,
  tentacles: 3,
  regrowMs: 6000,
  headWindowMs: 2500,
  bubble: { speed: 160, intervalMs: 1800, enragedIntervalMs: 1100, damage: 12 },
  enragedSpreadCount: 3,
};

function killGuard(state: KrakenState, now: number): KrakenState {
  const guard = state.activeGuard;
  if (guard === null) throw new Error('expected an active guard');
  return hitTentacle(state, guard, state.tentacleMaxHp, now);
}

function closeWindow(state: KrakenState): KrakenState {
  return tick(state, state.windowEndsAt);
}

describe('createKrakenState', () => {
  it('starts guarded at full health with one active guard', () => {
    const state = createKrakenState(def);

    expect(state).toMatchObject({ hp: def.hp, phase: 'guarded', activeGuard: 0, enraged: false });
    expect(state.tentacles).toHaveLength(def.tentacles);
    expect(state.tentacles.every((tentacle) => tentacle.alive && tentacle.regrowAt === null)).toBe(true);
  });

  it('gives every tentacle deterministic health derived from the boss hp', () => {
    const state = createKrakenState(def);

    expect(state.tentacleMaxHp).toBe(Math.ceil(def.hp / (def.tentacles * 2)));
    expect(state.tentacles.every((tentacle) => tentacle.hp === state.tentacleMaxHp)).toBe(true);
  });
});

describe('hitTentacle', () => {
  it('damages only the active guard without mutating the input', () => {
    const state = createKrakenState(def);
    const result = hitTentacle(state, 0, 10, 100);

    expect(result.tentacles[0].hp).toBe(state.tentacles[0].hp - 10);
    expect(state.tentacles[0].hp).toBe(state.tentacleMaxHp);
  });

  it('ignores a hit on a non-guard tentacle', () => {
    const state = createKrakenState(def);
    const result = hitTentacle(state, 1, 999, 100);

    expect(result).toEqual(state);
    expect(result).not.toBe(state);
  });

  it('opens a timed head window and starts regrowth when the guard dies', () => {
    const state = killGuard(createKrakenState(def), 1000);

    expect(state).toMatchObject({ phase: 'window', activeGuard: null, windowEndsAt: 3500 });
    expect(state.tentacles[0]).toEqual({ alive: false, regrowAt: 7000, hp: 0 });
  });
});

describe('hitHead', () => {
  it('ignores head damage while guarded', () => {
    const state = createKrakenState(def);
    const result = hitHead(state, 100, 500);

    expect(result.hp).toBe(def.hp);
    expect(result).not.toBe(state);
  });

  it('damages the head only during a window', () => {
    const state = killGuard(createKrakenState(def), 1000);
    const result = hitHead(state, 75, 1200);

    expect(result.hp).toBe(def.hp - 75);
    expect(state.hp).toBe(def.hp);
  });

  it('latches enrage at half health', () => {
    const window = killGuard(createKrakenState(def), 1000);
    const enraged = hitHead(window, def.hp / 2, 1200);
    const chipped = hitHead(enraged, 1, 1300);

    expect(enraged.enraged).toBe(true);
    expect(chipped.enraged).toBe(true);
  });

  it('enters a terminal dead state at zero hp', () => {
    const window = killGuard(createKrakenState(def), 1000);
    const dead = hitHead(window, def.hp + 1, 1200);

    expect(dead).toMatchObject({ hp: 0, phase: 'dead', activeGuard: null });
    expect(isDead(dead)).toBe(true);
  });
});

describe('tick', () => {
  it('promotes the next alive tentacle when a window expires', () => {
    const window = killGuard(createKrakenState(def), 1000);
    const guarded = tick(window, window.windowEndsAt);

    expect(guarded).toMatchObject({ phase: 'guarded', activeGuard: 1, windowEndsAt: 0 });
    expect(guarded.tentacles[0].alive).toBe(false);
  });

  it('regrows due tentacles at full health', () => {
    const window = killGuard(createKrakenState(def), 1000);
    const result = tick(window, 7000);

    expect(result.tentacles[0]).toEqual({ alive: true, regrowAt: null, hp: result.tentacleMaxHp });
  });

  it('stays vulnerable until the soonest tentacle regrows when all are dead', () => {
    let state = killGuard(createKrakenState({ ...def, regrowMs: 10_000 }), 0);
    state = killGuard(closeWindow(state), 2500);
    state = killGuard(closeWindow(state), 5000);

    const waiting = tick(state, 7500);
    expect(waiting).toMatchObject({ phase: 'window', activeGuard: null, windowEndsAt: 10_000 });
  });

  it('promotes a regrown tentacle after an all-dead window', () => {
    let state = killGuard(createKrakenState({ ...def, regrowMs: 10_000 }), 0);
    state = killGuard(closeWindow(state), 2500);
    state = killGuard(closeWindow(state), 5000);

    const guarded = tick(state, 10_000);
    expect(guarded).toMatchObject({ phase: 'guarded', activeGuard: 0, windowEndsAt: 0 });
  });
});

describe('bubbleDue', () => {
  it('uses the normal cadence and carries the next deadline in state', () => {
    const state = createKrakenState(def);
    const advanced = tick(state, def.bubble.intervalMs);

    expect(bubbleDue(state, def.bubble.intervalMs - 1)).toBe(false);
    expect(bubbleDue(state, def.bubble.intervalMs)).toBe(true);
    expect(advanced.nextBubbleAt).toBe(def.bubble.intervalMs * 2);
  });

  it('pulls the next bubble forward when the kraken enrages', () => {
    const window = killGuard(createKrakenState(def), 100);
    const enraged = hitHead(window, def.hp / 2, 200);

    expect(enraged.nextBubbleAt).toBe(200 + def.bubble.enragedIntervalMs);
    expect(bubbleDue(enraged, 200 + def.bubble.enragedIntervalMs)).toBe(true);
  });

  it('does not fire after death', () => {
    const window = killGuard(createKrakenState(def), 100);
    const dead = hitHead(window, def.hp, 200);

    expect(bubbleDue(dead, Number.MAX_SAFE_INTEGER)).toBe(false);
    expect(isDead({ ...dead, phase: 'window' })).toBe(true);
  });
});
