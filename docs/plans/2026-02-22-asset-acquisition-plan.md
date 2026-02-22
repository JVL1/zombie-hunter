# Asset Acquisition & Integration Plan

> **Status: COMPLETE** — All 7 tasks finished on 2026-02-22. Build passes clean.

**Goal:** Download free pixel art asset packs, organize them into `public/assets/`, and wire them into the Phaser PreloadScene so the game uses real sprites instead of colored rectangles.

**Architecture:** Assets are loaded in `PreloadScene` as sprite sheets (with frame dimensions) and images. Entity classes reference assets via string keys defined in `src/assets.ts`. Phaser's animation system maps sprite sheet frames to named animations (idle, walk, attack, etc).

**Tech Stack:** Phaser 3 sprite sheets, PNG files, Aseprite-exported frames

---

## Asset Sources (All Free, All Commercial-Use Licensed)

### 1. Player Character
- **Pack:** GandalfHardcore — Free 2D Pixel Art Male & Female Character
- **URL:** https://gandalfhardcore.itch.io/2d-pixel-art-male-and-female-character
- **Size:** 80x64px per frame
- **Animations:** Idle (5f), Walk (8f), Run (8f), Jump (4f), Fall (4f), Attack (6f), Death (10f)
- **License:** Commercial use allowed. No resale, no AI training, no NFT.
- **FINDING:** Pack is a **layer-based single sprite sheet** (800x448px, 10 cols x 7 rows), NOT separate files per animation as originally assumed. All animations are in rows of the same sheet. We use `Male/Skin1/` variant.

### 2. Zombie Enemies (Pack A — 3 types)
- **Pack:** CraftPix — Free Zombie Sprite Sheet Pack
- **URL:** https://craftpix.net/freebies/free-zombie-sprite-sheet-pack-pixel-art/
- **Types:** Zombie Man, Zombie Woman, Wild Zombie
- **Animations:** Idle, Walk, Run, Jump, 3x Attack, Hurt, Dead, Eating (10 sheets each)
- **License:** Royalty-free, unlimited commercial projects.
- **FINDING:** Frame size is **96x96px** (not 64x64 as originally guessed). Separate PNG per animation. Using Zombie Man for Level 1 basic enemies.
- **NOTE:** CraftPix requires account login + Cloudflare blocks curl. Had to download manually through browser.

### 3. Zombie Enemies (Pack B — 4 types)
- **Pack:** CraftPix — Free Urban Zombie Sprite Sheet Pack
- **URL:** https://craftpix.net/freebies/free-urban-zombie-sprite-sheet-pixel-art-pack/
- **Types:** Corporate Corpse, Street Stalker, Urban Grotesque, Wasteland Walker
- **Animations:** Idle, Walk, Attack, Take Damage, Death
- **License:** Royalty-free, unlimited commercial projects.
- **FINDING:** Frame size is **128x128px**. Separate PNG per animation. Using as "urban-zombie" variant in Level 1 (every 3rd zombie) and for Boss (at 1.5x scale).
- **NOTE:** Same CraftPix login/Cloudflare issue — manual download required.

### 4. City Tileset (Level 1 environment)
- **Pack:** GandalfHardcore — Free Modern City Tileset 32x32
- **URL:** https://gandalfhardcore.itch.io/free-pixel-art-sidescroller-asset-pack-32x32-city
- **Size:** 32x32 tiles
- **Includes:** Floor (416x128), building (704x384), decoration (288x128), 3 parallax backgrounds (1024x346 each)
- **License:** Commercial use allowed. No resale, no AI training.
- **FINDING:** Tileset comes as 3 separate atlas PNGs (floor-tiles, building-tiles, decoration-tiles), not a single tileset. Backgrounds are separate city-bg images.

### 5. City Ruin Backgrounds (parallax)
- **Pack:** Free Game Assets — Free City Ruin Backgrounds
- **URL:** https://free-game-assets.itch.io/free-city-ruin-backgrounds-pixel-art
- **Size:** 576x324px, 4 images
- **License:** Free (name your own price).
- **FINDING:** 4 layers as expected. Used as tileSprites with parallax scroll factors (0.1, 0.3, 0.5, 0.7).

---

## Task 0: Download Assets ✅

**Status:** Complete. All 5 packs downloaded to `assets-raw/`.

- itch.io packs (player, city, ruin backgrounds) downloaded via browser automation (XHR interception for CDN URLs)
- CraftPix packs (zombie, urban zombie) downloaded manually due to Cloudflare protection
- All ZIPs unzipped into `assets-raw/` subdirectories
- `assets-raw/` added to `.gitignore`

---

## Task 1: Organize Assets into public/assets/ ✅

**Status:** Complete. Final directory structure:

```
public/assets/
├── sprites/
│   ├── player/
│   │   ├── player-spritesheet.png    (800x448 — single sheet, Male Skin1)
│   │   └── player-sword.png          (800x448 — sword overlay layer)
│   └── zombies/
│       ├── zombie-man-idle.png       (96x96 frames)
│       ├── zombie-man-walk.png
│       ├── zombie-man-attack.png
│       ├── zombie-man-hurt.png
│       ├── zombie-man-dead.png
│       ├── urban-zombie-idle.png     (128x128 frames)
│       ├── urban-zombie-walk.png
│       ├── urban-zombie-attack.png
│       ├── urban-zombie-hurt.png
│       └── urban-zombie-dead.png
├── tiles/city/
│   ├── floor-tiles.png               (416x128)
│   ├── building-tiles.png            (704x384)
│   └── decoration-tiles.png          (288x128)
└── backgrounds/
    ├── city-bg-sky.png               (1024x346)
    ├── city-bg-layer1.png            (1024x346)
    ├── city-bg-layer2.png            (1024x346)
    ├── city-ruin-bg-1.png            (576x324)
    ├── city-ruin-bg-2.png            (576x324)
    ├── city-ruin-bg-3.png            (576x324)
    └── city-ruin-bg-4.png            (576x324)
```

**Deviation from plan:** No `sprites/boss/` directory created — boss reuses urban-zombie sprites at 1.5x scale. No `particles/` or `ui/` directories needed — those are generated at runtime.

---

## Task 2: Update src/assets.ts with Real Asset Keys ✅

**Status:** Complete. Major changes from planned version:

- **Single player sheet** (`PLAYER_SHEET`) instead of 7 separate animation sheets
- Added `PLAYER_SWORD` for sword overlay layer
- Added **urban zombie** keys (`URBAN_ZOMBIE_IDLE`, etc.) as separate variant
- Boss keys (`BOSS_*`) aliased to urban zombie keys (same textures, scaled up)
- Added `PlayerAnims` constant mapping animation names to frame row/column ranges
- City tileset split into 3 keys (`CITY_FLOOR_TILES`, `CITY_BUILDING_TILES`, `CITY_DECORATION_TILES`)
- City backgrounds: 3 parallax layers + sky

---

## Task 3: Update PreloadScene to Load Real Sprites ✅

**Status:** Complete. Key differences from plan:

- Player loaded as **single spritesheet** (80x64 frames) not 7 separate sheets
- Player animations defined via `PlayerAnims` frame ranges (row * 10 + offset)
- Zombie Man frames: 96x96 (not 64x64 as guessed)
- Urban Zombie frames: 128x128
- Added urban zombie animations (idle, walk, attack, hurt, dead)
- City backgrounds loaded as images (7 total: 3 city-bg + 4 city-ruin-bg)
- City tileset loaded as 3 separate images
- Placeholders still generated for: coin, key, sword-hitbox, throne, blood, skin, brain, ground-tile, platform-tile

---

## Task 4: Wire Animations into Player Entity ✅

**Status:** Complete.

- Constructor uses `Assets.PLAYER_SHEET` with frame 0
- Physics body sized to `setSize(24, 48)`, `setOffset(28, 16)` for the 80x64 sprite
- `updateAnimation()` method handles idle/walk/jump/fall state transitions
- Attack plays `PlayerAnims.ATTACK.key` with `animationcomplete` callback to reset `isAttacking`
- Death plays `PlayerAnims.DEATH.key` on `player-died` event

---

## Task 5: Wire Animations into Zombie Entity ✅

**Status:** Complete.

- Added `ZombieVariant` type (`'zombie' | 'urban-zombie'`)
- `animKey()` helper prefixes animation keys with variant name
- Variant-specific physics body sizes (zombie: 32x64 offset 32,32; urban: 40x80 offset 44,48)
- `die()` method plays death animation then destroys sprite
- Animation state updates in `update()` (walk when moving, idle when stopped, hurt check)

---

## Task 6: Add Parallax Background to Level 1 ✅

**Status:** Complete.

- Used `tileSprite` (not `image` with `setDisplaySize` as planned) for seamless parallax scrolling
- 4 city ruin background layers at depths -4 to -1
- `scrollFactor(0)` on all layers, parallax driven by `tilePositionX = camX * factor` in `update()`
- Scroll factors: 0.1, 0.3, 0.5, 0.7 (back to front)
- Level 1 zombies now alternate variants: every 3rd is urban-zombie (50hp vs 30hp)
- `onZombieKilled` calls `zombie.die()` for death animation instead of immediate `destroy()`

---

## Key Findings & Deviations

### Single-Sheet Player Sprites
The GandalfHardcore character pack uses a **layer-based compositing system** — a single 800x448 PNG contains all animations in a grid (10 columns x 7 rows, 80x64 per frame). The plan assumed separate files per animation. We adapted by using `generateFrameNumbers` with start/end frame indices calculated from row positions.

### Actual Frame Sizes
| Asset | Planned Size | Actual Size |
|-------|-------------|-------------|
| Player | 80x64 | 80x64 ✓ |
| Zombie Man | 64x64 (guessed) | **96x96** |
| Urban Zombie | not planned | **128x128** |

### Two Zombie Variants
The plan originally used "zombie-man" and "wild-zombie" variants. We switched to "zombie-man" (basic) and "urban-zombie" (tougher) because the urban zombie pack had cleaner sprite sheets and the larger 128x128 size makes them visually distinct.

### Boss Reuses Urban Zombie
Instead of a separate boss sprite, the boss uses urban-zombie sprites at 1.5x scale. This gives the boss a visually distinct larger size while reusing existing assets.

### CraftPix Download Friction
CraftPix requires account login and uses Cloudflare protection that blocks programmatic downloads (even with cookies). Both zombie packs had to be downloaded manually through a browser.

---

## Future Work

- **Tile-based level geometry**: Currently using generated colored rectangles for ground/platforms. The city tileset PNGs are loaded but not yet used for level construction. Consider using Tiled editor to build proper tilemaps.
- **Sword overlay compositing**: `player-sword.png` is loaded but not yet composited onto the player. Could layer it over the base sprite for weapon visibility.
- **Additional zombie variants**: Only using Zombie Man and one Urban Zombie type. Both packs include additional types (Zombie Woman, Wild Zombie, Corporate Corpse, Street Stalker, etc.) that could be added for visual variety.
- **Sound effects**: SoundManager is wired up with all call sites but no audio files loaded yet. Need to find free sound effect packs.
- **Boss-specific sprites**: The boss currently reuses urban-zombie sprites. For later levels, unique boss sprites would improve visual impact.
