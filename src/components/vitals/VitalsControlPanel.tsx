import { useVitalSignsStore } from '../../stores/vitalSignsStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCodeTrackStore } from '../../stores/codeTrackStore';
import { CardiacRhythm, CapnographyWaveform } from '../../types/rhythms';
import { RHYTHM_DEFINITIONS } from '../../engine/rhythms/rhythmDefinitions';
import Slider from '../ui/Slider';

const RHYTHM_GROUPS = [
  {
    label: 'Sinusales',
    rhythms: [
      CardiacRhythm.NORMAL_SINUS,
      CardiacRhythm.SINUS_BRADYCARDIA,
      CardiacRhythm.SINUS_TACHYCARDIA,
      CardiacRhythm.SINUS_ARRHYTHMIA,
      CardiacRhythm.SINUS_EXIT_BLOCK,
    ],
  },
  {
    label: 'Supraventriculares',
    rhythms: [
      CardiacRhythm.SVT,
      CardiacRhythm.PEDIATRIC_SVT,
      CardiacRhythm.ATRIAL_FIBRILLATION,
      CardiacRhythm.ATRIAL_FLUTTER,
      CardiacRhythm.WANDERING_ATRIAL_PACEMAKER,
      CardiacRhythm.MULTIFOCAL_ATRIAL_TACHYCARDIA,
    ],
  },
  {
    label: 'Bloqueos AV',
    rhythms: [
      CardiacRhythm.FIRST_DEGREE_AV_BLOCK,
      CardiacRhythm.SECOND_DEGREE_TYPE_1,
      CardiacRhythm.SECOND_DEGREE_TYPE_2,
      CardiacRhythm.THIRD_DEGREE_AV_BLOCK,
    ],
  },
  {
    label: 'Unión',
    rhythms: [
      CardiacRhythm.JUNCTIONAL_RHYTHM,
      CardiacRhythm.JUNCTIONAL_TACHYCARDIA,
    ],
  },
  {
    label: 'Ventriculares',
    rhythms: [
      CardiacRhythm.IDIOVENTRICULAR,
      CardiacRhythm.ACCELERATED_IDIOVENTRICULAR,
      CardiacRhythm.VENTRICULAR_TACHYCARDIA,
      CardiacRhythm.POLYMORPHIC_VT,
      CardiacRhythm.VENTRICULAR_FIBRILLATION,
      CardiacRhythm.TORSADES_DE_POINTES,
      CardiacRhythm.AGONAL_RHYTHM,
      CardiacRhythm.ASYSTOLE,
    ],
  },
  {
    label: 'Cambios ST',
    rhythms: [
      CardiacRhythm.SINUS_ST_ELEVATION,
      CardiacRhythm.SINUS_TACHY_ST_ELEVATION,
      CardiacRhythm.SINUS_ST_DEPRESSION,
    ],
  },
  {
    label: 'Extrasístoles',
    rhythms: [
      CardiacRhythm.SINUS_WITH_PVCS,
      CardiacRhythm.SINUS_WITH_PACS,
      CardiacRhythm.BIGEMINY,
      CardiacRhythm.TRIGEMINY,
      CardiacRhythm.COUPLET_PVCS,
    ],
  },
  {
    label: 'Preexcitación',
    rhythms: [CardiacRhythm.WPW, CardiacRhythm.BRUGADA_TYPE1],
  },
  {
    label: 'Marcapasos',
    rhythms: [
      CardiacRhythm.PACED_ATRIAL,
      CardiacRhythm.PACED_VENTRICULAR,
      CardiacRhythm.PACED_AV_SEQUENTIAL,
    ],
  },
];

const CAPNO_OPTIONS = [
  { value: CapnographyWaveform.NORMAL, label: 'Normal' },
  { value: CapnographyWaveform.HYPOVENTILATION, label: 'Hipoventilación' },
  { value: CapnographyWaveform.HYPERVENTILATION, label: 'Hiperventilación' },
  { value: CapnographyWaveform.BRONCHOSPASM, label: 'Broncoespasmo' },
  { value: CapnographyWaveform.COPD, label: 'EPOC' },
  { value: CapnographyWaveform.ESOPHAGEAL_INTUBATION, label: 'Intub. Esofágica' },
  { value: CapnographyWaveform.REBREATHING, label: 'Reinhalación' },
  { value: CapnographyWaveform.CURARE_CLEFT, label: 'Muesca Curare' },
  { value: CapnographyWaveform.CARDIOGENIC_OSCILLATIONS, label: 'Osc. Cardiogénicas' },
  { value: CapnographyWaveform.CARDIAC_ARREST, label: 'Paro Cardíaco' },
  { value: CapnographyWaveform.GOOD_CPR, label: 'RCP Buena' },
  { value: CapnographyWaveform.POOR_CPR, label: 'RCP Mala' },
  { value: CapnographyWaveform.APNEA, label: 'Apnea' },
  { value: CapnographyWaveform.DISCONNECTION, label: 'Desconexión' },
  { value: CapnographyWaveform.AIR_LEAK, label: 'Fuga de Aire' },
  { value: CapnographyWaveform.OBSTRUCTION, label: 'Obstrucción' },
  { value: CapnographyWaveform.MH_CRISIS, label: 'Crisis HM' },
  { value: CapnographyWaveform.ROSC, label: 'ROSC' },
];

export default function VitalsControlPanel() {
  const { vitals, rhythm, capnographyWaveform, setVital, setVitals, setRhythm, setCapnography, togglePause, isPaused, reset, visibleParams, toggleParamVisibility, setAllParamsVisible } = useVitalSignsStore();
  const { language } = useSettingsStore();
  const codeTrack = useCodeTrackStore();

  const handleRhythmChange = (newRhythm: CardiacRhythm) => {
    const def = RHYTHM_DEFINITIONS[newRhythm];
    setRhythm(newRhythm);
    // Apply physiological defaults
    setVitals({
      hr: def.defaultHR,
      systolic: def.physiologicalDefaults.systolicBP,
      diastolic: def.physiologicalDefaults.diastolicBP,
      spo2: def.physiologicalDefaults.spo2,
      etco2: def.physiologicalDefaults.etco2,
      respiratoryRate: def.physiologicalDefaults.respiratoryRate,
      temperature: def.physiologicalDefaults.temperature,
      hasPulse: def.hasPulse,
    });
    const name = language === 'es' ? def.nameEs : def.name;
    codeTrack.addEntry('rhythm_change', `Cambio a ${name}`, { rhythm: newRhythm });
  };

  const handleToggleCPR = () => {
    const newCpr = !vitals.cprActive;
    setVital('cprActive', newCpr);
    codeTrack.addEntry(newCpr ? 'cpr_start' : 'cpr_stop', newCpr ? 'Inicio RCP' : 'Fin RCP');
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0a0a0a] border-l border-gray-800 text-white text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0">
        <span className="font-bold text-sm text-blue-400">Control</span>
        <div className="flex gap-1">
          <button
            onClick={togglePause}
            className={`px-2 py-1 rounded text-xs font-bold ${isPaused ? 'bg-yellow-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {isPaused ? '▶ Play' : '⏸ Pausa'}
          </button>
          <button
            onClick={reset}
            className="px-2 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600"
          >
            ↻ Reset
          </button>
        </div>
      </div>

      <div className="p-2 space-y-3 overflow-y-auto">
        {/* Rhythm selector */}
        <div>
          <label className="block mb-1 font-bold text-green-400">Ritmo Cardíaco</label>
          <select
            value={rhythm}
            onChange={(e) => handleRhythmChange(e.target.value as CardiacRhythm)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white"
          >
            {RHYTHM_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.rhythms.map((r) => (
                  <option key={r} value={r}>
                    {language === 'es' ? RHYTHM_DEFINITIONS[r].nameEs : RHYTHM_DEFINITIONS[r].name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* HR */}
        <Slider
          label="Frecuencia Cardíaca"
          value={vitals.hr}
          min={0}
          max={300}
          step={1}
          color="#00ff00"
          unit=" bpm"
          onChange={(v) => setVital('hr', v)}
        />

        {/* SpO2 */}
        <Slider
          label="SpO₂"
          value={vitals.spo2}
          min={0}
          max={100}
          step={1}
          color="#00ffff"
          unit="%"
          onChange={(v) => setVital('spo2', v)}
        />

        {/* BP */}
        <Slider
          label="PA Sistólica"
          value={vitals.systolic}
          min={0}
          max={300}
          step={1}
          color="#ff0000"
          unit=" mmHg"
          onChange={(v) => setVital('systolic', v)}
        />
        <Slider
          label="PA Diastólica"
          value={vitals.diastolic}
          min={0}
          max={200}
          step={1}
          color="#ff0000"
          unit=" mmHg"
          onChange={(v) => setVital('diastolic', v)}
        />

        {/* EtCO2 */}
        <Slider
          label="EtCO₂"
          value={vitals.etco2}
          min={0}
          max={100}
          step={1}
          color="#ffff00"
          unit=" mmHg"
          onChange={(v) => setVital('etco2', v)}
        />

        {/* Capnography waveform */}
        <div>
          <label className="block mb-1 font-bold text-yellow-400">Onda Capnografía</label>
          <select
            value={capnographyWaveform}
            onChange={(e) => setCapnography(e.target.value as CapnographyWaveform)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white"
          >
            {CAPNO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* RR */}
        <Slider
          label="Frecuencia Respiratoria"
          value={vitals.respiratoryRate}
          min={0}
          max={60}
          step={1}
          color="#888888"
          unit="/min"
          onChange={(v) => setVital('respiratoryRate', v)}
        />

        {/* Temperature */}
        <Slider
          label="Temperatura"
          value={vitals.temperature}
          min={32}
          max={42}
          step={0.1}
          color="#888888"
          unit="°C"
          onChange={(v) => setVital('temperature', v)}
        />

        {/* Pulse toggle */}
        <div className="flex items-center justify-between">
          <span>Pulso</span>
          <button
            onClick={() => setVital('hasPulse', !vitals.hasPulse)}
            className={`px-3 py-1 rounded text-xs font-bold ${vitals.hasPulse ? 'bg-green-700' : 'bg-red-700'}`}
          >
            {vitals.hasPulse ? 'CON PULSO' : 'SIN PULSO'}
          </button>
        </div>

        {/* CPR toggle */}
        <button
          onClick={handleToggleCPR}
          className={`w-full py-2 rounded font-bold text-sm ${vitals.cprActive ? 'bg-orange-600 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          {vitals.cprActive ? '⏹ Detener RCP' : '▶ Iniciar RCP'}
        </button>

        {/* NIBP */}
        <button
          onClick={() => {
            setVital('nibpActive', true);
            codeTrack.addEntry('nibp', 'Medición NIBP iniciada');
            setTimeout(() => {
              setVitals({
                nibpActive: false,
                nibpLastSystolic: vitals.systolic + Math.round((Math.random() - 0.5) * 6),
                nibpLastDiastolic: vitals.diastolic + Math.round((Math.random() - 0.5) * 4),
              });
            }, 3000);
          }}
          disabled={vitals.nibpActive}
          className="w-full py-2 rounded font-bold text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
        >
          {vitals.nibpActive ? 'Midiendo NIBP...' : '🩸 Medir NIBP'}
        </button>

        {/* Visibility toggles */}
        <div className="border-t border-gray-800 pt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-gray-400">Visibilidad</span>
            <div className="flex gap-1">
              <button onClick={() => setAllParamsVisible(true)} className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded">Todos</button>
              <button onClick={() => setAllParamsVisible(false)} className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded">Ninguno</button>
            </div>
          </div>
          {(Object.keys(visibleParams) as Array<keyof typeof visibleParams>).map((key) => (
            <label key={key} className="flex items-center gap-2 py-0.5 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleParams[key]}
                onChange={() => toggleParamVisibility(key)}
                className="accent-blue-500"
              />
              <span className="text-[11px]">{key}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
