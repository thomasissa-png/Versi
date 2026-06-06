import { useCallback, useState } from 'react';

export function useFadeIn(threshold = 0) {
  const [isVisible, setIsVisible] = useState(false);

  // Callback ref — fires every time the DOM node is attached/detached,
  // which solves the stale-ref problem when the element mounts after
  // an async loading state.
  const ref = useCallback(
    (node) => {
      if (!node) return;

      const reveal = () => setIsVisible(true);

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced || typeof IntersectionObserver === 'undefined') {
        reveal();
        return;
      }

      // threshold 0 : on révèle dès qu'UN pixel de la section est visible.
      // Indispensable pour les conteneurs plus hauts que le viewport (ex. les
      // dossiers de pré-commercialisation ~8000px) : avec un threshold élevé,
      // le ratio d'intersection plafonne sous le seuil → l'observer ne se
      // déclenche jamais → contenu bloqué à opacity:0 → page « blanche ».
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            reveal();
            observer.unobserve(node);
          }
        },
        { threshold }
      );

      observer.observe(node);

      // Filet de sécurité : quoi qu'il arrive (observer qui ne se déclenche pas,
      // élément hors viewport au montage, navigateur capricieux), on révèle le
      // contenu après un court délai. setIsVisible(true) est idempotent.
      setTimeout(reveal, 800);
    },
    [threshold]
  );

  return { ref, isVisible };
}
