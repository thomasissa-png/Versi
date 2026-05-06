/**
 * Helpers UI — rendu canvas des segments (V3 — code couleur simple).
 *
 * Adaptation s32 (Pattern V3 validé @moi 9.5/10 + @persona Thomas 10/10) :
 *  - 3 types UI seulement : wall (mur plein), bay_window (baie à créer),
 *    opening (ouverture à créer). Les autres types DB (door/window/flexible)
 *    sont mappés sur "wall" en rendu pour ne pas casser des rows héritées.
 *  - Code couleur simple :
 *      wall        → noir #0B0B0B, trait plein 3px
 *      bay_window  → orange #C9844C, trait plein 4px
 *      opening     → vert #5A8060, pointillé 4px (arête sans mur)
 *  - Suppression des patterns architectes (arc porte, double trait fenêtre,
 *    hachures baie, pastille opening) — remplacés par couleur + épaisseur.
 *  - Numérotation horaire depuis le Nord : helper `reorderSegmentsClockwise
 *    FromNorth` produit un mapping segment_index_db → label horaire.
 *  - Helper `orientationLabel` : libellé court (N, NE, E, SE, S, SO, O, NO).
 *
 * Hit-test (drag direct) : `findNearestSegment` inchangé — utilisé pour
 * détecter le pointer down sur arête, et pour distinguer drag global du
 * polygone vs sélection d'arête (panel latéral synchronisé).
 */

import type { VsRoomSegmentType } from "../types";

// ─── Couleurs et épaisseurs (V3) ──────────────────────────────────

const COLOR_WALL = "#0B0B0B"; // noir — text-default
const COLOR_BAY = "#C9844C"; // orange — accent design system
const COLOR_OPENING = "#5A8060"; // vert — info doux
const COLOR_HIGHLIGHT = "#2E66DC"; // bleu hover/focus
const COLOR_HIGHLIGHT_FILL = "rgba(46, 102, 220, 0.18)";

const WIDTH_WALL = 3;
const WIDTH_BAY = 4;
const WIDTH_OPENING = 4;

// ─── Géométrie ────────────────────────────────────────────────────

export interface ScreenPoint {
  x: number;
  y: number;
}

// ─── Rendu d'un segment selon son type (V3) ───────────────────────

/**
 * Dessine un segment coloré selon son type sémantique.
 * Si `highlight` true, ajoute un halo bleu (hover/focus panel).
 *
 * Mapping V3 :
 *   - wall          → noir plein 3px
 *   - bay_window    → orange plein 4px
 *   - opening       → vert pointillé 4px
 *   - door / window / flexible (héritage DB) → fallback wall
 */
export function renderSegment(
  ctx: CanvasRenderingContext2D,
  p1: ScreenPoint,
  p2: ScreenPoint,
  type: VsRoomSegmentType,
  highlight = false
): void {
  if (highlight) {
    drawHighlight(ctx, p1, p2);
  }
  const v3Type = mapToV3Type(type);
  switch (v3Type) {
    case "wall":
      drawWall(ctx, p1, p2);
      break;
    case "bay_window":
      drawBayV3(ctx, p1, p2);
      break;
    case "opening":
      drawOpeningV3(ctx, p1, p2);
      break;
  }
}

/** Mappe les 6 types DB sur les 3 types V3 affichés. */
function mapToV3Type(
  type: VsRoomSegmentType
): "wall" | "bay_window" | "opening" {
  if (type === "bay_window") return "bay_window";
  if (type === "opening") return "opening";
  // door, window, flexible → fallback wall (rétro-compat).
  return "wall";
}

function drawWall(
  ctx: CanvasRenderingContext2D,
  p1: ScreenPoint,
  p2: ScreenPoint
): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = COLOR_WALL;
  ctx.lineWidth = WIDTH_WALL;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
}

function drawBayV3(
  ctx: CanvasRenderingContext2D,
  p1: ScreenPoint,
  p2: ScreenPoint
): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = COLOR_BAY;
  ctx.lineWidth = WIDTH_BAY;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
}

function drawOpeningV3(
  ctx: CanvasRenderingContext2D,
  p1: ScreenPoint,
  p2: ScreenPoint
): void {
  ctx.save();
  ctx.lineCap = "butt";
  ctx.strokeStyle = COLOR_OPENING;
  ctx.lineWidth = WIDTH_OPENING;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
}

function drawHighlight(
  ctx: CanvasRenderingContext2D,
  p1: ScreenPoint,
  p2: ScreenPoint
): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = COLOR_HIGHLIGHT;
  ctx.lineWidth = 8;
  ctx.globalAlpha = 0.35;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
}

// ─── Numéro de segment dessiné au milieu d'une arête ──────────────

/**
 * Dessine un badge numéroté au milieu d'une arête (texte 11px sur bg blanc).
 * @param label texte affiché (ex "1", "2"...)
 */
export function renderSegmentNumber(
  ctx: CanvasRenderingContext2D,
  p1: ScreenPoint,
  p2: ScreenPoint,
  label: string
): void {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  ctx.save();
  ctx.font = "600 11px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const metrics = ctx.measureText(label);
  const padX = 5;
  const padY = 3;
  const w = metrics.width + padX * 2;
  const h = 16;
  // Fond blanc translucide arrondi
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.strokeStyle = "rgba(11, 11, 11, 0.18)";
  ctx.lineWidth = 1;
  const rx = mx - w / 2;
  const ry = my - h / 2;
  // roundRect fallback (Canvas 2D natif moderne, sinon path manuel)
  if (typeof (ctx as unknown as { roundRect?: unknown }).roundRect === "function") {
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & {
      roundRect: (x: number, y: number, w: number, h: number, r: number) => void;
    }).roundRect(rx, ry, w, h, 4);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(rx, ry, w, h);
    ctx.strokeRect(rx, ry, w, h);
  }
  // Texte
  ctx.fillStyle = "#0B0B0B";
  ctx.fillText(label, mx, my + padY * 0.05);
  ctx.restore();
}

// ─── Highlight + fill polygon (mode hover panel) ──────────────────

export function renderAnnotatingFill(
  ctx: CanvasRenderingContext2D,
  points: ScreenPoint[]
): void {
  if (points.length < 3) return;
  ctx.save();
  ctx.fillStyle = COLOR_HIGHLIGHT_FILL;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    if (i === 0) ctx.moveTo(points[i].x, points[i].y);
    else ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ─── Hit-test : segment le plus proche ────────────────────────────

export function distancePointToSegment(
  px: number,
  py: number,
  a: ScreenPoint,
  b: ScreenPoint
): { distance: number; closest: ScreenPoint } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) {
    return { distance: Math.hypot(px - a.x, py - a.y), closest: { x: a.x, y: a.y } };
  }
  let t = ((px - a.x) * abx + (py - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + abx * t;
  const cy = a.y + aby * t;
  return { distance: Math.hypot(px - cx, py - cy), closest: { x: cx, y: cy } };
}

export interface SegmentHit {
  segmentIndex: number;
  distance: number;
  closest: ScreenPoint;
}

export function findNearestSegment(
  clickX: number,
  clickY: number,
  vertices: ScreenPoint[],
  toleranceForPx = 14
): SegmentHit | null {
  if (vertices.length < 3) return null;
  let best: SegmentHit | null = null;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const { distance, closest } = distancePointToSegment(clickX, clickY, a, b);
    if (distance > toleranceForPx) continue;
    if (best === null || distance < best.distance) {
      best = { segmentIndex: i, distance, closest };
    }
  }
  return best;
}

// ─── Numérotation horaire depuis le Nord ──────────────────────────

export interface VertexLike {
  x_percent: number;
  y_percent: number;
}

/**
 * Réordonne les segments en partant du sommet le plus au Nord (y_percent min)
 * et en sens horaire, pour produire un mapping :
 *
 *   segment_index_db → display_index (1-based, horaire depuis Nord)
 *
 * Convention : segment i = arête entre sommet i et sommet i+1 (modulo N).
 *
 * Le polygone canvas est en repère écran (y vers le bas) — sens "horaire" UI
 * = sens trigonométrique inverse côté écran. On part du sommet le plus haut
 * (y_percent min) et on suit le polygone dans son ordre natif si celui-ci
 * tourne dans le sens horaire écran ; sinon on inverse.
 *
 * @returns Map<segment_index_db, display_index_1based>
 */
export function reorderSegmentsClockwiseFromNorth(
  polygon: VertexLike[]
): Map<number, number> {
  const map = new Map<number, number>();
  if (polygon.length < 3) return map;

  // 1. Trouve le sommet le plus au Nord (y_percent min). Tie-break sur x_percent min.
  let northIdx = 0;
  for (let i = 1; i < polygon.length; i++) {
    if (
      polygon[i].y_percent < polygon[northIdx].y_percent ||
      (polygon[i].y_percent === polygon[northIdx].y_percent &&
        polygon[i].x_percent < polygon[northIdx].x_percent)
    ) {
      northIdx = i;
    }
  }

  // 2. Détermine si le polygone tourne déjà dans le sens horaire écran.
  // Aire signée (formule du lacet) : positive = trigonométrique (anti-horaire écran),
  // négative = horaire écran. On veut horaire écran → on inverse si aire > 0.
  let signedArea = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    signedArea += (b.x_percent - a.x_percent) * (b.y_percent + a.y_percent);
  }
  const isClockwiseScreen = signedArea > 0;

  // 3. Construis le mapping : on parcourt à partir de northIdx dans le bon sens.
  // Segment i = arête entre sommet i et sommet (i+1). Le 1er segment horaire =
  // celui qui sort du sommet le plus au Nord dans la bonne direction.
  const n = polygon.length;
  for (let k = 0; k < n; k++) {
    const segDbIndex = isClockwiseScreen
      ? (northIdx + k) % n
      : (northIdx - 1 - k + n * 2) % n;
    map.set(segDbIndex, k + 1);
  }
  return map;
}

// ─── Orientation cardinale d'un segment ───────────────────────────

/**
 * Calcule l'orientation cardinale du milieu d'un segment par rapport au
 * centroïde du polygone. Sur un canvas (y vers le bas) :
 *   - milieu plus haut que centroïde (y inférieur) → Nord
 *   - milieu plus à droite (x supérieur) → Est, etc.
 *
 * @returns libellé court parmi N, NE, E, SE, S, SO, O, NO
 */
export function orientationLabel(
  midX: number,
  midY: number,
  centroidX: number,
  centroidY: number
): string {
  const dx = midX - centroidX;
  // Inversion Y : sur écran, plus petit y = plus au Nord.
  const dy = centroidY - midY;
  const angleRad = Math.atan2(dx, dy); // 0 = Nord pur, π/2 = Est, π = Sud, -π/2 = Ouest
  let deg = (angleRad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  // 8 secteurs de 45°, centrés sur N à 0°
  if (deg < 22.5 || deg >= 337.5) return "N";
  if (deg < 67.5) return "NE";
  if (deg < 112.5) return "E";
  if (deg < 157.5) return "SE";
  if (deg < 202.5) return "S";
  if (deg < 247.5) return "SO";
  if (deg < 292.5) return "O";
  return "NO";
}

/** Libellé long (pour le panel : "Nord", "Sud-Est"...). */
export function orientationLongLabel(short: string): string {
  switch (short) {
    case "N":
      return "Nord";
    case "NE":
      return "Nord-Est";
    case "E":
      return "Est";
    case "SE":
      return "Sud-Est";
    case "S":
      return "Sud";
    case "SO":
      return "Sud-Ouest";
    case "O":
      return "Ouest";
    case "NO":
      return "Nord-Ouest";
    default:
      return short;
  }
}

// ─── Labels UI ─────────────────────────────────────────────────────

/** Labels affichés dans le panel V3 (3 types UI uniquement). */
export const SEGMENT_TYPE_LABELS_V3: Record<
  "wall" | "bay_window" | "opening",
  string
> = {
  wall: "Mur plein",
  bay_window: "Baie vitrée",
  opening: "Ouverture à créer",
};

/** Mapping pour rendre des rows héritées (door/window/flexible) dans l'UI V3. */
export function toV3DisplayType(
  type: VsRoomSegmentType
): "wall" | "bay_window" | "opening" {
  if (type === "bay_window") return "bay_window";
  if (type === "opening") return "opening";
  return "wall";
}

/** Labels legacy (préservés pour compat externe — non utilisés en V3). */
export const SEGMENT_TYPE_LABELS: Record<VsRoomSegmentType, string> = {
  wall: "Mur plein",
  door: "Porte",
  window: "Fenêtre",
  bay_window: "Baie vitrée à créer",
  opening: "Ouverture à créer",
  flexible: "Flexible",
};
