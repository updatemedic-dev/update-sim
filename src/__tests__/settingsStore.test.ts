import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../stores/settingsStore';

describe('SettingsStore', () => {
  beforeEach(() => {
    // Reset store to defaults
    const store = useSettingsStore.getState();
    store.set('language', 'es');
    store.set('waveformSpeed', 25);
    store.set('soundEnabled', true);
    store.set('alarmVolume', 70);
    store.set('beepVolume', 50);
    store.set('temperatureUnit', 'celsius');
    store.set('energyType', 'biphasic');
    store.set('cprRatio', '30:2');
    store.set('cprMetronomeRate', 110);
    store.set('wakeLockEnabled', true);
    store.set('keyboardShortcutsEnabled', true);
  });

  describe('Estado inicial', () => {
    it('idioma por defecto es espanol', () => {
      expect(useSettingsStore.getState().language).toBe('es');
    });

    it('velocidad de barrido por defecto es 25', () => {
      expect(useSettingsStore.getState().waveformSpeed).toBe(25);
    });

    it('sonido habilitado por defecto', () => {
      expect(useSettingsStore.getState().soundEnabled).toBe(true);
    });

    it('alarmas no silenciadas por defecto', () => {
      const state = useSettingsStore.getState();
      expect(state.alarmsSilenced).toBe(false);
      expect(state.alarmsOff).toBe(false);
    });
  });

  describe('Modificacion de settings', () => {
    it('set cambia idioma', () => {
      useSettingsStore.getState().set('language', 'en');
      expect(useSettingsStore.getState().language).toBe('en');
    });

    it('set cambia velocidad de barrido', () => {
      useSettingsStore.getState().set('waveformSpeed', 50);
      expect(useSettingsStore.getState().waveformSpeed).toBe(50);
    });

    it('set cambia volumen de beep', () => {
      useSettingsStore.getState().set('beepVolume', 80);
      expect(useSettingsStore.getState().beepVolume).toBe(80);
    });

    it('set cambia tipo de energia', () => {
      useSettingsStore.getState().set('energyType', 'monophasic');
      expect(useSettingsStore.getState().energyType).toBe('monophasic');
    });

    it('set cambia ratio CPR', () => {
      useSettingsStore.getState().set('cprRatio', '15:2');
      expect(useSettingsStore.getState().cprRatio).toBe('15:2');
    });

    it('set cambia unidad de temperatura', () => {
      useSettingsStore.getState().set('temperatureUnit', 'fahrenheit');
      expect(useSettingsStore.getState().temperatureUnit).toBe('fahrenheit');
    });
  });

  describe('Alarmas', () => {
    it('silenceAlarms activa silencio', () => {
      useSettingsStore.getState().silenceAlarms();
      const state = useSettingsStore.getState();
      expect(state.alarmsSilenced).toBe(true);
      expect(state.alarmsSilencedUntil).toBeGreaterThan(Date.now());
    });

    it('silenceAlarms usa duracion personalizada', () => {
      const before = Date.now();
      useSettingsStore.getState().silenceAlarms(60000);
      const state = useSettingsStore.getState();
      expect(state.alarmsSilencedUntil).toBeGreaterThanOrEqual(before + 60000);
      expect(state.alarmsSilencedUntil).toBeLessThanOrEqual(before + 60100);
    });

    it('toggleAlarmsOff alterna estado', () => {
      useSettingsStore.getState().toggleAlarmsOff();
      expect(useSettingsStore.getState().alarmsOff).toBe(true);
      useSettingsStore.getState().toggleAlarmsOff();
      expect(useSettingsStore.getState().alarmsOff).toBe(false);
    });
  });

  describe('Persistencia localStorage', () => {
    it('set persiste en localStorage', () => {
      useSettingsStore.getState().set('language', 'en');
      const stored = JSON.parse(localStorage.getItem('update-sim-settings') || '{}');
      expect(stored.language).toBe('en');
    });

    it('persiste solo las keys definidas', () => {
      useSettingsStore.getState().set('language', 'en');
      const stored = JSON.parse(localStorage.getItem('update-sim-settings') || '{}');
      // alarmsOff no se persiste
      expect(stored).not.toHaveProperty('alarmsOff');
      expect(stored).not.toHaveProperty('alarmsSilenced');
    });

    it('persiste multiples cambios', () => {
      useSettingsStore.getState().set('language', 'en');
      useSettingsStore.getState().set('beepVolume', 30);
      useSettingsStore.getState().set('waveformSpeed', 50);
      const stored = JSON.parse(localStorage.getItem('update-sim-settings') || '{}');
      expect(stored.language).toBe('en');
      expect(stored.beepVolume).toBe(30);
      expect(stored.waveformSpeed).toBe(50);
    });
  });
});
