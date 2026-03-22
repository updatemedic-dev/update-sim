import { useState } from 'react';
import { useMedicationStore } from '../../stores/medicationStore';
import { useCodeTrackStore } from '../../stores/codeTrackStore';
import { useVitalSignsStore } from '../../stores/vitalSignsStore';
import { MedicationCategory } from '../../types/medications';

const CATEGORIES = Object.values(MedicationCategory);

export default function MedicationPanel() {
  const { medications, administered, addAdministered } = useMedicationStore();
  const codeTrack = useCodeTrackStore();
  const startTime = useVitalSignsStore((s) => s.startTime);
  const [selectedCategory, setSelectedCategory] = useState<MedicationCategory>(MedicationCategory.CARDIAC);
  const [flashId, setFlashId] = useState<string | null>(null);

  const filteredMeds = medications.filter((m) => m.category === selectedCategory);

  const handleAdminister = (medId: string) => {
    const record = addAdministered(medId, startTime);
    if (record) {
      codeTrack.addEntry('medication', `${record.name} ${record.dose} (${record.route})`, {
        medicationId: medId,
        dose: record.dose,
        route: record.route,
      });
      setFlashId(medId);
      setTimeout(() => setFlashId(null), 500);
    }
  };

  return (
    <div className="flex flex-col gap-1 p-2 text-xs">
      <span className="font-bold text-purple-400">MEDICAMENTOS</span>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-0.5 mb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-1.5 py-0.5 rounded text-[10px] ${selectedCategory === cat ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Medication buttons */}
      <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
        {filteredMeds.map((med) => (
          <button
            key={med.id}
            onClick={() => handleAdminister(med.id)}
            className={`px-1.5 py-1.5 rounded text-[10px] text-left font-medium transition-all ${flashId === med.id ? 'ring-2 ring-white scale-95' : ''}`}
            style={{ backgroundColor: med.color + '33', borderLeft: `3px solid ${med.color}` }}
          >
            {med.nameEs}
          </button>
        ))}
      </div>

      {/* Recent administered */}
      {administered.length > 0 && (
        <div className="border-t border-gray-800 pt-1 mt-1">
          <span className="text-gray-500 block mb-0.5">Últimos administrados:</span>
          <div className="max-h-24 overflow-y-auto space-y-0.5">
            {administered.slice(-5).reverse().map((rec) => (
              <div key={rec.id} className="flex justify-between text-[10px] text-gray-400">
                <span>{rec.name}</span>
                <span className="tabular-nums">{rec.timestamp.toLocaleTimeString('es-CL')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
