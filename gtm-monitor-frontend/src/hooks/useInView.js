import { useState, useEffect, useRef } from 'react';

/**
 * useInView hook
 * Observes an element and returns whether it is currently visible in the viewport.
 * 
 * @param {object} options
 * @param {number} [options.threshold=0.15] - Percentage of target visible before triggering
 * @param {string} [options.rootMargin='-40px 0px'] - Margin around the root
 * @param {boolean} [options.triggerOnce=true] - Only trigger once or continuously track
 * @returns {[React.RefObject, boolean]} [ref, isInView]
 */
export function useInView({
  threshold = 0.15,
  rootMargin = '-20px 0px',
  triggerOnce = true
} = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isInView];
}

export default useInView;
