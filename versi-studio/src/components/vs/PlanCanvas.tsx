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
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { VsLot, ZoneRect } from "@/lib/vs/types";
import { getLotColor } from "@/lib/vs/types";

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
  type: "move" | "resize";
  lotId: string;
  handle?: HandlePosition;
  startMouseX: number;
  startMouseY: number;
  startZone: ZoneRect;
}

interface PlanCanvasProps {
  planImageUrl: string | null;
  lots: VsLot[];
  selectedLotId: string | null;
  onSelectLot: (lotId: string | null) => void;
  onUpdateLotZone: (lotId: string, zone: ZoneRect) => void;
  lotIndexMap: Map<string, number>;
  m2PerPixel: number | null;
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

// ─── Helpers ──────────────────────────────────────────────────────

function parseZoneData(lot: VsLot): ZoneRect {
  const zd = lot.zone_data as unknown as ZoneRect;
  return {
    x_percent: zd.x_percent ?? 10,
    y_percent: zd.y_percent ?? 10,
    width_percent: zd.width_percent ?? 20,
    height_percent: zd.height_percent ?? 20,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function zonesOverlap(a: ZoneRect, b: ZoneRect): boolean {
  const aRight = a.x_percent + a.width_percent;
  const aBottom = a.y_percent + a.height_percent;
  const bRight = b.x_percent + b.width_percent;
  const bBottom = b.y_percent + b.height_percent;

  return (
    a.x_percent < bRight &&
    aRight > b.x_percent &&
    a.y_percent < bBottom &&
    aBottom > b.y_percent
  );
}

function getOverlappingLotIds(lots: VsLot[]): Set<string> {
  const overlapping = new Set<string>();
  for (let i = 0; i < lots.length; i++) {
    for (let j = i + 1; j < lots.length; j++) {
      const zoneA = parseZoneData(lots[i]);
      const zoneB = parseZoneData(lots[j]);
      if (lots[i].floor_number === lots[j].floor_number && zonesOverlap(zoneA, zoneB)) {
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
  lotIndexMap,
  m2PerPixel,
}: PlanCanvasProps) {
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

    // DESIGN-F06 à F09 : lecture des tokens CSS (fallback hex si non définis par Alpha)
    const styles = getComputedStyle(document.documentElement);
    const tokenErrorStrong = styles.getPropertyValue("--color-error-strong").trim() || "#B91C1C";
    const tokenTextDefault = styles.getPropertyValue("--color-text-default").trim() || "#0B0B0B";
    const tokenTextInverse = styles.getPropertyValue("--color-text-inverse").trim() || "#FFFFFF";
    const tokenBorderDefault = styles.getPropertyValue("--color-border-default").trim() || "#D9D4CE";
    const tokenInteractivePrimary = styles.getPropertyValue("--color-interactive-primary").trim() || "#0B0B0B";

    // Fond
    ctx.fillStyle = "#F7F5F2";
    ctx.fillRect(0, 0, w, h);

    // Image du plan
    if (imageRef.current && imageLoaded) {
      const img = imageRef.current;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = w / h;

      let drawW: number, drawH: number, drawX: number, drawY: number;
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
    } else if (!planImageUrl) {
      // Pas de plan
      ctx.fillStyle = tokenBorderDefault;
      ctx.font = "14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Aucun plan disponible", w / 2, h / 2);
    }

    // Dessiner les lots
    for (const lot of lots) {
      const zone = parseZoneData(lot);
      const index = lotIndexMap.get(lot.id) ?? 0;
      const color = getLotColor(index);
      const isSelected = lot.id === selectedLotId;
      const isHovered = lot.id === hoveredLotId;
      const isOverlapping = overlappingIds.has(lot.id);

      const x = (zone.x_percent / 100) * w;
      const y = (zone.y_percent / 100) * h;
      const lw = (zone.width_percent / 100) * w;
      const lh = (zone.height_percent / 100) * h;

      // Remplissage semi-transparent
      ctx.fillStyle = hexToRgba(color, LOT_OPACITY);
      ctx.fillRect(x, y, lw, lh);

      // Contour
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

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(x, y, lw, lh);

      // Label du lot
      ctx.fillStyle = tokenTextDefault;
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "left";
      const labelX = x + 6;
      const labelY = y + 18;
      // Fond du label (overlay translucide, pas un token)
      const textMetrics = ctx.measureText(lot.name);
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillRect(labelX - 2, labelY - 13, textMetrics.width + 4, 16);
      ctx.fillStyle = tokenTextDefault;
      ctx.fillText(lot.name, labelX, labelY);

      // Poignées de resize si sélectionné
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
  }, [lots, selectedLotId, hoveredLotId, imageLoaded, planImageUrl, lotIndexMap, overlappingIds]);

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

  function getCanvasCoords(e: ReactMouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { px: 0, py: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
    };
  }

  function toPercent(px: number, py: number): { xp: number; yp: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { xp: 0, yp: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      xp: (px / rect.width) * 100,
      yp: (py / rect.height) * 100,
    };
  }

  function hitTestHandle(
    px: number,
    py: number,
    lot: VsLot
  ): HandlePosition | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const zone = parseZoneData(lot);
    const x = (zone.x_percent / 100) * rect.width;
    const y = (zone.y_percent / 100) * rect.height;
    const w = (zone.width_percent / 100) * rect.width;
    const h = (zone.height_percent / 100) * rect.height;

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

  function hitTestLot(px: number, py: number): string | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    // Itérer en sens inverse pour que le lot le plus au-dessus soit sélectionné d'abord
    for (let i = lots.length - 1; i >= 0; i--) {
      const lot = lots[i];
      const zone = parseZoneData(lot);
      const x = (zone.x_percent / 100) * rect.width;
      const y = (zone.y_percent / 100) * rect.height;
      const w = (zone.width_percent / 100) * rect.width;
      const h = (zone.height_percent / 100) * rect.height;

      if (px >= x && px <= x + w && py >= y && py <= y + h) {
        return lot.id;
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

  // ─── Events souris ────────────────────────────────────────────
  // NOTE : handleMouseDown/handleMouseMove utilisent des helpers déclarés dans le
  // composant (hitTestLot, hitTestHandle, getCanvasCoords). React Compiler gère
  // automatiquement la memoization — pas besoin de useCallback manuel qui créerait
  // un mismatch de dépendances inférées.

  const handleMouseDown = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const { px, py } = getCanvasCoords(e);

    // Vérifier d'abord les poignées du lot sélectionné
    if (selectedLotId) {
      const selectedLot = lots.find((l) => l.id === selectedLotId);
      if (selectedLot) {
        const handle = hitTestHandle(px, py, selectedLot);
        if (handle) {
          dragRef.current = {
            type: "resize",
            lotId: selectedLotId,
            handle,
            startMouseX: px,
            startMouseY: py,
            startZone: parseZoneData(selectedLot),
          };
          return;
        }
      }
    }

    // Vérifier si on clique sur un lot
    const hitLotId = hitTestLot(px, py);
    if (hitLotId) {
      onSelectLot(hitLotId);
      const hitLot = lots.find((l) => l.id === hitLotId);
      if (hitLot) {
        dragRef.current = {
          type: "move",
          lotId: hitLotId,
          startMouseX: px,
          startMouseY: py,
          startZone: parseZoneData(hitLot),
        };
      }
    } else {
      onSelectLot(null);
    }
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const { px, py } = getCanvasCoords(e);
    const canvas = canvasRef.current;

    if (dragRef.current && canvas) {
      const { type, lotId, handle, startMouseX, startMouseY, startZone } =
        dragRef.current;
      const rect = canvas.getBoundingClientRect();
      const dxPercent = ((px - startMouseX) / rect.width) * 100;
      const dyPercent = ((py - startMouseY) / rect.height) * 100;

      let newZone: ZoneRect;

      if (type === "move") {
        newZone = {
          x_percent: clamp(startZone.x_percent + dxPercent, 0, 100 - startZone.width_percent),
          y_percent: clamp(startZone.y_percent + dyPercent, 0, 100 - startZone.height_percent),
          width_percent: startZone.width_percent,
          height_percent: startZone.height_percent,
        };
      } else {
        newZone = computeResize(startZone, handle!, dxPercent, dyPercent);
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
        const widthPx = (newZone.width_percent / 100) * canvasRect.width;
        const heightPx = (newZone.height_percent / 100) * canvasRect.height;
        const label =
          m2PerPixel != null && m2PerPixel > 0
            ? `${(widthPx * heightPx * m2PerPixel).toFixed(1)} m²`
            : "— m²";
        const lotRightPx =
          ((newZone.x_percent + newZone.width_percent) / 100) * canvasRect.width;
        const lotBottomPx =
          ((newZone.y_percent + newZone.height_percent) / 100) * canvasRect.height;
        const offsetX = canvasRect.left - containerRect.left;
        const offsetY = canvasRect.top - containerRect.top;
        let overlayX = offsetX + lotRightPx + 12;
        const overlayY = offsetY + lotBottomPx - 28;
        if (overlayX + 80 > containerRect.width) {
          overlayX = offsetX + (newZone.x_percent / 100) * canvasRect.width - 84;
        }
        setSurfaceOverlay({ x: overlayX, y: overlayY, label, visible: true });
      });
      return;
    }

    // Hover
    if (selectedLotId) {
      const selectedLot = lots.find((l) => l.id === selectedLotId);
      if (selectedLot) {
        const handle = hitTestHandle(px, py, selectedLot);
        if (handle) {
          if (canvas) canvas.style.cursor = getCursor(handle, false);
          setHoveredLotId(null);
          return;
        }
      }
    }

    const hitLotId = hitTestLot(px, py);
    setHoveredLotId(hitLotId);
    if (canvas) canvas.style.cursor = getCursor(null, !!hitLotId);
  };

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    setSurfaceOverlay(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null;
    setHoveredLotId(null);
    setSurfaceOverlay(null);
  }, []);

  // ─── Clavier (DESIGN-F11 accessibilité canvas) ────────────────

  const handleCanvasKeyDown = useCallback((e: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (!selectedLotId) return;
    const lot = lots.find((l) => l.id === selectedLotId);
    if (!lot) return;
    const zone = parseZoneData(lot);
    const step = e.shiftKey ? 5 : 1;
    let { x_percent, y_percent } = zone;
    const { width_percent, height_percent } = zone;
    let changed = false;
    if (e.key === "ArrowUp") { y_percent = Math.max(0, y_percent - step); changed = true; }
    else if (e.key === "ArrowDown") { y_percent = Math.min(100 - height_percent, y_percent + step); changed = true; }
    else if (e.key === "ArrowLeft") { x_percent = Math.max(0, x_percent - step); changed = true; }
    else if (e.key === "ArrowRight") { x_percent = Math.min(100 - width_percent, x_percent + step); changed = true; }
    if (changed) {
      e.preventDefault();
      onUpdateLotZone(lot.id, { x_percent, y_percent, width_percent, height_percent });
    }
  }, [selectedLotId, lots, onUpdateLotZone]);

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
        onKeyDown={handleCanvasKeyDown}
        tabIndex={0}
        role="application"
        aria-label="Éditeur de plan — flèches directionnelles pour déplacer le lot sélectionné, Tab pour cycler entre les lots"
        className="absolute inset-0 block w-full h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)]"
      />
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
