import { describe, it, expect, beforeEach } from 'vitest';
import { useScenarioStore } from '../stores/scenarioStore';

describe('ScenarioStore', () => {
  beforeEach(() => {
    useScenarioStore.getState().reset();
  });

  describe('Estado inicial', () => {
    it('tiene escenarios cargados', () => {
      expect(useScenarioStore.getState().scenarios.length).toBeGreaterThan(0);
    });

    it('no tiene escenario activo', () => {
      expect(useScenarioStore.getState().activeScenario).toBeNull();
    });

    it('currentStepIndex inicia en 0', () => {
      expect(useScenarioStore.getState().currentStepIndex).toBe(0);
    });
  });

  describe('Carga de escenarios', () => {
    it('loadScenario carga un escenario por ID', () => {
      useScenarioStore.getState().loadScenario('acls-1');
      const state = useScenarioStore.getState();
      expect(state.activeScenario).not.toBeNull();
      expect(state.activeScenario!.id).toBe('acls-1');
      expect(state.currentStepIndex).toBe(0);
    });

    it('loadScenario con ID invalido deja null', () => {
      useScenarioStore.getState().loadScenario('id-inexistente');
      expect(useScenarioStore.getState().activeScenario).toBeNull();
    });

    it('loadScenario resetea el step index', () => {
      useScenarioStore.getState().loadScenario('acls-1');
      useScenarioStore.getState().nextStep();
      useScenarioStore.getState().loadScenario('acls-1');
      expect(useScenarioStore.getState().currentStepIndex).toBe(0);
    });
  });

  describe('Navegacion de pasos', () => {
    beforeEach(() => {
      useScenarioStore.getState().loadScenario('acls-1');
    });

    it('nextStep avanza al siguiente paso', () => {
      const step = useScenarioStore.getState().nextStep();
      expect(step).not.toBeNull();
      expect(useScenarioStore.getState().currentStepIndex).toBe(1);
    });

    it('nextStep no avanza mas alla del ultimo paso', () => {
      const scenario = useScenarioStore.getState().activeScenario!;
      for (let i = 0; i < scenario.steps.length + 5; i++) {
        useScenarioStore.getState().nextStep();
      }
      expect(useScenarioStore.getState().currentStepIndex).toBe(scenario.steps.length - 1);
    });

    it('previousStep retrocede', () => {
      useScenarioStore.getState().nextStep();
      useScenarioStore.getState().nextStep();
      useScenarioStore.getState().previousStep();
      expect(useScenarioStore.getState().currentStepIndex).toBe(1);
    });

    it('previousStep no retrocede mas alla del paso 0', () => {
      useScenarioStore.getState().previousStep();
      useScenarioStore.getState().previousStep();
      expect(useScenarioStore.getState().currentStepIndex).toBe(0);
    });

    it('getCurrentStep retorna el paso actual', () => {
      const step = useScenarioStore.getState().getCurrentStep();
      expect(step).not.toBeNull();
      expect(step).toHaveProperty('rhythm');
      expect(step).toHaveProperty('hr');
      expect(step).toHaveProperty('condition');
    });

    it('nextStep/previousStep retornan null sin escenario activo', () => {
      useScenarioStore.getState().reset();
      expect(useScenarioStore.getState().nextStep()).toBeNull();
      expect(useScenarioStore.getState().previousStep()).toBeNull();
    });

    it('isLastStep detecta el ultimo paso', () => {
      const scenario = useScenarioStore.getState().activeScenario!;
      for (let i = 0; i < scenario.steps.length; i++) {
        useScenarioStore.getState().nextStep();
      }
      expect(useScenarioStore.getState().isLastStep()).toBe(true);
    });
  });

  describe('Control de ejecucion', () => {
    it('start marca isRunning true', () => {
      useScenarioStore.getState().start();
      expect(useScenarioStore.getState().isRunning).toBe(true);
    });

    it('stop marca isRunning false', () => {
      useScenarioStore.getState().start();
      useScenarioStore.getState().stop();
      expect(useScenarioStore.getState().isRunning).toBe(false);
    });

    it('reset limpia todo', () => {
      useScenarioStore.getState().loadScenario('acls-1');
      useScenarioStore.getState().start();
      useScenarioStore.getState().reset();
      const state = useScenarioStore.getState();
      expect(state.activeScenario).toBeNull();
      expect(state.currentStepIndex).toBe(0);
      expect(state.isRunning).toBe(false);
    });
  });
});
