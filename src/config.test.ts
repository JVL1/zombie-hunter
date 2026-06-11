import { describe, expect, it } from 'vitest';
import { ZOMBIE } from './config';
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
