import { describe, expect, it } from 'vitest';
import { SHOP } from '../config';
import { resolveDamage, type DamageState } from './damage';

const baseState = (overrides: Partial<DamageState> = {}): DamageState => ({
  health: 80,
  maxHealth: 100,
  potions: 0,
  shieldHits: 0,
  lives: 0,
  ...overrides,
});

describe('resolveDamage', () => {
  it('ignores damage while invulnerable without consuming shield charges', () => {
    const state = baseState({ shieldHits: 2, potions: 1, lives: 1 });

    const result = resolveDamage(state, 999, true);

    expect(result.outcome).toBe('ignored');
    expect(result.state).toEqual(state);
    expect(result.state).not.toBe(state);
  });

  it('absorbs damage with shield charges before health changes', () => {
    const result = resolveDamage(baseState({ health: 80, shieldHits: 2 }), 16, false);

    expect(result.outcome).toBe('absorbed');
    expect(result.state).toEqual(baseState({ health: 80, shieldHits: 1 }));
  });

  it('applies a plain non-lethal hit', () => {
    const result = resolveDamage(baseState({ health: 80 }), 16, false);

    expect(result.outcome).toBe('hurt');
    expect(result.state).toEqual(baseState({ health: 64 }));
  });

  it('drinks a potion on a lethal hit before spending a life', () => {
    const result = resolveDamage(baseState({ health: 10, potions: 1, lives: 1 }), 16, false);

    expect(result.outcome).toBe('potioned');
    expect(result.state).toEqual(baseState({ health: 50, potions: 0, lives: 1 }));
  });

  it('revives on lethal damage when no potion is available and a life remains', () => {
    const result = resolveDamage(baseState({ health: 10, lives: 1 }), 16, false);

    expect(result.outcome).toBe('revived');
    expect(result.state).toEqual(baseState({ health: 100, lives: 0 }));
  });

  it('dies on lethal damage with no potion or life available', () => {
    const result = resolveDamage(baseState({ health: 10 }), 16, false);

    expect(result.outcome).toBe('dead');
    expect(result.state).toEqual(baseState({ health: 0 }));
  });

  it('auto-drinks a potion when a non-lethal hit drops health below the threshold', () => {
    const result = resolveDamage(baseState({ health: 40, potions: 1 }), 16, false);

    expect(result.outcome).toBe('potioned');
    expect(result.state).toEqual(baseState({ health: 74, potions: 0 }));
  });

  it('does not auto-drink below the threshold when no potion is available', () => {
    const result = resolveDamage(baseState({ health: 40 }), 16, false);

    expect(result.outcome).toBe('hurt');
    expect(result.state).toEqual(baseState({ health: 24 }));
  });

  it('treats the invincibility buff flag as invulnerable', () => {
    const state = baseState({ shieldHits: 1, potions: 1 });

    const result = resolveDamage(state, 16, true);

    expect(result.outcome).toBe('ignored');
    expect(result.state).toEqual(state);
  });

  it('does not mutate the input state object', () => {
    const state = baseState({ health: 40, potions: 1 });
    const original = { ...state };

    resolveDamage(state, 16, false);

    expect(state).toEqual(original);
  });

  it('drinks only one potion per hit', () => {
    const result = resolveDamage(baseState({ health: 1, maxHealth: 200, potions: 2 }), 50, false);

    expect(result.outcome).toBe('potioned');
    expect(result.state).toEqual(baseState({ health: SHOP.potionHealAmount, maxHealth: 200, potions: 1 }));
  });

  it('lets a shield absorb otherwise lethal damage', () => {
    const result = resolveDamage(baseState({ health: 10, shieldHits: 1, potions: 1, lives: 1 }), 999, false);

    expect(result.outcome).toBe('absorbed');
    expect(result.state).toEqual(baseState({ health: 10, shieldHits: 0, potions: 1, lives: 1 }));
  });

  it('clamps potion healing to max health', () => {
    const result = resolveDamage(baseState({ health: 40, maxHealth: 60, potions: 1 }), 25, false);

    expect(result.outcome).toBe('potioned');
    expect(result.state).toEqual(baseState({ health: 60, maxHealth: 60, potions: 0 }));
  });
});
