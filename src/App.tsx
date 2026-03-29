import { useState, useEffect, useCallback, useRef } from 'react';
import MonitorScreen, { applyStep } from './components/monitor/MonitorScreen';
import ScenarioSelector from './components/scenarios/ScenarioSelector';
import ErrorBoundary from './components/ui/ErrorBoundary';
// Settings integrated into gear panel
import { useVitalSignsStore } from './stores/vitalSignsStore';
import { useSettingsStore } from './stores/settingsStore';
import { useDefibStore } from './stores/defibStore';
import { useScenarioStore } from './stores/scenarioStore';
import { useCodeTrackStore } from './stores/codeTrackStore';
import { useMedicationStore } from './stores/medicationStore';
import { audioEngine } from './engine/audio/AudioEngine';
import { CardiacRhythm } from './types/rhythms';
import { RHYTHM_DEFINITIONS } from './engine/rhythms/rhythmDefinitions';
import { MedicationCategory } from './types/medications';
import { t } from './i18n';

function App() {
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showScenarios, setShowScenarios] = useState(false);
  const [showRhythmPad, setShowRhythmPad] = useState(false);
  const [showMeds, setShowMeds] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showDisplayPanel, setShowDisplayPanel] = useState(false);
  const { keyboardShortcutsEnabled, language } = useSettingsStore();
  const vitals = useVitalSignsStore((s) => s.vitals);
  const visibleParams = useVitalSignsStore((s) => s.visibleParams);
  const showDescription = useVitalSignsStore((s) => s.showDescription);
  const defib = useDefibStore();

  // ===== KEYBOARD SHORTCUTS =====
  const aKeyRef = useRef(false);
  const pKeyRef = useRef(false);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'a') aKeyRef.current = false;
    if (e.key.toLowerCase() === 'p') pKeyRef.current = false;
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!keyboardShortcutsEnabled) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;

    const vs = useVitalSignsStore.getState();
    const df = useDefibStore.getState();
    const sc = useScenarioStore.getState();
    const v = vs.vitals;

    // Track 'A' key hold
    if (e.key.toLowerCase() === 'a') {
      aKeyRef.current = true;
      e.preventDefault();
      return;
    }

    // Track 'P' key hold
    if (e.key.toLowerCase() === 'p') {
      pKeyRef.current = true;
      e.preventDefault();
      return;
    }

    // A + 1-6: Load MC ACLS (MegaCódigo) scenario
    if (aKeyRef.current && e.key >= '1' && e.key <= '6') {
      e.preventDefault();
      const scenarioId = `mc-acls-${e.key}`;
      vs.stop();
      df.reset();
      useMedicationStore.getState().clearAdministered();
      audioEngine.stopChargedBeep();
      audioEngine.stopMetronome();
      audioEngine.stopAlarm();
      sc.loadScenario(scenarioId);
      aKeyRef.current = false;
      return;
    }

    // P + number: Load PALS scenarios
    // P+1 to P+4 = PALS Resp 1-4, P+5 to P+9 = PALS Shock 5-9
    // P+0 = PALS Shock 10, P+- = PALS Shock 11, P+= = PALS Shock 12
    if (pKeyRef.current) {
      const palsMap: Record<string, string> = {
        '1': 'pals-resp-1', '2': 'pals-resp-2', '3': 'pals-resp-3', '4': 'pals-resp-4',
        '5': 'pals-shock-5', '6': 'pals-shock-6', '7': 'pals-shock-7', '8': 'pals-shock-8',
        '9': 'pals-shock-9', '0': 'pals-shock-10', 'q': 'pals-shock-11', 'w': 'pals-shock-12',
      };
      const scenarioId = palsMap[e.key];
      if (scenarioId) {
        e.preventDefault();
        vs.stop();
        df.reset();
        useMedicationStore.getState().clearAdministered();
        audioEngine.stopChargedBeep();
        audioEngine.stopMetronome();
        audioEngine.stopAlarm();
        sc.loadScenario(scenarioId);
        pKeyRef.current = false;
        return;
      }
    }

    switch (e.key.toLowerCase()) {
      case 'n': // NEXT STEP + stop compressions + stop pacer
        e.preventDefault();
        // Stop compressions if active
        if (v.cprActive) {
          vs.setVital('cprActive', false);
          audioEngine.stopMetronome();
          useCodeTrackStore.getState().addEntry('cpr_stop', 'RCP detenida');
        }
        // Stop pacer if active
        if (df.pacerOn) {
          df.togglePacer();
        }
        if (sc.activeScenario) {
          const step = sc.nextStep();
          if (step) {
            applyStep(step);
            useCodeTrackStore.getState().addEntry('vitals_change',
              `Paso ${sc.currentStepIndex + 1}: ${step.condition}`);
          }
        }
        break;
      case 'arrowup':
        e.preventDefault();
        vs.setVital('hr', Math.min(300, v.hr + 5));
        break;
      case 'arrowdown':
        e.preventDefault();
        vs.setVital('hr', Math.max(0, v.hr - 5));
        break;
      case 'arrowleft':
        e.preventDefault();
        if (sc.activeScenario) {
          const step = sc.previousStep();
          if (step) applyStep(step);
        }
        break;
      case 'arrowright':
        e.preventDefault();
        if (sc.activeScenario) {
          const step = sc.nextStep();
          if (step) applyStep(step);
        }
        break;
      case 'b':
        e.preventDefault();
        // Retroceder paso en escenario
        if (sc.activeScenario) {
          const step = sc.previousStep();
          if (step) applyStep(step);
        }
        break;
      case 'c':
        e.preventDefault();
        {
          const newCpr = !v.cprActive;
          vs.setVital('cprActive', newCpr);
          if (newCpr) audioEngine.startMetronome(useSettingsStore.getState().cprMetronomeRate);
          else audioEngine.stopMetronome();
          useCodeTrackStore.getState().addEntry(newCpr ? 'cpr_start' : 'cpr_stop', newCpr ? 'RCP iniciada' : 'RCP detenida');
        }
        break;
      case 'd':
        e.preventDefault();
        // Toggle description + mute all audio
        useVitalSignsStore.getState().toggleDescription();
        useSettingsStore.getState().set('soundEnabled', !useSettingsStore.getState().soundEnabled);
        audioEngine.stopAlarm();
        audioEngine.stopChargedBeep();
        audioEngine.stopMetronome();
        break;
      case ' ':
        e.preventDefault();
        // Espacio = Pause/Resume
        if (vs.isStopped) {
          vs.play();
          df.reset();
          // If scenario loaded, apply first step; otherwise reset scenario
          const scState = useScenarioStore.getState();
          if (scState.activeScenario) {
            const firstStep = scState.getCurrentStep();
            if (firstStep) applyStep(firstStep);
          } else {
            scState.reset();
          }
        } else {
          vs.togglePause();
        }
        break;
      case 'enter':
        e.preventDefault();
        // Enter = Play (resume from stop or pause)
        if (vs.isStopped) {
          vs.play();
          df.reset();
          const scState2 = useScenarioStore.getState();
          if (scState2.activeScenario) {
            const firstStep = scState2.getCurrentStep();
            if (firstStep) applyStep(firstStep);
          } else {
            scState2.reset();
          }
        } else if (vs.isPaused) {
          vs.togglePause();
        }
        break;
      case 'backspace':
        e.preventDefault();
        // Backspace = Stop
        vs.stop();
        df.reset();
        useScenarioStore.getState().reset();
        useMedicationStore.getState().clearAdministered();
        audioEngine.stopChargedBeep();
        audioEngine.stopMetronome();
        audioEngine.stopAlarm();
        break;
      case 's':
        e.preventDefault();
        {
          audioEngine.stopChargedBeep();
          const record = df.deliverShock();
          if (record) {
            audioEngine.playShockSound();
            useCodeTrackStore.getState().addEntry('shock', `Descarga ${record.energy}J${record.synchronized ? ' SYNC' : ''}`);
            vs.shockPause();
            if (useDefibStore.getState().syncMode) {
              useDefibStore.getState().toggleSync();
            }
          }
        }
        break;
      case 'f':
        e.preventDefault();
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
        break;
      case 'h':
        e.preventDefault();
        setShowControls((v) => !v);
        break;
      case 'escape':
        e.preventDefault();
        vs.togglePause();
        break;
    }

    // Number keys 1-9 for quick rhythm (only if A is not held)
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9 && !aKeyRef.current && !pKeyRef.current) {
      e.preventDefault();
      const quickRhythms = [
        CardiacRhythm.NORMAL_SINUS, CardiacRhythm.SINUS_BRADYCARDIA,
        CardiacRhythm.SINUS_TACHYCARDIA, CardiacRhythm.SVT,
        CardiacRhythm.ATRIAL_FIBRILLATION, CardiacRhythm.VENTRICULAR_TACHYCARDIA,
        CardiacRhythm.VENTRICULAR_FIBRILLATION, CardiacRhythm.ASYSTOLE,
        CardiacRhythm.THIRD_DEGREE_AV_BLOCK,
      ];
      const r = quickRhythms[num - 1];
      const def = RHYTHM_DEFINITIONS[r];
      vs.setRhythm(r);
      vs.setVitals({
        hr: def.defaultHR,
        hasPulse: def.hasPulse,
        systolic: def.physiologicalDefaults.systolicBP,
        diastolic: def.physiologicalDefaults.diastolicBP,
        spo2: def.physiologicalDefaults.spo2,
      });
    }
  }, [keyboardShortcutsEnabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const toggleSettings = () => setShowDisplayPanel((v) => !v);
    window.addEventListener('toggleSettings', toggleSettings);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('toggleSettings', toggleSettings);
    };
  }, [handleKeyDown, handleKeyUp]);

  // ===== DISCLAIMER =====
  if (showDisclaimer) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
        <div className="bg-[#111] border border-gray-700 rounded-lg p-6 max-w-lg text-center">
          <img src={`${import.meta.env.BASE_URL}logo-update-sim.png`} alt="UPDATE SIM" className="h-16 mx-auto mb-2" />
          <p className="text-sm text-gray-300 mb-1">by Update Medic</p>
          <div className="my-4 p-3 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
            <p className="font-bold mb-1">{t('disclaimer', language)}</p>
            <p>{t('disclaimerText', language)}</p>
          </div>
          <p className="text-xs text-gray-500 mb-4">{t('developedBy', language)}</p>
          <button onClick={() => { setShowDisclaimer(false); audioEngine.init(); }}
            className="relative px-8 py-3 rounded-lg font-bold text-sm text-white border overflow-hidden transition-all duration-300 hover:scale-[1.02] active:translate-y-[1px]"
            style={{
              background: 'linear-gradient(180deg, #1a3a5c 0%, #0d2848 50%, #091e38 100%)',
              borderColor: '#2563eb',
              boxShadow: '0 0 16px rgba(37,99,235,0.4), 0 0 6px rgba(37,99,235,0.2), 0 4px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}>
            <span className="relative z-10 flex items-center gap-2 justify-center">
              <span className="w-2 h-2 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #93c5fd, #2563eb 50%, #1d4ed8 100%)', boxShadow: '0 0 6px rgba(37,99,235,0.8)' }} />
              {t('enter', language)}
            </span>
            <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)' }} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-black overflow-hidden"
      style={{ fontFamily: '"JetBrains Mono", "IBM Plex Mono", monospace', width: 1024, height: 768 }}>

      {/* ===== MONITOR AREA ===== */}
      <div className="flex-1 min-h-0">
        <ErrorBoundary name="Monitor">
          <MonitorScreen />
        </ErrorBoundary>
      </div>

      {/* ===== BOTTOM CONTROL PANEL ===== */}
      {showControls && (
        <ErrorBoundary name="Panel de Control">
        <div className="shrink-0 border-t border-gray-700 bg-[#0a0a14]">
          <div className="flex h-[192px] gap-1.5 p-1.5">

            {/* Column 1: Scenarios / Rhythm */}
            <div className="flex flex-col gap-1 p-1.5 w-[150px] shrink-0 rounded-xl bg-gradient-to-b from-[#1a1a28] to-[#111120] border border-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]">
              <ScenarioRunBtn />
              <BottomBtn label={t('scenarios', language)} color="bg-blue-800 hover:bg-blue-700" onClick={() => setShowScenarios(true)} />
              <BottomBtn label={t('rhythmKeypad', language)} onClick={() => setShowRhythmPad(!showRhythmPad)} />
            </div>

            {/* Column 3: MARCAPASO panel */}
            <div className="flex flex-col p-1.5 w-[190px] shrink-0 rounded-xl bg-gradient-to-b from-[#1a1a28] to-[#111120] border border-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span className="text-sm font-bold text-gray-400 text-center mb-0 tracking-wider">{t('pacemaker', language)}</span>
              <PacerButton active={defib.pacerOn} onToggle={() => { defib.togglePacer(); audioEngine.playPacerBeep(); }} />
              <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                <button onClick={() => { defib.setPacerRate(defib.pacerRate - 10); audioEngine.playTapClick(); }}
                  className="w-14 h-10 rounded-xl bg-gradient-to-b from-gray-500 to-gray-700 border border-gray-500 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.15)] hover:from-gray-400 active:translate-y-[1px] transition-all flex items-center justify-center">
                  <svg width="18" height="12" viewBox="0 0 18 12"><path d="M2 2L9 10L16 2" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-gray-500">RATE SELECT</span>
                  <span style={{ fontSize: '2.5rem' }} className="font-bold text-cyan-400 tabular-nums leading-none">{defib.pacerRate}</span>
                </div>
                <button onClick={() => { defib.setPacerRate(defib.pacerRate + 10); audioEngine.playTapClick(); }}
                  className="w-14 h-10 rounded-xl bg-gradient-to-b from-gray-500 to-gray-700 border border-gray-500 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.15)] hover:from-gray-400 active:translate-y-[1px] transition-all flex items-center justify-center">
                  <svg width="18" height="12" viewBox="0 0 18 12"><path d="M2 10L9 2L16 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <button onClick={() => { defib.setPacerCurrent(defib.pacerCurrent - 5); audioEngine.playTapClick(); }}
                  className="w-14 h-10 rounded-xl bg-gradient-to-b from-gray-500 to-gray-700 border border-gray-500 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.15)] hover:from-gray-400 active:translate-y-[1px] transition-all flex items-center justify-center">
                  <svg width="18" height="12" viewBox="0 0 18 12"><path d="M2 2L9 10L16 2" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-gray-500">mAMP SELECT</span>
                  <span style={{ fontSize: '2.5rem' }} className="font-bold text-cyan-400 tabular-nums leading-none">{defib.pacerCurrent}</span>
                </div>
                <button onClick={() => { defib.setPacerCurrent(defib.pacerCurrent + 5); audioEngine.playTapClick(); }}
                  className="w-14 h-10 rounded-xl bg-gradient-to-b from-gray-500 to-gray-700 border border-gray-500 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.15)] hover:from-gray-400 active:translate-y-[1px] transition-all flex items-center justify-center">
                  <svg width="18" height="12" viewBox="0 0 18 12"><path d="M2 10L9 2L16 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
              {defib.pacerOn && (
                <span className={`text-[11px] text-center font-bold mt-1 ${defib.pacerCapture ? 'text-green-400' : 'text-red-400'}`}>
                  {defib.pacerCapture ? t('capture', language) : t('noCapture', language)}
                </span>
              )}
            </div>

            {/* Column 4: Sync + Meds */}
            <div className="flex flex-col gap-1.5 p-1.5 w-[100px] shrink-0 rounded-xl bg-gradient-to-b from-[#1a1a28] to-[#111120] border border-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]">
              <button onClick={() => { defib.toggleSync(); audioEngine.playSyncBeep(); }}
                className="relative flex-1 rounded-xl font-bold text-lg border transition-all duration-300 active:translate-y-[1px] overflow-hidden flex items-center justify-center gap-2"
                style={{
                  background: defib.syncMode
                    ? 'linear-gradient(180deg, #3b1a5e 0%, #2d1050 50%, #1a0a30 100%)'
                    : 'linear-gradient(180deg, #2a2a3a 0%, #1a1a28 50%, #111120 100%)',
                  borderColor: defib.syncMode ? '#a855f7' : '#374151',
                  boxShadow: defib.syncMode
                    ? '0 0 16px rgba(168,85,247,0.5), 0 0 6px rgba(168,85,247,0.25), inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.5)'
                    : '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                  color: defib.syncMode ? '#e9d5ff' : '#6b7280',
                }}>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{
                  background: defib.syncMode
                    ? 'radial-gradient(circle at 35% 35%, #d8b4fe, #a855f7 50%, #7c3aed 100%)'
                    : 'radial-gradient(circle at 35% 35%, #4b5563, #374151 50%, #1f2937 100%)',
                  boxShadow: defib.syncMode ? '0 0 8px rgba(168,85,247,0.8), 0 0 16px rgba(168,85,247,0.4)' : 'inset 0 1px 2px rgba(0,0,0,0.5)',
                }} />
                <span className="text-sm font-black tracking-wider">SYNC</span>
                {defib.syncMode && <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #a855f7, #c084fc, #a855f7, transparent)' }} />}
              </button>
              <button onClick={() => setShowMeds(!showMeds)}
                className="relative flex-1 rounded-xl font-bold text-lg border transition-all duration-300 active:translate-y-[1px] overflow-hidden flex flex-col items-center justify-center gap-1"
                style={{
                  background: 'linear-gradient(180deg, #0a3a1a 0%, #062a12 50%, #041a0c 100%)',
                  borderColor: '#22c55e',
                  boxShadow: '0 0 10px rgba(34,197,94,0.2), 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
                  color: '#bbf7d0',
                }}>
                <div className="absolute top-2 left-2 w-2 h-2 rounded-full" style={{
                  background: 'radial-gradient(circle at 35% 35%, #86efac, #22c55e 50%, #16a34a 100%)',
                  boxShadow: '0 0 6px rgba(34,197,94,0.7)',
                }} />
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <rect x="6" y="3" width="12" height="18" rx="6" stroke="white" strokeWidth="2"/>
                  <line x1="6" y1="12" x2="18" y2="12" stroke="white" strokeWidth="2"/>
                </svg>
                <span className="text-sm font-black tracking-wider">MEDS</span>
                <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #22c55e, #4ade80, #22c55e, transparent)' }} />
              </button>
            </div>

            {/* Column 5: PNI + COMP buttons (aligned with SYNC+MEDS) */}
            <div className="flex flex-col gap-1.5 p-1.5 w-[100px] shrink-0 rounded-xl bg-gradient-to-b from-[#1a1a28] to-[#111120] border border-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)] justify-center">
              {/* PNI button */}
              <button onClick={() => {
                if (vitals.nibpActive) return;
                useVitalSignsStore.getState().setVital('nibpActive', true);
                audioEngine.playNIBPSound();
                setTimeout(() => {
                  const v = useVitalSignsStore.getState().vitals;
                  useVitalSignsStore.getState().setVitals({
                    nibpActive: false,
                    nibpHasReading: true,
                    nibpLastSystolic: v.systolic + Math.round((Math.random() - 0.5) * 6),
                    nibpLastDiastolic: v.diastolic + Math.round((Math.random() - 0.5) * 4),
                  });
                }, 10000);
              }}
                className="relative h-[calc(50%-4px)] rounded-xl font-bold text-sm border transition-all duration-300 active:translate-y-[1px] flex flex-col items-center justify-center p-2 overflow-hidden"
                style={{
                  background: vitals.nibpActive
                    ? 'linear-gradient(180deg, #1a2a4a 0%, #0d1e3a 50%, #091428 100%)'
                    : 'linear-gradient(180deg, #2a2a3a 0%, #1a1a28 50%, #111120 100%)',
                  borderColor: vitals.nibpActive ? '#3b82f6' : '#374151',
                  boxShadow: vitals.nibpActive
                    ? '0 0 10px rgba(59,130,246,0.3), 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)'
                    : '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}>
                {/* LED indicator */}
                <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full"
                  style={{
                    background: vitals.nibpActive
                      ? 'radial-gradient(circle at 35% 35%, #93c5fd, #3b82f6 50%, #2563eb 100%)'
                      : 'radial-gradient(circle at 35% 35%, #4b5563, #374151 50%, #1f2937 100%)',
                    boxShadow: vitals.nibpActive
                      ? '0 0 8px rgba(59,130,246,0.8), 0 0 16px rgba(59,130,246,0.4)'
                      : 'inset 0 1px 2px rgba(0,0,0,0.5)',
                    animation: vitals.nibpActive ? 'pniLedBlink 0.8s ease-in-out infinite' : 'none',
                  }}
                />
                <img src={`${import.meta.env.BASE_URL}icon-pni.png`} alt="PNI"
                  className="h-[49%] object-contain transition-opacity duration-300"
                  style={{ opacity: vitals.nibpActive ? 1 : 0.4 }}
                />
                <span className="text-sm font-black tracking-wider mt-0.5 transition-colors duration-300"
                  style={{ color: vitals.nibpActive ? '#93c5fd' : '#6b7280' }}>
                  {language === 'es' ? 'PNI' : 'NIBP'}
                </span>
                {vitals.nibpActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)' }} />
                )}
              </button>
              {/* RCP button */}
              <button onClick={() => {
                const newCpr = !vitals.cprActive;
                useVitalSignsStore.getState().setVital('cprActive', newCpr);
                if (newCpr) audioEngine.startMetronome(useSettingsStore.getState().cprMetronomeRate);
                else audioEngine.stopMetronome();
                useCodeTrackStore.getState().addEntry(newCpr ? 'cpr_start' : 'cpr_stop', newCpr ? 'RCP iniciada' : 'RCP detenida');
              }}
                className={`relative h-[calc(50%-4px)] rounded-xl border transition-all duration-300 active:translate-y-[1px] flex flex-col items-center justify-center p-2 overflow-hidden ${vitals.cprActive ? 'animate-[compFlash_0.6s_ease-in-out_infinite]' : ''}`}
                style={{
                  background: vitals.cprActive
                    ? 'linear-gradient(180deg, #4a1a1a 0%, #3a0d0d 50%, #280808 100%)'
                    : 'linear-gradient(180deg, #3a1a1a 0%, #2a0d0d 50%, #1a0808 100%)',
                  borderColor: vitals.cprActive ? '#ef4444' : '#991b1b',
                  boxShadow: vitals.cprActive
                    ? '0 0 20px rgba(239,68,68,0.6), 0 0 8px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.5)'
                    : '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}>
                <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full" style={{
                  background: vitals.cprActive
                    ? 'radial-gradient(circle at 35% 35%, #fca5a5, #ef4444 50%, #dc2626 100%)'
                    : 'radial-gradient(circle at 35% 35%, #4b5563, #374151 50%, #1f2937 100%)',
                  boxShadow: vitals.cprActive ? '0 0 8px rgba(239,68,68,0.8), 0 0 16px rgba(239,68,68,0.4)' : 'inset 0 1px 2px rgba(0,0,0,0.5)',
                }} />
                <img src={`${import.meta.env.BASE_URL}icon-comp.png`} alt="RCP" className="h-[49%] object-contain" />
                <span className="text-sm font-black tracking-wider" style={{ color: vitals.cprActive ? '#fca5a5' : '#991b1b' }}>{language === 'es' ? 'RCP' : 'CPR'}</span>
                {vitals.cprActive && <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #ef4444, #f87171, #ef4444, transparent)' }} />}
              </button>
            </div>

            {/* Column 6: Energy Select + Charge + Shock + Disarm */}
            <div className="flex flex-col p-2 flex-1 min-w-[200px] rounded-xl bg-gradient-to-b from-[#1a1a28] to-[#111120] border border-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span className="text-xs font-bold text-white text-center">{t('energySelected', language)}</span>
              <div className="flex items-center justify-center gap-3 my-1">
                <button onClick={() => { defib.decreaseEnergy(); audioEngine.playTapClick(); }}
                  className="w-12 h-12 rounded-xl font-bold text-xl text-white border transition-all duration-300 active:translate-y-[1px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(180deg, #3a3a4a 0%, #2a2a38 50%, #1a1a28 100%)',
                    borderColor: '#4b5563',
                    boxShadow: '0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 8px rgba(234,179,8,0.2), 0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = '#ca8a04'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = '#4b5563'; }}>▼</button>
                <div className="text-center">
                  <span className="text-5xl font-bold text-yellow-400 tabular-nums">{defib.energy}</span>
                  <span className="text-lg text-yellow-400 ml-0.5">j</span>
                </div>
                <button onClick={() => { defib.increaseEnergy(); audioEngine.playTapClick(); }}
                  className="w-12 h-12 rounded-xl font-bold text-xl text-white border transition-all duration-300 active:translate-y-[1px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(180deg, #3a3a4a 0%, #2a2a38 50%, #1a1a28 100%)',
                    borderColor: '#4b5563',
                    boxShadow: '0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 8px rgba(234,179,8,0.2), 0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = '#ca8a04'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = '#4b5563'; }}>▲</button>
              </div>
              <span className="text-[10px] text-gray-500 text-center mb-1">Shock - {defib.shockCount}</span>
              <div className="flex gap-2 flex-[1.5]">
                <button onClick={() => {
                  if (!defib.isCharged && !defib.isCharging) {
                    defib.startCharge();
                    audioEngine.playChargeSound(3);
                    setTimeout(() => {
                      useDefibStore.getState().completeCharge();
                      audioEngine.startChargedBeep();
                    }, 3000);
                  }
                }}
                  disabled={defib.isCharging || defib.isCharged}
                  className={`relative flex-1 rounded-xl font-bold text-lg border-2 transition-all duration-300 active:translate-y-[1px] text-white disabled:opacity-60 overflow-hidden ${defib.isCharging ? 'animate-pulse' : ''}`}
                  style={{
                    background: defib.isCharging
                      ? 'linear-gradient(180deg, #5a3a0a 0%, #4a2a00 50%, #3a1a00 100%)'
                      : defib.isCharged
                      ? 'linear-gradient(180deg, #5a4a0a 0%, #4a3a00 50%, #3a2a00 100%)'
                      : 'linear-gradient(180deg, #5a1a1a 0%, #4a0d0d 50%, #3a0808 100%)',
                    borderColor: defib.isCharging ? '#ca8a04' : defib.isCharged ? '#ca8a04' : '#dc2626',
                    boxShadow: defib.isCharging
                      ? '0 0 14px rgba(202,138,4,0.5), inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.5)'
                      : defib.isCharged
                      ? '0 0 14px rgba(202,138,4,0.5), inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.5)'
                      : '0 0 8px rgba(220,38,38,0.2), 0 4px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}>
                  {defib.isCharging ? t('charging', language) : defib.isCharged ? t('chargedBtn', language) : t('charge', language)}
                </button>
                <button onClick={() => {
                  audioEngine.stopChargedBeep();
                  const record = defib.deliverShock();
                  if (record) {
                    audioEngine.playShockSound();
                    useCodeTrackStore.getState().addEntry('shock', `Descarga ${record.energy}J${record.synchronized ? ' SYNC' : ''}`);
                    useVitalSignsStore.getState().shockPause();
                    // Auto-disable SYNC after shock
                    if (useDefibStore.getState().syncMode) {
                      useDefibStore.getState().toggleSync();
                    }
                  }
                }}
                  disabled={!defib.isCharged}
                  className={`relative flex-1 rounded-xl font-bold text-lg border-2 transition-all duration-300 active:translate-y-[1px] overflow-hidden ${defib.isCharged ? 'animate-pulse' : ''}`}
                  style={{
                    background: defib.isCharged
                      ? 'linear-gradient(180deg, #5a4a0a 0%, #4a3800 50%, #3a2800 100%)'
                      : 'linear-gradient(180deg, #2a2a3a 0%, #1a1a28 50%, #111120 100%)',
                    borderColor: defib.isCharged ? '#eab308' : '#4b5563',
                    color: defib.isCharged ? '#fef08a' : '#6b7280',
                    boxShadow: defib.isCharged
                      ? '0 0 20px rgba(234,179,8,0.5), 0 0 8px rgba(234,179,8,0.3), inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.5)'
                      : '0 4px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                    textShadow: defib.isCharged ? '0 0 8px rgba(234,179,8,0.6)' : 'none',
                  }}>
                  {defib.isCharged && <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full" style={{
                    background: 'radial-gradient(circle at 35% 35%, #fef08a, #eab308 50%, #ca8a04 100%)',
                    boxShadow: '0 0 8px rgba(234,179,8,0.8), 0 0 16px rgba(234,179,8,0.4)',
                  }} />}
                  ⚡ {t('shock', language)}
                  {defib.isCharged && <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #eab308, #facc15, #eab308, transparent)' }} />}
                </button>
              </div>
              <div className="flex-[0.3]" />
              <button onClick={() => { defib.disarm(); audioEngine.stopChargedBeep(); }}
                className="relative py-6 rounded-xl text-xl font-bold border-2 transition-all duration-300 active:translate-y-[1px] overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #0a3a4a 0%, #062a38 50%, #041a28 100%)',
                  borderColor: '#0891b2',
                  color: '#a5f3fc',
                  boxShadow: '0 0 10px rgba(8,145,178,0.2), 0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
                  textShadow: '0 0 6px rgba(8,145,178,0.4)',
                }}>
                {t('disarm', language)}
                <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #06b6d4, #22d3ee, #06b6d4, transparent)' }} />
              </button>
            </div>
          </div>
        </div>
        </ErrorBoundary>
      )}

      {/* Show controls button when hidden */}
      {!showControls && (
        <button onClick={() => setShowControls(true)}
          className="fixed bottom-2 right-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-400 z-40">
          {t('showControls', language)} (H)
        </button>
      )}

      {/* ===== UNIFIED SETTINGS PANEL (Apple-style) ===== */}
      {showDisplayPanel && (
        <SettingsOverlay language={language} visibleParams={visibleParams} showDescription={showDescription} onClose={() => setShowDisplayPanel(false)} />
      )}

      {/* ===== MODALS ===== */}
      {showScenarios && <ScenarioSelector onClose={() => setShowScenarios(false)} />}

      {/* Rhythm Keypad Overlay */}
      {showRhythmPad && <RhythmKeypad onClose={() => setShowRhythmPad(false)} />}

      {/* Medications Overlay */}
      {showMeds && <MedsOverlay onClose={() => setShowMeds(false)} />}
    </div>
  );
}

// ===== TOGGLE SWITCH COMPONENT (3D style) =====
function ToggleSwitch({ label, color, active, onToggle, large }: {
  label: string; color: string; active: boolean; onToggle: () => void; large?: boolean;
}) {
  return (
    <button onClick={onToggle}
      className={`flex items-center justify-between gap-2 px-3 rounded-lg border transition-all ${large ? 'py-2' : 'flex-1'} ${active
        ? 'bg-[#1a2a3a] border-gray-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.4)]'
        : 'bg-gradient-to-b from-[#2a2a3a] to-[#1a1a28] border-gray-700 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] hover:from-[#333348] hover:to-[#222236]'
      }`}>
      <span className={`font-bold ${large ? 'text-[14px]' : 'text-[11px]'}`} style={{ color: active ? color : '#555' }}>
        {label}
      </span>
      <div className={`${large ? 'w-11 h-[24px]' : 'w-8 h-[18px]'} rounded-full relative transition-colors shadow-inner ${active ? 'bg-cyan-600' : 'bg-gray-700'}`}>
        <div className={`${large ? 'w-[20px] h-[20px]' : 'w-[14px] h-[14px]'} rounded-full bg-gradient-to-b from-white to-gray-300 shadow-[0_1px_3px_rgba(0,0,0,0.4)] absolute top-[2px] transition-all ${active ? (large ? 'left-[22px]' : 'left-[14px]') : 'left-[2px]'}`} />
      </div>
    </button>
  );
}

// ===== PACER POWER BUTTON (premium defibrillator style) =====
function PacerButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="group relative flex items-center gap-3 w-full px-4 py-3.5 rounded-lg border transition-all duration-300 overflow-hidden"
      style={{
        background: active
          ? 'linear-gradient(180deg, #0c3a4a 0%, #062a35 50%, #0a1e28 100%)'
          : 'linear-gradient(180deg, #2a2a3a 0%, #1a1a28 50%, #111120 100%)',
        borderColor: active ? '#0e7490' : '#374151',
        boxShadow: active
          ? '0 0 12px rgba(6,182,212,0.3), 0 0 4px rgba(6,182,212,0.15), inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 4px rgba(0,0,0,0.5)'
          : '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* LED indicator */}
      <div className="relative flex-shrink-0">
        <div
          className="w-3.5 h-3.5 rounded-full transition-all duration-300"
          style={{
            background: active
              ? 'radial-gradient(circle at 35% 35%, #67e8f9, #06b6d4 50%, #0891b2 100%)'
              : 'radial-gradient(circle at 35% 35%, #4b5563, #374151 50%, #1f2937 100%)',
            boxShadow: active
              ? '0 0 8px rgba(6,182,212,0.8), 0 0 16px rgba(6,182,212,0.4), inset 0 -1px 2px rgba(0,0,0,0.3)'
              : 'inset 0 1px 2px rgba(0,0,0,0.5)',
          }}
        />
        {active && (
          <div className="absolute inset-0 w-3.5 h-3.5 rounded-full animate-ping opacity-30"
            style={{ background: '#06b6d4' }}
          />
        )}
      </div>

      {/* Label */}
      <span
        className="flex-1 font-black text-lg tracking-widest transition-colors duration-300"
        style={{
          color: active ? '#67e8f9' : '#6b7280',
          textShadow: active ? '0 0 8px rgba(6,182,212,0.5)' : 'none',
          textAlign: 'center',
          marginLeft: '-12px',
        }}
      >
        PACER
      </span>


      {/* Active glow line at bottom */}
      {active && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background: 'linear-gradient(90deg, transparent, #06b6d4, #22d3ee, #06b6d4, transparent)',
          }}
        />
      )}
    </button>
  );
}

// ===== BOTTOM BUTTON COMPONENT (3D style) =====
function BottomBtn({ label, onClick, color }: { label: string; onClick?: () => void; color?: string }) {
  void color; // preserved prop interface
  return (
    <button
      onClick={onClick}
      className="group relative flex-1 px-2 rounded-lg text-sm font-bold text-gray-200 border transition-all duration-300 active:translate-y-[1px] overflow-hidden flex items-center gap-2 justify-center"
      style={{
        background: 'linear-gradient(180deg, #2a2a3a 0%, #1a1a28 50%, #111120 100%)',
        borderColor: '#374151',
        boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 0 10px rgba(99,102,241,0.25), 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)';
        e.currentTarget.style.borderColor = '#4f46e5';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)';
        e.currentTarget.style.borderColor = '#374151';
      }}
    >
      <div className="w-1.5 h-6 rounded-full" style={{ background: 'linear-gradient(180deg, #6366f1, #4338ca)', boxShadow: '0 0 6px rgba(99,102,241,0.4)' }} />
      {label}
    </button>
  );
}

// ===== UNIFIED SETTINGS OVERLAY (Apple-style) =====
function SettingsOverlay({ language, visibleParams, showDescription, onClose }: {
  language: 'es' | 'en';
  visibleParams: { hr: boolean; bp: boolean; spo2: boolean; etco2: boolean };
  showDescription: boolean;
  onClose: () => void;
}) {
  const settings = useSettingsStore();

  const SectionTitle = ({ children }: { children: string }) => (
    <div className="flex items-center gap-2 mt-4 mb-2">
      <span className="text-[11px] text-gray-400 uppercase tracking-[0.2em] font-bold whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
    </div>
  );

  const SettingRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-800/40">
      <span className="text-[13px] text-gray-300">{label}</span>
      {children}
    </div>
  );

  const OnOffBtn = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle}
      className={`w-11 h-[24px] rounded-full relative transition-colors shadow-inner ${on ? 'bg-green-600' : 'bg-gray-600'}`}>
      <div className={`w-[20px] h-[20px] rounded-full bg-gradient-to-b from-white to-gray-300 shadow-[0_1px_3px_rgba(0,0,0,0.4)] absolute top-[2px] transition-all ${on ? 'left-[22px]' : 'left-[2px]'}`} />
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-gradient-to-b from-[#1e1e32] to-[#16162a] border border-gray-600/50 rounded-2xl p-5 w-[340px] max-h-[92%] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-white"
        style={{ backdropFilter: 'blur(20px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-base font-bold tracking-wide">{t('settings', language)}</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-700/80 hover:bg-gray-600 flex items-center justify-center text-gray-400 hover:text-white text-sm transition-colors">✕</button>
        </div>

        {/* Language */}
        <SectionTitle>{t('language', language).toUpperCase()}</SectionTitle>
        <div className="flex gap-2 mb-1">
          <button onClick={() => settings.set('language', 'es')}
            className="relative flex-1 py-2 rounded-lg text-[13px] font-bold border transition-all duration-300 overflow-hidden"
            style={{
              background: language === 'es'
                ? 'linear-gradient(180deg, #1a2a4a 0%, #0d1e3a 50%, #091428 100%)'
                : 'linear-gradient(180deg, #2a2a3a 0%, #1a1a28 50%, #111120 100%)',
              borderColor: language === 'es' ? '#3b82f6' : '#374151',
              color: language === 'es' ? '#bfdbfe' : '#9ca3af',
              boxShadow: language === 'es'
                ? '0 0 8px rgba(59,130,246,0.25), 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)'
                : '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
            Español
            {language === 'es' && <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)' }} />}
          </button>
          <button onClick={() => settings.set('language', 'en')}
            className="relative flex-1 py-2 rounded-lg text-[13px] font-bold border transition-all duration-300 overflow-hidden"
            style={{
              background: language === 'en'
                ? 'linear-gradient(180deg, #1a2a4a 0%, #0d1e3a 50%, #091428 100%)'
                : 'linear-gradient(180deg, #2a2a3a 0%, #1a1a28 50%, #111120 100%)',
              borderColor: language === 'en' ? '#3b82f6' : '#374151',
              color: language === 'en' ? '#bfdbfe' : '#9ca3af',
              boxShadow: language === 'en'
                ? '0 0 8px rgba(59,130,246,0.25), 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)'
                : '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
            English
            {language === 'en' && <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)' }} />}
          </button>
        </div>

        {/* Display */}
        <SectionTitle>{t('display', language).toUpperCase()}</SectionTitle>
        <div className="flex flex-col gap-1.5">
          <ToggleSwitch label="FC" color="#00ffc8" active={visibleParams.hr} onToggle={() => useVitalSignsStore.getState().toggleParamVisibility('hr')} large />
          <ToggleSwitch label="PA" color="#ff0000" active={visibleParams.bp} onToggle={() => useVitalSignsStore.getState().toggleParamVisibility('bp')} large />
          <ToggleSwitch label="SPO2" color="#00ffff" active={visibleParams.spo2} onToggle={() => useVitalSignsStore.getState().toggleParamVisibility('spo2')} large />
          <ToggleSwitch label="CO2" color="#ffff00" active={visibleParams.etco2} onToggle={() => useVitalSignsStore.getState().toggleParamVisibility('etco2')} large />
          <ToggleSwitch label="DESC" color="#888888" active={showDescription} onToggle={() => useVitalSignsStore.getState().toggleDescription()} large />
        </div>

        {/* Audio */}
        <SectionTitle>AUDIO</SectionTitle>
        <SettingRow label={language === 'es' ? 'Sonido' : 'Sound'}>
          <OnOffBtn on={settings.soundEnabled} onToggle={() => settings.set('soundEnabled', !settings.soundEnabled)} />
        </SettingRow>
        <div className="py-2.5 border-b border-gray-800/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] text-gray-400">Beep</span>
            <span className="text-[12px] text-cyan-400 font-mono font-bold">{settings.beepVolume}%</span>
          </div>
          <input type="range" min={0} max={100} value={settings.beepVolume}
            onChange={(e) => { settings.set('beepVolume', Number(e.target.value)); audioEngine.setBeepVolume(Number(e.target.value)); }}
            className="w-full h-2 mt-0.5 accent-cyan-500 cursor-pointer" />
        </div>
        <div className="py-2.5 border-b border-gray-800/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] text-gray-400">{language === 'es' ? 'Alarmas' : 'Alarms'}</span>
            <span className="text-[12px] text-cyan-400 font-mono font-bold">{settings.alarmVolume}%</span>
          </div>
          <input type="range" min={0} max={100} value={settings.alarmVolume}
            onChange={(e) => { settings.set('alarmVolume', Number(e.target.value)); audioEngine.setAlarmVolume(Number(e.target.value)); }}
            className="w-full h-2 mt-0.5 accent-cyan-500 cursor-pointer" />
        </div>

        {/* Monitor */}
        <SectionTitle>MONITOR</SectionTitle>
        <SettingRow label={language === 'es' ? 'Velocidad barrido' : 'Sweep speed'}>
          <select value={settings.waveformSpeed}
            onChange={(e) => settings.set('waveformSpeed', Number(e.target.value) as 12.5 | 25 | 50)}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-[12px] text-white cursor-pointer">
            <option value={12.5}>12.5 mm/s</option>
            <option value={25}>25 mm/s</option>
            <option value={50}>50 mm/s</option>
          </select>
        </SettingRow>
        <SettingRow label={language === 'es' ? 'Tipo energía' : 'Energy type'}>
          <select value={settings.energyType}
            onChange={(e) => settings.set('energyType', e.target.value as 'biphasic' | 'monophasic')}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-[12px] text-white cursor-pointer">
            <option value="biphasic">{language === 'es' ? 'Bifásica' : 'Biphasic'}</option>
            <option value="monophasic">{language === 'es' ? 'Monofásica' : 'Monophasic'}</option>
          </select>
        </SettingRow>
        <SettingRow label={language === 'es' ? 'Temperatura' : 'Temperature'}>
          <select value={settings.temperatureUnit}
            onChange={(e) => settings.set('temperatureUnit', e.target.value as 'celsius' | 'fahrenheit')}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-[12px] text-white cursor-pointer">
            <option value="celsius">°C</option>
            <option value="fahrenheit">°F</option>
          </select>
        </SettingRow>

        {/* CPR */}
        <SectionTitle>{language === 'es' ? 'RCP' : 'CPR'}</SectionTitle>
        <SettingRow label="Ratio">
          <select value={settings.cprRatio}
            onChange={(e) => settings.set('cprRatio', e.target.value as '30:2' | '15:2' | 'continuous')}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-[12px] text-white cursor-pointer">
            <option value="30:2">30:2</option>
            <option value="15:2">15:2</option>
            <option value="continuous">{language === 'es' ? 'Continuas' : 'Continuous'}</option>
          </select>
        </SettingRow>
        <SettingRow label={language === 'es' ? 'Metrónomo' : 'Metronome'}>
          <div className="flex items-center gap-1.5">
            <input type="number" min={80} max={140} value={settings.cprMetronomeRate}
              onChange={(e) => settings.set('cprMetronomeRate', Number(e.target.value))}
              className="w-14 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-[12px] text-center text-white" />
            <span className="text-[12px] text-gray-400">bpm</span>
          </div>
        </SettingRow>

        {/* System */}
        <SectionTitle>{language === 'es' ? 'SISTEMA' : 'SYSTEM'}</SectionTitle>
        <SettingRow label={language === 'es' ? 'Pantalla activa' : 'Wake lock'}>
          <OnOffBtn on={settings.wakeLockEnabled} onToggle={() => settings.set('wakeLockEnabled', !settings.wakeLockEnabled)} />
        </SettingRow>

        {/* Alarms */}
        <SectionTitle>{language === 'es' ? 'ALARMAS' : 'ALARMS'}</SectionTitle>
        <div className="flex gap-2 mb-2">
          <button onClick={() => settings.silenceAlarms()}
            className="relative flex-1 py-2.5 rounded-lg text-[12px] font-bold border transition-all duration-300 active:translate-y-[1px] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #4a3a0a 0%, #3a2a00 50%, #2a1a00 100%)',
              borderColor: '#ca8a04',
              color: '#fef08a',
              boxShadow: '0 0 8px rgba(202,138,4,0.2), 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>
            {language === 'es' ? 'Silenciar 2min' : 'Silence 2min'}
            <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, #ca8a04, #eab308, #ca8a04, transparent)' }} />
          </button>
          <button onClick={() => settings.toggleAlarmsOff()}
            className="relative flex-1 py-2.5 rounded-lg text-[12px] font-bold border transition-all duration-300 active:translate-y-[1px] overflow-hidden"
            style={{
              background: settings.alarmsOff
                ? 'linear-gradient(180deg, #4a1a1a 0%, #3a0d0d 50%, #280808 100%)'
                : 'linear-gradient(180deg, #2a2a3a 0%, #1a1a28 50%, #111120 100%)',
              borderColor: settings.alarmsOff ? '#ef4444' : '#374151',
              color: settings.alarmsOff ? '#fca5a5' : '#9ca3af',
              boxShadow: settings.alarmsOff
                ? '0 0 8px rgba(239,68,68,0.25), 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)'
                : '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
            {settings.alarmsOff ? (language === 'es' ? 'Alarmas OFF' : 'Alarms OFF') : (language === 'es' ? 'Desactivar' : 'Disable')}
            {settings.alarmsOff && <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, #ef4444, #f87171, #ef4444, transparent)' }} />}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-gray-700/50 text-[10px] text-gray-500 text-center leading-relaxed">
          UPDATE SIM — {language === 'es' ? 'Simulador de entrenamiento médico' : 'Medical training simulator'}<br />
          Update Medic — updatemedic.cl
        </div>
      </div>
    </div>
  );
}

// ===== SCENARIO RUN BUTTON =====
function ScenarioRunBtn() {
  const { activeScenario, currentStepIndex } = useScenarioStore();
  const lang = useSettingsStore((s) => s.language);

  if (!activeScenario) return (
    <div className="flex-1 flex items-center justify-center text-[10px] text-gray-600">
      {t('noScenario', lang)}
    </div>
  );

  const shortName = activeScenario.name.split('—')[0].split('–')[0].trim();

  return (
    <div className="flex-1 bg-green-900/40 border border-green-800 rounded px-1 py-0.5 text-xl">
      <div className="text-green-400 font-bold truncate">{shortName}</div>
      <div className="text-green-300">{t('step', lang)} {currentStepIndex + 1}/{activeScenario.steps.length}</div>
    </div>
  );
}

// ===== RHYTHM KEYPAD =====
function RhythmKeypad({ onClose }: { onClose: () => void }) {
  const RHYTHM_GRID: Array<{ id: CardiacRhythm; num: number }> = [
    { id: CardiacRhythm.NORMAL_SINUS, num: 1 },
    { id: CardiacRhythm.SINUS_BRADYCARDIA, num: 2 },
    { id: CardiacRhythm.SINUS_TACHYCARDIA, num: 3 },
    { id: CardiacRhythm.SINUS_ARRHYTHMIA, num: 4 },
    { id: CardiacRhythm.SINUS_EXIT_BLOCK, num: 5 },
    { id: CardiacRhythm.SVT, num: 6 },
    { id: CardiacRhythm.ATRIAL_FIBRILLATION, num: 7 },
    { id: CardiacRhythm.ATRIAL_FLUTTER, num: 8 },
    { id: CardiacRhythm.FIRST_DEGREE_AV_BLOCK, num: 9 },
    { id: CardiacRhythm.SECOND_DEGREE_TYPE_1, num: 10 },
    { id: CardiacRhythm.SECOND_DEGREE_TYPE_2, num: 11 },
    { id: CardiacRhythm.THIRD_DEGREE_AV_BLOCK, num: 12 },
    { id: CardiacRhythm.JUNCTIONAL_RHYTHM, num: 13 },
    { id: CardiacRhythm.IDIOVENTRICULAR, num: 14 },
    { id: CardiacRhythm.VENTRICULAR_TACHYCARDIA, num: 15 },
    { id: CardiacRhythm.VENTRICULAR_FIBRILLATION, num: 16 },
    { id: CardiacRhythm.AGONAL_RHYTHM, num: 17 },
    { id: CardiacRhythm.ASYSTOLE, num: 18 },
    { id: CardiacRhythm.POLYMORPHIC_VT, num: 19 },
    { id: CardiacRhythm.SINUS_ST_ELEVATION, num: 20 },
    { id: CardiacRhythm.SINUS_ST_DEPRESSION, num: 21 },
    { id: CardiacRhythm.SINUS_WITH_PVCS, num: 22 },
    { id: CardiacRhythm.SINUS_WITH_PACS, num: 23 },
    { id: CardiacRhythm.BIGEMINY, num: 24 },
    { id: CardiacRhythm.TORSADES_DE_POINTES, num: 25 },
  ];

  const handleRhythm = (rhythmId: CardiacRhythm) => {
    const def = RHYTHM_DEFINITIONS[rhythmId];
    const vs = useVitalSignsStore.getState();
    vs.setRhythm(rhythmId);
    vs.setVitals({
      hr: def.defaultHR,
      systolic: def.physiologicalDefaults.systolicBP,
      diastolic: def.physiologicalDefaults.diastolicBP,
      spo2: def.physiologicalDefaults.spo2,
      etco2: def.physiologicalDefaults.etco2,
      respiratoryRate: def.physiologicalDefaults.respiratoryRate,
      hasPulse: def.hasPulse,
    });
    useCodeTrackStore.getState().addEntry('rhythm_change', `Ritmo: ${def.nameEs}`);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0d0d16] border border-gray-600 rounded-2xl p-6 max-w-5xl w-[96%] shadow-2xl" style={{ boxShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 80px rgba(0,0,0,0.4)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5 pl-2">
          <div>
            <span className="font-black text-2xl text-white tracking-wide">Teclado de Ritmos</span>
            <div className="h-[2px] mt-1 w-20" style={{ background: 'linear-gradient(90deg, #ef4444, transparent)' }} />
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white text-xl transition-all" style={{ background: 'linear-gradient(180deg, #2a2a3a, #1a1a28)', border: '1px solid #374151' }}>✕</button>
        </div>
        <div className="grid grid-cols-5 gap-3 max-h-[500px] overflow-y-auto pl-2 pr-1 py-1">
          {RHYTHM_GRID.map(({ id, num }) => (
            <button key={id} onClick={() => handleRhythm(id)}
              className="relative rounded-xl text-white font-bold text-left border transition-all duration-300 active:scale-95 overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #2a2a3a 0%, #1a1a28 50%, #111120 100%)',
                borderColor: '#991b1b',
                boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                padding: '14px 14px 14px 22px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 12px rgba(239,68,68,0.3), 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = '#ef4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = '#991b1b'; }}>
              <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-xl" style={{ background: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.5)' }} />
              <div className="flex items-baseline gap-2">
                <span className="text-red-400 font-black text-lg leading-none">{num}</span>
                <span className="text-sm leading-snug">{RHYTHM_DEFINITIONS[id].nameEs}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== MEDICATIONS OVERLAY =====
function MedsOverlay({ onClose }: { onClose: () => void }) {
  const { medications, addAdministered } = useMedicationStore();
  const startTime = useVitalSignsStore((s) => s.startTime);
  const [selectedCat, setSelectedCat] = useState(MedicationCategory.CARDIAC);
  const [lastAdminId, setLastAdminId] = useState('');
  const filtered = medications.filter((m) => m.category === selectedCat);

  const handleAdmin = (medId: string) => {
    const record = addAdministered(medId, startTime);
    if (record) {
      useCodeTrackStore.getState().addEntry('medication', `${record.name} ${record.dose}`);
      audioEngine.playSyncBeep();
      setLastAdminId(medId);
      setTimeout(() => setLastAdminId(''), 600);
      // Close menu after selecting medication
      setTimeout(() => onClose(), 300);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0d0d16] border border-gray-600 rounded-2xl p-6 max-w-5xl w-[96%] shadow-2xl" style={{ boxShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 80px rgba(0,0,0,0.4)' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center mb-5 pl-2">
          <div>
            <span className="font-black text-2xl text-white tracking-wide">Medicamentos</span>
            <div className="h-[2px] mt-1 w-24" style={{ background: 'linear-gradient(90deg, #a855f7, transparent)' }} />
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white text-xl transition-all" style={{ background: 'linear-gradient(180deg, #2a2a3a, #1a1a28)', border: '1px solid #374151' }}>✕</button>
        </div>
        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-5 pl-2">
          {Object.values(MedicationCategory).map((cat) => (
            <button key={cat} onClick={() => setSelectedCat(cat)}
              className="relative px-4 py-2 rounded-lg text-base font-bold border transition-all duration-300 overflow-hidden"
              style={{
                background: selectedCat === cat
                  ? 'linear-gradient(180deg, #3b1a5e 0%, #2d1050 50%, #1a0a30 100%)'
                  : 'linear-gradient(180deg, #2a2a3a 0%, #1a1a28 50%, #111120 100%)',
                borderColor: selectedCat === cat ? '#a855f7' : '#374151',
                color: selectedCat === cat ? '#e9d5ff' : '#9ca3af',
                boxShadow: selectedCat === cat
                  ? '0 0 10px rgba(168,85,247,0.3), 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)'
                  : '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}>
              {cat}
              {selectedCat === cat && <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #a855f7, #c084fc, #a855f7, transparent)' }} />}
            </button>
          ))}
        </div>
        {/* Medication cards */}
        <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pl-2 pr-1 py-1">
          {filtered.map((med) => (
            <button key={med.id} onClick={() => handleAdmin(med.id)}
              className={`relative rounded-xl text-left text-white font-bold border transition-all duration-300 active:scale-95 overflow-hidden ${lastAdminId === med.id
                ? 'ring-2 ring-green-400 scale-95'
                : ''}`}
              style={{
                background: 'linear-gradient(180deg, #2a2a3a 0%, #1a1a28 50%, #111120 100%)',
                borderColor: med.color + '66',
                boxShadow: `0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`,
                padding: '16px 16px 16px 24px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 12px ${med.color}40, 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`; }}>
              <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-xl" style={{ background: med.color, boxShadow: `0 0 10px ${med.color}80` }} />
              <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full" style={{
                background: `radial-gradient(circle at 35% 35%, ${med.color}cc, ${med.color} 60%, ${med.color}99 100%)`,
                boxShadow: `0 0 8px ${med.color}80`,
              }} />
              <span className="text-xl leading-tight block">{med.nameEs}</span>
              <span className="text-xs text-gray-500 mt-1 block">{med.defaultDose} — {med.route}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
