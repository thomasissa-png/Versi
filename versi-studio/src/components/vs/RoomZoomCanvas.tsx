/**
 * RoomZoomCanvas — Canvas zoomé sur UNE pièce (s32 wizard)
 *
 * Différence avec VisualPlanCanvas :
 *  - Cadre automatiquement sur le polygone de la pièce courante (pas vue plan complet)
 *  - Plan en arrière-plan atténué (opacité réduite hors zone du lot)
 *  - Click n'importe où DANS le polygone = créer une nouvelle position photographe
 *  - Drag des flèches d'angle = ajuster orientation prise de vue
 *  - Pas de drag-and-drop photo : l'upload se fait via bouton externe
 *
 * Pattern réutilisé : computeRenderLayout (letterbox) + lotLocalToScreen +
 * pointInPolygon. Coordonnées photos persistées en lot-local 0-1 (cohérent
 * avec le reste du pipeline et VisualPlanCanvas).
 */

"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  VsRoom,
  VsPhoto,
  ZoneRect,
  VsRoomSegment,
  VsRoomSegmentType,
  ZonePolygonPoint,
} from "@/lib/vs/types";
import { polygonCentroid, pointInPolygon, polygonHasSelfIntersection } from "@/lib/vs/types";
import {
  computeRenderLayout,
  lotLocalToScreen,
  screenToLotLocal,
  lotLocalToPlanGlobalPercent,
  type NormalizedPoint,
  type RenderLayout,
} from "@/lib/vs/ui/photo-placement";
import {
  renderSegment,
  renderSegmentNumber,
  findNearestSegment,
  reorderSegmentsClockwiseFromNorth,
  type ScreenPoint,
} from "@/lib/vs/ui/segment-render";

// ─── Props ────────────────────────────────────────────────────────

export interface RoomZoomCanvasProps {
  /** Pièce courante (avec polygone lot-local %). */
  room: VsRoom;
  /** URL image plan global. */
  planImageUrl: string | null;
  /** Zone du lot dans le plan global (% du plan entier). */
  lotZone: ZoneRect;
  /** Photos déjà placées dans cette pièce. */
  placements: VsPhoto[];
  /** Photo en cours d'édition d'angle (ID). Null = aucune sélectionnée. */
  selectedPlacementId: string | null;
  /** Callback : clic dans le polygone (lot-local 0-1). */
  onPlaceClick: (point: NormalizedPoint) => void;
  /** Callback : sélection d'une pastille existante (pour éditer angle). */
  onSelectPlacement: (id: string | null) => void;
  /** Callback live drag flèche d'angle (visuel sans commit). */
  onAngleDrag?: (id: string, angle: number) => void;
  /** Callback final (mouseup) sur drag flèche. */
  onAngleCommit: (id: string, angle: number) => void;
  /** True pendant un commit API en vol. */
  isCommitting?: boolean;
  /** Callback : clic en dehors du polygone (info — placement autorisé s32 #2). */
  onClickOutsidePolygon?: () => void;
  /** s32 #1 (autopilot) — drag visuel en cours d'une pastille (sans commit). */
  onPlacementDrag?: (id: string, point: NormalizedPoint) => void;
  /** s32 #1 (autopilot) — commit final au mouseup d'un drag pastille. */
  onPlacementMoveCommit?: (id: string, point: NormalizedPoint) => void;
  /** s32 itér.4 — notifie début/fin d'un drag move (id quand actif, null sinon). */
  onPlacementMoving?: (id: string | null) => void;
  // ─── s32 V3 — Drag direct du contour (translation polygone) ───────
  /**
   * Offset preview en cours pendant un drag de contour. Pendant le drag, le
   * parent reçoit `onContourDrag` à chaque move pour mettre à jour le visuel.
   * Au pointer up, `onContourCommit` est appelé pour persister via PATCH API.
   */
  contourOffsetPreview?: { x: number; y: number } | null;
  /** Drag visuel (sans commit) — appelé pendant le drag du polygone entier. */
  onContourDrag?: (offset: { x: number; y: number }) => void;
  /** Drag terminé (mouseup) — commit l'offset final. */
  onContourCommit?: (offset: { x: number; y: number }) => void;
  // ─── s32 V3 — Annotations segments (panel latéral synchro) ────────
  /** Segments persistés (un par arête du polygone). */
  segments?: VsRoomSegment[];
  /** Index du segment hover/focus dans le panel latéral (highlight visuel). */
  highlightedSegmentIndex?: number | null;
  /**
   * V3.1 — sync canvas → panel : appelé lorsque le curseur survole une arête
   * du polygone (< 14 px). Permet au panel d'auto-scroller / highlight la row
   * correspondante. Reçoit `null` quand le curseur quitte la zone d'arête.
   */
  onSegmentHover?: (segmentIndex: number | null) => void;
  // ─── s32 #P1 (Thomas prod) — Drag par sommet du polygone ──────────
  /**
   * Drag visuel d'UN sommet (sans commit). Appelé pendant le drag pour
   * permettre au parent de prévisualiser. Si non fourni, la prévisualisation
   * est purement locale (state interne). Coords lot-local %.
   */
  onVertexDrag?: (vertexIndex: number, point: ZonePolygonPoint) => void;
  /**
   * Drag terminé (mouseup) — commit le polygone complet (avec le sommet
   * déplacé). Le parent persiste via PATCH /rooms/:id { polygon }.
   * Coords lot-local %. Si non fourni, le drag est désactivé.
   */
  onVertexCommit?: (newPolygon: ZonePolygonPoint[]) => void;
}

// ─── Constantes rendu ────────────────────────────────────────────

const PHOTO_DOT_RADIUS = 16;
const ANGLE_INDICATOR_LENGTH = 38;
const ANGLE_HANDLE_RADIUS = 7;
const ANGLE_HANDLE_HIT_RADIUS = 20; // zone de hit agrandie pour drag (mouse + touch)
const ANGLE_HANDLE_HIT_RADIUS_TOUCH = 22; // touch target a11y minimum 44px diamètre
const ZOOM_MAX_SCALE = 8; // plafond auto-zoom (anti-pixelisation polygones petits)
const ZOOM_PADDING_RATIO = 0.18; // 18% padding autour du polygone

// s32 #P1 (Thomas prod) — pattern PlanCanvas étape 3 : poignées par sommet
const VERTEX_HANDLE_RADIUS = 5; // rayon visuel cercle blanc (Ø 10 px desktop)
const VERTEX_HANDLE_RADIUS_HOVER = 7; // grossi à 14 px au hover
const VERTEX_HIT_RADIUS = 14; // hit-test desktop (priorité absolue vs arête/intérieur)
const VERTEX_HIT_RADIUS_TOUCH = 22; // hit-test touch (a11y 44 px diamètre)
const EDGE_NEAR_GUARD_PX = 16; // distance MIN à toute arête/sommet pour autoriser placement photo

const COLOR_POLY_FILL = "rgba(46, 102, 220, 0.10)";
const COLOR_POLY_FILL_HOVER = "rgba(46, 102, 220, 0.18)";
const COLOR_DIM_OUTSIDE = "rgba(240, 237, 232, 0.72)"; // overlay design system hors polygone
const COLOR_CANVAS_BG = "#F0EDE8"; // fond canvas (design tokens bg)

const PHOTO_DOT_FILL = "#0B0B0B"; // design system text-default
const PHOTO_DOT_FILL_SELECTED = "#15803D"; // success vert design system
const PHOTO_DOT_BORDER = "#FFFFFF";
const ANGLE_INDICATOR_COLOR = "#141C28";
const ANGLE_HANDLE_FILL = "#141C28";
const ANGLE_HANDLE_BORDER = "#FFFFFF";

// s32 #P1 — poignées sommet (cohérence visuelle avec PlanCanvas étape 3)
const VERTEX_FILL = "#FFFFFF";
const VERTEX_BORDER = "#141C28";
const VERTEX_BORDER_HOVER = "#2E66DC"; // interactive-primary design system
const VERTEX_HALO_HOVER = "rgba(46, 102, 220, 0.18)";

// ─── Component ────────────────────────────────────────────────────

interface DragState {
  placementId: string;
  startAngle: number;
}

/** s32 #1 (autopilot) — drag d'une pastille placée. */
interface MoveDragState {
  placementId: string;
  /** Position d'origine en lot-local 0-1 (rollback si releasePointerCapture). */
  startPoint: NormalizedPoint;
  /** Offset entre clic et centre pastille (pour drag fluide sans saut). */
  offsetX: number;
  offsetY: number;
}

export default function RoomZoomCanvas({
  room,
  planImageUrl,
  lotZone,
  placements,
  selectedPlacementId,
  onPlaceClick,
  onSelectPlacement,
  onAngleDrag,
  onAngleCommit,
  isCommitting = false,
  onClickOutsidePolygon,
  onPlacementDrag,
  onPlacementMoveCommit,
  onPlacementMoving,
  contourOffsetPreview = null,
  onContourDrag,
  onContourCommit,
  segments = [],
  highlightedSegmentIndex = null,
  onSegmentHover,
  onVertexDrag,
  onVertexCommit,
}: RoomZoomCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const planImageRef = useRef<HTMLImageElement | null>(null);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ w: 0, h: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hover, setHover] = useState<{ inPolygon: boolean; point: NormalizedPoint } | null>(null);
  const [hoverHandleId, setHoverHandleId] = useState<string | null>(null);
  const [hoverDotId, setHoverDotId] = useState<string | null>(null); // s32 #1 — cursor grab/grabbing
  const dragRef = useRef<DragState | null>(null);
  const [dragPreviewAngle, setDragPreviewAngle] = useState<number | null>(null);
  // s32 #1 — drag d'une pastille placée (move, pas angle).
  const moveDragRef = useRef<MoveDragState | null>(null);
  const [movePreviewPoint, setMovePreviewPoint] = useState<NormalizedPoint | null>(null);
  // s32 #1 — seuil avant qu'un pointerdown sur pastille bascule de "select" à "drag move"
  const MOVE_DRAG_THRESHOLD_PX = 4;
  const moveDragArmedRef = useRef<{ id: string; downX: number; downY: number; offsetX: number; offsetY: number; startPoint: NormalizedPoint } | null>(null);

  // ─── s32 V3 — drag direct contour (translation polygone) ────────
  /**
   * Drag actif sur l'intérieur du polygone. Capture la position canvas du clic
   * et l'offset committed au pointer down. Move → delta canvas → delta lot %
   * via onContourDrag. PointerUp → onContourCommit (persistance immédiate).
   */
  const contourDragRef = useRef<{
    startCanvasX: number;
    startCanvasY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);
  const MIN_DRAG_PX = 3; // seuil avant de considérer un drag actif (vs simple clic)
  const [contourDragActive, setContourDragActive] = useState<boolean>(false);

  // ─── s32 #P1 (Thomas prod) — Drag par sommet du polygone ──────────
  /**
   * Pattern PlanCanvas étape 3 : un sommet est saisi avec une poignée
   * dédiée (cercle blanc 10 px). Le drag déplace UN sommet, les autres
   * restent fixes. Au mouseup, le polygone complet est commit via
   * onVertexCommit (PATCH /rooms/:id { polygon }).
   *
   * Coords lot-local % (cohérent avec room.polygon).
   */
  const vertexDragRef = useRef<{
    vertexIndex: number;
    /** Polygone DB de référence au début du drag (sans offset). */
    startPolygon: ZonePolygonPoint[];
  } | null>(null);
  const [vertexPreview, setVertexPreview] = useState<{
    index: number;
    point: ZonePolygonPoint;
  } | null>(null);
  const [hoverVertexIdx, setHoverVertexIdx] = useState<number | null>(null);

  // ─── Render layout (letterbox classique) ───────────────────────
  const renderLayout = useMemo<RenderLayout>(
    () =>
      computeRenderLayout(
        containerSize.width,
        containerSize.height,
        imageNaturalSize.w,
        imageNaturalSize.h
      ),
    [containerSize, imageNaturalSize]
  );

  // ─── Zoom auto sur le polygone de la pièce ────────────────────
  // On dérive un viewport scale+offset qui place la bbox du polygone au centre
  // du canvas avec un padding. Calcul direct (pas via computeRoomZoom qui vise
  // un ratio global différent).
  const viewport = useMemo(() => {
    if (!room.polygon || room.polygon.length < 3) {
      return { scale: 1, offsetX: 0, offsetY: 0 };
    }
    if (containerSize.width === 0 || renderLayout.renderW === 0) {
      return { scale: 1, offsetX: 0, offsetY: 0 };
    }
    // Bbox polygone en lot-local %
    const xs = room.polygon.map((p) => p.x_percent);
    const ys = room.polygon.map((p) => p.y_percent);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    // Convertir bbox lot-local % → coords plan-pixel logique (sans viewport)
    const toPlanPx = (xLotPct: number, yLotPct: number) => {
      const xGPct = lotLocalToPlanGlobalPercent(
        xLotPct,
        lotZone.x_percent,
        lotZone.width_percent
      );
      const yGPct = lotLocalToPlanGlobalPercent(
        yLotPct,
        lotZone.y_percent,
        lotZone.height_percent
      );
      return {
        x: (xGPct / 100) * renderLayout.renderW + renderLayout.offsetX,
        y: (yGPct / 100) * renderLayout.renderH + renderLayout.offsetY,
      };
    };
    const tl = toPlanPx(minX, minY);
    const br = toPlanPx(maxX, maxY);
    const polyW = br.x - tl.x;
    const polyH = br.y - tl.y;
    if (polyW <= 0 || polyH <= 0) return { scale: 1, offsetX: 0, offsetY: 0 };

    const availableW = containerSize.width * (1 - ZOOM_PADDING_RATIO * 2);
    const availableH = containerSize.height * (1 - ZOOM_PADDING_RATIO * 2);
    const scale = Math.min(availableW / polyW, availableH / polyH, ZOOM_MAX_SCALE);
    const polyCenterX = (tl.x + br.x) / 2;
    const polyCenterY = (tl.y + br.y) / 2;
    const offsetX = containerSize.width / 2 - polyCenterX * scale;
    const offsetY = containerSize.height / 2 - polyCenterY * scale;
    return { scale, offsetX, offsetY };
  }, [room.polygon, containerSize, renderLayout, lotZone]);

  // ─── Chargement image plan ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!planImageUrl) {
      planImageRef.current = null;
      queueMicrotask(() => {
        if (!cancelled) {
          setImageLoaded(false);
          setImageNaturalSize({ w: 0, h: 0 });
        }
      });
      return () => {
        cancelled = true;
      };
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      planImageRef.current = img;
      setImageNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImageLoaded(true);
    };
    img.onerror = () => {
      if (cancelled) return;
      planImageRef.current = null;
      setImageLoaded(false);
      setImageNaturalSize({ w: 0, h: 0 });
    };
    img.src = planImageUrl;
    return () => {
      cancelled = true;
    };
  }, [planImageUrl]);

  // ─── Resize observer ───────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });
    return () => ro.disconnect();
  }, []);

  // ─── s32 V3 — polygone EFFECTIF (offset DB + preview drag direct) ──
  // Le polygone DB n'est jamais muté ; on dérive un polygone "rendu" en
  // appliquant l'offset committed (DB) + l'offset preview en cours.
  // s32 #P1 : si un drag par sommet est actif, le sommet `vertexPreview.index`
  // est remplacé par sa position prévisualisée (autres sommets inchangés).
  const effectivePolygon = useMemo<ZonePolygonPoint[] | null>(() => {
    if (!room.polygon || room.polygon.length < 3) return null;
    const committedX = typeof room.polygon_offset_x === "number" ? room.polygon_offset_x : 0;
    const committedY = typeof room.polygon_offset_y === "number" ? room.polygon_offset_y : 0;
    const previewX = contourOffsetPreview?.x ?? 0;
    const previewY = contourOffsetPreview?.y ?? 0;
    // Drag actif → preview REMPLACE committed (feedback immédiat).
    const totalX = contourOffsetPreview ? previewX : committedX;
    const totalY = contourOffsetPreview ? previewY : committedY;
    const offset = (p: ZonePolygonPoint): ZonePolygonPoint =>
      totalX === 0 && totalY === 0
        ? p
        : {
            x_percent: Math.max(0, Math.min(100, p.x_percent + totalX)),
            y_percent: Math.max(0, Math.min(100, p.y_percent + totalY)),
          };
    return room.polygon.map((p, i) => {
      // s32 #P1 : si ce sommet est en drag actif, projeter sur la position
      // prévisualisée (déjà en lot-local % effectif, pas besoin d'offset).
      if (vertexPreview && vertexPreview.index === i) {
        return vertexPreview.point;
      }
      return offset(p);
    });
  }, [room.polygon, room.polygon_offset_x, room.polygon_offset_y, contourOffsetPreview, vertexPreview]);

  // ─── Helpers projection ────────────────────────────────────────
  const projectLotPct = useCallback(
    (xLotPct: number, yLotPct: number) => {
      const xGPct = lotLocalToPlanGlobalPercent(
        xLotPct,
        lotZone.x_percent,
        lotZone.width_percent
      );
      const yGPct = lotLocalToPlanGlobalPercent(
        yLotPct,
        lotZone.y_percent,
        lotZone.height_percent
      );
      const lx = (xGPct / 100) * renderLayout.renderW + renderLayout.offsetX;
      const ly = (yGPct / 100) * renderLayout.renderH + renderLayout.offsetY;
      return {
        x: lx * viewport.scale + viewport.offsetX,
        y: ly * viewport.scale + viewport.offsetY,
      };
    },
    [renderLayout, viewport, lotZone]
  );

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const screenToLotPoint = useCallback(
    (canvasX: number, canvasY: number): NormalizedPoint =>
      screenToLotLocal(canvasX, canvasY, renderLayout, viewport, lotZone),
    [renderLayout, viewport, lotZone]
  );

  // ─── s32 #P1 — Hit test : sommet du polygone sous la souris ────
  /**
   * Hit-test priorité 1 (avant pastilles, avant arêtes, avant intérieur).
   * Pattern PlanCanvas étape 3 : on itère sur les sommets effectifs
   * (donc déjà offsetés visuellement) et on retourne l'index du plus
   * proche dans le rayon de hit. Le drag opère sur ces coords effectives.
   */
  const hitTestVertex = useCallback(
    (
      canvasX: number,
      canvasY: number,
      pointerType: "mouse" | "touch" | "pen" = "mouse"
    ): number | null => {
      if (!effectivePolygon || effectivePolygon.length < 3) return null;
      const hitRadius =
        pointerType === "touch" ? VERTEX_HIT_RADIUS_TOUCH : VERTEX_HIT_RADIUS;
      let bestIdx: number | null = null;
      let bestDist = hitRadius;
      for (let i = 0; i < effectivePolygon.length; i++) {
        const v = effectivePolygon[i];
        const { x: vx, y: vy } = projectLotPct(v.x_percent, v.y_percent);
        const d = Math.hypot(canvasX - vx, canvasY - vy);
        if (d <= bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      return bestIdx;
    },
    [effectivePolygon, projectLotPct]
  );

  // ─── Hit test : pastille sous la souris ────────────────────────
  const findPlacementHandle = useCallback(
    (
      canvasX: number,
      canvasY: number,
      pointerType: "mouse" | "touch" | "pen" = "mouse"
    ): { id: string; isHandle: boolean } | null => {
      const hitRadius =
        pointerType === "touch"
          ? ANGLE_HANDLE_HIT_RADIUS_TOUCH
          : ANGLE_HANDLE_HIT_RADIUS;
      for (const p of placements) {
        if (!p.is_placed_on_plan || p.position_x === null || p.position_y === null) continue;
        const center = lotLocalToScreen(
          { x: p.position_x, y: p.position_y },
          renderLayout,
          viewport,
          lotZone
        );
        const dx = canvasX - center.x;
        const dy = canvasY - center.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= PHOTO_DOT_RADIUS + 4) {
          return { id: p.id, isHandle: false };
        }
        // Test sur la poignée d'angle (extrémité de la flèche, hit zone agrandie)
        if (p.angle_degrees !== null) {
          const rad = ((p.angle_degrees - 90) * Math.PI) / 180;
          const ex = center.x + Math.cos(rad) * ANGLE_INDICATOR_LENGTH;
          const ey = center.y + Math.sin(rad) * ANGLE_INDICATOR_LENGTH;
          const dh = Math.hypot(canvasX - ex, canvasY - ey);
          if (dh <= hitRadius) {
            return { id: p.id, isHandle: true };
          }
        }
      }
      return null;
    },
    [placements, renderLayout, viewport, lotZone]
  );

  // ─── Rendu ─────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = containerSize.width;
    const h = containerSize.height;
    if (w === 0 || h === 0) return;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLOR_CANVAS_BG;
    ctx.fillRect(0, 0, w, h);

    // Layer 1 : background plan
    const img = planImageRef.current;
    if (img && renderLayout.renderW > 0 && renderLayout.renderH > 0) {
      const planX = renderLayout.offsetX * viewport.scale + viewport.offsetX;
      const planY = renderLayout.offsetY * viewport.scale + viewport.offsetY;
      const planW = renderLayout.renderW * viewport.scale;
      const planH = renderLayout.renderH * viewport.scale;
      ctx.drawImage(
        img,
        0,
        0,
        img.naturalWidth,
        img.naturalHeight,
        planX,
        planY,
        planW,
        planH
      );
    }

    // Layer 2 : overlay atténuant tout SAUF le polygone (clip inverse simulé)
    if (effectivePolygon && effectivePolygon.length >= 3) {
      ctx.save();
      ctx.fillStyle = COLOR_DIM_OUTSIDE;
      ctx.beginPath();
      // Rectangle plein canvas
      ctx.rect(0, 0, w, h);
      // Trou polygone (winding inverse)
      const last = effectivePolygon.length - 1;
      for (let i = last; i >= 0; i--) {
        const pt = effectivePolygon[i];
        const { x, y } = projectLotPct(pt.x_percent, pt.y_percent);
        if (i === last) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill("evenodd");
      ctx.restore();
    }

    // Layer 3 : polygone pièce (fill + segments typés)
    if (effectivePolygon && effectivePolygon.length >= 3) {
      const inHover = hover?.inPolygon ?? false;
      // Calcule les sommets projetés une fois pour fill + segments + label
      const verticesScreen: ScreenPoint[] = effectivePolygon.map((pt) =>
        projectLotPct(pt.x_percent, pt.y_percent)
      );

      // Fill standard (drag contour visuel = même fill, pas de mode dédié)
      ctx.beginPath();
      for (let i = 0; i < verticesScreen.length; i++) {
        const v = verticesScreen[i];
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      }
      ctx.closePath();
      ctx.fillStyle =
        contourDragActive || contourOffsetPreview !== null
          ? COLOR_POLY_FILL_HOVER
          : inHover
          ? COLOR_POLY_FILL_HOVER
          : COLOR_POLY_FILL;
      ctx.fill();

      // V3 — rendu typé par segment (1 type par arête) + numéro horaire.
      const segByIndex = new Map<number, VsRoomSegmentType>();
      for (const s of segments) {
        segByIndex.set(s.segment_index, s.type);
      }
      // Mapping horaire depuis Nord pour les labels.
      const horaireMap = reorderSegmentsClockwiseFromNorth(effectivePolygon);
      for (let i = 0; i < verticesScreen.length; i++) {
        const a = verticesScreen[i];
        const b = verticesScreen[(i + 1) % verticesScreen.length];
        const type: VsRoomSegmentType = segByIndex.get(i) ?? "wall";
        const highlight = highlightedSegmentIndex === i;
        renderSegment(ctx, a, b, type, highlight);
      }
      // Numéros horaires (au-dessus des traits)
      for (let i = 0; i < verticesScreen.length; i++) {
        const a = verticesScreen[i];
        const b = verticesScreen[(i + 1) % verticesScreen.length];
        const display = horaireMap.get(i) ?? i + 1;
        renderSegmentNumber(ctx, a, b, String(display));
      }

      // Label pièce centroïde (haut)
      const c = polygonCentroid(effectivePolygon);
      const { x: cx, y: cy } = projectLotPct(c.x_percent, c.y_percent);
      ctx.fillStyle = "#141C28";
      ctx.font = "600 13px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = room.custom_label || room.name || room.room_type || "Pièce";
      // Halo blanc pour lisibilité
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.strokeText(label, cx, cy);
      ctx.fillText(label, cx, cy);

      // s32 #P1 (Thomas prod) — Poignées par sommet (cercles 10 px)
      // Rendues UNIQUEMENT si onVertexCommit est fourni (mode édition).
      // Pattern PlanCanvas étape 3 : cercle blanc, border noir 2px, halo
      // bleu au hover/drag. Rendu APRÈS le label pour rester au-dessus.
      if (onVertexCommit) {
        const draggingIdx = vertexDragRef.current?.vertexIndex ?? -1;
        for (let i = 0; i < verticesScreen.length; i++) {
          const v = verticesScreen[i];
          const isHover = i === hoverVertexIdx;
          const isDragging = i === draggingIdx;
          const radius = isHover || isDragging
            ? VERTEX_HANDLE_RADIUS_HOVER
            : VERTEX_HANDLE_RADIUS;
          // Halo doux au hover/drag (anneau translucide)
          if (isHover || isDragging) {
            ctx.beginPath();
            ctx.arc(v.x, v.y, radius + 5, 0, Math.PI * 2);
            ctx.fillStyle = VERTEX_HALO_HOVER;
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(v.x, v.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = VERTEX_FILL;
          ctx.fill();
          ctx.strokeStyle = isHover || isDragging ? VERTEX_BORDER_HOVER : VERTEX_BORDER;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    // Layer 4 : photos placées (pastille + flèche d'angle)
    for (const photo of placements) {
      if (!photo.is_placed_on_plan) continue;
      if (photo.position_x === null || photo.position_y === null) continue;
      // s32 #1 — si cette pastille est en cours de drag move, projeter sur la
      // position prévisualisée plutôt que la valeur DB (sinon snap visuel).
      const moveDragId = moveDragRef.current?.placementId;
      const effectivePos =
        moveDragId === photo.id && movePreviewPoint !== null
          ? movePreviewPoint
          : { x: photo.position_x, y: photo.position_y };
      const projected = lotLocalToScreen(
        effectivePos,
        renderLayout,
        viewport,
        lotZone
      );
      const px = projected.x;
      const py = projected.y;
      const isSelected = photo.id === selectedPlacementId;
      const isPending = !photo.file_path || photo.file_path === "";

      // État pending : dashed + opacity réduite pour distinguer "placée non uploadée"
      ctx.save();
      if (isPending) {
        ctx.globalAlpha = 0.65;
        ctx.setLineDash([5, 3]);
      } else {
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      }

      // Angle effectif (preview en cours de drag, sinon valeur DB)
      const dragId = dragRef.current?.placementId;
      const effAngle =
        dragId === photo.id && dragPreviewAngle !== null
          ? dragPreviewAngle
          : photo.angle_degrees;

      if (effAngle !== null) {
        const rad = ((effAngle - 90) * Math.PI) / 180;
        const ex = px + Math.cos(rad) * ANGLE_INDICATOR_LENGTH;
        const ey = py + Math.sin(rad) * ANGLE_INDICATOR_LENGTH;
        // Trait
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = ANGLE_INDICATOR_COLOR;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // Pointe (poignée drag)
        ctx.beginPath();
        ctx.arc(ex, ey, ANGLE_HANDLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = ANGLE_HANDLE_FILL;
        ctx.fill();
        ctx.strokeStyle = ANGLE_HANDLE_BORDER;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Pastille
      ctx.beginPath();
      ctx.arc(px, py, PHOTO_DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? PHOTO_DOT_FILL_SELECTED : PHOTO_DOT_FILL;
      ctx.fill();
      ctx.strokeStyle = PHOTO_DOT_BORDER;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Numéro à l'intérieur (1, 2, 3...)
      const idx = placements.indexOf(photo) + 1;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "700 12px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(idx), px, py);

      // Reset état pending
      ctx.restore();
    }
  }, [
    containerSize,
    renderLayout,
    viewport,
    room,
    placements,
    selectedPlacementId,
    hover,
    projectLotPct,
    lotZone,
    dragPreviewAngle,
    movePreviewPoint,
    effectivePolygon,
    segments,
    highlightedSegmentIndex,
    contourDragActive,
    contourOffsetPreview,
    onVertexCommit,
    hoverVertexIdx,
    vertexPreview,
  ]);

  useEffect(() => {
    draw();
  }, [draw, imageLoaded]);

  // ─── s32 Feature A — helpers projection vertices (pour adjusting drag) ─
  // Convertit un delta pixel canvas en delta lot-local %. La conversion passe
  // par le viewport (échelle zoom) et la lotZone (ratio plan ↔ lot).
  const canvasDeltaToLotPct = useCallback(
    (dxPx: number, dyPx: number): { x: number; y: number } => {
      // Le polygone est exprimé en % lot-local (0-100). Pour passer un delta px
      // canvas → delta lot %, il faut connaître la dimension PIXEL d'un % lot
      // sur le canvas. En reprojetant 0 et 100 lot-local-% (toutes 100 pour x)
      // on obtient la largeur écran du lot (≈ renderW * lotZone.w% / 100 *
      // viewport.scale). Plus simple : appeler projectLotPct deux fois.
      const a = projectLotPct(0, 0);
      const b = projectLotPct(100, 100);
      const lotWidthPx = Math.abs(b.x - a.x);
      const lotHeightPx = Math.abs(b.y - a.y);
      if (lotWidthPx === 0 || lotHeightPx === 0) return { x: 0, y: 0 };
      return {
        x: (dxPx / lotWidthPx) * 100,
        y: (dyPx / lotHeightPx) * 100,
      };
    },
    [projectLotPct]
  );

  // ─── Pointer events ────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (isCommitting) return;
      if (e.button !== 0) return;
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);

      const ptype = (e.pointerType as "mouse" | "touch" | "pen") || "mouse";

      // ─── s32 #P1 — Hit-test priorité 1 : SOMMET du polygone ──────
      // Doit être testé AVANT pastilles, arêtes, intérieur, sinon un clic
      // pile sur un sommet déclenche le placement photo (bug Thomas prod).
      if (onVertexCommit && effectivePolygon && effectivePolygon.length >= 3) {
        const vIdx = hitTestVertex(x, y, ptype);
        if (vIdx !== null) {
          e.currentTarget.setPointerCapture(e.pointerId);
          vertexDragRef.current = {
            vertexIndex: vIdx,
            startPolygon: effectivePolygon.slice(),
          };
          setVertexPreview({ index: vIdx, point: effectivePolygon[vIdx] });
          return;
        }
      }

      const hit = findPlacementHandle(x, y, ptype);
      if (hit && hit.isHandle) {
        // Démarre le drag de l'angle
        e.currentTarget.setPointerCapture(e.pointerId);
        const placement = placements.find((p) => p.id === hit.id);
        if (placement) {
          dragRef.current = {
            placementId: hit.id,
            startAngle: placement.angle_degrees ?? 0,
          };
          onSelectPlacement(hit.id);
        }
      } else if (hit) {
        // s32 #1 — clic sur pastille : on arme un drag potentiel. La bascule
        // select → drag se fait au-delà du seuil MOVE_DRAG_THRESHOLD_PX
        // (sinon un simple clic resterait toujours interprété comme drag).
        const placement = placements.find((p) => p.id === hit.id);
        if (placement && placement.position_x !== null && placement.position_y !== null) {
          const center = lotLocalToScreen(
            { x: placement.position_x, y: placement.position_y },
            renderLayout,
            viewport,
            lotZone
          );
          moveDragArmedRef.current = {
            id: hit.id,
            downX: x,
            downY: y,
            offsetX: x - center.x,
            offsetY: y - center.y,
            startPoint: { x: placement.position_x, y: placement.position_y },
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }
        onSelectPlacement(hit.id);
      } else {
        // ─── s32 V3 — Drag direct du contour ───────────────────
        // Si pointer down DANS le polygone effectif ET loin de toute arête
        // (> 12 px), démarre un drag du contour. Le commit (PATCH) est fait
        // au pointer up. Sinon → click-to-place classique.
        const point = screenToLotPoint(x, y);
        const inside =
          effectivePolygon && effectivePolygon.length >= 3
            ? pointInPolygon(point.x * 100, point.y * 100, effectivePolygon)
            : false;
        if (inside && effectivePolygon) {
          const verticesScreen: ScreenPoint[] = effectivePolygon.map((pt) =>
            projectLotPct(pt.x_percent, pt.y_percent)
          );
          // s32 #P1 (Thomas prod) — guard EDGE_NEAR_GUARD_PX : si curseur
          // proche du contour (arête ou sommet), on n'autorise PLUS le
          // placement photo (bug "clic sur contour = photo placée") ni le
          // drag global (sinon conflit avec le drag de sommet voisin).
          // Le clic est simplement ignoré → l'utilisateur doit cliquer
          // franchement à l'intérieur pour placer une photo.
          const nearEdge = findNearestSegment(x, y, verticesScreen, EDGE_NEAR_GUARD_PX);
          if (nearEdge) {
            // Clic dans le no-mans-land du contour — on ignore (pas de
            // placement, pas de drag). Le hit-test sommet a déjà été fait
            // en amont, donc si on arrive ici c'est qu'on est sur une arête.
            return;
          }
          // Drag contour armé (commit au up, ou clic simple si pas de move).
          e.currentTarget.setPointerCapture(e.pointerId);
          contourDragRef.current = {
            startCanvasX: x,
            startCanvasY: y,
            startOffsetX:
              typeof room.polygon_offset_x === "number" ? room.polygon_offset_x : 0,
            startOffsetY:
              typeof room.polygon_offset_y === "number" ? room.polygon_offset_y : 0,
          };
          return;
        }
        // Click-to-place hors polygone (autorisé, l'IA interprète la distance).
        onPlaceClick(point);
        if (!inside) {
          onClickOutsidePolygon?.();
        }
      }
    },
    [
      isCommitting,
      getCanvasCoords,
      findPlacementHandle,
      placements,
      screenToLotPoint,
      room.polygon_offset_x,
      room.polygon_offset_y,
      renderLayout,
      viewport,
      lotZone,
      onPlaceClick,
      onSelectPlacement,
      onClickOutsidePolygon,
      effectivePolygon,
      projectLotPct,
      hitTestVertex,
      onVertexCommit,
    ]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);

      // ─── s32 #P1 — Drag par sommet (priorité absolue) ─────────────
      if (vertexDragRef.current) {
        const vd = vertexDragRef.current;
        // Convertir position curseur canvas → coords lot-local %
        // (cohérent avec effectivePolygon, déjà offset si applicable).
        const a = projectLotPct(0, 0);
        const b = projectLotPct(100, 100);
        const lotWidthPx = Math.abs(b.x - a.x);
        const lotHeightPx = Math.abs(b.y - a.y);
        if (lotWidthPx > 0 && lotHeightPx > 0) {
          const xPct = ((x - a.x) / lotWidthPx) * 100;
          const yPct = ((y - a.y) / lotHeightPx) * 100;
          // Clamp 0-100 — un sommet ne doit pas sortir du lot.
          const newPoint: ZonePolygonPoint = {
            x_percent: Math.max(0, Math.min(100, xPct)),
            y_percent: Math.max(0, Math.min(100, yPct)),
          };
          setVertexPreview({ index: vd.vertexIndex, point: newPoint });
          onVertexDrag?.(vd.vertexIndex, newPoint);
        }
        return;
      }

      // ─── s32 V3 — Drag direct du contour (translation polygone) ──
      if (contourDragRef.current) {
        const start = contourDragRef.current;
        const dxPx = x - start.startCanvasX;
        const dyPx = y - start.startCanvasY;
        const dist = Math.hypot(dxPx, dyPx);
        if (!contourDragActive && dist >= MIN_DRAG_PX) {
          setContourDragActive(true);
        }
        const delta = canvasDeltaToLotPct(dxPx, dyPx);
        const newOffsetX = Math.max(-10, Math.min(10, start.startOffsetX + delta.x));
        const newOffsetY = Math.max(-10, Math.min(10, start.startOffsetY + delta.y));
        onContourDrag?.({ x: newOffsetX, y: newOffsetY });
        return;
      }

      // Drag flèche en cours
      if (dragRef.current) {
        // Calculer angle vs centre pastille
        const placement = placements.find((p) => p.id === dragRef.current!.placementId);
        if (placement && placement.position_x !== null && placement.position_y !== null) {
          const center = lotLocalToScreen(
            { x: placement.position_x, y: placement.position_y },
            renderLayout,
            viewport,
            lotZone
          );
          const rad = Math.atan2(x - center.x, -(y - center.y));
          let deg = (rad * 180) / Math.PI;
          if (deg < 0) deg += 360;
          const a = Math.round(deg) % 360;
          setDragPreviewAngle(a);
          onAngleDrag?.(dragRef.current.placementId, a);
        }
        return;
      }

      // s32 #1 — drag move actif : MAJ position visuelle (ne commit pas).
      if (moveDragRef.current) {
        const md = moveDragRef.current;
        const point = screenToLotPoint(x - md.offsetX, y - md.offsetY);
        // Clamp 0-1 — la photo est ancrée dans le lot.
        const clamped: NormalizedPoint = {
          x: Math.max(0, Math.min(1, point.x)),
          y: Math.max(0, Math.min(1, point.y)),
        };
        setMovePreviewPoint(clamped);
        onPlacementDrag?.(md.placementId, clamped);
        return;
      }

      // s32 #1 — drag move armé mais pas encore franchi le seuil ?
      if (moveDragArmedRef.current) {
        const armed = moveDragArmedRef.current;
        const dist = Math.hypot(x - armed.downX, y - armed.downY);
        if (dist >= MOVE_DRAG_THRESHOLD_PX) {
          // Bascule armed → drag actif
          moveDragRef.current = {
            placementId: armed.id,
            startPoint: armed.startPoint,
            offsetX: armed.offsetX,
            offsetY: armed.offsetY,
          };
          moveDragArmedRef.current = null;
          // s32 itér.4 — notifie le parent qu'un drag commence (feedback liste).
          onPlacementMoving?.(armed.id);
          const point = screenToLotPoint(x - armed.offsetX, y - armed.offsetY);
          const clamped: NormalizedPoint = {
            x: Math.max(0, Math.min(1, point.x)),
            y: Math.max(0, Math.min(1, point.y)),
          };
          setMovePreviewPoint(clamped);
          onPlacementDrag?.(armed.id, clamped);
        }
        return;
      }

      // Hover detection — utilisé pour highlight polygone + curseur grab sur poignée
      const ptype = (e.pointerType as "mouse" | "touch" | "pen") || "mouse";

      // s32 #P1 — hover sommet (priorité 1, avant pastilles)
      if (onVertexCommit) {
        const vIdx = hitTestVertex(x, y, ptype);
        if (vIdx !== hoverVertexIdx) setHoverVertexIdx(vIdx);
      } else if (hoverVertexIdx !== null) {
        setHoverVertexIdx(null);
      }

      const handleHit = findPlacementHandle(x, y, ptype);
      setHoverHandleId(handleHit && handleHit.isHandle ? handleHit.id : null);
      // s32 #1 — hover sur corps de pastille → cursor grab
      setHoverDotId(handleHit && !handleHit.isHandle ? handleHit.id : null);
      const point = screenToLotPoint(x, y);
      if (room.polygon && room.polygon.length >= 3) {
        const inside = pointInPolygon(point.x * 100, point.y * 100, room.polygon);
        setHover({ inPolygon: inside, point });
      } else {
        setHover(null);
      }

      // V3.1 — sync canvas → panel : si le curseur est proche d'une arête du
      // polygone effectif (< 14 px) ET pas sur une poignée pastille, on notifie
      // le parent pour highlight la row correspondante. Sinon → null.
      if (onSegmentHover) {
        if (!handleHit && effectivePolygon && effectivePolygon.length >= 3) {
          const verticesScreen: ScreenPoint[] = effectivePolygon.map((pt) =>
            projectLotPct(pt.x_percent, pt.y_percent)
          );
          const nearEdge = findNearestSegment(x, y, verticesScreen, 14);
          onSegmentHover(nearEdge ? nearEdge.segmentIndex : null);
        } else {
          onSegmentHover(null);
        }
      }
    },
    [
      getCanvasCoords,
      placements,
      renderLayout,
      viewport,
      lotZone,
      screenToLotPoint,
      room.polygon,
      onAngleDrag,
      onPlacementDrag,
      findPlacementHandle,
      canvasDeltaToLotPct,
      onContourDrag,
      onPlacementMoving,
      contourDragActive,
      effectivePolygon,
      projectLotPct,
      onSegmentHover,
      hitTestVertex,
      onVertexDrag,
      onVertexCommit,
      hoverVertexIdx,
    ]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      // ─── s32 #P1 — Fin drag par sommet : commit polygone complet ──
      if (vertexDragRef.current) {
        const vd = vertexDragRef.current;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* déjà relâché */
        }
        const finalPreview = vertexPreview;
        vertexDragRef.current = null;
        setVertexPreview(null);
        if (!finalPreview || !effectivePolygon) return;
        // Reconstruire le polygone complet : N-1 sommets inchangés (pris depuis
        // effectivePolygon = DB + offset), + le sommet drag à sa position finale.
        const newPolygon: ZonePolygonPoint[] = vd.startPolygon.map((p, i) =>
          i === vd.vertexIndex ? finalPreview.point : p
        );
        // Guard self-intersection : si le drag a créé un polygone qui se croise,
        // on annule (rollback visuel). Pattern PlanCanvas étape 3.
        if (polygonHasSelfIntersection(newPolygon)) {
          // Pas de commit — la state vertexPreview est déjà reset.
          return;
        }
        onVertexCommit?.(newPolygon);
        return;
      }

      // ─── s32 V3 — fin drag direct contour : commit immédiat ──
      if (contourDragRef.current) {
        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        const start = contourDragRef.current;
        const dxPx = x - start.startCanvasX;
        const dyPx = y - start.startCanvasY;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* déjà relâché */
        }
        contourDragRef.current = null;
        const wasDragging = contourDragActive;
        setContourDragActive(false);
        // Si le mouvement n'a jamais dépassé le seuil → simple clic dans le
        // polygone : on relaie comme placement.
        if (!wasDragging && Math.hypot(dxPx, dyPx) < MIN_DRAG_PX) {
          const point = screenToLotPoint(x, y);
          onPlaceClick(point);
          return;
        }
        const delta = canvasDeltaToLotPct(dxPx, dyPx);
        const newOffsetX = Math.max(-10, Math.min(10, start.startOffsetX + delta.x));
        const newOffsetY = Math.max(-10, Math.min(10, start.startOffsetY + delta.y));
        onContourCommit?.({ x: newOffsetX, y: newOffsetY });
        return;
      }

      if (dragRef.current) {
        const id = dragRef.current.placementId;
        const angle = dragPreviewAngle ?? dragRef.current.startAngle;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* déjà relâché */
        }
        dragRef.current = null;
        setDragPreviewAngle(null);
        onAngleCommit(id, angle);
        return;
      }

      // s32 #1 — fin de drag move : commit la nouvelle position
      if (moveDragRef.current) {
        const id = moveDragRef.current.placementId;
        const point = movePreviewPoint ?? moveDragRef.current.startPoint;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* déjà relâché */
        }
        moveDragRef.current = null;
        setMovePreviewPoint(null);
        onPlacementMoving?.(null);
        onPlacementMoveCommit?.(id, point);
        return;
      }

      // s32 #1 — armed sans drag déclenché (simple clic) : on relâche tout.
      if (moveDragArmedRef.current) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* déjà relâché */
        }
        moveDragArmedRef.current = null;
      }
    },
    [
      dragPreviewAngle,
      movePreviewPoint,
      onAngleCommit,
      onPlacementMoveCommit,
      onPlacementMoving,
      getCanvasCoords,
      canvasDeltaToLotPct,
      onContourCommit,
      onPlaceClick,
      screenToLotPoint,
      contourDragActive,
      vertexPreview,
      effectivePolygon,
      onVertexCommit,
    ]
  );

  // s32 itér.4 (A1) — pointercancel : rollback (jamais commit).
  // Cas typique : le navigateur reprend la pointer capture (scroll, gesture
  // système). On ne doit PAS persister la position partielle.
  const handlePointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* déjà relâché */
      }
      // Drag angle en cours → reset preview, pas de commit (DB conserve l'ancien angle).
      if (dragRef.current) {
        dragRef.current = null;
        setDragPreviewAngle(null);
        return;
      }
      // Drag move en cours → reset preview vers position d'origine, pas de commit.
      if (moveDragRef.current) {
        moveDragRef.current = null;
        setMovePreviewPoint(null);
        onPlacementMoving?.(null);
        return;
      }
      // Drag armé sans franchissement seuil → reset.
      if (moveDragArmedRef.current) {
        moveDragArmedRef.current = null;
      }
      // s32 V3 — drag direct contour annulé → rollback (parent reset preview).
      if (contourDragRef.current) {
        contourDragRef.current = null;
        setContourDragActive(false);
        onContourDrag?.({
          x: typeof room.polygon_offset_x === "number" ? room.polygon_offset_x : 0,
          y: typeof room.polygon_offset_y === "number" ? room.polygon_offset_y : 0,
        });
      }
      // s32 #P1 — drag sommet annulé : rollback preview (pas de commit).
      if (vertexDragRef.current) {
        vertexDragRef.current = null;
        setVertexPreview(null);
      }
    },
    [onPlacementMoving, room.polygon_offset_x, room.polygon_offset_y, onContourDrag]
  );

  // dragPreviewAngle est un state mis à jour à chaque drag move → utilisé comme
  // proxy pour "drag actif" (refs ne peuvent pas être lus pendant le render).
  const isDraggingAngle = dragPreviewAngle !== null;
  const isDraggingMove = movePreviewPoint !== null;
  const isDraggingVertex = vertexPreview !== null;
  const cursorClass = isCommitting
    ? "cursor-wait"
    : isDraggingVertex
    ? "cursor-grabbing"
    : contourDragActive
    ? "cursor-grabbing"
    : isDraggingAngle || isDraggingMove
    ? "cursor-grabbing"
    : hoverVertexIdx !== null
    ? "cursor-grab" // s32 #P1 — sommet sous le curseur
    : hoverHandleId || hoverDotId
    ? "cursor-grab"
    : hover?.inPolygon
    ? "cursor-grab" // V3 — drag direct contour, plus de crosshair
    : "cursor-default";

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-bg-default rounded-md border border-border-default"
      role="application"
      aria-label={`Plan zoomé sur ${room.custom_label || room.name || room.room_type || "la pièce"}`}
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 ${cursorClass} touch-none`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        data-testid="room-zoom-canvas"
      />
      {!planImageUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-text-muted">Aucun plan importé — ajoutez un plan depuis les paramètres du lot.</p>
        </div>
      )}
      {planImageUrl && !imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="inline-block w-6 h-6 border-2 border-border-default border-t-interactive-primary rounded-full animate-spin" />
        </div>
      )}
      {/* Hint visuel — conditionnel selon contexte */}
      {placements.length === 0 && (
        <div className="absolute top-md left-md right-md pointer-events-none flex justify-center">
          <p className="text-xs text-text-default bg-bg-card/90 px-md py-xs rounded-md border border-border-default shadow-sm">
            Cliquez dans la pièce pour placer la première prise de vue.
          </p>
        </div>
      )}
      {placements.length > 0 && selectedPlacementId !== null && (
        <div className="absolute top-md left-md right-md pointer-events-none flex justify-center">
          <p className="text-xs text-text-default bg-bg-card/90 px-md py-xs rounded-md border border-border-default shadow-sm">
            Faites glisser la pointe de la flèche pour orienter la prise de vue.
          </p>
        </div>
      )}
    </div>
  );
}
