# Zombie Hunters — Level 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully playable Level 1 (Abandoned City) with player movement, sword combat, zombie enemies with splatter effects, a boss throne encounter, and basic HUD.

**Architecture:** Phaser 3 scene-based architecture. Each game screen is a Scene class. The player and enemies are entity classes with Arcade Physics bodies. Combat uses overlap detection between sword hitboxes and enemy bodies. A parallel HUD scene overlays game info.

**Tech Stack:** Phaser 3, TypeScript, Vite, Arcade Physics

**Prerequisite:** Complete `docs/plans/2026-02-22-asset-acquisition-plan.md` first — download free pixel art packs and organize into `public/assets/`. ✅ **DONE** — all assets acquired and integrated.

---

## Implementation Status

| Task | Description | Status |
|------|-------------|--------|
| 0 | Project scaffold | ✅ Complete |
| 1 | Asset loading & placeholder fallbacks | ✅ Complete (real sprites integrated) |
| 2 | Main menu scene | ✅ Complete |
| 3 | Player entity — movement & jumping | ✅ Complete |
| 4 | Sword combat system | ✅ Complete |
| 5 | Zombie enemy entity | ✅ Complete (2 variants: zombie-man + urban-zombie) |
| 6 | Splatter particle system | ✅ Complete |
| 7 | Player health, coins & HUD | ✅ Complete |
| 8 | Boss throne encounter | ✅ Complete |
| 9 | Victory scene & game over | ✅ Complete |
| 10 | Sound effects | ✅ Complete (wired up, no audio files yet) |
| 11 | Polish & playtest | ✅ Complete (debug toggle, balance pass) |
| 12 | CLAUDE.md & documentation | ✅ Complete |

### Key Deviations from Plan
- **Task 1**: Player uses a **single sprite sheet** (800x448, 80x64 frames) with `PlayerAnims` frame ranges instead of 7 separate animation sheets. Zombie-man frames are 96x96 (not 64x64). Added urban-zombie variant (128x128 frames).
- **Task 5**: Added `ZombieVariant` type system. Level 1 alternates zombie-man and urban-zombie instead of just zombie-man.
- **Task 6**: Backgrounds use `tileSprite` with `tilePositionX` parallax (not `image` with `setDisplaySize` + `scrollFactor`).
- **Task 8**: Boss reuses urban-zombie sprites at 1.5x scale instead of zombie sprites at 2x scale.

### Remaining Work for Level 1
- **Tile-based level geometry**: Ground/platforms still use generated colored rectangles. City tileset PNGs are loaded but not used for level construction yet.
- **Audio files**: All SoundManager call sites wired up, but no actual audio files loaded.
- **Sword visual**: `player-sword.png` overlay not yet composited onto player sprite.

---

## Task 0: Project Scaffold ✅

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`

**Step 1: Initialize the project**

Run:
```bash
cd /Users/joshvanlente/Development/zombie-hunters
npm init -y
```

**Step 2: Install dependencies**

Run:
```bash
npm install phaser
npm install -D typescript vite
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

**Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
  },
});
```

**Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zombie Hunters</title>
  <style>
    * { margin: 0; padding: 0; }
    body { background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**Step 6: Create src/main.ts with a boot scene**

```typescript
import Phaser from 'phaser';

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create() {
    this.add.text(400, 300, 'Zombie Hunters', {
      fontSize: '48px',
      color: '#ff0000',
    }).setOrigin(0.5);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 800 },
      debug: true,
    },
  },
  scene: [BootScene],
};

new Phaser.Game(config);
```

**Step 7: Add npm scripts to package.json**

Add to `scripts`:
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

**Step 8: Run and verify**

Run: `npm run dev`
Expected: Browser opens, black screen with red "Zombie Hunters" text centered.

**Step 9: Commit**

```bash
git init
git add .
git commit -m "feat: project scaffold with Phaser 3, TypeScript, Vite"
```

---

## Task 1: Asset Loading & Placeholder Fallbacks ✅

Load real pixel art sprite sheets from `public/assets/` (downloaded via the asset acquisition plan). For assets we don't have yet (coins, keys, throne, particles, ground tiles), generate colored-shape placeholders at runtime.

**Prerequisite:** You must have already completed `docs/plans/2026-02-22-asset-acquisition-plan.md` Tasks 0-1 (download and organize assets into `public/assets/`).

**Asset sources (all free, commercial-use licensed):**
- Player: [GandalfHardcore character](https://gandalfhardcore.itch.io/2d-pixel-art-male-and-female-character) — 80x64px, 7 animation sheets
- Zombies: [CraftPix zombie pack](https://craftpix.net/freebies/free-zombie-sprite-sheet-pack-pixel-art/) — 3 types, 10 animations each
- Zombies: [CraftPix urban zombie pack](https://craftpix.net/freebies/free-urban-zombie-sprite-sheet-pixel-art-pack/) — 4 types
- City tileset: [GandalfHardcore city 32x32](https://gandalfhardcore.itch.io/free-pixel-art-sidescroller-asset-pack-32x32-city)
- Backgrounds: [Free Game Assets city ruins](https://free-game-assets.itch.io/free-city-ruin-backgrounds-pixel-art) — 4 parallax images

**Files:**
- Create: `src/assets.ts` — asset key constants
- Create: `src/scenes/PreloadScene.ts` — loads sprites + generates placeholders
- Verify: `public/assets/` directory populated with downloaded PNGs

**Step 1: Create asset directory structure (if not already done)**

```bash
mkdir -p public/assets/sprites/player
mkdir -p public/assets/sprites/zombies
mkdir -p public/assets/sprites/boss
mkdir -p public/assets/tiles/city
mkdir -p public/assets/backgrounds
mkdir -p public/assets/particles
mkdir -p public/assets/ui
```

**Step 2: Create src/assets.ts with asset key constants**

```typescript
export const Assets = {
  // Player sprite sheets (80x64 per frame — from GandalfHardcore pack)
  PLAYER_IDLE: 'player-idle',
  PLAYER_WALK: 'player-walk',
  PLAYER_RUN: 'player-run',
  PLAYER_JUMP: 'player-jump',
  PLAYER_FALL: 'player-fall',
  PLAYER_ATTACK: 'player-attack',
  PLAYER_DEATH: 'player-death',

  // Zombie sprite sheets (from CraftPix packs — frame size TBD after download)
  ZOMBIE_IDLE: 'zombie-idle',
  ZOMBIE_WALK: 'zombie-walk',
  ZOMBIE_ATTACK: 'zombie-attack',
  ZOMBIE_HURT: 'zombie-hurt',
  ZOMBIE_DEAD: 'zombie-dead',

  // Boss (reuses zombie sprites at larger scale initially)
  BOSS_IDLE: 'boss-idle',
  BOSS_WALK: 'boss-walk',
  BOSS_ATTACK: 'boss-attack',
  BOSS_HURT: 'boss-hurt',
  BOSS_DEAD: 'boss-dead',

  // Environment
  CITY_TILESET: 'city-tileset',
  CITY_BG_1: 'city-bg-1',
  CITY_BG_2: 'city-bg-2',
  CITY_BG_3: 'city-bg-3',
  CITY_BG_4: 'city-bg-4',

  // Items (generated placeholders for now)
  COIN: 'coin',
  KEY: 'key',
  SWORD_HITBOX: 'sword-hitbox',
  THRONE: 'throne',

  // Particles (generated at runtime — tiny colored squares)
  BLOOD: 'blood',
  SKIN: 'skin',
  BRAIN: 'brain',

  // Tiles (generated placeholders until Tiled tilemap is built)
  GROUND_TILE: 'ground-tile',
  PLATFORM_TILE: 'platform-tile',

  // Audio (no files yet — SoundManager gracefully skips missing audio)
  SWORD_SWING: 'sword-swing',
  ZOMBIE_GROAN: 'zombie-groan',
  COIN_PICKUP: 'coin-pickup',
  SPLAT: 'splat',
} as const;
```

**Step 3: Create PreloadScene that loads real sprites + generates placeholders**

Create `src/scenes/PreloadScene.ts`:

```typescript
import Phaser from 'phaser';
import { Assets } from '../assets';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload() {
    // Loading progress text
    const loadText = this.add.text(400, 300, 'Loading...', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.load.on('progress', (value: number) => {
      loadText.setText(`Loading... ${Math.round(value * 100)}%`);
    });

    // --- Player sprite sheets (80x64 per frame) ---
    // NOTE: Verify frameWidth/frameHeight after downloading actual PNGs
    this.load.spritesheet(Assets.PLAYER_IDLE, 'assets/sprites/player/player-idle.png', {
      frameWidth: 80, frameHeight: 64,
    });
    this.load.spritesheet(Assets.PLAYER_WALK, 'assets/sprites/player/player-walk.png', {
      frameWidth: 80, frameHeight: 64,
    });
    this.load.spritesheet(Assets.PLAYER_RUN, 'assets/sprites/player/player-run.png', {
      frameWidth: 80, frameHeight: 64,
    });
    this.load.spritesheet(Assets.PLAYER_JUMP, 'assets/sprites/player/player-jump.png', {
      frameWidth: 80, frameHeight: 64,
    });
    this.load.spritesheet(Assets.PLAYER_FALL, 'assets/sprites/player/player-fall.png', {
      frameWidth: 80, frameHeight: 64,
    });
    this.load.spritesheet(Assets.PLAYER_ATTACK, 'assets/sprites/player/player-attack.png', {
      frameWidth: 80, frameHeight: 64,
    });
    this.load.spritesheet(Assets.PLAYER_DEATH, 'assets/sprites/player/player-death.png', {
      frameWidth: 80, frameHeight: 64,
    });

    // --- Zombie sprite sheets (frame size TBD — verify after download) ---
    this.load.spritesheet(Assets.ZOMBIE_IDLE, 'assets/sprites/zombies/zombie-man-idle.png', {
      frameWidth: 64, frameHeight: 64,
    });
    this.load.spritesheet(Assets.ZOMBIE_WALK, 'assets/sprites/zombies/zombie-man-walk.png', {
      frameWidth: 64, frameHeight: 64,
    });
    this.load.spritesheet(Assets.ZOMBIE_ATTACK, 'assets/sprites/zombies/zombie-man-attack.png', {
      frameWidth: 64, frameHeight: 64,
    });
    this.load.spritesheet(Assets.ZOMBIE_HURT, 'assets/sprites/zombies/zombie-man-hurt.png', {
      frameWidth: 64, frameHeight: 64,
    });
    this.load.spritesheet(Assets.ZOMBIE_DEAD, 'assets/sprites/zombies/zombie-man-dead.png', {
      frameWidth: 64, frameHeight: 64,
    });

    // --- Parallax backgrounds ---
    this.load.image(Assets.CITY_BG_1, 'assets/backgrounds/city-ruin-bg-1.png');
    this.load.image(Assets.CITY_BG_2, 'assets/backgrounds/city-ruin-bg-2.png');
    this.load.image(Assets.CITY_BG_3, 'assets/backgrounds/city-ruin-bg-3.png');
    this.load.image(Assets.CITY_BG_4, 'assets/backgrounds/city-ruin-bg-4.png');

    // --- City tileset ---
    this.load.image(Assets.CITY_TILESET, 'assets/tiles/city/tileset.png');
  }

  create() {
    // --- Define player animations ---
    this.anims.create({
      key: 'player-idle',
      frames: this.anims.generateFrameNumbers(Assets.PLAYER_IDLE, { start: 0, end: 4 }),
      frameRate: 8, repeat: -1,
    });
    this.anims.create({
      key: 'player-walk',
      frames: this.anims.generateFrameNumbers(Assets.PLAYER_WALK, { start: 0, end: 7 }),
      frameRate: 10, repeat: -1,
    });
    this.anims.create({
      key: 'player-run',
      frames: this.anims.generateFrameNumbers(Assets.PLAYER_RUN, { start: 0, end: 7 }),
      frameRate: 12, repeat: -1,
    });
    this.anims.create({
      key: 'player-jump',
      frames: this.anims.generateFrameNumbers(Assets.PLAYER_JUMP, { start: 0, end: 3 }),
      frameRate: 10, repeat: 0,
    });
    this.anims.create({
      key: 'player-fall',
      frames: this.anims.generateFrameNumbers(Assets.PLAYER_FALL, { start: 0, end: 3 }),
      frameRate: 10, repeat: 0,
    });
    this.anims.create({
      key: 'player-attack',
      frames: this.anims.generateFrameNumbers(Assets.PLAYER_ATTACK, { start: 0, end: 5 }),
      frameRate: 15, repeat: 0,
    });
    this.anims.create({
      key: 'player-death',
      frames: this.anims.generateFrameNumbers(Assets.PLAYER_DEATH, { start: 0, end: 9 }),
      frameRate: 8, repeat: 0,
    });

    // --- Define zombie animations ---
    this.anims.create({
      key: 'zombie-idle',
      frames: this.anims.generateFrameNumbers(Assets.ZOMBIE_IDLE, { start: 0, end: 3 }),
      frameRate: 6, repeat: -1,
    });
    this.anims.create({
      key: 'zombie-walk',
      frames: this.anims.generateFrameNumbers(Assets.ZOMBIE_WALK, { start: 0, end: 5 }),
      frameRate: 8, repeat: -1,
    });
    this.anims.create({
      key: 'zombie-attack',
      frames: this.anims.generateFrameNumbers(Assets.ZOMBIE_ATTACK, { start: 0, end: 5 }),
      frameRate: 10, repeat: 0,
    });
    this.anims.create({
      key: 'zombie-hurt',
      frames: this.anims.generateFrameNumbers(Assets.ZOMBIE_HURT, { start: 0, end: 2 }),
      frameRate: 10, repeat: 0,
    });
    this.anims.create({
      key: 'zombie-dead',
      frames: this.anims.generateFrameNumbers(Assets.ZOMBIE_DEAD, { start: 0, end: 5 }),
      frameRate: 8, repeat: 0,
    });

    // --- Generate placeholder textures for assets we don't have yet ---
    this.generatePlaceholder('coin', 0xf1c40f, 16, 16, 'circle');
    this.generatePlaceholder('key', 0xffd700, 16, 24);
    this.generatePlaceholder('sword-hitbox', 0xffffff, 40, 32, 'rect', 0.3);
    this.generatePlaceholder('throne', 0x8b4513, 80, 96);
    this.generatePlaceholder('blood', 0xcc0000, 4, 4);
    this.generatePlaceholder('skin', 0xccaa88, 4, 4);
    this.generatePlaceholder('brain', 0xff69b4, 5, 5);
    this.generatePlaceholder('ground-tile', 0x555555, 32, 32);
    this.generatePlaceholder('platform-tile', 0x777777, 32, 32);

    this.scene.start('MainMenu');
  }

  private generatePlaceholder(
    key: string, color: number, w: number, h: number,
    shape: 'rect' | 'circle' = 'rect', alpha: number = 1
  ) {
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(color, alpha);
    if (shape === 'circle') {
      gfx.fillCircle(w / 2, h / 2, w / 2);
    } else {
      gfx.fillRect(0, 0, w, h);
    }
    gfx.generateTexture(key, w, h);
  }
}
```

**Step 4: Update main.ts to use PreloadScene**

Update `src/main.ts` scene array to: `scene: [PreloadScene, BootScene]` (rename BootScene to MainMenuScene in next task).

**Step 5: Run and verify**

Run: `npm run dev`
Expected: Loading screen appears briefly, then transitions to MainMenu scene. Player and zombie sprites should display from real sprite sheets. Console should show no 404 errors for asset files.

**Step 6: Commit**

```bash
git add .
git commit -m "feat: load real sprite sheets with placeholder fallbacks for missing assets"
```

---

## Task 2: Main Menu Scene ✅

**Files:**
- Create: `src/scenes/MainMenuScene.ts`
- Modify: `src/main.ts` — register new scene

**Step 1: Create MainMenuScene**

Create `src/scenes/MainMenuScene.ts`:

```typescript
import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenu' });
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 3, 'ZOMBIE HUNTERS', {
      fontSize: '56px',
      color: '#cc0000',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const startText = this.add.text(width / 2, height / 2 + 50, 'Press ENTER to Start', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Blink effect
    this.tweens.add({
      targets: startText,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard!.once('keydown-ENTER', () => {
      this.scene.start('Level1');
    });
  }
}
```

**Step 2: Update main.ts scene list**

Replace the BootScene with the new scenes:

```typescript
import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 800 },
      debug: true,
    },
  },
  scene: [PreloadScene, MainMenuScene],
};

new Phaser.Game(config);
```

**Step 3: Run and verify**

Run: `npm run dev`
Expected: Title screen with "ZOMBIE HUNTERS" in red, blinking "Press ENTER to Start" text.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: main menu scene with title and start prompt"
```

---

## Task 3: Player Entity — Movement & Jumping ✅

**Files:**
- Create: `src/entities/Player.ts`
- Create: `src/scenes/Level1Scene.ts`
- Modify: `src/main.ts` — register Level1Scene

**Step 1: Create Player class**

Create `src/entities/Player.ts`:

```typescript
import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveSpeed = 200;
  private jumpForce = -450;
  private isAttacking = false; // Set to true during sword swing (Task 4)

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-idle', 0); // Use first frame of idle sprite sheet

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setBounce(0.1);

    this.cursors = scene.input.keyboard!.createCursorKeys();
  }

  update() {
    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.setVelocityX(-this.moveSpeed);
      this.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.setVelocityX(this.moveSpeed);
      this.setFlipX(false);
    } else {
      this.setVelocityX(0);
    }

    // Jump — only when touching ground
    if (this.cursors.up.isDown && this.body!.blocked.down) {
      this.setVelocityY(this.jumpForce);
    }

    // Play animations based on state (attack animation handled in attack() method)
    if (!this.isAttacking) {
      if (!this.body!.blocked.down) {
        if (this.body!.velocity.y < 0) {
          this.play('player-jump', true);
        } else {
          this.play('player-fall', true);
        }
      } else if (Math.abs(this.body!.velocity.x) > 0) {
        this.play('player-walk', true);
      } else {
        this.play('player-idle', true);
      }
    }
  }
}
```

**Step 2: Create Level1Scene with ground and player**

Create `src/scenes/Level1Scene.ts`:

```typescript
import Phaser from 'phaser';
import { Player } from '../entities/Player';

export class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private ground!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super({ key: 'Level1' });
  }

  create() {
    // Set world bounds wider than screen for scrolling
    this.physics.world.setBounds(0, 0, 3200, 600);

    // Parallax city ruin backgrounds (slower scroll = further away)
    const bg1 = this.add.image(0, 0, 'city-bg-1').setOrigin(0, 0);
    bg1.setScrollFactor(0.1).setDisplaySize(3200, 600);
    const bg2 = this.add.image(0, 0, 'city-bg-2').setOrigin(0, 0);
    bg2.setScrollFactor(0.3).setDisplaySize(3200, 600);
    const bg3 = this.add.image(0, 0, 'city-bg-3').setOrigin(0, 0);
    bg3.setScrollFactor(0.5).setDisplaySize(3200, 600);

    // Create ground — tiled across the level width
    this.ground = this.physics.add.staticGroup();
    for (let x = 0; x < 3200; x += 32) {
      this.ground.create(x + 16, 584, 'ground-tile');
    }

    // Add some platforms
    this.createPlatform(300, 450, 5);
    this.createPlatform(700, 350, 4);
    this.createPlatform(1100, 400, 6);
    this.createPlatform(1600, 350, 4);
    this.createPlatform(2000, 450, 5);
    this.createPlatform(2500, 350, 3);

    // Create player
    this.player = new Player(this, 100, 500);
    this.physics.add.collider(this.player, this.ground);

    // Camera follows player
    this.cameras.main.setBounds(0, 0, 3200, 600);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  update() {
    this.player.update();
  }

  private createPlatform(x: number, y: number, tileCount: number) {
    for (let i = 0; i < tileCount; i++) {
      this.ground.create(x + i * 32 + 16, y, 'platform-tile');
    }
  }
}
```

**Step 3: Register Level1Scene in main.ts**

Add import and add to scene array:
```typescript
import { Level1Scene } from './scenes/Level1Scene';
// ...
scene: [PreloadScene, MainMenuScene, Level1Scene],
```

**Step 4: Run and verify**

Run: `npm run dev`
Expected: Press Enter on menu → Level 1 loads with parallax city ruin backgrounds. Animated player sprite moves with arrow keys (walk animation plays), jumps with up arrow (jump/fall animations), lands on gray ground. Camera scrolls as player moves right with parallax depth effect.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: player entity with movement, jumping, and scrolling level"
```

---

## Task 4: Sword Combat System ✅

**Files:**
- Create: `src/systems/Combat.ts`
- Modify: `src/entities/Player.ts` — add sword attack
- Modify: `src/scenes/Level1Scene.ts` — wire up attack key

**Step 1: Add attack capability to Player**

Add to `src/entities/Player.ts`:

```typescript
// New properties
private attackKey: Phaser.Input.Keyboard.Key;
private isAttacking = false;
private attackCooldown = 300; // ms
private lastAttackTime = 0;
private swordHitbox: Phaser.GameObjects.Rectangle | null = null;

// In constructor, after cursors:
this.attackKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);

// New method
attack(): Phaser.GameObjects.Rectangle | null {
  const now = this.scene.time.now;
  if (this.isAttacking || now - this.lastAttackTime < this.attackCooldown) {
    return null;
  }

  this.isAttacking = true;
  this.lastAttackTime = now;

  // Play attack animation
  this.play('player-attack', true);

  // Create hitbox in front of player
  const offsetX = this.flipX ? -30 : 30;
  const hitbox = this.scene.add.rectangle(
    this.x + offsetX, this.y, 40, 32, 0xffffff, 0.3
  );
  this.scene.physics.add.existing(hitbox, false);
  (hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

  // Remove hitbox after short duration
  this.scene.time.delayedCall(100, () => {
    hitbox.destroy();
    this.isAttacking = false;
  });

  return hitbox;
}

// In update(), after movement:
if (this.attackKey.isDown) {
  this.attack();
}
```

**Step 2: Create Combat system**

Create `src/systems/Combat.ts`:

```typescript
import Phaser from 'phaser';

export interface Damageable {
  health: number;
  maxHealth: number;
  takeDamage(amount: number): void;
  isDead(): boolean;
}

export function flashSprite(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite
) {
  sprite.setTint(0xff0000);
  scene.time.delayedCall(100, () => {
    sprite.clearTint();
  });
}

export function knockback(
  body: Phaser.Physics.Arcade.Body,
  fromX: number,
  force: number = 200
) {
  const direction = body.x > fromX ? 1 : -1;
  body.setVelocityX(direction * force);
  body.setVelocityY(-100);
}
```

**Step 3: Run and verify**

Run: `npm run dev`
Expected: Press A key → white semi-transparent rectangle appears briefly in front of player. Flips side based on player facing direction.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: sword attack system with hitbox and combat utilities"
```

---

## Task 5: Zombie Enemy Entity ✅

**Files:**
- Create: `src/entities/Zombie.ts`
- Modify: `src/scenes/Level1Scene.ts` — spawn zombies, wire up combat

**Step 1: Create Zombie class**

Create `src/entities/Zombie.ts`:

```typescript
import Phaser from 'phaser';
import { Damageable, flashSprite, knockback } from '../systems/Combat';

export class Zombie extends Phaser.Physics.Arcade.Sprite implements Damageable {
  health: number;
  maxHealth: number;
  private damage = 10;
  private speed = 60;
  private aggroRange = 200;
  private patrolDirection = 1;
  private patrolTimer = 0;
  private patrolInterval = 2000; // ms
  private target: Phaser.Physics.Arcade.Sprite | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    health: number = 30
  ) {
    super(scene, x, y, 'zombie-idle', 0); // Use first frame of zombie idle sprite sheet

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHealth = health;
    this.health = health;

    this.setCollideWorldBounds(true);
    this.setBounce(0.1);
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  getDamage(): number {
    return this.damage;
  }

  takeDamage(amount: number) {
    this.health -= amount;
    flashSprite(this.scene, this);
    this.play('zombie-hurt', true); // Play hurt animation
    knockback(
      this.body as Phaser.Physics.Arcade.Body,
      this.target?.x ?? this.x - 1,
      150
    );
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  update(_time: number, delta: number) {
    if (this.isDead()) return;

    if (!this.target) {
      this.patrol(delta);
      return;
    }

    const distToPlayer = Phaser.Math.Distance.BetweenPoints(this, this.target);

    if (distToPlayer < this.aggroRange) {
      // Chase player
      const direction = this.target.x < this.x ? -1 : 1;
      this.setVelocityX(direction * this.speed * 1.5);
      this.setFlipX(direction < 0);
      this.play('zombie-walk', true); // Play walk animation when chasing
    } else {
      this.patrol(delta);
    }
  }

  private patrol(delta: number) {
    this.patrolTimer += delta;
    if (this.patrolTimer >= this.patrolInterval) {
      this.patrolDirection *= -1;
      this.patrolTimer = 0;
    }
    this.setVelocityX(this.patrolDirection * this.speed);
    this.setFlipX(this.patrolDirection < 0);
    this.play('zombie-walk', true); // Play walk animation while patrolling
  }
}
```

**Step 2: Add zombies to Level1Scene**

Add to `Level1Scene`:

```typescript
import { Zombie } from '../entities/Zombie';

// New properties
private zombies!: Phaser.GameObjects.Group;
private contactCooldown = new Map<Zombie, number>();

// In create(), after player setup:
this.zombies = this.add.group();
this.spawnZombies();

// Zombie-ground collision
this.physics.add.collider(this.zombies, this.ground);

// Player-zombie contact damage
this.physics.add.overlap(this.player, this.zombies, this.onPlayerHitZombie, undefined, this);

// New methods:
private spawnZombies() {
  const positions = [400, 600, 900, 1200, 1500, 1800, 2100, 2400];
  for (const x of positions) {
    const zombie = new Zombie(this, x, 500);
    zombie.setTarget(this.player);
    this.zombies.add(zombie);
  }
}

private onPlayerHitZombie(
  player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  zombie: Phaser.Types.Physics.Arcade.GameObjectWithBody
) {
  const z = zombie as unknown as Zombie;
  const now = this.time.now;
  const lastHit = this.contactCooldown.get(z) ?? 0;

  if (now - lastHit > 1000) {
    this.contactCooldown.set(z, now);
    // Player takes damage (wired up in Task 7 with HUD)
    this.player.takeDamage(z.getDamage());
  }
}

// In update():
this.zombies.getChildren().forEach((z) => {
  (z as Zombie).update(time, delta);
});
```

**Step 3: Wire sword hitbox to damage zombies**

In `Level1Scene.create()` or in Player, when sword hitbox is created, add overlap:

```typescript
// In Level1Scene, override update to check attacks:
update(time: number, delta: number) {
  this.player.update();

  // Check sword-zombie overlaps — handled by Player emitting attack events
  // We'll use a scene event pattern:
  this.zombies.getChildren().forEach((z) => {
    (z as Zombie).update(time, delta);
  });
}
```

Modify `Player.attack()` to emit a scene event with the hitbox, and listen in Level1Scene:

In Player.attack():
```typescript
this.scene.events.emit('player-attack', hitbox);
```

In Level1Scene.create():
```typescript
this.events.on('player-attack', (hitbox: Phaser.GameObjects.Rectangle) => {
  this.physics.add.overlap(hitbox, this.zombies, (_hitbox, zombie) => {
    const z = zombie as unknown as Zombie;
    if (!z.isDead()) {
      z.takeDamage(10); // Base sword damage
      if (z.isDead()) {
        this.onZombieKilled(z);
      }
    }
  });
});
```

```typescript
private onZombieKilled(zombie: Zombie) {
  // Play death animation, then destroy
  zombie.play('zombie-dead');
  zombie.setVelocityX(0);
  (zombie.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  zombie.once('animationcomplete-zombie-dead', () => {
    // Spawn coin at zombie position
    // Splatter effect (Task 6)
    zombie.destroy();
  });
}
```

**Step 4: Run and verify**

Run: `npm run dev`
Expected: Animated zombies patrol back and forth (walk animation). They chase the player when close. Press A to swing sword — zombies play hurt animation, flash red, get knocked back. After enough hits, zombies play death animation then are destroyed.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: zombie enemies with patrol/chase AI and sword combat"
```

---

## Task 6: Splatter Particle System ✅

**Files:**
- Create: `src/systems/Splatter.ts`
- Modify: `src/scenes/Level1Scene.ts` — trigger splatter on hit/kill

**Step 1: Create Splatter system**

Create `src/systems/Splatter.ts`:

```typescript
import Phaser from 'phaser';

export interface SplatterConfig {
  x: number;
  y: number;
  isKill: boolean; // true = big burst on death, false = small burst on hit
  tint?: number;   // override color for special zombie types
}

export function createSplatter(scene: Phaser.Scene, config: SplatterConfig) {
  const { x, y, isKill } = config;
  const quantity = isKill ? 30 : 8;
  const speed = isKill ? 250 : 120;

  // Blood particles
  scene.add.particles(x, y, 'blood', {
    speed: { min: speed * 0.5, max: speed },
    angle: { min: 0, max: 360 },
    scale: { start: 1.5, end: 0.2 },
    lifespan: isKill ? 800 : 400,
    quantity,
    emitting: false,
    gravityY: 300,
  }).explode();

  // Skin chunks
  scene.add.particles(x, y, 'skin', {
    speed: { min: speed * 0.3, max: speed * 0.8 },
    angle: { min: 0, max: 360 },
    scale: { start: 1.2, end: 0.3 },
    lifespan: isKill ? 700 : 350,
    quantity: Math.floor(quantity * 0.5),
    emitting: false,
    gravityY: 400,
  }).explode();

  // Brain bits — only on kill
  if (isKill) {
    scene.add.particles(x, y, 'brain', {
      speed: { min: 50, max: 200 },
      angle: { min: 200, max: 340 },
      scale: { start: 1.5, end: 0.5 },
      lifespan: 1000,
      quantity: 10,
      emitting: false,
      gravityY: 350,
    }).explode();
  }
}
```

**Step 2: Wire splatter into combat**

In `Level1Scene`, when zombie takes damage:

```typescript
// On hit (inside the player-attack overlap callback):
createSplatter(this, { x: z.x, y: z.y, isKill: false });

// On kill (in onZombieKilled):
createSplatter(this, { x: zombie.x, y: zombie.y, isKill: true });
```

**Step 3: Run and verify**

Run: `npm run dev`
Expected: Hitting a zombie sprays small red, beige, and pink particles. Killing a zombie creates a much larger burst with brain chunks flying out. Particles fall with gravity and fade out.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: blood, skin, and brain splatter particle effects"
```

---

## Task 7: Player Health, Coins & HUD ✅

**Files:**
- Create: `src/scenes/HUDScene.ts`
- Create: `src/systems/GameState.ts`
- Modify: `src/entities/Player.ts` — add health/damage
- Modify: `src/scenes/Level1Scene.ts` — coin drops, launch HUD

**Step 1: Create GameState (shared game data)**

Create `src/systems/GameState.ts`:

```typescript
export class GameState {
  private static instance: GameState;

  health = 100;
  maxHealth = 100;
  coins = 0;
  keys: boolean[] = [false, false, false, false, false];
  currentSword = 'Rusty Blade';
  swordDamage = 10;

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  reset() {
    this.health = 100;
    this.coins = 0;
    this.keys = [false, false, false, false, false];
    this.currentSword = 'Rusty Blade';
    this.swordDamage = 10;
  }

  collectKey(index: number) {
    this.keys[index] = true;
  }

  get keyCount(): number {
    return this.keys.filter(Boolean).length;
  }
}
```

**Step 2: Add takeDamage to Player**

Add to Player class:

```typescript
private gameState = GameState.getInstance();

takeDamage(amount: number) {
  this.gameState.health -= amount;
  flashSprite(this.scene, this);

  if (this.gameState.health <= 0) {
    this.gameState.health = 0;
    this.scene.events.emit('player-died');
  }
}
```

**Step 3: Create HUD scene (runs parallel to Level1)**

Create `src/scenes/HUDScene.ts`:

```typescript
import Phaser from 'phaser';
import { GameState } from '../systems/GameState';

export class HUDScene extends Phaser.Scene {
  private healthBar!: Phaser.GameObjects.Rectangle;
  private healthBarBg!: Phaser.GameObjects.Rectangle;
  private coinText!: Phaser.GameObjects.Text;
  private keySlots: Phaser.GameObjects.Rectangle[] = [];
  private gameState = GameState.getInstance();

  constructor() {
    super({ key: 'HUD' });
  }

  create() {
    // Health bar background
    this.healthBarBg = this.add.rectangle(120, 30, 200, 20, 0x333333);
    this.healthBarBg.setOrigin(0, 0.5);
    this.add.text(20, 30, 'HP', {
      fontSize: '16px',
      color: '#ff0000',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // Health bar fill
    this.healthBar = this.add.rectangle(120, 30, 200, 20, 0xcc0000);
    this.healthBar.setOrigin(0, 0.5);

    // Coin counter
    this.add.rectangle(26, 60, 12, 12, 0xf1c40f); // coin icon
    this.coinText = this.add.text(40, 60, '0', {
      fontSize: '16px',
      color: '#f1c40f',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    // Key slots (5 empty slots)
    for (let i = 0; i < 5; i++) {
      const slot = this.add.rectangle(650 + i * 30, 30, 20, 28, 0x333333);
      slot.setStrokeStyle(2, 0xffd700);
      this.keySlots.push(slot);
    }

    this.add.text(600, 30, 'KEYS', {
      fontSize: '12px',
      color: '#ffd700',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
  }

  update() {
    // Update health bar width
    const healthPercent = this.gameState.health / this.gameState.maxHealth;
    this.healthBar.setSize(200 * healthPercent, 20);

    // Update coin text
    this.coinText.setText(this.gameState.coins.toString());

    // Update key slots
    for (let i = 0; i < 5; i++) {
      this.keySlots[i].setFillStyle(
        this.gameState.keys[i] ? 0xffd700 : 0x333333
      );
    }
  }
}
```

**Step 4: Launch HUD from Level1Scene**

In `Level1Scene.create()`:
```typescript
this.scene.launch('HUD');
```

**Step 5: Add coin drops on zombie kill**

In `Level1Scene.onZombieKilled()`:
```typescript
private onZombieKilled(zombie: Zombie) {
  createSplatter(this, { x: zombie.x, y: zombie.y, isKill: true });

  // Drop coin
  const coin = this.physics.add.sprite(zombie.x, zombie.y - 20, 'coin');
  coin.setBounce(0.5);
  this.physics.add.collider(coin, this.ground);
  this.physics.add.overlap(this.player, coin, () => {
    GameState.getInstance().coins += 5;
    coin.destroy();
  });

  zombie.destroy();
}
```

**Step 6: Register HUDScene in main.ts**

Add to scene array.

**Step 7: Run and verify**

Run: `npm run dev`
Expected: HUD shows at top of screen — red health bar, coin counter, 5 empty key slots. Killing zombies drops yellow coins. Picking up coins updates the counter. Taking damage from zombies shrinks the health bar.

**Step 8: Commit**

```bash
git add .
git commit -m "feat: HUD with health bar, coins, key slots, and game state"
```

---

## Task 8: Boss Throne Encounter ✅

**Files:**
- Create: `src/entities/Boss.ts`
- Modify: `src/scenes/Level1Scene.ts` — add boss throne area

**Step 1: Create Boss class**

Create `src/entities/Boss.ts`:

```typescript
import Phaser from 'phaser';
import { Damageable, flashSprite, knockback } from '../systems/Combat';

export enum BossState {
  SITTING,
  RISING,
  FIGHTING,
  DEAD,
}

export class Boss extends Phaser.Physics.Arcade.Sprite implements Damageable {
  health: number;
  maxHealth: number;
  private damage = 20;
  private speed = 100;
  private state = BossState.SITTING;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private throne: Phaser.GameObjects.Rectangle;
  private attackTimer = 0;
  private chargeSpeed = 300;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    health: number = 150
  ) {
    super(scene, x, y, 'zombie-idle', 0); // Boss reuses zombie sprites, scaled up
    this.setScale(2); // 2x size to make boss feel big and intimidating

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHealth = health;
    this.health = health;

    this.setCollideWorldBounds(true);
    this.setBounce(0.1);

    // Initially no movement — sitting on throne
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setImmovable(true);

    // Create throne behind boss
    this.throne = scene.add.rectangle(x, y + 20, 80, 96, 0x8b4513);
    this.setDepth(1); // Boss renders in front of throne
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  getState(): BossState {
    return this.state;
  }

  getDamage(): number {
    return this.damage;
  }

  // Called when player gets close enough
  triggerRise() {
    if (this.state !== BossState.SITTING) return;
    this.state = BossState.RISING;

    // Rise animation — move up slightly then drop down
    this.scene.tweens.add({
      targets: this,
      y: this.y - 30,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        this.state = BossState.FIGHTING;
        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        this.setImmovable(false);
      },
    });
  }

  takeDamage(amount: number) {
    if (this.state !== BossState.FIGHTING) return;

    this.health -= amount;
    flashSprite(this.scene, this);
    knockback(
      this.body as Phaser.Physics.Arcade.Body,
      this.target?.x ?? this.x - 1,
      100
    );
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  destroyThrone() {
    // Throne crumble effect
    this.scene.tweens.add({
      targets: this.throne,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.3,
      duration: 500,
      onComplete: () => this.throne.destroy(),
    });
  }

  update(time: number, delta: number) {
    if (this.state !== BossState.FIGHTING || !this.target) return;

    this.attackTimer += delta;

    // Basic boss AI: charge at player, pause, repeat
    const dist = Phaser.Math.Distance.BetweenPoints(this, this.target);
    const direction = this.target.x < this.x ? -1 : 1;
    this.setFlipX(direction < 0);

    if (this.attackTimer > 2000) {
      // Charge attack
      this.setVelocityX(direction * this.chargeSpeed);
      if (this.attackTimer > 2500) {
        this.attackTimer = 0;
      }
    } else {
      // Walk toward player
      this.setVelocityX(direction * this.speed);
    }
  }
}
```

**Step 2: Add boss area to Level1Scene**

In `Level1Scene`:

```typescript
import { Boss, BossState } from '../entities/Boss';

// New properties:
private boss!: Boss;
private bossTriggered = false;
private bossHealthBar!: Phaser.GameObjects.Rectangle;
private bossHealthBarBg!: Phaser.GameObjects.Rectangle;

// In create(), at the end of the level (around x=2900):
this.boss = new Boss(this, 2950, 520);
this.boss.setTarget(this.player);
this.physics.add.collider(this.boss, this.ground);

// In update():
// Trigger boss when player approaches
if (!this.bossTriggered && this.player.x > 2700) {
  this.bossTriggered = true;
  this.triggerBossEncounter();
}

if (this.boss && this.boss.getState() === BossState.FIGHTING) {
  this.boss.update(time, delta);
}

// New method:
private triggerBossEncounter() {
  // Lock camera
  this.cameras.main.stopFollow();
  this.cameras.main.pan(2900, 300, 1000, 'Power2');

  // Boss rises after camera pan
  this.time.delayedCall(1200, () => {
    this.boss.triggerRise();

    // Lock player in boss arena
    this.physics.world.setBounds(2600, 0, 600, 600);
    this.cameras.main.setBounds(2600, 0, 600, 600);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Add boss health bar
    this.showBossHealthBar();

    // Wire up sword damage to boss
    this.events.on('player-attack', (hitbox: Phaser.GameObjects.Rectangle) => {
      this.physics.add.overlap(hitbox, this.boss, () => {
        if (this.boss.getState() === BossState.FIGHTING && !this.boss.isDead()) {
          const gameState = GameState.getInstance();
          this.boss.takeDamage(gameState.swordDamage);
          createSplatter(this, { x: this.boss.x, y: this.boss.y, isKill: false });

          if (this.boss.isDead()) {
            this.onBossDefeated();
          }
        }
      });
    });

    // Boss contact damage
    this.physics.add.overlap(this.player, this.boss, () => {
      if (this.boss.getState() === BossState.FIGHTING) {
        const now = this.time.now;
        if (now - (this.lastBossHitTime ?? 0) > 1000) {
          this.lastBossHitTime = now;
          this.player.takeDamage(this.boss.getDamage());
        }
      }
    });
  });
}

private showBossHealthBar() {
  // Boss health bar in world space above boss arena
  this.add.text(2900, 50, 'MUTATED ZOMBIE', {
    fontSize: '18px', color: '#ff0000', fontFamily: 'monospace',
  }).setOrigin(0.5).setScrollFactor(0);

  this.bossHealthBarBg = this.add.rectangle(2900, 70, 300, 15, 0x333333)
    .setScrollFactor(0);
  this.bossHealthBar = this.add.rectangle(2900 - 150, 70, 300, 15, 0xff0000)
    .setOrigin(0, 0.5).setScrollFactor(0);
}

private onBossDefeated() {
  createSplatter(this, { x: this.boss.x, y: this.boss.y, isKill: true });
  this.boss.destroyThrone();
  this.boss.destroy();

  // Drop key
  const gameState = GameState.getInstance();
  gameState.collectKey(0);

  // Drop key visual
  const key = this.physics.add.sprite(2950, 400, 'key');
  this.physics.add.collider(key, this.ground);
  this.physics.add.overlap(this.player, key, () => {
    key.destroy();
    this.time.delayedCall(1500, () => {
      this.scene.stop('HUD');
      this.scene.start('Victory');
    });
  });
}
```

**Step 3: Update boss health bar in update()**

```typescript
// In update(), if boss health bar exists:
if (this.bossHealthBar && this.boss && !this.boss.isDead()) {
  const pct = this.boss.health / this.boss.maxHealth;
  this.bossHealthBar.setSize(300 * pct, 15);
}
```

**Step 4: Run and verify**

Run: `npm run dev`
Expected: Reach the end of the level → camera pans to boss sitting on brown throne → boss rises → camera locks to arena → fight the boss → boss drops key when defeated → throne crumbles.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: boss throne encounter with cinematic intro and key drop"
```

---

## Task 9: Victory Scene & Game Over ✅

**Files:**
- Create: `src/scenes/VictoryScene.ts`
- Create: `src/scenes/GameOverScene.ts`
- Modify: `src/scenes/Level1Scene.ts` — handle player death
- Modify: `src/main.ts` — register scenes

**Step 1: Create VictoryScene**

Create `src/scenes/VictoryScene.ts`:

```typescript
import Phaser from 'phaser';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Victory' });
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 3, 'LEVEL COMPLETE!', {
      fontSize: '48px',
      color: '#ffd700',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, 'Key #1 Collected!', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 80, 'Press ENTER to continue', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.input.keyboard!.once('keydown-ENTER', () => {
      this.scene.start('MainMenu'); // Later: go to shop, then Level 2
    });
  }
}
```

**Step 2: Create GameOverScene**

Create `src/scenes/GameOverScene.ts`:

```typescript
import Phaser from 'phaser';
import { GameState } from '../systems/GameState';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 3, 'GAME OVER', {
      fontSize: '56px',
      color: '#cc0000',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 50, 'Press ENTER to retry', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.input.keyboard!.once('keydown-ENTER', () => {
      GameState.getInstance().reset();
      this.scene.start('Level1');
      this.scene.launch('HUD');
    });
  }
}
```

**Step 3: Handle player death in Level1Scene**

In `Level1Scene.create()`:
```typescript
this.events.on('player-died', () => {
  this.scene.stop('HUD');
  this.scene.start('GameOver');
});
```

**Step 4: Register all scenes in main.ts**

```typescript
import { VictoryScene } from './scenes/VictoryScene';
import { GameOverScene } from './scenes/GameOverScene';

// scene array:
scene: [PreloadScene, MainMenuScene, Level1Scene, HUDScene, VictoryScene, GameOverScene],
```

**Step 5: Run and verify**

Run: `npm run dev`
Expected: Die → Game Over screen with retry. Beat boss, collect key → Victory screen. Both return to appropriate places on Enter.

**Step 6: Commit**

```bash
git add .
git commit -m "feat: victory and game over scenes with retry flow"
```

---

## Task 10: Sound Effects ✅

**Files:**
- Modify: `src/scenes/PreloadScene.ts` — generate placeholder sounds or load audio
- Modify: `src/entities/Player.ts` — sword swing sound
- Modify: `src/scenes/Level1Scene.ts` — hit/kill/coin sounds

**Step 1: Add sound generation to PreloadScene**

Phaser can't generate audio procedurally easily, so we'll create a simple sound manager that plays nothing initially but is wired up. We'll add actual audio files from free sound packs later.

Create `src/systems/SoundManager.ts`:

```typescript
import Phaser from 'phaser';

export class SoundManager {
  private scene: Phaser.Scene;
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private enabled = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Try to play a sound. If the audio hasn't been loaded, silently skip.
   * This lets us wire up all sound calls now and add actual files later.
   */
  play(key: string, config?: Phaser.Types.Sound.SoundConfig) {
    if (!this.enabled) return;
    try {
      if (this.scene.cache.audio.exists(key)) {
        this.scene.sound.play(key, config);
      }
    } catch {
      // Audio not loaded yet — silent skip
    }
  }
}
```

**Step 2: Wire sound calls into combat and coins**

In Level1Scene, create a SoundManager instance and call:
- `this.soundManager.play('sword-swing')` when player attacks
- `this.soundManager.play('splat')` when zombie is hit
- `this.soundManager.play('coin-pickup')` when coin collected
- `this.soundManager.play('zombie-groan')` randomly from zombies

**Step 3: Run and verify**

Run: `npm run dev`
Expected: No errors. No sounds play yet (no audio files loaded), but all call sites are wired up. Adding audio files later will activate them.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: sound manager with all combat/pickup sound hooks"
```

---

## Task 11: Polish & Playtest ✅

**Files:**
- Modify: various files for balance tweaks

**Step 1: Review and adjust game balance**

Check and tune these values:
- Player move speed, jump force
- Zombie health, speed, aggro range, damage
- Boss health, charge speed, damage
- Sword damage, cooldown, hitbox size
- Contact damage cooldown
- Coin value per zombie kill
- Health bar sizes and positions

**Step 2: Add debug toggle**

In `main.ts`, set `arcade.debug: false` for release, `true` for dev.

Add keyboard shortcut to toggle debug in Level1Scene:
```typescript
this.input.keyboard!.addKey('D').on('down', () => {
  this.physics.world.drawDebug = !this.physics.world.drawDebug;
  if (!this.physics.world.drawDebug) {
    this.physics.world.debugGraphic.clear();
  }
});
```

**Step 3: Run full playthrough**

Run: `npm run dev`
Play through: Menu → Level 1 → Kill zombies → Collect coins → Reach boss → Boss rises from throne → Fight boss → Collect key → Victory screen.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: balance tuning and debug toggle for Level 1"
```

---

## Task 12: CLAUDE.md & Documentation ✅

**Files:**
- Create: `CLAUDE.md`
- Create: `.gitignore`

**Step 1: Create .gitignore**

```
node_modules/
dist/
.DS_Store
```

**Step 2: Create CLAUDE.md**

See design doc for details. Include: build commands, architecture overview, file structure conventions, how scenes/entities/systems relate.

**Step 3: Commit**

```bash
git add .
git commit -m "docs: add CLAUDE.md and .gitignore"
```

---

## Summary

| Task | What it builds |
|------|---------------|
| 0 | Project scaffold (Phaser + TS + Vite) |
| 1 | Placeholder assets (colored shapes) |
| 2 | Main menu scene |
| 3 | Player movement & jumping |
| 4 | Sword combat system |
| 5 | Zombie enemies with AI |
| 6 | Splatter particle effects |
| 7 | HUD, health, coins, game state |
| 8 | Boss throne encounter |
| 9 | Victory & game over screens |
| 10 | Sound system (wired up, files later) |
| 11 | Polish & balance |
| 12 | CLAUDE.md & docs |
