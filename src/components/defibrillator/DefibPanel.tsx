import { useEffect, useRef } from 'react';
import { useDefibStore } from '../../stores/defibStore';
import { useCodeTrackStore } from '../../stores/codeTrackStore';
import { useVitalSignsStore } from '../../stores/vitalSignsStore';
import { audioEngine } from '../../engine/audio/AudioEngine';

export default function DefibPanel() {
  const {
    energy, isCharging, isCharged, chargeProgress, syncMode,
    shockCount, shockHistory, pacerOn, pacerRate, pacerCurrent, pacerCapture,
    increaseEnergy, decreaseEnergy, startCharge, completeCharge,
    deliverShock, disarm, toggleSync, togglePacer,
    setPacerRate, setPacerCurrent,
  } = useDefibStore();

  const codeTrack = useCodeTrackStore();
  const chargeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCharge = () => {
    if (isCharging || isCharged) return;
    startCharge();
    audioEngine.playChargeSound(3);

    // Simulate charge time
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.05;
      if (progress >= 1) {
        clearInterval(interval);
        completeCharge();
      }
    }, 150);
    chargeTimerRef.current = interval as unknown as ReturnType<typeof setTimeout>;
  };

  const handleShock = () => {
    const record = deliverShock();
    if (!record) return;
    audioEngine.playShockSound();
    codeTrack.addEntry('shock', `Descarga ${record.energy}J${record.synchronized ? ' (SYNC)' : ''}`, {
      energy: record.energy,
      synchronized: record.synchronized,
    });
  };

  const handleDisarm = () => {
    disarm();
    if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
  };

  const handleTogglePacer = () => {
    const newState = !pacerOn;
    togglePacer();
    codeTrack.addEntry('pacer', newState ? 'Marcapasos transcutáneo activado' : 'Marcapasos transcutáneo desactivado', {
      rate: pacerRate,
      current: pacerCurrent,
    });
  };

  // CPR metronome sync
  useEffect(() => {
    const vitals = useVitalSignsStore.getState().vitals;
    if (vitals.cprActive) {
      audioEngine.startMetronome(110);
    }
    return () => audioEngine.stopMetronome();
  }, []);

  const lastShock = shockHistory.length > 0 ? shockHistory[shockHistory.length - 1] : null;

  return (
    <div className="flex flex-col gap-2 p-2 text-xs">
      {/* Energy selector */}
      <div className="border border-gray-700 rounded p-2">
        <span className="block font-bold text-red-400 mb-1">DESFIBRILADOR</span>
        <div className="flex items-center gap-2 mb-2">
          <button onClick={decreaseEnergy} className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded font-bold text-lg">◄</button>
          <div className="flex-1 text-center">
            <span className="text-2xl font-bold text-red-400 tabular-nums">{energy}</span>
            <span className="text-red-400 ml-1">J</span>
          </div>
          <button onClick={increaseEnergy} className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded font-bold text-lg">►</button>
        </div>

        {/* Energy quick select */}
        <div className="flex flex-wrap gap-0.5 mb-2">
          {[50, 100, 150, 200, 300, 360].map((e) => (
            <button
              key={e}
              onClick={() => useDefibStore.getState().setEnergy(e)}
              className={`px-1.5 py-0.5 rounded text-[10px] ${energy === e ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {e}J
            </button>
          ))}
        </div>

        {/* Charge progress */}
        {isCharging && (
          <div className="w-full h-1.5 bg-gray-800 rounded mb-2">
            <div
              className="h-full bg-yellow-500 rounded transition-all"
              style={{ width: `${chargeProgress * 100}%` }}
            />
          </div>
        )}

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={handleCharge}
            disabled={isCharging || isCharged}
            className="py-2 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 rounded font-bold"
          >
            ⚡ CARGA
          </button>
          <button
            onClick={handleShock}
            disabled={!isCharged}
            className={`py-2 rounded font-bold ${isCharged ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-red-900 opacity-40'}`}
          >
            ⚡ DESCARGA
          </button>
          <button
            onClick={toggleSync}
            className={`py-1.5 rounded font-bold ${syncMode ? 'bg-green-700' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {syncMode ? 'SYNC ✓' : 'SYNC'}
          </button>
          <button
            onClick={handleDisarm}
            className="py-1.5 bg-gray-700 hover:bg-gray-600 rounded font-bold"
          >
            DESARMAR
          </button>
        </div>

        {/* Shock history */}
        {shockCount > 0 && (
          <div className="mt-2 text-gray-400">
            <span>Descargas: <span className="text-red-400 font-bold">{shockCount}</span></span>
            {lastShock && (
              <span className="ml-2">
                Última: {lastShock.energy}J @{lastShock.timestamp.toLocaleTimeString('es-CL')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Pacer */}
      <div className="border border-gray-700 rounded p-2">
        <span className="block font-bold text-cyan-400 mb-1">MARCAPASOS TRANSCUTÁNEO</span>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Frecuencia</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPacerRate(pacerRate - 10)} className="w-6 h-6 bg-gray-700 rounded text-center">-</button>
              <span className="w-12 text-center font-bold text-cyan-400 tabular-nums">{pacerRate}</span>
              <button onClick={() => setPacerRate(pacerRate + 10)} className="w-6 h-6 bg-gray-700 rounded text-center">+</button>
              <span className="text-gray-500 ml-1">ppm</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>Corriente</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPacerCurrent(pacerCurrent - 5)} className="w-6 h-6 bg-gray-700 rounded text-center">-</button>
              <span className="w-12 text-center font-bold text-cyan-400 tabular-nums">{pacerCurrent}</span>
              <button onClick={() => setPacerCurrent(pacerCurrent + 5)} className="w-6 h-6 bg-gray-700 rounded text-center">+</button>
              <span className="text-gray-500 ml-1">mA</span>
            </div>
          </div>

          <button
            onClick={handleTogglePacer}
            className={`w-full py-2 rounded font-bold ${pacerOn ? 'bg-cyan-700 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {pacerOn ? '⏹ PACER OFF' : '▶ PACER ON'}
          </button>

          {pacerOn && (
            <div className={`text-center font-bold ${pacerCapture ? 'text-green-400' : 'text-red-400'}`}>
              {pacerCapture ? '✓ CAPTURA' : '✗ SIN CAPTURA'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
