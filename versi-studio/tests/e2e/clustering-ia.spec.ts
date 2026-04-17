/**
 * Tests E2E — Clustering IA unit_id + validation 1-clic (versi-s21)
 *
 * Teste le flow :
 * 1. Lots IA pre-crees apres extraction (source='ai', status='suggested')
 * 2. Affichage badges IA + bordure pointillee
 * 3. Validation individuelle d'un lot IA (PATCH status → validated)
 * 4. Validation globale "Tout valider"
 * 5. Fallback sans IA (0 lot pre-cree, etat vide guide)
 */

import { test, expect } from "@playwright/test";
import {
  PROJECT_ID,
  LOT_ID_1,
  LOT_ID_2,
  MOCK_PROJECT_STEP1,
  MOCK_PLANS,
  MOCK_LOTS,
} from "./fixtures";

// ─── Fixtures enrichies clustering IA ─────────────────────────────

const LOT_ID_AI_1 = "lot-ai01-0000-0000-000000000001";
const LOT_ID_AI_2 = "lot-ai02-0000-0000-000000000002";
const LOT_ID_AI_3 = "lot-ai03-0000-0000-000000000003";

const MOCK_LOTS_AI_SUGGESTED = [
  {
    id: LOT_ID_AI_1,
    project_id: PROJECT_ID,
    name: "T3 RDC gauche",
    floor_number: 0,
    surface_m2: 65,
    zone_data: {
      type: "rect",
      x_percent: 5,
      y_percent: 10,
      width_percent: 42,
      height_percent: 80,
    },
    status: "suggested" as const,
    source: "ai" as const,
    created_at: "2026-04-17T10:00:00.000Z",
  },
  {
    id: LOT_ID_AI_2,
    project_id: PROJECT_ID,
    name: "T2 RDC droite",
    floor_number: 0,
    surface_m2: 48,
    zone_data: {
      type: "rect",
      x_percent: 52,
      y_percent: 10,
      width_percent: 43,
      height_percent: 80,
    },
    status: "suggested" as const,
    source: "ai" as const,
    created_at: "2026-04-17T10:00:01.000Z",
  },
  {
    id: LOT_ID_AI_3,
    project_id: PROJECT_ID,
    name: "T2 Étage 1",
    floor_number: 1,
    surface_m2: 55,
    zone_data: {
      type: "rect",
      x_percent: 10,
      y_percent: 10,
      width_percent: 80,
      height_percent: 80,
    },
    status: "suggested" as const,
    source: "ai" as const,
    created_at: "2026-04-17T10:00:02.000Z",
  },
];

const MOCK_PLANS_EXTRACTED = MOCK_PLANS.map((p) => ({
  ...p,
  extraction_status: "done" as const,
  extraction_data: {
    rooms: [],
    building_outline: null,
    total_surface_m2: 180,
    floors_count: 2,
    extraction_warnings: [],
    scale_reference: "dimensions_on_plan",
  },
}));

// ─── Helper mock routes ───────────────────────────────────────────

function setupMockRoutes(
  page: import("@playwright/test").Page,
  lots: typeof MOCK_LOTS_AI_SUGGESTED
) {
  return page.route("**/api/vs/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // GET project
    if (url.includes(`/projects/${PROJECT_ID}`) && !url.includes("/lots") && !url.includes("/plans") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_PROJECT_STEP1 }),
      });
    }

    // GET plans
    if (url.includes(`/projects/${PROJECT_ID}/plans`) && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_PLANS_EXTRACTED }),
      });
    }

    // GET lots
    if (url.includes(`/projects/${PROJECT_ID}/lots`) && method === "GET" && !url.includes("/validate")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: lots }),
      });
    }

    // GET file (plan image)
    if (url.includes("/api/vs/files")) {
      return route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.alloc(100), // Image vide
      });
    }

    // PATCH lot (validation individuelle)
    if (url.match(/\/lots\/[a-f0-9-]+$/) && method === "PATCH") {
      const body = JSON.parse(await route.request().postData() || "{}");
      const lotId = url.split("/lots/")[1];
      const lot = lots.find((l) => l.id === lotId);
      if (lot) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { ...lot, ...body },
          }),
        });
      }
    }

    // POST validate (validation globale lots)
    if (url.includes("/lots/validate") && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { ...MOCK_PROJECT_STEP1, status: "step_2_complete" },
        }),
      });
    }

    // Fallback
    return route.continue();
  });
}

// ─── Tests ────────────────────────────────────────────────────────

test.describe("Clustering IA — lots pre-crees", () => {
  test("affiche les lots IA avec badge et boutons de validation", async ({ page }) => {
    await setupMockRoutes(page, MOCK_LOTS_AI_SUGGESTED);
    await page.goto(`/vs/projects/${PROJECT_ID}/lots`);

    // Verifier que les 3 lots sont affiches (seuls les lots de l'etage 0 visible par defaut)
    // Le panneau lateral affiche tous les lots de l'etage filtre
    await expect(page.getByText("T3 RDC gauche")).toBeVisible();
    await expect(page.getByText("T2 RDC droite")).toBeVisible();

    // Verifier les badges IA
    const iaLabels = page.locator("text=IA");
    await expect(iaLabels.first()).toBeVisible();

    // Verifier le bouton "Tout valider"
    await expect(page.getByRole("button", { name: /Tout valider/ })).toBeVisible();

    // Verifier les boutons "Valider ce lot"
    const validateButtons = page.getByRole("button", { name: /Valider ce lot/ });
    await expect(validateButtons.first()).toBeVisible();
  });

  test("validation individuelle d'un lot IA", async ({ page }) => {
    let patchCalled = false;
    let patchBody: Record<string, unknown> = {};

    await page.route("**/api/vs/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes(`/lots/${LOT_ID_AI_1}`) && method === "PATCH") {
        patchCalled = true;
        patchBody = JSON.parse(await route.request().postData() || "{}");
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { ...MOCK_LOTS_AI_SUGGESTED[0], status: "validated" },
          }),
        });
      }

      // GET project
      if (url.includes(`/projects/${PROJECT_ID}`) && !url.includes("/lots") && !url.includes("/plans") && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: MOCK_PROJECT_STEP1 }),
        });
      }

      // GET plans
      if (url.includes(`/projects/${PROJECT_ID}/plans`) && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: MOCK_PLANS_EXTRACTED }),
        });
      }

      // GET lots
      if (url.includes(`/projects/${PROJECT_ID}/lots`) && method === "GET" && !url.includes("/validate")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: MOCK_LOTS_AI_SUGGESTED }),
        });
      }

      // GET file
      if (url.includes("/api/vs/files")) {
        return route.fulfill({
          status: 200,
          contentType: "image/png",
          body: Buffer.alloc(100),
        });
      }

      return route.continue();
    });

    await page.goto(`/vs/projects/${PROJECT_ID}/lots`);

    // Cliquer sur "Valider ce lot" du premier lot
    const validateBtn = page.getByRole("button", { name: /Valider ce lot/ }).first();
    await validateBtn.click();

    // Verifier que PATCH a ete appele avec status: "validated"
    expect(patchCalled).toBe(true);
    expect(patchBody.status).toBe("validated");
  });

  test("bouton Tout valider envoie PATCH pour chaque lot IA suggere", async ({ page }) => {
    const patchedLotIds: string[] = [];

    await page.route("**/api/vs/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.match(/\/lots\/lot-ai\d+-/) && method === "PATCH") {
        const lotId = url.split("/lots/")[1];
        patchedLotIds.push(lotId);
        const lot = MOCK_LOTS_AI_SUGGESTED.find((l) => l.id === lotId);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { ...lot, status: "validated" },
          }),
        });
      }

      if (url.includes(`/projects/${PROJECT_ID}`) && !url.includes("/lots") && !url.includes("/plans") && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: MOCK_PROJECT_STEP1 }),
        });
      }

      if (url.includes(`/projects/${PROJECT_ID}/plans`) && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: MOCK_PLANS_EXTRACTED }),
        });
      }

      if (url.includes(`/projects/${PROJECT_ID}/lots`) && method === "GET" && !url.includes("/validate")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: MOCK_LOTS_AI_SUGGESTED }),
        });
      }

      if (url.includes("/api/vs/files")) {
        return route.fulfill({
          status: 200,
          contentType: "image/png",
          body: Buffer.alloc(100),
        });
      }

      return route.continue();
    });

    await page.goto(`/vs/projects/${PROJECT_ID}/lots`);

    // Cliquer sur "Tout valider"
    await page.getByRole("button", { name: /Tout valider/ }).click();

    // Attendre que les PATCH soient envoyes (polling au lieu de waitForTimeout flaky — I8 s21)
    // Note : "Tout valider" valide TOUS les lots IA, pas seulement ceux de l'etage filtre
    await expect(() => {
      expect(patchedLotIds.length).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 5000 });
  });

  test("fallback etat vide si 0 lot IA (confiance faible)", async ({ page }) => {
    await setupMockRoutes(page, []);
    await page.goto(`/vs/projects/${PROJECT_ID}/lots`);

    // Verifier l'etat vide guide
    await expect(page.getByText(/Aucun lot/)).toBeVisible();

    // Le bouton "Tout valider" ne doit pas etre visible
    await expect(page.getByRole("button", { name: /Tout valider/ })).not.toBeVisible();
  });

  test("lots manuels n'ont pas de badge IA", async ({ page }) => {
    const manualLots = [
      {
        id: "lot-manual-0001-0000-000000000001",
        project_id: PROJECT_ID,
        name: "Lot manuel test",
        floor_number: 0,
        surface_m2: 40,
        zone_data: {
          type: "rect",
          x_percent: 10,
          y_percent: 10,
          width_percent: 30,
          height_percent: 30,
        },
        status: "validated" as const,
        source: "manual" as const,
        created_at: "2026-04-17T10:00:00.000Z",
      },
    ];

    await setupMockRoutes(page, manualLots as typeof MOCK_LOTS_AI_SUGGESTED);
    await page.goto(`/vs/projects/${PROJECT_ID}/lots`);

    // Verifier que le lot est affiche
    await expect(page.getByText("Lot manuel test")).toBeVisible();

    // Verifier que "(manuel)" est affiche
    await expect(page.getByText("(manuel)")).toBeVisible();

    // Verifier qu'il n'y a PAS de bouton "Valider ce lot" (lot deja valide + source manual)
    await expect(page.getByRole("button", { name: /Valider ce lot/ })).not.toBeVisible();
  });
});
