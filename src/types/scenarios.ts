import type { CardiacRhythm, CapnographyWaveform } from './rhythms';
import type { VitalSigns } from './vitals';

export type ScenarioCategory = "ACLS" | "PALS" | "NRP" | "UPDATE" | "CUSTOM";
export type ScenarioDifficulty = "basic" | "intermediate" | "advanced";

export interface PatientProfile {
  age: string;
  weight: string;
  sex: "M" | "F";
  history: string;
  presentation: string;
}

export interface ScenarioTriggerCondition {
  type: "medication" | "shock" | "time" | "manual";
  medication?: string;
  energyMin?: number;
  timeSeconds?: number;
}

export interface ScenarioStep {
  id: number;
  timestamp: number;
  rhythm: CardiacRhythm;
  vitals: Partial<VitalSigns>;
  capnography?: CapnographyWaveform;
  prompt?: string;
  autoAdvance: boolean;
  triggerCondition?: ScenarioTriggerCondition;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
}

export interface Scenario {
  id: string;
  name: string;
  nameEs: string;
  category: ScenarioCategory;
  description: string;
  descriptionEs: string;
  duration: number;
  difficulty: ScenarioDifficulty;
  patientProfile: PatientProfile;
  steps: ScenarioStep[];
}
