import Phaser from 'phaser';

/**
 * Background music manager.
 * Plays the loaded soundtrack MP3 on loop via Phaser's audio system.
 */
export class MusicManager {
  private static instance: MusicManager;
  private music: Phaser.Sound.BaseSound | null = null;
  private scene: Phaser.Scene | null = null;
  private currentTrack: string | null = null;

  static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  /** Must be called once with a scene that has the audio loaded. */
  init(scene: Phaser.Scene) {
    this.scene = scene;
  }

  play(track: string) {
    if (!this.scene) return;
    if (this.currentTrack === track) return;
    this.stop();
    this.currentTrack = track;

    try {
      this.music = this.scene.sound.add('soundtrack', { loop: true, volume: 0.4 });
      this.music.play();
    } catch {
      // Audio not loaded yet — silent skip
    }
  }

  stop() {
    if (this.music) {
      this.music.destroy();
      this.music = null;
    }
    this.currentTrack = null;
  }

  setVolume(vol: number) {
    if (this.music && 'setVolume' in this.music) {
      (this.music as Phaser.Sound.WebAudioSound).setVolume(Math.max(0, Math.min(1, vol)));
    }
  }
}
