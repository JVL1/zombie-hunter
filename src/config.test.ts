import { describe, expect, it } from 'vitest';
import { CONSUMABLES, POWERUPS, SWORDS, ZOMBIE, type PowerUpType } from './config';
import { ZombieAnims } from './assets';

describe('zombie variant table', () => {
  it('every variant maps to a real animation set and has sane stats', () => {
    for (const [name, v] of Object.entries(ZOMBIE.variants)) {
      expect(ZombieAnims[v.base], `${name} anim base`).toBeDefined();
      expect(v.hp).toBeGreaterThan(0);
      expect(v.scale).toBeGreaterThan(0);
      expect(v.chaseSpeed).toBeGreaterThan(v.patrolSpeed);
      expect(v.contactDamage).toBeGreaterThan(0);
    }
  });

  it('zanters are the big ones', () => {
    expect(ZOMBIE.variants.zanter.scale).toBeGreaterThan(1.3);
    expect(ZOMBIE.variants.zanter.hp).toBeGreaterThan(ZOMBIE.variants.urban.hp);
  });
});

describe('power-monster variants', () => {
  const POWER_VARIANTS = ['vulture', 'rage', 'titan', 'crystal'] as const;

  it('every variant with a powerUp has BOTH sheet and animSet, and the animSet exists', () => {
    for (const [name, v] of Object.entries(ZOMBIE.variants)) {
      if (v.powerUp === undefined) continue;
      expect(v.sheet, `${name} sheet`).toBeDefined();
      expect(v.animSet, `${name} animSet`).toBeDefined();
      expect(ZombieAnims[v.animSet!], `${name} anim set entry`).toBeDefined();
    }
  });

  it('power monsters are elites: hp >= 80', () => {
    for (const name of POWER_VARIANTS) {
      expect(ZOMBIE.variants[name].hp, `${name} hp`).toBeGreaterThanOrEqual(80);
    }
  });

  it('all four PowerUpTypes are covered by exactly the 4 new variants', () => {
    const powered = Object.entries(ZOMBIE.variants).filter(([, v]) => v.powerUp !== undefined);
    expect(powered.map(([name]) => name).sort()).toEqual([...POWER_VARIANTS].sort());
    const types = powered.map(([, v]) => v.powerUp).sort();
    expect(types).toEqual(
      (['flight', 'megaDamage', 'giant', 'invincible'] satisfies PowerUpType[]).sort()
    );
  });
});

describe('SWORDS', () => {
  it('has 5 tiers, tier 0 free, costs and damage strictly increasing', () => {
    expect(SWORDS).toHaveLength(5);
    expect(SWORDS[0].cost).toBe(0);
    for (let i = 1; i < SWORDS.length; i++) {
      expect(SWORDS[i].cost).toBeGreaterThan(SWORDS[i - 1].cost);
      expect(SWORDS[i].damage).toBeGreaterThan(SWORDS[i - 1].damage);
      expect(SWORDS[i].swingSpeed).toBeGreaterThanOrEqual(SWORDS[i - 1].swingSpeed);
    }
  });

  it('tier 0 matches the legacy baseline', () => {
    expect(SWORDS[0].name).toBe('Rusty Blade');
    expect(SWORDS[0].damage).toBe(12); // COMBAT.baseSwordDamage
  });
});

describe('CONSUMABLES', () => {
  it('every item has positive cost and cap', () => {
    for (const c of Object.values(CONSUMABLES)) {
      expect(c.cost).toBeGreaterThan(0);
      expect(c.cap).toBeGreaterThan(0);
    }
  });
});

describe('POWERUPS', () => {
  it('defines all buff orb types with positive durations and distinct colors', () => {
    const types = ['flight', 'megaDamage', 'giant', 'invincible'] satisfies PowerUpType[];
    expect(Object.keys(POWERUPS).sort()).toEqual([...types].sort());

    const colors = new Set<number>();
    for (const type of types) {
      const powerup = POWERUPS[type];
      expect(powerup.durationMs, `${type} duration`).toBeGreaterThan(0);
      expect(typeof powerup.color, `${type} color`).toBe('number');
      colors.add(powerup.color);
    }
    expect(colors.size).toBe(types.length);
  });
});
