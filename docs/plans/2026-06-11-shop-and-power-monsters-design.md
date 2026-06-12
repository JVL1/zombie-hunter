# Shop Hub & Power Monsters — Design

**Date:** 2026-06-11
**Status:** Approved by Josh (with Henry's creative direction)
**Scope:** Three phases — art extraction (tech debt), the between-levels Shop Hub, and Henry's power-up monsters.

## Goals

1. Pay down the PreloadScene tech-debt before Level 4 lands (Gemini's structural finding: 663 lines, one theme pack per level, grows every level).
2. Ship the long-backlogged shops milestone: Blacksmith (sword tiers) + Apocalypse Shop (consumables) between levels.
3. Henry's new idea: rare monsters that grant temporary bonus attributes when killed — including temporary flight.

Build order matters: Phase 1 creates `src/art/` so Phases 2–3 put their textures there from day one.

---

## Phase 1 — Extract texture generators to `src/art/`

Pure refactor, no behavior change.

| New file | Contents |
|---|---|
| `src/art/helpers.ts` | Shared canvas utilities + `bakeTint(scene, srcKey, destKey, tint)` as a free function |
| `src/art/common.ts` | Level-agnostic textures currently inside `generateTextures()` (player particles, coin/heart/key, decals, generic particles) |
| `src/art/city.ts` | Level 1 theme pack (`generateCityTextures(scene)`) |
| `src/art/forest.ts` | Level 2 theme pack (from `generateForestTextures`) |
| `src/art/rail.ts` | Level 3 theme pack (from `generateRailTextures`) |

- Each module exports one `generate{Theme}Textures(scene: Phaser.Scene)` function; methods become free functions taking the scene.
- `PreloadScene` shrinks to: load sprites → call generators → bake parallax tints. The "Adding a New Level" recipe in CLAUDE.md changes step 2 to "add `src/art/{theme}.ts`".
- **Verification:** `npx tsc --noEmit`, full vitest suite, browser playtest of all three levels (headed WebGL pass for tints, per the canvas-tint gotcha).

## Phase 2 — The Shop Hub

### Flow

```
Victory → ShopScene → next level
```

- Shop appears whenever Victory advances to another level. After the final built level (Victory → MainMenu) it is skipped.
- GameOver/retry flow untouched. Replaying an earlier level and winning still routes through the shop, so the shop stays reachable after finishing the game.
- "HEAD OUT →" option exits to the next level. The shop is always skippable.

### Scene: one hub, two counters

`ShopScene` — a single screen with two counters, navigated with the buttons Henry already knows: ←/→ switch counters, ↑/↓ select item, attack button buys, jump/HEAD OUT leaves. Full gamepad support via `InputController`.

- **Blacksmith** (left): anvil, ember particles, warm Light2D glow. Sells sword tiers.
- **Apocalypse Shop** (right): shack with potion shelves, eerie green light. Sells consumables.

All textures procedural, in `src/art/shop.ts`. Purchases get juice: coin sound, float text, sword-gleam flash.

### Data: `src/shop.ts` (Phaser-free, vitest-covered like `levels.ts`)

**Sword tiers** (buy = permanent, next tier only, no skipping):

| Tier | Sword | Cost | Damage | Reach bonus | Swing speed | Blade tint |
|---|---|---|---|---|---|---|
| 0 | Rusty Blade | owned | 12 | +0 | 1.0× | — |
| 1 | Iron Cleaver | 60 | 16 | +4 | 1.0× | steel blue |
| 2 | Shadow Fang | 150 | 20 | +6 | 1.15× | purple-black |
| 3 | Flame Edge | 300 | 26 | +8 | 1.15× | orange-red |
| 4 | Giant Sun Splicer | 600 | 36 | +14 | 1.25× | blazing gold |

(Giant Sun Splicer is canonically required for the final boss — priced as an endgame goal. All numbers are starting points for playtest tuning with Henry.)

**Consumables** (carried into levels, shown in HUD):

| Item | Cost | Effect | Cap |
|---|---|---|---|
| Health Potion | 30 | Auto-drinks when HP drops below 30%: +50 HP, "POTION!" float text | 3 |
| Shield | 50 | Absorbs the next 3 hits, golden aura while active | 1 |
| Extra Life | 100 | On death: respawn with full HP instead of Game Over | 2 |

**Edge case — Extra Life during a boss fight:** world bounds are locked to the arena once the encounter starts, so respawning at level start would strand the player. If the boss encounter has begun, respawn at the arena's left edge; the boss keeps its current HP and state. Otherwise respawn at the level spawn point.

**Why potions auto-drink:** `resetRun()` starts every level at full health, so buy-time healing is useless; potions only make sense as carried mid-level items, and auto-use needs no new button for 8-year-old hands.

### GameState / persistence

- `SaveData` + `GameState` extend with `swordIndex`, `potions`, `shields`, `lives`. Persisted via the existing localStorage save; legacy saves default to `swordIndex: 0` and zero consumables.
- The existing `currentSword`/`swordDamage` fields become derived from `SWORDS[swordIndex]`.
- Player combat reads damage/reach/swing-speed from the equipped sword instead of flat `COMBAT.baseSwordDamage`; blade tint applied in-game (WebGL nicety, consistent with variant tints).

## Phase 3 — Power Monsters

Four rare elite zombies, one per buff. Names are placeholders — **Henry has final naming rights.**

| Monster | Look | Buff | Effect while active |
|---|---|---|---|
| Vulture Zombie | winged silhouette, dark purple | **Flight** | Hold jump to jetpack upward, release to drift down (reduced gravity) |
| Rage Zombie | glowing red, faster | **Mega Damage** | Sword damage ×2, bigger hit effects/shake |
| Titan Zombie | huge, stone-grey | **Giant Mode** | Player sprite ×1.5, damage ×1.5 |
| Crystal Zombie | shimmering cyan | **Invincibility** | No damage taken, golden flashing aura |

### Mechanics

- Each is a `ZOMBIE.variants` entry (tint/scale/stat table) plus a `powerUp` field naming its buff. Tougher than normal zombies (roughly zanter-class HP) so the kill feels earned.
- **Placement is data-driven:** power monsters are placed explicitly in each level's spawn list in `src/levels.ts` (1–2 per level), so the existing layout invariant tests validate them for free.
- **Kill → power orb:** the monster drops a glowing power orb (new `Pickup` kind carrying the buff type, distinct color per buff, Light2D glow). Collect to activate.
- **Buff runtime:** ~10 s per buff, each with its own timer; buffs stack. HUD shows an icon + countdown per active buff, plus a colored aura on the player. Expire on timer, death, or level end.
- New variant looks (wings, crystal shimmer, rage glow) are baked into textures in `src/art/` where needed — tints alone don't survive the Canvas renderer.

### Scope guards

- **Vulture Zombie does not fly.** It looks winged but uses the standard ground-zombie AI — flying-enemy AI is a separate future feature. The flight is the player's reward.
- **Giant Mode scales the sprite, not the physics body.** A 1.6× body (~77 px) would wedge under the 56 px-clearance platforms the layout tests enforce. Cartoon license: big sprite, same body.
- Flight respects existing world/camera bounds; nothing special needed for the boss arena (bounds already contain the player).

## Testing

- `src/shop.test.ts`: tier ordering (cost and damage strictly increasing), buy-next-tier-only logic, consumable caps.
- `GameState` tests: save/load roundtrip with new fields; legacy-save defaults.
- `levels.test.ts`: existing invariants automatically cover power-monster spawns; add an invariant that each buff type appears at least once across built levels.
- Buff timer logic extracted pure (expiry, stacking) for vitest.
- Browser playtest: full Victory → shop → buy → next-level loop; each buff visually verified headed (WebGL).

## Out of scope

- Flying enemy AI, shopkeeper NPCs/dialogue, Level 4, multiple equippable swords (tiers are linear upgrades for now).
