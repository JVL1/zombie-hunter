# Level 5 — THE SUGAR RUSH ZONE

Wes (5) designed this level on 2026-09-22. Josh answered the follow-up questions on the same day. The interview notes are in `2026-09-22-level5-sugar-rush-zone-interview.md`.

Wes's calls:

- a candy world
- gummy bear, gumball, and chocolate zombies
- bouncy marshmallows
- the Gummy Worm King boss
- a sour candy that makes the King dizzy
- the name "The Sugar Rush Zone"

## Problem

The game ends at Level 4 with 4 of the 5 portal keys. The first design promised a portal after the fifth key, but no level holds the fifth key or the portal. Wes's Candy Land needs four things that the engine does not have:

- bounce pads
- enemies that split, roll, or teleport
- a boss that digs under the ground
- an item that the player carries and uses on the boss

## Changes to the game order

Josh made these calls on 2026-09-22:

| Slot | Before | After |
| --- | --- | --- |
| Level 5 | The Dark Underworld, Zombie Taco Truck boss | **The Sugar Rush Zone**, Gummy Worm King boss |
| Level 6 | The Abandoned Underworld, final boss | **The Dark Underworld**, Zombie Taco Truck boss (Henry's) |
| Level 7 | none | The Abandoned Underworld, Giant Brain Behemoth Titan Zombie (final) |

The 5-key portal opens at the end of Level 5. The portal takes the player to the underworld, which is Level 6.

## Goals

- Level 5 is playable from start to end: Level 4 Victory → Shop → Level 5 → Gummy Worm King → key #5 → portal → Victory → MainMenu. Level 5 becomes the last built level.
- Marshmallow bounce pads launch the player high.
- Three candy enemies: Gummy Bear Zombie, Gumball Zombie, Chocolate Zombie.
- A sour candy item. Gumball Zombies drop it, and sword hits on the Worm King knock it loose.
- The Gummy Worm King boss: dig, shake, pop up, chomp. A sour candy in his open mouth makes him dizzy, and dizzy is the damage window.
- The 5-key portal opens after the King dies. The player walks into it to finish the level.

## Non-Goals

- Level 6 (The Dark Underworld) and Level 7 (the final level). The portal leads to Victory and then MainMenu until Level 6 exists.
- A chocolate river hazard. Wes picked marshmallows over the sticky river. The river can be a background prop only.
- Candy cane slides and lollipop zombies. Wes did not pick them.
- New shop items.

## Design rulings (tell Wes and Henry if they disagree)

- **Feed the King with the sword.** The player carries sour candies in a HUD slot. A sword swing that hits the King's **open mouth** while the player holds a candy feeds him one candy. This change needs no new button.
- **A normal hit does a little damage.** A sword hit on the King when he is not dizzy does 25% damage. It also knocks a sour candy loose, with a cooldown. The fight never locks, and a hit always does something that the player can see.
- **Dizzy does full damage.** A dizzy King takes normal damage plus a 1.5× bonus. Stars spin over his head for about 3.5 s. Then he digs back under the ground.
- **The player holds a maximum of 3 sour candies.** Candies stay through an Extra Life revive. They clear when the level ends.
- **The portal always opens after the King dies.** Normal play gives keys 1–4 first. A `?level=5` skip still opens the portal, because the skip is a test shortcut.
- **Gummy cubs do not split.** A Gummy Bear Zombie splits one time into 2 small cubs. The cubs die for good.

## Acceptance criteria

- [ ] Level 4 Victory goes through the Shop to Level 5. Level 5 Victory returns to MainMenu. MainMenu key 5 replays Level 5. GameOver retries it.
- [ ] A save with keys 1–4 unlocks Level 5 on the first load through the `keysUnlock` logic.
- [ ] Beating the King gives key #5 (`keyIndex: 4`). All 5 HUD key icons show.
- [ ] A player who lands on a marshmallow goes up higher than a double jump. The bounce resets the double jump. The pad squashes, and the player hears a "boing" sound.
- [ ] A Gummy Bear Zombie splits into 2 cubs on death. The cubs do not split.
- [ ] A Gumball Zombie shakes, then rolls fast in a line. It bounces off walls and stops after a set distance. It drops a sour candy on death.
- [ ] A Chocolate Zombie melts into a puddle that the player can see. The puddle slides under the player and reforms behind the player. The zombie cannot take a hit while it is a puddle.
- [ ] The Gummy Worm King loop works: ground shake → pop up → open mouth → chomp → stay up → dig. A sour candy in the open mouth makes him dizzy. Dizzy takes full damage. At 50% HP the King gets faster and summons gummy cubs.
- [ ] After the King dies, key #5 drops and the portal opens. The portal ends the level only after the player collects the key.
- [ ] Every state cue shows on Canvas: shake dust, open mouth, dizzy stars, puddle, and portal. Tints and lights are extras only.
- [ ] All vitest invariants pass. New invariants check the candy geometry and the spawns.
- [ ] The worm phase logic and the sour candy rules are pure modules with unit tests.

## Architecture

Candy is a **level-def property**, like `water` on Level 4. Levels without it do not change.

### LevelDef (src/levels.ts, stays Phaser-free)

```ts
candy?: {
  marshmallows: Array<{ x: number; y: number; power?: number }>; // bounce pads; y = pad top
  enemies: Array<{ kind: 'gummy' | 'gumball' | 'chocolate'; x: number; y?: number }>;
}
```

`BossDef` gets a third member of the union:

```ts
interface WormBossDef extends BossBase {
  kind: 'worm';
  burrowSpeed: number; enragedBurrowSpeed: number;
  shakeMs: number;            // ground-shake warning before the pop-up
  exposedMs: number;          // time above ground before the King digs again
  dizzyMs: number;            // damage window after a sour candy
  chipDamageRatio: number;    // 0.25 — damage on a hit when not dizzy
  dizzyDamageMultiplier: number;
  candyKnockCooldownMs: number;
  summon: { count: number; maxAlive: number; intervalMs: number }; // gummy cubs, enrage only
}
```

`LevelDef` also gets `portal?: { x: number }`. The portal stands in the boss arena, clear of the King's dig path.

### Marshmallow bounce pads

Each pad is a static solid with a baked marshmallow sprite. The pad uses a collider, not an overlap. A landing on top (`player.body.touching.down` against a pad, with a downward speed) calls `player.bounce(power)`. `bounce` sets the up speed, resets the jump count, and cancels a slam. A slam onto a pad gives a higher bounce, like a pogo. The `CANDY` block in `config.ts` holds the tunables.

### Candy enemies (src/entities/candy/)

All three enemies implement `Hittable`, so the combat plumbing, the kill rewards, and the boss sweep work with no change. The scene's `waterEnemies` group gets a general name, `extraEnemies`. Level 4 and Level 5 both fill it.

| Enemy | Behavior | Canvas-safe cue |
| --- | --- | --- |
| Gummy Bear Zombie | It hops toward the player. On death it emits `'gummy-split'`, and the scene spawns 2 cubs at half size. | squash-stretch hop frames |
| Gumball Zombie | It patrols. In range, it shakes for about 400 ms, then rolls at `rollSpeed` for `rollDistance`. It bounces off walls. | baked shake frame, dust puffs |
| Chocolate Zombie | It walks, then melts. The puddle slides under the player at `puddleSpeed` and reforms about 90 px behind. Hits miss while it is a puddle. It stays melted for a maximum of 1.2 s, and then it reforms. | baked puddle sprite on the ground |

Gumball Zombies drop a sour candy on death. `onEnemyKilled` gets a small branch for this drop.

### Sour candy (src/core/sourCandy.ts, pure, with vitest)

The module is a pure reducer, like `air.ts`:

```ts
collect(state) → state                       // cap 3
tryFeed(state, mouthOpen: boolean) → { state, fed: boolean }
knockLoose(state, now, cooldownMs) → { state, drop: boolean }
```

A new `Pickup` kind, `'sourCandy'`, adds to the count. The HUD shows the count next to the consumables. It uses the registry-snapshot pattern from the Level 4 air bar.

### Gummy Worm King (src/core/worm.ts + src/entities/Worm.ts)

The phase logic is a pure module with vitest coverage:

```
UNDER (mound moves toward player) → SHAKE (warn, mound stops)
  → POP (erupts, contact damage) → EXPOSED (mouth opens and closes)
     → fed while mouth open → DIZZY (full damage) → DIG → UNDER
     → exposedMs ends     → DIG → UNDER
```

- Enrage starts at ≤50% HP. The King moves faster and shakes for a shorter time, and a cub summon runs on a timer.
- `Worm` implements `BossEncounter`. It adds a third branch in `createBoss`, keyed on `def.boss.kind`.
- `contactDamageActive` is true only in POP and in a mouth-open chomp. The King cannot take a hit while he is UNDER.
- The mouth hitbox is a second small body. A swing that hits the mouth while the player holds a candy feeds him. The per-swing `hitSet` gives a feed priority over a body hit.
- `playDeath()` plays a "wiggle and flop" death and returns the key spot above the body.

### Portal (end of level)

Today `onBossDefeated` drops the key, and `onKeyCollected` fades to Victory. When `def.portal` exists, `onKeyCollected` does these steps:

1. It shows `KEY #5!` and `THE PORTAL IS OPEN!`.
2. It flies the 5 HUD key icons into the portal location.
3. It opens the portal with a baked swirl and a scale tween.

The player walks into the portal, and the level ends. Levels without a portal do not change.

### Scene and art

- `Level5Scene` extends `BaseLevelScene`. The theme props go in `buildBackdrop`, `buildTerrain`, and `buildAmbience`: lollipop trees, a cupcake skyline, a chocolate river background band, and falling sprinkles.
- `src/art/candy.ts` exports `generateCandyTextures(scene)` and the parallax `bakeTint` calls. The textures cover these things:
  - the ground and platform tiles
  - the marshmallow pad, with a squash frame
  - the gummy bear and cub sheets, the gumball sheet, and the chocolate sheets, with the puddle
  - the sour candy pickup and HUD icon
  - the worm segments and head frames: closed, open, and dizzy
  - the dirt mound, the portal swirl, and the dizzy stars
- The candy colors are rotten: faded pink, moldy green, and dark brown, with a night light. The level is candy, but it is a zombie game.
- `SynthAudio` gets two new sounds: `boing()` and `chomp()`.

## Testing

- `worm.test.ts`: the phase order, the shake timing, feeds only while the mouth is open, dizzy timing, chip damage and full damage, the enrage threshold, and the summon cap.
- `sourCandy.test.ts`: the cap, a feed with and without a candy, and the knock-loose cooldown.
- `levels.test.ts`: the chain test catches the Level 4 `nextSceneKey` flip. New invariants:
  - Marshmallows are in bounds, clear of solids, and before the trigger.
  - Candy enemy spawns are clear of solids and outside the reach of the player spawn.
  - The portal is inside the arena.
  - The worm boss sanity branch passes.
- `config.test.ts`: the `CANDY` tunables are sane. For example, the bounce height is more than the double-jump height.
- `art.test.ts`: the export-shape test covers `candy.ts`.
- Browser playtest: a full Level 5 run, a marshmallow bounce, a gummy split, a gumball candy drop, a chocolate reform, a feed and dizzy, the King kill, key #5, and the portal exit. Check the colors in `--headed` WebGL.

## Open questions

- The gummy bear looks. These are the first bear sprites, so play the build with Wes and change them at the screen.
- Level 6 and Level 7 key slots. `GameState.keys` has 5 slots, and a test needs `keyIndex` for each level. Level 6 needs a decision about a key or a new reward.
- Power monsters in Level 5. The current pick is a Sky Screecher, for flight over the marshmallows, and a Furyfang. Ask Wes.
