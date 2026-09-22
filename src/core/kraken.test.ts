import { describe, expect, it } from 'vitest';
import type { KrakenBossDef } from '../levels';
import { KRAKEN_SWIM } from '../config';
import {
  createKrakenState,
  createSwimState,
  hitHead,
  hitTentacle,
  isDead,
  stepSwim,
  tick,
  type KrakenState,
  type SwimState,
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
  return tick(state, state.windowEndsAt).state;
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
    const expired = hitHead(state, 75, state.windowEndsAt);

    expect(result.hp).toBe(def.hp - 75);
    expect(expired.hp).toBe(def.hp);
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
  it('fires one bubble and advances past every missed interval', () => {
    const state = createKrakenState(def);
    const now = def.bubble.intervalMs * 3 + 5;
    const result = tick(state, now);

    expect(result).toMatchObject({
      effects: { fireBubble: true },
      state: { nextBubbleAt: def.bubble.intervalMs * 4 },
    });
  });

  it('promotes the next alive tentacle when a window expires', () => {
    const window = killGuard(createKrakenState(def), 1000);
    const guarded = tick(window, window.windowEndsAt).state;

    expect(guarded).toMatchObject({ phase: 'guarded', activeGuard: 1, windowEndsAt: 0 });
    expect(guarded.tentacles[0].alive).toBe(false);
  });

  it('regrows due tentacles at full health', () => {
    const window = killGuard(createKrakenState(def), 1000);
    const result = tick(window, 7000).state;

    expect(result.tentacles[0]).toEqual({ alive: true, regrowAt: null, hp: result.tentacleMaxHp });
  });

  it('stays vulnerable until the soonest tentacle regrows when all are dead', () => {
    let state = killGuard(createKrakenState({ ...def, regrowMs: 10_000 }), 0);
    state = killGuard(closeWindow(state), 2500);
    state = killGuard(closeWindow(state), 5000);

    const waiting = tick(state, 7500).state;
    expect(waiting).toMatchObject({ phase: 'window', activeGuard: null, windowEndsAt: 10_000 });
  });

  it('promotes a regrown tentacle after an all-dead window', () => {
    let state = killGuard(createKrakenState({ ...def, regrowMs: 10_000 }), 0);
    state = killGuard(closeWindow(state), 2500);
    state = killGuard(closeWindow(state), 5000);

    const guarded = tick(state, 10_000).state;
    expect(guarded).toMatchObject({ phase: 'guarded', activeGuard: 0, windowEndsAt: 0 });
  });

  it('wraps guard rotation from the last tentacle to a regrown first tentacle', () => {
    let state = killGuard(createKrakenState(def), 0);
    state = killGuard(closeWindow(state), 2500);
    state = closeWindow(state);
    expect(state.activeGuard).toBe(2);

    state = tick(state, 6000).state;
    expect(state.tentacles[0].alive).toBe(true);

    state = killGuard(state, 6000);
    state = closeWindow(state);

    expect(state.activeGuard).toBe(0);
  });
});

describe('bubble effects', () => {
  it('uses the normal cadence and carries the next deadline in state', () => {
    const state = createKrakenState(def);
    const advanced = tick(state, def.bubble.intervalMs);

    expect(tick(state, def.bubble.intervalMs - 1).effects.fireBubble).toBe(false);
    expect(advanced.effects.fireBubble).toBe(true);
    expect(advanced.state.nextBubbleAt).toBe(def.bubble.intervalMs * 2);
  });

  it('pulls the next bubble forward when the kraken enrages', () => {
    const window = killGuard(createKrakenState(def), 100);
    const enraged = hitHead(window, def.hp / 2, 200);

    expect(enraged.nextBubbleAt).toBe(200 + def.bubble.enragedIntervalMs);
    expect(tick(enraged, 200 + def.bubble.enragedIntervalMs).effects.fireBubble).toBe(true);
  });

  it('does not fire after death', () => {
    const window = killGuard(createKrakenState(def), 100);
    const dead = hitHead(window, def.hp, 200);

    expect(tick(dead, Number.MAX_SAFE_INTEGER).effects.fireBubble).toBe(false);
    expect(isDead({ ...dead, phase: 'window' })).toBe(true);
  });
});

// The Beast swims a figure-8 around its home spot (the live game showed it
// frozen in place for the whole fight before this).
describe('stepSwim', () => {
  const calm = createKrakenState(def);
  const minX = KRAKEN_SWIM.centerX - KRAKEN_SWIM.reachX;
  const maxX = KRAKEN_SWIM.centerX + KRAKEN_SWIM.reachX;
  const minY = KRAKEN_SWIM.centerY - KRAKEN_SWIM.reachY;
  const maxY = KRAKEN_SWIM.centerY + KRAKEN_SWIM.reachY;

  function swimFor(ms: number, state: KrakenState, stepMs = 16) {
    let swim: SwimState = createSwimState();
    let dx = 0;
    let dy = 0;
    for (let t = 0; t < ms; t += stepMs) {
      ({ swim, dx, dy } = stepSwim(swim, stepMs, state));
    }
    return { swim, dx, dy };
  }

  it('starts exactly at the home spot so the rise never jumps', () => {
    const { dx, dy } = stepSwim(createSwimState(), 0, calm);
    expect(dx).toBeCloseTo(0, 9);
    expect(dy).toBeCloseTo(0, 9);
  });

  it('actually moves away from home during the fight', () => {
    const { dx, dy } = swimFor(2000, calm);
    expect(Math.hypot(dx, dy)).toBeGreaterThan(20);
  });

  it('keeps visiting new spots across a full loop', () => {
    let swim = createSwimState();
    const xs: number[] = [];
    const ys: number[] = [];
    for (let t = 0; t < KRAKEN_SWIM.periodMs * 2; t += 16) {
      const step = stepSwim(swim, 16, calm);
      swim = step.swim;
      xs.push(step.dx);
      ys.push(step.dy);
    }
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(KRAKEN_SWIM.reachX * 1.5);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(KRAKEN_SWIM.reachY * 1.5);
  });

  it('stays inside the swim box for a long fight, even with big frame gaps', () => {
    for (const stepMs of [8, 16, 33, 250]) {
      let swim = createSwimState();
      for (let t = 0; t < 60000; t += stepMs) {
        const step = stepSwim(swim, stepMs, t % 20000 < 10000 ? calm : { ...calm, enraged: true });
        swim = step.swim;
        expect(step.dx).toBeGreaterThanOrEqual(minX - 1e-9);
        expect(step.dx).toBeLessThanOrEqual(maxX + 1e-9);
        expect(step.dy).toBeGreaterThanOrEqual(minY - 1e-9);
        expect(step.dy).toBeLessThanOrEqual(maxY + 1e-9);
      }
    }
  });

  it('glides smoothly with no teleport between frames', () => {
    let swim = createSwimState();
    let prev = { dx: 0, dy: 0 };
    for (let t = 0; t < 20000; t += 16) {
      const enraged = t > 10000;
      const step = stepSwim(swim, 16, { ...calm, enraged });
      swim = step.swim;
      expect(Math.hypot(step.dx - prev.dx, step.dy - prev.dy)).toBeLessThan(4);
      prev = step;
    }
  });

  it('swims faster when enraged and slower while the head is open', () => {
    const calmAngle = swimFor(1000, calm).swim.angle;
    const madAngle = swimFor(1000, { ...calm, enraged: true }).swim.angle;
    const openAngle = swimFor(1000, { ...calm, phase: 'window', activeGuard: null }).swim.angle;
    expect(madAngle).toBeCloseTo(calmAngle * KRAKEN_SWIM.enragedSpeed, 5);
    expect(openAngle).toBeCloseTo(calmAngle * KRAKEN_SWIM.windowSpeed, 5);
  });

  it('stops swimming once dead', () => {
    const dead = { ...calm, hp: 0, phase: 'dead' as const };
    const before = swimFor(3000, calm).swim;
    const after = stepSwim(before, 500, dead);
    expect(after.swim).toEqual(before);
  });
});
