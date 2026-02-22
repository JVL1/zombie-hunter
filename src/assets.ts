// Centralized asset keys — single source of truth
export const Assets = {
  // Player sprite sheet (single sheet, 80x64 frames, all animations in rows)
  PLAYER_SHEET: 'player-sheet',
  PLAYER_SWORD: 'player-sword',

  // Zombie Man sprite sheets (96x96 frames, separate sheet per animation)
  ZOMBIE_IDLE: 'zombie-idle',
  ZOMBIE_WALK: 'zombie-walk',
  ZOMBIE_ATTACK: 'zombie-attack',
  ZOMBIE_HURT: 'zombie-hurt',
  ZOMBIE_DEAD: 'zombie-dead',

  // Urban Zombie sprite sheets (128x128 frames, separate sheet per animation)
  URBAN_ZOMBIE_IDLE: 'urban-zombie-idle',
  URBAN_ZOMBIE_WALK: 'urban-zombie-walk',
  URBAN_ZOMBIE_ATTACK: 'urban-zombie-attack',
  URBAN_ZOMBIE_HURT: 'urban-zombie-hurt',
  URBAN_ZOMBIE_DEAD: 'urban-zombie-dead',

  // Boss (reuses urban zombie at larger scale for now)
  BOSS_IDLE: 'urban-zombie-idle',
  BOSS_WALK: 'urban-zombie-walk',
  BOSS_ATTACK: 'urban-zombie-attack',
  BOSS_HURT: 'urban-zombie-hurt',
  BOSS_DEAD: 'urban-zombie-dead',

  // Environment
  CITY_FLOOR_TILES: 'city-floor-tiles',
  CITY_BUILDING_TILES: 'city-building-tiles',
  CITY_DECORATION_TILES: 'city-decoration-tiles',
  CITY_BG_SKY: 'city-bg-sky',
  CITY_BG_LAYER1: 'city-bg-layer1',
  CITY_BG_LAYER2: 'city-bg-layer2',
  CITY_RUIN_BG_1: 'city-ruin-bg-1',
  CITY_RUIN_BG_2: 'city-ruin-bg-2',
  CITY_RUIN_BG_3: 'city-ruin-bg-3',
  CITY_RUIN_BG_4: 'city-ruin-bg-4',

  // Items (keep generated for now)
  COIN: 'coin',
  KEY: 'key',
  SWORD_HITBOX: 'sword-hitbox',
  THRONE: 'throne',

  // Particles (keep generated — tiny colored squares)
  BLOOD: 'blood',
  SKIN: 'skin',
  BRAIN: 'brain',

  // Tiles (keep generated for ground/platform until tilemap is built)
  GROUND_TILE: 'ground-tile',
  PLATFORM_TILE: 'platform-tile',

  // Audio (no files yet)
  SWORD_SWING: 'sword-swing',
  ZOMBIE_GROAN: 'zombie-groan',
  COIN_PICKUP: 'coin-pickup',
  SPLAT: 'splat',
} as const;

// Player animation frame layout (single 800x448 sheet, 80x64 frames, 10 cols x 7 rows)
// Row 0: Idle (5 frames: 0-4)
// Row 1: Walk (8 frames: 10-17)
// Row 2: Run (8 frames: 20-27)
// Row 3: Jump (4 frames: 30-33)
// Row 4: Fall (4 frames: 40-43)
// Row 5: Attack (6 frames: 50-55)
// Row 6: Death (10 frames: 60-69)
export const PlayerAnims = {
  IDLE: { key: 'player-idle', start: 0, end: 4, frameRate: 8, repeat: -1 },
  WALK: { key: 'player-walk', start: 10, end: 17, frameRate: 10, repeat: -1 },
  RUN: { key: 'player-run', start: 20, end: 27, frameRate: 12, repeat: -1 },
  JUMP: { key: 'player-jump', start: 30, end: 33, frameRate: 10, repeat: 0 },
  FALL: { key: 'player-fall', start: 40, end: 43, frameRate: 10, repeat: 0 },
  ATTACK: { key: 'player-attack', start: 50, end: 55, frameRate: 15, repeat: 0 },
  DEATH: { key: 'player-death', start: 60, end: 69, frameRate: 8, repeat: 0 },
} as const;
