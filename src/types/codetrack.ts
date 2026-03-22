export type CodeTrackEntryType =
  | "rhythm_change"
  | "medication"
  | "shock"
  | "pacer"
  | "cpr_start"
  | "cpr_stop"
  | "vitals_change"
  | "intervention"
  | "note"
  | "rosc"
  | "scenario_start"
  | "scenario_end"
  | "nibp";

export interface CodeTrackEntry {
  id: string;
  timestamp: Date;
  elapsedSeconds: number;
  type: CodeTrackEntryType;
  description: string;
  details?: Record<string, unknown>;
}
