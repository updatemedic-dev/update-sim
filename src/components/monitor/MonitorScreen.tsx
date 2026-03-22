import { useEffect, useRef, useCallback, useState } from 'react';
import ECGWaveform from './ECGWaveform';
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
  const { soundEnabled, language, wakeLockEnabled, showRhythmName } = useSettingsStore();
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
      {/* ===== TOP BAR (DART Sim Pro style) ===== */}
      <div className="flex items-center justify-between h-12 px-2 border-b border-gray-800 shrink-0 bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          {/* Settings gear */}
          <button
            onClick={() => {
              const event = new CustomEvent('toggleSettings');
              window.dispatchEvent(event);
            }}
            className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded touch-btn"
            title="Configuración"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {/* Clock */}
          <span className="text-xl font-bold text-green-300 tabular-nums tracking-wider">{elapsedStr}</span>
        </div>

        {/* Center controls */}
        <div className="flex items-center gap-1">
          {activeScenario && (
            <>
              <button
                onClick={() => {
                  const step = useScenarioStore.getState().previousStep();
                  if (step) applyStep(step);
                }}
                className="h-10 px-3 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 touch-btn"
              >◄◄ Anterior</button>
              <button
                onClick={() => {
                  const step = useScenarioStore.getState().nextStep();
                  if (step) applyStep(step);
                }}
                className="h-10 px-3 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 touch-btn"
              >Siguiente ►►</button>
            </>
          )}
          <button
            onClick={() => useVitalSignsStore.getState().togglePause()}
            className={`h-10 px-3 rounded text-xs font-bold touch-btn ${isPaused ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            {isPaused ? '▶ Reanudar' : '⏸ Pausa'}
          </button>
          <button
            onClick={() => {
              useVitalSignsStore.getState().reset();
              useDefibStore.getState().reset();
              useScenarioStore.getState().reset();
            }}
            className="h-10 px-3 bg-gray-800 hover:bg-red-900 rounded text-xs text-red-400 font-bold touch-btn"
          >Reset</button>
          <button
            onClick={toggleFullscreen}
            className="h-10 px-3 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 touch-btn"
          >
            {isFullscreen ? '⊡' : '⊞'}
          </button>
        </div>

        <span className="text-sm font-bold text-blue-400 tracking-wider">UPDATE SIM</span>
      </div>

      {/* ===== SCENARIO INFO BAR ===== */}
      {activeScenario && (
        <div className="flex items-center justify-between h-8 px-3 bg-blue-950 border-b border-blue-800 shrink-0 text-xs">
          <span className="text-blue-300 font-bold">{activeScenario.name}</span>
          <span className="text-blue-400">
            Paso {currentStepIndex + 1}/{totalSteps}
            {scenarioStep && ` — ${scenarioStep.condition}`}
          </span>
          <span className="text-blue-500 text-[10px]">N = Siguiente</span>
        </div>
      )}

      {/* ===== MAIN AREA: ECG waveform + Right sidebar ===== */}
      <div className="flex-1 flex min-h-0">

        {/* ECG Waveform (takes most of the space) */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <ECGWaveform />
          </div>

          {/* Rhythm name + status bar below ECG */}
          <div className="flex items-center justify-between h-7 px-3 bg-[#0a0a0a] border-t border-gray-800 text-[10px] shrink-0">
            <div className="flex gap-3 items-center">
              <AlarmIndicator />
              {showRhythmName && <span className="text-gray-500">{rhythmName}</span>}
              {vitals.cprActive && <span className="text-orange-400 font-bold animate-pulse">● RCP ACTIVA</span>}
            </div>
            <div className="flex gap-3">
              {shockCount > 0 && <span className="text-red-400">Descargas: {shockCount}</span>}
              {syncMode && <span className="text-yellow-400 animate-pulse font-bold">SYNC</span>}
              {isCharged && <span className="text-red-500 font-bold animate-pulse">⚡ CARGADO</span>}
            </div>
          </div>
        </div>

        {/* ===== RIGHT SIDEBAR (DART Sim Pro style) ===== */}
        <div className="w-36 md:w-44 shrink-0 border-l border-gray-700 bg-[#0a0a0a] flex flex-col">

          {/* ALARMS */}
          <div className="border-b border-gray-800 p-2 text-center">
            <div className="text-xs font-bold text-red-500 mb-1">ALARMS</div>
            <AlarmIndicator compact />
          </div>

          {/* Heart Rate */}
          {visibleParams.hr && (
            <div className="border-b border-gray-800 p-2 text-right">
              <span className="text-[10px] text-gray-500 block">Heart Rate</span>
              <span className="text-5xl font-bold leading-none tabular-nums" style={{ color: '#00ff00' }}>
                {vitals.hasPulse && vitals.hr > 0 ? vitals.hr : '--'}
              </span>
              <span className="text-[10px] text-gray-600 block">LEAD II</span>
            </div>
          )}

          {/* Blood Pressure */}
          {visibleParams.bp && (
            <div className="border-b border-gray-800 p-2 text-right">
              <span className="text-[10px] text-gray-500 block">Blood Pressure</span>
              <span className="text-3xl font-bold leading-none tabular-nums" style={{ color: '#ff0000' }}>
                {vitals.hasPulse ? `${vitals.systolic}/${vitals.diastolic}` : '--/--'}
              </span>
              {vitals.hasPulse && (
                <span className="text-sm font-bold tabular-nums block" style={{ color: '#ff4444' }}>({map})</span>
              )}
            </div>
          )}

          {/* SpO2 */}
          {visibleParams.spo2 && (
            <div className="border-b border-gray-800 p-2 text-right">
              <span className="text-[10px] text-gray-500 block">SPO2 Level</span>
              <span className="text-4xl font-bold leading-none tabular-nums" style={{ color: '#00ffff' }}>
                {vitals.hasPulse ? vitals.spo2 : '--'}
              </span>
            </div>
          )}

          {/* ETCO2 */}
          {visibleParams.etco2 && (
            <div className="border-b border-gray-800 p-2 text-right">
              <span className="text-[10px] text-gray-500 block">CO2 mmHg</span>
              <span className="text-4xl font-bold leading-none tabular-nums" style={{ color: '#ffff00' }}>
                {vitals.etco2 > 0 ? vitals.etco2 : '--'}
              </span>
            </div>
          )}

          {/* NIBP */}
          <div className="border-b border-gray-800 p-1">
            <button
              onClick={() => {
                useVitalSignsStore.getState().setVital('nibpActive', true);
                audioEngine.playNIBPSound();
                setTimeout(() => {
                  const v = useVitalSignsStore.getState().vitals;
                  useVitalSignsStore.getState().setVitals({
                    nibpActive: false,
                    nibpLastSystolic: v.systolic + Math.round((Math.random() - 0.5) * 6),
                    nibpLastDiastolic: v.diastolic + Math.round((Math.random() - 0.5) * 4),
                  });
                }, 3000);
              }}
              className="w-full h-10 bg-gray-800 hover:bg-gray-700 rounded text-xs font-bold text-white touch-btn"
            >
              {vitals.nibpActive ? 'Midiendo...' : `NIBP ${vitals.nibpLastSystolic}/${vitals.nibpLastDiastolic}`}
            </button>
          </div>

          {/* Meds button */}
          <div className="border-b border-gray-800 p-1">
            <button
              onClick={() => {
                const event = new CustomEvent('toggleMeds');
                window.dispatchEvent(event);
              }}
              className="w-full h-10 bg-gray-800 hover:bg-purple-900 rounded text-xs font-bold text-purple-300 touch-btn"
            >
              Meds
            </button>
          </div>

          {/* CPR */}
          <div className="border-b border-gray-800 p-1">
            <button
              onClick={() => {
                const newCpr = !vitals.cprActive;
                useVitalSignsStore.getState().setVital('cprActive', newCpr);
                if (newCpr) audioEngine.startMetronome(useSettingsStore.getState().cprMetronomeRate);
                else audioEngine.stopMetronome();
              }}
              className={`w-full h-10 rounded text-xs font-bold touch-btn ${vitals.cprActive ? 'bg-orange-600 animate-pulse text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
            >
              CPR {vitals.cprActive ? 'ON' : ''}
            </button>
          </div>

          {/* Temperature + RR */}
          <div className="flex-1 flex flex-col justify-end">
            {visibleParams.temp && (
              <div className="border-t border-gray-800 p-2 text-center">
                <span className="text-[10px] text-orange-400 block">Temp</span>
                <span className="text-lg font-bold text-orange-300 tabular-nums">{vitals.temperature.toFixed(1)}°C</span>
              </div>
            )}
            {visibleParams.rr && (
              <div className="border-t border-gray-800 p-2 text-center">
                <span className="text-[10px] text-gray-400 block">Resp</span>
                <span className="text-lg font-bold text-white tabular-nums">{vitals.respiratoryRate}</span>
              </div>
            )}
          </div>
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
