/**
 * Web Audio API sound effect generator.
 * Creates retro/arcade sounds procedurally — no audio files needed.
 */
export class SynthAudio {
  private static instance: SynthAudio;
  private ctx: AudioContext;
  private masterGain: GainNode;

  private constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);
  }

  static getInstance(): SynthAudio {
    if (!SynthAudio.instance) {
      SynthAudio.instance = new SynthAudio();
    }
    return SynthAudio.instance;
  }

  /** Resume AudioContext after user interaction (browser autoplay policy). */
  resume() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(key: string) {
    this.resume();
    switch (key) {
      case 'sword-swing': this.swordSwing(); break;
      case 'splat': this.splat(); break;
      case 'coin-pickup': this.coinPickup(); break;
      case 'boss-roar': this.bossRoar(); break;
      case 'player-hurt': this.playerHurt(); break;
      case 'victory': this.victoryJingle(); break;
      case 'game-over': this.gameOver(); break;
    }
  }

  /** Fast frequency sweep — whoosh! */
  private swordSwing() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /** White noise burst through bandpass — wet splatter */
  private splat() {
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    noise.connect(filter).connect(gain).connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.15);
  }

  /** Two ascending sine tones — classic coin ding */
  private coinPickup() {
    const t = this.ctx.currentTime;
    // E5
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 659.25; // E5
    gain1.gain.setValueAtTime(0.3, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc1.connect(gain1).connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.15);

    // B5 slightly delayed
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 987.77; // B5
    gain2.gain.setValueAtTime(0.001, t);
    gain2.gain.setValueAtTime(0.3, t + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc2.connect(gain2).connect(this.masterGain);
    osc2.start(t);
    osc2.stop(t + 0.25);
  }

  /** Low sawtooth with vibrato — menacing growl */
  private bossRoar() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.8);

    // Vibrato
    lfo.type = 'sine';
    lfo.frequency.value = 8;
    lfoGain.gain.value = 15;
    lfo.connect(lfoGain).connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.1);
    gain.gain.setValueAtTime(0.4, t + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.8);
    lfo.start(t);
    lfo.stop(t + 0.8);
  }

  /** Quick descending tone — ouch! */
  private playerHurt() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /** Ascending arpeggio C-E-G-C — level complete fanfare */
  private victoryJingle() {
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = t + i * 0.15;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      osc.connect(gain).connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }

  /** Slow descending minor tones — death sound */
  private gameOver() {
    const t = this.ctx.currentTime;
    const notes = [392, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = t + i * 0.25;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain).connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }
}
