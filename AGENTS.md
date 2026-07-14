# Agent Guide — Zombie Hunters

This file is the canonical agent guide for this repository (loaded by Claude Code, Codex, and Gemini via the `CLAUDE.md`/`GEMINI.md` symlinks).

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
PreloadScene → MainMenuScene → Level1 → Victory → Shop → Level2 → Victory → Shop → Level3 → Victory → Shop → Level4 (+ HUD overlay) → Victory/GameOver → MainMenu/retry
```
Victory routes through `ShopScene` whenever the level's `nextSceneKey` isn't `'MainMenu'` (the final built level goes straight back to the menu); the shop's HEAD OUT door starts the next level. GameOver retries `GameState.currentLevel` (buffs cleared, consumables retained). MainMenu number keys 1-N replay any level up to `maxUnlockedLevel` — replays still route through the shop.

### Layout

- **`src/levels.ts`** — data-driven level registry (Phaser-free; vitest imports it). Each `LevelDef` holds world size, parallax/texture keys, platforms/stairs, zombie spawns (with optional explicit `y` for elevated spawns), a `BossDef` (stats, tint, charge/leap flags, optional minion `summon`), and boss-arena geometry. `TRAIN` exports Level 3's train layout. Layout gotchas are enforced by `levels.test.ts` invariants — new level data gets validated for free.
- **`src/config.ts`** — every gameplay tunable (player physics, combat, zombie/boss AI, `ZOMBIE.variants` tint/scale/stat table — power-monster variants add `powerUp` + `bakeColor`). Also the shop/power-up data tables: `SWORDS` (tier list), `CONSUMABLES` (potion/shield/life cost+cap), `SHOP`, `POWERUPS` (per-buff name/duration/color), `BUFF` (flight/giant/damage tunables). Tune here or in the level def, not in entity code.
- **`src/core/`** — `InputController` (keyboard+gamepad, edge detection, jump buffering, menu-nav primitives with OS key-repeat filtering), `Juice` (hit-stop, shake, zoom punch, slow-mo), `SynthAudio` (ALL audio is WebAudio-synthesized — no audio files; call `unlock()` from a user gesture first), `GameState` (singleton; coins/keys/bestStreak/purchases/consumables persist via hardened localStorage save — `load()` clamps corrupt values; buff runtime: `grantBuff`/`buffActive`/`activeBuffList(now)`/`extendBuffs(ms, now)`/`clearBuffs`, plus `consumableState(kind)` for shop/HUD display), `damage.ts` (pure `resolveDamage` — the single damage pipeline: i-frames → shield → HP → auto-potion below 30% → extra-life revive → dead; vitest-covered matrix).
- **`src/fx/`** — `Effects` (flashSprite, knockback, afterimage, shockwave, floatText, `lit()` Light2D helper), `Splatter` (GoreSystem: particle bursts + persistent blood decals on a world-sized RenderTexture).
- **`src/entities/`** — `Player` (coyote time, jump buffer, double jump, dash with i-frames, 3-hit combo, air slam with pogo), `Zombie` (patrol/chase/telegraphed-lunge state machine + jump-fail comedy), `Boss` (SITTING→RISING→FIGHTING→CHARGE/LEAP→DEAD, enrages at 50% HP), `Pickups` (coin/heart/key, coins magnet to player).
- **`src/art/`** — procedural texture packs: `helpers.ts` (`bakeTint` re-tints a single image, `bakeSheet` bakes a draw-callback over a spritesheet and registers numbered frames 0..n), `common.ts` (level-agnostic: sky/moon/pickups/power orbs/particles/decals), one `{theme}.ts` per level theme (`city`, `forest`, `rail`), `shop.ts` (shop props + HUD consumable icons), and `powerMonsters.ts` (bakes the 4 power-monster variant sheets from `bakeColor` and exposes `bakedVariantEntries()` — the single predicate both the bake and anim-registration passes use).
- **`src/scenes/`** — `PreloadScene` loads sprites, registers animations, then invokes every `src/art/` generator and the `bakeTint` parallax re-tints from `create()` (defining without invoking = invisible textures; baking is canvas-renderer-safe; power-monster anims derive from the REGISTERED base anims, so their registration must stay after `createAnimations()` + `generatePowerMonsterSheets()`). `BaseLevelScene` owns all generic level logic (combat wiring, boss encounter incl. summons, pickups/orbs, parallax/fog, update loop) driven by a `LevelDef`; `Level1/2/3Scene` are thin theme subclasses overriding `buildBackdrop`/`buildTerrain`/`buildAmbience`. `ShopScene` is the between-levels hub (Blacksmith sword tiers + Apocalypse consumables; arrow-key nav, ↑ never exits).

### Key Patterns

- **Sword combat**: Player emits `'player-attack'` / `'player-slam'` scene events with a hitbox + damage payload. Level scene wires overlaps; per-swing `hitSet` prevents multi-hits; colliders destroyed with the hitbox.
- **Scene event listeners**: BaseLevelScene.create() calls `this.events.off(...)` for its custom events FIRST — scene restarts reuse the same EventEmitter and listeners stack otherwise.
- **Contact damage**: overlap + cooldown Map; player has post-hit i-frames and dash i-frames.
- **Boss cinematic**: letterbox bars + camera pan + world/camera bounds locked to the arena; surviving zombies destroyed before bounds shrink, uncollected power orbs magnetize to the player first (never stranded), and active buff expiries slide forward every frozen frame (`extendBuffs(delta, now)` — continuous, so giant/aura effects never flicker mid-cutscene).
- **Power monsters & buffs**: `ZOMBIE.variants` entries with a `powerUp` use color-baked sprite sheets (Canvas-safe); killing one drops a buff orb (`Pickup` kind `'orb'`); collecting grants a ~10s buff (flight / mega damage / giant ×1.35 with feet-planted body math / invincibility) with a glow aura on the player and a draining countdown slot in the HUD. Buffs clear on revive and on retry.
- **Shop & damage pipeline**: all purchase rules live in `GameState` (data from `SWORDS`/`CONSUMABLES` in config.ts); all hit resolution goes through pure `resolveDamage` in `src/core/damage.ts` — never hand-roll shield/potion/revive logic in entity code. Extra Life revives in place at the last grounded spot (clamped to current physics bounds, so boss-arena revives stay inside).
- **Testing hook**: `window.game` is exposed; playtest by dispatching synthetic KeyboardEvents and inspecting scene objects via `agent-browser eval`.

### Controls

Arrows move, ↑/Space/W jump (double jump), A/J attack (3-hit combo; in air while falling = slam), Shift dash, gamepad fully supported (stick/d-pad, A jump, X/B attack, R1/L1 dash). P toggles physics debug.

### Adding a New Level

1. Append a `LevelDef` to `LEVELS` in `src/levels.ts` and **flip the previous level's `nextSceneKey`** to the new scene key (the chain test enforces this pair of edits; the last built level points at `'MainMenu'`)
2. Add theme textures: create `src/art/{theme}.ts` exporting `generate{Theme}Textures(scene)` + `bakeTint` parallax re-tints, both invoked from `PreloadScene.create()` (defining without invoking = invisible textures), and extend the export-shape test in `src/art/art.test.ts`
3. Create `src/scenes/Level{N}Scene.ts` extending `BaseLevelScene` — `constructor() { super(levelByNumber(N)); }` plus `buildBackdrop`/`buildTerrain`/`buildAmbience` overrides for theme props only (geometry belongs in the def; use the optional per-spawn `y` for elevated spawns)
4. Register it in `src/main.ts` scene array
5. `npm test` — the layout invariants validate the new def automatically (including power-monster placement rules: all 4 buff types must appear somewhere, spawns must sit well before the boss trigger and clear of solids at rest)
6. Shop routing is automatic — Victory sends every non-final level through `ShopScene`, so flipping the previous level's `nextSceneKey` is all the wiring a new level needs

## Game Design

Original design doc: `docs/plans/2026-02-22-zombie-hunters-design.md` (story/levels/bosses still canonical)
v2 rebuild: `docs/plans/2026-06-10-rebuild-v2-design.md`

## Implementation Status

- Levels 1-4 fully playable end-to-end with Victory chaining, level-aware GameOver retry, and MainMenu replay (number keys):
  - **Level 1 — The Abandoned City**: 8 zombies, stepping stones, fire barrels, rain/lightning, MUTATED ZOMBIE (tuned with Henry 2026-06-11)
  - **Level 2 — The Broken Down Forest**: horde packs of disgusting zombies, fireflies/moonbeams/dead trees, ZOMBIE PACK KING (charges + summons minions, capped)
  - **Level 3 — The Abandoned Railroad**: parked-but-"moving" train fought across boxcar roofs (speed lines, smoke, zombie driver gag), giant Zanters that can't fit under the train, DIRT MUTATED ZOMBIE
  - **Level 4 — The Zombified Lake** (co-designed with Henry 2026-07-12): underwater **swim mode** (↑ thrust, reduced gravity, torpedo dash, dolphin surface pop; land jumps/slam gated off), a ~30s **air meter** with drowning + surface/vent refill, destructible **scuba gear** (5-hit crack stages), water enemies (drowned float-chasers, darting fish schools, ambush eels — all `Hittable`), and the **SUNKEN BEAST kraken** boss (tentacle-guarded head → timed damage window → regrow; aimed laser bubbles; 50% enrage 3-spread + baked red-eye frames). Gated on `def.water`; pure cores `air.ts`/`kraken.ts`/`water.ts`. The walker boss now runs through a shared `BossEncounter` interface alongside the Kraken
- Zombie variants (`disgusting`, `zanter`) as tint/scale/stat entries in `ZOMBIE.variants`; bosses are data-driven `BossDef`s with optional minion summons
- **Shop hub between levels** (Blacksmith sword tiers + Apocalypse consumables: potions/shields/extra lives), hardened save/load, pure `resolveDamage` pipeline with auto-potion + in-place Extra Life revive, HUD consumable row
- **Power monsters**: 4 baked-color zombie variants, named by Henry 2026-07-12 — SKY SCREECHER (`vulture`), FURYFANG (`rage`), TITAN ZOMBIE (`titan`), GEM GUARDIAN (`crystal`); names show as float text on kill. They spawn across Levels 1-4 (Gem Guardian + Titan collectible underwater on L4); kills drop buff orbs granting flight / mega damage / giant mode / invincibility with HUD countdowns; orbs magnetize to the player when the boss triggers
- Advanced graphics: dynamic lighting, postFX, persistent gore decals, baked parallax palettes per level, hit-stop/screen-shake juice
- Synthesized SFX + ambient music (no audio files)
- Verified by automated browser playtest: full 4-level progression incl. shop purchases/persistence, power-monster orb→buff→HUD flow, revive edge cases, the L4 swim/air/scuba/kraken flow (Canvas) + lights/tints/FX + enraged red-eye pass (headed WebGL), 159 vitest invariants

**Next milestones:** Level 4 difficulty/feel tuning with Henry (air budget vs. water depth, murk/shaft readability, drowning-cue urgency, whether a contact-triggered revive should also crack scuba); more levels TBD

## Gotchas

- Physics world bounds and camera bounds are set separately — BaseLevelScene configures both from `def.worldWidth`
- Boss arena locks world bounds to x≥`def.arenaLeft` — restore if adding post-boss content
- **ALL `setTint` is a no-op on the Canvas renderer** (sprites AND TileSprites — verified against Phaser source). Variant/boss tints are a WebGL nicety; bake tints into textures (`PreloadScene.bakeTint`) for anything that must read on canvas. Headless agent-browser = Canvas, so tints never show there — use `--headed` to verify them
- **Light2D multiplies the diffuse texture, so a colored resting light washes out baked colors.** A baked feature (e.g. the kraken's red enrage eyes) under a differently-colored light reads as the product — cyan light turned red eyes muddy amber. When you swap to a texture whose whole point is a color, recolor the light too (`applyEnrage` recolors `headLight`). Canvas-invisible (lights are no-ops), so only a **headed-WebGL** playtest catches it
- **Phaser Arcade `overlap`/`collider` always calls back `(singleSprite, groupMember)` regardless of the order you pass a (group, sprite) pair** — it swaps a group-first call internally. So `overlap(group, sprite, (a,b) => …)` gives `a=sprite`, `b=member`, NOT `(member, sprite)`. **Always pass the single sprite first** (every overlap in the codebase does). Passing the group first delivered reversed params and crashed `takeDamage`-on-bubble in the Kraken — a runtime-only bug that was tests/tsc/build-green and only a live playtest surfaced
- Stepping stones/platforms near the ground need >56px clearance underneath or the player (48px body) wedges against them (test-enforced in `levels.test.ts`)
- The first zombie must spawn outside aggro+patrol reach of the player spawn or it kills idle players (test-enforced)
- Zombies spawn with body bottom 8px above ground (variant-aware, `BaseLevelScene.zombieSpawnY`); a body spawned overlapping a solid can wedge — keep ground spawns clear of stair stones/platform bands (see Level 3's relocated Zanter comment)
- A pre-commit hook requires tests written + run in the session before `git commit`
- Old v1 code: `.pre-rebuild-backup/` and git history before the v2 rebuild commit
