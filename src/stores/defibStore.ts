import { create } from 'zustand';

export const ENERGY_LEVELS = [1, 2, 3, 4, 5, 7, 10, 15, 20, 30, 50, 70, 100, 120, 150, 200, 250, 300, 360] as const;

export type EnergyLevel = typeof ENERGY_LEVELS[number];

export interface ShockRecord {
  timestamp: Date;
  energy: number;
  synchronized: boolean;
}

interface DefibStore {
  energy: number;
  isCharging: boolean;
  isCharged: boolean;
  chargeProgress: number;
  syncMode: boolean;
  shockCount: number;
  shockHistory: ShockRecord[];
  pacerOn: boolean;
  pacerRate: number;
  pacerCurrent: number;
  pacerCapture: boolean;
  pacerCaptureThreshold: number;

  setEnergy: (energy: number) => void;
  increaseEnergy: () => void;
  decreaseEnergy: () => void;
  startCharge: () => void;
  completeCharge: () => void;
  deliverShock: () => ShockRecord | null;
  disarm: () => void;
  toggleSync: () => void;
  togglePacer: () => void;
  setPacerRate: (rate: number) => void;
  setPacerCurrent: (current: number) => void;
  setPacerCaptureThreshold: (threshold: number) => void;
  reset: () => void;
}

export const useDefibStore = create<DefibStore>((set, get) => ({
  energy: 200,
  isCharging: false,
  isCharged: false,
  chargeProgress: 0,
  syncMode: false,
  shockCount: 0,
  shockHistory: [],
  pacerOn: false,
  pacerRate: 40,
  pacerCurrent: 0,
  pacerCapture: false,
  pacerCaptureThreshold: 50,

  setEnergy: (energy) => set({ energy, isCharged: false, isCharging: false, chargeProgress: 0 }),

  increaseEnergy: () => {
    const { energy } = get();
    const idx = ENERGY_LEVELS.indexOf(energy as EnergyLevel);
    if (idx < ENERGY_LEVELS.length - 1) {
      set({ energy: ENERGY_LEVELS[idx + 1], isCharged: false, isCharging: false, chargeProgress: 0 });
    }
  },

  decreaseEnergy: () => {
    const { energy } = get();
    const idx = ENERGY_LEVELS.indexOf(energy as EnergyLevel);
    if (idx > 0) {
      set({ energy: ENERGY_LEVELS[idx - 1], isCharged: false, isCharging: false, chargeProgress: 0 });
    }
  },

  startCharge: () => set({ isCharging: true, chargeProgress: 0 }),

  completeCharge: () => set({ isCharging: false, isCharged: true, chargeProgress: 1 }),

  deliverShock: () => {
    const state = get();
    if (!state.isCharged) return null;
    const record: ShockRecord = {
      timestamp: new Date(),
      energy: state.energy,
      synchronized: state.syncMode,
    };
    set((s) => ({
      isCharged: false,
      chargeProgress: 0,
      shockCount: s.shockCount + 1,
      shockHistory: [...s.shockHistory, record],
    }));
    return record;
  },

  disarm: () => set({ isCharging: false, isCharged: false, chargeProgress: 0 }),

  toggleSync: () => set((s) => ({ syncMode: !s.syncMode })),

  togglePacer: () => set((s) => ({ pacerOn: !s.pacerOn })),

  setPacerRate: (rate) => set({ pacerRate: Math.max(40, Math.min(180, rate)) }),

  setPacerCurrent: (current) => {
    const clamped = Math.max(0, Math.min(200, current));
    const threshold = get().pacerCaptureThreshold;
    set({
      pacerCurrent: clamped,
      pacerCapture: clamped >= threshold,
    });
  },

  setPacerCaptureThreshold: (threshold) => {
    const current = get().pacerCurrent;
    set({
      pacerCaptureThreshold: threshold,
      pacerCapture: current >= threshold,
    });
  },

  reset: () =>
    set({
      energy: 200,
      isCharging: false,
      isCharged: false,
      chargeProgress: 0,
      syncMode: false,
      shockCount: 0,
      shockHistory: [],
      pacerOn: false,
      pacerRate: 40,
      pacerCurrent: 0,
      pacerCapture: false,
    }),
}));
