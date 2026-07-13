import Phaser from 'phaser';
import { Assets, ScubaHudFrames } from '../assets';
import { COMBAT, GAME_H, GAME_W, POWERUPS, type PowerUpType } from '../config';
import { GameState } from '../core/GameState';
import { SynthAudio } from '../core/SynthAudio';

type BuffHudSlot = {
  type: PowerUpType;
  container: Phaser.GameObjects.Container;
  bar: Phaser.GameObjects.Rectangle;
};

// Per-frame air snapshot published to the registry by water levels only
// (BaseLevelScene sets 'airHud'; Levels 1-3 never do). See Task 15.
type AirHudSnapshot = {
  airMs: number;
  maxAirMs: number;
  scubaDurability: number;
  warned: boolean;
  drowning: boolean;
};

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
  private consumableRow!: Phaser.GameObjects.Container;
  private consumableCounts: Phaser.GameObjects.Text[] = [];
  private lastConsumableCounts = [-1, -1, -1];
  private consumablesShown = false;
  private buffSlots: BuffHudSlot[] = [];
  private comboText!: Phaser.GameObjects.Text;
  private comboBar!: Phaser.GameObjects.Rectangle;

  // Air UI (water levels only). Created hidden; shown while the 'airHud'
  // registry key exists.
  private airPanel!: Phaser.GameObjects.Rectangle;
  private airBarBg!: Phaser.GameObjects.Rectangle;
  private airFill!: Phaser.GameObjects.Rectangle;
  private scubaIcon!: Phaser.GameObjects.Image;
  private airWarnText!: Phaser.GameObjects.Text;
  private drownOverlay!: Phaser.GameObjects.Rectangle;
  private drownTween?: Phaser.Tweens.Tween;
  private drowning = false;

  constructor() {
    super({ key: 'HUD' });
  }

  create() {
    this.displayedHealth = this.gameState.health;
    this.ghostHealth = this.gameState.health;
    this.lastCoins = -1;
    this.keyIcons = [];
    this.consumableCounts = [];
    this.lastConsumableCounts = [-1, -1, -1];
    this.consumablesShown = false;
    this.buffSlots = [];
    this.drowning = false;
    this.drownTween = undefined;

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

    // Consumables row (latches visible once any consumable appears this scene)
    const countStyle = {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    };
    this.consumableRow = this.add.container(0, 0);
    this.consumableRow.add(this.add.rectangle(14, 92, 246, 24, 0x000000, 0.45).setOrigin(0));

    const consumableSlots = [
      { icon: Assets.SHOP_ICON_POTION, x: 32, color: '#ff7788' },
      { icon: Assets.SHOP_ICON_SHIELD, x: 106, color: '#bbddff' },
      { icon: Assets.SHOP_ICON_LIFE, x: 180, color: '#ffdd55' },
    ];
    consumableSlots.forEach(({ icon, x, color }) => {
      this.consumableRow.add(this.add.image(x, 104, icon).setScale(1.3));
      const text = this.add
        .text(x + 14, 104, '0', { ...countStyle, color })
        .setOrigin(0, 0.5);
      this.consumableCounts.push(text);
      this.consumableRow.add(text);
    });
    this.consumableRow.setVisible(false);

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

    // Air UI (water levels only) — dark panel beside the buff row, a scuba
    // crack icon, a draining blue→red bar, and a blinking low-air warning.
    // All start hidden; update() reveals them only when 'airHud' exists.
    this.airPanel = this.add
      .rectangle(270, 14, 210, 40, 0x000000, 0.45)
      .setOrigin(0)
      .setVisible(false);
    this.scubaIcon = this.add
      .image(290, 34, ScubaHudFrames[0])
      .setScale(1.1)
      .setVisible(false);
    this.airBarBg = this.add
      .rectangle(312, 34, 156, 14, 0x1a1a1a)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x000000)
      .setVisible(false);
    this.airFill = this.add
      .rectangle(314, 34, 152, 8, 0x33aaff)
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.airWarnText = this.add
      .text(270, 58, 'GO UP TO BREATHE!', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ff5555',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setVisible(false);

    // Screen-space red drowning pulse — plain alpha tween, Canvas-safe
    // (NOT camera.postFX, which is WebGL-only).
    this.drownOverlay = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0xff0000, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1000)
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

    const currentCounts = [
      this.gameState.potions,
      this.gameState.shieldHits,
      this.gameState.lives,
    ];
    if (!this.consumablesShown && currentCounts.some((count) => count > 0)) {
      this.consumablesShown = true;
      this.consumableRow.setVisible(true);
    }
    currentCounts.forEach((count, i) => {
      if (count !== this.lastConsumableCounts[i]) {
        this.consumableCounts[i].setText(`${count}`);
        this.lastConsumableCounts[i] = count;
      }
    });

    const now = this.time.now;
    const activeBuffs = this.gameState.activeBuffList(now);
    // Rebuild only on real transitions; after a rebuild, buffSlots mirrors
    // activeBuffs index-for-index, so the drain pass is a plain zip
    let buffsChanged = activeBuffs.length !== this.buffSlots.length;
    for (let i = 0; !buffsChanged && i < activeBuffs.length; i++) {
      if (activeBuffs[i].type !== this.buffSlots[i].type) buffsChanged = true;
    }
    if (buffsChanged) this.rebuildBuffSlots(activeBuffs);
    this.buffSlots.forEach((slot, i) => {
      const remaining = Phaser.Math.Clamp(
        (activeBuffs[i].expiresAt - now) / POWERUPS[slot.type].durationMs,
        0,
        1
      );
      slot.bar.width = 30 * remaining;
    });

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

    this.updateAirHud(time);
  }

  // Air bar + scuba icon + drowning FX. Renders NOTHING and plays no
  // heartbeat unless the current level published an 'airHud' snapshot
  // (Levels 1-3 never do, so this is fully inert there).
  private updateAirHud(time: number) {
    const snap = this.registry.get('airHud') as AirHudSnapshot | undefined;
    if (!snap) {
      // No snapshot this frame (Levels 1-3, or a future caller that stops
      // publishing mid-level) — hide the whole air UI so nothing strands with
      // stale values, and clear any drowning FX.
      if (this.drowning) this.setDrowning(false);
      this.airPanel.setVisible(false);
      this.airBarBg.setVisible(false);
      this.airFill.setVisible(false);
      this.scubaIcon.setVisible(false);
      this.airWarnText.setVisible(false);
      return;
    }

    const ratio = Phaser.Math.Clamp(snap.airMs / snap.maxAirMs, 0, 1);
    this.airPanel.setVisible(true);
    this.airBarBg.setVisible(true);
    this.airFill.setVisible(true);
    this.airFill.width = 152 * ratio;
    this.airFill.fillColor = snap.warned
      ? 0xff3333
      : ratio > 0.5
        ? 0x33aaff
        : 0xffaa33;

    // Scuba crack icon: fewer durability = more cracks (frame 5 - durability);
    // 0 durability = no scuba worn, so hide it.
    if (snap.scubaDurability > 0) {
      const idx = Phaser.Math.Clamp(5 - snap.scubaDurability, 0, 4);
      this.scubaIcon.setTexture(ScubaHudFrames[idx]).setVisible(true);
    } else {
      this.scubaIcon.setVisible(false);
    }

    // Blink the warning below the warn threshold.
    this.airWarnText.setVisible(snap.warned && Math.floor(time / 300) % 2 === 0);

    // Drowning: red screen pulse + heartbeat (rate-limited in SynthAudio).
    if (snap.drowning !== this.drowning) this.setDrowning(snap.drowning);
    if (snap.drowning) SynthAudio.heartbeat();
  }

  private setDrowning(on: boolean) {
    this.drowning = on;
    // Never stack overlay tweens — drop any prior one before (re)deciding.
    this.drownTween?.remove();
    this.drownTween = undefined;
    if (on) {
      this.drownOverlay.setVisible(true);
      this.drownTween = this.tweens.add({
        targets: this.drownOverlay,
        alpha: { from: 0.08, to: 0.34 },
        duration: 460,
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.drownOverlay.setVisible(false).setAlpha(0);
    }
  }

  private rebuildBuffSlots(activeBuffs: { type: PowerUpType; expiresAt: number }[]) {
    this.buffSlots.forEach(({ container }) => container.destroy());
    this.buffSlots = activeBuffs.map(({ type }, i) => {
      const x = 274 + i * 54;
      const container = this.add.container(x, 104);
      container.add(this.add.rectangle(0, 0, 14, 14, POWERUPS[type].color).setOrigin(0, 0.5));
      container.add(this.add.rectangle(20, 0, 30, 4, 0x111111, 0.85).setOrigin(0, 0.5));
      const bar = this.add
        .rectangle(20, 0, 30, 4, POWERUPS[type].color)
        .setOrigin(0, 0.5);
      container.add(bar);
      return { type, container, bar };
    });
  }
}
