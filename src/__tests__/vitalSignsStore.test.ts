import { describe, it, expect, beforeEach } from 'vitest';
import { useVitalSignsStore } from '../stores/vitalSignsStore';
import { CardiacRhythm } from '../types/rhythms';
import { DEFAULT_VITALS } from '../types/vitals';

describe('VitalSignsStore', () => {
  beforeEach(() => {
    useVitalSignsStore.getState().reset();
  });

  describe('Estado inicial', () => {
    it('inicia con vitales por defecto', () => {
      const { vitals } = useVitalSignsStore.getState();
      expect(vitals.hr).toBe(DEFAULT_VITALS.hr);
      expect(vitals.systolic).toBe(DEFAULT_VITALS.systolic);
      expect(vitals.diastolic).toBe(DEFAULT_VITALS.diastolic);
      expect(vitals.spo2).toBe(DEFAULT_VITALS.spo2);
      expect(vitals.etco2).toBe(DEFAULT_VITALS.etco2);
      expect(vitals.temperature).toBe(DEFAULT_VITALS.temperature);
      expect(vitals.hasPulse).toBe(true);
    });

    it('inicia con ritmo sinusal normal', () => {
      expect(useVitalSignsStore.getState().rhythm).toBe(CardiacRhythm.NORMAL_SINUS);
    });

    it('inicia sin pausa y sin stop', () => {
      const state = useVitalSignsStore.getState();
      expect(state.isPaused).toBe(false);
      expect(state.isStopped).toBe(false);
    });

    it('todos los parametros visibles por defecto', () => {
      const { visibleParams } = useVitalSignsStore.getState();
      expect(visibleParams.hr).toBe(true);
      expect(visibleParams.bp).toBe(true);
      expect(visibleParams.spo2).toBe(true);
      expect(visibleParams.etco2).toBe(true);
      expect(visibleParams.ecgWave).toBe(true);
    });
  });

  describe('Modificacion de vitales', () => {
    it('setVital cambia un vital individual', () => {
      useVitalSignsStore.getState().setVital('hr', 120);
      expect(useVitalSignsStore.getState().vitals.hr).toBe(120);
    });

    it('setVitals cambia multiples vitales', () => {
      useVitalSignsStore.getState().setVitals({ hr: 150, spo2: 88, systolic: 90 });
      const { vitals } = useVitalSignsStore.getState();
      expect(vitals.hr).toBe(150);
      expect(vitals.spo2).toBe(88);
      expect(vitals.systolic).toBe(90);
    });

    it('setVitals no afecta vitales no especificados', () => {
      useVitalSignsStore.getState().setVitals({ hr: 150 });
      expect(useVitalSignsStore.getState().vitals.temperature).toBe(DEFAULT_VITALS.temperature);
    });
  });

  describe('Cambio de ritmo', () => {
    it('setRhythm cambia el ritmo y guarda el anterior', () => {
      useVitalSignsStore.getState().setRhythm(CardiacRhythm.VENTRICULAR_FIBRILLATION);
      const state = useVitalSignsStore.getState();
      expect(state.rhythm).toBe(CardiacRhythm.VENTRICULAR_FIBRILLATION);
      expect(state.previousRhythm).toBe(CardiacRhythm.NORMAL_SINUS);
    });

    it('setRhythm inicia transicion en 0', () => {
      useVitalSignsStore.getState().setRhythm(CardiacRhythm.ASYSTOLE);
      expect(useVitalSignsStore.getState().rhythmTransitionProgress).toBe(0);
    });

    it('setRhythmTransitionProgress se clampea a max 1', () => {
      useVitalSignsStore.getState().setRhythmTransitionProgress(1.5);
      expect(useVitalSignsStore.getState().rhythmTransitionProgress).toBe(1);
    });
  });

  describe('Visibilidad de parametros', () => {
    it('toggleParamVisibility oculta y muestra', () => {
      useVitalSignsStore.getState().toggleParamVisibility('hr');
      expect(useVitalSignsStore.getState().visibleParams.hr).toBe(false);
      useVitalSignsStore.getState().toggleParamVisibility('hr');
      expect(useVitalSignsStore.getState().visibleParams.hr).toBe(true);
    });

    it('ocultar bp tambien oculta arterialWave', () => {
      useVitalSignsStore.getState().toggleParamVisibility('bp');
      const { visibleParams } = useVitalSignsStore.getState();
      expect(visibleParams.bp).toBe(false);
      expect(visibleParams.arterialWave).toBe(false);
    });

    it('ocultar spo2 tambien oculta spo2Wave', () => {
      useVitalSignsStore.getState().toggleParamVisibility('spo2');
      const { visibleParams } = useVitalSignsStore.getState();
      expect(visibleParams.spo2).toBe(false);
      expect(visibleParams.spo2Wave).toBe(false);
    });

    it('ocultar etco2 tambien oculta capnoWave', () => {
      useVitalSignsStore.getState().toggleParamVisibility('etco2');
      const { visibleParams } = useVitalSignsStore.getState();
      expect(visibleParams.etco2).toBe(false);
      expect(visibleParams.capnoWave).toBe(false);
    });

    it('setAllParamsVisible oculta todo', () => {
      useVitalSignsStore.getState().setAllParamsVisible(false);
      const { visibleParams } = useVitalSignsStore.getState();
      expect(Object.values(visibleParams).every(v => v === false)).toBe(true);
    });
  });

  describe('Control de reproduccion', () => {
    it('togglePause alterna pausa', () => {
      useVitalSignsStore.getState().togglePause();
      expect(useVitalSignsStore.getState().isPaused).toBe(true);
      useVitalSignsStore.getState().togglePause();
      expect(useVitalSignsStore.getState().isPaused).toBe(false);
    });

    it('stop pone vitales en cero', () => {
      useVitalSignsStore.getState().stop();
      const state = useVitalSignsStore.getState();
      expect(state.isStopped).toBe(true);
      expect(state.isPaused).toBe(true);
      expect(state.vitals.hr).toBe(0);
      expect(state.vitals.spo2).toBe(0);
      expect(state.vitals.hasPulse).toBe(false);
    });

    it('stop oculta waveforms pero mantiene numeros', () => {
      useVitalSignsStore.getState().stop();
      const { visibleParams } = useVitalSignsStore.getState();
      expect(visibleParams.hr).toBe(true);
      expect(visibleParams.ecgWave).toBe(false);
      expect(visibleParams.spo2Wave).toBe(false);
    });

    it('play restaura estado normal', () => {
      useVitalSignsStore.getState().stop();
      useVitalSignsStore.getState().play();
      const state = useVitalSignsStore.getState();
      expect(state.isStopped).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.vitals.hr).toBe(DEFAULT_VITALS.hr);
      expect(state.rhythm).toBe(CardiacRhythm.NORMAL_SINUS);
    });
  });

  describe('Reset', () => {
    it('reset restaura valores por defecto', () => {
      useVitalSignsStore.getState().setVitals({ hr: 200, spo2: 50 });
      useVitalSignsStore.getState().setRhythm(CardiacRhythm.ASYSTOLE);
      useVitalSignsStore.getState().reset();

      const state = useVitalSignsStore.getState();
      expect(state.vitals.hr).toBe(DEFAULT_VITALS.hr);
      expect(state.rhythm).toBe(CardiacRhythm.NORMAL_SINUS);
      expect(state.isStopped).toBe(false);
    });
  });
});
