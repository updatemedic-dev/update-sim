const translations = {
  es: {
    // Top bar
    updateSim: 'UPDATE SIM',
    play: 'Play',
    pause: 'Pausa',
    stop: 'Stop',
    previous: 'Anterior',
    next: 'Siguiente',
    maximize: 'Maximizar',
    minimize: 'Minimizar',

    // Monitor labels
    heartRate: 'Frecuencia Cardíaca',
    leadII: 'DII',
    bloodPressure: 'Presión Arterial',
    spo2Level: 'Nivel SPO2',
    co2Level: 'CO2 mmHg',
    sync: 'SYNC',
    charged: 'CARGADO',

    // Status bar
    shocks: 'Descargas',
    pni: 'PNI',
    measuring: 'Midiendo...',
    rcpActive: 'RCP ACTIVA',

    // Control panel
    settings: 'Ajustes',
    display: 'Pantalla',
    language: 'Idioma',
    noScenario: 'Sin escenario',
    scenarios: 'Escenarios',
    rhythmKeypad: 'Teclado Ritmos',
    medications: 'Medicamentos',
    configuration: 'Configuración',
    pacemaker: 'MARCAPASO',
    rateSelect: 'RATE SELECT',
    mampSelect: 'mAMP SELECT',
    capture: 'CAPTURA',
    noCapture: 'SIN CAPTURA',
    rcp: 'RCP',
    reset: 'RESET',
    temperature: 'Temperatura',
    respiration: 'Respiración',
    energySelected: 'Energía Seleccionada',
    charge: 'Cargar',
    charging: 'Cargando...',
    chargedBtn: 'Cargado ✓',
    shock: 'Shock',
    disarm: 'Desarmar',

    // Disclaimer
    disclaimer: 'AVISO IMPORTANTE',
    disclaimerText: 'UPDATE SIM es un simulador para entrenamiento médico. NO es un dispositivo médico. NO utilizar para diagnóstico o tratamiento de pacientes reales.',
    enter: 'ENTRAR AL SIMULADOR',
    developedBy: 'Desarrollado por Update Medic — Viña del Mar, Chile',

    // Misc
    step: 'Paso',
    showControls: 'Mostrar Controles',
  },
  en: {
    // Top bar
    updateSim: 'UPDATE SIM',
    play: 'Play',
    pause: 'Pause',
    stop: 'Stop',
    previous: 'Previous',
    next: 'Next',
    maximize: 'Maximize',
    minimize: 'Minimize',

    // Monitor labels
    heartRate: 'Heart Rate',
    leadII: 'LEAD II',
    bloodPressure: 'Blood Pressure',
    spo2Level: 'SPO2 Level',
    co2Level: 'CO2 mmHg',
    sync: 'SYNC',
    charged: 'CHARGED',

    // Status bar
    shocks: 'Shocks',
    pni: 'NIBP',
    measuring: 'Measuring...',
    rcpActive: 'CPR ACTIVE',

    // Control panel
    settings: 'Settings',
    display: 'Display',
    language: 'Language',
    noScenario: 'No scenario',
    scenarios: 'Scenarios',
    rhythmKeypad: 'Rhythm Keypad',
    medications: 'Medications',
    configuration: 'Settings',
    pacemaker: 'PACEMAKER',
    rateSelect: 'RATE SELECT',
    mampSelect: 'mAMP SELECT',
    capture: 'CAPTURE',
    noCapture: 'NO CAPTURE',
    rcp: 'CPR',
    reset: 'RESET',
    temperature: 'Temperature',
    respiration: 'Respiration',
    energySelected: 'Energy Selected',
    charge: 'Charge',
    charging: 'Charging...',
    chargedBtn: 'Charged ✓',
    shock: 'Shock',
    disarm: 'Disarm',

    // Disclaimer
    disclaimer: 'IMPORTANT NOTICE',
    disclaimerText: 'UPDATE SIM is a training simulator. It is NOT a medical device. Do NOT use for diagnosis or treatment of real patients.',
    enter: 'ENTER SIMULATOR',
    developedBy: 'Developed by Update Medic — Viña del Mar, Chile',

    // Misc
    step: 'Step',
    showControls: 'Show Controls',
  },
} as const;

export type TranslationKey = keyof typeof translations.es;

export function t(key: TranslationKey, lang: 'es' | 'en'): string {
  return translations[lang][key] || translations.es[key];
}

export default translations;
