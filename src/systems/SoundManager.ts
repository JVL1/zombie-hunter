import Phaser from 'phaser';

export class SoundManager {
  private scene: Phaser.Scene;
  private enabled = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Try to play a sound. If the audio hasn't been loaded, silently skip.
   * This lets us wire up all sound calls now and add actual files later.
   */
  play(key: string, config?: Phaser.Types.Sound.SoundConfig) {
    if (!this.enabled) return;
    try {
      if (this.scene.cache.audio.exists(key)) {
        this.scene.sound.play(key, config);
      }
    } catch {
      // Audio not loaded yet — silent skip
    }
  }
}
