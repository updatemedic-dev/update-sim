/**
 * Audio engine using Web Audio API.
 * Generates beeps, alarms, defib sounds, and CPR metronome in real time.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private beepGain: GainNode | null = null;
  private alarmGain: GainNode | null = null;
  private isInitialized = false;
  private activeAlarmOsc: OscillatorNode | null = null;
  private metronomeInterval: ReturnType<typeof setInterval> | null = null;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    this.beepGain = this.ctx.createGain();
    this.beepGain.gain.value = 0.3;
    this.beepGain.connect(this.masterGain);

    this.alarmGain = this.ctx.createGain();
    this.alarmGain.gain.value = 0.5;
    this.alarmGain.connect(this.masterGain);

    this.isInitialized = true;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx || !this.isInitialized) {
      throw new Error('AudioEngine not initialized');
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
   * Play defibrillator charge sound (ascending tone).
   */
  playChargeSound(durationSec = 3): void {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(2000, now + durationSec);

      const envGain = ctx.createGain();
      envGain.gain.setValueAtTime(0.15, now);
      envGain.gain.linearRampToValueAtTime(0.3, now + durationSec);

      osc.connect(envGain);
      envGain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + durationSec);
    } catch {
      // Ignore
    }
  }

  /**
   * Play defibrillator shock sound.
   */
  playShockSound(): void {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;

      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        data[i] = Math.exp(-t * 15) * (Math.random() * 2 - 1) * 0.8;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const envGain = ctx.createGain();
      envGain.gain.value = 0.6;
      source.connect(envGain);
      envGain.connect(this.masterGain);
      source.start();
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
    let count = 0;

    this.metronomeInterval = setInterval(() => {
      try {
        const ctx = this.ensureContext();
        if (!this.masterGain) return;

        count++;
        const isVent = count % 32 === 31 || count % 32 === 0; // marks ventilation beats
        const freq = isVent ? 440 : 880;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const envGain = ctx.createGain();
        const now = ctx.currentTime;
        envGain.gain.setValueAtTime(0, now);
        envGain.gain.linearRampToValueAtTime(isVent ? 0.5 : 0.3, now + 0.005);
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
   * Play NIBP inflate/deflate sound.
   */
  playNIBPSound(): void {
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;

      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        // Inflate sound: rising noise
        const envelope = t < 1 ? t : Math.max(0, 2 - t);
        data[i] = (Math.random() * 2 - 1) * 0.05 * envelope;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.masterGain);
      source.start(now);
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
