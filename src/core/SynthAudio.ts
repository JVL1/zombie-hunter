// All game audio synthesized with WebAudio — no audio files needed.
// Call SynthAudio.unlock() from a user-gesture handler before playing anything.

class SynthAudioImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private musicGain: GainNode | null = null;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.25;
      this.master.connect(this.ctx.destination);

      const len = this.ctx.sampleRate * 1;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private get t(): number {
    return this.ctx!.currentTime;
  }

  private gainEnv(peak: number, attack: number, decay: number, at = 0): GainNode {
    const g = this.ctx!.createGain();
    const t0 = this.t + at;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    g.connect(this.master!);
    return g;
  }

  private osc(
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    peak: number,
    at = 0
  ) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    const t0 = this.t + at;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    o.connect(this.gainEnv(peak, 0.005, dur, at));
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private noise(
    dur: number,
    peak: number,
    filterType: BiquadFilterType,
    f0: number,
    f1: number,
    at = 0,
    q = 1
  ) {
    if (!this.ctx || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = q;
    const t0 = this.t + at;
    filter.frequency.setValueAtTime(f0, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(f1, 10), t0 + dur);
    src.connect(filter);
    filter.connect(this.gainEnv(peak, 0.005, dur, at));
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  // --- SFX ---

  swing(comboStep = 1) {
    if (!this.ctx) return;
    const base = 1200 + comboStep * 300;
    this.noise(0.12, 0.5, 'bandpass', base, base * 0.3, 0, 2);
  }

  splat(big = false) {
    if (!this.ctx) return;
    this.noise(big ? 0.25 : 0.15, big ? 0.9 : 0.6, 'lowpass', 900, 150);
    this.osc('sine', 160, 50, 0.12, big ? 0.7 : 0.4);
  }

  slam() {
    if (!this.ctx) return;
    this.osc('sine', 110, 35, 0.3, 1.0);
    this.noise(0.3, 0.6, 'lowpass', 500, 80);
  }

  jump() {
    this.osc('square', 220, 480, 0.12, 0.18);
  }

  doubleJump() {
    this.osc('square', 320, 660, 0.12, 0.18);
  }

  dash() {
    this.noise(0.18, 0.4, 'highpass', 800, 3000);
  }

  land() {
    this.noise(0.08, 0.2, 'lowpass', 600, 200);
  }

  coin() {
    this.osc('sine', 880, 880, 0.07, 0.25);
    this.osc('sine', 1320, 1320, 0.12, 0.25, 0.07);
  }

  heart() {
    this.osc('sine', 520, 780, 0.18, 0.25);
  }

  key() {
    [660, 880, 1100, 1320].forEach((f, i) => this.osc('triangle', f, f, 0.14, 0.3, i * 0.09));
  }

  hurt() {
    this.osc('sawtooth', 320, 90, 0.25, 0.45);
  }

  groan(pitch = 1) {
    if (!this.ctx) return;
    const f = 75 * pitch;
    this.osc('sawtooth', f, f * 0.7, 0.6, 0.22);
    this.osc('sawtooth', f * 1.5, f, 0.6, 0.12);
  }

  roar() {
    if (!this.ctx) return;
    this.osc('sawtooth', 140, 45, 1.1, 0.8);
    this.osc('square', 90, 30, 1.1, 0.5);
    this.noise(0.9, 0.5, 'lowpass', 700, 100);
  }

  thunder() {
    if (!this.ctx) return;
    this.noise(1.6, 0.5, 'lowpass', 300, 40);
    this.osc('sine', 70, 25, 1.2, 0.4);
  }

  uiSelect() {
    this.osc('triangle', 440, 660, 0.1, 0.25);
  }

  victory() {
    [523, 659, 784, 1047].forEach((f, i) => this.osc('triangle', f, f, 0.25, 0.35, i * 0.16));
  }

  gameOver() {
    [440, 349, 262, 196].forEach((f, i) => this.osc('sawtooth', f, f * 0.97, 0.4, 0.3, i * 0.3));
  }

  // --- Music: dark ambient drone + heartbeat pulse, scheduled bar by bar ---

  startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.master!);

    const bassNotes = [55, 55, 49, 41.2]; // A1 A1 G1 E1 — slow minor movement
    let bar = 0;
    const barLen = 2.4;
    let nextBarAt = this.t + 0.05;

    const scheduleBar = () => {
      if (!this.ctx || !this.musicGain) return;
      const t0 = nextBarAt;
      const root = bassNotes[bar % bassNotes.length];

      // Drone: two detuned saws through a lowpass
      for (const detune of [0, 4]) {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = root;
        o.detune.value = detune;
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(120, t0);
        f.frequency.linearRampToValueAtTime(260, t0 + barLen / 2);
        f.frequency.linearRampToValueAtTime(120, t0 + barLen);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.16, t0 + 0.3);
        g.gain.linearRampToValueAtTime(0.0001, t0 + barLen);
        o.connect(f);
        f.connect(g);
        g.connect(this.musicGain);
        o.start(t0);
        o.stop(t0 + barLen + 0.1);
      }

      // Heartbeat kick: two thumps per bar
      for (const off of [0, 0.35]) {
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(85, t0 + off);
        o.frequency.exponentialRampToValueAtTime(35, t0 + off + 0.18);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.35, t0 + off);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.22);
        o.connect(g);
        g.connect(this.musicGain);
        o.start(t0 + off);
        o.stop(t0 + off + 0.3);
      }

      // Sparse eerie high note every other bar
      if (bar % 2 === 1) {
        const o = this.ctx.createOscillator();
        o.type = 'triangle';
        const notes = [440, 523, 392, 587];
        o.frequency.value = notes[(bar >> 1) % notes.length];
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0 + 1.2);
        g.gain.linearRampToValueAtTime(0.05, t0 + 1.5);
        g.gain.linearRampToValueAtTime(0.0001, t0 + barLen);
        o.connect(g);
        g.connect(this.musicGain);
        o.start(t0 + 1.2);
        o.stop(t0 + barLen + 0.1);
      }

      nextBarAt += barLen;
      bar++;
    };

    scheduleBar();
    scheduleBar();
    this.musicTimer = window.setInterval(() => {
      // Keep ~2 bars scheduled ahead
      while (this.ctx && nextBarAt < this.t + barLen * 2) scheduleBar();
    }, 500);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicGain && this.ctx) {
      const g = this.musicGain;
      g.gain.setValueAtTime(g.gain.value, this.t);
      g.gain.linearRampToValueAtTime(0.0001, this.t + 0.5);
      window.setTimeout(() => g.disconnect(), 700);
      this.musicGain = null;
    }
  }
}

export const SynthAudio = new SynthAudioImpl();
