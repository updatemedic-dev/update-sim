import { useCallback } from 'react';
import WaveformCanvas from './WaveformCanvas';
import { useVitalSignsStore } from '../../stores/vitalSignsStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { CapnographyWaveform as CapnoType } from '../../types/rhythms';

function generateCapnoSample(time: number, rr: number, etco2: number, waveform: CapnoType): number {
  if (rr <= 0) return 0;
  if (waveform === CapnoType.APNEA || waveform === CapnoType.DISCONNECTION) return 0;
  if (waveform === CapnoType.ESOPHAGEAL_INTUBATION) {
    // Minimal or no waveform
    const breathPeriod = 60 / Math.max(rr, 6);
    const phase = (time % breathPeriod) / breathPeriod;
    return phase < 0.2 ? 0.02 * Math.sin(phase / 0.2 * Math.PI) : 0;
  }

  const breathPeriod = 60 / rr;
  const phase = (time % breathPeriod) / breathPeriod;
  const normalizedCO2 = etco2 / 50; // Normalize to roughly 0-1 scale

  let value = 0;

  // Standard capnogram phases:
  // Phase I (0-0.1): inspiratory baseline (near zero)
  // Phase II (0.1-0.2): rapid rise
  // Phase III (0.2-0.5): alveolar plateau
  // Phase IV (0.5-0.55): rapid descent
  // Rest: inspiratory baseline

  if (phase < 0.08) {
    // Phase I: baseline
    value = 0;
    if (waveform === CapnoType.REBREATHING) {
      value = 0.15 * normalizedCO2; // Elevated baseline
    }
  } else if (phase < 0.18) {
    // Phase II: upstroke
    const t = (phase - 0.08) / 0.1;
    value = normalizedCO2 * Math.pow(t, waveform === CapnoType.OBSTRUCTION ? 0.3 : 1.5);
  } else if (phase < 0.48) {
    // Phase III: plateau
    const t = (phase - 0.18) / 0.3;
    value = normalizedCO2;

    if (waveform === CapnoType.BRONCHOSPASM || waveform === CapnoType.COPD) {
      // Shark fin: ascending slope
      value = normalizedCO2 * (0.7 + 0.3 * t);
    } else if (waveform === CapnoType.CURARE_CLEFT) {
      // Cleft in the plateau
      value = normalizedCO2 * (1 - 0.3 * Math.sin(t * Math.PI));
    } else if (waveform === CapnoType.CARDIOGENIC_OSCILLATIONS) {
      value = normalizedCO2 * (1 + 0.05 * Math.sin(t * 12 * Math.PI));
    } else if (waveform === CapnoType.AIR_LEAK) {
      value = normalizedCO2 * (1 - 0.2 * t);
    }
  } else if (phase < 0.55) {
    // Phase IV: downstroke
    const t = (phase - 0.48) / 0.07;
    value = normalizedCO2 * (1 - Math.pow(t, 1.5));
  } else {
    value = 0;
    if (waveform === CapnoType.REBREATHING) {
      value = 0.15 * normalizedCO2;
    }
  }

  // Adjust for special waveforms
  if (waveform === CapnoType.HYPERVENTILATION) {
    value *= 0.6;
  } else if (waveform === CapnoType.HYPOVENTILATION) {
    value *= 1.3;
  } else if (waveform === CapnoType.MH_CRISIS) {
    value *= 1.5;
  } else if (waveform === CapnoType.CARDIAC_ARREST || waveform === CapnoType.POOR_CPR) {
    value *= 0.2;
  } else if (waveform === CapnoType.GOOD_CPR) {
    value *= 0.4;
  }

  return Math.max(0, value) * 0.5;
}

export default function CapnographyWaveformComponent() {
  const sampleFn = useCallback((time: number) => {
    const s = useVitalSignsStore.getState();
    return generateCapnoSample(
      time,
      s.vitals.respiratoryRate,
      s.vitals.etco2,
      s.capnographyWaveform,
    );
  }, []);

  const { isPaused, visibleParams } = useVitalSignsStore();
  const { waveformSpeed } = useSettingsStore();
  const pxPerSec = waveformSpeed * 3.78;

  return (
    <WaveformCanvas
      color="#ffff00"
      lineWidth={1.5}
      sampleFn={sampleFn}
      sweepSpeed={pxPerSec}
      paused={isPaused}
      visible={visibleParams.capnoWave}
      amplitude={0.8}
      label="CO₂"
      labelColor="#ffff00"
    />
  );
}
