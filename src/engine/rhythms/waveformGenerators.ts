/**
 * Mathematical waveform generators for ECG components.
 * All functions operate on normalized time (0-1) within a single cardiac cycle.
 */

/** Gaussian function: amplitude * exp(-((t - center)^2) / (2 * width^2)) */
export function gaussian(t: number, amplitude: number, center: number, width: number): number {
  const exponent = -((t - center) ** 2) / (2 * width ** 2);
  return amplitude * Math.exp(exponent);
}

/** Generate P wave */
export function generatePWave(t: number, amplitude: number, width: number, center: number): number {
  return gaussian(t, amplitude, center, width);
}

/** Generate QRS complex: Q dip + R peak + S dip */
export function generateQRS(
  t: number,
  qAmp: number, qWidth: number,
  rAmp: number, rWidth: number,
  sAmp: number, sWidth: number,
  center: number,
  qrsWidthMs: number,
): number {
  const qrsSpread = qrsWidthMs / 1000;
  const qCenter = center - qrsSpread * 0.3;
  const rCenter = center;
  const sCenter = center + qrsSpread * 0.3;

  const q = gaussian(t, -Math.abs(qAmp), qCenter, qWidth);
  const r = gaussian(t, rAmp, rCenter, rWidth);
  const s = gaussian(t, -Math.abs(sAmp), sCenter, sWidth);

  return q + r + s;
}

/** Generate T wave */
export function generateTWave(
  t: number,
  amplitude: number,
  width: number,
  center: number,
  inverted: boolean,
): number {
  const amp = inverted ? -Math.abs(amplitude) : amplitude;
  return gaussian(t, amp, center, width);
}

/** Generate ST segment elevation/depression as a smooth bump */
export function generateSTSegment(
  t: number,
  elevation: number,
  center: number,
  width: number,
): number {
  return gaussian(t, elevation, center, width);
}

/** Baseline wander using low-frequency sine */
export function baselineWander(t: number, amplitude: number, frequency: number): number {
  return amplitude * Math.sin(2 * Math.PI * frequency * t);
}

/** High-frequency noise */
export function noise(amplitude: number): number {
  return (Math.random() - 0.5) * 2 * amplitude;
}

/** Generate ventricular fibrillation waveform — chaotic sinusoidal mix */
export function generateVFib(t: number, time: number): number {
  const amp = 0.3 + 0.2 * Math.sin(time * 0.5);
  return (
    amp * Math.sin(2 * Math.PI * 4.5 * t + time * 2.1) * 0.5 +
    amp * Math.sin(2 * Math.PI * 6.3 * t + time * 3.7) * 0.3 +
    amp * Math.sin(2 * Math.PI * 8.1 * t + time * 1.3) * 0.2 +
    noise(0.05)
  );
}

/** Generate ventricular tachycardia — wide, regular, sinusoidal-ish */
export function generateVTach(t: number): number {
  const cycle = t % 1;
  const qrs = gaussian(cycle, 0.8, 0.2, 0.08) + gaussian(cycle, -0.4, 0.35, 0.06);
  const tWave = gaussian(cycle, -0.3, 0.6, 0.1);
  return qrs + tWave + noise(0.02);
}

/** Generate Torsades de Pointes — sinusoidal with varying amplitude */
export function generateTorsades(t: number, time: number): number {
  const modulationFreq = 0.15;
  const amplitude = 0.3 + 0.5 * Math.abs(Math.sin(2 * Math.PI * modulationFreq * time));
  return amplitude * Math.sin(2 * Math.PI * 5 * t + time * 1.5) + noise(0.02);
}

/** Generate atrial flutter sawtooth baseline */
export function generateFlutterBaseline(t: number, flutterRate: number): number {
  const flutterPeriod = 1 / flutterRate;
  const phase = (t % flutterPeriod) / flutterPeriod;
  // Sawtooth-like flutter wave
  return 0.15 * (phase < 0.7 ? -phase / 0.7 : (phase - 0.7) / 0.3 - 1);
}

/** Generate atrial fibrillation irregular baseline */
export function generateAFibBaseline(t: number, time: number): number {
  return (
    0.03 * Math.sin(2 * Math.PI * 6.7 * t + time) +
    0.02 * Math.sin(2 * Math.PI * 8.3 * t + time * 1.5) +
    0.015 * Math.sin(2 * Math.PI * 11.1 * t + time * 0.7) +
    noise(0.01)
  );
}

/** Generate pacer spike */
export function generatePacerSpike(t: number, center: number): number {
  const dist = Math.abs(t - center);
  if (dist < 0.003) {
    return 0.9 * (1 - dist / 0.003);
  }
  return 0;
}

/** Interpolate between two waveform values for smooth transitions */
export function interpolate(from: number, to: number, progress: number): number {
  // Smooth step (ease in/out)
  const t = progress * progress * (3 - 2 * progress);
  return from + (to - from) * t;
}

/** Generate CPR artifact overlay */
export function generateCPRArtifact(t: number, cprRate: number): number {
  const cprPeriodSec = 60 / cprRate;
  const phase = (t % cprPeriodSec) / cprPeriodSec;
  return 0.15 * Math.sin(2 * Math.PI * phase) + noise(0.03);
}
