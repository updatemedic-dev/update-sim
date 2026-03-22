interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  color?: string;
  unit?: string;
  onChange: (value: number) => void;
}

export default function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  color = '#ffffff',
  unit = '',
  onChange,
}: SliderProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-xs">
        <span className="opacity-70">{label}</span>
        <span className="font-bold tabular-nums" style={{ color }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-800 rounded-sm appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-sm
          [&::-webkit-slider-thumb]:cursor-pointer"
        style={{
          accentColor: color,
        }}
      />
    </div>
  );
}
