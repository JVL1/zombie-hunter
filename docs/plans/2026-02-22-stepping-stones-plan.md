# Stepping Stones & Downward Sword Slam — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add floating staircase platform clusters throughout Level 1, a new downward sword slam attack, and zombie jump-fail behavior when the player is above them.

**Architecture:** Three independent additions that wire together: (1) stepping stone platforms in Level1Scene using the existing `createPlatform()` pattern, (2) a new air-slam attack branch in `Player.attack()` with a downward hitbox, and (3) a `tryJump()` behavior in Zombie that triggers when the player is directly above. The scene connects them via the existing event/overlap system.

**Tech Stack:** Phaser 3 Arcade Physics, TypeScript, Vite

---

### Task 1: Add a `dust` placeholder particle texture

We need a small dust-puff texture for when zombies land after a failed jump.

**Files:**
- Modify: `src/scenes/PreloadScene.ts:183` (after existing placeholder generation)
- Modify: `src/assets.ts:49` (add DUST key to Assets)

**Step 1: Add DUST asset key**

In `src/assets.ts`, add inside the `Assets` object after the `BRAIN` entry:

```typescript
  DUST: 'dust',
```

**Step 2: Generate dust placeholder texture**

In `src/scenes/PreloadScene.ts`, add after the `brain` placeholder line (line 182):

```typescript
    this.generatePlaceholder('dust', 0xccccaa, 4, 4);
```

**Step 3: Verify it compiles**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/assets.ts src/scenes/PreloadScene.ts
git commit -m "feat: add dust particle placeholder texture"
```

---

### Task 2: Add stepping stone platform clusters to Level 1

Place 4 ascending staircase clusters scattered across the level using the existing `createPlatform()` method with smaller tile counts.

**Files:**
- Modify: `src/scenes/Level1Scene.ts:64-70` (after existing platform creation)

**Step 1: Add a `createSteppingStones()` helper method**

Add this method to `Level1Scene` after the existing `createPlatform()` method (after line 202):

```typescript
  /**
   * Creates an ascending staircase of small platforms.
   * @param startX - left edge of the first (lowest) stone
   * @param baseY - Y position of the lowest stone
   * @param steps - number of stones in the staircase (3-5)
   * @param stepWidth - tiles per stone (2-3)
   * @param stepHeight - vertical gap between each stone (pixels)
   * @param stepOffset - horizontal offset between each stone (pixels)
   */
  private createSteppingStones(
    startX: number,
    baseY: number,
    steps: number,
    stepWidth: number = 2,
    stepHeight: number = 60,
    stepOffset: number = 50
  ) {
    for (let i = 0; i < steps; i++) {
      const x = startX + i * stepOffset;
      const y = baseY - i * stepHeight;
      this.createPlatform(x, y, stepWidth);
    }
  }
```

**Step 2: Place 4 stepping stone clusters in the level**

In `Level1Scene.create()`, add after the existing platform lines (after line 70):

```typescript
    // Stepping stone clusters — floating staircases for vertical combat
    this.createSteppingStones(450, 420, 4, 2, 55, 45);   // cluster 1: near start
    this.createSteppingStones(950, 430, 3, 2, 60, 50);   // cluster 2: mid-left
    this.createSteppingStones(1400, 410, 5, 2, 50, 40);  // cluster 3: mid-right (tallest)
    this.createSteppingStones(2100, 420, 4, 3, 55, 55);  // cluster 4: before boss area
```

**Step 3: Run dev server and visually verify**

Run: `npm run dev`
Expected: 4 staircase clusters visible as gray platform tiles ascending left-to-right. Player can jump between them. Zombies collide with them (they already collide with `this.ground` which includes all platforms).

**Step 4: Commit**

```bash
git add src/scenes/Level1Scene.ts
git commit -m "feat: add stepping stone platform clusters to Level 1"
```

---

### Task 3: Add downward sword slam attack to Player

When the player presses attack while falling (airborne + positive Y velocity), create a hitbox below the player instead of in front. Emit a distinct event so the scene can apply bonus damage and effects.

**Files:**
- Modify: `src/entities/Player.ts:92-123` (the `attack()` method)

**Step 1: Add an `isSlamming` flag**

In `Player`, add a new property after `lastAttackTime` (line 14):

```typescript
  private isSlamming = false;
```

**Step 2: Branch `attack()` for air slam vs ground attack**

Replace the `attack()` method (lines 92-123) with:

```typescript
  attack(): Phaser.GameObjects.Rectangle | null {
    const now = this.scene.time.now;
    if (this.isAttacking || now - this.lastAttackTime < this.attackCooldown) {
      return null;
    }

    this.isAttacking = true;
    this.lastAttackTime = now;

    // Detect air slam: airborne and falling
    const isAirborne = !this.body!.blocked.down;
    const isFalling = this.body!.velocity.y > 0;

    if (isAirborne && isFalling) {
      // --- DOWNWARD SWORD SLAM ---
      this.isSlamming = true;

      // Play attack animation (reuse for now, can add dedicated slam anim later)
      this.play(PlayerAnims.ATTACK.key, true);
      this.once('animationcomplete-' + PlayerAnims.ATTACK.key, () => {
        this.isAttacking = false;
        this.isSlamming = false;
      });

      // Hitbox BELOW the player (32 wide, 40 tall)
      const hitbox = this.scene.add.rectangle(this.x, this.y + 40, 32, 40, 0xffffff, 0.3);
      this.scene.physics.add.existing(hitbox, false);
      (hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

      // Emit slam event (scene uses this for bonus damage + effects)
      this.scene.events.emit('player-slam', hitbox);

      this.scene.time.delayedCall(150, () => {
        hitbox.destroy();
      });

      return hitbox;
    }

    // --- REGULAR GROUND/AIR SWING ---
    this.play(PlayerAnims.ATTACK.key, true);
    this.once('animationcomplete-' + PlayerAnims.ATTACK.key, () => {
      this.isAttacking = false;
    });

    // Hitbox in front of player
    const offsetX = this.flipX ? 30 : -30;
    const hitbox = this.scene.add.rectangle(this.x + offsetX, this.y, 40, 32, 0xffffff, 0.3);
    this.scene.physics.add.existing(hitbox, false);
    (hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    this.scene.events.emit('player-attack', hitbox);

    this.scene.time.delayedCall(100, () => {
      hitbox.destroy();
    });

    return hitbox;
  }
```

**Step 3: Add a public getter for slam state**

Add after the `takeDamage` method:

```typescript
  getIsSlamming(): boolean {
    return this.isSlamming;
  }
```

**Step 4: Add pogo bounce method**

Add after the getter:

```typescript
  pogoBounce() {
    this.setVelocityY(-250);
  }
```

**Step 5: Verify it compiles**

Run: `npm run build`
Expected: Build succeeds. Regular attacks still work. Pressing A while falling creates a hitbox below the player.

**Step 6: Commit**

```bash
git add src/entities/Player.ts
git commit -m "feat: add downward sword slam attack when falling"
```

---

### Task 4: Wire up slam combat in Level1Scene

Listen for the `player-slam` event in the scene. Apply 1.5x damage, big splatter, screen shake, and pogo bounce on hit.

**Files:**
- Modify: `src/scenes/Level1Scene.ts:117-145` (after the `player-attack` event handler)

**Step 1: Add slam event handler**

In `Level1Scene.create()`, add after the `player-attack` event handler block (after line 145):

```typescript
    // Sword slam combat — 1.5x damage, big splatter, screen shake, pogo bounce
    this.events.on('player-slam', (hitbox: Phaser.GameObjects.Rectangle) => {
      this.soundManager.play('sword-swing');
      const slamDamage = Math.floor(GameState.getInstance().swordDamage * 1.5);

      this.physics.add.overlap(hitbox, this.zombies, (_hitbox, zombie) => {
        const z = zombie as unknown as Zombie;
        if (!z.isDead()) {
          z.takeDamage(slamDamage);
          this.soundManager.play('splat', { volume: 2 });
          this.cameras.main.shake(100, 0.005);
          this.player.pogoBounce();

          if (z.isDead()) {
            this.onZombieKilled(z);
          } else {
            // Big splatter even on non-kill slam hits
            createSplatter(this, { x: z.x, y: z.y, isKill: true });
          }
        }
      });

      // Slam vs boss
      if (this.boss && this.boss.getState() === BossState.FIGHTING && !this.boss.isDead()) {
        this.physics.add.overlap(hitbox, this.boss, () => {
          if (!this.boss.isDead()) {
            this.boss.takeDamage(slamDamage);
            this.cameras.main.shake(100, 0.005);
            this.player.pogoBounce();

            if (this.boss.isDead()) {
              this.onBossDefeated();
            } else {
              createSplatter(this, { x: this.boss.x, y: this.boss.y, isKill: true });
            }
          }
        });
      }
    });
```

**Step 2: Run dev server and test**

Run: `npm run dev`
Expected: Jump above a zombie, press A while falling → hitbox appears below player, zombie takes 15 damage (1.5 × 10), big splatter, screen shakes, player bounces back up. Can chain slams by pressing A again on the way down.

**Step 3: Commit**

```bash
git add src/scenes/Level1Scene.ts
git commit -m "feat: wire up slam combat with bonus damage and effects"
```

---

### Task 5: Add zombie jump-fail behavior

When a zombie is chasing the player and the player is directly above on a stepping stone, the zombie does a small hop that doesn't reach the platform, then lands with a dust puff.

**Files:**
- Modify: `src/entities/Zombie.ts:91-118` (the `update()` method)

**Step 1: Add jump-fail properties**

In the `Zombie` class, add after the `dying` property (line 18):

```typescript
  private lastJumpAttempt = 0;
  private jumpAttemptInterval = 1500; // ms between failed jumps
```

**Step 2: Add `isPlayerAbove()` check**

Add a new method after `patrol()`:

```typescript
  private isPlayerAbove(): boolean {
    if (!this.target) return false;
    // Player is "above" if within 120px horizontal range and at least 60px higher
    const dx = Math.abs(this.target.x - this.x);
    const dy = this.y - this.target.y; // positive means player is above
    return dx < 120 && dy > 60;
  }
```

**Step 3: Add `tryJump()` method**

Add after `isPlayerAbove()`:

```typescript
  private tryJump(time: number) {
    if (time - this.lastJumpAttempt < this.jumpAttemptInterval) return;
    if (!this.body!.blocked.down) return; // only jump from ground

    this.lastJumpAttempt = time;

    // Small hop that doesn't reach platform height
    this.setVelocityY(-150);

    // Dust puff when landing (delayed to approximate landing time)
    this.scene.time.delayedCall(400, () => {
      if (this.active && this.body!.blocked.down) {
        this.scene.add.particles(this.x, this.y + 20, 'dust', {
          speed: { min: 20, max: 60 },
          angle: { min: 200, max: 340 },
          scale: { start: 1, end: 0 },
          lifespan: 300,
          quantity: 5,
          emitting: false,
          gravityY: 50,
        }).explode();
      }
    });
  }
```

**Step 4: Integrate into `update()` chase logic**

Replace the chase block in `update()` (lines 101-107) with:

```typescript
    if (distToPlayer < this.aggroRange) {
      if (this.isPlayerAbove()) {
        // Player is above — stop and try to jump (fail hilariously)
        this.setVelocityX(0);
        this.tryJump(_time);
      } else {
        // Chase player horizontally
        const direction = this.target.x < this.x ? -1 : 1;
        this.setVelocityX(direction * this.speed * 1.5);
        this.setFlipX(direction < 0);
      }
    } else {
      this.patrol(delta);
    }
```

Note: Change the `_time` parameter name back to `time` in the method signature (line 91):
```typescript
  update(time: number, delta: number) {
```

**Step 5: Run dev server and test**

Run: `npm run dev`
Expected: Stand on a stepping stone above a zombie that's in aggro range. The zombie stops chasing horizontally, jumps up ~30-50% of the stone height, falls back down with a small dust puff. Repeats every 1.5 seconds. Looks funny and helpless.

**Step 6: Commit**

```bash
git add src/entities/Zombie.ts
git commit -m "feat: add zombie jump-fail behavior when player is above"
```

---

### Task 6: Playtest and polish

Run through the full level testing all new mechanics together.

**Files:**
- May adjust: `src/scenes/Level1Scene.ts` (stepping stone positions)
- May adjust: `src/entities/Player.ts` (slam damage multiplier, pogo bounce force)
- May adjust: `src/entities/Zombie.ts` (jump height, aggro range for above-detection)

**Step 1: Full playthrough test**

Run: `npm run dev`

Test checklist:
- [ ] Jump up each of the 4 stepping stone clusters — can reach top stone from bottom
- [ ] Slam attack kills zombies from above with big splatter + screen shake
- [ ] Pogo bounce lets you chain 2+ slams in a row on grouped zombies
- [ ] Zombies hop and fail when you stand above them on stones
- [ ] Dust puffs appear when zombies land
- [ ] Regular ground combat still works normally (no regressions)
- [ ] Boss fight works (slams work on boss too)
- [ ] No zombies get stuck on stepping stones during patrol

**Step 2: Adjust values if needed**

Tuning targets:
- Stepping stone gaps should be jumpable with the -450 jump force
- Slam pogo bounce (-250) should be high enough to chain but not infinite
- Zombie jump (-150) should be clearly too low to reach the first stone

**Step 3: Final commit**

```bash
git add -A
git commit -m "polish: tune stepping stones, slam, and zombie jump-fail values"
```
