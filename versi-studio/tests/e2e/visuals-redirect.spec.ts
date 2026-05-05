/**
 * Test de non-régression — Redirect /visuals → /visuals/placement (HOTFIX-2 s31)
 *
 * Contexte : pendant les vagues s30 (commits `227b419`, `cff35e1`, `7a4b26a`),
 * toute la nouvelle UI Étape 4 v2 (canvas plan + photos draggables + worker SSE +
 * AngleController + génération multi-pièces) a été codée et testée :
 *   - Vitest 107/107
 *   - Playwright 18/0/2
 *
 * MAIS la route active `/vs/projects/[id]/visuals` rendait toujours la v1
 * (`VisualRoom` pièce-par-pièce) — Thomas voyait l'ancienne UI + job synchrone
 * bloqué 10 min (timeout proxy Replit). La couverture de test ne prouvait PAS
 * que la feature était sur le chemin utilisateur. Régression "tests-verts-pas-livraison".
 *
 * Fix HOTFIX-2 (commits `735761b` + `3ddf0df` sur `claude/add-sanity-check-IpyM0`) :
 * `versi-studio/src/app/vs/projects/[id]/visuals/page.tsx` est devenu un Server
 * Component qui `redirect()` vers `/visuals/placement`. La v1 n'est plus sur le
 * chemin utilisateur.
 *
 * Ce test garantit qu'on ne pourra PLUS livrer une UI sans qu'elle soit sur le
 * chemin utilisateur :
 *   1. Visite `/vs/projects/[id]/visuals`
 *   2. Vérifie URL finale = `…/visuals/placement` (le redirect a eu lieu)
 *   3. Vérifie que le canvas v2 est rendu (testid `visual-plan-canvas`)
 *   4. Vérifie que les marqueurs spécifiques v1 NE sont PAS rendus
 *      (texte "Sélectionnez une pièce pour générer son visuel post-travaux")
 *
 * Si demain quelqu'un re-câble `/visuals` vers la v1 (ou supprime le redirect),
 * ce test FAIL — la couche de garde au-dessus des tests unit/composant qui ne
 * couvrent pas le routing.
 */

import { test, expect } from "@playwright/test";
import { setupVisualsStepV2 } from "./helpers/setupProject";
import { blockExternalOpenAI } from "./helpers/mockOpenAI";
import { PROJECT_ID } from "./fixtures";

const VISUALS_URL = `/vs/projects/${PROJECT_ID}/visuals`;
const PLACEMENT_PATH = `/vs/projects/${PROJECT_ID}/visuals/placement`;

test.describe("HOTFIX-2 s31 — Non-régression redirect /visuals → /visuals/placement", () => {
  test.beforeEach(async ({ page }) => {
    await blockExternalOpenAI(page);
    await setupVisualsStepV2(page);
  });

  test("REGRESSION: /visuals redirige vers /visuals/placement et rend la nouvelle UI v2 — fixé HOTFIX-2 s31", async ({
    page,
  }) => {
    // 1. Visite de l'ancienne route active.
    await page.goto(VISUALS_URL);

    // 2. Le redirect Server Component doit avoir lieu : URL finale contient
    //    `/visuals/placement`. waitForURL gère la latence du redirect serveur.
    await page.waitForURL(`**${PLACEMENT_PATH}`, { timeout: 10_000 });
    expect(page.url()).toContain("/visuals/placement");

    // 3. La nouvelle UI v2 (VisualPlacementView) doit être rendue : on cible
    //    le testid `visual-plan-canvas` qui est exclusivement présent dans la
    //    v2 (cf. visuals-step-v2-placement.spec.ts ligne 60).
    const canvas = page.getByTestId("visual-plan-canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    // 4. Marqueurs spécifiques v1 absents — la v1 (`VisualRoom`) affichait
    //    "Sélectionnez une pièce pour générer son visuel post-travaux" comme
    //    état vide initial. Si ce texte apparaît, c'est que /visuals rend
    //    encore la v1 (régression critique HOTFIX-2).
    await expect(
      page.getByText("Sélectionnez une pièce pour générer son visuel post-travaux")
    ).toHaveCount(0);

    // 5. Marqueur positif v2 — l'en-tête "Placez vos photos sur le plan"
    //    est exclusivement présent dans la v2 (placement/page.tsx ligne 227).
    await expect(
      page.getByRole("heading", { name: /Placez vos photos sur le plan/i })
    ).toBeVisible();
  });
});
