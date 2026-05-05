/**
 * Step 4 — Créez vos visuels post-travaux
 *
 * HOTFIX-2 s31 (2026-05-05) : cette route redirige désormais vers la nouvelle
 * UI v2 `/visuals/placement` (canvas plan + photos draggables + worker SSE +
 * AngleController + génération multi-pièces). L'ancienne UI v1 (VisualRoom
 * pièce-par-pièce) est dépréciée et plus accessible — la v2 est la seule UI
 * sur le chemin utilisateur.
 *
 * Root cause HOTFIX-2 : pendant les vagues s30 (commits `227b419`, `cff35e1`,
 * `7a4b26a`), toute la nouvelle UI a été codée+testée (Vitest 107/107,
 * Playwright 18/0/2) MAIS la route active `/visuals` rendait toujours
 * `VisualRoom` v1 → Thomas voyait l'ancienne UI + job synchrone bloqué 10 min
 * (timeout proxy Replit). La couverture de test ne prouvait pas que la
 * feature était sur le chemin utilisateur.
 *
 * Pattern (à propager → @qa, @fullstack, @reviewer) : "tests-verts-pas-livraison".
 *
 * Server Component minimal : redirect() côté serveur, zéro client JS, pas de
 * flash UI v1 avant redirect (vs un Client Component qui chargerait puis
 * router.replace côté client).
 */
import { redirect } from "next/navigation";

export default async function VisualsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  redirect(`/vs/projects/${projectId}/visuals/placement`);
}
