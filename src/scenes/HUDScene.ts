import Phaser from 'phaser';
import { GameState } from '../systems/GameState';

export class HUDScene extends Phaser.Scene {
  private healthBar!: Phaser.GameObjects.Rectangle;
  private healthBarBg!: Phaser.GameObjects.Rectangle;
  private coinText!: Phaser.GameObjects.Text;
  private keySlots: Phaser.GameObjects.Rectangle[] = [];
  private gameState = GameState.getInstance();

  constructor() {
    super({ key: 'HUD' });
  }

  create() {
    // Health bar background
    this.healthBarBg = this.add.rectangle(120, 30, 200, 20, 0x333333);
    this.healthBarBg.setOrigin(0, 0.5);
    this.add.text(20, 30, 'HP', {
      fontSize: '16px',
      color: '#ff0000',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // Health bar fill
    this.healthBar = this.add.rectangle(120, 30, 200, 20, 0xcc0000);
    this.healthBar.setOrigin(0, 0.5);

    // Coin counter
    this.add.rectangle(26, 60, 12, 12, 0xf1c40f); // coin icon
    this.coinText = this.add.text(40, 60, '0', {
      fontSize: '16px',
      color: '#f1c40f',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    // Key slots (5 empty slots)
    for (let i = 0; i < 5; i++) {
      const slot = this.add.rectangle(650 + i * 30, 30, 20, 28, 0x333333);
      slot.setStrokeStyle(2, 0xffd700);
      this.keySlots.push(slot);
    }

    this.add.text(600, 30, 'KEYS', {
      fontSize: '12px',
      color: '#ffd700',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
  }

  update() {
    // Update health bar width
    const healthPercent = this.gameState.health / this.gameState.maxHealth;
    this.healthBar.setSize(200 * healthPercent, 20);

    // Update coin text
    this.coinText.setText(this.gameState.coins.toString());

    // Update key slots
    for (let i = 0; i < 5; i++) {
      this.keySlots[i].setFillStyle(
        this.gameState.keys[i] ? 0xffd700 : 0x333333
      );
    }
  }
}
