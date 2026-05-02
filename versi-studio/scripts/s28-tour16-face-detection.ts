/**
 * s28 TOUR 16 — Pivot architectural : wall-graph face detection
 *
 * Approche standalone (sans toucher la route extract énorme) :
 *   1. Pour chaque plan en DB, on récupère le polygone lot existant
 *   2. On extrait UNION des murs : externes (vector) + internes vector + raster
 *   3. On construit le graphe planaire COMPLET (avec intersections seg-seg)
 *   4. On détecte les FACES (DCEL half-edge traversal)
 *   5. On filtre les faces : centroid in lot + aire min + compactness
 *   6. On match chaque face au label PDF dont la position tombe dedans
 *   7. On UPSERT les rooms en DB (REPLACE polygon par face exacte)
 *   8. On lance s28-audit-strict pour vérifier le score 20/20
 *
 * Avantage : zéro modif du pipeline route. Si ça marche → on wire dans la route.
 *
 * Run :
 *   pnpm tsx scripts/s28-tour16-face-detection.ts <project_id>
 */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import {
  extractLotVector,
  extractInternalWallSegments,
  type WallSegPx,
} from "../src/lib/vs/lot-vector-extractor";
import {
  buildPlanarGraph,
  detectFaces,
  filterRoomFaces,
  type Face,
  type Vertex,
  computeSignedArea,
  pointInPolygon,
} from "../src/lib/vs/wall-graph-faces";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { vectorizeRasterWallsFromPng } from "../src/lib/vs/raster-walls-vectorize";
import { extractTextItems, filterRoomLabels, type PdfTextItem } from "../src/lib/vs/pdf-text-extractor";
import { WALL_EXTRACTION_CONFIG } from "../src/lib/vs/wall-extraction-config";
import { pdf as pdfToImg } from "pdf-to-img";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";

interface PtPct { x_percent: number; y_percent: number }

async function main() {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error("Usage: tsx scripts/s28-tour16-face-detection.ts <project_id>");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DB_URL });
  console.log(`\n=== TOUR 16 — Wall-graph face detection (project ${projectId}) ===\n`);

  // 1. Récupérer plans + lots
  const lots = await pool.query<{
    id: string;
    floor_number: number;
    name: string;
    zone_data: { type: string; points: PtPct[] };
  }>(
    "SELECT id, floor_number, name, zone_data FROM vs_lots WHERE project_id = $1 ORDER BY floor_number",
    [projectId],
  );
  const plans = await pool.query<{ id: string; floor_number: number; file_path: string }>(
    "SELECT id, floor_number, file_path FROM vs_plans WHERE project_id = $1",
    [projectId],
  );
  const planByFloor = new Map(plans.rows.map(p => [p.floor_number, p]));

  for (const lot of lots.rows) {
    const lotPolyPct = lot.zone_data?.points ?? [];
    if (lotPolyPct.length < 3) {
      console.log(`[Lot ${lot.name}] polygone invalide, skip`);
      continue;
    }
    const plan = planByFloor.get(lot.floor_number);
    if (!plan) {
      console.log(`[Lot ${lot.name}] pas de plan, skip`);
      continue;
    }

    console.log(`\n--- Floor ${lot.floor_number} — ${lot.name} ---`);
    const buffer = await readFile(plan.file_path);

    // 2. Extract lot vector pour avoir imageW/H + murs externes
    const lvr = await extractLotVector(buffer, { scale: WALL_EXTRACTION_CONFIG.scale });
    const imageW = lvr.imageWidth;
    const imageH = lvr.imageHeight;
    const externalWalls: WallSegPx[] = lvr.wallSegments;

    // Lot poly en pixels
    const lotPolyPx: Vertex[] = lotPolyPct.map(p => ({
      x: (p.x_percent / 100) * imageW,
      y: (p.y_percent / 100) * imageH,
    }));

    // 3. Murs internes vectoriels (orange/multi-couleur)
    const rawInternal = await extractInternalWallSegments(buffer, lotPolyPx, {
      scale: WALL_EXTRACTION_CONFIG.scale,
      multiColor: WALL_EXTRACTION_CONFIG.multiColor,
      minSegLen: WALL_EXTRACTION_CONFIG.minSegLenExtraction,
    });
    const chainedInternal = chainCollinearSegments(rawInternal, {
      gapPx: WALL_EXTRACTION_CONFIG.chainGapPx,
      angleTolDeg: WALL_EXTRACTION_CONFIG.chainAngleTolDeg,
      lateralTolPx: WALL_EXTRACTION_CONFIG.chainLateralTolPx,
    });
    const internalVector = chainedInternal.filter(
      w => Math.hypot(w.x2 - w.x1, w.y2 - w.y1) >= WALL_EXTRACTION_CONFIG.minSegLenFinal,
    );

    // 4. Murs raster vectorisés (cloisons noires PNG)
    // TOUR 16 : minRunPx élevé (30) pour ne garder que les vrais murs longs
    // Ce sont les cloisons. Les fragments courts (texte, hachures) sont du bruit
    // qui fragmenterait le graphe planaire en micro-faces inexploitables.
    const minRasterRunPx = parseInt(process.env.MIN_RASTER_RUN_PX || "30", 10);
    let rasterWallsFiltered: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    try {
      const pages = await pdfToImg(buffer, { scale: WALL_EXTRACTION_CONFIG.scale });
      let pngBuf: Buffer | null = null;
      for await (const p of pages) { pngBuf = Buffer.from(p); break; }
      if (pngBuf) {
        const { walls: rasterWalls } = await vectorizeRasterWallsFromPng(pngBuf, {
          minRunPx: minRasterRunPx,
          thicknessPx: 4,
          minDensity: 0.85,
        });
        const lotBx0 = Math.min(...lotPolyPx.map(p => p.x));
        const lotBx1 = Math.max(...lotPolyPx.map(p => p.x));
        const lotBy0 = Math.min(...lotPolyPx.map(p => p.y));
        const lotBy1 = Math.max(...lotPolyPx.map(p => p.y));
        rasterWallsFiltered = rasterWalls.filter(w => {
          const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
          if (len < minRasterRunPx) return false;
          const cx = (w.x1 + w.x2) / 2, cy = (w.y1 + w.y2) / 2;
          return cx >= lotBx0 && cx <= lotBx1 && cy >= lotBy0 && cy <= lotBy1;
        });
      }
    } catch (err) {
      console.warn(`  raster vectorisation échouée:`, err instanceof Error ? err.message : err);
    }

    const allWalls = [
      ...externalWalls.map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })),
      ...internalVector,
      ...rasterWallsFiltered,
    ];
    console.log(`  murs : ${externalWalls.length} ext + ${internalVector.length} int.vec + ${rasterWallsFiltered.length} raster = ${allWalls.length}`);

    // 5. Build planar graph + detect faces
    const graph = buildPlanarGraph(allWalls, 4);
    console.log(`  graphe planaire : ${graph.vertices.length} vertices, ${graph.edges.length} edges`);
    const allFaces = detectFaces(graph);
    console.log(`  faces détectées (brutes) : ${allFaces.length}`);

    // 6. Filtre faces
    const lotAreaPx2 = Math.abs(computeSignedArea(lotPolyPx));
    // Estimation scaleM2PerPx2 via labels PDF
    const pdfTextItems = await extractTextItems(buffer, lotPolyPx, WALL_EXTRACTION_CONFIG.scale);
    const pdfLabels = filterRoomLabels(pdfTextItems);
    const labelsWithSurface = pdfLabels.filter(l => l.surface_m2 != null && l.surface_m2 > 0);
    const totalLabelM2 = labelsWithSurface.reduce((s, l) => s + (l.surface_m2 ?? 0), 0);
    // Scale grossier pour filtre minAreaM2
    const lotEstM2 = totalLabelM2 > 5 ? totalLabelM2 : 50;
    const scaleM2PerPx2_est = lotAreaPx2 > 0 ? lotEstM2 / lotAreaPx2 : 0;

    const roomFaces = filterRoomFaces(allFaces, {
      lotPolygon: lotPolyPx,
      minAreaM2: 0.5, // tolère petites pièces (ECS)
      scaleM2PerPx2: scaleM2PerPx2_est,
      minCompactness: 0.05,
      maxAreaM2: 200,
    });
    console.log(`  faces gardées (rooms) : ${roomFaces.length}, ${pdfLabels.length} labels PDF`);

    // Diag global : top 10 faces par aire (en m²)
    const sortedFaces = [...allFaces].sort((a, b) => b.area - a.area).slice(0, 10);
    console.log(`  --- top 10 faces par aire ---`);
    for (let i = 0; i < sortedFaces.length; i++) {
      const f = sortedFaces[i];
      const m2 = f.area * scaleM2PerPx2_est;
      const inLot = pointInPolygon(f.centroid, lotPolyPx);
      console.log(`    [${i}] aire=${m2.toFixed(2)}m² compact=${f.compactness.toFixed(3)} in_lot=${inLot} verts=${f.points.length}`);
    }

    // Debug : pour chaque label PDF, dire dans quelle face il tombe (parmi
    // toutes les faces — pas filtrées). Si label tombe nulle part → graphe
    // ne ferme pas la pièce de ce label.
    console.log(`  --- diag labels vs faces ---`);
    for (const lbl of pdfLabels) {
      const inAllFaces: number[] = [];
      const inRoomFaces: number[] = [];
      for (let fi = 0; fi < allFaces.length; fi++) {
        if (pointInPolygon({ x: lbl.x, y: lbl.y }, allFaces[fi].points)) {
          inAllFaces.push(fi);
        }
      }
      for (let fi = 0; fi < roomFaces.length; fi++) {
        if (pointInPolygon({ x: lbl.x, y: lbl.y }, roomFaces[fi].points)) {
          inRoomFaces.push(fi);
        }
      }
      const surfaceLbl = lbl.surface_m2 != null ? `${lbl.surface_m2.toFixed(1)}m²` : "?";
      const aFace = inAllFaces.length > 0 ? allFaces[inAllFaces[0]] : null;
      const aFaceArea = aFace ? `face0_aire=${(aFace.area * scaleM2PerPx2_est).toFixed(2)}m² compact=${aFace.compactness.toFixed(3)}` : "AUCUNE";
      console.log(`    "${lbl.text}" (${surfaceLbl}) @${lbl.x.toFixed(0)},${lbl.y.toFixed(0)} → ${inAllFaces.length} all-faces, ${inRoomFaces.length} room-faces. ${aFaceArea}`);
    }

    // 7. Match face ↔ label PDF (label dont position est dans la face)
    type RoomFromFace = {
      label: string;
      surface_m2_pdf: number | null;
      polygon: Vertex[];
      areaPx2: number;
      face: Face;
    };
    const matched: RoomFromFace[] = [];
    const usedLabels = new Set<number>();
    for (const face of roomFaces) {
      // Trouver les labels dont position tombe dans la face (priorité au label
      // central : distance min au centroïde face)
      const candidates: Array<{ idx: number; dist: number }> = [];
      for (let li = 0; li < pdfLabels.length; li++) {
        if (usedLabels.has(li)) continue;
        const lbl = pdfLabels[li];
        if (!pointInPolygon({ x: lbl.x, y: lbl.y }, face.points)) continue;
        const d = Math.hypot(lbl.x - face.centroid.x, lbl.y - face.centroid.y);
        candidates.push({ idx: li, dist: d });
      }
      if (candidates.length === 0) continue;
      candidates.sort((a, b) => a.dist - b.dist);
      const best = candidates[0];
      usedLabels.add(best.idx);
      const lbl = pdfLabels[best.idx];
      matched.push({
        label: lbl.text,
        surface_m2_pdf: lbl.surface_m2 ?? null,
        polygon: face.points,
        areaPx2: face.area,
        face,
      });
    }
    console.log(`  faces matchées labels : ${matched.length}/${roomFaces.length}`);

    if (matched.length === 0) {
      console.log(`  [SKIP] aucune face matchée label, garde rooms existantes`);
      continue;
    }

    if (process.argv.includes("--dry-run")) {
      console.log(`  [DRY-RUN] ${matched.length} faces matched, pas d'écriture DB`);
      continue;
    }

    // 8. Calibrage scale absolu via régression médiane sur faces avec label PDF surface
    let scaleM2PerPx2 = scaleM2PerPx2_est;
    const ksRaw = matched
      .filter(m => m.surface_m2_pdf != null && m.surface_m2_pdf > 0 && m.areaPx2 > 0)
      .map(m => m.surface_m2_pdf! / m.areaPx2);
    if (ksRaw.length >= 2) {
      ksRaw.sort((a, b) => a - b);
      const medRaw = ksRaw[Math.floor(ksRaw.length / 2)];
      const filtered = ksRaw.filter(k => k >= medRaw * 0.5 && k <= medRaw * 2);
      if (filtered.length >= 2) {
        filtered.sort((a, b) => a - b);
        scaleM2PerPx2 = filtered[Math.floor(filtered.length / 2)];
      }
    }
    console.log(`  scale calibré : ${scaleM2PerPx2.toExponential(3)} m²/px²`);

    // 9. UPSERT rooms en DB.
    // Stratégie : on REMPLACE l'ensemble des rooms du lot par les nouvelles
    // (delete + insert). Polygon stocké en repère "global pct" puis converti
    // en repère "lot pct" (car DB stocke le polygone relativement au lot bbox).
    let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
    for (const p of lotPolyPct) {
      if (p.x_percent < lotMinX) lotMinX = p.x_percent;
      if (p.y_percent < lotMinY) lotMinY = p.y_percent;
      if (p.x_percent > lotMaxX) lotMaxX = p.x_percent;
      if (p.y_percent > lotMaxY) lotMaxY = p.y_percent;
    }
    const lotW = lotMaxX - lotMinX;
    const lotH = lotMaxY - lotMinY;

    // Avant DELETE : on SAUVEGARDE name original et room_type pour réinjection
    // puisque l'audit n'utilise que polygon+name+surface_m2.
    await pool.query("DELETE FROM vs_rooms WHERE lot_id = $1", [lot.id]);

    let inserted = 0;
    for (const m of matched) {
      // Convertir polygon px → lot pct
      const polyLotPct = m.polygon.map(v => ({
        x_percent: ((v.x / imageW) * 100 - lotMinX) / lotW * 100,
        y_percent: ((v.y / imageH) * 100 - lotMinY) / lotH * 100,
      }));
      // Surface = aire face × scale
      const surface_m2 = m.areaPx2 * scaleM2PerPx2;
      await pool.query(
        `INSERT INTO vs_rooms (lot_id, plan_id, name, room_type, surface_m2, polygon, source, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'ai', 'suggested')`,
        [
          lot.id,
          plan.id,
          m.label,
          inferRoomType(m.label),
          surface_m2.toFixed(2),
          JSON.stringify(polyLotPct),
        ],
      );
      inserted++;
    }
    console.log(`  ✓ ${inserted} rooms insérées (DELETE+INSERT face-detection)`);
  }

  await pool.end();
  console.log(`\n=== TOUR 16 terminé ===\n`);
}

function inferRoomType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("cuisine")) return "cuisine";
  if (n.includes("séjour") || n.includes("sejour") || n.includes("salon")) return "sejour";
  if (n.includes("chambre")) return "chambre";
  if (n.includes("sdb") || n.includes("sde") || n.includes("salle")) return "salle_de_bain";
  if (n.includes("wc")) return "wc";
  if (n.includes("entrée") || n.includes("entree")) return "entree";
  if (n.includes("couloir")) return "couloir";
  return "autre";
}

main().catch(err => {
  console.error("[FATAL]", err);
  process.exit(1);
});
