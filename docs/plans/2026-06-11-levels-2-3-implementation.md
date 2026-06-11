# Levels 2 & 3 Implementation Plan

> **For Claude:** You MUST invoke the Skill tool with `skill="evernest-superpowers:executing-plans"` before starting any task. Do NOT execute tasks directly — the skill handles tracking, code review, and batch checkpoints.

**Goal:** Build Level 2 (Broken Down Forest) and Level 3 (Abandoned Railroad) on the v2 engine, with a shared level base so future levels are mostly data + theme, and wire Victory → next-level progression.

**Architecture:** Extract an abstract `BaseLevelScene` from `Level1Scene` (combat wiring, boss encounter, pickups, update loop) driven by a per-level `LevelDef` data object in a new `src/levels.ts` registry. New zombie types are tint/scale/stat variants of the two existing sprite packs (no new art on disk). `Boss` is generalized to a `BossDef` config with an optional minion-summon attack for the Level 2 horde boss. All new art is procedural (PreloadScene recipes + `bakeTint` parallax re-tints), matching the v2 approach.

**Tech Stack:** Phaser 3.90 + TypeScript + Vite, vitest for pure-logic tests, agent-browser for automated playtests.

**Not tracked in Linear** — this is the personal Henry game project; prior plans in this repo are local-only.

**Reviewed:** multi-reviewer design review (Claude + Gemini + Codex, round 1, 2026-06-11) — 1 critical and 5 major findings incorporated below.

## Execution status (session ended 2026-06-11, Tasks 0-8 DONE)

Executed via `executing-plans` in the git worktree `.claude/worktrees/levels-2-3` on branch
`feat/levels-2-3` (13 commits ahead of local `main`). Every task was implemented by a subagent,
reviewed by the 3-model `/pr-review` loop (Claude+Gemini+Codex), fixed, and playtested. All green:
33 vitest tests, tsc clean, Levels 1 AND 2 verified playable end-to-end in the browser.

- [DONE] Task 0 — branch `feat/levels-2-3` (worktree; fast-forwarded to local main — see gotchas)
- [DONE] Task 1 — `src/levels.ts` registry + invariant tests (`3dfe134`, fixes `c32a5be`)
- [DONE] Task 2 — GameState.currentLevel (`1e96c6e`)
- [DONE] Task 3 — BaseLevelScene extraction, L1 = 74 lines (`df98216`, fixes `bcfdb0b`)
- [DONE] Task 4 — level-aware routing + number-key level select (`c82d626`)
- [DONE] Task 5 — disgusting/zanter variant table (`c953d7d`, fixes `3e6df85`)
- [DONE] Task 6 — BossDef + SUMMONING state + minion waves (`fa1d0c2`, fixes `22647a0`)
- [DONE] Task 7 — forest textures + mossy parallax bakes (`b6b9614`)
- [DONE] Task 8 — Level 2 Broken Down Forest, full 8-point playtest pass (`4983e1f`, fixes `4927e9a`)
- [DONE] Task 9 — railroad textures (`237c339`; review clean, 1 structural note surfaced below)
- [DONE] Task 10 — Level 3 + train sequence (`139ce5f`, fixes `422ae57`; chain L2→L3 flipped)
- [DONE] Task 11 — full-progression playtest: Canvas 17/17 PASS (incl. legit L1 boss fight,
  listener dedupe, legacy-save migration, replay locks); WebGL headed 10/11 PASS + FPS flag
  resolved (agent-browser Chromium caps rAF at 30Hz — production build identical, engine healthy)
- [DONE] Task 12 — docs + merge `feat/levels-2-3` → main
- [EXTRA] Level 1 boss tuned easier with Henry (`07057a2`): hp 230, contact 16, attacks 2.5s/1.8s.
  Playtest verdict: "appropriately challenging, slightly forgiving."

### Session 2 (2026-06-11) review-fix notes
- Codex caught the L3 Zanter at x=2900 spawning with a stair stone fully inside its body —
  relocated to x=2560 (clear ground; comment in levels.ts documents the geometry).
- Gemini caught fog drift multiplying ABSOLUTE elapsed time (fog teleport when the multiplier
  changed) — replaced with a `fogTime` delta accumulator in BaseLevelScene.
- Walkable train roofs are 192px (`TRAIN.roofW`, 6×32 slabs) even though the loco body is 200px —
  data + tests now model this; real loco→car-1 gap is 18px.
- Surfaced, not auto-fixed: PreloadScene is becoming a texture monolith — consider extracting
  per-theme generators to `src/art/*.ts` before Level 4 (Gemini, structural).

### Decisions & contract changes made during execution (beyond the plan text)

- **`GameState.maxUnlockedLevel`** (unlock high-water mark) + `replayLevel(n)` — replaying a lower
  level moves `currentLevel` (so GameOver retries it) but never lowers the unlock. MainMenu gates
  level-select and the hint on `maxUnlockedLevel`.
- **Legacy save migration**: saves predating level tracking derive progress from earned keys
  (key #1 ⇒ level 2 unlocked & resumed). Modern saves never re-derive (replays stay put).
- **Sprite `setTint` is a silent no-op on the Canvas renderer** (verified against Phaser source —
  zero tint refs in the canvas renderer). Variant/boss colors are a WebGL nicety; on canvas they
  degrade to scale/behavior identity, same bucket as the hit-flash and Light2D. Task 12 must add
  this to CLAUDE.md's gotchas (the existing gotcha only mentions TileSprite).
- **`flashSprite` restore tints resolve at restore time** (4th arg accepts `number | (() => ...)`),
  and Boss has a state-aware `currentBaseTint()` so hits during telegraphs restore the warning
  color. Enrage check runs BEFORE the flash in `takeDamage` (enraging hit keeps the red).
- **Summon tuning lives in config.BOSS**: `summonTelegraphMs: 500`, `summonOpeningGraceMs: 2500`;
  first-summon time = `max(grace, attackIntervalMs + 300)` so slow bosses still open with a charge.
- **Spawn heights are variant-aware** (`BaseLevelScene.zombieSpawnY`) so scaled bodies (Zanter)
  don't embed in the ground; summoned minions never materialize within 70px of the player.
- **BossDef invariant tests** added to `levels.test.ts` (summon counts/cap/interval sanity,
  at-least-one-attack, enraged-faster ordering).
- Level 2 def deltas from plan: second spawn moved 565 → 590 (was clipping the first stair stone);
  moonbeams `setScale(1, 1.6)` so the shaft reaches the ground, lights tweened (NOT flickerLights —
  moonlight shouldn't strobe like fire).

### Tooling gotchas hit this session (will bite Tasks 9-12 too)

- This machine's `prefer-serena-advisory` PreToolUse hook errors on bare `grep`/`rg` — use
  `git grep` (or awk/Read). `destructive-cmd-guard` blocks `git reset --hard` — use
  `git merge --ff-only` for fast-forwards.
- `origin/main` is 3 commits BEHIND local `main` (the v2 rebuild was never pushed). Fresh worktrees
  branch from origin — fast-forward them to local `main` first.
- IDE/TS diagnostics in this session often reflected the MAIN checkout, not the worktree — trust
  `npx tsc --noEmit` run inside the worktree.
- Phaser 3.90 typings: `Geom.Rectangle` needs an `as unknown as RandomZoneSource` cast for particle
  `emitZone` (runtime-correct; verified against Phaser source — see Level2Scene).

### Task 12 additions discovered in review

- CLAUDE.md gotchas: sprite tint is WebGL-only (not just TileSprite); update "Adding a New Level"
  to the def-based recipe; amend the shop step (shops are a separate post-Level-3 milestone — the
  L1→L2 transition is intentionally shopless for now).
- Open product questions for Henry (defaults shipped): Pack-King-as-horde interpretation works
  great in playtest; static train (Task 10) still pending his sign-off; horde packs pull 4-5
  zombies at once — numerically fair (i-frames cap DPS) but check the "surrounded" feel with him.

> **Repo constraints (read before any commit):**
> - The pre-commit hook requires tests *written and run in the session* before `git commit`. Run `npm test` immediately before committing, in the same session.
> - A bash hook blocks `&&` / `;` / multiline shell commands. Run every command separately (e.g., `git add ...` then `git commit ...` as two calls).
> - This is a Phaser game with no deploy step; verification is the automated agent-browser playtest (the repo's established pattern), not Playwright. Headless agent-browser renders Canvas; use `--headed --session <name>` to verify WebGL (lights/postFX).
> - **Vitest runs in plain Node — Phaser cannot be imported in any module a test transitively touches** (`window is not defined`). `levels.ts`, `config.ts`, `GameState.ts` must stay Phaser-free; use `import type` for any type that lives near entity code.
> - **Every commit must leave the repo green** (tsc + vitest). Tests are written relative to what's built at that point (e.g., relative to `LEVELS.length`), not the final 3-level state.

## Questions for Henry & Josh (product calls — defaults chosen, easy to change)

1. **Horde boss interpretation:** the spec says the L2 boss is "a zombie pack". This plan builds a single **Zombie Pack King** who continuously summons his pack at you — better fight readability than 8 simultaneous HP bars. Henry should confirm (or rename him!).
2. **The train doesn't physically move:** Henry's spec says you "board a zombie-driven train". The plan builds a parked-but-"moving" train (speed lines, smoke, rushing parallax, a zombie driver) because moving-platform physics is a bug factory. Confirm this reads as awesome rather than as a downgrade.
3. **Replaying beaten levels:** MainMenu gains number-key level select for unlocked levels (press 1/2/3) so Henry can replay the city. Default is in; trivially removable.

---

## Pre-implementation: workspace setup

### Task 0: Create feature branch

**Executor:** orchestrator *(one git command)*

**Depends On:** none

The working tree is clean on `main`. This is a solo repo with no parallel work in flight, so an in-place feature branch is sufficient (no separate worktree needed).

**Step 1:** `git checkout -b feat/levels-2-3`

**Acceptance (BLOCKING):** on branch `feat/levels-2-3` before any implementation task runs. All work lands on this branch and merges back to `main` at the end (Task 12).

---

## Phase 1 — Shared foundation

### Task 1: Level registry (`src/levels.ts`) with Level 1 data extracted

**Executor:** claude-subagent *(new shared contract consumed by every later task)*

**Depends On:** Task 0

**Files:**
- Create: `src/levels.ts`
- Create: `src/levels.test.ts`
- Modify: `src/config.ts` (add `ZombieVariant` type; remove `BOSS.arenaLeft` / `BOSS.triggerX`; **remove `WORLD.width`** — both become per-level so the compiler finds every straggler)
- Modify: `src/scenes/Level1Scene.ts` (point its `WORLD.width` / `BOSS.arenaLeft` / `BOSS.triggerX` reads at the def — keeps the repo green until Task 3 replaces the scene wholesale)

The registry holds everything that differs between levels as *data*. Theme-specific scene code (texture recipes, ambience) stays in scene subclasses. Layout invariants from the Gotchas section become unit tests.

**Step 1: Add the variant type to config** (Phaser-free home for it; `Zombie.ts` switches to importing it in Task 5):

```ts
// src/config.ts
export type ZombieVariant = 'zombie' | 'urban'; // widened with 'disgusting' | 'zanter' in Task 5
```

**Step 2: Write the contract and Level 1's def**

```ts
// src/levels.ts — MUST stay Phaser-free (vitest imports it)
import { Assets } from './assets';
import type { ZombieVariant } from './config';

export interface ZombieSpawn {
  x: number;
  variant: ZombieVariant;
  y?: number; // optional explicit spawn height (train roofs); default is groundY - 56
}

export interface BossDef {
  name: string;            // HUD banner text, e.g. 'MUTATED ZOMBIE'
  hp: number;
  scale: number;
  tint?: number;           // omit for no tint
  walkSpeed: number;
  enragedWalkSpeed: number;
  contactDamage: number;
  attackIntervalMs: number;
  enragedAttackIntervalMs: number;
  throneTexture: string;   // Assets key
  canCharge: boolean;      // telegraphed charge into walls
  canLeap: boolean;        // enraged jump-slam + shockwave
  summon?: {
    variant: ZombieVariant;
    count: number;         // minions per summon (pre-enrage)
    enragedCount: number;
    maxAlive: number;      // cap on live (non-dying) minions
    intervalMs: number;    // time between summons
  };
}

export interface LevelDef {
  sceneKey: string;        // Phaser scene key — BaseLevelScene derives its key from this
  levelNumber: number;     // 1-based
  name: string;            // 'THE ABANDONED CITY' — intro banner + Victory title
  victorySubtitle: string;
  nextSceneKey: string;    // next level's sceneKey, or 'MainMenu' after the last BUILT level
  keyIndex: number;        // GameState.keys slot (levelNumber - 1)
  worldWidth: number;      // WORLD.height/groundY stay global
  playerSpawnX: number;
  ambientColor: number;    // Light2D ambient
  parallax: Array<{ key: string; factor: number }>; // baked night textures, far→near
  textures: {
    groundTop: string;
    groundFill: string;
    platform: string;
    stone: string;
  };
  platforms: Array<[x: number, y: number, count: number]>;
  stairs: Array<[startX: number, baseY: number, steps: number, stepH: number, stepOff: number]>;
  zombieSpawns: ZombieSpawn[];
  boss: BossDef;
  bossSpawnX: number;
  triggerX: number;        // player x that starts the boss cinematic
  arenaLeft: number;       // world/camera bounds lock during boss fight
}

export const LEVELS: LevelDef[] = [levelOne]; // levelTwo appended in Task 8, levelThree in Task 10

export function levelByNumber(n: number): LevelDef {
  return LEVELS[Math.min(Math.max(n, 1), LEVELS.length) - 1];
}
```

Level 1's def is a literal extraction of the constants currently inside `Level1Scene.ts` (positions list at line 100, platforms at 217, stairs at 233, boss numbers from `config.ts`):

```ts
const levelOne: LevelDef = {
  sceneKey: 'Level1',
  levelNumber: 1,
  name: 'THE ABANDONED CITY',
  victorySubtitle: 'The Abandoned City is yours',
  nextSceneKey: 'MainMenu', // flipped to 'Level2' in Task 8 — the chain test enforces honesty about what's built
  keyIndex: 0,
  worldWidth: 3200,
  playerSpawnX: 100,
  ambientColor: 0x595972,
  parallax: [
    { key: Assets.RUIN_NIGHT_FAR, factor: 0.12 },
    { key: Assets.RUIN_NIGHT_MID, factor: 0.3 },
    { key: Assets.RUIN_NIGHT_NEAR, factor: 0.55 },
  ],
  textures: {
    groundTop: Assets.GROUND_TOP,
    groundFill: Assets.GROUND_FILL,
    platform: Assets.PLATFORM,
    stone: Assets.STONE,
  },
  platforms: [
    [300, 400, 5], [700, 310, 4], [1100, 355, 6],
    [1600, 310, 4], [2000, 400, 5], [2500, 310, 3],
  ],
  stairs: [
    [450, 408, 4, 40, 50], [950, 412, 3, 40, 55],
    [1400, 408, 5, 35, 45], [2100, 408, 4, 40, 55],
  ],
  zombieSpawns: [500, 700, 950, 1250, 1550, 1850, 2150, 2450].map((x, i) => ({
    x,
    variant: (i % 3 === 2 ? 'urban' : 'zombie') as ZombieVariant,
  })),
  boss: {
    name: 'MUTATED ZOMBIE',
    hp: 260, scale: 1.8,
    walkSpeed: 90, enragedWalkSpeed: 135,
    contactDamage: 20,
    attackIntervalMs: 2200, enragedAttackIntervalMs: 1500,
    throneTexture: Assets.THRONE,
    canCharge: true, canLeap: true,
  },
  bossSpawnX: 2950,
  triggerX: 2700,
  arenaLeft: 2600,
};
```

**Step 3: Write the failing layout-invariant tests**

These encode the Gotchas as executable rules so Levels 2/3 can't reintroduce known bugs. Written relative to `LEVELS.length` so they stay green at every commit:

```ts
// src/levels.test.ts
import { describe, expect, it } from 'vitest';
import { LEVELS, levelByNumber } from './levels';
import { WORLD } from './config';

describe('level registry integrity', () => {
  it('level numbers and key indexes are sequential from 1 / 0', () => {
    LEVELS.forEach((def, i) => {
      expect(def.levelNumber).toBe(i + 1);
      expect(def.keyIndex).toBe(i);
    });
  });

  it('scene keys are unique and the victory chain links each level to the next', () => {
    const keys = LEVELS.map((d) => d.sceneKey);
    expect(new Set(keys).size).toBe(keys.length);
    LEVELS.slice(0, -1).forEach((def, i) => {
      expect(def.nextSceneKey).toBe(LEVELS[i + 1].sceneKey);
    });
    expect(LEVELS[LEVELS.length - 1].nextSceneKey).toBe('MainMenu');
  });

  it('boss geometry is ordered: arenaLeft < triggerX < bossSpawnX < worldWidth', () => {
    for (const def of LEVELS) {
      expect(def.arenaLeft).toBeLessThan(def.triggerX);
      expect(def.triggerX).toBeLessThan(def.bossSpawnX);
      expect(def.bossSpawnX).toBeLessThan(def.worldWidth);
    }
  });

  it('first zombie spawns outside aggro+patrol reach of the player spawn (spawn-camp gotcha)', () => {
    for (const def of LEVELS) {
      const firstX = Math.min(...def.zombieSpawns.map((s) => s.x));
      expect(firstX - def.playerSpawnX).toBeGreaterThanOrEqual(350);
    }
  });

  it('all spawns sit inside the world, and explicit spawn heights are above ground', () => {
    for (const def of LEVELS) {
      for (const s of def.zombieSpawns) {
        expect(s.x).toBeGreaterThan(0);
        expect(s.x).toBeLessThan(def.worldWidth - 100);
        if (s.y !== undefined) {
          expect(s.y).toBeGreaterThan(100);
          expect(s.y).toBeLessThan(WORLD.groundY - 60);
        }
      }
    }
  });

  it('floating geometry leaves >56px under it (player-wedge gotcha)', () => {
    for (const def of LEVELS) {
      // platform tile is 32x16 centered at y → bottom = y + 8; need groundY - bottom > 56
      for (const [, y] of def.platforms) {
        expect(WORLD.groundY - (y + 8)).toBeGreaterThan(56);
      }
      // stepping stone is 36x14 centered at baseY → bottom = baseY + 7
      for (const [, baseY] of def.stairs) {
        expect(WORLD.groundY - (baseY + 7)).toBeGreaterThan(56);
      }
    }
  });

  it('levelByNumber clamps out-of-range', () => {
    expect(levelByNumber(0)).toBe(LEVELS[0]);
    expect(levelByNumber(99)).toBe(LEVELS[LEVELS.length - 1]);
  });
});
```

**Step 4:** Run `npm test` — new file fails (module doesn't exist yet).

**Step 5:** Implement `src/levels.ts` as above. In `config.ts`: add the `ZombieVariant` type, delete `width` from `WORLD`, delete `arenaLeft`/`triggerX` from `BOSS`. Then fix every compiler error in `Level1Scene.ts` by importing `levelByNumber` and reading from `const def = levelByNumber(1)`:
- `Level1Scene.ts:78` world bounds and `:90` camera bounds → `def.worldWidth`
- `:95` `new GoreSystem(this, def.worldWidth, WORLD.height, 4)`
- `:211` ground-tile loop bound → `def.worldWidth`
- `:477-478` arena bounds → `def.arenaLeft`, width `def.worldWidth - def.arenaLeft`
- `:600` boss trigger → `def.triggerX`; boss numbers may keep reading `BOSS.*` until Task 6

(This is deliberate duplication for one task's lifespan — Task 3 deletes all of it when the scene is rebuilt on the base class. The point is that **no `WORLD.width` read survives anywhere**; the compiler proves it.)

**Step 6:** Run `npm test` (all pass) and `npx tsc --noEmit` (clean).

**Step 7:** Commit (`git add` then `git commit -m "feat: add data-driven level registry with layout-invariant tests"`).

---

### Task 2: GameState — current-level tracking and progression helpers

**Executor:** claude-subagent *(persistence contract used by all routing)*

**Depends On:** Task 1 *(uses LEVELS for clamping)*

**Files:**
- Modify: `src/core/GameState.ts`
- Modify: `src/core/GameState.test.ts`

**Step 1: Write failing tests.** Note: the existing suite has **no localStorage mocking** — it relies on Node ≥22's built-in `localStorage` plus the try/catch in `save()/load()`. Add a `beforeEach` that calls `localStorage.removeItem('zombie-hunters-save-v2')` and resets `gs.currentLevel = 1` so test order never matters. Tests are written **relative to `LEVELS.length`** so they pass now (length 1) and keep passing as Tasks 8/10 grow the registry:

```ts
import { LEVELS } from '../levels';

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

  it('loads legacy saves without currentLevel as level 1', () => {
    localStorage.setItem('zombie-hunters-save-v2',
      JSON.stringify({ coins: 10, keys: [true, false, false, false, false], bestStreak: 3 }));
    const fresh = new (GameState as any)();
    fresh.load();
    expect(fresh.currentLevel).toBe(1);
    expect(fresh.coins).toBe(10);
  });

  it('clamps corrupt or future currentLevel values on load', () => {
    localStorage.setItem('zombie-hunters-save-v2',
      JSON.stringify({ coins: 0, keys: [false, false, false, false, false], bestStreak: 0, currentLevel: 99 }));
    const fresh = new (GameState as any)();
    fresh.load();
    expect(fresh.currentLevel).toBe(LEVELS.length);
  });
});
```

**Step 2:** Run `npm test` — fails.

**Step 3: Implement.** In `GameState`:
- Add `currentLevel = 1` field; add `currentLevel: number` to `SaveData`; `save()` includes it.
- `load()` validates and clamps:

```ts
const lvl = (data as { currentLevel?: unknown }).currentLevel;
this.currentLevel = Number.isInteger(lvl)
  ? Math.min(Math.max(lvl as number, 1), LEVELS.length)
  : 1;
```

- Add:

```ts
advanceLevel() {
  this.currentLevel = Math.min(this.currentLevel + 1, LEVELS.length);
  this.save();
}

get currentLevelDef(): LevelDef {
  return levelByNumber(this.currentLevel);
}
```

(`GameState → levels.ts` is a one-way dependency; `levels.ts` must never import `GameState`. Both stay Phaser-free. Future note, out of scope: when shops land between levels, routing may move to a `currentSceneKey` string while `currentLevel` becomes "highest unlocked".)

**Step 4:** `npm test` passes; `npx tsc --noEmit` clean.

**Step 5:** Commit.

---

### Task 3: Extract `BaseLevelScene`; Level 1 becomes data + theme

**Executor:** claude-subagent *(cross-file architectural refactor, the riskiest task in the plan)*

**Depends On:** Task 1, Task 2

**Files:**
- Create: `src/scenes/BaseLevelScene.ts`
- Modify: `src/scenes/Level1Scene.ts` (shrinks to ~120 lines; the Task 1 shim duplication is deleted here)

**Constructor pattern — the scene key comes from the def, so they can never drift:**

```ts
export abstract class BaseLevelScene extends Phaser.Scene {
  protected constructor(protected def: LevelDef) {
    super({ key: def.sceneKey });
  }
}
// Level1Scene:
constructor() { super(levelByNumber(1)); }
```

**Subclass contract — these fields MUST be `protected` (reviewers flagged this; they're `private` in Level1Scene today and Levels 2/3 need them):** `def`, `player`, `solids`, `zombies`, `pickups`, `gore`, `juice`, `controls`, `flickerLights`, `fogFar`, `fogNear`, plus `protected fogDriftMultiplier = 1` (Level 3 speeds fog up over the train).

**What moves to the base (from `Level1Scene.ts`), parameterized by `this.def`:**
- All of `create()` except the theme builders: event-listener cleanup (the restart gotcha — keep the `this.events.off(...)` list FIRST, and add `'boss-summon'` to it now), state reset, lights/postFX setup (use `def.ambientColor`), world bounds (`def.worldWidth`), player spawn (`def.playerSpawnX`), camera (`cam.setBounds(0, 0, def.worldWidth, WORLD.height)`), gore (`new GoreSystem(this, def.worldWidth, WORLD.height, 4)`), zombie spawning from `def.zombieSpawns`, pickups + key handling, contact damage, `wireCombatEvents()`, `createBoss()`, player-died → GameOver, HUD launch, audio unlock/music, fade-in, debug toggle.
- **`WORLD.width` no longer exists (deleted in Task 1) — every former read is `this.def.worldWidth`:** ground loop, GoreSystem size, camera bounds, and *both* arena-bounds calls (`def.arenaLeft, 0, def.worldWidth - def.arenaLeft, WORLD.height` for physics AND camera). This was the critical review finding: without it Level 3's boss arena (x 3000-3600) has no floor.
- **Zombie spawner** uses the optional per-spawn height: `const y = spawn.y ?? WORLD.groundY - 56;` (476−56 = 420 — exactly today's Level 1 spawn y, so Level 1 behavior is unchanged; only Level 3's train-roof spawns set `y`).
- Generic `buildBackdropBase()`: sky + moon + parallax layers built from `def.parallax` + the two fog strips (already generic given texture keys; moon/glow stay in base — the blood moon reads across all night levels).
- `buildTerrainBase()`: ground rows + platforms + stairs from `def.platforms`/`def.stairs`/`def.textures` (exactly the loops at Level1Scene.ts:207-243 with texture keys from the def and the loop bound on `def.worldWidth`).
- Boss encounter: `triggerBossEncounter()`, `showBossHealthBar()` (use `def.boss.name`), `onBossDefeated()`, `onKeyCollected()` (use `def.keyIndex`, floatText `KEY #${def.keyIndex + 1}!`, transition to `'Victory'`), all `def.triggerX`/`def.arenaLeft` driven. (`onBossDefeated` gains a minion sweep in Task 6.)
- `applyHit`, `wireBossHit`, `onZombieKilled`, the whole `update()` loop (fog drift multiplied by `this.fogDriftMultiplier`).
- **New:** level intro banner in `create()` — `def.name` as a big monospace title centered at y≈170, `setScrollFactor(0).setDepth(50)`, fade out over ~2.5s (tween alpha 1→0, delay 1400ms).

**Hooks for subclasses:**

```ts
protected abstract buildAmbience(isWebGL: boolean): void; // barrels/rain ↔ fireflies ↔ smoke
protected buildBackdrop(): void { this.buildBackdropBase(); }  // override to add theme props
protected buildTerrain(): void { this.buildTerrainBase(); }    // override to add e.g. train cars
```

`Level1Scene` after the refactor: the constructor above plus `buildAmbience()` containing exactly the current fire barrels / lampposts / rain / lightning code. **No behavior change intended.**

**Step 1:** Create `BaseLevelScene` and refactor `Level1Scene` as above.

**Step 2:** `npx tsc --noEmit` clean; `npm test` passes (existing tests guard the data extraction).

**Step 3: Regression playtest Level 1** (this is the verification for the refactor — spawn a Sonnet subagent per the agent-browser-delegation skill). Start `npm run dev` in background, then drive headless agent-browser through: menu → Enter → "THE ABANDONED CITY" banner shows → player moves/jumps/attacks → kill at least one zombie (gore + coin) → teleport player near x=2650 via `window.game` scene handle → boss cinematic triggers → kill boss (set `boss.health = 1` via eval, then hit) → key drops → collect → Victory screen shows. Also: die once → GameOver appears. Same checks that passed last session must pass now.

**Step 4:** Run `npm test` again in-session, then commit.

---

### Task 4: Level-aware routing — Victory, GameOver, MainMenu

**Executor:** claude-subagent *(touches three scenes against the new GameState contract)*

**Depends On:** Task 2, Task 3

**Files:**
- Modify: `src/scenes/VictoryScene.ts`
- Modify: `src/scenes/GameOverScene.ts` (lines 62, 73: `scene.start('Level1')`)
- Modify: `src/scenes/MainMenuScene.ts` (find the `scene.start('Level1')` call)

**Step 1: VictoryScene** reads `const def = GameState.getInstance().currentLevelDef`:
- Title: `` `LEVEL ${def.levelNumber} CLEARED!` ``
- Subtitle: `def.victorySubtitle`
- Key line: `` `KEY ${def.levelNumber} of 5 COLLECTED` ``
- Prompt + advance handler (one-shot — use `once`, and a `started` guard shared with the gamepad path):

```ts
const next = def.nextSceneKey; // safe at every commit: chain test guarantees it's a built scene or MainMenu
const prompt = next === 'MainMenu'
  ? 'PRESS ENTER — more levels coming soon!'
  : `PRESS ENTER — onward to ${LEVELS[def.levelNumber].name}!`; // def.levelNumber indexes the NEXT level; guarded by the ternary
let started = false;
const go = () => {
  if (started) return;
  started = true;
  SynthAudio.uiSelect();
  if (next !== 'MainMenu') gs.advanceLevel();
  this.scene.start(next);
};
this.input.keyboard!.once('keydown-ENTER', go);
```

- **Gamepad (edge-triggered, not level-triggered):** GameOverScene's polling pattern fires instantly if A is still held from the boss fight. Require a release first:

```ts
let aWasUp = false;
const padCheck = this.time.addEvent({ delay: 80, loop: true, callback: () => {
  const pad = this.input.gamepad?.getPad(0);
  if (!pad) return;
  if (!pad.A) { aWasUp = true; return; }
  if (pad.A && aWasUp) { padCheck.remove(); go(); }
}});
```

**Step 2: GameOverScene** — both `scene.start('Level1')` call sites become `scene.start(GameState.getInstance().currentLevelDef.sceneKey)`. Apply the same release-then-press gamepad fix here (same latent bug).

**Step 3: MainMenuScene** — start goes to `GameState.getInstance().currentLevelDef.sceneKey` (continue where you left off; keys/coins persist, so this matches). **Level select for replay (Question 3's default):** number keys jump to any unlocked level:

```ts
for (let n = 1; n <= LEVELS.length; n++) {
  this.input.keyboard!.on(`keydown-${'ONE TWO THREE FOUR FIVE SIX'.split(' ')[n - 1]}`, () => {
    const gs = GameState.getInstance();
    if (n > gs.currentLevel) return;        // locked
    gs.currentLevel = n;                    // retry/GameOver routing follows the replayed level
    gs.save();
    SynthAudio.uiSelect();
    this.scene.start(levelByNumber(n).sceneKey);
  });
}
```

Add a small hint line under the start prompt: `1-3: replay a cleared level` (rendered only when `gs.currentLevel > 1`).

**Step 4:** `npx tsc --noEmit`; `npm test` (run in-session for the commit gate). Routing correctness is fully exercised in the Task 11 playtest.

**Step 5:** Commit.

---

### Task 5: Zombie variant table — `disgusting` and `zanter`

**Executor:** claude-subagent *(touches config contract + entity)*

**Depends On:** Task 3 *(BaseLevelScene spawns from def.variant strings)*

**Files:**
- Modify: `src/config.ts` (widen `ZombieVariant`; add `ZOMBIE.variants`)
- Modify: `src/assets.ts` (`ZombieAnims` stays keyed by base pack — no change needed if typed `Record<'zombie' | 'urban', ZombieAnimSet>` already)
- Modify: `src/entities/Zombie.ts`
- Modify: `src/fx/Effects.ts` (`flashSprite` gains tint restoration)
- Create: `src/config.test.ts`

Only two sprite packs exist on disk, so new enemies are tint/scale/stat variants (v2 procedural approach). Henry's canon: Level 2 has "disgusting zombies", Level 3 has giant "Zanters".

**Step 1: Failing test**

```ts
// src/config.test.ts
import { describe, expect, it } from 'vitest';
import { ZOMBIE } from './config';
import { ZombieAnims } from './assets';

describe('zombie variant table', () => {
  it('every variant maps to a real animation set and has sane stats', () => {
    for (const [name, v] of Object.entries(ZOMBIE.variants)) {
      expect(ZombieAnims[v.base], `${name} anim base`).toBeDefined();
      expect(v.hp).toBeGreaterThan(0);
      expect(v.scale).toBeGreaterThan(0);
      expect(v.chaseSpeed).toBeGreaterThan(v.patrolSpeed);
      expect(v.contactDamage).toBeGreaterThan(0);
    }
  });

  it('zanters are the big ones', () => {
    expect(ZOMBIE.variants.zanter.scale).toBeGreaterThan(1.3);
    expect(ZOMBIE.variants.zanter.hp).toBeGreaterThan(ZOMBIE.variants.urban.hp);
  });
});
```

**Step 2:** `npm test` fails.

**Step 3: Implement.** In `config.ts`, widen the type and replace `ZOMBIE.hp` with a variants table (keep all other `ZOMBIE` fields as shared behavior tunables):

```ts
export type ZombieVariant = 'zombie' | 'urban' | 'disgusting' | 'zanter';

export interface ZombieVariantDef {
  base: 'zombie' | 'urban'; // which sprite pack + body size to use
  hp: number;
  tint?: number;
  scale: number;
  patrolSpeed: number;
  chaseSpeed: number;
  contactDamage: number;
}

// inside ZOMBIE (the union above is the source of truth):
variants: {
  zombie:     { base: 'zombie', hp: 30, scale: 1,    patrolSpeed: 55, chaseSpeed: 95,  contactDamage: 8 },
  urban:      { base: 'urban',  hp: 50, scale: 1,    patrolSpeed: 55, chaseSpeed: 95,  contactDamage: 8 },
  disgusting: { base: 'zombie', hp: 45, tint: 0x7fd16a, scale: 1.06, patrolSpeed: 65, chaseSpeed: 118, contactDamage: 10 },
  zanter:     { base: 'urban',  hp: 95, tint: 0xcdb892, scale: 1.45, patrolSpeed: 40, chaseSpeed: 72,  contactDamage: 14 },
} satisfies Record<ZombieVariant, ZombieVariantDef>,
```

In `Zombie.ts` (delete its local `ZombieVariant` declaration; `import type { ZombieVariant } from '../config'` and re-export it for compatibility):
- Constructor reads `const v = ZOMBIE.variants[variant]`: texture/anims/body-size from `v.base` (existing urban/zombie branches), then `this.setScale(v.scale)`, `if (v.tint) this.setTint(v.tint)` (sprite tint works on Canvas renderer too — the WebGL-only gotcha is TileSprite tint), hp from `v.hp`. Store `private baseScale = v.scale` and `private baseTint = v.tint`.
- `getDamage()` returns `v.contactDamage`; patrol/chase use `v.patrolSpeed`/`v.chaseSpeed`.
- **Scale restoration (review finding — Codex + Claude):** the lunge-windup tween at `Zombie.ts:196-203` uses absolute `scaleY: 0.92, scaleX: 1.06` and restores `setScale(1)` — a Zanter would permanently shrink to scale 1 (body included) after its first telegraph. Tween to `this.baseScale * 0.92` / `this.baseScale * 1.06` and restore `this.setScale(this.baseScale)`.
- **Tint restoration (review finding — all three reviewers):** `flashSprite` in `fx/Effects.ts` ends with `clearTint()`, erasing variant tints on the first hit. Add an optional `restoreTint?: number` param — on completion, `restoreTint !== undefined ? sprite.setTint(restoreTint) : sprite.clearTint()` (default behavior unchanged). Pass `this.baseTint` at **both** Zombie call sites: `takeDamage` (Zombie.ts:77) and the lunge windup flash (Zombie.ts:195).
- Health-bar y-offset and groan pitch scale with `v.scale` (zanter bar at `y - 46 * scale`; groan pitch `0.6` for zanter — deeper = bigger).

**Step 4:** `npm test` passes; `npx tsc --noEmit` clean.

**Step 5:** Quick visual check (agent-browser, headless ok): eval-spawn a `disgusting` and a `zanter` into Level 1 via `window.game`, hit each once, **and bait the zanter into a lunge** — confirm tint survives the hurt flash AND scale survives the windup tween. No code committed for this check.

**Step 6:** `npm test` in-session, commit.

---

### Task 6: Generalize Boss to `BossDef` + minion-summon attack

**Executor:** claude-subagent *(state-machine surgery with an event contract to the scene)*

**Depends On:** Task 3, Task 5 *(summon spawns variants; base scene owns the listener; uses Task 5's flashSprite restoreTint)*

**Files:**
- Modify: `src/entities/Boss.ts`
- Modify: `src/scenes/BaseLevelScene.ts` (summon listener; pass `def.boss` into Boss; minion sweep on boss defeat)

**Step 1: Boss takes the def.** Constructor becomes `(scene, x, y, juice, def: BossDef)` (use `import type { BossDef } from '../levels'`):
- `hp/scale/tint/walkSpeed/enragedWalkSpeed/contactDamage/attackIntervalMs/enragedAttackIntervalMs/throneTexture` from def (replacing `BOSS.*` reads; `BOSS` keeps shared charge/leap physics: chargeSpeed, windups, stun, shockwave numbers, enrageThreshold).
- Apply `def.tint` at spawn if set.
- **Tint restoration (review finding):** `Boss.takeDamage` (Boss.ts:108) and `startChargeWindup` (Boss.ts:237) both call `flashSprite`, whose `clearTint()` would erase the Pack King's green and the Dirt Mutant's brown on the first hit — and erases the existing enrage tint today (latent bug). Pass `restoreTint: this.enraged ? 0xff6655 : this.def.tint` at **both** call sites, and have `enrage()` keep setting `0xff6655` (it wins over the def tint — rage reads on any palette).
- **Summon gets its own state** (a flash mid-walk isn't a telegraph): add `SUMMONING` to `BossState`, mirroring `CHARGE_WINDUP` — velocity 0, green flash (`0x88ff88`, 500ms), then roar + emit + back to `FIGHTING`. Initialize `nextSummonAt = time + 2500` when the boss enters `FIGHTING` after rising, so the opening move is always a charge the player can read first (parked question 4 — easy to retune).
- Attack selection in `FIGHTING` (replacing the hardcoded mix at Boss.ts:166-175):

```ts
if (this.attackTimer > interval && body.blocked.down) {
  this.attackTimer = 0;
  const wantsSummon = this.def.summon && time >= this.nextSummonAt;
  if (wantsSummon) {
    this.startSummon(time);   // → SUMMONING state; emits after the windup
  } else if (this.def.canLeap && this.enraged && Math.random() < 0.45) {
    this.startLeap(dir);
  } else if (this.def.canCharge) {
    this.startChargeWindup(dir, time);
  }
}
```

- Emit payload (from `startSummon`'s windup completion):

```ts
this.scene.events.emit('boss-summon', {
  x: this.x,
  variant: this.def.summon!.variant,
  count: this.enraged ? this.def.summon!.enragedCount : this.def.summon!.count,
  maxAlive: this.def.summon!.maxAlive,
});
this.nextSummonAt = time + this.def.summon!.intervalMs;
```

**Step 2: BaseLevelScene listener** (registered in `wireCombatEvents`; `'boss-summon'` is already in the Task 3 `events.off` cleanup list). The alive-count must exclude corpses mid-death-animation (they stay `active` for ~3s) or the cap starves during gore-heavy moments:

```ts
this.events.on('boss-summon', ({ x, variant, count, maxAlive }: SummonEvent) => {
  const alive = this.zombies.getChildren()
    .filter((z) => z.active && !(z as Zombie).isDead()).length;
  const room = Math.max(0, maxAlive - alive);
  for (let i = 0; i < Math.min(count, room); i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const zx = Phaser.Math.Clamp(x + side * (90 + i * 30), this.def.arenaLeft + 60, this.def.worldWidth - 60);
    const z = new Zombie(this, zx, WORLD.groundY - 56, variant);
    z.setTarget(this.player);
    z.setDepth(5);
    this.zombies.add(z); // the existing group-vs-solids collider covers new members — no per-minion collider
    dustPuff(this, zx, WORLD.groundY - 10, 8);
  }
});
```

(Minions join `this.zombies`, so player attacks, contact damage, gore, coins, and streaks all work.)

**Step 3: Minions must not outlive the boss (review finding — Codex).** In `onBossDefeated()` (base scene), before the key drops: sweep surviving zombies exactly like `triggerBossEncounter` already does (`getChildren().slice().forEach(z => destroy)`, plus a small `gore.burst` at each for flair — they pop when their king dies) and `contactCooldown.clear()`. Otherwise live minions chew on the player during the slow-mo kill cam and key float.

**Step 4:** Level 1's def has no `summon` and `canCharge/canLeap: true` — behavior identical. `npx tsc --noEmit`; `npm test`.

**Step 5: Playtest check** (headless agent-browser): Level 1 boss fight still works (charge, enrage leap, death; boss keeps no-tint look after hits). Summon path is exercised in Task 8's playtest.

**Step 6:** `npm test` in-session, commit.

---

## Phase 2 — Level 2: Broken Down Forest

### Task 7: Forest textures + parallax re-tint in PreloadScene

**Executor:** claude-subagent *(procedural art following the existing recipe style)*

**Depends On:** Task 0 *(independent of the refactor — pure additions)*

**Files:**
- Modify: `src/assets.ts` (new keys)
- Modify: `src/scenes/PreloadScene.ts` (`generateForestTextures()` private method + bakeTint calls — **both explicitly invoked from `create()` before `scene.start('MainMenu')`;** `create()` currently only calls `generateTextures()` + the city bakes, so forgetting the call site means invisible textures)

**New asset keys:** `FOREST_NIGHT_FAR/MID/NEAR`, `FOREST_GROUND_TOP`, `FOREST_GROUND_FILL`, `LOG_PLATFORM`, `STUMP_STONE`, `DEAD_TREE`, `THRONE_TREE`, `P_FIREFLY`, `MOONBEAM`.

**Step 1: Parallax.** In `create()`, bake the same ruin layers into a mossy palette (overgrown ruined city swallowed by the forest — reuses art we have, reads as decayed forest):

```ts
this.bakeTint(Assets.RUIN_BG_2, Assets.FOREST_NIGHT_FAR, '#3d5240');
this.bakeTint(Assets.RUIN_BG_3, Assets.FOREST_NIGHT_MID, '#2e4231');
this.bakeTint(Assets.RUIN_BG_4, Assets.FOREST_NIGHT_NEAR, '#1f3023');
```

**Step 2: Tile recipes** in `generateForestTextures()` (same graphics style as the city set, 32px tiles):
- `FOREST_GROUND_TOP` 32×32 — dark soil `0x2b2218` body; mossy grass lip on top: 6px band `0x3f5a2e` with a 2px highlight `0x55763c`; a few root cracks `0x1a140e` and moss clumps `0x47643a` like the asphalt cracks.
- `FOREST_GROUND_FILL` 32×32 — packed dirt `0x231b13` with stones `0x32281c` / `0x171108` patches (mirror the city fill recipe with earth tones).
- `LOG_PLATFORM` 32×16 — fallen-log slab: bark `0x4a3826` body, top highlight `0x6a5238`, dark underside `0x2c2218`, two ring-knot dots `0x33271a`.
- `STUMP_STONE` 36×14 — flat mossy stump (rounded rect `0x4a3a28`, moss top band `0x4f6a3c`, bark notches).
- `DEAD_TREE` ~64×150 — background prop (lamppost analog): twisted trunk `0x241c14` 8px wide with 3-4 jagged bare branches (stacked fillRect segments), slight lean. flipX at placement gives variety.
- `THRONE_TREE` 150×140 — Henry's dead-tree throne: a gnarled high-back seat of twisted trunks — two thick side trunks `0x2e2418` curving inward, woven root base (stacked dark rounded rects `0x241c12`), branch "antlers" spiking off the top, a few moss patches `0x44603a`. Same blocky recipe language as the car throne.
- `P_FIREFLY` 3×3 — `particle(Assets.P_FIREFLY, 0xd8ff7a, 3, 3, 0xfdffd0)`.
- `MOONBEAM` 90×300 — vertical light shaft: overlapping fillRect columns of `0xbfd8a8` at alpha 0.04-0.10, widest at top.

**Step 3:** `npx tsc --noEmit`; load the game (agent-browser headless) and confirm no preload errors. Visual confirmation happens with Level 2 itself in Task 8.

**Step 4:** `npm test` in-session, commit.

---

### Task 8: Level2Scene — Broken Down Forest

**Executor:** claude-subagent *(new scene composed from the now-existing base + theme)*

**Depends On:** Task 4, Task 5, Task 6, Task 7

**Files:**
- Create: `src/scenes/Level2Scene.ts`
- Modify: `src/levels.ts` (append `levelTwo`; **flip `levelOne.nextSceneKey` from `'MainMenu'` to `'Level2'`** — the chain test demands exactly this pair of edits)
- Modify: `src/main.ts` (register scene)

**Step 1: Append `levelTwo` def** — hordes come in packs (clusters of spawn x's), per Henry's "zombie hordes" spec:

```ts
const levelTwo: LevelDef = {
  sceneKey: 'Level2',
  levelNumber: 2,
  name: 'THE BROKEN DOWN FOREST',
  victorySubtitle: 'The forest horde is broken',
  nextSceneKey: 'MainMenu', // flipped to 'Level3' in Task 10
  keyIndex: 1,
  worldWidth: 3400,
  playerSpawnX: 100,
  ambientColor: 0x46584a,   // mossy night
  parallax: [
    { key: Assets.FOREST_NIGHT_FAR, factor: 0.12 },
    { key: Assets.FOREST_NIGHT_MID, factor: 0.3 },
    { key: Assets.FOREST_NIGHT_NEAR, factor: 0.55 },
  ],
  textures: {
    groundTop: Assets.FOREST_GROUND_TOP,
    groundFill: Assets.FOREST_GROUND_FILL,
    platform: Assets.LOG_PLATFORM,
    stone: Assets.STUMP_STONE,
  },
  platforms: [
    [350, 395, 4], [800, 320, 5], [1250, 360, 4],
    [1700, 310, 5], [2150, 395, 4], [2650, 330, 4],
  ],
  stairs: [
    [550, 408, 4, 38, 52], [1450, 410, 4, 40, 50], [2350, 408, 5, 36, 46],
  ],
  // Hordes: tight packs of 2-3 with breathing room between packs (14 zombies)
  zombieSpawns: [
    { x: 520, variant: 'disgusting' }, { x: 565, variant: 'zombie' },
    { x: 920, variant: 'disgusting' }, { x: 960, variant: 'disgusting' }, { x: 1005, variant: 'zombie' },
    { x: 1380, variant: 'disgusting' }, { x: 1420, variant: 'zombie' },
    { x: 1800, variant: 'disgusting' }, { x: 1845, variant: 'disgusting' }, { x: 1890, variant: 'urban' },
    { x: 2280, variant: 'disgusting' }, { x: 2320, variant: 'disgusting' },
    { x: 2700, variant: 'urban' }, { x: 2745, variant: 'disgusting' },
  ],
  boss: {
    name: 'ZOMBIE PACK KING',
    hp: 300, scale: 1.7, tint: 0x9fd486,
    walkSpeed: 95, enragedWalkSpeed: 140,
    contactDamage: 18,
    attackIntervalMs: 2400, enragedAttackIntervalMs: 1600,
    throneTexture: Assets.THRONE_TREE,
    canCharge: true, canLeap: false,
    summon: { variant: 'disgusting', count: 2, enragedCount: 3, maxAlive: 4, intervalMs: 7000 },
  },
  bossSpawnX: 3150,
  triggerX: 2900,
  arenaLeft: 2790,
};
```

The horde boss is the pack: the Pack King charges like a brute but keeps calling 2-3 disgusting zombies to swarm you (the new summon mechanic), more and faster when enraged.

**Step 2: `Level2Scene`** extends `BaseLevelScene` (`constructor() { super(levelByNumber(2)); }`):
- `buildBackdrop()`: `super.buildBackdrop()`, then scatter 6-8 `DEAD_TREE` images along the ground at varied x (e.g. 260, 700, 1150, 1600, 2050, 2500, 2950), `setDepth(2)`, random flipX, `lit()` — silhouetted trunks between player and parallax.
- `buildAmbience(isWebGL)`:
  - **Fireflies** (replace fire barrels): 4 drifting emitters at x ∈ [600, 1400, 2200, 3000], y ≈ groundY−120: `P_FIREFLY`, slow wander (`speed: {min: 4, max: 18}`, `lifespan: {min: 2500, max: 5000}`, `alpha: {start: 0.9, end: 0}`, `frequency: 260`, wide emit zone `{ source: new Phaser.Geom.Rectangle(-120, -90, 240, 160) }`). If WebGL: one soft green light per cluster (`0xaaffaa`, radius 150, intensity 0.55) pushed into the (now `protected`) `flickerLights` for the existing flicker update.
  - **Moonbeams** (replace lampposts): 3 `MOONBEAM` images at x ∈ [900, 1900, 2750], top anchored near y=0, `setAlpha(0.5)`, `setDepth(-5)`, slow alpha pulse tween (0.35↔0.55, 4s yoyo). If WebGL: a pale light (`0xcfe8c0`, 200, 0.5) at each beam's ground point.
  - **No rain, no lightning.** Leave the fog strips untinted — fog is a TileSprite and TileSprite tint is WebGL-only (gotcha); the baked parallax + ambient sells the palette.
- That's the whole file (~70 lines).

**Step 3: Register** `Level2Scene` in `src/main.ts` scene array (after `Level1Scene`).

**Step 4:** `npm test` — Task 1's invariants now validate Level 2's layout automatically, and the chain test passes only with both edits from the Files list (L1→Level2, L2→MainMenu). `npx tsc --noEmit` clean.

**Step 5: Playtest Level 2** (Sonnet subagent, agent-browser): seed `currentLevel: 2` via localStorage, start from menu → "THE BROKEN DOWN FOREST" banner → forest renders (parallax, trees, fireflies) → fight a horde pack (disgusting tint visible *after* taking hits, multiple attackers) → cross platforms/stairs → trigger boss → Pack King's first move is a charge, then summon waves appear and are killable, cap respected → kill boss → minions pop with the king → Key #2 → Victory says "LEVEL 2 CLEARED!" / key 2 of 5. Also `--headed --session forest` once to confirm WebGL lights/moonbeams.

**Step 6:** `npm test` in-session, commit.

---

## Phase 3 — Level 3: Abandoned Railroad

### Task 9: Railroad textures + parallax re-tint

**Executor:** claude-subagent *(procedural art, same shape as Task 7)*

**Depends On:** Task 0 *(pure additions; follows Task 7's merged recipe style)*

**Files:**
- Modify: `src/assets.ts`, `src/scenes/PreloadScene.ts` (`generateRailTextures()` — **explicitly invoked from `create()`**, same caveat as Task 7)

**New keys:** `RAIL_NIGHT_FAR/MID/NEAR`, `RAIL_GROUND_TOP` (gravel + rail), `RAIL_GROUND_FILL`, `TRAIN_CAR` (body), `TRAIN_CAR_TOP` (walkable roof tile), `LOCOMOTIVE`, `SIGNAL_LAMP`, `THRONE_TRAIN`, `P_SMOKE`, `P_SPEEDLINE`.

**Step 1: Parallax** — rusty dusk palette over the same ruin layers:

```ts
this.bakeTint(Assets.RUIN_BG_2, Assets.RAIL_NIGHT_FAR, '#5c4a3a');
this.bakeTint(Assets.RUIN_BG_3, Assets.RAIL_NIGHT_MID, '#43352a');
this.bakeTint(Assets.RUIN_BG_4, Assets.RAIL_NIGHT_NEAR, '#2e241c');
```

**Step 2: Recipes:**
- `RAIL_GROUND_TOP` 32×32 — gravel ballast `0x3a342c` with stone specks (`0x4a443a`, `0x2a251f`); dark wooden tie band `0x33241a` vertical at x 12-20; steel rail line: 3px `0x8a8d94` horizontal at y 4 with 1px highlight `0xb0b4bc`.
- `RAIL_GROUND_FILL` 32×32 — packed gravel/earth like forest fill but grayer (`0x2a2620` base).
- `TRAIN_CAR_TOP` 32×16 — boxcar roof slab: ribbed steel `0x4a3f38` body, top edge `0x6a5a4c`, rust patches `0x7a4a30`, dark seam lines.
- `TRAIN_CAR` 192×88 — full boxcar side (decoration body under the walkable roof): rusted panel `0x5a4438` rounded rect, door outline `0x3a2c24` center, rust streaks `0x77492f`, two wheel bogies (filled circles `0x16161a` r=10 with `0x2e2e36` hubs) at the base, coupling nubs at the ends.
- `LOCOMOTIVE` 200×120 — chunky diesel/steam hybrid: tall cab at the rear (the zombie driver sits here), long nose `0x4e4036`, round boiler-front highlight, smokestack `0x2c2620` near the front, cowcatcher wedge (fillTriangle) at the nose, wheels like the boxcar.
- `SIGNAL_LAMP` 18×110 — lamppost analog: dark pole `0x2c2c33`, signal head box at top with a **red** lens `0xff4433` (these glow red beside the track).
- `THRONE_TRAIN` 150×135 — Henry's train-parts throne: stacked wheel pairs as the base (4 dark circles), a boiler-door round back plate `0x5a4438` with rivet dots `0x2c2620` around the rim, two connecting-rod "armrests" (angled steel bars `0x8a8d94`), a bent rail arching over the top like a crown.
- `P_SMOKE` 6×6 gray `0x777770` with lighter core; `P_SPEEDLINE` 14×2 pale streak `0xcfd4dc`.

**Step 3:** `npx tsc --noEmit`; boot check via agent-browser (no preload errors).

**Step 4:** `npm test` in-session, commit.

---

### Task 10: Level3Scene — Abandoned Railroad with the train sequence

**Executor:** claude-subagent *(the most custom scene; needs the base + a terrain override)*

**Depends On:** Task 8 *(follows its pattern; flips Level 2's nextSceneKey)*, Task 9

**Files:**
- Create: `src/scenes/Level3Scene.ts`
- Modify: `src/levels.ts` (append `levelThree`; **flip `levelTwo.nextSceneKey` to `'Level3'`**; export the `TRAIN` layout constants)
- Modify: `src/levels.test.ts` (train-geometry invariants)
- Modify: `src/main.ts` (register scene)

**The train sequence (Henry's "player boards a zombie-driven train"):** the middle of the level is a parked-but-"moving" train — locomotive + 4 boxcars — fought across the roofs. Physics is static (no moving-platform bugs); motion is sold visually: speed-line particles streak past while the camera is over the train, smoke pours from the stack, fog drifts faster, and a zombie driver idles in the cab. Falling into a gap between cars drops you onto the track to climb back out (kid-friendly, no pits).

**Train geometry is data, not scene code, so the invariant tests can see it** (review finding — the original draft hand-coded it in the scene, hiding exactly the kind of geometry that caused the original wedge bug). All positions are **center-x** values:

```ts
// src/levels.ts
export const TRAIN = {
  locomotiveX: 1390, locomotiveW: 200, locoRoofY: 356, // roof solid centers; top surface 348
  carXs: [1600, 1860, 2120, 2380], carW: 192, carRoofY: 380, // top surface 372; underside 388
};
```

Geometry facts the tests pin down: car roof underside at 388 → **88px clearance** under the cars (urban zombie body is 80px — fits with margin; a Zanter at 116px cannot follow you under the train, which is its own comedy); roof top at 372 → 104px above ground (reachable via the locomotive nose or double jump); locomotive spans 1290-1490, car 1 spans 1504-1696 → 14px step gap (can't fall through); between-car gaps 68px (fall through, jump back out).

**Step 1: Failing train tests** (append to `levels.test.ts`):

```ts
import { TRAIN, LEVELS } from './levels';

describe('level 3 train geometry', () => {
  it('leaves room for an urban zombie (80px body) under the car roofs', () => {
    expect(WORLD.groundY - (TRAIN.carRoofY + 8)).toBeGreaterThan(80);
  });

  it('cars do not overlap and gaps are jumpable (≤90px) or steppable', () => {
    const spans = [
      [TRAIN.locomotiveX - TRAIN.locomotiveW / 2, TRAIN.locomotiveX + TRAIN.locomotiveW / 2],
      ...TRAIN.carXs.map((x) => [x - TRAIN.carW / 2, x + TRAIN.carW / 2]),
    ];
    for (let i = 1; i < spans.length; i++) {
      const gap = spans[i][0] - spans[i - 1][1];
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThanOrEqual(90);
    }
  });

  it('roof spawns (explicit y) land on a car or locomotive span', () => {
    const def = LEVELS.find((d) => d.sceneKey === 'Level3')!;
    const spans = [
      [TRAIN.locomotiveX - TRAIN.locomotiveW / 2, TRAIN.locomotiveX + TRAIN.locomotiveW / 2],
      ...TRAIN.carXs.map((x) => [x - TRAIN.carW / 2, x + TRAIN.carW / 2]),
    ];
    for (const s of def.zombieSpawns.filter((s) => s.y !== undefined)) {
      expect(spans.some(([l, r]) => s.x > l + 20 && s.x < r - 20)).toBe(true);
      expect(s.y!).toBeLessThan(TRAIN.carRoofY - 40); // spawns above the roof, falls onto it — no tunneling distance
    }
  });
});
```

**Step 2: Append `levelThree`:**

```ts
const levelThree: LevelDef = {
  sceneKey: 'Level3',
  levelNumber: 3,
  name: 'THE ABANDONED RAILROAD',
  victorySubtitle: 'You stopped the zombie train',
  nextSceneKey: 'MainMenu',     // until Level 4 exists
  keyIndex: 2,
  worldWidth: 3600,
  playerSpawnX: 100,
  ambientColor: 0x5a5048,       // rust-dust dusk
  parallax: [
    { key: Assets.RAIL_NIGHT_FAR, factor: 0.12 },
    { key: Assets.RAIL_NIGHT_MID, factor: 0.3 },
    { key: Assets.RAIL_NIGHT_NEAR, factor: 0.55 },
  ],
  textures: {
    groundTop: Assets.RAIL_GROUND_TOP,
    groundFill: Assets.RAIL_GROUND_FILL,
    platform: Assets.TRAIN_CAR_TOP,   // floating platforms are detached roof slabs
    stone: Assets.STONE,              // ballast stones reuse the city stone
  },
  // Approach + boss-yard platforms — the train (x 1290-2476) is built from TRAIN data
  platforms: [[420, 390, 4], [850, 330, 5], [2700, 380, 4]],
  stairs: [[600, 408, 4, 38, 50], [2850, 410, 4, 38, 52]],
  zombieSpawns: [
    { x: 520, variant: 'zombie' }, { x: 760, variant: 'urban' },
    { x: 1000, variant: 'zanter' },                                  // first Zanter guards the train
    { x: 1620, variant: 'urban', y: 320 },                           // on the roofs (explicit y,
    { x: 1880, variant: 'zanter', y: 310 },                          //  falls ~50px onto the car —
    { x: 2140, variant: 'urban', y: 320 },                           //  no off-screen rain, no tunneling)
    { x: 2400, variant: 'zanter', y: 310 },
    { x: 2650, variant: 'zombie' }, { x: 2900, variant: 'zanter' },
  ],
  boss: {
    name: 'DIRT MUTATED ZOMBIE',
    hp: 340, scale: 1.85, tint: 0xb08d5a,
    walkSpeed: 95, enragedWalkSpeed: 145,
    contactDamage: 22,
    attackIntervalMs: 2100, enragedAttackIntervalMs: 1400,
    throneTexture: Assets.THRONE_TRAIN,
    canCharge: true, canLeap: true,
  },
  bossSpawnX: 3350,
  triggerX: 3100,
  arenaLeft: 3000,
};
```

**Step 3: `Level3Scene`** (`constructor() { super(levelByNumber(3)); }`):
- `buildTerrain()` override: `super.buildTerrain()`, then the train from `TRAIN`:
  - `LOCOMOTIVE` image at `TRAIN.locomotiveX` (decoration, `setDepth(3)`, `lit()`), roof solids: a row of 6 `TRAIN_CAR_TOP` tiles across its span at `TRAIN.locoRoofY`.
  - For each `TRAIN.carXs`: a `TRAIN_CAR` image at groundY−44 (decoration, depth 3, lit) plus 6 `TRAIN_CAR_TOP` solids across the car span at `TRAIN.carRoofY`.
  - The under-train corridor (88px) lets the player and small zombies pass beneath; Zanters can't fit and hop sadly at the entrances — the jump-fail comedy in a new costume.
- `buildBackdrop()` override: base, then `SIGNAL_LAMP` props at x ∈ [950, 1250, 2550, 2950] with red Light2D points (`0xff4433`, 130, 0.7, pushed into `flickerLights`).
- `buildAmbience(isWebGL)`:
  - **Zombie driver gag:** scenery sprite in the locomotive cab — `this.add.sprite(1330, 326, Assets.URBAN_IDLE, 0).play('urban-idle')`, flipX facing the nose, `lit()`, depth 4. *Not* in the zombies group; he's just… driving.
  - **Smoke** from the stack (x≈1450, y≈300): `P_SMOKE` emitter, up-and-back drift (`speedX: {min: -90, max: -60}`, `speedY: {min: -40, max: -15}`, `scale: {start: 1, end: 2.4}`, `alpha: {start: 0.5, end: 0}`, `lifespan: 1800`, `frequency: 70`).
  - **Speed lines** (screen-space, like the rain but horizontal): `P_SPEEDLINE`, `x: GAME_W + 20`, `y: {min: 40, max: 380}`, `speedX: {min: -700, max: -520}`, `lifespan: 1600`, `frequency: 90`, `alpha: {start: 0.35, end: 0}`, `setScrollFactor(0)`. Store the emitter on the scene.
  - No rain/lightning; music/groans reuse `SynthAudio` as-is.
- `update(time, delta)` override: `super.update(time, delta)` first, then `const camX = this.cameras.main.scrollX;` → `this.speedLines.emitting = camX > 900 && camX < 2400;` and `this.fogDriftMultiplier = camX > 900 && camX < 2400 ? 3 : 1;` (the protected knob from Task 3).

**Step 4: Register in `main.ts`; flip `levelTwo.nextSceneKey` to `'Level3'`.**

**Step 5:** `npm test` (chain test demands exactly this flip; layout + train invariants check L3) and `npx tsc --noEmit`.

**Step 6: Playtest Level 3** (Sonnet subagent, agent-browser): seed currentLevel 3 → "THE ABANDONED RAILROAD" banner → rails + red signal glow → first Zanter is big, slow, hits hard → climb the train via the locomotive → speed lines + smoke + driver visible while on the train, gone when off it → fight roof zombies, fall in a gap and climb back out → duck under the train, confirm a Zanter can't follow (hops at the entrance) and the player doesn't wedge → boss: charges, wall-stun bonus window, enrage leap shockwave, brown tint survives hits → Key #3 → Victory "LEVEL 3 CLEARED!" / "more levels coming soon" → Enter → MainMenu. Headed pass for WebGL once.

**Step 7:** `npm test` in-session, commit.

---

## Phase 4 — Verification & wrap-up

### Task 11: Full-progression playtest (the chain, retry, both renderers)

**Executor:** orchestrator *(synthesizes everything; drives Sonnet agent-browser subagents)*

**Depends On:** Task 10

No code expected; any failures route back into the relevant task's files as fixes (with `npm test` re-run before each fix commit).

**Manual Test Checklist** (run via agent-browser against `npm run dev` / localhost:5173):

### Happy path — the full game
- [ ] Clear localStorage save → MainMenu → start → spawns in Level 1 ("THE ABANDONED CITY" banner shows)
- [ ] Beat Level 1 (eval-assisted: teleport + boss.health=1 is fine) → Victory "LEVEL 1 CLEARED!" → prompt names the forest → Enter → Level 2 starts directly (no MainMenu detour)
- [ ] Level 2: horde packs aggro in groups; Pack King opens with a charge, then summons minions (zombie count rises); minions stop at the cap; minions pop when the King dies; Key #2 → Victory → Enter → Level 3
- [ ] Level 3: train sequence visuals (driver, smoke, speed lines only over the train); Zanter can't follow under the train; boss enrage leap; Key #3 → Victory ("more levels coming soon") → Enter → MainMenu
- [ ] HUD key slots show 3 filled keys after the run; coins accumulated across levels

### Persistence, retry & replay
- [ ] Mid-Level-2 reload (F5) → MainMenu → start → resumes at Level 2 (currentLevel persisted)
- [ ] Die in Level 3 → GameOver → Enter → restarts Level 3, not Level 1
- [ ] MainMenu number keys: 1 and 2 replay cleared levels; pressing 3 when only level 2 is unlocked does nothing
- [ ] Level restart doesn't stack event listeners (kill a zombie post-restart → exactly one coin drop / one splat, no doubled damage; trigger one boss summon post-restart → exactly one wave)
- [ ] Legacy save (hand-write old-shape JSON without currentLevel into localStorage) → loads as level 1, coins/keys intact; corrupt `currentLevel: 99` → clamps to last level

### Renderers
- [ ] Headless (Canvas): all three levels playable, parallax palettes correct (baked tints, no missing textures); variant tints visible on Canvas
- [ ] `--headed --session v2check` (WebGL): Level 2 firefly/moonbeam lights; Level 3 red signal lights; postFX intact in all levels; one FPS sanity glance on Level 2's 14-zombie + summon fight (largest entity count in the game)

### Edge cases & feel
- [ ] Boss summon while cap reached → no new spawns
- [ ] Dash i-frames through a Zanter lunge → no damage
- [ ] Player idles at spawn 10s in each level → never takes damage (spawn-camp rule held)
- [ ] Victory/GameOver with gamepad A held from the fight → does NOT auto-skip (release-then-press)
- [ ] **Feel check:** jumping out of a between-car gap (68px wide, 104px up) is comfortably doable; if it frustrates, add a wheel-hitbox step inside the gap (Gemini's suggestion) as a follow-up fix

(Repo deviation note: Playwright e2e is intentionally replaced by this agent-browser checklist — this project has no deploy target or Playwright infra; the automated browser playtest is its established verification pattern.)

---

### Task 12: Docs update, merge to main

**Executor:** orchestrator *(docs + git)*

**Depends On:** Task 11

**Files:**
- Modify: `CLAUDE.md` (Implementation Status: Levels 1-3 playable; Architecture: add `BaseLevelScene` + `levels.ts` registry to the Layout section; rewrite "Adding a New Level" to the def-based recipe: append a LevelDef + flip the previous nextSceneKey + subclass with theme builders + register in main.ts; note the per-spawn `y` option and that `WORLD.width` no longer exists)
- Modify: `docs/plans/2026-06-10-rebuild-v2-design.md` ("Next: Levels 2 and 3" section → status complete, date, what shipped)

**Steps:** update docs → `npm test` (commit gate) → commit → `git checkout main` → `git merge feat/levels-2-3` → `git branch -d feat/levels-2-3`.

---

## Execution Order

1. Task 0: Feature branch
2. Task 1: Level registry + invariant tests (removes `WORLD.width` repo-wide)
3. Task 2: GameState level progression *(needs LEVELS)*
4. Task 3: BaseLevelScene extraction + L1 regression playtest *(needs 1, 2)*
5. Task 4: Level-aware routing + level select *(needs 2, 3)*
6. Task 5: Zombie variant table + tint/scale restoration *(needs 3)*
7. Task 6: BossDef + summon + minion sweep *(needs 3, 5)*
8. Task 7: Forest textures *(independent art; ordered here so Level 2 lands next)*
9. Task 8: Level2Scene + chain flip L1→L2 + playtest *(needs 4, 5, 6, 7)*
10. Task 9: Railroad textures
11. Task 10: Level3Scene + train data/tests + chain flip L2→L3 + playtest *(needs 8, 9)*
12. Task 11: Full-progression playtest checklist
13. Task 12: Docs + merge to main
