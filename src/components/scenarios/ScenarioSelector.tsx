import { useState } from 'react';
import { useScenarioStore } from '../../stores/scenarioStore';
import { useVitalSignsStore } from '../../stores/vitalSignsStore';
import { useDefibStore } from '../../stores/defibStore';
import { useCodeTrackStore } from '../../stores/codeTrackStore';
import type { PresetScenario } from '../../data/presetScenarios';

const CATEGORY_LABELS: Record<string, string> = {
  ACLS_MEGA: 'MC ACLS',
  PALS: 'PALS',
  PH: 'PREHOSP',
  NRP: 'PRN',
  MAVACRIT: 'MAVACRIT',
  EPALS: 'EPALS',
  ACLS: 'ACLS 10-1',
  MEGA_LAERDAL: 'ACLS 10-2',
};

const CATEGORY_ORDER: PresetScenario['category'][] = ['ACLS_MEGA', 'PALS', 'PH', 'NRP', 'MAVACRIT', 'EPALS', 'ACLS', 'MEGA_LAERDAL'];

const CATEGORY_COLORS: Record<string, string> = {
  ACLS: 'bg-red-900/50 border-red-700',
  ACLS_MEGA: 'bg-orange-900/50 border-orange-700',
  PALS: 'bg-blue-900/50 border-blue-700',
  NRP: 'bg-pink-900/50 border-pink-700',
  MEGA_LAERDAL: 'bg-purple-900/50 border-purple-700',
  EPALS: 'bg-teal-900/50 border-teal-700',
  PH: 'bg-amber-900/50 border-amber-700',
  MAVACRIT: 'bg-emerald-900/50 border-emerald-700',
};

export default function ScenarioSelector({ onClose }: { onClose: () => void }) {
  const { scenarios, loadScenario } = useScenarioStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('ACLS_MEGA');

  const availableCategories = new Set(scenarios.map((s) => s.category));
  const categories = CATEGORY_ORDER.filter((c) => availableCategories.has(c));
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
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={onClose}
      style={{ animation: 'overlayFadeIn 0.2s ease-out', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
      <div
        className="bg-gradient-to-b from-[#141420] to-[#0c0c16] border border-gray-600/40 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'overlayScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 1px rgba(255,255,255,0.06)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
          <div>
            <span className="font-black text-xl text-white tracking-wide">Escenarios</span>
            <div className="h-[2px] mt-1.5 w-16 rounded-full" style={{ background: 'linear-gradient(90deg, #3b82f6, transparent)' }} />
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white text-lg transition-all"
            style={{ background: 'linear-gradient(180deg, #2a2a3a, #1a1a28)', border: '1px solid #374151' }}>✕</button>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 px-5 py-3.5 border-b border-gray-800/50">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`relative px-4 py-2 rounded-lg text-sm font-bold border transition-all duration-200 overflow-hidden ${
                  isActive
                    ? CATEGORY_COLORS[cat] ?? 'bg-gray-700 border-gray-500'
                    : 'bg-gray-900/60 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat} <span className="text-[10px] opacity-60">({scenarios.filter((s) => s.category === cat).length})</span>
              </button>
            );
          })}
        </div>

        {/* Scenario list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filtered.map((scenario, i) => (
            <button
              key={scenario.id}
              onClick={() => handleSelect(scenario)}
              className="w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 hover:scale-[1.005] active:scale-[0.995]"
              style={{
                animation: `slideUpIn 0.25s ease-out ${i * 0.03}s both`,
                background: 'linear-gradient(180deg, #1a1a28 0%, #111120 100%)',
                borderColor: '#2a2a3a',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4a4a5a'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a3a'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)'; }}
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-sm text-white">{scenario.name}</span>
                <span className="text-[10px] text-gray-500 shrink-0 ml-2 bg-gray-800/60 px-2 py-0.5 rounded">{scenario.steps.length} pasos</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{scenario.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
