import Phaser from 'phaser';
import { Assets } from '../assets';
import { CONSUMABLES, GAME_H, GAME_W, SWORDS, type ConsumableKind } from '../config';
import { GameState } from '../core/GameState';
import { InputController } from '../core/InputController';
import { SynthAudio } from '../core/SynthAudio';
import { floatText, lit } from '../fx/Effects';

// Between-levels shop hub: Blacksmith (sword tiers) on the left, the
// Apocalypse consumables shack on the right. Arrows navigate, A/J/ENTER buys,
// HEAD OUT launches GameState.currentLevelDef.sceneKey. Jump keys do nothing
// here — ↑ is menu-up only.

const BLACKSMITH_X = 250;
const APOCALYPSE_X = 710;
const PANEL_W = 380;
const ROWS_TOP = 240;
const SWORD_ROW_H = 34;
const CONSUMABLE_ROW_H = 46;
const HEAD_OUT_Y = 478;
const CONSUMABLE_KINDS: ConsumableKind[] = ['potion', 'shield', 'life'];
const CONSUMABLE_ICONS: Record<ConsumableKind, string> = {
  potion: Assets.SHOP_ICON_POTION,
  shield: Assets.SHOP_ICON_SHIELD,
  life: Assets.SHOP_ICON_LIFE,
};

export class ShopScene extends Phaser.Scene {
  private controls!: InputController;
  private focus: 0 | 1 = 0; // 0 = Blacksmith, 1 = Apocalypse
  private sel = 0;
  private exiting = false;
  private openedAt = 0; // swallow confirm presses carried over from Victory
  private coinsText!: Phaser.GameObjects.Text;
  private titles: Phaser.GameObjects.Text[] = [];
  private swordRows: Phaser.GameObjects.Text[] = [];
  private consumableRows: Phaser.GameObjects.Text[] = [];
  private headOutText!: Phaser.GameObjects.Text;
  private highlight!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'Shop' });
  }

  create() {
    const gs = GameState.getInstance();
    this.exiting = false;
    this.focus = 0;
    // Open on the next buyable sword; if all owned this lands on HEAD OUT
    this.sel = Math.min(gs.swordIndex + 1, SWORDS.length);
    this.openedAt = this.time.now;
    this.controls = new InputController(this);

    this.buildBackdrop();

    // Header: title + live coin purse
    this.add
      .text(GAME_W / 2, 38, 'THE SHOP', {
        fontFamily: 'monospace',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#ffd700',
        stroke: '#3a2a00',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.add.image(GAME_W / 2 - 60, 78, Assets.COIN).setScale(1.6);
    this.coinsText = this.add
      .text(GAME_W / 2 - 44, 78, '', {
        fontFamily: 'monospace',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5);

    this.buildCounters();

    // Blacksmith rows (all 5 sword tiers)
    this.swordRows = SWORDS.map((_, i) =>
      this.add
        .text(BLACKSMITH_X - PANEL_W / 2 + 20, ROWS_TOP + i * SWORD_ROW_H, '', {
          fontFamily: 'monospace',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#ddddcc',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0, 0.5)
    );

    // Apocalypse rows (3 consumables, with HUD icons)
    this.consumableRows = CONSUMABLE_KINDS.map((kind, i) => {
      const y = ROWS_TOP + i * CONSUMABLE_ROW_H;
      this.add.image(APOCALYPSE_X - PANEL_W / 2 + 28, y, CONSUMABLE_ICONS[kind]).setScale(2);
      return this.add
        .text(APOCALYPSE_X - PANEL_W / 2 + 48, y, '', {
          fontFamily: 'monospace',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#ddddcc',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0, 0.5);
    });

    this.headOutText = this.add
      .text(GAME_W / 2, HEAD_OUT_Y, `HEAD OUT → ${gs.currentLevelDef.name}`, {
        fontFamily: 'monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#eeeedd',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_W / 2, 518, '←→ counters      ↑↓ select      A / J / ENTER buy', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#8888a0',
      })
      .setOrigin(0.5);

    // Selection highlight (repositioned in refresh)
    this.highlight = this.add
      .rectangle(0, 0, PANEL_W, 28, 0xffffff, 0.07)
      .setStrokeStyle(2, 0xffd700)
      .setDepth(5);

    this.refresh();
  }

  update() {
    this.controls.update();
    if (this.exiting) return;
    const c = this.controls;

    if (c.leftJustPressed || c.rightJustPressed) {
      this.focus = this.focus === 0 ? 1 : 0;
      // Clamping maps HEAD OUT to HEAD OUT (it's the last item of both lists)
      this.sel = Math.min(this.sel, this.listLen() - 1);
      SynthAudio.uiSelect();
      this.refresh();
    }
    if (c.upJustPressed) {
      this.sel = (this.sel + this.listLen() - 1) % this.listLen();
      SynthAudio.uiSelect();
      this.refresh();
    }
    if (c.downJustPressed) {
      this.sel = (this.sel + 1) % this.listLen();
      SynthAudio.uiSelect();
      this.refresh();
    }
    // Grace window: ENTER/A may still be held from the Victory screen
    if (c.confirmJustPressed && this.time.now - this.openedAt > 300) {
      this.confirm();
    }
  }

  private listLen(): number {
    return (this.focus === 0 ? SWORDS.length : CONSUMABLE_KINDS.length) + 1; // + HEAD OUT
  }

  private isHeadOut(): boolean {
    return this.sel === this.listLen() - 1;
  }

  private selectedRowPos(): { x: number; y: number } {
    if (this.isHeadOut()) return { x: GAME_W / 2, y: HEAD_OUT_Y };
    const x = this.focus === 0 ? BLACKSMITH_X : APOCALYPSE_X;
    const rowH = this.focus === 0 ? SWORD_ROW_H : CONSUMABLE_ROW_H;
    return { x, y: ROWS_TOP + this.sel * rowH };
  }

  private confirm() {
    if (this.isHeadOut()) {
      this.headOut();
      return;
    }
    const gs = GameState.getInstance();
    const { x, y } = this.selectedRowPos();
    let ok = false;
    let cost = 0;
    let failReason = 'not enough coins!';

    if (this.focus === 0) {
      cost = SWORDS[this.sel].cost;
      if (this.sel <= gs.swordIndex) {
        failReason = 'already owned!';
      } else if (this.sel > gs.swordIndex + 1) {
        failReason = 'one tier at a time!';
      } else {
        ok = gs.buySword();
      }
    } else {
      const kind = CONSUMABLE_KINDS[this.sel];
      const item = CONSUMABLES[kind];
      cost = item.cost;
      const atCap =
        kind === 'shield'
          ? gs.shieldHits !== 0
          : (kind === 'potion' ? gs.potions : gs.lives) >= item.cap;
      if (atCap) {
        failReason = kind === 'shield' ? 'shield still active!' : 'full!';
      } else {
        ok = gs.buyConsumable(kind);
      }
    }

    if (ok) {
      SynthAudio.coin();
      floatText(this, x, y - 12, `-${cost} coins`, '#ffd700', 15);
      this.rowFlash(x, y, 0xffffff);
    } else {
      SynthAudio.hurt();
      floatText(this, x, y - 12, failReason, '#ff5555', 14);
      this.rowFlash(x, y, 0xff2222);
      this.cameras.main.shake(110, 0.004);
    }
    this.refresh();
  }

  private rowFlash(x: number, y: number, color: number) {
    const w = this.isHeadOut() ? 320 : PANEL_W;
    const r = this.add.rectangle(x, y, w, 30, color, 0.4).setDepth(25);
    this.tweens.add({ targets: r, alpha: 0, duration: 240, onComplete: () => r.destroy() });
  }

  private headOut() {
    this.exiting = true;
    SynthAudio.uiSelect();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(450, () =>
      this.scene.start(GameState.getInstance().currentLevelDef.sceneKey)
    );
  }

  // Re-render every stateful bit of UI: coins, row copy/colors, highlight
  private refresh() {
    const gs = GameState.getInstance();
    this.coinsText.setText(`${gs.coins} coins`);

    SWORDS.forEach((sword, i) => {
      const row = this.swordRows[i];
      if (i <= gs.swordIndex) {
        row.setText(`✓ ${sword.name}`);
        row.setColor('#7fd16a');
      } else if (i === gs.swordIndex + 1) {
        row.setText(`${sword.name} — ${sword.cost}c`);
        row.setColor(gs.coins >= sword.cost ? '#ffd700' : '#cc8855');
      } else {
        row.setText(`${sword.name} — ${sword.cost}c`);
        row.setColor('#666677');
      }
    });

    CONSUMABLE_KINDS.forEach((kind, i) => {
      const item = CONSUMABLES[kind];
      const owned = kind === 'potion' ? gs.potions : kind === 'life' ? gs.lives : gs.shieldHits > 0 ? 1 : 0;
      const atCap = kind === 'shield' ? gs.shieldHits !== 0 : owned >= item.cap;
      const row = this.consumableRows[i];
      row.setText(`${item.name}  ${owned}/${item.cap} — ${item.cost}c`);
      row.setColor(atCap ? '#7fd16a' : gs.coins >= item.cost ? '#ddddcc' : '#888899');
    });

    this.titles[0]?.setColor(this.focus === 0 ? '#ffd700' : '#9090a8');
    this.titles[1]?.setColor(this.focus === 1 ? '#ffd700' : '#9090a8');
    this.headOutText.setColor(this.isHeadOut() ? '#ffd700' : '#eeeedd');

    const { x, y } = this.selectedRowPos();
    this.highlight.setPosition(x, y);
    this.highlight.setDisplaySize(this.isHeadOut() ? 340 : PANEL_W, 28);
  }

  private buildBackdrop() {
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0c0c16);
    // Dirt floor strip under the counters
    this.add.rectangle(GAME_W / 2, 200, GAME_W, 8, 0x1d1828);
    this.add.rectangle(GAME_W / 2, GAME_H - 18, GAME_W, 36, 0x141020);
    // Faint panel slabs behind each list
    this.add.rectangle(BLACKSMITH_X, 330, PANEL_W + 20, 230, 0x16121f, 0.85);
    this.add.rectangle(APOCALYPSE_X, 330, PANEL_W + 20, 230, 0x121a14, 0.85);
  }

  private buildCounters() {
    const isWebGL = this.sys.renderer.type === Phaser.WEBGL;
    if (isWebGL) {
      this.lights.enable().setAmbientColor(0x55505e);
      this.lights.addLight(BLACKSMITH_X, 145, 260, 0xffaa55, 1.6); // forge warmth
      this.lights.addLight(APOCALYPSE_X, 125, 280, 0x66ff88, 1.2); // potion glow
    }

    // Blacksmith counter: anvil on a slab, embers rising
    this.titles[0] = this.add
      .text(BLACKSMITH_X, 118, 'BLACKSMITH', {
        fontFamily: 'monospace',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    lit(this.add.image(BLACKSMITH_X, 172, Assets.SHOP_COUNTER));
    lit(this.add.image(BLACKSMITH_X, 140, Assets.SHOP_ANVIL));
    this.add.particles(BLACKSMITH_X + 18, 138, Assets.P_EMBER, {
      x: { min: -20, max: 16 },
      speedY: { min: -55, max: -20 },
      speedX: { min: -12, max: 12 },
      lifespan: 900,
      quantity: 1,
      frequency: 130,
      scale: { start: 1, end: 0 },
      alpha: { start: 0.9, end: 0 },
    });

    // Apocalypse counter: potion shack behind its own slab (drawn before the
    // title so the title stays readable)
    lit(this.add.image(APOCALYPSE_X + 80, 134, Assets.SHOP_SHACK));
    lit(this.add.image(APOCALYPSE_X, 172, Assets.SHOP_COUNTER));
    this.titles[1] = this.add
      .text(APOCALYPSE_X, 118, 'APOCALYPSE', {
        fontFamily: 'monospace',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#9090a8',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
  }
}
