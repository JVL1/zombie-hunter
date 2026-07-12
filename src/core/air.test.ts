import { describe, expect, it } from 'vitest';
import { WATER } from '../config';
import {
  createAirState,
  grantScuba,
  restoreAir,
  scubaHit,
  tickAir,
  type AirState,
} from './air';

const airState = (overrides: Partial<AirState> = {}): AirState => ({
  ...createAirState(),
  ...overrides,
});

const submerged = { breathing: false, inVent: false, frozen: false };

function tickSubmerged(state: AirState, frames: number): { state: AirState; damageTicks: number } {
  let damageTicks = 0;
  for (let frame = 0; frame < frames; frame += 1) {
    const result = tickAir(state, 250, submerged);
    state = result.state;
    damageTicks += result.effects.damageTicks;
  }
  return { state, damageTicks };
}

function hitScuba(state: AirState, hits: number) {
  let result = { state, broke: false };
  const broke: boolean[] = [];
  for (let hit = 0; hit < hits; hit += 1) {
    result = scubaHit(result.state);
    broke.push(result.broke);
  }
  return { state: result.state, broke };
}

describe('tickAir', () => {
  it('drains while submerged and not in a vent', () => {
    const state = createAirState();
    const result = tickAir(state, 200, submerged);
    expect(result.state.airMs).toBe(WATER.airMs - 200);
  });

  it('refills at refillRatio while breathing (head above surface)', () => {
    const state = airState({ airMs: WATER.airMs - 100 });
    const result = tickAir(state, 100, { ...submerged, breathing: true });
    expect(result.state.airMs).toBe(WATER.airMs);
  });

  it('refills in a vent even while submerged', () => {
    const state = airState({ airMs: 1000 });
    const result = tickAir(state, 200, { ...submerged, inVent: true });
    expect(result.state.airMs).toBe(1000 + 200 * WATER.refillRatio);
  });

  it('resets the warning after refilling above warnAtMs', () => {
    const state = airState({ airMs: WATER.warnAtMs - 100, warned: true });
    const result = tickAir(state, 100, { ...submerged, breathing: true });
    expect(result.state.warned).toBe(false);
  });

  it('frozen mode changes nothing (cinematic/intro)', () => {
    const state = airState({ airMs: 1234, msToNextTick: 456, warned: true });
    const result = tickAir(state, 200, { ...submerged, frozen: true });
    expect(result.state).toBe(state);
    expect(result.effects).toEqual({ damageTicks: 0, warningStarted: false });
  });

  it('fires warningStarted exactly once when crossing warnAtMs downward', () => {
    const first = tickAir(airState({ airMs: WATER.warnAtMs + 100 }), 200, submerged);
    const second = tickAir(first.state, 200, submerged);
    expect(first.effects.warningStarted).toBe(true);
    expect(second.effects.warningStarted).toBe(false);
  });

  it('emits damageTicks on drownTickMs cadence at zero air (cadence lives in state)', () => {
    const state = airState({ airMs: 0 });
    const result = tickSubmerged(state, 10);
    expect(result.damageTicks).toBe(2);
    expect(result.state.msToNextTick).toBe(500);
  });

  it('clamps huge dt (tab suspension) to one frame worth of ticks', () => {
    const state = airState({ airMs: 0, msToNextTick: 900 });
    const result = tickAir(state, 10_000, submerged);
    expect(result.effects.damageTicks).toBe(1);
    expect(result.state.msToNextTick).toBe(150);
  });

  it('crossing to zero counts only post-depletion time toward the drown cadence', () => {
    // 100ms of air left, a 250ms frame: only the trailing 150ms is drowning time
    const state = airState({ airMs: 100 });
    const result = tickAir(state, 250, submerged);
    expect(result.state.airMs).toBe(0);
    expect(result.effects.damageTicks).toBe(0);
    expect(result.state.msToNextTick).toBe(150);
  });

  it('clamps negative dt to zero (no air gained while drowning)', () => {
    const state = createAirState();
    const result = tickAir(state, -100, submerged);
    expect(result.state.airMs).toBe(WATER.airMs);
  });

  it('refilling clears a carried drown cadence', () => {
    const state = airState({ airMs: 0, msToNextTick: 750 });
    const result = tickAir(state, 100, { ...submerged, breathing: true });
    expect(result.state.msToNextTick).toBe(0);
  });

  it('warning re-fires after climbing back above warnAtMs and dipping again', () => {
    const phase1 = tickAir(airState({ airMs: WATER.warnAtMs + 100 }), 200, submerged);
    const phase2 = tickAir(phase1.state, 100, { ...submerged, breathing: true });
    const phase3 = tickAir(phase2.state, 250, submerged);
    expect(phase1.effects.warningStarted).toBe(true);
    expect(phase2.state.warned).toBe(false);
    expect(phase3.effects.warningStarted).toBe(true);
  });

  it('scuba grants infinite air: no drain, no ticks while durability > 0', () => {
    const state = grantScuba(airState({ airMs: 500, msToNextTick: 900, warned: true }));
    const result = tickAir(state, 250, submerged);
    expect(result.state).toEqual({ ...state, scubaDurability: WATER.scubaDurability });
    expect(result.effects).toEqual({ damageTicks: 0, warningStarted: false });
  });
});

describe('restoreAir', () => {
  it('resetting after revive: restore(0.5) gives half air and clears cadence', () => {
    const state = airState({ airMs: 0, msToNextTick: 750, warned: true });
    const result = restoreAir(state, 0.5);
    expect(result.airMs).toBe(WATER.airMs * 0.5);
    expect(result).toMatchObject({ msToNextTick: 0, warned: false });
  });

  it('clamps ratio > 1 to full air', () => {
    const result = restoreAir(airState({ airMs: 0 }), 2);
    expect(result.airMs).toBe(WATER.airMs);
  });
});

describe('scubaHit', () => {
  it('decrements durability 5→0 and reports broke on the 5th', () => {
    const state = grantScuba(createAirState());
    const result = hitScuba(state, WATER.scubaDurability);
    expect(result.state.scubaDurability).toBe(0);
    expect(result.broke).toEqual([false, false, false, false, true]);
  });

  it('is a no-op without scuba', () => {
    const state = createAirState();
    const result = scubaHit(state);
    expect(result).toEqual({ state, broke: false });
  });
});
