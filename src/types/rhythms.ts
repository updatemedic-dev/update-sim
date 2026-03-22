export enum CardiacRhythm {
  NORMAL_SINUS = "normal_sinus",
  SINUS_BRADYCARDIA = "sinus_bradycardia",
  SINUS_TACHYCARDIA = "sinus_tachycardia",
  SINUS_ARRHYTHMIA = "sinus_arrhythmia",
  SINUS_EXIT_BLOCK = "sinus_exit_block",
  SVT = "svt",
  PEDIATRIC_SVT = "pediatric_svt",
  ATRIAL_FIBRILLATION = "atrial_fibrillation",
  ATRIAL_FLUTTER = "atrial_flutter",
  WANDERING_ATRIAL_PACEMAKER = "wap",
  MULTIFOCAL_ATRIAL_TACHYCARDIA = "mat",
  FIRST_DEGREE_AV_BLOCK = "av_block_1",
  SECOND_DEGREE_TYPE_1 = "av_block_2_type1",
  SECOND_DEGREE_TYPE_2 = "av_block_2_type2",
  THIRD_DEGREE_AV_BLOCK = "av_block_3",
  JUNCTIONAL_RHYTHM = "junctional",
  JUNCTIONAL_TACHYCARDIA = "junctional_tachycardia",
  IDIOVENTRICULAR = "idioventricular",
  ACCELERATED_IDIOVENTRICULAR = "aivr",
  VENTRICULAR_TACHYCARDIA = "vtach",
  POLYMORPHIC_VT = "polymorphic_vt",
  VENTRICULAR_FIBRILLATION = "vfib",
  TORSADES_DE_POINTES = "torsades",
  AGONAL_RHYTHM = "agonal",
  ASYSTOLE = "asystole",
  SINUS_ST_ELEVATION = "sinus_ste",
  SINUS_TACHY_ST_ELEVATION = "tachy_ste",
  SINUS_ST_DEPRESSION = "sinus_std",
  SINUS_WITH_PVCS = "sinus_pvcs",
  SINUS_WITH_PACS = "sinus_pacs",
  BIGEMINY = "bigeminy",
  TRIGEMINY = "trigeminy",
  COUPLET_PVCS = "couplet_pvcs",
  WPW = "wpw",
  BRUGADA_TYPE1 = "brugada",
  PACED_ATRIAL = "paced_atrial",
  PACED_VENTRICULAR = "paced_ventricular",
  PACED_AV_SEQUENTIAL = "paced_av",
}

export type RhythmCategory =
  | "sinus"
  | "supraventricular"
  | "av_block"
  | "junctional"
  | "ventricular"
  | "st_changes"
  | "extrasystoles"
  | "preexcitation"
  | "paced";

export interface WaveformParams {
  pWave: { amplitude: number; width: number; present: boolean };
  prInterval: number;
  qrsWidth: number;
  qWave: { amplitude: number; width: number };
  rWave: { amplitude: number; width: number };
  sWave: { amplitude: number; width: number };
  stSegment: { elevation: number };
  tWave: { amplitude: number; width: number; inverted: boolean };
  irregularity: number;
  baselineWander: number;
}

export interface PhysiologicalDefaults {
  systolicBP: number;
  diastolicBP: number;
  spo2: number;
  etco2: number;
  respiratoryRate: number;
  temperature: number;
}

export interface RhythmDefinition {
  id: CardiacRhythm;
  name: string;
  nameEs: string;
  category: RhythmCategory;
  defaultHR: number;
  hrRange: [number, number];
  hasPulse: boolean;
  isShockable: boolean;
  waveformParams: WaveformParams;
  physiologicalDefaults: PhysiologicalDefaults;
}

export enum CapnographyWaveform {
  NORMAL = "normal",
  HYPOVENTILATION = "hypoventilation",
  HYPERVENTILATION = "hyperventilation",
  BRONCHOSPASM = "bronchospasm",
  COPD = "copd",
  ESOPHAGEAL_INTUBATION = "esophageal",
  REBREATHING = "rebreathing",
  CURARE_CLEFT = "curare_cleft",
  CARDIOGENIC_OSCILLATIONS = "cardiogenic",
  ROSC = "rosc",
  CARDIAC_ARREST = "cardiac_arrest",
  GOOD_CPR = "good_cpr",
  POOR_CPR = "poor_cpr",
  APNEA = "apnea",
  MH_CRISIS = "mh_crisis",
  AIR_LEAK = "air_leak",
  OBSTRUCTION = "obstruction",
  DISCONNECTION = "disconnection",
}
