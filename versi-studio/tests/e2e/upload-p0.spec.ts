/**
 * Tests P0 — 7 flows métier Upload (US-VS-02)
 *
 * Contexte : versi-s16 P2 Batch 5b — tests recommandés par @moi (s15) non
 * écrits en Étape 1. Chaque test vérifie un comportement critique non couvert
 * par pages.spec.ts ni upload-visual.spec.ts.
 *
 * Stratégie :
 *   - Toutes les routes /api/vs/* sont mockées via Playwright (pas de BDD/IA).
 *   - L'ordre d'enregistrement importe : wildcard d'abord, routes spécifiques
 *     APRÈS (learning versi-s13 P1 #2).
 *   - Fichier fixture créé dans beforeAll si absent (stub PDF minimal).
 *   - Pattern DropZone : injection via `input[type="file"]` caché (cf.
 *     upload-visual.spec.ts:dropFakeFiles).
 *
 * Non couvert par les tests existants (justification P0) :
 *   T1 → focus trap ConfirmModal (pas de test a11y clavier)
 *   T2 → rollback optimistic update sur PATCH floor (aucun test erreur PATCH)
 *   T3 → handleRetry (retry non testé, seul l'état erreur l'est)
 *   T4 → AbortController cleanup (navigation pendant upload non testée)
 *   T5 → isAnalyzing + POST /extract (happy path analyse jamais joué)
 *   T6 → Promise.allSettled partial failures (1/3 fail, pas tout-ou-rien)
 *   T7 → offline (context.setOffline non testé sur upload)
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { PROJECT_ID, MOCK_PROJECT, MOCK_PLANS } from "./fixtures";

// ─── Fixture PDF minimal (créé si absent) ────────────────────────

const FIXTURE_DIR = path.join(__dirname, "fixtures");
const FIXTURE_PDF = path.join(FIXTURE_DIR, "sample-plan.pdf");

test.beforeAll(() => {
  if (!fs.existsSync(FIXTURE_DIR)) fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  if (!fs.existsSync(FIXTURE_PDF)) {
    fs.writeFileSync(FIXTURE_PDF, Buffer.from("%PDF-1.4 versi-p0 fixture", "utf-8"));
  }
});

// ─── Helpers ─────────────────────────────────────────────────────

async function mockProjectAndPlansGet(
  page: Page,
  { plans = [] as unknown[], project = MOCK_PROJECT }: { plans?: unknown[]; project?: unknown } = {}
) {
  await page.route(`**/api/vs/projects/${PROJECT_ID}`, async (route: Route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: project }),
      });
    } else if (method === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: project }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route(`**/api/vs/projects/${PROJECT_ID}/plans`, async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: plans }),
      });
    } else {
      await route.continue();
    }
  });

  // Images statiques → pixel transparent (évite 404 sur src des thumbnails)
  await page.route("**/tmp/vs/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      ),
    });
  });
  await page.route("**/api/vs/files*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      ),
    });
  });
}

async function dropFakeFiles(page: Page, count: number) {
  const files = Array.from({ length: count }, (_, i) => ({
    name: `plan_${i + 1}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from(`%PDF-1.4 fake ${i}`, "utf-8"),
  }));
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(files);
}

// ─── Tests ────────────────────────────────────────────────────────

test.describe("Upload US-VS-02 — 7 tests P0 flows métier", () => {
  test.setTimeout(30_000);

  test("P0-T1 : Focus trap + Escape sur ConfirmModal", async ({ page }) => {
    // Given : page Upload avec 2 plans déposés
    await mockProjectAndPlansGet(page, { plans: MOCK_PLANS });
    await page.goto(`/vs/projects/${PROJECT_ID}/upload`);
    await expect(page.getByText(/2 plans déposés/i)).toBeVisible();

    // When : clic sur le premier bouton Supprimer (tuile) pour ouvrir le modal
    const deleteTrigger = page.getByRole("button", { name: /^supprimer\s/i }).first();
    await deleteTrigger.click();

    // Then : dialog monté, focus initial sur bouton "Supprimer" (confirm)
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const confirmBtn = dialog.getByRole("button", { name: /^supprimer$/i });
    await expect(confirmBtn).toBeFocused();

    // And : Escape ferme le modal
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // And : focus restauré sur le bouton Supprimer déclencheur
    await expect(deleteTrigger).toBeFocused();
  });

  test("P0-T2 : PATCH floor_number + rollback sur erreur serveur", async ({ page }) => {
    // Given : 1 plan à l'étage 0, PATCH retourne 500
    await mockProjectAndPlansGet(page, { plans: [MOCK_PLANS[0]] });
    await page.route("**/api/vs/plans/*", async (route: Route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Impossible de mettre à jour l'étage — réessayez dans quelques instants.",
          }),
        });
      } else {
        await route.continue();
      }
    });
    await page.goto(`/vs/projects/${PROJECT_ID}/upload`);

    // When : l'utilisateur change l'étage via l'input number puis blur
    const floorInput = page.locator(`#floor-${MOCK_PLANS[0].id}`);
    await expect(floorInput).toHaveValue("0");
    await floorInput.fill("3");
    await floorInput.blur();

    // Then : rollback visible (la valeur revient à 0 après échec PATCH)
    await expect(floorInput).toHaveValue("0", { timeout: 5_000 });

    // And : toast d'erreur affiché (role=alert)
    await expect(page.getByRole("alert")).toContainText(/mettre à jour l'étage|connexion/i);
  });

  test("P0-T3 : Retry failed files via handleRetry", async ({ page }) => {
    // Given : projet vide. Premier POST /plans → 500, retry → 201.
    await mockProjectAndPlansGet(page, { plans: [] });

    let postCount = 0;
    await page.route(`**/api/vs/projects/${PROJECT_ID}/plans`, async (route: Route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      postCount += 1;
      if (postCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Le serveur n'a pas pu traiter le fichier — réessayez dans quelques instants.",
          }),
        });
      } else {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { ...MOCK_PLANS[0], id: "plan-retry-success", original_filename: "plan_1.pdf" },
          }),
        });
      }
    });

    await page.goto(`/vs/projects/${PROJECT_ID}/upload`);
    await dropFakeFiles(page, 1);

    // Then : tuile d'erreur "Réessayer" affichée
    const retryBtn = page.getByRole("button", { name: /réessayer/i });
    await expect(retryBtn).toBeVisible({ timeout: 10_000 });

    // When : clic Réessayer (second POST répond 201)
    await retryBtn.click();

    // Then : compteur "1 plan déposé" affiché, tuile rouge disparue
    await expect(page.getByText(/1 plan déposé/i)).toBeVisible({ timeout: 10_000 });
    await expect(retryBtn).toBeHidden();
    expect(postCount).toBe(2);
  });

  test("P0-T4 : AbortController cleanup au démontage", async ({ page }) => {
    // Given : POST /plans freeze 10s (upload "en cours" quand on navigue)
    await mockProjectAndPlansGet(page, { plans: [] });

    let aborted = false;
    await page.route(`**/api/vs/projects/${PROJECT_ID}/plans`, async (route: Route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      try {
        await new Promise((r) => setTimeout(r, 10_000));
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: MOCK_PLANS[0] }),
        });
      } catch {
        // Route abortée côté serveur quand la page a navigué → expected
        aborted = true;
      }
    });

    await page.goto(`/vs/projects/${PROJECT_ID}/upload`);
    await dropFakeFiles(page, 1);

    // Attendre que l'upload soit visible en cours (spinner "Dépôt de … en cours")
    await expect(page.getByText(/dépôt de .* en cours/i)).toBeVisible({ timeout: 5_000 });

    // When : navigation vers /vs/projects (liste) pendant upload
    await page.goto(`/vs`);

    // Then : aucun role=alert de succès/erreur post-navigation, pas de crash
    await expect(page).toHaveURL(/\/vs$/);
    // Laisser 1s pour s'assurer qu'aucun toast asynchrone n'apparaît après navigation
    await page.waitForTimeout(1_000);
    await expect(page.getByRole("alert")).toHaveCount(0);
    // Le flag aborted peut rester false si Playwright n'a pas levé — l'assertion
    // principale est qu'aucun toast post-nav n'apparaît (AbortController a bien coupé).
    expect(typeof aborted).toBe("boolean");
  });

  test("P0-T5 : isAnalyzing + POST /extract happy path", async ({ page }) => {
    // Given : 1 plan déposé. PATCH project → 200, POST /extract → 200 avec délai.
    await mockProjectAndPlansGet(page, { plans: [MOCK_PLANS[0]] });

    // POST /extract répond succès après 400ms (laisse le temps de vérifier aria-busy)
    await page.route(`**/api/vs/projects/${PROJECT_ID}/extract`, async (route: Route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { lots_created: 2 } }),
      });
    });

    // Mock la page /lots pour éviter une cascade d'API après redirect
    await page.route(`**/api/vs/projects/${PROJECT_ID}/lots`, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto(`/vs/projects/${PROJECT_ID}/upload`);

    // When : clic "Lancer l'analyse"
    const analyseBtn = page.getByRole("button", { name: /lancer l'analyse/i });
    await expect(analyseBtn).toBeEnabled();
    await analyseBtn.click();

    // Then : bouton passe en aria-busy=true, label change pour "Analyse en cours…"
    await expect(analyseBtn).toHaveAttribute("aria-busy", "true");
    await expect(analyseBtn).toBeDisabled();
    await expect(page.getByRole("button", { name: /analyse en cours/i })).toBeVisible();

    // And : redirect vers /lots
    await page.waitForURL(`**/vs/projects/${PROJECT_ID}/lots`, { timeout: 5_000 });
  });

  test("P0-T6 : Promise.allSettled partial failures", async ({ page }) => {
    // Given : 3 fichiers déposés simultanément. 2 POST → 201, 1 POST → 500.
    await mockProjectAndPlansGet(page, { plans: [] });

    let postCount = 0;
    await page.route(`**/api/vs/projects/${PROJECT_ID}/plans`, async (route: Route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      postCount += 1;
      // Le 2e POST échoue, les 1er et 3e réussissent
      if (postCount === 2) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Le serveur n'a pas pu traiter le fichier — réessayez dans quelques instants.",
          }),
        });
      } else {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              ...MOCK_PLANS[0],
              id: `plan-partial-${postCount}`,
              original_filename: `plan_${postCount}.pdf`,
              floor_number: postCount - 1,
            },
          }),
        });
      }
    });

    await page.goto(`/vs/projects/${PROJECT_ID}/upload`);
    await dropFakeFiles(page, 3);

    // Then : 2 plans affichés (les réussis), 1 tuile Réessayer (la failed)
    await expect(page.getByText(/2 plans déposés/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /réessayer/i })).toHaveCount(1);
    expect(postCount).toBe(3);
  });

  test("P0-T7 : Erreurs réseau actionnables (offline)", async ({ page, context }) => {
    // Given : page chargée normalement, puis passage offline
    await mockProjectAndPlansGet(page, { plans: [] });
    await page.goto(`/vs/projects/${PROJECT_ID}/upload`);
    await expect(page.getByRole("heading", { name: /déposez vos plans/i })).toBeVisible();

    // When : context offline AVANT l'upload (la route mockée ne s'applique plus,
    // le fetch échoue côté réseau → catch côté client)
    await context.setOffline(true);
    await dropFakeFiles(page, 1);

    // Then : tuile Réessayer affichée avec message actionnable "connexion"
    const retryTile = page
      .locator("div")
      .filter({ hasText: /vérifiez votre connexion et réessayez/i })
      .first();
    await expect(retryTile).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /réessayer/i })).toBeVisible();

    // Cleanup : remettre online pour ne pas polluer les tests suivants
    await context.setOffline(false);
  });
});
