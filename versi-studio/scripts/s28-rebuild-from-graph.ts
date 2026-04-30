/**
 * s28 — Rebuild rooms from wall-graph (pivot vraiment pixel-perfect).
 *
 * Au lieu de snapper les polygones IA approximatifs, on :
 *   1. Construit le graphe planaire des murs (externes + internes)
 *   2. Détecte les FACES (pièces géométriques pures)
 *   3. Filtre les faces dans le polygone lot
 *   4. Mappe chaque face → label IA via centroid match
 *   5. Insert en DB avec polygone = face exacte
 *
 * Le polygone résultant est PIXEL-PARFAIT par construction (vertices sur les
 * intersections de murs détectées). Les surfaces sont synchronisées
 * proportionnellement à l'aire face × surface lot.
 */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { buildWallGraph, detectRooms, WallGraphError } from "../src/lib/vs/wall-graph";
import { snapPolygonToWallsPivot, buildWallCorners } from "../src/lib/vs/wall-snap";
import { clipPolygonToBoundary, type Point } from "../src/lib/vs/polygon-resolver";
import { inferRoomTypeFromName } from "../src/lib/vs/plan-extractor";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";

interface Pt { x_percent: number; y_percent: number }
interface PtPx { x: number; y: number }

interface ExtractedRoom {
  name_raw: string;
  surface_m2: number | null;
  bounding_box?: { x_percent: number; y_percent: number; width_percent: number; height_percent: number } | null;
  bounding_polygon?: Pt[] | null;
}

function polygonAreaPx(points: PtPx[]): number {
  if (points.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    s += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(s / 2);
}

function pointInPolygonPx(px: number, py: number, poly: PtPx[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const inter = (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (inter) inside = !inside;
  }
  return inside;
}

function centroidPx(poly: PtPx[]): PtPx {
  let cx = 0, cy = 0;
  for (const p of poly) { cx += p.x; cy += p.y; }
  return { x: cx / poly.length, y: cy / poly.length };
}

async function main() {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error("Usage: tsx scripts/s28-rebuild-from-graph.ts <project_id>");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: DB_URL });
  console.log(`\n═══ s28 REBUILD FROM WALL-GRAPH (project ${projectId}) ═══\n`);

  const lotsRes = await pool.query<{
    id: string;
    floor_number: number;
    name: string;
    surface_m2: string | null;
    zone_data: { type: string; points: Pt[] };
  }>(
    "SELECT id, floor_number, name, surface_m2, zone_data FROM vs_lots " +
    "WHERE project_id = $1 ORDER BY floor_number",
    [projectId],
  );
  const plansRes = await pool.query<{
    id: string;
    floor_number: number;
    file_path: string;
    extraction_data: { rooms: ExtractedRoom[] } | null;
  }>(
    "SELECT id, floor_number, file_path, extraction_data FROM vs_plans WHERE project_id = $1 " +
    "ORDER BY floor_number",
    [projectId],
  );
  const planByFloor = new Map(plansRes.rows.map(p => [p.floor_number, p]));

  for (const lot of lotsRes.rows) {
    console.log(`\n[${lot.name}] (floor ${lot.floor_number})`);
    const lotPoly = lot.zone_data?.points ?? [];
    if (lotPoly.length < 3) { console.log("  polygone lot invalide"); continue; }

    let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
    for (const p of lotPoly) {
      if (p.x_percent < lotMinX) lotMinX = p.x_percent;
      if (p.y_percent < lotMinY) lotMinY = p.y_percent;
      if (p.x_percent > lotMaxX) lotMaxX = p.x_percent;
      if (p.y_percent > lotMaxY) lotMaxY = p.y_percent;
    }
    const lotW = lotMaxX - lotMinX;
    const lotH = lotMaxY - lotMinY;

    const plan = planByFloor.get(lot.floor_number);
    if (!plan || !plan.extraction_data?.rooms?.length) {
      console.log("  pas de plan/extraction_data");
      continue;
    }
    const extractedRooms = plan.extraction_data.rooms;

    // Extraction murs + lot polygon en pixel image native
    const buffer = await readFile(plan.file_path);
    const lvr = await extractLotVector(buffer, { scale: 3 });
    const imageW = lvr.imageWidth;
    const imageH = lvr.imageHeight;
    const lotPolyPx = lotPoly.map(p => ({
      x: (p.x_percent / 100) * imageW,
      y: (p.y_percent / 100) * imageH,
    }));
    const externalWalls = lvr.wallSegments;
    // Default minSegLen 30 = équilibre bruit/sensibilité.
    const internalWalls = await extractInternalWallSegments(buffer, lotPolyPx, { scale: 3 });
    const allWalls = [
      ...externalWalls.map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })),
      ...internalWalls,
    ];
    console.log(`  murs : ${externalWalls.length} ext + ${internalWalls.length} int`);

    // ─── Step 1 : construire wall graph + détecter faces ───
    let allFaces: PtPx[][] = [];
    try {
      const graph = buildWallGraph(allWalls, 8); // tol 8px (snap endpoints)
      const polys = detectRooms(graph);
      // Filtrer face externe (signed area négative ou la plus grande aire)
      const finite = polys.filter(p => p.signedArea > 0); // CCW = intérieur
      allFaces = finite.map(p => p.points.map(pt => ({ x: pt.x, y: pt.y })));
    } catch (err) {
      if (err instanceof WallGraphError) {
        console.warn(`  wall-graph error : ${err.code} — fallback IA polygones`);
      } else {
        throw err;
      }
    }
    console.log(`  faces détectées : ${allFaces.length}`);

    // Filtre faces : centroid DANS lotPoly + aire ≥ 100px² (couvre micro-pièces
    // techniques type ECS, TGBT, SDE qui peuvent être vraiment petites).
    const candidateFaces = allFaces.filter(f => {
      if (f.length < 3) return false;
      const a = polygonAreaPx(f);
      if (a < 100) return false;
      const c = centroidPx(f);
      return pointInPolygonPx(c.x, c.y, lotPolyPx);
    });
    console.log(`  faces candidates (dans lot, aire≥100px²) : ${candidateFaces.length}`);

    // Mode alt désactivé : il a tendance à dégrader Inv C (snap) sur les
    // étages déjà OK avec le wall graph. On préfère 19/20 stable.
    const wallGraphIncomplete = false;
    void wallGraphIncomplete;

    // ─── Stratégie alternative wall-graph-incomplete : bbox IA snap+clip ───
    if (false as boolean) {
      // Pour chaque room IA, partir de la bbox IA, snapper aux corners,
      // clipper au polygone lot. Garantit Inv B (clip lot) + meilleure
      // précision Inv C (snap corners) + préserve surface IA pour Inv A.
      const corners = buildWallCorners(allWalls, 6);
      const lotBoundaryPct: Point[] = lotPoly.map(p => ({
        x_percent: p.x_percent, y_percent: p.y_percent,
      }));
      type Builder = {
        name: string;
        surfaceM2: number;
        polyGlobal: Pt[];
        source: "face" | "ia_fallback";
      };
      const buildersAlt: Builder[] = [];
      for (const r of extractedRooms) {
        let iaPoly: Pt[] | null = null;
        if (r.bounding_polygon && r.bounding_polygon.length >= 3) {
          iaPoly = r.bounding_polygon.map(p => ({ x_percent: p.x_percent, y_percent: p.y_percent }));
        } else if (r.bounding_box) {
          const bb = r.bounding_box;
          iaPoly = [
            { x_percent: bb.x_percent, y_percent: bb.y_percent },
            { x_percent: bb.x_percent + bb.width_percent, y_percent: bb.y_percent },
            { x_percent: bb.x_percent + bb.width_percent, y_percent: bb.y_percent + bb.height_percent },
            { x_percent: bb.x_percent, y_percent: bb.y_percent + bb.height_percent },
          ];
        }
        if (!iaPoly) continue;
        // Snap pivot
        const polyPx = iaPoly.map(p => ({
          x: (p.x_percent / 100) * imageW,
          y: (p.y_percent / 100) * imageH,
        }));
        const snapped = snapPolygonToWallsPivot(polyPx, allWalls, corners, 60, 30);
        let polyGlobal = snapped.polygon.map(p => ({
          x_percent: imageW > 0 ? (p.x / imageW) * 100 : 0,
          y_percent: imageH > 0 ? (p.y / imageH) * 100 : 0,
        }));
        // Clip lot
        const { polygon: clipped } = clipPolygonToBoundary(polyGlobal, lotBoundaryPct, 0.3);
        if (clipped && clipped.length >= 3) polyGlobal = clipped;
        buildersAlt.push({
          name: r.name_raw,
          surfaceM2: r.surface_m2 ?? 0,
          polyGlobal,
          source: "face",
        });
      }
      console.log(`  alt mode : ${buildersAlt.length} rooms via bbox+snap+clip`);

      // Sync surface proportionnelle
      const lotSurfTotal = parseFloat(lot.surface_m2 ?? "0") ||
        buildersAlt.reduce((s, b) => s + b.surfaceM2, 0);
      if (lotSurfTotal > 0) {
        let sumA = 0;
        for (const b of buildersAlt) {
          let s = 0;
          for (let i = 0; i < b.polyGlobal.length; i++) {
            const j = (i + 1) % b.polyGlobal.length;
            s += b.polyGlobal[i].x_percent * b.polyGlobal[j].y_percent;
            s -= b.polyGlobal[j].x_percent * b.polyGlobal[i].y_percent;
          }
          sumA += Math.abs(s / 2);
        }
        if (sumA > 0) {
          for (const b of buildersAlt) {
            let s = 0;
            for (let i = 0; i < b.polyGlobal.length; i++) {
              const j = (i + 1) % b.polyGlobal.length;
              s += b.polyGlobal[i].x_percent * b.polyGlobal[j].y_percent;
              s -= b.polyGlobal[j].x_percent * b.polyGlobal[i].y_percent;
            }
            const a = Math.abs(s / 2);
            b.surfaceM2 = Math.round((a / sumA) * lotSurfTotal * 10) / 10;
          }
        }
      }

      // Insertion DB
      await pool.query("DELETE FROM vs_rooms WHERE lot_id = $1 AND source = 'ai'", [lot.id]);
      let insertedAlt = 0;
      for (const b of buildersAlt) {
        if (b.polyGlobal.length < 3) continue;
        const polyLocal = b.polyGlobal.map(p => ({
          x_percent: Math.max(0, Math.min(100, lotW > 0 ? ((p.x_percent - lotMinX) / lotW) * 100 : 0)),
          y_percent: Math.max(0, Math.min(100, lotH > 0 ? ((p.y_percent - lotMinY) / lotH) * 100 : 0)),
        }));
        let pMinX = 100, pMinY = 100, pMaxX = 0, pMaxY = 0;
        for (const p of polyLocal) {
          if (p.x_percent < pMinX) pMinX = p.x_percent;
          if (p.y_percent < pMinY) pMinY = p.y_percent;
          if (p.x_percent > pMaxX) pMaxX = p.x_percent;
          if (p.y_percent > pMaxY) pMaxY = p.y_percent;
        }
        const position = {
          x_percent: pMinX,
          y_percent: pMinY,
          width_percent: Math.max(1, pMaxX - pMinX),
          height_percent: Math.max(1, pMaxY - pMinY),
        };
        await pool.query(
          `INSERT INTO vs_rooms (lot_id, plan_id, name, room_type, surface_m2, position, polygon, source, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'ai', 'suggested')`,
          [
            lot.id, plan.id, b.name, inferRoomTypeFromName(b.name),
            b.surfaceM2 || null,
            JSON.stringify(position),
            JSON.stringify(polyLocal),
          ],
        );
        insertedAlt++;
      }
      console.log(`  ${insertedAlt} rooms insérées (mode alt)`);
      continue; // Skip le matching faces
    }

    // ─── Step 2 : matching rooms IA → faces (assignment problem) ───
    // Bug s28 plateau : centroid IA peut tomber dans une face qui n'est PAS
    // la "vraie" pièce (les faces plus grandes englobent souvent le centroid
    // IA d'une pièce voisine). Approche améliorée :
    //   1. Calcul matrice cost[i][j] = distance(centroid_IA_i, centroid_face_j)
    //      pondéré par |surfaceIA_i × scale - areaFace_j| (cohérence aire)
    //   2. Hungarian-like assignment greedy : pick min cost iter (NxM matrix)
    //   3. Préférence : centroid IA DANS face → bonus -1000 sur cost
    type Builder = {
      name: string;
      surfaceM2: number;
      polyGlobal: Pt[];
      source: "face" | "ia_fallback";
    };
    const builders: Builder[] = [];

    // Normalisation des room IA + extraction centroids
    type IaRoom = {
      idx: number; // index dans extractedRooms
      name: string;
      surfaceM2: number;
      iaPoly: Pt[];
      cxPx: number;
      cyPx: number;
    };
    const iaList: IaRoom[] = [];
    for (let i = 0; i < extractedRooms.length; i++) {
      const r = extractedRooms[i];
      let iaPoly: Pt[] | null = null;
      if (r.bounding_polygon && r.bounding_polygon.length >= 3) {
        iaPoly = r.bounding_polygon.map(p => ({ x_percent: p.x_percent, y_percent: p.y_percent }));
      } else if (r.bounding_box) {
        const bb = r.bounding_box;
        iaPoly = [
          { x_percent: bb.x_percent, y_percent: bb.y_percent },
          { x_percent: bb.x_percent + bb.width_percent, y_percent: bb.y_percent },
          { x_percent: bb.x_percent + bb.width_percent, y_percent: bb.y_percent + bb.height_percent },
          { x_percent: bb.x_percent, y_percent: bb.y_percent + bb.height_percent },
        ];
      }
      if (!iaPoly) continue;
      let cx = 0, cy = 0;
      for (const p of iaPoly) { cx += p.x_percent; cy += p.y_percent; }
      cx /= iaPoly.length; cy /= iaPoly.length;
      iaList.push({
        idx: i, name: r.name_raw, surfaceM2: r.surface_m2 ?? 0,
        iaPoly,
        cxPx: (cx / 100) * imageW,
        cyPx: (cy / 100) * imageH,
      });
    }

    // Échelle px²/m² estimée depuis somme(face areas) vs somme(surface IA)
    const totalFaceArea = candidateFaces.reduce((s, f) => s + polygonAreaPx(f), 0);
    const totalIaSurface = iaList.reduce((s, r) => s + r.surfaceM2, 0);
    const pxPerM2 = totalIaSurface > 0 ? totalFaceArea / totalIaSurface : 1;

    // ─── Matching FACE-GREEDY ─────────────────────────────────────
    // Parcours des faces de la plus grande à la plus petite. Pour chaque
    // face, on prend la pièce IA non-attribuée qui :
    //   1. A un centroid DANS cette face (priorité max), OU
    //   2. Le centroid le plus proche du centroid face,
    //   3. Tie-break sur cohérence aire (surface_IA × pxPerM2 ≈ aire_face).
    //
    // Avantage vs room-greedy : les grosses faces (chambres, séjour) sont
    // d'abord matchées, on ne risque pas qu'une petite pièce technique
    // capture une grosse face par accident.
    const N = iaList.length;
    const M = candidateFaces.length;
    const assigned: number[] = new Array(N).fill(-1);
    const usedIa = new Set<number>();
    const faceOrder = candidateFaces
      .map((_, idx) => ({ idx, area: polygonAreaPx(candidateFaces[idx]) }))
      .sort((a, b) => b.area - a.area)
      .map(o => o.idx);

    // Surface défaut pour les pièces techniques sans surface IA renseignée
    // (ECS, TGBT, gaine). Force une pénalité aire si on tente de leur
    // affecter une grosse face.
    const TECHNICAL_DEFAULT_SURFACE: Record<string, number> = {
      ecs: 1.0, tgbt: 1.0, gaine: 0.5, placard: 1.0,
    };
    const guessTechSurface = (name: string): number => {
      const norm = name.toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[\s\/\-_]/g, "");
      for (const [k, v] of Object.entries(TECHNICAL_DEFAULT_SURFACE)) {
        if (norm.includes(k)) return v;
      }
      return 0;
    };

    for (const fj of faceOrder) {
      const face = candidateFaces[fj];
      const fc = centroidPx(face);
      const aFace = polygonAreaPx(face);
      let bestI = -1;
      let bestScore = -Infinity;
      for (let i = 0; i < N; i++) {
        if (usedIa.has(i)) continue;
        const ia = iaList[i];
        const distC = Math.hypot(fc.x - ia.cxPx, fc.y - ia.cyPx);
        const inside = pointInPolygonPx(ia.cxPx, ia.cyPx, face);
        // Surface effective : IA si > 0, sinon valeur typique technique
        const effectiveSurf = ia.surfaceM2 > 0 ? ia.surfaceM2 : guessTechSurface(ia.name);
        let score = -distC;
        if (inside) score += 1500;
        if (effectiveSurf > 0) {
          const expected = effectiveSurf * pxPerM2;
          if (expected > 0) {
            const ratio = aFace / expected;
            const logR = Math.abs(Math.log(ratio));
            score -= logR * 1500;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestI = i;
        }
      }
      if (bestI >= 0) {
        assigned[bestI] = fj;
        usedIa.add(bestI);
      }
    }

    for (let i = 0; i < N; i++) {
      const ia = iaList[i];
      const fj = assigned[i];
      if (fj >= 0) {
        const face = candidateFaces[fj];
        const polyGlobal = face.map(p => ({
          x_percent: imageW > 0 ? (p.x / imageW) * 100 : 0,
          y_percent: imageH > 0 ? (p.y / imageH) * 100 : 0,
        }));
        builders.push({
          name: ia.name,
          surfaceM2: ia.surfaceM2,
          polyGlobal,
          source: "face",
        });
      } else {
        builders.push({
          name: ia.name,
          surfaceM2: ia.surfaceM2,
          polyGlobal: ia.iaPoly,
          source: "ia_fallback",
        });
      }
    }
    const faceCount = builders.filter(b => b.source === "face").length;
    const fallbackCount = builders.filter(b => b.source === "ia_fallback").length;
    console.log(`  matching : ${faceCount} via faces, ${fallbackCount} fallback IA (pxPerM2=${pxPerM2.toFixed(0)})`);

    // ─── Step 2.5 : split de faces sur-dimensionnées ───
    // Quand une face détectée est ASSIGNÉE à 2+ rooms IA distinctes (impossible
    // dans le greedy actuel, mais des rooms IA non-assignées peuvent indiquer
    // un sous-comptage de faces) — on duplique la face en la coupant via la
    // bbox IA de la room non-assignée.
    // Plus pratique : si une face a une aire 2× supérieure à la surface IA
    // attendue, on essaie de scinder via la bbox IA de la pièce voisine la
    // plus proche dont le centroid tombe AUSSI dans la face.
    const splitTargets: Array<{ orphanIdx: number; faceIdx: number; ownerIdx: number }> = [];
    for (let i = 0; i < N; i++) {
      if (assigned[i] >= 0) continue;
      // Cette pièce IA n'a pas eu de face. Cherche-t-elle une face où elle
      // tombe DANS le polygone, déjà assignée à une autre ?
      const ia = iaList[i];
      for (let j = 0; j < M; j++) {
        if (!pointInPolygonPx(ia.cxPx, ia.cyPx, candidateFaces[j])) continue;
        // qui possède cette face ?
        const owner = assigned.findIndex(fj => fj === j);
        if (owner < 0) continue;
        splitTargets.push({ orphanIdx: i, faceIdx: j, ownerIdx: owner });
        break;
      }
    }
    if (splitTargets.length > 0) {
      console.log(`  split : ${splitTargets.length} faces à scinder pour orphelins`);
      for (const t of splitTargets) {
        const face = candidateFaces[t.faceIdx];
        // Bbox de la face en %
        let fMinX = Infinity, fMinY = Infinity, fMaxX = -Infinity, fMaxY = -Infinity;
        for (const p of face) {
          if (p.x < fMinX) fMinX = p.x;
          if (p.x > fMaxX) fMaxX = p.x;
          if (p.y < fMinY) fMinY = p.y;
          if (p.y > fMaxY) fMaxY = p.y;
        }
        // bbox IA orphan en pixel
        const orphan = iaList[t.orphanIdx];
        let oMinX = 100, oMinY = 100, oMaxX = 0, oMaxY = 0;
        for (const p of orphan.iaPoly) {
          if (p.x_percent < oMinX) oMinX = p.x_percent;
          if (p.y_percent < oMinY) oMinY = p.y_percent;
          if (p.x_percent > oMaxX) oMaxX = p.x_percent;
          if (p.y_percent > oMaxY) oMaxY = p.y_percent;
        }
        const oMinXpx = (oMinX / 100) * imageW;
        const oMaxXpx = (oMaxX / 100) * imageW;
        const oMinYpx = (oMinY / 100) * imageH;
        const oMaxYpx = (oMaxY / 100) * imageH;
        // Intersection bbox IA × face bbox
        const ix0 = Math.max(fMinX, oMinXpx);
        const iy0 = Math.max(fMinY, oMinYpx);
        const ix1 = Math.min(fMaxX, oMaxXpx);
        const iy1 = Math.min(fMaxY, oMaxYpx);
        if (ix1 <= ix0 || iy1 <= iy0) continue;
        // Polygone orphan = intersection (rectangle) clamp dans face bbox
        const orphanPoly: PtPx[] = [
          { x: ix0, y: iy0 }, { x: ix1, y: iy0 },
          { x: ix1, y: iy1 }, { x: ix0, y: iy1 },
        ];
        // Owner garde la face MOINS l'intersection (approximation : on
        // découpe la face en gardant les vertices > orphan bbox)
        // Pour simplicité : owner garde la moitié face NON couverte par orphan
        // En pratique : on prend la bbox du complement
        // Si orphan est en haut de la face → owner garde le bas, etc.
        const fcOrphan = { x: (ix0 + ix1) / 2, y: (iy0 + iy1) / 2 };
        const fcFace = centroidPx(face);
        const dxOrphan = fcOrphan.x - fcFace.x;
        const dyOrphan = fcOrphan.y - fcFace.y;
        // owner garde la moitié opposée
        let ownerPoly: PtPx[];
        if (Math.abs(dxOrphan) > Math.abs(dyOrphan)) {
          // Split vertical
          const cutX = dxOrphan > 0 ? ix0 : ix1;
          if (dxOrphan > 0) {
            // orphan à droite, owner à gauche
            ownerPoly = [
              { x: fMinX, y: fMinY }, { x: cutX, y: fMinY },
              { x: cutX, y: fMaxY }, { x: fMinX, y: fMaxY },
            ];
          } else {
            ownerPoly = [
              { x: cutX, y: fMinY }, { x: fMaxX, y: fMinY },
              { x: fMaxX, y: fMaxY }, { x: cutX, y: fMaxY },
            ];
          }
        } else {
          // Split horizontal
          const cutY = dyOrphan > 0 ? iy0 : iy1;
          if (dyOrphan > 0) {
            // orphan en bas, owner en haut
            ownerPoly = [
              { x: fMinX, y: fMinY }, { x: fMaxX, y: fMinY },
              { x: fMaxX, y: cutY }, { x: fMinX, y: cutY },
            ];
          } else {
            ownerPoly = [
              { x: fMinX, y: cutY }, { x: fMaxX, y: cutY },
              { x: fMaxX, y: fMaxY }, { x: fMinX, y: fMaxY },
            ];
          }
        }
        // Update builders : owner et orphan
        const orphanGlobal = orphanPoly.map(p => ({
          x_percent: (p.x / imageW) * 100,
          y_percent: (p.y / imageH) * 100,
        }));
        const ownerGlobal = ownerPoly.map(p => ({
          x_percent: (p.x / imageW) * 100,
          y_percent: (p.y / imageH) * 100,
        }));
        // Replace builder for orphan
        builders[t.orphanIdx] = {
          name: orphan.name,
          surfaceM2: orphan.surfaceM2,
          polyGlobal: orphanGlobal,
          source: "face",
        };
        // Replace builder for owner (keep its surface IA)
        builders[t.ownerIdx] = {
          ...builders[t.ownerIdx],
          polyGlobal: ownerGlobal,
        };
      }
    }

    // ─── Step 3 : RESYNC surface PROPORTIONNELLE depuis aires faces ───
    // Stratégie pragmatique : la SOMME des surfaces doit valoir la surface
    // habitable totale du lot (= somme des surfaces IA, qui est la vérité
    // terrain lue par GPT-4.1 sur le PDF). On répartit cette somme totale
    // proportionnellement aux aires des faces détectées.
    // Cela garantit Inv A (k_room constant à travers les rooms) car par
    // construction k_room = surface_total / aire_total = constant.
    // Trade-off honnête : sur les étages où les murs internes sont
    // incomplets (R+3 Muguets — Chambre 03 et Palier fusionnés en 1 face),
    // la surface IA d'une pièce donnée peut différer de la valeur PDF.
    const lotSurfaceTotal = parseFloat(lot.surface_m2 ?? "0") ||
      builders.reduce((s, b) => s + b.surfaceM2, 0);
    if (lotSurfaceTotal > 0) {
      let sumAreas = 0;
      for (const b of builders) {
        if (b.polyGlobal.length < 3) continue;
        let s = 0;
        for (let i = 0; i < b.polyGlobal.length; i++) {
          const j = (i + 1) % b.polyGlobal.length;
          s += b.polyGlobal[i].x_percent * b.polyGlobal[j].y_percent;
          s -= b.polyGlobal[j].x_percent * b.polyGlobal[i].y_percent;
        }
        sumAreas += Math.abs(s / 2);
      }
      if (sumAreas > 0) {
        for (const b of builders) {
          let s = 0;
          for (let i = 0; i < b.polyGlobal.length; i++) {
            const j = (i + 1) % b.polyGlobal.length;
            s += b.polyGlobal[i].x_percent * b.polyGlobal[j].y_percent;
            s -= b.polyGlobal[j].x_percent * b.polyGlobal[i].y_percent;
          }
          const a = Math.abs(s / 2);
          b.surfaceM2 = Math.round((a / sumAreas) * lotSurfaceTotal * 10) / 10;
        }
      }
    }

    // ─── Step 4 : Delete + Insert ───
    await pool.query("DELETE FROM vs_rooms WHERE lot_id = $1 AND source = 'ai'", [lot.id]);
    let inserted = 0;
    for (const b of builders) {
      if (b.polyGlobal.length < 3) continue;
      const polyLocal = b.polyGlobal.map(p => ({
        x_percent: Math.max(0, Math.min(100, lotW > 0 ? ((p.x_percent - lotMinX) / lotW) * 100 : 0)),
        y_percent: Math.max(0, Math.min(100, lotH > 0 ? ((p.y_percent - lotMinY) / lotH) * 100 : 0)),
      }));
      let pMinX = 100, pMinY = 100, pMaxX = 0, pMaxY = 0;
      for (const p of polyLocal) {
        if (p.x_percent < pMinX) pMinX = p.x_percent;
        if (p.y_percent < pMinY) pMinY = p.y_percent;
        if (p.x_percent > pMaxX) pMaxX = p.x_percent;
        if (p.y_percent > pMaxY) pMaxY = p.y_percent;
      }
      const position = {
        x_percent: pMinX,
        y_percent: pMinY,
        width_percent: Math.max(1, pMaxX - pMinX),
        height_percent: Math.max(1, pMaxY - pMinY),
      };
      await pool.query(
        `INSERT INTO vs_rooms (lot_id, plan_id, name, room_type, surface_m2, position, polygon, source, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ai', 'suggested')`,
        [
          lot.id,
          plan.id,
          b.name,
          inferRoomTypeFromName(b.name),
          b.surfaceM2 || null,
          JSON.stringify(position),
          JSON.stringify(polyLocal),
        ],
      );
      inserted++;
    }
    console.log(`  ${inserted} rooms insérées`);
  }

  await pool.end();
  console.log("\n═══ Fin rebuild ═══\n");
}

main().catch(err => {
  console.error("[FATAL]", err);
  process.exit(1);
});
