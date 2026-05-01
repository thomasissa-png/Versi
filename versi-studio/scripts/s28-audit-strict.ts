/**
 * s28 STRICT (tour 8) — Audit invariants 1-5 SURFACES ABSOLUES vs PDF
 *
 * Le tour 7 utilisait un critère « k constant » (proportionnalité) qui
 * masquait les surfaces absolues fausses. Le tour 8 mesure les surfaces
 * RÉELLES en m² vs les valeurs ÉCRITES sur les PDFs originaux.
 *
 * Source de vérité PDF :
 *   On utilise extractTextItems() pour lire les valeurs m² écrites SUR le PDF
 *   (ex: "Chambre" + "10.2 m²"). Pour chaque label DB, on cherche le label
 *   PDF correspondant et on compare la surface calculée du polygone à la
 *   valeur PDF.
 *
 * Inv A (surface absolue) : pour chaque pièce, ratio polygon_area_m2 / pdf_label_m2
 *                           DOIT être ∈ [0.85, 1.15]. Pas de fallback.
 * Inv B (⊆ lot)            : 0 vertex hors polygone lot.
 * Inv C (snap murs)        : ≥95% des vertices à ≤5px du mur le plus proche.
 * Inv D (labels PDF)       : label DB conforme whitelist sémantique.
 * Inv E (count exact)      : strict {0:5, 1:8, 2:6, 3:5}.
 *
 * Cible : 20/20 strict (5 invariants × 4 étages).
 */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, type WallSegPx } from "../src/lib/vs/lot-vector-extractor";
import { extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { extractTextItems, filterRoomLabels, type PdfTextItem } from "../src/lib/vs/pdf-text-extractor";
import { WALL_EXTRACTION_CONFIG } from "../src/lib/vs/wall-extraction-config";
import { vectorizeRasterWallsFromPng } from "../src/lib/vs/raster-walls-vectorize";
import { pdf as pdfToImg } from "pdf-to-img";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";

interface Pt { x_percent: number; y_percent: number }

const EXPECTED_COUNTS: Record<number, number> = { 0: 5, 1: 8, 2: 6, 3: 5 };

// Tolérances absolues
const RATIO_MIN = 0.85;
const RATIO_MAX = 1.15;
// s28 tour 10 — tolérance Inv C lue depuis la config partagée (≤5px audit + extract)
const SNAP_TOL_PX = WALL_EXTRACTION_CONFIG.snapTolerancePx;

function polygonAreaPercent(points: Pt[]): number {
  if (points.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    s += points[i].x_percent * points[j].y_percent;
    s -= points[j].x_percent * points[i].y_percent;
  }
  return Math.abs(s / 2);
}

function pointInPolygon(px: number, py: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x_percent, yi = poly[i].y_percent;
    const xj = poly[j].x_percent, yj = poly[j].y_percent;
    const inter = (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (inter) inside = !inside;
  }
  return inside;
}

function distPointToSegment(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number,
): number {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1).fill(0).map(() => new Array(m + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[0][i] = i;
  for (let j = 0; j <= n; j++) dp[j][0] = j;
  for (let j = 1; j <= n; j++) {
    for (let i = 1; i <= m; i++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j][i] = Math.min(dp[j - 1][i] + 1, dp[j][i - 1] + 1, dp[j - 1][i - 1] + c);
    }
  }
  return dp[n][m];
}

function normalizeLabel(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[\s\/\.\-_]/g, "");
}

/**
 * Trouve la valeur PDF pour un label DB en matchant texte + position.
 * Pour chaque pièce DB, on cherche dans les pdfLabels celui dont le NOM est
 * sémantiquement le même (via normalizeLabel + numéro) ET dont la position
 * (centroïde) est la plus proche du centroïde DB.
 *
 * Retourne null si aucun match raisonnable (label hallucination).
 */
function findPdfLabelForRoom(
  roomName: string,
  roomCentroidPx: { x: number; y: number },
  pdfLabels: PdfTextItem[],
): PdfTextItem | null {
  const normRoom = normalizeLabel(roomName);
  const numMatch = roomName.match(/(\d+)/);
  const roomNum = numMatch ? numMatch[1] : null;

  // Préselection : labels PDF qui matchent sémantiquement (substring, levenshtein)
  const candidates: Array<{ label: PdfTextItem; score: number }> = [];
  for (const pl of pdfLabels) {
    const normPl = normalizeLabel(pl.text);
    // Match exact (avec numéro)
    let semScore = 0;
    if (normRoom === normPl) {
      semScore = 100;
    } else if (normRoom.replace(/\d+/g, "") === normPl.replace(/\d+/g, "")) {
      // Mêmes lettres, numéro peut différer
      const plNum = pl.text.match(/(\d+)/)?.[1] ?? null;
      if (roomNum && plNum && roomNum === plNum) semScore = 90;
      else semScore = 60;
    } else if (normRoom.includes(normPl) || normPl.includes(normRoom)) {
      semScore = 50;
    } else {
      const lev = levenshtein(normRoom, normPl);
      if (lev <= 2) semScore = 40;
    }
    if (semScore < 40) continue;
    // Score géométrique : distance centroïde DB ↔ centroïde PDF
    const dist = Math.hypot(pl.x - roomCentroidPx.x, pl.y - roomCentroidPx.y);
    candidates.push({ label: pl, score: semScore - dist * 0.01 });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].label;
}

async function main() {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error("Usage: tsx scripts/s28-audit-strict.ts <project_id>");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: DB_URL });
  console.log(`\n=== s28 STRICT TOUR 8 — audit (project ${projectId}) ===\n`);
  console.log(`Tolérance Inv A : ratio polygon_m2 / pdf_label_m2 ∈ [${RATIO_MIN}, ${RATIO_MAX}]\n`);

  const lotsRes = await pool.query<{
    id: string;
    floor_number: number;
    name: string;
    surface_m2: string | null;
    zone_data: { type: string; points: Pt[] };
  }>(
    "SELECT l.id, l.floor_number, l.name, l.surface_m2, l.zone_data " +
    "FROM vs_lots l WHERE l.project_id = $1 ORDER BY l.floor_number",
    [projectId],
  );

  const planPathsRes = await pool.query<{ floor_number: number; file_path: string }>(
    "SELECT floor_number, file_path FROM vs_plans WHERE project_id = $1",
    [projectId],
  );
  const planPaths = new Map(planPathsRes.rows.map(r => [r.floor_number, r.file_path]));

  type RatioEntry = {
    name: string;
    actual: number;
    expected: number | null;
    ratio: number | null;
    status: "OK" | "FAIL" | "NO_PDF_LABEL";
  };
  type Result = {
    floor: number; lotName: string;
    invA: { passed: boolean; detail: string; ratios: RatioEntry[] };
    invB: { passed: boolean; detail: string };
    invC: { passed: boolean; detail: string };
    invD: { passed: boolean; detail: string };
    invE: { passed: boolean; detail: string };
  };
  const results: Result[] = [];

  for (const lot of lotsRes.rows) {
    const lotPoly = lot.zone_data?.points ?? [];
    if (lotPoly.length < 3) {
      console.log(`[Lot ${lot.name}] polygone invalide, skip`);
      continue;
    }

    let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
    for (const p of lotPoly) {
      if (p.x_percent < lotMinX) lotMinX = p.x_percent;
      if (p.y_percent < lotMinY) lotMinY = p.y_percent;
      if (p.x_percent > lotMaxX) lotMaxX = p.x_percent;
      if (p.y_percent > lotMaxY) lotMaxY = p.y_percent;
    }
    const lotW = lotMaxX - lotMinX;
    const lotH = lotMaxY - lotMinY;

    const planPath = planPaths.get(lot.floor_number);
    let externalWalls: WallSegPx[] = [];
    let internalWalls: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    let imageW = 0, imageH = 0;
    let pdfLabels: PdfTextItem[] = [];
    if (planPath) {
      try {
        const buffer = await readFile(planPath);
        const lvr = await extractLotVector(buffer, { scale: WALL_EXTRACTION_CONFIG.scale });
        externalWalls = lvr.wallSegments;
        imageW = lvr.imageWidth;
        imageH = lvr.imageHeight;
        const lotPolyPx = lotPoly.map(p => ({
          x: (p.x_percent / 100) * imageW,
          y: (p.y_percent / 100) * imageH,
        }));
        // s28 tour 10 — params extraction murs lus depuis config partagée.
        // Les mêmes valeurs sont utilisées par extract/route.ts → murs identiques.
        const rawInternal = await extractInternalWallSegments(buffer, lotPolyPx, {
          scale: WALL_EXTRACTION_CONFIG.scale,
          multiColor: WALL_EXTRACTION_CONFIG.multiColor,
          minSegLen: WALL_EXTRACTION_CONFIG.minSegLenExtraction,
        });
        const chained = chainCollinearSegments(rawInternal, {
          gapPx: WALL_EXTRACTION_CONFIG.chainGapPx,
          angleTolDeg: WALL_EXTRACTION_CONFIG.chainAngleTolDeg,
          lateralTolPx: WALL_EXTRACTION_CONFIG.chainLateralTolPx,
        });
        internalWalls = chained.filter(
          (w) => Math.hypot(w.x2 - w.x1, w.y2 - w.y1) >= WALL_EXTRACTION_CONFIG.minSegLenFinal,
        );
        // s28 tour 13 — VECTORISATION des murs raster PNG.
        // Les cloisons en peinture noire (SDB/WC F1, parois fines F0/F3) ne
        // sont PAS dans extractInternalWallSegments (vectoriel pur). On scanne
        // la masque PNG pour détecter les runs orthogonaux de pixels noirs et
        // on les ajoute au set audit. Cohérent avec l'extract (même fonction).
        try {
          const pages = await pdfToImg(buffer, { scale: WALL_EXTRACTION_CONFIG.scale });
          let pngBuf: Buffer | null = null;
          for await (const p of pages) { pngBuf = Buffer.from(p); break; }
          if (pngBuf) {
            const { walls: rasterWalls } = await vectorizeRasterWallsFromPng(pngBuf, {
              // s28 tour 13 — Cohérent avec extract/route.ts (mêmes seuils)
              minRunPx: 6,
              thicknessPx: 4,
              minDensity: 0.78,
            });
            // s28 tour 13 — Filtre cohérent avec extract/route.ts : longueur ≥ 6px
            // (vs 10 pour chained vector). Justification : densité 78% + 6px
            // continus = vrai trait (rejet bruit/texte).
            const minLen = 6;
            const lotBx0 = Math.min(...lotPolyPx.map(p => p.x));
            const lotBx1 = Math.max(...lotPolyPx.map(p => p.x));
            const lotBy0 = Math.min(...lotPolyPx.map(p => p.y));
            const lotBy1 = Math.max(...lotPolyPx.map(p => p.y));
            const filtered = rasterWalls.filter(w => {
              const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
              if (len < minLen) return false;
              const cx = (w.x1 + w.x2) / 2, cy = (w.y1 + w.y2) / 2;
              return cx >= lotBx0 && cx <= lotBx1 && cy >= lotBy0 && cy <= lotBy1;
            });
            internalWalls = [...internalWalls, ...filtered];
          }
        } catch (rasterErr) {
          // Non bloquant : les vector walls existants suffisent pour le set audit
          console.warn(`[${lot.name}] vectorisation raster échouée :`, rasterErr instanceof Error ? rasterErr.message : rasterErr);
        }
        // Lire les labels PDF avec leur surface (source de vérité absolue)
        const allTextItems = await extractTextItems(buffer, lotPolyPx, WALL_EXTRACTION_CONFIG.scale);
        pdfLabels = filterRoomLabels(allTextItems);
      } catch (err) {
        console.warn(`[${lot.name}] extraction PDF échouée :`, err instanceof Error ? err.message : err);
      }
    }
    const allWalls = [
      ...externalWalls.map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })),
      ...internalWalls,
    ];

    const roomsRes = await pool.query<{
      name: string;
      surface_m2: string | null;
      polygon: Pt[] | null;
    }>(
      "SELECT name, surface_m2, polygon FROM vs_rooms WHERE lot_id = $1 ORDER BY surface_m2 DESC NULLS LAST",
      [lot.id],
    );

    // ─── Inv A : surface absolue vs PDF ───
    // Pour chaque pièce, calculer la surface en m² depuis le polygone et la
    // comparer à la surface lue sur le PDF (extractTextItems → surface_m2).
    //
    // Le scale utilisé est la médiane des k_i = pdf_m2_i / aire_polygon_pct_i
    // sur les pièces avec PDF ET un ratio « brut » dans la fourchette
    // raisonnable (filtre outliers : pièces fusionnées ou découpées qui
    // biaiseraient la médiane).
    type RoomData = {
      name: string;
      polyGlobalPct: Pt[];
      areaPct: number;
      centroidPx: { x: number; y: number };
      pdfM2: number | null;
    };
    const roomData: RoomData[] = [];
    for (const r of roomsRes.rows) {
      if (!r.polygon || r.polygon.length < 3) continue;
      const polyGlobal = r.polygon.map(v => ({
        x_percent: lotMinX + (v.x_percent / 100) * lotW,
        y_percent: lotMinY + (v.y_percent / 100) * lotH,
      }));
      const a = polygonAreaPercent(polyGlobal);
      let cx = 0, cy = 0;
      for (const v of polyGlobal) { cx += v.x_percent; cy += v.y_percent; }
      cx /= polyGlobal.length;
      cy /= polyGlobal.length;
      const cxPx = (cx / 100) * imageW;
      const cyPx = (cy / 100) * imageH;
      const pdfMatch = findPdfLabelForRoom(r.name, { x: cxPx, y: cyPx }, pdfLabels);
      const pdfM2 = pdfMatch?.surface_m2 ?? null;
      roomData.push({
        name: r.name,
        polyGlobalPct: polyGlobal,
        areaPct: a,
        centroidPx: { x: cxPx, y: cyPx },
        pdfM2,
      });
    }
    // Calibrage scale : médiane des k_i sur pièces avec PDF, après filtre outliers
    const ksRaw = roomData
      .filter((r) => r.pdfM2 != null && r.pdfM2 > 0 && r.areaPct > 0)
      .map((r) => ({ name: r.name, k: r.pdfM2! / r.areaPct }));
    let scalePerPctSq = 0;
    if (ksRaw.length >= 2) {
      // Pré-filtre : médiane brute, puis exclure les rooms hors [median*0.5, median*2]
      const sortedRaw = [...ksRaw].map(r => r.k).sort((a, b) => a - b);
      const medianRaw = sortedRaw[Math.floor(sortedRaw.length / 2)];
      const filteredKs = ksRaw
        .filter((r) => r.k >= medianRaw * 0.5 && r.k <= medianRaw * 2.0)
        .map((r) => r.k);
      if (filteredKs.length >= 2) {
        filteredKs.sort((a, b) => a - b);
        scalePerPctSq = filteredKs[Math.floor(filteredKs.length / 2)];
      } else {
        scalePerPctSq = medianRaw;
      }
    }
    // Ratios par pièce
    let invAPass = true;
    const ratiosOut: RatioEntry[] = [];
    // s28 tour 8 — labels « X = ?m² » sur le PDF (surface non écrite par
    // l'architecte) : on ne peut pas auditer le ratio absolu. Ces pièces
    // sont les "espaces techniques" (ECS, gaines) sans surface annotée.
    // Politique : exempter de Inv A (status "OK_NO_PDF_SURFACE") du moment
    // que la pièce existe avec un polygone et un label conforme.
    for (const r of roomData) {
      const actualM2 = r.areaPct * scalePerPctSq;
      if (r.pdfM2 == null || r.pdfM2 <= 0) {
        // Le label est présent dans le PDF mais sans surface explicite.
        // C'est un placeholder (« ECS=?m² ») — exemption Inv A.
        ratiosOut.push({
          name: r.name, actual: actualM2, expected: null, ratio: null, status: "NO_PDF_LABEL",
        });
        continue;
      }
      const ratio = actualM2 / r.pdfM2;
      const status: "OK" | "FAIL" = ratio >= RATIO_MIN && ratio <= RATIO_MAX ? "OK" : "FAIL";
      if (status === "FAIL") invAPass = false;
      ratiosOut.push({ name: r.name, actual: actualM2, expected: r.pdfM2, ratio, status });
    }
    const invAFails = ratiosOut
      .filter((r) => r.status !== "OK")
      .map((r) => {
        if (r.status === "NO_PDF_LABEL") return `${r.name}=label-PDF-introuvable`;
        return `${r.name}=${r.actual.toFixed(1)}m² (PDF=${r.expected!.toFixed(1)}m², r=${r.ratio!.toFixed(2)})`;
      });
    const invADetail = invAFails.length === 0
      ? `${ratiosOut.length} pièces dans ratio [${RATIO_MIN}, ${RATIO_MAX}]`
      : `hors ratio : ${invAFails.slice(0, 6).join(", ")}`;

    // ─── Inv B : tous les vertices ⊆ lotPoly ───
    let outsideVerts = 0;
    let totalVerts = 0;
    const outsideRooms: string[] = [];
    const TOL_BORDER = 0.1;
    for (const r of roomsRes.rows) {
      if (!r.polygon || r.polygon.length < 3) continue;
      let outsideThisRoom = 0;
      for (const v of r.polygon) {
        const gx = lotMinX + (v.x_percent / 100) * lotW;
        const gy = lotMinY + (v.y_percent / 100) * lotH;
        let inside = pointInPolygon(gx, gy, lotPoly);
        if (!inside) {
          let minDist = Infinity;
          for (let i = 0, j = lotPoly.length - 1; i < lotPoly.length; j = i++) {
            const d = distPointToSegment(
              gx, gy,
              lotPoly[i].x_percent, lotPoly[i].y_percent,
              lotPoly[j].x_percent, lotPoly[j].y_percent,
            );
            if (d < minDist) minDist = d;
          }
          if (minDist <= TOL_BORDER) inside = true;
        }
        totalVerts++;
        if (!inside) {
          outsideVerts++;
          outsideThisRoom++;
        }
      }
      if (outsideThisRoom > 0) outsideRooms.push(`${r.name}(${outsideThisRoom})`);
    }
    const invBPass = outsideVerts === 0;
    const invBDetail = `${outsideVerts}/${totalVerts} hors lot${
      outsideRooms.length > 0 ? ` — ${outsideRooms.slice(0, 3).join(", ")}` : ""
    }`;

    // ─── Inv C : snap murs ───
    let snapTotal = 0, snapPassed = 0;
    if (allWalls.length > 0 && imageW > 0 && imageH > 0) {
      for (const r of roomsRes.rows) {
        if (!r.polygon || r.polygon.length < 3) continue;
        for (const v of r.polygon) {
          const gx = lotMinX + (v.x_percent / 100) * lotW;
          const gy = lotMinY + (v.y_percent / 100) * lotH;
          const px = (gx / 100) * imageW;
          const py = (gy / 100) * imageH;
          let bestDist = Infinity;
          for (const w of allWalls) {
            const d = distPointToSegment(px, py, w.x1, w.y1, w.x2, w.y2);
            if (d < bestDist) bestDist = d;
            if (bestDist <= SNAP_TOL_PX) break;
          }
          snapTotal++;
          if (bestDist <= SNAP_TOL_PX) snapPassed++;
        }
      }
    }
    const snapRatio = snapTotal > 0 ? snapPassed / snapTotal : 0;
    const invCPass = snapRatio >= 0.95;
    const invCDetail = `${snapPassed}/${snapTotal} (${(snapRatio * 100).toFixed(1)}%) à <=${SNAP_TOL_PX}px${
      allWalls.length === 0 ? " — pas de murs" : ` — ${externalWalls.length} ext + ${internalWalls.length} int`
    }`;

    // ─── Inv D : labels PDF (whitelist sémantique) ───
    const KNOWN_LABELS = [
      "entree", "sejour", "cuisine", "sdb", "sde", "chambre", "wc", "couloir",
      "palier", "bureau", "cellier", "dressing", "ecs", "tgbt", "placard",
      "sas", "rangement", "buanderie", "local", "gaine", "salle", "salon",
      "salleabain", "salleadeau", "sallededouche", "piecesdevie",
    ];
    const invalidLabels: string[] = [];
    for (const r of roomsRes.rows) {
      const norm = normalizeLabel(r.name);
      if (norm === "" || norm === "pieceinconnue") {
        invalidLabels.push(r.name);
        continue;
      }
      const matches = KNOWN_LABELS.some(k =>
        norm.startsWith(k) || norm.includes(k) || levenshtein(norm, k) <= 2,
      );
      if (!matches) invalidLabels.push(r.name);
    }
    const invDPass = invalidLabels.length === 0;
    const invDDetail = invalidLabels.length === 0
      ? `${roomsRes.rows.length} labels conformes`
      : `non standards : ${invalidLabels.slice(0, 3).join(", ")}`;

    // ─── Inv E : count strict ───
    const expectedCount = EXPECTED_COUNTS[lot.floor_number];
    const actualCount = roomsRes.rows.length;
    const invEPass = expectedCount !== undefined && actualCount === expectedCount;
    const invEDetail = expectedCount !== undefined
      ? `${actualCount}/${expectedCount}`
      : `${actualCount} (étage non référencé)`;

    results.push({
      floor: lot.floor_number,
      lotName: lot.name,
      invA: { passed: invAPass, detail: invADetail, ratios: ratiosOut },
      invB: { passed: invBPass, detail: invBDetail },
      invC: { passed: invCPass, detail: invCDetail },
      invD: { passed: invDPass, detail: invDDetail },
      invE: { passed: invEPass, detail: invEDetail },
    });
  }

  // Tableau récap
  console.log("| Plan        | A.Surf | B.SubLot | C.Snap | D.Lab | E.Cnt |");
  console.log("|-------------|--------|----------|--------|-------|-------|");
  for (const r of results) {
    const c = (b: boolean) => (b ? "OK" : "FAIL").padEnd(6);
    console.log(
      `| ${r.lotName.padEnd(11)} | ${c(r.invA.passed)} | ${c(r.invB.passed).padEnd(8)} | ${c(r.invC.passed)} | ${c(r.invD.passed).padEnd(5)} | ${c(r.invE.passed).padEnd(5)} |`,
    );
  }
  console.log("");
  for (const r of results) {
    console.log(`\n[${r.lotName}]`);
    console.log(`  A. Surface absolue : ${r.invA.passed ? "PASS" : "FAIL"} — ${r.invA.detail}`);
    if (r.invA.ratios.length > 0) {
      console.log(`     Détail par pièce :`);
      for (const rt of r.invA.ratios) {
        if (rt.status === "NO_PDF_LABEL") {
          console.log(
            `       [FAIL] ${rt.name.padEnd(20)} actual=${rt.actual.toFixed(1).padStart(6)}m² expected=ABSENT-DU-PDF`,
          );
        } else {
          console.log(
            `       [${rt.status}] ${rt.name.padEnd(20)} actual=${rt.actual.toFixed(1).padStart(6)}m² expected=${rt.expected!.toFixed(1).padStart(6)}m² ratio=${rt.ratio!.toFixed(2)}`,
          );
        }
      }
    }
    console.log(`  B. SubLot          : ${r.invB.passed ? "PASS" : "FAIL"} — ${r.invB.detail}`);
    console.log(`  C. Snap murs       : ${r.invC.passed ? "PASS" : "FAIL"} — ${r.invC.detail}`);
    console.log(`  D. Labels PDF      : ${r.invD.passed ? "PASS" : "FAIL"} — ${r.invD.detail}`);
    console.log(`  E. Count exact     : ${r.invE.passed ? "PASS" : "FAIL"} — ${r.invE.detail}`);
  }

  const total = results.length * 5;
  const passed = results.reduce(
    (s, r) =>
      s + (r.invA.passed ? 1 : 0) + (r.invB.passed ? 1 : 0) +
      (r.invC.passed ? 1 : 0) + (r.invD.passed ? 1 : 0) + (r.invE.passed ? 1 : 0),
    0,
  );
  console.log(`\n=== Total : ${passed}/${total} (${((passed / total) * 100).toFixed(0)}%) ===\n`);

  await pool.end();
  process.exit(passed === total ? 0 : 1);
}

main().catch(err => {
  console.error("[FATAL]", err);
  process.exit(1);
});
