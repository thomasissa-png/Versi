/**
 * s28 tour 13 — Snap polygon vertices to PNG raster wall pixels.
 *
 * Cause racine plateau Inv C (3/4 floors fail à 75-90%) :
 * Sur les PDFs Muguets, certaines cloisons (notamment SDB/WC, parois fines
 * intérieures) sont rendues UNIQUEMENT en peinture raster (pixels noirs PNG)
 * et n'apparaissent PAS dans la couche vectorielle PDF (extractInternal-
 * WallSegments). Conséquence : un vertex de polygone proche d'une telle
 * cloison est à <5px d'un pixel noir PNG mais à 50-70px du segment vectoriel
 * PDF le plus proche → audit Inv C FAIL.
 *
 * Diagnostic tour 13 (b8ca4514) :
 *   - F1 SDB : v=(1843,1415) dPdf=66.6px (FAIL) mais dPng=2.8px (mur peint là)
 *   - F1 WC  : v=(1199,1382) dPdf=51.6px (FAIL) mais dPng=7.1px (proche peinture)
 *
 * Solution : pour chaque vertex à >snapTolPdfPx du mur PDF, chercher en
 * spirale (radius 1..maxSearchPx) le pixel noir PNG le plus proche. Si
 * trouvé, snapper le vertex à cette position. Limite de drift d'aire ≤
 * maxAreaDriftRatio (défaut 3%).
 *
 * Critique différent de snapPolygonToWalls : ici on snap sur des PIXELS
 * (pas des segments). Cela capture les cloisons raster que le pipeline
 * vectoriel ignore.
 */

export type Vertex = { x: number; y: number };

export type SnapToPngOptions = {
  /** Si vertex à <= cette distance d'un mur PDF, ne PAS snapper (déjà OK). */
  snapTolPdfPx?: number;
  /** Rayon max de recherche du pixel noir le plus proche. */
  maxSearchPx?: number;
  /** Drift maximal de l'aire toléré (3% par défaut). */
  maxAreaDriftRatio?: number;
};

function polyArea(p: Vertex[]): number {
  if (p.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length;
    s += p[i].x * p[j].y - p[j].x * p[i].y;
  }
  return Math.abs(s / 2);
}

function distSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Pour chaque vertex du polygone, si distance au mur PDF > snapTolPdfPx,
 * chercher en spirale un pixel noir PNG (wallMask[i]=1) dans maxSearchPx.
 * Snapper sur ce pixel si trouvé. Garde-fou : drift d'aire global limité.
 *
 * @param polygon Polygone en coords px image (cohérent avec wallMask).
 * @param wallMask Masque PNG (1 = pixel noir = mur raster).
 * @param W,H Dimensions de wallMask.
 * @param pdfWalls Murs vectoriels PDF (utilisés pour décider si snap nécessaire).
 * @param options Tolérances.
 */
export function snapPolygonToPngWalls(
  polygon: Vertex[],
  wallMask: Uint8Array,
  W: number,
  H: number,
  pdfWalls: Array<{ x1: number; y1: number; x2: number; y2: number }>,
  options: SnapToPngOptions = {},
): { polygon: Vertex[]; snappedCount: number; areaDriftRatio: number } {
  const snapTolPdfPx = options.snapTolPdfPx ?? 5;
  const maxSearchPx = options.maxSearchPx ?? 12;
  const maxAreaDriftRatio = options.maxAreaDriftRatio ?? 0.03;

  if (polygon.length < 3) {
    return { polygon, snappedCount: 0, areaDriftRatio: 0 };
  }

  const origArea = polyArea(polygon);
  const out: Vertex[] = [];
  let snappedCount = 0;

  for (const v of polygon) {
    // 1. Distance au mur PDF le plus proche
    let dPdf = Infinity;
    for (const w of pdfWalls) {
      const d = distSeg(v.x, v.y, w.x1, w.y1, w.x2, w.y2);
      if (d < dPdf) dPdf = d;
      if (dPdf <= snapTolPdfPx) break;
    }
    // Si déjà dans tolérance, on garde le vertex
    if (dPdf <= snapTolPdfPx) {
      out.push({ x: v.x, y: v.y });
      continue;
    }
    // 2. Sinon, scan spirale dans wallMask pour trouver pixel noir le plus proche
    const cx = Math.round(v.x), cy = Math.round(v.y);
    if (cx < 0 || cx >= W || cy < 0 || cy >= H) {
      out.push({ x: v.x, y: v.y });
      continue;
    }
    let bestX = -1, bestY = -1, bestD = Infinity;
    if (wallMask[cy * W + cx] === 1) {
      bestX = cx; bestY = cy; bestD = 0;
    } else {
      for (let r = 1; r <= maxSearchPx; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
            const x = cx + dx, y = cy + dy;
            if (x < 0 || x >= W || y < 0 || y >= H) continue;
            if (wallMask[y * W + x] === 1) {
              const d = Math.hypot(dx, dy);
              if (d < bestD) { bestD = d; bestX = x; bestY = y; }
            }
          }
        }
        if (bestD < r) break; // trouvé un pixel à <= r-0.5 → OK, sortir
      }
    }
    if (bestX >= 0 && bestD <= maxSearchPx) {
      // Snap au pixel mur PNG (au demi-pixel près)
      out.push({ x: bestX + 0.5, y: bestY + 0.5 });
      snappedCount++;
    } else {
      out.push({ x: v.x, y: v.y });
    }
  }

  // Garde-fou drift d'aire : si snap fait dériver l'aire de plus de ratio,
  // ROLLBACK au polygone original.
  const newArea = polyArea(out);
  const driftRatio = origArea > 0 ? Math.abs(newArea - origArea) / origArea : 0;
  if (driftRatio > maxAreaDriftRatio) {
    return { polygon: polygon.slice(), snappedCount: 0, areaDriftRatio: driftRatio };
  }
  return { polygon: out, snappedCount, areaDriftRatio: driftRatio };
}
