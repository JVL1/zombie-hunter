// Every gameplay tunable in one place — tweak here, not in entity code.

export const GAME_W = 960;
export const GAME_H = 540;

export const WORLD = {
  height: 540,
  groundY: 476, // top surface of the ground
};

export type ZombieVariant = 'zombie' | 'urban' | 'disgusting' | 'zanter';

export interface ZombieVariantDef {
  base: 'zombie' | 'urban'; // which sprite pack + body size to use
  hp: number;
  tint?: number;
  scale: number;
  patrolSpeed: number;
  chaseSpeed: number;
  contactDamage: number;
}

export const PLAYER = {
  accel: 2200,
  drag: 1800,
  maxRun: 230,
  jumpVelocity: -470,
  jumpCutVelocity: -160, // velocity clamp when jump released early
  coyoteMs: 100,
  jumpBufferMs: 130,
  maxJumps: 2,
  dashSpeed: 540,
  dashMs: 160,
  dashCooldownMs: 500,
  slamFallSpeed: 680,
  slamPogoVelocity: -400,
  hurtInvulnMs: 1100,
  maxHealth: 100,
  contactKnockback: 220,
};

export const COMBAT = {
  baseSwordDamage: 12,
  comboMultipliers: [1, 1.15, 1.7],
  comboWindowMs: 450,
  swingCooldownMs: 60,
  finisherCooldownMs: 320,
  slamDamageMultiplier: 1.6,
  hitboxW: 46,
  hitboxH: 36,
  finisherReachBonus: 14,
  streakWindowMs: 4000,
};

export const ZOMBIE = {
  aggroRange: 240,
  deaggroRange: 330,
  lungeRange: 80,
  lungeWindupMs: 420,
  lungeSpeed: 270,
  lungeMs: 350,
  lungeRecoverMs: 450,
  lungeCooldownMs: 1900,
  contactCooldownMs: 1000,
  jumpFailIntervalMs: 1600,
  heartDropChance: 0.2,
  coinValue: 5,
  variants: {
    zombie:     { base: 'zombie', hp: 30, scale: 1,    patrolSpeed: 55, chaseSpeed: 95,  contactDamage: 8 },
    urban:      { base: 'urban',  hp: 50, scale: 1,    patrolSpeed: 55, chaseSpeed: 95,  contactDamage: 8 },
    disgusting: { base: 'zombie', hp: 45, tint: 0x7fd16a, scale: 1.06, patrolSpeed: 65, chaseSpeed: 118, contactDamage: 10 },
    zanter:     { base: 'urban',  hp: 95, tint: 0xcdb892, scale: 1.45, patrolSpeed: 40, chaseSpeed: 72,  contactDamage: 14 },
  } satisfies Record<ZombieVariant, ZombieVariantDef>,
};

export const BOSS = {
  hp: 260,
  walkSpeed: 90,
  enragedWalkSpeed: 135,
  chargeSpeed: 390,
  chargeWindupMs: 550,
  chargeMs: 700,
  wallStunMs: 700,
  attackIntervalMs: 2200,
  enragedAttackIntervalMs: 1500,
  contactDamage: 20,
  enrageThreshold: 0.5,
  jumpSlamVelocity: -520,
  shockwaveRange: 150,
  shockwaveDamage: 15,
};
