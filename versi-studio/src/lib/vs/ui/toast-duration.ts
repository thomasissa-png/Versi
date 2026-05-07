/**
 * toast-duration — Constante centralisée durée d'affichage toasts (s33 Lot F #F-2)
 *
 * Source : audit @persona Versi Studio s33 — toasts à 5s lus difficilement
 * (lecteurs lents, contexte de saisie, lots multi-pièces). Augmenté à 8s
 * pour confort lecture + temps d'agir sur "Annuler" éventuel.
 *
 * Pattern s30 helper-first : la durée est une constante exportée pour être
 * testable sans monter de jsdom (env "node" Vitest).
 *
 * Toasts couverts par cette constante :
 *  - Étape 3 rooms/page.tsx : `setWarningMessage` (régénération pièces, recalcul disposition)
 *  - Étape 3 rooms/page.tsx : confirm/undo bulk pièces (F-1) + suppression undo (F-3)
 *
 * NON couverts (durées spécifiques par contexte, hors scope F-2) :
 *  - chatToast / chatToastUndo (Lot C) : 3-5s (toast inline rapide, contexte chat)
 *  - skipToast wizard : 3s (action rapide, pas d'undo)
 *  - outsideHint : 2.5s (hint passif, ne nécessite pas lecture longue)
 */

/** Durée par défaut d'affichage des toasts utilisateur (ms). */
export const TOAST_DURATION_MS = 8000;

/** Durée de la fenêtre d'undo pour actions destructives (ms). */
export const UNDO_WINDOW_MS = 8000;
