/**
 * Tests E2E — Navigation et rendu des pages Versi Studio
 *
 * Verifie que chaque page du workflow 4 etapes se charge correctement,
 * affiche les elements attendus, et gere les etats (vide, erreur, loading).
 *
 * APIs mockees via route interception Playwright (pas de PostgreSQL en test).
 *
 * User stories couvertes :
 *   US-VS-01 (creation projet — affichage dashboard)
 *   US-VS-02 (upload — rendu page)
 *   US-VS-06 (lots — rendu page)
 *   US-VS-13 (rooms — rendu page)
 *   US-VS-19/20 (visuals — rendu page)
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import {
  PROJECT_ID,
  MOCK_PROJECT,
  MOCK_PROJECT_STEP1,
  MOCK_PROJECT_STEP2,
  MOCK_PROJECT_STEP3,
  MOCK_PLANS,
  MOCK_LOTS,
  MOCK_LOTS_VALIDATED,
  MOCK_ROOMS_LOT1,
  MOCK_ROOMS_LOT2,
  MOCK_EXTRACTION_RESULT,
} from "./fixtures";

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Mock toutes les API routes /api/vs/* avec des donnees coherentes.
 * Chaque test peut overrider des routes specifiques apres cet appel.
 */
async function mockAllApiRoutes(page: Page, overrides?: {
  projects?: unknown[];
  project?: unknown;
  plans?: unknown[];
  lots?: unknown[];
  rooms?: Record<string, unknown[]>;
  extraction?: unknown;
}) {
  const projects = overrides?.projects ?? [MOCK_PROJECT];
  const project = overrides?.project ?? MOCK_PROJECT;
  const plans = overrides?.plans ?? [];
  const lots = overrides?.lots ?? [];
  const roomsByLot = overrides?.rooms ?? {};
  const extraction = overrides?.extraction ?? MOCK_EXTRACTION_RESULT;

  // GET /api/vs/projects
  await page.route("**/api/vs/projects", async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: projects }),
      });
    } else if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      const newProject = {
        ...MOCK_PROJECT,
        id: PROJECT_ID,
        adresse: body.adresse,
        type_bien: body.type_bien,
        surface_totale: body.surface_totale ?? null,
        status: "draft",
      };
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: newProject }),
      });
    } else {
      await route.continue();
    }
  });

  // GET /api/vs/projects/[id]
  await page.route(`**/api/vs/projects/${PROJECT_ID}`, async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: project }),
      });
    } else if (route.request().method() === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { ...project, ...(route.request().postDataJSON()) } }),
      });
    } else {
      await route.continue();
    }
  });

  // GET /api/vs/projects/[id]/plans
  await page.route(`**/api/vs/projects/${PROJECT_ID}/plans`, async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: plans }),
      });
    } else if (route.request().method() === "POST") {
      // Simuler un upload reussi
      const newPlan = {
        ...MOCK_PLANS[0],
        id: `plan-${Date.now()}`,
        original_filename: "uploaded-plan.pdf",
      };
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: newPlan }),
      });
    } else {
      await route.continue();
    }
  });

  // GET /api/vs/projects/[id]/lots
  await page.route(`**/api/vs/projects/${PROJECT_ID}/lots`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: lots }),
    });
  });

  // POST /api/vs/projects/[id]/lots/validate
  await page.route(`**/api/vs/projects/${PROJECT_ID}/lots/validate`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { validated: true } }),
    });
  });

  // GET /api/vs/projects/[id]/extraction
  await page.route(`**/api/vs/projects/${PROJECT_ID}/extraction`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: extraction }),
    });
  });

  // POST /api/vs/projects/[id]/extract (lancer extraction IA)
  await page.route(`**/api/vs/projects/${PROJECT_ID}/extract`, async (route: Route) => {
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { extraction_id: "ext-mock", status: "processing" } }),
    });
  });

  // GET /api/vs/lots/[id]/rooms
  for (const [lotId, rooms] of Object.entries(roomsByLot)) {
    await page.route(`**/api/vs/lots/${lotId}/rooms`, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: rooms }),
      });
    });
  }

  // Catch-all pour les lots individuels (GET/PATCH)
  await page.route("**/api/vs/lots/*", async (route: Route) => {
    const url = route.request().url();
    // Ignorer les sous-routes deja traitees (rooms, validate) — déléguer aux handlers spécifiques (learning s18)
    if (url.includes("/rooms") || url.includes("/validate")) {
      await route.fallback();
      return;
    }
    const matchedLot = lots.find((l: any) => url.includes(l.id));
    if (matchedLot) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: matchedLot }),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Lot introuvable." }),
      });
    }
  });

  // Catch-all pour les fichiers statiques (plans PNG) — retourner un placeholder
  await page.route("**/tmp/vs/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"),
    });
  });

  // /api/vs/files — servir un pixel transparent
  await page.route("**/api/vs/files*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"),
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD — /vs
// ═══════════════════════════════════════════════════════════════════

test.describe("Dashboard /vs", () => {
  test("affiche le titre et le bouton Nouvelle operation", async ({ page }) => {
    await mockAllApiRoutes(page, { projects: [] });
    await page.goto("/vs");

    await expect(page.getByRole("heading", { name: /mes opérations/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /nouvelle opération/i })).toBeVisible();
  });

  test("affiche l'etat vide quand aucun projet", async ({ page }) => {
    await mockAllApiRoutes(page, { projects: [] });
    await page.goto("/vs");

    await expect(page.getByText(/aucune opération/i)).toBeVisible();
  });

  test("affiche la liste des projets existants", async ({ page }) => {
    await mockAllApiRoutes(page, { projects: [MOCK_PROJECT] });
    await page.goto("/vs");

    await expect(page.getByText("10 rue des Muguets, 59000 Lille")).toBeVisible();
    await expect(page.getByText(/immeuble/i)).toBeVisible();
  });

  test("affiche le formulaire de creation au clic sur Nouvelle operation", async ({ page }) => {
    await mockAllApiRoutes(page, { projects: [] });
    await page.goto("/vs");

    await page.getByRole("button", { name: /nouvelle opération/i }).click();

    await expect(page.getByLabel(/adresse/i)).toBeVisible();
    await expect(page.getByLabel(/type de bien/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /créer l'opération/i })).toBeVisible();
  });

  test("affiche une erreur si le chargement echoue", async ({ page }) => {
    // Mock une erreur 500
    await page.route("**/api/vs/projects", async (route: Route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Erreur serveur" }),
      });
    });
    await page.goto("/vs");

    await expect(page.getByText(/impossible de charger/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /réessayer/i })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 1 — Upload /vs/projects/[id]/upload
// ═══════════════════════════════════════════════════════════════════

test.describe("Step 1 — Upload", () => {
  test("affiche la page upload avec le stepper et la dropzone", async ({ page }) => {
    await mockAllApiRoutes(page, { project: MOCK_PROJECT, plans: [] });
    await page.goto(`/vs/projects/${PROJECT_ID}/upload`);

    // Stepper visible
    await expect(page.getByRole("navigation", { name: /étapes/i })).toBeVisible();

    // Titre de la page
    await expect(page.getByRole("heading", { name: /déposez vos plans/i })).toBeVisible();

    // Adresse du projet affichee
    await expect(page.getByText("10 rue des Muguets, 59000 Lille")).toBeVisible();
  });

  test("affiche les plans deja deposes", async ({ page }) => {
    await mockAllApiRoutes(page, { project: MOCK_PROJECT, plans: MOCK_PLANS });
    await page.goto(`/vs/projects/${PROJECT_ID}/upload`);

    // Compteur de plans
    await expect(page.getByText(/2 plans déposés/i)).toBeVisible();

    // Bouton analyser visible (label canonique : "Lancer l'analyse" — décision Thomas versi-s16)
    await expect(page.getByRole("button", { name: /lancer l'analyse/i })).toBeVisible();
  });

  test("affiche Operation introuvable si le projet n'existe pas", async ({ page }) => {
    await page.route(`**/api/vs/projects/**`, async (route: Route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ success: false, error: "Opération introuvable." }),
        });
      } else {
        await route.continue();
      }
    });
    // Mock plans route too
    await page.route("**/api/vs/projects/*/plans", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto(`/vs/projects/${PROJECT_ID}/upload`);

    await expect(page.getByText(/introuvable/i)).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 2 — Lots /vs/projects/[id]/lots
// ═══════════════════════════════════════════════════════════════════

test.describe("Step 2 — Lots", () => {
  test("affiche la page lots avec le stepper et le panneau lateral", async ({ page }) => {
    await mockAllApiRoutes(page, {
      project: MOCK_PROJECT_STEP1,
      plans: MOCK_PLANS,
      lots: MOCK_LOTS,
    });
    await page.goto(`/vs/projects/${PROJECT_ID}/lots`);

    // Stepper visible
    await expect(page.getByRole("navigation", { name: /étapes/i })).toBeVisible();

    // Le nom du premier lot doit etre visible dans le panneau lateral
    await expect(page.getByText("Lot 1")).toBeVisible();
    await expect(page.getByText("Lot 2")).toBeVisible();
  });

  test("affiche l'etat vide quand aucun lot detecte", async ({ page }) => {
    await mockAllApiRoutes(page, {
      project: MOCK_PROJECT_STEP1,
      plans: MOCK_PLANS,
      lots: [],
    });
    await page.goto(`/vs/projects/${PROJECT_ID}/lots`);

    // Message d'etat vide
    await expect(page.getByText(/aucun lot/i)).toBeVisible({ timeout: 15_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 3 — Rooms /vs/projects/[id]/rooms
// ═══════════════════════════════════════════════════════════════════

test.describe("Step 3 — Rooms", () => {
  test("affiche la page pieces avec le stepper", async ({ page }) => {
    await mockAllApiRoutes(page, {
      project: MOCK_PROJECT_STEP2,
      plans: MOCK_PLANS,
      lots: MOCK_LOTS_VALIDATED,
      rooms: {
        [MOCK_LOTS_VALIDATED[0].id]: MOCK_ROOMS_LOT1,
        [MOCK_LOTS_VALIDATED[1].id]: MOCK_ROOMS_LOT2,
      },
    });
    await page.goto(`/vs/projects/${PROJECT_ID}/rooms`);

    // Stepper visible
    await expect(page.getByRole("navigation", { name: /étapes/i })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4 — Visuals /vs/projects/[id]/visuals
// ═══════════════════════════════════════════════════════════════════

test.describe("Step 4 — Visuals", () => {
  test("affiche la page visuels avec le stepper", async ({ page }) => {
    // Mock rooms pour les lots
    await mockAllApiRoutes(page, {
      project: MOCK_PROJECT_STEP3,
      plans: MOCK_PLANS,
      lots: MOCK_LOTS_VALIDATED,
      rooms: {
        [MOCK_LOTS_VALIDATED[0].id]: MOCK_ROOMS_LOT1,
        [MOCK_LOTS_VALIDATED[1].id]: MOCK_ROOMS_LOT2,
      },
    });
    // Mock rooms/photos/visuals API calls for visual page
    await page.route("**/api/vs/rooms/*/photos", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });
    await page.route("**/api/vs/rooms/*/visuals", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto(`/vs/projects/${PROJECT_ID}/visuals`);

    // Stepper visible
    await expect(page.getByRole("navigation", { name: /étapes/i })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION — Header et liens
// ═══════════════════════════════════════════════════════════════════

test.describe("Navigation globale", () => {
  test("le header contient le lien Versi Studio et Mes operations", async ({ page }) => {
    await mockAllApiRoutes(page, { projects: [] });
    await page.goto("/vs");

    await expect(page.getByRole("link", { name: /versi studio/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /mes opérations/i })).toBeVisible();
  });

  test("le lien Mes operations ramene au dashboard", async ({ page }) => {
    await mockAllApiRoutes(page, {
      projects: [],
      project: MOCK_PROJECT,
      plans: [],
    });
    await page.goto(`/vs/projects/${PROJECT_ID}/upload`);

    await page.getByRole("link", { name: /mes opérations/i }).click();

    await expect(page).toHaveURL("/vs");
  });
});
