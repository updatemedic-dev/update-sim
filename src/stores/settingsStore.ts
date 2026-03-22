import { create } from 'zustand';

export interface AppSettings {
  language: 'es' | 'en';
  waveformSpeed: 12.5 | 25 | 50;
  soundEnabled: boolean;
  alarmVolume: number;
  beepVolume: number;
  temperatureUnit: 'celsius' | 'fahrenheit';
  energyType: 'biphasic' | 'monophasic';
  cprRatio: '30:2' | '15:2' | 'continuous';
  cprMetronomeRate: number;
  fullscreenOnStart: boolean;
  wakeLockEnabled: boolean;
  showInstructorPanel: boolean;
  keyboardShortcutsEnabled: boolean;
  alarmsSilenced: boolean;
  alarmsSilencedUntil: number;
  alarmsOff: boolean;
  showRhythmName: boolean;
}

interface SettingsStore extends AppSettings {
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  silenceAlarms: (durationMs?: number) => void;
  toggleAlarmsOff: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  language: 'es',
  waveformSpeed: 25,
  soundEnabled: true,
  alarmVolume: 70,
  beepVolume: 50,
  temperatureUnit: 'celsius',
  energyType: 'biphasic',
  cprRatio: '30:2',
  cprMetronomeRate: 110,
  fullscreenOnStart: false,
  wakeLockEnabled: true,
  showInstructorPanel: true,
  keyboardShortcutsEnabled: true,
  alarmsSilenced: false,
  alarmsSilencedUntil: 0,
  alarmsOff: false,
  showRhythmName: true,

  set: (key, value) => set({ [key]: value }),

  silenceAlarms: (durationMs = 120000) =>
    set({
      alarmsSilenced: true,
      alarmsSilencedUntil: Date.now() + durationMs,
    }),

  toggleAlarmsOff: () => set((s) => ({ alarmsOff: !s.alarmsOff })),
}));
