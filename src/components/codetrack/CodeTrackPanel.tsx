import { useState } from 'react';
import { useCodeTrackStore } from '../../stores/codeTrackStore';

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const TYPE_COLORS: Record<string, string> = {
  rhythm_change: '#00ff00',
  medication: '#c084fc',
  shock: '#ef4444',
  pacer: '#06b6d4',
  cpr_start: '#f97316',
  cpr_stop: '#f97316',
  vitals_change: '#888888',
  intervention: '#3b82f6',
  note: '#fbbf24',
  rosc: '#22c55e',
  scenario_start: '#8b5cf6',
  scenario_end: '#8b5cf6',
  nibp: '#888888',
};

export default function CodeTrackPanel() {
  const { entries, isRunning, start, stop, clear, getElapsedSeconds } = useCodeTrackStore();
  const [noteText, setNoteText] = useState('');

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    useCodeTrackStore.getState().addEntry('note', noteText.trim());
    setNoteText('');
  };

  return (
    <div className="flex flex-col gap-1 p-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold text-blue-400">CODETRACK</span>
        <div className="flex gap-1">
          {!isRunning ? (
            <button onClick={start} className="px-2 py-0.5 bg-green-700 rounded text-[10px] font-bold">
              ▶ INICIAR
            </button>
          ) : (
            <>
              <span className="text-red-400 tabular-nums font-bold animate-pulse">
                ● REC {formatElapsed(getElapsedSeconds())}
              </span>
              <button onClick={stop} className="px-2 py-0.5 bg-red-700 rounded text-[10px] font-bold">
                ⏹ DETENER
              </button>
            </>
          )}
          {entries.length > 0 && (
            <button onClick={clear} className="px-2 py-0.5 bg-gray-700 rounded text-[10px]">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Note input */}
      {isRunning && (
        <div className="flex gap-1">
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            placeholder="Agregar nota..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-[10px] text-white"
          />
          <button onClick={handleAddNote} className="px-2 bg-gray-700 rounded text-[10px]">+</button>
        </div>
      )}

      {/* Timeline */}
      <div className="max-h-36 overflow-y-auto space-y-0.5">
        {entries.slice().reverse().map((entry) => (
          <div key={entry.id} className="flex gap-2 text-[10px]">
            <span className="tabular-nums text-gray-500 shrink-0 w-10">
              {formatElapsed(entry.elapsedSeconds)}
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
              style={{ backgroundColor: TYPE_COLORS[entry.type] ?? '#888' }}
            />
            <span className="text-gray-300">{entry.description}</span>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <span className="text-gray-600 text-[10px]">
          {isRunning ? 'Registrando eventos...' : 'Inicia CodeTrack para registrar'}
        </span>
      )}
    </div>
  );
}
