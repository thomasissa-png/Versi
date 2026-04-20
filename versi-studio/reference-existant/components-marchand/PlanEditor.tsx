"use client";

/**
 * PlanEditor — Éditeur de plan interactif pour le parcours marchand.
 *
 * Rendu : Client Component (drag, resize, édition inline).
 *
 * Affiche le plan en image de fond avec des zones rectangulaires
 * semi-transparentes pour chaque pièce. Thomas peut :
 * - Déplacer les zones (drag mouse + touch)
 * - Redimensionner via 8 poignées (4 coins + 4 bords)
 * - Créer de nouvelles pièces
 * - Supprimer des pièces
 * - Éditer le nom (double-clic) et le type (select)
 * - Voir les surfaces recalculées en temps réel
 *
 * Pas de librairie externe — SVG natif + div positioned + React state.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ─── Types ──────────────────────────────────────────────────────────

export interface PlanRoom {
  id: string;
  name: string;
  roomType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  /** true = pièce ajoutée par Thomas (projet), false = pièce existante (extraite du plan) */
  isNew?: boolean;
}

/** Building outline in percentages (0-100) of the image */
export interface BuildingOutlineRect {
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

/** Polygon zone in percentages (0-100) of the image */
export interface ZonePolygon {
  points: Array<{ x_percent: number; y_percent: number }>;
}

/** Lot zone drawn on the plan — rectangle (legacy) or polygon */
export interface LotZone {
  id: string;        // lot id
  name: string;      // lot display name
  color: string;     // hex color
  zoneRect: BuildingOutlineRect | null;  // Legacy rectangle
  zonePolygon: ZonePolygon | null;       // New polygon (priority over zoneRect)
}

/** Photo direction marker on the plan — camera position + angle */
export interface PhotoMarker {
  roomId: string;
  roomName: string;
  x_percent: number;    // camera position X (0-100)
  y_percent: number;    // camera position Y (0-100)
  angle_deg: number;    // direction angle (0=right, 90=down)
}

interface PlanEditorProps {
  planImageUrl: string;
  rooms: PlanRoom[];
  onRoomsChange: (rooms: PlanRoom[]) => void;
  scaleFactor?: number;
  onScaleFactorChange?: (sf: number) => void;
  /** ID de la pièce survolée dans la liste — highlight visuel sur le plan */
  highlightedRoomId?: string | null;
  /** Callback quand une pièce est cliquée sur le plan (pour scroll-into-view dans la liste) */
  onRoomClick?: (roomId: string) => void;
  /** Building outline detected by AI — shown as dashed border, user can adjust */
  buildingOutline?: BuildingOutlineRect | null;
  /** Callback when user adjusts the building outline */
  onBuildingOutlineChange?: (outline: BuildingOutlineRect) => void;
  /** Lot zones drawn on the plan — colored rectangles per lot */
  lotZones?: LotZone[];
  /** Callback when a lot zone is drawn or adjusted */
  onLotZoneChange?: (lotId: string, rect: BuildingOutlineRect | null, polygon: ZonePolygon | null) => void;
  /** ID of lot currently being drawn (enables crosshair + draw mode) */
  drawingLotId?: string | null;
  /** Called when zone drawing is complete */
  onDrawingComplete?: () => void;
  /** Photo direction markers to display on the plan */
  photoMarkers?: PhotoMarker[];
  /** Callback when a photo direction is placed/changed (click to place, drag to set angle) */
  onPhotoDirectionChange?: (roomId: string, x_percent: number, y_percent: number, angle_deg: number) => void;
  /** Room ID whose photo direction is being placed */
  placingPhotoRoomId?: string | null;
  /** Called when photo placement is complete */
  onPhotoPlacementComplete?: () => void;
}

type HandlePosition = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface DragState {
  type: "move" | "resize";
  roomId: string;
  handle?: HandlePosition;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origWidth: number;
  origHeight: number;
}

/** Point for calibration line */
interface CalibrationPoint {
  x: number;
  y: number;
}

type ViewMode = "projet" | "actuel";

// ─── Constants ──────────────────────────────────────────────────────

const ROOM_COLORS: Record<string, string> = {
  salon: "rgba(125, 155, 118, 0.3)",
  sejour: "rgba(125, 155, 118, 0.3)",
  chambre: "rgba(100, 149, 237, 0.3)",
  chambre_parentale: "rgba(70, 130, 220, 0.3)",
  cuisine: "rgba(255, 165, 0, 0.3)",
  sdb: "rgba(0, 191, 255, 0.3)",
  wc: "rgba(168, 85, 247, 0.3)",
  bureau: "rgba(147, 112, 219, 0.3)",
  entree: "rgba(200, 180, 140, 0.3)",
  dressing: "rgba(180, 160, 200, 0.3)",
  cellier: "rgba(160, 180, 140, 0.3)",
  terrasse: "rgba(100, 200, 100, 0.3)",
  garage: "rgba(120, 120, 140, 0.3)",
  salle_a_manger: "rgba(230, 140, 80, 0.3)",
  couloir: "rgba(169, 169, 169, 0.3)",
  cave: "rgba(169, 169, 169, 0.3)",
  autre: "rgba(169, 169, 169, 0.3)",
};

/** Apply opacity to any color format (hex or rgba) */
function applyOpacityToColor(color: string, opacity: number): string {
  if (color.startsWith("rgba")) {
    return color.replace(/[\d.]+\)$/, `${opacity})`);
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${opacity})`);
  }
  // Hex color — convert to rgba
  const hex = color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const ROOM_BORDER_COLORS: Record<string, string> = {
  salon: "rgba(125, 155, 118, 0.8)",
  sejour: "rgba(125, 155, 118, 0.8)",
  chambre: "rgba(100, 149, 237, 0.8)",
  chambre_parentale: "rgba(70, 130, 220, 0.8)",
  cuisine: "rgba(255, 165, 0, 0.8)",
  sdb: "rgba(0, 191, 255, 0.8)",
  wc: "rgba(168, 85, 247, 0.8)",
  bureau: "rgba(147, 112, 219, 0.8)",
  entree: "rgba(200, 180, 140, 0.8)",
  dressing: "rgba(180, 160, 200, 0.8)",
  cellier: "rgba(160, 180, 140, 0.8)",
  terrasse: "rgba(100, 200, 100, 0.8)",
  garage: "rgba(120, 120, 140, 0.8)",
  salle_a_manger: "rgba(230, 140, 80, 0.8)",
  couloir: "rgba(169, 169, 169, 0.8)",
  cave: "rgba(169, 169, 169, 0.8)",
  autre: "rgba(169, 169, 169, 0.8)",
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  salon: "Salon",
  sejour: "Séjour",
  salle_a_manger: "Salle à manger",
  cuisine: "Cuisine",
  chambre: "Chambre",
  chambre_parentale: "Chambre parentale",
  sdb: "Salle de bain",
  wc: "WC",
  bureau: "Bureau",
  entree: "Entrée",
  dressing: "Dressing",
  cellier: "Cellier / Buanderie",
  terrasse: "Terrasse / Balcon",
  garage: "Garage",
  couloir: "Couloir",
  cave: "Cave",
  autre: "Autre",
};

const ROOM_TYPE_OPTIONS = Object.entries(ROOM_TYPE_LABELS);

const HANDLE_SIZE = 16; // taille visuelle de la poignée
const HANDLE_HIT_SIZE = 44; // zone de hit touch (WCAG 2.2 AA — 44×44px minimum)
const MIN_ROOM_SIZE = 40;
const SNAP_GRID = 10;
const SNAP_GUIDE_THRESHOLD = 8;
const UNDO_MAX_HISTORY = 20;

// ─── Building outline design tokens ──────────────────────────────────
const OUTLINE_COLOR = "#7D9B76"; // sage — cohérent palette Versimo
const OUTLINE_COLOR_DARK = "#5E7A57"; // sage foncé — contraste WCAG 4.5:1 sur blanc
const OUTLINE_BORDER = `2.5px dashed ${OUTLINE_COLOR}`;
const OUTLINE_SHADOW = `0 0 0 1px ${OUTLINE_COLOR}26`; // 15% opacity derived from OUTLINE_COLOR
const OUTLINE_HANDLE_BG = OUTLINE_COLOR;
const OUTLINE_HANDLE_BORDER = "2px solid white";
const OUTLINE_HANDLE_VISUAL_SIZE = 14;
const OUTLINE_LABEL_BG = "rgba(255,255,255,0.9)";
const OUTLINE_Z_VISUAL = 1; // under rooms
const ZONE_Z_VISUAL = 2;    // between outline and rooms
const ZONE_Z_HANDLES = 3;   // zone handles, below outline handles
const OUTLINE_Z_HANDLES = 4; // above rooms, below alignment guides (z-5)
const PHOTO_MARKER_Z = 22;  // above rooms, below calibration

// ─── Helpers ────────────────────────────────────────────────────────

function colorForType(roomType: string): string {
  return ROOM_COLORS[roomType] || ROOM_COLORS.autre;
}

function borderForType(roomType: string): string {
  return ROOM_BORDER_COLORS[roomType] || ROOM_BORDER_COLORS.autre;
}

/** Calcule la surface en m² à partir des dimensions en pixels et du scale factor */
function computeSurface(widthPx: number, heightPx: number, scaleFactor: number): string {
  const widthM = widthPx / scaleFactor;
  const heightM = heightPx / scaleFactor;
  return (widthM * heightM).toFixed(1);
}

/** Clamp une valeur entre min et max */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Snap une valeur sur la grille la plus proche */
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/** Distance entre deux points en pixels */
function distancePx(a: CalibrationPoint, b: CalibrationPoint): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/** Ray casting point-in-polygon test */
export function pointInPolygon(x: number, y: number, polygon: Array<{ x_percent: number; y_percent: number }>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x_percent, yi = polygon[i].y_percent;
    const xj = polygon[j].x_percent, yj = polygon[j].y_percent;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Compute polygon area in m² from percentage points + natural image size + scaleFactor (px/m) */
export function computePolygonAreaM2(
  points: Array<{ x_percent: number; y_percent: number }>,
  naturalWidth: number,
  naturalHeight: number,
  scaleFactor: number,
): number {
  // Convert % points to metres
  const metrePoints = points.map((p) => ({
    x: (p.x_percent / 100) * naturalWidth / scaleFactor,
    y: (p.y_percent / 100) * naturalHeight / scaleFactor,
  }));
  // Shoelace formula
  let area = 0;
  const n = metrePoints.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += metrePoints[i].x * metrePoints[j].y;
    area -= metrePoints[j].x * metrePoints[i].y;
  }
  return Math.abs(area) / 2;
}

/** Compute segment length in metres between two % points (exported for sidebar use) */
export function computeSegmentLengthM(
  p1: { x_percent: number; y_percent: number },
  p2: { x_percent: number; y_percent: number },
  naturalWidth: number,
  naturalHeight: number,
  scaleFactor: number,
): number {
  const dx = ((p2.x_percent - p1.x_percent) / 100) * naturalWidth / scaleFactor;
  const dy = ((p2.y_percent - p1.y_percent) / 100) * naturalHeight / scaleFactor;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Compute centroid of a polygon (in percentage coords) */
function polygonCentroid(points: Array<{ x_percent: number; y_percent: number }>): { x: number; y: number } {
  let cx = 0, cy = 0;
  for (const p of points) { cx += p.x_percent; cy += p.y_percent; }
  return { x: cx / points.length, y: cy / points.length };
}

/** Compute bounding box of a polygon */
function polygonBBox(points: Array<{ x_percent: number; y_percent: number }>): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x_percent < minX) minX = p.x_percent;
    if (p.y_percent < minY) minY = p.y_percent;
    if (p.x_percent > maxX) maxX = p.x_percent;
    if (p.y_percent > maxY) maxY = p.y_percent;
  }
  return { minX, minY, maxX, maxY };
}

/** Trouve les guides d'alignement : bords d'une room qui s'alignent avec les bords des autres rooms */
function findAlignmentGuides(
  movingRoom: PlanRoom,
  otherRooms: PlanRoom[],
  threshold: number
): { horizontal: number[]; vertical: number[] } {
  const horizontal: number[] = [];
  const vertical: number[] = [];

  const movingEdges = {
    left: movingRoom.x,
    right: movingRoom.x + movingRoom.width,
    top: movingRoom.y,
    bottom: movingRoom.y + movingRoom.height,
    centerX: movingRoom.x + movingRoom.width / 2,
    centerY: movingRoom.y + movingRoom.height / 2,
  };

  for (const other of otherRooms) {
    const otherEdges = {
      left: other.x,
      right: other.x + other.width,
      top: other.y,
      bottom: other.y + other.height,
      centerX: other.x + other.width / 2,
      centerY: other.y + other.height / 2,
    };

    // Vertical guides (x-axis alignment)
    for (const mEdge of [movingEdges.left, movingEdges.right, movingEdges.centerX]) {
      for (const oEdge of [otherEdges.left, otherEdges.right, otherEdges.centerX]) {
        if (Math.abs(mEdge - oEdge) < threshold) {
          vertical.push(oEdge);
        }
      }
    }

    // Horizontal guides (y-axis alignment)
    for (const mEdge of [movingEdges.top, movingEdges.bottom, movingEdges.centerY]) {
      for (const oEdge of [otherEdges.top, otherEdges.bottom, otherEdges.centerY]) {
        if (Math.abs(mEdge - oEdge) < threshold) {
          horizontal.push(oEdge);
        }
      }
    }
  }

  // Deduplicate
  return {
    horizontal: horizontal.filter((v, i, a) => a.indexOf(v) === i),
    vertical: vertical.filter((v, i, a) => a.indexOf(v) === i),
  };
}

// ─── Component ──────────────────────────────────────────────────────

export default function PlanEditor({
  planImageUrl,
  rooms,
  onRoomsChange,
  scaleFactor = 50,
  onScaleFactorChange,
  highlightedRoomId,
  onRoomClick,
  buildingOutline,
  onBuildingOutlineChange,
  lotZones,
  onLotZoneChange,
  drawingLotId,
  onDrawingComplete,
  photoMarkers,
  onPhotoDirectionChange,
  placingPhotoRoomId,
  onPhotoPlacementComplete,
}: PlanEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const justDraggedRef = useRef(false);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  // Multi-selection for fusion (Shift+click or long-press second room)
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  // Pending delete confirmation (UX C1)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Toolbar collapse — advanced options hidden by default (UX C3)
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  // Mobile fusion mode — "Fusionner avec..." tap flow (Moi)
  const [fusionMode, setFusionMode] = useState(false);
  // Zoom level (Moi) + scroll-wheel zoom
  const [zoomLevel, setZoomLevel] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Help collapsed by default (UX C5)
  const [helpExpanded, setHelpExpanded] = useState(false);
  // Long-press timer for touch rename
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track the natural image dimensions to compute the displayed scale
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  // P1 — Cleanup long-press timer on unmount (QA B6)
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
  }, []);

  // ─── Undo / Redo (rooms + outline) ──────────────────────────────
  type UndoSnapshot = { rooms: PlanRoom[]; outline: BuildingOutlineRect | null };
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<UndoSnapshot[]>([]);
  const skipSnapshotRef = useRef(false);

  // Refs to always capture latest state for undo snapshots (avoids stale closure)
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;
  const outlineRef = useRef(buildingOutline ?? null);
  outlineRef.current = buildingOutline ?? null;

  /** Push current rooms+outline state onto undo stack before a mutation */
  const pushUndo = useCallback(() => {
    setUndoStack((prev) => {
      const next = [...prev, { rooms: roomsRef.current, outline: outlineRef.current }];
      if (next.length > UNDO_MAX_HISTORY) next.shift();
      return next;
    });
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, { rooms, outline: buildingOutline ?? null }]);
    skipSnapshotRef.current = true;
    onRoomsChange(prev.rooms);
    if (onBuildingOutlineChange && prev.outline) {
      onBuildingOutlineChange(prev.outline);
    }
  }, [undoStack, rooms, buildingOutline, onRoomsChange, onBuildingOutlineChange]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, { rooms, outline: buildingOutline ?? null }]);
    skipSnapshotRef.current = true;
    onRoomsChange(next.rooms);
    if (onBuildingOutlineChange && next.outline) {
      onBuildingOutlineChange(next.outline);
    }
  }, [redoStack, rooms, buildingOutline, onRoomsChange, onBuildingOutlineChange]);

  // ─── Calibration ────────────────────────────────────────────────
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationPointA, setCalibrationPointA] = useState<CalibrationPoint | null>(null);
  const [calibrationPointB, setCalibrationPointB] = useState<CalibrationPoint | null>(null);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [calibrationInput, setCalibrationInput] = useState("");
  const [isCalibrated, setIsCalibrated] = useState(false);

  // ─── View mode toggle ──────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("projet");

  // ─── Alignment guides ──────────────────────────────────────────
  const [alignmentGuides, setAlignmentGuides] = useState<{ horizontal: number[]; vertical: number[] }>({ horizontal: [], vertical: [] });

  // ─── Zone drawing state (polygon mode) ─────────────────────────
  const [zoneDrawPoints, setZoneDrawPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [zoneDrawCursor, setZoneDrawCursor] = useState<{ x: number; y: number } | null>(null);
  const isDrawingZone = drawingLotId != null;

  // Photo direction placement state
  const [photoPlaceStart, setPhotoPlaceStart] = useState<{ x: number; y: number } | null>(null);
  const [photoPlaceCurrent, setPhotoPlaceCurrent] = useState<{ x: number; y: number } | null>(null);
  const isPlacingPhoto = placingPhotoRoomId != null;

  // ─── Image load ─────────────────────────────────────────────────

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize({ width: img.clientWidth, height: img.clientHeight });
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
  }, []);

  // Recalc on window resize
  useEffect(() => {
    function handleResize() {
      const img = containerRef.current?.querySelector("img");
      if (img) {
        setImgSize({ width: img.clientWidth, height: img.clientHeight });
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // The ratio between displayed size and natural size — rooms are positioned in natural coords
  const displayScale = useMemo(() => {
    if (!imgSize || !naturalSize) return 1;
    return imgSize.width / naturalSize.width;
  }, [imgSize, naturalSize]);

  // ─── Keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z) ─────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // ─── Pointer helpers ──────────────────────────────────────────────

  /** Get cursor position relative to the image container */
  const getRelativePos = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      // Return position in natural image coordinates
      return {
        x: (clientX - rect.left) / displayScale,
        y: (clientY - rect.top) / displayScale,
      };
    },
    [displayScale]
  );

  // ─── Drag / Resize logic ─────────────────────────────────────────

  const handlePointerDown = useCallback(
    (
      e: React.MouseEvent | React.TouchEvent,
      roomId: string,
      type: "move" | "resize",
      handle?: HandlePosition
    ) => {
      e.preventDefault();
      e.stopPropagation();

      // If calibrating, ignore room drag
      if (isCalibrating) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const pos = getRelativePos(clientX, clientY);

      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;

      // Push undo snapshot before drag starts
      pushUndo();

      setSelectedRoomId(roomId);
      setDragState({
        type,
        roomId,
        handle,
        startX: pos.x,
        startY: pos.y,
        origX: room.x,
        origY: room.y,
        origWidth: room.width,
        origHeight: room.height,
      });
    },
    [rooms, getRelativePos, isCalibrating, pushUndo]
  );

  // rAF throttle to avoid excessive re-renders during drag (QA B5)
  const rafRef = useRef<number | null>(null);

  const handlePointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragState || !naturalSize) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      // Cancel previous frame if not yet rendered
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const pos = getRelativePos(clientX, clientY);

      const dx = pos.x - dragState.startX;
      const dy = pos.y - dragState.startY;

      const maxW = naturalSize.width;
      const maxH = naturalSize.height;

      // ─── Building outline constraint ──────────────────────────
      // When a building outline exists, constrain room positions to it.
      // This prevents rooms from being placed outside the building.
      const outline = outlineRef.current;
      let minX = 0, minY = 0, limW = maxW, limH = maxH;
      if (outline) {
        minX = (outline.x_percent / 100) * maxW;
        minY = (outline.y_percent / 100) * maxH;
        limW = minX + (outline.width_percent / 100) * maxW;
        limH = minY + (outline.height_percent / 100) * maxH;
      }

      let updated: Partial<PlanRoom>;

      if (dragState.type === "move") {
        const rawX = clamp(dragState.origX + dx, minX, limW - dragState.origWidth);
        const rawY = clamp(dragState.origY + dy, minY, limH - dragState.origHeight);
        updated = {
          x: snapToGrid(rawX, SNAP_GRID),
          y: snapToGrid(rawY, SNAP_GRID),
        };
      } else {
        // Resize from handle
        let newX = dragState.origX;
        let newY = dragState.origY;
        let newW = dragState.origWidth;
        let newH = dragState.origHeight;

        // Use building outline as resize boundary when available
        const resMinX = minX;
        const resMinY = minY;
        const resMaxW = limW;
        const resMaxH = limH;

        switch (dragState.handle) {
          case "se":
            newW = clamp(dragState.origWidth + dx, MIN_ROOM_SIZE, resMaxW - dragState.origX);
            newH = clamp(dragState.origHeight + dy, MIN_ROOM_SIZE, resMaxH - dragState.origY);
            break;
          case "sw":
            newW = clamp(dragState.origWidth - dx, MIN_ROOM_SIZE, dragState.origX + dragState.origWidth - resMinX);
            newH = clamp(dragState.origHeight + dy, MIN_ROOM_SIZE, resMaxH - dragState.origY);
            newX = dragState.origX + dragState.origWidth - newW;
            break;
          case "ne":
            newW = clamp(dragState.origWidth + dx, MIN_ROOM_SIZE, resMaxW - dragState.origX);
            newH = clamp(dragState.origHeight - dy, MIN_ROOM_SIZE, dragState.origY + dragState.origHeight - resMinY);
            newY = dragState.origY + dragState.origHeight - newH;
            break;
          case "nw":
            newW = clamp(dragState.origWidth - dx, MIN_ROOM_SIZE, dragState.origX + dragState.origWidth - resMinX);
            newH = clamp(dragState.origHeight - dy, MIN_ROOM_SIZE, dragState.origY + dragState.origHeight - resMinY);
            newX = dragState.origX + dragState.origWidth - newW;
            newY = dragState.origY + dragState.origHeight - newH;
            break;
          case "n":
            newH = clamp(dragState.origHeight - dy, MIN_ROOM_SIZE, dragState.origY + dragState.origHeight - resMinY);
            newY = dragState.origY + dragState.origHeight - newH;
            break;
          case "s":
            newH = clamp(dragState.origHeight + dy, MIN_ROOM_SIZE, resMaxH - dragState.origY);
            break;
          case "e":
            newW = clamp(dragState.origWidth + dx, MIN_ROOM_SIZE, resMaxW - dragState.origX);
            break;
          case "w":
            newW = clamp(dragState.origWidth - dx, MIN_ROOM_SIZE, dragState.origX + dragState.origWidth - resMinX);
            newX = dragState.origX + dragState.origWidth - newW;
            break;
        }

        updated = {
          x: snapToGrid(newX, SNAP_GRID),
          y: snapToGrid(newY, SNAP_GRID),
          width: snapToGrid(newW, SNAP_GRID),
          height: snapToGrid(newH, SNAP_GRID),
        };
      }

      // Compute alignment guides for visual feedback
      const movingRoom: PlanRoom = {
        ...rooms.find((r) => r.id === dragState.roomId)!,
        ...updated,
      };
      const otherRooms = rooms.filter((r) => r.id !== dragState.roomId);
      setAlignmentGuides(findAlignmentGuides(movingRoom, otherRooms, SNAP_GUIDE_THRESHOLD));

      onRoomsChange(
        rooms.map((r) => (r.id === dragState.roomId ? { ...r, ...updated } : r))
      );
      }); // end requestAnimationFrame
    },
    [dragState, rooms, onRoomsChange, naturalSize, getRelativePos]
  );

  const handlePointerUp = useCallback(() => {
    if (dragState) {
      // Mark that we just finished a drag — prevent onClick from firing onRoomClick
      justDraggedRef.current = true;
      requestAnimationFrame(() => { justDraggedRef.current = false; });
    }
    setDragState(null);
    setAlignmentGuides({ horizontal: [], vertical: [] });
  }, [dragState]);

  // Global listeners for drag
  useEffect(() => {
    if (!dragState) return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      handlePointerMove(e);
    };
    const onUp = () => handlePointerUp();

    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragState, handlePointerMove, handlePointerUp]);

  // ─── Scroll-wheel zoom (Ctrl+wheel or trackpad pinch) ────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    function handleWheel(e: WheelEvent) {
      // Only zoom on Ctrl+wheel (trackpad pinch sends ctrlKey=true)
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel((z) => Math.max(0.5, Math.min(3, Math.round((z + delta) * 100) / 100)));
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // ─── Room actions ─────────────────────────────────────────────────

  const addNewRoom = useCallback(() => {
    if (!naturalSize) return;
    pushUndo();

    const id = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    // Place near last selected room if possible, otherwise center. Size = 15% of plan.
    // Constrain to building outline when available.
    const outline = outlineRef.current;
    const oMinX = outline ? (outline.x_percent / 100) * naturalSize.width : 0;
    const oMinY = outline ? (outline.y_percent / 100) * naturalSize.height : 0;
    const oMaxX = outline ? oMinX + (outline.width_percent / 100) * naturalSize.width : naturalSize.width;
    const oMaxY = outline ? oMinY + (outline.height_percent / 100) * naturalSize.height : naturalSize.height;

    const roomW = Math.round(Math.min(naturalSize.width * 0.15, oMaxX - oMinX));
    const roomH = Math.round(Math.min(naturalSize.height * 0.15, oMaxY - oMinY));

    const lastSelected = rooms.find((r) => r.id === selectedRoomId);
    const baseX = lastSelected ? lastSelected.x + lastSelected.width + 20 : (oMinX + oMaxX) / 2 - roomW / 2;
    const baseY = lastSelected ? lastSelected.y : (oMinY + oMaxY) / 2 - roomH / 2;
    const newRoom: PlanRoom = {
      id,
      name: "Nouvelle pièce",
      roomType: "autre",
      x: Math.round(clamp(baseX, oMinX, oMaxX - roomW)),
      y: Math.round(clamp(baseY, oMinY, oMaxY - roomH)),
      width: roomW,
      height: roomH,
      color: colorForType("autre"),
      isNew: true,
    };

    onRoomsChange([...rooms, newRoom]);
    setSelectedRoomId(id);
    setSelectedRoomIds(new Set([id]));
    // Auto-edit the name
    setTimeout(() => setEditingNameId(id), 100);
  }, [rooms, onRoomsChange, naturalSize, selectedRoomId, pushUndo]);

  /** Fusionner les pièces sélectionnées en une seule (bounding box englobante) */
  const mergeSelectedRooms = useCallback(() => {
    if (selectedRoomIds.size < 2) return;
    pushUndo();
    const selected = rooms.filter((r) => selectedRoomIds.has(r.id));
    if (selected.length < 2) return;

    // Compute bounding box
    const minX = Math.min(...selected.map((r) => r.x));
    const minY = Math.min(...selected.map((r) => r.y));
    const maxX = Math.max(...selected.map((r) => r.x + r.width));
    const maxY = Math.max(...selected.map((r) => r.y + r.height));

    // Use the name and type of the largest room
    const largest = selected.reduce((a, b) => (a.width * a.height > b.width * b.height ? a : b));

    const id = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const merged: PlanRoom = {
      id,
      name: largest.name,
      roomType: largest.roomType,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      color: colorForType(largest.roomType),
      isNew: true,
    };

    const remaining = rooms.filter((r) => !selectedRoomIds.has(r.id));
    onRoomsChange([...remaining, merged]);
    setSelectedRoomId(id);
    setSelectedRoomIds(new Set([id]));
    setTimeout(() => setEditingNameId(id), 100);
  }, [rooms, onRoomsChange, selectedRoomIds, pushUndo]);

  /** P1 — Request delete shows confirmation inline (UX C1) */
  const requestDelete = useCallback((roomId: string) => {
    setPendingDeleteId(roomId);
  }, []);

  /** P1 — Confirm delete after user approval */
  const confirmDelete = useCallback(
    (roomId: string) => {
      pushUndo();
      onRoomsChange(rooms.filter((r) => r.id !== roomId));
      if (selectedRoomId === roomId) setSelectedRoomId(null);
      setSelectedRoomIds((prev) => {
        const next = new Set(prev);
        next.delete(roomId);
        return next;
      });
      setPendingDeleteId(null);
    },
    [rooms, onRoomsChange, selectedRoomId, pushUndo]
  );

  const cancelDelete = useCallback(() => {
    setPendingDeleteId(null);
  }, []);

  const updateRoomName = useCallback(
    (roomId: string, name: string) => {
      onRoomsChange(rooms.map((r) => (r.id === roomId ? { ...r, name } : r)));
    },
    [rooms, onRoomsChange]
  );

  /** Push undo snapshot when rename is committed (on blur or Enter).
   *  P1 — If the name is empty/whitespace, restore the previous name (QA B3). */
  const commitRoomName = useCallback(
    (roomId: string, previousName: string) => {
      const room = rooms.find((r) => r.id === roomId);
      if (room && (!room.name || !room.name.trim())) {
        // Restore old name — do NOT push undo for a no-op
        onRoomsChange(rooms.map((r) => (r.id === roomId ? { ...r, name: previousName || "Sans nom" } : r)));
      } else {
        pushUndo();
      }
      setEditingNameId(null);
    },
    [rooms, onRoomsChange, pushUndo]
  );
  // Track the name at edit start for rollback on empty
  const editNameBeforeRef = useRef<string>("");

  const updateRoomType = useCallback(
    (roomId: string, roomType: string) => {
      pushUndo();
      onRoomsChange(
        rooms.map((r) =>
          r.id === roomId ? { ...r, roomType, color: colorForType(roomType) } : r
        )
      );
      setEditingTypeId(null);
    },
    [rooms, onRoomsChange, pushUndo]
  );

  // ─── Calibration click logic ──────────────────────────────────────
  const handleCalibrationClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isCalibrating) return;
      e.stopPropagation();

      const pos = getRelativePos(e.clientX, e.clientY);
      const point: CalibrationPoint = { x: pos.x, y: pos.y };

      if (!calibrationPointA) {
        setCalibrationPointA(point);
      } else if (!calibrationPointB) {
        setCalibrationPointB(point);
        setShowCalibrationModal(true);
      }
    },
    [isCalibrating, calibrationPointA, calibrationPointB, getRelativePos]
  );

  const confirmCalibration = useCallback(() => {
    if (!calibrationPointA || !calibrationPointB) return;
    const distMetres = parseFloat(calibrationInput);
    if (!distMetres || distMetres <= 0) return;

    const distPx = distancePx(calibrationPointA, calibrationPointB);
    // P0 — Guard against div/0 when both points are (nearly) the same pixel
    if (distPx < 1) return;
    const newScaleFactor = distPx / distMetres;

    if (onScaleFactorChange) {
      onScaleFactorChange(newScaleFactor);
    }

    setIsCalibrated(true);
    setIsCalibrating(false);
    setCalibrationPointA(null);
    setCalibrationPointB(null);
    setShowCalibrationModal(false);
    setCalibrationInput("");
  }, [calibrationPointA, calibrationPointB, calibrationInput, onScaleFactorChange]);

  const cancelCalibration = useCallback(() => {
    setIsCalibrating(false);
    setCalibrationPointA(null);
    setCalibrationPointB(null);
    setShowCalibrationModal(false);
    setCalibrationInput("");
  }, []);

  // Deselect when clicking the background
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Zone drawing / photo placement mode — don't deselect on click (mousedown/up handles it)
      if (isDrawingZone || isPlacingPhoto) return;
      if (isCalibrating) {
        handleCalibrationClick(e);
        return;
      }
      setSelectedRoomId(null);
      setSelectedRoomIds(new Set());
      setEditingNameId(null);
      setEditingTypeId(null);
    },
    [isCalibrating, isDrawingZone, isPlacingPhoto, handleCalibrationClick]
  );

  // ─── Zone drawing handlers (polygon mode) ─────────────────────────

  /** Convert mouse/touch clientX/clientY to percent coordinates on the image */
  const clientToPercent = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!imgSize) return { x: 0, y: 0 };
      const pos = getRelativePos(clientX, clientY);
      return {
        x: clamp((pos.x / (imgSize.width / displayScale)) * 100, 0, 100),
        y: clamp((pos.y / (imgSize.height / displayScale)) * 100, 0, 100),
      };
    },
    [imgSize, getRelativePos, displayScale]
  );

  /** Distance between two percent-space points (used for close-polygon detection) */
  const pctDistancePx = useCallback(
    (a: { x: number; y: number }, b: { x: number; y: number }): number => {
      if (!imgSize) return Infinity;
      const dx = ((a.x - b.x) / 100) * imgSize.width;
      const dy = ((a.y - b.y) / 100) * imgSize.height;
      return Math.sqrt(dx * dx + dy * dy);
    },
    [imgSize]
  );

  const CLOSE_POLYGON_THRESHOLD_PX = 16; // snap-close distance in display pixels

  /** Handle click to add a point or close the polygon */
  const handleZoneDrawClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawingZone || !imgSize) return;
      e.preventDefault();
      e.stopPropagation();
      const pt = clientToPercent(e.clientX, e.clientY);

      // If we already have >= 3 points and click near the first point, close the polygon
      if (zoneDrawPoints.length >= 3) {
        const first = zoneDrawPoints[0];
        if (pctDistancePx(pt, first) < CLOSE_POLYGON_THRESHOLD_PX) {
          // Close polygon
          if (drawingLotId && onLotZoneChange) {
            const polygon: ZonePolygon = {
              points: zoneDrawPoints.map((p) => ({ x_percent: p.x, y_percent: p.y })),
            };
            onLotZoneChange(drawingLotId, null, polygon);
          }
          setZoneDrawPoints([]);
          setZoneDrawCursor(null);
          onDrawingComplete?.();
          return;
        }
      }

      // Add point
      setZoneDrawPoints((prev) => [...prev, pt]);
    },
    [isDrawingZone, imgSize, clientToPercent, zoneDrawPoints, pctDistancePx, drawingLotId, onLotZoneChange, onDrawingComplete]
  );

  /** Handle double-click to close the polygon */
  const handleZoneDrawDblClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawingZone || zoneDrawPoints.length < 3) return;
      e.preventDefault();
      e.stopPropagation();

      if (drawingLotId && onLotZoneChange) {
        const polygon: ZonePolygon = {
          points: zoneDrawPoints.map((p) => ({ x_percent: p.x, y_percent: p.y })),
        };
        onLotZoneChange(drawingLotId, null, polygon);
      }
      setZoneDrawPoints([]);
      setZoneDrawCursor(null);
      onDrawingComplete?.();
    },
    [isDrawingZone, zoneDrawPoints, drawingLotId, onLotZoneChange, onDrawingComplete]
  );

  /** Handle mouse move to update the cursor preview line */
  const handleZoneDrawMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawingZone || !imgSize) return;
      const pt = clientToPercent(e.clientX, e.clientY);
      setZoneDrawCursor(pt);
    },
    [isDrawingZone, imgSize, clientToPercent]
  );

  /** Escape key cancels polygon drawing */
  useEffect(() => {
    if (!isDrawingZone) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setZoneDrawPoints([]);
        setZoneDrawCursor(null);
        onDrawingComplete?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawingZone, onDrawingComplete]);

  // Zone drag handlers (for existing zones — supports both rect and polygon)
  const handleZoneDragStart = useCallback(
    (lotId: string, type: "move" | "resize", clientX: number, clientY: number, vertexIndex?: number) => {
      const zone = lotZones?.find((z) => z.id === lotId);
      if (!onLotZoneChange || !imgSize) return;

      const hasPolygon = zone?.zonePolygon && zone.zonePolygon.points.length >= 3;
      const hasRect = zone?.zoneRect;
      if (!hasPolygon && !hasRect) return;

      if (hasPolygon) {
        // Polygon drag: move entire polygon or drag a single vertex
        const origPoints = zone!.zonePolygon!.points.map((p) => ({ ...p }));
        const startX = clientX;
        const startY = clientY;

        const handleMouseMove = (e: MouseEvent | TouchEvent) => {
          const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
          const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
          const dxPct = ((cx - startX) / imgSize.width) * 100;
          const dyPct = ((cy - startY) / imgSize.height) * 100;

          if (type === "move") {
            // Translate all points
            const newPoints = origPoints.map((p) => ({
              x_percent: clamp(p.x_percent + dxPct, 0, 100),
              y_percent: clamp(p.y_percent + dyPct, 0, 100),
            }));
            onLotZoneChange(lotId, null, { points: newPoints });
          } else if (type === "resize" && vertexIndex !== undefined) {
            // Move single vertex
            const newPoints = origPoints.map((p, i) => {
              if (i === vertexIndex) {
                return {
                  x_percent: clamp(p.x_percent + dxPct, 0, 100),
                  y_percent: clamp(p.y_percent + dyPct, 0, 100),
                };
              }
              return { ...p };
            });
            onLotZoneChange(lotId, null, { points: newPoints });
          }
        };

        const handleMouseUp = () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
          document.removeEventListener("touchmove", handleMouseMove);
          document.removeEventListener("touchend", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        document.addEventListener("touchmove", handleMouseMove, { passive: false });
        document.addEventListener("touchend", handleMouseUp);
      } else if (hasRect) {
        // Legacy rectangle drag/resize (backward compat)
        const origRect = { ...zone!.zoneRect! };
        const startX = clientX;
        const startY = clientY;

        const handleMouseMove = (e: MouseEvent | TouchEvent) => {
          const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
          const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
          const dxPct = ((cx - startX) / imgSize.width) * 100;
          const dyPct = ((cy - startY) / imgSize.height) * 100;

          if (type === "move") {
            const newX = clamp(origRect.x_percent + dxPct, 0, 100 - origRect.width_percent);
            const newY = clamp(origRect.y_percent + dyPct, 0, 100 - origRect.height_percent);
            onLotZoneChange(lotId, { ...origRect, x_percent: newX, y_percent: newY }, null);
          }
        };

        const handleMouseUp = () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
          document.removeEventListener("touchmove", handleMouseMove);
          document.removeEventListener("touchend", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        document.addEventListener("touchmove", handleMouseMove, { passive: false });
        document.addEventListener("touchend", handleMouseUp);
      }
    },
    [lotZones, onLotZoneChange, imgSize]
  );

  // ─── Photo direction placement handlers ────────────────────────────

  const handlePhotoPlaceStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPlacingPhoto || !imgSize) return;
      e.preventDefault();
      e.stopPropagation();
      const pos = getRelativePos(e.clientX, e.clientY);
      const xPct = (pos.x / (imgSize.width / displayScale)) * 100;
      const yPct = (pos.y / (imgSize.height / displayScale)) * 100;
      setPhotoPlaceStart({ x: clamp(xPct, 0, 100), y: clamp(yPct, 0, 100) });
      setPhotoPlaceCurrent({ x: clamp(xPct, 0, 100), y: clamp(yPct, 0, 100) });
    },
    [isPlacingPhoto, imgSize, getRelativePos, displayScale]
  );

  const handlePhotoPlaceMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!photoPlaceStart || !imgSize) return;
      e.preventDefault();
      const pos = getRelativePos(e.clientX, e.clientY);
      const xPct = clamp((pos.x / (imgSize.width / displayScale)) * 100, 0, 100);
      const yPct = clamp((pos.y / (imgSize.height / displayScale)) * 100, 0, 100);
      setPhotoPlaceCurrent({ x: xPct, y: yPct });
    },
    [photoPlaceStart, imgSize, getRelativePos, displayScale]
  );

  const handlePhotoPlaceEnd = useCallback(() => {
    if (!photoPlaceStart || !photoPlaceCurrent || !placingPhotoRoomId || !onPhotoDirectionChange) {
      setPhotoPlaceStart(null);
      setPhotoPlaceCurrent(null);
      return;
    }
    const dx = photoPlaceCurrent.x - photoPlaceStart.x;
    const dy = photoPlaceCurrent.y - photoPlaceStart.y;
    // Calculate angle from drag direction (0 = right, 90 = down)
    const angleDeg = Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5
      ? 0  // Default direction (right) if user just clicked without dragging
      : ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;

    onPhotoDirectionChange(
      placingPhotoRoomId,
      photoPlaceStart.x,
      photoPlaceStart.y,
      Math.round(angleDeg)
    );
    setPhotoPlaceStart(null);
    setPhotoPlaceCurrent(null);
    onPhotoPlacementComplete?.();
  }, [photoPlaceStart, photoPlaceCurrent, placingPhotoRoomId, onPhotoDirectionChange, onPhotoPlacementComplete]);

  // ─── Building outline resize ──────────────────────────────────────
  const outlineResizeRef = useRef<{
    corner: "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    origOutline: BuildingOutlineRect;
  } | null>(null);

  const handleOutlineResizeStart = useCallback(
    (corner: "nw" | "ne" | "sw" | "se", clientX: number, clientY: number) => {
      if (!buildingOutline || !onBuildingOutlineChange) return;
      pushUndo(); // Snapshot before outline resize for undo support
      outlineResizeRef.current = {
        corner,
        startX: clientX,
        startY: clientY,
        origOutline: { ...buildingOutline },
      };

      const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        const ref = outlineResizeRef.current;
        if (!ref || !imgSize) return;
        const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
        const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
        const dxPct = ((cx - ref.startX) / imgSize.width) * 100;
        const dyPct = ((cy - ref.startY) / imgSize.height) * 100;
        const o = ref.origOutline;
        let newX = o.x_percent;
        let newY = o.y_percent;
        let newW = o.width_percent;
        let newH = o.height_percent;

        if (ref.corner.includes("w")) {
          newX = Math.max(0, Math.min(o.x_percent + dxPct, o.x_percent + o.width_percent - 5));
          newW = o.width_percent - (newX - o.x_percent);
        } else {
          newW = Math.max(5, Math.min(o.width_percent + dxPct, 100 - o.x_percent));
        }
        if (ref.corner.includes("n")) {
          newY = Math.max(0, Math.min(o.y_percent + dyPct, o.y_percent + o.height_percent - 5));
          newH = o.height_percent - (newY - o.y_percent);
        } else {
          newH = Math.max(5, Math.min(o.height_percent + dyPct, 100 - o.y_percent));
        }

        onBuildingOutlineChange({
          x_percent: Math.round(newX * 10) / 10,
          y_percent: Math.round(newY * 10) / 10,
          width_percent: Math.round(newW * 10) / 10,
          height_percent: Math.round(newH * 10) / 10,
        });
      };

      const handleMouseUp = () => {
        outlineResizeRef.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleMouseMove);
        window.removeEventListener("touchend", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleMouseMove, { passive: false });
      window.addEventListener("touchend", handleMouseUp);
    },
    [buildingOutline, onBuildingOutlineChange, imgSize, pushUndo]
  );

  // ─── Render ───────────────────────────────────────────────────────

  const isReady = imgSize && naturalSize;

  // Filter rooms based on view mode
  const visibleRooms = viewMode === "actuel" ? rooms.filter((r) => !r.isNew) : rooms;

  // Count existing vs new rooms
  const existingCount = rooms.filter((r) => !r.isNew).length;
  const newCount = rooms.filter((r) => r.isNew).length;
  const canMerge = selectedRoomIds.size >= 2;

  // Scale indicator text
  const scaleIndicatorText = isCalibrated
    ? `1 m = ${scaleFactor.toFixed(0)} px`
    : null;

  return (
    <div className="space-y-3">
      {/* P2 — Help text collapsible (UX C5) — single line + expand */}
      <div className="p-3 rounded-lg bg-[#7D9B76]/10 border border-[#7D9B76]/20 text-[13px] text-[#7D9B76] leading-relaxed">
        <p>
          Déplacez les pièces, redimensionnez-les, ou ajoutez-en de nouvelles.{" "}
          <button
            type="button"
            onClick={() => setHelpExpanded((v) => !v)}
            className="underline underline-offset-2 hover:text-[#7D9B76]/80 transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76] rounded"
          >
            {helpExpanded ? "Réduire" : "En savoir plus"}
          </button>
        </p>
        {helpExpanded && (
          <ul className="space-y-0.5 text-[12px] mt-2">
            <li>Glissez une pièce pour la déplacer. Tirez les coins pour redimensionner.</li>
            <li>Appui long sur le nom (ou double-clic) pour renommer.</li>
            <li>Shift+clic (ou « Fusionner avec… » sur mobile) sur 2 pièces pour casser un mur.</li>
            <li><span className="inline-block w-3 h-2 border-2 border-dashed border-[#7D9B76] rounded-sm mr-1" />= pièce projet (ajoutée par vous) &nbsp; <span className="inline-block w-3 h-2 border-2 border-solid border-[#6495ED] rounded-sm mr-1" />= pièce existante</li>
            {buildingOutline && (
              <li><span className="inline-block w-3 h-2 border-2 border-dashed rounded-sm mr-1" style={{ borderColor: OUTLINE_COLOR }} />= contour du bâtiment — les pièces sont contraintes dans cette zone. Ajustez en tirant les coins.</li>
            )}
          </ul>
        )}
      </div>

      {/* Header toolbar */}
      <div className="flex items-center justify-between gap-2 sm:flex-wrap">
        <div className="flex items-center gap-3 shrink-0">
          <h3 className="text-sm font-semibold text-[#1C1C1E]">
            Éditeur de plan
          </h3>
          {(existingCount > 0 || newCount > 0) && (
            <span className="text-xs text-[#9B9A94]">
              {existingCount > 0 && <span>{existingCount} existante{existingCount > 1 ? "s" : ""}</span>}
              {existingCount > 0 && newCount > 0 && " + "}
              {newCount > 0 && <span className="text-[#7D9B76] font-medium">{newCount} projet</span>}
            </span>
          )}
          {scaleIndicatorText && (
            <span className="text-[11px] text-[#7D9B76] bg-[#7D9B76]/10 rounded px-1.5 py-0.5 font-mono">
              {scaleIndicatorText}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto sm:flex-wrap">
          {/* P2 — Undo / Redo with text labels (UX C4) */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="inline-flex items-center gap-1 px-2.5 h-10 rounded-md
                       border border-[#D1D0CB]/60 text-[#1C1C1E]/70 text-xs
                       hover:bg-[#F5F5F0] transition-colors
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-[#7D9B76] min-w-[44px] min-h-[44px]
                       disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Annuler (Ctrl+Z)"
            title="Annuler (Ctrl+Z)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
            <span className="hidden sm:inline">Annuler</span>
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="inline-flex items-center gap-1 px-2.5 h-10 rounded-md
                       border border-[#D1D0CB]/60 text-[#1C1C1E]/70 text-xs
                       hover:bg-[#F5F5F0] transition-colors
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-[#7D9B76] min-w-[44px] min-h-[44px]
                       disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Refaire (Ctrl+Shift+Z)"
            title="Refaire (Ctrl+Shift+Z)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.13-9.36L23 10" />
            </svg>
            <span className="hidden sm:inline">Refaire</span>
          </button>

          {/* Separator */}
          <div className="w-px h-6 bg-[#D1D0CB]/40 mx-0.5" aria-hidden="true" />

          {/* Merge button — visible when 2+ rooms selected */}
          {canMerge && (
            <button
              type="button"
              onClick={mergeSelectedRooms}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                         bg-[#7D9B76] text-white text-xs font-medium
                         hover:bg-[#6B8A64] transition-colors
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-[#7D9B76] min-h-[44px]
                         shadow-sm"
              aria-label={`Fusionner les ${selectedRoomIds.size} pièces sélectionnées`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8 3H5a2 2 0 00-2 2v3" />
                <path d="M21 8V5a2 2 0 00-2-2h-3" />
                <path d="M3 16v3a2 2 0 002 2h3" />
                <path d="M16 21h3a2 2 0 002-2v-3" />
              </svg>
              Fusionner ({selectedRoomIds.size})
            </button>
          )}

          {/* P1 — Mobile fusion button (Moi) — visible when 1 room selected and not in canMerge mode */}
          {selectedRoomId && !canMerge && (
            <button
              type="button"
              onClick={() => {
                if (fusionMode) {
                  setFusionMode(false);
                } else {
                  // Ensure the single selected room is in the multi-select set
                  setSelectedRoomIds(new Set([selectedRoomId]));
                  setFusionMode(true);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                         text-xs font-medium transition-colors
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-[#7D9B76] min-h-[44px]
                         ${fusionMode
                           ? "bg-[#7D9B76] text-white shadow-sm"
                           : "border border-[#D1D0CB]/60 text-[#1C1C1E]/70 hover:bg-[#F5F5F0]"
                         }`}
              aria-label={fusionMode ? "Annuler la fusion" : "Fusionner avec une autre pièce"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 3H5a2 2 0 00-2 2v3" />
                <path d="M21 8V5a2 2 0 00-2-2h-3" />
                <path d="M3 16v3a2 2 0 002 2h3" />
                <path d="M16 21h3a2 2 0 002-2v-3" />
              </svg>
              {fusionMode ? "Annuler fusion" : "Fusionner avec…"}
            </button>
          )}

          <button
            type="button"
            onClick={addNewRoom}
            disabled={!isReady}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                       border border-dashed border-[#7D9B76] text-xs font-medium
                       text-[#7D9B76] hover:bg-[#7D9B76]/10 transition-colors
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-[#7D9B76] min-h-[44px]
                       disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Ajouter une nouvelle pièce sur le plan"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouvelle pièce
          </button>

          {/* Calibration — always visible (Thomas needs to see it) */}
          <button
            type="button"
            onClick={() => {
              if (isCalibrating) {
                cancelCalibration();
              } else {
                setIsCalibrating(true);
                setCalibrationPointA(null);
                setCalibrationPointB(null);
              }
            }}
            disabled={!isReady}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                       text-xs font-medium transition-colors
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-[#7D9B76] min-h-[44px]
                       disabled:opacity-40 disabled:cursor-not-allowed
                       ${isCalibrating
                         ? "bg-[#7D9B76] text-white shadow-sm"
                         : "border border-[#D1D0CB]/60 text-[#1C1C1E]/70 hover:bg-[#F5F5F0]"
                       }`}
            aria-label={isCalibrating ? "Annuler la calibration" : "Calibrer les distances"}
            title={isCalibrating ? "Cliquez pour annuler" : "Calibrer les distances réelles"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.3 15.3a2.4 2.4 0 010 3.4l-2.6 2.6a2.4 2.4 0 01-3.4 0L2.7 8.7a2.41 2.41 0 010-3.4l2.6-2.6a2.41 2.41 0 013.4 0z" />
              <line x1="14.5" y1="12.5" x2="11.5" y2="9.5" />
            </svg>
            <span className="hidden sm:inline">{isCalibrating ? "Annuler" : "Calibrer"}</span>
          </button>

          {/* Separator */}
          <div className="w-px h-6 bg-[#D1D0CB]/40 mx-0.5" aria-hidden="true" />

          {/* Advanced options toggle — plan/projet only */}
          <button
            type="button"
            onClick={() => setShowAdvancedTools((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 h-10 rounded-md
                       border border-[#D1D0CB]/60 text-[#1C1C1E]/70 text-xs
                       hover:bg-[#F5F5F0] transition-colors
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-[#7D9B76] min-w-[44px] min-h-[44px]"
            aria-expanded={showAdvancedTools}
            aria-label="Options avancées"
          >
            Options
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              className={`transition-transform ${showAdvancedTools ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Advanced tools row — View mode toggle plan/projet */}
      {showAdvancedTools && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* View mode toggle */}
          {newCount > 0 && (
            <div className="inline-flex rounded-md border border-[#D1D0CB]/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("actuel")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors
                           min-h-[44px]
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-[#7D9B76] focus-visible:ring-inset
                           ${viewMode === "actuel"
                             ? "bg-[#1C1C1E] text-white"
                             : "text-[#1C1C1E]/70 hover:bg-[#F5F5F0]"
                           }`}
                aria-label="Voir le plan actuel (sans les pièces projet)"
                aria-pressed={viewMode === "actuel"}
              >
                Plan actuel
              </button>
              <button
                type="button"
                onClick={() => setViewMode("projet")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors
                           min-h-[44px]
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-[#7D9B76] focus-visible:ring-inset
                           ${viewMode === "projet"
                             ? "bg-[#7D9B76] text-white"
                             : "text-[#1C1C1E]/70 hover:bg-[#F5F5F0]"
                           }`}
                aria-label="Voir le projet complet (existantes + projet)"
                aria-pressed={viewMode === "projet"}
              >
                Mon projet
              </button>
            </div>
          )}
        </div>
      )}

      {/* Calibration instruction banner */}
      {isCalibrating && (
        <div className="p-3 rounded-lg bg-[#EEF2FF] border border-[#6366F1]/20 text-[13px] text-[#4338CA] leading-relaxed">
          <p className="font-medium">
            {!calibrationPointA
              ? "Cliquez sur le premier point de la distance de référence (ex : un bord de porte)"
              : "Cliquez sur le deuxième point (ex : l'autre bord de la porte)"}
          </p>
          <p className="text-[12px] mt-0.5 text-[#4338CA]/70">
            Choisissez une distance dont vous connaissez la mesure réelle (porte, fenêtre, mur...).
          </p>
        </div>
      )}

      {/* P1 — Fusion mode banner */}
      {fusionMode && (
        <div className="p-2.5 rounded-lg bg-[#7D9B76]/10 border border-[#7D9B76]/20 text-[13px] text-[#7D9B76]">
          Touchez la pièce à fusionner avec <strong>{rooms.find((r) => r.id === selectedRoomId)?.name || "la pièce sélectionnée"}</strong>.
        </div>
      )}

      {/* Polygon drawing instruction banner */}
      {isDrawingZone && (
        <div className="p-3 rounded-lg bg-[#7D9B76]/10 border border-[#7D9B76]/20 text-[13px] text-[#7D9B76] leading-relaxed">
          <p className="font-medium">
            {zoneDrawPoints.length === 0
              ? "Cliquez pour placer le premier point du contour de la zone."
              : zoneDrawPoints.length < 3
              ? `${zoneDrawPoints.length} point${zoneDrawPoints.length > 1 ? "s" : ""} placé${zoneDrawPoints.length > 1 ? "s" : ""}. Continuez à cliquer pour tracer le contour (minimum 3 points).`
              : `${zoneDrawPoints.length} points placés. Cliquez sur le premier point ou double-cliquez pour fermer le polygone.`}
          </p>
          <p className="text-[12px] mt-0.5 text-[#7D9B76]/70">
            Appuyez sur Échap pour annuler.
          </p>
        </div>
      )}

      {/* Plan container — scrollable, zoom via Ctrl+wheel */}
      <div
        ref={scrollContainerRef}
        className="relative overflow-auto rounded-lg border border-[#D1D0CB]/40
                   bg-[#F5F5F0] shadow-[0_1px_3px_rgba(28,28,30,0.06)] cursor-grab active:cursor-grabbing"
        style={{ maxHeight: "70vh" }}
      >
        <div
          ref={containerRef}
          className="relative touch-pan-x touch-pan-y"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "top left",
            width: zoomLevel !== 1 ? `${100 / zoomLevel}%` : "100%",
            cursor: isDrawingZone || isPlacingPhoto ? "crosshair" : undefined,
          }}
          onClick={isDrawingZone ? handleZoneDrawClick : handleBackgroundClick}
          onDoubleClick={isDrawingZone ? handleZoneDrawDblClick : undefined}
          onMouseMove={
            isDrawingZone ? handleZoneDrawMove
            : isPlacingPhoto && photoPlaceStart ? handlePhotoPlaceMove
            : undefined
          }
          onMouseDown={isPlacingPhoto ? handlePhotoPlaceStart : undefined}
          onMouseUp={
            isPlacingPhoto && photoPlaceStart ? handlePhotoPlaceEnd
            : undefined
          }
          onTouchStart={isDrawingZone ? (e) => {
            // Touch: tap to add a point (handled via click on touch devices)
            e.preventDefault();
            const t = e.touches[0];
            handleZoneDrawClick({ clientX: t.clientX, clientY: t.clientY, stopPropagation: () => {}, preventDefault: () => {} } as unknown as React.MouseEvent<HTMLDivElement>);
          } : isPlacingPhoto ? (e) => {
            e.preventDefault();
            const t = e.touches[0];
            handlePhotoPlaceStart({ clientX: t.clientX, clientY: t.clientY, stopPropagation: () => {}, preventDefault: () => {} } as unknown as React.MouseEvent<HTMLDivElement>);
          } : undefined}
          onTouchMove={
            isDrawingZone ? (e) => {
              e.preventDefault();
              const t = e.touches[0];
              handleZoneDrawMove({ clientX: t.clientX, clientY: t.clientY } as unknown as React.MouseEvent<HTMLDivElement>);
            }
            : isPlacingPhoto && photoPlaceStart ? (e) => {
              e.preventDefault();
              const t = e.touches[0];
              handlePhotoPlaceMove({ clientX: t.clientX, clientY: t.clientY } as unknown as React.MouseEvent<HTMLDivElement>);
            }
            : undefined
          }
          onTouchEnd={
            isPlacingPhoto && photoPlaceStart ? () => {
              handlePhotoPlaceEnd();
            }
            : undefined
          }
          role="application"
          aria-label="Éditeur de plan interactif — déplacez et redimensionnez les pièces"
        >
          {/* Plan image */}
          <img
            src={planImageUrl}
            alt="Plan du bien"
            onLoad={handleImageLoad}
            onError={(e) => {
              // Show fallback message instead of broken image icon
              const target = e.currentTarget;
              target.style.display = "none";
              const fallback = document.createElement("div");
              fallback.className = "flex items-center justify-center py-20 text-sm text-[#9B9A94]";
              fallback.textContent = "Impossible de charger le plan. Vérifiez votre connexion.";
              target.parentElement?.appendChild(fallback);
            }}
            className="block w-full h-auto select-none pointer-events-none"
            draggable={false}
          />

        {/* Building outline overlay — visual dashed rectangle (z-1, under rooms) */}
        {isReady && buildingOutline && naturalSize && (
          <div
            className="absolute pointer-events-none"
            style={{
              zIndex: OUTLINE_Z_VISUAL,
              left: `${buildingOutline.x_percent}%`,
              top: `${buildingOutline.y_percent}%`,
              width: `${buildingOutline.width_percent}%`,
              height: `${buildingOutline.height_percent}%`,
              border: OUTLINE_BORDER,
              borderRadius: "2px",
              boxShadow: OUTLINE_SHADOW,
            }}
            aria-label="Contour du bâtiment détecté par l'IA"
          >
            {/* Label — inside top-left for viewport safety */}
            <span
              className="absolute top-1 left-1.5 text-[12px] font-semibold px-1.5 py-0.5 rounded"
              style={{ color: OUTLINE_COLOR_DARK, background: OUTLINE_LABEL_BG }}
            >
              Contour du bâtiment
            </span>
          </div>
        )}

        {/* Building outline drag handles — separate layer (z-4, above rooms, below guides) */}
        {isReady && buildingOutline && naturalSize && onBuildingOutlineChange && (
          <div
            className="absolute pointer-events-none"
            style={{
              zIndex: OUTLINE_Z_HANDLES,
              left: `${buildingOutline.x_percent}%`,
              top: `${buildingOutline.y_percent}%`,
              width: `${buildingOutline.width_percent}%`,
              height: `${buildingOutline.height_percent}%`,
            }}
          >
            {(["nw", "ne", "sw", "se"] as const).map((corner) => {
              const cornerLabels = { nw: "nord-ouest", ne: "nord-est", sw: "sud-ouest", se: "sud-est" };
              return (
              <div
                key={`outline-handle-${corner}`}
                className="absolute pointer-events-auto"
                role="button"
                aria-label={`Redimensionner le contour — coin ${cornerLabels[corner]}`}
                style={{
                  width: HANDLE_HIT_SIZE,
                  height: HANDLE_HIT_SIZE,
                  ...(corner.includes("n") ? { top: -HANDLE_HIT_SIZE / 2 } : { bottom: -HANDLE_HIT_SIZE / 2 }),
                  ...(corner.includes("w") ? { left: -HANDLE_HIT_SIZE / 2 } : { right: -HANDLE_HIT_SIZE / 2 }),
                  cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleOutlineResizeStart(corner, e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  const t = e.touches[0];
                  handleOutlineResizeStart(corner, t.clientX, t.clientY);
                }}
              >
                <div
                  style={{
                    width: OUTLINE_HANDLE_VISUAL_SIZE,
                    height: OUTLINE_HANDLE_VISUAL_SIZE,
                    borderRadius: "50%",
                    background: OUTLINE_HANDLE_BG,
                    border: OUTLINE_HANDLE_BORDER,
                    pointerEvents: "none",
                  }}
                />
              </div>
              );
            })}
          </div>
        )}

        {/* Lot zone overlays — SVG polygons or legacy rectangles (z-2) */}
        {isReady && lotZones && (() => {
          const zonesWithShape = lotZones.filter((z) => z.zonePolygon || z.zoneRect);
          if (zonesWithShape.length === 0) return null;
          return (
            <>
              {/* SVG layer for zone fills + strokes */}
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ zIndex: ZONE_Z_VISUAL, pointerEvents: "none" }}
                aria-hidden="true"
              >
                {zonesWithShape.map((zone) => {
                  if (zone.zonePolygon && zone.zonePolygon.points.length >= 3) {
                    const pts = zone.zonePolygon.points.map((p) => `${p.x_percent},${p.y_percent}`).join(" ");
                    return (
                      <polygon
                        key={`zone-svg-${zone.id}`}
                        points={pts}
                        fill={applyOpacityToColor(zone.color, 0.12)}
                        stroke={applyOpacityToColor(zone.color, 0.6)}
                        strokeWidth="0.3"
                      />
                    );
                  }
                  if (zone.zoneRect) {
                    const r = zone.zoneRect;
                    return (
                      <rect
                        key={`zone-svg-${zone.id}`}
                        x={r.x_percent}
                        y={r.y_percent}
                        width={r.width_percent}
                        height={r.height_percent}
                        fill={applyOpacityToColor(zone.color, 0.12)}
                        stroke={applyOpacityToColor(zone.color, 0.6)}
                        strokeWidth="0.3"
                        rx="0.3"
                      />
                    );
                  }
                  return null;
                })}
              </svg>

              {/* Measurements SVG layer — segment lengths + surface area */}
              {naturalSize && (
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{ zIndex: ZONE_Z_VISUAL + 1, pointerEvents: "none" }}
                  aria-hidden="true"
                >
                  {zonesWithShape.map((zone) => {
                    if (!zone.zonePolygon || zone.zonePolygon.points.length < 3) return null;
                    const pts = zone.zonePolygon.points;
                    const areaM2 = computePolygonAreaM2(pts, naturalSize.width, naturalSize.height, scaleFactor);
                    const centroid = polygonCentroid(pts);

                    return (
                      <g key={`zone-measures-${zone.id}`}>
                        {/* Segment lengths along each edge */}
                        {pts.map((p1, idx) => {
                          const p2 = pts[(idx + 1) % pts.length];
                          const lengthM = computeSegmentLengthM(p1, p2, naturalSize.width, naturalSize.height, scaleFactor);
                          if (lengthM < 0.1) return null;
                          const midX = (p1.x_percent + p2.x_percent) / 2;
                          const midY = (p1.y_percent + p2.y_percent) / 2;
                          const edgeDx = p2.x_percent - p1.x_percent;
                          const edgeDy = p2.y_percent - p1.y_percent;
                          const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
                          const nx = -edgeDy / (edgeLen || 1);
                          const ny = edgeDx / (edgeLen || 1);
                          const toCentroidX = centroid.x - midX;
                          const toCentroidY = centroid.y - midY;
                          const dot = nx * toCentroidX + ny * toCentroidY;
                          const sign = dot > 0 ? -1 : 1;
                          const offsetX = midX + sign * nx * 1.8;
                          const offsetY = midY + sign * ny * 1.8;

                          return (
                            <text
                              key={`seg-${zone.id}-${idx}`}
                              x={offsetX}
                              y={offsetY}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize="1.6"
                              fontWeight="600"
                              fontFamily="Inter, sans-serif"
                              fill="#1C1C1E"
                              stroke="white"
                              strokeWidth="0.3"
                              paintOrder="stroke"
                            >
                              {lengthM.toFixed(1)} m
                            </text>
                          );
                        })}

                        {/* Surface area at centroid */}
                        <text
                          x={centroid.x}
                          y={centroid.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="2.2"
                          fontWeight="700"
                          fontFamily="Inter, sans-serif"
                          fill="#1C1C1E"
                          stroke="white"
                          strokeWidth="0.4"
                          paintOrder="stroke"
                        >
                          {areaM2.toFixed(1)} m²
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Labels positioned over zones */}
              {zonesWithShape.map((zone) => {
                let labelX: number, labelY: number;
                if (zone.zonePolygon && zone.zonePolygon.points.length >= 3) {
                  const bbox = polygonBBox(zone.zonePolygon.points);
                  labelX = bbox.minX;
                  labelY = bbox.minY;
                } else if (zone.zoneRect) {
                  labelX = zone.zoneRect.x_percent;
                  labelY = zone.zoneRect.y_percent;
                } else {
                  return null;
                }
                return (
                  <span
                    key={`zone-label-${zone.id}`}
                    className="absolute text-[11px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap"
                    style={{
                      zIndex: ZONE_Z_VISUAL + 1,
                      left: `${labelX}%`,
                      top: `${labelY}%`,
                      color: "white",
                      background: applyOpacityToColor(zone.color, 0.75),
                      pointerEvents: "none",
                      transform: "translate(4px, 4px)",
                    }}
                  >
                    {zone.name}
                  </span>
                );
              })}

              {/* Interactive handles for polygon zones */}
              {onLotZoneChange && !isDrawingZone && zonesWithShape.map((zone) => {
                if (zone.zonePolygon && zone.zonePolygon.points.length >= 3) {
                  const pts = zone.zonePolygon.points;
                  const bbox = polygonBBox(pts);
                  return (
                    <div key={`zone-handles-${zone.id}`}>
                      {/* Invisible hit area for move (polygon bounding box) */}
                      <div
                        className="absolute"
                        style={{
                          zIndex: ZONE_Z_HANDLES,
                          left: `${bbox.minX}%`,
                          top: `${bbox.minY}%`,
                          width: `${bbox.maxX - bbox.minX}%`,
                          height: `${bbox.maxY - bbox.minY}%`,
                          cursor: "move",
                          pointerEvents: "auto",
                        }}
                        onMouseDown={(e) => {
                          // Only move if clicked inside the polygon
                          const pct = clientToPercent(e.clientX, e.clientY);
                          if (pointInPolygon(pct.x, pct.y, pts)) {
                            e.stopPropagation();
                            e.preventDefault();
                            handleZoneDragStart(zone.id, "move", e.clientX, e.clientY);
                          }
                        }}
                        onTouchStart={(e) => {
                          const t = e.touches[0];
                          const pct = clientToPercent(t.clientX, t.clientY);
                          if (pointInPolygon(pct.x, pct.y, pts)) {
                            e.stopPropagation();
                            handleZoneDragStart(zone.id, "move", t.clientX, t.clientY);
                          }
                        }}
                        role="button"
                        aria-label={`Déplacer la zone ${zone.name}`}
                      />

                      {/* Vertex handles — one per point */}
                      {pts.map((pt, idx) => (
                        <div
                          key={`zone-vertex-${zone.id}-${idx}`}
                          className="absolute pointer-events-auto"
                          style={{
                            zIndex: ZONE_Z_HANDLES + 1,
                            left: `${pt.x_percent}%`,
                            top: `${pt.y_percent}%`,
                            width: HANDLE_HIT_SIZE,
                            height: HANDLE_HIT_SIZE,
                            transform: "translate(-50%, -50%)",
                            cursor: "grab",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleZoneDragStart(zone.id, "resize", e.clientX, e.clientY, idx);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            const t = e.touches[0];
                            handleZoneDragStart(zone.id, "resize", t.clientX, t.clientY, idx);
                          }}
                          role="button"
                          aria-label={`Déplacer le point ${idx + 1} de la zone ${zone.name}`}
                        >
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: applyOpacityToColor(zone.color, 0.8),
                              border: "2px solid white",
                              pointerEvents: "none",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                }
                // Legacy rectangle handles
                if (zone.zoneRect) {
                  const r = zone.zoneRect;
                  return (
                    <div
                      key={`zone-handles-${zone.id}`}
                      className="absolute"
                      style={{
                        zIndex: ZONE_Z_HANDLES,
                        left: `${r.x_percent}%`,
                        top: `${r.y_percent}%`,
                        width: `${r.width_percent}%`,
                        height: `${r.height_percent}%`,
                        cursor: "move",
                        pointerEvents: "auto",
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleZoneDragStart(zone.id, "move", e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        const t = e.touches[0];
                        handleZoneDragStart(zone.id, "move", t.clientX, t.clientY);
                      }}
                      role="button"
                      aria-label={`Déplacer la zone ${zone.name}`}
                    />
                  );
                }
                return null;
              })}
            </>
          );
        })()}

        {/* Zone polygon drawing preview — points placed so far + cursor line */}
        {isReady && isDrawingZone && zoneDrawPoints.length > 0 && (() => {
          const drawingZone = lotZones?.find((z) => z.id === drawingLotId);
          if (!drawingZone) return null;
          const allPts = zoneDrawPoints;
          const strokeColor = applyOpacityToColor(drawingZone.color, 0.8);
          const fillColor = applyOpacityToColor(drawingZone.color, 0.15);

          // Build the polyline points string (placed points)
          const placedStr = allPts.map((p) => `${p.x},${p.y}`).join(" ");
          // Cursor line from last placed point to cursor
          const lastPt = allPts[allPts.length - 1];
          const cursorPt = zoneDrawCursor;

          return (
            <>
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ zIndex: ZONE_Z_HANDLES + 1, pointerEvents: "none" }}
              >
                {/* Filled preview if >= 3 points */}
                {allPts.length >= 3 && (
                  <polygon
                    points={placedStr}
                    fill={fillColor}
                    stroke="none"
                  />
                )}
                {/* Placed segments */}
                <polyline
                  points={placedStr}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="0.3"
                  strokeDasharray="0.6 0.4"
                />
                {/* Cursor line from last point */}
                {cursorPt && (
                  <line
                    x1={lastPt.x} y1={lastPt.y}
                    x2={cursorPt.x} y2={cursorPt.y}
                    stroke={strokeColor}
                    strokeWidth="0.2"
                    strokeDasharray="0.4 0.3"
                    opacity="0.6"
                  />
                )}
                {/* Closing preview line (cursor to first point) when >= 3 pts */}
                {cursorPt && allPts.length >= 2 && (
                  <line
                    x1={cursorPt.x} y1={cursorPt.y}
                    x2={allPts[0].x} y2={allPts[0].y}
                    stroke={strokeColor}
                    strokeWidth="0.15"
                    strokeDasharray="0.3 0.3"
                    opacity="0.3"
                  />
                )}
                {/* Point markers */}
                {allPts.map((p, i) => (
                  <circle
                    key={`draw-pt-${i}`}
                    cx={p.x} cy={p.y}
                    r={i === 0 && allPts.length >= 3 ? "0.8" : "0.5"}
                    fill={i === 0 && allPts.length >= 3 ? strokeColor : "white"}
                    stroke={strokeColor}
                    strokeWidth="0.2"
                  />
                ))}
              </svg>
              {/* Label preview */}
              <span
                className="absolute text-[11px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap"
                style={{
                  zIndex: ZONE_Z_HANDLES + 2,
                  left: `${allPts[0].x}%`,
                  top: `${allPts[0].y}%`,
                  color: "white",
                  background: applyOpacityToColor(drawingZone.color, 0.75),
                  pointerEvents: "none",
                  transform: "translate(4px, -24px)",
                }}
              >
                {drawingZone.name}
              </span>
            </>
          );
        })()}

        {/* Photo direction markers */}
        {isReady && photoMarkers && photoMarkers.map((marker) => {
          const arrowLen = 3; // Arrow length in % of image
          const endX = marker.x_percent + arrowLen * Math.cos((marker.angle_deg * Math.PI) / 180);
          const endY = marker.y_percent + arrowLen * Math.sin((marker.angle_deg * Math.PI) / 180);
          return (
            <div
              key={`photo-marker-${marker.roomId}`}
              className="absolute pointer-events-none"
              style={{
                zIndex: PHOTO_MARKER_Z,
                left: `${marker.x_percent}%`,
                top: `${marker.y_percent}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Camera icon */}
              <div
                className="relative flex items-center justify-center"
                style={{ width: 28, height: 28 }}
              >
                <div
                  className="absolute inset-0 rounded-full bg-[#1C1C1E] shadow-md"
                  style={{ opacity: 0.85 }}
                />
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="relative z-10">
                  <path d="M2 5.5a1 1 0 011-1h2l1-1.5h4l1 1.5h2a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1v-6z" stroke="white" strokeWidth="1.2" fill="none" />
                  <circle cx="8" cy="8" r="2" stroke="white" strokeWidth="1.2" fill="none" />
                </svg>
              </div>
              {/* Room name label */}
              <div
                className="absolute left-1/2 -bottom-5 -translate-x-1/2 whitespace-nowrap
                           text-[9px] font-semibold bg-[#1C1C1E]/80 text-white px-1.5 py-0.5 rounded"
              >
                {marker.roomName}
              </div>
            </div>
          );
          // Render the direction arrow as a separate SVG positioned at marker location
          void endX; void endY; // Used below
        })}

        {/* Photo direction arrows (SVG overlay) */}
        {isReady && photoMarkers && photoMarkers.length > 0 && imgSize && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: PHOTO_MARKER_Z - 1, width: "100%", height: "100%" }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {photoMarkers.map((marker) => {
              const arrowLen = 4;
              const rad = (marker.angle_deg * Math.PI) / 180;
              const ex = marker.x_percent + arrowLen * Math.cos(rad);
              const ey = marker.y_percent + arrowLen * Math.sin(rad);
              // Arrowhead
              const headLen = 1;
              const headAngle = Math.PI / 6;
              const ax1 = ex - headLen * Math.cos(rad - headAngle);
              const ay1 = ey - headLen * Math.sin(rad - headAngle);
              const ax2 = ex - headLen * Math.cos(rad + headAngle);
              const ay2 = ey - headLen * Math.sin(rad + headAngle);
              return (
                <g key={`photo-arrow-${marker.roomId}`}>
                  <line
                    x1={marker.x_percent} y1={marker.y_percent}
                    x2={ex} y2={ey}
                    stroke="#1C1C1E" strokeWidth="0.3" strokeLinecap="round"
                    opacity="0.7"
                  />
                  <polygon
                    points={`${ex},${ey} ${ax1},${ay1} ${ax2},${ay2}`}
                    fill="#1C1C1E" opacity="0.7"
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Photo placement preview — while user is placing a photo direction */}
        {isReady && isPlacingPhoto && photoPlaceStart && photoPlaceCurrent && (() => {
          const dx = photoPlaceCurrent.x - photoPlaceStart.x;
          const dy = photoPlaceCurrent.y - photoPlaceStart.y;
          const hasDrag = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
          return (
            <>
              {/* Placement dot */}
              <div
                className="absolute pointer-events-none"
                style={{
                  zIndex: PHOTO_MARKER_Z + 1,
                  left: `${photoPlaceStart.x}%`,
                  top: `${photoPlaceStart.y}%`,
                  transform: "translate(-50%, -50%)",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundColor: "#7D9B76",
                  border: "2px solid white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                }}
              />
              {/* Direction line while dragging */}
              {hasDrag && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  style={{ zIndex: PHOTO_MARKER_Z + 1, width: "100%", height: "100%" }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <line
                    x1={photoPlaceStart.x} y1={photoPlaceStart.y}
                    x2={photoPlaceCurrent.x} y2={photoPlaceCurrent.y}
                    stroke="#7D9B76" strokeWidth="0.4" strokeLinecap="round"
                    strokeDasharray="0.8 0.4"
                  />
                </svg>
              )}
            </>
          );
        })()}

        {/* Alignment guides SVG overlay */}
        {isReady && dragState && (alignmentGuides.horizontal.length > 0 || alignmentGuides.vertical.length > 0) && (
          <svg
            className="absolute inset-0 pointer-events-none z-[5]"
            style={{ width: imgSize!.width, height: imgSize!.height }}
            aria-hidden="true"
          >
            {alignmentGuides.vertical.map((x, i) => (
              <line
                key={`v-${i}`}
                x1={x * displayScale}
                y1={0}
                x2={x * displayScale}
                y2={imgSize!.height}
                stroke="#7D9B76"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.7"
              />
            ))}
            {alignmentGuides.horizontal.map((y, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={y * displayScale}
                x2={imgSize!.width}
                y2={y * displayScale}
                stroke="#7D9B76"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.7"
              />
            ))}
          </svg>
        )}

        {/* Calibration points + line overlay */}
        {isReady && isCalibrating && calibrationPointA && (
          <svg
            className="absolute inset-0 pointer-events-none z-[25]"
            style={{ width: imgSize!.width, height: imgSize!.height }}
            aria-hidden="true"
          >
            {/* Point A */}
            <circle
              cx={calibrationPointA.x * displayScale}
              cy={calibrationPointA.y * displayScale}
              r={6}
              fill="#7D9B76"
              stroke="#fff"
              strokeWidth="2"
            />
            {/* Point B + connecting line */}
            {calibrationPointB && (
              <>
                <line
                  x1={calibrationPointA.x * displayScale}
                  y1={calibrationPointA.y * displayScale}
                  x2={calibrationPointB.x * displayScale}
                  y2={calibrationPointB.y * displayScale}
                  stroke="#7D9B76"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                />
                <circle
                  cx={calibrationPointB.x * displayScale}
                  cy={calibrationPointB.y * displayScale}
                  r={6}
                  fill="#7D9B76"
                  stroke="#fff"
                  strokeWidth="2"
                />
              </>
            )}
          </svg>
        )}

        {/* Calibration crosshair cursor */}
        {isCalibrating && (
          <div
            className="absolute inset-0 z-[24]"
            style={{ cursor: "crosshair" }}
          />
        )}

        {/* Room overlays */}
        {isReady &&
          visibleRooms.map((room) => {
            const isSelected = selectedRoomId === room.id;
            const isMultiSelected = selectedRoomIds.has(room.id);
            const isHighlighted = highlightedRoomId === room.id;
            const isDragging = dragState?.roomId === room.id;
            const bgColor = room.color || colorForType(room.roomType);
            const brdColor = room.color ? applyOpacityToColor(room.color, 0.8) : borderForType(room.roomType);
            const isNewRoom = room.isNew === true;

            // Displayed positions (scaled from natural coords)
            const dx = room.x * displayScale;
            const dy = room.y * displayScale;
            const dw = room.width * displayScale;
            const dh = room.height * displayScale;

            const surface = computeSurface(room.width, room.height, scaleFactor);

            // Check if room overflows the building outline (soft constraint — visual warning)
            const isOutOfOutline = (() => {
              if (!buildingOutline || !naturalSize) return false;
              const oLeft = (buildingOutline.x_percent / 100) * naturalSize.width;
              const oTop = (buildingOutline.y_percent / 100) * naturalSize.height;
              const oRight = oLeft + (buildingOutline.width_percent / 100) * naturalSize.width;
              const oBottom = oTop + (buildingOutline.height_percent / 100) * naturalSize.height;
              return room.x < oLeft - 2 || room.y < oTop - 2
                || room.x + room.width > oRight + 2 || room.y + room.height > oBottom + 2;
            })();

            return (
              <div
                key={room.id}
                className="absolute group"
                style={{
                  left: dx,
                  top: dy,
                  width: dw,
                  height: dh,
                  cursor: isDragging ? "grabbing" : "grab",
                  zIndex: isSelected ? 20 : isMultiSelected ? 15 : 10,
                  touchAction: "none",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // P1 — Fusion mode: second tap merges with the first room (Moi)
                  if (fusionMode && selectedRoomId && room.id !== selectedRoomId) {
                    const mergeIds = new Set([selectedRoomId, room.id]);
                    setSelectedRoomIds(mergeIds);
                    setFusionMode(false);
                    // Auto-merge after setting the IDs — use a microtask to let state settle
                    setTimeout(() => {
                      // Inline merge logic (same as mergeSelectedRooms but with explicit IDs)
                      const selected = rooms.filter((r) => mergeIds.has(r.id));
                      if (selected.length < 2) return;
                      pushUndo();
                      const minX = Math.min(...selected.map((r) => r.x));
                      const minY = Math.min(...selected.map((r) => r.y));
                      const maxX = Math.max(...selected.map((r) => r.x + r.width));
                      const maxY = Math.max(...selected.map((r) => r.y + r.height));
                      const largest = selected.reduce((a, b) => (a.width * a.height > b.width * b.height ? a : b));
                      const newId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                      const merged: PlanRoom = {
                        id: newId, name: largest.name, roomType: largest.roomType,
                        x: minX, y: minY, width: maxX - minX, height: maxY - minY,
                        color: colorForType(largest.roomType), isNew: true,
                      };
                      const remaining = rooms.filter((r) => !mergeIds.has(r.id));
                      onRoomsChange([...remaining, merged]);
                      setSelectedRoomId(newId);
                      setSelectedRoomIds(new Set([newId]));
                      setTimeout(() => setEditingNameId(newId), 100);
                    }, 0);
                    return;
                  }
                  // Shift+click = multi-select for fusion
                  if (e.shiftKey) {
                    setSelectedRoomIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(room.id)) {
                        next.delete(room.id);
                      } else {
                        next.add(room.id);
                      }
                      // Also add current single-selected if not yet in set
                      if (selectedRoomId && !next.has(selectedRoomId)) {
                        next.add(selectedRoomId);
                      }
                      return next;
                    });
                  } else {
                    setSelectedRoomId(room.id);
                    setSelectedRoomIds(new Set([room.id]));
                    // Notify parent for scroll-into-view — but NOT after drag/resize
                    if (!justDraggedRef.current) {
                      onRoomClick?.(room.id);
                    }
                    // Cancel fusion mode if user clicks without using it
                    if (fusionMode) setFusionMode(false);
                  }
                }}
                onMouseDown={(e) => handlePointerDown(e, room.id, "move")}
                onTouchStart={(e) => {
                  handlePointerDown(e, room.id, "move");
                  // Long-press (500ms) to rename on touch
                  if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                  longPressTimerRef.current = setTimeout(() => {
                    editNameBeforeRef.current = room.name || "Sans nom";
                    setEditingNameId(room.id);
                  }, 500);
                }}
                onTouchEnd={() => {
                  if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                }}
                onTouchMove={() => {
                  // Cancel long-press if finger moves (drag)
                  if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${room.name} — ${surface} m²${isNewRoom ? " (projet)" : " (existante)"}. Déplacer avec la souris ou le doigt.`}
                onKeyDown={(e) => {
                  if (e.key === "Delete" || e.key === "Backspace") {
                    requestDelete(room.id);
                  }
                }}
              >
                {/* Zone background — dashed border for new/project rooms, solid for existing */}
                <div
                  className="absolute inset-0 rounded-sm"
                  style={{
                    backgroundColor: isHighlighted
                      ? applyOpacityToColor(bgColor, 0.45)
                      : isNewRoom ? applyOpacityToColor(bgColor, 0.35) : applyOpacityToColor(bgColor, 0.25),
                    border: isHighlighted
                      ? `3px solid ${brdColor}`
                      : isNewRoom
                        ? `2px dashed ${brdColor}`
                        : `2px solid ${brdColor}`,
                    boxShadow: isHighlighted
                      ? `0 0 0 3px ${brdColor}, 0 4px 12px rgba(0,0,0,0.25)`
                      : isOutOfOutline
                        ? `0 0 0 2px #DC3C3C, 0 2px 8px rgba(220,60,60,0.3)`
                        : isSelected || isMultiSelected
                          ? `0 0 0 2px ${brdColor}, 0 2px 8px rgba(0,0,0,0.15)`
                          : "none",
                    transition: "box-shadow 150ms ease, background-color 150ms ease, border 150ms ease",
                  }}
                />

                {/* "Hors contour" warning badge — room overflows building outline */}
                {isOutOfOutline && (
                  <div className="absolute bottom-0.5 right-0.5 z-20" title="Cette pièce dépasse le contour du bâtiment — ajustez-la ou redimensionnez le contour">
                    <span className="text-[10px] font-bold text-white bg-[#DC3C3C] rounded px-1 py-px uppercase tracking-wide">
                      Hors contour
                    </span>
                  </div>
                )}

                {/* "PROJET" badge for new rooms */}
                {isNewRoom && (
                  <div className="absolute top-0.5 left-0.5 z-20">
                    <span className="text-[9px] font-bold text-white bg-[#7D9B76] rounded px-1 py-px uppercase tracking-wide">
                      Projet
                    </span>
                  </div>
                )}

                {/* Label — name + surface (bigger text for mobile) */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center
                             pointer-events-none select-none overflow-hidden px-1"
                >
                  {editingNameId === room.id ? (
                    <input
                      type="text"
                      value={room.name}
                      onChange={(e) => updateRoomName(room.id, e.target.value)}
                      onBlur={() => commitRoomName(room.id, editNameBeforeRef.current)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape") {
                          commitRoomName(room.id, editNameBeforeRef.current);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      autoFocus
                      className="pointer-events-auto w-[90%] text-center text-[13px]
                                 font-semibold text-[#1C1C1E] bg-white/90 rounded
                                 border border-[#7D9B76] outline-none px-1 py-1
                                 focus-visible:ring-2 focus-visible:ring-[#7D9B76]
                                 min-h-[36px]"
                      aria-label="Renommer la pièce"
                    />
                  ) : (
                    <span
                      className="text-[13px] font-semibold text-[#1C1C1E] leading-tight
                                 truncate max-w-full text-center
                                 bg-white/90 rounded px-1
                                 pointer-events-auto cursor-text"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        editNameBeforeRef.current = room.name || "Sans nom";
                        setEditingNameId(room.id);
                      }}
                      title="Double-cliquer pour renommer (appui long sur mobile)"
                    >
                      {room.name || "Sans nom"}
                    </span>
                  )}

                  <span
                    className="text-[12px] font-medium text-[#1C1C1E] leading-tight
                               bg-white/90 rounded px-1"
                  >
                    {surface} m²
                  </span>
                </div>

                {/* Rename button — visible when selected, for mobile accessibility */}
                {isSelected && editingNameId !== room.id && (
                  <button
                    type="button"
                    className="absolute -top-2 -left-2 w-7 h-7 rounded-full
                               bg-[#7D9B76] text-white flex items-center justify-center
                               shadow-md hover:bg-[#6B8A64] transition-colors z-30
                               focus-visible:outline-none focus-visible:ring-2
                               focus-visible:ring-[#7D9B76] focus-visible:ring-offset-1
                               min-w-[44px] min-h-[44px] -m-[9px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      editNameBeforeRef.current = room.name || "Sans nom";
                      setEditingNameId(room.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    aria-label={`Renommer ${room.name || "cette pièce"}`}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}

                {/* Type selector (visible when selected) */}
                {isSelected && editingTypeId === room.id && (
                  <div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full z-30"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <select
                      value={room.roomType}
                      onChange={(e) => updateRoomType(room.id, e.target.value)}
                      onBlur={() => setEditingTypeId(null)}
                      autoFocus
                      className="text-[13px] text-[#1C1C1E] bg-white border border-[#D1D0CB]
                                 rounded-md px-2 py-1 shadow-md min-h-[44px]
                                 focus-visible:outline-none focus-visible:ring-2
                                 focus-visible:ring-[#7D9B76]"
                      aria-label={`Type de pièce pour ${room.name}`}
                    >
                      {ROOM_TYPE_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Delete button (mid-right, outside room) — avoids resize corner conflict */}
                {isSelected && pendingDeleteId !== room.id && (
                  <button
                    type="button"
                    className="absolute top-1/2 -translate-y-1/2 -right-3 translate-x-full w-7 h-7 rounded-full
                               bg-[#B91C1C] text-white flex items-center justify-center
                               shadow-md hover:bg-[#991B1B] transition-colors z-30
                               focus-visible:outline-none focus-visible:ring-2
                               focus-visible:ring-[#B91C1C] focus-visible:ring-offset-1
                               min-w-[44px] min-h-[44px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDelete(room.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    aria-label={`Supprimer ${room.name || "cette pièce"}`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}

                {/* P1 — Delete confirmation inline (UX C1) */}
                {pendingDeleteId === room.id && (
                  <div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full z-40
                               flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white
                               border border-[#B91C1C]/30 shadow-lg text-xs whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <span className="text-[#1C1C1E]">Supprimer {room.name || "cette pièce"} ?</span>
                    <button
                      type="button"
                      onClick={() => confirmDelete(room.id)}
                      className="px-2 py-1 rounded bg-[#B91C1C] text-white font-medium
                                 hover:bg-[#991B1B] transition-colors min-h-[44px] min-w-[44px]
                                 focus-visible:outline-none focus-visible:ring-2
                                 focus-visible:ring-[#B91C1C]"
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={cancelDelete}
                      className="px-2 py-1 rounded border border-[#D1D0CB] text-[#1C1C1E]
                                 hover:bg-[#F5F5F0] transition-colors min-h-[44px] min-w-[44px]
                                 focus-visible:outline-none focus-visible:ring-2
                                 focus-visible:ring-[#7D9B76]"
                    >
                      Non
                    </button>
                  </div>
                )}

                {/* Type badge (bottom — click to change) — min-h-[44px] for mobile */}
                {isSelected && editingTypeId !== room.id && (
                  <button
                    type="button"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full z-30
                               text-[12px] font-medium text-[#1C1C1E] bg-white border
                               border-[#D1D0CB] rounded-full px-3 py-1 shadow-sm
                               hover:bg-[#F5F5F0] transition-colors min-h-[44px]
                               flex items-center
                               focus-visible:outline-none focus-visible:ring-2
                               focus-visible:ring-[#7D9B76]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTypeId(room.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    aria-label={`Changer le type de ${room.name}`}
                  >
                    {ROOM_TYPE_LABELS[room.roomType] || room.roomType}
                  </button>
                )}

                {/* Resize handles — 4 coins + 4 bords, TOUJOURS visibles (mobile n'a pas de hover) */}
                {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as HandlePosition[]).map((handle) => {
                    const isCorner = handle.length === 2;
                    const cursorMap: Record<HandlePosition, string> = {
                      nw: "nwse-resize", se: "nwse-resize",
                      ne: "nesw-resize", sw: "nesw-resize",
                      n: "ns-resize", s: "ns-resize",
                      e: "ew-resize", w: "ew-resize",
                    };
                    const ariaLabels: Record<HandlePosition, string> = {
                      nw: "coin haut-gauche", n: "bord haut", ne: "coin haut-droite",
                      e: "bord droite", se: "coin bas-droite", s: "bord bas",
                      sw: "coin bas-gauche", w: "bord gauche",
                    };

                    // Position: corners at their respective corners, edges centered on their side
                    const posStyle: React.CSSProperties = {};
                    if (isCorner) {
                      // Corner positioning (existing logic)
                      const isLeft = handle.includes("w");
                      const isTop = handle.includes("n");
                      if (isLeft) posStyle.left = -HANDLE_SIZE / 2; else posStyle.right = -HANDLE_SIZE / 2;
                      if (isTop) posStyle.top = -HANDLE_SIZE / 2; else posStyle.bottom = -HANDLE_SIZE / 2;
                    } else {
                      // Edge positioning — centered on the edge
                      if (handle === "n") { posStyle.top = -HANDLE_SIZE / 2; posStyle.left = "50%"; posStyle.transform = "translateX(-50%)"; }
                      if (handle === "s") { posStyle.bottom = -HANDLE_SIZE / 2; posStyle.left = "50%"; posStyle.transform = "translateX(-50%)"; }
                      if (handle === "e") { posStyle.right = -HANDLE_SIZE / 2; posStyle.top = "50%"; posStyle.transform = "translateY(-50%)"; }
                      if (handle === "w") { posStyle.left = -HANDLE_SIZE / 2; posStyle.top = "50%"; posStyle.transform = "translateY(-50%)"; }
                    }

                    // Edge handles are visually wider bars (horizontal or vertical)
                    const visualWidth = isCorner ? HANDLE_SIZE : (handle === "n" || handle === "s" ? HANDLE_SIZE * 1.5 : HANDLE_SIZE);
                    const visualHeight = isCorner ? HANDLE_SIZE : (handle === "e" || handle === "w" ? HANDLE_SIZE * 1.5 : HANDLE_SIZE);

                    return (
                      <div
                        key={handle}
                        className="absolute z-30"
                        style={{
                          width: visualWidth,
                          height: visualHeight,
                          ...posStyle,
                          cursor: cursorMap[handle],
                          // Enlarge touch target to HANDLE_HIT_SIZE (44px)
                          padding: (HANDLE_HIT_SIZE - Math.min(visualWidth, visualHeight)) / 2,
                          margin: -(HANDLE_HIT_SIZE - Math.min(visualWidth, visualHeight)) / 2,
                          opacity: isSelected ? 1 : 0.6,
                          transition: "opacity 150ms ease",
                        }}
                        onMouseDown={(e) => handlePointerDown(e, room.id, "resize", handle)}
                        onTouchStart={(e) => handlePointerDown(e, room.id, "resize", handle)}
                        role="presentation"
                        aria-label={`Redimensionner ${room.name} depuis le ${ariaLabels[handle]}`}
                        tabIndex={-1}
                      >
                        <div
                          className={`w-full h-full bg-white border-2 shadow-sm ${isCorner ? "rounded-sm" : "rounded-[3px]"}`}
                          style={{ borderColor: brdColor }}
                        />
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
        {/* Zoom controls — bottom-right. Also: Ctrl+scroll or trackpad pinch to zoom */}
        <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-1" title="Ctrl+molette pour zoomer">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
            disabled={zoomLevel >= 3}
            className="w-10 h-10 rounded-md bg-white/90 border border-[#D1D0CB]/60
                       text-[#1C1C1E] text-lg font-medium shadow-sm
                       hover:bg-[#F5F5F0] transition-colors
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-[#7D9B76] min-w-[44px] min-h-[44px]
                       disabled:opacity-30 disabled:cursor-not-allowed
                       flex items-center justify-center"
            aria-label="Zoomer"
          >
            +
          </button>
          {zoomLevel !== 1 && (
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="text-[10px] text-center text-[#9B9A94] font-mono hover:text-[#7D9B76]
                         bg-white/90 border border-[#D1D0CB]/60 rounded px-1 py-0.5
                         transition-colors cursor-pointer"
              title="Réinitialiser le zoom à 100%"
              aria-label="Réinitialiser le zoom"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
          )}
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
            disabled={zoomLevel <= 0.5}
            className="w-10 h-10 rounded-md bg-white/90 border border-[#D1D0CB]/60
                       text-[#1C1C1E] text-lg font-medium shadow-sm
                       hover:bg-[#F5F5F0] transition-colors
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-[#7D9B76] min-w-[44px] min-h-[44px]
                       disabled:opacity-30 disabled:cursor-not-allowed
                       flex items-center justify-center"
            aria-label="Dézoomer"
          >
            −
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[#9B9A94]">
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm border"
            style={{
              backgroundColor: ROOM_COLORS.salon,
              borderColor: ROOM_BORDER_COLORS.salon,
            }}
            aria-hidden="true"
          />
          Salon
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm border"
            style={{
              backgroundColor: ROOM_COLORS.chambre,
              borderColor: ROOM_BORDER_COLORS.chambre,
            }}
            aria-hidden="true"
          />
          Chambre
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm border"
            style={{
              backgroundColor: ROOM_COLORS.cuisine,
              borderColor: ROOM_BORDER_COLORS.cuisine,
            }}
            aria-hidden="true"
          />
          Cuisine
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm border"
            style={{
              backgroundColor: ROOM_COLORS.sdb,
              borderColor: ROOM_BORDER_COLORS.sdb,
            }}
            aria-hidden="true"
          />
          SdB / WC
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm border"
            style={{
              backgroundColor: ROOM_COLORS.bureau,
              borderColor: ROOM_BORDER_COLORS.bureau,
            }}
            aria-hidden="true"
          />
          Bureau
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm border-2 border-dashed"
            style={{
              backgroundColor: ROOM_COLORS.salon.replace("0.3)", "0.4)"),
              borderColor: ROOM_BORDER_COLORS.salon,
            }}
            aria-hidden="true"
          />
          Pièce ajoutée (projet)
        </span>
      </div>

      {/* Surface warning */}
      <p className="text-[11px] text-[#C68A2E] bg-[#FFF8EE] border border-[#C68A2E]/20 rounded px-2 py-1.5 leading-relaxed">
        {isCalibrated
          ? "Échelle calibrée. Les surfaces sont des estimations basées sur votre calibration. Pour des surfaces exactes, utilisez les mesures de votre géomètre."
          : "Les surfaces sont indicatives et dépendent du calibrage du plan. Utilisez le bouton « Calibrer » pour améliorer la précision."}
      </p>

      {/* Calibration modal */}
      {showCalibrationModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelCalibration();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Calibration de l'échelle"
        >
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-w-sm w-full sm:mx-4 space-y-4">
            <h4 className="text-base font-semibold text-[#1C1C1E]">
              Calibrer l&apos;échelle
            </h4>
            <p className="text-sm text-[#9B9A94] leading-relaxed">
              Quelle est la distance réelle entre les 2 points que vous avez tracés ?
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={calibrationInput}
                onChange={(e) => setCalibrationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmCalibration();
                  if (e.key === "Escape") cancelCalibration();
                }}
                autoFocus
                placeholder="Ex : 0.83"
                className="flex-1 text-sm text-[#1C1C1E] bg-white border border-[#D1D0CB]
                           rounded-lg px-3 py-2 min-h-[44px]
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-[#7D9B76]"
                aria-label="Distance réelle en mètres"
              />
              <span className="text-sm text-[#9B9A94] font-medium">mètres</span>
            </div>
            <p className="text-[11px] text-[#9B9A94]">
              Astuce : une porte standard mesure 0,83 m de large, une baie vitrée entre 1,80 et 2,40 m.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={cancelCalibration}
                className="px-4 py-2 rounded-lg text-sm text-[#1C1C1E]/70
                           border border-[#D1D0CB]/60 hover:bg-[#F5F5F0]
                           transition-colors min-h-[44px]
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-[#7D9B76]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmCalibration}
                disabled={!calibrationInput || parseFloat(calibrationInput) <= 0}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white
                           bg-[#7D9B76] hover:bg-[#6B8A64] transition-colors
                           min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-[#7D9B76] focus-visible:ring-offset-1"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
