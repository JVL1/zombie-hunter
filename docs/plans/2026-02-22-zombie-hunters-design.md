# Zombie Hunters — Game Design Document

## Overview
A 6-level sword-based 2D side-scrolling zombie action game built with Phaser 3 and TypeScript. The player fights through increasingly dangerous environments, collects 5 keys from throne-sitting bosses, unlocks a portal, and defeats a giant brain behemoth titan zombie to win.

## Tech Stack
- **Phaser 3** — 2D game framework
- **TypeScript** — type-safe game code
- **Vite** — fast dev server with hot reload
- **Electron** — Mac desktop packaging (added later)
- **Tiled** — level design tool (exports tilemaps for Phaser)

## Project Structure
```
zombie-hunters/
├── src/
│   ├── main.ts              — game entry point, Phaser config
│   ├── assets.ts            — asset key constants + PlayerAnims frame map
│   ├── scenes/
│   │   ├── PreloadScene.ts  — loads sprites, defines animations, generates placeholders
│   │   ├── MainMenuScene.ts — title screen
│   │   ├── Level1Scene.ts   — Abandoned City level
│   │   ├── HUDScene.ts      — health bar, coins, key slots overlay
│   │   ├── VictoryScene.ts  — level complete screen
│   │   └── GameOverScene.ts — death/retry screen
│   ├── entities/
│   │   ├── Player.ts        — player movement, attack, animations
│   │   ├── Zombie.ts        — zombie patrol/chase AI, two variants
│   │   └── Boss.ts          — boss state machine (SITTING→RISING→FIGHTING→DEAD)
│   ├── systems/
│   │   ├── Combat.ts        — Damageable interface, flashSprite, knockback
│   │   ├── Splatter.ts      — blood/skin/brain particle bursts
│   │   ├── GameState.ts     — singleton: health, coins, keys, sword tier
│   │   └── SoundManager.ts  — gracefully skips missing audio files
│   └── ui/                  — (empty, HUD is scene-based for now)
├── public/
│   └── assets/              — sprites, tiles, backgrounds
├── docs/plans/              — design doc, implementation plans
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Core Mechanics

### Player
- Side-scrolling movement (left/right) with jumping
- Sword attack with a short-range hitbox in front of the player
- Health bar — take damage from zombie contact/attacks
- Controls: arrow keys to move, up arrow to jump, A key to attack
- Animations: idle, walk, run, jump, fall, attack, death (from single 800x448 sprite sheet)

### Combat
1. Player swings sword → hitbox appears briefly in front of player
2. Any enemy overlapping the hitbox takes damage
3. Enemies flash red when hit, get knocked back slightly
4. When enemy health hits 0 → death animation → drop loot/key
5. Enemies that touch the player deal contact damage with a 1-second cooldown

### Splatter System
- Every hit triggers a particle burst of blood, skin chunks, and brain bits
- Phaser particle emitters spray small colored sprites in random directions
- Kill shots produce a bigger, more dramatic burst (30 particles vs 8)
- Particles fade out after a moment with gravity to avoid screen clutter

### Enemy AI
- Zombies patrol back and forth on platforms (2-second direction change)
- When the player gets within 200px, they aggro and chase at 1.5x speed
- Two zombie variants in Level 1: basic zombie-man (30hp) and urban-zombie (50hp)
- Bosses get unique attack patterns built on the same base system

### Camera
- Follows the player horizontally with lerp (0.1, 0.1)
- Levels are wider than the screen (3200x600 for Level 1)
- Boss encounter locks camera to arena bounds

## Sword System
Multiple swords available at the Blacksmith Shop, each with base stats for **speed**, **damage**, and **reach**.

Example progression:
- **Rusty Blade** — starter sword, balanced but weak
- **Iron Cleaver** — slow but hits hard, decent reach
- **Shadow Fang** — fast, low damage, short reach
- **Flame Edge** — high damage, medium speed, medium reach
- **Giant Sun Splicer** — ultimate weapon, required for the final boss

Each sword can be upgraded a few levels at the Blacksmith (improving its stats), but eventually you hit a cap and need to buy the next tier.

## Progression & Economy

### Keys
- Bosses at the end of levels 1-5 each drop 1 key
- Keys show in the HUD (5 empty key slots that fill in)
- All 5 keys required to unlock the portal at the end of Level 5

### Currency
- Zombies drop coins when killed (5 coins each), shown in HUD
- Spent at shops between levels

### Blacksmith Shop (between levels)
- Buy new swords and upgrade existing ones
- Upgrades improve speed, damage, and reach up to a cap

### Apocalypse Shop (between levels)
- Buy items: health potions, temporary shields, extra lives

### Level Flow
```
Main Menu → Level 1 → Shop → Level 2 → Shop → ... → Level 5 → Portal → Level 6 → Victory
```

## Boss Encounters
Each boss sits on a unique throne at the end of their level. As the player approaches:
1. Boss is visible sitting on their throne in the distance
2. Camera pans to boss area (1-second pan)
3. Boss rises from throne (tween animation)
4. Camera locks to arena (world + camera bounds restricted)
5. Boss walks/charges at player, fight begins
6. On defeat: throne crumbles (alpha + scale tween), key drops

### Boss Thrones
- **Level 1 (Abandoned City):** Throne of crushed cars and rubble
- **Level 2 (Broken Down Forest):** Throne of twisted dead trees and roots
- **Level 3 (Abandoned Railroad):** Throne of train parts and rails
- **Level 4 (Amusement Park):** Throne of broken ride pieces and carnival lights
- **Level 5 (Dark Underworld):** Throne of bones and shadows
- **Level 6 (Final):** Giant Brain Behemoth Titan Zombie floats above a massive pulsing brain throne

## Level Structure

### Level 1 — Abandoned City
- **Setting:** Broken down, abandoned city
- **Enemies:** Basic zombies (zombie-man 30hp) + urban zombies (50hp, every 3rd)
- **Boss:** Mutated Zombie (urban-zombie at 1.5x scale, 150hp) on car-rubble throne
- **Reward:** Key #1

### Level 2 — Broken Down Forest
- **Setting:** Decayed forest filled with zombie hordes
- **Enemies:** Disgusting zombies
- **Boss:** Zombie pack (horde boss) on dead-tree throne
- **Reward:** Key #2

### Level 3 — Abandoned Railroad
- **Setting:** Abandoned railroad; player boards a zombie-driven train
- **Enemies:** Giant zombies (Zanters)
- **Boss:** Dirt mutated zombie on train-parts throne
- **Reward:** Key #3

### Level 4 — Abandoned Amusement Park
- **Setting:** Creepy amusement park with working rides; fight zombies on attractions
- **Enemies:** Giant disgusting mutated zombies
- **Boss:** Giant ginormous zombie bloodhound on carnival throne
- **Reward:** Key #4

### Level 5 — The Dark Underworld
- **Setting:** Dark, foreboding underworld
- **Enemies:** Zombie hordes
- **Boss:** Zombie Taco Truck on bone-shadow throne
- **Milestone:** All 5 keys collected → portal unlocks
- **Reward:** Key #5

### Level 6 — The Abandoned Underworld (Final)
- **Setting:** Vast, dangerous abandoned underworld
- **Enemies:** Little disgusting octopus zombies
- **Final Boss:** Giant Brain Behemoth Titan Zombie — floats, zaps enemies, requires Giant Sun Splicer
- **Win Condition:** Defeat final boss → Victory!

## Art Assets

All art is free pixel art with commercial-use licenses. See `docs/plans/2026-02-22-asset-acquisition-plan.md` for download URLs, licenses, and integration details.

### Asset Directory Structure (Actual)
```
public/assets/
├── sprites/
│   ├── player/
│   │   ├── player-spritesheet.png  — 800x448, single sheet (80x64 frames, 10x7 grid)
│   │   └── player-sword.png       — 800x448, sword overlay layer
│   └── zombies/
│       ├── zombie-man-*.png        — 96x96 frames, separate PNG per animation
│       └── urban-zombie-*.png      — 128x128 frames, separate PNG per animation
├── tiles/city/
│   ├── floor-tiles.png             — 416x128 (32x32 tiles)
│   ├── building-tiles.png          — 704x384 (32x32 tiles)
│   └── decoration-tiles.png        — 288x128 (32x32 tiles)
└── backgrounds/
    ├── city-bg-sky.png             — 1024x346
    ├── city-bg-layer1.png          — 1024x346
    ├── city-bg-layer2.png          — 1024x346
    └── city-ruin-bg-{1-4}.png      — 576x324 each (parallax layers)
```

### Player Character
- **Source:** [GandalfHardcore — Free 2D Pixel Art Character](https://gandalfhardcore.itch.io/2d-pixel-art-male-and-female-character)
- **Frame size:** 80x64px (single sheet: 800x448, 10 cols x 7 rows)
- **Variant:** Male / Skin1
- **Animations:** idle (row 0, 5f), walk (row 1, 8f), run (row 2, 8f), jump (row 3, 4f), fall (row 4, 4f), attack (row 5, 6f), death (row 6, 10f)
- **Note:** Layer-based compositing system — sword overlay available as separate sheet

### Zombie Enemies (2 variants active in Level 1)
- **Zombie Man:** [CraftPix — Free Zombie Sprite Sheet Pack](https://craftpix.net/freebies/free-zombie-sprite-sheet-pack-pixel-art/) — 96x96 frames, separate PNGs per animation
- **Urban Zombie:** [CraftPix — Free Urban Zombie Sprite Sheet Pack](https://craftpix.net/freebies/free-urban-zombie-sprite-sheet-pixel-art-pack/) — 128x128 frames, separate PNGs per animation
- **Boss:** Urban zombie sprites at 1.5x scale (no separate boss sprites yet)
- **Available but unused:** Zombie Woman, Wild Zombie (Pack A), Corporate Corpse, Street Stalker, Urban Grotesque, Wasteland Walker (Pack B)

### Environment — Level 1 (Abandoned City)
- **Tileset:** [GandalfHardcore — Free Modern City 32x32](https://gandalfhardcore.itch.io/free-pixel-art-sidescroller-asset-pack-32x32-city) — 3 atlas PNGs (floor, building, decoration) + 3 parallax backgrounds
- **Backgrounds:** [Free Game Assets — City Ruin Backgrounds](https://free-game-assets.itch.io/free-city-ruin-backgrounds-pixel-art) — 4 post-apocalyptic parallax layers (576x324)
- **Note:** Tileset PNGs loaded but not yet used for level geometry — currently using generated colored rectangles for ground/platforms

### Still Needed (later milestones)
- Forest tileset (Level 2)
- Railroad tileset (Level 3)
- Amusement park tileset (Level 4)
- Underworld tileset (Levels 5-6)
- Sword weapon sprites (5 tiers)
- Boss-specific sprites (unique per level)
- Sound effects (free packs TBD)
- UI pixel art (health bars, shop menus)
- Coin and key sprites (currently generated placeholders)

## Implementation Status

### Complete ✅
- Project scaffold (Phaser 3 + TypeScript + Vite)
- Design doc and implementation plans
- **Asset acquisition** — all 5 free pixel art packs downloaded and organized
- **PreloadScene** — loads real sprite sheets, defines all animations, generates placeholders
- **Main Menu** — title screen with blinking "Press ENTER" prompt
- **Player entity** — movement, jumping, animated sprites (idle/walk/jump/fall/attack/death)
- **Sword combat** — hitbox creation, overlap detection, damage + knockback
- **Zombie enemies** — two variants (zombie-man, urban-zombie), patrol/chase AI, death animations
- **Splatter particles** — blood, skin, brain bursts on hit and kill
- **HUD** — health bar, coin counter, 5 key slots
- **GameState singleton** — health, coins, keys, sword damage tracking
- **Boss encounter** — Mutated Zombie with throne cutscene, charge AI, health bar
- **Victory & Game Over** — level complete and retry screens
- **Sound system** — SoundManager wired up (gracefully skips missing audio)
- **Parallax backgrounds** — 4-layer city ruin tileSprites with scroll factors
- **Camera** — follows player, pans to boss, locks to arena

### Recent Fixes (post-completion)
- **Player walking backwards** — sprite faces left by default; swapped `setFlipX` logic
- **Sword overlay** — `player-sword.png` now composited on top of player sprite, synced per frame
- **Boss defeat crash** — nulling `this.boss` after destroy to prevent frozen game loop
- **Attack hitbox direction** — corrected to match new flip convention

### Known Bugs
- **Freeze on back-scroll** — game freezes if player scrolls back past level/arena bounds
- **Boss throne placeholder** — throne is a brown rectangle, needs real art

### Next Steps (Prioritized)

**Immediate Fixes**
- **Fix off-screen scroll freeze** — investigate world bounds / camera bounds interaction when player moves backwards
- **Boss throne art** — replace brown rectangle placeholder with a proper throne sprite or tileset construction

**Milestone 2 — Level 1 Polish & New Mechanics**
- **Stepping Stones + Air Slam** — floating staircase platforms, downward sword slam, zombie jump-fail comedy (designed, see [stepping-stones-design.md](2026-02-22-stepping-stones-design.md))
- **Tile-based level geometry** — replace colored rectangle ground/platforms with city tileset PNGs
- **Sound effects** — find and integrate free sound effect packs (sword swing, splat, coin, zombie groan)
- **Game balance playtesting** — tune player speed, zombie HP, boss difficulty, coin economy

**Milestone 3 — Shops & Progression**
- **Blacksmith Shop scene** — buy swords (Rusty Blade → Iron Cleaver → Shadow Fang → Flame Edge → Giant Sun Splicer), upgrade stats (speed/damage/reach)
- **Apocalypse Shop scene** — health potions, temporary shields, extra lives
- **Shop flow** — Victory screen → Shop → next level transition
- **Sword system implementation** — multiple sword types with distinct stats, visual swap on player sprite

**Milestone 4 — Level 2 (Broken Down Forest)**
- **Forest tileset** — acquire free forest pixel art pack
- **Forest parallax backgrounds** — new 4-layer backgrounds
- **New zombie variants** — zombie woman, wild zombie from existing downloaded packs
- **Level 2 boss** — Zombie Pack (horde boss) on dead-tree throne
- **Level design** — new platform layout, environmental variety

**Milestone 5 — Levels 3-5**
- Level 3: Abandoned Railroad (Zanters, train-parts throne)
- Level 4: Abandoned Amusement Park (mutated zombies, carnival throne)
- Level 5: Dark Underworld (zombie hordes, bone-shadow throne, portal unlock)

**Milestone 6 — Final Level & Endgame**
- Level 6: Abandoned Underworld with octopus zombies
- Final Boss: Giant Brain Behemoth Titan Zombie
- Giant Sun Splicer required for final boss
- Victory ending / credits

**Future / Nice-to-Have**
- Electron Mac app packaging
- Save system (persist progress between sessions)
- Gamepad / controller support
- More zombie variant animations from unused downloaded packs

## First Milestone: Playable Level 1

### Included ✅
- Main menu screen (title, "Press ENTER to Start")
- Player character with movement, jumping, sword combat — **real animated sprites**
- Abandoned City level with parallax backgrounds — **real city ruin art**
- 8 zombies (mix of zombie-man and urban-zombie) as you scroll through — **real animated sprites**
- Splatter particles on hit/kill
- Coin drops from zombies
- HUD: health bar, coin count, key slots
- Boss throne encounter — Mutated Zombie (1.5x urban zombie)
- Boss drops Key #1
- Victory screen after boss defeated
- Game Over screen with retry
- Sound system wired up (no audio files yet — silent but all call sites ready)

### Not Included (later milestones)
- Tile-based level geometry (ground/platforms are still colored rectangles)
- Shops (added when Level 2 is built)
- Sword upgrades / multiple swords
- Sword visual on player sprite
- Levels 2-6
- Electron Mac app packaging
- Save system
- Audio files
