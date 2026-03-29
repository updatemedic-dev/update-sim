import { describe, it, expect, beforeEach } from 'vitest';
import { useDefibStore, ENERGY_LEVELS } from '../stores/defibStore';

describe('DefibStore', () => {
  beforeEach(() => {
    useDefibStore.getState().reset();
  });

  describe('Estado inicial', () => {
    it('inicia con energia 200J', () => {
      expect(useDefibStore.getState().energy).toBe(200);
    });

    it('inicia descargado y sin cargar', () => {
      const state = useDefibStore.getState();
      expect(state.isCharging).toBe(false);
      expect(state.isCharged).toBe(false);
      expect(state.chargeProgress).toBe(0);
    });

    it('inicia con SYNC desactivado', () => {
      expect(useDefibStore.getState().syncMode).toBe(false);
    });

    it('inicia con 0 descargas', () => {
      const state = useDefibStore.getState();
      expect(state.shockCount).toBe(0);
      expect(state.shockHistory).toHaveLength(0);
    });

    it('inicia con marcapaso apagado', () => {
      const state = useDefibStore.getState();
      expect(state.pacerOn).toBe(false);
      expect(state.pacerRate).toBe(40);
      expect(state.pacerCurrent).toBe(0);
      expect(state.pacerCapture).toBe(false);
    });
  });

  describe('Energia', () => {
    it('setEnergy cambia el nivel y desarma', () => {
      useDefibStore.getState().completeCharge();
      useDefibStore.getState().setEnergy(100);
      const state = useDefibStore.getState();
      expect(state.energy).toBe(100);
      expect(state.isCharged).toBe(false);
    });

    it('increaseEnergy sube al siguiente nivel', () => {
      useDefibStore.getState().setEnergy(200);
      useDefibStore.getState().increaseEnergy();
      expect(useDefibStore.getState().energy).toBe(250);
    });

    it('decreaseEnergy baja al nivel anterior', () => {
      useDefibStore.getState().setEnergy(200);
      useDefibStore.getState().decreaseEnergy();
      expect(useDefibStore.getState().energy).toBe(150);
    });

    it('increaseEnergy no sube mas alla de 360J', () => {
      useDefibStore.getState().setEnergy(360);
      useDefibStore.getState().increaseEnergy();
      expect(useDefibStore.getState().energy).toBe(360);
    });

    it('decreaseEnergy no baja menos de 1J', () => {
      useDefibStore.getState().setEnergy(1);
      useDefibStore.getState().decreaseEnergy();
      expect(useDefibStore.getState().energy).toBe(1);
    });

    it('ENERGY_LEVELS tiene 19 niveles de 1 a 360', () => {
      expect(ENERGY_LEVELS).toHaveLength(19);
      expect(ENERGY_LEVELS[0]).toBe(1);
      expect(ENERGY_LEVELS[ENERGY_LEVELS.length - 1]).toBe(360);
    });
  });

  describe('Carga y descarga', () => {
    it('startCharge inicia la carga', () => {
      useDefibStore.getState().startCharge();
      const state = useDefibStore.getState();
      expect(state.isCharging).toBe(true);
      expect(state.chargeProgress).toBe(0);
    });

    it('completeCharge finaliza la carga', () => {
      useDefibStore.getState().startCharge();
      useDefibStore.getState().completeCharge();
      const state = useDefibStore.getState();
      expect(state.isCharging).toBe(false);
      expect(state.isCharged).toBe(true);
      expect(state.chargeProgress).toBe(1);
    });

    it('deliverShock retorna null si no esta cargado', () => {
      const result = useDefibStore.getState().deliverShock();
      expect(result).toBeNull();
    });

    it('deliverShock entrega descarga cuando esta cargado', () => {
      useDefibStore.getState().completeCharge();
      const record = useDefibStore.getState().deliverShock();
      expect(record).not.toBeNull();
      expect(record!.energy).toBe(200);
      expect(record!.synchronized).toBe(false);
    });

    it('deliverShock incrementa shockCount', () => {
      useDefibStore.getState().completeCharge();
      useDefibStore.getState().deliverShock();
      expect(useDefibStore.getState().shockCount).toBe(1);
    });

    it('deliverShock registra en shockHistory', () => {
      useDefibStore.getState().completeCharge();
      useDefibStore.getState().deliverShock();
      expect(useDefibStore.getState().shockHistory).toHaveLength(1);
    });

    it('deliverShock con SYNC marca synchronized=true', () => {
      useDefibStore.getState().toggleSync();
      useDefibStore.getState().completeCharge();
      const record = useDefibStore.getState().deliverShock();
      expect(record!.synchronized).toBe(true);
    });

    it('deliverShock desarma el desfibrilador', () => {
      useDefibStore.getState().completeCharge();
      useDefibStore.getState().deliverShock();
      const state = useDefibStore.getState();
      expect(state.isCharged).toBe(false);
      expect(state.chargeProgress).toBe(0);
    });

    it('disarm desactiva carga', () => {
      useDefibStore.getState().completeCharge();
      useDefibStore.getState().disarm();
      const state = useDefibStore.getState();
      expect(state.isCharged).toBe(false);
      expect(state.isCharging).toBe(false);
    });
  });

  describe('Marcapaso', () => {
    it('togglePacer enciende y apaga', () => {
      useDefibStore.getState().togglePacer();
      expect(useDefibStore.getState().pacerOn).toBe(true);
      useDefibStore.getState().togglePacer();
      expect(useDefibStore.getState().pacerOn).toBe(false);
    });

    it('setPacerRate clampea entre 40 y 180', () => {
      useDefibStore.getState().setPacerRate(200);
      expect(useDefibStore.getState().pacerRate).toBe(180);
      useDefibStore.getState().setPacerRate(10);
      expect(useDefibStore.getState().pacerRate).toBe(40);
      useDefibStore.getState().setPacerRate(80);
      expect(useDefibStore.getState().pacerRate).toBe(80);
    });

    it('setPacerCurrent clampea entre 0 y 200', () => {
      useDefibStore.getState().setPacerCurrent(250);
      expect(useDefibStore.getState().pacerCurrent).toBe(200);
      useDefibStore.getState().setPacerCurrent(-10);
      expect(useDefibStore.getState().pacerCurrent).toBe(0);
    });

    it('captura ocurre cuando corriente >= umbral', () => {
      useDefibStore.getState().setPacerCaptureThreshold(50);
      useDefibStore.getState().setPacerCurrent(60);
      expect(useDefibStore.getState().pacerCapture).toBe(true);
    });

    it('sin captura cuando corriente < umbral', () => {
      useDefibStore.getState().setPacerCaptureThreshold(50);
      useDefibStore.getState().setPacerCurrent(30);
      expect(useDefibStore.getState().pacerCapture).toBe(false);
    });
  });

  describe('Reset', () => {
    it('reset restaura todos los valores iniciales', () => {
      useDefibStore.getState().setEnergy(360);
      useDefibStore.getState().completeCharge();
      useDefibStore.getState().deliverShock();
      useDefibStore.getState().toggleSync();
      useDefibStore.getState().togglePacer();
      useDefibStore.getState().reset();

      const state = useDefibStore.getState();
      expect(state.energy).toBe(200);
      expect(state.isCharged).toBe(false);
      expect(state.shockCount).toBe(0);
      expect(state.syncMode).toBe(false);
      expect(state.pacerOn).toBe(false);
    });
  });
});
