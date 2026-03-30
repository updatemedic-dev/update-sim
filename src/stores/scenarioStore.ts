import { create } from 'zustand';
import type { PresetScenario, PresetScenarioStep } from '../data/presetScenarios';
import { PRESET_SCENARIOS } from '../data/presetScenarios';

interface ScenarioStore {
  scenarios: PresetScenario[];
  activeScenario: PresetScenario | null;
  currentStepIndex: number;
  isRunning: boolean;

  loadScenario: (scenarioId: string) => void;
  nextStep: () => PresetScenarioStep | null;
  previousStep: () => PresetScenarioStep | null;
  getCurrentStep: () => PresetScenarioStep | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
  isLastStep: () => boolean;
}

export const useScenarioStore = create<ScenarioStore>((set, get) => ({
  scenarios: PRESET_SCENARIOS,
  activeScenario: null,
  currentStepIndex: 0,
  isRunning: false,

  loadScenario: (scenarioId) => {
    const scenario = PRESET_SCENARIOS.find((s) => s.id === scenarioId) ?? null;
    set({ activeScenario: scenario, currentStepIndex: 0, isRunning: false });
  },

  nextStep: () => {
    const { activeScenario, currentStepIndex } = get();
    if (!activeScenario) return null;
    if (currentStepIndex >= activeScenario.steps.length - 1) return null;
    const nextIdx = currentStepIndex + 1;
    set({ currentStepIndex: nextIdx });
    return activeScenario.steps[nextIdx];
  },

  previousStep: () => {
    const { activeScenario, currentStepIndex } = get();
    if (!activeScenario) return null;
    const prevIdx = Math.max(currentStepIndex - 1, 0);
    set({ currentStepIndex: prevIdx });
    return activeScenario.steps[prevIdx];
  },

  getCurrentStep: () => {
    const { activeScenario, currentStepIndex } = get();
    if (!activeScenario) return null;
    return activeScenario.steps[currentStepIndex] ?? null;
  },

  start: () => set({ isRunning: true }),
  stop: () => set({ isRunning: false }),

  reset: () => set({ activeScenario: null, currentStepIndex: 0, isRunning: false }),

  isLastStep: () => {
    const { activeScenario, currentStepIndex } = get();
    if (!activeScenario) return false;
    return currentStepIndex >= activeScenario.steps.length - 1;
  },
}));
