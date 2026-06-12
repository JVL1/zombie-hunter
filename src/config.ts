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

export interface SwordDef {
  name: string;
  cost: number;       // coins; 0 = starting sword
  damage: number;
  reachBonus: number; // added to COMBAT.hitboxW
  swingSpeed: number; // anims.timeScale multiplier; cooldowns divided by this
  bladeTint?: number; // WebGL nicety on the sword overlay
}

export const SWORDS: SwordDef[] = [
  { name: 'Rusty Blade',       cost: 0,   damage: 12, reachBonus: 0,  swingSpeed: 1 },
  { name: 'Iron Cleaver',      cost: 40,  damage: 16, reachBonus: 4,  swingSpeed: 1,    bladeTint: 0x9ab0c8 },
  { name: 'Shadow Fang',       cost: 150, damage: 20, reachBonus: 6,  swingSpeed: 1.15, bladeTint: 0x6a4a8a },
  { name: 'Flame Edge',        cost: 300, damage: 26, reachBonus: 8,  swingSpeed: 1.15, bladeTint: 0xff7733 },
  { name: 'Giant Sun Splicer', cost: 600, damage: 36, reachBonus: 14, swingSpeed: 1.25, bladeTint: 0xffd24a },
];

export type ConsumableKind = 'potion' | 'shield' | 'life';
export const CONSUMABLES: Record<ConsumableKind, { name: string; cost: number; cap: number }> = {
  potion: { name: 'Health Potion', cost: 30,  cap: 3 },
  shield: { name: 'Shield',        cost: 50,  cap: 1 }, // grants 3 hit-charges; buy only at 0 charges
  life:   { name: 'Extra Life',    cost: 100, cap: 2 },
};

export const SHOP = {
  potionHealAmount: 50,
  potionAutoThreshold: 0.3, // drink when health < 30% of max
  shieldCharges: 3,
  reviveInvulnMs: 2000,
  bossCoinBurst: 5, // coins dropped when a boss dies (5 coins × coinValue 5 = +25)
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

// Shared boss physics — per-boss stats (hp, speeds, damage, attack intervals)
// live in each level's BossDef (src/levels.ts).
export const BOSS = {
  chargeSpeed: 390,
  chargeWindupMs: 550,
  chargeMs: 700,
  wallStunMs: 700,
  enrageThreshold: 0.5,
  jumpSlamVelocity: -520,
  shockwaveRange: 150,
  shockwaveDamage: 15,
  summonTelegraphMs: 500,
  summonOpeningGraceMs: 2500, // min delay before a boss's first summon
};
