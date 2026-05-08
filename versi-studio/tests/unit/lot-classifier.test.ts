/* eslint-disable @typescript-eslint/no-unused-vars */
// FIXME(s34): constantes/imports de test gardés pour debug local — à nettoyer si vraiment inutiles.
/**
 * Tests unitaires Module 5 — Identification lots vs communs (s27).
 *
 * Fixtures : pièces synthétiques (Polygon[]) + OCR mocké via injection de
 * `ocrFn`. Pas d'appel Tesseract réel : reproductibilité + vitesse CI.
 *
 * Couvre :
 *   (a) "T3 RDC" + "Escalier" → 1 lot, 1 commun
 *   (b) "T2 R+1" + "T2 R+1" + "Palier" → 2 lots distincts (labels distincts) + 1 commun
 *       (Note : labels identiques string mais textuellement distincts pour 2 appartements
 *        en pratique → ici on teste avec labels différents "T2 R+1 A" / "T2 R+1 B".)
 *   (c) Pièces sans labels → INDETERMINE → tous LOT par défaut → 1 lot groupé
 *   (d) pageImageBuffer invalide → throw LotClassifierError
 */

import { describe, it, expect } from "vitest";
import {
  classifyRooms,
  LotClassifierError,
  type OcrFn,
  type OcrLabelLite,
} from "../../src/lib/vs/lot-classifier";
import type { Polygon } from "../../src/lib/vs/wall-graph";

// ─── Helpers fixtures ────────────────────────────────────────────

function makeRect(
  nodeBase: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Polygon {
  // 4 points distincts, mais on peut overlap les nodeIds quand on partage un mur.
  const points = [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
  const nodeIds = [nodeBase, nodeBase + 1, nodeBase + 2, nodeBase + 3];
  // Aire signée formule du lacet
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  const signedArea = sum / 2;
  return { nodeIds, points, signedArea, area: Math.abs(signedArea) };
}

/**
 * Fabrique 2 rectangles qui partagent un mur (adjacents).
 * Les nodeIds des coins partagés sont les mêmes ⇒ adjacence détectée.
 */
function makeAdjacentRects(
  x0: number,
  y0: number,
  xMid: number,
  x1: number,
  y1: number,
): [Polygon, Polygon] {
  // node ids :
  //   0 = (x0, y0), 1 = (xMid, y0), 2 = (xMid, y1), 3 = (x0, y1)
  //   4 = (x1, y0), 5 = (x1, y1)
  const left: Polygon = {
    nodeIds: [0, 1, 2, 3],
    points: [
      { x: x0, y: y0 },
      { x: xMid, y: y0 },
      { x: xMid, y: y1 },
      { x: x0, y: y1 },
    ],
    signedArea: 0,
    area: Math.abs((xMid - x0) * (y1 - y0)),
  };
  const right: Polygon = {
    nodeIds: [1, 4, 5, 2],
    points: [
      { x: xMid, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: xMid, y: y1 },
    ],
    signedArea: 0,
    area: Math.abs((x1 - xMid) * (y1 - y0)),
  };
  return [left, right];
}

function makeOcrFn(labels: OcrLabelLite[]): OcrFn {
  return async () => labels;
}

const DUMMY_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// ─── Tests ───────────────────────────────────────────────────────

describe("classifyRooms — Module 5 lots vs communs", () => {
  it("(a) 2 pièces 'T3 RDC' + 'Escalier' → 1 lot, 1 commun", async () => {
    const [left, right] = makeAdjacentRects(0, 0, 100, 200, 100);
    // left = T3 RDC (centroïde ~50, 50)  / right = Escalier (centroïde ~150, 50)
    const ocrFn = makeOcrFn([
      { text: "T3 RDC", x: 50, y: 50, confidence: 90 },
      { text: "Escalier", x: 150, y: 50, confidence: 90 },
    ]);
    const result = await classifyRooms([left, right], DUMMY_PNG, { ocrFn });

    expect(result.lots.length).toBe(1);
    expect(result.communs.length).toBe(1);
    expect(result.lots[0].label).toBe("T3 RDC");
    expect(result.lots[0].rooms.length).toBe(1);
    expect(result.classified[0].classification).toBe("LOT");
    expect(result.classified[1].classification).toBe("COMMUN");
  });

  it("(b) 'T2 R+1 A' + 'T2 R+1 B' (adjacents) + 'Palier' (séparé) → 2 lots, 1 commun", async () => {
    // 3 rectangles : 2 collés (T2 A et T2 B partagent un mur), palier à part.
    const [t2a, t2b] = makeAdjacentRects(0, 0, 100, 200, 100);
    // Palier : rectangle non adjacent (offset y).
    const palier: Polygon = {
      nodeIds: [10, 11, 12, 13],
      points: [
        { x: 0, y: 200 },
        { x: 100, y: 200 },
        { x: 100, y: 300 },
        { x: 0, y: 300 },
      ],
      signedArea: 0,
      area: 10000,
    };

    // Centroïdes :
    //   t2a = (50, 50), t2b = (150, 50), palier = (50, 250)
    const ocrFn = makeOcrFn([
      { text: "T2 R+1 A", x: 50, y: 50, confidence: 90 },
      { text: "T2 R+1 B", x: 150, y: 50, confidence: 90 },
      { text: "Palier", x: 50, y: 250, confidence: 90 },
    ]);

    const result = await classifyRooms(
      [t2a, t2b, palier],
      DUMMY_PNG,
      { ocrFn },
    );

    // 2 lots distincts (labels textuellement différents ⇒ pas d'union)
    expect(result.lots.length).toBe(2);
    expect(result.communs.length).toBe(1);
    const labels = result.lots.map((l) => l.label).sort();
    expect(labels).toEqual(["T2 R+1 A", "T2 R+1 B"]);
    // Palier classé COMMUN
    expect(result.classified[2].classification).toBe("COMMUN");
  });

  it("(c) Pièces sans labels OCR → INDETERMINE → tous LOT par défaut → 1 lot groupé", async () => {
    const [r1, r2] = makeAdjacentRects(0, 0, 100, 200, 100);
    const ocrFn = makeOcrFn([]); // aucun label trouvé

    const result = await classifyRooms([r1, r2], DUMMY_PNG, { ocrFn });

    // Sans labels → tous INDETERMINE → résolus en LOT (pas de voisin COMMUN).
    // Adjacents ET pas de labels distincts → union-find groupe les 2 → 1 lot.
    expect(result.lots.length).toBe(1);
    expect(result.lots[0].rooms.length).toBe(2);
    expect(result.communs.length).toBe(0);
    // Pas de label représentatif
    expect(result.lots[0].label).toBeUndefined();
    expect(result.lots[0].name).toBe("lot_1");
  });

  it("(d) pageImageBuffer invalide (vide) → throw LotClassifierError(ocr_failed)", async () => {
    const [r1] = makeAdjacentRects(0, 0, 100, 200, 100);
    const emptyBuffer = Buffer.alloc(0);
    await expect(
      classifyRooms([r1], emptyBuffer),
    ).rejects.toBeInstanceOf(LotClassifierError);
    try {
      await classifyRooms([r1], emptyBuffer);
    } catch (e) {
      expect(e).toBeInstanceOf(LotClassifierError);
      expect((e as LotClassifierError).code).toBe("ocr_failed");
    }
  });

  it("(e) rooms vide → throw LotClassifierError(no_rooms)", async () => {
    await expect(
      classifyRooms([], DUMMY_PNG),
    ).rejects.toBeInstanceOf(LotClassifierError);
    try {
      await classifyRooms([], DUMMY_PNG);
    } catch (e) {
      expect((e as LotClassifierError).code).toBe("no_rooms");
    }
  });
});
