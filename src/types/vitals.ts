export interface VitalSigns {
  hr: number;
  systolic: number;
  diastolic: number;
  map: number;
  spo2: number;
  etco2: number;
  respiratoryRate: number;
  temperature: number;
  hasPulse: boolean;
  nibpActive: boolean;
  nibpLastSystolic: number;
  nibpLastDiastolic: number;
  nibpTimer: number;
  nibpInterval: number;
  cprActive: boolean;
  nibpHasReading: boolean;
}

export interface AlarmConfig {
  parameter: keyof Pick<VitalSigns, 'hr' | 'spo2' | 'etco2' | 'systolic' | 'diastolic' | 'respiratoryRate' | 'temperature'>;
  highLimit: number;
  lowLimit: number;
  enabled: boolean;
  priority: 'high' | 'medium' | 'low';
}

export type AlarmState = 'normal' | 'high' | 'medium' | 'low';

export interface AlarmStatus {
  hr: AlarmState;
  spo2: AlarmState;
  etco2: AlarmState;
  systolic: AlarmState;
  diastolic: AlarmState;
  respiratoryRate: AlarmState;
  temperature: AlarmState;
}

export const DEFAULT_VITALS: VitalSigns = {
  hr: 72,
  systolic: 120,
  diastolic: 80,
  map: 93,
  spo2: 98,
  etco2: 35,
  respiratoryRate: 16,
  temperature: 36.5,
  hasPulse: true,
  nibpActive: false,
  nibpLastSystolic: 120,
  nibpLastDiastolic: 80,
  nibpTimer: 0,
  nibpInterval: 180,
  cprActive: false,
  nibpHasReading: false,
};

export const DEFAULT_ALARMS: AlarmConfig[] = [
  { parameter: 'hr', highLimit: 120, lowLimit: 50, enabled: true, priority: 'high' },
  { parameter: 'spo2', highLimit: 100, lowLimit: 90, enabled: true, priority: 'high' },
  { parameter: 'etco2', highLimit: 45, lowLimit: 30, enabled: true, priority: 'medium' },
  { parameter: 'systolic', highLimit: 160, lowLimit: 90, enabled: true, priority: 'medium' },
  { parameter: 'diastolic', highLimit: 90, lowLimit: 60, enabled: true, priority: 'low' },
  { parameter: 'respiratoryRate', highLimit: 25, lowLimit: 10, enabled: true, priority: 'medium' },
  { parameter: 'temperature', highLimit: 38.5, lowLimit: 35.5, enabled: true, priority: 'low' },
];
