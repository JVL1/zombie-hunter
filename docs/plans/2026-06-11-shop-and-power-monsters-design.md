# Shop Hub & Power Monsters — Design

**Date:** 2026-06-11 (revised after round-1 multi-reviewer design review)
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
| `src/art/helpers.ts` | Shared canvas utilities + `bakeTint(scene, srcKey, destKey, tint)` as a free function + a **spritesheet-baking helper** (`bakeSheet`: re-bakes a loaded spritesheet with a canvas transform — tint/overlay — and re-registers it under a new key with the same frame config; needed by Phase 3) |
| `src/art/common.ts` | Level-agnostic textures currently inside `generateTextures()` (player particles, coin/heart/key, decals, generic particles) |
| `src/art/city.ts` | Level 1 theme pack (`generateCityTextures(scene)`) |
| `src/art/forest.ts` | Level 2 theme pack (from `generateForestTextures`) |
| `src/art/rail.ts` | Level 3 theme pack (from `generateRailTextures`) |

- Each module exports one `generate{Theme}Textures(scene: Phaser.Scene)` function; methods become free functions taking the scene.
- `PreloadScene` shrinks to: load sprites → call generators → bake parallax tints. The "Adding a New Level" recipe in CLAUDE.md changes step 2 to "add `src/art/{theme}.ts`".
- **Pre-commit hook note:** the hook requires tests written + run in the session. Phase 1 adds a small vitest (art module export-shape: each theme module exports exactly one `generate*Textures` function) so the refactor commit passes the gate honestly.
- **Verification:** `npx tsc --noEmit`, full vitest suite, browser playtest of all three levels (headed WebGL pass for tints, per the canvas-tint gotcha).

## Phase 2 — The Shop Hub

### Flow — exact contract

```
Victory → ShopScene → next level
```

- `VictoryScene` keeps its current order: call `gs.advanceLevel()` **first**, then `scene.start('Shop')` — but only when the level's `nextSceneKey !== 'MainMenu'`; after the final built level the shop is skipped. Because the save advances before the shop opens, quitting mid-shop is safe.
- `ShopScene`'s "HEAD OUT →" starts `gs.currentLevelDef.sceneKey` (the already-advanced level).
- `ShopScene` is registered in the scene array in `src/main.ts`.
- VictoryScene's prompt copy changes when routing to the shop ("ENTER: visit the shop" instead of "onward to the next level").
- GameOver/retry flow untouched. Replaying an earlier level and winning still routes through the shop, so the shop stays reachable after finishing the game.

### Scene: one hub, two counters

`ShopScene` — a single screen with two counters:

- **Blacksmith** (left): anvil, ember particles, warm Light2D glow. Sells sword tiers.
- **Apocalypse Shop** (right): shack with potion shelves, eerie green light. Sells consumables.

**Input (review finding — ↑ is a jump key, and InputController has no menu primitives):**

- `InputController` gains edge-triggered menu navigation: `upJustPressed` / `downJustPressed` / `leftJustPressed` / `rightJustPressed` — **arrow keys + gamepad d-pad/stick only, NOT WASD** (A is the attack/buy key; including it in nav would switch counters and buy in one press — round-2 review finding), using the existing `prevPad*` edge-detection pattern.
- ←/→ switch counters, ↑/↓ select item, **attack button (A/J/Enter / gamepad X/B) buys**.
- **Exit only by selecting "HEAD OUT →" and pressing attack** (or Enter). Jump is NOT an exit — ↑ doubles as a jump key and would eject Henry from the shop. (Subjective watch item for Henry's first playtest: gamepad X/B = confirm inverts the usual A = confirm convention; revisit if he fumbles.)

All textures procedural, in `src/art/shop.ts`. Purchases get juice: coin sound, float text, sword-gleam flash.

### Data lives in `src/config.ts` (review finding — config.ts owns every gameplay tunable)

No new `src/shop.ts`. Sword tiers and consumable defs are exported constants in `src/config.ts` (`SWORDS`, `CONSUMABLES`), next to the combat tunables they modify. Purchase logic becomes `GameState` methods (`buySword()`, `buyConsumable(kind)`) — `GameState` is Phaser-free and already covered by `GameState.test.ts`.

**Sword tiers** (buy = permanent, next tier only, no skipping):

| Tier | Sword | Cost | Damage | Reach bonus | Swing speed | Blade tint |
|---|---|---|---|---|---|---|
| 0 | Rusty Blade | owned | 12 | +0 | 1.0× | — |
| 1 | Iron Cleaver | 40 | 16 | +4 | 1.0× | steel blue |
| 2 | Shadow Fang | 150 | 20 | +6 | 1.15× | purple-black |
| 3 | Flame Edge | 300 | 26 | +8 | 1.15× | orange-red |
| 4 | Giant Sun Splicer | 600 | 36 | +14 | 1.25× | blazing gold |

- **Economy (review finding):** a clean Level 1 run currently yields ~40–55 coins (8 zombies × 5 + drops), so Tier 1 drops to 40 to make the first shop visit usable, and **bosses now burst 5 coins (+25) on death** — a fun reward that also funds the ladder. All numbers are starting points for playtest tuning with Henry. Giant Sun Splicer stays expensive: it's canonically required for the final boss.
- **Swing speed mechanism (review finding):** while attacking, `sprite.anims.timeScale = speed` (sword overlay follows automatically — it syncs via `setFrame`), and `swingCooldownMs` / `finisherCooldownMs` are divided by `speed`. Both, or the stat does nothing. **Reset `anims.timeScale = 1` on attack-animation complete** — Phaser's timeScale persists across animations and would otherwise speed up walk/idle too (round-2 finding).
- **Damage/reach integration:** `tryAttack` already reads `gs.swordDamage`; reach adds to `COMBAT.hitboxW`. `currentSword`/`swordDamage` become getters derived from `SWORDS[swordIndex]`.

**Consumables** (carried into levels, shown in HUD):

| Item | Cost | Effect | Cap |
|---|---|---|---|
| Health Potion | 30 | Auto-drinks when HP drops below 30% (and as a last resort on a lethal hit): +50 HP, "POTION!" float text | 3 |
| Shield | 50 | Absorbs the next 3 hits entirely; golden aura while charges remain. Charges persist across levels until spent; buyable only when 0 charges remain | 1 |
| Extra Life | 100 | On death: in-place revive with full HP instead of Game Over | 2 |

**Why potions auto-drink:** `resetRun()` starts every level at full health, so buy-time healing is useless; potions only make sense as carried mid-level items, and auto-use needs no new button for 8-year-old hands.

### The damage pipeline — pure, ordered, tested (review consensus finding)

Shield, potion, and Extra Life all hook the same few lines in `Player.takeDamage`. That logic moves into a pure function in `src/core/damage.ts`:

```ts
resolveDamage(state, amount, invulnerable) → { newState, outcome }
// outcome: 'ignored' | 'absorbed' | 'hurt' | 'potioned' | 'revived' | 'dead'
// `invulnerable` is passed by the caller: i-frame timers (post-hit, dash,
// post-revive) live in Player, not GameState, so the pure function takes
// the already-resolved boolean (OR'd with the Invincibility buff).
```

Ordering, explicitly:

1. **Invulnerable** (post-hit i-frames, dash i-frames, Invincibility buff, post-revive grace) → `ignored`. No shield charge consumed.
2. **Shield charges > 0** → consume one charge, no HP loss → `absorbed`.
3. Apply damage to HP.
4. **HP ≤ 0 and potions > 0** → drink (HP = 50) → `potioned` (the lethal-hit save).
5. **HP ≤ 0 and lives > 0** → consume life, HP = max → `revived`.
6. **HP ≤ 0** → `dead`.
7. Else if **HP < 30% and potions > 0** → drink (+50) → `potioned`.

`Player.takeDamage` applies the result (FX, knockback, revive call). The ordering matrix is vitest-covered in `src/core/damage.test.ts`.

### Extra Life = in-place revive, never a scene restart (review Critical)

A `scene.restart()` would wipe boss HP/state/minions and re-run `create()`. Instead:

- `BaseLevelScene`'s `'player-died'` handler checks the `resolveDamage` outcome — actually the intercept happens **before** `die()` plays: when `resolveDamage` returns `'revived'`, `Player` never enters `dying`.
- New `Player.revive(x, y)`: resets velocity/animation/alpha, repositions, grants **~2 s invulnerability** (a boss mid-CHARGE or a zombie sitting on the spawn would otherwise chain-kill), camera snaps to the player. Active buffs are cleared.
- Respawn position (round-2 review finding — teleporting to the level start is a hidden mega-penalty): **truly in place** — the player's **last grounded position** (`Player` tracks it each frame the body touches the floor; it's always within current world bounds, including the arena lock, and never mid-air over a gap). During a boss fight that naturally lands near the arena's left half where the player last stood. The scene never stops, so boss/minion/gore state is preserved for free.
- Consumed life is saved immediately.

### GameState / persistence

- `SaveData` + `GameState` extend with `swordIndex`, `potions`, `shieldHits` (remaining charges, 0–3), `lives`. Persisted via the existing localStorage save.
- **Load hardening (review finding):** nullish-coalesce defaults for legacy saves (`swordIndex ?? 0`, etc.) AND clamp every new field — `swordIndex` to `[0, SWORDS.length-1]`, consumables to their caps, reject negative/non-integer/NaN. Tests cover missing, corrupt, and future-version save fields (same pattern as the existing `currentLevel` clamping).

## Phase 3 — Power Monsters

Four rare elite zombies, one per buff. Names are placeholders — **Henry has final naming rights.**

| Monster | Look | Buff | Effect while active |
|---|---|---|---|
| Vulture Zombie | winged silhouette, dark purple | **Flight** | Hold jump to jetpack upward, release to drift down (reduced gravity) |
| Rage Zombie | glowing red, faster | **Mega Damage** | Sword damage ×2, bigger hit effects/shake |
| Titan Zombie | huge, stone-grey | **Giant Mode** | Player visuals ×1.35, damage ×1.5 |
| Crystal Zombie | shimmering cyan | **Invincibility** | No damage taken, golden flashing aura |

### Monster plumbing (review consensus finding — variant table alone isn't enough)

- `ZombieVariantDef` gains optional `sheet` and `animSet` keys. `Zombie` currently derives both spritesheet AND animation set from `v.base` — power monsters need their own **baked sheets** (Phaser animations bind to texture keys, and tints don't survive Canvas). The Phase 1 `bakeSheet` helper re-bakes the 5 sheets per monster (idle/walk/attack/hurt/dead) with tint + overlay (wings/crystals/glow), and each power monster registers its anim set alongside.
- Each power monster is a `ZOMBIE.variants` entry with a `powerUp: PowerUpType` field. Roughly zanter-class HP so the kill feels earned. `Zombie` exposes the variant's `powerUp` so the kill handler can drop the right orb.
- **Placement is data-driven:** placed explicitly in each level's spawn list in `src/levels.ts` (1–2 per level). New invariants in `levels.test.ts`: (a) each buff type appears at least once across built levels; (b) **power-monster spawn x < boss `triggerX` − aggro margin** — `triggerBossEncounter` destroys surviving zombies, which would silently eat the orb; (c) spawn AABB-vs-solid check for scaled elites (the existing tests check bounds, not body overlap).

### Power orb & buff runtime

- **Kill → power orb:** discriminated pickup spec — `{ kind: 'powerOrb', powerUp: PowerUpType }` (extends the current `'coin' | 'heart' | 'key'` union into a tagged shape). Distinct **baked** color/texture per buff (must read on Canvas), Light2D glow. **Boss-trigger interaction (round-2 finding):** when the boss encounter fires, any uncollected power orb is **magnetized to the player** (reuse the coin magnet path with unlimited range) before the bounds shrink — no orb is ever stranded behind `arenaLeft`, and flying loot into Henry's hands as the boss fight starts is a nice beat.
- **Buff state lives in `GameState`** (review consensus): a non-persisted `activeBuffs: Map<PowerUpType, expiresAt>` with query helpers (`damageMultiplier()`, `isInvincible()`, `canFly()`, `visualScale()`). Cleared by `resetRun()` — which already runs on every level start — and on death/revive. HUD reads the singleton each frame exactly as it does today; Player queries the helpers. `PowerUpType` + per-buff config (duration, color, multiplier) live in `config.ts` (`POWERUPS`).
- **Timers:** ~10 s per buff. Different buffs stack (Mega ×2 and Giant ×1.5 multiply to ×3 — intended, it's a kids' power fantasy); **collecting a duplicate buff refreshes its timer** rather than double-tracking (review finding). During the boss cinematic (~2.5 s, player frozen) all `expiresAt` values are extended by the cinematic duration — frozen players don't burn buff time.
- HUD: a second row below the existing 246×74 panel — consumable icons+counts (potion/shield/life) on the left, active buff icons with countdown bars to their right.

### Buff implementations

- **Flight:** hold jump → vy clamped upward (jetpack), release → reduced-gravity drift. Respects world/camera bounds. **Boss-trigger check (review finding):** the boss encounter triggers on player x-position, not a finite overlap box — verify at implementation that a max-altitude player still trips it; if any progression trigger is a finite zone, stretch it full-height.
- **Mega Damage:** `damageMultiplier()` folded into the existing attack payload; bigger Juice shake + hit FX.
- **Giant Mode (review consensus — Arcade bodies DO scale with the sprite):** the zanter's documented 58×116 body proves `setScale` scales the body; a naive scale-up wedges the body under the test-enforced 56 px clearances. New `Player.setVisualScale(mult)`: `setScale(mult)` then **re-set body size/offset back to the original 24×48-equivalent**, and scale the sword overlay (it syncs position/frame/flip but not scale). **Visual/body desync is bounded deliberately (round-2 finding):** visuals are ×1.35 (≈65 px vs the 48 px body), the body offset keeps the **feet planted** so the overhang goes upward/outward where there's mostly sky, and the undersized hitbox is player-generous (enemies brushing the giant's silhouette don't hit — feels powerful, not broken). ×1.5+ visuals clipped ~24 px into ceilings and read as broken; ×1.35 for ~10 s is cartoon bulk.
- **Invincibility:** `isInvincible()` is step 1 of `resolveDamage` — hits are `ignored`, golden flashing aura.

### Scope guards

- **Vulture Zombie does not fly.** It looks winged but uses the standard ground-zombie AI — flying-enemy AI is a separate future feature. The flight is the player's reward.
- Power orbs and buff auras get baked textures — tints alone don't survive the Canvas renderer.

## Testing

- `GameState.test.ts`: `buySword` (next-tier-only, insufficient coins, max tier), `buyConsumable` (caps, shield-only-when-empty), save/load roundtrip with new fields, legacy/corrupt/future-save defaults + clamps.
- `src/core/damage.test.ts`: the full `resolveDamage` ordering matrix (invuln/shield/potion-lethal-save/extra-life/death/low-HP-potion).
- `levels.test.ts`: buff coverage invariant, power-monster-before-boss-trigger invariant, spawn-AABB invariant.
- Buff timer logic (expiry, duplicate-refresh, cinematic pause) is pure in GameState/`POWERUPS` helpers — vitest-covered.
- Phase 1: art module export-shape test (also satisfies the tests-written pre-commit gate).
- Browser playtest: Victory → shop → buy (keyboard AND gamepad nav) → next-level loop; **Extra Life revive inside the boss arena**; auto-potion firing mid-fight; each buff visually verified headed (WebGL).

## Out of scope

- Flying enemy AI, shopkeeper NPCs/dialogue, Level 4, multiple equippable swords (tiers are linear upgrades for now).

## Review record

Round-1 multi-reviewer design review (Claude subagent + Codex MCP + Gemini CLI) returned 1 Critical (scene-restart revive — replaced with in-place revive), ~10 Majors (all spec gaps: input conflict, death-path intercept, damage ordering, buff ownership, variant sheet/anim plumbing, giant-mode body scaling, swing-speed mechanism, save clamping, config.ts data ownership, flight-vs-trigger), and assorted Minors — all folded into the round-1 revision.

Round 2 (all three re-dispatched, narrowed scope) verified every round-1 fix resolved and found 3 new Majors, folded into this revision: A-key nav/buy conflict (shop nav = arrows + d-pad only), Extra Life respawn = last grounded position (never the level start), Giant Mode visuals capped at ×1.35 with feet-planted offset. Minors folded: `anims.timeScale` reset after attack, Victory prompt copy, `resolveDamage` takes a caller-passed `invulnerable` flag, boss-trigger magnetizes stranded orbs. Converged: 0 critical, 0 major remaining. Subjective watch-list: gamepad X/B-confirm mapping, economy numbers (tune with Henry).
