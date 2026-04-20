/**
 * Tests unitaires — label-snap.ts (s23)
 *
 * Couvre :
 * - nameMatchScore : match exact, substring, Levenshtein, abréviations, no-match
 * - centroid : calcul géométrique sur polygones
 * - snapRoomsToLabels : match + snap, no-match (fallback), multi-candidats,
 *   snap aberrant rejeté, labels déjà consommés
 *
 * N'utilise PAS detectLabels (OCR Tesseract) car trop lent pour un test unit
 * et nécessite une image réelle. Tests OCR sont faits dans iter-p00.ts E2E.
 */
import { describe, it, expect } from "vitest";
import {
  nameMatchScore,
  centroid,
  snapRoomsToLabels,
  type OcrLabel,
  type RoomForSnap,
} from "../../src/lib/vs/label-snap";

// ─── Fixtures ────────────────────────────────────────────────────

function makeLabel(
  text: string,
  x: number,
  y: number,
  confidence = 85
): OcrLabel {
  return { text, x_percent: x, y_percent: y, confidence };
}

function makeRoom(
  id: string,
  name: string,
  cx: number,
  cy: number,
  halfSize = 5
): RoomForSnap {
  // Polygone rectangulaire centré sur (cx, cy)
  return {
    id,
    name_raw: name,
    bounding_polygon: [
      { x_percent: cx - halfSize, y_percent: cy - halfSize },
      { x_percent: cx + halfSize, y_percent: cy - halfSize },
      { x_percent: cx + halfSize, y_percent: cy + halfSize },
      { x_percent: cx - halfSize, y_percent: cy + halfSize },
    ],
  };
}

// ─── nameMatchScore ──────────────────────────────────────────────

describe("nameMatchScore", () => {
  it("match exact normalisé retourne 0", () => {
    expect(nameMatchScore("Chambre", "Chambre")).toBe(0);
    expect(nameMatchScore("Séjour", "sejour")).toBe(0);
    expect(nameMatchScore("Séjour / cuisine", "Sejour/Cuisine")).toBe(0);
  });

  it("substring (room dans label ou label dans room) retourne 0.5", () => {
    expect(nameMatchScore("Chambre", "Chambre 1")).toBe(0.5);
    expect(nameMatchScore("Grande chambre", "chambre")).toBe(0.5);
  });

  it("Levenshtein <= 2 retourne la distance", () => {
    // "couloir" vs "couleir" (1 subst) → dist 1 (OCR erreur classique)
    expect(nameMatchScore("Couloir", "Couleir")).toBeLessThanOrEqual(2);
    // "entree" vs "enntree" (1 insertion) → dist 1
    expect(nameMatchScore("Entrée", "Enntree")).toBeLessThanOrEqual(2);
  });

  it("abréviations courtes (SdB, WC, ECS) exigent match exact", () => {
    expect(nameMatchScore("SdB", "SdB")).toBe(0);
    expect(nameMatchScore("WC", "WC")).toBe(0);
    expect(nameMatchScore("ECS", "ECS")).toBe(0);
    // SdB vs SDB (même après normalisation)
    expect(nameMatchScore("SdB", "sdb")).toBe(0);
    // Abréviation incluse dans un label plus long
    expect(nameMatchScore("SdB", "SdB parents")).toBe(0.5);
    // Abréviations ne matchent PAS les mots longs sans relation
    expect(nameMatchScore("WC", "Cuisine")).toBe(Infinity);
  });

  it("tokens communs significatifs (>= 4 chars) retournent 1", () => {
    // "Séjour principal" vs "sejour avec cuisine" → token "sejour" commun
    expect(nameMatchScore("Séjour principal", "sejour avec balcon")).toBe(1);
  });

  it("pas de match → Infinity", () => {
    expect(nameMatchScore("Chambre", "Cuisine")).toBe(Infinity);
    expect(nameMatchScore("Entrée", "Séjour")).toBe(Infinity);
  });

  it("gère strings vides", () => {
    expect(nameMatchScore("", "Chambre")).toBe(Infinity);
    expect(nameMatchScore("Chambre", "")).toBe(Infinity);
  });
});

// ─── centroid ────────────────────────────────────────────────────

describe("centroid", () => {
  it("centroid d'un carré centré sur (50, 50)", () => {
    const c = centroid([
      { x_percent: 45, y_percent: 45 },
      { x_percent: 55, y_percent: 45 },
      { x_percent: 55, y_percent: 55 },
      { x_percent: 45, y_percent: 55 },
    ]);
    expect(c.cx).toBe(50);
    expect(c.cy).toBe(50);
  });

  it("centroid d'un polygone asymétrique", () => {
    const c = centroid([
      { x_percent: 10, y_percent: 10 },
      { x_percent: 20, y_percent: 10 },
      { x_percent: 30, y_percent: 30 },
    ]);
    expect(c.cx).toBeCloseTo(20, 5);
    expect(c.cy).toBeCloseTo(50 / 3, 5);
  });
});

// ─── snapRoomsToLabels ───────────────────────────────────────────

describe("snapRoomsToLabels", () => {
  it("match exact : room translatée pour centroid = label", () => {
    // Room "Chambre" centrée à (40, 40), label à (50, 30)
    const rooms = [makeRoom("r1", "Chambre", 40, 40)];
    const labels = [makeLabel("Chambre", 50, 30)];
    const result = snapRoomsToLabels(rooms, labels);

    expect(result.matches).toHaveLength(1);
    expect(result.unmatched).toHaveLength(0);
    expect(result.matches[0].offset_x).toBeCloseTo(10, 5);
    expect(result.matches[0].offset_y).toBeCloseTo(-10, 5);

    const c = centroid(result.snapped[0].bounding_polygon!);
    expect(c.cx).toBeCloseTo(50, 5);
    expect(c.cy).toBeCloseTo(30, 5);
  });

  it("fuzzy match OCR erreur : Couloir ↔ Couleir", () => {
    const rooms = [makeRoom("r1", "Couloir", 30, 50)];
    const labels = [makeLabel("Couleir", 40, 45)]; // typo OCR "r"→ rien, "o"→"e"
    const result = snapRoomsToLabels(rooms, labels);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].label_text).toBe("Couleir");
  });

  it("no match : polygone conservé, listé unmatched", () => {
    const rooms = [makeRoom("r1", "Garage", 30, 30)];
    const labels = [makeLabel("Chambre", 50, 50)];
    const result = snapRoomsToLabels(rooms, labels);
    expect(result.matches).toHaveLength(0);
    expect(result.unmatched).toEqual(["r1"]);
    // Polygone inchangé
    const c = centroid(result.snapped[0].bounding_polygon!);
    expect(c.cx).toBeCloseTo(30, 5);
    expect(c.cy).toBeCloseTo(30, 5);
  });

  it("multi-chambres : match par proximité spatiale si scores textuels égaux", () => {
    // 2 rooms "Chambre" + 2 labels "Chambre 1" / "Chambre 2"
    // Règle : assignation gloutonne, meilleur score texte d'abord, puis distance.
    const rooms = [
      makeRoom("r1", "Chambre", 20, 20),
      makeRoom("r2", "Chambre", 80, 80),
    ];
    const labels = [
      makeLabel("Chambre 1", 25, 25), // proche de r1
      makeLabel("Chambre 2", 75, 75), // proche de r2
    ];
    const result = snapRoomsToLabels(rooms, labels);
    expect(result.matches).toHaveLength(2);
    // r1 doit matcher Chambre 1 (plus proche spatialement)
    const m1 = result.matches.find((m) => m.room_id === "r1");
    const m2 = result.matches.find((m) => m.room_id === "r2");
    expect(m1?.label_text).toBe("Chambre 1");
    expect(m2?.label_text).toBe("Chambre 2");
  });

  it("snap aberrant (> maxSnapDistancePct) refusé", () => {
    // Room à (10, 10), label à (80, 80) → drift > 20% → refusé
    const rooms = [makeRoom("r1", "Chambre", 10, 10)];
    const labels = [makeLabel("Chambre", 80, 80)];
    const result = snapRoomsToLabels(rooms, labels, { maxSnapDistancePct: 20 });
    expect(result.matches).toHaveLength(0);
    expect(result.unmatched).toEqual(["r1"]);
    // Polygone inchangé
    const c = centroid(result.snapped[0].bounding_polygon!);
    expect(c.cx).toBeCloseTo(10, 5);
  });

  it("un label ne peut être consommé qu'une fois", () => {
    // 2 rooms "Chambre" mais 1 seul label OCR "Chambre"
    const rooms = [
      makeRoom("r1", "Chambre", 30, 30),
      makeRoom("r2", "Chambre", 70, 70),
    ];
    const labels = [makeLabel("Chambre", 35, 35)]; // plus proche de r1
    const result = snapRoomsToLabels(rooms, labels);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].room_id).toBe("r1"); // le plus proche gagne
    expect(result.unmatched).toContain("r2");
  });

  it("polygone absent ou < 3 points : ignoré (unmatched)", () => {
    const rooms: RoomForSnap[] = [
      { id: "r1", name_raw: "Chambre", bounding_polygon: null },
      {
        id: "r2",
        name_raw: "Séjour",
        bounding_polygon: [{ x_percent: 10, y_percent: 10 }],
      },
    ];
    const labels = [
      makeLabel("Chambre", 50, 50),
      makeLabel("Séjour", 60, 60),
    ];
    const result = snapRoomsToLabels(rooms, labels);
    expect(result.matches).toHaveLength(0);
    expect(result.unmatched).toContain("r1");
    expect(result.unmatched).toContain("r2");
  });

  it("préserve la forme du polygone (seul offset appliqué)", () => {
    // Polygone en L (5 points)
    const rooms: RoomForSnap[] = [
      {
        id: "r1",
        name_raw: "Chambre",
        bounding_polygon: [
          { x_percent: 10, y_percent: 10 },
          { x_percent: 20, y_percent: 10 },
          { x_percent: 20, y_percent: 15 },
          { x_percent: 30, y_percent: 15 },
          { x_percent: 30, y_percent: 20 },
          { x_percent: 10, y_percent: 20 },
        ],
      },
    ];
    const labels = [makeLabel("Chambre", 25, 25)];
    const result = snapRoomsToLabels(rooms, labels);
    expect(result.matches).toHaveLength(1);
    // Même nombre de points
    expect(result.snapped[0].bounding_polygon).toHaveLength(6);
    // Forme préservée : la largeur/hauteur du polygone est inchangée
    const poly = result.snapped[0].bounding_polygon!;
    const xs = poly.map((p) => p.x_percent);
    const ys = poly.map((p) => p.y_percent);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(20, 3); // largeur = 20
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(10, 3); // hauteur = 10
  });

  it("labels non utilisés rapportés dans unusedLabels", () => {
    const rooms = [makeRoom("r1", "Chambre", 40, 40)];
    const labels = [
      makeLabel("Chambre", 45, 45),
      makeLabel("Cuisine", 70, 70),
      makeLabel("Garage", 90, 90),
    ];
    const result = snapRoomsToLabels(rooms, labels);
    expect(result.matches).toHaveLength(1);
    expect(result.unusedLabels).toHaveLength(2);
    const unusedTexts = result.unusedLabels.map((l) => l.text).sort();
    expect(unusedTexts).toEqual(["Cuisine", "Garage"]);
  });
});
