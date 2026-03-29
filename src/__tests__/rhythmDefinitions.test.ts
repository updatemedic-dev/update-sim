import { describe, it, expect } from 'vitest';
import { CardiacRhythm } from '../types/rhythms';
import { RHYTHM_DEFINITIONS } from '../engine/rhythms/rhythmDefinitions';

describe('RhythmDefinitions', () => {
  const allRhythms = Object.values(CardiacRhythm);

  describe('Completitud', () => {
    it('tiene definicion para cada CardiacRhythm enum', () => {
      for (const rhythm of allRhythms) {
        expect(RHYTHM_DEFINITIONS).toHaveProperty(rhythm);
      }
    });

    it('tiene 38 ritmos definidos', () => {
      expect(Object.keys(RHYTHM_DEFINITIONS).length).toBe(38);
    });
  });

  describe('Estructura de cada ritmo', () => {
    for (const rhythm of allRhythms) {
      describe(`${rhythm}`, () => {
        const def = RHYTHM_DEFINITIONS[rhythm];

        it('tiene nameEs (nombre en espanol)', () => {
          expect(def.nameEs).toBeDefined();
          expect(typeof def.nameEs).toBe('string');
          expect(def.nameEs.length).toBeGreaterThan(0);
        });

        it('tiene defaultHR numerico', () => {
          expect(typeof def.defaultHR).toBe('number');
          expect(def.defaultHR).toBeGreaterThanOrEqual(0);
          expect(def.defaultHR).toBeLessThanOrEqual(300);
        });

        it('tiene hasPulse booleano', () => {
          expect(typeof def.hasPulse).toBe('boolean');
        });

        it('tiene physiologicalDefaults completos', () => {
          const pd = def.physiologicalDefaults;
          expect(pd).toBeDefined();
          expect(typeof pd.systolicBP).toBe('number');
          expect(typeof pd.diastolicBP).toBe('number');
          expect(typeof pd.spo2).toBe('number');
          expect(typeof pd.etco2).toBe('number');
          expect(typeof pd.respiratoryRate).toBe('number');
        });

        it('SpO2 esta en rango 0-100', () => {
          expect(def.physiologicalDefaults.spo2).toBeGreaterThanOrEqual(0);
          expect(def.physiologicalDefaults.spo2).toBeLessThanOrEqual(100);
        });

        it('presion sistolica >= diastolica', () => {
          expect(def.physiologicalDefaults.systolicBP).toBeGreaterThanOrEqual(
            def.physiologicalDefaults.diastolicBP
          );
        });
      });
    }
  });

  describe('Ritmos sin pulso', () => {
    const pulseless = [
      CardiacRhythm.VENTRICULAR_FIBRILLATION,
      CardiacRhythm.ASYSTOLE,
    ];

    for (const rhythm of pulseless) {
      it(`${rhythm} no tiene pulso`, () => {
        expect(RHYTHM_DEFINITIONS[rhythm].hasPulse).toBe(false);
      });
    }
  });

  describe('Ritmos con pulso', () => {
    const withPulse = [
      CardiacRhythm.NORMAL_SINUS,
      CardiacRhythm.SINUS_BRADYCARDIA,
      CardiacRhythm.SINUS_TACHYCARDIA,
      CardiacRhythm.SVT,
      CardiacRhythm.ATRIAL_FIBRILLATION,
    ];

    for (const rhythm of withPulse) {
      it(`${rhythm} tiene pulso`, () => {
        expect(RHYTHM_DEFINITIONS[rhythm].hasPulse).toBe(true);
      });
    }
  });

  describe('Valores fisiologicos coherentes', () => {
    it('ritmo sinusal normal tiene vitales normales', () => {
      const def = RHYTHM_DEFINITIONS[CardiacRhythm.NORMAL_SINUS];
      expect(def.defaultHR).toBeGreaterThanOrEqual(60);
      expect(def.defaultHR).toBeLessThanOrEqual(100);
      expect(def.physiologicalDefaults.spo2).toBeGreaterThanOrEqual(95);
      expect(def.physiologicalDefaults.systolicBP).toBeGreaterThanOrEqual(100);
    });

    it('bradicardia tiene FC < 60', () => {
      expect(RHYTHM_DEFINITIONS[CardiacRhythm.SINUS_BRADYCARDIA].defaultHR).toBeLessThan(60);
    });

    it('taquicardia tiene FC > 100', () => {
      expect(RHYTHM_DEFINITIONS[CardiacRhythm.SINUS_TACHYCARDIA].defaultHR).toBeGreaterThan(100);
    });

    it('asistolia tiene FC = 0', () => {
      expect(RHYTHM_DEFINITIONS[CardiacRhythm.ASYSTOLE].defaultHR).toBe(0);
    });

    it('SVT tiene FC elevada', () => {
      expect(RHYTHM_DEFINITIONS[CardiacRhythm.SVT].defaultHR).toBeGreaterThan(140);
    });
  });
});
