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

  const { isPaused, visibleParams } = useVitalSignsStore();
  const { waveformSpeed } = useSettingsStore();

  // Convert mm/s to pixels/s (approximate: 1mm ≈ 3.78px at 96dpi)
  const pxPerSec = waveformSpeed * 3.78;

  return (
    <WaveformCanvas
      color="#00ff00"
      lineWidth={2}
      sampleFn={sampleFn}
      sweepSpeed={pxPerSec}
      paused={isPaused}
      visible={visibleParams.ecgWave}
      amplitude={1}
      label="II"
      labelColor="#00ff00"
    />
  );
}
