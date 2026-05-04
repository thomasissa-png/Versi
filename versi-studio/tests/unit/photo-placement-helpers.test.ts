/**
 * Tests unitaires — helpers UI placement photos (s30 Vague 3a)
 *
 * Couvre :
 *  - screenToNormalized / normalizedToScreen (réversibilité)
 *  - findRoomAtPoint (hit-test polygones)
 *  - getPolygonBounds (bbox pour zoom auto)
 *  - computeRoomZoom (P0 fix GP5 — zoom 80% viewport)
 */

import { describe, it, expect } from "vitest";
import {
  screenToNormalized,
  normalizedToScreen,
  findRoomAtPoint,
  getPolygonBounds,
  computeRoomZoom,
  type CanvasViewport,
  type NormalizedPoint,
} from "@/lib/vs/ui/photo-placement";
import type { VsRoom } from "@/lib/vs/types";

// ─── Fixtures ─────────────────────────────────────────────────────

function makeRoom(
  id: string,
  polygon: Array<{ x_percent: number; y_percent: number }>
): VsRoom {
  return {
    id,
    lot_id: "lot-1",
    plan_id: "plan-1",
    name: `room-${id}`,
    room_type: "salon",
    custom_label: null,
    surface_m2: 12,
    position: null,
    polygon,
    touched: false,
    status: "validated",
    source: "ai",
    created_at: new Date().toISOString(),
  };
}

// ─── screenToNormalized / normalizedToScreen ──────────────────────

describe("screenToNormalized / normalizedToScreen", () => {
  const viewport: CanvasViewport = {
    width: 1000,
    height: 800,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  };

  it("convertit un clic au centre du canvas en (0.5, 0.5)", () => {
    const p = screenToNormalized(500, 400, viewport);
    expect(p.x).toBeCloseTo(0.5, 5);
    expect(p.y).toBeCloseTo(0.5, 5);
  });

  it("clamp les coords hors-canvas dans [0, 1]", () => {
    expect(screenToNormalized(-50, -50, viewport)).toEqual({ x: 0, y: 0 });
    expect(screenToNormalized(1500, 1500, viewport)).toEqual({ x: 1, y: 1 });
  });

  it("est réversible avec normalizedToScreen", () => {
    const point: NormalizedPoint = { x: 0.3, y: 0.7 };
    const screen = normalizedToScreen(point, viewport);
    const back = screenToNormalized(screen.x, screen.y, viewport);
    expect(back.x).toBeCloseTo(point.x, 5);
    expect(back.y).toBeCloseTo(point.y, 5);
  });

  it("respecte le scale et l'offset", () => {
    const v: CanvasViewport = {
      width: 1000,
      height: 800,
      offsetX: 100,
      offsetY: 80,
      scale: 2,
    };
    // (clientX=600, clientY=480) -> (600-100)/(1000*2) = 0.25, (480-80)/(800*2) = 0.25
    const p = screenToNormalized(600, 480, v);
    expect(p.x).toBeCloseTo(0.25, 5);
    expect(p.y).toBeCloseTo(0.25, 5);
  });
});

// ─── findRoomAtPoint ───────────────────────────────────────────────

describe("findRoomAtPoint", () => {
  // 2 pièces non chevauchantes
  const roomA = makeRoom("A", [
    { x_percent: 10, y_percent: 10 },
    { x_percent: 40, y_percent: 10 },
    { x_percent: 40, y_percent: 40 },
    { x_percent: 10, y_percent: 40 },
  ]);
  const roomB = makeRoom("B", [
    { x_percent: 50, y_percent: 50 },
    { x_percent: 80, y_percent: 50 },
    { x_percent: 80, y_percent: 80 },
    { x_percent: 50, y_percent: 80 },
  ]);

  it("retourne la pièce contenant le point", () => {
    const r = findRoomAtPoint({ x: 0.25, y: 0.25 }, [roomA, roomB]);
    expect(r?.id).toBe("A");
  });

  it("retourne null si aucun polygone ne contient le point", () => {
    const r = findRoomAtPoint({ x: 0.45, y: 0.05 }, [roomA, roomB]);
    expect(r).toBeNull();
  });

  it("ignore les pièces sans polygon valide", () => {
    const broken = makeRoom("X", []);
    const r = findRoomAtPoint({ x: 0.25, y: 0.25 }, [broken, roomA]);
    expect(r?.id).toBe("A");
  });

  it("résout les overlaps en choisissant le centroïde le plus proche (EC-1)", () => {
    const overlap1 = makeRoom("O1", [
      { x_percent: 0, y_percent: 0 },
      { x_percent: 60, y_percent: 0 },
      { x_percent: 60, y_percent: 60 },
      { x_percent: 0, y_percent: 60 },
    ]);
    const overlap2 = makeRoom("O2", [
      { x_percent: 20, y_percent: 20 },
      { x_percent: 80, y_percent: 20 },
      { x_percent: 80, y_percent: 80 },
      { x_percent: 20, y_percent: 80 },
    ]);
    // Point (0.45, 0.45) est dans les 2. Centroïdes : O1=(30,30), O2=(50,50).
    // Distance O1: sqrt((45-30)²+(45-30)²)=21.2 ; O2: sqrt(5²+5²)=7.07 → O2 gagne
    const r = findRoomAtPoint({ x: 0.45, y: 0.45 }, [overlap1, overlap2]);
    expect(r?.id).toBe("O2");
  });
});

// ─── getPolygonBounds ──────────────────────────────────────────────

describe("getPolygonBounds", () => {
  it("calcule les bounds correctement", () => {
    const b = getPolygonBounds([
      { x_percent: 10, y_percent: 20 },
      { x_percent: 50, y_percent: 20 },
      { x_percent: 50, y_percent: 60 },
      { x_percent: 10, y_percent: 60 },
    ]);
    expect(b.minX).toBe(10);
    expect(b.minY).toBe(20);
    expect(b.maxX).toBe(50);
    expect(b.maxY).toBe(60);
    expect(b.width).toBe(40);
    expect(b.height).toBe(40);
  });

  it("retourne un fallback safe pour polygone vide", () => {
    const b = getPolygonBounds([]);
    expect(b.width).toBe(100);
    expect(b.height).toBe(100);
  });
});

// ─── computeRoomZoom (P0 fix GP5) ──────────────────────────────────

describe("computeRoomZoom — P0 fix GP5 audit Thomas s29", () => {
  const room = makeRoom("zoom-test", [
    { x_percent: 40, y_percent: 40 },
    { x_percent: 60, y_percent: 40 },
    { x_percent: 60, y_percent: 60 },
    { x_percent: 40, y_percent: 60 },
  ]);

  it("retourne un zoom > 1 pour qu'une petite pièce occupe le viewport", () => {
    const z = computeRoomZoom(room, { width: 800, height: 600 }, 0.8);
    expect(z).not.toBeNull();
    expect(z!.scale).toBeGreaterThan(1);
  });

  it("centre la pièce dans le viewport", () => {
    const z = computeRoomZoom(room, { width: 800, height: 600 }, 0.8);
    expect(z).not.toBeNull();
    // Centre pièce = (50%, 50%) = (400, 300) après scale, doit être au centre viewport.
    // viewport.width/2 = 400, donc offsetX = 400 - 0.5 * 800 * scale = 400 - 400*scale
    // -> centre pièce dans viewport = offsetX + 0.5*800*scale = 400 ✓
    const centerX = z!.offsetX + 0.5 * 800 * z!.scale;
    const centerY = z!.offsetY + 0.5 * 600 * z!.scale;
    expect(centerX).toBeCloseTo(400, 1);
    expect(centerY).toBeCloseTo(300, 1);
  });

  it("retourne null si la pièce n'a pas de polygon valide", () => {
    const broken = makeRoom("broken", []);
    expect(computeRoomZoom(broken, { width: 800, height: 600 })).toBeNull();
  });

  it("clamp scale entre 0.5 et 4", () => {
    // Pièce micro (1% × 1%) : scaleX = 0.8 / 0.01 = 80 → clamp à 4
    const tiny = makeRoom("tiny", [
      { x_percent: 49, y_percent: 49 },
      { x_percent: 50, y_percent: 49 },
      { x_percent: 50, y_percent: 50 },
      { x_percent: 49, y_percent: 50 },
    ]);
    const z = computeRoomZoom(tiny, { width: 800, height: 600 }, 0.8);
    expect(z!.scale).toBeLessThanOrEqual(4);
  });
});
