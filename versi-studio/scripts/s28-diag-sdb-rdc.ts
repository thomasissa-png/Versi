// s28 tour 23 — diag SdB RDC : position label PDF, mur extérieur N le plus proche,
// raycast NORD, raison probable du décalage centre-gauche au lieu de haut-gauche.
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractTextItems, filterRoomLabels } from "../src/lib/vs/pdf-text-extractor";
import { extractLotVector } from "../src/lib/vs/lot-vector-extractor";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";

async function main() {
  const projectId = process.env.VS_PROJECT_ID || "5b30e9fe-257e-41a4-968e-6b90b3a70e5e";
  const floor = 0;
  const pool = new Pool({ connectionString: DB_URL });

  const planRes = await pool.query<{ id: string; file_path: string }>(
    "SELECT id, file_path FROM vs_plans WHERE project_id = $1 AND floor_number = $2",
    [projectId, floor]
  );
  if (planRes.rows.length === 0) {
    console.error("Plan introuvable");
    process.exit(1);
  }
  const buf = await readFile(planRes.rows[0].file_path);
  const lvr = await extractLotVector(buf, { scale: 3 });

  const lotsRes = await pool.query<{ zone_data: { points: Array<{ x_percent: number; y_percent: number }> } }>(
    "SELECT zone_data FROM vs_lots WHERE project_id = $1 AND floor_number = $2",
    [projectId, floor]
  );
  const lotPoly = lotsRes.rows[0].zone_data.points;
  const imageW = lvr.imageWidth;
  const imageH = lvr.imageHeight;
  const lotPolyPx = lotPoly.map((p) => ({
    x: (p.x_percent / 100) * imageW,
    y: (p.y_percent / 100) * imageH,
  }));
  const xMin = Math.min(...lotPolyPx.map((p) => p.x));
  const xMax = Math.max(...lotPolyPx.map((p) => p.x));
  const yMin = Math.min(...lotPolyPx.map((p) => p.y));
  const yMax = Math.max(...lotPolyPx.map((p) => p.y));
  console.log(`RDC imageW=${imageW.toFixed(0)} imageH=${imageH.toFixed(0)}`);
  console.log(`Lot bbox px : x[${xMin.toFixed(0)}..${xMax.toFixed(0)}] y[${yMin.toFixed(0)}..${yMax.toFixed(0)}]`);

  const items = await extractTextItems(buf, lotPolyPx, 3);
  const labels = filterRoomLabels(items);
  console.log(`\nLabels filtrés (${labels.length}) :`);
  for (const l of labels) {
    const xPct = ((l.x - xMin) / (xMax - xMin)) * 100;
    const yPct = ((l.y - yMin) / (yMax - yMin)) * 100;
    console.log(
      `  "${l.text}" — px(${l.x.toFixed(0)},${l.y.toFixed(0)}) — lot(${xPct.toFixed(1)}%,${yPct.toFixed(1)}%) — surface=${l.surface_m2 ?? "?"}m² — w=${l.width?.toFixed(0)} h=${l.height?.toFixed(0)}`
    );
  }

  // Identifier SdB et faire un dump des murs alentours
  const sdb = labels.find((l) => /^sdb$|salle de bain/i.test(l.text));
  if (!sdb) {
    console.log("\nPAS de SdB trouvée dans labels filtrés");
    await pool.end();
    return;
  }
  console.log(`\n=== SdB analyse ===`);
  console.log(`Centroïde label : px(${sdb.x.toFixed(0)},${sdb.y.toFixed(0)})`);
  console.log(`bbox label : x[${(sdb.x - sdb.width / 2).toFixed(0)}..${(sdb.x + sdb.width / 2).toFixed(0)}] y[${(sdb.y - sdb.height / 2).toFixed(0)}..${(sdb.y + sdb.height / 2).toFixed(0)}]`);

  // Extraire les murs internes
  const { extractInternalWallSegments } = await import("../src/lib/vs/lot-vector-extractor");
  const wallsRaw = await extractInternalWallSegments(buf, lotPolyPx, { scale: 3, multiColor: true });
  const walls = wallsRaw;
  console.log(`\nNombre de segments murs : ${walls.length}`);

  // Murs horizontaux dans une bande proche de SdB (±200px en X autour du label)
  const labelX = sdb.x;
  const labelY = sdb.y;
  console.log(`\n--- Murs horizontaux (|y-labelY| < 300px) couvrant labelX ---`);
  const hWalls: Array<{ y: number; x1: number; x2: number; len: number; relY: number }> = [];
  for (const w of walls) {
    const dx = w.x2 - w.x1;
    const dy = w.y2 - w.y1;
    const len = Math.hypot(dx, dy);
    if (len < 30) continue;
    const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
    const isH = angle < 5 || angle > 175;
    if (!isH) continue;
    const wy = (w.y1 + w.y2) / 2;
    const wxLo = Math.min(w.x1, w.x2);
    const wxHi = Math.max(w.x1, w.x2);
    if (labelX < wxLo - 5 || labelX > wxHi + 5) continue;
    if (Math.abs(wy - labelY) > 300) continue;
    hWalls.push({ y: wy, x1: wxLo, x2: wxHi, len, relY: wy - labelY });
  }
  hWalls.sort((a, b) => a.relY - b.relY);
  for (const w of hWalls) {
    const dir = w.relY < 0 ? "NORD (au-dessus)" : "SUD (en-dessous)";
    console.log(`  y=${w.y.toFixed(0)} (relY=${w.relY.toFixed(0)} ${dir}) x[${w.x1.toFixed(0)}..${w.x2.toFixed(0)}] len=${w.len.toFixed(0)}`);
  }

  console.log(`\n--- Bord supérieur du lot (yMin) à ${yMin.toFixed(0)} → distance label = ${(labelY - yMin).toFixed(0)}px ---`);

  // Test extraction réelle
  const { extractRoomsAsRectangles } = await import("../src/lib/vs/room-rectangle-from-walls");
  const rectLabels = labels.map((l) => ({
    text: l.text,
    x: l.x,
    y: l.y,
    surface_m2: l.surface_m2,
    labelBbox: {
      xMin: l.x - l.width / 2,
      yMin: l.y - l.height / 2,
      xMax: l.x + l.width / 2,
      yMax: l.y + l.height / 2,
    },
  }));
  const rooms = extractRoomsAsRectangles(rectLabels, walls, lotPolyPx, {});
  const sdbRoom = rooms.find((r) => /^sdb$|salle de bain/i.test(r.label));
  if (sdbRoom) {
    console.log(`\n=== SdB rectangle final ===`);
    console.log(`bbox : x[${sdbRoom.bbox.xMin.toFixed(0)}..${sdbRoom.bbox.xMax.toFixed(0)}] y[${sdbRoom.bbox.yMin.toFixed(0)}..${sdbRoom.bbox.yMax.toFixed(0)}]`);
    console.log(`Centre : (${((sdbRoom.bbox.xMin + sdbRoom.bbox.xMax) / 2).toFixed(0)}, ${((sdbRoom.bbox.yMin + sdbRoom.bbox.yMax) / 2).toFixed(0)})`);
    console.log(`Distance Y centre → mur N du lot : ${(((sdbRoom.bbox.yMin + sdbRoom.bbox.yMax) / 2) - yMin).toFixed(0)}px`);
    console.log(`Gap Y bord supérieur SdB → mur N lot : ${(sdbRoom.bbox.yMin - yMin).toFixed(0)}px`);
  }

  await pool.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
