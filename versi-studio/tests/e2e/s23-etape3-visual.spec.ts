import { test } from "@playwright/test";

type RoomDb = { name: string; position?: unknown; polygon?: unknown };

test("Étape 3 P00 — voir ce que l'UI affiche vraiment", async ({ page }) => {
  const projectId = "f396578e-e401-4526-86ea-0d97202fe25a";
  const url = `http://localhost:5000/vs/projects/${projectId}/rooms`;

  // 1. Ouvre Étape 3
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // 2. Screenshot initial
  await page.screenshot({ path: "/tmp/etape3-initial.png", fullPage: true });
  console.log("Screenshot sauvé : /tmp/etape3-initial.png");

  // 3. Trouver le canvas et tester drag Séjour/cuisine vers la droite
  const canvas = page.locator("canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 5000 });
  const box = await canvas.boundingBox();
  console.log("Canvas bounding box:", box);

  // 4. Récupérer les positions actuelles des rooms via API
  const roomsResp = await page.request.get(`http://localhost:5000/api/vs/lots/3f896d22-4811-4ee5-8eff-8b6dea4436ce/rooms`);
  const rooms = await roomsResp.json();
  console.log("Rooms en DB:", (rooms.data as RoomDb[]).map((r) => ({
    name: r.name,
    position: r.position,
    polygonPoints: Array.isArray(r.polygon) ? r.polygon.length : 0,
  })));

  // 5. Trouver Séjour/cuisine et tester drag vers la droite
  const sejour = (rooms.data as RoomDb[]).find((r) => r.name.toLowerCase().includes("séjour") || r.name.toLowerCase().includes("sejour"));
  if (sejour && box) {
    // Position Séjour en % lot-local → convertir en px canvas
    const canvasW = box.width;
    const canvasH = box.height;
    // Approximation : on fait un click au centre, puis drag vers la droite
    const centerX = box.x + canvasW * 0.7; // probable centre Séjour
    const centerY = box.y + canvasH * 0.5;

    console.log(`Click + drag Sejour depuis (${centerX}, ${centerY}) vers (${box.x + canvasW - 10}, ${centerY})`);
    // Click pour sélectionner
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(500);
    await page.screenshot({ path: "/tmp/etape3-after-select.png", fullPage: true });
    // Drag vers la droite
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(box.x + canvasW - 10, centerY, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "/tmp/etape3-after-drag-right.png", fullPage: true });
    console.log("Screenshots sauvés : /tmp/etape3-after-select.png, /tmp/etape3-after-drag-right.png");
  }
});
