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

export const ZombieAnims: Record<'zombie' | 'urban', ZombieAnimSet> = {
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
};
