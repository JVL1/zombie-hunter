// Pure breathing/scuba reducer — mirrors damage.ts. No Phaser imports.
import { WATER } from '../config';

export interface AirState {
  airMs: number;
  scubaDurability: number;
  msToNextTick: number;
  warned: boolean;
}

export interface AirMode {
  breathing: boolean;
  inVent: boolean;
  frozen: boolean;
}

export interface AirEffects {
  damageTicks: number;
  warningStarted: boolean;
}

const noEffects = (): AirEffects => ({ damageTicks: 0, warningStarted: false });

export function createAirState(): AirState {
  return {
    airMs: WATER.airMs,
    scubaDurability: 0,
    msToNextTick: 0,
    warned: false,
  };
}

export function grantScuba(state: AirState): AirState {
  return { ...state, scubaDurability: WATER.scubaDurability };
}

export function scubaHit(state: AirState): { state: AirState; broke: boolean } {
  if (state.scubaDurability === 0) {
    return { state: { ...state }, broke: false };
  }

  const scubaDurability = state.scubaDurability - 1;
  return {
    state: { ...state, scubaDurability },
    broke: scubaDurability === 0,
  };
}

export function restoreAir(state: AirState, ratio: number): AirState {
  const airMs = Math.min(WATER.airMs, WATER.airMs * ratio);
  return {
    ...state,
    airMs,
    msToNextTick: 0,
    warned: airMs <= WATER.warnAtMs,
  };
}

export function tickAir(
  state: AirState,
  dtMs: number,
  mode: AirMode
): { state: AirState; effects: AirEffects } {
  if (mode.frozen || state.scubaDurability > 0) {
    return { state, effects: noEffects() };
  }

  const dt = Math.max(0, Math.min(dtMs, 250));

  if (mode.breathing || mode.inVent) {
    const airMs = Math.min(WATER.airMs, state.airMs + dt * WATER.refillRatio);
    return {
      state: {
        ...state,
        airMs,
        msToNextTick: 0,
        warned: airMs > WATER.warnAtMs ? false : state.warned,
      },
      effects: noEffects(),
    };
  }

  const airMs = Math.max(0, state.airMs - dt);
  const warningStarted = !state.warned && state.airMs > WATER.warnAtMs && airMs <= WATER.warnAtMs;
  const warned = state.warned || warningStarted;

  if (airMs > 0) {
    return {
      state: { ...state, airMs, warned },
      effects: { damageTicks: 0, warningStarted },
    };
  }

  // Only time spent after air hit zero counts toward the drown cadence — on the
  // frame air crosses to zero, the pre-depletion slice was still breathable.
  const tickCarry = state.msToNextTick + Math.max(0, dt - state.airMs);
  const damageTicks = Math.floor(tickCarry / WATER.drownTickMs);
  return {
    state: {
      ...state,
      airMs,
      msToNextTick: tickCarry % WATER.drownTickMs,
      warned,
    },
    effects: { damageTicks, warningStarted },
  };
}
