export class GameState {
  private static instance: GameState;

  health = 100;
  maxHealth = 100;
  coins = 0;
  keys: boolean[] = [false, false, false, false, false];
  currentSword = 'Rusty Blade';
  swordDamage = 10;
  currentLevel = 1;

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  reset() {
    this.health = 100;
    this.coins = 0;
    this.keys = [false, false, false, false, false];
    this.currentSword = 'Rusty Blade';
    this.swordDamage = 10;
    this.currentLevel = 1;
  }

  collectKey(index: number) {
    this.keys[index] = true;
  }

  get keyCount(): number {
    return this.keys.filter(Boolean).length;
  }
}
