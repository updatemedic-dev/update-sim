import { describe, it, expect, beforeEach } from 'vitest';
import { useCodeTrackStore } from '../stores/codeTrackStore';

describe('CodeTrackStore', () => {
  beforeEach(() => {
    useCodeTrackStore.getState().clear();
  });

  describe('Estado inicial', () => {
    it('inicia sin entries', () => {
      expect(useCodeTrackStore.getState().entries).toHaveLength(0);
    });

    it('inicia sin correr', () => {
      expect(useCodeTrackStore.getState().isRunning).toBe(false);
    });

    it('startTime es null inicialmente', () => {
      expect(useCodeTrackStore.getState().startTime).toBeNull();
    });
  });

  describe('Inicio y detencion', () => {
    it('start activa el tracking', () => {
      useCodeTrackStore.getState().start();
      const state = useCodeTrackStore.getState();
      expect(state.isRunning).toBe(true);
      expect(state.startTime).not.toBeNull();
      expect(state.entries).toHaveLength(0);
    });

    it('stop detiene el tracking', () => {
      useCodeTrackStore.getState().start();
      useCodeTrackStore.getState().stop();
      expect(useCodeTrackStore.getState().isRunning).toBe(false);
    });

    it('clear limpia todo', () => {
      useCodeTrackStore.getState().start();
      useCodeTrackStore.getState().addEntry('medication', 'Epinefrina 1mg');
      useCodeTrackStore.getState().clear();
      const state = useCodeTrackStore.getState();
      expect(state.entries).toHaveLength(0);
      expect(state.isRunning).toBe(false);
      expect(state.startTime).toBeNull();
    });
  });

  describe('Agregar entradas', () => {
    beforeEach(() => {
      useCodeTrackStore.getState().start();
    });

    it('addEntry agrega una entrada', () => {
      useCodeTrackStore.getState().addEntry('medication', 'Epinefrina 1mg IV');
      const entries = useCodeTrackStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('medication');
      expect(entries[0].description).toBe('Epinefrina 1mg IV');
    });

    it('addEntry genera IDs unicos', () => {
      useCodeTrackStore.getState().addEntry('medication', 'Med 1');
      useCodeTrackStore.getState().addEntry('shock', 'Descarga 200J');
      const entries = useCodeTrackStore.getState().entries;
      expect(entries[0].id).not.toBe(entries[1].id);
    });

    it('addEntry incluye timestamp', () => {
      useCodeTrackStore.getState().addEntry('cpr_start', 'RCP iniciada');
      const entry = useCodeTrackStore.getState().entries[0];
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it('addEntry calcula elapsed seconds', () => {
      useCodeTrackStore.getState().addEntry('rhythm_change', 'FV');
      const entry = useCodeTrackStore.getState().entries[0];
      expect(entry.elapsedSeconds).toBeGreaterThanOrEqual(0);
    });

    it('addEntry no agrega si no esta corriendo', () => {
      useCodeTrackStore.getState().stop();
      useCodeTrackStore.getState().addEntry('medication', 'Test');
      expect(useCodeTrackStore.getState().entries).toHaveLength(0);
    });

    it('multiples entries se acumulan en orden', () => {
      useCodeTrackStore.getState().addEntry('scenario_start', 'Inicio');
      useCodeTrackStore.getState().addEntry('medication', 'Epinefrina');
      useCodeTrackStore.getState().addEntry('shock', 'Descarga 200J');
      useCodeTrackStore.getState().addEntry('cpr_start', 'RCP');
      const entries = useCodeTrackStore.getState().entries;
      expect(entries).toHaveLength(4);
      expect(entries[0].type).toBe('scenario_start');
      expect(entries[3].type).toBe('cpr_start');
    });
  });

  describe('Elapsed time', () => {
    it('getElapsedSeconds retorna 0 sin start', () => {
      expect(useCodeTrackStore.getState().getElapsedSeconds()).toBe(0);
    });

    it('getElapsedSeconds retorna >= 0 despues de start', () => {
      useCodeTrackStore.getState().start();
      expect(useCodeTrackStore.getState().getElapsedSeconds()).toBeGreaterThanOrEqual(0);
    });
  });
});
