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
import { audioEngine } from '../../engine/audio/AudioEngine';
import { RHYTHM_DEFINITIONS } from '../../engine/rhythms/rhythmDefinitions';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useWakeLock } from '../../hooks/useWakeLock';

export default function MonitorScreen() {
  const { vitals, rhythm, isPaused, visibleParams } = useVitalSignsStore();
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
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [initAudio]);

  // Cardiac beep
  useEffect(() => {
    if (!soundEnabled || !vitals.hasPulse || vitals.hr <= 0 || isPaused) return;
    const intervalMs = (60 / vitals.hr) * 1000;
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastBeepTimeRef.current > intervalMs * 0.8) {
        audioEngine.playBeep(vitals.spo2);
        lastBeepTimeRef.current = now;
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [soundEnabled, vitals.hr, vitals.spo2, vitals.hasPulse, isPaused]);

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
  const map = Math.round((vitals.systolic + 2 * vitals.diastolic) / 3);

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
      <div className="flex items-center justify-between h-10 px-3 border-b border-gray-800 shrink-0 bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-blue-400 tracking-wider">UPDATE SIM</span>
          <span className="text-lg font-bold text-green-300 tabular-nums">{elapsedStr}</span>
        </div>
        <div className="flex items-center gap-1">
          {activeScenario && (
            <>
              <button
                onClick={() => {
                  const step = useScenarioStore.getState().previousStep();
                  if (step) applyStep(step);
                }}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300"
              >◄◄ Anterior</button>
              <button
                onClick={() => {
                  const step = useScenarioStore.getState().nextStep();
                  if (step) applyStep(step);
                }}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300"
              >Siguiente ►►</button>
            </>
          )}
          <button
            onClick={() => useVitalSignsStore.getState().togglePause()}
            className={`px-3 py-1 rounded text-xs font-bold ${isPaused ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            {isPaused ? '▶ Reanudar' : '⏸ Pausa'}
          </button>
          <button
            onClick={() => { useVitalSignsStore.getState().reset(); useDefibStore.getState().reset(); useScenarioStore.getState().reset(); }}
            className="px-3 py-1 bg-gray-800 hover:bg-red-900 rounded text-xs text-gray-300"
          >✕ Reset</button>
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300"
          >
            {isFullscreen ? '⊡ Minimizar' : '⊞ Maximizar'}
          </button>
        </div>
      </div>

      {/* ===== SCENARIO INFO BAR ===== */}
      {activeScenario && (
        <div className="flex items-center justify-between h-7 px-3 bg-blue-950 border-b border-blue-800 shrink-0 text-xs">
          <span className="text-blue-300 font-bold">{activeScenario.name}</span>
          <span className="text-blue-400">
            Paso {currentStepIndex + 1}/{totalSteps}
            {scenarioStep && ` — ${scenarioStep.condition}`}
          </span>
          <span className="text-blue-500 text-[10px]">N = Siguiente</span>
        </div>
      )}

      {/* ===== MAIN AREA: waveforms + values ===== */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* ECG Row */}
        <div className="flex-1 flex min-h-0 border-b border-gray-900">
          <div className="flex-1 min-w-0">
            <ECGWaveform />
          </div>
          <div className="w-40 flex flex-col items-end justify-center border-l border-gray-900 px-2">
            {visibleParams.hr && (
              <>
                <span className="text-[10px] text-gray-500">Heart Rate</span>
                <span className="text-5xl font-bold leading-none tabular-nums" style={{ color: '#00ff00' }}>
                  {vitals.hasPulse && vitals.hr > 0 ? vitals.hr : '--'}
                </span>
                <span className="text-[10px] text-gray-600">LEAD II</span>
              </>
            )}
            {syncMode && <span className="text-[10px] text-yellow-400 animate-pulse mt-1">SYNC</span>}
            {isCharged && <span className="text-[10px] text-red-500 font-bold animate-pulse">⚡ CARGADO</span>}
          </div>
        </div>

        {/* Blood Pressure Row */}
        <div className="flex-1 flex min-h-0 border-b border-gray-900">
          <div className="flex-1 min-w-0">
            <ArterialLineWaveform />
          </div>
          <div className="w-40 flex flex-col items-end justify-center border-l border-gray-900 px-2">
            {visibleParams.bp && (
              <>
                <span className="text-[10px] text-gray-500">Blood Pressure</span>
                <span className="text-4xl font-bold leading-none tabular-nums" style={{ color: '#ff0000' }}>
                  {vitals.hasPulse ? `${vitals.systolic}/${vitals.diastolic}` : '--/--'}
                </span>
                {vitals.hasPulse && (
                  <span className="text-lg font-bold tabular-nums" style={{ color: '#ff4444' }}>({map})</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* SpO2 Row */}
        <div className="flex-1 flex min-h-0 border-b border-gray-900">
          <div className="flex-1 min-w-0">
            <SpO2Waveform />
          </div>
          <div className="w-40 flex flex-col items-end justify-center border-l border-gray-900 px-2">
            {visibleParams.spo2 && (
              <>
                <span className="text-[10px] text-gray-500">SPO2 Level</span>
                <span className="text-5xl font-bold leading-none tabular-nums" style={{ color: '#00ffff' }}>
                  {vitals.hasPulse ? vitals.spo2 : '--'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* CO2 Row */}
        <div className="flex-1 flex min-h-0 border-b border-gray-900">
          <div className="flex-1 min-w-0">
            <CapnographyWaveformComponent />
          </div>
          <div className="w-40 flex flex-col items-end justify-center border-l border-gray-900 px-2">
            {visibleParams.etco2 && (
              <>
                <span className="text-[10px] text-gray-500">CO2 level mmHg</span>
                <span className="text-5xl font-bold leading-none tabular-nums" style={{ color: '#ffff00' }}>
                  {vitals.etco2 > 0 ? vitals.etco2 : '--'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== Status indicators ===== */}
      <div className="flex items-center justify-between h-6 px-3 bg-[#0a0a0a] border-t border-gray-800 text-[10px] shrink-0">
        <div className="flex gap-3">
          <AlarmIndicator />
          <span className="text-gray-500">{rhythmName}</span>
          {vitals.cprActive && <span className="text-orange-400 font-bold animate-pulse">● RCP ACTIVA</span>}
        </div>
        <div className="flex gap-3">
          {shockCount > 0 && <span className="text-red-400">Descargas: {shockCount}</span>}
          <span className="text-gray-600">NIBP: {vitals.nibpActive ? 'Midiendo...' : `${vitals.nibpLastSystolic}/${vitals.nibpLastDiastolic}`}</span>
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
  });
}

export { applyStep };
