import { SHOP } from '../config';

export interface DamageState {
  health: number;
  maxHealth: number;
  potions: number;
  shieldHits: number;
  lives: number;
}

export type DamageOutcome = 'ignored' | 'absorbed' | 'hurt' | 'potioned' | 'revived' | 'dead';

export function resolveDamage(
  state: DamageState,
  amount: number,
  invulnerable: boolean
): { state: DamageState; outcome: DamageOutcome } {
  if (invulnerable) {
    return { state: { ...state }, outcome: 'ignored' };
  }

  if (state.shieldHits > 0) {
    return {
      state: { ...state, shieldHits: state.shieldHits - 1 },
      outcome: 'absorbed',
    };
  }

  const healthAfterDamage = Math.max(0, state.health - amount);
  const shouldDrinkPotion =
    state.potions > 0 &&
    (healthAfterDamage === 0 || healthAfterDamage < SHOP.potionAutoThreshold * state.maxHealth);

  if (shouldDrinkPotion) {
    return {
      state: {
        ...state,
        health: Math.min(state.maxHealth, healthAfterDamage + SHOP.potionHealAmount),
        potions: state.potions - 1,
      },
      outcome: 'potioned',
    };
  }

  if (healthAfterDamage === 0 && state.lives > 0) {
    return {
      state: { ...state, health: state.maxHealth, lives: state.lives - 1 },
      outcome: 'revived',
    };
  }

  if (healthAfterDamage === 0) {
    return {
      state: { ...state, health: 0 },
      outcome: 'dead',
    };
  }

  return {
    state: { ...state, health: healthAfterDamage },
    outcome: 'hurt',
  };
}
