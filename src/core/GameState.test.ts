import { beforeEach, describe, expect, it } from 'vitest';
import { COMBAT, CONSUMABLES, PLAYER, SHOP, SWORDS, WORLD, ZOMBIE } from '../config';
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
  gs.maxUnlockedLevel = 1;
  gs.swordIndex = 0;
  gs.potions = 0;
  gs.shieldHits = 0;
  gs.lives = 0;
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

  it('loads keyless legacy saves as level 1 with coins intact', () => {
    // Real v2-release saves (Henry's machine) predate currentLevel
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ coins: 10, keys: [false, false, false, false, false], bestStreak: 3 })
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

  it('advanceLevel raises the unlock high-water mark', () => {
    gs.advanceLevel();
    expect(gs.maxUnlockedLevel).toBe(gs.currentLevel);
  });

  it('replaying a lower level never lowers maxUnlockedLevel', () => {
    gs.maxUnlockedLevel = LEVELS.length;
    gs.replayLevel(1);
    expect(gs.currentLevel).toBe(1);
    expect(gs.maxUnlockedLevel).toBe(LEVELS.length);
    const fresh = new (GameState as any)();
    fresh.load();
    expect(fresh.maxUnlockedLevel).toBe(LEVELS.length);
    expect(fresh.currentLevel).toBe(1);
  });

  it('replayLevel cannot jump past the unlock', () => {
    gs.maxUnlockedLevel = 1;
    gs.replayLevel(99);
    expect(gs.currentLevel).toBe(1);
  });

  it('legacy saves default maxUnlockedLevel to currentLevel', () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ coins: 0, keys: [false, false, false, false, false], bestStreak: 0, currentLevel: 1 })
    );
    const fresh = new (GameState as any)();
    fresh.load();
    expect(fresh.maxUnlockedLevel).toBe(fresh.currentLevel);
  });

  it('legacy saves with earned keys unlock the levels those keys prove', () => {
    // Henry beat Level 1 on the old build: key #1 saved, no level tracking
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ coins: 25, keys: [true, false, false, false, false], bestStreak: 4 })
    );
    const fresh = new (GameState as any)();
    fresh.load();
    expect(fresh.currentLevel).toBe(Math.min(2, LEVELS.length));
    expect(fresh.maxUnlockedLevel).toBe(Math.min(2, LEVELS.length));
  });

  it('modern saves do not derive currentLevel from keys (replays stay put)', () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        coins: 0,
        keys: [true, false, false, false, false],
        bestStreak: 0,
        currentLevel: 1,
        maxUnlockedLevel: Math.min(2, LEVELS.length),
      })
    );
    const fresh = new (GameState as any)();
    fresh.load();
    expect(fresh.currentLevel).toBe(1);
    expect(fresh.maxUnlockedLevel).toBe(Math.min(2, LEVELS.length));
  });
});

describe('consumableState', () => {
  it('reports owned/cap/atCap for count-based consumables', () => {
    gs.potions = 2;
    expect(gs.consumableState('potion')).toEqual({ owned: 2, cap: 3, atCap: false });
    gs.potions = 3;
    expect(gs.consumableState('potion')).toEqual({ owned: 3, cap: 3, atCap: true });
    gs.lives = 0;
    expect(gs.consumableState('life')).toEqual({ owned: 0, cap: 2, atCap: false });
  });

  it('treats shield as owned while any charge remains', () => {
    gs.shieldHits = 0;
    expect(gs.consumableState('shield')).toEqual({ owned: 0, cap: 1, atCap: false });
    gs.shieldHits = 2;
    expect(gs.consumableState('shield')).toEqual({ owned: 1, cap: 1, atCap: true });
  });
});

describe('shop purchases', () => {
  it('buySword upgrades when coins cover the next tier and persists', () => {
    gs.coins = SWORDS[1].cost;

    expect(gs.buySword()).toBe(true);

    expect(gs.coins).toBe(0);
    expect(gs.swordIndex).toBe(1);
    const fresh = new (GameState as any)();
    fresh.load();
    expect(fresh.swordIndex).toBe(1);
  });

  it('buySword fails without enough coins and leaves state unchanged', () => {
    gs.coins = SWORDS[1].cost - 1;

    expect(gs.buySword()).toBe(false);

    expect(gs.coins).toBe(SWORDS[1].cost - 1);
    expect(gs.swordIndex).toBe(0);
  });

  it('buySword fails at the max tier and leaves state unchanged', () => {
    gs.swordIndex = SWORDS.length - 1;
    gs.coins = 9999;

    expect(gs.buySword()).toBe(false);

    expect(gs.coins).toBe(9999);
    expect(gs.swordIndex).toBe(SWORDS.length - 1);
  });

  it('currentSword and swordDamage derive from the selected sword tier', () => {
    gs.swordIndex = 2;

    expect(gs.currentSword).toBe(SWORDS[2]);
    expect(gs.swordDamage).toBe(SWORDS[2].damage);
  });

  it('buyConsumable buys potions and respects the potion cap', () => {
    gs.coins = CONSUMABLES.potion.cost;

    expect(gs.buyConsumable('potion')).toBe(true);
    expect(gs.coins).toBe(0);
    expect(gs.potions).toBe(1);

    gs.potions = CONSUMABLES.potion.cap;
    gs.coins = CONSUMABLES.potion.cost;
    expect(gs.buyConsumable('potion')).toBe(false);
    expect(gs.coins).toBe(CONSUMABLES.potion.cost);
    expect(gs.potions).toBe(CONSUMABLES.potion.cap);
  });

  it('buyConsumable buys extra lives and respects the life cap', () => {
    gs.coins = CONSUMABLES.life.cost;

    expect(gs.buyConsumable('life')).toBe(true);
    expect(gs.coins).toBe(0);
    expect(gs.lives).toBe(1);

    gs.lives = CONSUMABLES.life.cap;
    gs.coins = CONSUMABLES.life.cost;
    expect(gs.buyConsumable('life')).toBe(false);
    expect(gs.coins).toBe(CONSUMABLES.life.cost);
    expect(gs.lives).toBe(CONSUMABLES.life.cap);
  });

  it('buyConsumable buys shields only at zero shield hits', () => {
    gs.coins = CONSUMABLES.shield.cost;

    expect(gs.buyConsumable('shield')).toBe(true);
    expect(gs.coins).toBe(0);
    expect(gs.shieldHits).toBe(SHOP.shieldCharges);

    gs.coins = CONSUMABLES.shield.cost;
    expect(gs.buyConsumable('shield')).toBe(false);
    expect(gs.coins).toBe(CONSUMABLES.shield.cost);
    expect(gs.shieldHits).toBe(SHOP.shieldCharges);
  });

  it('buyConsumable fails when coins do not cover the consumable cost', () => {
    gs.coins = CONSUMABLES.potion.cost - 1;

    expect(gs.buyConsumable('potion')).toBe(false);

    expect(gs.coins).toBe(CONSUMABLES.potion.cost - 1);
    expect(gs.potions).toBe(0);
  });
});

describe('shop persistence', () => {
  function loadSave(extra: Record<string, unknown>) {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        coins: 0,
        keys: [false, false, false, false, false],
        bestStreak: 0,
        currentLevel: 1,
        maxUnlockedLevel: 1,
        ...extra,
      })
    );
    const fresh = new (GameState as any)();
    fresh.load();
    return fresh as GameState;
  }

  it('save and load roundtrip persists sword and consumable fields', () => {
    gs.swordIndex = 3;
    gs.potions = 2;
    gs.shieldHits = 1;
    gs.lives = 2;
    gs.save();

    const fresh = new (GameState as any)();
    fresh.load();

    expect(fresh.swordIndex).toBe(3);
    expect(fresh.potions).toBe(2);
    expect(fresh.shieldHits).toBe(1);
    expect(fresh.lives).toBe(2);
  });

  it('loads legacy saves without shop fields with shop defaults', () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ coins: 10, keys: [false, false, false, false, false], bestStreak: 3 })
    );

    const fresh = new (GameState as any)();
    fresh.load();

    expect(fresh.swordIndex).toBe(0);
    expect(fresh.potions).toBe(0);
    expect(fresh.shieldHits).toBe(0);
    expect(fresh.lives).toBe(0);
  });

  it('clamps oversized swordIndex to the max sword tier', () => {
    expect(loadSave({ swordIndex: 99 }).swordIndex).toBe(SWORDS.length - 1);
  });

  it('clamps negative swordIndex to the starting sword tier', () => {
    expect(loadSave({ swordIndex: -1 }).swordIndex).toBe(0);
  });

  it('rejects non-integer potion counts to zero', () => {
    expect(loadSave({ potions: 7.5 }).potions).toBe(0);
  });

  it('rejects null lives to zero', () => {
    expect(loadSave({ lives: null }).lives).toBe(0);
  });

  it('clamps negative lives to zero', () => {
    expect(loadSave({ lives: -1 }).lives).toBe(0);
  });

  it('clamps oversized potion counts to the potion cap', () => {
    expect(loadSave({ potions: 99 }).potions).toBe(CONSUMABLES.potion.cap);
  });

  it('clamps shield hits to the configured shield charge range', () => {
    expect(loadSave({ shieldHits: -1 }).shieldHits).toBe(0);
    expect(loadSave({ shieldHits: SHOP.shieldCharges + 10 }).shieldHits).toBe(SHOP.shieldCharges);
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
