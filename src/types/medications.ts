export enum MedicationCategory {
  CARDIAC = "Cardíacos",
  ANTIARRHYTHMIC = "Antiarrítmicos",
  VASOPRESSOR = "Vasopresores",
  SEDATION = "Sedación/Analgesia",
  AIRWAY = "Vía Aérea",
  FLUIDS = "Fluidos",
  REVERSAL = "Antagonistas",
  PEDIATRIC = "Pediátricos",
  OTHER = "Otros",
}

export interface Medication {
  id: string;
  name: string;
  nameEs: string;
  category: MedicationCategory;
  defaultDose: string;
  route: string;
  color: string;
}
