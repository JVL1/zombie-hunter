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
PreloadScene → MainMenuScene → Level1Scene (+ HUD overlay) → Victory/GameOver → MainMenu/retry
```

### Layout

- **`src/config.ts`** — every gameplay tunable (player physics, combat, zombie/boss AI). Tune here, not in entity code.
- **`src/core/`** — `InputController` (keyboard+gamepad, edge detection, jump buffering), `Juice` (hit-stop, shake, zoom punch, slow-mo), `SynthAudio` (ALL audio is WebAudio-synthesized — no audio files; call `unlock()` from a user gesture first), `GameState` (singleton; coins/keys/bestStreak persist via localStorage).
- **`src/fx/`** — `Effects` (flashSprite, knockback, afterimage, shockwave, floatText, `lit()` Light2D helper), `Splatter` (GoreSystem: particle bursts + persistent blood decals on a world-sized RenderTexture).
- **`src/entities/`** — `Player` (coyote time, jump buffer, double jump, dash with i-frames, 3-hit combo, air slam with pogo), `Zombie` (patrol/chase/telegraphed-lunge state machine + jump-fail comedy), `Boss` (SITTING→RISING→FIGHTING→CHARGE/LEAP→DEAD, enrages at 50% HP), `Pickups` (coin/heart/key, coins magnet to player).
- **`src/scenes/`** — `PreloadScene` generates ALL non-sprite textures procedurally (sky, tiles, throne of cars, particles, decals) and pre-bakes night tints onto the pale parallax layers (canvas-renderer-safe).

### Key Patterns

- **Sword combat**: Player emits `'player-attack'` / `'player-slam'` scene events with a hitbox + damage payload. Level scene wires overlaps; per-swing `hitSet` prevents multi-hits; colliders destroyed with the hitbox.
- **Scene event listeners**: Level1Scene.create() calls `this.events.off(...)` for its custom events FIRST — scene restarts reuse the same EventEmitter and listeners stack otherwise.
- **Contact damage**: overlap + cooldown Map; player has post-hit i-frames and dash i-frames.
- **Boss cinematic**: letterbox bars + camera pan + world/camera bounds locked to the arena; surviving zombies destroyed before bounds shrink.
- **Testing hook**: `window.game` is exposed; playtest by dispatching synthetic KeyboardEvents and inspecting scene objects via `agent-browser eval`.

### Controls

Arrows move, ↑/Space/W jump (double jump), A/J attack (3-hit combo; in air while falling = slam), Shift dash, gamepad fully supported (stick/d-pad, A jump, X/B attack, R1/L1 dash). P toggles physics debug.

### Adding a New Level

1. Create `src/scenes/Level{N}Scene.ts` following Level1Scene's pattern
2. Register it in `src/main.ts` scene array
3. Update the previous level's victory transition to start the new level
4. Add a shop scene between levels for sword upgrades and items

## Game Design

Original design doc: `docs/plans/2026-02-22-zombie-hunters-design.md` (story/levels/bosses still canonical)
v2 rebuild: `docs/plans/2026-06-10-rebuild-v2-design.md`

## Implementation Status

- Level 1 (Abandoned City) fully playable end-to-end: 8 zombies, stepping stones, fire barrels, rain/lightning, boss with enrage phase, key #1, Victory/GameOver
- Advanced graphics: dynamic lighting, postFX, persistent gore decals, parallax night city, hit-stop/screen-shake juice
- Synthesized SFX + ambient music (no audio files)
- Verified by automated browser playtest (full level + boss kill + both end screens)

**Next milestones:** difficulty tuning with Henry, shops between levels, Level 2 (Broken Down Forest)

## Gotchas

- Physics world bounds and camera bounds are set separately — both need configuring per level
- Boss arena locks world bounds to x≥2600 — restore if adding post-boss content
- TileSprite `setTint` is WebGL-only — bake tints into textures (see `PreloadScene.bakeTint`) for canvas compatibility
- Stepping stones/platforms near the ground need >56px clearance underneath or the player (48px body) wedges against them
- The first zombie must spawn outside aggro+patrol reach of x=100 or it kills idle players at spawn
- A pre-commit hook requires tests written + run in the session before `git commit`
- Old v1 code: `.pre-rebuild-backup/` and git history before the v2 rebuild commit
