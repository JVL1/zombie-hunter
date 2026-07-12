# Level 4 — The Zombified Lake Implementation Plan

> **For Claude:** You MUST invoke the Skill tool with `skill="evernest-superpowers:executing-plans"` before starting any task. Do NOT execute tasks directly — the skill handles per-task review and batch checkpoints. This repo stays OUT of Linear (standing preference) — track progress in this file only.

**Goal:** Build Level 4 (THE ZOMBIFIED LAKE) end-to-end: swim movement, breathing meter with scuba gear, three water enemies, and the Sunken Beast kraken boss, per the approved design `docs/plans/2026-07-12-level4-zombified-lake-design.md`.

**Non-Goals:** The 5-key portal (Level 5 content); the "water demon" Blacksmith weapon; water in Levels 1–3; scuba persistence across levels; migrating `zombieSpawns` to a general enemy-spawn union.

**Architecture:** Water is an optional `LevelDef` block; the Player owns its environment mode (gravity precedence dash → swim → flight → normal); air and kraken phase logic are pure vitest-covered modules like `damage.ts`; a `BossEncounter` interface seams `BaseLevelScene` off the concrete `Boss` so the Kraken slots in beside it. All new visuals are baked textures (Canvas-safe).

**Tech Stack:** Phaser 3.90 arcade physics, TypeScript, Vite, vitest (pure modules only), agent-browser playtest.

**Design rulings to honor (from the design doc):** drowning bypasses shields, grants no i-frames, no knockback; scuba cracks only on `hurt`/`potioned`/`revived` outcomes from non-drowning sources; fish/eels drop coins and count streaks; air freezes during intro banner and boss cinematic; scuba survives revive.

---

## Acceptance Criteria

- [ ] Beating Level 3 routes through the Shop to Level 4; beating Level 4 grants key #4 and returns to MainMenu; MainMenu key 4 replays; GameOver retries; a save holding keys 1–3 auto-unlocks Level 4
- [ ] Player swims (↑ thrusts up, gentle gravity), torpedo dash keeps i-frames, double jump / buffered ground jumps / slam gated off in water, sinking attacks start combo step 1
- [ ] Air drains over ~30 s → warning → damage ticks at zero (no knockback, no i-frames granted); drain stops when the head surfaces or in a vent; air frozen during intro banner and boss cinematic
- [ ] Scuba: infinite air while worn, crack stage per cracking hit, breaks on the 5th, meter resumes
- [ ] Kraken: guarding tentacle blocks the head → kill opens timed window → regrow; aimed laser bubbles; enrage at 50% fires 3-spread with baked red-eye frames (Canvas-visible)
- [ ] All existing vitest invariants pass (two get water-aware branches); new water invariants + pure air/kraken/damage matrices pass; `npx tsc --noEmit` clean
- [ ] Levels 1–3 play unchanged (walker boss adapter is behavior-neutral)

---

## Pre-implementation: workspace setup

### Task 0: Create worktree and feature branch

**Executor:** orchestrator *(coordination — user-visible setup)*

Create a single worktree for this epic via the `evernest-superpowers:using-git-worktrees` skill. Branch: `feat/level4-zombified-lake`, off `main`. The PR targets `main`.

**Acceptance (BLOCKING):** worktree on disk on a fresh branch off `main` BEFORE any implementation task runs. All tasks dispatch into this worktree. Reminder for all tasks: the pre-commit hook requires tests written + run in the session, and the bash hook rejects `&&`/`;`/multiline in commit commands — single-line `git commit -m "..."` only.

---

## Phase 1 — Pure cores (config, air, damage)

### Task 1: WATER config block

**Depends On:** none

**Files:**
- Modify: `src/config.ts` (add `WATER` export after `BUFF`)
- Test: `src/config.test.ts` (new `describe('WATER')`)

**Step 1: Write the failing test**

```ts
describe('WATER', () => {
  it('air lasts longer than the warning threshold', () => {
    expect(WATER.airMs).toBeGreaterThan(WATER.warnAtMs);
  });
  it('drown tick cadence and damage are positive', () => {
    expect(WATER.drownTickMs).toBeGreaterThan(0);
    expect(WATER.drownTickDamage).toBeGreaterThan(0);
  });
  it('scuba takes 5 hits (Henry ruling)', () => {
    expect(WATER.scubaDurability).toBe(5);
  });
  it('surface hysteresis is a small positive band', () => {
    expect(WATER.surfaceHysteresisPx).toBeGreaterThan(0);
    expect(WATER.surfaceHysteresisPx).toBeLessThan(20);
  });
});
```

**Step 2: Run to verify it fails** — `npx vitest run src/config.test.ts` → FAIL (`WATER` not exported)

**Step 3: Implement**

```ts
// Underwater movement + breathing (Level 4). Design: docs/plans/2026-07-12-level4-zombified-lake-design.md
export const WATER = {
  airMs: 30000,            // full breath (Henry: "about 30 seconds")
  warnAtMs: 8000,          // remaining air that triggers "YOU NEED TO GO UP TO BREATHE"
  drownTickMs: 1000,       // cadence of drowning damage at zero air
  drownTickDamage: 8,
  refillRatio: 3,          // vents/surface refill 3x faster than drain
  scubaDurability: 5,      // cracks per hit before shattering
  surfaceHysteresisPx: 6,  // anti-flicker band at the surface line
  gravityFactor: 0.25,     // fraction of world gravity while submerged
  riseVelocity: -180,      // ↑ thrust cap (gentler than flight's)
  maxSinkVelocity: 120,
  torpedoSpeed: 420,       // dash speed underwater (land dash stays PLAYER.dashSpeed)
  exitImpulse: -120,       // extra pop when crossing the surface upward
} as const;
```

**Step 4: Run to verify it passes** — `npx vitest run src/config.test.ts` → PASS
**Step 5: Commit** — `git commit -m "feat: WATER tunables block for Level 4 swim mode"`

### Task 2: Pure air module

**Depends On:** Task 1 *(reads WATER constants)*

**Files:**
- Create: `src/core/air.ts`
- Test: `src/core/air.test.ts`

**Step 1: Write the failing test matrix** (mirror `damage.test.ts` style)

```ts
import { describe, expect, it } from 'vitest';
import { createAirState, tickAir, scubaHit, grantScuba } from './air';
import { WATER } from '../config';

describe('tickAir', () => {
  it('drains while submerged and not in a vent', () => { /* airMs decreases by dt */ });
  it('refills at refillRatio while breathing (head above surface)', () => { /* clamps at max */ });
  it('refills in a vent even while submerged', () => {});
  it('frozen mode changes nothing (cinematic/intro)', () => {});
  it('fires warningStarted exactly once when crossing warnAtMs downward', () => {});
  it('emits damageTicks on drownTickMs cadence at zero air (cadence lives in state)', () => {
    // 2500ms at zero with 1000ms cadence => 2 ticks, 500ms carried in state
  });
  it('clamps huge dt (tab suspension) to one frame worth of ticks', () => {});
  it('scuba grants infinite air: no drain, no ticks while durability > 0', () => {});
  it('resetting after revive: restore(0.5) gives half air and clears cadence', () => {});
});

describe('scubaHit', () => {
  it('decrements durability 5→0 and reports broke on the 5th', () => {});
  it('is a no-op without scuba', () => {});
});
```

Write every body — each is 3–6 lines of arrange/act/assert. No mocks; pure state in, state out.

**Step 2: Run to verify it fails** — `npx vitest run src/core/air.test.ts` → FAIL (module missing)

**Step 3: Implement `src/core/air.ts`**

```ts
// Pure breathing/scuba reducer — mirrors damage.ts. No Phaser imports.
import { WATER } from '../config';

export interface AirState {
  airMs: number;              // remaining breath
  scubaDurability: number;    // 0 = none/broken
  msToNextTick: number;       // drowning cadence carryover
  warned: boolean;            // warning fired for this dip below warnAtMs
}
export interface AirMode { breathing: boolean; inVent: boolean; frozen: boolean }
export interface AirEffects { damageTicks: number; warningStarted: boolean }

export function createAirState(): AirState { /* full air, no scuba */ }
export function grantScuba(s: AirState): AirState { /* durability = WATER.scubaDurability */ }
export function scubaHit(s: AirState): { state: AirState; broke: boolean } { /* decrement, broke on 0 */ }
export function restoreAir(s: AirState, ratio: number): AirState { /* revive hook */ }
export function tickAir(s: AirState, dtMs: number, mode: AirMode): { state: AirState; effects: AirEffects } {
  // clamp dt to 250ms; frozen => identity; scuba>0 => no drain/no ticks;
  // breathing || inVent => refill at refillRatio, reset warned when above warnAtMs, clear cadence;
  // else drain; crossing warnAtMs sets warningStarted once; at 0 accumulate msToNextTick → damageTicks
}
```

**Step 4: Run to verify it passes** — `npx vitest run src/core/air.test.ts` → PASS
**Step 5: Commit** — `git commit -m "feat: pure air/scuba reducer with drowning cadence and freeze mode"`

### Task 3: `bypassShield` in resolveDamage

**Depends On:** none *(pure core; lands before Player wiring)*

**Files:**
- Modify: `src/core/damage.ts`
- Test: `src/core/damage.test.ts`

**Step 1: Write failing tests** — extend the existing matrix:

```ts
it('bypassShield skips shield charges and hits HP directly', () => {});
it('bypassShield still triggers auto-potion below 30%', () => {});
it('bypassShield still consumes Extra Life at 0 HP', () => {});
it('default (no flag) behavior is byte-identical to before', () => {});
```

**Step 2: Run** — `npx vitest run src/core/damage.test.ts` → FAIL
**Step 3: Implement** — add optional `bypassShield?: boolean` to the input record; guard the shield branch with `!input.bypassShield`. Touch nothing else in the pipeline order (i-frames → shield → HP → auto-potion → revive).
**Step 4: Run** — PASS (whole file, not just new tests)
**Step 5: Commit** — `git commit -m "feat: bypassShield input for environmental damage in resolveDamage"`

### Task 4: Typed damage sources + `player-hurt` event (contract task)

**Depends On:** Task 3 *(consumes bypassShield)*

**Files:**
- Modify: `src/entities/Player.ts` (`takeDamage` signature + event emit)
- Modify: `src/scenes/BaseLevelScene.ts` (pass sources at existing call sites)

This locks the contract every later task consumes:

```ts
export type DamageSource = 'contact' | 'projectile' | 'drowning';
// Player.takeDamage(amount: number, fromX: number, source: DamageSource = 'contact')
// drowning: skip knockback velocity, skip i-frame grant, resolveDamage({ bypassShield: true })
// EVERY call emits: this.scene.events.emit('player-hurt', { outcome, source })
```

**Step 1:** No pure test possible (Phaser entity) — the contract is enforced by `npx tsc --noEmit` plus the existing damage matrix. Update all `takeDamage` call sites in `BaseLevelScene` (contact overlaps, boss contact) to pass `'contact'`.
**Step 2:** `npx tsc --noEmit` → clean; `npm test` → all pass.
**Step 3: Commit** — `git commit -m "feat: typed damage sources and player-hurt event; drowning skips knockback/i-frames/shield"`

---

## Phase 2 — Player swim mode

### Task 5: Player environment mode

**Depends On:** Task 1 *(WATER tunables)*

**Files:**
- Modify: `src/entities/Player.ts`

Single most delicate change — follow the design exactly:

1. `setWaterProfile(water?: { surfaceY: number })` stored at create; per-frame derive
   `inWater` (body center vs surfaceY) and `canBreathe` (head sample = body top + 6px)
   each with ±`WATER.surfaceHysteresisPx` hysteresis. Expose both as getters.
2. **Replace** the flight-buff gravity block (Player.ts:178-200) with ONE resolution:
   ```ts
   // gravity precedence: dash → swimming → flight → normal (design ruling)
   let g = 0;
   if (!this.dashing) {
     if (this.inWater) g = -this.scene.physics.world.gravity.y * (1 - WATER.gravityFactor);
     else if (flightDrifting) g = -this.scene.physics.world.gravity.y * (1 - BUFF.flightDriftGravityFactor);
   }
   if (body.gravity.y !== g) body.setGravityY(g);
   ```
   Land-level behavior must be bit-identical (flight math unchanged when `!inWater`).
3. In water: ↑/jump held thrusts toward `WATER.riseVelocity` (reuse the flight thrust
   shape); clamp sink to `WATER.maxSinkVelocity`; gate `doJump`, double jump, and
   `consumeBufferedJump` (a buffered surface press must not fire −470 at the lakebed);
   dash uses `WATER.torpedoSpeed`, keeps i-frames.
4. Slam gate **inside `tryAttack`** (Player.ts:~360): `if (!this.inWater && airborne && falling)` — sinking attacks start combo step 1.
5. Crossing surface upward with negative velocity adds `WATER.exitImpulse` once (dolphin arc).

**Verification steps:** `npx tsc --noEmit` clean; `npm test` all pass (no vitest for Player — the browser playtest in Task 18 exercises every branch; land regression = Levels 1–3 playtest there too).
**Commit** — `git commit -m "feat: player-owned swim mode with single-point gravity resolution"`

---

## Phase 3 — Level data contracts

### Task 6: LevelDef `water` block + BossDef discriminated union (contract task)

**Depends On:** none

**Files:**
- Modify: `src/levels.ts` (types + `kind: 'walker'` on the three existing defs)
- Modify: `src/levels.test.ts` (boss-sanity test branches on `kind`)

**Step 1: Write failing test changes** — the existing "boss defs are internally sane" test narrows on `kind === 'walker'` before reading `walkSpeed`/`canCharge`; add a kraken branch asserting `tentacles between 2 and 3`, `regrowMs > headWindowMs`, `bubble.speed > 0`, `enragedSpreadCount >= 3`.
**Step 2:** `npx vitest run src/levels.test.ts` → FAIL (no `kind` field yet)
**Step 3: Implement types**

```ts
interface BossBase { name: string; hp: number; scale: number; contactDamage: number }
export interface WalkerBossDef extends BossBase {
  kind: 'walker';
  tint?: number; walkSpeed: number; enragedWalkSpeed: number;
  attackIntervalMs: number; enragedAttackIntervalMs: number;
  throneTexture: string; canCharge: boolean; canLeap: boolean;
  summon?: { /* unchanged */ };
}
export interface KrakenBossDef extends BossBase {
  kind: 'kraken';
  tentacles: number; regrowMs: number; headWindowMs: number;
  bubble: { speed: number; intervalMs: number; enragedIntervalMs: number; damage: number };
  enragedSpreadCount: number;
}
export type BossDef = WalkerBossDef | KrakenBossDef;
export interface WaterDef {
  surfaceY: number;
  vents: Array<{ x: number; topY: number; width: number }>;
  scuba: { x: number; y: number };
  fishSchools: Array<{ x: number; y: number; count: number }>;
  eels: Array<{ x: number; y: number }>;
}
// LevelDef gains: water?: WaterDef
```

Add `kind: 'walker' as const` to the three existing boss defs.
**Step 4:** `npm test` → PASS; `npx tsc --noEmit` → clean
**Step 5: Commit** — `git commit -m "feat: BossDef discriminated union and optional LevelDef water block"`

### Task 7: Drowned zombie variant + swim movement branch

**Depends On:** Task 1 *(WATER)*, Task 5 *(same gravity idiom)*

**Files:**
- Modify: `src/config.ts` (`ZombieVariant` + `'drowned'` row; `ZombieVariantDef.movement?: 'ground' | 'swim'`)
- Modify: `src/entities/Zombie.ts` (swim branch)
- Test: `src/config.test.ts`

**Step 1: Failing test** — `it('drowned variant swims', ...)` asserting `movement === 'swim'` and existing variants default ground. Run → FAIL.
**Step 2: Config row** — `drowned: { base: 'zombie', hp: 60, scale: 1.0, patrolSpeed: 40, chaseSpeed: 70, contactDamage: 10, movement: 'swim', bakeColor: 0x4a7a6a, sheet: 'pm-drowned'?, ... }` — start with runtime tint only (WebGL nicety) and NO bake sheet; the design's open question says decide bake color in playtest. So: plain base sheet, optional tint.
**Step 3: Zombie swim branch** — real new movement (design budgeted it): when `movement === 'swim'`: `setGravityY` full offset (neutral buoyancy), sine bob (`baseY + sin(t) * 6`), direct-velocity chase toward the player when aggroed, slow drift patrol otherwise; skip ground lunge, jump-fail comedy, `blocked.down` grounding. Keep the telegraph flash before a contact-speed burst so it stays dodgeable.
**Step 4:** `npm test` PASS, `npx tsc --noEmit` clean. **Step 5: Commit.**

### Task 8: Level 4 def + water invariants + chain flip

**Depends On:** Task 6 *(WaterDef/KrakenBossDef)*, Task 7 *('drowned' variant name)*

**Files:**
- Modify: `src/levels.ts` (append `levelFour`, flip Level 3 `nextSceneKey` to `'Level4'`)
- Modify: `src/levels.test.ts` (water invariants + two water-aware branches)
- Modify: `src/assets.ts` (lake parallax/texture keys)

**Step 1: Write the failing water invariants FIRST:**

```ts
describe('water levels', () => {
  // surface air band: surfaceY >= 90 (player height 48 + headroom margin)
  // every vent: in-bounds, topY > surfaceY (submerged), width > 0
  // >= 2 vents with x >= arenaLeft (inside the locked boss arena)
  // scuba: in-bounds, y > surfaceY, its 24x24 AABB clear of platforms/stones
  // fishSchools/eels: in-bounds, y > surfaceY, clear of solids (same AABB helper)
  // water levels: explicit-y spawns allowed to the lakebed (branch the y < groundY-60 bound)
  // power monsters on water levels: float-position AABB clear of solids (new branch
  //   replacing the skipped rest-position check for explicit-y spawns)
});
```

**Step 2:** Run → FAIL (no water level exists).
**Step 3: Author `levelFour`** — `sceneKey: 'Level4'`, `levelNumber: 4`, name `'THE ZOMBIFIED LAKE'`, `keyIndex: 3`, `nextSceneKey: 'MainMenu'`, `worldWidth: 3400`, `surfaceY: 120`, wreck platforms as terrain bands, drowned/gem-guardian/titan spawns with explicit `y`, fish schools + eels in wrecks, scuba behind a wreck at mid-depth guarded by two eels, vents spaced along the route + 2 in the arena, kraken def (`tentacles: 3, regrowMs: 6000, headWindowMs: 2500, bubble: { speed: 160, intervalMs: 1800, enragedIntervalMs: 1100, damage: 12 }, enragedSpreadCount: 3, hp: 400`). Flip Level 3's `nextSceneKey`. Iterate coordinates until the invariants pass — **the tests are the arbiter, not the first guess**.
**Step 4:** `npm test` → PASS. **Step 5: Commit.**

---

## Phase 4 — Boss seam and the Kraken

### Task 9: Pure kraken phase logic

**Depends On:** Task 6 *(KrakenBossDef shape)*

**Files:**
- Create: `src/core/kraken.ts`
- Test: `src/core/kraken.test.ts`

**Step 1: Failing tests** — pure state machine matrix:

```ts
// createKrakenState(def) → { hp, phase: 'guarded'|'window'|..., tentacles: [{alive, regrowAt}], enraged }
// hitTentacle(s, i, dmg, now): only the GUARDING tentacle takes damage (one active guard)
// tentacle death → phase 'window' with windowEndsAt = now + headWindowMs
// hitHead(s, dmg, now): damages hp ONLY in 'window'; ignored in 'guarded'
// window expiry (tick(s, now)) → schedules regrow, next guard becomes active
// enrage: hp <= 50% → enraged: true, spread = enragedSpreadCount, bubble interval switches
// dead at hp <= 0 regardless of phase
// bubbleDue(s, now) respects intervalMs / enragedIntervalMs cadence
```

**Step 2:** Run → FAIL. **Step 3:** Implement (pure, no Phaser). **Step 4:** PASS. **Step 5:** Commit.

### Task 10: BossEncounter interface + walker adapter

**Depends On:** Task 6 *(BossDef union)*

**Files:**
- Create: `src/entities/BossEncounter.ts` (interface)
- Modify: `src/entities/Boss.ts` (implement interface via thin adapter methods)
- Modify: `src/scenes/BaseLevelScene.ts` (type against the interface at all six touch points: boss field, contact overlap, `wireBossHit`→`wireAttackHitbox`, `triggerRise`, health-bar reads, `onBossDefeated` corpse + key position)

```ts
export interface BossEncounter {
  readonly healthRatio: number;
  readonly isDead: boolean;
  readonly contactBodies: Phaser.Physics.Arcade.Body[];
  readonly contactDamage: number;
  triggerRise(): void;
  update(time: number, delta: number): void;
  wireAttackHitbox(hitbox: Phaser.GameObjects.Zone, damage: number, isSlam: boolean): void;
  playDeath(): { x: number; y: number };  // corpse presentation; returns key-drop spot
}
```

**Behavior-neutral refactor** — the compiler enumerates every touch point. `Boss` keeps its whole state machine; the adapter maps `wireAttackHitbox` onto the existing overlap logic and `playDeath` onto the `'urban-dead'` + `destroyThrone()` sequence.

**Verification:** `npx tsc --noEmit` clean; `npm test` all pass; git diff shows `BaseLevelScene` referencing only the interface. (Levels 1–3 boss regression is playtested in Task 18.)
**Commit** — `git commit -m "refactor: BossEncounter interface seams BaseLevelScene off concrete Boss"`

### Task 11: Kraken entity + pooled laser bubbles

**Depends On:** Task 9 *(phase core)*, Task 10 *(interface)*, Task 4 *('projectile' source)*, Task 14 *(kraken textures — anims must exist)*

**Files:**
- Create: `src/entities/Kraken.ts`

Sprite glue over `src/core/kraken.ts`: head sprite + `def.tentacles` tentacle sprites (HP-bearing arcade bodies at fixed anchor points), pooled bubble group (`physics.add.group` with `allowGravity: false`, TTL 4 s, world-bounds kill, `maxSize: 12`), aimed at the player each `bubbleDue`; enrage swaps to baked `kraken-head-enraged` frames and spread-3 (spread = ±20° around the aim line). Implements `BossEncounter`: `wireAttackHitbox` routes per-swing `hitSet` tentacle-before-head so one swing never hits both; `playDeath` plays a sink-and-burst gore sequence and returns a key spot 80 px above the head, clear of tentacle anchors. Bubbles: one hit each, `takeDamage(def.bubble.damage, bubble.x, 'projectile')`, frozen (velocity zeroed + timers paused) while the scene is in cinematic, cleared on death/shutdown.

**Verification:** `npx tsc --noEmit` clean; `npm test` pass. Behavior verified in Task 18 playtest.
**Commit.**

---

## Phase 5 — Water enemies, pickups, art

### Task 12: Fish and Eel entities + combat wiring

**Depends On:** Task 8 *(spawn data)*, Task 4 *(typed contact damage)*

**Files:**
- Create: `src/entities/Fish.ts`, `src/entities/Eel.ts`
- Modify: `src/scenes/BaseLevelScene.ts` (water enemy groups)

Fish: 20×12 body, no gravity, pack darting — idle wander near school anchor; inside aggro radius, dart at the player at `speed 200` with 600 ms re-aim cadence. Eel: anchored at its def point inside a wreck, hidden-idle; telegraph flash (reuse `ZOMBIE` lunge timing constants) then a 300 px lunge along the player vector, returns to anchor. Both: killable by sword/slam overlap, contact damage via the shared cooldown map (widen `Map<Zombie, number>` to a `Hittable` shape: `{ takeHit(dmg): boolean /* died */; x; y; contactDamage }`), coins + streak credit on kill (design ruling), destroyed with stragglers at the boss trigger, gore burst on death.

**Verification:** `npx tsc --noEmit` clean; `npm test` pass. **Commit.**

### Task 13: Scuba pickup + underwater pickup buoyancy

**Depends On:** Task 8 *(water def)*, Task 2 *(grantScuba)*

**Files:**
- Modify: `src/entities/Pickups.ts` (kind `'scuba'`; buoyancy)
- Modify: `src/scenes/BaseLevelScene.ts` (spawn from `def.water.scuba`, grant on collect)

`PickupKind` gains `'scuba'`: static (gravity off, no bounce), glow pulse like key/orb. On water levels every pickup spawned below `surfaceY` gets `allowGravity: false` + a slow float tween so nothing sinks out of reach. Collecting scuba calls the scene's air-system `grantScuba` and pings `SynthAudio.key()` (reuse until Henry wants a custom sound).

**Verification:** typecheck + tests. **Commit.**

### Task 14: Lake art pack

**Depends On:** none *(parallel-safe; Task 11 and 17 consume it)*

**Files:**
- Create: `src/art/lake.ts`
- Modify: `src/art/art.test.ts` (export-shape), `src/scenes/PreloadScene.ts` (invoke), `src/assets.ts` (keys)

**Step 1: Failing test** — extend the export-shape test with `generateLakeTextures`. Run → FAIL.
**Step 2: Implement** `generateLakeTextures(scene)`: lake parallax bands (blood-red gradient water, `bakeTint` re-tints), wreck/boat props, vent bubble particle, scuba pickup + HUD icon with 5 crack stages (`scuba-hud-0..4`), fish/eel sheets via `bakeSheet` (first non-humanoid: fish = 3-frame wiggle, eel = coil/telegraph/lunge frames), kraken head (normal + **enraged red-eye baked frames**), tentacle segments, laser bubble. Everything baked — Canvas-safe per CLAUDE.md; invoked from `PreloadScene.create()` (defining without invoking = invisible textures). Register fish/eel/kraken anims after bake.
**Step 3:** `npm test` PASS. **Commit.**

---

## Phase 6 — Scene integration and HUD

### Task 15: Water system in BaseLevelScene

**Depends On:** Task 2 *(air)*, Task 4 *(drowning source)*, Task 5 *(canBreathe)*, Task 8 *(def.water)*, Task 13 *(scuba grant)*

**Files:**
- Modify: `src/scenes/BaseLevelScene.ts`

Gated entirely on `def.water` (Levels 1–3 untouched):

1. Create: hand `def.water` to the player; build vent overlap **Zones** (one static zone per vent, `topY→groundY`, visual-only particle emitter — never per-bubble bodies); spawn fish/eel groups and the scuba pickup.
2. Update loop: `tickAir(state, delta, { breathing: player.canBreathe, inVent, frozen })` where `frozen` is true during the intro banner AND the boss cinematic (the same branch that calls `extendBuffs`). Apply `effects.damageTicks` via `player.takeDamage(WATER.drownTickDamage, player.x, 'drowning')`; `warningStarted` → `floatText` "YOU NEED TO GO UP TO BREATHE" + `SynthAudio.heartbeat()` start; at zero air run the heartbeat + red-pulse flags.
3. `'player-hurt'` listener (registered after the `events.off` sweep — scene-restart gotcha): non-drowning + outcome in {hurt, potioned, revived} + scuba worn → `scubaHit`; on `broke`, shatter FX + float "SCUBA DESTROYED!".
4. `lastSafePos`: on water levels, record player position every 2 s when not drowning and not inside a hazard overlap; Extra Life revive uses it (instead of `lastGroundedPos`), then `restoreAir(state, 0.5)`; scuba survives revive.
5. Boss trigger sweep also destroys fish/eel groups; boss creation branches once on `def.boss.kind` → `Boss` adapter or `Kraken`.
6. Publish `{ airMs, maxAirMs, scubaDurability, warned, drowning }` to `this.registry.set('airHud', ...)` each frame; clear the key on shutdown.

**Verification:** `npx tsc --noEmit`; `npm test`; Levels 1–3 code paths unchanged (no `def.water`). **Commit.**

### Task 16: HUD air bar + drowning FX + heartbeat

**Depends On:** Task 15 *(registry snapshot contract)*, Task 14 *(HUD icons)*

**Files:**
- Modify: `src/scenes/HUDScene.ts`
- Modify: `src/core/SynthAudio.ts` (`heartbeat()` — low sine double-thump, rate-limited)

Air bar next to the buff row (panel space verified in review): draining blue→red bar; scuba icon with crack stage from `scubaDurability`; warning text blink below `warnAtMs`; while drowning, a **screen-space red rectangle alpha tween** (Canvas-safe — NOT postFX) + heartbeat. Renders only when the `airHud` registry key exists; listener torn down on shutdown (HUD relaunches per level).

**Verification:** typecheck + tests. **Commit.**

### Task 17: Level4Scene theme + registration

**Depends On:** Task 8 *(def)*, Task 14 *(textures)*, Task 15 *(water system)*

**Files:**
- Create: `src/scenes/Level4Scene.ts`
- Modify: `src/main.ts` (register scene)

`constructor() { super(levelByNumber(4)); }` plus `buildBackdrop` (blood-red murk gradient + moonlight shafts), `buildTerrain` (wreck props over the def's platform bands), `buildAmbience` (floating debris drift, blood wisps, occasional bubble columns) — theme props only; geometry lives in the def.

**Verification:** `npx tsc --noEmit`; `npm test` (chain test now proves L3→L4→MainMenu). **Commit.**

---

## Phase 7 — Full verification

### Task 18: Browser playtest (Canvas + headed WebGL)

**Executor:** claude-subagent *(agent-browser carve-out — acceptance needs a live browser; use the `evernest-superpowers:agent-browser-delegation` pattern, Sonnet)*

**Depends On:** all previous tasks

Playtest via `window.game` + synthetic KeyboardEvents (see repo memory: headless = Canvas so tints are no-ops; never sample physics on the change frame; mute via AudioContext patch).

**Checklist (Canvas, headless):**
- [ ] Full chain: beat L3 → Shop → L4 loads; intro banner freezes air (inspect air state)
- [ ] Swim: ↑ rises, release sinks gently; dash = torpedo with i-frames; attack while sinking = combo step 1 (not slam); no double jump underwater; dolphin arc at surface
- [ ] Air: drains ~30 s; warning text at threshold; at zero, HP ticks with no knockback and shields NOT consumed; surfacing stops it; vent refills
- [ ] Scuba: collect → infinite air; 5 eel/fish hits → crack stages → shatter → meter resumes; dash-through hits don't crack; revive keeps scuba, restores half air, respawns at lastSafePos inside bounds
- [ ] Enemies: drowned zombies float-chase; fish dart; eels telegraph + lunge; kills drop coins and extend streak; Gem Guardian/Titan orbs work underwater
- [ ] Kraken: cinematic freezes air + bubbles; tentacle-guarded head ignores hits; kill guard tentacle → head window → damage lands → regrow closes it; enrage at 50% fires 3-spread; death drops key #4 at a reachable spot; Victory → MainMenu; key 4 replay + GameOver retry work
- [ ] Regression: Levels 1–3 bosses (walker adapter) play unchanged — full L1 run + L2/L3 boss fights

**Headed WebGL pass:** enraged red-eye baked frames visible, murk/lighting read well, drowning red pulse visible.

Report pass/fail per item with any physics values sampled. Fix-and-retest loops stay inside this task.

**Final gates:** `npm test` (all), `npx tsc --noEmit`, `npm run build`.
**Commit** any fixes; then `evernest-superpowers:finishing-a-development-branch`.

---

## Execution Order

1. Task 0: worktree *(orchestrator)*
2. Task 1: WATER config
3. Task 2: air.ts *(needs 1)*
4. Task 3: bypassShield
5. Task 4: typed damage sources *(needs 3)*
6. Task 5: player swim mode *(needs 1)*
7. Task 6: LevelDef/BossDef contracts
8. Task 7: drowned variant *(needs 1, 5)*
9. Task 8: Level 4 def + invariants *(needs 6, 7)*
10. Task 9: kraken.ts pure core *(needs 6)*
11. Task 10: BossEncounter seam *(needs 6)*
12. Task 14: lake art pack *(parallel-safe; before 11)*
13. Task 11: Kraken entity *(needs 9, 10, 4, 14)*
14. Task 12: fish/eel *(needs 8, 4)*
15. Task 13: scuba pickup *(needs 8, 2)*
16. Task 15: scene water system *(needs 2, 4, 5, 8, 13)*
17. Task 16: HUD *(needs 15, 14)*
18. Task 17: Level4Scene *(needs 8, 14, 15)*
19. Task 18: browser playtest *(claude-subagent; last)*
