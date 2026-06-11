import Phaser from 'phaser';
import { Assets } from '../assets';
import { COMBAT, GAME_W } from '../config';
import { GameState } from '../core/GameState';

// Overlay UI: health bar with damage ghost, coins, key slots, combo meter.
export class HUDScene extends Phaser.Scene {
  private gameState = GameState.getInstance();
  private displayedHealth = 100;
  private ghostHealth = 100;

  private healthFill!: Phaser.GameObjects.Rectangle;
  private healthGhost!: Phaser.GameObjects.Rectangle;
  private coinText!: Phaser.GameObjects.Text;
  private lastCoins = -1;
  private keyIcons: Phaser.GameObjects.Image[] = [];
  private comboText!: Phaser.GameObjects.Text;
  private comboBar!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'HUD' });
  }

  create() {
    this.displayedHealth = this.gameState.health;
    this.ghostHealth = this.gameState.health;
    this.lastCoins = -1;
    this.keyIcons = [];

    // Panel
    this.add.rectangle(14, 14, 246, 74, 0x000000, 0.45).setOrigin(0);

    // Health
    this.add.image(32, 34, Assets.HEART).setScale(1.3);
    this.add.rectangle(48, 34, 184, 16, 0x1a1a1a).setOrigin(0, 0.5).setStrokeStyle(1, 0x000000);
    this.healthGhost = this.add.rectangle(50, 34, 180, 10, 0xffeeee).setOrigin(0, 0.5);
    this.healthFill = this.add.rectangle(50, 34, 180, 10, 0x44dd44).setOrigin(0, 0.5);

    // Coins
    this.add.image(32, 62, Assets.COIN).setScale(1.2);
    this.coinText = this.add.text(46, 54, '0', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffd700',
      fontStyle: 'bold',
    });

    // Key slots
    for (let i = 0; i < 5; i++) {
      const x = 136 + i * 24;
      this.add.rectangle(x, 62, 20, 26, 0x111111, 0.8).setStrokeStyle(1, 0x665522);
      this.keyIcons.push(this.add.image(x, 62, Assets.KEY).setScale(0.6).setVisible(false));
    }

    // Combo meter (hidden until streak >= 2)
    this.comboText = this.add
      .text(GAME_W / 2, 92, '', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ff8833',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.comboBar = this.add
      .rectangle(GAME_W / 2, 110, 120, 5, 0xff8833)
      .setOrigin(0.5)
      .setVisible(false);

    // Controls hint, fades away
    const hint = this.add.text(
      14,
      512,
      '←→ move   ↑/SPACE jump (x2)   A/J attack   SHIFT dash   attack while falling = SLAM',
      { fontFamily: 'monospace', fontSize: '12px', color: '#aaaabc' }
    );
    this.tweens.add({ targets: hint, alpha: 0, delay: 9000, duration: 1500 });
  }

  update(time: number) {
    // Smooth health drain with a pale "ghost" trail showing recent damage
    this.displayedHealth = Phaser.Math.Linear(this.displayedHealth, this.gameState.health, 0.25);
    this.ghostHealth = Phaser.Math.Linear(this.ghostHealth, this.gameState.health, 0.06);
    const pct = Phaser.Math.Clamp(this.displayedHealth / this.gameState.maxHealth, 0, 1);
    const ghostPct = Phaser.Math.Clamp(this.ghostHealth / this.gameState.maxHealth, 0, 1);
    this.healthFill.width = 180 * pct;
    this.healthGhost.width = 180 * Math.max(ghostPct, pct);
    this.healthFill.fillColor = pct > 0.5 ? 0x44dd44 : pct > 0.25 ? 0xdddd44 : 0xdd3333;

    if (this.gameState.coins !== this.lastCoins) {
      this.coinText.setText(`${this.gameState.coins}`);
      if (this.lastCoins >= 0) {
        this.tweens.add({ targets: this.coinText, scale: 1.3, duration: 80, yoyo: true });
      }
      this.lastCoins = this.gameState.coins;
    }

    this.gameState.keys.forEach((has, i) => this.keyIcons[i].setVisible(has));

    const streak = this.gameState.currentStreak(time);
    if (streak >= 2) {
      const remaining = Phaser.Math.Clamp(
        (this.gameState.streakExpiresAt - time) / COMBAT.streakWindowMs,
        0,
        1
      );
      this.comboText.setText(`COMBO x${streak}`).setVisible(true);
      this.comboText.setScale(1 + Math.min(streak, 8) * 0.04);
      this.comboBar.setVisible(true).width = 120 * remaining;
    } else {
      this.comboText.setVisible(false);
      this.comboBar.setVisible(false);
    }
  }
}
