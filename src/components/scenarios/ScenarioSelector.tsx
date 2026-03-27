import { useState } from 'react';
import { useScenarioStore } from '../../stores/scenarioStore';
import { useVitalSignsStore } from '../../stores/vitalSignsStore';
import { useDefibStore } from '../../stores/defibStore';
import { useCodeTrackStore } from '../../stores/codeTrackStore';
import type { PresetScenario } from '../../data/presetScenarios';

const CATEGORY_LABELS: Record<string, string> = {
  ACLS: 'ACLS Estándar',
  ACLS_MEGA: 'ACLS MegaCódigo',
  PALS: 'PALS',
  NRP: 'NRP Neonatal',
  MEGA_LAERDAL: 'Megacodes 10 Pacientes',
  EPALS: 'EPALS',
  PH: 'PH Prehospitalario',
};

const CATEGORY_COLORS: Record<string, string> = {
  ACLS: 'bg-red-900/50 border-red-700',
  ACLS_MEGA: 'bg-orange-900/50 border-orange-700',
  PALS: 'bg-blue-900/50 border-blue-700',
  NRP: 'bg-pink-900/50 border-pink-700',
  MEGA_LAERDAL: 'bg-purple-900/50 border-purple-700',
  EPALS: 'bg-teal-900/50 border-teal-700',
  PH: 'bg-amber-900/50 border-amber-700',
};

export default function ScenarioSelector({ onClose }: { onClose: () => void }) {
  const { scenarios, loadScenario } = useScenarioStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('ACLS');

  const categories = [...new Set(scenarios.map((s) => s.category))];
  const filtered = scenarios.filter((s) => s.category === selectedCategory);

  const handleSelect = (scenario: PresetScenario) => {
    // Load scenario
    loadScenario(scenario.id);
    const store = useScenarioStore.getState();
    store.start();

    // Apply first step
    const step = scenario.steps[0];
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
      ...(step.temperature !== undefined ? { temperature: step.temperature } : {}),
    });

    // Reset defib
    useDefibStore.getState().reset();

    // Start CodeTrack
    const ct = useCodeTrackStore.getState();
    ct.start();
    ct.addEntry('scenario_start', `Inicio escenario: ${scenario.name}`);

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#111] border border-gray-700 rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="font-bold text-lg text-white">Escenarios</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-gray-800">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-lg text-base font-bold border transition-colors ${
                selectedCategory === cat
                  ? CATEGORY_COLORS[cat] ?? 'bg-gray-700 border-gray-500'
                  : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat} ({scenarios.filter((s) => s.category === cat).length})
            </button>
          ))}
        </div>

        {/* Scenario list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filtered.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => handleSelect(scenario)}
              className="w-full text-left px-3 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-600 rounded transition-colors"
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-sm text-white">{scenario.name}</span>
                <span className="text-[10px] text-gray-500 shrink-0 ml-2">{scenario.steps.length} pasos</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">{scenario.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
