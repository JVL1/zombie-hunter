# Shop Hub & Power Monsters Implementation Plan

> **For Claude:** You MUST invoke the Skill tool with `skill="evernest-superpowers:executing-plans"` before starting any task. Do NOT execute tasks directly — the skill handles tracking, code review, and batch checkpoints.

**Goal:** Extract PreloadScene's texture packs into `src/art/`, add a between-levels Shop Hub (Blacksmith sword tiers + Apocalypse consumables), and add four power monsters whose kills grant temporary buffs (flight, mega damage, giant mode, invincibility).

**Architecture:** Three sequential phases on one branch. Phase 1 is a pure refactor creating `src/art/*.ts` (theme texture generators + `bakeTint`/`bakeSheet` helpers). Phase 2 puts shop data in `config.ts`, purchase logic in `GameState`, a pure `resolveDamage()` in `src/core/damage.ts`, and a new `ShopScene` between Victory and the next level. Phase 3 adds power-monster zombie variants (baked sheets + anim sets), power-orb pickups, and a GameState-owned buff runtime read by Player and HUD.

**Tech Stack:** Phaser 3.90 + TypeScript + Vite, vitest for Phaser-free modules, agent-browser for playtests (Canvas headless / `--headed` for WebGL tints).

**Design doc:** `docs/plans/2026-06-11-shop-and-power-monsters-design.md` (passed converged multi-reviewer review — read it before deviating from any mechanism below; the mechanisms were review-verified against the real code).

**Project gotchas that bite this plan** (from CLAUDE.md):
- ALL `setTint` is a no-op on the Canvas renderer — anything that must read on Canvas needs baked textures.
- The pre-commit hook requires tests written + run in the session — every commit below is preceded by a vitest run.
- The bash hook blocks `&&`/`;` in commands — run commands one at a time.
- Physics world bounds and camera bounds are set separately; boss arena locks bounds to x≥`arenaLeft`.

> **Note:** After saving, this plan will be pushed to Linear. Each task heading will be annotated with `<!-- TEAM-XX -->` linking to the corresponding Linear sub-issue.

---

## Pre-implementation: workspace setup

### Task 0: Create worktree and feature branch

**Executor:** orchestrator *(coordination — user-visible setup)*

Create a single worktree for this epic via the `using-git-worktrees` skill. Branch name:

- `feat/shop-and-power-monsters`

The worktree branches off `main`. The PR targets `main`.

**Acceptance (BLOCKING):** worktree on disk on a fresh branch off `main`, BEFORE any implementation task runs. All tasks dispatch into this same worktree. (Note: `.claude/worktrees/levels-2-3` is a stale, deregistered leftover — do not reuse it; create a fresh one.)

---

## Phase 1 — Extract texture generators to `src/art/`

### Task 1: `src/art/helpers.ts` — bakeTint + bakeSheet + export-shape test

**Executor:** codex *(bounded module with explicit contract and testable acceptance)*

**Depends On:** Task 0

**Files:**
- Create: `src/art/helpers.ts`
- Create: `src/art/art.test.ts`
- Modify: `src/scenes/PreloadScene.ts` (replace `bakeTint` method with import)

**Step 1: Write the failing test** — `src/art/art.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import * as helpers from './helpers';

describe('art module exports', () => {
  it('helpers exports bakeTint and bakeSheet functions', () => {
    expect(typeof helpers.bakeTint).toBe('function');
    expect(typeof helpers.bakeSheet).toBe('function');
  });
});
```

(`helpers.ts` must stay importable in plain Node for this test: `import type Phaser from 'phaser'` only — no runtime Phaser import. The functions receive the scene; they never construct Phaser objects at module load.)

**Step 2: Run to verify it fails** — `npx vitest run src/art/art.test.ts` → FAIL (module not found).

**Step 3: Implement `src/art/helpers.ts`:**

- `export function bakeTint(scene: Phaser.Scene, srcKey: string, destKey: string, tint: string): void` — move the body verbatim from `PreloadScene.bakeTint` (PreloadScene.ts:90-104), replacing `this.` with `scene.`.
- `export function bakeSheet(scene: Phaser.Scene, srcKey: string, destKey: string, frameWidth: number, frameHeight: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): void` — new. Draws the source sheet image onto a canvas texture (same size), applies `draw(ctx, width, height)` for tint/overlay work (the callback handles `globalCompositeOperation` like bakeTint does), calls `canvas.refresh()`, then registers the frames: `scene.textures.get(destKey).add` per frame **or** simpler and preferred: after creating the canvas texture, call `scene.textures.addSpriteSheetFromAtlas` is NOT applicable — instead use `scene.textures.addCanvas` + manual frame add loop:
  ```ts
  const tex = scene.textures.get(destKey);
  const cols = Math.floor(src.width / frameWidth);
  const rows = Math.floor(src.height / frameHeight);
  let idx = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      tex.add(idx++, 0, c * frameWidth, r * frameHeight, frameWidth, frameHeight);
  ```
  (Frame 0 may already exist as `__BASE`; add numbered frames 0..n with `tex.add(idx, ...)` — if `add(0, ...)` collides, start the loop content at the existing-frame check. Acceptance: `scene.textures.get(destKey).frameTotal` ≥ cols×rows after baking, verified in the Task 13 playtest.)
- Update `PreloadScene.create()` to `import { bakeTint } from '../art/helpers'` and call `bakeTint(this, ...)` for all 9 existing bake calls (PreloadScene.ts:74-86); delete the private method.

**Step 4: Verify** — `npx vitest run` → all pass. `npx tsc --noEmit` → clean.

**Step 5: Commit** — `git add -A` then `git commit -m "refactor: extract bakeTint to src/art/helpers, add bakeSheet for spritesheet baking"`

### Task 2: `src/art/common.ts` + `src/art/city.ts`

**Executor:** codex *(mechanical extraction, inspectable: game must look identical)*

**Depends On:** Task 1

**Files:**
- Create: `src/art/common.ts`, `src/art/city.ts`
- Modify: `src/scenes/PreloadScene.ts` (delete `generateTextures`, call the two new functions)
- Modify: `src/art/art.test.ts` (extend export-shape test)

**Step 1:** Extend `art.test.ts`: `common` exports `generateCommonTextures`, `city` exports `generateCityTextures` (one function each). Run → FAIL.

**Step 2:** Split `PreloadScene.generateTextures()` (PreloadScene.ts:140-374) into two free functions, each `(scene: Phaser.Scene) => void`, each creating its own `scene.make.graphics(...)` and destroying it at the end:

- **`generateCommonTextures` (src/art/common.ts)** — level-agnostic, used by every level or by core systems: SKY, MOON, GLOW (BaseLevelScene backdrop), COIN, HEART, KEY (pickups), RING, FOG, PIXEL, all `particle(...)` calls (P_BLOOD … P_SPEEDLINE), P_RAIN, DECAL_1/2/3.
- **`generateCityTextures` (src/art/city.ts)** — Level 1 theme: GROUND_TOP, GROUND_FILL, PLATFORM, STONE, BARREL, LAMPPOST, THRONE (incl. the `car(...)` local helper).

Code moves verbatim (`g.` calls unchanged); only the wrapper changes. PreloadScene `create()` calls `generateCommonTextures(this)` then `generateCityTextures(this)`.

**Step 3:** `npx vitest run` → pass; `npx tsc --noEmit` → clean.

**Step 4: Commit** — `git commit -m "refactor: extract common + city texture packs to src/art"`

### Task 3: `src/art/forest.ts` + `src/art/rail.ts`

**Executor:** codex *(same mechanical shape as Task 2)*

**Codex effort:** medium

**Depends On:** Task 2

**Files:**
- Create: `src/art/forest.ts`, `src/art/rail.ts`
- Modify: `src/scenes/PreloadScene.ts`, `src/art/art.test.ts`

Same recipe as Task 2: extend the export test (FAIL → implement → PASS), move `generateForestTextures` (PreloadScene.ts:378-503) and `generateRailTextures` (PreloadScene.ts:507-662) verbatim into `generateForestTextures(scene)` / `generateRailTextures(scene)`. PreloadScene `create()` now reads: createAnimations → generateCommonTextures → generateCityTextures → generateForestTextures → generateRailTextures → 9 bakeTint calls → start MainMenu. **Defining without invoking = invisible textures (CLAUDE.md gotcha) — the call list above is the acceptance checklist.**

Verify (`vitest`, `tsc`), commit: `git commit -m "refactor: extract forest + rail texture packs to src/art"`

### Task 4: Phase 1 verification playtest + CLAUDE.md recipe update

**Executor:** orchestrator *(browser verification + docs, synthesizes Tasks 1-3)*

**Depends On:** Task 3

**Files:**
- Modify: `CLAUDE.md` ("Adding a New Level" step 2 → "add `src/art/{theme}.ts` + bakeTint calls in PreloadScene"; Layout section: PreloadScene description mentions `src/art/`)

**Steps:** `npm run dev`; agent-browser playtest: load each of Levels 1-3 via MainMenu number keys (use `window.game` + synthetic KeyboardEvents per the playtest-technique memory), screenshot each — terrain tiles, props, thrones, parallax all render. Headed run for tint sanity on one level. `npx vitest run` + `npx tsc --noEmit`. Commit docs: `git commit -m "docs: src/art extraction recipe in CLAUDE.md"`

---

## Phase 2 — The Shop Hub

### Task 5: Shop data in `src/config.ts` (SWORDS, CONSUMABLES)

**Executor:** codex *(typed data tables + invariant tests — clean contract)*

**Codex effort:** medium

**Depends On:** Task 0 *(independent of Phase 1)*

**Files:**
- Modify: `src/config.ts`
- Modify: `src/config.test.ts` (add invariants)

**Step 1: Failing tests** in `src/config.test.ts`:

```ts
import { SWORDS, CONSUMABLES } from './config';

describe('SWORDS', () => {
  it('has 5 tiers, tier 0 free, costs and damage strictly increasing', () => {
    expect(SWORDS).toHaveLength(5);
    expect(SWORDS[0].cost).toBe(0);
    for (let i = 1; i < SWORDS.length; i++) {
      expect(SWORDS[i].cost).toBeGreaterThan(SWORDS[i - 1].cost);
      expect(SWORDS[i].damage).toBeGreaterThan(SWORDS[i - 1].damage);
      expect(SWORDS[i].swingSpeed).toBeGreaterThanOrEqual(SWORDS[i - 1].swingSpeed);
    }
  });
  it('tier 0 matches the legacy baseline', () => {
    expect(SWORDS[0].name).toBe('Rusty Blade');
    expect(SWORDS[0].damage).toBe(12); // COMBAT.baseSwordDamage
  });
});

describe('CONSUMABLES', () => {
  it('every item has positive cost and cap', () => {
    for (const c of Object.values(CONSUMABLES)) {
      expect(c.cost).toBeGreaterThan(0);
      expect(c.cap).toBeGreaterThan(0);
    }
  });
});
```

**Step 2:** Run → FAIL. **Step 3:** Implement in `config.ts` (next to `COMBAT`):

```ts
export interface SwordDef {
  name: string;
  cost: number;       // coins; 0 = starting sword
  damage: number;
  reachBonus: number; // added to COMBAT.hitboxW
  swingSpeed: number; // anims.timeScale multiplier; cooldowns divided by this
  bladeTint?: number; // WebGL nicety on the sword overlay
}

export const SWORDS: SwordDef[] = [
  { name: 'Rusty Blade',       cost: 0,   damage: 12, reachBonus: 0,  swingSpeed: 1 },
  { name: 'Iron Cleaver',      cost: 40,  damage: 16, reachBonus: 4,  swingSpeed: 1,    bladeTint: 0x9ab0c8 },
  { name: 'Shadow Fang',       cost: 150, damage: 20, reachBonus: 6,  swingSpeed: 1.15, bladeTint: 0x6a4a8a },
  { name: 'Flame Edge',        cost: 300, damage: 26, reachBonus: 8,  swingSpeed: 1.15, bladeTint: 0xff7733 },
  { name: 'Giant Sun Splicer', cost: 600, damage: 36, reachBonus: 14, swingSpeed: 1.25, bladeTint: 0xffd24a },
];

export type ConsumableKind = 'potion' | 'shield' | 'life';
export const CONSUMABLES: Record<ConsumableKind, { name: string; cost: number; cap: number }> = {
  potion: { name: 'Health Potion', cost: 30,  cap: 3 },
  shield: { name: 'Shield',        cost: 50,  cap: 1 }, // grants 3 hit-charges; buy only at 0 charges
  life:   { name: 'Extra Life',    cost: 100, cap: 2 },
};
export const SHOP = {
  potionHealAmount: 50,
  potionAutoThreshold: 0.3, // drink when health < 30% of max
  shieldCharges: 3,
  reviveInvulnMs: 2000,
  bossCoinBurst: 5, // coins dropped when a boss dies (5 coins × coinValue 5 = +25)
};
```

**Step 4:** `npx vitest run` → PASS. `npx tsc --noEmit`. **Step 5:** `git commit -m "feat: sword tiers + consumable defs in config"`

### Task 6: GameState — purchases, persistence, load hardening

**Executor:** codex *(Phaser-free module, fully test-driven against an existing test file)*

**Depends On:** Task 5

**Files:**
- Modify: `src/core/GameState.ts`
- Modify: `src/core/GameState.test.ts`

**Step 1: Failing tests** (extend `GameState.test.ts`; follow its existing localStorage-stub pattern):

- `buySword()`: succeeds when `coins >= SWORDS[swordIndex+1].cost` (deducts, increments swordIndex, saves); fails (returns false, no change) when insufficient coins or already at max tier.
- `swordDamage` and `currentSword` derive from `SWORDS[swordIndex]`.
- `buyConsumable('potion'|'shield'|'life')`: deducts cost, increments the field; respects caps (`potions ≤ 3`, `lives ≤ 2`); `shield` buyable only when `shieldHits === 0` and sets `shieldHits = SHOP.shieldCharges`.
- Save/load roundtrip persists `swordIndex`, `potions`, `shieldHits`, `lives`.
- Legacy save (raw JSON without the new fields) loads with `swordIndex 0, potions 0, shieldHits 0, lives 0`.
- Corrupt values clamp: `swordIndex: 99` → 4; `swordIndex: -1` → 0; `potions: 7.5` → reject to 0 (non-integer); `lives: NaN` → 0; `potions: 99` → clamp to cap.

**Step 2:** Run → FAIL. **Step 3:** Implement:

- Fields: `swordIndex = 0; potions = 0; shieldHits = 0; lives = 0;` Replace `currentSword`/`swordDamage` properties with getters reading `SWORDS[this.swordIndex]`.
- `buySword(): boolean`, `buyConsumable(kind: ConsumableKind): boolean` per the tests; both `save()` on success.
- `SaveData` gains the four fields; `load()` uses the existing clamp pattern (GameState.ts:111-115): nullish-coalesce then `Number.isInteger` check then clamp to `[0, SWORDS.length-1]` / `[0, cap]` (shieldHits clamps to `[0, SHOP.shieldCharges]`).
- `resetRun()` unchanged (consumables persist across levels by design).

**Step 4:** `npx vitest run` → PASS; `npx tsc --noEmit`. **Step 5:** `git commit -m "feat: GameState shop purchases + hardened save fields"`

### Task 7: Pure damage pipeline — `src/core/damage.ts`

**Executor:** codex *(pure function + exhaustive test matrix — the canonical TDD shape)*

**Depends On:** Task 5 *(reads SHOP constants)*

**Files:**
- Create: `src/core/damage.ts`, `src/core/damage.test.ts`

**Step 1: Failing tests** — the full ordering matrix from the design doc:

| case | input | expected outcome |
|---|---|---|
| invulnerable | any | `ignored`, state unchanged (shield NOT consumed) |
| shield charges > 0 | hp 80, shield 2, dmg 16 | `absorbed`, shield 1, hp 80 |
| plain hit | hp 80, dmg 16 | `hurt`, hp 64 |
| lethal + potion | hp 10, potions 1, dmg 16 | `potioned`, hp 50, potions 0 |
| lethal + no potion + life | hp 10, lives 1, dmg 16 | `revived`, hp maxHealth, lives 0 |
| lethal + nothing | hp 10, dmg 16 | `dead`, hp 0 |
| low-HP auto-drink | hp 40→24 (<30% of 100), potions 1, dmg 16 | `potioned`, hp 74, potions 0 |
| low-HP, no potion | hp 40, dmg 16 | `hurt`, hp 24 |
| invincibility buff flag | same as invulnerable | `ignored` |

**Step 2:** Run → FAIL. **Step 3:** Implement:

```ts
import { SHOP } from '../config';

export interface DamageState {
  health: number;
  maxHealth: number;
  potions: number;
  shieldHits: number;
  lives: number;
}
export type DamageOutcome = 'ignored' | 'absorbed' | 'hurt' | 'potioned' | 'revived' | 'dead';

// Pure: Player passes `invulnerable` (i-frames ∥ dash ∥ invincibility buff ∥ post-revive grace).
export function resolveDamage(
  state: DamageState, amount: number, invulnerable: boolean
): { state: DamageState; outcome: DamageOutcome } { /* steps 1-7 from the design doc */ }
```

**Step 4:** `npx vitest run` → PASS. **Step 5:** `git commit -m "feat: pure resolveDamage pipeline with ordering matrix tests"`

### Task 8: Player integration — resolveDamage, revive, sword stats

**Executor:** claude-subagent *(riskiest gameplay slice: death-path intercept, animation/i-frame state, cross-checked against BaseLevelScene)*

**Depends On:** Task 6, Task 7

**Files:**
- Modify: `src/entities/Player.ts`
- Modify: `src/scenes/BaseLevelScene.ts` (boss coin burst only)

**Spec (each item is review-verified against current source):**

1. **`takeDamage` (Player.ts:330-354)** — replace the direct `health -=`/`die()` block: build `DamageState` from GameState, call `resolveDamage(state, amount, this.isInvulnerable)`, write the resulting fields back to GameState (`gs.save()` when a consumable was spent). Outcome handling: `ignored` → return (no knockback/sound); `absorbed` → shield flash (`flashSprite(this, 0xffd700)`), SynthAudio.coin() placeholder→ add `SynthAudio.shield()` if trivial else reuse `hurt()`, NO health flash, keep knockback; `hurt` → existing behavior; `potioned` → existing hurt behavior + `floatText(this.scene, this.x, this.y - 50, 'POTION!', '#ff6688', 14)`; `revived` → call `this.revive()` (below) — **`die()` never runs**; `dead` → existing `die()` path.
2. **`revive()`** — new public method: `this.gameState.health = this.gameState.maxHealth` already handled by resolveDamage; reset `dying=false` (it was never set — keep the assert that it isn't), `endSlam()`, stop dash if active, `setVelocity(0,0)`, `setAlpha(1)`, reposition to `this.lastGroundedPos`, `this.invulnUntil = this.scene.time.now + SHOP.reviveInvulnMs`, golden `flashSprite`, `this.scene.cameras.main.centerOn(this.x, this.y)` is unnecessary (camera follows) — just emit `this.scene.events.emit('player-revived')` for FX hooks.
3. **`lastGroundedPos`** — new `{x, y}` field; in `update()` where `grounded` is true (Player.ts:116-119), set `this.lastGroundedPos = { x: this.x, y: this.y }`. Always within current world bounds (incl. arena lock) by construction.
4. **Sword damage** — already reads `gameState.swordDamage` (now a getter) — no change. **Reach**: `tryAttack` reach line (Player.ts:270) becomes `COMBAT.hitboxW + SWORDS[gs.swordIndex].reachBonus + (isFinisher ? COMBAT.finisherReachBonus : 0)`.
5. **Swing speed**: in `tryAttack` and `startSlam`, after `this.play(ATTACK)`: `this.anims.timeScale = SWORDS[gs.swordIndex].swingSpeed`; in the `animationcomplete-ATTACK` handlers reset `this.anims.timeScale = 1`; cooldown assignment divides by swingSpeed: `(isFinisher ? COMBAT.finisherCooldownMs : COMBAT.swingCooldownMs) / speed`.
6. **Blade tint**: in constructor after creating `swordOverlay`, `if (WEBGL && SWORDS[gs.swordIndex].bladeTint) this.swordOverlay.setTint(bladeTint)` (WebGL-only nicety, mirrors existing renderer guard at Player.ts:73).
7. **Boss coin burst** (`BaseLevelScene.onBossDefeated`, BaseLevelScene.ts:561): after the key drop `delayedCall`, add `for (let i = 0; i < SHOP.bossCoinBurst; i++) this.pickups.add(new Pickup(this, bossX + (i - 2) * 18, bossY - 40, 'coin'));`

**TDD note:** the logic core was tested in Task 7; this task is Phaser-bound wiring. Re-run `npx vitest run` (regression) + `npx tsc --noEmit`. Manual spot-check: `npm run dev`, take hits, die with 0 consumables → GameOver unchanged.

**Commit:** `git commit -m "feat: Player damage pipeline integration, revive, sword stat wiring"`

### Task 9: InputController menu navigation primitives

**Executor:** codex *(small bounded class extension, explicit contract)*

**Codex effort:** medium

**Depends On:** Task 0

**Files:**
- Modify: `src/core/InputController.ts`

**Spec:** Add edge-triggered `upJustPressed`, `downJustPressed`, `leftJustPressed`, `rightJustPressed` booleans, computed in `update()`:
- Keyboard: `Phaser.Input.Keyboard.JustDown(this.cursors.up/down/left/right)` — **arrow keys ONLY, no WASD** (A is the attack key — design-review finding).
- Gamepad: d-pad or stick crossing the 0.5 threshold, edge-detected with new `prevPadUp/Down/Left/Right` fields (same pattern as `prevPadJump`, InputController.ts:13-15, 74-76). Stick: `leftStick.y < -0.5` = up, etc.
- `attackJustPressed` and Enter (`this.scene.input.keyboard.addKey('ENTER')` → expose `confirmJustPressed = attackJustPressed || JustDown(keyEnter)`) serve as the shop's buy/confirm.

No new unit test (Phaser-bound; vitest covers Phaser-free only) — acceptance is the Task 10 shop navigation playtest. Run `npx vitest run` (regression) + `npx tsc --noEmit`. Commit: `git commit -m "feat: edge-triggered menu navigation in InputController"`

### Task 10: ShopScene + shop textures + Victory routing

**Executor:** claude-subagent *(new scene composition, UI layout judgment, cross-file wiring)*

**Depends On:** Task 4 *(src/art exists)*, Task 6 *(buy methods)*, Task 9 *(menu nav)*

**Files:**
- Create: `src/scenes/ShopScene.ts`, `src/art/shop.ts`
- Modify: `src/main.ts` (register ShopScene in the scene array, main.ts:33)
- Modify: `src/scenes/VictoryScene.ts` (routing + prompt copy)
- Modify: `src/assets.ts` (shop texture keys: `SHOP_ANVIL`, `SHOP_SHACK`, `SHOP_COUNTER`, sword display icons as needed)
- Modify: `src/scenes/PreloadScene.ts` (invoke `generateShopTextures(this)` — **defining without invoking = invisible textures**)
- Modify: `src/art/art.test.ts` (export-shape: `shop` exports `generateShopTextures`)

**Spec:**

1. **Victory routing** (VictoryScene.ts:99-105): inside `go()`, when `next !== 'MainMenu'`: keep `gs.advanceLevel()` then `this.scene.start('Shop')` (NOT `next` — ShopScene derives the destination). When `next === 'MainMenu'`: unchanged. Prompt copy (VictoryScene.ts:70-73): non-MainMenu case becomes `'PRESS ENTER — visit the shop!'`.
2. **ShopScene** (key `'Shop'`): dark background + two counters built from `src/art/shop.ts` procedural textures (anvil + embers + warm Light2D point light on the left; potion shack + green light on the right — guard lights with the WEBGL renderer check). Header shows coins (live from GameState). Two panels:
   - Blacksmith: lists all 5 `SWORDS`; owned tiers ticked; the next tier highlighted with cost; higher tiers grayed with cost shown. Buy = `gs.buySword()`.
   - Apocalypse: 3 `CONSUMABLES` rows with owned count vs cap and cost. Buy = `gs.buyConsumable(kind)`.
   - Bottom: `HEAD OUT →` item.
3. **Input loop** (scene `update()`): `controls.update()`; ←/→ switches counter focus, ↑/↓ moves selection (include HEAD OUT as the last item of either list), confirm (`attackJustPressed`/Enter) buys or — on HEAD OUT — `this.scene.start(GameState.getInstance().currentLevelDef.sceneKey)`. **Jump must NOT exit** (↑ is a jump key). Failed buy (insufficient coins / at cap) → red flash + `SynthAudio.hurt()`; success → `SynthAudio.coin()`, float text, gleam flash.
4. **`src/art/shop.ts`**: `generateShopTextures(scene)` — anvil (~64×40), shack (~120×100), counter slab — same blocky pixel language as existing packs (model on `generateCityTextures` shapes).

**Acceptance playtest (agent-browser):** beat Level 1 (or `window.game` shortcut: `scene.start('Shop')` after setting `gs.currentLevel=2`) → shop renders; arrows navigate without jumping/exiting; buying Iron Cleaver with ≥40 coins works and persists after reload (localStorage); HEAD OUT starts Level 2; replay flow (MainMenu → 1) still routes through shop; after final level victory → MainMenu (no shop). Keyboard AND gamepad nav if a pad is available.

Run `npx vitest run` + `npx tsc --noEmit`. Commit: `git commit -m "feat: ShopScene with Blacksmith and Apocalypse counters between levels"`

### Task 11: HUD second row — consumables

**Executor:** codex *(bounded scene extension with a fixed layout spec)*

**Depends On:** Task 6

**Files:**
- Modify: `src/scenes/HUDScene.ts`

**Spec:** Second translucent strip below the existing panel (panel is `14,14,246×74` — new row at `14, 92, 246×24, 0x000000, 0.45`). Three icon+count pairs: potion (HEART texture tinted… **no — Canvas tint no-op**; reuse HEART for potion count is acceptable with a `xN` label, or add tiny generated icons in `src/art/common.ts` — prefer generated `SHOP_ICON_POTION/SHIELD/LIFE` 12×12 textures added in Task 10's `shop.ts`), shield charges (`shieldHits`), lives. Update counts in `update()` from GameState (same change-detection pattern as `lastCoins`, HUDScene.ts:92-98). Hide the row entirely when all three are 0 (pre-shop players see no clutter).

Run `npx vitest run` + `npx tsc --noEmit`; visual check in dev server. Commit: `git commit -m "feat: HUD consumable row"`

---

## Phase 3 — Power Monsters

### Task 12: POWERUPS config + GameState buff runtime

**Executor:** codex *(Phaser-free state + pure timer logic, fully unit-testable)*

**Depends On:** Task 6

**Files:**
- Modify: `src/config.ts` (PowerUpType, POWERUPS table)
- Modify: `src/core/GameState.ts` (activeBuffs runtime)
- Modify: `src/core/GameState.test.ts`, `src/config.test.ts`

**Step 1: Failing tests:**

- config: `POWERUPS` has entries for all 4 types, each with `durationMs > 0`, distinct `color`.
- GameState: `grantBuff('flight', now)` → `buffActive('flight', now + 5000)` true, false at `now + 10001`; duplicate grant refreshes (`grantBuff` at t=0 and t=8000 → active at t=17000); `damageMultiplier(now)` = 1 normally, 2 with megaDamage, 3 with megaDamage+giant; `visualScale(now)` 1 / 1.35; `isInvincible(now)`; `extendBuffs(ms)` pushes every expiry out (cinematic pause); `resetRun()` clears all buffs.

**Step 2:** FAIL. **Step 3:** Implement:

```ts
// config.ts
export type PowerUpType = 'flight' | 'megaDamage' | 'giant' | 'invincible';
export const POWERUPS: Record<PowerUpType, { name: string; durationMs: number; color: number; }> = {
  flight:     { name: 'FLIGHT',        durationMs: 10000, color: 0x8a5acc },
  megaDamage: { name: 'MEGA DAMAGE',   durationMs: 10000, color: 0xff3333 },
  giant:      { name: 'GIANT MODE',    durationMs: 10000, color: 0x9a9a8c },
  invincible: { name: 'INVINCIBLE',    durationMs: 10000, color: 0x55eedd },
};
export const BUFF = { giantVisualScale: 1.35, giantDamageMultiplier: 1.5, megaDamageMultiplier: 2,
  flightRiseVelocity: -260, flightDriftGravityFactor: 0.35 };
```

GameState: `activeBuffs = new Map<PowerUpType, number>()` (expiresAt; **not** in SaveData); methods `grantBuff(type, now)`, `buffActive(type, now)`, `damageMultiplier(now)`, `visualScale(now)`, `isInvincible(now)`, `canFly(now)`, `extendBuffs(ms)`, and `clearBuffs()` called from `resetRun()`.

**Step 4:** PASS + tsc. **Step 5:** `git commit -m "feat: power-up config + GameState buff runtime"`

### Task 13: Power-monster variants — baked sheets, anim sets, Zombie plumbing

**Executor:** claude-subagent *(multi-file plumbing across assets/art/PreloadScene/Zombie with a renderer gotcha)*

**Depends On:** Task 1 *(bakeSheet)*, Task 12 *(PowerUpType)*

**Files:**
- Modify: `src/config.ts` (`ZombieVariant` union + 4 variant entries with `powerUp` + optional `sheet`/`animSet` on `ZombieVariantDef`)
- Modify: `src/assets.ts` (`ZombieAnims` gains the 4 power sets; baked sheet keys)
- Create: `src/art/powerMonsters.ts` (`generatePowerMonsterSheets(scene)`)
- Modify: `src/scenes/PreloadScene.ts` (invoke it AFTER zombie sheets load, register the 4×5 anims)
- Modify: `src/entities/Zombie.ts` (use `vdef.sheet`/`vdef.animSet` when present; expose `get powerUp()`)
- Modify: `src/config.test.ts` (each power variant has a powerUp; hp ≥ zanter-class 80)

**Spec:**

1. `ZombieVariantDef` gains `powerUp?: PowerUpType; sheet?: string; animSet?: string;` — `sheet` is a **key prefix**: the baked sheets register as `${sheet}-idle/walk/attack/hurt/dead`.
2. New variants (Henry renames later) — all `base: 'zombie'` 96×96 family except titan (`urban` 128×128 for bulk):
   ```ts
   vulture: { base: 'zombie', hp: 80,  scale: 1.1,  patrolSpeed: 60, chaseSpeed: 110, contactDamage: 10, powerUp: 'flight',     sheet: 'pm-vulture' },
   rage:    { base: 'zombie', hp: 80,  scale: 1.05, patrolSpeed: 70, chaseSpeed: 125, contactDamage: 12, powerUp: 'megaDamage', sheet: 'pm-rage' },
   titan:   { base: 'urban',  hp: 110, scale: 1.5,  patrolSpeed: 38, chaseSpeed: 65,  contactDamage: 14, powerUp: 'giant',      sheet: 'pm-titan' },
   crystal: { base: 'zombie', hp: 80,  scale: 1.1,  patrolSpeed: 55, chaseSpeed: 100, contactDamage: 10, powerUp: 'invincible', sheet: 'pm-crystal' },
   ```
3. `generatePowerMonsterSheets`: for each variant × each of the 5 animation sheets, call `bakeSheet` with a draw callback: multiply-tint to the variant color (vulture dark purple `#5a3a8a`, rage red `#aa2222`, titan stone `#8a8a7a`, crystal cyan `#3ad8cc`) + a simple painted overlay per frame column (vulture: dark wing triangles behind the torso; crystal: 3-4 light cyan shard rects; rage: glow rim via lighten composite; titan: none — scale sells it). Overlays are coarse — these are 96px zombies seen at game speed; **bake, don't tint, so Canvas renders them** (CLAUDE.md gotcha).
4. PreloadScene `create()` registers the anims (same frame counts/rates as the base family — clone the `mk(...)` calls at PreloadScene.ts:127-137 with the new sheet keys and `pm-{v}-{anim}` keys); add the 4 sets to `ZombieAnims` under their `animSet` names.
5. `Zombie` constructor (Zombie.ts:39-44): texture = `v.sheet ? `${v.sheet}-idle` : (v.base === 'urban' ? 'urban-idle-sheet' : 'zombie-idle-sheet')`; `this.anims_ = v.animSet ? ZombieAnims[v.animSet] : ZombieAnims[v.base]` (widen `ZombieAnims` record type). Add `get powerUp(): PowerUpType | undefined { return this.vdef.powerUp; }`. Body size still keyed off `v.base` (unchanged).

**Acceptance:** `npx vitest run` (config invariants) + `npx tsc --noEmit`; dev-server spot check spawning one power monster (temporarily via console `new Zombie(...)` or wait for Task 16). **Headed** playtest in Task 18 verifies the looks. Commit: `git commit -m "feat: power-monster variants with baked sheets and anim sets"`

### Task 14: Power orb pickup + drop-on-kill + boss-trigger magnet

**Executor:** codex *(bounded entity extension; acceptance = orb drops and grants buff)*

**Depends On:** Task 12, Task 13

**Files:**
- Modify: `src/entities/Pickups.ts`
- Modify: `src/scenes/BaseLevelScene.ts` (`onZombieKilled`, `triggerBossEncounter`)
- Modify: `src/art/common.ts` + `src/assets.ts` (ORB texture: 16×16 glowing circle, white core — per-buff color comes from a baked variant per type: `gen-orb-flight` etc., 4 small textures)

**Spec:**

1. `Pickup` gains `kind: 'orb'` with a `powerUp: PowerUpType` field (constructor param object or extra arg `new Pickup(scene, x, y, 'orb', powerUp)`); texture `gen-orb-${powerUp}`; glow-pulse tween (reuse heart branch); WEBGL point light colored `POWERUPS[powerUp].color` (mirror the key-light pattern, Pickups.ts:50-56).
2. `collect()`: case `'orb'` → `gs.grantBuff(this.powerUp, this.scene.time.now)`; `floatText` with `POWERUPS[powerUp].name + '!'`; `SynthAudio.key()` (or new jingle if trivial).
3. `BaseLevelScene.onZombieKilled` (BaseLevelScene.ts:435-451): after the coin drop, `if (z.powerUp) this.pickups.add(new Pickup(this, z.x, z.y - 30, 'orb', z.powerUp));`
4. **Boss-trigger magnet** (`triggerBossEncounter`, before the zombie-destroy loop at BaseLevelScene.ts:507): for each active pickup of kind `'orb'`, set its magnet range to Infinity (add a `magnetize()` method on Pickup setting `magnetRange = Number.POSITIVE_INFINITY`) — `updateMagnet` already steers magnetized pickups to the player each frame (Pickups.ts:59-68).

**Tests:** vitest can't cover Phaser entities; regression run + tsc. Manual: kill a power monster in dev → orb drops, collect → float text + HUD timer (Task 17). Commit: `git commit -m "feat: power orb pickups with boss-trigger magnetization"`

### Task 15: Buff effects in Player + cinematic timer pause

**Executor:** claude-subagent *(touches the movement/combat core and scene update loop; interaction-heavy)*

**Depends On:** Task 8, Task 12

**Files:**
- Modify: `src/entities/Player.ts`
- Modify: `src/scenes/BaseLevelScene.ts`

**Spec:**

1. **Flight** (`update()`, after the jump block, gated `if (gs.canFly(now) && !this.dashing)`): while `controls.jumpHeld` and airborne → `this.setVelocityY(Math.max(body.velocity.y + BUFF.flightRiseVelocity * (delta/1000) * 4, BUFF.flightRiseVelocity))` — i.e., thrust toward a capped rise velocity (jetpack feel, no instant snap); while airborne and falling with flight active → gravity-reduced drift: `body.setGravityY(-1000 * (1 - BUFF.flightDriftGravityFactor))` (offsetting world gravity to 35%), restored to 0 when buff ends/grounded. Double-jump rules untouched; world bounds already contain the player. NOTE: `Player.update()` has no `delta` param today — use `this.scene.game.loop.delta`.
2. **Mega damage / giant damage**: in `tryAttack` and `startSlam`, damage line multiplies by `gs.damageMultiplier(now)` (floor after multiplying). When multiplier > 1, bump Juice: the scene's hit handlers already shake — Player adds bigger swing FX only if trivial; skip otherwise (scene shake is enough).
3. **Giant mode**: track `appliedVisualScale`; each `update()`, `const want = gs.visualScale(now)` — when it changes: `this.setScale(want); body.setSize(24 / want, 48 / want); body.setOffset(28 / want + (28 * (want-1)) / (2*want), ...)` — **concretely:** after `setScale(s)`, restore the body's WORLD size by setting `body.setSize(24 / s, 48 / s)` and recompute offset so feet stay planted: offset Y = `(64 - 48 / s) - small` … (Implementer: verify empirically with the P physics-debug overlay — acceptance is: world-space body stays ~24×48 with bottom edge at the sprite's feet at scale 1.35 and at scale 1. Both states checked with debug draw.) Scale `swordOverlay.setScale(want)` in the sync block (Player.ts:177-180).
4. **Invincibility**: `get isInvulnerable()` (Player.ts:86-88) ORs in `this.gameState.isInvincible(this.scene.time.now)`. Golden flashing: alpha-pulse tween while active (start/stop on transition), plus aura: reuse `Assets.GLOW` image stuck to the player, tint per active buff color on WebGL, visible-but-untinted on Canvas (acceptable — orb + HUD carry the info on Canvas).
5. **Aura**: one GLOW sprite behind the player whenever ANY buff is active (color = most recent buff on WebGL), destroyed when none.
6. **Cinematic pause** (`BaseLevelScene.triggerBossEncounter`): record `cinematicStartedAt = this.time.now` when setting `this.cinematic = true`; where `this.cinematic = false` is restored (BaseLevelScene.ts:525), call `this.gameState.extendBuffs(this.time.now - cinematicStartedAt)`.

**Acceptance:** regression vitest + tsc; dev-server with physics debug (P key): giant body stays 24×48 world-space; flight holds jump to rise, releases to drift; invincibility ignores zombie contact. Commit: `git commit -m "feat: buff effects — flight, mega damage, giant mode, invincibility"`

### Task 16: Level spawn placements + new invariants

**Executor:** codex *(data + invariant tests — exactly the levels.ts/levels.test.ts pattern)*

**Depends On:** Task 13

**Files:**
- Modify: `src/levels.ts` (add 1-2 power-monster spawns per level, 4-5 total covering all 4 buff types)
- Modify: `src/levels.test.ts`

**Step 1: Failing invariant tests:**

```ts
it('every powerUp type appears at least once across built levels', ...)
// for each level: collect ZOMBIE.variants[spawn.variant].powerUp; union === all 4 types across LEVELS
it('power monsters spawn well before the boss trigger', ...)
// for each spawn whose variant has a powerUp: spawn.x < def.triggerX - ZOMBIE.aggroRange
it('power-monster ground spawns do not overlap stair stones or platform bands', ...)
// AABB of the variant body (base-keyed size × scale) at zombieSpawnY vs each platform/stair tile rect
```

**Step 2:** FAIL (no spawns yet). **Step 3:** Add spawns — suggested placement (tune to pass the AABB invariant): Level 1: `vulture` near x≈1700, `rage` near x≈2300; Level 2: `titan` near x≈1500 (ground, clear of stairs), `crystal` near x≈2600; Level 3: `vulture` or `rage` on a clear ground stretch (NOT on train roofs — explicit `y` spawns need the platform-clearance check; keep ground-level for v1). All x < triggerX − 240.

**Step 4:** PASS + tsc. **Step 5:** `git commit -m "feat: power-monster spawns with placement invariants"`

### Task 17: HUD buff icons + countdowns

**Executor:** codex *(bounded HUD extension, fixed layout)*

**Depends On:** Task 12

**Files:**
- Modify: `src/scenes/HUDScene.ts`

**Spec:** Right of the consumable row (Task 11), one slot per ACTIVE buff: a 14×14 color swatch (rectangle filled with `POWERUPS[type].color` — rectangles render colored on Canvas, unlike tints) + a 30×4 countdown bar draining over the remaining fraction (`(expiresAt - time) / durationMs`). Read `gameState.activeBuffs` each `update()`; build/destroy slot objects on transitions (pattern: keyIcons array, HUDScene.ts:49-53).

Regression vitest + tsc + visual check. Commit: `git commit -m "feat: HUD buff countdown row"`

---

## Verification & docs

### Task 18: Full integration playtest + CLAUDE.md update

**Executor:** orchestrator *(synthesizes everything; browser-driven acceptance)*

**Depends On:** Task 10, Task 11, Task 14, Task 15, Task 16, Task 17

**Files:**
- Modify: `CLAUDE.md` (Implementation Status, shop + power monster patterns, next milestones)

Run the Manual Test Checklist below via agent-browser (headless for flow, **`--headed` for the visual items** — tints/auras/baked sheets don't show on Canvas). Fix anything that fails before committing. Update CLAUDE.md. Final `npx vitest run` + `npx tsc --noEmit` + `npm run build`. Commit: `git commit -m "docs: shop + power monsters shipped"`

## Manual Test Checklist

> **For Claude:** Run via agent-browser against `npm run dev` (localhost). Use `window.game` + synthetic KeyboardEvents (see playtest-technique memory). Headless = Canvas (no tints); run visual items `--headed`. Report pass/fail per item.

### Happy Path
- [ ] Fresh save (clear localStorage) → MainMenu → Level 1 plays; HUD shows no consumable row
- [ ] Kill power monster (vulture, x≈1700) → orb drops, collect → "FLIGHT!" float text, HUD countdown appears, hold jump → player rises, release → slow drift, expires ≈10s
- [ ] Beat Level 1 boss → +25 coin burst → Victory says "visit the shop!" → Enter → ShopScene
- [ ] Arrows navigate both counters; ↑ does NOT exit the shop; buy Iron Cleaver (≥40 coins) → coins deduct, tier ticked; reload page → purchase persisted
- [ ] Buy potion + shield → HUD second row appears with counts; HEAD OUT → Level 2 starts
- [ ] In Level 2: take 3 hits with shield → all absorbed (golden flash, no HP loss), 4th hit hurts
- [ ] Drop below 30% HP with a potion → auto "POTION!" +50
- [ ] Kill titan → giant mode: sprite grows ×1.35, body stays 24×48 (P debug), damage up
- [ ] Beat Level 3 (final built level) → Victory → MainMenu directly (no shop)

### Error States
- [ ] Buy with insufficient coins → red flash + error sound, no state change
- [ ] Buy potion at cap 3 → rejected; buy shield while charges remain → rejected
- [ ] Corrupt save (`localStorage` swordIndex: 99) → loads clamped to tier 4, no crash

### Edge Cases
- [ ] Die with an Extra Life mid-level → in-place revive at last grounded spot, ~2s invuln blink, GameOver does NOT fire, life count decrements (persisted)
- [ ] Die with Extra Life DURING the boss fight → revive inside the arena, boss HP unchanged, fight continues
- [ ] Uncollected orb on the ground when boss triggers → orb flies to the player (never stranded)
- [ ] Buff active when boss cinematic plays → countdown effectively pauses (≈2.5s longer)
- [ ] Replay Level 1 from MainMenu after finishing the game → Victory still routes through shop
- [ ] GameOver retry → buffs cleared, consumables retained

### Playwright note
No Playwright task: this is a canvas-rendered Phaser game with no DOM to assert against — the project's e2e convention is the agent-browser playtest above (CLAUDE.md "Testing hook"), which this checklist encodes. Unit-level behavior is vitest-covered (damage matrix, purchases, buffs, level invariants).

## Execution Order

1. Task 0: Worktree + feature branch
2. Task 1: art/helpers.ts (bakeTint + bakeSheet) *(depends on 0)*
3. Task 2: art/common.ts + art/city.ts *(depends on 1)*
4. Task 3: art/forest.ts + art/rail.ts *(depends on 2)*
5. Task 4: Phase 1 playtest + CLAUDE.md recipe *(depends on 3)*
6. Task 5: SWORDS/CONSUMABLES config data *(depends on 0; independent of Phase 1)*
7. Task 6: GameState purchases + persistence *(depends on 5)*
8. Task 7: resolveDamage pure module *(depends on 5)*
9. Task 9: InputController menu nav *(depends on 0)*
10. Task 8: Player integration (damage/revive/sword stats) *(depends on 6, 7)*
11. Task 10: ShopScene + Victory routing *(depends on 4, 6, 9)*
12. Task 11: HUD consumable row *(depends on 6)*
13. Task 12: POWERUPS + buff runtime *(depends on 6)*
14. Task 13: Power-monster variants + baked sheets *(depends on 1, 12)*
15. Task 14: Power orbs *(depends on 12, 13)*
16. Task 15: Buff effects in Player *(depends on 8, 12)*
17. Task 16: Spawns + invariants *(depends on 13)*
18. Task 17: HUD buff countdowns *(depends on 12)*
19. Task 18: Integration playtest + docs *(depends on all)*
