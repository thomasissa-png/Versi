/**
 * viewport-storage — Persistance du zoom/pan canvas entre étapes (s25 BUG 3).
 *
 * L'étape 2 (PlanCanvas) et l'étape 3 (RoomCanvas) sont deux pages distinctes.
 * Chacune gérait un viewport local (INITIAL_VIEWPORT à { scale: 1, offsetX: 0 })
 * → Thomas zoomait sur un lot en Étape 2, passait à Étape 3 et retrouvait un
 * cadrage différent. Fix : partager viewport via sessionStorage par projet.
 *
 * Scope : sessionStorage (pas localStorage) — le zoom est contextuel à la
 * session de travail, pas une préférence durable.
 */

export interface StoredViewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

function key(projectId: string): string {
  return `vs:viewport:${projectId}`;
}

export function saveViewport(
  projectId: string,
  viewport: StoredViewport
): void {
  if (typeof window === "undefined") return;
  if (!projectId) return;
  try {
    window.sessionStorage.setItem(key(projectId), JSON.stringify(viewport));
  } catch {
    // Quota ou mode privé — silencieux, le fallback (viewport local) reste OK.
  }
}

export function loadViewport(projectId: string): StoredViewport | null {
  if (typeof window === "undefined") return null;
  if (!projectId) return null;
  try {
    const raw = window.sessionStorage.getItem(key(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredViewport>;
    if (
      typeof parsed.scale !== "number" ||
      typeof parsed.offsetX !== "number" ||
      typeof parsed.offsetY !== "number"
    ) {
      return null;
    }
    // Garde-fou : scale doit rester dans [0.5, 20] pour éviter les valeurs corrompues.
    if (parsed.scale < 0.5 || parsed.scale > 20) return null;
    return {
      scale: parsed.scale,
      offsetX: parsed.offsetX,
      offsetY: parsed.offsetY,
    };
  } catch {
    return null;
  }
}

export function clearViewport(projectId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key(projectId));
  } catch {
    // noop
  }
}
