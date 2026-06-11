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
  nextSceneKey: 'MainMenu', // flipped to 'Level2' once Level 2 is built
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

export const LEVELS: LevelDef[] = [levelOne];

export function levelByNumber(n: number): LevelDef {
  return LEVELS[Math.min(Math.max(n, 1), LEVELS.length) - 1];
}
