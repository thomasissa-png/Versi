/**
 * Helper E2E — mockOpenAI (s30)
 *
 * Intercepte les routes API qui appellent OpenAI (preflight, generate)
 * pour éviter tout coût/latence réseau réel pendant les tests E2E.
 *
 * Note : Playwright route interception agit au niveau HTTP côté browser,
 * donc on intercepte les appels que le frontend fait vers Next.js. Les
 * appels OpenAI internes serveur sont stubés via la flag MOCK_OPENAI=true
 * en variable d'environnement (à activer dans le webServer si besoin
 * d'un mock côté Next.js).
 *
 * Stratégie testée s30 : mock côté Playwright suffit pour les 10 scénarios
 * E2E ciblés (on teste l'UI + le flow, pas le pipeline IA réel).
 */

import type { Page, Route } from "@playwright/test";

/**
 * Mock minimal des appels OpenAI — placeholder.
 * Le mock effectif est dans setupProject.ts (mocks API Next.js).
 * Cette fonction est gardée pour usages futurs (mock direct si besoin
 * d'intercepter un appel api.openai.com échappé).
 */
export async function blockExternalOpenAI(page: Page): Promise<void> {
  await page.route(/api\.openai\.com/, async (route: Route) => {
    // Aucun appel OpenAI réel ne doit sortir des tests E2E.
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: "BLOCKED_IN_TEST: external OpenAI call detected. Use mock instead.",
      }),
    });
  });
}

/**
 * Mock signature ancre — structure attendue par coherent-visual-generator.
 * Référence learning P0 s28 : structure SYNCHRONISÉE avec le réel.
 */
export const MOCK_ANCHOR_SIGNATURE = {
  palette: ["#f5f5f0", "#3a3a3a", "#8b6f47"],
  meubles: ["canapé 3 places en lin gris clair", "table basse en chêne"],
  sols_murs: "parquet chêne clair, murs blanc cassé",
  lumiere: "naturelle latérale gauche, ambiance chaude",
};

/**
 * Mock fixture image base64 minimale (1x1 px PNG transparent).
 * Utilisée si un test doit retourner une image sans fichier réel.
 */
export const MOCK_IMAGE_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=";
