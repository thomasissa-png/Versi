/**
 * Test de non-régression — DELETE plan persiste au reload (Retour 1 s22, P1)
 *
 * Contexte : commit 56c56d7 (fix(vs): plan DELETE ne persiste pas au reload).
 * Cause racine : fetch GET sans cache: 'no-store' côté client + Route Handlers
 * Next.js 15 sans `export const dynamic = 'force-dynamic'`. Un plan supprimé
 * pouvait réapparaître après reload à cause du HTTP cache navigateur.
 *
 * Stratégie :
 *   - Scénario 1 : supprimer le 1er plan → reload → 1 seul plan affiché
 *   - Scénario 2 : supprimer le dernier plan → reload → liste vide (état vide)
 *
 * Le mock route.fulfill simule un backend qui applique réellement le DELETE :
 * après DELETE, le prochain GET /plans doit retourner la liste amputée.
 * Playwright exécute les requêtes mockées en bypassant le HTTP cache réel,
 * mais on vérifie que le fetch déclenché au reload reçoit bien la liste
 * mise à jour (et non une version cached par React/Next).
 *
 * Anti-pattern évité : pas de route.continue() — learning versi-s21 L201.
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import {
  PROJECT_ID,
  MOCK_PROJECT,
  MOCK_PLANS,
} from "./fixtures";

/**
 * Monte un mock stateful : le DELETE retire le plan de la liste interne,
 * et le prochain GET retourne la liste amputée.
 */
async function mockStatefulPlans(page: Page, initialPlans: typeof MOCK_PLANS) {
  // État en mémoire du serveur mocké
  const state = { plans: [...initialPlans] };

  // GET project (+ PATCH no-op)
  await page.route(`**/api/vs/projects/${PROJECT_ID}`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_PROJECT }),
    });
  });

  // GET/POST /projects/[id]/plans
  await page.route(
    `**/api/vs/projects/${PROJECT_ID}/plans`,
    async (route: Route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: state.plans }),
        });
        return;
      }
      // POST non utilisé ici — 404 explicite (pas de route.continue, L201)
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Mock: POST non implémenté." }),
      });
    }
  );

  // DELETE /plans/[id] — retire de la liste en mémoire
  await page.route(`**/api/vs/plans/*`, async (route: Route) => {
    const method = route.request().method();
    const url = route.request().url();
    const match = url.match(/\/plans\/([^/?#]+)/);
    const planId = match?.[1] ?? "";

    if (method === "DELETE") {
      state.plans = state.plans.filter((p) => p.id !== planId);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { deleted: true } }),
      });
      return;
    }
    // PATCH / GET sur un plan isolé — 200 no-op
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { id: planId } }),
    });
  });

  // Fichiers statiques + thumbnails → pixel transparent (pas de 404 visuel)
  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  await page.route("**/api/vs/files*", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "image/png", body: pixel });
  });
  await page.route("**/tmp/vs/**", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "image/png", body: pixel });
  });

  return state;
}

async function deleteFirstVisiblePlan(page: Page) {
  // Bouton "Supprimer ..." exposé par PlanThumbnail.tsx:129 via aria-label
  const deleteBtn = page.getByRole("button", { name: /^supprimer /i }).first();
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();

  // Modal de confirmation → confirmer
  const confirmBtn = page
    .getByRole("button", { name: /^supprimer$/i })
    .last();
  await expect(confirmBtn).toBeVisible();
  await confirmBtn.click();
}

test.describe("Plan DELETE persiste au reload (s22 régression)", () => {
  test.setTimeout(45_000);

  test("scénario 1 — supprimer 1er plan → reload → 1 plan restant", async ({
    page,
  }) => {
    const state = await mockStatefulPlans(page, MOCK_PLANS);
    expect(state.plans.length).toBe(2);

    await page.goto(`/vs/projects/${PROJECT_ID}/upload`);

    // Attendre que les 2 plans soient rendus
    await expect(page.getByText(/2 plans? déposés?/i)).toBeVisible();
    const deleteButtonsBefore = page.getByRole("button", { name: /^supprimer /i });
    await expect(deleteButtonsBefore).toHaveCount(2);

    await deleteFirstVisiblePlan(page);

    // Post-DELETE — attendre que l'état passe à 1
    await expect(page.getByText(/1 plan déposé/i)).toBeVisible({ timeout: 10_000 });
    expect(state.plans.length).toBe(1);

    // Reload — vérifier qu'il reste bien 1 seul plan (pas de réapparition)
    await page.reload();
    await expect(page.getByText(/1 plan déposé/i)).toBeVisible({ timeout: 10_000 });
    const deleteButtonsAfterReload = page.getByRole("button", {
      name: /^supprimer /i,
    });
    await expect(deleteButtonsAfterReload).toHaveCount(1);
  });

  test("scénario 2 — supprimer dernier plan → reload → liste vide", async ({
    page,
  }) => {
    // On part d'un projet avec 1 seul plan pour tester l'état vide post-DELETE
    const state = await mockStatefulPlans(page, [MOCK_PLANS[0]]);
    expect(state.plans.length).toBe(1);

    await page.goto(`/vs/projects/${PROJECT_ID}/upload`);

    await expect(page.getByText(/1 plan déposé/i)).toBeVisible();

    await deleteFirstVisiblePlan(page);

    // Post-DELETE — plus aucun plan
    expect(state.plans.length).toBe(0);

    // Reload — vérifier que l'état vide est rendu et qu'aucun plan ne réapparaît
    await page.reload();

    // Attendre que la page soit chargée (dropzone visible) et qu'aucun bouton
    // supprimer ne soit rendu
    await expect(
      page.getByRole("heading", { name: /déposez vos plans/i })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /^supprimer /i })
    ).toHaveCount(0);

    // Le compteur "N plan(s) déposé(s)" ne doit PAS être affiché (section cachée)
    await expect(page.getByText(/\d+ plans? déposés?/i)).toHaveCount(0);
  });
});
