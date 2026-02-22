// Centralized asset keys — single source of truth
export const Assets = {
  // Sprites
  PLAYER: 'player',
  ZOMBIE: 'zombie',
  BOSS: 'boss',
  SWORD_HITBOX: 'sword-hitbox',
  COIN: 'coin',
  KEY: 'key',
  THRONE: 'throne',

  // Tiles
  CITY_TILESET: 'city-tileset',
  LEVEL1_MAP: 'level1-map',

  // Particles
  BLOOD: 'blood',
  SKIN: 'skin',
  BRAIN: 'brain',

  // Audio
  SWORD_SWING: 'sword-swing',
  ZOMBIE_GROAN: 'zombie-groan',
  COIN_PICKUP: 'coin-pickup',
  SPLAT: 'splat',
} as const;
