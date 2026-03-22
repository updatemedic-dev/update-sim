import { useCallback } from 'react';
import WaveformCanvas from './WaveformCanvas';
import { useVitalSignsStore } from '../../stores/vitalSignsStore';
import { useSettingsStore } from '../../stores/settingsStore';

function generatePlethSample(time: number, hr: number, spo2: number, hasPulse: boolean): number {
  if (!hasPulse || hr <= 0 || spo2 < 40) return 0;

  const beatPeriod = 60 / hr;
  const phase = (time % beatPeriod) / beatPeriod;

  // Plethysmograph: systolic rise + dicrotic notch + diastolic decay
  const perfusion = Math.max(0.1, (spo2 - 60) / 40);
  let value = 0;

  if (phase < 0.15) {
    // Systolic upstroke
    value = Math.sin((phase / 0.15) * Math.PI / 2);
  } else if (phase < 0.25) {
    // Systolic peak to dicrotic notch
    const t = (phase - 0.15) / 0.1;
    value = 1 - t * 0.3;
  } else if (phase < 0.3) {
    // Dicrotic notch
    const t = (phase - 0.25) / 0.05;
    value = 0.7 - 0.1 * Math.sin(t * Math.PI);
  } else {
    // Diastolic decay
    const t = (phase - 0.3) / 0.7;
    value = 0.65 * Math.exp(-3 * t);
  }

  return value * perfusion * 0.6;
}

export default function SpO2Waveform() {
  const sampleFn = useCallback((time: number) => {
    const s = useVitalSignsStore.getState();
    return generatePlethSample(time, s.vitals.hr, s.vitals.spo2, s.vitals.hasPulse);
  }, []);

  const { isPaused, visibleParams } = useVitalSignsStore();
  const { waveformSpeed } = useSettingsStore();
  const pxPerSec = waveformSpeed * 3.78;

  return (
    <WaveformCanvas
      color="#00ffff"
      lineWidth={1.5}
      sampleFn={sampleFn}
      sweepSpeed={pxPerSec}
      paused={isPaused}
      visible={visibleParams.spo2Wave}
      amplitude={0.8}
      label="Pleth"
      labelColor="#00ffff"
    />
  );
}
