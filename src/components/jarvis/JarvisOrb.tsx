import { useJarvisStore } from '../../stores/jarvisStore';

export default function JarvisOrb() {
  const { isOpen, state, toggle } = useJarvisStore();

  const stateColors: Record<string, string> = {
    idle: '#00d4ff',
    listening: '#00ff88',
    thinking: '#ffaa00',
    speaking: '#00d4ff',
    alert: '#ff4444',
  };

  const color = stateColors[state] || '#00d4ff';
  const isAlert = state === 'alert';

  return (
    <button
      onClick={toggle}
      className="jarvis-orb-btn group"
      title="J.A.R.V.I.S."
      aria-label="Toggle Jarvis Assistant"
    >
      {/* Outer glow ring */}
      <div
        className={`jarvis-orb-ring ${isAlert ? 'jarvis-orb-ring-alert' : ''}`}
        style={{
          '--orb-color': color,
          boxShadow: `0 0 20px ${color}40, 0 0 40px ${color}20`,
          borderColor: `${color}80`,
        } as React.CSSProperties}
      />

      {/* Inner orb */}
      <div
        className="jarvis-orb-inner"
        style={{
          '--orb-color': color,
          background: `radial-gradient(circle at 35% 35%, ${color}dd, ${color}44 60%, transparent 70%)`,
          boxShadow: `0 0 15px ${color}66, inset 0 0 10px ${color}33`,
        } as React.CSSProperties}
      >
        {/* Arc reactor center */}
        <div
          className="jarvis-orb-core"
          style={{
            background: `radial-gradient(circle, #ffffff, ${color})`,
            boxShadow: `0 0 8px ${color}, 0 0 16px ${color}88`,
          }}
        />

        {/* Rotating arcs */}
        <svg className="jarvis-orb-arcs" viewBox="0 0 48 48">
          <circle
            cx="24" cy="24" r="18"
            fill="none"
            stroke={color}
            strokeWidth="1"
            strokeDasharray="8 20"
            opacity="0.6"
            className="jarvis-arc-1"
          />
          <circle
            cx="24" cy="24" r="14"
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            strokeDasharray="6 16"
            opacity="0.4"
            className="jarvis-arc-2"
          />
        </svg>
      </div>

      {/* Status indicator */}
      {!isOpen && (
        <div
          className="jarvis-orb-status"
          style={{ backgroundColor: color }}
        />
      )}
    </button>
  );
}
