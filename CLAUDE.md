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
```

No tests or linting configured yet.

## Architecture

### Scene Flow
```
PreloadScene → MainMenuScene → Level1Scene (+ HUD overlay) → Victory/GameOver → MainMenu
```

Phaser scenes are the top-level game screens. Each has `create()` (setup) and `update()` (every frame). HUDScene runs in parallel as an overlay via `scene.launch('HUD')`.

### Three-Layer Organization

- **`src/scenes/`** — Game screens. Each scene manages game objects, physics colliders, and event wiring. Level scenes spawn entities and connect them.
- **`src/entities/`** — Game objects with behavior (Player, Zombie, Boss). Extend `Phaser.Physics.Arcade.Sprite`. Each has its own `update()` called by the parent scene.
- **`src/systems/`** — Shared logic:
  - `GameState` — Singleton (`GameState.getInstance()`) holding health, coins, keys, sword stats. Persists across scenes.
  - `Combat` — `Damageable` interface, `flashSprite()`, `knockback()` utilities.
  - `Splatter` — Particle burst effects (blood, skin, brain) on hit/kill.
  - `SoundManager` — Gracefully plays audio if loaded, silently skips if not.

### Key Patterns

- **Sword combat**: Player emits `'player-attack'` event with a temporary hitbox rectangle. The level scene listens and checks overlaps with enemies.
- **Contact damage**: `physics.add.overlap()` with a cooldown Map to prevent instant death.
- **Boss encounters**: State machine (`BossState` enum: SITTING → RISING → FIGHTING → DEAD) with tweens for the throne-rise cinematic.
- **Placeholder assets**: Generated as colored shapes in PreloadScene via `graphics.generateTexture()`. Real pixel art will replace these — see `docs/plans/2026-02-22-asset-acquisition-plan.md`.

### Adding a New Level

1. Create `src/scenes/Level{N}Scene.ts` following Level1Scene's pattern
2. Register it in `src/main.ts` scene array
3. Update the previous level's victory transition to start the new level
4. Add a shop scene between levels for sword upgrades and items

## Game Design

Full design doc: `docs/plans/2026-02-22-zombie-hunters-design.md`
Implementation plan: `docs/plans/2026-02-22-zombie-hunters-level1-plan.md`

## Implementation Status

- Level 1 (Abandoned City) is fully playable with placeholder art
- Player movement, jumping, sword combat
- 8 zombies with patrol/chase AI
- Blood/skin/brain splatter particle effects
- HUD with health bar, coin counter, 5 key slots
- Boss throne encounter with cinematic rise
- Victory and Game Over screens with retry
- Sound hooks wired up (no audio files yet)

**Next milestones:** Integrate real pixel art assets, add shops between levels, build Level 2

## Gotchas

- Physics world bounds and camera bounds are set separately — both need configuring per level
- Boss arena locks world bounds to a 600px region — remember to restore when adding post-boss content
- `createCursorKeys()` for arrows, `addKey()` for individual keys (A = attack, D = debug toggle)
- Sprite `.setDepth()` controls render order (boss in front of throne)
- HUD uses `setScrollFactor(0)` to stay fixed on screen
