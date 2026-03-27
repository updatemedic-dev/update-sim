/**
 * Audio engine using Web Audio API.
 * Generates beeps, alarms, defib sounds, and CPR metronome in real time.
 * Includes iOS PWA workarounds for AudioContext suspension.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private beepGain: GainNode | null = null;
  private alarmGain: GainNode | null = null;
  private isInitialized = false;
  private activeAlarmOsc: OscillatorNode | null = null;
  private metronomeInterval: ReturnType<typeof setInterval> | null = null;
  private chargedBeepInterval: ReturnType<typeof setInterval> | null = null;

  private setupGains(): void {
    if (!this.ctx) return;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    this.beepGain = this.ctx.createGain();
    this.beepGain.gain.value = 0.3;
    this.beepGain.connect(this.masterGain);

    this.alarmGain = this.ctx.createGain();
    this.alarmGain.gain.value = 0.5;
    this.alarmGain.connect(this.masterGain);
  }

  async init(): Promise<void> {
    if (this.isInitialized && this.ctx && this.ctx.state !== 'closed') {
      // Already initialized, just resume if suspended
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }
    // Create fresh context (must be called from user gesture on iOS)
    this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.setupGains();
    this.isInitialized = true;

    // iOS PWA: play a silent buffer to unlock audio
    try {
      const silentBuffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      const source = this.ctx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.ctx.destination);
      source.start(0);
    } catch (_) { /* ignore */ }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Listen for visibility changes to resume audio on iOS PWA
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    });
  }

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      // Recreate context if closed (iOS can close it)
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.setupGains();
      this.isInitialized = true;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setBeepVolume(volume: number): void {
    if (this.beepGain) {
      this.beepGain.gain.value = Math.max(0, Math.min(1, volume / 100));
    }
  }

  setAlarmVolume(volume: number): void {
    if (this.alarmGain) {
      this.alarmGain.gain.value = Math.max(0, Math.min(1, volume / 100));
    }
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume / 100));
    }
  }

  /**
   * Play cardiac beep. Frequency varies with SpO2 level.
   */
  playBeep(spo2: number): void {
    try {
      const ctx = this.ensureContext();
      if (!this.beepGain) return;

      let freq: number;
      if (spo2 >= 95) freq = 880;
      else if (spo2 >= 90) freq = 660;
      else if (spo2 >= 85) freq = 440;
      else freq = 330;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const envGain = ctx.createGain();
      const now = ctx.currentTime;
      envGain.gain.setValueAtTime(0, now);
      envGain.gain.linearRampToValueAtTime(0.6, now + 0.01);
      envGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(envGain);
      envGain.connect(this.beepGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Ignore audio errors gracefully
    }
  }

  /**
   * Play alarm tone based on priority.
   */
  playAlarmTone(priority: 'high' | 'medium' | 'low'): void {
    try {
      const ctx = this.ensureContext();
      if (!this.alarmGain) return;

      const freqs = {
        high: [880, 1100, 880, 1100, 880],
        medium: [660, 880, 660],
        low: [440],
      };

      const tones = freqs[priority];
      const now = ctx.currentTime;

      tones.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = priority === 'high' ? 'square' : 'sine';
        osc.frequency.value = freq;

        const envGain = ctx.createGain();
        const start = now + i * 0.15;
        envGain.gain.setValueAtTime(0, start);
        envGain.gain.linearRampToValueAtTime(0.4, start + 0.02);
        envGain.gain.linearRampToValueAtTime(0.4, start + 0.1);
        envGain.gain.linearRampToValueAtTime(0, start + 0.14);

        osc.connect(envGain);
        envGain.connect(this.alarmGain!);
        osc.start(start);
        osc.stop(start + 0.15);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Play defibrillator charge sound — realistic capacitor whine with ascending pitch.
   */
  playChargeSound(durationSec = 3): void {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;
      const now = ctx.currentTime;

      // Primary capacitor whine (sine, ascending)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(400, now);
      osc1.frequency.exponentialRampToValueAtTime(1800, now + durationSec * 0.85);
      osc1.frequency.setValueAtTime(1800, now + durationSec * 0.85);

      // Harmonic overtone
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(800, now);
      osc2.frequency.exponentialRampToValueAtTime(3600, now + durationSec * 0.85);

      // Envelope: ramp up, sustain, then ready tone
      const env1 = ctx.createGain();
      env1.gain.setValueAtTime(0, now);
      env1.gain.linearRampToValueAtTime(0.12, now + 0.3);
      env1.gain.linearRampToValueAtTime(0.18, now + durationSec * 0.8);
      env1.gain.linearRampToValueAtTime(0, now + durationSec);

      const env2 = ctx.createGain();
      env2.gain.setValueAtTime(0, now);
      env2.gain.linearRampToValueAtTime(0.04, now + 0.5);
      env2.gain.linearRampToValueAtTime(0.06, now + durationSec * 0.8);
      env2.gain.linearRampToValueAtTime(0, now + durationSec);

      osc1.connect(env1);
      osc2.connect(env2);
      env1.connect(this.masterGain);
      env2.connect(this.masterGain);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + durationSec);
      osc2.stop(now + durationSec);

      // Ready tone at end (two beeps)
      for (let i = 0; i < 2; i++) {
        const beep = ctx.createOscillator();
        beep.type = 'sine';
        beep.frequency.value = 1000;
        const beepEnv = ctx.createGain();
        const t = now + durationSec - 0.4 + i * 0.2;
        beepEnv.gain.setValueAtTime(0, t);
        beepEnv.gain.linearRampToValueAtTime(0.25, t + 0.02);
        beepEnv.gain.linearRampToValueAtTime(0.25, t + 0.1);
        beepEnv.gain.linearRampToValueAtTime(0, t + 0.15);
        beep.connect(beepEnv);
        beepEnv.connect(this.masterGain);
        beep.start(t);
        beep.stop(t + 0.15);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Play defibrillator shock sound — realistic biphasic discharge thump.
   */
  playShockSound(): void {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;
      const now = ctx.currentTime;
      const sampleRate = ctx.sampleRate;

      // Create biphasic discharge: loud thump + electrical crack
      const bufferSize = sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate;
        let sample = 0;

        // Phase 1: initial sharp crack (0-30ms)
        if (t < 0.03) {
          sample = Math.exp(-t * 80) * (Math.random() * 2 - 1) * 1.0;
          // Add low-frequency thump
          sample += Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 40) * 0.8;
        }
        // Phase 2: biphasic reversal (30-80ms)
        else if (t < 0.08) {
          const t2 = t - 0.03;
          sample = Math.exp(-t2 * 50) * (Math.random() * 2 - 1) * 0.5;
          sample += Math.sin(2 * Math.PI * 80 * t2 + Math.PI) * Math.exp(-t2 * 30) * 0.4;
        }
        // Phase 3: body thump resonance (80-300ms)
        else if (t < 0.3) {
          const t3 = t - 0.08;
          sample = Math.sin(2 * Math.PI * 40 * t3) * Math.exp(-t3 * 12) * 0.3;
          sample += (Math.random() * 2 - 1) * Math.exp(-t3 * 20) * 0.05;
        }
        // Tail off
        else {
          const t4 = t - 0.3;
          sample = Math.sin(2 * Math.PI * 30 * t4) * Math.exp(-t4 * 8) * 0.1;
        }

        data[i] = sample;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // Lowpass to remove harsh high frequencies
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 2000;

      const envGain = ctx.createGain();
      envGain.gain.value = 0.7;

      source.connect(lpf);
      lpf.connect(envGain);
      envGain.connect(this.masterGain);
      source.start(now);
    } catch {
      // Ignore
    }
  }

  /**
   * Start CPR metronome.
   */
  startMetronome(rate: number): void {
    this.stopMetronome();
    const intervalMs = (60 / rate) * 1000;

    this.metronomeInterval = setInterval(() => {
      try {
        const ctx = this.ensureContext();
        if (!this.masterGain) return;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 880;

        const envGain = ctx.createGain();
        const now = ctx.currentTime;
        envGain.gain.setValueAtTime(0, now);
        envGain.gain.linearRampToValueAtTime(0.3, now + 0.005);
        envGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(envGain);
        envGain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
      } catch {
        // Ignore
      }
    }, intervalMs);
  }

  stopMetronome(): void {
    if (this.metronomeInterval !== null) {
      clearInterval(this.metronomeInterval);
      this.metronomeInterval = null;
    }
  }

  /**
   * Start continuous warning beep when defibrillator is charged.
   * Repeating high-pitched tone every 500ms until shock or disarm.
   */
  startChargedBeep(): void {
    this.stopChargedBeep();
    // Play immediately, then every 500ms
    this._playChargedTone();
    this.chargedBeepInterval = setInterval(() => {
      this._playChargedTone();
    }, 500);
  }

  private _playChargedTone(): void {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;
      const now = ctx.currentTime;

      // Double beep tone (like real defibrillator ready warning)
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 1000;

        const env = ctx.createGain();
        const t = now + i * 0.12;
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.2, t + 0.01);
        env.gain.linearRampToValueAtTime(0.2, t + 0.06);
        env.gain.linearRampToValueAtTime(0, t + 0.09);

        osc.connect(env);
        env.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.1);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Play short activation beep (for SYNC toggle, etc.)
   */
  playSyncBeep(): void {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 1200;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.3, now + 0.01);
      env.gain.linearRampToValueAtTime(0.3, now + 0.08);
      env.gain.linearRampToValueAtTime(0, now + 0.12);

      osc.connect(env);
      env.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Ignore
    }
  }

  /**
   * Play 3 ascending beeps for PACER activation.
   */
  playPacerBeep(): void {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;
      const now = ctx.currentTime;
      const freqs = [800, 1000, 1200];

      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freqs[i];
        const env = ctx.createGain();
        const t = now + i * 0.15;
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.3, t + 0.01);
        env.gain.linearRampToValueAtTime(0.3, t + 0.08);
        env.gain.linearRampToValueAtTime(0, t + 0.12);
        osc.connect(env);
        env.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.13);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Short high-pitched "pi" beep like a cardiac monitor button press.
   */
  playTapClick(): void {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 1400;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.25, now + 0.005);
      env.gain.linearRampToValueAtTime(0.25, now + 0.05);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(env);
      env.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch {
      // Ignore
    }
  }

  stopChargedBeep(): void {
    if (this.chargedBeepInterval !== null) {
      clearInterval(this.chargedBeepInterval);
      this.chargedBeepInterval = null;
    }
  }

  /**
   * Play realistic BP monitor sound — 10 seconds total.
   * Matches real oscillometric BP monitor: motor pump inflating cuff,
   * hold, slow stepped deflation measuring oscillations, release, beeps.
   */
  private nibpBuffer: AudioBuffer | null = null;

  playNIBPSound(): void {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;

      // If buffer already loaded, play immediately
      if (this.nibpBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = this.nibpBuffer;
        const gain = ctx.createGain();
        gain.gain.value = 0.8;
        source.connect(gain);
        gain.connect(this.masterGain);
        source.start();
        return;
      }

      // Load MP3 file and play
      const basePath = import.meta.env.BASE_URL || '/';
      fetch(`${basePath}nibp-sound.mp3`)
        .then(res => res.arrayBuffer())
        .then(arrayBuf => ctx.decodeAudioData(arrayBuf))
        .then(audioBuf => {
          this.nibpBuffer = audioBuf;
          const source = ctx.createBufferSource();
          source.buffer = audioBuf;
          const gain = ctx.createGain();
          gain.gain.value = 0.8;
          source.connect(gain);
          gain.connect(this.masterGain!);
          source.start();
        })
        .catch(() => { /* ignore audio load errors */ });
    } catch {
      // Ignore
    }
  }

  stopAlarm(): void {
    if (this.activeAlarmOsc) {
      try {
        this.activeAlarmOsc.stop();
      } catch {
        // Already stopped
      }
      this.activeAlarmOsc = null;
    }
  }

  destroy(): void {
    this.stopMetronome();
    this.stopAlarm();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isInitialized = false;
  }
}

// Singleton
export const audioEngine = new AudioEngine();
