import { CardiacRhythm } from '../../types/rhythms';
import type { VitalSigns } from '../../types/vitals';
import { RHYTHM_DEFINITIONS } from '../rhythms/rhythmDefinitions';

export interface SimulationContext {
  rhythm: CardiacRhythm;
  vitals: VitalSigns;
  shockCount: number;
  pacerOn: boolean;
  pacerCapture: boolean;
  syncMode: boolean;
  energy: number;
  isCharged: boolean;
  scenarioName: string | null;
  scenarioStep: number;
  scenarioTotal: number;
  medicationsAdministered: string[];
  cprActive: boolean;
  language: 'es' | 'en';
}

interface JarvisAnalysis {
  greeting: string;
  alerts: string[];
  suggestions: string[];
  status: string;
}

const GREETINGS_ES = [
  'Sistema J.A.R.V.I.S. operativo. Monitoreando signos vitales.',
  'Asistente médico activo. Todos los sistemas nominales.',
  'Iniciando protocolo de monitoreo avanzado.',
  'J.A.R.V.I.S. en línea. Listo para asistir.',
];

const GREETINGS_EN = [
  'J.A.R.V.I.S. system operational. Monitoring vital signs.',
  'Medical assistant active. All systems nominal.',
  'Initiating advanced monitoring protocol.',
  'J.A.R.V.I.S. online. Ready to assist.',
];

export function getGreeting(lang: 'es' | 'en'): string {
  const greetings = lang === 'es' ? GREETINGS_ES : GREETINGS_EN;
  return greetings[Math.floor(Math.random() * greetings.length)];
}

export function analyzeSimulation(ctx: SimulationContext): JarvisAnalysis {
  const { rhythm, vitals, language: lang } = ctx;
  const alerts: string[] = [];
  const suggestions: string[] = [];
  const def = RHYTHM_DEFINITIONS[rhythm];
  const es = lang === 'es';

  // === CRITICAL RHYTHM ANALYSIS ===
  if (rhythm === CardiacRhythm.VENTRICULAR_FIBRILLATION || rhythm === CardiacRhythm.POLYMORPHIC_VT) {
    alerts.push(es
      ? '⚠ RITMO DESFIBRILABLE DETECTADO. Descarga inmediata recomendada.'
      : '⚠ SHOCKABLE RHYTHM DETECTED. Immediate defibrillation recommended.');
    if (!ctx.cprActive) {
      suggestions.push(es
        ? 'Iniciar RCP de alta calidad. Minimizar interrupciones.'
        : 'Start high-quality CPR. Minimize interruptions.');
    }
    if (ctx.shockCount === 0) {
      suggestions.push(es
        ? `Cargar desfibrilador a ${ctx.energy}J y preparar descarga.`
        : `Charge defibrillator to ${ctx.energy}J and prepare shock.`);
    }
    if (!ctx.medicationsAdministered.includes('epinephrine_1mg') && ctx.shockCount >= 1) {
      suggestions.push(es
        ? 'Considerar Epinefrina 1mg IV/IO cada 3-5 min.'
        : 'Consider Epinephrine 1mg IV/IO every 3-5 min.');
    }
    if (!ctx.medicationsAdministered.includes('amiodarone_300') && ctx.shockCount >= 2) {
      suggestions.push(es
        ? 'Considerar Amiodarona 300mg IV/IO (primera dosis).'
        : 'Consider Amiodarone 300mg IV/IO (first dose).');
    }
  }

  if (rhythm === CardiacRhythm.VENTRICULAR_TACHYCARDIA) {
    if (vitals.hasPulse) {
      alerts.push(es
        ? '⚠ TV con pulso detectada. Evaluar estabilidad hemodinámica.'
        : '⚠ VTach with pulse detected. Assess hemodynamic stability.');
      suggestions.push(es
        ? 'Si estable: Amiodarona 150mg IV en 10 min. Si inestable: Cardioversión sincronizada.'
        : 'If stable: Amiodarone 150mg IV over 10 min. If unstable: Synchronized cardioversion.');
      if (!ctx.syncMode && vitals.systolic < 90) {
        suggestions.push(es
          ? 'Paciente inestable — activar modo SYNC para cardioversión.'
          : 'Patient unstable — activate SYNC mode for cardioversion.');
      }
    } else {
      alerts.push(es
        ? '⚠ TV sin pulso — tratar como FV. Descarga no sincronizada.'
        : '⚠ Pulseless VTach — treat as VFib. Unsynchronized shock.');
    }
  }

  if (rhythm === CardiacRhythm.ASYSTOLE) {
    alerts.push(es
      ? '⚠ ASISTOLIA. Ritmo NO desfibrilable.'
      : '⚠ ASYSTOLE. NON-shockable rhythm.');
    suggestions.push(es
      ? 'RCP continua + Epinefrina 1mg IV/IO cada 3-5 min. Buscar causas reversibles (Hs y Ts).'
      : 'Continuous CPR + Epinephrine 1mg IV/IO every 3-5 min. Search for reversible causes (Hs and Ts).');
  }

  if (rhythm === CardiacRhythm.AGONAL_RHYTHM) {
    alerts.push(es
      ? '⚠ Ritmo agonal detectado. Considerar como asistolia.'
      : '⚠ Agonal rhythm detected. Consider as asystole.');
  }

  if (rhythm === CardiacRhythm.TORSADES_DE_POINTES) {
    alerts.push(es
      ? '⚠ Torsades de Pointes detectada.'
      : '⚠ Torsades de Pointes detected.');
    suggestions.push(es
      ? 'Sulfato de Magnesio 1-2g IV. Si inestable: descarga no sincronizada.'
      : 'Magnesium Sulfate 1-2g IV. If unstable: unsynchronized shock.');
  }

  // === BRADYCARDIA ===
  if (vitals.hr > 0 && vitals.hr < 50 && vitals.hasPulse) {
    alerts.push(es
      ? '⚠ Bradicardia significativa (FC < 50).'
      : '⚠ Significant bradycardia (HR < 50).');
    if (!ctx.medicationsAdministered.includes('atropine_05') && !ctx.medicationsAdministered.includes('atropine_1')) {
      suggestions.push(es
        ? 'Considerar Atropina 0.5-1mg IV. Máximo 3mg.'
        : 'Consider Atropine 0.5-1mg IV. Maximum 3mg.');
    }
    if (!ctx.pacerOn && vitals.systolic < 90) {
      suggestions.push(es
        ? 'Considerar marcapaso transcutáneo por inestabilidad hemodinámica.'
        : 'Consider transcutaneous pacing for hemodynamic instability.');
    }
  }

  // === SVT ===
  if (rhythm === CardiacRhythm.SVT || rhythm === CardiacRhythm.PEDIATRIC_SVT) {
    alerts.push(es
      ? '⚠ Taquicardia supraventricular detectada.'
      : '⚠ Supraventricular tachycardia detected.');
    if (!ctx.medicationsAdministered.includes('adenosine_6')) {
      suggestions.push(es
        ? 'Intentar maniobras vagales. Si falla: Adenosina 6mg IV rápido.'
        : 'Attempt vagal maneuvers. If fails: Adenosine 6mg rapid IV push.');
    } else if (!ctx.medicationsAdministered.includes('adenosine_12')) {
      suggestions.push(es
        ? 'Considerar segunda dosis: Adenosina 12mg IV rápido.'
        : 'Consider second dose: Adenosine 12mg rapid IV push.');
    }
  }

  // === AV BLOCKS ===
  if (rhythm === CardiacRhythm.THIRD_DEGREE_AV_BLOCK) {
    alerts.push(es
      ? '⚠ Bloqueo AV de tercer grado (completo) detectado.'
      : '⚠ Third-degree (complete) AV block detected.');
    suggestions.push(es
      ? 'Preparar marcapaso transcutáneo. Considerar Atropina mientras se prepara.'
      : 'Prepare transcutaneous pacing. Consider Atropine while preparing.');
  }

  if (rhythm === CardiacRhythm.SECOND_DEGREE_TYPE_2) {
    alerts.push(es
      ? '⚠ Bloqueo AV tipo II detectado. Riesgo de progresión a bloqueo completo.'
      : '⚠ Type II AV block detected. Risk of progression to complete block.');
  }

  // === VITAL SIGN ALERTS ===
  if (vitals.spo2 > 0 && vitals.spo2 < 90 && vitals.hasPulse) {
    alerts.push(es
      ? `⚠ Hipoxemia: SpO2 ${vitals.spo2}%. Optimizar oxigenación.`
      : `⚠ Hypoxemia: SpO2 ${vitals.spo2}%. Optimize oxygenation.`);
  }

  if (vitals.systolic > 0 && vitals.systolic < 90 && vitals.hasPulse) {
    alerts.push(es
      ? `⚠ Hipotensión: PA ${vitals.systolic}/${vitals.diastolic}. Considerar vasopresores.`
      : `⚠ Hypotension: BP ${vitals.systolic}/${vitals.diastolic}. Consider vasopressors.`);
  }

  if (vitals.etco2 > 0 && vitals.etco2 < 10 && ctx.cprActive) {
    suggestions.push(es
      ? 'EtCO2 bajo durante RCP. Evaluar calidad de compresiones.'
      : 'Low EtCO2 during CPR. Assess compression quality.');
  }

  if (vitals.etco2 >= 40 && ctx.cprActive) {
    suggestions.push(es
      ? '↑ EtCO2 elevado durante RCP — posible ROSC. Verificar pulso.'
      : '↑ Elevated EtCO2 during CPR — possible ROSC. Check pulse.');
  }

  if (vitals.temperature > 0 && vitals.temperature >= 39) {
    alerts.push(es
      ? `⚠ Hipertermia: ${vitals.temperature}°C. Considerar causas.`
      : `⚠ Hyperthermia: ${vitals.temperature}°C. Consider causes.`);
  }

  if (vitals.temperature > 0 && vitals.temperature <= 34) {
    alerts.push(es
      ? `⚠ Hipotermia: ${vitals.temperature}°C. Considerar calentamiento activo.`
      : `⚠ Hypothermia: ${vitals.temperature}°C. Consider active rewarming.`);
  }

  // === PACER ANALYSIS ===
  if (ctx.pacerOn && !ctx.pacerCapture) {
    suggestions.push(es
      ? 'Marcapaso sin captura. Aumentar miliamperios gradualmente.'
      : 'Pacemaker not capturing. Gradually increase milliamps.');
  }

  // === CPR QUALITY ===
  if (ctx.cprActive && vitals.hr === 0) {
    suggestions.push(es
      ? 'RCP en curso. Asegurar compresiones 100-120/min, profundidad 5-6 cm.'
      : 'CPR in progress. Ensure compressions 100-120/min, depth 5-6 cm.');
  }

  // === DEFIBRILLATOR STATE ===
  if (ctx.isCharged && def.isShockable) {
    suggestions.push(es
      ? '⚡ Desfibrilador cargado. Listo para descarga. Asegurar que todos se alejen.'
      : '⚡ Defibrillator charged. Ready to shock. Ensure everyone is clear.');
  }

  if (ctx.syncMode && !def.isShockable && rhythm !== CardiacRhythm.SVT && rhythm !== CardiacRhythm.ATRIAL_FIBRILLATION && rhythm !== CardiacRhythm.ATRIAL_FLUTTER) {
    suggestions.push(es
      ? 'Modo SYNC activo pero el ritmo actual no requiere cardioversión sincronizada.'
      : 'SYNC mode active but current rhythm does not require synchronized cardioversion.');
  }

  // === STATUS LINE ===
  let status: string;
  if (alerts.length > 0) {
    status = es ? 'ALERTA — Intervención requerida' : 'ALERT — Intervention required';
  } else if (vitals.hr === 0 || !vitals.hasPulse) {
    status = es ? 'SIN PULSO — Protocolo de emergencia' : 'NO PULSE — Emergency protocol';
  } else if (vitals.hr > 100) {
    status = es ? 'Taquicardia — Monitoreando' : 'Tachycardia — Monitoring';
  } else if (vitals.hr < 60 && vitals.hr > 0) {
    status = es ? 'Bradicardia — Monitoreando' : 'Bradycardia — Monitoring';
  } else {
    status = es ? 'Signos vitales estables' : 'Vital signs stable';
  }

  return {
    greeting: getGreeting(lang),
    alerts,
    suggestions,
    status,
  };
}

export function getRhythmDescription(rhythm: CardiacRhythm, lang: 'es' | 'en'): string {
  const def = RHYTHM_DEFINITIONS[rhythm];
  const es = lang === 'es';

  const descriptions: Partial<Record<CardiacRhythm, { es: string; en: string }>> = {
    [CardiacRhythm.NORMAL_SINUS]: {
      es: 'Ritmo sinusal normal. Frecuencia y morfología dentro de parámetros normales.',
      en: 'Normal sinus rhythm. Rate and morphology within normal parameters.',
    },
    [CardiacRhythm.VENTRICULAR_FIBRILLATION]: {
      es: 'Fibrilación ventricular. Actividad eléctrica caótica sin gasto cardíaco efectivo. Requiere desfibrilación inmediata.',
      en: 'Ventricular fibrillation. Chaotic electrical activity with no effective cardiac output. Requires immediate defibrillation.',
    },
    [CardiacRhythm.VENTRICULAR_TACHYCARDIA]: {
      es: 'Taquicardia ventricular. Ritmo rápido de origen ventricular. Evaluar presencia de pulso.',
      en: 'Ventricular tachycardia. Rapid rhythm of ventricular origin. Assess for pulse.',
    },
    [CardiacRhythm.ASYSTOLE]: {
      es: 'Asistolia. Ausencia de actividad eléctrica cardíaca. Ritmo no desfibrilable.',
      en: 'Asystole. Absence of cardiac electrical activity. Non-shockable rhythm.',
    },
    [CardiacRhythm.SVT]: {
      es: 'Taquicardia supraventricular. Ritmo regular estrecho rápido. Considerar maniobras vagales o adenosina.',
      en: 'Supraventricular tachycardia. Rapid narrow regular rhythm. Consider vagal maneuvers or adenosine.',
    },
    [CardiacRhythm.ATRIAL_FIBRILLATION]: {
      es: 'Fibrilación auricular. Ritmo irregularmente irregular. Evaluar control de frecuencia.',
      en: 'Atrial fibrillation. Irregularly irregular rhythm. Assess rate control.',
    },
    [CardiacRhythm.THIRD_DEGREE_AV_BLOCK]: {
      es: 'Bloqueo AV completo. Disociación auriculoventricular total. Puede requerir marcapaso.',
      en: 'Complete AV block. Total atrioventricular dissociation. May require pacing.',
    },
    [CardiacRhythm.SINUS_BRADYCARDIA]: {
      es: 'Bradicardia sinusal. Ritmo sinusal con frecuencia inferior a 60 lpm.',
      en: 'Sinus bradycardia. Sinus rhythm with rate below 60 bpm.',
    },
    [CardiacRhythm.SINUS_TACHYCARDIA]: {
      es: 'Taquicardia sinusal. Ritmo sinusal con frecuencia superior a 100 lpm. Buscar causa subyacente.',
      en: 'Sinus tachycardia. Sinus rhythm with rate above 100 bpm. Search for underlying cause.',
    },
    [CardiacRhythm.TORSADES_DE_POINTES]: {
      es: 'Torsades de Pointes. TV polimórfica con QT prolongado. Magnesio IV es tratamiento de elección.',
      en: 'Torsades de Pointes. Polymorphic VT with prolonged QT. IV Magnesium is treatment of choice.',
    },
  };

  const desc = descriptions[rhythm];
  if (desc) return es ? desc.es : desc.en;

  return es ? `${def.nameEs}. FC objetivo: ${def.hrRange[0]}-${def.hrRange[1]} lpm.`
    : `${def.name}. Target HR: ${def.hrRange[0]}-${def.hrRange[1]} bpm.`;
}
