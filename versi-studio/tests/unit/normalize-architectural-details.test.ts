/**
 * s32 HOTFIX P0 — Tests de regression du crash :
 *  « Cannot read properties of undefined (reading 'source') »
 *
 * Reproduit les scenarios des rows pre-migration 012 où architectural_details
 * peut valoir `{}`, `null`, ou `undefined`. Le helper `normalizeArchitecturalDetails`
 * doit toujours retourner une structure complète (floor/walls/lighting/level
 * avec value+source, specifics + technical_constraints en arrays).
 *
 * Logique cliente (RoomArchitecturalDetails, VisualWizard useEffect Vision) +
 * logique serveur (visual-generator buildArchitecturalBrief) consomment
 * `details.floor.value`, `details.floor.source`, etc. — sans normalize, ces
 * accès crashent. Avec le fix : aucun crash possible.
 */

import { describe, expect, it } from "vitest";
import {
  emptyArchitecturalDetails,
  normalizeArchitecturalDetails,
  type ArchitecturalDetails,
} from "@/lib/vs/types";
import { buildArchitecturalBrief } from "@/lib/vs/visual-generator";

describe("normalizeArchitecturalDetails — HOTFIX P0", () => {
  it("renvoie la structure complète sur input undefined", () => {
    const result = normalizeArchitecturalDetails(undefined);
    expect(result.floor).toEqual({ value: null, source: null });
    expect(result.walls).toEqual({ value: null, source: null });
    expect(result.lighting).toEqual({ value: null, source: null });
    expect(result.level).toEqual({ value: null, source: null });
    expect(result.specifics).toEqual([]);
    expect(result.technical_constraints).toEqual([]);
  });

  it("renvoie la structure complète sur input null", () => {
    const result = normalizeArchitecturalDetails(null);
    expect(result.floor.source).toBeNull(); // ce qui crashait avant fix
    expect(result.walls.source).toBeNull();
    expect(result.lighting.source).toBeNull();
  });

  it("renvoie la structure complète sur input {} (default JSONB pre-migration 012)", () => {
    const result = normalizeArchitecturalDetails({});
    // C'EST LE SCENARIO EXACT DU BUG PROD :
    // avant fix, `result.floor` était undefined → crash sur .source.
    expect(result.floor).toBeDefined();
    expect(result.floor.source).toBeNull();
    expect(result.walls.source).toBeNull();
    expect(result.lighting.source).toBeNull();
    expect(result.level?.source).toBeNull();
    expect(result.specifics).toEqual([]);
    expect(result.technical_constraints).toEqual([]);
  });

  it("préserve les champs valides de l'input partiel", () => {
    const partial = {
      floor: { value: "Parquet", source: "user", confirmed: true },
      // walls/lighting absents — pre-migration partiel
    };
    const result = normalizeArchitecturalDetails(partial);
    expect(result.floor.value).toBe("Parquet");
    expect(result.floor.source).toBe("user");
    expect(result.floor.confirmed).toBe(true);
    expect(result.walls.source).toBeNull(); // fallback structure
    expect(result.lighting.source).toBeNull();
  });

  it("préserve confidence et confirmed numériques/booléens", () => {
    const input = {
      floor: { value: "Carrelage", source: "vision", confidence: 0.85 },
      walls: { value: null, source: null, confirmed: false },
    };
    const result = normalizeArchitecturalDetails(input);
    expect(result.floor.confidence).toBe(0.85);
    expect(result.floor.source).toBe("vision");
    expect(result.walls.confirmed).toBe(false);
  });

  it("rejette les valeurs source invalides (cleanup)", () => {
    const input = {
      floor: { value: "Parquet", source: "INVALID_SOURCE" },
    };
    const result = normalizeArchitecturalDetails(input);
    expect(result.floor.value).toBe("Parquet");
    expect(result.floor.source).toBeNull(); // sanitized
  });

  it("renvoie [] quand specifics n'est pas un array", () => {
    const result = normalizeArchitecturalDetails({ specifics: "not-array" });
    expect(result.specifics).toEqual([]);
  });

  it("normalise chaque entrée du tableau specifics", () => {
    const input = {
      specifics: [
        { value: "Cheminée", source: "user", confirmed: true },
        { value: "Poutres apparentes", source: "vision", confidence: 0.9 },
      ],
    };
    const result = normalizeArchitecturalDetails(input);
    expect(result.specifics).toHaveLength(2);
    expect(result.specifics[0].value).toBe("Cheminée");
    expect(result.specifics[1].confidence).toBe(0.9);
  });
});

describe("emptyArchitecturalDetails — back-compat", () => {
  it("expose la même shape que normalize sur input vide", () => {
    const empty = emptyArchitecturalDetails();
    const normalized = normalizeArchitecturalDetails({});
    // Les deux doivent avoir une structure compatible : floor/walls/lighting
    // avec source null et value null, specifics [].
    expect(empty.floor.source).toBe(normalized.floor.source);
    expect(empty.specifics).toEqual(normalized.specifics);
  });
});

describe("buildArchitecturalBrief — defensive contre {} pre-migration", () => {
  it("ne crash PAS si details est null", () => {
    expect(() => buildArchitecturalBrief(null, null)).not.toThrow();
  });

  it("ne crash PAS si details est undefined", () => {
    expect(() => buildArchitecturalBrief(undefined, undefined)).not.toThrow();
  });

  it("ne crash PAS si details est {} (le scenario exact prod)", () => {
    // Cast unsafe pour reproduire un payload pre-migration JS qu'aucun
    // typage TS ne couvre — c'est exactement ce qui arrive avec un
    // architectural_details = {} en BDD.
    const broken = {} as unknown as ArchitecturalDetails;
    expect(() => buildArchitecturalBrief(null, broken)).not.toThrow();
  });

  it("ne crash PAS si details a UN champ valide et le reste vide", () => {
    const partial = {
      floor: { value: "Parquet", source: "user" as const },
    } as unknown as ArchitecturalDetails;
    const brief = buildArchitecturalBrief(null, partial);
    expect(brief).toContain("parquet"); // sol parquet présent dans le brief
  });

  it("rend correctement les détails complets", () => {
    const full: ArchitecturalDetails = {
      floor: { value: "Parquet", source: "user", confirmed: true },
      walls: { value: "Peinture neuve", source: "vision", confidence: 0.9 },
      lighting: { value: "Bonne", source: "user", confirmed: true },
      specifics: [{ value: "Cheminée", source: "user", confirmed: true }],
      level: { value: "premium", source: "user", confirmed: true },
      technical_constraints: [
        { value: "beam_preserved", source: "user", confirmed: true },
      ],
    };
    const brief = buildArchitecturalBrief(null, full);
    expect(brief).toContain("Room state");
    expect(brief).toContain("Quality level");
    expect(brief).toContain("Technical constraints");
  });
});
