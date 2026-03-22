import { create } from 'zustand';
import { CardiacRhythm, CapnographyWaveform } from '../types/rhythms';
import { DEFAULT_VITALS } from '../types/vitals';
import type { VitalSigns, AlarmConfig } from '../types/vitals';
import { DEFAULT_ALARMS } from '../types/vitals';

interface VitalSignsStore {
  vitals: VitalSigns;
  rhythm: CardiacRhythm;
  previousRhythm: CardiacRhythm | null;
  rhythmTransitionProgress: number;
  capnographyWaveform: CapnographyWaveform;
  alarms: AlarmConfig[];
  visibleParams: {
    hr: boolean;
    spo2: boolean;
    etco2: boolean;
    bp: boolean;
    rr: boolean;
    temp: boolean;
    ecgWave: boolean;
    spo2Wave: boolean;
    capnoWave: boolean;
    arterialWave: boolean;
  };
  isPaused: boolean;
  startTime: number;

  setVital: <K extends keyof VitalSigns>(key: K, value: VitalSigns[K]) => void;
  setVitals: (partial: Partial<VitalSigns>) => void;
  setRhythm: (rhythm: CardiacRhythm) => void;
  setCapnography: (waveform: CapnographyWaveform) => void;
  setRhythmTransitionProgress: (progress: number) => void;
  setAlarm: (index: number, config: Partial<AlarmConfig>) => void;
  toggleParamVisibility: (param: keyof VitalSignsStore['visibleParams']) => void;
  setAllParamsVisible: (visible: boolean) => void;
  togglePause: () => void;
  reset: () => void;
}

export const useVitalSignsStore = create<VitalSignsStore>((set) => ({
  vitals: { ...DEFAULT_VITALS },
  rhythm: CardiacRhythm.NORMAL_SINUS,
  previousRhythm: null,
  rhythmTransitionProgress: 1,
  capnographyWaveform: CapnographyWaveform.NORMAL,
  alarms: [...DEFAULT_ALARMS],
  visibleParams: {
    hr: true,
    spo2: true,
    etco2: true,
    bp: true,
    rr: true,
    temp: true,
    ecgWave: true,
    spo2Wave: true,
    capnoWave: true,
    arterialWave: true,
  },
  isPaused: false,
  startTime: Date.now(),

  setVital: (key, value) =>
    set((s) => ({ vitals: { ...s.vitals, [key]: value } })),

  setVitals: (partial) =>
    set((s) => ({ vitals: { ...s.vitals, ...partial } })),

  setRhythm: (rhythm) =>
    set((s) => ({
      rhythm,
      previousRhythm: s.rhythm,
      rhythmTransitionProgress: 0,
    })),

  setCapnography: (waveform) => set({ capnographyWaveform: waveform }),

  setRhythmTransitionProgress: (progress) =>
    set({ rhythmTransitionProgress: Math.min(1, progress) }),

  setAlarm: (index, config) =>
    set((s) => {
      const alarms = [...s.alarms];
      alarms[index] = { ...alarms[index], ...config };
      return { alarms };
    }),

  toggleParamVisibility: (param) =>
    set((s) => ({
      visibleParams: { ...s.visibleParams, [param]: !s.visibleParams[param] },
    })),

  setAllParamsVisible: (visible) =>
    set(() => ({
      visibleParams: {
        hr: visible,
        spo2: visible,
        etco2: visible,
        bp: visible,
        rr: visible,
        temp: visible,
        ecgWave: visible,
        spo2Wave: visible,
        capnoWave: visible,
        arterialWave: visible,
      },
    })),

  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),

  reset: () =>
    set({
      vitals: { ...DEFAULT_VITALS },
      rhythm: CardiacRhythm.NORMAL_SINUS,
      previousRhythm: null,
      rhythmTransitionProgress: 1,
      capnographyWaveform: CapnographyWaveform.NORMAL,
      isPaused: false,
      startTime: Date.now(),
    }),
}));
