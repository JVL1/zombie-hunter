# Level 4 — THE ZOMBIFIED LAKE

Co-designed with Henry, 2026-07-12. Henry's calls: full-underwater level, scuba gear
that breaks, drowned kraken boss with tentacle-guarded head, triple-bubble enrage.

Revised 2026-07-12 after a three-model design review (Claude, Gemini, Codex) — the
revision replaced the scene-owned swim flag with a Player-owned environment mode,
added typed damage sources, a `BossEncounter` interface, fish/eel spawn data in the
level def, and Canvas-safe visuals for every state cue.

## Problem

The game ends at Level 3 holding 3 of the 5 portal keys with nowhere to go. Henry's
Level 4 vision — a creepy zombified lake with blood in the water — needs three
mechanics the engine doesn't have yet: swimming, a breathing meter, and a
projectile-firing boss.

## Goals

- Level 4 playable end-to-end: Level 3 Victory → Shop → Level 4 → Sunken Beast →
  key #4 → Victory → MainMenu (Level 4 becomes the last built level)
- Swim movement: ↑ to swim up, dash becomes a torpedo burst with i-frames, sword
  combo works normally underwater
- Breathing meter (~30 s of air): low-air warning text "YOU NEED TO GO UP TO
  BREATHE"; at zero, damage ticks with red screen pulse and heartbeat SFX —
  survivable by surfacing
- Scuba gear (Henry's invention): hidden pickup, infinite air while worn, visibly
  cracks on each real hit taken, shatters on the 5th
- Bubble streams rising from lakebed cracks refill the meter; two inside the locked
  boss arena
- Water enemies: Drowned Zombie (slow floaty swimmer), Zombie Fish (small fast pack
  darters), Zombie Eel (wreck ambush lunge)
- Power monsters present: Gem Guardian and Titan Zombie
- Boss: THE SUNKEN BEAST — drowned kraken. Tentacles guard the head; chop the
  guarding tentacle to open a timed window, slash the head before it closes. Beak
  fires aimed laser bubbles; at 50% HP it enrages: red glowing eyes (baked frames),
  triple-bubble spread

## Non-Goals

- The portal itself (the 5-key payoff) — that is Level 5 content
- The "water demon" Blacksmith weapon — recorded for the shop later, unlock timing
  TBD with Henry
- Water anywhere outside Level 4 — no swimming retrofit to Levels 1–3
- Scuba persistence across levels — the gear is found fresh each run and does not
  survive the level (it does survive an Extra Life revive within the level; it is
  equipment, not a buff)
- Migrating `zombieSpawns` to a general enemy-spawn union — fish/eels get their own
  arrays for now

## Design Rulings (made during review; flag to Henry if he disagrees)

- Shields do NOT absorb drowning — shields are combat gear. Auto-potion and Extra
  Life still trigger on drowning, so it stays survivable but costly.
- Shield-absorbed hits do NOT crack the scuba; neither do hits ignored by
  i-frames, dash, or the invincibility buff. Only outcomes that actually cost
  something (`hurt`, `potioned`, `revived`) crack it.
- Fish and eels drop coins and count toward the kill streak — small fry, same fun.
- The player spawns submerged; the air meter is frozen during the level-intro
  banner and the boss cinematic (same treatment buffs already get).

## Acceptance Criteria

- [ ] Beating Level 3 routes through the Shop to Level 4; beating Level 4 grants
      key #4 (`keyIndex: 3`) and returns to MainMenu; MainMenu key 4 replays it;
      GameOver retries it with buffs cleared; an existing save holding keys 1–3
      auto-unlocks Level 4 on first load (existing `keysUnlock` logic)
- [ ] Player swims (↑ thrusts up, gentle gravity underwater), torpedo dash keeps
      i-frames, double jump / buffered ground jumps / slam are gated off in water,
      sword combo works — including while sinking (no accidental slams)
- [ ] Air meter drains over ~30 s, warns at low air, ticks damage at zero with no
      knockback and no i-frame grant; drain stops on surfacing (head above water)
      or inside a bubble stream; air is frozen during intro banner and boss
      cinematic
- [ ] Scuba pickup grants infinite air, shows crack stages per cracking hit,
      breaks on the 5th and the meter resumes from where it froze
- [ ] Sunken Beast fight: the guarding tentacle blocks the head; killing it opens
      a timed head window; tentacles regrow; laser bubbles aim at the player;
      enrage (50% HP) fires 3-bubble spreads with baked red-eye frames visible on
      Canvas
- [ ] All existing vitest invariants pass (two get water-aware branches — see
      Testing); new invariants cover water geometry
- [ ] Kraken phase logic (windows, regrow, enrage) is unit-tested as a pure module

## Architecture

Water is a **level-def property, not an engine rewrite**. `LevelDef` gains an
optional `water` block; levels without it behave exactly as today. Two new deep
modules: the `Kraken` entity (sprite glue over a pure phase-logic core) and the
Player's environment mode. Everything else extends proven seams.

### LevelDef (src/levels.ts — stays Phaser-free)

```ts
water?: {
  surfaceY: number;      // top of water; must leave an air band ≥ player height + margin below y=0
  vents: Array<{ x: number; topY: number; width: number }>; // bubble-stream refill volumes
  scuba: { x: number; y: number };                          // static hidden pickup position
  fishSchools: Array<{ x: number; y: number; count: number }>;
  eels: Array<{ x: number; y: number }>;                    // anchored ambush points (in wrecks)
}
```

Fish/eel spawns live in the def — not hardcoded in the scene — so the Phaser-free
invariant tests can validate them like zombie spawns.

`BossDef` becomes a **discriminated union with a required `kind`** on every def:
`WalkerBossDef` (`kind: 'walker'` added to Levels 1–3 — a three-line migration) and
`KrakenBossDef` (`kind: 'kraken'`: tentacle count, regrow ms, head-window ms,
bubble speed/interval/damage, enraged spread count). Shared base fields: `name`,
`hp`, `scale`, `contactDamage`. Walker keeps `throneTexture`/`canCharge`/`canLeap`/
`summon`; the kraken has no throne — it lurks coiled in a wreck and rises. The
optional-discriminator variant was rejected: TypeScript can't narrow it reliably.

### Swim mode (src/entities/Player.ts) — Player owns the environment

The scene hands the water def to the player once at create
(`player.setWaterProfile(def.water)`); the player derives its own state per frame.
Review finding folded in: a scene-set flag fights the flight buff's gravity reset,
so **gravity is resolved in exactly one place** per frame with precedence
**dash → swimming → flight → normal** (this replaces the flight-only
`setGravityY` block; behavior on land levels is unchanged).

- Two derived states with hysteresis (±6 px) to prevent surface flicker:
  `inWater` (body center below surface — movement mode) and `canBreathe` (head
  sample point above surface — feeds the air meter)
- In water: gentle gravity, ↑/jump thrusts toward a rise-velocity cap (flight-buff
  math, water-tuned), dash keeps i-frames at torpedo speed, double jump and
  ground-jump buffering are gated off (a ↑ press buffered at the surface must not
  fire a full jump on the lakebed)
- Slam is gated **inside `tryAttack`** (`!inWater && airborne && falling`) —
  underwater the player is always "airborne", so gating input elsewhere is not
  enough; sinking attacks must start combo step 1
- Crossing the surface upward keeps momentum (small exit impulse) — dolphin arcs
  work; above water, normal physics resume
- Tunables live in a new `WATER` block in `config.ts`

### Typed damage (src/core/damage.ts + Player.takeDamage)

`takeDamage(amount, fromX, source)` with `source: 'contact' | 'projectile' |
'drowning'`. All sources still route through pure `resolveDamage`, but drowning:
skips knockback, grants no i-frames, and bypasses shield charges (see Rulings).
`resolveDamage` gains the `bypassShield` input; the vitest matrix extends to cover
it. The player emits a new scene event **`'player-hurt'`** carrying the
`DamageOutcome` + source — the scuba, HUD, and FX all key off this one event
instead of inventing their own hooks.

### Air meter (src/core/air.ts — pure, vitest-covered)

Pure reducer over a small state record, mirroring `damage.ts`:

```ts
tickAir(state, dtMs, mode: { breathing: boolean; inVent: boolean; frozen: boolean })
  → { state, effects: { damageTicks: number; warningStarted: boolean } }
scubaHit(state) → { state, broke: boolean }   // durability 5 → 0, crack stages
```

Drowning damage cadence lives **in the state** (`msToNextTick`), `dt` is clamped
(tab-suspension safe), and `frozen` mirrors the buff-extension treatment during
cinematics. Scuba state rides in the same record (one reducer is simpler for one
level; split later if a second scuba consumer appears). The scene applies
`damageTicks` through `takeDamage(..., 'drowning')` — no hand-rolled HP math.
Scuba durability decrements when `'player-hurt'` reports a cracking outcome
(per Rulings) from a non-drowning source.

### Boss seam (BossEncounter interface) + Kraken

Review consensus: `BaseLevelScene` touches the concrete `Boss` in six places
(typed field, contact overlap on `BossState`, `wireBossHit` single-body overlap,
`triggerRise()`, health-bar reads, `onBossDefeated`'s corpse anim + throne
destroy). A duck-typed kraken would scatter type guards. So:

```ts
interface BossEncounter {
  healthRatio: number; isDead: boolean;
  triggerRise(): void;                       // cinematic hook
  update(time: number, delta: number): void;
  wireAttackHitbox(hitbox, damage): void;    // each boss routes hits itself
  contactBodies: Body[];                     // player-contact overlap targets
  playDeath(): { x: number; y: number };     // corpse anim; returns key-drop spot
}
```

`Boss` gets a thin adapter implementing it (existing behavior unchanged);
`Kraken` implements it natively. The scene keeps one creation branch on
`def.boss.kind`; cinematic, HP bar, and key-drop wiring go through the interface.

**Kraken phase logic is a pure module** (`src/core/kraken.ts`) — the riskiest new
code gets the vitest treatment: one guarding tentacle active at a time; killing it
opens a fixed head-damage window; the window closes by scheduling regrowth; enrage
at ≤50% HP switches to spread-3 bubbles. The entity is sprite glue: tentacle
sprites (HP-bearing arcade bodies), the head, and a **pooled projectile group**
(no gravity, TTL + world-bounds kill, one hit per bubble, frozen during the
cinematic, cleared on boss death and scene shutdown; dodged via dash i-frames,
damage source `'projectile'`). Sword-hit priority: the per-swing `hitSet` consumes
the tentacle before the head so one swing never hits both.

The key drops at `playDeath()`'s returned position, clear of tentacle bodies and
swimmable. Underwater pickups (key, orbs, coins, hearts) get buoyancy: gravity off
below the surface so nothing sinks out of reach; orb magnetization already handles
the boss-trigger sweep.

### Water enemies

- **Drowned Zombie** — `ZombieVariantDef` gains `movement: 'ground' | 'swim'`
  (default `'ground'`; a bare boolean was rejected — review finding). The swim
  branch in `Zombie.ts` is real new movement code, budgeted as such: zero gravity,
  sine bob, slow direct-velocity chase, no ground lunge / jump-fail / patrol legs.
- **Zombie Fish / Zombie Eel** — new small entities (`src/entities/Fish.ts`,
  `Eel.ts`); pack darting and anchored lunge don't fit the humanoid state machine.
  Eels reuse the telegraphed-lunge timing constants. Both wire into combat through
  the same scene plumbing as zombies: attack/slam overlap, contact damage with
  cooldown (`source: 'contact'`), destroyed with stragglers at the boss trigger,
  coins + streak credit on kill (see Rulings). The contact-cooldown map widens to
  a shared `Hittable` shape rather than `Zombie`.

### Cinematics & revive (edge cases from review)

- Intro banner and boss cinematic freeze the air meter (`frozen: true`) exactly as
  `extendBuffs` slides buff expiries — no unavoidable drowning while frozen
- The boss-trigger sweep destroys fish and eel groups along with surviving zombies
- Extra Life revive underwater: `lastGroundedPos` is meaningless mid-lake, so the
  player tracks `lastSafePos` (periodic safe point: not drowning, not overlapping
  a hazard) on water levels; revive restores 50% air, resets the drowning cadence,
  and keeps the scuba (equipment, not a buff)

### Scene & HUD

`Level4Scene` extends `BaseLevelScene` (`buildBackdrop`/`buildTerrain`/
`buildAmbience` for the blood-red look: red murk overlay, floating debris,
moonlight shafts, blood wisps). Vents are **one static overlap `Zone` each** plus
a visual-only particle emitter — never per-bubble physics bodies.

Air/scuba state is level-local and never enters the persisted `GameState` save.
The scene publishes a typed snapshot to the HUD via the scene registry each frame;
the HUD renders the air bar (next to the buff row — panel space verified) only
when a snapshot is present, and tears down its listener on shutdown.

Canvas-safe state cues (review critical): the drowning pulse is a screen-space red
rectangle alpha tween (not postFX), and every kraken phase change is a **baked
frame swap** — enraged red eyes are baked textures, with WebGL tint/Light2D as
garnish only. Heartbeat SFX is a new `SynthAudio.heartbeat()`.

### Art (src/art/lake.ts)

`generateLakeTextures(scene)` — water overlay bands, wreck props, vent bubbles,
scuba pickup + HUD icon with crack stages, fish/eel sheets, kraken body + tentacle
+ laser bubble, **normal and enraged kraken head frames**. All baked
(Canvas-safe), invoked from `PreloadScene.create()`; `src/art/art.test.ts`
export-shape test extended.

The scuba pickup is a static overlap pickup (new `Pickup` kind `'scuba'`, gravity
off) tucked behind a wreck prop and guarded by eels — hidden means visually
obscured, not gated.

## Wiring checklist (chain edits the tests enforce)

1. Flip Level 3's `nextSceneKey` to `'Level4'`; Level 4 gets `'MainMenu'`
2. Register `Level4Scene` in `src/main.ts`
3. Invoke `generateLakeTextures` from `PreloadScene.create()`
4. `WATER` tunables block + `POWERUPS`-style constants in `config.ts`
5. New `Pickup` kind `'scuba'`; buoyancy for underwater pickups
6. `SynthAudio.heartbeat()`

## Testing

- `air.test.ts`: drain/refill/warning/drowning-cadence/frozen/scuba matrix (pure)
- `kraken.test.ts`: tentacle window opens/closes, regrow scheduling, one-guard
  invariant, enrage threshold and spread count (pure)
- `damage.test.ts`: extended matrix for `bypassShield` (drowning vs shield/potion/
  revive)
- `levels.test.ts`: **two existing invariants get water-aware branches** (the
  explicit-y "above ground" bound falsely rejects lakebed spawns; the
  power-monster rest-AABB check skips explicit-y spawns entirely — water levels
  instead assert the float-position AABB is clear of solids). New invariants:
  surface air band ≥ player height + margin; vents in-bounds, submerged, and ≥2
  inside the locked arena; scuba in-bounds, submerged, clear of solids;
  fish/eel spawns validated like zombie spawns; boss-sanity test branches on
  `kind` with kraken-specific checks
- `config.test.ts`: WATER tunables sane (air duration > warning threshold, scuba
  durability 5, etc.)
- Browser playtest (agent-browser): full Level 4 run — swim, drown-and-survive,
  drown-tick during dash, scuba break while shielded, cinematic air freeze,
  kraken kill, key #4 grant; enrage visuals verified `--headed` (Canvas tints are
  no-ops)

## Open Questions

- Exact scuba hiding spot (an eel-guarded wreck; final coordinates settle when the
  level geometry is laid out — the placement invariants are the arbiter)
- Fish/eel sprite look — first non-humanoid bakes; iterate with Henry at the screen
- Whether drowned zombies need a distinct bake color or read fine as the base
  zombie floating (decide in playtest)
