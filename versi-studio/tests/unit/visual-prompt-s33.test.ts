/**
 * Tests régression s33 (Lot A) — fix P0 pipeline image Étape 4 v2.
 *
 * Couvre les 3 issues prod Thomas (audit @ia s33 section 7) :
 *  - Issue #1 : portes/fenêtres mal placées → tag dealer-confirmed AUTHORITATIVE
 *  - Issue #2 : saisie marchand pas en priorité → STRICT RULE 0 + ordre prompt
 *  - Issue #3 : angles incohérents → helper transformSideToCameraFrame
 *
 * Référence : docs/ia/s33-audit-pipeline-image-etape4.md sections 6 + 7.
 *
 * Périmètre : Vitest unitaires sur le PROMPT généré (pas de gpt-image-2 réel).
 * Le reality check visuel pixel-près est manuel (Thomas en prod).
 */

import { describe, it, expect } from "vitest";
import {
  buildVisualPromptAnchor,
  buildArchitecturalBrief,
  type AnchorPromptParams,
} from "@/lib/vs/visual-generator";
import {
  buildSegmentDescriptionEn,
  transformSideToCameraFrame,
} from "@/lib/vs/ui/segment-prompt";
import type {
  ZonePolygonPoint,
  VsRoomSegment,
  ArchitecturalProfile,
  ArchitecturalDetails,
} from "@/lib/vs/types";

// Carré 100x100 (centroïde 50,50). Indices polygon :
//   seg 0 (TL→TR) = côté haut
//   seg 1 (TR→BR) = côté droit
//   seg 2 (BR→BL) = côté bas
//   seg 3 (BL→TL) = côté gauche
const square: ZonePolygonPoint[] = [
  { x_percent: 0, y_percent: 0 },
  { x_percent: 100, y_percent: 0 },
  { x_percent: 100, y_percent: 100 },
  { x_percent: 0, y_percent: 100 },
];

function seg(idx: number, type: VsRoomSegment["type"], notes: string | null = null): VsRoomSegment {
  return {
    id: `seg-${idx}`,
    room_id: "room-1",
    segment_index: idx,
    type,
    notes,
    updated_at: new Date().toISOString(),
  };
}

function baseParams(overrides: Partial<AnchorPromptParams> = {}): AnchorPromptParams {
  return {
    roomType: "salon",
    styleId: "scandinave",
    surfaceM2: 25,
    angleDegrees: null,
    commentText: null,
    userAnswers: [],
    structuralInstructions: null,
    isFurnished: true,
    segmentDescription: null,
    architecturalProfile: null,
    architecturalDetails: null,
    operationChatContext: null,
    chatExtraContext: null,
    ...overrides,
  };
}

// ─── Issue #1 — Tag dealer-confirmed AUTHORITATIVE sur segments ───
describe("s33 Lot A — issue #1 : ROOM OPENINGS authoritative", () => {
  it("buildSegmentDescriptionEn injecte tag dealer-confirmed AUTHORITATIVE et override directive", () => {
    const out = buildSegmentDescriptionEn(square, [seg(1, "door"), seg(3, "window")]);
    expect(out).toContain("ROOM OPENINGS");
    expect(out).toContain("OPERATOR-ANNOTATED");
    expect(out).toContain("dealer-confirmed");
    expect(out).toContain("AUTHORITATIVE");
    expect(out).toContain("override anything inferred from the source photo");
    // Données segments toujours présentes
    expect(out).toContain("door");
    expect(out).toContain("window");
  });

  it("buildVisualPromptAnchor relaie le tag dealer-confirmed AUTHORITATIVE dans le prompt final", () => {
    const segDesc = buildSegmentDescriptionEn(square, [seg(1, "door")]);
    const prompt = buildVisualPromptAnchor(baseParams({ segmentDescription: segDesc }));
    expect(prompt).toContain("ROOM OPENINGS");
    expect(prompt).toContain("AUTHORITATIVE");
    expect(prompt).toContain("override anything inferred from the source photo");
  });
});

// ─── Issue #2 — DEALER INPUT en tête + STRICT RULE 0 ──────────────
describe("s33 Lot A — issue #2 : priorité saisie marchand (STRICT RULE 0 + ordre prompt)", () => {
  const profile: ArchitecturalProfile = {
    ceiling_height: "2.50m",
    orientation: "Sud",
    general_state: "Bon état",
    target_level: "Premium",
    target_audience: "Famille",
  };

  const details: ArchitecturalDetails = {
    floor: { value: "Parquet", source: "user" },
    walls: { value: "Peinture neuve", source: "user" },
    lighting: { value: "Très lumineux", source: "user" },
    specifics: [{ value: "Cheminée", source: "user" }],
    level: { value: "premium", source: "user" },
    technical_constraints: [
      { value: "duct_immovable", source: "user" },
    ],
  };

  it("STRICT RULE 0 (PRIORITY OF SOURCES) présent et précède STRICT RULE 1", () => {
    const prompt = buildVisualPromptAnchor(baseParams());
    expect(prompt).toContain("PRIORITY OF SOURCES");
    expect(prompt).toContain("override the source photo");
    // Ordre : RULE 0 avant RULE 1
    const idxRule0 = prompt.indexOf("0. PRIORITY");
    const idxRule1 = prompt.indexOf("1. ");
    expect(idxRule0).toBeGreaterThan(0);
    expect(idxRule1).toBeGreaterThan(idxRule0);
  });

  it("ARCHITECTURAL BRIEF est positionné AVANT ROOM OPENINGS dans le prompt (ordre s33)", () => {
    const segDesc = buildSegmentDescriptionEn(square, [seg(1, "door")]);
    const prompt = buildVisualPromptAnchor(
      baseParams({
        segmentDescription: segDesc,
        architecturalProfile: profile,
        architecturalDetails: details,
      })
    );
    const idxBrief = prompt.indexOf("ARCHITECTURAL BRIEF");
    const idxOpenings = prompt.indexOf("ROOM OPENINGS");
    expect(idxBrief).toBeGreaterThan(0);
    expect(idxOpenings).toBeGreaterThan(0);
    expect(idxBrief).toBeLessThan(idxOpenings);
  });

  it("buildArchitecturalBrief tag (dealer-confirmed) sur les 5 champs profil lot", () => {
    const brief = buildArchitecturalBrief(profile, null);
    expect(brief).toContain("ceiling 2.50m (dealer-confirmed)");
    expect(brief).toContain("south-facing (dealer-confirmed)");
    expect(brief).toContain("good condition (dealer-confirmed)");
    expect(brief).toContain("premium finish (dealer-confirmed)");
    expect(brief).toContain("target audience: family (dealer-confirmed)");
  });

  it("comment_text et user_answers taggés (dealer-confirmed, AUTHORITATIVE)", () => {
    const prompt = buildVisualPromptAnchor(
      baseParams({
        commentText: "garder la cheminée",
        userAnswers: ["sol parquet chêne", "murs blancs"],
      })
    );
    expect(prompt).toContain("User-specified constraints (dealer-confirmed, AUTHORITATIVE");
    expect(prompt).toContain("Clarifications from operator (dealer-confirmed, AUTHORITATIVE)");
    expect(prompt).toContain("garder la cheminée");
    expect(prompt).toContain("sol parquet chêne");
  });

  it("regression dealer-confirmed propagation : ≥ 5 occurrences quand profil lot + détails 100% saisis", () => {
    const prompt = buildVisualPromptAnchor(
      baseParams({
        architecturalProfile: profile,
        architecturalDetails: details,
        commentText: "garder la cheminée",
        userAnswers: ["sol parquet"],
      })
    );
    const matches = prompt.match(/\(dealer-confirmed/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });
});

// ─── Issue #3 — Référentiel caméra (helper + invariant anchor ≠ secondary) ─
describe("s33 Lot A — issue #3 : transformSideToCameraFrame (référentiel caméra)", () => {
  // Convention : sideAngle 0=est plan, 90=sud plan ; cameraAngleDeg 0=nord
  // boussole. La caméra REGARDE VERS le centroïde donc son axe optique pointe
  // à cameraAngleDeg + 180 (sur la boussole).
  //
  // Cas : un segment "droit" (sideAngle=0, à l'est du centroïde sur le plan).
  // Caméra à 90° (caméra à l'est, regardant l'ouest) → segment derrière la caméra.
  // Caméra à 270° (caméra à l'ouest, regardant l'est) → segment pile en face = centre.
  // Caméra à 0° (caméra au nord, regardant le sud) → segment à gauche du frame.
  // Caméra à 180° (caméra au sud, regardant le nord) → segment à droite du frame.

  it("retourne unknown si cameraAngleDeg est null", () => {
    expect(transformSideToCameraFrame("droit", null)).toBe("unknown");
    expect(transformSideToCameraFrame("haut", null)).toBe("unknown");
  });

  it("segment à droite du plan + caméra à l'ouest (270°) = centre du frame", () => {
    expect(transformSideToCameraFrame("droit", 270)).toBe("center of frame");
  });

  it("segment à droite du plan + caméra à l'est (90°) = derrière la caméra", () => {
    expect(transformSideToCameraFrame("droit", 90)).toBe("behind camera");
  });

  it("segment à droite du plan + caméra au nord (0°) = gauche du frame", () => {
    // Caméra au nord regarde vers le sud. Le segment à l'est est à gauche
    // du champ de vision (convention y-bas du canvas inversée → en interne
    // x-droite reste à droite plan, mais la caméra "regardant le sud" voit
    // l'est à sa gauche).
    expect(transformSideToCameraFrame("droit", 0)).toBe("left of frame");
  });

  it("segment à droite du plan + caméra au sud (180°) = droite du frame", () => {
    expect(transformSideToCameraFrame("droit", 180)).toBe("right of frame");
  });

  it("invariant clé : anchor et secondary à angles opposés produisent des descriptions DIFFÉRENTES", () => {
    // Reproduit le bug #3 : sans transformation, le LLM voyait la même phrase
    // "door right side" sur 2 photos à angles opposés → rendait 2 vues
    // visuellement identiques. Avec la fix, les 2 prompts segments diffèrent.
    const segments = [seg(1, "door"), seg(3, "window")];
    const anchorDesc = buildSegmentDescriptionEn(square, segments, 0); // caméra nord
    const secondaryDesc = buildSegmentDescriptionEn(square, segments, 180); // caméra sud
    expect(anchorDesc).not.toBe(secondaryDesc);
    // Anchor : door (segment 1, droit) vu d'une caméra nord → left of frame
    expect(anchorDesc).toContain("left of frame");
    // Secondary : door vu d'une caméra sud → right of frame
    expect(secondaryDesc).toContain("right of frame");
  });

  it("invariant clé : anchor et secondary partagent le bloc segments si transformation absente (back-compat)", () => {
    // Sans angle (legacy), même bloc → reproduit le comportement historique.
    // Permet de vérifier que la défaut back-compat ne régresse pas.
    const segments = [seg(1, "door")];
    const noAngleA = buildSegmentDescriptionEn(square, segments);
    const noAngleB = buildSegmentDescriptionEn(square, segments);
    expect(noAngleA).toBe(noAngleB);
    expect(noAngleA).not.toContain("of frame for this camera angle");
  });
});
