/**
 * Helper — construction d'une description textuelle à injecter dans le prompt
 * IA à partir des segments annotés (Feature B s32 autopilot).
 *
 * Pattern : pour chaque segment du polygone, on calcule sa position relative
 * dans la pièce (haut/bas/gauche/droite + diagonales NE/NO/SE/SO) en se basant
 * sur le centroïde du polygone. On groupe ensuite par type et on émet une
 * description structurée injectable dans buildVisualPromptAnchor.
 *
 * Pas d'angle Nord stocké côté projet → on utilise les positions relatives
 * canvas (haut/bas/gauche/droite). C'est suffisant pour donner à l'IA une
 * indication spatiale cohérente avec la photo prise depuis le polygone.
 *
 * Usage :
 *   const block = buildSegmentDescription(polygon, segments);
 *   // block = "Caractéristiques de la pièce : ..."
 *   // À concaténer au prompt avant la directive de génération.
 */

import type { ZonePolygonPoint, VsRoomSegment, VsRoomSegmentType } from "../types";

// ─── Position relative d'un segment ───────────────────────────────

/**
 * 8 secteurs spatiaux relatifs (haut/bas/gauche/droite + diagonales).
 * On utilise des termes neutres "côté X" pour éviter de promettre un Nord
 * cardinal qu'on ne connaît pas.
 */
type RelativeSide =
  | "haut"
  | "haut-droit"
  | "droit"
  | "bas-droit"
  | "bas"
  | "bas-gauche"
  | "gauche"
  | "haut-gauche";

const SIDE_LABELS: Record<RelativeSide, string> = {
  haut: "côté haut du plan",
  "haut-droit": "côté haut-droit",
  droit: "côté droit",
  "bas-droit": "côté bas-droit",
  bas: "côté bas du plan",
  "bas-gauche": "côté bas-gauche",
  gauche: "côté gauche",
  "haut-gauche": "côté haut-gauche",
};

// ─── s33 (Lot A — fix issue #3) — Transform side du plan → frame caméra ────
//
// Les côtés "droit/gauche/haut/bas" de SIDE_LABELS sont exprimés dans le
// référentiel CANVAS DU PLAN vu de dessus (x croissant = droite du plan,
// y croissant = bas du plan). Mais le LLM image reçoit en plus une caméra
// avec angle cardinal (0=nord, 90=est, etc.). Sans transformation, le LLM
// hallucine la correspondance → toutes les vues finissent identiques (bug #3).
//
// Cette fonction calcule où apparaît un segment dans le frame caméra en
// composant l'angle du segment (depuis le centroïde) avec l'angle de la
// caméra. Convention :
//   - angle plan (sideAngleDeg) : 0=est du plan, 90=sud du plan, 180=ouest, 270=nord
//   - angle caméra (cameraAngleDeg) : direction d'où regarde le photographe
//     (0=nord, 90=est… cf. angleDegreesToCardinal()). La caméra REGARDE VERS
//     le centroïde, donc son axe optique pointe à cameraAngleDeg + 180.
//   - relative : angle du segment vu DEPUIS la caméra, dans son repère.
//     [-45°,+45°] → centre du frame. ]+45°,+135°] → droite. etc.
//
// Si cameraAngleDeg est null (pas de photo placée) → "unknown" (le LLM
// continuera de recevoir le côté du plan sans transformation, comportement
// historique préservé).
export type CameraFramePosition =
  | "left of frame"
  | "center of frame"
  | "right of frame"
  | "behind camera"
  | "unknown";

const SIDE_TO_PLAN_ANGLE_DEG: Record<RelativeSide, number> = {
  droit: 0,
  "bas-droit": 45,
  bas: 90,
  "bas-gauche": 135,
  gauche: 180,
  "haut-gauche": 225,
  haut: 270,
  "haut-droit": 315,
};

export function transformSideToCameraFrame(
  plansSide: RelativeSide,
  cameraAngleDeg: number | null
): CameraFramePosition {
  if (cameraAngleDeg == null) return "unknown";
  const sideAngle = SIDE_TO_PLAN_ANGLE_DEG[plansSide];
  // La caméra REGARDE VERS le centroïde depuis cameraAngleDeg (boussole 0=nord).
  // Pour aligner avec l'angle plan (0=est), on convertit la boussole caméra :
  // boussole 0 (nord) = plan 270°, boussole 90 (est) = plan 0°, etc.
  // → cameraOnPlanAxis = (cameraAngleDeg - 90 + 360) % 360.
  // Le segment vu DEPUIS la caméra est en (sideAngle - axe-vers-centroïde).
  // Axe optique caméra (regardant vers le centroïde) = cameraOnPlanAxis + 180.
  const cameraOnPlanAxis = (cameraAngleDeg - 90 + 360) % 360;
  const opticalAxis = (cameraOnPlanAxis + 180) % 360;
  // Angle relatif segment / axe optique : 0° = pile en face (centre du frame),
  // ±90° = sur les côtés, ±180° = derrière la caméra.
  const relative = (sideAngle - opticalAxis + 540) % 360 - 180; // [-180, 180]
  // Convention canvas (y croissant vers le bas) inverse le sens horaire
  // par rapport à un repère mathématique standard : relative > 0 (segment
  // à "+90° anti-horaire" dans le canvas) signifie en réalité que le
  // photographe a ce segment à sa GAUCHE physique (car y-bas = miroir).
  // → relative > 0 = gauche du frame, relative < 0 = droite du frame.
  if (relative > 135 || relative <= -135) return "behind camera";
  if (relative > 45 && relative <= 135) return "right of frame";
  if (relative >= -45 && relative <= 45) return "center of frame";
  return "left of frame"; // -135 < relative < -45
}

/**
 * Calcule le secteur relatif d'un segment en se basant sur l'angle entre
 * son milieu et le centroïde du polygone. Convention canvas :
 * - x croissant = vers la droite
 * - y croissant = vers le bas
 * Angle 0 = est, π/2 = bas, π = ouest, 3π/2 = haut. On découpe en 8 secteurs.
 */
function computeSegmentSide(
  segmentMidX: number,
  segmentMidY: number,
  centroidX: number,
  centroidY: number
): RelativeSide {
  const dx = segmentMidX - centroidX;
  const dy = segmentMidY - centroidY;
  if (Math.hypot(dx, dy) < 1e-6) return "haut"; // dégénéré
  // angle [0, 2π) — sens horaire dans le canvas (y vers le bas)
  let theta = Math.atan2(dy, dx);
  if (theta < 0) theta += 2 * Math.PI;
  // 8 secteurs de π/4, centrés sur les axes (haut = -π/2 = 3π/2)
  // On indexe : 0..7 correspondant à east, south-east, south, south-west, west, north-west, north, north-east
  // En labels canvas : east=droit, south=bas, west=gauche, north=haut.
  const idx = Math.round(theta / (Math.PI / 4)) % 8;
  const sides: RelativeSide[] = [
    "droit",
    "bas-droit",
    "bas",
    "bas-gauche",
    "gauche",
    "haut-gauche",
    "haut",
    "haut-droit",
  ];
  return sides[idx];
}

// ─── Description d'un segment ─────────────────────────────────────

interface DescribedSegment {
  segmentIndex: number;
  type: VsRoomSegmentType;
  side: RelativeSide;
  /** notes utilisateur (libre, optionnel) */
  notes: string | null;
}

const TYPE_LABEL: Record<VsRoomSegmentType, string> = {
  wall: "mur plein",
  door: "porte",
  window: "fenêtre",
  bay_window: "baie vitrée à créer",
  opening: "ouverture libre",
  flexible: "segment modifiable",
};

/**
 * Construit la liste des segments décrits avec leur position relative.
 * Les segments dont l'index dépasse le polygone (cas polygone réduit après
 * une annotation) sont ignorés silencieusement.
 */
export function describeSegments(
  polygon: ZonePolygonPoint[] | null,
  segments: VsRoomSegment[]
): DescribedSegment[] {
  if (!polygon || polygon.length < 3) return [];
  if (segments.length === 0) return [];

  // Centroïde simple (moyenne arithmétique — assez précis pour positionnement
  // qualitatif, et cohérent avec polygonCentroid de types.ts).
  const sumX = polygon.reduce((a, p) => a + p.x_percent, 0);
  const sumY = polygon.reduce((a, p) => a + p.y_percent, 0);
  const cx = sumX / polygon.length;
  const cy = sumY / polygon.length;

  const out: DescribedSegment[] = [];
  for (const seg of segments) {
    if (seg.segment_index < 0 || seg.segment_index >= polygon.length) continue;
    const a = polygon[seg.segment_index];
    const b = polygon[(seg.segment_index + 1) % polygon.length];
    const midX = (a.x_percent + b.x_percent) / 2;
    const midY = (a.y_percent + b.y_percent) / 2;
    const side = computeSegmentSide(midX, midY, cx, cy);
    out.push({
      segmentIndex: seg.segment_index,
      type: seg.type,
      side,
      notes: seg.notes,
    });
  }
  return out;
}

// ─── Bloc texte injecté au prompt ─────────────────────────────────

/**
 * Format d'agrégation : groupe par type, puis liste les positions.
 * Ex :
 *   - Au côté droit : 1 porte (entrée principale)
 *   - Au côté gauche : 2 fenêtres
 *   - Au côté haut : ouverture libre vers la cuisine
 *   - À ajouter dans le rendu : baie vitrée au côté bas
 *   - Mur(s) plein(s) : côté droit, côté haut-droit
 *
 * Les segments 'wall' sont placés en dernier (info la moins critique pour l'IA).
 * Les 'flexible' sont mentionnés comme "modifiables" pour signaler qu'ils
 * peuvent être réinterprétés librement.
 */
export function buildSegmentDescription(
  polygon: ZonePolygonPoint[] | null,
  segments: VsRoomSegment[]
): string {
  const described = describeSegments(polygon, segments);
  if (described.length === 0) return "";

  // Si TOUS les segments sont 'wall' (= aucune annotation utilisateur faite),
  // on n'injecte rien : ne pas polluer le prompt avec des évidences.
  const allWalls = described.every((d) => d.type === "wall");
  if (allWalls) return "";

  // Groupage par type
  const byType = new Map<VsRoomSegmentType, DescribedSegment[]>();
  for (const d of described) {
    const list = byType.get(d.type) ?? [];
    list.push(d);
    byType.set(d.type, list);
  }

  const lines: string[] = [];
  // Ordre éditorial : door > window > bay_window > opening > flexible > wall
  const order: VsRoomSegmentType[] = [
    "door",
    "window",
    "bay_window",
    "opening",
    "flexible",
    "wall",
  ];
  for (const t of order) {
    const list = byType.get(t);
    if (!list || list.length === 0) continue;
    if (t === "wall") {
      // Liste les côtés
      const sides = list.map((d) => SIDE_LABELS[d.side]).join(", ");
      lines.push(`- Mur(s) plein(s) : ${sides}.`);
      continue;
    }
    if (t === "bay_window") {
      // Bay = "à créer dans le rendu"
      const sides = list.map((d) => SIDE_LABELS[d.side]).join(", ");
      const verb = list.length > 1 ? "ajouter" : "ajouter";
      lines.push(
        `- À ${verb} dans le rendu : ${list.length} baie(s) vitrée(s) au ${sides}.`
      );
      continue;
    }
    if (t === "flexible") {
      const sides = list.map((d) => SIDE_LABELS[d.side]).join(", ");
      lines.push(
        `- Segment(s) flexible(s) (l'IA peut adapter ces ouvertures librement) : ${sides}.`
      );
      continue;
    }
    // door / window / opening : "Au <côté> : N <type>"
    // On groupe encore par côté pour aérer la formulation
    const bySide = new Map<RelativeSide, number>();
    for (const d of list) bySide.set(d.side, (bySide.get(d.side) ?? 0) + 1);
    const segs: string[] = [];
    for (const [side, count] of bySide) {
      const label = TYPE_LABEL[t];
      segs.push(
        `Au ${SIDE_LABELS[side]} : ${count} ${count > 1 ? `${label}s` : label}`
      );
    }
    for (const s of segs) lines.push(`- ${s}.`);
  }

  // Notes utilisateur libres (optionnelles)
  const withNotes = described.filter(
    (d) => typeof d.notes === "string" && d.notes.trim().length > 0
  );
  if (withNotes.length > 0) {
    for (const d of withNotes) {
      lines.push(
        `- Note (${TYPE_LABEL[d.type]} au ${SIDE_LABELS[d.side]}) : ${d.notes!.trim()}.`
      );
    }
  }

  return `Caractéristiques de la pièce (annotées par l'utilisateur sur le plan) :\n${lines.join("\n")}`;
}

/**
 * Version anglaise pour injection directe dans le prompt OpenAI.
 * (Le reste du prompt buildVisualPromptAnchor est en anglais — on conserve
 * la cohérence pour ne pas surprendre le modèle.)
 */
export function buildSegmentDescriptionEn(
  polygon: ZonePolygonPoint[] | null,
  segments: VsRoomSegment[],
  /** s33 (Lot A — fix issue #3) — angle caméra (boussole 0=nord) pour
   *  composer côté plan → côté frame caméra. NULL/undefined = back-compat
   *  (pas de transformation, comportement historique). */
  cameraAngleDeg: number | null = null
): string {
  const described = describeSegments(polygon, segments);
  if (described.length === 0) return "";
  const allWalls = described.every((d) => d.type === "wall");
  if (allWalls) return "";

  const byType = new Map<VsRoomSegmentType, DescribedSegment[]>();
  for (const d of described) {
    const list = byType.get(d.type) ?? [];
    list.push(d);
    byType.set(d.type, list);
  }

  const sideEn: Record<RelativeSide, string> = {
    haut: "top side of the floor plan",
    "haut-droit": "top-right side",
    droit: "right side",
    "bas-droit": "bottom-right side",
    bas: "bottom side of the floor plan",
    "bas-gauche": "bottom-left side",
    gauche: "left side",
    "haut-gauche": "top-left side",
  };
  const typeEn: Record<VsRoomSegmentType, string> = {
    wall: "solid wall",
    door: "door",
    window: "window",
    bay_window: "bay window (NEW — to be created)",
    opening: "open passage to another space",
    flexible: "flexible opening (AI may reinterpret)",
  };

  // s33 (Lot A) — formate "right side (= right of frame for this camera angle)"
  // si caméra connue. Sinon retourne juste le côté plan (back-compat).
  const formatSide = (side: RelativeSide): string => {
    const planLabel = sideEn[side];
    const frame = transformSideToCameraFrame(side, cameraAngleDeg);
    if (frame === "unknown") return planLabel;
    return `${planLabel} (= ${frame} for this camera angle)`;
  };

  const lines: string[] = [];
  const order: VsRoomSegmentType[] = [
    "door",
    "window",
    "bay_window",
    "opening",
    "flexible",
    "wall",
  ];
  for (const t of order) {
    const list = byType.get(t);
    if (!list || list.length === 0) continue;
    if (t === "wall") {
      const sides = list.map((d) => formatSide(d.side)).join(", ");
      lines.push(`- Solid walls on: ${sides}.`);
      continue;
    }
    if (t === "bay_window") {
      const sides = list.map((d) => formatSide(d.side)).join(", ");
      lines.push(
        `- TO BE ADDED in the render: ${list.length} bay window(s) on ${sides}. This is a structural change — the bay window must be clearly visible.`
      );
      continue;
    }
    if (t === "flexible") {
      const sides = list.map((d) => formatSide(d.side)).join(", ");
      lines.push(
        `- Flexible segment(s) (you may reinterpret as you see fit): ${sides}.`
      );
      continue;
    }
    const bySide = new Map<RelativeSide, number>();
    for (const d of list) bySide.set(d.side, (bySide.get(d.side) ?? 0) + 1);
    for (const [side, count] of bySide) {
      lines.push(`- On ${formatSide(side)}: ${count} ${typeEn[t]}${count > 1 ? "s" : ""}.`);
    }
  }

  const withNotes = described.filter(
    (d) => typeof d.notes === "string" && d.notes.trim().length > 0
  );
  if (withNotes.length > 0) {
    for (const d of withNotes) {
      lines.push(
        `- Note (${typeEn[d.type]} on ${formatSide(d.side)}) (dealer-confirmed): ${d.notes!.trim()}.`
      );
    }
  }

  // s33 (Lot A — fix issue #1) — tag AUTHORITATIVE + override directive.
  // Sans ce tag, le LLM voyait deux instructions concurrentes (segments vs
  // STRICT RULE 1 « keep photo exactly ») et choisissait la photo. Désormais
  // le bloc segments override explicitement la photo source.
  const cameraNote = cameraAngleDeg != null
    ? `\n\nNote: the camera angle for THIS specific photo is provided in the CONTEXT section. Per-segment "X of frame" annotations above are pre-computed for this angle — place openings accordingly in the rendered image.`
    : `\n\nNote: positions are expressed relative to the floor plan viewed from above. Translate these floor-plan sides into the camera's frame using the camera angle described in the CONTEXT section. If a door is on "right side of the floor plan" and the camera looks "from the south-west", the door appears in the right portion of the frame; if the camera looks "from the north-east", the same door appears in the LEFT portion of the frame.`;

  return `ROOM OPENINGS — OPERATOR-ANNOTATED (dealer-confirmed, AUTHORITATIVE: these locations override anything inferred from the source photo):\n${lines.join("\n")}${cameraNote}`;
}
