/**
 * RoomCanvas — Canvas HTML5 natif pour visualiser les pièces d'un lot
 *
 * Rendu : Client Component — interactions drag, clic, resize, zoom/pan.
 *
 * Fonctionnalites :
 * - Affiche le plan en arriere-plan (image)
 * - Zoom sur la zone du lot selectionne (zone_data en %)
 * - Overlays colores par type de piece (40% opacity)
 * - Selection d'une piece (clic)
 * - Repositionnement (drag sur une pièce)
 * - Zoom molette (centré curseur) + pan drag (sur zone vide) — versi-s22
 * - Touch/pinch mobile (pointer events unifiés, pinch 2-doigts) — versi-s23
 * - Synchronise avec le panneau lateral via callbacks
 */

"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import type { VsRoom, ZoneRect } from "@/lib/vs/types";
import { getRoomColor, ROOM_TYPE_DROPDOWN } from "@/lib/vs/styles";

// ─── Types ────────────────────────────────────────────────────────

interface RoomPosition {
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface PointerState {
  x: number;
  y: number;
}

interface RoomCanvasProps {
  /** URL de l'image du plan */
  planImageUrl: string | null;
  /** Zone du lot selectionne (coordonnees % sur le plan global) */
  lotZone: ZoneRect;
  /** Liste des pieces du lot courant */
  rooms: VsRoom[];
  /** ID de la piece selectionnee */
  selectedRoomId: string | null;
  /** Callback quand une piece est selectionnee */
  onSelectRoom: (roomId: string | null) => void;
  /** Callback quand une piece est deplacee (debounce gere par le parent) */
  onMoveRoom: (roomId: string, position: RoomPosition) => void;
  /** Si true et une pièce est non_identifie, overlay rouge (CORR-C3) */
  validationBlocked?: boolean;
}

// ─── Constantes zoom/pan (versi-s22) ──────────────────────────────

const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const ZOOM_FACTOR = 1.1;
const ZOOM_RESET_THRESHOLD = 1.05;
const INITIAL_VIEWPORT: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };

// ─── Helpers ──────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function getRoomPosition(room: VsRoom): RoomPosition | null {
  const pos = room.position as RoomPosition | null;
  if (
    !pos ||
    typeof pos.x_percent !== "number" ||
    typeof pos.y_percent !== "number" ||
    typeof pos.width_percent !== "number" ||
    typeof pos.height_percent !== "number"
  ) {
    return null;
  }
  return pos;
}

function getDropdownLabel(roomType: string): string {
  const found = ROOM_TYPE_DROPDOWN.find((r) => r.value === roomType);
  return found?.label ?? roomType;
}

function distance(a: PointerState, b: PointerState): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function midpoint(a: PointerState, b: PointerState): PointerState {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ─── Composant ────────────────────────────────────────────────────

export default function RoomCanvas({
  planImageUrl,
  lotZone,
  rooms,
  selectedRoomId,
  onSelectRoom,
  onMoveRoom,
  validationBlocked = false,
}: RoomCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Viewport (zoom + pan) — versi-s22
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const panRef = useRef<{
    startX: number;
    startY: number;
    originOffsetX: number;
    originOffsetY: number;
  } | null>(null);

  // Pointers actifs (versi-s23) — touch/pinch
  const pointersRef = useRef<Map<number, PointerState>>(new Map());
  const pinchRef = useRef<{
    initialDistance: number;
    initialScale: number;
    initialOffsetX: number;
    initialOffsetY: number;
    center: PointerState;
  } | null>(null);

  // Drag state (pièce)
  const [dragging, setDragging] = useState<{
    roomId: string;
    pointerId: number;
    startX: number;
    startY: number;
    origPos: RoomPosition;
  } | null>(null);

  // ─── Charger l'image du plan ──────────────────────────────────
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

  // ─── Resize observer ─────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({
            width: Math.round(width),
            height: Math.round(height),
          });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ─── Clamp pan (évite de perdre le plan hors viewport) ──────

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

  // ─── Convertir coordonnees lot-local en pixels canvas ─────────

  const toCanvasCoords = useCallback(
    (pos: RoomPosition) => {
      return {
        x: (pos.x_percent / 100) * canvasSize.width,
        y: (pos.y_percent / 100) * canvasSize.height,
        w: (pos.width_percent / 100) * canvasSize.width,
        h: (pos.height_percent / 100) * canvasSize.height,
      };
    },
    [canvasSize]
  );

  const toPercentCoords = useCallback(
    (px: number, py: number): { xPct: number; yPct: number } => {
      return {
        xPct: (px / canvasSize.width) * 100,
        yPct: (py / canvasSize.height) * 100,
      };
    },
    [canvasSize]
  );

  // ─── Dessin du canvas ─────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvasSize;
    const dpr = window.devicePixelRatio;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Fond hors viewport
    ctx.fillStyle = "#F0EDE8";
    ctx.fillRect(0, 0, width, height);

    // Appliquer viewport (zoom + pan) — versi-s22
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.scale, viewport.scale);

    // Fond du plan (dans le viewport)
    ctx.fillStyle = "#F0EDE8";
    ctx.fillRect(0, 0, width, height);

    // Image du plan (zoom sur la zone du lot, ratio préservé — versi-s22 fix plan rogné)
    if (imageRef.current && imageLoaded) {
      const img = imageRef.current;
      const sx = (lotZone.x_percent / 100) * img.naturalWidth;
      const sy = (lotZone.y_percent / 100) * img.naturalHeight;
      const sw = (lotZone.width_percent / 100) * img.naturalWidth;
      const sh = (lotZone.height_percent / 100) * img.naturalHeight;

      // Pattern "contain" — préserver l'aspect ratio de la zone cropée
      const sourceAspect = sw / sh;
      const canvasAspect = width / height;

      let drawW: number, drawH: number, drawX: number, drawY: number;
      if (sourceAspect > canvasAspect) {
        drawW = width;
        drawH = width / sourceAspect;
        drawX = 0;
        drawY = (height - drawH) / 2;
      } else {
        drawH = height;
        drawW = height * sourceAspect;
        drawX = (width - drawW) / 2;
        drawY = 0;
      }
      ctx.drawImage(img, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
    } else {
      // Placeholder quadrillage si pas d'image
      ctx.strokeStyle = "#D9D4CE";
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Dessiner les pieces
    for (const room of rooms) {
      const pos = getRoomPosition(room);
      if (!pos) continue;

      const { x, y, w, h } = toCanvasCoords(pos);
      const baseColor = getRoomColor(room.room_type);
      const isSelected = room.id === selectedRoomId;
      const isBlockedRoom =
        validationBlocked && room.room_type === "non_identifie";

      ctx.fillStyle = isBlockedRoom
        ? "rgba(220, 38, 38, 0.5)"
        : hexToRgba(baseColor, 0.4);
      ctx.fillRect(x, y, w, h);

      if (isBlockedRoom) {
        ctx.strokeStyle = "#DC2626";
        ctx.lineWidth = 3 / viewport.scale;
      } else {
        ctx.strokeStyle = isSelected ? baseColor : hexToRgba(baseColor, 0.7);
        ctx.lineWidth = (isSelected ? 3 : 1.5) / viewport.scale;
      }
      ctx.strokeRect(x, y, w, h);

      if (isSelected) {
        ctx.strokeStyle = hexToRgba(baseColor, 0.3);
        ctx.lineWidth = 6 / viewport.scale;
        ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
      }

      // Label (taille compensée par le scale pour rester lisible)
      const label = room.name || getDropdownLabel(room.room_type);
      const surfaceText = room.surface_m2
        ? ` ${Number(room.surface_m2).toFixed(0)} m²`
        : "";

      const fontSize = 13 / viewport.scale;
      ctx.font = `500 ${fontSize}px 'PP Neue Montreal', 'DM Sans', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const centerX = x + w / 2;
      const centerY = y + h / 2;

      const textWidth = ctx.measureText(label + surfaceText).width;
      const padding = 6 / viewport.scale;
      const boxH = 20 / viewport.scale;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillRect(
        centerX - textWidth / 2 - padding,
        centerY - boxH / 2,
        textWidth + padding * 2,
        boxH
      );

      ctx.fillStyle = "#0B0B0B";
      ctx.fillText(label + surfaceText, centerX, centerY);
    }
  }, [canvasSize, imageLoaded, lotZone, rooms, selectedRoomId, toCanvasCoords, validationBlocked, viewport]);

  useEffect(() => {
    draw();
  }, [draw]);

  // ─── Identifier la piece sous le curseur (tient compte du viewport) ──

  const getRoomAtPoint = useCallback(
    (clientX: number, clientY: number): VsRoom | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      // Conversion : écran → coord logiques (avant zoom/pan)
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      const px = (rawX - viewport.offsetX) / viewport.scale;
      const py = (rawY - viewport.offsetY) / viewport.scale;

      for (let i = rooms.length - 1; i >= 0; i--) {
        const room = rooms[i];
        const pos = getRoomPosition(room);
        if (!pos) continue;

        const { x, y, w, h } = toCanvasCoords(pos);
        if (px >= x && px <= x + w && py >= y && py <= y + h) {
          return room;
        }
      }
      return null;
    },
    [rooms, toCanvasCoords, viewport]
  );

  // ─── Gestionnaires pointer events (versi-s23) ───────────────
  // Unifie souris + tactile via Pointer Events API.
  // 1 pointer = pan OU drag d'une pièce (selon position)
  // 2 pointers = pinch zoom (annule pan/drag en cours)

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Tracker tous les pointers actifs
      canvas.setPointerCapture(e.pointerId);
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Si 2 pointers = démarrer pinch zoom (et annuler pan/drag)
      if (pointersRef.current.size === 2) {
        const [p1, p2] = Array.from(pointersRef.current.values());
        const rect = canvas.getBoundingClientRect();
        const center = midpoint(p1, p2);
        pinchRef.current = {
          initialDistance: distance(p1, p2),
          initialScale: viewport.scale,
          initialOffsetX: viewport.offsetX,
          initialOffsetY: viewport.offsetY,
          center: { x: center.x - rect.left, y: center.y - rect.top },
        };
        // Annuler pan/drag 1-pointer en cours
        panRef.current = null;
        if (dragging) setDragging(null);
        return;
      }

      // 1 pointer = drag pièce OU pan
      if (pointersRef.current.size === 1) {
        const room = getRoomAtPoint(e.clientX, e.clientY);
        if (room) {
          onSelectRoom(room.id);
          const pos = getRoomPosition(room);
          if (pos) {
            setDragging({
              roomId: room.id,
              pointerId: e.pointerId,
              startX: e.clientX,
              startY: e.clientY,
              origPos: { ...pos },
            });
          }
        } else {
          // Pas de pièce → pan
          onSelectRoom(null);
          const rect = canvas.getBoundingClientRect();
          panRef.current = {
            startX: e.clientX - rect.left,
            startY: e.clientY - rect.top,
            originOffsetX: viewport.offsetX,
            originOffsetY: viewport.offsetY,
          };
          canvas.style.cursor = "grabbing";
        }
      }
    },
    [dragging, getRoomAtPoint, onSelectRoom, viewport]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Mettre à jour la position du pointer (si tracké)
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Pinch zoom (2 pointers)
      if (pinchRef.current && pointersRef.current.size === 2) {
        const [p1, p2] = Array.from(pointersRef.current.values());
        const currentDistance = distance(p1, p2);
        if (currentDistance === 0) return;

        const ratio = currentDistance / pinchRef.current.initialDistance;
        const newScale = clamp(
          pinchRef.current.initialScale * ratio,
          ZOOM_MIN,
          ZOOM_MAX
        );

        const rect = canvas.getBoundingClientRect();
        const cx = pinchRef.current.center.x;
        const cy = pinchRef.current.center.y;
        const scaleRatio = newScale / pinchRef.current.initialScale;
        const rawOffsetX = cx - (cx - pinchRef.current.initialOffsetX) * scaleRatio;
        const rawOffsetY = cy - (cy - pinchRef.current.initialOffsetY) * scaleRatio;

        if (newScale <= ZOOM_MIN) {
          setViewport(INITIAL_VIEWPORT);
        } else {
          const clamped = clampViewportOffsets(newScale, rawOffsetX, rawOffsetY, rect.width, rect.height);
          setViewport({ scale: newScale, offsetX: clamped.offsetX, offsetY: clamped.offsetY });
        }
        return;
      }

      // Pan actif (1 pointer, zone vide)
      if (panRef.current) {
        const rect = canvas.getBoundingClientRect();
        const curX = e.clientX - rect.left;
        const curY = e.clientY - rect.top;
        const dx = curX - panRef.current.startX;
        const dy = curY - panRef.current.startY;
        const rawX = panRef.current.originOffsetX + dx;
        const rawY = panRef.current.originOffsetY + dy;
        setViewport((prev) => {
          const clamped = clampViewportOffsets(prev.scale, rawX, rawY, rect.width, rect.height);
          return { ...prev, offsetX: clamped.offsetX, offsetY: clamped.offsetY };
        });
        return;
      }

      // Drag d'une pièce
      if (dragging && e.pointerId === dragging.pointerId) {
        canvas.style.cursor = "grabbing";

        const dx = (e.clientX - dragging.startX) / viewport.scale;
        const dy = (e.clientY - dragging.startY) / viewport.scale;
        const { xPct: dxPct, yPct: dyPct } = toPercentCoords(dx, dy);

        const newPos: RoomPosition = {
          x_percent: Math.max(
            0,
            Math.min(
              100 - dragging.origPos.width_percent,
              dragging.origPos.x_percent + dxPct
            )
          ),
          y_percent: Math.max(
            0,
            Math.min(
              100 - dragging.origPos.height_percent,
              dragging.origPos.y_percent + dyPct
            )
          ),
          width_percent: dragging.origPos.width_percent,
          height_percent: dragging.origPos.height_percent,
        };

        onMoveRoom(dragging.roomId, newPos);
        return;
      }

      // Hover cursor (souris uniquement — pas de hover sur tactile)
      if (e.pointerType === "mouse") {
        const room = getRoomAtPoint(e.clientX, e.clientY);
        canvas.style.cursor = room
          ? "grab"
          : viewport.scale > ZOOM_RESET_THRESHOLD
            ? "grab"
            : "default";
      }
    },
    [dragging, getRoomAtPoint, onMoveRoom, toPercentCoords, viewport, clampViewportOffsets]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
          // pointer déjà libéré, ignorer
        }
      }
      pointersRef.current.delete(e.pointerId);

      // Fin du pinch si on passe sous 2 pointers
      if (pinchRef.current && pointersRef.current.size < 2) {
        pinchRef.current = null;
      }

      // Fin du pan
      if (panRef.current) {
        panRef.current = null;
        if (canvas) canvas.style.cursor = "default";
      }

      // Fin du drag pièce
      if (dragging && e.pointerId === dragging.pointerId) {
        if (canvas) canvas.style.cursor = "default";
        setDragging(null);
      }
    },
    [dragging]
  );

  // ─── Wheel — zoom centré curseur (versi-s22, desktop uniquement) ──

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
      const newScale = clamp(currentScale * factor, ZOOM_MIN, ZOOM_MAX);
      if (newScale === currentScale) return;
      const ratio = newScale / currentScale;
      const newOffsetX = cx - (cx - viewport.offsetX) * ratio;
      const newOffsetY = cy - (cy - viewport.offsetY) * ratio;
      if (newScale === ZOOM_MIN) {
        setViewport(INITIAL_VIEWPORT);
      } else {
        const clamped = clampViewportOffsets(newScale, newOffsetX, newOffsetY, rect.width, rect.height);
        setViewport({ scale: newScale, offsetX: clamped.offsetX, offsetY: clamped.offsetY });
      }
    },
    [viewport, clampViewportOffsets]
  );

  // Reset viewport
  const resetViewport = useCallback(() => {
    setViewport(INITIAL_VIEWPORT);
  }, []);

  // ─── Rendu ────────────────────────────────────────────────────

  const showResetButton = viewport.scale > ZOOM_RESET_THRESHOLD;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[200px] sm:min-h-[400px] bg-bg-canvas rounded-lg overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        // touch-action: none bloque scroll/zoom natif navigateur pendant gesture (versi-s23)
        style={{ width: "100%", height: "100%", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        aria-label="Plan du lot avec les pièces identifiées"
        role="img"
      />

      {/* Bouton reset zoom (versi-s22) */}
      {showResetButton && (
        <button
          type="button"
          onClick={resetViewport}
          className="absolute top-2 right-2 px-3 py-1.5 text-xs font-medium bg-bg-card/90 hover:bg-bg-card border border-border rounded-md shadow-sm transition-colors"
          aria-label="Réinitialiser le zoom"
        >
          Réinitialiser la vue
        </button>
      )}

      {/* Liste SR-only pour navigation clavier (CORR-C2 — WCAG 2.1.1) */}
      <ul className="sr-only" aria-label="Liste des pièces du lot">
        {rooms.map((room) => {
          const label = room.name || getDropdownLabel(room.room_type);
          const surface = room.surface_m2
            ? ` — ${Number(room.surface_m2).toFixed(0)} m²`
            : "";
          return (
            <li key={room.id}>
              <button
                type="button"
                onClick={() => onSelectRoom(room.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectRoom(room.id);
                  }
                }}
              >
                {label}{surface}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Indicateur quand pas d'image */}
      {!planImageUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-text-muted bg-bg-card/80 px-md py-sm rounded-md">
            Aperçu du plan non disponible
          </p>
        </div>
      )}
    </div>
  );
}
