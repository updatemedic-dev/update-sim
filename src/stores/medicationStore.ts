import { create } from 'zustand';
import type { Medication } from '../types/medications';
import { MedicationCategory } from '../types/medications';

export interface MedicationRecord {
  id: string;
  medicationId: string;
  name: string;
  dose: string;
  route: string;
  timestamp: Date;
  elapsedSeconds: number;
}

interface MedicationStore {
  medications: Medication[];
  administered: MedicationRecord[];
  addAdministered: (medicationId: string, startTime: number) => MedicationRecord | undefined;
  clearAdministered: () => void;
}

const DEFAULT_MEDICATIONS: Medication[] = [
  { id: "epinephrine_1mg", name: "Epinephrine 1mg", nameEs: "Epinefrina 1mg", category: MedicationCategory.CARDIAC, defaultDose: "1mg IV/IO", route: "IV/IO", color: "#ef4444" },
  { id: "epinephrine_ped", name: "Epinephrine Ped (0.01mg/kg)", nameEs: "Epinefrina PCR 0.01mg/kg", category: MedicationCategory.PEDIATRIC, defaultDose: "0.01mg/kg IV/IO", route: "IV/IO", color: "#f87171" },
  { id: "epinephrine_ped_inh", name: "Epinephrine 0.5mg/kg INH", nameEs: "Epinefrina 0.5mg/kg Inhalación", category: MedicationCategory.PEDIATRIC, defaultDose: "0.5mg/kg INH", route: "INH", color: "#b45309" },
  { id: "epinephrine_racemic", name: "Racemic Epinephrine 2.25%", nameEs: "Epinefrina Racémica 2.25%", category: MedicationCategory.PEDIATRIC, defaultDose: "2.25% INH", route: "INH", color: "#92400e" },
  { id: "amiodarone_ped", name: "Amiodarone Ped 5mg/kg", nameEs: "Amiodarona 5mg/kg", category: MedicationCategory.PEDIATRIC, defaultDose: "5mg/kg IV/IO", route: "IV/IO", color: "#8b5cf6" },
  { id: "atropine_ped", name: "Atropine Ped 0.02mg/kg", nameEs: "Atropina 0.02mg/kg", category: MedicationCategory.PEDIATRIC, defaultDose: "0.02mg/kg IV/IO", route: "IV/IO", color: "#7c3aed" },
  { id: "lidocaine_ped", name: "Lidocaine Ped 1mg/kg", nameEs: "Lidocaína 1mg/kg bolo", category: MedicationCategory.PEDIATRIC, defaultDose: "1mg/kg IV/IO", route: "IV/IO", color: "#a78bfa" },
  { id: "lidocaine_ped_inf", name: "Lidocaine Ped infusion", nameEs: "Lidocaína 20-50mcg/kg/min infusión", category: MedicationCategory.PEDIATRIC, defaultDose: "20-50mcg/kg/min", route: "IV", color: "#c4b5fd" },
  { id: "adenosine_ped_1", name: "Adenosine Ped 0.1mg/kg", nameEs: "Adenosina 0.1mg/kg (max 6mg)", category: MedicationCategory.PEDIATRIC, defaultDose: "0.1mg/kg IV (max 6mg)", route: "IV", color: "#c084fc" },
  { id: "adenosine_ped_2", name: "Adenosine Ped 0.2mg/kg", nameEs: "Adenosina 0.2mg/kg (max 12mg)", category: MedicationCategory.PEDIATRIC, defaultDose: "0.2mg/kg IV (max 12mg)", route: "IV", color: "#d8b4fe" },
  { id: "dexamethasone_ped", name: "Dexamethasone 0.6mg/kg", nameEs: "Dexametasona 0.6mg/kg", category: MedicationCategory.PEDIATRIC, defaultDose: "0.6mg/kg EV/IM/VO", route: "EV/IM/VO", color: "#ec4899" },
  { id: "magnesium_ped", name: "Magnesium Sulfate Ped", nameEs: "Sulfato de Magnesio 25-50mg/kg", category: MedicationCategory.PEDIATRIC, defaultDose: "25-50mg/kg IV/IO", route: "IV/IO", color: "#a855f7" },
  { id: "ipratropium_ped", name: "Ipratropium Bromide 0.02%", nameEs: "Bromuro de Ipratropio 0.02%", category: MedicationCategory.PEDIATRIC, defaultDose: "0.02% INH", route: "INH", color: "#f97316" },
  { id: "salbutamol_ped", name: "Salbutamol Ped 2.5-5mg", nameEs: "Salbutamol 2.5-5mg Inhalación", category: MedicationCategory.PEDIATRIC, defaultDose: "2.5-5mg INH", route: "INH", color: "#22d3ee" },
  { id: "crystalloid_ped_5", name: "Crystalloid 5-10ml/kg", nameEs: "Cristaloide 5-10ml/kg bolo", category: MedicationCategory.PEDIATRIC, defaultDose: "5-10ml/kg", route: "IV", color: "#3b82f6" },
  { id: "crystalloid_ped_10", name: "Crystalloid 10-20ml/kg", nameEs: "Cristaloide 10-20ml/kg bolo", category: MedicationCategory.PEDIATRIC, defaultDose: "10-20ml/kg", route: "IV", color: "#2563eb" },
  { id: "crystalloid_ped_20", name: "Crystalloid 20ml/kg", nameEs: "Cristaloide 20ml/kg bolo", category: MedicationCategory.PEDIATRIC, defaultDose: "20ml/kg", route: "IV", color: "#1d4ed8" },
  { id: "atropine_05", name: "Atropine 0.5mg", nameEs: "Atropina 0.5mg", category: MedicationCategory.CARDIAC, defaultDose: "0.5mg IV", route: "IV", color: "#f97316" },
  { id: "atropine_1", name: "Atropine 1mg", nameEs: "Atropina 1mg", category: MedicationCategory.CARDIAC, defaultDose: "1mg IV", route: "IV", color: "#f97316" },
  { id: "amiodarone_300", name: "Amiodarone 300mg", nameEs: "Amiodarona 300mg (1era dosis)", category: MedicationCategory.ANTIARRHYTHMIC, defaultDose: "300mg IV/IO", route: "IV/IO", color: "#8b5cf6" },
  { id: "amiodarone_150", name: "Amiodarone 150mg", nameEs: "Amiodarona 150mg (2da dosis)", category: MedicationCategory.ANTIARRHYTHMIC, defaultDose: "150mg IV/IO", route: "IV/IO", color: "#8b5cf6" },
  { id: "lidocaine", name: "Lidocaine 1-1.5mg/kg", nameEs: "Lidocaína 1-1.5mg/kg", category: MedicationCategory.ANTIARRHYTHMIC, defaultDose: "1-1.5mg/kg IV", route: "IV", color: "#a78bfa" },
  { id: "adenosine_6", name: "Adenosine 6mg", nameEs: "Adenosina 6mg", category: MedicationCategory.ANTIARRHYTHMIC, defaultDose: "6mg IV rápido", route: "IV", color: "#c084fc" },
  { id: "adenosine_12", name: "Adenosine 12mg", nameEs: "Adenosina 12mg", category: MedicationCategory.ANTIARRHYTHMIC, defaultDose: "12mg IV rápido", route: "IV", color: "#c084fc" },
  { id: "vasopressin", name: "Vasopressin 40U", nameEs: "Vasopresina 40U", category: MedicationCategory.VASOPRESSOR, defaultDose: "40U IV/IO", route: "IV/IO", color: "#ec4899" },
  { id: "dopamine", name: "Dopamine infusion", nameEs: "Dopamina infusión", category: MedicationCategory.VASOPRESSOR, defaultDose: "2-20 mcg/kg/min", route: "IV", color: "#db2777" },
  { id: "norepinephrine", name: "Norepinephrine infusion", nameEs: "Norepinefrina infusión", category: MedicationCategory.VASOPRESSOR, defaultDose: "0.1-0.5 mcg/kg/min", route: "IV", color: "#be185d" },
  { id: "dobutamine", name: "Dobutamine infusion", nameEs: "Dobutamina infusión", category: MedicationCategory.VASOPRESSOR, defaultDose: "2-20 mcg/kg/min", route: "IV", color: "#e11d48" },
  { id: "bicarbonate", name: "Sodium Bicarbonate", nameEs: "Bicarbonato de Sodio", category: MedicationCategory.OTHER, defaultDose: "1 mEq/kg IV", route: "IV", color: "#6b7280" },
  { id: "calcium", name: "Calcium Chloride/Gluconate", nameEs: "Calcio (Cloruro/Gluconato)", category: MedicationCategory.OTHER, defaultDose: "10-20 mg/kg IV", route: "IV", color: "#9ca3af" },
  { id: "magnesium", name: "Magnesium Sulfate 1-2g", nameEs: "Sulfato de Magnesio 1-2g", category: MedicationCategory.OTHER, defaultDose: "1-2g IV", route: "IV", color: "#d1d5db" },
  { id: "morphine", name: "Morphine 2-4mg", nameEs: "Morfina 2-4mg", category: MedicationCategory.SEDATION, defaultDose: "2-4mg IV", route: "IV", color: "#059669" },
  { id: "fentanyl", name: "Fentanyl", nameEs: "Fentanilo", category: MedicationCategory.SEDATION, defaultDose: "1-2 mcg/kg IV", route: "IV", color: "#10b981" },
  { id: "midazolam", name: "Midazolam", nameEs: "Midazolam", category: MedicationCategory.SEDATION, defaultDose: "0.05-0.1 mg/kg IV", route: "IV", color: "#34d399" },
  { id: "ketamine", name: "Ketamine", nameEs: "Ketamina", category: MedicationCategory.SEDATION, defaultDose: "1-2 mg/kg IV", route: "IV", color: "#6ee7b7" },
  { id: "propofol", name: "Propofol", nameEs: "Propofol", category: MedicationCategory.SEDATION, defaultDose: "1-2.5 mg/kg IV", route: "IV", color: "#a7f3d0" },
  { id: "etomidate", name: "Etomidate", nameEs: "Etomidato", category: MedicationCategory.SEDATION, defaultDose: "0.3 mg/kg IV", route: "IV", color: "#047857" },
  { id: "succinylcholine", name: "Succinylcholine", nameEs: "Succinilcolina", category: MedicationCategory.AIRWAY, defaultDose: "1-1.5 mg/kg IV", route: "IV", color: "#0891b2" },
  { id: "rocuronium", name: "Rocuronium", nameEs: "Rocuronio", category: MedicationCategory.AIRWAY, defaultDose: "0.6-1.2 mg/kg IV", route: "IV", color: "#06b6d4" },
  { id: "naloxone", name: "Naloxone 0.4mg", nameEs: "Naloxona 0.4mg", category: MedicationCategory.REVERSAL, defaultDose: "0.4mg IV/IM/IN", route: "IV/IM/IN", color: "#eab308" },
  { id: "flumazenil", name: "Flumazenil", nameEs: "Flumazenil", category: MedicationCategory.REVERSAL, defaultDose: "0.2mg IV", route: "IV", color: "#facc15" },
  { id: "sugammadex", name: "Sugammadex", nameEs: "Sugammadex", category: MedicationCategory.REVERSAL, defaultDose: "2-16 mg/kg IV", route: "IV", color: "#fde047" },
  { id: "nitroglycerin", name: "Nitroglycerin", nameEs: "Nitroglicerina", category: MedicationCategory.CARDIAC, defaultDose: "0.4mg SL", route: "SL", color: "#dc2626" },
  { id: "aspirin", name: "Aspirin 162-325mg", nameEs: "Aspirina 162-325mg", category: MedicationCategory.CARDIAC, defaultDose: "162-325mg VO", route: "VO", color: "#b91c1c" },
  { id: "heparin", name: "Heparin", nameEs: "Heparina", category: MedicationCategory.OTHER, defaultDose: "60 U/kg IV", route: "IV", color: "#4b5563" },
  { id: "alteplase", name: "Alteplase (tPA)", nameEs: "Alteplasa (tPA)", category: MedicationCategory.OTHER, defaultDose: "15mg bolo IV", route: "IV", color: "#374151" },
  { id: "saline_bolus", name: "Normal Saline 0.9% bolus", nameEs: "Solución Salina 0.9% bolo", category: MedicationCategory.FLUIDS, defaultDose: "500-1000 mL IV", route: "IV", color: "#3b82f6" },
  { id: "ringer_bolus", name: "Ringer's Lactate bolus", nameEs: "Ringer Lactato bolo", category: MedicationCategory.FLUIDS, defaultDose: "500-1000 mL IV", route: "IV", color: "#60a5fa" },
  { id: "dextrose50", name: "Dextrose 50%", nameEs: "Dextrosa 50%", category: MedicationCategory.OTHER, defaultDose: "25g IV", route: "IV", color: "#fbbf24" },
  { id: "diphenhydramine", name: "Diphenhydramine", nameEs: "Difenhidramina", category: MedicationCategory.OTHER, defaultDose: "25-50mg IV", route: "IV", color: "#fb923c" },
  { id: "methylprednisolone", name: "Methylprednisolone", nameEs: "Metilprednisolona", category: MedicationCategory.OTHER, defaultDose: "125mg IV", route: "IV", color: "#f59e0b" },
  { id: "salbutamol", name: "Salbutamol (Albuterol)", nameEs: "Salbutamol (Albuterol)", category: MedicationCategory.AIRWAY, defaultDose: "2.5mg NBZ", route: "INH", color: "#22d3ee" },
  { id: "txa", name: "Tranexamic Acid (TXA)", nameEs: "Ácido Tranexámico (TXA)", category: MedicationCategory.OTHER, defaultDose: "1g IV en 10min", route: "IV", color: "#a3a3a3" },
];

let recordCounter = 0;

export const useMedicationStore = create<MedicationStore>((set, get) => ({
  medications: DEFAULT_MEDICATIONS,
  administered: [],

  addAdministered: (medicationId, startTime) => {
    const med = get().medications.find((m) => m.id === medicationId);
    if (!med) return undefined;
    const record: MedicationRecord = {
      id: `med-${++recordCounter}`,
      medicationId: med.id,
      name: med.nameEs,
      dose: med.defaultDose,
      route: med.route,
      timestamp: new Date(),
      elapsedSeconds: Math.round((Date.now() - startTime) / 1000),
    };
    set((s) => ({ administered: [...s.administered, record] }));
    return record;
  },

  clearAdministered: () => set({ administered: [] }),
}));
