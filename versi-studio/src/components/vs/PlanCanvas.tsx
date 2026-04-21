/**
 * PlanCanvas — Canvas HTML5 natif pour l'éditeur de lots
 *
 * Affiche le plan en fond avec des overlays rectangulaires colorés par lot.
 * Supporte : drag, resize (8 poignées), sélection, hover, chevauchement.
 * Coordonnées en % (0-100) pour être indépendantes de la résolution.
 *
 * Rendu : Client Component — interactions canvas.
 */

"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { VsLot, ZoneRect, Zone, ZonePolygonPoint } from "@/lib/vs/types";
import {
  getLotColor,
  isPolygon,
  parseZone,
  zoneBoundingBox,
  zonesOverlap as zonesOverlapShared,
  pointInPolygon,
  polygonCentroid,
  polygonAreaPercent,
  polygonHasSelfIntersection,
} from "@/lib/vs/types";

// ─── Types internes ───────────────────────────────────────────────

type HandlePosition =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

interface DragState {
  type: "move" | "resize" | "move-polygon" | "move-vertex";
  lotId: string;
  handle?: HandlePosition;
  vertexIndex?: number; // pour move-vertex
  startMouseX: number;
  startMouseY: number;
  startZone: Zone;
}

interface PanState {
  startMouseX: number;
  startMouseY: number;
  originOffsetX: number;
  originOffsetY: number;
}

interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface PlanCanvasProps {
  planImageUrl: string | null;
  lots: VsLot[];
  selectedLotId: string | null;
  onSelectLot: (lotId: string | null) => void;
  onUpdateLotZone: (lotId: string, zone: Zone) => void;
  onDeleteLot?: (lotId: string) => void;
  lotIndexMap: Map<string, number>;
  m2PerPixel: number | null;
  // Mode dessin polygone (versi-s20 phase 2)
  drawingPolygon?: boolean;
  onPolygonComplete?: (points: ZonePolygonPoint[]) => void;
  onCancelDrawingPolygon?: () => void;
  // Undo/Redo (versi-s22 P3)
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

// ─── Constantes ───────────────────────────────────────────────────

const HANDLE_SIZE = 8;
// HANDLE_HIT_SIZE élargi pour touch targets mobile (cible 20px, plus large que HANDLE_SIZE visuel)
const HANDLE_HIT_SIZE = 20;
const MIN_LOT_SIZE_PERCENT = 3;
const LOT_OPACITY = 0.4;
const HOVER_BORDER_WIDTH = 3;
const SELECTED_BORDER_WIDTH = 3;
const DEFAULT_BORDER_WIDTH = 1.5;

// Zoom + pan (versi-s20)
const ZOOM_MIN = 1;
const ZOOM_MAX = 10;
const ZOOM_FACTOR = 1.1;
const ZOOM_RESET_THRESHOLD = 1.05; // bouton reset visible si scale > seuil
const INITIAL_VIEWPORT: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };

// Dessin polygone (versi-s20 it3)
// Distance px (logiques) sous laquelle le curseur snap sur le 1er sommet pour fermer.
const POLYGON_CLOSE_SNAP_DISTANCE = 15;
// Aire minimale d'un polygone valide (en % carrés) — partagée avec types.ts.
const MIN_POLYGON_AREA_PERCENT = 0.5;

// ─── Helpers ──────────────────────────────────────────────────────

// parseZoneData : retourne un Zone (rect ou polygon) depuis le zone_data brut.
// Backward compat : zones legacy sans champ "type" sont des rect.
function parseZoneData(lot: VsLot): Zone {
  return parseZone(lot.zone_data as Record<string, unknown>);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getOverlappingLotIds(lots: VsLot[]): Set<string> {
  const overlapping = new Set<string>();
  for (let i = 0; i < lots.length; i++) {
    for (let j = i + 1; j < lots.length; j++) {
      const zoneA = parseZoneData(lots[i]);
      const zoneB = parseZoneData(lots[j]);
      if (lots[i].floor_number === lots[j].floor_number && zonesOverlapShared(zoneA, zoneB)) {
        overlapping.add(lots[i].id);
        overlapping.add(lots[j].id);
      }
    }
  }
  return overlapping;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function getHandlePositions(
  x: number,
  y: number,
  w: number,
  h: number
): { position: HandlePosition; x: number; y: number }[] {
  return [
    { position: "nw", x, y },
    { position: "n", x: x + w / 2, y },
    { position: "ne", x: x + w, y },
    { position: "e", x: x + w, y: y + h / 2 },
    { position: "se", x: x + w, y: y + h },
    { position: "s", x: x + w / 2, y: y + h },
    { position: "sw", x, y: y + h },
    { position: "w", x, y: y + h / 2 },
  ];
}

function computeResize(
  start: ZoneRect,
  handle: HandlePosition,
  dxPercent: number,
  dyPercent: number
): ZoneRect {
  let { x_percent, y_percent, width_percent, height_percent } = start;

  switch (handle) {
    case "e":
      width_percent = Math.max(MIN_LOT_SIZE_PERCENT, start.width_percent + dxPercent);
      break;
    case "w":
      {
        const newW = Math.max(MIN_LOT_SIZE_PERCENT, start.width_percent - dxPercent);
        x_percent = start.x_percent + (start.width_percent - newW);
        width_percent = newW;
      }
      break;
    case "s":
      height_percent = Math.max(MIN_LOT_SIZE_PERCENT, start.height_percent + dyPercent);
      break;
    case "n":
      {
        const newH = Math.max(MIN_LOT_SIZE_PERCENT, start.height_percent - dyPercent);
        y_percent = start.y_percent + (start.height_percent - newH);
        height_percent = newH;
      }
      break;
    case "se":
      width_percent = Math.max(MIN_LOT_SIZE_PERCENT, start.width_percent + dxPercent);
      height_percent = Math.max(MIN_LOT_SIZE_PERCENT, start.height_percent + dyPercent);
      break;
    case "nw":
      {
        const newW = Math.max(MIN_LOT_SIZE_PERCENT, start.width_percent - dxPercent);
        const newH = Math.max(MIN_LOT_SIZE_PERCENT, start.height_percent - dyPercent);
        x_percent = start.x_percent + (start.width_percent - newW);
        y_percent = start.y_percent + (start.height_percent - newH);
        width_percent = newW;
        height_percent = newH;
      }
      break;
    case "ne":
      {
        width_percent = Math.max(MIN_LOT_SIZE_PERCENT, start.width_percent + dxPercent);
        const newH = Math.max(MIN_LOT_SIZE_PERCENT, start.height_percent - dyPercent);
        y_percent = start.y_percent + (start.height_percent - newH);
        height_percent = newH;
      }
      break;
    case "sw":
      {
        const newW = Math.max(MIN_LOT_SIZE_PERCENT, start.width_percent - dxPercent);
        x_percent = start.x_percent + (start.width_percent - newW);
        width_percent = newW;
        height_percent = Math.max(MIN_LOT_SIZE_PERCENT, start.height_percent + dyPercent);
      }
      break;
  }

  // Clamper dans les limites du canvas
  x_percent = clamp(x_percent, 0, 100 - MIN_LOT_SIZE_PERCENT);
  y_percent = clamp(y_percent, 0, 100 - MIN_LOT_SIZE_PERCENT);
  width_percent = clamp(width_percent, MIN_LOT_SIZE_PERCENT, 100 - x_percent);
  height_percent = clamp(height_percent, MIN_LOT_SIZE_PERCENT, 100 - y_percent);

  return { x_percent, y_percent, width_percent, height_percent };
}

// ─── Composant ────────────────────────────────────────────────────

export default function PlanCanvas({
  planImageUrl,
  lots,
  selectedLotId,
  onSelectLot,
  onUpdateLotZone,
  onDeleteLot,
  lotIndexMap,
  m2PerPixel,
  drawingPolygon = false,
  onPolygonComplete,
  onCancelDrawingPolygon,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: PlanCanvasProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; lotId: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hoveredLotId, setHoveredLotId] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const animFrameRef = useRef<number>(0);
  const [surfaceOverlay, setSurfaceOverlay] = useState<{
    x: number;
    y: number;
    label: string;
    visible: boolean;
  } | null>(null);
  const rafOverlayRef = useRef<number>(0);

  // ─── Viewport (zoom + pan) — versi-s20 ──────────────────────────
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const panRef = useRef<PanState | null>(null);
  // s24 — drawRect de l'image dans le canvas (letterbox preserve aspect).
  // Utilisé par le hit testing pour mapper correctement les coords DOM → % image.
  // Valeurs : {x, y, w, h} en CSS pixels du canvas (avant viewport zoom/pan).
  const drawRectRef = useRef<{ x: number; y: number; w: number; h: number }>({
    x: 0, y: 0, w: 0, h: 0,
  });
  // Mode main (pan explicite) — toggle via bouton toolbar (versi-s22 P1)
  const [handMode, setHandMode] = useState(false);

  // ─── Tokens CSSOM mémoïsés (versi-s20 it3 P0 perf) ──────────────
  // Lecture une seule fois au mount au lieu de 5 reads par frame.
  // Si Alpha modifie ses tokens dynamiquement, un remount est requis (cas marginal).
  const tokensRef = useRef<{
    errorStrong: string;
    textDefault: string;
    textInverse: string;
    borderDefault: string;
    interactivePrimary: string;
    successStrong: string;
  }>({
    errorStrong: "#B91C1C",
    textDefault: "#0B0B0B",
    textInverse: "#FFFFFF",
    borderDefault: "#D9D4CE",
    interactivePrimary: "#0B0B0B",
    successStrong: "#15803D",
  });
  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    tokensRef.current = {
      errorStrong: styles.getPropertyValue("--color-error-strong").trim() || "#B91C1C",
      textDefault: styles.getPropertyValue("--color-text-default").trim() || "#0B0B0B",
      textInverse: styles.getPropertyValue("--color-text-inverse").trim() || "#FFFFFF",
      borderDefault: styles.getPropertyValue("--color-border-default").trim() || "#D9D4CE",
      interactivePrimary: styles.getPropertyValue("--color-interactive-primary").trim() || "#0B0B0B",
      successStrong: styles.getPropertyValue("--color-success-strong").trim() || "#15803D",
    };
  }, []);

  // ─── Dessin polygone — versi-s20 phase 2 ────────────────────────
  const [drawingPolygonPoints, setDrawingPolygonPoints] = useState<ZonePolygonPoint[]>([]);
  const [drawingCursorPos, setDrawingCursorPos] = useState<{ x: number; y: number } | null>(null);
  // Index du sommet polygone survolé (pour halo + cercle plus gros au hover) — versi-s20 P0
  const [hoveredVertexIndex, setHoveredVertexIndex] = useState<{ lotId: string; index: number } | null>(null);
  // Message d'erreur dessin (auto-hide après 2.5s) — versi-s20 P0
  const [drawingError, setDrawingError] = useState<string | null>(null);
  const drawingErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Surface en cours de tracé pendant dessin polygone (overlay temps réel) — versi-s20 P0
  const [drawingSurface, setDrawingSurface] = useState<{ x: number; y: number; label: string } | null>(null);

  // Helper : afficher un message d'erreur dessin auto-effacé après 2.5s.
  const showDrawingError = useCallback((msg: string) => {
    setDrawingError(msg);
    if (drawingErrorTimerRef.current) clearTimeout(drawingErrorTimerRef.current);
    drawingErrorTimerRef.current = setTimeout(() => setDrawingError(null), 2500);
  }, []);

  // Cleanup timer au démontage
  useEffect(() => {
    return () => {
      if (drawingErrorTimerRef.current) clearTimeout(drawingErrorTimerRef.current);
    };
  }, []);

  // Reset des points quand on quitte le mode dessin (cleanup déclenché par parent)
  const [prevDrawingPolygon, setPrevDrawingPolygon] = useState(drawingPolygon);
  if (drawingPolygon !== prevDrawingPolygon) {
    setPrevDrawingPolygon(drawingPolygon);
    if (!drawingPolygon) {
      setDrawingPolygonPoints([]);
      setDrawingCursorPos(null);
      setDrawingSurface(null);
      setDrawingError(null);
    }
  }

  // ─── Charger l'image du plan ──────────────────────────────────
  // Reset imageLoaded quand l'URL change — setState pendant render (pattern
  // React docs compliant React Compiler).
  const [prevPlanImageUrl, setPrevPlanImageUrl] = useState(planImageUrl);
  if (planImageUrl !== prevPlanImageUrl) {
    setPrevPlanImageUrl(planImageUrl);
    setImageLoaded(false);
  }

  useEffect(() => {
    if (!planImageUrl) {
      imageRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      imageRef.current = null;
      setImageLoaded(false);
    };
    img.src = planImageUrl;
  }, [planImageUrl]);

  // ─── Calcul des overlaps ──────────────────────────────────────
  // BUGFIX versi-s20 : sans useMemo, getOverlappingLotIds retourne un nouveau Set
  // à chaque render. Cela invalide la référence de `draw` (useCallback), qui à son
  // tour déclenche le useEffect du ResizeObserver (deps=[draw]) → reconnexion
  // d'observer → observer peut trigger un callback synthétique → boucle infinie
  // de render. Symptôme visuel : le canvas grossit indéfiniment (layout shift
  // cumulé entre canvas.style.width/height et container flex).
  const overlappingIds = useMemo(() => getOverlappingLotIds(lots), [lots]);

  // ─── Rendu canvas ─────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Adapter la taille du canvas au conteneur (DPR buffer uniquement —
    // la taille CSS est gérée par les classes Tailwind w-full/h-full du JSX
    // pour éviter les boucles layout flex ↔ canvas resize).
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    const dimensionsChanged = canvas.width !== targetW || canvas.height !== targetH;
    if (dimensionsChanged) {
      // Modifier canvas.width/height efface AUTOMATIQUEMENT le canvas.
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform pour éviter accumulation de scale
    ctx.scale(dpr, dpr);
    // Clear explicite si dimensions inchangées (sinon canvas.width l'a fait pour nous)
    if (!dimensionsChanged) {
      ctx.clearRect(0, 0, rect.width, rect.height);
    }

    const w = rect.width;
    const h = rect.height;

    // Fond hors viewport (couleur de remplissage en cas de zoom-out qui révèle des bords)
    ctx.fillStyle = "#F7F5F2";
    ctx.fillRect(0, 0, w, h);

    // Appliquer le viewport (zoom + pan) — versi-s20
    // Tout ce qui est dessiné après est en coordonnées logiques (avant zoom).
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.scale, viewport.scale);

    // DESIGN-F06 à F09 : tokens lus une fois au mount via tokensRef (versi-s20 it3 P0 perf)
    const tokenErrorStrong = tokensRef.current.errorStrong;
    const tokenTextDefault = tokensRef.current.textDefault;
    const tokenTextInverse = tokensRef.current.textInverse;
    const tokenBorderDefault = tokensRef.current.borderDefault;
    const tokenInteractivePrimary = tokensRef.current.interactivePrimary;
    const tokenSuccessStrong = tokensRef.current.successStrong;

    // Fond
    ctx.fillStyle = "#F7F5F2";
    ctx.fillRect(0, 0, w, h);

    // Image du plan
    // s24 — drawX/drawY/drawW/drawH : rectangle effectif de l'IMAGE dans le canvas
    // (letterbox preserve aspect ratio). Les lots/rooms sont en % du plan donc
    // doivent être projetés dans ce rectangle, PAS en % du canvas entier.
    let drawX = 0, drawY = 0, drawW = w, drawH = h;
    drawRectRef.current = { x: drawX, y: drawY, w: drawW, h: drawH };
    if (imageRef.current && imageLoaded) {
      const img = imageRef.current;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = w / h;

      if (imgAspect > canvasAspect) {
        drawW = w;
        drawH = w / imgAspect;
        drawX = 0;
        drawY = (h - drawH) / 2;
      } else {
        drawH = h;
        drawW = h * imgAspect;
        drawX = (w - drawW) / 2;
        drawY = 0;
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      drawRectRef.current = { x: drawX, y: drawY, w: drawW, h: drawH };
    } else if (!planImageUrl) {
      // Pas de plan
      ctx.fillStyle = tokenBorderDefault;
      ctx.font = "14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Aucun plan disponible", w / 2, h / 2);
    }

    // Dessiner les lots (rect + polygon)
    for (const lot of lots) {
      const zone = parseZoneData(lot);
      const index = lotIndexMap.get(lot.id) ?? 0;
      const color = getLotColor(index);
      const isSelected = lot.id === selectedLotId;
      const isHovered = lot.id === hoveredLotId;
      const isOverlapping = overlappingIds.has(lot.id);

      // Couleurs et largeurs de bordure (mutualisé)
      let borderWidth = DEFAULT_BORDER_WIDTH;
      let borderColor = color;
      if (isOverlapping) {
        borderColor = tokenErrorStrong;
        borderWidth = HOVER_BORDER_WIDTH;
      }
      if (isHovered && !isSelected) {
        borderWidth = HOVER_BORDER_WIDTH;
      }
      if (isSelected) {
        borderWidth = SELECTED_BORDER_WIDTH;
        if (!isOverlapping) {
          borderColor = tokenInteractivePrimary;
        }
      }

      let labelX: number;
      let labelY: number;
      let polygonHandlePoints: Array<{ x: number; y: number }> | null = null;

      if (isPolygon(zone)) {
        // ─── Tracé polygone ──────────────────────────────────────
        ctx.beginPath();
        zone.points.forEach((p, i) => {
          const px = drawX + (p.x_percent / 100) * drawW;
          const py = drawY + (p.y_percent / 100) * drawH;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fillStyle = hexToRgba(color, LOT_OPACITY);
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.stroke();

        // Label : centroïde du polygone
        const centroid = polygonCentroid(zone.points);
        labelX = drawX + (centroid.x_percent / 100) * drawW;
        labelY = drawY + (centroid.y_percent / 100) * drawH;

        // Poignées : un cercle sur chaque sommet si sélectionné
        if (isSelected) {
          polygonHandlePoints = zone.points.map((p) => ({
            x: drawX + (p.x_percent / 100) * drawW,
            y: drawY + (p.y_percent / 100) * drawH,
          }));
        }
      } else {
        // ─── Tracé rectangle (legacy) ────────────────────────────
        // s24 — Utiliser drawX/Y/W/H (image letterbox) pas w/h (canvas entier).
        const x = drawX + (zone.x_percent / 100) * drawW;
        const y = drawY + (zone.y_percent / 100) * drawH;
        const lw = (zone.width_percent / 100) * drawW;
        const lh = (zone.height_percent / 100) * drawH;

        ctx.fillStyle = hexToRgba(color, LOT_OPACITY);
        ctx.fillRect(x, y, lw, lh);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(x, y, lw, lh);

        labelX = x + 6;
        labelY = y + 18;

        // Poignées rect si sélectionné
        if (isSelected) {
          const handles = getHandlePositions(x, y, lw, lh);
          for (const handle of handles) {
            ctx.fillStyle = tokenTextInverse;
            ctx.strokeStyle = tokenTextDefault;
            ctx.lineWidth = 1.5;
            ctx.fillRect(
              handle.x - HANDLE_SIZE / 2,
              handle.y - HANDLE_SIZE / 2,
              HANDLE_SIZE,
              HANDLE_SIZE
            );
            ctx.strokeRect(
              handle.x - HANDLE_SIZE / 2,
              handle.y - HANDLE_SIZE / 2,
              HANDLE_SIZE,
              HANDLE_SIZE
            );
          }
        }
      }

      // Label du lot (commun rect + polygon)
      ctx.fillStyle = tokenTextDefault;
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = isPolygon(zone) ? "center" : "left";
      const textMetrics = ctx.measureText(lot.name);
      const labelBgX = isPolygon(zone)
        ? labelX - textMetrics.width / 2 - 2
        : labelX - 2;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillRect(labelBgX, labelY - 13, textMetrics.width + 4, 16);
      ctx.fillStyle = tokenTextDefault;
      ctx.fillText(lot.name, labelX, labelY);

      // Poignées polygon (cercles sur chaque sommet) après le label pour rester visibles
      if (polygonHandlePoints) {
        const hoveredIdx =
          hoveredVertexIndex && hoveredVertexIndex.lotId === lot.id
            ? hoveredVertexIndex.index
            : -1;
        polygonHandlePoints.forEach((pt, i) => {
          const isVertexHovered = i === hoveredIdx;
          // Halo doux autour du sommet survolé (anneau translucide)
          if (isVertexHovered) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, HANDLE_SIZE + 4, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(tokenInteractivePrimary, 0.18);
            ctx.fill();
          }
          // Cercle plus gros (8px de rayon) si hover, sinon taille standard (4px de rayon)
          const radius = isVertexHovered ? 8 : HANDLE_SIZE / 2 + 1;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = tokenTextInverse;
          ctx.fill();
          ctx.strokeStyle = isVertexHovered ? tokenInteractivePrimary : tokenTextDefault;
          ctx.lineWidth = isVertexHovered ? 2 : 1.5;
          ctx.stroke();
        });
      }
    }

    // ─── Polygone en cours de tracé (mode dessin) ────────────────
    if (drawingPolygonPoints.length > 0) {
      // Snap fermeture (versi-s20 it3) : si curseur proche du 1er point ET >= 3 sommets,
      // matérialiser visuellement (1er point gros + couleur succès) → clic simple ferme.
      let snapToFirst = false;
      if (drawingPolygonPoints.length >= 3 && drawingCursorPos) {
        const firstP = drawingPolygonPoints[0];
        const firstX = drawX + (firstP.x_percent / 100) * drawW;
        const firstY = drawY + (firstP.y_percent / 100) * drawH;
        const dx = drawingCursorPos.x - firstX;
        const dy = drawingCursorPos.y - firstY;
        if (Math.sqrt(dx * dx + dy * dy) <= POLYGON_CLOSE_SNAP_DISTANCE) {
          snapToFirst = true;
        }
      }

      ctx.strokeStyle = tokenInteractivePrimary;
      ctx.lineWidth = 2;
      ctx.fillStyle = hexToRgba(tokenInteractivePrimary, 0.15);

      // Ligne brisée entre les points existants
      ctx.beginPath();
      drawingPolygonPoints.forEach((p, i) => {
        const px = drawX + (p.x_percent / 100) * drawW;
        const py = drawY + (p.y_percent / 100) * drawH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // Ligne pointillée du dernier point au curseur
      if (drawingCursorPos) {
        const lastP = drawingPolygonPoints[drawingPolygonPoints.length - 1];
        const lastX = drawX + (lastP.x_percent / 100) * drawW;
        const lastY = drawY + (lastP.y_percent / 100) * drawH;
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        // Si snap actif : la ligne pointillée se termine sur le 1er point (preview de fermeture)
        if (snapToFirst) {
          const firstP = drawingPolygonPoints[0];
          const firstX = drawX + (firstP.x_percent / 100) * drawW;
          const firstY = drawY + (firstP.y_percent / 100) * drawH;
          ctx.lineTo(firstX, firstY);
        } else {
          ctx.lineTo(drawingCursorPos.x, drawingCursorPos.y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Cercles sur les points existants — premier mis en évidence (cercle plus gros)
      // Si snap actif : 1er point passe à 14px (8px rayon) + couleur succès → indique clic ferme.
      drawingPolygonPoints.forEach((p, i) => {
        const px = drawX + (p.x_percent / 100) * drawW;
        const py = drawY + (p.y_percent / 100) * drawH;
        const isFirstSnapping = i === 0 && snapToFirst;
        const radius = isFirstSnapping ? 8 : i === 0 ? 7 : 4;
        // Halo doux autour du 1er point en mode snap
        if (isFirstSnapping) {
          ctx.beginPath();
          ctx.arc(px, py, radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(tokenSuccessStrong, 0.25);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        if (isFirstSnapping) {
          ctx.fillStyle = tokenSuccessStrong;
        } else {
          ctx.fillStyle = i === 0 ? tokenInteractivePrimary : tokenTextInverse;
        }
        ctx.fill();
        ctx.strokeStyle = isFirstSnapping ? tokenSuccessStrong : tokenInteractivePrimary;
        ctx.lineWidth = isFirstSnapping ? 2.5 : 2;
        ctx.stroke();
      });
    }
  }, [
    lots,
    selectedLotId,
    hoveredLotId,
    hoveredVertexIndex,
    imageLoaded,
    planImageUrl,
    lotIndexMap,
    overlappingIds,
    viewport,
    drawingPolygonPoints,
    drawingCursorPos,
  ]);

  // ─── Redessiner à chaque changement ───────────────────────────

  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  // ─── Redessiner quand le conteneur change de taille ───────────
  // BUGFIX versi-s20 : guard anti-boucle ResizeObserver.
  // Le callback ne redessine QUE si les dimensions ont réellement changé (>= 1px).
  // `draw` modifie canvas.style.width/height, ce qui peut provoquer un reflow
  // du container flex et déclencher le ResizeObserver de façon répétée.
  // Le guard casse cette chaîne si les dimensions sont stables.

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastWidth = 0;
    let lastHeight = 0;
    let resizeCount = 0;
    let resizeBudget = 0; // throttle si resize en rafale > 5/sec
    const RESIZE_BUDGET_RESET_MS = 1000;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      // Seuil 1px pour absorber les sub-pixel fluctuations du layout
      if (Math.abs(width - lastWidth) < 1 && Math.abs(height - lastHeight) < 1) {
        return;
      }
      // Circuit breaker : si > 10 resize en < 1s, on bloque (loop détectée)
      const now = Date.now();
      if (now - resizeBudget > RESIZE_BUDGET_RESET_MS) {
        resizeBudget = now;
        resizeCount = 0;
      }
      resizeCount++;
      if (resizeCount > 10) {
        console.warn("[PlanCanvas] Boucle resize détectée, draw bloqué");
        return;
      }
      lastWidth = width;
      lastHeight = height;
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(draw);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  // ─── Hit testing ──────────────────────────────────────────────

  // getCanvasCoords retourne les coordonnées LOGIQUES (avant zoom/pan), donc directement
  // utilisables pour le hit testing des lots qui sont dessinés en coords logiques.
  // Conversion : (clientPos - canvasOrigin - viewportOffset) / viewportScale
  function getCanvasCoords(e: ReactMouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { px: 0, py: 0 };
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    return {
      px: (rawX - viewport.offsetX) / viewport.scale,
      py: (rawY - viewport.offsetY) / viewport.scale,
    };
  }

  // getCanvasCoordsRaw retourne les coords écran (sans correction viewport),
  // utile pour positionner des overlays HTML par-dessus le canvas.
  function getCanvasCoordsRaw(e: ReactMouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { px: 0, py: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
    };
  }

  // hitTestHandle (rect uniquement) — pour les polygones, on utilise hitTestPolygonVertex
  function hitTestHandle(
    px: number,
    py: number,
    lot: VsLot
  ): HandlePosition | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const zone = parseZoneData(lot);
    if (isPolygon(zone)) return null; // les polygones ont leurs propres sommets
    const dr = drawRectRef.current;
    const x = dr.x + (zone.x_percent / 100) * dr.w;
    const y = dr.y + (zone.y_percent / 100) * dr.h;
    const w = (zone.width_percent / 100) * dr.w;
    const h = (zone.height_percent / 100) * dr.h;

    const handles = getHandlePositions(x, y, w, h);
    for (const handle of handles) {
      if (
        Math.abs(px - handle.x) <= HANDLE_HIT_SIZE / 2 &&
        Math.abs(py - handle.y) <= HANDLE_HIT_SIZE / 2
      ) {
        return handle.position;
      }
    }
    return null;
  }

  // hitTestPolygonVertex : retourne l'index du sommet sous le curseur, ou null
  function hitTestPolygonVertex(
    px: number,
    py: number,
    lot: VsLot
  ): number | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const zone = parseZoneData(lot);
    if (!isPolygon(zone)) return null;
    const dr = drawRectRef.current;
    for (let i = 0; i < zone.points.length; i++) {
      const vx = dr.x + (zone.points[i].x_percent / 100) * dr.w;
      const vy = dr.y + (zone.points[i].y_percent / 100) * dr.h;
      if (
        Math.abs(px - vx) <= HANDLE_HIT_SIZE / 2 &&
        Math.abs(py - vy) <= HANDLE_HIT_SIZE / 2
      ) {
        return i;
      }
    }
    return null;
  }

  function hitTestLot(px: number, py: number): string | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const dr = drawRectRef.current;
    if (dr.w <= 0 || dr.h <= 0) return null;

    // Itérer en sens inverse pour que le lot le plus au-dessus soit sélectionné d'abord
    for (let i = lots.length - 1; i >= 0; i--) {
      const lot = lots[i];
      const zone = parseZoneData(lot);
      if (isPolygon(zone)) {
        // Convertir px/py en % du plan image puis tester pointInPolygon
        const xp = ((px - dr.x) / dr.w) * 100;
        const yp = ((py - dr.y) / dr.h) * 100;
        if (pointInPolygon(xp, yp, zone.points)) return lot.id;
      } else {
        const x = dr.x + (zone.x_percent / 100) * dr.w;
        const y = dr.y + (zone.y_percent / 100) * dr.h;
        const w = (zone.width_percent / 100) * dr.w;
        const h = (zone.height_percent / 100) * dr.h;
        if (px >= x && px <= x + w && py >= y && py <= y + h) {
          return lot.id;
        }
      }
    }
    return null;
  }

  // ─── Curseur ──────────────────────────────────────────────────

  function getCursor(handle: HandlePosition | null, isOverLot: boolean): string {
    if (handle) {
      const cursorMap: Record<HandlePosition, string> = {
        nw: "nwse-resize",
        n: "ns-resize",
        ne: "nesw-resize",
        e: "ew-resize",
        se: "nwse-resize",
        s: "ns-resize",
        sw: "nesw-resize",
        w: "ew-resize",
      };
      return cursorMap[handle];
    }
    if (isOverLot) return "move";
    return "default";
  }

  // ─── Clamp pan viewport (versi-s20 it3 P0 robustesse) ─────────
  // Empêche le plan de disparaître complètement à fort zoom + pan extrême.
  // Bornes : offsetX ∈ [-(scale-1)*w, 0], offsetY ∈ [-(scale-1)*h, 0]
  // (à scale=1 → forcément [0, 0], donc INITIAL_VIEWPORT).
  const clampViewportOffsets = useCallback(
    (scale: number, offsetX: number, offsetY: number, rectW: number, rectH: number) => {
      const minX = -(scale - 1) * rectW;
      const minY = -(scale - 1) * rectH;
      return {
        offsetX: clamp(offsetX, minX, 0),
        offsetY: clamp(offsetY, minY, 0),
      };
    },
    []
  );

  // ─── Events souris ────────────────────────────────────────────
  // NOTE : handleMouseDown/handleMouseMove utilisent des helpers déclarés dans le
  // composant (hitTestLot, hitTestHandle, getCanvasCoords). React Compiler gère
  // automatiquement la memoization — pas besoin de useCallback manuel qui créerait
  // un mismatch de dépendances inférées.

  const handleMouseDown = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    // ─── PAN — versi-s20 + versi-s22 P1 ──────────────────────────
    // Middle-click (button === 1) OU Ctrl/Cmd + left-click = activer le pan
    // versi-s22 P1 : OU mode main actif + left-click
    // versi-s22 P1 : OU zoomé (scale > 1) + left-click sur fond vide (pas sur un lot)
    const isPanTrigger =
      e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey));
    const isHandModePan = handMode && e.button === 0;
    if (isPanTrigger || isHandModePan) {
      e.preventDefault();
      const raw = getCanvasCoordsRaw(e);
      panRef.current = {
        startMouseX: raw.px,
        startMouseY: raw.py,
        originOffsetX: viewport.offsetX,
        originOffsetY: viewport.offsetY,
      };
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = "grabbing";
      return;
    }

    const { px, py } = getCanvasCoords(e);

    // ─── MODE DESSIN POLYGONE — versi-s20 phase 2 ────────────────
    // Clic gauche dans le mode dessin :
    //   - si curseur snap sur 1er sommet (>= 3 points + dist <= seuil) → fermer (versi-s20 it3)
    //   - sinon → ajouter un point au polygone en cours
    if (drawingPolygon && e.button === 0) {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();

      // Snap fermeture : si >= 3 points + curseur proche du 1er sommet → fermer
      if (drawingPolygonPoints.length >= 3) {
        const firstP = drawingPolygonPoints[0];
        const dr0 = drawRectRef.current;
        const firstPx = dr0.x + (firstP.x_percent / 100) * dr0.w;
        const firstPy = dr0.y + (firstP.y_percent / 100) * dr0.h;
        const dxSnap = px - firstPx;
        const dySnap = py - firstPy;
        if (Math.sqrt(dxSnap * dxSnap + dySnap * dySnap) <= POLYGON_CLOSE_SNAP_DISTANCE) {
          // Guards (cohérence avec double-clic et Enter)
          if (polygonHasSelfIntersection(drawingPolygonPoints)) {
            showDrawingError("Le contour se croise — corrigez les points qui se chevauchent.");
            return;
          }
          if (polygonAreaPercent(drawingPolygonPoints) < MIN_POLYGON_AREA_PERCENT) {
            showDrawingError("Le contour est trop petit. Tracez une zone plus grande.");
            return;
          }
          if (onPolygonComplete) {
            onPolygonComplete(drawingPolygonPoints);
            setDrawingPolygonPoints([]);
            setDrawingCursorPos(null);
            setDrawingSurface(null);
          }
          return;
        }
      }

      const dr1 = drawRectRef.current;
      const xp = dr1.w > 0 ? ((px - dr1.x) / dr1.w) * 100 : 0;
      const yp = dr1.h > 0 ? ((py - dr1.y) / dr1.h) * 100 : 0;
      // Clamp dans 0-100
      const clampedX = clamp(xp, 0, 100);
      const clampedY = clamp(yp, 0, 100);
      setDrawingPolygonPoints((prev) => [...prev, { x_percent: clampedX, y_percent: clampedY }]);
      return;
    }

    // Vérifier d'abord les poignées du lot sélectionné
    if (selectedLotId) {
      const selectedLot = lots.find((l) => l.id === selectedLotId);
      if (selectedLot) {
        const selectedZone = parseZoneData(selectedLot);
        // Polygon : test sommet
        if (isPolygon(selectedZone)) {
          const vertexIdx = hitTestPolygonVertex(px, py, selectedLot);
          if (vertexIdx !== null) {
            dragRef.current = {
              type: "move-vertex",
              lotId: selectedLotId,
              vertexIndex: vertexIdx,
              startMouseX: px,
              startMouseY: py,
              startZone: selectedZone,
            };
            const canvasEl2 = canvasRef.current;
            if (canvasEl2) canvasEl2.style.cursor = "grabbing";
            return;
          }
        } else {
          // Rect : test poignée resize
          const handle = hitTestHandle(px, py, selectedLot);
          if (handle) {
            dragRef.current = {
              type: "resize",
              lotId: selectedLotId,
              handle,
              startMouseX: px,
              startMouseY: py,
              startZone: selectedZone,
            };
            return;
          }
        }
      }
    }

    // Vérifier si on clique sur un lot
    const hitLotId = hitTestLot(px, py);
    if (hitLotId) {
      onSelectLot(hitLotId);
      const hitLot = lots.find((l) => l.id === hitLotId);
      if (hitLot) {
        const hitZone = parseZoneData(hitLot);
        dragRef.current = {
          type: isPolygon(hitZone) ? "move-polygon" : "move",
          lotId: hitLotId,
          startMouseX: px,
          startMouseY: py,
          startZone: hitZone,
        };
      }
    } else {
      onSelectLot(null);
      // versi-s22 P1 : si zoomé, clic sur fond vide = pan
      if (viewport.scale > 1 && e.button === 0 && !drawingPolygon) {
        const raw = getCanvasCoordsRaw(e);
        panRef.current = {
          startMouseX: raw.px,
          startMouseY: raw.py,
          originOffsetX: viewport.offsetX,
          originOffsetY: viewport.offsetY,
        };
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = "grabbing";
      }
    }
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvasEl = canvasRef.current;

    // ─── PAN move — versi-s20 ───────────────────────────────────
    if (panRef.current) {
      const raw = getCanvasCoordsRaw(e);
      const dx = raw.px - panRef.current.startMouseX;
      const dy = raw.py - panRef.current.startMouseY;
      const rect2 = canvasEl?.getBoundingClientRect();
      setViewport((prev) => {
        const rawX = panRef.current!.originOffsetX + dx;
        const rawY = panRef.current!.originOffsetY + dy;
        if (!rect2) return { ...prev, offsetX: rawX, offsetY: rawY };
        // Clamp pan (versi-s20 it3 P0) : empêche disparition du plan hors viewport.
        const clamped = clampViewportOffsets(prev.scale, rawX, rawY, rect2.width, rect2.height);
        return { ...prev, offsetX: clamped.offsetX, offsetY: clamped.offsetY };
      });
      if (canvasEl) canvasEl.style.cursor = "grabbing";
      return;
    }

    const { px, py } = getCanvasCoords(e);
    const canvas = canvasEl;

    // ─── MODE DESSIN POLYGONE — tracking curseur ──────────────────
    if (drawingPolygon) {
      // Stocker la position curseur en pixels logiques (canvas-relatif)
      setDrawingCursorPos({ x: px, y: py });

      // Snap fermeture (versi-s20 it3) : curseur "pointer" si proche du 1er point.
      let cursorSnap = false;
      if (drawingPolygonPoints.length >= 3) {
        const firstP = drawingPolygonPoints[0];
        const dr2 = drawRectRef.current;
        if (dr2.w > 0) {
          const firstPx = dr2.x + (firstP.x_percent / 100) * dr2.w;
          const firstPy = dr2.y + (firstP.y_percent / 100) * dr2.h;
          const dxS = px - firstPx;
          const dyS = py - firstPy;
          if (Math.sqrt(dxS * dxS + dyS * dyS) <= POLYGON_CLOSE_SNAP_DISTANCE) {
            cursorSnap = true;
          }
        }
      }
      if (canvas) canvas.style.cursor = cursorSnap ? "pointer" : "crosshair";

      // versi-s20 it3 : surface temps réel dès 1er sommet (label adapté).
      // 1 pt → "0.0 m²" (ou message calibration), 2 pts → distance segment, 3+ pts → surface polygone.
      const containerEl = containerRef.current;
      if (canvas && containerEl) {
        const canvasRect = canvas.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();
        let label: string | null = null;
        const calibrated = m2PerPixel != null && m2PerPixel > 0;

        // S23 FIX : m2PerPixel est en m²/pixel NATIF. On calcule donc les
        // surfaces/longueurs en coords natives (naturalWidth/Height), PAS en
        // pixels d'affichage du canvas (canvasRect). Ces deux grandeurs
        // diffèrent par le ratio display→native, qui dépend de la taille du
        // canvas à l'écran et provoquait des surfaces fausses.
        const img = imageRef.current;
        const nativeW = img?.naturalWidth ?? 0;
        const nativeH = img?.naturalHeight ?? 0;
        const hasNative = nativeW > 0 && nativeH > 0;

        if (drawingPolygonPoints.length === 1) {
          // 1er sommet posé : surface = 0
          label = calibrated ? "0.0 m²" : "Calibrez le plan pour la surface";
        } else if (drawingPolygonPoints.length === 2) {
          // 2 sommets : afficher la longueur du segment (utile pour mesurer un mur)
          const a = drawingPolygonPoints[0];
          const b = drawingPolygonPoints[1];
          if (calibrated && hasNative) {
            // Longueur en pixels natifs : coords % × dimensions natives.
            const axN = (a.x_percent / 100) * nativeW;
            const ayN = (a.y_percent / 100) * nativeH;
            const bxN = (b.x_percent / 100) * nativeW;
            const byN = (b.y_percent / 100) * nativeH;
            const distPxNative = Math.sqrt((bxN - axN) ** 2 + (byN - ayN) ** 2);
            // m2PerPixel = m² par pixel² natif. Donc m par pixel natif = sqrt(m2PerPixel).
            const mPerPxNative = Math.sqrt(m2PerPixel);
            label = `${(distPxNative * mPerPxNative).toFixed(2)} m`;
          } else {
            label = "Calibrez le plan pour la longueur";
          }
        } else if (drawingPolygonPoints.length >= 3) {
          if (calibrated && hasNative) {
            const areaPctSq = polygonAreaPercent(drawingPolygonPoints);
            const areaPixelsSq = (areaPctSq / 10000) * nativeW * nativeH;
            const surfaceM2 = areaPixelsSq * m2PerPixel;
            label = `${surfaceM2.toFixed(1)} m²`;
          } else {
            label = "Calibrez le plan pour la surface";
          }
        }

        if (label !== null) {
          // Position : coords écran du curseur (px logiques → écran via viewport)
          const cursorScreenX = px * viewport.scale + viewport.offsetX;
          const cursorScreenY = py * viewport.scale + viewport.offsetY;
          const offsetX = canvasRect.left - containerRect.left;
          const offsetY = canvasRect.top - containerRect.top;
          // Décalage pour ne pas masquer le curseur (12px droite, 28px haut)
          // Largeur estimée plus grande pour les labels textuels longs ("Calibrez le plan…")
          const estLabelW = label.length * 7 + 16;
          let overlayX = offsetX + cursorScreenX + 12;
          const overlayY = offsetY + cursorScreenY - 28;
          if (overlayX + estLabelW > containerRect.width) {
            overlayX = offsetX + cursorScreenX - estLabelW - 4;
          }
          setDrawingSurface({ x: overlayX, y: overlayY, label });
        } else if (drawingSurface !== null) {
          setDrawingSurface(null);
        }
      }
      return;
    }

    if (dragRef.current && canvas) {
      const { type, lotId, handle, vertexIndex, startMouseX, startMouseY, startZone } =
        dragRef.current;
      // s24 — déplacement en % du PLAN (image), pas du canvas.
      const dr3 = drawRectRef.current;
      const dxPercent = dr3.w > 0 ? ((px - startMouseX) / dr3.w) * 100 : 0;
      const dyPercent = dr3.h > 0 ? ((py - startMouseY) / dr3.h) * 100 : 0;

      let newZone: Zone;

      if (type === "move-polygon" && isPolygon(startZone)) {
        // Translation de tous les sommets
        // Bornes : aucun sommet ne doit sortir [0,100]
        const xs = startZone.points.map((p) => p.x_percent);
        const ys = startZone.points.map((p) => p.y_percent);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const clampedDx = clamp(dxPercent, -minX, 100 - maxX);
        const clampedDy = clamp(dyPercent, -minY, 100 - maxY);
        newZone = {
          type: "polygon",
          points: startZone.points.map((p) => ({
            x_percent: p.x_percent + clampedDx,
            y_percent: p.y_percent + clampedDy,
          })),
        };
      } else if (type === "move-vertex" && isPolygon(startZone) && vertexIndex !== undefined) {
        // Déplacer un sommet individuel
        const original = startZone.points[vertexIndex];
        const newPt = {
          x_percent: clamp(original.x_percent + dxPercent, 0, 100),
          y_percent: clamp(original.y_percent + dyPercent, 0, 100),
        };
        newZone = {
          type: "polygon",
          points: startZone.points.map((p, i) => (i === vertexIndex ? newPt : p)),
        };
      } else if (type === "move" && !isPolygon(startZone)) {
        newZone = {
          type: "rect",
          x_percent: clamp(startZone.x_percent + dxPercent, 0, 100 - startZone.width_percent),
          y_percent: clamp(startZone.y_percent + dyPercent, 0, 100 - startZone.height_percent),
          width_percent: startZone.width_percent,
          height_percent: startZone.height_percent,
        };
      } else if (!isPolygon(startZone)) {
        newZone = computeResize(startZone, handle!, dxPercent, dyPercent);
      } else {
        return; // état drag invalide, ignorer
      }

      onUpdateLotZone(lotId, newZone);

      // Overlay surface m² temps réel (F05) — calcul dans rAF pour ne pas bloquer le drag
      cancelAnimationFrame(rafOverlayRef.current);
      rafOverlayRef.current = requestAnimationFrame(() => {
        const canvasEl = canvasRef.current;
        const containerEl = containerRef.current;
        if (!canvasEl || !containerEl) return;
        const canvasRect = canvasEl.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();
        // Bounding box pour calculer la position à l'écran (pixels d'affichage)
        const bb = zoneBoundingBox(newZone);
        // S23 FIX : surface calculée en pixels NATIFS, pas pixels d'affichage.
        // m2PerPixel est en m²/px² natif depuis la calibration normalisée.
        const img = imageRef.current;
        const nativeW = img?.naturalWidth ?? 0;
        const nativeH = img?.naturalHeight ?? 0;
        const calibrated = m2PerPixel != null && m2PerPixel > 0;
        const hasNative = nativeW > 0 && nativeH > 0;
        let surfaceM2: number;
        if (calibrated && hasNative) {
          if (isPolygon(newZone)) {
            // Surface réelle via shoelace (% carrés → pixels² natifs → m²)
            const areaPctSq = (() => {
              const pts = newZone.points;
              let sum = 0;
              for (let i = 0; i < pts.length; i++) {
                const j = (i + 1) % pts.length;
                sum += pts[i].x_percent * pts[j].y_percent;
                sum -= pts[j].x_percent * pts[i].y_percent;
              }
              return Math.abs(sum / 2);
            })();
            const areaPixelsSq = (areaPctSq / 10000) * nativeW * nativeH;
            surfaceM2 = areaPixelsSq * m2PerPixel;
          } else {
            const widthPxNative = (bb.w / 100) * nativeW;
            const heightPxNative = (bb.h / 100) * nativeH;
            surfaceM2 = widthPxNative * heightPxNative * m2PerPixel;
          }
        } else {
          surfaceM2 = 0;
        }
        const label = calibrated && hasNative ? `${surfaceM2.toFixed(1)} m²` : "— m²";
        // Position overlay : appliquer viewport (scale + offset) pour suivre le lot à l'écran
        const lotRightLogicalPx = ((bb.x + bb.w) / 100) * canvasRect.width;
        const lotBottomLogicalPx = ((bb.y + bb.h) / 100) * canvasRect.height;
        const lotLeftLogicalPx = (bb.x / 100) * canvasRect.width;
        const lotRightScreenPx = lotRightLogicalPx * viewport.scale + viewport.offsetX;
        const lotBottomScreenPx = lotBottomLogicalPx * viewport.scale + viewport.offsetY;
        const lotLeftScreenPx = lotLeftLogicalPx * viewport.scale + viewport.offsetX;
        const offsetX = canvasRect.left - containerRect.left;
        const offsetY = canvasRect.top - containerRect.top;
        let overlayX = offsetX + lotRightScreenPx + 12;
        const overlayY = offsetY + lotBottomScreenPx - 28;
        if (overlayX + 80 > containerRect.width) {
          overlayX = offsetX + lotLeftScreenPx - 84;
        }
        setSurfaceOverlay({ x: overlayX, y: overlayY, label, visible: true });
      });
      return;
    }

    // Hover
    if (selectedLotId) {
      const selectedLot = lots.find((l) => l.id === selectedLotId);
      if (selectedLot) {
        const selectedZone = parseZoneData(selectedLot);
        if (isPolygon(selectedZone)) {
          const vIdx = hitTestPolygonVertex(px, py, selectedLot);
          if (vIdx !== null) {
            // versi-s20 P0 : "grab" est le bon affordance pour saisir un sommet déplaçable
            // (le drag actif passera à "grabbing" via le handler de move-vertex).
            if (canvas) canvas.style.cursor = "grab";
            setHoveredLotId(null);
            // Stocker l'index pour rendre le sommet plus gros + halo
            if (
              !hoveredVertexIndex ||
              hoveredVertexIndex.lotId !== selectedLot.id ||
              hoveredVertexIndex.index !== vIdx
            ) {
              setHoveredVertexIndex({ lotId: selectedLot.id, index: vIdx });
            }
            return;
          }
        } else {
          const handle = hitTestHandle(px, py, selectedLot);
          if (handle) {
            if (canvas) canvas.style.cursor = getCursor(handle, false);
            setHoveredLotId(null);
            if (hoveredVertexIndex !== null) setHoveredVertexIndex(null);
            return;
          }
        }
      }
    }

    // Pas sur un sommet : reset hoveredVertexIndex
    if (hoveredVertexIndex !== null) setHoveredVertexIndex(null);

    const hitLotId = hitTestLot(px, py);
    setHoveredLotId(hitLotId);
    if (canvas) {
      if (handMode) {
        // Mode main : toujours "grab" sauf sur un lot (où on montre quand même "grab")
        canvas.style.cursor = "grab";
      } else if (viewport.scale > 1 && !hitLotId) {
        // Zoomé + fond vide : curseur "grab" pour indiquer le pan possible
        canvas.style.cursor = "grab";
      } else {
        canvas.style.cursor = getCursor(null, !!hitLotId);
      }
    }
  };

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    setSurfaceOverlay(null);
    if (panRef.current) {
      panRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = "default";
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null;
    setHoveredLotId(null);
    setSurfaceOverlay(null);
    if (panRef.current) {
      panRef.current = null;
      const canvas = canvasRef.current;
      // versi-s20 it3 : ne pas reset cursor en mode dessin polygone
      if (canvas && !drawingPolygon) canvas.style.cursor = "default";
    }
    // versi-s20 it3 : conserver crosshair en mode dessin polygone même si la souris
    // sort du canvas (Thomas frustration #3 — cursor flicker au passage sidebar).
    if (drawingPolygon) {
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = "crosshair";
    }
  }, [drawingPolygon]);

  // ─── Wheel — zoom centré curseur (versi-s20) ────────────────
  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      const currentScale = viewport.scale;
      const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, currentScale * factor));
      if (newScale === currentScale) return;
      // Zoom centré curseur : la position sous le curseur reste fixe.
      // formule : newOffset = cursor - (cursor - oldOffset) * (newScale / oldScale)
      const ratio = newScale / currentScale;
      const newOffsetX = cx - (cx - viewport.offsetX) * ratio;
      const newOffsetY = cy - (cy - viewport.offsetY) * ratio;
      // Si on revient à scale=1, on remet aussi offset à 0 pour éviter les dérives.
      if (newScale === ZOOM_MIN) {
        setViewport(INITIAL_VIEWPORT);
      } else {
        // Clamp pour empêcher le plan de disparaître hors viewport (versi-s20 it3 P0)
        const clamped = clampViewportOffsets(newScale, newOffsetX, newOffsetY, rect.width, rect.height);
        setViewport({ scale: newScale, offsetX: clamped.offsetX, offsetY: clamped.offsetY });
      }
    },
    [viewport, clampViewportOffsets]
  );

  // ─── Double-clic — fermer polygone (mode dessin) OU reset viewport ──────
  const handleDoubleClick = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      // Mode dessin : double-clic = fermer le polygone (>= 3 points requis)
      if (drawingPolygon) {
        // versi-s20 P0 — feedback explicite si trop peu de points.
        if (drawingPolygonPoints.length < 3) {
          showDrawingError("Posez au moins 3 points avant de fermer le contour.");
          return;
        }
        // versi-s20 P0 — refus si polygone auto-intersecté (papillon).
        if (polygonHasSelfIntersection(drawingPolygonPoints)) {
          showDrawingError("Le contour se croise — corrigez les points qui se chevauchent.");
          return;
        }
        // versi-s20 it3 — refus si polygone dégénéré (aire trop petite).
        if (polygonAreaPercent(drawingPolygonPoints) < MIN_POLYGON_AREA_PERCENT) {
          showDrawingError("Le contour est trop petit. Tracez une zone plus grande.");
          return;
        }
        if (onPolygonComplete) {
          onPolygonComplete(drawingPolygonPoints);
          setDrawingPolygonPoints([]);
          setDrawingCursorPos(null);
          setDrawingSurface(null);
        }
        return;
      }
      const { px, py } = getCanvasCoords(e);
      const hit = hitTestLot(px, py);
      if (!hit) {
        setViewport(INITIAL_VIEWPORT);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewport, lots, drawingPolygon, drawingPolygonPoints, onPolygonComplete, showDrawingError]
  );

  const resetViewport = useCallback(() => {
    setViewport(INITIAL_VIEWPORT);
  }, []);

  /** Zoom bouton + : x1.25 centré sur le milieu du canvas */
  const zoomIn = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setViewport((prev) => {
      const newScale = Math.min(ZOOM_MAX, prev.scale * 1.25);
      if (newScale === prev.scale) return prev;
      const ratio = newScale / prev.scale;
      const newOffsetX = cx - (cx - prev.offsetX) * ratio;
      const newOffsetY = cy - (cy - prev.offsetY) * ratio;
      const clamped = clampViewportOffsets(newScale, newOffsetX, newOffsetY, rect.width, rect.height);
      return { scale: newScale, offsetX: clamped.offsetX, offsetY: clamped.offsetY };
    });
  }, [clampViewportOffsets]);

  /** Zoom bouton - : x0.8 centré sur le milieu du canvas */
  const zoomOut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setViewport((prev) => {
      const newScale = Math.max(ZOOM_MIN, prev.scale * 0.8);
      if (newScale <= ZOOM_MIN) return INITIAL_VIEWPORT;
      const ratio = newScale / prev.scale;
      const newOffsetX = cx - (cx - prev.offsetX) * ratio;
      const newOffsetY = cy - (cy - prev.offsetY) * ratio;
      const clamped = clampViewportOffsets(newScale, newOffsetX, newOffsetY, rect.width, rect.height);
      return { scale: newScale, offsetX: clamped.offsetX, offsetY: clamped.offsetY };
    });
  }, [clampViewportOffsets]);

  // ─── Clavier (DESIGN-F11 accessibilité canvas) ────────────────

  const handleCanvasKeyDown = useCallback((e: ReactKeyboardEvent<HTMLCanvasElement>) => {
    // ─── MODE DESSIN POLYGONE ─────────────────────────────────────
    if (drawingPolygon) {
      if (e.key === "Escape") {
        e.preventDefault();
        setDrawingPolygonPoints([]);
        setDrawingCursorPos(null);
        setDrawingSurface(null);
        setDrawingError(null);
        if (onCancelDrawingPolygon) onCancelDrawingPolygon();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        setDrawingPolygonPoints((prev) => prev.slice(0, -1));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        // versi-s20 P0 — feedback explicite si trop peu de points.
        if (drawingPolygonPoints.length < 3) {
          showDrawingError("Posez au moins 3 points avant de fermer le contour.");
          return;
        }
        // versi-s20 P0 — refus si polygone auto-intersecté.
        if (polygonHasSelfIntersection(drawingPolygonPoints)) {
          showDrawingError("Le contour se croise — corrigez les points qui se chevauchent.");
          return;
        }
        // versi-s20 it3 — refus si polygone dégénéré (aire trop petite).
        if (polygonAreaPercent(drawingPolygonPoints) < MIN_POLYGON_AREA_PERCENT) {
          showDrawingError("Le contour est trop petit. Tracez une zone plus grande.");
          return;
        }
        if (onPolygonComplete) {
          onPolygonComplete(drawingPolygonPoints);
          setDrawingPolygonPoints([]);
          setDrawingCursorPos(null);
          setDrawingSurface(null);
        }
        return;
      }
      return; // les autres touches sont ignorées en mode dessin
    }

    // Escape : désélectionne (même sans lot sélectionné, ferme menu contextuel)
    if (e.key === "Escape") {
      setContextMenu(null);
      onSelectLot(null);
      return;
    }
    if (!selectedLotId) return;
    // Delete / Backspace : supprime le lot sélectionné
    if ((e.key === "Delete" || e.key === "Backspace") && onDeleteLot) {
      e.preventDefault();
      onDeleteLot(selectedLotId);
      return;
    }
    const lot = lots.find((l) => l.id === selectedLotId);
    if (!lot) return;
    const zone = parseZoneData(lot);
    const step = e.shiftKey ? 5 : 1;
    let dx = 0;
    let dy = 0;
    let changed = false;
    if (e.key === "ArrowUp") { dy = -step; changed = true; }
    else if (e.key === "ArrowDown") { dy = step; changed = true; }
    else if (e.key === "ArrowLeft") { dx = -step; changed = true; }
    else if (e.key === "ArrowRight") { dx = step; changed = true; }
    if (changed) {
      e.preventDefault();
      if (isPolygon(zone)) {
        // Translation du polygone : clamp pour qu'aucun sommet ne sorte
        const xs = zone.points.map((p) => p.x_percent);
        const ys = zone.points.map((p) => p.y_percent);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const clampedDx = clamp(dx, -minX, 100 - maxX);
        const clampedDy = clamp(dy, -minY, 100 - maxY);
        onUpdateLotZone(lot.id, {
          type: "polygon",
          points: zone.points.map((p) => ({
            x_percent: p.x_percent + clampedDx,
            y_percent: p.y_percent + clampedDy,
          })),
        });
      } else {
        const newX = clamp(zone.x_percent + dx, 0, 100 - zone.width_percent);
        const newY = clamp(zone.y_percent + dy, 0, 100 - zone.height_percent);
        onUpdateLotZone(lot.id, {
          type: "rect",
          x_percent: newX,
          y_percent: newY,
          width_percent: zone.width_percent,
          height_percent: zone.height_percent,
        });
      }
    }
  }, [selectedLotId, lots, onUpdateLotZone, onSelectLot, onDeleteLot, drawingPolygon, drawingPolygonPoints, onPolygonComplete, onCancelDrawingPolygon, showDrawingError]);

  // Clic droit sur un lot → menu contextuel "Supprimer".
  const handleContextMenu = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { px, py } = getCanvasCoords(e);
    const hitLotId = hitTestLot(px, py);
    if (hitLotId) {
      onSelectLot(hitLotId);
      const containerRect = containerRef.current?.getBoundingClientRect();
      setContextMenu({
        x: e.clientX - (containerRect?.left ?? 0),
        y: e.clientY - (containerRect?.top ?? 0),
        lotId: hitLotId,
      });
    } else {
      setContextMenu(null);
    }
  }, [onSelectLot]);

  // ─── Rendu ────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[400px] rounded-md overflow-hidden border border-[var(--color-border-default)] bg-[var(--color-background-default)]"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        onKeyDown={handleCanvasKeyDown}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        tabIndex={0}
        role="application"
        aria-label="Éditeur de plan — molette pour zoomer, glisser le fond pour naviguer une fois zoomé, Ctrl + glisser ou bouton Main pour déplacer, double-clic pour réinitialiser le zoom, flèches pour déplacer un lot, Delete pour supprimer, Échap pour désélectionner"
        className="absolute inset-0 block w-full h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)]"
      />

      {/* Overlay surface temps réel pendant drag d'un lot existant */}
      {surfaceOverlay && surfaceOverlay.visible && (
        <div
          aria-hidden="true"
          className="absolute z-30 pointer-events-none px-sm py-2xs rounded bg-white border border-[var(--color-border-default)] text-xs font-medium text-[var(--color-text-default)] shadow-sm"
          style={{ left: surfaceOverlay.x, top: surfaceOverlay.y }}
        >
          {surfaceOverlay.label}
        </div>
      )}

      {/* Overlay surface temps réel pendant dessin polygone (versi-s20 P0) */}
      {drawingSurface && (
        <div
          aria-hidden="true"
          className="absolute z-30 pointer-events-none px-sm py-2xs rounded bg-[var(--color-interactive-primary)] text-xs font-medium text-[var(--color-text-inverse)] shadow-sm"
          style={{ left: drawingSurface.x, top: drawingSurface.y }}
        >
          {drawingSurface.label}
        </div>
      )}

      {/* Overlay erreur dessin polygone (auto-hide 2.5s) — versi-s20 P0 */}
      {drawingError && (
        <div
          role="alert"
          aria-live="assertive"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 px-md py-sm rounded-md bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-sm text-[var(--color-error-strong)] shadow-md max-w-xs text-center"
        >
          {drawingError}
        </div>
      )}

      {/* Barre de zoom permanente — coin bas-droit, pattern Figma/Miro (versi-s22) */}
      <div
        className="absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-lg bg-white/95 border border-[var(--color-border-default)] shadow-sm p-1"
        role="toolbar"
        aria-label="Contrôles de zoom et navigation"
      >
        {/* Bouton Main (toggle pan) — versi-s22 P1 */}
        <button
          type="button"
          onClick={() => setHandMode((prev) => !prev)}
          aria-label={handMode ? "Désactiver le mode déplacement" : "Activer le mode déplacement"}
          aria-pressed={handMode}
          className={`inline-flex items-center justify-center w-[44px] h-[44px] rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] ${
            handMode
              ? "bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)]"
              : "text-[var(--color-text-default)] hover:bg-[var(--color-background-default)]"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
          </svg>
        </button>
        <div className="w-px h-6 bg-[var(--color-border-default)]" aria-hidden="true" />
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Dézoomer"
          className="inline-flex items-center justify-center w-[44px] h-[44px] rounded-md text-[var(--color-text-default)] hover:bg-[var(--color-background-default)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          onClick={resetViewport}
          aria-label="Réinitialiser le zoom"
          className="inline-flex items-center justify-center min-w-[44px] h-[44px] px-2 rounded-md text-xs font-medium text-[var(--color-text-default)] hover:bg-[var(--color-background-default)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] transition-colors tabular-nums"
        >
          {viewport.scale === 1 ? "100%" : `${Math.round(viewport.scale * 100)}%`}
        </button>
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoomer"
          className="inline-flex items-center justify-center w-[44px] h-[44px] rounded-md text-[var(--color-text-default)] hover:bg-[var(--color-background-default)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
        </button>
        {/* Undo/Redo (versi-s22 P3) */}
        {(onUndo || onRedo) && (
          <>
            <div className="w-px h-6 bg-[var(--color-border-default)]" aria-hidden="true" />
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Annuler"
              title="Annuler (Ctrl+Z)"
              className="inline-flex items-center justify-center w-[44px] h-[44px] rounded-md text-[var(--color-text-default)] hover:bg-[var(--color-background-default)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Rétablir"
              title="Rétablir (Ctrl+Maj+Z)"
              className="inline-flex items-center justify-center w-[44px] h-[44px] rounded-md text-[var(--color-text-default)] hover:bg-[var(--color-background-default)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
            </button>
          </>
        )}
      </div>
      {/* Menu contextuel clic droit */}
      {contextMenu && onDeleteLot && (
        <>
          {/* Backdrop pour fermer en cliquant ailleurs */}
          <div
            className="absolute inset-0 z-10"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            role="menu"
            aria-label="Actions du lot"
            className="absolute z-20 bg-white rounded-md shadow-lg border border-[var(--color-border-default)] py-xs min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onDeleteLot(contextMenu.lotId);
                setContextMenu(null);
              }}
              className="w-full text-left px-md py-sm text-sm text-[var(--color-error-strong)] hover:bg-[var(--color-error-bg)] flex items-center gap-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
              </svg>
              Supprimer ce lot
            </button>
          </div>
        </>
      )}
      {/* Message de chevauchement */}
      {overlappingIds.size > 0 && (
        <div className="absolute bottom-3 left-3 right-3 bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-md px-md py-sm text-sm text-[var(--color-error-strong)] flex items-center gap-sm">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <span>Ces lots se chevauchent — ajustez les zones</span>
        </div>
      )}
    </div>
  );
}
