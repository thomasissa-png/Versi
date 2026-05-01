/**
 * s28 tour 13 — Vectorisation runs horizontaux/verticaux dans une masque raster.
 *
 * Cause racine plateau Inv C : certaines cloisons (SDB/WC F1, parois fines)
 * sont en peinture raster PNG SEULEMENT, jamais en stroke vectoriel PDF.
 * Donc extractInternalWallSegments les ignore → l'audit Inv C mesure les
 * vertices vs un set incomplet → FAIL.
 *
 * Solution : scanner la masque PNG pour détecter les "runs" rectilignes de
 * pixels noirs (typiques des cloisons peintes : trait droit horizontal ou
 * vertical). Pour chaque run de longueur ≥ minRunPx, créer un segment
 * vectoriel équivalent. Ces segments sont ajoutés au set "allWalls_snap"
 * pour AUDIT et SNAP.
 *
 * Algorithme :
 *   - Pour chaque ligne y, parcourir les pixels x. Une cellule "run-H" =
 *     run de pixels noirs continus de longueur ≥ minRunPx, avec une "épaisseur"
 *     verticale ≥ thicknessPx. La signature d'un mur = colonne dense.
 *   - Idem en colonnes (run-V).
 *   - Diagonales : skipped (cloisons archi typiquement orthogonales).
 *
 * Limites :
 *   - Capture du texte si lettres alignées + thick → on filtre par densité
 *     dans une fenêtre 3×N (un mur a ≥80% pixels noirs, du texte ~30%).
 *   - Pas de segments diagonaux (rare en archi appartements).
 */

export type Wall = { x1: number; y1: number; x2: number; y2: number };

export type VectorizeOptions = {
  /** Longueur minimale d'un run pour le considérer comme un mur. */
  minRunPx?: number;
  /** Épaisseur min (en pixels) du run pour qu'il compte (= densité ≥ thicknessPx pixels noirs sur la perpendiculaire). */
  thicknessPx?: number;
  /** Densité min sur la perpendiculaire pour valider chaque pixel du run. */
  minDensity?: number;
  /** Bbox restrictive pour limiter le scan (perf). */
  bbox?: { minX: number; minY: number; maxX: number; maxY: number };
};

/**
 * Vectorise les runs horizontaux et verticaux de la masque.
 * Retourne des segments représentant les murs raster détectés.
 */
export function vectorizeRasterWalls(
  mask: Uint8Array,
  W: number,
  H: number,
  options: VectorizeOptions = {},
): Wall[] {
  const minRun = options.minRunPx ?? 12;
  const thickness = options.thicknessPx ?? 3;
  const minDensity = options.minDensity ?? 0.7;
  const bbox = options.bbox ?? { minX: 0, minY: 0, maxX: W - 1, maxY: H - 1 };

  const walls: Wall[] = [];

  // Helper : densité locale (perpendiculaire au run)
  // Pour un run horizontal à (x, y), on regarde la colonne (x, y-thickness..y+thickness)
  // Pour un run vertical à (x, y), on regarde la ligne (x-thickness..x+thickness, y)
  const colDensity = (x: number, y: number): number => {
    let count = 0, total = 0;
    for (let dy = -thickness; dy <= thickness; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= H) continue;
      total++;
      if (mask[yy * W + x] === 1) count++;
    }
    return total > 0 ? count / total : 0;
  };
  const rowDensity = (x: number, y: number): number => {
    let count = 0, total = 0;
    for (let dx = -thickness; dx <= thickness; dx++) {
      const xx = x + dx;
      if (xx < 0 || xx >= W) continue;
      total++;
      if (mask[y * W + xx] === 1) count++;
    }
    return total > 0 ? count / total : 0;
  };

  // RUNS HORIZONTAUX : pour chaque ligne y, trouver les segments [x_start..x_end]
  // continus de pixels noirs à colDensity ≥ minDensity.
  for (let y = bbox.minY; y <= bbox.maxY; y++) {
    let runStart = -1;
    for (let x = bbox.minX; x <= bbox.maxX; x++) {
      const isWall = mask[y * W + x] === 1 && colDensity(x, y) >= minDensity;
      if (isWall) {
        if (runStart < 0) runStart = x;
      } else {
        if (runStart >= 0 && x - runStart >= minRun) {
          walls.push({ x1: runStart + 0.5, y1: y + 0.5, x2: x - 1 + 0.5, y2: y + 0.5 });
        }
        runStart = -1;
      }
    }
    if (runStart >= 0 && bbox.maxX - runStart + 1 >= minRun) {
      walls.push({ x1: runStart + 0.5, y1: y + 0.5, x2: bbox.maxX + 0.5, y2: y + 0.5 });
    }
  }

  // RUNS VERTICAUX : par colonne
  for (let x = bbox.minX; x <= bbox.maxX; x++) {
    let runStart = -1;
    for (let y = bbox.minY; y <= bbox.maxY; y++) {
      const isWall = mask[y * W + x] === 1 && rowDensity(x, y) >= minDensity;
      if (isWall) {
        if (runStart < 0) runStart = y;
      } else {
        if (runStart >= 0 && y - runStart >= minRun) {
          walls.push({ x1: x + 0.5, y1: runStart + 0.5, x2: x + 0.5, y2: y - 1 + 0.5 });
        }
        runStart = -1;
      }
    }
    if (runStart >= 0 && bbox.maxY - runStart + 1 >= minRun) {
      walls.push({ x1: x + 0.5, y1: runStart + 0.5, x2: x + 0.5, y2: bbox.maxY + 0.5 });
    }
  }

  return walls;
}

/**
 * Vectorisation depuis un PNG buffer (helper async).
 */
export async function vectorizeRasterWallsFromPng(
  pngBuffer: Buffer,
  options: VectorizeOptions = {},
): Promise<{ walls: Wall[]; W: number; H: number }> {
  // Lazy import sharp (déjà utilisé ailleurs)
  const sharpMod = (await import("sharp")).default;
  const img = sharpMod(pngBuffer).raw().ensureAlpha();
  const meta = await img.metadata();
  const W = meta.width!;
  const H = meta.height!;
  const px = await img.toBuffer();
  const mask = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const r = px[p], g = px[p + 1], b = px[p + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    let isWall = lum < 210;
    if (!isWall) {
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const sat = max > 0 ? (max - min) / max : 0;
      if (sat > 0.25 && lum < 230) isWall = true;
    }
    mask[i] = isWall ? 1 : 0;
  }
  const walls = vectorizeRasterWalls(mask, W, H, options);
  return { walls, W, H };
}
