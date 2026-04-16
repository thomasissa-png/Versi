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
  useState,
  type MouseEvent as ReactMouseEvent,
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

  // Drag state
  const [dragging, setDragging] = useState<{
    roomId: string;
    startX: number;
    startY: number;
    origPos: RoomPosition;
  } | null>(null);

  // ─── Charger l'image du plan ──────────────────────────────────

  useEffect(() => {
    if (!planImageUrl) {
      setImageLoaded(false);
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

  // ─── Convertir coordonnees lot-local en pixels canvas ─────────

  /**
   * Les positions des pieces sont en % RELATIF au lot (pas au plan global).
   * Le canvas affiche la zone du lot en plein ecran.
   */
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
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Fond
    ctx.fillStyle = "#F0EDE8";
    ctx.fillRect(0, 0, width, height);

    // Image du plan (zoom sur la zone du lot)
    if (imageRef.current && imageLoaded) {
      const img = imageRef.current;
      const sx = (lotZone.x_percent / 100) * img.naturalWidth;
      const sy = (lotZone.y_percent / 100) * img.naturalHeight;
      const sw = (lotZone.width_percent / 100) * img.naturalWidth;
      const sh = (lotZone.height_percent / 100) * img.naturalHeight;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
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

      // Fill avec transparence (rouge si validation bloquée — CORR-C3)
      ctx.fillStyle = isBlockedRoom
        ? "rgba(220, 38, 38, 0.5)"
        : hexToRgba(baseColor, 0.4);
      ctx.fillRect(x, y, w, h);

      // Bordure (rouge plus épaisse si bloqué)
      if (isBlockedRoom) {
        ctx.strokeStyle = "#DC2626";
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = isSelected ? baseColor : hexToRgba(baseColor, 0.7);
        ctx.lineWidth = isSelected ? 3 : 1.5;
      }
      ctx.strokeRect(x, y, w, h);

      // Halo de selection
      if (isSelected) {
        ctx.strokeStyle = hexToRgba(baseColor, 0.3);
        ctx.lineWidth = 6;
        ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
      }

      // Label de la piece
      const label = room.name || getDropdownLabel(room.room_type);
      const surfaceText = room.surface_m2
        ? ` ${Number(room.surface_m2).toFixed(0)} m²`
        : "";

      ctx.font = "500 13px 'PP Neue Montreal', 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const centerX = x + w / 2;
      const centerY = y + h / 2;

      // Fond du label pour lisibilite
      const textWidth = ctx.measureText(label + surfaceText).width;
      const padding = 6;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillRect(
        centerX - textWidth / 2 - padding,
        centerY - 10,
        textWidth + padding * 2,
        20
      );

      ctx.fillStyle = "#0B0B0B";
      ctx.fillText(label + surfaceText, centerX, centerY);
    }
  }, [canvasSize, imageLoaded, lotZone, rooms, selectedRoomId, toCanvasCoords, validationBlocked]);

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

        const { x, y, w, h } = toCanvasCoords(pos);
        if (px >= x && px <= x + w && py >= y && py <= y + h) {
          return room;
        }
      }
      return null;
    },
    [rooms, toCanvasCoords]
  );

  // ─── Gestionnaires souris ─────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const room = getRoomAtPoint(e.clientX, e.clientY);
      if (room) {
        onSelectRoom(room.id);
        const pos = getRoomPosition(room);
        if (pos) {
          setDragging({
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
    [getRoomAtPoint, onSelectRoom]
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      if (!dragging) {
        // Changer le curseur si on survole une piece
        const room = getRoomAtPoint(e.clientX, e.clientY);
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.style.cursor = room ? "grab" : "default";
        }
        return;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = "grabbing";
      }

      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;

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
    },
    [dragging, getRoomAtPoint, onMoveRoom, toPercentCoords]
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
      // JUSTIFIÉ: token bg-bg-canvas absent, à créer dans globals.css scope Alpha
      className="relative w-full h-full min-h-[200px] sm:min-h-[400px] bg-[#F0EDE8] rounded-lg overflow-hidden"
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
