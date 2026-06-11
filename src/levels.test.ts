import { describe, expect, it } from 'vitest';
import { LEVELS, TRAIN, levelByNumber } from './levels';
import { WORLD, ZOMBIE } from './config';

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
    }
  });
});

describe('level 3 train geometry', () => {
  // Roof spans (left/right edges) for the locomotive and the four boxcars
  const spans = [
    [TRAIN.locomotiveX - TRAIN.locomotiveW / 2, TRAIN.locomotiveX + TRAIN.locomotiveW / 2],
    ...TRAIN.carXs.map((x) => [x - TRAIN.carW / 2, x + TRAIN.carW / 2]),
  ];

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
      expect(s.y!).toBeLessThan(TRAIN.carRoofY - 40); // spawns above the roof, falls onto it — no tunneling distance
      // Body bottoms (sprite center + scaled body reach) must clear the roof
      // slab top (carRoofY - 8) or the zombie spawns embedded in / through it
      const v = ZOMBIE.variants[s.variant];
      const bodyBottom = s.y! + (v.base === 'urban' ? 64 : 48) * v.scale;
      expect(bodyBottom).toBeLessThan(TRAIN.carRoofY - 8);
    }
  });
});
