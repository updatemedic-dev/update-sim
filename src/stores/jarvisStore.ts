import { create } from 'zustand';

export type JarvisState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'alert';

export interface JarvisMessage {
  id: string;
  text: string;
  type: 'jarvis' | 'system' | 'alert' | 'suggestion';
  timestamp: Date;
}

interface JarvisStore {
  isOpen: boolean;
  isMinimized: boolean;
  state: JarvisState;
  messages: JarvisMessage[];
  currentSpeech: string;
  charIndex: number;
  analysisActive: boolean;
  lastAnalysisTime: number;

  toggle: () => void;
  minimize: () => void;
  maximize: () => void;
  setState: (state: JarvisState) => void;
  addMessage: (text: string, type: JarvisMessage['type']) => void;
  clearMessages: () => void;
  setCurrentSpeech: (text: string) => void;
  setCharIndex: (index: number) => void;
  setAnalysisActive: (active: boolean) => void;
  setLastAnalysisTime: (time: number) => void;
}

let messageCounter = 0;

export const useJarvisStore = create<JarvisStore>((set) => ({
  isOpen: false,
  isMinimized: false,
  state: 'idle',
  messages: [],
  currentSpeech: '',
  charIndex: 0,
  analysisActive: false,
  lastAnalysisTime: 0,

  toggle: () => set((s) => ({ isOpen: !s.isOpen, isMinimized: false })),
  minimize: () => set({ isMinimized: true }),
  maximize: () => set({ isMinimized: false }),
  setState: (state) => set({ state }),
  addMessage: (text, type) => {
    const msg: JarvisMessage = {
      id: `jarvis-${++messageCounter}`,
      text,
      type,
      timestamp: new Date(),
    };
    set((s) => ({
      messages: [...s.messages.slice(-50), msg],
    }));
  },
  clearMessages: () => set({ messages: [] }),
  setCurrentSpeech: (text) => set({ currentSpeech: text, charIndex: 0 }),
  setCharIndex: (index) => set({ charIndex: index }),
  setAnalysisActive: (active) => set({ analysisActive: active }),
  setLastAnalysisTime: (time) => set({ lastAnalysisTime: time }),
}));
