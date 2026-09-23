import { describe, expect, it } from 'vitest';
import type { WormBossDef } from '../levels';
import {
  createWormState,
  feed,
  hit,
  isContactActive,
  isHittable,
  isMouthOpen,
  mouthSegment,
  tick,
  type WormState,
} from './worm';

const def: WormBossDef = {
  kind: 'worm',
  name: 'TEST WORM',
  hp: 100,
  scale: 1,
  contactDamage: 10,
  burrowSpeed: 100,
  enragedBurrowSpeed: 200,
  underMs: 1000,
  enragedUnderMs: 600,
  shakeMs: 800,
  enragedShakeMs: 400,
  popMs: 300,
  exposedMs: 4000,
  mouthOpenMs: 900,
  mouthClosedMs: 600,
  chompMs: 200,
  dizzyMs: 3000,
  digMs: 400,
  chipDamageRatio: 0.25,
  dizzyDamageMultiplier: 1.5,
  candyKnockCooldownMs: 1500,
  summon: { count: 2, maxAlive: 4, intervalMs: 6000 },
};

// Drive the reducer to a phase with small time steps.
function runUntil(s: WormState, phase: WormState['phase'], from: number, playerX = 500) {
  let t = from;
  let state = s;
  for (let i = 0; i < 1000 && state.phase !== phase; i++) {
    t += 16;
    state = tick(state, def, t, 16, playerX).state;
  }
  expect(state.phase).toBe(phase);
  return { state, t };
}

describe('Gummy Worm King core (Wes)', () => {
  it('runs under → shake → pop → exposed → dig → under in order, with effects', () => {
    let s = createWormState(def, 0, 300, 100, 900);
    expect(s.phase).toBe('under');

    let r = tick(s, def, 1000, 16, 500);
    expect(r.state.phase).toBe('shake');
    expect(r.effects.shake).toBe(true);

    r = tick(r.state, def, 1800, 16, 500);
    expect(r.state.phase).toBe('pop');
    expect(r.effects.pop).toBe(true);

    r = tick(r.state, def, 2100, 16, 500);
    expect(r.state.phase).toBe('exposed');

    r = tick(r.state, def, 6100, 16, 500);
    expect(r.state.phase).toBe('dig');
    expect(r.effects.dig).toBe(true);

    r = tick(r.state, def, 6500, 16, 500);
    expect(r.state.phase).toBe('under');
    expect(r.effects.under).toBe(true);
    s = r.state;
    expect(s.phaseEndsAt).toBe(6500 + def.underMs);
  });

  it('slides the mound toward the player while under, clamped to bounds', () => {
    const s = createWormState(def, 0, 300, 100, 400);
    const moved = tick(s, def, 16, 100, 800).state; // 100ms at 100px/s = 10px
    expect(moved.x).toBeCloseTo(310);
    let far = s;
    for (let t = 0; t < 900; t += 100) far = tick(far, def, t, 100, 800).state;
    expect(far.x).toBeLessThanOrEqual(400);
    // A huge dt (tab suspend) is clamped, so the mound cannot teleport.
    expect(tick(s, def, 5, 60000, 800).state.x).toBeCloseTo(310);
  });

  it('stops the mound during the shake so the warning is honest', () => {
    const { state, t } = runUntil(createWormState(def, 0, 300, 100, 900), 'shake', 0);
    const later = tick(state, def, t + 100, 100, 900).state;
    expect(later.x).toBe(state.x);
  });

  it('opens, chomps, and closes the mouth on a cycle, emitting one chomp per cycle', () => {
    const { state, t } = runUntil(createWormState(def, 0, 300, 100, 900), 'exposed', 0);
    const start = state.phaseStartedAt;
    expect(mouthSegment(state, def, start + 10)).toBe('open');
    expect(mouthSegment(state, def, start + 950)).toBe('chomp');
    expect(mouthSegment(state, def, start + 1200)).toBe('closed');
    expect(mouthSegment(state, def, start + 1710)).toBe('open');

    let s = state;
    let chomps = 0;
    for (let now = t; now < start + 1700; now += 16) {
      const r = tick(s, def, now, 16, 500);
      s = r.state;
      if (r.effects.chomp) chomps++;
    }
    expect(chomps).toBe(1);
  });

  it('feeds only while exposed with the mouth open', () => {
    const under = createWormState(def, 0, 300, 100, 900);
    expect(feed(under, def, 10).fed).toBe(false);

    const { state } = runUntil(under, 'exposed', 0);
    const start = state.phaseStartedAt;
    expect(isMouthOpen(state, def, start + 100)).toBe(true);
    expect(feed(state, def, start + 1200).fed).toBe(false); // closed

    const fed = feed(state, def, start + 100);
    expect(fed.fed).toBe(true);
    expect(fed.state.phase).toBe('dizzy');
    expect(fed.state.phaseEndsAt).toBe(start + 100 + def.dizzyMs);
    // Already dizzy: another candy is not eaten.
    expect(feed(fed.state, def, start + 200).fed).toBe(false);
  });

  it('dizzy ends in a dig', () => {
    const { state } = runUntil(createWormState(def, 0, 300, 100, 900), 'exposed', 0);
    const dizzy = feed(state, def, state.phaseStartedAt + 50).state;
    const r = tick(dizzy, def, dizzy.phaseEndsAt, 16, 500);
    expect(r.state.phase).toBe('dig');
    expect(r.effects.dig).toBe(true);
  });

  it('does chip damage when not dizzy, full + bonus when dizzy, none when under', () => {
    const under = createWormState(def, 0, 300, 100, 900);
    expect(isHittable(under)).toBe(false);
    expect(hit(under, def, 20, 0).dealt).toBe(0);

    const { state } = runUntil(under, 'exposed', 0);
    const chip = hit(state, def, 20, 100);
    expect(chip.dealt).toBe(5);
    expect(chip.state.hp).toBe(95);
    expect(hit(state, def, 1, 100).dealt).toBe(1); // chip is never 0

    const dizzy = feed(state, def, state.phaseStartedAt + 10).state;
    const big = hit(dizzy, def, 20, 100);
    expect(big.dealt).toBe(30);
    expect(big.state.hp).toBe(70);
  });

  it('hurts on contact only during the pop and a chomp — never while dizzy', () => {
    const { state: pop } = runUntil(createWormState(def, 0, 300, 100, 900), 'pop', 0);
    expect(isContactActive(pop, def, pop.phaseStartedAt)).toBe(true);

    const { state } = runUntil(pop, 'exposed', pop.phaseStartedAt);
    const start = state.phaseStartedAt;
    expect(isContactActive(state, def, start + 100)).toBe(false);
    expect(isContactActive(state, def, start + 950)).toBe(true);
    const dizzy = feed(state, def, start + 100).state;
    expect(isContactActive(dizzy, def, start + 950)).toBe(false);
  });

  it('enrages at half health, then speeds up and summons cubs on a timer', () => {
    const { state } = runUntil(createWormState(def, 0, 300, 100, 900), 'exposed', 0);
    const dizzy = feed(state, def, state.phaseStartedAt + 10).state;
    const r = hit(dizzy, def, 34, 1000); // 51 damage → 49 hp
    expect(r.state.enraged).toBe(true);
    expect(r.state.nextSummonAt).toBe(1000 + def.summon.intervalMs / 2);

    let s = r.state;
    let summons = 0;
    for (let t = 1000; t <= 1000 + def.summon.intervalMs * 2; t += 50) {
      const out = tick(s, def, t, 50, 500);
      s = out.state;
      if (out.effects.summon) summons++;
    }
    expect(summons).toBe(2);

    // Enraged: the next under/shake phases use the faster timings.
    const dig = { ...s, phase: 'dig' as const, phaseEndsAt: 50_000 };
    const back = tick(dig, def, 50_000, 16, 500).state;
    expect(back.phaseEndsAt).toBe(50_000 + def.enragedUnderMs);
  });

  it('dies at 0 hp and then ignores everything', () => {
    const { state } = runUntil(createWormState(def, 0, 300, 100, 900), 'exposed', 0);
    const dizzy = feed(state, def, state.phaseStartedAt + 10).state;
    const dead = hit(dizzy, def, 1000, 100).state;
    expect(dead.hp).toBe(0);
    expect(dead.phase).toBe('dead');
    expect(hit(dead, def, 10, 200).dealt).toBe(0);
    expect(tick(dead, def, 99_999, 16, 500).state.phase).toBe('dead');
  });
});
