/**
 * Tests unitaires — clustering.ts (5 helpers)
 *
 * versi-s21 itération 2 — Bundle C (I4)
 * Couvre : clusterByUnit, generateLotName, computeEnvelopeBbox,
 *          countHabitableRooms, computeAvgX
 *
 * ≥ 20 cas : cas nominaux + edge cases U2/I1/I2/I3/I10 identifiés
 * par l'audit QA itération 1.
 */

import { describe, it, expect } from "vitest";
import {
  clusterByUnit,
  generateLotName,
  computeEnvelopeBbox,
  countHabitableRooms,
  computeAvgX,
  CLUSTERING_CONFIDENCE_THRESHOLD,
} from "../../src/lib/vs/clustering";
import type { ExtractedRoom } from "../../src/lib/vs/schemas";

// ─── Fixture factory ─────────────────────────────────────────────

/**
 * Crée une ExtractedRoom minimale avec des valeurs par défaut sensées.
 * Les overrides permettent de cibler un seul champ par test.
 */
function makeRoom(overrides: Partial<ExtractedRoom> = {}): ExtractedRoom {
  return {
    temp_id: "r1",
    name_raw: "Séjour",
    surface_m2: 20,
    dimensions: null,
    ceiling_height_m: null,
    windows_count: 1,
    doors_count: 1,
    floor: 0,
    confidence: 0.9,
    shape: null,
    notes: null,
    bounding_box: {
      x_percent: 10,
      y_percent: 10,
      width_percent: 30,
      height_percent: 25,
    },
    unit_id: "u1",
    bounding_polygon: null,
    ...overrides,
  };
}

// ─── clusterByUnit ───────────────────────────────────────────────

describe("clusterByUnit", () => {
  it("groupe 2 pièces avec même (floor, unit_id) en 1 groupe", () => {
    const rooms = [
      makeRoom({ temp_id: "r1", name_raw: "Séjour" }),
      makeRoom({ temp_id: "r2", name_raw: "Chambre" }),
    ];
    const { accepted } = clusterByUnit(rooms, 0.7);
    expect(accepted).toHaveLength(1);
    expect(accepted[0].rooms).toHaveLength(2);
    expect(accepted[0].floor).toBe(0);
    expect(accepted[0].unitId).toBe("u1");
  });

  it("sépare en 2 groupes si floor différent, unit_id identique", () => {
    const rooms = [
      makeRoom({ temp_id: "r1", floor: 0, unit_id: "u1" }),
      makeRoom({ temp_id: "r2", floor: 0, unit_id: "u1" }),
      makeRoom({ temp_id: "r3", floor: 1, unit_id: "u1" }),
      makeRoom({ temp_id: "r4", floor: 1, unit_id: "u1" }),
    ];
    const { accepted } = clusterByUnit(rooms, 0.7);
    expect(accepted).toHaveLength(2);
    const floors = accepted.map((g) => g.floor).sort();
    expect(floors).toEqual([0, 1]);
  });

  it("ignore les pièces avec unit_id = null", () => {
    const rooms = [
      makeRoom({ temp_id: "r1", unit_id: null }),
      makeRoom({ temp_id: "r2", unit_id: "u1" }),
      makeRoom({ temp_id: "r3", unit_id: "u1" }),
    ];
    const { accepted } = clusterByUnit(rooms, 0.7);
    expect(accepted).toHaveLength(1);
    expect(accepted[0].rooms).toHaveLength(2);
  });

  it("ignore les pièces avec floor = null", () => {
    const rooms = [
      makeRoom({ temp_id: "r1", floor: null, unit_id: "u1" }),
      makeRoom({ temp_id: "r2", floor: 0, unit_id: "u1" }),
      makeRoom({ temp_id: "r3", floor: 0, unit_id: "u1" }),
    ];
    const { accepted } = clusterByUnit(rooms, 0.7);
    expect(accepted).toHaveLength(1);
    expect(accepted[0].rooms).toHaveLength(2);
  });

  it("rejette un groupe dont la confiance moyenne < seuil", () => {
    const rooms = [
      makeRoom({ temp_id: "r1", confidence: 0.5 }),
      makeRoom({ temp_id: "r2", confidence: 0.7 }),
    ];
    // avg = 0.6 < seuil 0.7
    const { accepted, candidateCount } = clusterByUnit(rooms, 0.7);
    expect(accepted).toHaveLength(0);
    expect(candidateCount).toBe(1);
  });

  it("rejette un groupe dont confidenceMin < 0.5 même si avg >= seuil", () => {
    // avg = (0.4 + 1.0) / 2 = 0.7, mais min = 0.4 < 0.5
    const rooms = [
      makeRoom({ temp_id: "r1", confidence: 0.4 }),
      makeRoom({ temp_id: "r2", confidence: 1.0 }),
    ];
    const { accepted } = clusterByUnit(rooms, 0.7);
    expect(accepted).toHaveLength(0);
  });

  it("rejette un groupe de 1 pièce non-studio (≥ 2 pièces exigé)", () => {
    const rooms = [makeRoom({ temp_id: "r1", name_raw: "Chambre" })];
    const { accepted } = clusterByUnit(rooms, 0.7);
    expect(accepted).toHaveLength(0);
  });

  it("accepte un groupe de 1 pièce si name_raw contient 'Studio' (I10)", () => {
    const rooms = [makeRoom({ temp_id: "r1", name_raw: "Studio" })];
    const { accepted } = clusterByUnit(rooms, 0.7);
    expect(accepted).toHaveLength(1);
    expect(accepted[0].rooms).toHaveLength(1);
  });

  it("accepte un groupe de 1 pièce si name_raw contient 'T1' (I10)", () => {
    const rooms = [makeRoom({ temp_id: "r1", name_raw: "T1" })];
    const { accepted } = clusterByUnit(rooms, 0.7);
    expect(accepted).toHaveLength(1);
  });

  it("gère unit_id contenant '::' sans split incorrect (I1)", () => {
    const rooms = [
      makeRoom({ temp_id: "r1", unit_id: "A::B" }),
      makeRoom({ temp_id: "r2", unit_id: "A::B" }),
    ];
    const { accepted } = clusterByUnit(rooms, 0.7);
    expect(accepted).toHaveLength(1);
    expect(accepted[0].unitId).toBe("A::B");
    expect(accepted[0].rooms).toHaveLength(2);
  });

  it("retourne candidateCount incluant les groupes rejetés", () => {
    const rooms = [
      // Groupe 1 : u1, floor 0, confiance haute → accepté
      makeRoom({ temp_id: "r1", unit_id: "u1", floor: 0, confidence: 0.9 }),
      makeRoom({ temp_id: "r2", unit_id: "u1", floor: 0, confidence: 0.9 }),
      // Groupe 2 : u2, floor 0, confiance basse → rejeté
      makeRoom({ temp_id: "r3", unit_id: "u2", floor: 0, confidence: 0.3 }),
      makeRoom({ temp_id: "r4", unit_id: "u2", floor: 0, confidence: 0.4 }),
    ];
    const { accepted, candidateCount } = clusterByUnit(rooms, 0.7);
    expect(candidateCount).toBe(2);
    expect(accepted).toHaveLength(1);
  });

  it("exporte CLUSTERING_CONFIDENCE_THRESHOLD = 0.7", () => {
    expect(CLUSTERING_CONFIDENCE_THRESHOLD).toBe(0.7);
  });
});

// ─── generateLotName ─────────────────────────────────────────────

describe("generateLotName", () => {
  it("3 pièces habitables sur RDC → 'T3 RDC'", () => {
    const result = generateLotName(3, 0, 0, 1, 50);
    expect(result).toBe("T3 RDC");
  });

  it("1 seule pièce habitable → 'Studio'", () => {
    const result = generateLotName(1, 0, 0, 1, 50);
    expect(result).toBe("Studio RDC");
  });

  it("0 pièce habitable → 'Lot'", () => {
    const result = generateLotName(0, 0, 0, 1, 50);
    expect(result).toBe("Lot RDC");
  });

  it("floor 2 → 'Étage 2'", () => {
    const result = generateLotName(2, 2, 0, 1, 50);
    expect(result).toBe("T2 Étage 2");
  });

  it("2 lots même étage : gauche (avgX=20) et droite (avgX=75)", () => {
    const left = generateLotName(2, 0, 0, 2, 20);
    const right = generateLotName(2, 0, 1, 2, 75);
    expect(left).toBe("T2 RDC gauche");
    expect(right).toBe("T2 RDC droite");
  });

  it("3+ lots même étage : numérotation #1, #2, #3 par position X (I2)", () => {
    const lot1 = generateLotName(2, 0, 0, 3, 10);
    const lot2 = generateLotName(2, 0, 1, 3, 50);
    const lot3 = generateLotName(2, 0, 2, 3, 85);
    expect(lot1).toBe("T2 RDC #1");
    expect(lot2).toBe("T2 RDC #2");
    expect(lot3).toBe("T2 RDC #3");
  });
});

// ─── computeEnvelopeBbox ─────────────────────────────────────────

describe("computeEnvelopeBbox", () => {
  it("calcule l'enveloppe englobante de 2 rooms avec bbox", () => {
    const rooms = [
      makeRoom({
        temp_id: "r1",
        bounding_box: { x_percent: 10, y_percent: 20, width_percent: 30, height_percent: 25 },
      }),
      makeRoom({
        temp_id: "r2",
        bounding_box: { x_percent: 50, y_percent: 10, width_percent: 20, height_percent: 40 },
      }),
    ];
    const bbox = computeEnvelopeBbox(rooms);
    expect(bbox.x_percent).toBe(10);
    expect(bbox.y_percent).toBe(10);
    expect(bbox.width_percent).toBe(60); // max(10+30, 50+20) - min(10, 50) = 70 - 10
    expect(bbox.height_percent).toBe(40); // max(20+25, 10+40) - min(20, 10) = 50 - 10
  });

  it("retourne fallback plein cadre si aucune room n'a de bbox (I3)", () => {
    const rooms = [
      makeRoom({ temp_id: "r1", bounding_box: null }),
      makeRoom({ temp_id: "r2", bounding_box: null }),
    ];
    const bbox = computeEnvelopeBbox(rooms);
    expect(bbox).toEqual({
      type: "rect",
      x_percent: 0,
      y_percent: 0,
      width_percent: 100,
      height_percent: 100,
    });
  });

  it("gère correctement une seule room avec bbox", () => {
    const rooms = [
      makeRoom({
        temp_id: "r1",
        bounding_box: { x_percent: 5, y_percent: 5, width_percent: 40, height_percent: 30 },
      }),
    ];
    const bbox = computeEnvelopeBbox(rooms);
    expect(bbox.x_percent).toBe(5);
    expect(bbox.y_percent).toBe(5);
    expect(bbox.width_percent).toBe(40);
    expect(bbox.height_percent).toBe(30);
  });
});

// ─── countHabitableRooms ─────────────────────────────────────────

describe("countHabitableRooms", () => {
  it("compte Séjour et Chambre comme habitables → 2", () => {
    const rooms = [
      makeRoom({ temp_id: "r1", name_raw: "Séjour" }),
      makeRoom({ temp_id: "r2", name_raw: "Chambre" }),
    ];
    expect(countHabitableRooms(rooms)).toBe(2);
  });

  it("exclut WC, SdB, Couloir, Entrée, Cellier, Cave, Dégagement → 0", () => {
    const nonHabitable = [
      "WC",
      "SdB",
      "Couloir",
      "Entrée",
      "Cellier",
      "Cave",
      "Dégagement",
    ];
    const rooms = nonHabitable.map((name, i) =>
      makeRoom({ temp_id: `r${i}`, name_raw: name })
    );
    expect(countHabitableRooms(rooms)).toBe(0);
  });

  it("exclut 'Salle de bain' et 'Salle d'eau' (variantes)", () => {
    const rooms = [
      makeRoom({ temp_id: "r1", name_raw: "Salle de bain" }),
      makeRoom({ temp_id: "r2", name_raw: "Salle d'eau" }),
    ];
    expect(countHabitableRooms(rooms)).toBe(0);
  });

  it("inclut Cuisine, Bureau, Salon dans les habitables", () => {
    const rooms = [
      makeRoom({ temp_id: "r1", name_raw: "Cuisine" }),
      makeRoom({ temp_id: "r2", name_raw: "Bureau" }),
      makeRoom({ temp_id: "r3", name_raw: "Salon" }),
    ];
    expect(countHabitableRooms(rooms)).toBe(3);
  });
});

// ─── computeAvgX ─────────────────────────────────────────────────

describe("computeAvgX", () => {
  it("calcule correctement le centre X moyen avec bbox", () => {
    const rooms = [
      makeRoom({
        temp_id: "r1",
        bounding_box: { x_percent: 10, y_percent: 0, width_percent: 20, height_percent: 10 },
      }),
      makeRoom({
        temp_id: "r2",
        bounding_box: { x_percent: 60, y_percent: 0, width_percent: 20, height_percent: 10 },
      }),
    ];
    // Centre r1 = 10 + 20/2 = 20, Centre r2 = 60 + 20/2 = 70
    // avg = (20 + 70) / 2 = 45
    expect(computeAvgX(rooms)).toBe(45);
  });

  it("utilise fallback 50 pour les rooms sans bbox", () => {
    const rooms = [
      makeRoom({ temp_id: "r1", bounding_box: null }),
      makeRoom({ temp_id: "r2", bounding_box: null }),
    ];
    expect(computeAvgX(rooms)).toBe(50);
  });

  it("mélange rooms avec et sans bbox → moyenne pondérée", () => {
    const rooms = [
      makeRoom({
        temp_id: "r1",
        bounding_box: { x_percent: 0, y_percent: 0, width_percent: 20, height_percent: 10 },
      }),
      makeRoom({ temp_id: "r2", bounding_box: null }),
    ];
    // Centre r1 = 0 + 20/2 = 10, Centre r2 (fallback) = 50
    // avg = (10 + 50) / 2 = 30
    expect(computeAvgX(rooms)).toBe(30);
  });
});
