/**
 * Helpers UI — rendu canvas des segments du polygone (Feature B s32 autopilot)
 *
 * Chaque arête du polygone a un `type` (wall/door/window/bay_window/opening/
 * flexible). Cette table de rendu gère les motifs architecturaux standards :
 *
 *  - wall        : trait noir épais (3px) — DEFAULT
 *  - door        : arc 90° + trait fin (motif standard architecte)
 *  - window      : double trait parallèle (4px de gap)
 *  - bay_window  : double trait épais hachuré (motif diagonal)
 *  - opening     : pas de trait (pastille discrète au milieu)
 *  - flexible    : trait pointillé jaune (#C9A55C — couleur design system)
 *
 * Côté hit-test (mode annotating), on calcule la distance point-segment et
 * on retourne le segment_index le plus proche dans une bande de tolérance.
 */

import type { VsRoomSegmentType } from "../types";

// ─── Constantes design system ─────────────────────────────────────

const COLOR_WALL = "#0B0B0B"; // text-default
const COLOR_DOOR = "#0B0B0B";
const COLOR_WINDOW = "#0B0B0B";
const COLOR_BAY = "#0B0B0B";
const COLOR_OPENING_DOT = "#6B7D8A"; // ardoise (design system)
const COLOR_FLEXIBLE = "#C9A55C"; // accent doré design system
const COLOR_HIGHLIGHT = "#2E66DC"; // hover en mode annotating
const COLOR_HIGHLIGHT_FILL = "rgba(46, 102, 220, 0.18)";

const WIDTH_WALL = 3;
const WIDTH_DOOR = 1.5;
const WIDTH_WINDOW = 1.6;
const WIDTH_BAY = 2.6;
const WIDTH_FLEXIBLE = 2.2;

// ─── Géométrie ────────────────────────────────────────────────────

export interface ScreenPoint {
  x: number;
  y: number;
}

/** Vecteur unitaire de p1→p2, ainsi que perpendiculaire et longueur. */
function segmentVectors(p1: ScreenPoint, p2: ScreenPoint) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) {
    return { ux: 1, uy: 0, nx: 0, ny: 1, len: 0 };
  }
  return {
    ux: dx / len,
    uy: dy / len,
    nx: -dy / len, // perpendiculaire (rotation 90°)
    ny: dx / len,
    len,
  };
}

// ─── Rendu par type ───────────────────────────────────────────────

/** Trait noir épais — wall (DEFAULT). */
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

/**
 * Trait fin + arc 90° pour symboliser une porte. Convention architecte :
 * jambage à p1, panneau pivotant vers l'intérieur.
 */
function drawDoor(
  ctx: CanvasRenderingContext2D,
  p1: ScreenPoint,
  p2: ScreenPoint
): void {
  const v = segmentVectors(p1, p2);
  if (v.len < 6) {
    drawWall(ctx, p1, p2);
    return;
  }
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = COLOR_DOOR;
  ctx.lineWidth = WIDTH_DOOR;
  ctx.setLineDash([]);
  // Trait fin sur toute la longueur (jambages aux deux bouts)
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  // Arc 90° au quart depuis p1, rayon = 60% longueur, ouverture vers la
  // perpendiculaire intérieure (côté n*1).
  const radius = v.len * 0.6;
  const cx = p1.x;
  const cy = p1.y;
  const startAngle = Math.atan2(v.uy, v.ux);
  const endAngle = startAngle + Math.PI / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle, false);
  ctx.stroke();
  // Petit trait perpendiculaire (panneau ouvert) à 90°
  const px = cx + Math.cos(endAngle) * radius;
  const py = cy + Math.sin(endAngle) * radius;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, py);
  ctx.stroke();
  ctx.restore();
}

/** Double trait parallèle — fenêtre. */
function drawWindow(
  ctx: CanvasRenderingContext2D,
  p1: ScreenPoint,
  p2: ScreenPoint
): void {
  const v = segmentVectors(p1, p2);
  if (v.len === 0) return;
  const gap = 4; // pixels
  ctx.save();
  ctx.lineCap = "butt";
  ctx.strokeStyle = COLOR_WINDOW;
  ctx.lineWidth = WIDTH_WINDOW;
  ctx.setLineDash([]);
  // 1er trait
  ctx.beginPath();
  ctx.moveTo(p1.x + v.nx * gap * 0.5, p1.y + v.ny * gap * 0.5);
  ctx.lineTo(p2.x + v.nx * gap * 0.5, p2.y + v.ny * gap * 0.5);
  ctx.stroke();
  // 2e trait
  ctx.beginPath();
  ctx.moveTo(p1.x - v.nx * gap * 0.5, p1.y - v.ny * gap * 0.5);
  ctx.lineTo(p2.x - v.nx * gap * 0.5, p2.y - v.ny * gap * 0.5);
  ctx.stroke();
  ctx.restore();
}

/** Double trait épais avec hachures diagonales — baie vitrée à créer. */
function drawBayWindow(
  ctx: CanvasRenderingContext2D,
  p1: ScreenPoint,
  p2: ScreenPoint
): void {
  const v = segmentVectors(p1, p2);
  if (v.len === 0) return;
  const gap = 6;
  ctx.save();
  ctx.lineCap = "butt";
  ctx.strokeStyle = COLOR_BAY;
  ctx.lineWidth = WIDTH_BAY;
  ctx.setLineDash([]);
  // 1er trait
  ctx.beginPath();
  ctx.moveTo(p1.x + v.nx * gap * 0.5, p1.y + v.ny * gap * 0.5);
  ctx.lineTo(p2.x + v.nx * gap * 0.5, p2.y + v.ny * gap * 0.5);
  ctx.stroke();
  // 2e trait
  ctx.beginPath();
  ctx.moveTo(p1.x - v.nx * gap * 0.5, p1.y - v.ny * gap * 0.5);
  ctx.lineTo(p2.x - v.nx * gap * 0.5, p2.y - v.ny * gap * 0.5);
  ctx.stroke();
  // Hachures diagonales entre les deux traits (motif "à créer")
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLOR_BAY;
  const hatchSpacing = 8;
  const numHatch = Math.max(2, Math.floor(v.len / hatchSpacing));
  for (let i = 0; i <= numHatch; i++) {
    const t = i / numHatch;
    const cx = p1.x + v.ux * v.len * t;
    const cy = p1.y + v.uy * v.len * t;
    ctx.beginPath();
    ctx.moveTo(cx + v.nx * gap * 0.5, cy + v.ny * gap * 0.5);
    ctx.lineTo(cx - v.nx * gap * 0.5, cy - v.ny * gap * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** Pas de trait, juste une pastille discrète au milieu du segment. */
function drawOpening(
  ctx: CanvasRenderingContext2D,
  p1: ScreenPoint,
  p2: ScreenPoint
): void {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  ctx.save();
  ctx.fillStyle = COLOR_OPENING_DOT;
  ctx.beginPath();
  ctx.arc(mx, my, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/** Trait pointillé jaune — segment flexible (modifiable). */
function drawFlexible(
  ctx: CanvasRenderingContext2D,
  p1: ScreenPoint,
  p2: ScreenPoint
): void {
  ctx.save();
  ctx.lineCap = "butt";
  ctx.strokeStyle = COLOR_FLEXIBLE;
  ctx.lineWidth = WIDTH_FLEXIBLE;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
}

/** Highlight bleu de hover en mode annotating (épaisseur double + halo). */
function drawHighlight(
  ctx: CanvasRenderingContext2D,
  p1: ScreenPoint,
  p2: ScreenPoint
): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = COLOR_HIGHLIGHT;
  ctx.lineWidth = 6;
  ctx.globalAlpha = 0.35;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
}

/**
 * Dessine un segment selon son type sémantique.
 * Si `highlight` true, ajoute le halo bleu mode annotating.
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
  switch (type) {
    case "wall":
      drawWall(ctx, p1, p2);
      break;
    case "door":
      drawDoor(ctx, p1, p2);
      break;
    case "window":
      drawWindow(ctx, p1, p2);
      break;
    case "bay_window":
      drawBayWindow(ctx, p1, p2);
      break;
    case "opening":
      drawOpening(ctx, p1, p2);
      break;
    case "flexible":
      drawFlexible(ctx, p1, p2);
      break;
    default: {
      // safe-fallback : exhaustive switch via never (compile-time)
      const _exhaustive: never = type;
      void _exhaustive;
      drawWall(ctx, p1, p2);
    }
  }
}

// ─── Highlight + fill polygon en mode annotating ──────────────────

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

// ─── Hit-test : segment le plus proche d'un clic ──────────────────

/**
 * Calcule la distance point→segment (projection orthogonale).
 * Retourne aussi le point projeté pour positionner un popover.
 */
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

/**
 * Trouve le segment le plus proche du clic, dans la bande de tolérance.
 * Retourne null si aucun segment dans la bande.
 */
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

// ─── Labels UI ─────────────────────────────────────────────────────

export const SEGMENT_TYPE_LABELS: Record<VsRoomSegmentType, string> = {
  wall: "Mur plein",
  door: "Porte",
  window: "Fenêtre",
  bay_window: "Baie vitrée à créer",
  opening: "Ouverture libre",
  flexible: "Flexible",
};
