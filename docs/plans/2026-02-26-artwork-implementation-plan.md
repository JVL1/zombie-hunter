# Artwork Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all 25 placeholder textures with real artwork — free asset packs for environments/items, Gemini AI-generated pixel art for custom enemies/boss/effects.

**Architecture:** Assets live in `public/assets/` and are loaded in `PreloadScene.ts`. Gemini generates individual static sprites (not animated sheets), which is a massive visual upgrade from colored rectangles. Free packs from itch.io provide environment art. Entity physics bodies may need minor adjustments after real sprites are integrated.

**Tech Stack:** Gemini AI image generation (MCP tool), free itch.io asset packs, Phaser 3 sprite loading

**Note:** No tests configured. Verification is `npm run dev` + visual check. Particles (blood, skin, brain, dust) and sword-hitbox stay as generated — they're 4-5px and invisible at game speed.

---

## What Stays as Generated (No Action Needed)

These placeholders are fine as colored shapes:
- `blood` (4x4 red), `skin` (4x4 tan), `brain` (5x5 pink), `dust` (4x4 tan) — particle effects, too small for detail
- `sword-hitbox` (40x32 semi-transparent) — debug visualization

---

## Batch 1: AI-Generated Enemy & Boss Sprites

For each enemy, we use Gemini to generate a single static pixel art sprite. The entities already work without animations — they just display the texture key. This replaces colored rectangles with actual character art.

All generated sprites go in `public/assets/sprites/forest/`.

### Task 1: Generate zombie deer sprite

**Step 1: Create output directory**

```bash
mkdir -p public/assets/sprites/forest
```

**Step 2: Generate sprite with Gemini**

Use the `mcp__plugin_gemini-pr-review_gemini__gemini-generate-image` tool:

```
prompt: "Pixel art sprite of a zombie deer, side view facing right, decayed flesh, glowing eyes, broken antlers, dark blood dripping, 2D game asset on transparent background, 48x40 pixels style, retro 16-bit aesthetic"
style: "pixel art"
aspectRatio: "4:3"
imageSize: "1K"
```

Save the output image to `public/assets/sprites/forest/zombie-deer.png`.

**Step 3: Verify the image looks right**

Use the Read tool to view the generated image. If it doesn't look good, regenerate with an adjusted prompt.

**Step 4: Update PreloadScene to load real sprite**

In `src/scenes/PreloadScene.ts`, add a load call before the placeholder section:

```typescript
// In preload(), add after the existing urban zombie loads:
this.load.image('zombie-deer', 'assets/sprites/forest/zombie-deer.png');
```

Then remove the corresponding placeholder line:
```typescript
// REMOVE: this.generatePlaceholder('zombie-deer', 0x8B6914, 48, 40);
```

**Step 5: Verify**

Run: `npm run dev`
Expected: Game loads. Navigate to Level 2 — deer enemies should show the real sprite instead of a brown rectangle.

**Step 6: Commit**

```bash
git add public/assets/sprites/forest/zombie-deer.png src/scenes/PreloadScene.ts
git commit -m "art: add AI-generated zombie deer sprite"
```

---

### Task 2: Generate zombie wolf sprite

**Step 1: Generate sprite with Gemini**

```
prompt: "Pixel art sprite of a zombie wolf, side view facing right, matted decaying fur, exposed ribs and bones, glowing red eyes, snarling teeth, dark forest predator, 2D game asset on transparent background, retro 16-bit pixel art style"
style: "pixel art"
aspectRatio: "3:2"
imageSize: "1K"
```

Save to `public/assets/sprites/forest/zombie-wolf.png`.

**Step 2: View and verify quality. Regenerate if needed.**

**Step 3: Update PreloadScene**

Add load: `this.load.image('zombie-wolf', 'assets/sprites/forest/zombie-wolf.png');`
Remove placeholder: `this.generatePlaceholder('zombie-wolf', 0x555555, 52, 36);`

**Step 4: Verify with `npm run dev`**

**Step 5: Commit**

```bash
git add public/assets/sprites/forest/zombie-wolf.png src/scenes/PreloadScene.ts
git commit -m "art: add AI-generated zombie wolf sprite"
```

---

### Task 3: Generate plant zombie sprite

**Step 1: Generate sprite with Gemini**

```
prompt: "Pixel art sprite of a plant zombie, side view facing right, humanoid zombie overgrown with green fungus and vines, mushrooms growing from shoulders, mossy decomposing flesh, glowing green eyes, tall and slow-looking, 2D game asset on transparent background, retro 16-bit pixel art style"
style: "pixel art"
aspectRatio: "3:4"
imageSize: "1K"
```

Save to `public/assets/sprites/forest/plant-zombie.png`.

**Step 2: View and verify quality. Regenerate if needed.**

**Step 3: Update PreloadScene**

Add load: `this.load.image('plant-zombie', 'assets/sprites/forest/plant-zombie.png');`
Remove placeholder: `this.generatePlaceholder('plant-zombie', 0x2E7D32, 40, 64);`

**Step 4: Verify with `npm run dev`**

**Step 5: Commit**

```bash
git add public/assets/sprites/forest/plant-zombie.png src/scenes/PreloadScene.ts
git commit -m "art: add AI-generated plant zombie sprite"
```

---

### Task 4: Generate spider hybrid sprite

**Step 1: Generate sprite with Gemini**

```
prompt: "Pixel art sprite of a spider-zombie hybrid creature, side view facing right, small crab-spider body with zombie human torso merged in, multiple spider legs, glowing purple eyes, web-covered body, creepy and fast-looking, 2D game asset on transparent background, retro 16-bit pixel art style"
style: "pixel art"
aspectRatio: "4:3"
imageSize: "1K"
```

Save to `public/assets/sprites/forest/spider-hybrid.png`.

**Step 2: View and verify quality. Regenerate if needed.**

**Step 3: Update PreloadScene**

Add load: `this.load.image('spider-hybrid', 'assets/sprites/forest/spider-hybrid.png');`
Remove placeholder: `this.generatePlaceholder('spider-hybrid', 0x6A0DAD, 44, 36);`

**Step 4: Verify with `npm run dev`**

**Step 5: Commit**

```bash
git add public/assets/sprites/forest/spider-hybrid.png src/scenes/PreloadScene.ts
git commit -m "art: add AI-generated spider hybrid sprite"
```

---

### Task 5: Generate crab-spider boss sprite

**Step 1: Generate sprite with Gemini**

```
prompt: "Pixel art sprite of a giant crab-spider zombie boss monster, side view facing right, mutated humanoid zombie wearing torn jeans with spider-crab legs bursting through the torn fabric, massive and menacing, glowing red laser eyes, dark red and brown color scheme, 2D game boss sprite on transparent background, retro 16-bit pixel art style, detailed and intimidating"
style: "pixel art"
aspectRatio: "4:3"
imageSize: "2K"
```

Save to `public/assets/sprites/forest/crab-spider-boss.png`.

**Step 2: View and verify quality. This is the Level 2 boss — regenerate until it looks awesome.**

**Step 3: Update PreloadScene**

Add load: `this.load.image('crab-spider-boss', 'assets/sprites/forest/crab-spider-boss.png');`
Remove placeholder: `this.generatePlaceholder('crab-spider-boss', 0x8B0000, 96, 80);`

**Step 4: Verify with `npm run dev`**

**Step 5: Commit**

```bash
git add public/assets/sprites/forest/crab-spider-boss.png src/scenes/PreloadScene.ts
git commit -m "art: add AI-generated crab-spider boss sprite"
```

---

## Batch 2: AI-Generated Environment & Effect Sprites

### Task 6: Generate cocoon and web decoration sprites

**Step 1: Generate cocoon with Gemini**

```
prompt: "Pixel art sprite of a large silk cocoon hanging from above, pale yellowish-white silk wrapping, slightly pulsing with something alive inside, dark forest setting, 2D game object on transparent background, retro 16-bit pixel art style"
style: "pixel art"
aspectRatio: "3:4"
imageSize: "1K"
```

Save to `public/assets/sprites/forest/cocoon.png`.

**Step 2: Generate web decoration**

```
prompt: "Pixel art sprite of a spider web stretched between tree branches, white translucent silk web, detailed radial pattern, creepy forest decoration, 2D game prop on transparent background, retro 16-bit pixel art style"
style: "pixel art"
aspectRatio: "1:1"
imageSize: "1K"
```

Save to `public/assets/sprites/forest/web-decoration.png`.

**Step 3: View both images, regenerate if needed**

**Step 4: Update PreloadScene**

Add loads:
```typescript
this.load.image('cocoon', 'assets/sprites/forest/cocoon.png');
this.load.image('web-decoration', 'assets/sprites/forest/web-decoration.png');
```

Remove placeholders:
```typescript
// REMOVE: this.generatePlaceholder('cocoon', 0xD4C5A9, 60, 80);
// REMOVE: this.generatePlaceholder('web-decoration', 0xEEEEEE, 48, 48, 'rect', 0.4);
```

**Step 5: Verify with `npm run dev`**

**Step 6: Commit**

```bash
git add public/assets/sprites/forest/cocoon.png public/assets/sprites/forest/web-decoration.png src/scenes/PreloadScene.ts
git commit -m "art: add AI-generated cocoon and web decoration sprites"
```

---

### Task 7: Generate effect sprites (lava crack, poison cloud, laser beam, shockwave)

**Step 1: Generate lava crack**

```
prompt: "Pixel art sprite of a cracked ground tile revealing glowing orange lava beneath, top-down view, jagged crack edges, molten lava glow, 2D game hazard tile on transparent background, retro 16-bit pixel art style"
style: "pixel art"
aspectRatio: "4:1"
imageSize: "1K"
```

Note: 4:1 isn't available. Use `16:9` (closest wide format) and save as `public/assets/sprites/forest/lava-crack.png`.

**Step 2: Generate poison cloud**

```
prompt: "Pixel art sprite of a toxic green poison cloud, circular puff of noxious gas with skull-like wisps, sickly green and yellow, semi-transparent, 2D game effect on transparent background, retro 16-bit pixel art style"
style: "pixel art"
aspectRatio: "1:1"
imageSize: "1K"
```

Save to `public/assets/sprites/forest/poison-cloud.png`.

**Step 3: Generate laser beam**

```
prompt: "Pixel art sprite of a horizontal red laser beam, bright crimson energy beam with white-hot center and red glow edges, straight line, 2D game projectile on transparent background, retro 16-bit pixel art style"
style: "pixel art"
aspectRatio: "21:9"
imageSize: "1K"
```

Save to `public/assets/sprites/forest/laser-beam.png`.

**Step 4: Generate shockwave**

```
prompt: "Pixel art sprite of a ground shockwave, horizontal dust and debris wave traveling across ground, brown and khaki dust cloud, small rocks flying, 2D game effect on transparent background, retro 16-bit pixel art style"
style: "pixel art"
aspectRatio: "3:1"
imageSize: "1K"
```

Use `16:9` (closest). Save to `public/assets/sprites/forest/shockwave.png`.

**Step 5: View all 4 images. Regenerate any that don't look right.**

**Step 6: Update PreloadScene**

Add loads:
```typescript
this.load.image('lava-crack', 'assets/sprites/forest/lava-crack.png');
this.load.image('poison-cloud', 'assets/sprites/forest/poison-cloud.png');
this.load.image('laser-beam', 'assets/sprites/forest/laser-beam.png');
this.load.image('shockwave', 'assets/sprites/forest/shockwave.png');
```

Remove placeholders:
```typescript
// REMOVE these 4 lines:
// this.generatePlaceholder('lava-crack', 0xFF4500, 64, 16);
// this.generatePlaceholder('laser-beam', 0xFF0000, 800, 8);
// this.generatePlaceholder('shockwave', 0xBDB76B, 40, 12);
// this.generatePlaceholder('poison-cloud', 0x00FF00, 48, 48, 'circle', 0.4);
```

**Step 7: Verify with `npm run dev`**

**Step 8: Commit**

```bash
git add public/assets/sprites/forest/ src/scenes/PreloadScene.ts
git commit -m "art: add AI-generated effect sprites (lava, poison, laser, shockwave)"
```

---

### Task 8: Generate Level 1 throne sprite

**Step 1: Generate throne with Gemini**

```
prompt: "Pixel art sprite of a dark gothic throne, large ornate chair made of bone and dark wood, tattered red velvet cushion, menacing zombie king's seat, 2D game prop on transparent background, retro 16-bit pixel art style"
style: "pixel art"
aspectRatio: "5:4"
imageSize: "1K"
```

Save to `public/assets/sprites/throne.png`.

**Step 2: View and verify. Regenerate if needed.**

**Step 3: Update PreloadScene**

Add load: `this.load.image('throne', 'assets/sprites/throne.png');`
Remove placeholder: `this.generatePlaceholder('throne', 0x8b4513, 80, 96);`

**Step 4: Verify with `npm run dev` — play Level 1, check boss throne**

**Step 5: Commit**

```bash
git add public/assets/sprites/throne.png src/scenes/PreloadScene.ts
git commit -m "art: add AI-generated throne sprite for Level 1 boss"
```

---

## Batch 3: Free Asset Packs (Environment)

### Task 9: Download and integrate forest parallax backgrounds

**Source:** [Free Pixel Art Forest by edermunizz](https://edermunizz.itch.io/free-pixel-art-forest) — 9 layers, PSD + PNG, free commercial use with credit.

**Step 1: Download the pack**

Visit https://edermunizz.itch.io/free-pixel-art-forest in a browser. Download the ZIP. Extract to a temp location.

**Step 2: Select 4 layers for parallax**

The pack has 9 layers. Pick 4 that create good depth:
- Layer 1 (farthest): distant trees / sky
- Layer 2: mid-ground foliage or fog
- Layer 3: closer trees / undergrowth
- Layer 4 (nearest): foreground branches / brush

Copy them to:
```
public/assets/backgrounds/forest-bg-1.png  (farthest)
public/assets/backgrounds/forest-bg-2.png
public/assets/backgrounds/forest-bg-3.png
public/assets/backgrounds/forest-bg-4.png  (nearest)
```

**Step 3: Update PreloadScene to load real backgrounds**

In `preload()`, add after the city background loads:

```typescript
// --- Forest backgrounds ---
this.load.image('forest-bg-1', 'assets/backgrounds/forest-bg-1.png');
this.load.image('forest-bg-2', 'assets/backgrounds/forest-bg-2.png');
this.load.image('forest-bg-3', 'assets/backgrounds/forest-bg-3.png');
this.load.image('forest-bg-4', 'assets/backgrounds/forest-bg-4.png');
```

Remove the 4 forest background placeholder lines:
```typescript
// REMOVE these 4 lines:
// this.generatePlaceholder('forest-bg-1', 0x1B3A1B, 800, 600, 'rect', 0.9);
// this.generatePlaceholder('forest-bg-2', 0x2D4A2D, 800, 600, 'rect', 0.5);
// this.generatePlaceholder('forest-bg-3', 0x1A331A, 800, 600, 'rect', 0.3);
// this.generatePlaceholder('forest-bg-4', 0x0D1F0D, 800, 600, 'rect', 0.2);
```

**Step 4: Verify with `npm run dev?level=2` — forest backgrounds should show real art**

**Step 5: Commit**

```bash
git add public/assets/backgrounds/forest-bg-*.png src/scenes/PreloadScene.ts
git commit -m "art: add edermunizz forest parallax backgrounds"
```

---

### Task 10: Generate or download forest ground and platform tiles

**Option A — Gemini generation (recommended for style consistency):**

**Step 1: Generate forest ground tile**

```
prompt: "Pixel art tile of dark forest floor, 32x32 pixels, dirt and roots and dead leaves, seamless tileable, dark brown earth tones, 2D platformer ground tile, retro 16-bit pixel art style"
style: "pixel art"
aspectRatio: "1:1"
imageSize: "1K"
```

Save to `public/assets/tiles/forest/forest-ground-tile.png`. You'll need to resize to 32x32 if the output is larger.

**Step 2: Generate forest platform tile**

```
prompt: "Pixel art tile of a wooden log platform, 32x32 pixels, fallen tree trunk cross-section, bark texture, mossy surface, seamless tileable, 2D platformer platform tile, retro 16-bit pixel art style"
style: "pixel art"
aspectRatio: "1:1"
imageSize: "1K"
```

Save to `public/assets/tiles/forest/forest-platform-tile.png`. Resize to 32x32.

**Step 3: Create directory and resize images**

```bash
mkdir -p public/assets/tiles/forest
# Use sips (macOS) to resize:
sips -z 32 32 public/assets/tiles/forest/forest-ground-tile.png
sips -z 32 32 public/assets/tiles/forest/forest-platform-tile.png
```

**Step 4: Update PreloadScene**

Add loads:
```typescript
this.load.image('forest-ground-tile', 'assets/tiles/forest/forest-ground-tile.png');
this.load.image('forest-platform-tile', 'assets/tiles/forest/forest-platform-tile.png');
```

Remove placeholders:
```typescript
// REMOVE:
// this.generatePlaceholder('forest-ground-tile', 0x3E2723, 32, 32);
// this.generatePlaceholder('forest-platform-tile', 0x5D4037, 32, 32);
```

**Step 5: Verify with `npm run dev?level=2`**

**Step 6: Commit**

```bash
git add public/assets/tiles/forest/ src/scenes/PreloadScene.ts
git commit -m "art: add forest ground and platform tiles"
```

---

### Task 11: Generate coin and key item sprites

**Step 1: Generate coin sprite**

```
prompt: "Pixel art sprite of a small gold coin, front view, shiny golden disc with embossed skull design, glinting highlight, 2D game collectible on transparent background, retro 16-bit pixel art style, 16x16 pixels"
style: "pixel art"
aspectRatio: "1:1"
imageSize: "1K"
```

Save to `public/assets/sprites/items/coin.png`. Resize to 16x16:

```bash
mkdir -p public/assets/sprites/items
sips -z 16 16 public/assets/sprites/items/coin.png
```

**Step 2: Generate key sprite**

```
prompt: "Pixel art sprite of an ornate golden key, side view, old skeleton key with decorative bow, glowing faintly, 2D game collectible on transparent background, retro 16-bit pixel art style, 16x24 pixels"
style: "pixel art"
aspectRatio: "2:3"
imageSize: "1K"
```

Save to `public/assets/sprites/items/key.png`. Resize to 16x24:

```bash
sips -z 24 16 public/assets/sprites/items/key.png
```

**Step 3: Update PreloadScene**

Add loads:
```typescript
this.load.image('coin', 'assets/sprites/items/coin.png');
this.load.image('key', 'assets/sprites/items/key.png');
```

Remove placeholders:
```typescript
// REMOVE:
// this.generatePlaceholder('coin', 0xf1c40f, 16, 16, 'circle');
// this.generatePlaceholder('key', 0xffd700, 16, 24);
```

**Step 4: Verify with `npm run dev` — kill an enemy to see coin drop, defeat boss to see key**

**Step 5: Commit**

```bash
git add public/assets/sprites/items/ src/scenes/PreloadScene.ts
git commit -m "art: add AI-generated coin and key item sprites"
```

---

## Batch 4: Level 1 Tile Replacement & Polish

### Task 12: Generate Level 1 ground and platform tiles

The Level 1 ground/platform tiles are still gray rectangles even though city tilesets are loaded. Generate proper city tiles.

**Step 1: Generate city ground tile**

```
prompt: "Pixel art tile of cracked urban concrete sidewalk, 32x32 pixels, gray concrete with cracks and weeds, post-apocalyptic city ground, seamless tileable, 2D platformer ground tile, retro 16-bit pixel art style"
style: "pixel art"
aspectRatio: "1:1"
imageSize: "1K"
```

Save and resize to 32x32 as `public/assets/tiles/city/ground-tile.png`:
```bash
sips -z 32 32 public/assets/tiles/city/ground-tile.png
```

**Step 2: Generate city platform tile**

```
prompt: "Pixel art tile of a broken concrete ledge, 32x32 pixels, gray urban platform with rebar exposed, post-apocalyptic city platform, seamless tileable, 2D platformer tile, retro 16-bit pixel art style"
style: "pixel art"
aspectRatio: "1:1"
imageSize: "1K"
```

Save and resize as `public/assets/tiles/city/platform-tile.png`:
```bash
sips -z 32 32 public/assets/tiles/city/platform-tile.png
```

**Step 3: Update PreloadScene**

Add loads:
```typescript
this.load.image('ground-tile', 'assets/tiles/city/ground-tile.png');
this.load.image('platform-tile', 'assets/tiles/city/platform-tile.png');
```

Remove placeholders:
```typescript
// REMOVE:
// this.generatePlaceholder('ground-tile', 0x555555, 32, 32);
// this.generatePlaceholder('platform-tile', 0x777777, 32, 32);
```

**Step 4: Verify with `npm run dev` — Level 1 ground should look like concrete**

**Step 5: Commit**

```bash
git add public/assets/tiles/city/ src/scenes/PreloadScene.ts
git commit -m "art: add AI-generated city ground and platform tiles"
```

---

### Task 13: Final verification and cleanup

**Step 1: Audit remaining placeholders**

Check `PreloadScene.ts` for any remaining `generatePlaceholder` calls. The only ones left should be:
- `blood` (4x4) — particle, keep
- `skin` (4x4) — particle, keep
- `brain` (5x5) — particle, keep
- `dust` (4x4) — particle, keep
- `sword-hitbox` (40x32) — debug, keep

**Step 2: Full playthrough verification**

Run: `npm run dev`

Test Level 1:
- Ground tiles are concrete (not gray rectangles)
- Platform tiles look like ledges
- Throne has real art behind boss
- Coins drop with real sprite
- Keys show real sprite
- Parallax backgrounds are real (already were from previous asset work)

Test Level 2 (`?level=2`):
- Forest parallax backgrounds show real forest layers
- Forest ground is dark dirt with roots
- Forest platforms are wooden logs
- Zombie deer have real sprites (brown zombie deer, not brown rectangles)
- Zombie wolves have real sprites
- Plant zombies have green overgrown sprites
- Spider hybrids have purple spider-zombie sprites
- Web decorations show spider webs
- Boss cocoon shows silk cocoon sprite
- Crab-Spider boss shows the full boss sprite
- Laser beams look like energy beams
- Shockwaves have dust/debris look
- Lava cracks glow orange
- Poison clouds look like toxic gas

**Step 3: Fix any visual issues**

If any sprites look wrong at their game size:
- Adjust entity physics body sizes in the entity constructor (`body!.setSize()`, `body!.setOffset()`)
- Use `setScale()` on sprites if needed
- Regenerate with Gemini if the art style is wrong

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "art: final visual polish and sprite adjustments"
```

---

## Summary

| Batch | Tasks | What's Replaced |
|-------|-------|----------------|
| 1: AI Enemies | Tasks 1-5 | 5 enemy/boss sprites (Gemini) |
| 2: AI Environment | Tasks 6-8 | Cocoon, webs, effects, throne (Gemini) |
| 3: Free Packs | Tasks 9-11 | Forest backgrounds (edermunizz), tiles, coin/key |
| 4: Level 1 Polish | Tasks 12-13 | City ground/platform tiles, final verification |

**Total: 13 tasks, ~20 placeholders replaced**
**Remaining as generated: 5 (particles + sword-hitbox) — intentionally kept**

## Credits (add to README or in-game)

- Forest parallax backgrounds: [edermunizz](https://edermunizz.itch.io/free-pixel-art-forest) (CC BY-ND 4.0)
- Enemy and effect sprites: Generated with Google Gemini AI
