import { beforeEach, describe, expect, it } from 'vitest';
import { COMBAT, PLAYER, WORLD, ZOMBIE } from '../config';
import { LEVELS } from '../levels';
import { GameState } from './GameState';

const SAVE_KEY = 'zombie-hunters-save-v2';

// Node only ships a working localStorage when launched with --localstorage-file;
// install an in-memory stand-in so persistence tests run everywhere.
if (typeof globalThis.localStorage?.setItem !== 'function') {
  const store = new Map<string, string>();
  (globalThis as { localStorage: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

// GameState is a singleton — grab it once and reset between tests.
const gs = GameState.getInstance();

beforeEach(() => {
  localStorage.removeItem(SAVE_KEY);
  gs.coins = 0;
  gs.keys = [false, false, false, false, false];
  gs.bestStreak = 0;
  gs.currentLevel = 1;
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

describe('level progression', () => {
  it('starts at level 1', () => {
    expect(gs.currentLevel).toBe(1);
  });

  it('advanceLevel moves forward, clamped to built levels, and persists', () => {
    gs.advanceLevel();
    expect(gs.currentLevel).toBe(Math.min(2, LEVELS.length));
    const fresh = new (GameState as any)();
    fresh.load();
    expect(fresh.currentLevel).toBe(Math.min(2, LEVELS.length));
  });

  it('advanceLevel clamps at the last built level', () => {
    gs.currentLevel = LEVELS.length;
    gs.advanceLevel();
    expect(gs.currentLevel).toBe(LEVELS.length);
  });

  it('exposes the LevelDef for the current level', () => {
    expect(gs.currentLevelDef.levelNumber).toBe(gs.currentLevel);
  });

  it('loads legacy saves without currentLevel as level 1', () => {
    // Real v2-release saves (Henry's machine) predate currentLevel
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ coins: 10, keys: [true, false, false, false, false], bestStreak: 3 })
    );
    const fresh = new (GameState as any)();
    fresh.load();
    expect(fresh.currentLevel).toBe(1);
    expect(fresh.coins).toBe(10);
  });

  it('clamps corrupt or future currentLevel values on load', () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ coins: 0, keys: [false, false, false, false, false], bestStreak: 0, currentLevel: 99 })
    );
    const fresh = new (GameState as any)();
    fresh.load();
    expect(fresh.currentLevel).toBe(LEVELS.length);
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
