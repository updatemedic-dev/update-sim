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
}

// Keys that persist across sessions in localStorage
const PERSISTED_KEYS: (keyof AppSettings)[] = [
  'language', 'waveformSpeed', 'soundEnabled', 'alarmVolume', 'beepVolume',
  'temperatureUnit', 'energyType', 'cprRatio', 'cprMetronomeRate',
  'wakeLockEnabled', 'keyboardShortcutsEnabled',
];

const STORAGE_KEY = 'update-sim-settings';

function loadPersistedSettings(): Partial<AppSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const result: Partial<AppSettings> = {};
    for (const key of PERSISTED_KEYS) {
      if (key in parsed) {
        (result as Record<string, unknown>)[key] = parsed[key];
      }
    }
    return result;
  } catch {
    return {};
  }
}

function savePersistedSettings(state: AppSettings) {
  try {
    const toSave: Partial<AppSettings> = {};
    for (const key of PERSISTED_KEYS) {
      (toSave as Record<string, unknown>)[key] = state[key];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage unavailable (private browsing, quota exceeded)
  }
}

interface SettingsStore extends AppSettings {
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  silenceAlarms: (durationMs?: number) => void;
  toggleAlarmsOff: () => void;
}

const defaults: AppSettings = {
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
};

const persisted = loadPersistedSettings();

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaults,
  ...persisted,

  set: (key, value) => {
    set({ [key]: value });
    savePersistedSettings({ ...get(), [key]: value });
  },

  silenceAlarms: (durationMs = 120000) =>
    set({
      alarmsSilenced: true,
      alarmsSilencedUntil: Date.now() + durationMs,
    }),

  toggleAlarmsOff: () => set((s) => ({ alarmsOff: !s.alarmsOff })),
}));
