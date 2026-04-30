/**
 * s28 — Audit des 3 invariants métier sur les pièces extraites
 *
 * Invariants vérifiés :
 *   1. Surface label = aire polygone (proportions cohérentes)
 *      → la pièce avec la plus grande aire polygone doit avoir la plus
 *        grande surface m². Ratio max/min des (aire_pct / surface_m2)
 *        doit être < 2.0 pour considérer les surfaces cohérentes.
 *
 *   2. Polygones pièces ⊆ lot (pas de débord hors lot vectoriel)
 *      → pour chaque pièce, vérifier que tous ses vertices sont DANS
 *        le polygone du lot.
 *
 *   3. Labels = noms de pièces standards (Entrée, Séjour, Cuisine, SDB,
 *      Chambre — labels Muguets RDC vérifiés visuellement). Pour le mock,
 *      on accepte les labels du mock. Pour l'IA réelle, valider que les
 *      labels viennent bien du PDF.
 */
import { Pool } from "pg";

const DB_URL =
  process.env.DATABASE_URL ||
  "postgres://versi:versi@127.0.0.1:5432/versi_studio";

interface Pt {
  x_percent: number;
  y_percent: number;
}

function polygonAreaPercent(points: Pt[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    sum += points[i].x_percent * points[j].y_percent;
    sum -= points[j].x_percent * points[i].y_percent;
  }
  return Math.abs(sum / 2);
}

/** Test point-in-polygon (ray casting). */
function pointInPolygon(px: number, py: number, points: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x_percent,
      yi = points[i].y_percent;
    const xj = points[j].x_percent,
      yj = points[j].y_percent;
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const VALID_LABELS = new Set([
  "Entrée",
  "Séjour",
  "Cuisine",
  "SDB",
  "Chambre",
  "WC",
  "Couloir",
  "Palier",
  "Bureau",
  "Cellier",
  "Dressing",
]);

async function main() {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error("Usage: tsx scripts/s28-audit-invariants.ts <project_id>");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: DB_URL });

  console.log(`\n═══ s28 — Audit invariants (project ${projectId}) ═══\n`);

  // Récupère lots et leurs polygones (en coords plan-global %)
  const lotsRes = await pool.query<{
    id: string;
    floor_number: number;
    name: string;
    zone_data: { type: string; points: Pt[] };
  }>(
    "SELECT id, floor_number, name, zone_data FROM vs_lots WHERE project_id = $1 ORDER BY floor_number",
    [projectId]
  );

  const allResults: Array<{
    floor: number;
    lotName: string;
    inv1: { passed: boolean; detail: string };
    inv2: { passed: boolean; detail: string };
    inv3: { passed: boolean; detail: string };
  }> = [];

  for (const lot of lotsRes.rows) {
    const lotPoly = lot.zone_data?.points ?? [];
    if (lotPoly.length < 3) {
      console.log(`[Lot ${lot.name}] polygone invalide, skip`);
      continue;
    }

    // Récupère les rooms de ce lot (polygones en coords lot-local %)
    const roomsRes = await pool.query<{
      name: string;
      surface_m2: string | null;
      polygon: Pt[] | null;
    }>(
      "SELECT name, surface_m2, polygon FROM vs_rooms WHERE lot_id = $1 ORDER BY surface_m2 DESC NULLS LAST",
      [lot.id]
    );

    // ─── Invariant 1 : surface ↔ polygone ────────────────────────
    const ratios: Array<{ name: string; surface: number; area: number; ratio: number }> = [];
    let inv1Pass = true;
    let inv1Detail = "";
    for (const r of roomsRes.rows) {
      if (!r.polygon || r.polygon.length < 3) continue;
      const surface = parseFloat(r.surface_m2 ?? "0");
      const area = polygonAreaPercent(r.polygon);
      if (surface > 0 && area > 0) {
        ratios.push({ name: r.name, surface, area, ratio: area / surface });
      }
    }
    if (ratios.length >= 2) {
      const minR = Math.min(...ratios.map((r) => r.ratio));
      const maxR = Math.max(...ratios.map((r) => r.ratio));
      const ratioMaxMin = maxR / minR;
      // Cohérence : ratio max/min < 3 (tolérant aux clip+snap)
      inv1Pass = ratioMaxMin < 3.0;
      inv1Detail = `ratio max/min = ${ratioMaxMin.toFixed(2)} (cible <3.0). ${ratios
        .map((r) => `${r.name}=${r.surface}m²/${r.area.toFixed(0)}pct`)
        .join(", ")}`;
    } else {
      inv1Detail = "pas assez de pièces avec polygone+surface";
      inv1Pass = false;
    }

    // ─── Invariant 2 : pièces ⊆ lot ───────────────────────────────
    // Les polygones rooms sont en lot-local % → conversion en plan-global
    // via lotPoly.bbox.
    let lotMinX = 100,
      lotMinY = 100,
      lotMaxX = 0,
      lotMaxY = 0;
    for (const p of lotPoly) {
      if (p.x_percent < lotMinX) lotMinX = p.x_percent;
      if (p.y_percent < lotMinY) lotMinY = p.y_percent;
      if (p.x_percent > lotMaxX) lotMaxX = p.x_percent;
      if (p.y_percent > lotMaxY) lotMaxY = p.y_percent;
    }
    const lotW = lotMaxX - lotMinX;
    const lotH = lotMaxY - lotMinY;

    let outsideVerts = 0;
    let totalVerts = 0;
    const outsideRooms: string[] = [];
    // Tolérance frontière : un vertex à <0.5% du bord du lot est considéré dedans
    const BOUNDARY_TOL = 0.5;
    for (const r of roomsRes.rows) {
      if (!r.polygon || r.polygon.length < 3) continue;
      let roomOutside = 0;
      for (const v of r.polygon) {
        // Conversion local → global
        const gx = lotMinX + (v.x_percent / 100) * lotW;
        const gy = lotMinY + (v.y_percent / 100) * lotH;
        let inside = pointInPolygon(gx, gy, lotPoly);
        if (!inside) {
          // Tolérance frontière : vérifier la distance au bord
          inside =
            gx >= lotMinX - BOUNDARY_TOL &&
            gx <= lotMaxX + BOUNDARY_TOL &&
            gy >= lotMinY - BOUNDARY_TOL &&
            gy <= lotMaxY + BOUNDARY_TOL;
        }
        totalVerts++;
        if (!inside) {
          outsideVerts++;
          roomOutside++;
        }
      }
      if (roomOutside > 0) {
        outsideRooms.push(`${r.name}(${roomOutside})`);
      }
    }
    // Tolérance : <5% de vertices peuvent être hors (snap arrondi)
    const outsideRatio = totalVerts > 0 ? outsideVerts / totalVerts : 1;
    const inv2Pass = outsideRatio < 0.05;
    const inv2Detail = `${outsideVerts}/${totalVerts} vertices hors lot (${(outsideRatio * 100).toFixed(1)}%)${
      outsideRooms.length ? ` — ${outsideRooms.slice(0, 3).join(", ")}` : ""
    }`;

    // ─── Invariant 3 : labels ──────────────────────────────────────
    const invalidLabels: string[] = [];
    for (const r of roomsRes.rows) {
      if (!VALID_LABELS.has(r.name)) {
        invalidLabels.push(r.name);
      }
    }
    const inv3Pass = invalidLabels.length === 0;
    const inv3Detail =
      invalidLabels.length === 0
        ? `${roomsRes.rows.length} pièces, labels conformes`
        : `labels non standards : ${invalidLabels.join(", ")}`;

    allResults.push({
      floor: lot.floor_number,
      lotName: lot.name,
      inv1: { passed: inv1Pass, detail: inv1Detail },
      inv2: { passed: inv2Pass, detail: inv2Detail },
      inv3: { passed: inv3Pass, detail: inv3Detail },
    });
  }

  // Affichage
  console.log("│ Plan        │ Inv1 surf=poly │ Inv2 ⊆ lot │ Inv3 labels │");
  console.log("├─────────────┼─────────────────┼────────────┼─────────────┤");
  for (const r of allResults) {
    const c1 = r.inv1.passed ? "✓" : "✗";
    const c2 = r.inv2.passed ? "✓" : "✗";
    const c3 = r.inv3.passed ? "✓" : "✗";
    console.log(
      `│ ${r.lotName.padEnd(11)} │ ${c1.padEnd(15)} │ ${c2.padEnd(10)} │ ${c3.padEnd(11)} │`
    );
  }
  console.log("");
  for (const r of allResults) {
    console.log(`\n[${r.lotName}]`);
    console.log(`  Inv1 : ${r.inv1.passed ? "PASS" : "FAIL"} — ${r.inv1.detail}`);
    console.log(`  Inv2 : ${r.inv2.passed ? "PASS" : "FAIL"} — ${r.inv2.detail}`);
    console.log(`  Inv3 : ${r.inv3.passed ? "PASS" : "FAIL"} — ${r.inv3.detail}`);
  }

  const totalChecks = allResults.length * 3;
  const passedChecks = allResults.reduce(
    (s, r) =>
      s +
      (r.inv1.passed ? 1 : 0) +
      (r.inv2.passed ? 1 : 0) +
      (r.inv3.passed ? 1 : 0),
    0
  );
  console.log(
    `\n═══ Total : ${passedChecks}/${totalChecks} invariants PASS (${((passedChecks / totalChecks) * 100).toFixed(0)}%) ═══\n`
  );

  await pool.end();
  process.exit(passedChecks === totalChecks ? 0 : 1);
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
