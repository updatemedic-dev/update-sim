import { useRef, useEffect, useCallback } from 'react';

export function useAnimationFrame(callback: (deltaTime: number, elapsed: number) => void) {
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const animate = useCallback((time: number) => {
    if (startTimeRef.current === 0) {
      startTimeRef.current = time;
      previousTimeRef.current = time;
    }
    const deltaTime = (time - previousTimeRef.current) / 1000;
    const elapsed = (time - startTimeRef.current) / 1000;
    previousTimeRef.current = time;

    callback(deltaTime, elapsed);
    requestRef.current = requestAnimationFrame(animate);
  }, [callback]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);
}
