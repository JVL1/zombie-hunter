import { describe, expect, it } from 'vitest';
import { CONSUMABLES, SWORDS, ZOMBIE } from './config';
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
