import Phaser from 'phaser';
import { GameState } from '../systems/GameState';
import { MusicManager } from '../systems/MusicManager';

export class MainMenuScene extends Phaser.Scene {
  private bloodDrips: Phaser.GameObjects.Rectangle[] = [];
  private dripTimers: Phaser.Time.TimerEvent[] = [];

  constructor() {
    super({ key: 'MainMenu' });
  }

  create() {
    const { width, height } = this.scale;

    // Start menu music
    const mm = MusicManager.getInstance();
    mm.init(this);
    mm.play('menu');

    // Dark background with subtle fog
    this.cameras.main.setBackgroundColor('#0a0a0a');

    // Fog layers drifting across background
    this.createFog(width, height);

    // Blood-red glow behind title
    const glow = this.add.ellipse(width / 2, height / 3, 500, 120, 0x880000, 0.15);
    this.tweens.add({
      targets: glow,
      scaleX: 1.1,
      scaleY: 1.2,
      alpha: 0.25,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Title shadow for depth
    this.add.text(width / 2 + 3, height / 3 + 3, 'ZOMBIE HUNTERS', {
      fontSize: '56px',
      color: '#330000',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Main title
    const title = this.add.text(width / 2, height / 3, 'ZOMBIE HUNTERS', {
      fontSize: '56px',
      color: '#cc0000',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Title pulse
    this.tweens.add({
      targets: title,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Blood dripping from title letters
    this.startBloodDrips(title);

    // Blood pool that grows at the bottom
    const poolY = height / 3 + 45;
    const pool = this.add.ellipse(width / 2, poolY, 20, 4, 0x880000, 0);
    this.tweens.add({
      targets: pool,
      scaleX: 15,
      scaleY: 3,
      alpha: 0.5,
      duration: 8000,
      ease: 'Sine.easeOut',
    });

    // Subtitle with flicker
    const subtitle = this.add.text(width / 2, height / 2, '— A Henry & Josh Production —', {
      fontSize: '16px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: subtitle,
      alpha: 0.7,
      duration: 2000,
      delay: 1000,
    });

    // Start text
    const startText = this.add.text(width / 2, height / 2 + 80, 'Press ENTER to Start', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Blink effect
    this.tweens.add({
      targets: startText,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Zombie silhouettes shambling in the background
    this.createShamblingSilhouettes(width, height);

    // Check URL for ?level=N to skip straight to a level
    const params = new URLSearchParams(window.location.search);
    const levelParam = params.get('level');
    const startLevel = levelParam ? parseInt(levelParam, 10) : 1;

    this.input.keyboard!.once('keydown-ENTER', () => {
      // Screen flash on start
      MusicManager.getInstance().stop();
      this.cameras.main.flash(300, 150, 0, 0);
      this.time.delayedCall(300, () => {
        GameState.getInstance().currentLevel = startLevel;
        this.scene.start(`Level${startLevel}`);
      });
    });
  }

  private startBloodDrips(title: Phaser.GameObjects.Text) {
    // Get title bounds to know where letters are
    const bounds = title.getBounds();
    const dripCount = 12;

    // Create recurring drips from random positions along the title bottom
    for (let i = 0; i < dripCount; i++) {
      const delay = Phaser.Math.Between(0, 4000);
      const interval = Phaser.Math.Between(2000, 5000);

      const timer = this.time.addEvent({
        delay: interval,
        startAt: interval - delay,
        loop: true,
        callback: () => {
          const x = bounds.left + Math.random() * bounds.width;
          const y = bounds.bottom - 5;
          this.createBloodDrip(x, y);
        },
      });
      this.dripTimers.push(timer);
    }
  }

  private createBloodDrip(x: number, y: number) {
    // Main drip drop
    const dripWidth = Phaser.Math.Between(2, 4);
    const drip = this.add.rectangle(x, y, dripWidth, 0, 0xcc0000);
    drip.setOrigin(0.5, 0);
    this.bloodDrips.push(drip);

    // Drip grows downward at varying speeds
    const fallDistance = Phaser.Math.Between(40, 140);
    const speed = Phaser.Math.Between(1500, 3500);

    this.tweens.add({
      targets: drip,
      displayHeight: fallDistance,
      duration: speed,
      ease: 'Sine.easeIn',
      onComplete: () => {
        // Drip detaches and falls
        const droplet = this.add.circle(x, y + fallDistance, dripWidth, 0xcc0000);
        drip.destroy();

        // Droplet falls and fades
        this.tweens.add({
          targets: droplet,
          y: droplet.y + Phaser.Math.Between(20, 60),
          alpha: 0,
          scaleX: 1.5,
          scaleY: 0.5,
          duration: 600,
          ease: 'Quad.easeIn',
          onComplete: () => droplet.destroy(),
        });
      },
    });

    // Clean up tracking
    this.time.delayedCall(speed + 700, () => {
      const idx = this.bloodDrips.indexOf(drip);
      if (idx !== -1) this.bloodDrips.splice(idx, 1);
    });
  }

  private createFog(width: number, height: number) {
    // Create a few fog strips that drift across
    for (let i = 0; i < 3; i++) {
      const fogY = Phaser.Math.Between(50, height - 50);
      const fog = this.add.rectangle(
        -200,
        fogY,
        Phaser.Math.Between(300, 500),
        Phaser.Math.Between(40, 80),
        0x222222,
        0.08
      );

      this.tweens.add({
        targets: fog,
        x: width + 300,
        duration: Phaser.Math.Between(15000, 25000),
        delay: i * 3000,
        repeat: -1,
        onRepeat: () => {
          fog.x = -300;
          fog.y = Phaser.Math.Between(50, height - 50);
        },
      });
    }
  }

  private createShamblingSilhouettes(width: number, height: number) {
    const groundY = height - 40;

    for (let i = 0; i < 4; i++) {
      // Simple zombie silhouette as a dark rectangle group
      const startX = Phaser.Math.Between(-100, width + 100);
      const zombieBody = this.add.rectangle(startX, groundY, 12, 24, 0x111111, 0.3);
      const zombieHead = this.add.circle(startX, groundY - 16, 5, 0x111111, 0.3);

      const direction = Math.random() > 0.5 ? 1 : -1;
      const speed = Phaser.Math.Between(20000, 40000);

      // Shamble across the screen
      this.tweens.add({
        targets: [zombieBody, zombieHead],
        x: direction > 0 ? width + 50 : -50,
        duration: speed,
        repeat: -1,
        onRepeat: () => {
          const newX = direction > 0 ? -50 : width + 50;
          zombieBody.x = newX;
          zombieHead.x = newX;
          zombieBody.y = groundY + Phaser.Math.Between(-5, 5);
          zombieHead.y = zombieBody.y - 16;
        },
      });

      // Slight bobbing as they walk
      this.tweens.add({
        targets: [zombieBody, zombieHead],
        y: `-=3`,
        duration: 400 + i * 100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
