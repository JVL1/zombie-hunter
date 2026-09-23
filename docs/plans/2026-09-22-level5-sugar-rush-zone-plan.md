# Level 5 — The Sugar Rush Zone Implementation Plan

> Track progress in this file only. This repo stays out of Linear.

**Goal:** Build Level 5 (THE SUGAR RUSH ZONE) from start to end. The design is `docs/plans/2026-09-22-level5-sugar-rush-zone-design.md`.

**Non-Goals:** Level 6 and Level 7, a chocolate river hazard, candy cane slides, lollipop zombies, and new shop items.

**Architecture:** Candy is an optional `LevelDef` block. The sour candy and worm phase logic are pure modules with vitest tests, like `air.ts` and `kraken.ts`. The `Worm` boss implements `BossEncounter`. The candy enemies implement `Hittable`. All visuals are baked textures, so they are Canvas-safe.

**Credit:** Put "Wes's idea" in code comments at the worm, the sour candy, the marshmallows, and the three candy enemies.

---

## Acceptance Criteria

The full list is in the design doc. In short:

- [ ] The chain works: L4 → Shop → L5 → Victory → MainMenu. Replay, retry, and the keys 1–4 auto-unlock work. Key #5 is granted.
- [ ] Marshmallows bounce higher than a double jump and reset the jump count.
- [ ] Gummy bears split into 2 cubs. Gumballs shake, roll, and drop a sour candy. Chocolate zombies melt and reform behind the player.
- [ ] The worm loop works: shake → pop → mouth → feed → dizzy → dig. Enrage starts at 50%.
- [ ] Key #5 opens the portal, and the portal ends the level.
- [ ] All cues show on Canvas. The tests pass, and `npx tsc --noEmit` and `npm run build` are clean.
- [ ] Levels 1–4 do not change.

---

## Tasks

Do the tasks in order. Each task ends with `npm test` and `npx tsc --noEmit`, and then a commit.

### Task 0 — Branch

1. Create the branch `feat/level5-sugar-rush-zone`.
2. Run `npm test` to get a green baseline.

### Task 1 — Pure sour candy core

- **Files:** `src/core/sourCandy.ts`, `src/core/sourCandy.test.ts`, and a `CANDY` block in `src/config.ts`.
- Write `collect`, `tryFeed(state, mouthOpen)`, and `knockLoose(state, now, cooldownMs)`. The cap is 3.
- Write the tests first. Cover the cap, a feed with 0 candies, a feed while the mouth is closed, and the cooldown edge.

### Task 2 — Pure worm phase core

- **Files:** `src/core/worm.ts` and `src/core/worm.test.ts`.
- Write `tick(state, now, playerX)`, which returns `{ state, effects }`, like the kraken core. The effects are `popAt`, `startShake`, `openMouth`, `summonCubs`, and `dig`.
- Write `feed(state, now)` and `hit(state, dmg, def)`. `hit` returns the damage done: the chip ratio when the King is not dizzy, and the multiplier when he is dizzy. It returns 0 while the King is UNDER.
- Tests: the phase order, a feed only in EXPOSED with the mouth open, the dizzy expiry, the enrage threshold with faster timings, and the summon cap.

### Task 3 — Level data and invariants

- **Files:** `src/levels.ts` and `src/levels.test.ts`.
- Add `CandyDef`, `WormBossDef` (with `kind: 'worm'`), and `portal?: { x }`.
- Add the `levelFive` def: `keyIndex: 4`, `nextSceneKey: 'MainMenu'`, a world width of about 3600, marshmallows, candy enemies, a Sky Screecher, a Furyfang, and the portal in the arena.
- Change `levelFour.nextSceneKey` to `'Level5'`.
- Add these invariants:
  - Marshmallows are in bounds, clear of solids, and before `triggerX`.
  - Candy spawns are clear of solids and outside the spawn-camp reach.
  - The portal is inside `[arenaLeft, worldWidth]`.
  - The worm boss def passes the sanity branch.
- Add placeholder `Assets` keys now, so the def compiles.
- **CAUTION:** Until Task 9, `levelFromQuery` accepts `?level=5`, but the scene is not registered. Do not merge before Task 9.

### Task 4 — Candy art

- **Files:** `src/art/candy.ts`, `src/assets.ts`, `src/scenes/PreloadScene.ts`, and `src/art/art.test.ts`.
- Bake these textures: the ground and platform tiles, the marshmallow with a squash frame, gummy bear and cub hop frames, gumball roll and shake frames, chocolate walk, melt, and puddle frames, the sour candy pickup and HUD icon, the worm segment, the head frames (closed, open, and dizzy), the dirt mound, the dizzy stars, and the portal swirl.
- Add the parallax re-tints.
- Call the texture code from `PreloadScene.create()`. Code that the preload scene does not call gives invisible textures.
- Extend the export-shape test.

### Task 5 — Marshmallow bounce

- **Files:** `src/entities/Player.ts` and `src/scenes/BaseLevelScene.ts`.
- Add `player.bounce(power)`. It sets the up speed, resets the jumps, and cancels a slam. A slam gives a pogo bonus.
- In the scene, build the pads from `def.candy.marshmallows` as static solids with a collider. Call `bounce` on a landing from above.
- Add a squash tween and `SynthAudio.boing()`.

### Task 6 — Candy enemies

- **Files:** `src/entities/candy/GummyBear.ts`, `Gumball.ts`, `Chocolate.ts`, and `src/scenes/BaseLevelScene.ts`.
- Rename `waterEnemies` to `extraEnemies`. This change is behavior-neutral for Level 4.
- Spawn from `def.candy.enemies`.
- Gummy bears split on death. Emit `'gummy-split'`, and spawn 2 cubs. A cub is a GummyBear with `isCub = true`, and a cub does not split.
- Add the gumball sour candy drop to `onEnemyKilled`.
- A chocolate zombie cannot take a hit while it is a puddle: `takeHit` returns false and does no damage.
- Add the new custom events to the `this.events.off(...)` list at the top of `create()`.

### Task 7 — Sour candy pickup and HUD

- **Files:** `src/entities/Pickups.ts`, `src/scenes/BaseLevelScene.ts`, and `src/scenes/HUDScene.ts`.
- Add the Pickup kind `'sourCandy'`.
- The scene holds the `sourCandy` state from Task 1. Clear it on retry, and keep it through a revive.
- Publish a registry snapshot. The HUD shows the icon and the count only when a snapshot exists. Remove the listener on shutdown.

### Task 8 — Worm boss entity

- **Files:** `src/entities/Worm.ts`, `src/scenes/BaseLevelScene.ts`, and `src/core/SynthAudio.ts`.
- `Worm implements BossEncounter`. It uses the pure core from Task 2.
- The sprite parts are the head, a chain of segments with a sine sway, the dirt mound while UNDER, dust puffs and a small camera shake during SHAKE, and the dizzy stars.
- Use two hit bodies: the body and the mouth. A mouth hit with a candy calls `feed`. Other hits call `hit` and `knockLoose`, which drops a sour candy pickup.
- Add the enrage summon of gummy cubs, with a cap.
- Add the third `createBoss` branch on `kind === 'worm'`. Skip the ground decals only if they look wrong.
- Add `SynthAudio.chomp()`.
- **CAUTION:** Pass the single sprite first in every `overlap` call. Phaser swaps the callback arguments for a group-first call.

### Task 9 — Portal, scene, and registration

- **Files:** `src/scenes/BaseLevelScene.ts`, `src/scenes/Level5Scene.ts`, and `src/main.ts`.
- When `def.portal` exists, `onKeyCollected` does these steps:
  1. It shows the text.
  2. It flies the key icons to the portal.
  3. It opens the portal swirl.
  4. It adds an overlap zone that starts the Victory fade.
- `Level5Scene` holds the theme props only: lollipop trees, cupcakes, the chocolate river background band, and sprinkle particles.
- Register the scene in `main.ts`.

### Task 10 — Docs

- Update `CLAUDE.md`: the scene flow, the status, the `extraEnemies` rename, the `candy` def, and the worm boss.
- Update the level list in `docs/plans/2026-02-22-zombie-hunters-design.md` to the new order (5 Sugar Rush, 6 Dark Underworld, 7 final).

### Task 11 — Browser playtest

- Go to `/?level=5` in a Canvas (headless) session. Check each acceptance criterion with `window.game` and synthetic keys.
- Check the candy colors and lights in a `--headed` WebGL session.
- Then play the level with Wes, and tune it with him: the bear looks, the bounce height, and the worm speed.

---

## Execution Progress

Not started.
