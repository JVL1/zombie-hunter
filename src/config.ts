// Every gameplay tunable in one place — tweak here, not in entity code.

export const GAME_W = 960;
export const GAME_H = 540;

export const WORLD = {
  width: 3200,
  height: 540,
  groundY: 476, // top surface of the ground
};

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
  hurtInvulnMs: 900,
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
  patrolSpeed: 55,
  chaseSpeed: 95,
  aggroRange: 240,
  deaggroRange: 330,
  lungeRange: 80,
  lungeWindupMs: 420,
  lungeSpeed: 270,
  lungeMs: 350,
  lungeRecoverMs: 450,
  lungeCooldownMs: 1900,
  contactDamage: 10,
  contactCooldownMs: 1000,
  jumpFailIntervalMs: 1600,
  heartDropChance: 0.2,
  coinValue: 5,
  hp: { zombie: 30, urban: 50 },
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
  arenaLeft: 2600,
  triggerX: 2700,
};
