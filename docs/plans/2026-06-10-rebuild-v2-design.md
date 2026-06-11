# Zombie Hunters v2 — Rebuild Design

**Date:** 2026-06-10
**Goal:** Full rebuild with advanced graphics and controls. Keep the core theme, story, and characters (Henry's vision: zombie hunter, Abandoned City, throne bosses, keys, the Mutated Zombie). Everything else re-thought.

## What stays (Henry's creative vision)
- Sword-wielding zombie hunter in the Abandoned City
- Keys dropped by throne-sitting bosses (5 keys → portal → final boss)
- Mutated Zombie boss on a throne of crushed cars
- Coins, gore splatter, stepping stones, air slam, zombies failing to jump
- Scene flow: Menu → Level 1 → Victory/GameOver

## Tech decisions
- **Phaser 3.90 + TypeScript + Vite** (kept) — but now using the advanced renderer:
  - **Light2D pipeline**: dark ambient night, flickering fire-barrel lights, player lamp, boss arena red glow
  - **PostFX**: vignette + subtle bloom on the main camera (WebGL-guarded)
  - **Persistent gore decals**: blood stamps onto a level-wide RenderTexture — kills leave marks
  - **WebAudio synthesized SFX + music**: no audio files; all sounds generated (sword whoosh, splats, coins, zombie groans, boss roar, ambient drone music, thunder)
- 960×540 (16:9) at `Scale.FIT`, pixelArt rendering
- Old `src/` fully rewritten; pre-rebuild state backed up in `.pre-rebuild-backup/` + git history

## Graphics direction: apocalyptic night city
- Procedural gradient dusk sky + blood moon
- The pale city-ruin parallax layers **tinted** per-depth into a cohesive night palette
- Rain particles + periodic lightning flash with synth thunder
- Fire barrels (ember particles + flicker lights), broken flickering lampposts
- Foreground fog drift for depth
- Procedural tile textures (asphalt/cracked concrete) lit by Light2D — coherent with lighting, replaces mismatched packs
- Real pixel-art sprites kept for player/zombies (they're good), now lit dynamically
- Juice everywhere: hit-stop, screen shake, zoom punch, damage numbers, afterimages, shockwaves, slow-mo boss kill

## Advanced controls
- Coyote time (100ms), jump buffering (120ms), variable jump height
- **Double jump** (refreshed by slam pogo — skilled players can chain)
- **Dash** (Shift / gamepad R1): i-frames, afterimage trail, 500ms cooldown
- **3-hit sword combo** (A or J): swing-swing-finisher; finisher has bigger reach, damage ×1.7, knockback
- **Air slam** (attack while falling): fast-fall, ground shockwave, pogo bounce on hit
- **Full gamepad support**: stick/d-pad move, A jump, X attack, R1 dash
- Keyboard: arrows move, ↑/Space jump, A/J attack, Shift dash

## Gameplay rethink
- Zombies: patrol → aggro chase → **telegraphed lunge attack** (windup flash, then leap); jump-fail comedy kept; mini health bars; proximity groans
- **Kill streak combo meter** (4s window) shown in HUD; best streak tracked
- Drops: coins (always), hearts (20% — heal 15)
- Boss: SITTING → RISING (cinematic letterbox + roar) → FIGHTING → **ENRAGED at 50% HP** (red tint, faster, adds jump-slam shockwave attack) → DEAD (slow-mo kill cam)
- Charge attack telegraphed; boss stuns briefly if it charges into a wall (damage window)
- localStorage save: coins, keys, best streak persist

## Architecture
```
src/
  main.ts            — Phaser config (WebGL, 960×540, gamepad)
  config.ts          — every tunable in one place
  assets.ts          — asset keys + animation tables
  core/
    InputController  — keyboard+gamepad, edges, jump buffer
    Juice            — hit-stop, shake, zoom punch
    SynthAudio       — WebAudio SFX + music synth (singleton)
    GameState        — run state + localStorage save (singleton)
  fx/
    Effects          — flash, knockback, afterimage, shockwave, floatText, lit() helper
    Splatter         — GoreSystem: particle bursts + persistent decal RenderTexture
  entities/
    Player, Zombie, Boss, Pickups
  scenes/
    Preload, MainMenu, Level1, HUD, Victory, GameOver
```

## Scope of "done" for this rebuild
All currently built content rebuilt and playable end-to-end in the browser:
Menu → Level 1 (8 zombies, platforms, 4 stepping-stone clusters, fire barrels, rain) → boss cinematic + 2-phase fight → key drop → Victory; death → GameOver → retry. Verified by browser playtest.

## Status: COMPLETE (2026-06-10)

Shipped in commits `64dd269` (rebuild) and `76b65e6` (difficulty tune). Verified by automated
browser playtest in both Canvas and WebGL renderers. Bugs found & fixed during verification:
stepping stones wedging the player (need >56px clearance under floating geometry), first zombie
spawn-camping idle players, dash speed decaying through drag.

## Levels 2 and 3 (SHIPPED 2026-06-11)

Status: complete — see `docs/plans/2026-06-11-levels-2-3-implementation.md` for the full
implementation record. What shipped:

- **Shared engine:** `src/levels.ts` data registry (`LevelDef`/`BossDef`, layout-invariant vitest
  suite) + `BaseLevelScene` extraction — Level 1 shrank to a ~74-line theme subclass. Victory
  chains levels, GameOver retries the current level, MainMenu number keys replay unlocked levels,
  `GameState` tracks `currentLevel`/`maxUnlockedLevel` with legacy-save migration.
- **Level 2 — The Broken Down Forest:** horde packs of `disgusting` zombies, procedural forest
  tiles + mossy parallax bakes, fireflies/moonbeams/dead trees, ZOMBIE PACK KING (charge boss
  with capped minion summons) on the dead-tree throne, Key #2.
- **Level 3 — The Abandoned Railroad:** parked-but-"moving" train (locomotive + 4 boxcars from
  exported `TRAIN` geometry data, fought across the roofs; speed lines/smoke/zombie-driver gag
  sell the motion), giant `zanter` variants that can't fit under the train, DIRT MUTATED ZOMBIE
  on the train-parts throne, Key #3.
- Verified by automated browser playtest: full 3-level progression + persistence/replay/edge
  cases (Canvas) and lights/tints/postFX (headed WebGL). Level 1 boss difficulty tuned with
  Henry (2026-06-11).
- Shops between levels (Blacksmith / Apocalypse) remain a separate later milestone; Level 4+
  are still specs in `docs/plans/2026-02-22-zombie-hunters-design.md`.
