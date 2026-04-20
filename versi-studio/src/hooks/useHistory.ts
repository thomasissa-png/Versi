/**
 * useHistory — Hook générique pour undo/redo
 *
 * Gère un stack d'historique en mémoire (pas persisté en DB).
 * Max 50 opérations dans le stack. Reset à chaque reload.
 *
 * Usage :
 *   const { push, undo, redo, canUndo, canRedo } = useHistory<MyState>();
 *   push(newState); // après chaque action utilisateur
 *   undo();         // Ctrl+Z
 *   redo();         // Ctrl+Shift+Z ou Ctrl+Y
 */

import { useCallback, useRef } from "react";

const MAX_HISTORY = 50;

interface HistoryEntry<T> {
  /** Description optionnelle pour debug */
  label?: string;
  /** Snapshot de l'état au moment du push */
  snapshot: T;
}

interface UseHistoryReturn<T> {
  /** Empiler un nouvel état dans l'historique */
  push: (snapshot: T, label?: string) => void;
  /** Annuler la dernière action — retourne le snapshot précédent ou null si rien à annuler */
  undo: () => T | null;
  /** Refaire la dernière action annulée — retourne le snapshot suivant ou null */
  redo: () => T | null;
  /** true si undo est possible */
  canUndo: boolean;
  /** true si redo est possible */
  canRedo: boolean;
  /** Vider tout l'historique */
  clear: () => void;
}

export function useHistory<T>(): UseHistoryReturn<T> {
  // Stack et curseur en refs pour éviter les re-renders à chaque push
  // Le composant appelant gère son propre state — le hook ne fait que stocker les snapshots.
  const stackRef = useRef<HistoryEntry<T>[]>([]);
  const cursorRef = useRef(-1);
  // Compteur de version pour forcer le re-calcul de canUndo/canRedo
  // Non utilisé directement dans le rendu — les getters sont des fonctions.

  const push = useCallback((snapshot: T, label?: string) => {
    const stack = stackRef.current;
    const cursor = cursorRef.current;

    // Couper le futur si on a fait des undo avant ce push
    if (cursor < stack.length - 1) {
      stackRef.current = stack.slice(0, cursor + 1);
    }

    // Ajouter le nouvel état
    stackRef.current.push({ snapshot, label });

    // Limiter la taille du stack
    if (stackRef.current.length > MAX_HISTORY) {
      stackRef.current = stackRef.current.slice(stackRef.current.length - MAX_HISTORY);
    }

    cursorRef.current = stackRef.current.length - 1;
  }, []);

  const undo = useCallback((): T | null => {
    const cursor = cursorRef.current;
    if (cursor <= 0) return null;

    cursorRef.current = cursor - 1;
    return stackRef.current[cursorRef.current].snapshot;
  }, []);

  const redo = useCallback((): T | null => {
    const stack = stackRef.current;
    const cursor = cursorRef.current;
    if (cursor >= stack.length - 1) return null;

    cursorRef.current = cursor + 1;
    return stack[cursorRef.current].snapshot;
  }, []);

  const clear = useCallback(() => {
    stackRef.current = [];
    cursorRef.current = -1;
  }, []);

  // canUndo/canRedo sont des getters — ils lisent les refs au moment de l'accès.
  // Le composant appelant doit re-render après un push/undo/redo pour les lire.
  // Comme push/undo/redo sont appelés conjointement avec un setState dans le parent,
  // le re-render se fait naturellement.
  return {
    push,
    undo,
    redo,
    get canUndo() {
      return cursorRef.current > 0;
    },
    get canRedo() {
      return cursorRef.current < stackRef.current.length - 1;
    },
    clear,
  };
}
