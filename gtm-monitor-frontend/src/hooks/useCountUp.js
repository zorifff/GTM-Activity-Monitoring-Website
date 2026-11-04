import { useState, useEffect, useRef } from 'react';

/**
 * useCountUp hook
 * Animates a numeric value from current displayed value to targetValue
 * Uses cubic ease-out: 1 - Math.pow(1 - progress, 3)
 *
 * @param {number} targetValue - Target number to count up/down to
 * @param {object} options
 * @param {boolean} [options.enabled=true] - Only start animation when enabled is true
 * @param {number} [options.duration=800] - Duration in ms
 * @param {number} [options.decimals=0] - Decimal places
 * @param {number} [options.delay=0] - Delay in ms before starting
 * @param {boolean} [options.formatThousands=true] - Format with id-ID thousand separator
 * @returns {string} Formatted display value
 */
export function useCountUp(targetValue = 0, {
  enabled = true,
  duration = 800,
  decimals = 0,
  delay = 0,
  formatThousands = true
} = {}) {
  const [displayValue, setDisplayValue] = useState(0);
  const currentValRef = useRef(0);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const endVal = Number(targetValue) || 0;
    const startVal = currentValRef.current;

    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    const startTime = performance.now() + delay;

    const animate = (currentTime) => {
      if (currentTime < startTime) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(Math.max(elapsed / duration, 0), 1);
      // Natural cubic ease-out
      const easeProgress = 1 - Math.pow(1 - rawProgress, 3);
      const currentVal = startVal + (endVal - startVal) * easeProgress;

      currentValRef.current = currentVal;
      setDisplayValue(currentVal);

      if (rawProgress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        currentValRef.current = endVal;
        setDisplayValue(endVal);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [targetValue, duration, delay, enabled]);

  const numVal = Number(displayValue) || 0;

  if (decimals > 0) {
    const factor = Math.pow(10, decimals);
    const rounded = Math.round(numVal * factor) / factor;
    return rounded.toFixed(decimals);
  }

  const roundedInt = Math.round(numVal);
  if (formatThousands) {
    return roundedInt.toLocaleString('id-ID');
  }
  return String(roundedInt);
}
