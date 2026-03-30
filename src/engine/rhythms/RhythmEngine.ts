import { CardiacRhythm } from '../../types/rhythms';
import type { RhythmDefinition } from '../../types/rhythms';
import { RHYTHM_DEFINITIONS } from './rhythmDefinitions';
import {
  generatePWave,
  generateQRS,
  generateTWave,
  generateSTSegment,
  baselineWander,
  noise,
  generateVFib,
  generateVTach,
  generateTorsades,
  generateFlutterBaseline,
  generateAFibBaseline,
  generatePacerSpike,
  generateCPRArtifact,
  interpolate,
} from './waveformGenerators';

interface BeatTiming {
  beatStartTime: number;
  beatDuration: number;
  isPVC: boolean;
  dropBeat: boolean;
  prStretch: number; // for Wenckebach
}

export class RhythmEngine {
  private currentRhythm: CardiacRhythm = CardiacRhythm.NORMAL_SINUS;
  private previousRhythm: CardiacRhythm | null = null;
  private transitionProgress = 1;
  private transitionDuration = 2.5; // seconds
  private transitionStartTime = 0;

  private beatIndex = 0;
  private nextBeatTime = 0;
  private currentBeatDuration = 0;
  private _beatState = { lastPVC: false, wenckebach: 0 };

  // For seeded pseudo-random irregularity
  private irregSeed = 42;

  getDefinition(rhythm?: CardiacRhythm): RhythmDefinition {
    return RHYTHM_DEFINITIONS[rhythm ?? this.currentRhythm];
  }

  setRhythm(rhythm: CardiacRhythm): void {
    if (rhythm === this.currentRhythm) return;
    this.previousRhythm = this.currentRhythm;
    this.currentRhythm = rhythm;
    this.transitionProgress = 0;
    this.transitionStartTime = -1; // will be set on next sample call
    this.beatIndex = 0;
    this._beatState.wenckebach = 0;
  }

  private pseudoRandom(): number {
    this.irregSeed = (this.irregSeed * 16807 + 0) % 2147483647;
    return this.irregSeed / 2147483647;
  }

  private getBeatDuration(hr: number, irregularity: number): number {
    if (hr <= 0) return 2; // for asystole-like rhythms
    const baseDuration = 60 / hr;
    const variation = irregularity * 0.3 * baseDuration * (this.pseudoRandom() - 0.5);
    return Math.max(0.3, baseDuration + variation);
  }

  private getBeatTiming(
    time: number,
    hr: number,
    def: RhythmDefinition,
  ): BeatTiming {
    // Advance to current beat
    while (this.nextBeatTime <= time) {
      this.beatIndex++;
      this.currentBeatDuration = this.getBeatDuration(hr, def.waveformParams.irregularity);
      this.nextBeatTime += this.currentBeatDuration;
      this._beatState.lastPVC = false;
    }

    const beatStart = this.nextBeatTime - this.currentBeatDuration;
    let isPVC = false;
    let dropBeat = false;
    let prStretch = 1;

    const rid = def.id;

    // Determine PVC pattern
    if (rid === CardiacRhythm.SINUS_WITH_PVCS) {
      isPVC = this.beatIndex % 6 === 4;
    } else if (rid === CardiacRhythm.BIGEMINY) {
      isPVC = this.beatIndex % 2 === 1;
    } else if (rid === CardiacRhythm.TRIGEMINY) {
      isPVC = this.beatIndex % 3 === 2;
    } else if (rid === CardiacRhythm.COUPLET_PVCS) {
      const mod = this.beatIndex % 5;
      isPVC = mod === 3 || mod === 4;
    } else if (rid === CardiacRhythm.SINUS_WITH_PACS) {
      // PACs have early narrow beats — just use slightly shortened timing
      if (this.beatIndex % 5 === 3) {
        prStretch = 0.8;
      }
    }

    // Wenckebach pattern: PR progressively lengthens, then drops
    if (rid === CardiacRhythm.SECOND_DEGREE_TYPE_1) {
      const cycle = this.beatIndex % 4;
      this._beatState.wenckebach = cycle;
      if (cycle === 3) {
        dropBeat = true;
      } else {
        prStretch = 1 + cycle * 0.3;
      }
    }

    // Type II: occasional dropped beats
    if (rid === CardiacRhythm.SECOND_DEGREE_TYPE_2) {
      if (this.beatIndex % 3 === 2) {
        dropBeat = true;
      }
    }

    // Sinus exit block: occasional missing beat
    if (rid === CardiacRhythm.SINUS_EXIT_BLOCK) {
      if (this.beatIndex % 5 === 4) {
        dropBeat = true;
      }
    }

    this._beatState.lastPVC = isPVC;

    return {
      beatStartTime: beatStart,
      beatDuration: this.currentBeatDuration,
      isPVC,
      dropBeat,
      prStretch,
    };
  }

  /**
   * Generate a single ECG sample value at the given time.
   * @param time Absolute time in seconds
   * @param hr Current heart rate
   * @param cprActive Whether CPR is active
   * @param cprRate CPR compression rate
   * @param pacerOn Whether transcutaneous pacer is on
   * @param pacerRate Pacer rate in bpm
   * @param pacerCapture Whether pacer has capture
   */
  sample(
    time: number,
    hr: number,
    cprActive = false,
    cprRate = 110,
    pacerOn = false,
    pacerRate = 70,
    pacerCapture = false,
  ): number {
    // Update transition
    if (this.transitionProgress < 1) {
      if (this.transitionStartTime < 0) this.transitionStartTime = time;
      this.transitionProgress = Math.min(1, (time - this.transitionStartTime) / this.transitionDuration);
    }

    const def = this.getDefinition();
    let value: number;

    // Special waveforms that don't use standard PQRST morphology
    // t parameter = normalized phase within cycle, time = absolute for amplitude modulation
    if (def.id === CardiacRhythm.VENTRICULAR_FIBRILLATION) {
      const vfibPeriod = 1 / 4.5;
      value = generateVFib(time % vfibPeriod, time);
    } else if (def.id === CardiacRhythm.TORSADES_DE_POINTES) {
      const torsadesPeriod = 1 / 5;
      value = generateTorsades(time % torsadesPeriod, time);
    } else if (def.id === CardiacRhythm.ASYSTOLE) {
      value = baselineWander(time, 0.01, 0.3) + noise(0.005);
    } else {
      value = this.generateStandardBeat(time, hr, def);
    }

    // Blend with previous rhythm during transition
    if (this.transitionProgress < 1 && this.previousRhythm !== null) {
      const prevDef = this.getDefinition(this.previousRhythm);
      let prevValue: number;
      if (prevDef.id === CardiacRhythm.VENTRICULAR_FIBRILLATION) {
        const vfibPeriod = 1 / 4.5;
        prevValue = generateVFib(time % vfibPeriod, time);
      } else if (prevDef.id === CardiacRhythm.TORSADES_DE_POINTES) {
        const torsadesPeriod = 1 / 5;
        prevValue = generateTorsades(time % torsadesPeriod, time);
      } else if (prevDef.id === CardiacRhythm.ASYSTOLE) {
        prevValue = baselineWander(time, 0.01, 0.3) + noise(0.005);
      } else {
        prevValue = this.generateStandardBeat(time, hr, prevDef);
      }
      value = interpolate(prevValue, value, this.transitionProgress);
    }

    // Add CPR artifact
    if (cprActive) {
      value += generateCPRArtifact(time, cprRate);
    }

    // Add transcutaneous pacer spikes
    if (pacerOn) {
      const pacerPeriod = 60 / pacerRate;
      const pacerPhase = time % pacerPeriod;
      const spike = generatePacerSpike(pacerPhase, 0);
      value += spike;

      // If capture, add a wide QRS after each spike
      if (pacerCapture && pacerPhase < 0.35 && pacerPhase > 0.01) {
        const qrsT = (pacerPhase - 0.01) / 0.34;
        if (qrsT >= 0 && qrsT <= 1) {
          value += generateQRS(
            qrsT, 0.1, 0.02, 0.7, 0.03, 0.25, 0.025, 0.3, 160,
          );
        }
      }
    }

    return value;
  }

  private generateStandardBeat(
    time: number,
    hr: number,
    def: RhythmDefinition,
  ): number {
    const effectiveHR = hr > 0 ? hr : def.defaultHR;
    if (effectiveHR <= 0) return noise(0.005);

    const beat = this.getBeatTiming(time, effectiveHR, def);

    if (beat.dropBeat) {
      // For dropped beats, only show P wave if it exists
      if (def.waveformParams.pWave.present) {
        const t = (time - beat.beatStartTime) / beat.beatDuration;
        if (t >= 0 && t <= 1) {
          return generatePWave(
            t,
            def.waveformParams.pWave.amplitude,
            def.waveformParams.pWave.width,
            0.1,
          ) + noise(def.waveformParams.baselineWander);
        }
      }
      return noise(def.waveformParams.baselineWander);
    }

    const t = (time - beat.beatStartTime) / beat.beatDuration;
    if (t < 0 || t > 1) return noise(def.waveformParams.baselineWander);

    const wp = def.waveformParams;
    let value = 0;

    if (beat.isPVC) {
      // PVC: wide QRS, no P wave, opposite T wave
      value += generateQRS(t, 0.15, 0.025, -0.7, 0.04, 0.2, 0.03, 0.35, 160);
      value += generateTWave(t, 0.35, 0.08, 0.6, true);
    } else {
      // Standard PQRST generation
      const prDurationNorm = (wp.prInterval * beat.prStretch / 1000) / beat.beatDuration;
      const qrsDurationNorm = (wp.qrsWidth / 1000) / beat.beatDuration;

      const pCenter = 0.1;
      const qrsCenter = pCenter + prDurationNorm + qrsDurationNorm / 2;
      const stCenter = qrsCenter + qrsDurationNorm * 0.8;
      const tCenter = stCenter + 0.12;

      // P wave
      if (wp.pWave.present) {
        value += generatePWave(t, wp.pWave.amplitude, wp.pWave.width, pCenter);
      }

      // Flutter baseline
      if (def.id === CardiacRhythm.ATRIAL_FLUTTER) {
        value += generateFlutterBaseline(time, 300 / 60);
      }

      // AFib baseline
      if (def.id === CardiacRhythm.ATRIAL_FIBRILLATION) {
        value += generateAFibBaseline(time, time);
      }

      // QRS
      value += generateQRS(
        t,
        wp.qWave.amplitude, wp.qWave.width,
        wp.rWave.amplitude, wp.rWave.width,
        wp.sWave.amplitude, wp.sWave.width,
        qrsCenter, wp.qrsWidth,
      );

      // WPW delta wave (slurred upstroke before QRS)
      if (def.id === CardiacRhythm.WPW) {
        const deltaCenter = qrsCenter - 0.04;
        value += generatePWave(t, 0.2, 0.025, deltaCenter);
      }

      // ST segment
      if (wp.stSegment.elevation !== 0) {
        value += generateSTSegment(t, wp.stSegment.elevation, stCenter, 0.04);
      }

      // T wave
      value += generateTWave(t, wp.tWave.amplitude, wp.tWave.width, tCenter, wp.tWave.inverted);

      // Paced rhythm spike
      if (def.category === 'paced') {
        if (def.id === CardiacRhythm.PACED_ATRIAL || def.id === CardiacRhythm.PACED_AV_SEQUENTIAL) {
          value += generatePacerSpike(t, pCenter - 0.01);
        }
        if (def.id === CardiacRhythm.PACED_VENTRICULAR || def.id === CardiacRhythm.PACED_AV_SEQUENTIAL) {
          value += generatePacerSpike(t, qrsCenter - 0.01);
        }
      }
    }

    // VTach uses special generator for more realistic look
    if (def.id === CardiacRhythm.VENTRICULAR_TACHYCARDIA) {
      value = generateVTach(t) + noise(0.02);
    }

    // Third degree: add independent P waves at separate rate (~80/min atrial)
    if (def.id === CardiacRhythm.THIRD_DEGREE_AV_BLOCK) {
      const atrialPeriod = 60 / 80;
      const atrialPhase = (time % atrialPeriod) / atrialPeriod;
      value += generatePWave(atrialPhase, 0.12, 0.03, 0.15);
    }

    // Baseline wander and noise
    value += baselineWander(time, wp.baselineWander, 0.15);
    value += noise(0.008);

    return value;
  }
}
