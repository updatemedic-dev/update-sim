import { useEffect, useRef, useCallback, useState } from 'react';
import ECGWaveform from './ECGWaveform';
import SpO2Waveform from './SpO2Waveform';
import CapnographyWaveformComponent from './CapnographyWaveform';
import ArterialLineWaveform from './ArterialLineWaveform';
import AlarmIndicator from './AlarmIndicator';
import { useVitalSignsStore } from '../../stores/vitalSignsStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useDefibStore } from '../../stores/defibStore';
import { useScenarioStore } from '../../stores/scenarioStore';
import { useMedicationStore } from '../../stores/medicationStore';
import { audioEngine } from '../../engine/audio/AudioEngine';
import { RHYTHM_DEFINITIONS } from '../../engine/rhythms/rhythmDefinitions';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useWakeLock } from '../../hooks/useWakeLock';
import { t } from '../../i18n';

export default function MonitorScreen() {
  const { vitals, rhythm, isPaused, isStopped, visibleParams, showDescription } = useVitalSignsStore();
  const { soundEnabled, language, wakeLockEnabled } = useSettingsStore();
  const { syncMode, isCharged, shockCount } = useDefibStore();
  const { activeScenario, currentStepIndex } = useScenarioStore();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const lastBeepTimeRef = useRef(0);
  const [elapsedStr, setElapsedStr] = useState('00:00:00');
  const audioInitRef = useRef(false);

  useWakeLock(wakeLockEnabled);

  const initAudio = useCallback(() => {
    if (!audioInitRef.current) {
      audioEngine.init();
      audioInitRef.current = true;
    }
  }, []);

  useEffect(() => {
    const handler = () => initAudio();
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('keydown', handler, { once: true });
    document.addEventListener('touchstart', handler, { once: true });
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [initAudio]);

  // Cardiac beep (silenced during CPR - only metronome plays)
  useEffect(() => {
    if (!soundEnabled || !vitals.hasPulse || vitals.hr <= 0 || isPaused || vitals.cprActive) return;
    const intervalMs = (60 / vitals.hr) * 1000;
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastBeepTimeRef.current > intervalMs * 0.8) {
        audioEngine.playBeep(vitals.spo2);
        lastBeepTimeRef.current = now;
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [soundEnabled, vitals.hr, vitals.spo2, vitals.hasPulse, isPaused, vitals.cprActive]);

  // HR alarm: >= 150 or <= 50 bpm
  useEffect(() => {
    if (!soundEnabled || isPaused || isStopped || !vitals.hasPulse || vitals.hr <= 0 || vitals.cprActive) return;
    const hrOutOfRange = vitals.hr >= 150 || vitals.hr <= 50;
    if (!hrOutOfRange) return;

    // Play alarm every 2 seconds while HR is out of range
    const alarmInterval = setInterval(() => {
      audioEngine.playAlarmTone(vitals.hr >= 150 ? 'high' : 'medium');
    }, 2000);
    // Play immediately
    audioEngine.playAlarmTone(vitals.hr >= 150 ? 'high' : 'medium');

    return () => clearInterval(alarmInterval);
  }, [soundEnabled, vitals.hr, vitals.hasPulse, isPaused, isStopped]);

  // BP alarm: systolic < 90
  useEffect(() => {
    if (!soundEnabled || isPaused || isStopped || !vitals.hasPulse || !vitals.nibpHasReading || vitals.cprActive) return;
    if (vitals.nibpLastSystolic >= 90) return;

    const alarmInterval = setInterval(() => {
      audioEngine.playAlarmTone('high');
    }, 2000);
    audioEngine.playAlarmTone('high');

    return () => clearInterval(alarmInterval);
  }, [soundEnabled, vitals.nibpLastSystolic, vitals.hasPulse, vitals.nibpHasReading, isPaused, isStopped]);

  // Clock timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setElapsedStr(now.toLocaleTimeString('es-CL', { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const rhythmDef = RHYTHM_DEFINITIONS[rhythm];
  const rhythmName = language === 'es' ? rhythmDef.nameEs : rhythmDef.name;
  const _map = Math.round((vitals.systolic + 2 * vitals.diastolic) / 3); void _map;
  const administered = useMedicationStore((s) => s.administered);

  // Abbreviation map for medication display
  const MED_ABBREV: Record<string, string> = {
    epinephrine_1mg: 'ADN 1mg',
    epinephrine_ped: 'ADN Ped',
    atropine_05: 'ATROP 0.5mg',
    atropine_1: 'ATROP 1mg',
    amiodarone_300: 'AMD 300mg',
    amiodarone_150: 'AMD 150mg',
    lidocaine: 'LIDO',
    adenosine_6: 'ADENO 6mg',
    adenosine_12: 'ADENO 12mg',
    vasopressin: 'VASO 40U',
    dopamine: 'DOPA inf',
    norepinephrine: 'NORA inf',
    dobutamine: 'DOBUT inf',
    bicarbonate: 'BICARB',
    calcium: 'Ca++',
    magnesium: 'Mg 1-2g',
    morphine: 'MORF',
    fentanyl: 'FENTA',
    midazolam: 'MDZ',
    ketamine: 'KETA',
    propofol: 'PROPO',
    etomidate: 'ETOMI',
    succinylcholine: 'SUX',
    rocuronium: 'ROC',
    naloxone: 'NALOX',
    flumazenil: 'FLUMA',
    sugammadex: 'SUGAM',
    nitroglycerin: 'NTG',
    aspirin: 'AAS',
    heparin: 'HEP',
    alteplase: 'tPA',
    saline_bolus: 'SF bolo',
    ringer_bolus: 'RL bolo',
    dextrose50: 'DXT 50%',
    diphenhydramine: 'DIFEN',
    methylprednisolone: 'MPRED',
    salbutamol: 'SALB',
    txa: 'TXA',
  };

  // Scenario step info
  const scenarioStep = activeScenario
    ? activeScenario.steps[currentStepIndex]
    : null;
  const totalSteps = activeScenario ? activeScenario.steps.length : 0;

  return (
    <div
      className="flex flex-col w-full h-full bg-black select-none"
      style={{ fontFamily: '"JetBrains Mono", "IBM Plex Mono", monospace' }}
      onClick={initAudio}
    >
      {/* ===== TOP BAR ===== */}
      <div className="flex items-center justify-between h-[76px] px-4 border-b border-gray-800 shrink-0 bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          {/* Logo UPDATE SIM */}
          <img src={`${import.meta.env.BASE_URL}logo-update-sim.jpeg`} alt="UPDATE SIM" className="h-14" />
          {/* Settings gear - triggers parent callback */}
          <button
            onClick={() => {
              // Dispatch custom event to toggle settings panel
              window.dispatchEvent(new CustomEvent('toggleSettings'));
            }}
            className="w-12 h-12 rounded-xl bg-gradient-to-b from-gray-300 to-gray-500 border border-gray-400 shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.5)] hover:from-gray-200 hover:to-gray-400 active:from-gray-500 active:to-gray-600 active:translate-y-[1px] flex items-center justify-center transition-all"
            title="Ajustes"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="#333" strokeWidth="1.5"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="#333" strokeWidth="1.5"/>
            </svg>
          </button>
          {/* Clock in 3D box */}
          <div className="px-4 py-1.5 rounded-xl bg-gradient-to-b from-[#1a1a28] to-[#0d0d18] border border-gray-700 shadow-[0_3px_8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)]">
            <span className="text-4xl font-bold text-green-300 tabular-nums tracking-wider">{elapsedStr}</span>
          </div>
        </div>

        {/* ===== TRANSPORT CONTROLS (3D square buttons) ===== */}
        <div className="flex items-center gap-2">
          {/* Rewind / Previous */}
          <button
            onClick={() => {
              if (activeScenario) {
                const step = useScenarioStore.getState().previousStep();
                if (step) applyStep(step);
              }
            }}
            disabled={!activeScenario}
            className="w-14 h-14 rounded-xl bg-gradient-to-b from-gray-300 to-gray-500 border border-gray-400 shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.5)] hover:from-gray-200 hover:to-gray-400 active:from-gray-500 active:to-gray-600 active:shadow-[0_1px_3px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(0,0,0,0.2)] active:translate-y-[1px] disabled:opacity-30 flex items-center justify-center transition-all"
            title="Anterior"
          >
            <svg width="24" height="20" viewBox="0 0 16 14" fill="none">
              <path d="M8 1L2 7L8 13" stroke="#333" strokeWidth="2.5" strokeLinejoin="round"/>
              <path d="M15 1L9 7L15 13" stroke="#333" strokeWidth="2.5" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => {
              const vs = useVitalSignsStore.getState();
              if (vs.isStopped) {
                vs.play();
                useDefibStore.getState().reset();
                const sc = useScenarioStore.getState();
                if (sc.activeScenario) {
                  const step = sc.getCurrentStep();
                  if (step) applyStep(step);
                } else {
                  sc.reset();
                }
              } else {
                vs.togglePause();
              }
            }}
            className="w-14 h-14 rounded-xl bg-gradient-to-b from-gray-300 to-gray-500 border border-gray-400 shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.5)] hover:from-gray-200 hover:to-gray-400 active:from-gray-500 active:to-gray-600 active:shadow-[0_1px_3px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(0,0,0,0.2)] active:translate-y-[1px] flex items-center justify-center transition-all"
            title={isPaused || isStopped ? 'Play' : 'Pausa'}
          >
            {isPaused || isStopped ? (
              <svg width="22" height="24" viewBox="0 0 14 16" fill="none">
                <path d="M2 1L13 8L2 15V1Z" fill="#333"/>
              </svg>
            ) : (
              <svg width="20" height="24" viewBox="0 0 12 16" fill="none">
                <rect x="1" y="1" width="3.5" height="14" rx="0.5" fill="#333"/>
                <rect x="7.5" y="1" width="3.5" height="14" rx="0.5" fill="#333"/>
              </svg>
            )}
          </button>

          {/* Stop */}
          <button
            onClick={() => { useVitalSignsStore.getState().stop(); useDefibStore.getState().reset(); useScenarioStore.getState().reset(); useMedicationStore.getState().clearAdministered(); audioEngine.stopChargedBeep(); audioEngine.stopMetronome(); audioEngine.stopAlarm(); }}
            className="w-14 h-14 rounded-xl bg-gradient-to-b from-gray-300 to-gray-500 border border-gray-400 shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.5)] hover:from-gray-200 hover:to-gray-400 active:from-gray-500 active:to-gray-600 active:shadow-[0_1px_3px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(0,0,0,0.2)] active:translate-y-[1px] flex items-center justify-center transition-all"
            title="Stop"
          >
            <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="2" width="10" height="10" rx="1" fill="#333"/>
            </svg>
          </button>

          {/* Fast Forward / Next */}
          <button
            onClick={() => {
              if (activeScenario) {
                const step = useScenarioStore.getState().nextStep();
                if (step) applyStep(step);
              }
            }}
            disabled={!activeScenario}
            className="w-14 h-14 rounded-xl bg-gradient-to-b from-gray-300 to-gray-500 border border-gray-400 shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.5)] hover:from-gray-200 hover:to-gray-400 active:from-gray-500 active:to-gray-600 active:shadow-[0_1px_3px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(0,0,0,0.2)] active:translate-y-[1px] disabled:opacity-30 flex items-center justify-center transition-all"
            title="Siguiente"
          >
            <svg width="24" height="20" viewBox="0 0 16 14" fill="none">
              <path d="M1 1L7 7L1 13" stroke="#333" strokeWidth="2.5" strokeLinejoin="round"/>
              <path d="M8 1L14 7L8 13" stroke="#333" strokeWidth="2.5" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="w-14 h-14 rounded-xl bg-gradient-to-b from-gray-300 to-gray-500 border border-gray-400 shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.5)] hover:from-gray-200 hover:to-gray-400 active:from-gray-500 active:to-gray-600 active:shadow-[0_1px_3px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(0,0,0,0.2)] active:translate-y-[1px] flex items-center justify-center transition-all ml-2"
            title={isFullscreen ? 'Minimizar' : 'Maximizar'}
          >
            <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
              {isFullscreen ? (
                <>
                  <path d="M5 1V4H1" stroke="#333" strokeWidth="2"/>
                  <path d="M9 1V4H13" stroke="#333" strokeWidth="2"/>
                  <path d="M5 13V10H1" stroke="#333" strokeWidth="2"/>
                  <path d="M9 13V10H13" stroke="#333" strokeWidth="2"/>
                </>
              ) : (
                <>
                  <path d="M1 5V1H5" stroke="#333" strokeWidth="2"/>
                  <path d="M13 5V1H9" stroke="#333" strokeWidth="2"/>
                  <path d="M1 9V13H5" stroke="#333" strokeWidth="2"/>
                  <path d="M13 9V13H9" stroke="#333" strokeWidth="2"/>
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* ===== SCENARIO INFO BAR ===== */}
      {activeScenario && showDescription && (
        <div className="flex items-center justify-between h-7 px-3 bg-blue-950 border-b border-blue-800 shrink-0 text-xs">
          <span className="text-blue-300 font-bold">{activeScenario.name}</span>
          <span className="text-blue-400">
            {t('step', language)} {currentStepIndex + 1}/{totalSteps}
            {scenarioStep && ` — ${scenarioStep.condition}`}
          </span>
          <span className="text-blue-500 text-[10px]">N = Siguiente</span>
        </div>
      )}

      {/* ===== MAIN AREA: waveforms + values ===== */}
      <div className="flex-1 flex flex-col min-h-0 gap-[2px] p-[2px]">
        {/* ECG Row - larger, 3D panel */}
        <div className="flex-[2] flex min-h-0 rounded-lg border border-gray-800 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_2px_4px_rgba(0,0,0,0.3)]">
          <div className="flex-1 min-w-0">
            <ECGWaveform />
          </div>
          <div className={`w-48 flex flex-col items-end justify-center border-l border-gray-800 px-2 rounded-r-lg transition-colors ${
            !isStopped && vitals.hasPulse && (vitals.hr >= 150 || (vitals.hr <= 50 && vitals.hr > 0))
              ? 'animate-[bgFlash_1s_ease-in-out_infinite]'
              : 'bg-[#050508]'
          }`}>
            {visibleParams.hr && (
              <>
                <span className="text-[10px] text-gray-500">{t('heartRate', language)}</span>
                <span className="text-8xl font-bold leading-none tabular-nums"
                  style={{ color: !isStopped && vitals.hasPulse && (vitals.hr >= 150 || (vitals.hr <= 50 && vitals.hr > 0)) ? '#ff4444' : '#00ffc8' }}>
                  {isStopped ? '--' : (vitals.hasPulse && vitals.hr > 0 ? vitals.hr : '--')}
                </span>
                <span className="text-[10px] text-gray-600">{t('leadII', language)}</span>
              </>
            )}
            {syncMode && <span className="text-[10px] text-yellow-400 animate-pulse mt-1">{t('sync', language)}</span>}
            {isCharged && <span className="text-[10px] text-red-500 font-bold animate-pulse">⚡ {t('charged', language)}</span>}
          </div>
        </div>

        {/* Blood Pressure Row - compact, 3D panel */}
        {visibleParams.bp && (
          <div className="flex-[0.7] flex min-h-0 rounded-lg border border-gray-700 bg-[#0e0e14] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_2px_4px_rgba(0,0,0,0.3)]">
            <div className="flex-1 min-w-0">
              <ArterialLineWaveform />
            </div>
            <div className={`w-48 flex flex-col items-end justify-center border-l border-gray-700 px-2 rounded-r-lg transition-colors ${
              !isStopped && vitals.nibpHasReading && vitals.hasPulse && vitals.nibpLastSystolic < 90
                ? 'animate-[bgFlash_1s_ease-in-out_infinite]'
                : 'bg-[#0c0c12]'
            }`}>
              <span className="text-[10px] text-gray-500">{t('bloodPressure', language)}</span>
              {isStopped ? (
                <span className="text-5xl font-bold leading-none tabular-nums" style={{ color: '#ff0000' }}>--/--</span>
              ) : vitals.nibpHasReading ? (
                <>
                  <span className={`text-5xl font-bold leading-none tabular-nums ${vitals.nibpLastSystolic < 90 ? 'animate-pulse' : ''}`}
                    style={{ color: '#ff0000' }}>
                    {vitals.hasPulse ? `${vitals.nibpLastSystolic}/${vitals.nibpLastDiastolic}` : '--/--'}
                  </span>
                  {vitals.hasPulse && (
                    <span className="text-lg font-bold tabular-nums" style={{ color: '#ff4444' }}>({Math.round((vitals.nibpLastSystolic + 2 * vitals.nibpLastDiastolic) / 3)})</span>
                  )}
                </>
              ) : (
                <span className="text-5xl font-bold leading-none tabular-nums" style={{ color: '#ff0000' }}>
                  {vitals.nibpActive ? '...' : '--/--'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* SpO2 Row - compact, 3D panel */}
        {visibleParams.spo2 && (
          <div className="flex-[0.7] flex min-h-0 rounded-lg border border-gray-700 bg-[#0e0e14] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_2px_4px_rgba(0,0,0,0.3)]">
            <div className="flex-1 min-w-0">
              <SpO2Waveform />
            </div>
            <div className="w-48 flex flex-col items-end justify-center border-l border-gray-700 px-2 bg-[#0c0c12] rounded-r-lg">
              <span className="text-[10px] text-gray-500">{t('spo2Level', language)}</span>
              <span className="text-5xl font-bold leading-none tabular-nums" style={{ color: '#00ffff' }}>
                {isStopped ? '--' : (vitals.hasPulse ? vitals.spo2 : '--')}
              </span>
            </div>
          </div>
        )}

        {/* CO2 Row - compact, 3D panel */}
        {visibleParams.etco2 && (
          <div className="flex-[0.7] flex min-h-0 rounded-lg border border-gray-700 bg-[#0e0e14] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_2px_4px_rgba(0,0,0,0.3)]">
            <div className="flex-1 min-w-0">
              <CapnographyWaveformComponent />
            </div>
            <div className="w-48 flex flex-col items-end justify-center border-l border-gray-700 px-2 bg-[#0c0c12] rounded-r-lg">
              <span className="text-[10px] text-gray-500">{t('co2Level', language)}</span>
              <span className="text-5xl font-bold leading-none tabular-nums" style={{ color: '#ffff00' }}>
                {isStopped ? '--' : (vitals.etco2 > 0 ? vitals.etco2 : '--')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ===== Status indicators ===== */}
      <div className="flex items-center justify-between h-6 px-3 bg-[#0a0a0a] border-t border-gray-800 text-[10px] shrink-0">
        <div className="flex gap-2 items-center flex-1 min-w-0 overflow-hidden">
          <AlarmIndicator />
          {vitals.cprActive && <span className="text-orange-400 font-bold animate-pulse shrink-0">● {t('rcpActive', language)}</span>}
          {!vitals.cprActive && showDescription && <span className="text-gray-500 shrink-0">{rhythmName}</span>}
          {/* Medication log - always visible, not affected by DESC */}
          {administered.length > 0 && (
            <div className="flex gap-1.5 items-center overflow-x-auto scrollbar-none ml-1">
              <span className="text-gray-600 shrink-0">|</span>
              {administered.map((rec, i) => (
                <span key={rec.id} className="text-purple-400 font-bold shrink-0 whitespace-nowrap">
                  {MED_ABBREV[rec.medicationId] || rec.name.substring(0, 8)}
                  {i < administered.length - 1 && <span className="text-gray-600 ml-1">·</span>}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 shrink-0">
          {shockCount > 0 && <span className="text-red-400">{t('shocks', language)}: {shockCount}</span>}
          <span className="text-gray-600">{t('pni', language)}: {vitals.nibpActive ? t('measuring', language) : vitals.nibpHasReading ? `${vitals.nibpLastSystolic}/${vitals.nibpLastDiastolic}` : '--/--'}</span>
        </div>
      </div>
    </div>
  );
}

/** Helper to apply a scenario step to the vital signs store */
function applyStep(step: import('../../data/presetScenarios').PresetScenarioStep) {
  const vs = useVitalSignsStore.getState();
  vs.setRhythm(step.rhythm);
  vs.setVitals({
    hr: step.hr,
    systolic: step.systolic,
    diastolic: step.diastolic,
    spo2: step.spo2,
    etco2: step.etco2,
    respiratoryRate: step.rr,
    hasPulse: step.hasPulse,
    nibpHasReading: false,
  });
}

export { applyStep };
