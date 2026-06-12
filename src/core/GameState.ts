import { COMBAT, CONSUMABLES, PLAYER, SHOP, SWORDS, type ConsumableKind } from '../config';
import { LEVELS, levelByNumber, type LevelDef } from '../levels';

const SAVE_KEY = 'zombie-hunters-save-v2';

interface SaveData {
  coins: number;
  keys: boolean[];
  bestStreak: number;
  currentLevel: number;
  maxUnlockedLevel: number;
  swordIndex: number;
  potions: number;
  shieldHits: number;
  lives: number;
}

// Run + persistent state. Coins/keys/best streak survive page reloads via localStorage.
export class GameState {
  private static instance: GameState;

  health = PLAYER.maxHealth;
  maxHealth = PLAYER.maxHealth;
  coins = 0;
  keys: boolean[] = [false, false, false, false, false];
  swordIndex = 0;
  potions = 0;
  shieldHits = 0;
  lives = 0;
  currentLevel = 1; // the level being played (replays move it back)
  maxUnlockedLevel = 1; // unlock high-water mark — never decreases

  // Kill streak (combo meter)
  streak = 0;
  streakExpiresAt = 0;
  bestStreak = 0;

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
      GameState.instance.load();
    }
    return GameState.instance;
  }

  registerKill(now: number): number {
    this.streak = now < this.streakExpiresAt ? this.streak + 1 : 1;
    this.streakExpiresAt = now + COMBAT.streakWindowMs;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    return this.streak;
  }

  currentStreak(now: number): number {
    return now < this.streakExpiresAt ? this.streak : 0;
  }

  collectKey(index: number) {
    this.keys[index] = true;
    this.save();
  }

  get keyCount(): number {
    return this.keys.filter(Boolean).length;
  }

  get currentSword() {
    return SWORDS[this.swordIndex];
  }

  get swordDamage(): number {
    return this.currentSword.damage;
  }

  buySword(): boolean {
    const nextSwordIndex = this.swordIndex + 1;
    if (nextSwordIndex >= SWORDS.length) return false;

    const nextSword = SWORDS[nextSwordIndex];
    if (this.coins < nextSword.cost) return false;

    this.coins -= nextSword.cost;
    this.swordIndex = nextSwordIndex;
    this.save();
    return true;
  }

  // Single source of truth for shop/HUD inventory display: how many of a
  // consumable the player owns and whether more can be bought. Shield is
  // special — it is "owned" while any charge remains and rebuyable only at 0.
  consumableState(kind: ConsumableKind): { owned: number; cap: number; atCap: boolean } {
    const cap = CONSUMABLES[kind].cap;
    if (kind === 'shield') {
      return { owned: this.shieldHits > 0 ? 1 : 0, cap, atCap: this.shieldHits !== 0 };
    }
    const owned = kind === 'potion' ? this.potions : this.lives;
    return { owned, cap, atCap: owned >= cap };
  }

  buyConsumable(kind: ConsumableKind): boolean {
    const item = CONSUMABLES[kind];
    if (this.coins < item.cost) return false;

    if (kind === 'potion') {
      if (this.potions >= item.cap) return false;
      this.coins -= item.cost;
      this.potions += 1;
    } else if (kind === 'life') {
      if (this.lives >= item.cap) return false;
      this.coins -= item.cost;
      this.lives += 1;
    } else if (kind === 'shield') {
      if (this.shieldHits !== 0) return false;
      this.coins -= item.cost;
      this.shieldHits = SHOP.shieldCharges;
    } else {
      return false;
    }

    this.save();
    return true;
  }

  // Level beaten: move to the next built level (sticks at the last one) and save.
  advanceLevel() {
    this.currentLevel = Math.min(this.currentLevel + 1, LEVELS.length);
    this.maxUnlockedLevel = Math.max(this.maxUnlockedLevel, this.currentLevel);
    this.save();
  }

  // Replay a cleared level without losing unlock progress.
  replayLevel(n: number) {
    this.currentLevel = Math.min(Math.max(n, 1), this.maxUnlockedLevel);
    this.save();
  }

  get currentLevelDef(): LevelDef {
    return levelByNumber(this.currentLevel);
  }

  heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  // Fresh attempt at a level: full health, streak cleared; coins/keys persist.
  resetRun() {
    this.health = this.maxHealth;
    this.streak = 0;
    this.streakExpiresAt = 0;
  }

  save() {
    const data: SaveData = {
      coins: this.coins,
      keys: this.keys,
      bestStreak: this.bestStreak,
      currentLevel: this.currentLevel,
      maxUnlockedLevel: this.maxUnlockedLevel,
      swordIndex: this.swordIndex,
      potions: this.potions,
      shieldHits: this.shieldHits,
      lives: this.lives,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Storage unavailable (private mode) — play on without persistence
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as SaveData;
      const clampInteger = (value: unknown, fallback: number, min: number, max: number) => {
        const n = value ?? fallback;
        return Number.isInteger(n) ? Math.min(Math.max(n as number, min), max) : fallback;
      };
      this.coins = data.coins ?? 0;
      this.keys = Array.isArray(data.keys) && data.keys.length === 5 ? data.keys : this.keys;
      this.bestStreak = data.bestStreak ?? 0;
      this.swordIndex = clampInteger(data.swordIndex, 0, 0, SWORDS.length - 1);
      this.potions = clampInteger(data.potions, 0, 0, CONSUMABLES.potion.cap);
      this.shieldHits = clampInteger(data.shieldHits, 0, 0, SHOP.shieldCharges);
      this.lives = clampInteger(data.lives, 0, 0, CONSUMABLES.life.cap);
      // Legacy v2-release saves predate currentLevel; clamp anything weird to built levels
      const lvl = (data as { currentLevel?: unknown }).currentLevel;
      this.currentLevel = Number.isInteger(lvl)
        ? Math.min(Math.max(lvl as number, 1), LEVELS.length)
        : 1;
      // Keys are earned sequentially, so they prove progress — a save that
      // predates level tracking but holds key #1 has beaten Level 1
      const keysUnlock = Math.min(1 + this.keys.filter(Boolean).length, LEVELS.length);
      const maxLvl = (data as { maxUnlockedLevel?: unknown }).maxUnlockedLevel;
      if (!Number.isInteger(maxLvl)) {
        this.currentLevel = Math.max(this.currentLevel, keysUnlock);
      }
      this.maxUnlockedLevel = Math.min(
        Math.max(
          Number.isInteger(maxLvl) ? (maxLvl as number) : 1,
          this.currentLevel,
          keysUnlock
        ),
        LEVELS.length
      );
    } catch {
      // Corrupt save — start fresh
    }
  }
}
