/**
 * s32 Phase 5 — Brief humain lisible avant génération.
 *
 * Construit une synthèse FR de 3-4 phrases à partir des champs structurés du
 * brief (profil lot, détails pièce, segments, style, commentaire libre, extra
 * context chat). Affichée dans une modale Confirmer/Modifier avant de POST
 * /visuals/generate.
 *
 * Source : audit Thomas marchand 7/10 — gap « Le marchand ne sait pas ce que
 * l'IA va générer avant qu'elle génère ». Une phrase humaine consolide tous
 * les champs pour donner confiance.
 *
 * Stratégie : helper PUR (pas de fetch, pas de side effect) — testable seul
 * sans jsdom (cf. règle s30 helper-first pour testabilité).
 */

import {
  ARCHITECTURAL_LEVEL_LABELS,
  TECHNICAL_CONSTRAINTS_LABELS,
  type ArchitecturalDetails,
  type ArchitecturalProfile,
  type VsRoom,
  type VsRoomSegment,
} from "./types";
import { getStyle, getRoomLabel, type StyleId } from "./styles";

export interface BriefSummaryParams {
  room: VsRoom;
  profile?: ArchitecturalProfile | null;
  details?: ArchitecturalDetails | null;
  segments?: VsRoomSegment[];
  styleId?: StyleId | string | null;
  comment?: string | null;
  /** s32 Phase 9 — extra_context capté via chat (clé→description libre). */
  chatExtraContext?: Record<string, string> | null;
  /** Nb de visuels à générer pour cette pièce. */
  targetVisualCount?: number;
}

/** Helper interne : décrit en FR les saisies marchand sur la pièce. */
function describeManualInputs(
  details: ArchitecturalDetails | null | undefined
): string[] {
  const parts: string[] = [];
  if (details?.floor?.value) {
    const sourcedTag = details.floor.source === "vision" ? " (détecté IA)" : "";
    parts.push(`sol ${details.floor.value.toLowerCase()}${sourcedTag}`);
  }
  if (details?.walls?.value) {
    const sourcedTag = details.walls.source === "vision" ? " (détecté IA)" : "";
    parts.push(`murs ${details.walls.value.toLowerCase()}${sourcedTag}`);
  }
  if (details?.lighting?.value) {
    const sourcedTag =
      details.lighting.source === "vision" ? " (détecté IA)" : "";
    parts.push(`luminosité ${details.lighting.value.toLowerCase()}${sourcedTag}`);
  }
  if (details?.specifics && details.specifics.length > 0) {
    const items = details.specifics
      .filter((s) => s.value)
      .map((s) => (s.value as string).toLowerCase());
    if (items.length > 0) parts.push(`particularités : ${items.join(", ")}`);
  }
  return parts;
}

/** Helper interne : décrit le profil lot. */
function describeLotProfile(
  profile: ArchitecturalProfile | null | undefined
): string[] {
  if (!profile) return [];
  const parts: string[] = [];
  if (profile.ceiling_height) parts.push(`hauteur ${profile.ceiling_height}`);
  if (profile.orientation) parts.push(`orientation ${profile.orientation.toLowerCase()}`);
  if (profile.general_state) parts.push(`état ${profile.general_state.toLowerCase()}`);
  if (profile.target_audience) parts.push(`cible ${profile.target_audience.toLowerCase()}`);
  return parts;
}

/** Helper interne : décrit les contraintes techniques + niveau pièce. */
function describeRoomConstraints(
  details: ArchitecturalDetails | null | undefined
): string[] {
  if (!details) return [];
  const parts: string[] = [];
  if (details.level?.value) {
    const label = ARCHITECTURAL_LEVEL_LABELS[details.level.value] ?? details.level.value;
    parts.push(`niveau ${label.toLowerCase()}`);
  }
  if (details.technical_constraints && details.technical_constraints.length > 0) {
    const items = details.technical_constraints
      .filter((c) => c.value)
      .map((c) => (TECHNICAL_CONSTRAINTS_LABELS[c.value as string] ?? c.value as string).toLowerCase());
    if (items.length > 0) parts.push(`contraintes : ${items.join(", ")}`);
  }
  return parts;
}

/** Helper interne : décrit les segments annotés (porte/fenêtre/baie/...). */
function describeSegments(segments: VsRoomSegment[] | undefined): string[] {
  if (!segments || segments.length === 0) return [];
  const counts: Record<string, number> = {};
  for (const s of segments) {
    if (s.type === "wall") continue; // les murs pleins sont implicites
    counts[s.type] = (counts[s.type] ?? 0) + 1;
  }
  const labels: Record<string, string> = {
    door: "porte",
    window: "fenêtre",
    bay_window: "baie vitrée",
    opening: "ouverture",
    flexible: "segment modifiable",
  };
  const parts: string[] = [];
  for (const [type, count] of Object.entries(counts)) {
    const label = labels[type] ?? type;
    parts.push(`${count} ${label}${count > 1 ? "s" : ""}`);
  }
  return parts;
}

/** Helper interne : décrit l'extra context du chat. */
function describeChatExtra(extra: Record<string, string> | null | undefined): string[] {
  if (!extra) return [];
  return Object.values(extra).filter((v) => v && v.trim().length > 0);
}

/**
 * Construit une synthèse FR humaine du brief avant génération.
 *
 * Format : 3-4 phrases qui couvrent (1) les saisies marchand + détection IA,
 * (2) le style + cible + niveau, (3) les contraintes techniques et segments,
 * (4) le commentaire libre + extra context chat.
 *
 * Exemple :
 *   « Sur la base de vos saisies (sol parquet, murs à rafraîchir, luminosité
 *     bonne) et de la détection automatique (3 fenêtres, 1 porte), le visuel
 *     mettra en avant un aménagement scandinave premium adapté à une cible
 *     famille. Contraintes respectées : poutre conservée. Commentaire :
 *     éclairage tamisé souhaité. »
 */
export function buildHumanReadableBrief(params: BriefSummaryParams): string {
  const {
    room,
    profile,
    details,
    segments,
    styleId,
    comment,
    chatExtraContext,
    targetVisualCount,
  } = params;

  const roomLabel = getRoomLabel(room.room_type) || room.room_type;
  const customLabel = room.custom_label ? ` « ${room.custom_label} »` : "";
  const surface = room.surface_m2 ? ` ${room.surface_m2.toFixed(0)} m²` : "";

  const style = styleId ? getStyle(styleId as StyleId) : null;
  const styleName = style?.name ?? styleId ?? "non choisi";

  const manualInputs = describeManualInputs(details);
  const lotInputs = describeLotProfile(profile);
  const roomConstraints = describeRoomConstraints(details);
  const segmentDesc = describeSegments(segments);
  const chatExtra = describeChatExtra(chatExtraContext);

  const sentences: string[] = [];

  // Phrase 1 — saisies + détection
  const inputBits: string[] = [];
  if (manualInputs.length > 0) inputBits.push(manualInputs.join(", "));
  if (segmentDesc.length > 0) inputBits.push(`segments annotés : ${segmentDesc.join(", ")}`);
  if (inputBits.length > 0) {
    sentences.push(
      `Sur la base de vos saisies (${inputBits.join(" ; ")}), le visuel ciblera ${roomLabel}${customLabel}${surface}.`
    );
  } else {
    sentences.push(
      `Le visuel ciblera ${roomLabel}${customLabel}${surface} sans saisies architecturales préalables.`
    );
  }

  // Phrase 2 — style + lot
  const lotPart = lotInputs.length > 0 ? ` dans un lot ${lotInputs.join(", ")}` : "";
  const meubleeText = room.is_furnished
    ? "améliorera le mobilier existant"
    : "apportera le mobilier complet";
  sentences.push(
    `L'IA ${meubleeText} en style ${styleName}${lotPart}.`
  );

  // Phrase 3 — niveau + contraintes
  if (roomConstraints.length > 0) {
    sentences.push(
      `Précisions pièce : ${roomConstraints.join(" ; ")}.`
    );
  }

  // Phrase 4 — commentaire + extra context chat
  const trailing: string[] = [];
  const trimmed = comment?.trim() ?? "";
  if (trimmed.length > 0) trailing.push(`commentaire : « ${trimmed} »`);
  if (chatExtra.length > 0) trailing.push(`notes chat : ${chatExtra.join(" ; ")}`);
  if (trailing.length > 0) {
    sentences.push(`À respecter — ${trailing.join(" ; ")}.`);
  }

  // Phrase finale — nb visuels
  if (targetVisualCount && targetVisualCount > 0) {
    sentences.push(
      `${targetVisualCount} visuel${targetVisualCount > 1 ? "s seront générés" : " sera généré"} avec des variations d'angle.`
    );
  }

  return sentences.join(" ");
}
