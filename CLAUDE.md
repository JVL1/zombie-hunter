# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Henry Collaboration Notes

- Henry is 8 years old and co-designing this game. His ideas are awesome — take them seriously
- When Henry suggests game features (enemies, weapons, levels), incorporate them enthusiastically
- Keep language simple and encouraging when explaining code concepts
- Prioritize "cool factor" — splatter effects, big boss fights, fun enemy names
- Henry named the bosses and levels — respect his creative vision (zombie taco truck boss, Giant Brain Behemoth Titan Zombie, etc.)

## Commands

```bash
npm run dev       # Start Vite dev server (hot reload)
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm test          # Vitest unit tests (pure-logic modules only)
npx tsc --noEmit  # Typecheck
```

## Architecture (v2 rebuild, 2026-06-10)

Rebuild design doc: `docs/plans/2026-06-10-rebuild-v2-design.md`. 960×540 (16:9), Phaser 3.90 + TypeScript + Vite. WebGL with Light2D dynamic lighting + PostFX (vignette/bloom); degrades gracefully to canvas (guard with `scene.sys.renderer.type === Phaser.WEBGL`).

### Scene Flow
```
PreloadScene → MainMenuScene → Level1 → Victory → Level2 → Victory → Level3 (+ HUD overlay) → Victory/GameOver → MainMenu/retry
```
Victory advances along each level's `nextSceneKey`; GameOver retries `GameState.currentLevel`. MainMenu number keys 1-N replay any level up to `maxUnlockedLevel`.

### Layout

- **`src/levels.ts`** — data-driven level registry (Phaser-free; vitest imports it). Each `LevelDef` holds world size, parallax/texture keys, platforms/stairs, zombie spawns (with optional explicit `y` for elevated spawns), a `BossDef` (stats, tint, charge/leap flags, optional minion `summon`), and boss-arena geometry. `TRAIN` exports Level 3's train layout. Layout gotchas are enforced by `levels.test.ts` invariants — new level data gets validated for free.
- **`src/config.ts`** — every gameplay tunable (player physics, combat, zombie/boss AI, `ZOMBIE.variants` tint/scale/stat table). Tune here or in the level def, not in entity code. `WORLD.width` no longer exists — width is per-level (`def.worldWidth`).
- **`src/core/`** — `InputController` (keyboard+gamepad, edge detection, jump buffering), `Juice` (hit-stop, shake, zoom punch, slow-mo), `SynthAudio` (ALL audio is WebAudio-synthesized — no audio files; call `unlock()` from a user gesture first), `GameState` (singleton; coins/keys/bestStreak persist via localStorage).
- **`src/fx/`** — `Effects` (flashSprite, knockback, afterimage, shockwave, floatText, `lit()` Light2D helper), `Splatter` (GoreSystem: particle bursts + persistent blood decals on a world-sized RenderTexture).
- **`src/entities/`** — `Player` (coyote time, jump buffer, double jump, dash with i-frames, 3-hit combo, air slam with pogo), `Zombie` (patrol/chase/telegraphed-lunge state machine + jump-fail comedy), `Boss` (SITTING→RISING→FIGHTING→CHARGE/LEAP→DEAD, enrages at 50% HP), `Pickups` (coin/heart/key, coins magnet to player).
- **`src/scenes/`** — `PreloadScene` generates ALL non-sprite textures procedurally (sky, tiles, thrones, particles, decals; one `generate*Textures()` method per theme) and pre-bakes night tints onto the pale parallax layers (canvas-renderer-safe). `BaseLevelScene` owns all generic level logic (combat wiring, boss encounter incl. summons, pickups, parallax/fog, update loop) driven by a `LevelDef`; `Level1/2/3Scene` are thin theme subclasses overriding `buildBackdrop`/`buildTerrain`/`buildAmbience`.

### Key Patterns

- **Sword combat**: Player emits `'player-attack'` / `'player-slam'` scene events with a hitbox + damage payload. Level scene wires overlaps; per-swing `hitSet` prevents multi-hits; colliders destroyed with the hitbox.
- **Scene event listeners**: BaseLevelScene.create() calls `this.events.off(...)` for its custom events FIRST — scene restarts reuse the same EventEmitter and listeners stack otherwise.
- **Contact damage**: overlap + cooldown Map; player has post-hit i-frames and dash i-frames.
- **Boss cinematic**: letterbox bars + camera pan + world/camera bounds locked to the arena; surviving zombies destroyed before bounds shrink.
- **Testing hook**: `window.game` is exposed; playtest by dispatching synthetic KeyboardEvents and inspecting scene objects via `agent-browser eval`.

### Controls

Arrows move, ↑/Space/W jump (double jump), A/J attack (3-hit combo; in air while falling = slam), Shift dash, gamepad fully supported (stick/d-pad, A jump, X/B attack, R1/L1 dash). P toggles physics debug.

### Adding a New Level

1. Append a `LevelDef` to `LEVELS` in `src/levels.ts` and **flip the previous level's `nextSceneKey`** to the new scene key (the chain test enforces this pair of edits; the last built level points at `'MainMenu'`)
2. Add theme textures: a `generate{Theme}Textures()` method in PreloadScene + `bakeTint` parallax re-tints, both invoked from `create()` (defining without invoking = invisible textures)
3. Create `src/scenes/Level{N}Scene.ts` extending `BaseLevelScene` — `constructor() { super(levelByNumber(N)); }` plus `buildBackdrop`/`buildTerrain`/`buildAmbience` overrides for theme props only (geometry belongs in the def; use the optional per-spawn `y` for elevated spawns)
4. Register it in `src/main.ts` scene array
5. `npm test` — the layout invariants validate the new def automatically
6. (Backlog: shops between levels for sword upgrades — a separate post-Level-3 milestone; level transitions are intentionally shopless for now)

## Game Design

Original design doc: `docs/plans/2026-02-22-zombie-hunters-design.md` (story/levels/bosses still canonical)
v2 rebuild: `docs/plans/2026-06-10-rebuild-v2-design.md`

## Implementation Status

- Levels 1-3 fully playable end-to-end with Victory chaining, level-aware GameOver retry, and MainMenu replay (number keys):
  - **Level 1 — The Abandoned City**: 8 zombies, stepping stones, fire barrels, rain/lightning, MUTATED ZOMBIE (tuned with Henry 2026-06-11)
  - **Level 2 — The Broken Down Forest**: horde packs of disgusting zombies, fireflies/moonbeams/dead trees, ZOMBIE PACK KING (charges + summons minions, capped)
  - **Level 3 — The Abandoned Railroad**: parked-but-"moving" train fought across boxcar roofs (speed lines, smoke, zombie driver gag), giant Zanters that can't fit under the train, DIRT MUTATED ZOMBIE
- Zombie variants (`disgusting`, `zanter`) as tint/scale/stat entries in `ZOMBIE.variants`; bosses are data-driven `BossDef`s with optional minion summons
- Advanced graphics: dynamic lighting, postFX, persistent gore decals, baked parallax palettes per level, hit-stop/screen-shake juice
- Synthesized SFX + ambient music (no audio files)
- Verified by automated browser playtest: full 3-level progression, persistence/replay/edge cases (Canvas) + lights/tints/FX pass (headed WebGL), 38 vitest invariants

**Next milestones:** shops between levels, Level 4, more difficulty tuning with Henry

## Gotchas

- Physics world bounds and camera bounds are set separately — BaseLevelScene configures both from `def.worldWidth`
- Boss arena locks world bounds to x≥`def.arenaLeft` — restore if adding post-boss content
- **ALL `setTint` is a no-op on the Canvas renderer** (sprites AND TileSprites — verified against Phaser source). Variant/boss tints are a WebGL nicety; bake tints into textures (`PreloadScene.bakeTint`) for anything that must read on canvas. Headless agent-browser = Canvas, so tints never show there — use `--headed` to verify them
- Stepping stones/platforms near the ground need >56px clearance underneath or the player (48px body) wedges against them (test-enforced in `levels.test.ts`)
- The first zombie must spawn outside aggro+patrol reach of the player spawn or it kills idle players (test-enforced)
- Zombies spawn with body bottom 8px above ground (variant-aware, `BaseLevelScene.zombieSpawnY`); a body spawned overlapping a solid can wedge — keep ground spawns clear of stair stones/platform bands (see Level 3's relocated Zanter comment)
- A pre-commit hook requires tests written + run in the session before `git commit`
- Old v1 code: `.pre-rebuild-backup/` and git history before the v2 rebuild commit
