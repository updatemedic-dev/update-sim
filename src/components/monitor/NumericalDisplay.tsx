import { useEffect, useRef, useState } from 'react';
import type { AlarmState } from '../../types/vitals';

interface NumericalDisplayProps {
  label: string;
  value: string | number;
  subValue?: string;
  unit?: string;
  color: string;
  alarm?: AlarmState;
  visible?: boolean;
  size?: 'normal' | 'large';
}

export default function NumericalDisplay({
  label,
  value,
  subValue,
  unit,
  color,
  alarm = 'normal',
  visible = true,
  size = 'normal',
}: NumericalDisplayProps) {
  const [blinkOn, setBlinkOn] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (alarm === 'high') {
      intervalRef.current = setInterval(() => setBlinkOn((v) => !v), 300);
    } else if (alarm === 'medium') {
      intervalRef.current = setInterval(() => setBlinkOn((v) => !v), 600);
    } else {
      setBlinkOn(true);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [alarm]);

  if (!visible) return null;

  const alarmBg =
    alarm === 'high' && blinkOn
      ? 'bg-red-900/60'
      : alarm === 'medium' && blinkOn
        ? 'bg-yellow-900/40'
        : alarm === 'low'
          ? 'bg-cyan-900/20'
          : '';

  const valueSize = size === 'large' ? 'text-5xl' : 'text-4xl';

  return (
    <div className={`flex flex-col items-end justify-center px-2 py-1 ${alarmBg} transition-colors`}>
      <span className="text-xs uppercase tracking-wider opacity-70" style={{ color }}>
        {label}
      </span>
      <span className={`${valueSize} font-bold leading-none tabular-nums`} style={{ color }}>
        {value}
      </span>
      {subValue && (
        <span className="text-sm opacity-80 tabular-nums" style={{ color }}>
          {subValue}
        </span>
      )}
      {unit && (
        <span className="text-xs opacity-50" style={{ color }}>
          {unit}
        </span>
      )}
    </div>
  );
}
