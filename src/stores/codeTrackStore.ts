import { create } from 'zustand';
import type { CodeTrackEntry, CodeTrackEntryType } from '../types/codetrack';

interface CodeTrackStore {
  entries: CodeTrackEntry[];
  isRunning: boolean;
  startTime: number | null;

  start: () => void;
  stop: () => void;
  addEntry: (type: CodeTrackEntryType, description: string, details?: Record<string, unknown>) => void;
  clear: () => void;
  getElapsedSeconds: () => number;
}

let entryCounter = 0;

export const useCodeTrackStore = create<CodeTrackStore>((set, get) => ({
  entries: [],
  isRunning: false,
  startTime: null,

  start: () => {
    const now = Date.now();
    set({ isRunning: true, startTime: now, entries: [] });
    entryCounter = 0;
  },

  stop: () => set({ isRunning: false }),

  addEntry: (type, description, details) => {
    const state = get();
    if (!state.isRunning || state.startTime === null) return;
    const elapsed = (Date.now() - state.startTime) / 1000;
    const entry: CodeTrackEntry = {
      id: `ct-${++entryCounter}`,
      timestamp: new Date(),
      elapsedSeconds: Math.round(elapsed),
      type,
      description,
      details,
    };
    set((s) => ({ entries: [...s.entries, entry] }));
  },

  clear: () => set({ entries: [], isRunning: false, startTime: null }),

  getElapsedSeconds: () => {
    const state = get();
    if (!state.startTime) return 0;
    return Math.round((Date.now() - state.startTime) / 1000);
  },
}));
