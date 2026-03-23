import { useRef, useCallback } from 'react';
import WaveformCanvas from './WaveformCanvas';
import { useVitalSignsStore } from '../../stores/vitalSignsStore';
import { useDefibStore } from '../../stores/defibStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { RhythmEngine } from '../../engine/rhythms/RhythmEngine';

export default function ECGWaveform() {
  const engineRef = useRef(new RhythmEngine());
  const lastRhythmRef = useRef(useVitalSignsStore.getState().rhythm);

  const sampleFn = useCallback((time: number) => {
    const state = useVitalSignsStore.getState();
    const defibState = useDefibStore.getState();
    const settingsState = useSettingsStore.getState();

    // Update rhythm if changed
    if (state.rhythm !== lastRhythmRef.current) {
      engineRef.current.setRhythm(state.rhythm);
      lastRhythmRef.current = state.rhythm;
    }

    return engineRef.current.sample(
      time,
      state.vitals.hr,
      state.vitals.cprActive,
      settingsState.cprMetronomeRate,
      defibState.pacerOn,
      defibState.pacerRate,
      defibState.pacerCapture,
    );
  }, []);

  const { isPaused, visibleParams, vitals } = useVitalSignsStore();
  const { waveformSpeed } = useSettingsStore();
  const syncMode = useDefibStore((s) => s.syncMode);

  // Convert mm/s to pixels/s (approximate: 1mm ≈ 3.78px at 96dpi)
  const pxPerSec = waveformSpeed * 3.78;

  return (
    <WaveformCanvas
      color="#00ffc8"
      lineWidth={2}
      sampleFn={sampleFn}
      sweepSpeed={pxPerSec}
      paused={isPaused}
      visible={visibleParams.ecgWave}
      amplitude={0.85}
      verticalOffset={0.15}
      label="II"
      labelColor="#00ffc8"
      showSyncMarkers={syncMode}
      syncHR={vitals.hr}
    />
  );
}
