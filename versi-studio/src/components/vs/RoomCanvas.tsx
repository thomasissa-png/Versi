/**
 * RoomCanvas — Canvas HTML5 natif pour visualiser les pièces d'un lot
 *
 * Rendu : Client Component — interactions drag, clic, resize.
 *
 * Fonctionnalites :
 * - Affiche le plan en arriere-plan (image)
 * - Zoom sur la zone du lot selectionne (zone_data en %)
 * - Overlays colores par type de piece (40% opacity)
 * - Selection d'une piece (clic)
 * - Repositionnement (drag)
 * - Synchronise avec le panneau lateral via callbacks
 */

"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { VsRoom, ZoneRect } from "@/lib/vs/types";
import { pointInPolygon, polygonCentroid } from "@/lib/vs/types";
import { getRoomColor, ROOM_TYPE_DROPDOWN } from "@/lib/vs/styles";

// ─── Types ────────────────────────────────────────────────────────

interface RoomPosition {
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
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

// ─── Helpers ──────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

// ─── Constantes resize (pattern PlanCanvas) ──────────────────────

const HANDLE_SIZE = 8;
const HANDLE_HIT_SIZE = 20;
const MIN_ROOM_SIZE_PERCENT = 3;

type HandlePosition = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

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
  start: RoomPosition,
  handle: HandlePosition,
  dxPercent: number,
  dyPercent: number
): RoomPosition {
  let { x_percent, y_percent, width_percent, height_percent } = start;

  switch (handle) {
    case "e":
      width_percent = Math.max(MIN_ROOM_SIZE_PERCENT, start.width_percent + dxPercent);
      break;
    case "w": {
      const newW = Math.max(MIN_ROOM_SIZE_PERCENT, start.width_percent - dxPercent);
      x_percent = start.x_percent + (start.width_percent - newW);
      width_percent = newW;
      break;
    }
    case "s":
      height_percent = Math.max(MIN_ROOM_SIZE_PERCENT, start.height_percent + dyPercent);
      break;
    case "n": {
      const newH = Math.max(MIN_ROOM_SIZE_PERCENT, start.height_percent - dyPercent);
      y_percent = start.y_percent + (start.height_percent - newH);
      height_percent = newH;
      break;
    }
    case "se":
      width_percent = Math.max(MIN_ROOM_SIZE_PERCENT, start.width_percent + dxPercent);
      height_percent = Math.max(MIN_ROOM_SIZE_PERCENT, start.height_percent + dyPercent);
      break;
    case "nw": {
      const newW = Math.max(MIN_ROOM_SIZE_PERCENT, start.width_percent - dxPercent);
      const newH = Math.max(MIN_ROOM_SIZE_PERCENT, start.height_percent - dyPercent);
      x_percent = start.x_percent + (start.width_percent - newW);
      y_percent = start.y_percent + (start.height_percent - newH);
      width_percent = newW;
      height_percent = newH;
      break;
    }
    case "ne": {
      width_percent = Math.max(MIN_ROOM_SIZE_PERCENT, start.width_percent + dxPercent);
      const newH = Math.max(MIN_ROOM_SIZE_PERCENT, start.height_percent - dyPercent);
      y_percent = start.y_percent + (start.height_percent - newH);
      height_percent = newH;
      break;
    }
    case "sw": {
      const newW = Math.max(MIN_ROOM_SIZE_PERCENT, start.width_percent - dxPercent);
      x_percent = start.x_percent + (start.width_percent - newW);
      width_percent = newW;
      height_percent = Math.max(MIN_ROOM_SIZE_PERCENT, start.height_percent + dyPercent);
      break;
    }
  }

  // Clamper dans [0, 100]
  x_percent = Math.max(0, Math.min(100 - MIN_ROOM_SIZE_PERCENT, x_percent));
  y_percent = Math.max(0, Math.min(100 - MIN_ROOM_SIZE_PERCENT, y_percent));
  width_percent = Math.min(100 - x_percent, width_percent);
  height_percent = Math.min(100 - y_percent, height_percent);

  return { x_percent, y_percent, width_percent, height_percent };
}

function getCursorForHandle(handle: HandlePosition | null, isOverRoom: boolean): string {
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
  if (isOverRoom) return "grab";
  return "default";
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
  // Dimensions naturelles de l'image — stockées en state pour éviter d'accéder à imageRef
  // pendant le render (React Compiler interdit ref.current hors effects/callbacks).
  const [imageNaturalSize, setImageNaturalSize] = useState({ w: 0, h: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Drag state (move ou resize)
  const [dragging, setDragging] = useState<{
    type: "move" | "resize";
    roomId: string;
    handle?: HandlePosition;
    startX: number;
    startY: number;
    origPos: RoomPosition;
  } | null>(null);

  // ─── Charger l'image du plan ──────────────────────────────────
  // Reset imageLoaded quand l'URL change — setState pendant render (pattern
  // React docs compliant React Compiler). imageRef est reset dans l'effect.
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
      setImageNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImageLoaded(true);
    };
    img.onerror = () => {
      imageRef.current = null;
      setImageNaturalSize({ w: 0, h: 0 });
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

  // ─── Layout letterbox/pillarbox — préserve le ratio du lot (versi-s22) ───
  // Calcule la zone de rendu effective en tenant compte du ratio source (lot crop)
  // vs le ratio du canvas destination. Évite l'étirement vertical/horizontal.

  const renderLayout = useMemo(() => {
    const { width, height } = canvasSize;

    if (!imageLoaded || imageNaturalSize.w <= 0 || imageNaturalSize.h <= 0) {
      // Pas d'image : rendu plein canvas (pas de letterbox)
      return { renderW: width, renderH: height, offsetX: 0, offsetY: 0 };
    }

    // Dimensions source en pixels natifs
    const sw = (lotZone.width_percent / 100) * imageNaturalSize.w;
    const sh = (lotZone.height_percent / 100) * imageNaturalSize.h;

    if (sw <= 0 || sh <= 0) {
      return { renderW: width, renderH: height, offsetX: 0, offsetY: 0 };
    }

    const srcRatio = sw / sh;
    const dstRatio = width / height;

    let renderW: number;
    let renderH: number;
    let offsetX: number;
    let offsetY: number;

    if (srcRatio > dstRatio) {
      // Source plus large que destination -> letterbox (bandes haut/bas)
      renderW = width;
      renderH = width / srcRatio;
      offsetX = 0;
      offsetY = (height - renderH) / 2;
    } else {
      // Source plus haute que destination -> pillarbox (bandes gauche/droite)
      renderH = height;
      renderW = height * srcRatio;
      offsetX = (width - renderW) / 2;
      offsetY = 0;
    }

    return { renderW, renderH, offsetX, offsetY };
  }, [canvasSize, lotZone.width_percent, lotZone.height_percent, imageLoaded, imageNaturalSize]);

  // ─── Convertir coordonnees lot-local en pixels canvas ─────────

  /**
   * Les positions des pieces sont en % RELATIF au lot (pas au plan global).
   * Le canvas affiche la zone du lot avec letterbox pour préserver le ratio.
   * Les coordonnées % sont relatives à la zone de rendu effective (renderW x renderH),
   * décalée de (offsetX, offsetY) dans le canvas.
   */
  const toCanvasCoords = useCallback(
    (pos: RoomPosition) => {
      const { renderW, renderH, offsetX, offsetY } = renderLayout;
      return {
        x: (pos.x_percent / 100) * renderW + offsetX,
        y: (pos.y_percent / 100) * renderH + offsetY,
        w: (pos.width_percent / 100) * renderW,
        h: (pos.height_percent / 100) * renderH,
      };
    },
    [renderLayout]
  );

  const toPercentCoords = useCallback(
    (px: number, py: number): { xPct: number; yPct: number } => {
      const { renderW, renderH, offsetX, offsetY } = renderLayout;
      return {
        xPct: ((px - offsetX) / renderW) * 100,
        yPct: ((py - offsetY) / renderH) * 100,
      };
    },
    [renderLayout]
  );

  /**
   * Convertit un delta en pixels (mouvement souris) en delta en % lot-local.
   * Contrairement à toPercentCoords, ne soustrait PAS l'offset letterbox —
   * un delta est relatif, pas absolu. Bug critique versi-s22 :
   * toPercentCoords(dx, dy) soustrayait offsetX/offsetY d'un delta,
   * rendant le drag/resize vertical inutilisable quand offsetY > 0 (letterbox).
   */
  const toDeltaPercent = useCallback(
    (dxPx: number, dyPx: number): { dxPct: number; dyPct: number } => {
      const { renderW, renderH } = renderLayout;
      return {
        dxPct: (dxPx / renderW) * 100,
        dyPct: (dyPx / renderH) * 100,
      };
    },
    [renderLayout]
  );

  // ─── Conversion polygone lot-local % → pixels canvas ─────────

  const toCanvasPolygonPoints = useCallback(
    (polygon: Array<{ x_percent: number; y_percent: number }>): Array<{ x: number; y: number }> => {
      const { renderW, renderH, offsetX, offsetY } = renderLayout;
      return polygon.map((p) => ({
        x: (p.x_percent / 100) * renderW + offsetX,
        y: (p.y_percent / 100) * renderH + offsetY,
      }));
    },
    [renderLayout]
  );

  /**
   * Determine si une pièce est une suggestion IA non confirmée :
   * source='ai', status='suggested', touched=false
   */
  function isUntouchedAiRoom(room: VsRoom): boolean {
    return room.source === "ai" && !room.touched;
  }

  // ─── Dessin du canvas ─────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvasSize;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Fond
    ctx.fillStyle = "#F0EDE8";
    ctx.fillRect(0, 0, width, height);

    // Image du plan (zoom sur la zone du lot) — letterbox pour préserver le ratio (versi-s22)
    if (imageRef.current && imageLoaded) {
      const img = imageRef.current;
      const sx = (lotZone.x_percent / 100) * img.naturalWidth;
      const sy = (lotZone.y_percent / 100) * img.naturalHeight;
      const sw = (lotZone.width_percent / 100) * img.naturalWidth;
      const sh = (lotZone.height_percent / 100) * img.naturalHeight;
      const { renderW, renderH, offsetX, offsetY } = renderLayout;
      ctx.drawImage(img, sx, sy, sw, sh, offsetX, offsetY, renderW, renderH);
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

    // Dessiner les pieces (polygone si disponible, sinon rectangle)
    for (const room of rooms) {
      const pos = getRoomPosition(room);
      if (!pos) continue;

      const baseColor = getRoomColor(room.room_type);
      const isSelected = room.id === selectedRoomId;
      const isBlockedRoom =
        validationBlocked && room.room_type === "non_identifie";
      const isAiSuggestion = isUntouchedAiRoom(room);

      // Opacités réduites pour suggestion IA non confirmée (Option C)
      const fillAlpha = isBlockedRoom ? 0.5 : isAiSuggestion ? 0.25 : 0.4;
      const strokeAlpha = isAiSuggestion ? 0.6 : 0.7;

      // Vérifier si un polygone valide (>= 4 points) existe
      const hasPolygon = Array.isArray(room.polygon) && room.polygon.length >= 4;

      if (hasPolygon) {
        // ─── Rendu polygone ────────────────────────────────────
        const canvasPts = toCanvasPolygonPoints(room.polygon!);

        ctx.beginPath();
        ctx.moveTo(canvasPts[0].x, canvasPts[0].y);
        for (let i = 1; i < canvasPts.length; i++) {
          ctx.lineTo(canvasPts[i].x, canvasPts[i].y);
        }
        ctx.closePath();

        // Fill
        ctx.fillStyle = isBlockedRoom
          ? `rgba(220, 38, 38, ${fillAlpha})`
          : hexToRgba(baseColor, fillAlpha);
        ctx.fill();

        // Bordure (pointillée si suggestion IA non confirmée)
        if (isAiSuggestion) {
          ctx.setLineDash([6, 4]);
        } else {
          ctx.setLineDash([]);
        }

        if (isBlockedRoom) {
          ctx.strokeStyle = "#DC2626";
          ctx.lineWidth = 3;
        } else {
          ctx.strokeStyle = isSelected ? baseColor : hexToRgba(baseColor, strokeAlpha);
          ctx.lineWidth = isSelected ? 3 : 1.5;
        }
        ctx.stroke();
        ctx.setLineDash([]); // reset

        // Halo de sélection (bounding box du polygone)
        if (isSelected) {
          const { x, y, w, h } = toCanvasCoords(pos);
          ctx.strokeStyle = hexToRgba(baseColor, 0.3);
          ctx.lineWidth = 6;
          ctx.setLineDash([]);
          ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        }
      } else {
        // ─── Rendu rectangle (fallback) ────────────────────────
        const { x, y, w, h } = toCanvasCoords(pos);

        // Fill
        ctx.fillStyle = isBlockedRoom
          ? `rgba(220, 38, 38, ${fillAlpha})`
          : hexToRgba(baseColor, fillAlpha);
        ctx.fillRect(x, y, w, h);

        // Bordure (pointillée si suggestion IA non confirmée)
        if (isAiSuggestion) {
          ctx.setLineDash([6, 4]);
        } else {
          ctx.setLineDash([]);
        }

        if (isBlockedRoom) {
          ctx.strokeStyle = "#DC2626";
          ctx.lineWidth = 3;
        } else {
          ctx.strokeStyle = isSelected ? baseColor : hexToRgba(baseColor, strokeAlpha);
          ctx.lineWidth = isSelected ? 3 : 1.5;
        }
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]); // reset

        // Halo de sélection
        if (isSelected) {
          ctx.strokeStyle = hexToRgba(baseColor, 0.3);
          ctx.lineWidth = 6;
          ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        }
      }

      // ─── Label (centroïde polygone ou centre rectangle) ──────
      let centerX: number;
      let centerY: number;

      if (hasPolygon) {
        const centroid = polygonCentroid(room.polygon!);
        const { renderW, renderH, offsetX, offsetY } = renderLayout;
        centerX = (centroid.x_percent / 100) * renderW + offsetX;
        centerY = (centroid.y_percent / 100) * renderH + offsetY;
      } else {
        const { x, y, w, h } = toCanvasCoords(pos);
        centerX = x + w / 2;
        centerY = y + h / 2;
      }

      const label = room.name || getDropdownLabel(room.room_type);
      const surfaceText = room.surface_m2
        ? ` ${Number(room.surface_m2).toFixed(0)} m²`
        : "";

      ctx.font = "500 13px 'PP Neue Montreal', 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Fond du label pour lisibilité
      const textWidth = ctx.measureText(label + surfaceText).width;
      const padding = 6;
      ctx.fillStyle = isAiSuggestion
        ? "rgba(255, 255, 255, 0.65)"
        : "rgba(255, 255, 255, 0.85)";
      ctx.fillRect(
        centerX - textWidth / 2 - padding,
        centerY - 10,
        textWidth + padding * 2,
        20
      );

      ctx.fillStyle = isAiSuggestion ? "#6B7280" : "#0B0B0B";
      ctx.fillText(label + surfaceText, centerX, centerY);

      // ─── Badge "IA" pour suggestion non confirmée ────────────
      if (isAiSuggestion) {
        const badgeText = "IA";
        ctx.font = "600 9px 'PP Neue Montreal', 'DM Sans', sans-serif";
        const badgeW = ctx.measureText(badgeText).width + 8;
        const badgeH = 14;
        // Positionner en haut-gauche : pour polygone ou rectangle
        let badgeX: number;
        let badgeY: number;
        if (hasPolygon) {
          const canvasPts = toCanvasPolygonPoints(room.polygon!);
          badgeX = Math.min(...canvasPts.map((p) => p.x)) + 4;
          badgeY = Math.min(...canvasPts.map((p) => p.y)) + 4;
        } else {
          const { x, y } = toCanvasCoords(pos);
          badgeX = x + 4;
          badgeY = y + 4;
        }

        // Fond du badge
        ctx.fillStyle = "#F59E0B";
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
        ctx.fill();

        // Texte du badge
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
      }

      // Reset font/align pour la suite
      ctx.font = "500 13px 'PP Neue Montreal', 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // ─── Poignées de resize (toujours basées sur la bbox rectangle) ──
      if (isSelected) {
        const { x, y, w, h } = toCanvasCoords(pos);
        const handles = getHandlePositions(x, y, w, h);
        for (const handle of handles) {
          ctx.fillStyle = "#FFFFFF";
          ctx.strokeStyle = baseColor;
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
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
  }, [canvasSize, imageLoaded, lotZone, rooms, selectedRoomId, toCanvasCoords, toCanvasPolygonPoints, validationBlocked, renderLayout]);

  useEffect(() => {
    draw();
  }, [draw]);

  // ─── Identifier la piece sous le curseur ──────────────────────

  const getRoomAtPoint = useCallback(
    (clientX: number, clientY: number): VsRoom | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      // Parcourir les pieces en ordre inverse (la derniere dessinee est au-dessus)
      for (let i = rooms.length - 1; i >= 0; i--) {
        const room = rooms[i];
        const pos = getRoomPosition(room);
        if (!pos) continue;

        const hasPolygon = Array.isArray(room.polygon) && room.polygon.length >= 4;

        if (hasPolygon) {
          // Hit-test polygone : convertir le point canvas en coordonnées lot-local %
          const { xPct, yPct } = toPercentCoords(px, py);
          if (pointInPolygon(xPct, yPct, room.polygon!)) {
            return room;
          }
        } else {
          // Hit-test rectangle classique
          const { x, y, w, h } = toCanvasCoords(pos);
          if (px >= x && px <= x + w && py >= y && py <= y + h) {
            return room;
          }
        }
      }
      return null;
    },
    [rooms, toCanvasCoords, toPercentCoords]
  );

  // ─── Hit-test poignée resize ───────────────────────────────────

  const hitTestHandle = useCallback(
    (clientX: number, clientY: number, room: VsRoom): HandlePosition | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const pos = getRoomPosition(room);
      if (!pos) return null;

      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const { x, y, w, h } = toCanvasCoords(pos);

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
    },
    [toCanvasCoords]
  );

  // ─── Gestionnaires souris ─────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      // 1. Vérifier d'abord les poignées de resize sur la pièce sélectionnée
      if (selectedRoomId) {
        const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
        if (selectedRoom) {
          const handle = hitTestHandle(e.clientX, e.clientY, selectedRoom);
          if (handle) {
            const pos = getRoomPosition(selectedRoom);
            if (pos) {
              setDragging({
                type: "resize",
                roomId: selectedRoom.id,
                handle,
                startX: e.clientX,
                startY: e.clientY,
                origPos: { ...pos },
              });
              return;
            }
          }
        }
      }

      // 2. Sinon, sélection + drag classique
      const room = getRoomAtPoint(e.clientX, e.clientY);
      if (room) {
        onSelectRoom(room.id);
        const pos = getRoomPosition(room);
        if (pos) {
          setDragging({
            type: "move",
            roomId: room.id,
            startX: e.clientX,
            startY: e.clientY,
            origPos: { ...pos },
          });
        }
      } else {
        onSelectRoom(null);
      }
    },
    [getRoomAtPoint, hitTestHandle, onSelectRoom, rooms, selectedRoomId]
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      if (!dragging) {
        // Changer le curseur selon ce qui est sous le pointeur
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Vérifier les poignées de la pièce sélectionnée en premier
        if (selectedRoomId) {
          const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
          if (selectedRoom) {
            const handle = hitTestHandle(e.clientX, e.clientY, selectedRoom);
            if (handle) {
              canvas.style.cursor = getCursorForHandle(handle, false);
              return;
            }
          }
        }

        const room = getRoomAtPoint(e.clientX, e.clientY);
        canvas.style.cursor = getCursorForHandle(null, !!room);
        return;
      }

      const canvas = canvasRef.current;

      if (dragging.type === "resize" && dragging.handle) {
        // Mode resize
        if (canvas) {
          canvas.style.cursor = getCursorForHandle(dragging.handle, false);
        }

        const dx = e.clientX - dragging.startX;
        const dy = e.clientY - dragging.startY;
        // Fix versi-s22 : utiliser toDeltaPercent (pas toPercentCoords) pour les deltas
        const { dxPct, dyPct } = toDeltaPercent(dx, dy);

        const newPos = computeResize(dragging.origPos, dragging.handle, dxPct, dyPct);
        onMoveRoom(dragging.roomId, newPos);
      } else {
        // Mode déplacement
        if (canvas) {
          canvas.style.cursor = "grabbing";
        }

        const dx = e.clientX - dragging.startX;
        const dy = e.clientY - dragging.startY;
        // Fix versi-s22 : utiliser toDeltaPercent (pas toPercentCoords) pour les deltas
        const { dxPct, dyPct } = toDeltaPercent(dx, dy);

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
      }
    },
    [dragging, getRoomAtPoint, hitTestHandle, onMoveRoom, rooms, selectedRoomId, toDeltaPercent]
  );

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = "default";
      }
      setDragging(null);
    }
  }, [dragging]);

  // ─── Rendu ────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[200px] sm:min-h-[400px] bg-bg-canvas rounded-lg overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="touch-none sm:touch-auto"
        style={{ width: "100%", height: "100%" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        aria-label="Plan du lot avec les pièces identifiées"
        role="img"
      />

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
