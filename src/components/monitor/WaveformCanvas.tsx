import { useRef, useEffect, useCallback } from 'react';

interface WaveformCanvasProps {
  color: string;
  lineWidth?: number;
  sampleFn: (time: number) => number;
  sweepSpeed?: number;
  paused?: boolean;
  visible?: boolean;
  amplitude?: number;
  className?: string;
  label?: string;
  labelColor?: string;
  showSyncMarkers?: boolean;
  syncHR?: number;
  /** Vertical offset as fraction of height (0 = center, positive = down) */
  verticalOffset?: number;
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
  showSyncMarkers = false,
  syncHR = 0,
  verticalOffset = 0,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const writeXRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const bufferRef = useRef<Float32Array | null>(null);
  const valBufferRef = useRef<Float32Array | null>(null);

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
      valBufferRef.current = null;
    }

    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
      lastTimeRef.current = timestamp;
    }

    // Clear canvas immediately when not visible (even if paused)
    if (!visible) {
      ctx.clearRect(0, 0, w, h);
      writeXRef.current = 0;
      bufferRef.current = null;
      valBufferRef.current = null;
      animRef.current = requestAnimationFrame(draw);
      return;
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
    const bufLen = Math.ceil(w) + 1;

    if (!bufferRef.current) {
      bufferRef.current = new Float32Array(bufLen);
    }
    if (!valBufferRef.current) {
      valBufferRef.current = new Float32Array(bufLen);
      valBufferRef.current.fill(-1);
    }

    const startX = writeXRef.current;

    ctx.clearRect(startX, 0, pixelsToAdvance + gapWidth + 2, h);

    if (visible) {
      const midY = h / 2 + h * verticalOffset;
      const scale = (h / 2) * 0.8 * amplitude;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();

      const steps = Math.max(1, Math.ceil(pixelsToAdvance));

      for (let i = 0; i <= steps; i++) {
        const x = startX + (i / steps) * pixelsToAdvance;
        const t = elapsed - (steps - i) / sweepSpeed;
        const value = sampleFn(t);
        const y = midY - value * scale;

        if (i === 0) {
          const prevY = bufferRef.current[Math.floor(startX) % bufLen];
          ctx.moveTo(startX, prevY || midY);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        const bufIdx = Math.floor(x) % bufLen;
        bufferRef.current[bufIdx] = y;
        valBufferRef.current[bufIdx] = value;
      }

      ctx.stroke();

      // Invalidate gap area
      for (let g = 0; g < gapWidth + 3; g++) {
        const gIdx = Math.floor(startX + pixelsToAdvance + g) % bufLen;
        valBufferRef.current[gIdx] = -1;
      }

      // ===== SYNC MARKERS: draw ▼ on every R-wave peak =====
      if (showSyncMarkers && syncHR > 0 && valBufferRef.current) {
        const wInt = Math.floor(w);
        const beatPeriodPx = (60 / syncHR) * sweepSpeed;
        const searchWindow = Math.min(Math.floor(beatPeriodPx * 0.25), 25);
        const screenTimeSec = w / sweepSpeed;
        const beatPeriod = 60 / syncHR;
        const numBeats = Math.ceil(screenTimeSec / beatPeriod) + 2;
        const currentBeat = Math.floor(elapsed / beatPeriod);
        const writePos = writeXRef.current + pixelsToAdvance;

        ctx.fillStyle = '#00ffff';

        for (let b = 0; b < numBeats; b++) {
          const beatNum = currentBeat - b;
          if (beatNum < 0) break;

          const rTime = beatNum * beatPeriod + beatPeriod * 0.32;
          const timeSinceR = elapsed - rTime;
          if (timeSinceR < 0 || timeSinceR > screenTimeSec) continue;

          let expectedX = writePos - timeSinceR * sweepSpeed;
          while (expectedX < 0) expectedX += w;
          while (expectedX >= w) expectedX -= w;

          // Skip if too close to the sweep gap
          const distToGap = Math.abs(expectedX - writePos);
          const distToGapWrapped = Math.min(distToGap, w - distToGap);
          if (distToGapWrapped < gapWidth + 5) continue;

          // Find peak in window around expected position
          let bestVal = -Infinity;
          let bestX = Math.floor(expectedX);
          let bestY = midY;

          for (let dx = -searchWindow; dx <= searchWindow; dx++) {
            let px = Math.floor(expectedX) + dx;
            if (px < 0) px += wInt;
            if (px >= wInt) px -= wInt;

            const val = valBufferRef.current[px];
            if (val > bestVal && val >= 0) {
              bestVal = val;
              bestX = px;
              bestY = bufferRef.current[px];
            }
          }

          // Draw triangle at fixed height (aligned row at top of canvas)
          if (bestVal > 0.1) {
            const sz = 6;
            const fixedY = 22; // fixed height from top
            ctx.beginPath();
            ctx.moveTo(bestX, fixedY + sz);      // tip pointing down
            ctx.lineTo(bestX - sz, fixedY - sz);  // top-left
            ctx.lineTo(bestX + sz, fixedY - sz);  // top-right
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      if (label) {
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillStyle = labelColor ?? color;
        ctx.globalAlpha = 0.7;
        ctx.fillText(label, 4, 14);
        ctx.globalAlpha = 1;
      }
    }

    // Advance write position
    const newWriteX = writeXRef.current + pixelsToAdvance;
    writeXRef.current = newWriteX >= w ? newWriteX - w : newWriteX;

    animRef.current = requestAnimationFrame(draw);
  }, [color, lineWidth, sampleFn, sweepSpeed, paused, visible, amplitude, label, labelColor, showSyncMarkers, syncHR, verticalOffset]);

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
