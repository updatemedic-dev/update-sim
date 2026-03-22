import { useSettingsStore } from '../../stores/settingsStore';
import { audioEngine } from '../../engine/audio/AudioEngine';

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useSettingsStore();

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#111] border border-gray-700 rounded-lg p-4 w-80 max-h-[80vh] overflow-y-auto text-xs text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-sm">Configuración</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">✕</button>
        </div>

        <div className="space-y-3">
          {/* Language */}
          <div className="flex justify-between items-center">
            <span>Idioma</span>
            <select
              value={settings.language}
              onChange={(e) => settings.set('language', e.target.value as 'es' | 'en')}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Waveform speed */}
          <div className="flex justify-between items-center">
            <span>Velocidad de barrido</span>
            <select
              value={settings.waveformSpeed}
              onChange={(e) => settings.set('waveformSpeed', Number(e.target.value) as 12.5 | 25 | 50)}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
            >
              <option value={12.5}>12.5 mm/s</option>
              <option value={25}>25 mm/s</option>
              <option value={50}>50 mm/s</option>
            </select>
          </div>

          {/* Sound */}
          <div className="flex justify-between items-center">
            <span>Sonido</span>
            <button
              onClick={() => settings.set('soundEnabled', !settings.soundEnabled)}
              className={`px-3 py-1 rounded ${settings.soundEnabled ? 'bg-green-700' : 'bg-gray-700'}`}
            >
              {settings.soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Beep volume */}
          <div>
            <span className="block mb-1">Volumen beep: {settings.beepVolume}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.beepVolume}
              onChange={(e) => {
                settings.set('beepVolume', Number(e.target.value));
                audioEngine.setBeepVolume(Number(e.target.value));
              }}
              className="w-full"
            />
          </div>

          {/* Alarm volume */}
          <div>
            <span className="block mb-1">Volumen alarmas: {settings.alarmVolume}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.alarmVolume}
              onChange={(e) => {
                settings.set('alarmVolume', Number(e.target.value));
                audioEngine.setAlarmVolume(Number(e.target.value));
              }}
              className="w-full"
            />
          </div>

          {/* Energy type */}
          <div className="flex justify-between items-center">
            <span>Tipo energía</span>
            <select
              value={settings.energyType}
              onChange={(e) => settings.set('energyType', e.target.value as 'biphasic' | 'monophasic')}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
            >
              <option value="biphasic">Bifásica</option>
              <option value="monophasic">Monofásica</option>
            </select>
          </div>

          {/* CPR ratio */}
          <div className="flex justify-between items-center">
            <span>Ratio RCP</span>
            <select
              value={settings.cprRatio}
              onChange={(e) => settings.set('cprRatio', e.target.value as '30:2' | '15:2' | 'continuous')}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
            >
              <option value="30:2">30:2</option>
              <option value="15:2">15:2</option>
              <option value="continuous">Continuas</option>
            </select>
          </div>

          {/* CPR metronome rate */}
          <div className="flex justify-between items-center">
            <span>Metrónomo RCP</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={100}
                max={120}
                value={settings.cprMetronomeRate}
                onChange={(e) => settings.set('cprMetronomeRate', Number(e.target.value))}
                className="w-14 bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-center"
              />
              <span>bpm</span>
            </div>
          </div>

          {/* Temperature unit */}
          <div className="flex justify-between items-center">
            <span>Temperatura</span>
            <select
              value={settings.temperatureUnit}
              onChange={(e) => settings.set('temperatureUnit', e.target.value as 'celsius' | 'fahrenheit')}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
            >
              <option value="celsius">°C</option>
              <option value="fahrenheit">°F</option>
            </select>
          </div>

          {/* Wake lock */}
          <div className="flex justify-between items-center">
            <span>Mantener pantalla activa</span>
            <button
              onClick={() => settings.set('wakeLockEnabled', !settings.wakeLockEnabled)}
              className={`px-3 py-1 rounded ${settings.wakeLockEnabled ? 'bg-green-700' : 'bg-gray-700'}`}
            >
              {settings.wakeLockEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Alarm controls */}
          <div className="border-t border-gray-700 pt-2">
            <span className="font-bold text-red-400 block mb-1">ALARMAS</span>
            <div className="flex gap-1">
              <button
                onClick={() => settings.silenceAlarms()}
                className="flex-1 py-1 bg-yellow-800 hover:bg-yellow-700 rounded"
              >
                Silenciar 2min
              </button>
              <button
                onClick={() => settings.toggleAlarmsOff()}
                className={`flex-1 py-1 rounded ${settings.alarmsOff ? 'bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {settings.alarmsOff ? 'Alarmas OFF' : 'Desactivar'}
              </button>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 pt-2 border-t border-gray-800 text-[9px] text-gray-600 text-center">
          UPDATE SIM es un simulador para entrenamiento médico.<br />
          NO es un dispositivo médico.<br />
          Update Medic — updatemedic.cl
        </div>
      </div>
    </div>
  );
}
