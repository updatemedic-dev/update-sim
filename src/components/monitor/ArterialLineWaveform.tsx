import { useCallback } from 'react';
import WaveformCanvas from './WaveformCanvas';
import { useVitalSignsStore } from '../../stores/vitalSignsStore';
import { useSettingsStore } from '../../stores/settingsStore';

function generateArterialSample(
  time: number,
  hr: number,
  systolic: number,
  diastolic: number,
  hasPulse: boolean,
): number {
  if (!hasPulse || hr <= 0 || systolic <= 0) return 0;

  const beatPeriod = 60 / hr;
  const phase = (time % beatPeriod) / beatPeriod;

  // Normalize pressure to roughly 0-1
  const pressureRange = systolic - diastolic;
  const baseLevel = diastolic / 200;

  let value = baseLevel;

  if (phase < 0.1) {
    // Rapid systolic upstroke
    const t = phase / 0.1;
    value = baseLevel + (pressureRange / 200) * Math.sin(t * Math.PI / 2);
  } else if (phase < 0.2) {
    // Systolic peak
    const t = (phase - 0.1) / 0.1;
    value = baseLevel + (pressureRange / 200) * (1 - 0.15 * t);
  } else if (phase < 0.3) {
    // Dicrotic notch
    const t = (phase - 0.2) / 0.1;
    const notchDepth = 0.15;
    value = baseLevel + (pressureRange / 200) * (0.85 - notchDepth * Math.sin(t * Math.PI));
  } else {
    // Diastolic runoff (exponential decay)
    const t = (phase - 0.3) / 0.7;
    value = baseLevel + (pressureRange / 200) * 0.75 * Math.exp(-3 * t);
  }

  // Add respiratory variation
  const respVariation = 0.02 * Math.sin(2 * Math.PI * time / 4);
  value += respVariation;

  return value * 0.8;
}

export default function ArterialLineWaveform() {
  const sampleFn = useCallback((time: number) => {
    const s = useVitalSignsStore.getState();
    return generateArterialSample(
      time,
      s.vitals.hr,
      s.vitals.systolic,
      s.vitals.diastolic,
      s.vitals.hasPulse,
    );
  }, []);

  const { isPaused, visibleParams } = useVitalSignsStore();
  const { waveformSpeed } = useSettingsStore();
  const pxPerSec = waveformSpeed * 3.78;

  return (
    <WaveformCanvas
      color="#ff0000"
      lineWidth={1.5}
      sampleFn={sampleFn}
      sweepSpeed={pxPerSec}
      paused={isPaused}
      visible={visibleParams.arterialWave}
      amplitude={0.7}
      label="ABP"
      labelColor="#ff0000"
    />
  );
}
