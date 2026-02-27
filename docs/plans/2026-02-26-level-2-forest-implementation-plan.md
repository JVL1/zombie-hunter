# Level 2 — Broken Down Forest Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Level 2 (Broken Down Forest) with 4 new enemy types, 4 new gameplay systems, a Crab-Spider Zombie boss fight, and wire it into the game's scene flow.

**Architecture:** Follows the existing three-layer pattern (scenes/entities/systems). New enemies extend `Phaser.Physics.Arcade.Sprite` and implement `Damageable`. New systems are standalone modules. Level2Scene follows Level1Scene's exact structure. VictoryScene and GameOverScene become level-aware via `GameState.currentLevel`.

**Tech Stack:** Phaser 3 (TypeScript), Vite dev server

**Design doc:** `docs/plans/2026-02-26-level-2-forest-design.md`

**No tests configured** — verification is `npm run dev` + visual check in browser. Commit after each task.

---

## Batch 1: Foundation (Assets, GameState, Systems)

### Task 1: Add Level 2 asset keys and placeholder textures

**Files:**
- Modify: `src/assets.ts`
- Modify: `src/scenes/PreloadScene.ts`

**Step 1: Add forest asset keys to `src/assets.ts`**

After the `PLATFORM_TILE` entry (line 54), add:

```typescript
  // --- Level 2: Forest ---
  // Enemy sprites (placeholder — single colored rectangles for now)
  ZOMBIE_DEER: 'zombie-deer',
  ZOMBIE_WOLF: 'zombie-wolf',
  PLANT_ZOMBIE: 'plant-zombie',
  SPIDER_HYBRID: 'spider-hybrid',
  CRAB_SPIDER_BOSS: 'crab-spider-boss',

  // Forest environment
  FOREST_GROUND_TILE: 'forest-ground-tile',
  FOREST_PLATFORM_TILE: 'forest-platform-tile',
  FOREST_BG_1: 'forest-bg-1',
  FOREST_BG_2: 'forest-bg-2',
  FOREST_BG_3: 'forest-bg-3',
  FOREST_BG_4: 'forest-bg-4',

  // Boss arena
  COCOON: 'cocoon',
  WEB_DECORATION: 'web-decoration',
  LAVA_CRACK: 'lava-crack',
  LASER_BEAM: 'laser-beam',
  SHOCKWAVE: 'shockwave',
  POISON_CLOUD: 'poison-cloud',
```

**Step 2: Generate placeholder textures in `src/scenes/PreloadScene.ts`**

After the existing `generatePlaceholder` calls (after line 185), add:

```typescript
    // --- Level 2 placeholders ---
    // Enemies (colored rectangles matching their theme)
    this.generatePlaceholder('zombie-deer', 0x8B6914, 48, 40);     // brown
    this.generatePlaceholder('zombie-wolf', 0x555555, 52, 36);     // dark gray
    this.generatePlaceholder('plant-zombie', 0x2E7D32, 40, 64);    // green
    this.generatePlaceholder('spider-hybrid', 0x6A0DAD, 44, 36);   // purple
    this.generatePlaceholder('crab-spider-boss', 0x8B0000, 96, 80); // dark red

    // Forest tiles
    this.generatePlaceholder('forest-ground-tile', 0x3E2723, 32, 32); // dark brown
    this.generatePlaceholder('forest-platform-tile', 0x5D4037, 32, 32); // lighter brown

    // Forest backgrounds (full-screen colored panels with slight transparency)
    this.generatePlaceholder('forest-bg-1', 0x1B3A1B, 800, 600, 'rect', 0.9); // dark green
    this.generatePlaceholder('forest-bg-2', 0x2D4A2D, 800, 600, 'rect', 0.5); // fog
    this.generatePlaceholder('forest-bg-3', 0x1A331A, 800, 600, 'rect', 0.3); // brambles
    this.generatePlaceholder('forest-bg-4', 0x0D1F0D, 800, 600, 'rect', 0.2); // haze

    // Boss arena elements
    this.generatePlaceholder('cocoon', 0xD4C5A9, 60, 80);         // tan silk
    this.generatePlaceholder('web-decoration', 0xEEEEEE, 48, 48, 'rect', 0.4); // white web
    this.generatePlaceholder('lava-crack', 0xFF4500, 64, 16);     // orange-red
    this.generatePlaceholder('laser-beam', 0xFF0000, 800, 8);     // red beam
    this.generatePlaceholder('shockwave', 0xBDB76B, 40, 12);      // khaki dust wave
    this.generatePlaceholder('poison-cloud', 0x00FF00, 48, 48, 'circle', 0.4); // green cloud
```

**Step 3: Verify**

Run: `npm run dev`
Expected: Game loads without errors. No visual changes (Level 2 not wired up yet).

**Step 4: Commit**

```bash
git add src/assets.ts src/scenes/PreloadScene.ts
git commit -m "feat: add Level 2 forest asset keys and placeholder textures"
```

---

### Task 2: Make GameState and scenes level-aware

**Files:**
- Modify: `src/systems/GameState.ts`
- Modify: `src/scenes/VictoryScene.ts`
- Modify: `src/scenes/GameOverScene.ts`

**Step 1: Add `currentLevel` to GameState**

In `src/systems/GameState.ts`, add a `currentLevel` field:

```typescript
export class GameState {
  private static instance: GameState;

  health = 100;
  maxHealth = 100;
  coins = 0;
  keys: boolean[] = [false, false, false, false, false];
  currentSword = 'Rusty Blade';
  swordDamage = 10;
  currentLevel = 1;  // <-- ADD THIS

  // ... getInstance() stays the same ...

  reset() {
    this.health = 100;
    this.coins = 0;
    this.keys = [false, false, false, false, false];
    this.currentSword = 'Rusty Blade';
    this.swordDamage = 10;
    this.currentLevel = 1;  // <-- ADD THIS
  }
```

**Step 2: Make VictoryScene level-aware**

Replace the `create()` method in `src/scenes/VictoryScene.ts`:

```typescript
  create() {
    const { width, height } = this.scale;
    const gs = GameState.getInstance();
    const level = gs.currentLevel;

    this.add.text(width / 2, height / 3, 'LEVEL COMPLETE!', {
      fontSize: '48px',
      color: '#ffd700',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, `Key #${level} Collected!`, {
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
      const nextLevel = level + 1;
      if (nextLevel <= 2) {
        gs.currentLevel = nextLevel;
        this.scene.start(`Level${nextLevel}`);
        this.scene.launch('HUD');
      } else {
        this.scene.start('MainMenu');
      }
    });
  }
```

Add the import at the top: `import { GameState } from '../systems/GameState';`

**Step 3: Make GameOverScene level-aware**

In `src/scenes/GameOverScene.ts`, change the ENTER handler to restart the current level:

```typescript
    this.input.keyboard!.once('keydown-ENTER', () => {
      const level = GameState.getInstance().currentLevel;
      GameState.getInstance().reset();
      GameState.getInstance().currentLevel = level; // preserve level after reset
      this.scene.start(`Level${level}`);
      this.scene.launch('HUD');
    });
```

**Step 4: Verify**

Run: `npm run dev`
Expected: Level 1 still plays normally. Victory screen shows "Key #1 Collected!" and ENTER now goes to `Level2` (which doesn't exist yet, so it may error — that's fine, we'll add it).

**Step 5: Commit**

```bash
git add src/systems/GameState.ts src/scenes/VictoryScene.ts src/scenes/GameOverScene.ts
git commit -m "feat: make GameState and scenes level-aware for multi-level flow"
```

---

### Task 3: PoisonCloud system

**Files:**
- Create: `src/systems/PoisonCloud.ts`

**Step 1: Create `src/systems/PoisonCloud.ts`**

```typescript
import Phaser from 'phaser';

/**
 * Spawns a poison cloud at a position. Deals tick damage to the player if
 * they overlap it. Fades out and self-destructs after `duration` ms.
 */
export function spawnPoisonCloud(
  scene: Phaser.Scene,
  x: number,
  y: number,
  player: Phaser.Physics.Arcade.Sprite,
  tickDamage: number = 5,
  duration: number = 1000
) {
  const cloud = scene.add.sprite(x, y, 'poison-cloud');
  cloud.setAlpha(0.6);
  scene.physics.add.existing(cloud, true); // static body

  let lastTick = 0;
  const overlap = scene.physics.add.overlap(player, cloud, () => {
    const now = scene.time.now;
    if (now - lastTick > 500) {
      lastTick = now;
      // Emit damage event — the level scene handles player.takeDamage
      scene.events.emit('poison-damage', tickDamage);
    }
  });

  // Fade out and destroy
  scene.tweens.add({
    targets: cloud,
    alpha: 0,
    duration,
    onComplete: () => {
      overlap.destroy();
      cloud.destroy();
    },
  });
}
```

**Step 2: Verify**

Run: `npm run dev`
Expected: No errors. PoisonCloud not used yet.

**Step 3: Commit**

```bash
git add src/systems/PoisonCloud.ts
git commit -m "feat: add PoisonCloud system for area damage on plant zombie death"
```

---

### Task 4: LaserAttack system

**Files:**
- Create: `src/systems/LaserAttack.ts`

**Step 1: Create `src/systems/LaserAttack.ts`**

This system creates a laser beam that:
1. Shows a charge-up glow at the source position for `chargeTime` ms
2. Fires a beam sprite across the screen
3. Damages the player on contact
4. Self-destructs after the beam finishes

```typescript
import Phaser from 'phaser';

export interface LaserConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  direction: number;        // -1 (left) or 1 (right)
  player: Phaser.Physics.Arcade.Sprite;
  damage: number;
  chargeTime?: number;      // ms for charge-up glow (0 = instant shot)
  beamSpeed?: number;       // pixels/sec
  onChargeStart?: () => void;
  onFire?: () => void;
}

export function fireLaser(config: LaserConfig) {
  const {
    scene, x, y, direction, player, damage,
    chargeTime = 1500, beamSpeed = 600,
    onChargeStart, onFire,
  } = config;

  // Charge-up: red glowing circle at source
  const chargeGlow = scene.add.circle(x, y, 12, 0xff0000, 0.8);
  chargeGlow.setDepth(10);
  onChargeStart?.();

  // Pulse the glow during charge
  scene.tweens.add({
    targets: chargeGlow,
    scaleX: 1.5,
    scaleY: 1.5,
    alpha: 1,
    yoyo: true,
    repeat: Math.floor(chargeTime / 200),
    duration: 100,
  });

  scene.time.delayedCall(chargeTime, () => {
    chargeGlow.destroy();
    onFire?.();

    // Fire the beam
    const beam = scene.physics.add.sprite(x, y, 'laser-beam');
    beam.setDepth(10);
    (beam.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    beam.setVelocityX(direction * beamSpeed);

    // Damage on contact
    const overlap = scene.physics.add.overlap(player, beam, () => {
      scene.events.emit('laser-damage', damage);
      overlap.destroy();
    });

    // Destroy after 2 seconds (off-screen)
    scene.time.delayedCall(2000, () => {
      overlap.destroy();
      beam.destroy();
    });
  });
}
```

**Step 2: Verify**

Run: `npm run dev`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/systems/LaserAttack.ts
git commit -m "feat: add LaserAttack system with charge-up glow and beam projectile"
```

---

### Task 5: Shockwave system

**Files:**
- Create: `src/systems/Shockwave.ts`

**Step 1: Create `src/systems/Shockwave.ts`**

```typescript
import Phaser from 'phaser';

/**
 * Spawns a ground-level shockwave that travels horizontally.
 * Player must jump to avoid it.
 */
export function spawnShockwave(
  scene: Phaser.Scene,
  x: number,
  y: number,
  player: Phaser.Physics.Arcade.Sprite,
  damage: number = 10,
  speed: number = 300
) {
  // Two waves — one going left, one going right
  for (const direction of [-1, 1]) {
    const wave = scene.physics.add.sprite(x, y, 'shockwave');
    wave.setDepth(5);
    (wave.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    wave.setVelocityX(direction * speed);

    // Dust particles trailing the wave
    scene.add.particles(x, y, 'dust', {
      follow: wave,
      speed: { min: 20, max: 60 },
      angle: { min: 240, max: 300 },
      scale: { start: 1, end: 0 },
      lifespan: 400,
      quantity: 1,
      frequency: 50,
      gravityY: 100,
    });

    // Damage on contact
    const overlap = scene.physics.add.overlap(player, wave, () => {
      scene.events.emit('shockwave-damage', damage);
      overlap.destroy();
    });

    // Destroy after 1.5 seconds
    scene.time.delayedCall(1500, () => {
      overlap.destroy();
      wave.destroy();
    });
  }
}
```

**Step 2: Verify**

Run: `npm run dev`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/systems/Shockwave.ts
git commit -m "feat: add Shockwave system for boss stomp attack"
```

---

### Task 6: CrackingGround system

**Files:**
- Create: `src/systems/CrackingGround.ts`

**Step 1: Create `src/systems/CrackingGround.ts`**

```typescript
import Phaser from 'phaser';

interface Crack {
  sprite: Phaser.GameObjects.Sprite;
  overlap: Phaser.Physics.Arcade.Collider;
  createdAt: number;
}

/**
 * Manages destructible floor sections in the boss arena.
 * Cracks reveal lava below — instant death on contact.
 * Max active cracks at once; oldest seals when a new one forms.
 */
export class CrackingGround {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private cracks: Crack[] = [];
  private maxCracks: number;
  private groundY: number;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    groundY: number,
    maxCracks: number = 4
  ) {
    this.scene = scene;
    this.player = player;
    this.groundY = groundY;
    this.maxCracks = maxCracks;
  }

  /**
   * Open a crack at the given x position.
   * If at max capacity, seals the oldest crack first.
   */
  openCrack(x: number) {
    // Seal oldest if at capacity
    if (this.cracks.length >= this.maxCracks) {
      this.sealOldest();
    }

    const crackSprite = this.scene.add.sprite(x, this.groundY, 'lava-crack');
    crackSprite.setDepth(2);
    this.scene.physics.add.existing(crackSprite, true); // static

    // Lava glow pulse
    this.scene.tweens.add({
      targets: crackSprite,
      alpha: { from: 0.7, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 300,
    });

    // Instant death on contact
    const overlap = this.scene.physics.add.overlap(this.player, crackSprite, () => {
      this.scene.events.emit('lava-death');
    });

    this.cracks.push({
      sprite: crackSprite,
      overlap,
      createdAt: this.scene.time.now,
    });
  }

  private sealOldest() {
    const oldest = this.cracks.shift();
    if (!oldest) return;

    oldest.overlap.destroy();
    this.scene.tweens.add({
      targets: oldest.sprite,
      alpha: 0,
      scaleY: 0,
      duration: 300,
      onComplete: () => oldest.sprite.destroy(),
    });
  }

  /** Seal all cracks (called on boss defeat). */
  sealAll() {
    while (this.cracks.length > 0) {
      this.sealOldest();
    }
  }

  destroy() {
    for (const crack of this.cracks) {
      crack.overlap.destroy();
      crack.sprite.destroy();
    }
    this.cracks = [];
  }
}
```

**Step 2: Verify**

Run: `npm run dev`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/systems/CrackingGround.ts
git commit -m "feat: add CrackingGround system for boss arena lava hazards"
```

---

## Batch 2: Enemy Entities

### Task 7: ZombieDeer entity

**Files:**
- Create: `src/entities/ZombieDeer.ts`

**Step 1: Create `src/entities/ZombieDeer.ts`**

Zombie deer charge at the player on sight. Fast movement, 25 HP, simple AI.

```typescript
import Phaser from 'phaser';
import { Damageable, flashSprite, knockback } from '../systems/Combat';

export class ZombieDeer extends Phaser.Physics.Arcade.Sprite implements Damageable {
  health: number;
  maxHealth: number;
  private damage = 10;
  private speed = 120;
  private chargeSpeed = 220;
  private aggroRange = 250;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private dying = false;
  private patrolDirection = 1;
  private patrolTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, health: number = 25) {
    super(scene, x, y, 'zombie-deer', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHealth = health;
    this.health = health;

    this.setCollideWorldBounds(true);
    this.setBounce(0.1);
    this.body!.setSize(40, 32);
    this.body!.setOffset(4, 4);
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
    knockback(
      this.body as Phaser.Physics.Arcade.Body,
      this.target?.x ?? this.x - 1,
      150
    );
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  die() {
    if (this.dying) return;
    this.dying = true;
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setTint(0x666666);
    this.scene.time.delayedCall(300, () => this.destroy());
  }

  update(time: number, delta: number) {
    if (this.isDead() || this.dying) return;

    if (!this.target) {
      this.patrol(delta);
      return;
    }

    const dist = Phaser.Math.Distance.BetweenPoints(this, this.target);

    if (dist < this.aggroRange) {
      // Charge at player
      const direction = this.target.x < this.x ? -1 : 1;
      this.setVelocityX(direction * this.chargeSpeed);
      this.setFlipX(direction < 0);
    } else {
      this.patrol(delta);
    }
  }

  private patrol(delta: number) {
    this.patrolTimer += delta;
    if (this.patrolTimer >= 2000) {
      this.patrolDirection *= -1;
      this.patrolTimer = 0;
    }
    this.setVelocityX(this.patrolDirection * this.speed);
    this.setFlipX(this.patrolDirection < 0);
  }
}
```

**Step 2: Verify**

Run: `npm run dev`
Expected: No errors. ZombieDeer not spawned yet.

**Step 3: Commit**

```bash
git add src/entities/ZombieDeer.ts
git commit -m "feat: add ZombieDeer entity with charge attack AI"
```

---

### Task 8: ZombieWolf entity

**Files:**
- Create: `src/entities/ZombieWolf.ts`

**Step 1: Create `src/entities/ZombieWolf.ts`**

Zombie wolves pounce at the player from a distance. 35 HP.

```typescript
import Phaser from 'phaser';
import { Damageable, flashSprite, knockback } from '../systems/Combat';

export class ZombieWolf extends Phaser.Physics.Arcade.Sprite implements Damageable {
  health: number;
  maxHealth: number;
  private damage = 15;
  private speed = 100;
  private aggroRange = 220;
  private pounceRange = 150;
  private pounceCooldown = 2000;
  private lastPounceTime = 0;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private dying = false;
  private patrolDirection = 1;
  private patrolTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, health: number = 35) {
    super(scene, x, y, 'zombie-wolf', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHealth = health;
    this.health = health;

    this.setCollideWorldBounds(true);
    this.setBounce(0.1);
    this.body!.setSize(44, 28);
    this.body!.setOffset(4, 4);
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
    knockback(
      this.body as Phaser.Physics.Arcade.Body,
      this.target?.x ?? this.x - 1,
      150
    );
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  die() {
    if (this.dying) return;
    this.dying = true;
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setTint(0x666666);
    this.scene.time.delayedCall(300, () => this.destroy());
  }

  update(time: number, delta: number) {
    if (this.isDead() || this.dying) return;

    if (!this.target) {
      this.patrol(delta);
      return;
    }

    const dist = Phaser.Math.Distance.BetweenPoints(this, this.target);

    if (dist < this.aggroRange) {
      const direction = this.target.x < this.x ? -1 : 1;

      if (dist < this.pounceRange && this.body!.blocked.down && time - this.lastPounceTime > this.pounceCooldown) {
        // Pounce: leap toward player
        this.lastPounceTime = time;
        this.setVelocityX(direction * 300);
        this.setVelocityY(-250);
      } else {
        // Stalk toward player
        this.setVelocityX(direction * this.speed);
      }
      this.setFlipX(direction < 0);
    } else {
      this.patrol(delta);
    }
  }

  private patrol(delta: number) {
    this.patrolTimer += delta;
    if (this.patrolTimer >= 2500) {
      this.patrolDirection *= -1;
      this.patrolTimer = 0;
    }
    this.setVelocityX(this.patrolDirection * this.speed * 0.6);
    this.setFlipX(this.patrolDirection < 0);
  }
}
```

**Step 2: Verify**

Run: `npm run dev`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/entities/ZombieWolf.ts
git commit -m "feat: add ZombieWolf entity with pounce attack AI"
```

---

### Task 9: PlantZombie entity

**Files:**
- Create: `src/entities/PlantZombie.ts`

**Step 1: Create `src/entities/PlantZombie.ts`**

Slow, tanky mutated plant zombie (70 HP). Spawns a poison cloud on death.

```typescript
import Phaser from 'phaser';
import { Damageable, flashSprite, knockback } from '../systems/Combat';

export class PlantZombie extends Phaser.Physics.Arcade.Sprite implements Damageable {
  health: number;
  maxHealth: number;
  private damage = 10;
  private speed = 30; // 0.5x normal zombie speed
  private aggroRange = 180;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private dying = false;
  private patrolDirection = 1;
  private patrolTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, health: number = 70) {
    super(scene, x, y, 'plant-zombie', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHealth = health;
    this.health = health;

    this.setCollideWorldBounds(true);
    this.setBounce(0.1);
    this.body!.setSize(32, 56);
    this.body!.setOffset(4, 4);
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
    knockback(
      this.body as Phaser.Physics.Arcade.Body,
      this.target?.x ?? this.x - 1,
      80 // slow knockback — they're tanky
    );
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  /** Returns true — signals Level2Scene to spawn a poison cloud at death position. */
  shouldSpawnPoisonCloud(): boolean {
    return true;
  }

  die() {
    if (this.dying) return;
    this.dying = true;
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setTint(0x333333);
    this.scene.time.delayedCall(300, () => this.destroy());
  }

  update(_time: number, delta: number) {
    if (this.isDead() || this.dying) return;

    if (!this.target) {
      this.patrol(delta);
      return;
    }

    const dist = Phaser.Math.Distance.BetweenPoints(this, this.target);

    if (dist < this.aggroRange) {
      const direction = this.target.x < this.x ? -1 : 1;
      this.setVelocityX(direction * this.speed);
      this.setFlipX(direction < 0);
    } else {
      this.patrol(delta);
    }
  }

  private patrol(delta: number) {
    this.patrolTimer += delta;
    if (this.patrolTimer >= 3000) {
      this.patrolDirection *= -1;
      this.patrolTimer = 0;
    }
    this.setVelocityX(this.patrolDirection * this.speed);
    this.setFlipX(this.patrolDirection < 0);
  }
}
```

**Step 2: Verify**

Run: `npm run dev`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/entities/PlantZombie.ts
git commit -m "feat: add PlantZombie entity — slow tanky enemy with poison cloud on death"
```

---

### Task 10: SpiderHybrid entity

**Files:**
- Create: `src/entities/SpiderHybrid.ts`

**Step 1: Create `src/entities/SpiderHybrid.ts`**

Mini-boss foreshadowing enemy. Skitters sideways, shoots a quick laser bolt (no charge-up). 40 HP.

```typescript
import Phaser from 'phaser';
import { Damageable, flashSprite, knockback } from '../systems/Combat';
import { fireLaser } from '../systems/LaserAttack';

export class SpiderHybrid extends Phaser.Physics.Arcade.Sprite implements Damageable {
  health: number;
  maxHealth: number;
  private damage = 10;
  private speed = 90;
  private aggroRange = 250;
  private laserCooldown = 3000;
  private lastLaserTime = 0;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private dying = false;
  private skitterDirection = 1;
  private skitterTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, health: number = 40) {
    super(scene, x, y, 'spider-hybrid', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHealth = health;
    this.health = health;

    this.setCollideWorldBounds(true);
    this.setBounce(0.1);
    this.body!.setSize(36, 28);
    this.body!.setOffset(4, 4);
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
    knockback(
      this.body as Phaser.Physics.Arcade.Body,
      this.target?.x ?? this.x - 1,
      120
    );
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  die() {
    if (this.dying) return;
    this.dying = true;
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setTint(0x666666);
    this.scene.time.delayedCall(300, () => this.destroy());
  }

  update(time: number, delta: number) {
    if (this.isDead() || this.dying) return;

    if (!this.target) {
      this.skitter(delta);
      return;
    }

    const dist = Phaser.Math.Distance.BetweenPoints(this, this.target);

    if (dist < this.aggroRange) {
      // Skitter sideways (crab-like)
      this.skitter(delta);

      // Fire quick laser bolt (no charge-up)
      if (time - this.lastLaserTime > this.laserCooldown) {
        this.lastLaserTime = time;
        const direction = this.target.x < this.x ? -1 : 1;
        fireLaser({
          scene: this.scene,
          x: this.x,
          y: this.y,
          direction,
          player: this.target,
          damage: 8,
          chargeTime: 0, // instant shot — no charge for hybrids
          beamSpeed: 400,
        });
      }
    } else {
      this.skitter(delta);
    }
  }

  private skitter(delta: number) {
    this.skitterTimer += delta;
    if (this.skitterTimer >= 800) {
      this.skitterDirection *= -1;
      this.skitterTimer = 0;
    }
    this.setVelocityX(this.skitterDirection * this.speed);
    this.setFlipX(this.skitterDirection < 0);
  }
}
```

**Step 2: Verify**

Run: `npm run dev`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/entities/SpiderHybrid.ts
git commit -m "feat: add SpiderHybrid entity — sideways skitter with quick laser bolt"
```

---

## Batch 3: Boss Entity

### Task 11: CrabSpiderBoss entity

**Files:**
- Create: `src/entities/CrabSpiderBoss.ts`

**Step 1: Create `src/entities/CrabSpiderBoss.ts`**

Full boss with state machine: IN_COCOON → EMERGING → FIGHTING → DEAD. Attacks: laser eyes (1.5s charge), leg stomp shockwave, ground crack on stomp.

```typescript
import Phaser from 'phaser';
import { Damageable, flashSprite, knockback } from '../systems/Combat';
import { fireLaser } from '../systems/LaserAttack';
import { spawnShockwave } from '../systems/Shockwave';
import { CrackingGround } from '../systems/CrackingGround';

export enum CrabSpiderState {
  IN_COCOON,
  EMERGING,
  FIGHTING,
  DEAD,
}

export class CrabSpiderBoss extends Phaser.Physics.Arcade.Sprite implements Damageable {
  health: number;
  maxHealth: number;
  private damage = 15; // contact damage
  private speed = 80;
  private bossState = CrabSpiderState.IN_COCOON;
  private target: Phaser.Physics.Arcade.Sprite | null = null;
  private attackTimer = 0;
  private attackInterval = 3500; // 3-4 seconds between attacks
  private skitterDirection = 1;
  private skitterTimer = 0;
  private cocoon: Phaser.GameObjects.Sprite | null = null;
  private crackingGround: CrackingGround | null = null;
  private groundY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    groundY: number,
    health: number = 250
  ) {
    super(scene, x, y, 'crab-spider-boss', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHealth = health;
    this.health = health;
    this.groundY = groundY;

    this.setScale(1);
    this.setCollideWorldBounds(true);
    this.setBounce(0.1);

    // Start immobile in cocoon
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setImmovable(true);
    this.setVisible(false); // hidden inside cocoon

    // Create cocoon sprite
    this.cocoon = scene.add.sprite(x, y, 'cocoon');
    this.cocoon.setDepth(1);
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite) {
    this.target = target;
  }

  setCrackingGround(cg: CrackingGround) {
    this.crackingGround = cg;
  }

  getState(): CrabSpiderState {
    return this.bossState;
  }

  getDamage(): number {
    return this.damage;
  }

  /** Called by Level2Scene to start the boss emergence cinematic. */
  triggerEmerge() {
    if (this.bossState !== CrabSpiderState.IN_COCOON) return;
    this.bossState = CrabSpiderState.EMERGING;

    // Cocoon pulses
    this.scene.tweens.add({
      targets: this.cocoon,
      scaleX: 1.2,
      scaleY: 1.2,
      yoyo: true,
      repeat: 2,
      duration: 200,
      onComplete: () => {
        // Cocoon bursts
        if (this.cocoon) {
          // Silk strand particles
          this.scene.add.particles(this.cocoon.x, this.cocoon.y, 'web-decoration', {
            speed: { min: 100, max: 250 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            lifespan: 600,
            quantity: 15,
            emitting: false,
          }).explode();

          this.cocoon.destroy();
          this.cocoon = null;
        }

        // Boss appears
        this.setVisible(true);
        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        this.setImmovable(false);

        // Short landing delay then fight
        this.scene.time.delayedCall(500, () => {
          this.bossState = CrabSpiderState.FIGHTING;
        });
      },
    });
  }

  takeDamage(amount: number) {
    if (this.bossState !== CrabSpiderState.FIGHTING) return;

    this.health -= amount;
    flashSprite(this.scene, this);
    knockback(
      this.body as Phaser.Physics.Arcade.Body,
      this.target?.x ?? this.x - 1,
      80
    );
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  update(time: number, delta: number) {
    if (this.bossState !== CrabSpiderState.FIGHTING || !this.target) return;

    // Speed increase below 50% HP
    const enraged = this.health < this.maxHealth * 0.5;
    const currentSpeed = enraged ? this.speed * 1.5 : this.speed;
    const currentInterval = enraged ? 2500 : this.attackInterval;

    // Skitter sideways (crab movement)
    this.skitterTimer += delta;
    if (this.skitterTimer >= 600) {
      this.skitterDirection *= -1;
      this.skitterTimer = 0;
    }

    // Bias skitter toward player
    const playerDir = this.target.x < this.x ? -1 : 1;
    const moveX = this.skitterDirection * currentSpeed * 0.5 + playerDir * currentSpeed * 0.5;
    this.setVelocityX(moveX);
    this.setFlipX(playerDir < 0);

    // Attack timer
    this.attackTimer += delta;
    if (this.attackTimer >= currentInterval) {
      this.attackTimer = 0;

      // Randomly choose: laser (50%) or stomp (50%)
      if (Math.random() < 0.5) {
        this.attackLaser();
      } else {
        this.attackStomp();
      }
    }
  }

  private attackLaser() {
    if (!this.target) return;

    const direction = this.target.x < this.x ? -1 : 1;
    fireLaser({
      scene: this.scene,
      x: this.x + direction * 30,
      y: this.y - 10,
      direction,
      player: this.target,
      damage: 25,
      chargeTime: 1500,
      beamSpeed: 600,
      onChargeStart: () => {
        // Eyes glow red
        this.setTint(0xff3333);
      },
      onFire: () => {
        this.clearTint();
      },
    });
  }

  private attackStomp() {
    if (!this.target) return;

    spawnShockwave(this.scene, this.x, this.groundY, this.target, 10, 300);
    this.scene.cameras.main.shake(150, 0.008);

    // 30% chance to crack the ground
    if (Math.random() < 0.3 && this.crackingGround) {
      this.crackingGround.openCrack(this.x);
    }
  }

  /** Clean up cocoon if still exists. */
  destroyCocoon() {
    if (this.cocoon) {
      this.cocoon.destroy();
      this.cocoon = null;
    }
  }
}
```

**Step 2: Verify**

Run: `npm run dev`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/entities/CrabSpiderBoss.ts
git commit -m "feat: add CrabSpiderBoss entity with laser eyes, stomp, and ground crack attacks"
```

---

## Batch 4: Level Scene and Wiring

### Task 12: Level2Scene

**Files:**
- Create: `src/scenes/Level2Scene.ts`

**Step 1: Create `src/scenes/Level2Scene.ts`**

Follows Level1Scene's exact structure. 3200px wide forest level with 5 zones, 4 enemy types, and a boss encounter.

```typescript
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { ZombieDeer } from '../entities/ZombieDeer';
import { ZombieWolf } from '../entities/ZombieWolf';
import { PlantZombie } from '../entities/PlantZombie';
import { SpiderHybrid } from '../entities/SpiderHybrid';
import { CrabSpiderBoss, CrabSpiderState } from '../entities/CrabSpiderBoss';
import { createSplatter } from '../systems/Splatter';
import { spawnPoisonCloud } from '../systems/PoisonCloud';
import { CrackingGround } from '../systems/CrackingGround';
import { GameState } from '../systems/GameState';
import { SoundManager } from '../systems/SoundManager';
import { Damageable } from '../systems/Combat';

export class Level2Scene extends Phaser.Scene {
  private player!: Player;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.GameObjects.Group;
  private contactCooldown = new Map<Phaser.Physics.Arcade.Sprite, number>();
  private boss: CrabSpiderBoss | null = null;
  private bossTriggered = false;
  private bossHealthBar!: Phaser.GameObjects.Rectangle;
  private bossHealthBarBg!: Phaser.GameObjects.Rectangle;
  private bossNameText!: Phaser.GameObjects.Text;
  private lastBossHitTime = 0;
  private soundManager!: SoundManager;
  private bgLayers!: { sprite: Phaser.GameObjects.TileSprite; factor: number }[];
  private crackingGround: CrackingGround | null = null;
  private webDecorations: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super({ key: 'Level2' });
  }

  create() {
    this.soundManager = new SoundManager(this);

    // Reset per-scene state
    this.contactCooldown.clear();
    this.bossTriggered = false;
    this.boss = null;
    this.crackingGround = null;
    this.webDecorations = [];

    // World bounds — same 3200x600 as Level 1
    this.physics.world.setBounds(0, 0, 3200, 600);

    // --- Forest parallax backgrounds ---
    const bg1 = this.add.tileSprite(0, 0, 3200, 600, 'forest-bg-1').setOrigin(0, 0);
    bg1.setScrollFactor(0).setDepth(-4);
    const bg2 = this.add.tileSprite(0, 0, 3200, 600, 'forest-bg-2').setOrigin(0, 0);
    bg2.setScrollFactor(0).setDepth(-3);
    const bg3 = this.add.tileSprite(0, 0, 3200, 600, 'forest-bg-3').setOrigin(0, 0);
    bg3.setScrollFactor(0).setDepth(-2);
    const bg4 = this.add.tileSprite(0, 0, 3200, 600, 'forest-bg-4').setOrigin(0, 0);
    bg4.setScrollFactor(0).setDepth(-1);

    this.bgLayers = [
      { sprite: bg1, factor: 0.1 },
      { sprite: bg2, factor: 0.3 },
      { sprite: bg3, factor: 0.5 },
      { sprite: bg4, factor: 0.7 },
    ];

    // --- Forest ground ---
    this.ground = this.physics.add.staticGroup();
    for (let x = 0; x < 3200; x += 32) {
      this.ground.create(x + 16, 584, 'forest-ground-tile');
    }

    // --- Platforms per zone ---

    // Zone 1: Forest Edge (0-800) — sparse, easy
    this.createPlatform(200, 480, 3);
    this.createPlatform(500, 420, 4);
    this.createPlatform(700, 360, 3);

    // Zone 2: Tree Canopy (800-1600) — vertical platforming
    this.createPlatform(850, 480, 3);
    this.createPlatform(950, 400, 4);
    this.createPlatform(1050, 320, 3);
    this.createPlatform(1200, 380, 5);
    this.createPlatform(1400, 300, 3);
    this.createPlatform(1500, 420, 4);

    // Zone 3: Dense Undergrowth (1600-2200) — tight corridors
    this.createPlatform(1650, 460, 6);
    this.createPlatform(1800, 380, 4);
    this.createPlatform(2000, 440, 5);
    this.createPlatform(2100, 360, 3);

    // Zone 4: Spider Territory (2200-2800) — webs appear
    this.createPlatform(2300, 400, 4);
    this.createPlatform(2500, 340, 3);
    this.createPlatform(2650, 420, 4);

    // Add web decorations in Zone 4 (visual only)
    this.addWebDecorations();

    // --- Player ---
    this.player = new Player(this, 100, 500);
    this.physics.add.collider(this.player, this.ground);

    // Camera follows player
    this.cameras.main.setBounds(0, 0, 3200, 600);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Debug toggle
    this.input.keyboard!.addKey('D').on('down', () => {
      this.physics.world.drawDebug = !this.physics.world.drawDebug;
      if (!this.physics.world.drawDebug) {
        this.physics.world.debugGraphic.clear();
      }
    });

    // Launch HUD
    this.scene.launch('HUD');

    // --- Spawn enemies ---
    this.enemies = this.add.group();
    this.spawnEnemies();

    // Enemy-ground collision
    this.physics.add.collider(this.enemies, this.ground);

    // Player-enemy contact damage
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
      const e = enemy as Phaser.Physics.Arcade.Sprite;
      const now = this.time.now;
      const lastHit = this.contactCooldown.get(e) ?? 0;
      if (now - lastHit > 1000) {
        this.contactCooldown.set(e, now);
        const dmg = (e as unknown as { getDamage(): number }).getDamage();
        this.player.takeDamage(dmg);
      }
    }, undefined, this);

    // --- Sword combat (same pattern as Level1) ---
    this.events.on('player-attack', (hitbox: Phaser.GameObjects.Rectangle) => {
      this.soundManager.play('sword-swing');
      this.handleSwordHit(hitbox, GameState.getInstance().swordDamage);
    });

    this.events.on('player-slam', (hitbox: Phaser.GameObjects.Rectangle) => {
      this.soundManager.play('sword-swing');
      const slamDamage = Math.floor(GameState.getInstance().swordDamage * 1.5);
      this.handleSwordHit(hitbox, slamDamage, true);
    });

    this.events.on('player-died', () => {
      this.scene.stop('HUD');
      this.scene.start('GameOver');
    });

    // --- Damage events from systems ---
    this.events.on('poison-damage', (dmg: number) => {
      this.player.takeDamage(dmg);
    });
    this.events.on('laser-damage', (dmg: number) => {
      this.player.takeDamage(dmg);
    });
    this.events.on('shockwave-damage', (dmg: number) => {
      this.player.takeDamage(dmg);
    });
    this.events.on('lava-death', () => {
      this.player.takeDamage(9999); // instant death
    });

    // --- Create boss (hidden in cocoon) ---
    this.boss = new CrabSpiderBoss(this, 3000, 500, 568);
    this.boss.setTarget(this.player);
    this.physics.add.collider(this.boss, this.ground);

    // Boss contact damage
    this.physics.add.overlap(this.player, this.boss as Phaser.Physics.Arcade.Sprite, () => {
      if (!this.boss || this.boss.getState() !== CrabSpiderState.FIGHTING || this.boss.isDead()) return;
      const now = this.time.now;
      if (now - this.lastBossHitTime > 1000) {
        this.lastBossHitTime = now;
        this.player.takeDamage(this.boss.getDamage());
      }
    }, undefined, this);
  }

  update(time: number, delta: number) {
    this.player.update();

    // Update all enemies
    this.enemies.getChildren().forEach((e) => {
      const enemy = e as Phaser.Physics.Arcade.Sprite & { update(t: number, d: number): void };
      if (enemy.update) enemy.update(time, delta);
    });

    // Parallax scrolling
    const camX = this.cameras.main.scrollX;
    for (const layer of this.bgLayers) {
      layer.sprite.tilePositionX = camX * layer.factor;
    }

    // Boss trigger
    if (!this.bossTriggered && this.player.x > 2700) {
      this.bossTriggered = true;
      this.triggerBossEncounter();
    }

    // Boss update
    if (this.boss && !this.boss.isDead() && this.boss.getState() === CrabSpiderState.FIGHTING) {
      this.boss.update(time, delta);
    }

    // Boss health bar update
    if (this.bossHealthBar && this.boss && !this.boss.isDead()) {
      const pct = this.boss.health / this.boss.maxHealth;
      this.bossHealthBar.width = 300 * pct;
    }
  }

  // ---- Helpers ----

  private createPlatform(x: number, y: number, tileCount: number) {
    for (let i = 0; i < tileCount; i++) {
      this.ground.create(x + i * 32 + 16, y, 'forest-platform-tile');
    }
  }

  private addWebDecorations() {
    const webPositions = [
      { x: 2250, y: 300 }, { x: 2400, y: 250 }, { x: 2550, y: 280 },
      { x: 2700, y: 200 }, { x: 2850, y: 260 }, { x: 2950, y: 180 },
      { x: 3050, y: 300 }, { x: 3100, y: 220 },
    ];
    for (const pos of webPositions) {
      const web = this.add.sprite(pos.x, pos.y, 'web-decoration');
      web.setAlpha(0.5);
      web.setDepth(-1);
      this.webDecorations.push(web);
    }
  }

  private spawnEnemies() {
    // Zone 1: Forest Edge — zombie deer
    for (const x of [300, 550, 750]) {
      const deer = new ZombieDeer(this, x, 500);
      deer.setTarget(this.player);
      this.enemies.add(deer);
    }

    // Zone 2: Tree Canopy — zombie wolves
    for (const x of [900, 1100, 1350, 1550]) {
      const wolf = new ZombieWolf(this, x, 500);
      wolf.setTarget(this.player);
      this.enemies.add(wolf);
    }

    // Zone 3: Dense Undergrowth — plant zombies + wolves
    for (const x of [1700, 1900, 2050]) {
      const plant = new PlantZombie(this, x, 500);
      plant.setTarget(this.player);
      this.enemies.add(plant);
    }
    for (const x of [1800, 2100]) {
      const wolf = new ZombieWolf(this, x, 500);
      wolf.setTarget(this.player);
      this.enemies.add(wolf);
    }

    // Zone 4: Spider Territory — spider hybrids
    for (const x of [2350, 2550, 2700]) {
      const spider = new SpiderHybrid(this, x, 500);
      spider.setTarget(this.player);
      this.enemies.add(spider);
    }
  }

  private handleSwordHit(hitbox: Phaser.GameObjects.Rectangle, damage: number, isSlam: boolean = false) {
    // Hit enemies
    this.physics.add.overlap(hitbox, this.enemies, (_hitbox, enemy) => {
      const e = enemy as unknown as Damageable & Phaser.Physics.Arcade.Sprite & {
        die(): void;
        shouldSpawnPoisonCloud?: () => boolean;
      };
      if (!e.isDead()) {
        e.takeDamage(damage);
        this.soundManager.play('splat');
        if (isSlam) {
          this.cameras.main.shake(100, 0.005);
          this.player.pogoBounce();
        }

        if (e.isDead()) {
          this.onEnemyKilled(e);
        } else {
          createSplatter(this, { x: e.x, y: e.y, isKill: isSlam });
        }
      }
    });

    // Hit boss
    if (this.boss && this.boss.getState() === CrabSpiderState.FIGHTING && !this.boss.isDead()) {
      this.physics.add.overlap(hitbox, this.boss, () => {
        if (this.boss && !this.boss.isDead()) {
          this.boss.takeDamage(damage);
          if (isSlam) {
            this.cameras.main.shake(100, 0.005);
            this.player.pogoBounce();
          }
          if (this.boss.isDead()) {
            this.onBossDefeated();
          } else {
            createSplatter(this, { x: this.boss.x, y: this.boss.y, isKill: isSlam });
          }
        }
      });
    }
  }

  private onEnemyKilled(enemy: Damageable & Phaser.Physics.Arcade.Sprite & {
    die(): void;
    shouldSpawnPoisonCloud?: () => boolean;
  }) {
    this.soundManager.play('splat', { volume: 1.5 });
    createSplatter(this, { x: enemy.x, y: enemy.y, isKill: true });

    // Plant zombie: spawn poison cloud on death
    if (enemy.shouldSpawnPoisonCloud?.()) {
      spawnPoisonCloud(this, enemy.x, enemy.y, this.player);
    }

    // Drop coin
    const coin = this.physics.add.sprite(enemy.x, enemy.y - 20, 'coin');
    coin.setBounce(0.5);
    this.physics.add.collider(coin, this.ground);
    this.physics.add.overlap(this.player, coin, () => {
      this.soundManager.play('coin-pickup');
      GameState.getInstance().coins += 5;
      coin.destroy();
    });

    enemy.die();
  }

  private triggerBossEncounter() {
    if (!this.boss) return;

    // Stop camera follow, pan to boss area
    this.cameras.main.stopFollow();
    this.cameras.main.pan(3000, 300, 1000, 'Power2');

    this.time.delayedCall(1200, () => {
      if (!this.boss) return;

      // Boss emerges from cocoon
      this.boss.triggerEmerge();

      // Lock arena bounds
      this.physics.world.setBounds(2600, 0, 600, 600);
      this.cameras.main.setBounds(2600, 0, 600, 600);
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

      // Set up cracking ground for the arena
      this.crackingGround = new CrackingGround(this, this.player, 568, 4);
      this.boss!.setCrackingGround(this.crackingGround);

      // Show boss health bar after emergence delay
      this.time.delayedCall(1500, () => {
        this.showBossHealthBar();
      });
    });
  }

  private showBossHealthBar() {
    this.bossNameText = this.add.text(400, 50, 'CRAB-SPIDER ABOMINATION', {
      fontSize: '14px',
      color: '#ff0000',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.bossHealthBarBg = this.add.rectangle(400, 70, 304, 14, 0x333333)
      .setScrollFactor(0).setDepth(100);

    this.bossHealthBar = this.add.rectangle(400, 70, 300, 10, 0xff0000)
      .setScrollFactor(0).setDepth(101);
  }

  private onBossDefeated() {
    if (!this.boss) return;

    const bossX = this.boss.x;
    const bossY = this.boss.y;

    createSplatter(this, { x: bossX, y: bossY, isKill: true });

    // Boss death: legs curl, collapse
    this.boss.setTint(0x333333);
    this.tweens.add({
      targets: this.boss,
      scaleX: 0.8,
      scaleY: 0.5,
      angle: 90,
      duration: 600,
    });

    // Hide health bar
    if (this.bossHealthBar) this.bossHealthBar.destroy();
    if (this.bossHealthBarBg) this.bossHealthBarBg.destroy();
    if (this.bossNameText) this.bossNameText.destroy();

    // Dissolve web decorations
    for (const web of this.webDecorations) {
      this.tweens.add({
        targets: web,
        alpha: 0,
        duration: 1000,
        delay: Math.random() * 500,
        onComplete: () => web.destroy(),
      });
    }

    // Seal all lava cracks
    if (this.crackingGround) {
      this.crackingGround.sealAll();
    }

    // Destroy boss after animation
    this.time.delayedCall(800, () => {
      if (this.boss) {
        this.boss.destroy();
        this.boss = null;
      }

      // Drop Key #2
      const key = this.physics.add.sprite(bossX, bossY - 20, 'key');
      key.setBounce(0.5);
      this.physics.add.collider(key, this.ground);
      this.physics.add.overlap(this.player, key, () => {
        GameState.getInstance().collectKey(1); // Key index 1
        key.destroy();

        this.time.delayedCall(1500, () => {
          this.scene.stop('HUD');
          this.scene.start('Victory');
        });
      });
    });
  }
}
```

**Step 2: Verify**

Run: `npm run dev`
Expected: No errors. Level2Scene not registered yet.

**Step 3: Commit**

```bash
git add src/scenes/Level2Scene.ts
git commit -m "feat: add Level2Scene — Broken Down Forest with all enemy types and boss encounter"
```

---

### Task 13: Register Level2Scene and wire transitions

**Files:**
- Modify: `src/main.ts`

**Step 1: Register Level2Scene in `src/main.ts`**

Add the import at line 4 (after Level1Scene import):

```typescript
import { Level2Scene } from './scenes/Level2Scene';
```

Add `Level2Scene` to the scene array (line 21), after `Level1Scene`:

```typescript
  scene: [PreloadScene, MainMenuScene, Level1Scene, Level2Scene, HUDScene, VictoryScene, GameOverScene],
```

**Step 2: Set currentLevel in Level1Scene**

Add to the top of `Level1Scene.create()` (after `this.soundManager = new SoundManager(this);`):

```typescript
    GameState.getInstance().currentLevel = 1;
```

Also add the `GameState` import if not already there (it is — line 7).

**Step 3: Set currentLevel in Level2Scene**

Add to the top of `Level2Scene.create()` (after `this.soundManager = new SoundManager(this);`):

```typescript
    GameState.getInstance().currentLevel = 2;
```

(This is already imported in Level2Scene.)

**Step 4: Verify**

Run: `npm run dev`
Expected: Game loads. Play through Level 1, defeat the boss, collect Key #1, Victory screen says "Key #1 Collected!" and ENTER starts Level 2. Level 2 should load with forest ground, new enemy types, and the boss fight at the end.

**Step 5: Commit**

```bash
git add src/main.ts src/scenes/Level1Scene.ts src/scenes/Level2Scene.ts
git commit -m "feat: register Level2Scene and wire level transitions"
```

---

## Batch 5: Polish and Verification

### Task 14: Full playthrough verification

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Play through Level 1**
- Move right, kill zombies, reach boss at x>2700
- Defeat boss, collect Key #1
- Victory screen: "Key #1 Collected!"
- Press ENTER → Level 2 loads

**Step 3: Play through Level 2**
- Zone 1 (0-800): Zombie deer charge at you
- Zone 2 (800-1600): Zombie wolves pounce
- Zone 3 (1600-2200): Plant zombies (slow, green), poison clouds on death
- Zone 4 (2200-2800): Spider hybrids with laser bolts, web decorations visible
- Boss arena (2800-3200): Cocoon bursts, Crab-Spider Abomination fights
  - Laser eyes: red glow charge → beam
  - Leg stomp: shockwave + possible floor crack
  - Floor cracks: lava below, instant death
  - Below 50% HP: faster and more aggressive
- Defeat boss → webs dissolve, cracks seal, Key #2 drops
- Victory screen: "Key #2 Collected!" → returns to MainMenu

**Step 4: Test Game Over in Level 2**
- Die in Level 2 → Game Over screen
- Press ENTER → restarts Level 2 (not Level 1)

**Step 5: Fix any issues found during playthrough**

**Step 6: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: Level 2 playthrough fixes"
```

---

## Summary

| Batch | Tasks | What's Built |
|-------|-------|-------------|
| 1 | Tasks 1-6 | Asset keys, placeholders, GameState levels, PoisonCloud, LaserAttack, Shockwave, CrackingGround |
| 2 | Tasks 7-10 | ZombieDeer, ZombieWolf, PlantZombie, SpiderHybrid entities |
| 3 | Task 11 | CrabSpiderBoss entity |
| 4 | Tasks 12-13 | Level2Scene, scene registration, transitions |
| 5 | Task 14 | Full playthrough verification |

**Total: 14 tasks, ~13 commits**
