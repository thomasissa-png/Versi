/**
 * Tests unitaires — helpers UI placement photos (s30 Vague 3a + s32 fix BUG 1)
 *
 * Couvre :
 *  - screenToNormalized / normalizedToScreen (réversibilité)
 *  - findRoomAtPoint (hit-test polygones)
 *  - getPolygonBounds (bbox pour zoom auto)
 *  - computeRoomZoom (P0 fix GP5 — zoom 80% viewport, signature lot-aware s32)
 *  - computeRenderLayout / screenToLotLocal / lotLocalToScreen
 *    (s32 fix BUG 1 — letterbox + lot-local→plan-global)
 *  - lotLocalToPlanGlobalPercent / planGlobalToLotLocalPercent (réversibilité)
 */

import { describe, it, expect } from "vitest";
import {
  screenToNormalized,
  normalizedToScreen,
  findRoomAtPoint,
  getPolygonBounds,
  computeRoomZoom,
  computeRenderLayout,
  screenToLotLocal,
  lotLocalToScreen,
  lotLocalToPlanGlobalPercent,
  planGlobalToLotLocalPercent,
  type CanvasViewport,
  type NormalizedPoint,
} from "@/lib/vs/ui/photo-placement";
import type { VsRoom, ZoneRect } from "@/lib/vs/types";

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

describe("computeRoomZoom — P0 fix GP5 audit Thomas s29 (signature lot-aware s32)", () => {
  // Setup : container 800×600, image plan 800×600 (ratio identique → renderLayout
  // = full container), lot couvre 100% du plan (cas trivial étape 4 mono-lot).
  const container = { width: 800, height: 600 };
  const layout = computeRenderLayout(800, 600, 800, 600);
  const fullLotZone: ZoneRect = {
    x_percent: 0,
    y_percent: 0,
    width_percent: 100,
    height_percent: 100,
  };

  const room = makeRoom("zoom-test", [
    { x_percent: 40, y_percent: 40 },
    { x_percent: 60, y_percent: 40 },
    { x_percent: 60, y_percent: 60 },
    { x_percent: 40, y_percent: 60 },
  ]);

  it("retourne un zoom > 1 pour qu'une petite pièce occupe le viewport", () => {
    const z = computeRoomZoom(room, container, layout, fullLotZone, 0.8);
    expect(z).not.toBeNull();
    expect(z!.scale).toBeGreaterThan(1);
  });

  it("centre la pièce dans le viewport", () => {
    const z = computeRoomZoom(room, container, layout, fullLotZone, 0.8);
    expect(z).not.toBeNull();
    // Centre pièce = (50%, 50%) du plan = (400, 300) en pixels logique.
    // Après transform : centerScreen = centerLogical * scale + offset = container/2
    const centerX = 0.5 * 800 * z!.scale + z!.offsetX;
    const centerY = 0.5 * 600 * z!.scale + z!.offsetY;
    expect(centerX).toBeCloseTo(400, 1);
    expect(centerY).toBeCloseTo(300, 1);
  });

  it("retourne null si la pièce n'a pas de polygon valide", () => {
    const broken = makeRoom("broken", []);
    expect(computeRoomZoom(broken, container, layout, fullLotZone)).toBeNull();
  });

  it("clamp scale entre 0.5 et 4", () => {
    const tiny = makeRoom("tiny", [
      { x_percent: 49, y_percent: 49 },
      { x_percent: 50, y_percent: 49 },
      { x_percent: 50, y_percent: 50 },
      { x_percent: 49, y_percent: 50 },
    ]);
    const z = computeRoomZoom(tiny, container, layout, fullLotZone, 0.8);
    expect(z!.scale).toBeLessThanOrEqual(4);
  });

  it("respecte un lot partiel (le polygone lot-local est rapporté à la sous-zone)", () => {
    // Lot occupe le quart bas-droit (50,50,50,50). Polygone pièce lot-local
    // (40,40)-(60,60) → en plan-global = (50+0.4*50, 50+0.4*50) = (70,70) à (80,80)
    // = pièce de 10% × 10% au centre du quart bas-droit.
    const partialLot: ZoneRect = {
      x_percent: 50,
      y_percent: 50,
      width_percent: 50,
      height_percent: 50,
    };
    const z = computeRoomZoom(room, container, layout, partialLot, 0.8);
    expect(z).not.toBeNull();
    // Centre pièce en pixels plan = (75% × 800, 75% × 600) = (600, 450)
    // Après transform : centerScreen = centerLogical * scale + offset = container/2
    const centerScreenX = 600 * z!.scale + z!.offsetX;
    const centerScreenY = 450 * z!.scale + z!.offsetY;
    expect(centerScreenX).toBeCloseTo(400, 1);
    expect(centerScreenY).toBeCloseTo(300, 1);
  });
});

// ─── computeRenderLayout (s32 fix BUG 1) ──────────────────────────

describe("computeRenderLayout — letterbox/pillarbox", () => {
  it("renvoie identité si ratios container et image identiques", () => {
    const r = computeRenderLayout(800, 600, 800, 600);
    expect(r).toEqual({ renderW: 800, renderH: 600, offsetX: 0, offsetY: 0 });
  });

  it("letterbox horizontal si image plus large que container (image 2:1, container 4:3)", () => {
    // image 1600×800 (ratio 2), container 800×600 (ratio 1.33). srcRatio > dstRatio
    // → renderW = 800, renderH = 800/2 = 400, offsetY = (600-400)/2 = 100
    const r = computeRenderLayout(800, 600, 1600, 800);
    expect(r.renderW).toBe(800);
    expect(r.renderH).toBe(400);
    expect(r.offsetX).toBe(0);
    expect(r.offsetY).toBe(100);
  });

  it("pillarbox vertical si image plus haute que container", () => {
    // image 600×1200 (ratio 0.5), container 800×600 (ratio 1.33). srcRatio < dstRatio
    // → renderH = 600, renderW = 600 * 0.5 = 300, offsetX = (800-300)/2 = 250
    const r = computeRenderLayout(800, 600, 600, 1200);
    expect(r.renderH).toBe(600);
    expect(r.renderW).toBe(300);
    expect(r.offsetX).toBe(250);
    expect(r.offsetY).toBe(0);
  });

  it("retourne fallback safe pour dimensions invalides", () => {
    expect(computeRenderLayout(0, 0, 100, 100)).toEqual({
      renderW: 0,
      renderH: 0,
      offsetX: 0,
      offsetY: 0,
    });
    expect(computeRenderLayout(800, 600, 0, 0)).toEqual({
      renderW: 800,
      renderH: 600,
      offsetX: 0,
      offsetY: 0,
    });
  });
});

// ─── lotLocalToPlanGlobalPercent / planGlobalToLotLocalPercent ────

describe("lotLocal ↔ planGlobal percent conversions", () => {
  it("0% lot-local = lot.start", () => {
    expect(lotLocalToPlanGlobalPercent(0, 25, 50)).toBe(25);
  });

  it("100% lot-local = lot.start + lot.size", () => {
    expect(lotLocalToPlanGlobalPercent(100, 25, 50)).toBe(75);
  });

  it("est réversible avec planGlobalToLotLocalPercent", () => {
    const lotStart = 30;
    const lotSize = 40;
    for (const lotPct of [0, 25, 50, 75, 100]) {
      const global = lotLocalToPlanGlobalPercent(lotPct, lotStart, lotSize);
      const back = planGlobalToLotLocalPercent(global, lotStart, lotSize);
      expect(back).toBeCloseTo(lotPct, 5);
    }
  });

  it("planGlobalToLotLocalPercent retourne 0 si lotSize = 0", () => {
    expect(planGlobalToLotLocalPercent(50, 25, 0)).toBe(0);
  });
});

// ─── screenToLotLocal / lotLocalToScreen (réversibilité) ──────────

describe("screenToLotLocal ↔ lotLocalToScreen — fix BUG 1 polygones débordants", () => {
  // Container 1000×800, image plan 800×600 (letterbox), lot occupe quart bas-droit.
  const layout = computeRenderLayout(1000, 800, 800, 600);
  const lotZone: ZoneRect = {
    x_percent: 50,
    y_percent: 50,
    width_percent: 50,
    height_percent: 50,
  };
  const viewport = { offsetX: 0, offsetY: 0, scale: 1 };

  it("est réversible (round-trip)", () => {
    for (const point of [
      { x: 0.0, y: 0.0 },
      { x: 0.25, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 1.0, y: 1.0 },
    ]) {
      const screen = lotLocalToScreen(point, layout, viewport, lotZone);
      const back = screenToLotLocal(screen.x, screen.y, layout, viewport, lotZone);
      expect(back.x).toBeCloseTo(point.x, 4);
      expect(back.y).toBeCloseTo(point.y, 4);
    }
  });

  it("(0,0) lot-local tombe au coin haut-gauche du lot dans le plan", () => {
    // Lot commence à (50%, 50%) du plan. Plan en letterbox : layout valeurs.
    // (0,0) lot-local → plan global (50%,50%) → pixel logique (0.5*renderW + offsetX)
    const screen = lotLocalToScreen({ x: 0, y: 0 }, layout, viewport, lotZone);
    // Avec image 800×600 dans container 1000×800 :
    // srcRatio = 800/600 = 1.33, dstRatio = 1000/800 = 1.25. srcRatio > dstRatio → renderW=1000, renderH=750, offsetY=25
    expect(layout.renderW).toBe(1000);
    expect(layout.renderH).toBe(750);
    expect(layout.offsetX).toBe(0);
    expect(layout.offsetY).toBe(25);
    // (0,0) lot-local → 50% global → pixel logique = (500, 0.5*750 + 25) = (500, 400)
    expect(screen.x).toBeCloseTo(500, 1);
    expect(screen.y).toBeCloseTo(400, 1);
  });

  it("respecte le viewport scale + pan", () => {
    const v = { offsetX: 100, offsetY: 50, scale: 2 };
    const point = { x: 0.5, y: 0.5 };
    const screen = lotLocalToScreen(point, layout, v, lotZone);
    const back = screenToLotLocal(screen.x, screen.y, layout, v, lotZone);
    expect(back.x).toBeCloseTo(point.x, 4);
    expect(back.y).toBeCloseTo(point.y, 4);
  });
});
