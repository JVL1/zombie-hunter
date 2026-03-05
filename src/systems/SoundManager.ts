import { SynthAudio } from './SynthAudio';

export class SoundManager {
  private enabled = true;

  play(key: string, _config?: { volume?: number }) {
    if (!this.enabled) return;
    SynthAudio.getInstance().play(key);
  }
}
