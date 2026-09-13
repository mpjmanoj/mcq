// Web Audio API Synthesizer for Gaming UI Sound FX
// Zero external mp3 dependencies - generated purely via Web Audio Oscillators

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private isRetroPlaying: boolean = false;
  private retroTimer: NodeJS.Timeout | null = null;
  private retroStep: number = 0;
  private nextStepTime: number = 0;

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("quiz_sound_enabled");
      this.enabled = stored !== "false";
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public isSoundEnabled(): boolean {
    return this.enabled;
  }

  public isRetroThemePlaying(): boolean {
    return this.isRetroPlaying;
  }

  public toggleSound(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("quiz_sound_enabled", this.enabled ? "true" : "false");
    }
    if (!this.enabled) {
      this.stopRetroTheme();
    }
    return this.enabled;
  }

  public toggleRetroTheme(): boolean {
    if (this.isRetroPlaying) {
      this.stopRetroTheme();
      return false;
    } else {
      this.startRetroTheme();
      return true;
    }
  }

  public playRetroStartFanfare() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Classic 8-bit arcade power-up chime (rapid rising arpeggio)
      const fanfareNotes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
      fanfareNotes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.055;

        osc.type = "square";
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.12);
      });

      // Final triumphant power chord
      const chordTime = now + 0.35;
      [880, 1108.73, 1318.51].forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(freq, chordTime);

        gain.gain.setValueAtTime(0.09, chordTime);
        gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(chordTime);
        osc.stop(chordTime + 0.35);
      });
    } catch {}
  }

  public startRetroTheme() {
    if (!this.enabled || this.isRetroPlaying) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      this.isRetroPlaying = true;
      this.retroStep = 0;

      // Play start fanfare first
      this.playRetroStartFanfare();

      // Start looping chiptune battle theme after fanfare
      const stepDuration = 0.115; // ~130 BPM sixteenth notes
      this.nextStepTime = this.ctx.currentTime + 0.7; // start right after fanfare

      // 32-step upbeat 8-bit arcade progression (Am - F - C - G/Em)
      // Melody notes in Hz (null = rest)
      const melody: (number | null)[] = [
        440.00, null, 523.25, 659.25, 880.00, null, 783.99, 659.25, // Am
        587.33, 659.25, 783.99, null, 659.25, null, 587.33, 523.25,
        698.46, null, 880.00, 1046.50, 880.00, null, 783.99, 698.46, // F
        659.25, 783.99, 880.00, 783.99, 659.25, 587.33, 523.25, 587.33, // C & G
      ];

      // Driving 8-bit octave bass
      const bass: number[] = [
        110.00, 220.00, 110.00, 220.00, 130.81, 220.00, 164.81, 110.00, // Am
        87.31, 174.61, 87.31, 174.61, 110.00, 174.61, 130.81, 87.31,   // F
        130.81, 261.63, 130.81, 261.63, 164.81, 261.63, 196.00, 130.81, // C
        98.00, 196.00, 98.00, 196.00, 82.41, 164.81, 98.00, 123.47     // G/Em
      ];

      if (this.retroTimer) clearInterval(this.retroTimer);

      this.retroTimer = setInterval(() => {
        if (!this.ctx || !this.isRetroPlaying || !this.enabled) return;

        const lookahead = 0.15;
        while (this.nextStepTime < this.ctx.currentTime + lookahead) {
          const t = this.nextStepTime;
          const s = this.retroStep;

          // 1. Melody (Square wave with warm filter)
          const mFreq = melody[s];
          if (mFreq !== null) {
            const mOsc = this.ctx.createOscillator();
            const mGain = this.ctx.createGain();
            const mFilter = this.ctx.createBiquadFilter();

            mOsc.type = "square";
            mOsc.frequency.setValueAtTime(mFreq, t);

            mFilter.type = "lowpass";
            mFilter.frequency.setValueAtTime(2200, t); // gentle warm vintage rolloff

            mGain.gain.setValueAtTime(0.065, t);
            mGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.9);

            mOsc.connect(mFilter);
            mFilter.connect(mGain);
            mGain.connect(this.ctx.destination);

            mOsc.start(t);
            mOsc.stop(t + stepDuration);
          }

          // 2. Bass (Triangle wave, bouncy retro groove)
          const bFreq = bass[s];
          if (bFreq) {
            const bOsc = this.ctx.createOscillator();
            const bGain = this.ctx.createGain();

            bOsc.type = "triangle";
            bOsc.frequency.setValueAtTime(bFreq, t);

            bGain.gain.setValueAtTime(0.08, t);
            bGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.85);

            bOsc.connect(bGain);
            bGain.connect(this.ctx.destination);

            bOsc.start(t);
            bOsc.stop(t + stepDuration);
          }

          // 3. 8-bit Percussion
          // Retro Kick on steps 0, 8, 16, 24 (beats 1 & 3)
          if (s % 8 === 0) {
            const kOsc = this.ctx.createOscillator();
            const kGain = this.ctx.createGain();

            kOsc.type = "triangle";
            kOsc.frequency.setValueAtTime(140, t);
            kOsc.frequency.exponentialRampToValueAtTime(38, t + 0.06);

            kGain.gain.setValueAtTime(0.12, t);
            kGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

            kOsc.connect(kGain);
            kGain.connect(this.ctx.destination);

            kOsc.start(t);
            kOsc.stop(t + 0.06);
          }

          // Retro Snare on steps 4, 12, 20, 28 (beats 2 & 4)
          if (s % 8 === 4) {
            const sOsc = this.ctx.createOscillator();
            const sGain = this.ctx.createGain();

            sOsc.type = "square";
            sOsc.frequency.setValueAtTime(320, t);
            sOsc.frequency.exponentialRampToValueAtTime(70, t + 0.05);

            sGain.gain.setValueAtTime(0.05, t);
            sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

            sOsc.connect(sGain);
            sGain.connect(this.ctx.destination);

            sOsc.start(t);
            sOsc.stop(t + 0.05);
          }

          // Hi-hat tick on offbeats
          if (s % 2 === 1) {
            const hOsc = this.ctx.createOscillator();
            const hGain = this.ctx.createGain();

            hOsc.type = "square";
            hOsc.frequency.setValueAtTime(900, t);

            hGain.gain.setValueAtTime(0.015, t);
            hGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

            hOsc.connect(hGain);
            hGain.connect(this.ctx.destination);

            hOsc.start(t);
            hOsc.stop(t + 0.02);
          }

          this.nextStepTime += stepDuration;
          this.retroStep = (this.retroStep + 1) % 32;
        }
      }, 35);
    } catch {}
  }

  public stopRetroTheme() {
    this.isRetroPlaying = false;
    if (this.retroTimer) {
      clearInterval(this.retroTimer);
      this.retroTimer = null;
    }
    this.retroStep = 0;
  }

  public playJoin() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Audio playback fails gracefully if user hasn't interacted
    }
  }

  public playSelect() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.06);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  public playSubmit() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  public playCountdown(isFinal: boolean = false) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isFinal ? "square" : "sine";
      const freq = isFinal ? 987.77 : 440; // B5 for GO, A4 for 3, 2, 1
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(isFinal ? 0.25 : 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.45 : 0.2));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + (isFinal ? 0.45 : 0.2));
    } catch {}
  }

  public playVictory() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.12;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch {}
  }
}

export const sounds = new SoundManager();
