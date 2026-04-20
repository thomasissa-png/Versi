import { useCallback, useState } from 'react';

export function useFadeIn(threshold = 0.15) {
  const [isVisible, setIsVisible] = useState(false);

  // Callback ref — fires every time the DOM node is attached/detached,
  // which solves the stale-ref problem when the element mounts after
  // an async loading state.
  const ref = useCallback(
    (node) => {
      if (!node) return;

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        setIsVisible(true);
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(node);
          }
        },
        { threshold }
      );

      observer.observe(node);
    },
    [threshold]
  );

  return { ref, isVisible };
}
