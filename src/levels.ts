// Data-driven level registry. Must stay Phaser-free — vitest imports it in plain Node.

import { Assets } from './assets';
import type { ZombieVariant } from './config';

export interface ZombieSpawn {
  x: number;
  variant: ZombieVariant;
  y?: number; // optional explicit spawn height (train roofs); default puts the body bottom 8px above the ground (variant-aware)
}

interface BossBase {
  name: string; // HUD banner text
  hp: number;
  scale: number;
  contactDamage: number;
}

export interface WalkerBossDef extends BossBase {
  kind: 'walker';
  tint?: number; // omit for no tint
  walkSpeed: number;
  enragedWalkSpeed: number;
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

export interface KrakenBossDef extends BossBase {
  kind: 'kraken';
  tentacles: number; // guarding tentacles; kill the active guard to open the head
  regrowMs: number; // delay before a killed guard tentacle regrows (> headWindowMs)
  headWindowMs: number; // how long the head stays vulnerable after a guard dies
  bubble: { speed: number; intervalMs: number; enragedIntervalMs: number; damage: number };
  enragedSpreadCount: number; // aimed bubbles per volley once enraged (>= 3)
}

// THE GUMMY WORM KING (Level 5, Wes's boss). He digs under the ground, shakes
// it, pops up to chomp, and gets dizzy when he eats a sour candy.
export interface WormBossDef extends BossBase {
  kind: 'worm';
  burrowSpeed: number; // px/s the dirt mound slides toward the player
  enragedBurrowSpeed: number;
  underMs: number; // time under the ground before the shake
  enragedUnderMs: number;
  shakeMs: number; // ground-shake warning before the pop-up
  enragedShakeMs: number;
  popMs: number; // the eruption (hurts on contact)
  exposedMs: number; // time above the ground before he digs again
  mouthOpenMs: number; // mouth-open part of each chomp cycle (feed window)
  mouthClosedMs: number; // mouth-closed part of each chomp cycle
  chompMs: number; // the snap at the end of each open phase (hurts on contact)
  dizzyMs: number; // damage window after a sour candy
  digMs: number; // dig-down animation time
  chipDamageRatio: number; // share of damage a hit does when he is NOT dizzy
  dizzyDamageMultiplier: number;
  candyKnockCooldownMs: number;
  summon: { count: number; maxAlive: number; intervalMs: number }; // gummy cubs, enraged only
}

export type BossDef = WalkerBossDef | KrakenBossDef | WormBossDef;

export interface WaterDef {
  surfaceY: number;
  vents: Array<{ x: number; topY: number; width: number }>;
  scuba: { x: number; y: number };
  fishSchools: Array<{ x: number; y: number; count: number }>;
  eels: Array<{ x: number; y: number }>;
}

// Level 5 candy enemies (Wes picked all three). Default y = on the ground.
export type CandyEnemyKind = 'gummy' | 'gumball' | 'chocolate';

export interface CandyDef {
  // Marshmallow bounce pads. x = center, y = TOP surface of the pad.
  marshmallows: Array<{ x: number; y: number }>;
  enemies: Array<{ kind: CandyEnemyKind; x: number }>;
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
  water?: WaterDef;
  candy?: CandyDef;
  // The 5-key portal (Level 5): opens in the arena after the boss key is taken;
  // walking into it ends the level.
  portal?: { x: number };
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
  zombieSpawns: [
    // 880 (not 950): the urban body would spawn enclosing the first stone of
    // the stair at x=950 — same wedge mode as Level 3's relocated Zanter
    ...[500, 700, 880, 1250, 1550, 1850, 2150, 2450].map((x, i) => ({
      x,
      variant: (i % 3 === 2 ? 'urban' : 'zombie') as ZombieVariant,
    })),
    { x: 1700, variant: 'vulture' },
    { x: 2300, variant: 'rage' },
  ],
  boss: {
    kind: 'walker',
    name: 'MUTATED ZOMBIE',
    hp: 230,
    scale: 1.8,
    walkSpeed: 90,
    enragedWalkSpeed: 135,
    contactDamage: 16,
    attackIntervalMs: 2500,
    enragedAttackIntervalMs: 1800,
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
  nextSceneKey: 'Level3',
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
    { x: 1950, variant: 'titan' },
    { x: 2280, variant: 'disgusting' },
    { x: 2320, variant: 'disgusting' },
    { x: 2600, variant: 'crystal' },
    { x: 2700, variant: 'urban' },
    { x: 2745, variant: 'disgusting' },
  ],
  // The horde boss IS the pack: the Pack King charges like a brute and keeps
  // summoning disgusting zombies to swarm you — more and faster when enraged.
  boss: {
    kind: 'walker',
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

// Level 3's parked-but-"moving" train, fought across the roofs. Geometry is
// data (not scene code) so the invariant tests can see it. All x values are
// CENTERS. Roof slab tiles are 32x16, so a roof solid at y spans y-8..y+8:
//   - car roof top surface 372, underside 388 → 88px corridor under the cars
//     (urban body 80px fits; a Zanter at 116px can't follow — comedy)
//   - locomotive roof top surface 348 (climb the loco, step down onto car 1)
//   - every walkable roof is 6 slab tiles = 192px (roofW). The locomotive BODY
//     is 200px wide, so its physical loco→car-1 gap is 18px (can't fall
//     through); between-car gaps are 68px (fall through onto the track,
//     double-jump back out)
export const TRAIN = {
  locomotiveX: 1390,
  locomotiveW: 200, // decoration body width; the walkable roof is roofW
  locoRoofY: 356,
  carXs: [1600, 1860, 2120, 2380],
  carW: 192,
  carRoofY: 380,
  roofW: 192, // walkable roof span (6 x 32px slabs) for loco AND cars
};

const levelThree: LevelDef = {
  sceneKey: 'Level3',
  levelNumber: 3,
  name: 'THE ABANDONED RAILROAD',
  victorySubtitle: 'You stopped the zombie train',
  nextSceneKey: 'Level4',
  keyIndex: 2,
  worldWidth: 3600,
  playerSpawnX: 100,
  ambientColor: 0x5a5048, // rust-dust dusk
  parallax: [
    { key: Assets.RAIL_NIGHT_FAR, factor: 0.12 },
    { key: Assets.RAIL_NIGHT_MID, factor: 0.3 },
    { key: Assets.RAIL_NIGHT_NEAR, factor: 0.55 },
  ],
  textures: {
    groundTop: Assets.RAIL_GROUND_TOP,
    groundFill: Assets.RAIL_GROUND_FILL,
    platform: Assets.TRAIN_CAR_TOP, // floating platforms are detached roof slabs
    stone: Assets.STONE, // ballast stones reuse the city stone
  },
  // Approach + boss-yard platforms — the train (x 1290-2476) is built from TRAIN data
  platforms: [
    [420, 390, 4],
    [850, 330, 5],
    [2700, 380, 4],
  ],
  stairs: [
    [600, 408, 4, 38, 50],
    [2850, 410, 4, 38, 52],
  ],
  // Roof spawns use explicit y = sprite CENTER: the body reaches 64*scale
  // below it (urban base), so y must keep the body bottom above the roof
  // slab top (372) — they drop ~20px onto the roof, close enough that the
  // 16px slab can't be tunneled through
  zombieSpawns: [
    { x: 520, variant: 'zombie' },
    { x: 760, variant: 'urban' },
    { x: 1000, variant: 'zanter' }, // first Zanter guards the train
    // Roof x values sit in the left third of each car: urban patrol legs are
    // 110px (55px/s * 2s), so spawning centered walks them off the right edge
    // in the first leg — from the left third they oscillate on the roof
    { x: 1545, variant: 'urban', y: 290 }, // car 1 roof (urban body bottom 354)
    { x: 1880, variant: 'zanter', y: 255 }, // car 2 roof (zanter body bottom ~348)
    { x: 2065, variant: 'urban', y: 290 }, // car 3 roof
    { x: 2400, variant: 'zanter', y: 255 }, // car 4 roof
    // Final guards before the boss yard. The Zanter sits at 2560, clear of the
    // [2700] platform band and the [2850] staircase — at 2900 its 58x116 body
    // would spawn enclosing the second stair stone (x 2884-2920, y 365-379)
    { x: 2560, variant: 'zanter' },
    { x: 2650, variant: 'zombie' },
    { x: 2760, variant: 'rage' },
  ],
  boss: {
    kind: 'walker',
    name: 'DIRT MUTATED ZOMBIE',
    hp: 340,
    scale: 1.85,
    tint: 0xb08d5a,
    walkSpeed: 95,
    enragedWalkSpeed: 145,
    contactDamage: 22,
    attackIntervalMs: 2100,
    enragedAttackIntervalMs: 1400,
    throneTexture: Assets.THRONE_TRAIN,
    canCharge: true,
    canLeap: true,
  },
  bossSpawnX: 3350,
  triggerX: 3100,
  arenaLeft: 3000,
};

const levelFour: LevelDef = {
  sceneKey: 'Level4',
  levelNumber: 4,
  name: 'THE ZOMBIFIED LAKE',
  victorySubtitle: 'The Sunken Beast sinks for good',
  nextSceneKey: 'Level5',
  keyIndex: 3,
  worldWidth: 3400,
  playerSpawnX: 100,
  ambientColor: 0x14202e,
  parallax: [
    { key: Assets.LAKE_NIGHT_FAR, factor: 0.12 },
    { key: Assets.LAKE_NIGHT_MID, factor: 0.3 },
    { key: Assets.LAKE_NIGHT_NEAR, factor: 0.55 },
  ],
  textures: {
    groundTop: Assets.LAKE_GROUND_TOP,
    groundFill: Assets.LAKE_GROUND_FILL,
    platform: Assets.LAKE_PLATFORM,
    stone: Assets.LAKE_STONE,
  },
  // Broken hulls and stepped debris form wreck bands through the swim route.
  platforms: [
    [650, 360, 5],
    [1100, 260, 6],
    [1600, 390, 5],
    [2100, 300, 6],
    [2550, 380, 4],
    [3000, 340, 5],
  ],
  stairs: [
    [850, 408, 4, 45, 48],
    [1800, 410, 4, 40, 50],
    [2740, 408, 4, 42, 48],
  ],
  // Drowned zombies and power monsters hold their depth instead of resting
  // on the lakebed, so every Level 4 spawn supplies an explicit swim y.
  zombieSpawns: [
    { x: 520, y: 220, variant: 'drowned' },
    { x: 760, y: 300, variant: 'drowned' },
    { x: 980, y: 190, variant: 'drowned' },
    { x: 1320, y: 340, variant: 'drowned' },
    { x: 1450, y: 330, variant: 'crystal' },
    { x: 1500, y: 210, variant: 'drowned' },
    { x: 1850, y: 220, variant: 'drowned' },
    { x: 2050, y: 400, variant: 'drowned' },
    { x: 2350, y: 220, variant: 'drowned' },
    { x: 2380, y: 350, variant: 'titan' },
    { x: 2500, y: 300, variant: 'drowned' },
    { x: 2750, y: 200, variant: 'drowned' },
  ],
  boss: {
    kind: 'kraken',
    name: 'THE SUNKEN BEAST',
    hp: 400,
    scale: 2.0,
    contactDamage: 14,
    tentacles: 3,
    regrowMs: 6000,
    headWindowMs: 2500,
    bubble: { speed: 160, intervalMs: 1800, enragedIntervalMs: 1100, damage: 12 },
    enragedSpreadCount: 3,
  },
  water: {
    surfaceY: 120,
    vents: [
      { x: 400, topY: 440, width: 56 },
      { x: 900, topY: 430, width: 64 },
      { x: 1450, topY: 442, width: 56 },
      { x: 2200, topY: 438, width: 64 },
      { x: 2920, topY: 444, width: 60 },
      { x: 3220, topY: 436, width: 72 },
    ],
    scuba: { x: 2010, y: 300 },
    fishSchools: [
      { x: 900, y: 200, count: 6 },
      { x: 1400, y: 250, count: 8 },
      { x: 2250, y: 200, count: 7 },
      { x: 2700, y: 260, count: 5 },
    ],
    eels: [
      { x: 1220, y: 210 },
      { x: 1980, y: 270 },
      { x: 2040, y: 330 },
      { x: 2620, y: 330 },
      { x: 3100, y: 200 },
    ],
  },
  bossSpawnX: 3260,
  triggerX: 3050,
  arenaLeft: 2860,
};

// Level 5 — THE SUGAR RUSH ZONE. Wes (5) designed it on 2026-09-22: a rotten
// candy world, gummy bear / gumball / chocolate zombies, bouncy marshmallows,
// and the Gummy Worm King, who gets dizzy when you feed him a sour candy.
// Beating him gives key #5 and opens the portal to the underworld.
const levelFive: LevelDef = {
  sceneKey: 'Level5',
  levelNumber: 5,
  name: 'THE SUGAR RUSH ZONE',
  victorySubtitle: 'The portal to the underworld is open',
  nextSceneKey: 'MainMenu',
  keyIndex: 4,
  worldWidth: 3960,
  playerSpawnX: 100,
  // Candy-pink dusk, brighter than the other levels so the candy colors (and
  // the enemies away from the lollipop lights) read on WebGL.
  ambientColor: 0x8a7898,
  parallax: [
    { key: Assets.CANDY_NIGHT_FAR, factor: 0.12 },
    { key: Assets.CANDY_NIGHT_MID, factor: 0.3 },
    { key: Assets.CANDY_NIGHT_NEAR, factor: 0.55 },
  ],
  textures: {
    groundTop: Assets.CANDY_GROUND_TOP,
    groundFill: Assets.CANDY_GROUND_FILL,
    platform: Assets.CANDY_PLATFORM,
    stone: Assets.CANDY_STONE,
  },
  // Wafer bars. The two high bars (y 200 / 190) sit above double-jump height
  // from the ground — a marshmallow next to each one bounces you up there.
  platforms: [
    [400, 380, 4],
    [900, 310, 5],
    [1400, 200, 5],
    [1900, 360, 4],
    [2400, 190, 5],
    [2750, 370, 4],
  ],
  stairs: [
    [640, 408, 4, 38, 50],
    [1700, 410, 4, 40, 48],
  ],
  // Power monsters only — the candy enemies live in `candy.enemies`.
  zombieSpawns: [
    { x: 1620, variant: 'vulture' }, // flight + marshmallows = sky high
    { x: 2250, variant: 'rage' }, // clear of the x=2330 marshmallow
  ],
  candy: {
    marshmallows: [
      { x: 820, y: 448 },
      { x: 1330, y: 448 },
      { x: 2080, y: 448 },
      { x: 2330, y: 448 },
      { x: 3240, y: 448 }, // in the arena: hop over the King's pop-ups
    ],
    enemies: [
      { kind: 'gummy', x: 520 },
      { kind: 'gumball', x: 760 },
      { kind: 'gummy', x: 1000 },
      { kind: 'chocolate', x: 1180 },
      { kind: 'gumball', x: 1480 },
      { kind: 'gummy', x: 1780 },
      { kind: 'gummy', x: 1830 },
      { kind: 'chocolate', x: 1990 },
      { kind: 'gumball', x: 2200 },
      { kind: 'gummy', x: 2520 },
      { kind: 'chocolate', x: 2620 },
      { kind: 'gumball', x: 2900 },
    ],
  },
  boss: {
    kind: 'worm',
    name: 'GUMMY WORM KING',
    hp: 300,
    scale: 1.6,
    contactDamage: 16,
    burrowSpeed: 150,
    enragedBurrowSpeed: 230,
    underMs: 1800,
    enragedUnderMs: 1200,
    shakeMs: 1100,
    enragedShakeMs: 700,
    popMs: 450,
    exposedMs: 5200,
    mouthOpenMs: 1300,
    mouthClosedMs: 700,
    chompMs: 250,
    dizzyMs: 3500,
    digMs: 500,
    chipDamageRatio: 0.25,
    dizzyDamageMultiplier: 1.5,
    candyKnockCooldownMs: 1500,
    summon: { count: 2, maxAlive: 4, intervalMs: 7000 },
  },
  // The arena is a full screen wide (960px), so the locked camera never shows
  // past the end of the world, and the King has room to dig around.
  portal: { x: 3800 },
  bossSpawnX: 3620,
  triggerX: 3100,
  arenaLeft: 3000,
};

export const LEVELS: LevelDef[] = [levelOne, levelTwo, levelThree, levelFour, levelFive];

export function levelByNumber(n: number): LevelDef {
  if (!Number.isFinite(n)) n = 1;
  return LEVELS[Math.min(Math.max(Math.floor(n), 1), LEVELS.length) - 1];
}

// `?level=N` skip-to-level shortcut. Returns null unless N is a built level.
export function levelFromQuery(search: string): number | null {
  const raw = new URLSearchParams(search).get('level');
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= LEVELS.length ? n : null;
}
