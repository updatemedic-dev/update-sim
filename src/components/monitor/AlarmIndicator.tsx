import { useEffect, useRef, useState, useCallback } from 'react';
import { useVitalSignsStore } from '../../stores/vitalSignsStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { audioEngine } from '../../engine/audio/AudioEngine';
import type { AlarmState, AlarmStatus } from '../../types/vitals';

export function useAlarmStatus(): AlarmStatus {
  const [status, setStatus] = useState<AlarmStatus>({
    hr: 'normal',
    spo2: 'normal',
    etco2: 'normal',
    systolic: 'normal',
    diastolic: 'normal',
    respiratoryRate: 'normal',
    temperature: 'normal',
  });

  const lastAlarmTime = useRef(0);

  const checkAlarms = useCallback(() => {
    const { vitals, alarms } = useVitalSignsStore.getState();
    const settings = useSettingsStore.getState();

    if (settings.alarmsOff) {
      setStatus({
        hr: 'normal',
        spo2: 'normal',
        etco2: 'normal',
        systolic: 'normal',
        diastolic: 'normal',
        respiratoryRate: 'normal',
        temperature: 'normal',
      });
      return;
    }

    const newStatus: AlarmStatus = {
      hr: 'normal',
      spo2: 'normal',
      etco2: 'normal',
      systolic: 'normal',
      diastolic: 'normal',
      respiratoryRate: 'normal',
      temperature: 'normal',
    };

    let highestPriority: AlarmState = 'normal';

    for (const alarm of alarms) {
      if (!alarm.enabled) continue;
      const val = vitals[alarm.parameter];
      if (typeof val !== 'number') continue;

      let state: AlarmState = 'normal';
      if (val > alarm.highLimit || val < alarm.lowLimit) {
        state = alarm.priority;
      }

      newStatus[alarm.parameter] = state;

      if (state === 'high') highestPriority = 'high';
      else if (state === 'medium' && highestPriority !== 'high') highestPriority = 'medium';
      else if (state === 'low' && highestPriority === 'normal') highestPriority = 'low';
    }

    setStatus(newStatus);

    // Play alarm sound if not silenced
    const now = Date.now();
    const isSilenced = settings.alarmsSilenced && now < settings.alarmsSilencedUntil;
    if (highestPriority !== 'normal' && highestPriority !== 'low' && !isSilenced && settings.soundEnabled) {
      if (now - lastAlarmTime.current > 3000) {
        audioEngine.playAlarmTone(highestPriority as 'high' | 'medium');
        lastAlarmTime.current = now;
      }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(checkAlarms, 500);
    return () => clearInterval(interval);
  }, [checkAlarms]);

  return status;
}

export default function AlarmIndicator({ compact: _compact }: { compact?: boolean }) {
  const { alarmsOff, alarmsSilenced, alarmsSilencedUntil } = useSettingsStore();
  const [blinkOn, setBlinkOn] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setBlinkOn((v) => !v), 500);
    return () => clearInterval(interval);
  }, []);

  const isSilenced = alarmsSilenced && Date.now() < alarmsSilencedUntil;

  if (alarmsOff) {
    return (
      <div className="flex items-center gap-1 px-2 text-red-500 text-xs">
        <span>ALARMAS OFF</span>
      </div>
    );
  }

  if (isSilenced) {
    return (
      <div className="flex items-center gap-1 px-2 text-yellow-500 text-xs">
        <span className={blinkOn ? '' : 'opacity-30'}>🔇 SILENCIADA</span>
      </div>
    );
  }

  return null;
}
