import { describe, expect, it } from 'vitest';
import { LEVELS, TRAIN, levelByNumber } from './levels';
import { POWERUPS, WORLD, ZOMBIE } from './config';

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// Body rect at REST (feet on the ground) — the wedge hazard is a persistent
// overlap where the zombie lives, not the transient 8px-elevated spawn drop
// (BaseLevelScene.zombieSpawnY), which gravity + separation resolve benignly.
// Base sizes must match Zombie.ts setSize/setOffset (urban 40x80, others 32x64).
function restingBodyRect(spawn: { x: number; variant: keyof typeof ZOMBIE.variants }): Rect {
  const v = ZOMBIE.variants[spawn.variant];
  const width = (v.base === 'urban' ? 40 : 32) * v.scale;
  const height = (v.base === 'urban' ? 80 : 64) * v.scale;
  return {
    left: spawn.x - width / 2,
    right: spawn.x + width / 2,
    top: WORLD.groundY - height,
    bottom: WORLD.groundY,
  };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

describe('level registry integrity', () => {
  it('level numbers and key indexes are sequential from 1 / 0', () => {
    LEVELS.forEach((def, i) => {
      expect(def.levelNumber).toBe(i + 1);
      expect(def.keyIndex).toBe(i);
    });
  });

  it('scene keys are unique and the victory chain links each level to the next', () => {
    const keys = LEVELS.map((d) => d.sceneKey);
    expect(new Set(keys).size).toBe(keys.length);
    LEVELS.slice(0, -1).forEach((def, i) => {
      expect(def.nextSceneKey).toBe(LEVELS[i + 1].sceneKey);
    });
    expect(LEVELS[LEVELS.length - 1].nextSceneKey).toBe('MainMenu');
  });

  it('boss geometry is ordered: arenaLeft < triggerX < bossSpawnX < worldWidth', () => {
    for (const def of LEVELS) {
      expect(def.arenaLeft).toBeLessThan(def.triggerX);
      expect(def.triggerX).toBeLessThan(def.bossSpawnX);
      expect(def.bossSpawnX).toBeLessThan(def.worldWidth);
    }
  });

  it('first zombie spawns outside aggro+patrol reach of the player spawn (spawn-camp gotcha)', () => {
    for (const def of LEVELS) {
      const firstX = Math.min(...def.zombieSpawns.map((s) => s.x));
      expect(firstX - def.playerSpawnX).toBeGreaterThanOrEqual(350);
    }
  });

  it('all spawns sit inside the world, and explicit spawn heights are above ground', () => {
    for (const def of LEVELS) {
      for (const s of def.zombieSpawns) {
        expect(s.x).toBeGreaterThan(0);
        expect(s.x).toBeLessThan(def.worldWidth - 100);
        if (s.y !== undefined) {
          expect(s.y).toBeGreaterThan(100);
          expect(s.y).toBeLessThan(WORLD.groundY - 60);
        }
      }
    }
  });

  it('every powerUp type appears at least once across built levels', () => {
    const seen = new Set<string>();
    for (const def of LEVELS) {
      for (const spawn of def.zombieSpawns) {
        const powerUp = ZOMBIE.variants[spawn.variant].powerUp;
        if (powerUp) seen.add(powerUp);
      }
    }

    expect([...seen].sort()).toEqual(Object.keys(POWERUPS).sort());
  });

  it('power monsters spawn well before the boss trigger', () => {
    for (const def of LEVELS) {
      for (const spawn of def.zombieSpawns) {
        if (!ZOMBIE.variants[spawn.variant].powerUp) continue;
        expect(spawn.x).toBeLessThan(def.triggerX - ZOMBIE.aggroRange);
      }
    }
  });

  it('power-monster ground spawns do not overlap stair stones or platform bands', () => {
    for (const def of LEVELS) {
      const platformRects = def.platforms.flatMap(([x, y, count]) =>
        Array.from({ length: count }, (_, i) => ({
          left: x + i * 32,
          right: x + i * 32 + 32,
          top: y - 8,
          bottom: y + 8,
        }))
      );
      const stairRects = def.stairs.flatMap(([startX, baseY, steps, stepH, stepOff]) =>
        Array.from({ length: steps }, (_, i) => {
          const x = startX + i * stepOff;
          const y = baseY - i * stepH;
          return {
            left: x - 18,
            right: x + 18,
            top: y - 7,
            bottom: y + 7,
          };
        })
      );

      // Scoped to power monsters (this epic's new spawns): several legacy
      // spawns graze solids by 1-4px at rest, which Arcade separation has
      // always resolved benignly — widening would flag tuned, working data.
      for (const spawn of def.zombieSpawns) {
        if (!ZOMBIE.variants[spawn.variant].powerUp || spawn.y !== undefined) continue;
        const rect = restingBodyRect(spawn);
        for (const solid of [...platformRects, ...stairRects]) {
          expect(
            overlaps(rect, solid),
            `L${def.levelNumber} ${spawn.variant}@${spawn.x} body overlaps solid at ${solid.left}-${solid.right}, ${solid.top}-${solid.bottom}`
          ).toBe(false);
        }
      }
    }
  });

  it('floating geometry leaves >56px under it (player-wedge gotcha)', () => {
    for (const def of LEVELS) {
      // platform tile is 32x16 centered at y → bottom = y + 8; need groundY - bottom > 56
      for (const [, y] of def.platforms) {
        expect(WORLD.groundY - (y + 8)).toBeGreaterThan(56);
      }
      // stepping stone is 36x14 centered at baseY → bottom = baseY + 7
      for (const [, baseY] of def.stairs) {
        expect(WORLD.groundY - (baseY + 7)).toBeGreaterThan(56);
      }
    }
  });

  it('levelByNumber clamps out-of-range', () => {
    expect(levelByNumber(0)).toBe(LEVELS[0]);
    expect(levelByNumber(99)).toBe(LEVELS[LEVELS.length - 1]);
  });

  it('boss defs are internally sane', () => {
    for (const def of LEVELS) {
      const b = def.boss;
      expect(b.hp).toBeGreaterThan(0);
      expect(b.scale).toBeGreaterThan(0);
      if (b.kind === 'walker') {
        expect(b.enragedWalkSpeed).toBeGreaterThanOrEqual(b.walkSpeed);
        expect(b.enragedAttackIntervalMs).toBeLessThanOrEqual(b.attackIntervalMs);
        // A boss with no attacks at all would just walk at you forever
        expect(b.canCharge || b.canLeap || b.summon !== undefined).toBe(true);
        if (b.summon) {
          expect(b.summon.count).toBeGreaterThan(0);
          expect(b.summon.enragedCount).toBeGreaterThanOrEqual(b.summon.count);
          expect(b.summon.maxAlive).toBeGreaterThanOrEqual(b.summon.enragedCount);
          // Summons must be breathers between waves, not a continuous flood
          expect(b.summon.intervalMs).toBeGreaterThan(b.attackIntervalMs);
        }
      } else if (b.kind === 'kraken') {
        expect(b.tentacles).toBeGreaterThanOrEqual(2);
        expect(b.tentacles).toBeLessThanOrEqual(3);
        expect(b.regrowMs).toBeGreaterThan(b.headWindowMs);
        expect(b.bubble.speed).toBeGreaterThan(0);
        expect(b.enragedSpreadCount).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('level 3 train geometry', () => {
  // WALKABLE roof spans (left/right edges) for the locomotive and the four
  // boxcars — every roof is roofW of solids, regardless of body width
  const spans = [
    [TRAIN.locomotiveX - TRAIN.roofW / 2, TRAIN.locomotiveX + TRAIN.roofW / 2],
    ...TRAIN.carXs.map((x) => [x - TRAIN.roofW / 2, x + TRAIN.roofW / 2]),
  ];

  it('roof solids never extend past the decoration bodies they sit on', () => {
    expect(TRAIN.roofW).toBeLessThanOrEqual(TRAIN.locomotiveW);
    expect(TRAIN.roofW).toBeLessThanOrEqual(TRAIN.carW);
    expect(TRAIN.roofW % 32).toBe(0); // whole 32px slab tiles
  });

  it('leaves room for an urban zombie (80px body) under the car roofs', () => {
    expect(WORLD.groundY - (TRAIN.carRoofY + 8)).toBeGreaterThan(80);
  });

  it('a Zanter (116px body) cannot fit under the car roofs — comedy invariant', () => {
    const zanter = ZOMBIE.variants.zanter;
    const zanterHeight = 80 * zanter.scale;
    expect(WORLD.groundY - (TRAIN.carRoofY + 8)).toBeLessThan(zanterHeight);
  });

  it('cars do not overlap and gaps are jumpable (≤90px) or steppable', () => {
    for (let i = 1; i < spans.length; i++) {
      const gap = spans[i][0] - spans[i - 1][1];
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThanOrEqual(90);
    }
  });

  it('roof spawns (explicit y) land on a car or locomotive span', () => {
    const def = LEVELS.find((d) => d.sceneKey === 'Level3')!;
    const roofSpawns = def.zombieSpawns.filter((s) => s.y !== undefined);
    expect(roofSpawns.length).toBeGreaterThan(0);
    for (const s of roofSpawns) {
      expect(spans.some(([l, r]) => s.x > l + 20 && s.x < r - 20)).toBe(true);
      // The body bottom (sprite center + scaled body reach) must start ABOVE
      // the slab top (carRoofY - 8) — spawning overlapped means embedding —
      // but within 40px of it, so the drop can't build tunneling speed
      // through the 16px slab
      const v = ZOMBIE.variants[s.variant];
      const bodyBottom = s.y! + (v.base === 'urban' ? 64 : 48) * v.scale;
      const fall = TRAIN.carRoofY - 8 - bodyBottom;
      expect(fall).toBeGreaterThan(0);
      expect(fall).toBeLessThanOrEqual(40);
    }
  });
});
