/**
 * refine-timing — Helpers purs pour le timing du dialog "Affiner" (s33 issue #5).
 *
 * Pattern helper-first (s30 règle) : la logique de bascule
 * "génération en cours" → "ça prend plus de temps" → "abandon UI" est extraite
 * dans des fonctions pures pour être testée sans jsdom.
 *
 * Le composant React `RefineVisualDialog` consomme ces helpers et reste
 * une coquille de rendu.
 *
 * Calibration s33 :
 *  - Timeout total UI : 240 s (gpt-image-2 + cold start Replit autoscale + queue)
 *  - Warning intermédiaire : 90 s (≈ médiane gpt-image-2 nominale)
 *  - Polling : 4 s (cohérent avec useVisualsStream parent)
 *
 * Sources : audit `docs/ux/s33-audit-ui-etape4-issues-prod.md` §4-5,
 * préférences fondateur (zéro anglicisme, mot pivot métier non technique).
 */

/** Timeout total côté UI avant message non bloquant (4 min). */
export const REFINE_POLL_MAX_DURATION_MS = 240_000;

/** Seuil intermédiaire à partir duquel on affiche un warning d'attente. */
export const REFINE_LONG_WAIT_THRESHOLD_MS = 90_000;

/** Intervalle entre 2 polls de status. */
export const REFINE_POLL_INTERVAL_MS = 4_000;

/** Limite max instruction utilisateur (chars). */
export const REFINE_MAX_INSTRUCTION_LENGTH = 500;

/**
 * Phase de progression du dialog Affiner.
 *
 *  - 'idle'             : avant soumission
 *  - 'generating'       : 0 → 90 s, message standard "comptez environ 30 s"
 *  - 'long-wait'        : 90 → 240 s, warning "ça prend plus de temps que prévu"
 *  - 'background'       : > 240 s, message non bloquant + bouton fermer
 *  - 'success'          : visuel reçu (status 'generated' ou 'validated')
 *  - 'failed'           : status 'failed' explicite serveur
 */
export type RefinePhase =
  | "idle"
  | "generating"
  | "long-wait"
  | "background"
  | "success"
  | "failed";

/**
 * Calcule la phase du dialog en fonction du temps écoulé depuis la soumission.
 * Pure : ne dépend que des inputs, aucun side effect.
 *
 * @param elapsedMs Millisecondes écoulées depuis le `startedAt` du poll.
 * @returns 'generating' | 'long-wait' | 'background' (les états success/failed
 *   sont décidés par le serveur, pas par le timing).
 */
export function computeRefinePhase(elapsedMs: number): "generating" | "long-wait" | "background" {
  if (elapsedMs >= REFINE_POLL_MAX_DURATION_MS) return "background";
  if (elapsedMs >= REFINE_LONG_WAIT_THRESHOLD_MS) return "long-wait";
  return "generating";
}

/**
 * Indique si le poll doit s'arrêter (timeout UI atteint).
 * Le polling parent (`useVisualsStream`) prend le relais.
 */
export function shouldStopPolling(elapsedMs: number): boolean {
  return elapsedMs >= REFINE_POLL_MAX_DURATION_MS;
}

/**
 * Messages copy associés aux phases (zéro anglicisme — préférence fondateur).
 *
 * Validation copy G33 :
 *  - "génération" : OK (mot français standard)
 *  - "patientez" : OK (impératif fr)
 *  - "galerie" : OK (mot pivot métier)
 *  - PAS de "loading", "spinner", "timeout", "retry"
 */
export const REFINE_COPY = {
  /** Phase 'generating' (0-90 s). */
  generating:
    "Génération en cours — comptez environ 30 secondes. Ne fermez pas cette fenêtre.",
  /** Phase 'long-wait' (90-240 s) — non bloquant, ton rassurant. */
  longWait:
    "La génération prend un peu plus de temps que d'habitude — patientez encore une minute.",
  /** Phase 'background' (> 240 s) — UI rend la main, polling parent prend le relais. */
  background:
    "La génération prend plus de temps que prévu — votre visuel apparaîtra dans la galerie dès qu'il sera prêt.",
  /** Action bouton phase 'background'. */
  backgroundCta: "Voir la galerie",
} as const;

/**
 * État résultant : faut-il clearer le `error` quand un `success` arrive
 * via le polling parent (SSE) APRÈS qu'on ait basculé en phase 'background' ?
 *
 * Réponse : OUI. Si le visuel raffiné arrive via la stream parent alors que
 * le dialog avait basculé en 'background', on doit notifier `onRefined`
 * et fermer proprement (pas laisser un message d'erreur figé).
 *
 * Cette fonction est utilisée par le composant pour décider, à chaque update
 * du `pendingVisualId` reçu en prop (ou via callback), s'il faut clear l'état.
 */
export function shouldClearErrorOnSuccess(
  currentPhase: RefinePhase,
  newStatus: "processing" | "generated" | "validated" | "failed",
): boolean {
  if (newStatus !== "generated" && newStatus !== "validated") return false;
  // On clear l'erreur dans tous les cas où le succès arrive (même tardif)
  return currentPhase === "background" || currentPhase === "long-wait" || currentPhase === "failed";
}
