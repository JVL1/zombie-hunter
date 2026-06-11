import { beforeEach, describe, expect, it } from 'vitest';
import { COMBAT, PLAYER, WORLD, ZOMBIE } from '../config';
import { GameState } from './GameState';

// GameState is a singleton — grab it once and reset between tests.
const gs = GameState.getInstance();

beforeEach(() => {
  gs.coins = 0;
  gs.keys = [false, false, false, false, false];
  gs.bestStreak = 0;
  gs.resetRun();
});

describe('kill streak', () => {
  it('increments within the streak window', () => {
    expect(gs.registerKill(1000)).toBe(1);
    // Window refreshes from each kill
    expect(gs.registerKill(1000 + COMBAT.streakWindowMs - 1)).toBe(2);
    expect(gs.registerKill(1000 + COMBAT.streakWindowMs + 100)).toBe(3);
  });

  it('resets after the window expires', () => {
    gs.registerKill(1000);
    expect(gs.registerKill(1000 + COMBAT.streakWindowMs + 1)).toBe(1);
  });

  it('tracks best streak', () => {
    gs.registerKill(1000);
    gs.registerKill(1100);
    gs.registerKill(1200);
    expect(gs.bestStreak).toBe(3);
  });

  it('currentStreak returns 0 once expired', () => {
    gs.registerKill(1000);
    expect(gs.currentStreak(1100)).toBe(1);
    expect(gs.currentStreak(1000 + COMBAT.streakWindowMs + 1)).toBe(0);
  });
});

describe('health', () => {
  it('heal clamps to maxHealth', () => {
    gs.health = gs.maxHealth - 5;
    gs.heal(15);
    expect(gs.health).toBe(gs.maxHealth);
  });

  it('resetRun restores health but keeps coins and keys', () => {
    gs.health = 10;
    gs.coins = 42;
    gs.collectKey(0);
    gs.resetRun();
    expect(gs.health).toBe(gs.maxHealth);
    expect(gs.coins).toBe(42);
    expect(gs.keyCount).toBe(1);
  });
});

describe('keys', () => {
  it('collects keys into slots', () => {
    gs.collectKey(0);
    gs.collectKey(3);
    expect(gs.keys[0]).toBe(true);
    expect(gs.keys[3]).toBe(true);
    expect(gs.keyCount).toBe(2);
  });
});

describe('config invariants', () => {
  it('combo has exactly 3 steps with a stronger finisher', () => {
    expect(COMBAT.comboMultipliers).toHaveLength(3);
    expect(COMBAT.comboMultipliers[2]).toBeGreaterThan(COMBAT.comboMultipliers[0]);
  });

  it('zombie deaggro range exceeds aggro range (no flip-flopping)', () => {
    expect(ZOMBIE.deaggroRange).toBeGreaterThan(ZOMBIE.aggroRange);
  });

  it('player can double jump', () => {
    expect(PLAYER.maxJumps).toBeGreaterThanOrEqual(2);
  });

  it('ground sits inside the world', () => {
    expect(WORLD.groundY).toBeLessThan(WORLD.height);
  });
});
