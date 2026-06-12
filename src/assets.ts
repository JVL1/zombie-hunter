// Centralized asset keys — single source of truth.

export const Assets = {
  // Player (single 800x448 sheet, 80x64 frames, 10 cols x 7 rows)
  PLAYER_SHEET: 'player-sheet',
  PLAYER_SWORD: 'player-sword',

  // Zombie Man (96x96 frames, separate sheet per animation)
  ZOMBIE_IDLE: 'zombie-idle-sheet',
  ZOMBIE_WALK: 'zombie-walk-sheet',
  ZOMBIE_ATTACK: 'zombie-attack-sheet',
  ZOMBIE_HURT: 'zombie-hurt-sheet',
  ZOMBIE_DEAD: 'zombie-dead-sheet',

  // Urban Zombie (128x128 frames, separate sheet per animation)
  URBAN_IDLE: 'urban-idle-sheet',
  URBAN_WALK: 'urban-walk-sheet',
  URBAN_ATTACK: 'urban-attack-sheet',
  URBAN_HURT: 'urban-hurt-sheet',
  URBAN_DEAD: 'urban-dead-sheet',

  // Parallax ruin layers (pale art — pre-tinted into night palette at load)
  RUIN_BG_2: 'ruin-bg-2',
  RUIN_BG_3: 'ruin-bg-3',
  RUIN_BG_4: 'ruin-bg-4',
  RUIN_NIGHT_FAR: 'ruin-night-far',
  RUIN_NIGHT_MID: 'ruin-night-mid',
  RUIN_NIGHT_NEAR: 'ruin-night-near',

  // Generated textures (built in PreloadScene)
  SKY: 'gen-sky',
  MOON: 'gen-moon',
  GROUND_TOP: 'gen-ground-top',
  GROUND_FILL: 'gen-ground-fill',
  PLATFORM: 'gen-platform',
  STONE: 'gen-stone',
  BARREL: 'gen-barrel',
  LAMPPOST: 'gen-lamppost',
  THRONE: 'gen-throne',
  COIN: 'gen-coin',
  HEART: 'gen-heart',
  KEY: 'gen-key',
  RING: 'gen-ring',
  FOG: 'gen-fog',
  PIXEL: 'gen-pixel',
  GLOW: 'gen-glow',
  P_BLOOD: 'p-blood',
  P_SKIN: 'p-skin',
  P_BRAIN: 'p-brain',
  P_DUST: 'p-dust',
  P_EMBER: 'p-ember',
  P_RAIN: 'p-rain',
  P_SPARK: 'p-spark',
  DECAL_1: 'decal-1',
  DECAL_2: 'decal-2',
  DECAL_3: 'decal-3',

  // Forest (Level 2) — baked parallax + generated tiles/props
  FOREST_NIGHT_FAR: 'forest-night-far',
  FOREST_NIGHT_MID: 'forest-night-mid',
  FOREST_NIGHT_NEAR: 'forest-night-near',
  FOREST_GROUND_TOP: 'gen-forest-ground-top',
  FOREST_GROUND_FILL: 'gen-forest-ground-fill',
  LOG_PLATFORM: 'gen-log-platform',
  STUMP_STONE: 'gen-stump-stone',
  DEAD_TREE: 'gen-dead-tree',
  THRONE_TREE: 'gen-throne-tree',
  P_FIREFLY: 'p-firefly',
  MOONBEAM: 'gen-moonbeam',

  // Railroad (Level 3) — baked parallax + generated tiles/props
  RAIL_NIGHT_FAR: 'rail-night-far',
  RAIL_NIGHT_MID: 'rail-night-mid',
  RAIL_NIGHT_NEAR: 'rail-night-near',
  RAIL_GROUND_TOP: 'gen-rail-ground-top',
  RAIL_GROUND_FILL: 'gen-rail-ground-fill',
  TRAIN_CAR: 'gen-train-car',
  TRAIN_CAR_TOP: 'gen-train-car-top',
  LOCOMOTIVE: 'gen-locomotive',
  SIGNAL_LAMP: 'gen-signal-lamp',
  THRONE_TRAIN: 'gen-throne-train',
  P_SMOKE: 'p-smoke',
  P_SPEEDLINE: 'p-speedline',

  // Shop (between-levels hub) — generated props + HUD consumable icons
  SHOP_ANVIL: 'gen-shop-anvil',
  SHOP_SHACK: 'gen-shop-shack',
  SHOP_COUNTER: 'gen-shop-counter',
  SHOP_ICON_POTION: 'gen-shop-icon-potion',
  SHOP_ICON_SHIELD: 'gen-shop-icon-shield',
  SHOP_ICON_LIFE: 'gen-shop-icon-life',
} as const;

// Player sheet rows (10 cols): 0 idle(5) 1 walk(8) 2 run(8) 3 jump(4) 4 fall(4) 5 attack(6) 6 death(10)
export const PlayerAnims = {
  IDLE: { key: 'player-idle', start: 0, end: 4, frameRate: 8, repeat: -1 },
  WALK: { key: 'player-walk', start: 10, end: 17, frameRate: 10, repeat: -1 },
  RUN: { key: 'player-run', start: 20, end: 27, frameRate: 14, repeat: -1 },
  JUMP: { key: 'player-jump', start: 30, end: 33, frameRate: 10, repeat: 0 },
  FALL: { key: 'player-fall', start: 40, end: 43, frameRate: 10, repeat: 0 },
  ATTACK: { key: 'player-attack', start: 50, end: 55, frameRate: 18, repeat: 0 },
  DEATH: { key: 'player-death', start: 60, end: 69, frameRate: 8, repeat: 0 },
} as const;

export interface ZombieAnimSet {
  idle: string;
  walk: string;
  attack: string;
  hurt: string;
  dead: string;
}

// Anim-set keys: base sprite families plus the baked power-monster variants.
// Keep this a closed union — Zombie picks sets by key, no record widening.
export type ZombieAnimSetKey =
  | 'zombie'
  | 'urban'
  | 'pm-vulture'
  | 'pm-rage'
  | 'pm-titan'
  | 'pm-crystal';

export const ZombieAnims: Record<ZombieAnimSetKey, ZombieAnimSet> = {
  zombie: {
    idle: 'zombie-idle',
    walk: 'zombie-walk',
    attack: 'zombie-attack',
    hurt: 'zombie-hurt',
    dead: 'zombie-dead',
  },
  urban: {
    idle: 'urban-idle',
    walk: 'urban-walk',
    attack: 'urban-attack',
    hurt: 'urban-hurt',
    dead: 'urban-dead',
  },
  'pm-vulture': {
    idle: 'pm-vulture-idle',
    walk: 'pm-vulture-walk',
    attack: 'pm-vulture-attack',
    hurt: 'pm-vulture-hurt',
    dead: 'pm-vulture-dead',
  },
  'pm-rage': {
    idle: 'pm-rage-idle',
    walk: 'pm-rage-walk',
    attack: 'pm-rage-attack',
    hurt: 'pm-rage-hurt',
    dead: 'pm-rage-dead',
  },
  'pm-titan': {
    idle: 'pm-titan-idle',
    walk: 'pm-titan-walk',
    attack: 'pm-titan-attack',
    hurt: 'pm-titan-hurt',
    dead: 'pm-titan-dead',
  },
  'pm-crystal': {
    idle: 'pm-crystal-idle',
    walk: 'pm-crystal-walk',
    attack: 'pm-crystal-attack',
    hurt: 'pm-crystal-hurt',
    dead: 'pm-crystal-dead',
  },
};
