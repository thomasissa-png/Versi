/**
 * VisualPlanCanvas — Canvas HTML5 natif pour le placement photos sur plan
 * Étape 4 v2 / s30 Vague 3a
 *
 * Architecture (canvas natif, pas react-konva — cohérence RoomCanvas/PlanCanvas) :
 *  - Layer "background" : image plan (PNG/JPG), drawImage 1×
 *  - Layer "polygones"  : remplissage par état (vide / placée / multi)
 *  - Layer "photos"     : pastilles photos placées + angle
 *  - Layer "controls"   : ghost desktop, hover, focus a11y
 *
 * Pour éviter le re-render full sur chaque interaction, on segmente en :
 *  - drawStaticLayer() (plan + polygones de base)         : redessiné si rooms/zoom change
 *  - drawDynamicLayer() (ghost, hover, photos overlay)    : redessiné sur chaque pointermove
 *  Mais en V1 on utilise UN canvas et on redessine tout sur viewport change.
 *  Optimisation 2 canvases : prévue, hors V1 (gain marginal sur < 50 polygones).
 *
 * Interactions :
 *  Desktop : drag-and-drop HTML5 natif depuis PhotoSidebar → drop sur polygone
 *  Mobile  : tap polygone après tap photo sidebar (pattern non-drag,
 *            P0 fix GP5 audit Thomas s29 — doigt ne couvre jamais le polygone)
 *
 * Zoom auto pièce sélectionnée : 80% du viewport (computeRoomZoom).
 * Pinch zoom mobile + wheel zoom desktop : pattern RoomCanvas (versi-s22 P4).
 */

"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { VsRoom, VsPhoto } from "@/lib/vs/types";
import { polygonCentroid } from "@/lib/vs/types";
import {
  screenToNormalized,
  findRoomAtPoint,
  computeRoomZoom,
  type NormalizedPoint,
} from "@/lib/vs/ui/photo-placement";

// ─── Props ────────────────────────────────────────────────────────

export interface VisualPlanCanvasProps {
  /** URL image plan (background canvas) */
  planImageUrl: string | null;
  /** Pièces du lot/étage courant (avec polygones lot-local %) */
  rooms: VsRoom[];
  /** Photos uploadées (placées et non placées) — couches photos */
  photos: VsPhoto[];
  /** ID pièce focus (zoom auto pour P0 fix GP5) */
  focusedRoomId: string | null;
  /** Callback : tap polygone (mobile mode placement actif OU clic vide) */
  onSelectRoom: (roomId: string | null) => void;
  /** Callback : drop d'une photo sur un polygone (desktop drag-drop) */
  onDropPhotoOnRoom: (
    photoId: string,
    roomId: string,
    point: NormalizedPoint
  ) => void;
  /** Mode mobile : true → pattern tap-to-place (cache ghost drag) */
  isMobile?: boolean;
  /** ID photo en mode "placement actif" (mobile tap-to-select) */
  activePlacementPhotoId?: string | null;
  /** True pendant commit API (désactive interactions) */
  isCommitting?: boolean;
}

// ─── Constantes rendu ────────────────────────────────────────────

const PHOTO_DOT_RADIUS = 14; // px, taille pastille photo placée
const ANGLE_INDICATOR_LENGTH = 26; // px, longueur du trait d'angle

// Couleurs polygones par état (alignées tokens Versi Studio)
const COLOR_POLY_EMPTY = "rgba(124, 134, 145, 0.15)"; // gris neutre
const COLOR_POLY_EMPTY_BORDER = "rgba(124, 134, 145, 0.6)";
const COLOR_POLY_PLACED = "rgba(34, 161, 122, 0.18)"; // success/teint vert
const COLOR_POLY_PLACED_BORDER = "rgba(34, 161, 122, 0.7)";
const COLOR_POLY_MULTI = "rgba(46, 102, 220, 0.18)"; // info/teint bleu
const COLOR_POLY_MULTI_BORDER = "rgba(46, 102, 220, 0.7)";
const COLOR_POLY_FOCUS_BORDER = "rgba(20, 28, 40, 0.95)";
const COLOR_POLY_HOVER_BORDER = "rgba(46, 102, 220, 1)";

const PHOTO_DOT_FILL = "#2E66DC";
const PHOTO_DOT_BORDER = "#FFFFFF";
const ANGLE_INDICATOR_COLOR = "#141C28";

// Zoom limits
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 8;
const ZOOM_FACTOR = 1.1;

interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const INITIAL_VIEWPORT: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };

// ─── Composant principal ──────────────────────────────────────────

export default function VisualPlanCanvas({
  planImageUrl,
  rooms,
  photos,
  focusedRoomId,
  onSelectRoom,
  onDropPhotoOnRoom,
  isMobile = false,
  activePlacementPhotoId = null,
  isCommitting = false,
}: VisualPlanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const planImageRef = useRef<HTMLImageElement | null>(null);

  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStateRef = useRef<{ x: number; y: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const pinchStateRef = useRef<{ initialDistance: number; initialScale: number } | null>(null);

  // ─── Photos par room (pour couleur polygone) ───────────────────

  const photosByRoom = useMemo(() => {
    const map = new Map<string, VsPhoto[]>();
    for (const p of photos) {
      if (!p.is_placed_on_plan) continue;
      const list = map.get(p.room_id) ?? [];
      list.push(p);
      map.set(p.room_id, list);
    }
    return map;
  }, [photos]);

  // ─── Chargement image plan ─────────────────────────────────────
  // Note : setState dans onload/onerror est légitime (callback async, pas
  // synchrone-in-effect). La règle react-hooks/set-state-in-effect ne flag
  // que les setState appelés DANS le body de l'effect (synchrones).

  useEffect(() => {
    let cancelled = false;
    if (!planImageUrl) {
      planImageRef.current = null;
      // setState async via microtask pour éviter cascade synchrone (R19 lint)
      queueMicrotask(() => {
        if (!cancelled) setImageLoaded(false);
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
      setImageLoaded(true);
    };
    img.onerror = () => {
      if (cancelled) return;
      planImageRef.current = null;
      setImageLoaded(false);
    };
    img.src = planImageUrl;
    return () => {
      cancelled = true;
    };
  }, [planImageUrl]);

  // ─── Resize observer container ─────────────────────────────────

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

  // ─── Zoom auto pièce focus (P0 fix GP5) ───────────────────────
  // Microtask pour éviter le pattern setState-in-effect synchrone (lint R19).

  useEffect(() => {
    if (!focusedRoomId) return;
    if (containerSize.width === 0 || containerSize.height === 0) return;
    const room = rooms.find((r) => r.id === focusedRoomId);
    if (!room) return;
    const z = computeRoomZoom(room, containerSize, isMobile ? 0.7 : 0.6);
    if (!z) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setViewport(z);
    });
    return () => {
      cancelled = true;
    };
  }, [focusedRoomId, rooms, containerSize, isMobile]);

  // ─── Helper coords ─────────────────────────────────────────────

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    []
  );

  const screenToPlan = useCallback(
    (canvasX: number, canvasY: number): NormalizedPoint => {
      return screenToNormalized(canvasX, canvasY, {
        width: containerSize.width,
        height: containerSize.height,
        offsetX: viewport.offsetX,
        offsetY: viewport.offsetY,
        scale: viewport.scale,
      });
    },
    [containerSize, viewport]
  );

  // ─── Rendu canvas ──────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = containerSize.width;
    const h = containerSize.height;
    if (w === 0 || h === 0) return;

    // Resize physique avec DPR
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // CLEAR explicite (anti-artefact, règle s27.2 fullstack.md)
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#FAFAF7";
    ctx.fillRect(0, 0, w, h);

    // Layer 1 : background plan
    const img = planImageRef.current;
    if (img) {
      ctx.drawImage(
        img,
        viewport.offsetX,
        viewport.offsetY,
        w * viewport.scale,
        h * viewport.scale
      );
    }

    // Layer 2 : polygones pièces
    for (const room of rooms) {
      if (!room.polygon || room.polygon.length < 3) continue;
      const placed = photosByRoom.get(room.id) ?? [];
      const isMulti = placed.length > 1;
      const isPlaced = placed.length === 1;
      const isFocus = room.id === focusedRoomId;
      const isHover = room.id === hoveredRoomId;

      const fill = isMulti
        ? COLOR_POLY_MULTI
        : isPlaced
        ? COLOR_POLY_PLACED
        : COLOR_POLY_EMPTY;
      const baseBorder = isMulti
        ? COLOR_POLY_MULTI_BORDER
        : isPlaced
        ? COLOR_POLY_PLACED_BORDER
        : COLOR_POLY_EMPTY_BORDER;
      const border = isFocus
        ? COLOR_POLY_FOCUS_BORDER
        : isHover
        ? COLOR_POLY_HOVER_BORDER
        : baseBorder;

      ctx.beginPath();
      for (let i = 0; i < room.polygon.length; i++) {
        const pt = room.polygon[i];
        const px = (pt.x_percent / 100) * w * viewport.scale + viewport.offsetX;
        const py = (pt.y_percent / 100) * h * viewport.scale + viewport.offsetY;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = isFocus || isHover ? 2.5 : 1.5;
      ctx.stroke();

      // Label pièce au centroïde
      const c = polygonCentroid(room.polygon);
      const cx = (c.x_percent / 100) * w * viewport.scale + viewport.offsetX;
      const cy = (c.y_percent / 100) * h * viewport.scale + viewport.offsetY;
      ctx.fillStyle = "#141C28";
      ctx.font = "500 11px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label =
        room.custom_label || room.name || room.room_type || "Pièce";
      ctx.fillText(label, cx, cy);
    }

    // Layer 3 : photos placées (pastilles + angle)
    for (const photo of photos) {
      if (!photo.is_placed_on_plan) continue;
      if (photo.position_x === null || photo.position_y === null) continue;
      // Position photo : on assume coords normalisées plan-relatif (0-1).
      // Si la pièce est positionnée en lot-local, on délègue à la persistance API.
      const px = photo.position_x * w * viewport.scale + viewport.offsetX;
      const py = photo.position_y * h * viewport.scale + viewport.offsetY;

      // Trait angle (depuis pastille)
      if (photo.angle_degrees !== null) {
        const rad = ((photo.angle_degrees - 90) * Math.PI) / 180; // 0° = nord
        const ex = px + Math.cos(rad) * ANGLE_INDICATOR_LENGTH;
        const ey = py + Math.sin(rad) * ANGLE_INDICATOR_LENGTH;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = ANGLE_INDICATOR_COLOR;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Pastille
      ctx.beginPath();
      ctx.arc(px, py, PHOTO_DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = PHOTO_DOT_FILL;
      ctx.fill();
      ctx.strokeStyle = PHOTO_DOT_BORDER;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }, [
    containerSize,
    viewport,
    rooms,
    photos,
    photosByRoom,
    focusedRoomId,
    hoveredRoomId,
  ]);

  // Trigger redraw sur changements
  useEffect(() => {
    draw();
  }, [draw, imageLoaded]);

  // ─── Interactions desktop : drag-drop HTML5 ────────────────────

  const handleDragOver = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: ReactDragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (isCommitting) return;
      const photoId = e.dataTransfer.getData("text/photo-id");
      if (!photoId) return;
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      const point = screenToPlan(x, y);
      const room = findRoomAtPoint(point, rooms);
      if (!room) return;
      onDropPhotoOnRoom(photoId, room.id, point);
    },
    [getCanvasCoords, screenToPlan, rooms, onDropPhotoOnRoom, isCommitting]
  );

  // ─── Interactions communes : pointer (hover, click, pan) ───────

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (isCommitting) return;
      // Pan : middle button OU shift+left desktop, OU 1 doigt non-tap-to-place mobile
      const isPanGesture =
        e.button === 1 ||
        (e.button === 0 && e.shiftKey) ||
        (isMobile && !activePlacementPhotoId);
      if (!isPanGesture) return;
      const canvas = canvasRef.current;
      canvas?.setPointerCapture(e.pointerId);
      panStateRef.current = {
        x: e.clientX,
        y: e.clientY,
        startOffsetX: viewport.offsetX,
        startOffsetY: viewport.offsetY,
      };
      setIsPanning(true);
    },
    [viewport, isMobile, activePlacementPhotoId, isCommitting]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (panStateRef.current) {
        const dx = e.clientX - panStateRef.current.x;
        const dy = e.clientY - panStateRef.current.y;
        setViewport((v) => ({
          ...v,
          offsetX: panStateRef.current!.startOffsetX + dx,
          offsetY: panStateRef.current!.startOffsetY + dy,
        }));
        return;
      }
      // Hover detection (desktop only)
      if (!isMobile) {
        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        const point = screenToPlan(x, y);
        const room = findRoomAtPoint(point, rooms);
        setHoveredRoomId(room?.id ?? null);
      }
    },
    [isMobile, getCanvasCoords, screenToPlan, rooms]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (panStateRef.current) {
        canvas?.releasePointerCapture(e.pointerId);
        panStateRef.current = null;
        setIsPanning(false);
        return;
      }
      // Click / tap : sélection pièce
      if (e.button !== 0) return;
      if (isCommitting) return;
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      const point = screenToPlan(x, y);
      const room = findRoomAtPoint(point, rooms);
      onSelectRoom(room?.id ?? null);
    },
    [getCanvasCoords, screenToPlan, rooms, onSelectRoom, isCommitting]
  );

  // Wheel zoom desktop (centré curseur)
  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (isCommitting) return;
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      setViewport((v) => {
        const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.scale * factor));
        if (newScale === v.scale) return v;
        // Centre sur curseur : maintient le point sous le curseur fixe
        const ratio = newScale / v.scale;
        const offsetX = x - (x - v.offsetX) * ratio;
        const offsetY = y - (y - v.offsetY) * ratio;
        return { scale: newScale, offsetX, offsetY };
      });
    },
    [getCanvasCoords, isCommitting]
  );

  // Pinch zoom mobile (touchEvents — natif via TouchList)
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 2) return;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    pinchStateRef.current = {
      initialDistance: Math.hypot(dx, dy),
      initialScale: viewport.scale,
    };
  }, [viewport.scale]);

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length !== 2 || !pinchStateRef.current) return;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchStateRef.current.initialDistance;
      const newScale = Math.max(
        ZOOM_MIN,
        Math.min(ZOOM_MAX, pinchStateRef.current.initialScale * ratio)
      );
      setViewport((v) => ({ ...v, scale: newScale }));
    },
    []
  );

  const onTouchEnd = useCallback(() => {
    pinchStateRef.current = null;
  }, []);

  // Keyboard a11y : Tab focus, Enter/Space sélectionne pièce courante (focus)
  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLCanvasElement>) => {
      if (e.key === "Escape") {
        onSelectRoom(null);
        return;
      }
      // Pan via flèches
      const PAN_STEP = 30;
      if (e.key === "ArrowLeft") setViewport((v) => ({ ...v, offsetX: v.offsetX + PAN_STEP }));
      if (e.key === "ArrowRight") setViewport((v) => ({ ...v, offsetX: v.offsetX - PAN_STEP }));
      if (e.key === "ArrowUp") setViewport((v) => ({ ...v, offsetY: v.offsetY + PAN_STEP }));
      if (e.key === "ArrowDown") setViewport((v) => ({ ...v, offsetY: v.offsetY - PAN_STEP }));
    },
    [onSelectRoom]
  );

  const cursorClass = isPanning
    ? "cursor-grabbing"
    : isCommitting
    ? "cursor-wait"
    : activePlacementPhotoId
    ? "cursor-crosshair"
    : "cursor-grab";

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-bg-default"
      onDragOver={!isMobile ? handleDragOver : undefined}
      onDrop={!isMobile ? handleDrop : undefined}
      role="application"
      aria-label="Plan de l'opération avec polygones de pièces"
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 ${cursorClass} touch-none`}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onKeyDown={handleKeyDown}
        aria-label={
          activePlacementPhotoId
            ? "Mode placement actif — tapez sur une pièce pour placer la photo"
            : "Plan interactif — utilisez la molette pour zoomer, shift+drag pour déplacer"
        }
        data-testid="visual-plan-canvas"
      />
      {!planImageUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-text-muted">Aucun plan disponible.</p>
        </div>
      )}
      {planImageUrl && !imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="inline-block w-6 h-6 border-2 border-border-default border-t-interactive-primary rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
