// Data-driven level registry. Must stay Phaser-free — vitest imports it in plain Node.

import { Assets } from './assets';
import type { ZombieVariant } from './config';

export interface ZombieSpawn {
  x: number;
  variant: ZombieVariant;
  y?: number; // optional explicit spawn height (train roofs); default is groundY - 56
}

export interface BossDef {
  name: string; // HUD banner text, e.g. 'MUTATED ZOMBIE'
  hp: number;
  scale: number;
  tint?: number; // omit for no tint
  walkSpeed: number;
  enragedWalkSpeed: number;
  contactDamage: number;
  attackIntervalMs: number;
  enragedAttackIntervalMs: number;
  throneTexture: string; // Assets key
  canCharge: boolean; // telegraphed charge into walls
  canLeap: boolean; // enraged jump-slam + shockwave
  summon?: {
    variant: ZombieVariant;
    count: number; // minions per summon (pre-enrage)
    enragedCount: number;
    maxAlive: number; // cap on live (non-dying) minions
    intervalMs: number; // time between summons
  };
}

export interface LevelDef {
  sceneKey: string; // Phaser scene key
  levelNumber: number; // 1-based
  name: string; // 'THE ABANDONED CITY' — intro banner + Victory title
  victorySubtitle: string;
  nextSceneKey: string; // next level's sceneKey, or 'MainMenu' after the last BUILT level
  keyIndex: number; // GameState.keys slot (levelNumber - 1)
  worldWidth: number; // WORLD.height/groundY stay global
  playerSpawnX: number;
  ambientColor: number; // Light2D ambient
  parallax: Array<{ key: string; factor: number }>; // baked night textures, far→near
  textures: {
    groundTop: string;
    groundFill: string;
    platform: string;
    stone: string;
  };
  platforms: Array<[x: number, y: number, count: number]>;
  stairs: Array<[startX: number, baseY: number, steps: number, stepH: number, stepOff: number]>;
  zombieSpawns: ZombieSpawn[];
  boss: BossDef;
  bossSpawnX: number;
  triggerX: number; // player x that starts the boss cinematic
  arenaLeft: number; // world/camera bounds lock during boss fight
}

const levelOne: LevelDef = {
  sceneKey: 'Level1',
  levelNumber: 1,
  name: 'THE ABANDONED CITY',
  victorySubtitle: 'The Abandoned City is yours',
  nextSceneKey: 'Level2',
  keyIndex: 0,
  worldWidth: 3200,
  playerSpawnX: 100,
  ambientColor: 0x595972,
  parallax: [
    { key: Assets.RUIN_NIGHT_FAR, factor: 0.12 },
    { key: Assets.RUIN_NIGHT_MID, factor: 0.3 },
    { key: Assets.RUIN_NIGHT_NEAR, factor: 0.55 },
  ],
  textures: {
    groundTop: Assets.GROUND_TOP,
    groundFill: Assets.GROUND_FILL,
    platform: Assets.PLATFORM,
    stone: Assets.STONE,
  },
  platforms: [
    [300, 400, 5],
    [700, 310, 4],
    [1100, 355, 6],
    [1600, 310, 4],
    [2000, 400, 5],
    [2500, 310, 3],
  ],
  stairs: [
    [450, 408, 4, 40, 50],
    [950, 412, 3, 40, 55],
    [1400, 408, 5, 35, 45],
    [2100, 408, 4, 40, 55],
  ],
  zombieSpawns: [500, 700, 950, 1250, 1550, 1850, 2150, 2450].map((x, i) => ({
    x,
    variant: (i % 3 === 2 ? 'urban' : 'zombie') as ZombieVariant,
  })),
  boss: {
    name: 'MUTATED ZOMBIE',
    hp: 260,
    scale: 1.8,
    walkSpeed: 90,
    enragedWalkSpeed: 135,
    contactDamage: 20,
    attackIntervalMs: 2200,
    enragedAttackIntervalMs: 1500,
    throneTexture: Assets.THRONE,
    canCharge: true,
    canLeap: true,
  },
  bossSpawnX: 2950,
  triggerX: 2700,
  arenaLeft: 2600,
};

const levelTwo: LevelDef = {
  sceneKey: 'Level2',
  levelNumber: 2,
  name: 'THE BROKEN DOWN FOREST',
  victorySubtitle: 'The forest horde is broken',
  nextSceneKey: 'MainMenu', // flipped to 'Level3' once Level 3 is built
  keyIndex: 1,
  worldWidth: 3400,
  playerSpawnX: 100,
  ambientColor: 0x46584a, // mossy night
  parallax: [
    { key: Assets.FOREST_NIGHT_FAR, factor: 0.12 },
    { key: Assets.FOREST_NIGHT_MID, factor: 0.3 },
    { key: Assets.FOREST_NIGHT_NEAR, factor: 0.55 },
  ],
  textures: {
    groundTop: Assets.FOREST_GROUND_TOP,
    groundFill: Assets.FOREST_GROUND_FILL,
    platform: Assets.LOG_PLATFORM,
    stone: Assets.STUMP_STONE,
  },
  platforms: [
    [350, 395, 4],
    [800, 320, 5],
    [1250, 360, 4],
    [1700, 310, 5],
    [2150, 395, 4],
    [2650, 330, 4],
  ],
  stairs: [
    [550, 408, 4, 38, 52],
    [1450, 410, 4, 40, 50],
    [2350, 408, 5, 36, 46],
  ],
  // Hordes: tight packs of 2-3 with breathing room between packs (14 zombies)
  zombieSpawns: [
    { x: 520, variant: 'disgusting' },
    { x: 590, variant: 'zombie' }, // clear of the first stair stone (spans x 532-568)
    { x: 920, variant: 'disgusting' },
    { x: 960, variant: 'disgusting' },
    { x: 1005, variant: 'zombie' },
    { x: 1380, variant: 'disgusting' },
    { x: 1420, variant: 'zombie' },
    { x: 1800, variant: 'disgusting' },
    { x: 1845, variant: 'disgusting' },
    { x: 1890, variant: 'urban' },
    { x: 2280, variant: 'disgusting' },
    { x: 2320, variant: 'disgusting' },
    { x: 2700, variant: 'urban' },
    { x: 2745, variant: 'disgusting' },
  ],
  // The horde boss IS the pack: the Pack King charges like a brute and keeps
  // summoning disgusting zombies to swarm you — more and faster when enraged.
  boss: {
    name: 'ZOMBIE PACK KING',
    hp: 300,
    scale: 1.7,
    tint: 0x9fd486,
    walkSpeed: 95,
    enragedWalkSpeed: 140,
    contactDamage: 18,
    attackIntervalMs: 2400,
    enragedAttackIntervalMs: 1600,
    throneTexture: Assets.THRONE_TREE,
    canCharge: true,
    canLeap: false,
    summon: { variant: 'disgusting', count: 2, enragedCount: 3, maxAlive: 4, intervalMs: 7000 },
  },
  bossSpawnX: 3150,
  triggerX: 2900,
  arenaLeft: 2790,
};

export const LEVELS: LevelDef[] = [levelOne, levelTwo];

export function levelByNumber(n: number): LevelDef {
  if (!Number.isFinite(n)) n = 1;
  return LEVELS[Math.min(Math.max(Math.floor(n), 1), LEVELS.length) - 1];
}
