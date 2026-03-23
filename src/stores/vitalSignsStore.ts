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
  showDescription: boolean;
  isStopped: boolean;
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
  toggleDescription: () => void;
  togglePause: () => void;
  stop: () => void;
  play: () => void;
  reset: () => void;
  resetToZero: () => void;
  shockPause: () => void;
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
  showDescription: false,
  isStopped: false,
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
    set((s) => {
      const newVal = !s.visibleParams[param];
      const updates: Partial<typeof s.visibleParams> = { [param]: newVal };
      // Sync waveform visibility with param visibility
      if (param === 'bp') updates.arterialWave = newVal;
      if (param === 'spo2') updates.spo2Wave = newVal;
      if (param === 'etco2') updates.capnoWave = newVal;
      return { visibleParams: { ...s.visibleParams, ...updates } };
    }),

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

  toggleDescription: () => set((s) => ({ showDescription: !s.showDescription })),

  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),

  stop: () =>
    set({
      isStopped: true,
      isPaused: true,
      vitals: {
        ...DEFAULT_VITALS,
        hr: 0,
        systolic: 0,
        diastolic: 0,
        map: 0,
        spo2: 0,
        etco2: 0,
        respiratoryRate: 0,
        hasPulse: false,
        nibpHasReading: false,
      },
      visibleParams: {
        hr: true,
        spo2: true,
        etco2: true,
        bp: true,
        rr: true,
        temp: true,
        ecgWave: false,
        spo2Wave: false,
        capnoWave: false,
        arterialWave: false,
      },
    }),

  play: () =>
    set({
      isStopped: false,
      isPaused: false,
      vitals: { ...DEFAULT_VITALS },
      rhythm: CardiacRhythm.NORMAL_SINUS,
      previousRhythm: null,
      rhythmTransitionProgress: 1,
      capnographyWaveform: CapnographyWaveform.NORMAL,
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
      showDescription: false,
      startTime: Date.now(),
    }),

  reset: () =>
    set({
      vitals: { ...DEFAULT_VITALS },
      rhythm: CardiacRhythm.NORMAL_SINUS,
      previousRhythm: null,
      rhythmTransitionProgress: 1,
      capnographyWaveform: CapnographyWaveform.NORMAL,
      showDescription: false,
      isStopped: false,
      isPaused: false,
      startTime: Date.now(),
    }),

  resetToZero: () =>
    set((s) => ({
      vitals: {
        ...s.vitals,
        hr: 0,
        systolic: 0,
        diastolic: 0,
        map: 0,
        spo2: 0,
        etco2: 0,
        hasPulse: false,
      },
    })),

  shockPause: () => {
    const state = useVitalSignsStore.getState();
    const savedRhythm = state.rhythm;
    const savedVitals = { ...state.vitals };
    // Switch to asystole
    set({
      rhythm: CardiacRhythm.ASYSTOLE,
      previousRhythm: savedRhythm,
      rhythmTransitionProgress: 1,
      vitals: { ...savedVitals, hr: 0, hasPulse: false },
    });
    // Restore after 2 seconds
    setTimeout(() => {
      set({
        rhythm: savedRhythm,
        previousRhythm: CardiacRhythm.ASYSTOLE,
        rhythmTransitionProgress: 0,
        vitals: savedVitals,
      });
    }, 2000);
  },
}));
