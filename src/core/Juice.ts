import Phaser from 'phaser';

// Camera/time juice: hit-stop, screen shake, zoom punch, flashes.
export class Juice {
  private scene: Phaser.Scene;
  private stopped = false;
  private baseZoom = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Freeze the world for a few frames — sells the impact of big hits.
  hitStop(ms = 70, scale = 0.05) {
    if (this.stopped) return;
    this.stopped = true;
    const world = this.scene.physics.world;
    world.timeScale = 1 / scale;
    this.scene.anims.globalTimeScale = scale;
    this.scene.time.delayedCall(ms, () => {
      world.timeScale = 1;
      this.scene.anims.globalTimeScale = 1;
      this.stopped = false;
    });
  }

  shake(intensity = 0.004, ms = 120) {
    this.scene.cameras.main.shake(ms, intensity);
  }

  zoomPunch(amount = 0.05, ms = 140) {
    const cam = this.scene.cameras.main;
    this.scene.tweens.add({
      targets: cam,
      zoom: this.baseZoom * (1 + amount),
      duration: ms / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => cam.setZoom(this.baseZoom),
    });
  }

  flash(color = 0xffffff, ms = 80, alpha = 0.4) {
    const c = Phaser.Display.Color.IntegerToColor(color);
    this.scene.cameras.main.flash(ms, c.red, c.green, c.blue, false);
    void alpha;
  }

  // Slow-motion window (boss kill cam).
  slowMo(ms = 900, scale = 0.25) {
    const world = this.scene.physics.world;
    world.timeScale = 1 / scale;
    this.scene.anims.globalTimeScale = scale;
    this.scene.tweens.timeScale = scale;
    this.scene.time.delayedCall(ms, () => {
      world.timeScale = 1;
      this.scene.anims.globalTimeScale = 1;
      this.scene.tweens.timeScale = 1;
    });
  }
}
