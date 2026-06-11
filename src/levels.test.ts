import { describe, expect, it } from 'vitest';
import { LEVELS, levelByNumber } from './levels';
import { WORLD } from './config';

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
});
