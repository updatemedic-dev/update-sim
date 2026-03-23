import { useState, useEffect, useCallback, useRef } from 'react';
import MonitorScreen, { applyStep } from './components/monitor/MonitorScreen';
import ScenarioSelector from './components/scenarios/ScenarioSelector';
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

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'a') aKeyRef.current = false;
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

    // A + 1-6: Load MC ACLS (MegaCódigo) scenario
    if (aKeyRef.current && e.key >= '1' && e.key <= '6') {
      e.preventDefault();
      const scenarioId = `mc-acls-${e.key}`;
      // Stop current simulation and load scenario (shows in green panel)
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

    switch (e.key.toLowerCase()) {
      case 'n': // NEXT STEP
        e.preventDefault();
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
        if (!df.isCharged && !df.isCharging) {
          df.startCharge();
          audioEngine.playChargeSound(3);
          setTimeout(() => {
            useDefibStore.getState().completeCharge();
            audioEngine.startChargedBeep();
          }, 3000);
        }
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
      case 'p':
        e.preventDefault();
        df.togglePacer();
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
    if (num >= 1 && num <= 9 && !aKeyRef.current) {
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
          <img src={`${import.meta.env.BASE_URL}logo-update-sim.jpeg`} alt="UPDATE SIM" className="h-16 mx-auto mb-2" />
          <p className="text-sm text-gray-300 mb-1">by Update Medic</p>
          <div className="my-4 p-3 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
            <p className="font-bold mb-1">{t('disclaimer', language)}</p>
            <p>{t('disclaimerText', language)}</p>
          </div>
          <p className="text-xs text-gray-500 mb-4">{t('developedBy', language)}</p>
          <button onClick={() => { setShowDisclaimer(false); audioEngine.init(); }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold text-sm">
            {t('enter', language)}
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
        <MonitorScreen />
      </div>

      {/* ===== BOTTOM CONTROL PANEL ===== */}
      {showControls && (
        <div className="shrink-0 border-t border-gray-700 bg-[#0a0a14]">
          <div className="flex h-[192px] gap-1.5 p-1.5">

            {/* Column 1: Scenarios / Rhythm */}
            <div className="flex flex-col gap-1 p-1.5 w-[150px] shrink-0 rounded-xl bg-gradient-to-b from-[#1a1a28] to-[#111120] border border-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]">
              <ScenarioRunBtn />
              <BottomBtn label={t('scenarios', language)} color="bg-blue-800 hover:bg-blue-700" onClick={() => setShowScenarios(true)} />
              <BottomBtn label={t('rhythmKeypad', language)} onClick={() => setShowRhythmPad(!showRhythmPad)} />
            </div>

            {/* Column 3: MARCAPASO panel */}
            <div className="flex flex-col p-1.5 w-[150px] shrink-0 rounded-xl bg-gradient-to-b from-[#1a1a28] to-[#111120] border border-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span className="text-[10px] font-bold text-gray-400 text-center mb-0.5 tracking-wider">{t('pacemaker', language)}</span>
              <ToggleSwitch label="PACER" color="#06b6d4" active={defib.pacerOn} onToggle={() => { defib.togglePacer(); audioEngine.playPacerBeep(); }} large />
              <div className="flex items-center justify-between mt-1">
                <button onClick={() => { defib.setPacerRate(defib.pacerRate - 10); audioEngine.playTapClick(); }}
                  className="w-10 h-8 rounded-lg text-sm bg-gradient-to-b from-gray-500 to-gray-700 border border-gray-500 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-gray-400 active:translate-y-[1px] transition-all">▼</button>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-gray-500">RATE SELECT</span>
                  <span className="text-4xl font-bold text-cyan-400 tabular-nums">{defib.pacerRate}</span>
                </div>
                <button onClick={() => { defib.setPacerRate(defib.pacerRate + 10); audioEngine.playTapClick(); }}
                  className="w-10 h-8 rounded-lg text-sm bg-gradient-to-b from-gray-500 to-gray-700 border border-gray-500 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-gray-400 active:translate-y-[1px] transition-all">▲</button>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <button onClick={() => { defib.setPacerCurrent(defib.pacerCurrent - 5); audioEngine.playTapClick(); }}
                  className="w-10 h-8 rounded-lg text-sm bg-gradient-to-b from-gray-500 to-gray-700 border border-gray-500 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-gray-400 active:translate-y-[1px] transition-all">▼</button>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-gray-500">mAMP SELECT</span>
                  <span className="text-4xl font-bold text-cyan-400 tabular-nums">{defib.pacerCurrent}</span>
                </div>
                <button onClick={() => { defib.setPacerCurrent(defib.pacerCurrent + 5); audioEngine.playTapClick(); }}
                  className="w-10 h-8 rounded-lg text-sm bg-gradient-to-b from-gray-500 to-gray-700 border border-gray-500 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-gray-400 active:translate-y-[1px] transition-all">▲</button>
              </div>
              {defib.pacerOn && (
                <span className={`text-[10px] text-center font-bold mt-0.5 ${defib.pacerCapture ? 'text-green-400' : 'text-red-400'}`}>
                  {defib.pacerCapture ? t('capture', language) : t('noCapture', language)}
                </span>
              )}
            </div>

            {/* Column 4: Sync + Meds */}
            <div className="flex flex-col gap-1.5 p-1.5 w-[100px] shrink-0 rounded-xl bg-gradient-to-b from-[#1a1a28] to-[#111120] border border-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]">
              <button onClick={() => { defib.toggleSync(); audioEngine.playSyncBeep(); }}
                className={`flex-1 rounded-xl font-bold text-lg border transition-all active:translate-y-[1px] ${defib.syncMode
                  ? 'bg-gradient-to-b from-purple-400 to-purple-700 text-white border-purple-400 shadow-[0_0_16px_rgba(168,85,247,0.5),0_3px_6px_rgba(0,0,0,0.4),inset_0_2px_0_rgba(255,255,255,0.3)]'
                  : 'bg-gradient-to-b from-purple-500 to-purple-800 text-purple-100 border-purple-600 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.15)] hover:from-purple-400 hover:to-purple-700'}`}>
                SYNC {defib.syncMode ? '✓' : ''}
              </button>
              <button onClick={() => setShowMeds(!showMeds)}
                className="flex-1 rounded-xl font-bold text-lg border transition-all active:translate-y-[1px] bg-gradient-to-b from-green-500 to-green-800 text-white border-green-500 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.15)] hover:from-green-400 hover:to-green-700">
                MEDS
              </button>
            </div>

            {/* Column 5: Temperature + Respiration */}
            <div className="flex flex-col p-1.5 w-[120px] shrink-0 rounded-xl bg-gradient-to-b from-[#1a1a28] to-[#111120] border border-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-[10px] text-orange-400">{t('temperature', language)}</span>
                <span className="text-3xl font-bold text-orange-300 tabular-nums">{vitals.temperature.toFixed(1)}</span>
                <span className="text-[10px] text-orange-400">°C</span>
              </div>
              <div className="border-t border-gray-800 flex-1 flex flex-col items-center justify-center">
                <span className="text-[10px] text-gray-400">{t('respiration', language)}</span>
                <span className="text-3xl font-bold text-white tabular-nums">{vitals.respiratoryRate}</span>
              </div>
            </div>

            {/* Column 5.5: PNI + COMP buttons (aligned with SYNC+MEDS) */}
            <div className="flex flex-col gap-1.5 p-1.5 w-[100px] shrink-0 rounded-xl bg-gradient-to-b from-[#1a1a28] to-[#111120] border border-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)] justify-center">
              {/* PNI button */}
              <button onClick={() => {
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
                className="h-[calc(50%-4px)] rounded-xl font-bold text-sm border transition-all active:translate-y-[1px] bg-gradient-to-b from-blue-600 to-blue-900 text-white border-blue-500 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.15)] hover:from-blue-500 hover:to-blue-800 flex items-center justify-center p-2">
                <img src={`${import.meta.env.BASE_URL}icon-pni.png`} alt="PNI" className="h-full object-contain" />
              </button>
              {/* COMP button */}
              <button onClick={() => {
                const newCpr = !vitals.cprActive;
                useVitalSignsStore.getState().setVital('cprActive', newCpr);
                if (newCpr) audioEngine.startMetronome(useSettingsStore.getState().cprMetronomeRate);
                else audioEngine.stopMetronome();
                useCodeTrackStore.getState().addEntry(newCpr ? 'cpr_start' : 'cpr_stop', newCpr ? 'RCP iniciada' : 'RCP detenida');
              }}
                className={`h-[calc(50%-4px)] rounded-xl border transition-all active:translate-y-[1px] flex items-center justify-center p-2 ${vitals.cprActive
                  ? 'bg-gradient-to-b from-red-400 to-red-700 border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.7),0_3px_6px_rgba(0,0,0,0.4),inset_0_2px_0_rgba(255,255,255,0.2)] animate-[compFlash_0.6s_ease-in-out_infinite]'
                  : 'bg-gradient-to-b from-red-600 to-red-900 border-red-500 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.1)] hover:from-red-500 hover:to-red-800'}`}>
                <img src={`${import.meta.env.BASE_URL}icon-comp.png`} alt="COMP" className="h-full object-contain" />
              </button>
            </div>

            {/* Column 6: Energy Select + Charge + Shock + Disarm */}
            <div className="flex flex-col p-2 flex-1 min-w-[200px] rounded-xl bg-gradient-to-b from-[#1a1a28] to-[#111120] border border-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span className="text-xs font-bold text-white text-center">{t('energySelected', language)}</span>
              <div className="flex items-center justify-center gap-3 my-1">
                <button onClick={() => { defib.decreaseEnergy(); audioEngine.playTapClick(); }}
                  className="w-12 h-12 rounded-xl font-bold text-xl text-white bg-gradient-to-b from-gray-500 to-gray-700 border border-gray-500 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.15)] hover:from-gray-400 hover:to-gray-600 active:translate-y-[1px] active:shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_3px_rgba(0,0,0,0.2)] transition-all">▼</button>
                <div className="text-center">
                  <span className="text-5xl font-bold text-yellow-400 tabular-nums">{defib.energy}</span>
                  <span className="text-lg text-yellow-400 ml-0.5">j</span>
                </div>
                <button onClick={() => { defib.increaseEnergy(); audioEngine.playTapClick(); }}
                  className="w-12 h-12 rounded-xl font-bold text-xl text-white bg-gradient-to-b from-gray-500 to-gray-700 border border-gray-500 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.15)] hover:from-gray-400 hover:to-gray-600 active:translate-y-[1px] active:shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_3px_rgba(0,0,0,0.2)] transition-all">▲</button>
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
                  className={`flex-1 rounded-xl font-bold text-lg border-2 transition-all active:translate-y-[1px] ${defib.isCharging ? 'bg-yellow-700 animate-pulse border-yellow-600 shadow-[0_0_14px_rgba(202,138,4,0.5)]' : defib.isCharged ? 'bg-yellow-600 border-yellow-500 shadow-[0_0_14px_rgba(202,138,4,0.5)]' : 'bg-gradient-to-b from-red-500 to-red-800 border-red-400 shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.15)] hover:from-red-400 hover:to-red-700'} text-white disabled:opacity-60`}>
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
                  className={`flex-1 rounded-xl font-bold text-lg border-2 transition-all active:translate-y-[1px] ${defib.isCharged ? 'bg-gradient-to-b from-yellow-400 to-yellow-600 border-yellow-300 text-black animate-pulse shadow-[0_0_18px_rgba(234,179,8,0.6)]' : 'bg-gradient-to-b from-[#2a2a3a] to-[#1a1a28] border-gray-600 text-gray-500 shadow-[0_4px_8px_rgba(0,0,0,0.5)]'}`}>
                  ⚡ {t('shock', language)}
                </button>
              </div>
              <button onClick={() => { defib.disarm(); audioEngine.stopChargedBeep(); }}
                className="mt-3 py-6 rounded-xl text-xl font-bold text-white border-2 border-cyan-600 bg-gradient-to-b from-cyan-600 to-cyan-900 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.1)] hover:from-cyan-500 hover:to-cyan-800 active:translate-y-[1px] transition-all">
                {t('disarm', language)}
              </button>
            </div>
          </div>
        </div>
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
      className={`flex items-center justify-between gap-1 px-3 rounded-lg border transition-all ${large ? 'py-2' : 'flex-1'} ${active
        ? 'bg-[#1a2a3a] border-gray-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.4)]'
        : 'bg-gradient-to-b from-[#2a2a3a] to-[#1a1a28] border-gray-700 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] hover:from-[#333348] hover:to-[#222236]'
      }`}>
      <span className={`font-bold ${large ? 'text-sm' : 'text-[11px]'}`} style={{ color: active ? color : '#555' }}>
        {label}
      </span>
      <div className={`${large ? 'w-10 h-[22px]' : 'w-8 h-[18px]'} rounded-full relative transition-colors shadow-inner ${active ? 'bg-cyan-600' : 'bg-gray-700'}`}>
        <div className={`${large ? 'w-[18px] h-[18px]' : 'w-[14px] h-[14px]'} rounded-full bg-gradient-to-b from-white to-gray-300 shadow-[0_1px_3px_rgba(0,0,0,0.4)] absolute top-[2px] transition-all ${active ? (large ? 'left-[20px]' : 'left-[14px]') : 'left-[2px]'}`} />
      </div>
    </button>
  );
}

// ===== BOTTOM BUTTON COMPONENT (3D style) =====
function BottomBtn({ label, onClick, color }: { label: string; onClick?: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-2 rounded-lg text-[11px] font-bold text-gray-200 border border-gray-700 transition-all active:translate-y-[1px] active:shadow-none ${color ?? 'bg-gradient-to-b from-[#2a2a3a] to-[#1a1a28] shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] hover:from-[#333348] hover:to-[#222236]'}`}
    >
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
    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mt-2 mb-1">{children}</span>
  );

  const SettingRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800/50">
      <span className="text-[11px] text-gray-300">{label}</span>
      {children}
    </div>
  );

  const OnOffBtn = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle}
      className={`w-10 h-[22px] rounded-full relative transition-colors shadow-inner ${on ? 'bg-green-600' : 'bg-gray-600'}`}>
      <div className={`w-[18px] h-[18px] rounded-full bg-gradient-to-b from-white to-gray-300 shadow-[0_1px_3px_rgba(0,0,0,0.4)] absolute top-[2px] transition-all ${on ? 'left-[20px]' : 'left-[2px]'}`} />
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-[#1c1c2e] border border-gray-600 rounded-2xl p-4 w-[280px] max-h-[90%] overflow-y-auto shadow-2xl text-white"
        style={{ backdropFilter: 'blur(20px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold">{t('settings', language)}</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-400 hover:text-white text-sm">✕</button>
        </div>

        {/* Language */}
        <SectionTitle>{t('language', language).toUpperCase()}</SectionTitle>
        <div className="flex gap-1 mb-1">
          <button onClick={() => settings.set('language', 'es')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${language === 'es' ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#2a2a3a] text-gray-400 border-gray-700'}`}>
            Español
          </button>
          <button onClick={() => settings.set('language', 'en')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${language === 'en' ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#2a2a3a] text-gray-400 border-gray-700'}`}>
            English
          </button>
        </div>

        {/* Display */}
        <SectionTitle>{t('display', language).toUpperCase()}</SectionTitle>
        <div className="flex flex-col gap-1">
          <ToggleSwitch label="FC" color="#00ffc8" active={visibleParams.hr} onToggle={() => useVitalSignsStore.getState().toggleParamVisibility('hr')} />
          <ToggleSwitch label="PA" color="#ff0000" active={visibleParams.bp} onToggle={() => useVitalSignsStore.getState().toggleParamVisibility('bp')} />
          <ToggleSwitch label="SPO2" color="#00ffff" active={visibleParams.spo2} onToggle={() => useVitalSignsStore.getState().toggleParamVisibility('spo2')} />
          <ToggleSwitch label="CO2" color="#ffff00" active={visibleParams.etco2} onToggle={() => useVitalSignsStore.getState().toggleParamVisibility('etco2')} />
          <ToggleSwitch label="DESC" color="#888888" active={showDescription} onToggle={() => useVitalSignsStore.getState().toggleDescription()} />
        </div>

        {/* Audio */}
        <SectionTitle>AUDIO</SectionTitle>
        <SettingRow label={language === 'es' ? 'Sonido' : 'Sound'}>
          <OnOffBtn on={settings.soundEnabled} onToggle={() => settings.set('soundEnabled', !settings.soundEnabled)} />
        </SettingRow>
        <div className="py-1.5 border-b border-gray-800/50">
          <span className="text-[10px] text-gray-400">Beep: {settings.beepVolume}%</span>
          <input type="range" min={0} max={100} value={settings.beepVolume}
            onChange={(e) => { settings.set('beepVolume', Number(e.target.value)); audioEngine.setBeepVolume(Number(e.target.value)); }}
            className="w-full h-1.5 mt-1 accent-blue-500" />
        </div>
        <div className="py-1.5 border-b border-gray-800/50">
          <span className="text-[10px] text-gray-400">{language === 'es' ? 'Alarmas' : 'Alarms'}: {settings.alarmVolume}%</span>
          <input type="range" min={0} max={100} value={settings.alarmVolume}
            onChange={(e) => { settings.set('alarmVolume', Number(e.target.value)); audioEngine.setAlarmVolume(Number(e.target.value)); }}
            className="w-full h-1.5 mt-1 accent-blue-500" />
        </div>

        {/* Monitor */}
        <SectionTitle>MONITOR</SectionTitle>
        <SettingRow label={language === 'es' ? 'Velocidad barrido' : 'Sweep speed'}>
          <select value={settings.waveformSpeed}
            onChange={(e) => settings.set('waveformSpeed', Number(e.target.value) as 12.5 | 25 | 50)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-[10px] text-white">
            <option value={12.5}>12.5 mm/s</option>
            <option value={25}>25 mm/s</option>
            <option value={50}>50 mm/s</option>
          </select>
        </SettingRow>
        <SettingRow label={language === 'es' ? 'Tipo energía' : 'Energy type'}>
          <select value={settings.energyType}
            onChange={(e) => settings.set('energyType', e.target.value as 'biphasic' | 'monophasic')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-[10px] text-white">
            <option value="biphasic">{language === 'es' ? 'Bifásica' : 'Biphasic'}</option>
            <option value="monophasic">{language === 'es' ? 'Monofásica' : 'Monophasic'}</option>
          </select>
        </SettingRow>
        <SettingRow label={language === 'es' ? 'Temperatura' : 'Temperature'}>
          <select value={settings.temperatureUnit}
            onChange={(e) => settings.set('temperatureUnit', e.target.value as 'celsius' | 'fahrenheit')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-[10px] text-white">
            <option value="celsius">°C</option>
            <option value="fahrenheit">°F</option>
          </select>
        </SettingRow>

        {/* CPR */}
        <SectionTitle>{language === 'es' ? 'RCP' : 'CPR'}</SectionTitle>
        <SettingRow label="Ratio">
          <select value={settings.cprRatio}
            onChange={(e) => settings.set('cprRatio', e.target.value as '30:2' | '15:2' | 'continuous')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-[10px] text-white">
            <option value="30:2">30:2</option>
            <option value="15:2">15:2</option>
            <option value="continuous">{language === 'es' ? 'Continuas' : 'Continuous'}</option>
          </select>
        </SettingRow>
        <SettingRow label={language === 'es' ? 'Metrónomo' : 'Metronome'}>
          <div className="flex items-center gap-1">
            <input type="number" min={80} max={140} value={settings.cprMetronomeRate}
              onChange={(e) => settings.set('cprMetronomeRate', Number(e.target.value))}
              className="w-12 bg-gray-800 border border-gray-700 rounded-lg px-1 py-0.5 text-[10px] text-center text-white" />
            <span className="text-[10px] text-gray-400">bpm</span>
          </div>
        </SettingRow>

        {/* System */}
        <SectionTitle>{language === 'es' ? 'SISTEMA' : 'SYSTEM'}</SectionTitle>
        <SettingRow label={language === 'es' ? 'Pantalla activa' : 'Wake lock'}>
          <OnOffBtn on={settings.wakeLockEnabled} onToggle={() => settings.set('wakeLockEnabled', !settings.wakeLockEnabled)} />
        </SettingRow>

        {/* Alarms */}
        <SectionTitle>{language === 'es' ? 'ALARMAS' : 'ALARMS'}</SectionTitle>
        <div className="flex gap-1 mb-2">
          <button onClick={() => settings.silenceAlarms()}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-gradient-to-b from-yellow-700 to-yellow-900 border border-yellow-600 text-yellow-200 shadow-[0_2px_4px_rgba(0,0,0,0.4)] active:translate-y-[1px] transition-all">
            {language === 'es' ? 'Silenciar 2min' : 'Silence 2min'}
          </button>
          <button onClick={() => settings.toggleAlarmsOff()}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all active:translate-y-[1px] ${settings.alarmsOff
              ? 'bg-red-700 border-red-600 text-white'
              : 'bg-gradient-to-b from-[#2a2a3a] to-[#1a1a28] border-gray-700 text-gray-400'}`}>
            {settings.alarmsOff ? (language === 'es' ? 'Alarmas OFF' : 'Alarms OFF') : (language === 'es' ? 'Desactivar' : 'Disable')}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-2 pt-2 border-t border-gray-800 text-[8px] text-gray-600 text-center">
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center pb-[160px]" onClick={onClose}>
      <div className="bg-[#111] border border-gray-700 rounded-lg p-3 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-sm text-white">Teclado de Ritmos</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {RHYTHM_GRID.map(({ id, num }) => (
            <button key={id} onClick={() => handleRhythm(id)}
              className="p-1.5 bg-red-900/60 hover:bg-red-800 border border-red-800 rounded text-[10px] text-white font-medium text-center leading-tight">
              <span className="text-red-400 font-bold">{num}</span>{' '}
              {RHYTHM_DEFINITIONS[id].nameEs.substring(0, 20)}
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
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#111118] border border-gray-600 rounded-2xl p-4 max-w-2xl w-[90%] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-base text-white">Medicamentos</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white text-lg">✕</button>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {Object.values(MedicationCategory).map((cat) => (
            <button key={cat} onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${selectedCat === cat
                ? 'bg-purple-700 text-white border-purple-500 shadow-[0_0_8px_rgba(147,51,234,0.3)]'
                : 'bg-gradient-to-b from-[#2a2a3a] to-[#1a1a28] text-gray-400 border-gray-700 hover:from-[#333348]'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
          {filtered.map((med) => (
            <button key={med.id} onClick={() => handleAdmin(med.id)}
              className={`px-4 py-5 rounded-xl text-base text-left text-white font-bold border transition-all active:scale-95 ${lastAdminId === med.id
                ? 'ring-2 ring-green-400 scale-95'
                : 'hover:brightness-125'}`}
              style={{
                backgroundColor: med.color + '33',
                borderLeft: `4px solid ${med.color}`,
                borderColor: med.color + '66',
              }}>
              {med.nameEs}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
