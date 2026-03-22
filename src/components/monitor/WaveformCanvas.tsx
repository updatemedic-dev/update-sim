import { useRef, useEffect, useCallback } from 'react';

interface WaveformCanvasProps {
  color: string;
  lineWidth?: number;
  /** Generate a sample value at the given time. Returns value in range roughly [-1, 1]. */
  sampleFn: (time: number) => number;
  /** Sweep speed in pixels per second */
  sweepSpeed?: number;
  /** Whether the waveform is paused */
  paused?: boolean;
  /** Whether to show this waveform */
  visible?: boolean;
  /** Vertical scale factor */
  amplitude?: number;
  /** CSS class name */
  className?: string;
  /** Label text shown at top-left */
  label?: string;
  /** Label color */
  labelColor?: string;
}

export default function WaveformCanvas({
  color,
  lineWidth = 2,
  sampleFn,
  sweepSpeed = 200,
  paused = false,
  visible = true,
  amplitude = 1,
  className = '',
  label,
  labelColor,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const writeXRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const bufferRef = useRef<Float32Array | null>(null);

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle DPR for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.scale(dpr, dpr);
      writeXRef.current = 0;
      bufferRef.current = null;
    }

    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
      lastTimeRef.current = timestamp;
    }

    if (paused) {
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    const dt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;
    const elapsed = (timestamp - startTimeRef.current) / 1000;

    const pixelsToAdvance = sweepSpeed * dt;
    const gapWidth = 12;

    // Initialize buffer if needed
    if (!bufferRef.current) {
      bufferRef.current = new Float32Array(Math.ceil(w) + 1);
    }

    // Clear the area ahead (sweep effect)
    const startX = writeXRef.current;
    ctx.clearRect(startX, 0, pixelsToAdvance + gapWidth + 2, h);

    // Sample and draw new segment
    if (visible) {
      const midY = h / 2;
      const scale = (h / 2) * 0.8 * amplitude;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();

      const steps = Math.max(1, Math.ceil(pixelsToAdvance));
      const timePerPixel = 1 / sweepSpeed;

      for (let i = 0; i <= steps; i++) {
        const x = startX + (i / steps) * pixelsToAdvance;
        const t = elapsed - (steps - i) * timePerPixel;
        const value = sampleFn(t);
        const y = midY - value * scale;

        if (i === 0) {
          // Connect from last drawn point
          const prevY = bufferRef.current[Math.floor(startX) % bufferRef.current.length];
          ctx.moveTo(startX, prevY || midY);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        // Store in buffer
        const bufIdx = Math.floor(x) % bufferRef.current.length;
        bufferRef.current[bufIdx] = y;
      }

      ctx.stroke();

      // Draw label
      if (label) {
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillStyle = labelColor ?? color;
        ctx.globalAlpha = 0.7;
        ctx.fillText(label, 4, 14);
        ctx.globalAlpha = 1;
      }
    }

    // Advance write position
    writeXRef.current += pixelsToAdvance;
    if (writeXRef.current >= w) {
      writeXRef.current = 0;
    }

    animRef.current = requestAnimationFrame(draw);
  }, [color, lineWidth, sampleFn, sweepSpeed, paused, visible, amplitude, label, labelColor]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: 'block', background: 'transparent' }}
    />
  );
}
