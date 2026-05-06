/**
 * s32 — Validation des inputs architectural_profile (lot) et architectural_details (room).
 *
 * Pas de Zod ici — les payloads sont simples (5 champs lot, 4 champs pièce avec valeurs
 * fermées énumérées via ARCHITECTURAL_*_OPTIONS). Helpers focus single-purpose réutilisables
 * dans les routes PATCH.
 *
 * Règles métier :
 *   - Tout champ peut être null (non renseigné).
 *   - Lot : valeurs autorisées strictes (5 champs × 3-5 options chacun).
 *   - Room : ArchitecturalFieldValue avec source ∈ {'user'|'vision'|null}.
 *     - source='user' → confidence INTERDIT.
 *     - source='vision' → confidence requis ∈ [0, 1].
 *     - source=null + value=null → champ vide accepté.
 */

import {
  ARCHITECTURAL_DETAILS_OPTIONS,
  ARCHITECTURAL_PROFILE_OPTIONS,
  type ArchitecturalDetails,
  type ArchitecturalFieldValue,
  type ArchitecturalProfile,
} from "./types";

// ─── Profil lot (5 champs) ────────────────────────────────────────

export function validateArchitecturalProfile(
  raw: unknown
): { ok: true; value: ArchitecturalProfile } | { ok: false; error: string } {
  if (raw === null || typeof raw !== "object") {
    return { ok: false, error: "architectural_profile doit être un objet." };
  }
  const obj = raw as Record<string, unknown>;
  const out: ArchitecturalProfile = {
    ceiling_height: null,
    orientation: null,
    general_state: null,
    target_level: null,
    target_audience: null,
  };

  for (const key of Object.keys(ARCHITECTURAL_PROFILE_OPTIONS) as Array<
    keyof typeof ARCHITECTURAL_PROFILE_OPTIONS
  >) {
    const v = obj[key];
    if (v === undefined || v === null) {
      out[key] = null;
      continue;
    }
    if (typeof v !== "string") {
      return { ok: false, error: `${key} doit être une chaîne ou null.` };
    }
    const allowed = ARCHITECTURAL_PROFILE_OPTIONS[key] as readonly string[];
    if (!allowed.includes(v)) {
      return {
        ok: false,
        error: `${key} doit être l'une des valeurs : ${allowed.join(", ")}.`,
      };
    }
    out[key] = v;
  }

  return { ok: true, value: out };
}

// ─── Détails pièce (4 champs) ─────────────────────────────────────

function validateFieldValue(
  raw: unknown,
  allowedValues: readonly string[],
  fieldLabel: string
): { ok: true; value: ArchitecturalFieldValue } | { ok: false; error: string } {
  if (raw === null || typeof raw !== "object") {
    return { ok: false, error: `${fieldLabel} doit être un objet.` };
  }
  const obj = raw as Record<string, unknown>;

  // value
  let value: string | null = null;
  if (obj.value !== undefined && obj.value !== null) {
    if (typeof obj.value !== "string") {
      return { ok: false, error: `${fieldLabel}.value doit être une chaîne ou null.` };
    }
    if (!allowedValues.includes(obj.value)) {
      return {
        ok: false,
        error: `${fieldLabel}.value doit être l'une de : ${allowedValues.join(", ")}.`,
      };
    }
    value = obj.value;
  }

  // source
  let source: "user" | "vision" | null = null;
  if (obj.source !== undefined && obj.source !== null) {
    if (obj.source !== "user" && obj.source !== "vision") {
      return {
        ok: false,
        error: `${fieldLabel}.source doit être 'user', 'vision' ou null.`,
      };
    }
    source = obj.source;
  }

  // confidence (uniquement si source='vision')
  const out: ArchitecturalFieldValue = { value, source };
  if (obj.confidence !== undefined && obj.confidence !== null) {
    if (source !== "vision") {
      return {
        ok: false,
        error: `${fieldLabel}.confidence n'est autorisé que si source='vision'.`,
      };
    }
    if (
      typeof obj.confidence !== "number" ||
      !Number.isFinite(obj.confidence) ||
      obj.confidence < 0 ||
      obj.confidence > 1
    ) {
      return {
        ok: false,
        error: `${fieldLabel}.confidence doit être un nombre entre 0 et 1.`,
      };
    }
    out.confidence = obj.confidence;
  } else if (source === "vision") {
    return {
      ok: false,
      error: `${fieldLabel}.confidence est requis quand source='vision'.`,
    };
  }

  // s32 (migration 014) — confirmed (booléen optionnel).
  // Sémantique : true si le marchand a explicitement confirmé/saisi la valeur.
  // Default si absent : true pour source='user', false pour source='vision'.
  if (obj.confirmed !== undefined && obj.confirmed !== null) {
    if (typeof obj.confirmed !== "boolean") {
      return {
        ok: false,
        error: `${fieldLabel}.confirmed doit être un booléen.`,
      };
    }
    out.confirmed = obj.confirmed;
  }

  return { ok: true, value: out };
}

export function validateArchitecturalDetails(
  raw: unknown
):
  | { ok: true; value: ArchitecturalDetails }
  | { ok: false; error: string } {
  if (raw === null || typeof raw !== "object") {
    return { ok: false, error: "architectural_details doit être un objet." };
  }
  const obj = raw as Record<string, unknown>;

  // floor / walls / lighting / level (single-select)
  // s32 (migration 014) — `level` ajouté au niveau pièce.
  const single: Array<"floor" | "walls" | "lighting" | "level"> = [
    "floor",
    "walls",
    "lighting",
    "level",
  ];
  const out: ArchitecturalDetails = {
    floor: { value: null, source: null },
    walls: { value: null, source: null },
    lighting: { value: null, source: null },
    specifics: [],
    level: { value: null, source: null },
    technical_constraints: [],
  };

  for (const key of single) {
    if (obj[key] === undefined) continue;
    const allowed = ARCHITECTURAL_DETAILS_OPTIONS[key] as readonly string[];
    const result = validateFieldValue(obj[key], allowed, key);
    if (!result.ok) return result;
    out[key] = result.value;
  }

  // specifics (multi-select)
  if (obj.specifics !== undefined) {
    if (!Array.isArray(obj.specifics)) {
      return { ok: false, error: "specifics doit être un tableau." };
    }
    const allowed = ARCHITECTURAL_DETAILS_OPTIONS.specifics as readonly string[];
    const items: ArchitecturalFieldValue[] = [];
    for (let i = 0; i < obj.specifics.length; i++) {
      const r = validateFieldValue(obj.specifics[i], allowed, `specifics[${i}]`);
      if (!r.ok) return r;
      items.push(r.value);
    }
    out.specifics = items;
  }

  // s32 (migration 014) — technical_constraints (multi-select)
  if (obj.technical_constraints !== undefined) {
    if (!Array.isArray(obj.technical_constraints)) {
      return {
        ok: false,
        error: "technical_constraints doit être un tableau.",
      };
    }
    const allowed = ARCHITECTURAL_DETAILS_OPTIONS.technical_constraints as readonly string[];
    const items: ArchitecturalFieldValue[] = [];
    for (let i = 0; i < obj.technical_constraints.length; i++) {
      const r = validateFieldValue(
        obj.technical_constraints[i],
        allowed,
        `technical_constraints[${i}]`
      );
      if (!r.ok) return r;
      items.push(r.value);
    }
    out.technical_constraints = items;
  }

  return { ok: true, value: out };
}
