import { useState, useEffect, useCallback } from 'react';
import MonitorScreen, { applyStep } from './components/monitor/MonitorScreen';
import ScenarioSelector from './components/scenarios/ScenarioSelector';
import SettingsPanel from './components/settings/SettingsPanel';
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

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showScenarios, setShowScenarios] = useState(false);
  const [showRhythmPad, setShowRhythmPad] = useState(false);
  const [showMeds, setShowMeds] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const { keyboardShortcutsEnabled, showRhythmName } = useSettingsStore();
  const vitals = useVitalSignsStore((s) => s.vitals);
  const defib = useDefibStore();

  // Listen for custom events from MonitorScreen sidebar buttons
  useEffect(() => {
    const handleToggleSettings = () => setShowSettings((v) => !v);
    const handleToggleMeds = () => setShowMeds((v) => !v);
    window.addEventListener('toggleSettings', handleToggleSettings);
    window.addEventListener('toggleMeds', handleToggleMeds);
    return () => {
      window.removeEventListener('toggleSettings', handleToggleSettings);
      window.removeEventListener('toggleMeds', handleToggleMeds);
    };
  }, []);

  // ===== KEYBOARD SHORTCUTS =====
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!keyboardShortcutsEnabled) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;

    const vs = useVitalSignsStore.getState();
    const df = useDefibStore.getState();
    const sc = useScenarioStore.getState();
    const v = vs.vitals;

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
        vs.setVital('nibpActive', true);
        audioEngine.playNIBPSound();
        setTimeout(() => {
          vs.setVitals({
            nibpActive: false,
            nibpLastSystolic: v.systolic + Math.round((Math.random() - 0.5) * 6),
            nibpLastDiastolic: v.diastolic + Math.round((Math.random() - 0.5) * 4),
          });
        }, 3000);
        break;
      case 'c':
        e.preventDefault();
        {
          const newCpr = !v.cprActive;
          vs.setVital('cprActive', newCpr);
          if (newCpr) audioEngine.startMetronome(useSettingsStore.getState().cprMetronomeRate);
          else audioEngine.stopMetronome();
        }
        break;
      case 'd':
        e.preventDefault();
        if (!df.isCharged && !df.isCharging) {
          df.startCharge();
          audioEngine.playChargeSound(3);
          setTimeout(() => useDefibStore.getState().completeCharge(), 3000);
        }
        break;
      case ' ':
        e.preventDefault();
        if (df.isCharged) {
          const record = df.deliverShock();
          if (record) {
            audioEngine.playShockSound();
            useCodeTrackStore.getState().addEntry('shock', `Descarga ${record.energy}J`);
          }
        }
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
      case 'r':
        if (e.ctrlKey || e.metaKey) break;
        e.preventDefault();
        vs.reset();
        df.reset();
        useScenarioStore.getState().reset();
        break;
    }

    // Number keys 1-9 for quick rhythm
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ===== DISCLAIMER =====
  if (showDisclaimer) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
        <div className="bg-[#111] border border-gray-700 rounded-lg p-8 max-w-lg text-center">
          <h1 className="text-3xl font-bold text-blue-400 mb-2">UPDATE SIM</h1>
          <p className="text-sm text-gray-300 mb-1">by Update Medic</p>
          <div className="my-4 p-4 bg-red-900/30 border border-red-800 rounded text-sm text-red-300">
            <p className="font-bold mb-1">AVISO IMPORTANTE</p>
            <p>UPDATE SIM es un simulador para entrenamiento medico. NO es un dispositivo medico. NO utilizar para diagnostico o tratamiento de pacientes reales.</p>
          </div>
          <p className="text-xs text-gray-500 mb-6">Desarrollado por Update Medic — Vina del Mar, Chile</p>
          <button onClick={() => { setShowDisclaimer(false); audioEngine.init(); }}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded font-bold text-base touch-btn">
            ENTRAR AL SIMULADOR
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-screen bg-black overflow-hidden touch-manipulation"
      style={{ fontFamily: '"JetBrains Mono", "IBM Plex Mono", monospace' }}>

      {/* ===== MONITOR AREA ===== */}
      <div className="flex-1 min-h-0">
        <MonitorScreen />
      </div>

      {/* ===== BOTTOM CONTROL PANEL (DART Sim Pro style) ===== */}
      {showControls && (
        <div className="shrink-0 border-t border-gray-700 bg-[#0d0d0d]">
          <div className="flex h-[160px]">

            {/* Column 1: Visibility toggles */}
            <div className="flex flex-col gap-1 p-1.5 border-r border-gray-800 w-[110px] shrink-0">
              <CtrlBtn label="Ocultar FC" onClick={() => useVitalSignsStore.getState().toggleParamVisibility('hr')} />
              <CtrlBtn label="Ocultar PA" onClick={() => useVitalSignsStore.getState().toggleParamVisibility('bp')} />
              <CtrlBtn label="Ocultar SPO2" onClick={() => useVitalSignsStore.getState().toggleParamVisibility('spo2')} />
              <CtrlBtn label="Ocultar CO2" onClick={() => useVitalSignsStore.getState().toggleParamVisibility('etco2')} />
              <CtrlBtn
                label={showRhythmName ? 'Ocultar Ritmo' : 'Mostrar Ritmo'}
                onClick={() => useSettingsStore.getState().set('showRhythmName', !showRhythmName)}
              />
            </div>

            {/* Column 2: Scenarios / Rhythm / Meds / Settings */}
            <div className="flex flex-col gap-1 p-1.5 border-r border-gray-800 w-[140px] shrink-0">
              <ScenarioRunBtn />
              <CtrlBtn label="Escenarios" color="bg-blue-800 hover:bg-blue-700" onClick={() => setShowScenarios(true)} />
              <CtrlBtn label="Teclado Ritmos" onClick={() => setShowRhythmPad(!showRhythmPad)} />
              <CtrlBtn label="Medicamentos" onClick={() => setShowMeds(!showMeds)} />
              <CtrlBtn label="Ocultar Panel" onClick={() => setShowControls(false)} />
            </div>

            {/* Column 3: Pacer controls */}
            <div className="flex flex-col p-2 border-r border-gray-800 w-[130px] shrink-0">
              <span className="text-xs font-bold text-white text-center mb-1">Pacer</span>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-cyan-400 tabular-nums">{defib.pacerRate}</span>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => defib.setPacerRate(defib.pacerRate + 10)}
                    className="w-8 h-7 bg-gray-700 hover:bg-gray-600 rounded text-sm touch-btn">▲</button>
                  <span className="text-[9px] text-gray-500 text-center">Rate</span>
                  <button onClick={() => defib.setPacerRate(defib.pacerRate - 10)}
                    className="w-8 h-7 bg-gray-700 hover:bg-gray-600 rounded text-sm touch-btn">▼</button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-3xl font-bold text-cyan-400 tabular-nums">{defib.pacerCurrent}</span>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => defib.setPacerCurrent(defib.pacerCurrent + 5)}
                    className="w-8 h-7 bg-gray-700 hover:bg-gray-600 rounded text-sm touch-btn">▲</button>
                  <span className="text-[9px] text-gray-500 text-center">mA</span>
                  <button onClick={() => defib.setPacerCurrent(defib.pacerCurrent - 5)}
                    className="w-8 h-7 bg-gray-700 hover:bg-gray-600 rounded text-sm touch-btn">▼</button>
                </div>
              </div>
            </div>

            {/* Column 4: PACER + SYNC + PAUSE */}
            <div className="flex flex-col gap-1 p-1.5 border-r border-gray-800 w-[110px] shrink-0">
              <button onClick={() => defib.togglePacer()}
                className={`flex-1 rounded font-bold text-xs touch-btn ${defib.pacerOn ? 'bg-cyan-700 animate-pulse text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}>
                PACER {defib.pacerOn ? 'ON' : 'OFF'}
              </button>
              {defib.pacerOn && (
                <span className={`text-[10px] text-center font-bold ${defib.pacerCapture ? 'text-green-400' : 'text-red-400'}`}>
                  {defib.pacerCapture ? 'CAPTURA' : 'SIN CAPTURA'}
                </span>
              )}
              <button onClick={() => defib.toggleSync()}
                className={`flex-1 rounded font-bold text-xs touch-btn ${defib.syncMode ? 'bg-green-700 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}>
                SYNC {defib.syncMode ? '✓' : ''}
              </button>
              <button
                onClick={() => useVitalSignsStore.getState().togglePause()}
                className="flex-1 rounded font-bold text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 touch-btn"
              >
                PAUSE
              </button>
            </div>

            {/* Column 5: Temperature + Respiration */}
            <div className="flex flex-col p-1.5 border-r border-gray-800 w-[110px] shrink-0">
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-[10px] text-orange-400">Temperature</span>
                <span className="text-2xl font-bold text-orange-300 tabular-nums">{vitals.temperature.toFixed(1)}</span>
                <span className="text-[10px] text-orange-400">°C</span>
              </div>
              <div className="border-t border-gray-800 flex-1 flex flex-col items-center justify-center">
                <span className="text-[10px] text-gray-400">Respiration</span>
                <span className="text-2xl font-bold text-white tabular-nums">{vitals.respiratoryRate}</span>
              </div>
            </div>

            {/* Column 6: Energy Select + Charge + Shock + Disarm */}
            <div className="flex flex-col p-2 flex-1 min-w-[180px]">
              <span className="text-xs font-bold text-white text-center">Energy Selected</span>
              <div className="flex items-center justify-center gap-2 my-1">
                <button onClick={() => defib.decreaseEnergy()}
                  className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded font-bold text-lg text-white touch-btn">▼</button>
                <div className="text-center">
                  <span className="text-4xl font-bold text-yellow-400 tabular-nums">{defib.energy}</span>
                  <span className="text-sm text-yellow-400 ml-0.5">j</span>
                </div>
                <button onClick={() => defib.increaseEnergy()}
                  className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded font-bold text-lg text-white touch-btn">▲</button>
              </div>
              <span className="text-[10px] text-gray-500 text-center">Shock - {defib.shockCount}</span>
              <div className="flex gap-1 mt-1">
                <button onClick={() => {
                  if (!defib.isCharged && !defib.isCharging) {
                    defib.startCharge();
                    audioEngine.playChargeSound(3);
                    setTimeout(() => useDefibStore.getState().completeCharge(), 3000);
                  }
                }}
                  disabled={defib.isCharging || defib.isCharged}
                  className={`flex-1 py-3 rounded font-bold text-sm touch-btn ${defib.isCharging ? 'bg-yellow-700 animate-pulse' : defib.isCharged ? 'bg-yellow-600' : 'bg-red-700 hover:bg-red-600'} text-white disabled:opacity-60`}>
                  {defib.isCharging ? 'Cargando...' : defib.isCharged ? 'Cargado ✓' : 'Charge'}
                </button>
                <button onClick={() => {
                  const record = defib.deliverShock();
                  if (record) {
                    audioEngine.playShockSound();
                    useCodeTrackStore.getState().addEntry('shock', `Descarga ${record.energy}J${record.synchronized ? ' SYNC' : ''}`);
                  }
                }}
                  disabled={!defib.isCharged}
                  className={`flex-1 py-3 rounded font-bold text-sm touch-btn ${defib.isCharged ? 'bg-yellow-500 hover:bg-yellow-400 text-black animate-pulse' : 'bg-gray-800 text-gray-500'}`}>
                  ⚡ Shock
                </button>
              </div>
              <button onClick={() => defib.disarm()}
                className="mt-1 py-2 bg-cyan-800 hover:bg-cyan-700 rounded text-xs font-bold text-white touch-btn">
                Disarm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show controls button when hidden */}
      {!showControls && (
        <button onClick={() => setShowControls(true)}
          className="fixed bottom-2 right-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-400 z-40 touch-btn">
          Mostrar Controles (H)
        </button>
      )}

      {/* ===== MODALS ===== */}
      {showScenarios && <ScenarioSelector onClose={() => setShowScenarios(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Rhythm Keypad Overlay */}
      {showRhythmPad && <RhythmKeypad onClose={() => setShowRhythmPad(false)} />}

      {/* Medications Overlay */}
      {showMeds && <MedsOverlay onClose={() => setShowMeds(false)} />}
    </div>
  );
}

// ===== CONTROL BUTTON COMPONENT (touch-friendly) =====
function CtrlBtn({ label, onClick, color }: { label: string; onClick?: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-2 rounded text-[11px] font-medium text-gray-200 min-h-[28px] touch-btn ${color ?? 'bg-gray-800 hover:bg-gray-700'}`}
    >
      {label}
    </button>
  );
}

// ===== SCENARIO RUN BUTTON =====
function ScenarioRunBtn() {
  const { activeScenario, currentStepIndex } = useScenarioStore();

  if (!activeScenario) return (
    <div className="flex-1 flex items-center justify-center text-[10px] text-gray-600">
      Sin escenario
    </div>
  );

  return (
    <div className="flex-1 bg-green-900/40 border border-green-800 rounded px-1 py-0.5 text-[10px]">
      <div className="text-green-400 font-bold truncate">{activeScenario.name}</div>
      <div className="text-green-300">Paso {currentStepIndex + 1}/{activeScenario.steps.length}</div>
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-gray-700 rounded-lg p-4 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-sm text-white">Teclado de Ritmos</span>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white text-xl touch-btn">✕</button>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {RHYTHM_GRID.map(({ id, num }) => (
            <button key={id} onClick={() => handleRhythm(id)}
              className="p-2.5 bg-red-900/60 hover:bg-red-800 active:bg-red-700 border border-red-800 rounded text-[11px] text-white font-medium text-center leading-tight touch-btn min-h-[44px]">
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
  const filtered = medications.filter((m) => m.category === selectedCat);

  const handleAdmin = (medId: string) => {
    const record = addAdministered(medId, startTime);
    if (record) {
      useCodeTrackStore.getState().addEntry('medication', `${record.name} ${record.dose}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-gray-700 rounded-lg p-4 max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-sm text-white">Medicamentos</span>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white text-xl touch-btn">✕</button>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {Object.values(MedicationCategory).map((cat) => (
            <button key={cat} onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 rounded text-xs touch-btn min-h-[36px] ${selectedCat === cat ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5 max-h-60 overflow-y-auto">
          {filtered.map((med) => (
            <button key={med.id} onClick={() => handleAdmin(med.id)}
              className="px-3 py-2.5 rounded text-[11px] text-left text-white touch-btn min-h-[44px]"
              style={{ backgroundColor: med.color + '44', borderLeft: `3px solid ${med.color}` }}>
              {med.nameEs}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
