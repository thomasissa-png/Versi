/**
 * Versi Studio — Détection d'ambiguïté Étape 4 v2 (T1-T5)
 *
 * Évalue 5 triggers pré-génération sur les pièces actives d'un projet.
 * Les questions générées sont persistées dans vs_visual_questions et
 * remontées au frontend pour affichage dans la modale chat bloquante.
 *
 * Triggers (ordre d'évaluation) :
 *  T1 — surface aberrante       (déterministe SQL, 0 IA)
 *  T2 — photo manquante         (déterministe SQL, 0 IA)
 *  T5 — surface inconnue        (déterministe SQL, 0 IA)
 *  T3 — conflit style/comment   (pré-filtre kw + 1 appel gpt-4o-mini si match)
 *  T4 — photos incohérentes     (1 appel gpt-4o-mini vision SYNC par pièce ≥ 2 photos)
 *
 * Tant qu'au moins 1 question avec status='asked' existe pour le project_id,
 * la génération est bloquée côté API (route /api/vs/visuals/generate).
 *
 * Source : docs/ia/visuals-step-v2-pipeline.md §4.
 */

import OpenAI from "openai";
import { query, withTransaction } from "@/lib/vs/db";
import { getStyle, getRoomLabel } from "@/lib/vs/styles";

// ─── Types publics ─────────────────────────────────────────────────

export type TriggerType =
  | "surface_aberrante"
  | "photo_manquante"
  | "conflit_style_commentaire"
  | "photos_incoherentes"
  | "surface_inconnue";

export interface AmbiguityQuestion {
  id: string;
  project_id: string;
  room_id: string | null;
  trigger_type: TriggerType;
  question_text: string;
  status: "asked" | "answered" | "expired";
  asked_at: string;
}

// ─── Singleton OpenAI ──────────────────────────────────────────────

let _openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

// ─── Helpers internes ──────────────────────────────────────────────

interface RoomRow {
  id: string;
  lot_id: string;
  room_type: string;
  custom_label: string | null;
  surface_m2: number | null;
  comment_text: string | null;
  target_visual_count: number;
  photo_count: number;
}

interface PhotoRow {
  id: string;
  room_id: string;
  file_path: string;
  taken_at: string | null;
  is_placed_on_plan: boolean;
}

const LARGE_ROOM_TYPES = new Set([
  "salon", "sejour", "salle_a_manger", "chambre",
  "chambre_parentale", "sdb", "salle_de_bain", "cuisine",
]);

const STRUCTURAL_KEYWORDS = [
  "démolir", "demolir", "abattre", "supprimer", "détruire", "detruire",
  "casser", "ouvrir", "percer", "modifier",
];

const PRESERVATION_STYLE_IDS = new Set(["classique", "art-deco", "haussmannien", "prestige"]);

function getRoomLabelSafe(room: Pick<RoomRow, "room_type" | "custom_label">): string {
  return room.custom_label?.trim() || getRoomLabel(room.room_type) || room.room_type;
}

function commentMatchesStructuralKeyword(comment: string): string | null {
  const lower = comment.toLowerCase();
  for (const kw of STRUCTURAL_KEYWORDS) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

// ─── T1 — Surface aberrante (déterministe) ────────────────────────

function isT1SurfaceAberrante(room: RoomRow): boolean {
  if (room.surface_m2 == null) return false; // T5 traite ce cas
  if (room.surface_m2 < 4) return true;
  if (LARGE_ROOM_TYPES.has(room.room_type) && room.surface_m2 > 80) return true;
  return false;
}

function buildT1Question(room: RoomRow): string {
  const label = getRoomLabelSafe(room);
  return `La surface détectée est ${room.surface_m2} m² pour ${label}. Est-ce correct, ou faut-il la corriger avant génération ? Réponse acceptée : un nombre en m², ou 'oui'.`;
}

// ─── T2 — Photo manquante (déterministe) ──────────────────────────

function isT2PhotoManquante(room: RoomRow): boolean {
  return room.target_visual_count > 0 && room.photo_count === 0;
}

function buildT2Question(room: RoomRow): string {
  const label = getRoomLabelSafe(room);
  return `Vous demandez ${room.target_visual_count} visuel(s) pour ${label} mais aucune photo n'y est placée. Placez une photo sur le plan, ou répondez 'passer à 0' pour désactiver la génération de cette pièce.`;
}

// ─── T5 — Surface inconnue (déterministe) ─────────────────────────

function isT5SurfaceInconnue(room: RoomRow): boolean {
  return room.surface_m2 == null && room.target_visual_count > 0;
}

function buildT5Question(room: RoomRow): string {
  const label = getRoomLabelSafe(room);
  return `La surface de ${label} est inconnue. Estimez-la en m² (un nombre entre 4 et 100) pour que l'IA proportionne les meubles correctement.`;
}

// ─── T3 — Conflit style/commentaire (1 appel gpt-4o-mini si pré-filtre match) ──

interface T3Context {
  room: RoomRow;
  styleId: string;
}

async function evaluateT3(ctx: T3Context): Promise<{ conflit: boolean; raison?: string; motDetecte?: string } | null> {
  const room = ctx.room;
  if (!room.comment_text) return null;
  const matchedKw = commentMatchesStructuralKeyword(room.comment_text);
  if (!matchedKw) return null;
  if (!PRESERVATION_STYLE_IDS.has(ctx.styleId)) return null;

  // Pré-filtre OK + style à préservation → 1 appel gpt-4o-mini pour confirmer
  const style = getStyle(ctx.styleId);
  const styleName = style?.name ?? ctx.styleId;
  const styleHint = style?.prompt_hint ?? "";

  const sysPrompt = `Le style choisi pour cette pièce est "${styleName}" (description: ${styleHint}).
Le commentaire utilisateur est: "${room.comment_text}".
Question: ce commentaire décrit-il une transformation structurelle (suppression de mur, etc.) qui pourrait entrer en conflit avec le style préservation/patrimonial ?
Réponds STRICTEMENT en JSON: {"conflit": true|false, "raison": "courte phrase"}`;

  try {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [{ role: "system", content: sysPrompt }],
    });
    const textOutput = response.output.find((o: { type: string }) => o.type === "message");
    if (!textOutput || textOutput.type !== "message") return null;
    const msg = textOutput as { content: Array<{ type: string; text?: string }> };
    const textContent = msg.content.find((c) => c.type === "output_text");
    if (!textContent?.text) return null;
    const cleaned = textContent.text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const parsed: { conflit?: boolean; raison?: string } = JSON.parse(cleaned);
    if (parsed.conflit !== true) return null;
    return { conflit: true, raison: parsed.raison ?? "transformation structurelle détectée", motDetecte: matchedKw };
  } catch (err) {
    console.warn("[ambiguity-detector] T3 gpt-4o-mini call failed:", err instanceof Error ? err.message : err);
    return null; // erreur IA → pas de question (silencieux, on ne bloque pas Thomas pour autant)
  }
}

function buildT3Question(room: RoomRow, motDetecte: string, styleName: string): string {
  const label = getRoomLabelSafe(room);
  return `Votre commentaire mentionne « ${motDetecte} » pour ${label} (style ${styleName}). Voulez-vous : (A) montrer la pièce après transformation structurelle complète, (B) garder l'aspect ${styleName} préservé sans modification structurelle ? Répondez A ou B.`;
}

// ─── T4 — Photos incohérentes (1 appel gpt-4o-mini vision SYNC par pièce ≥ 2 photos) ──

interface T4Context {
  room: RoomRow;
  photos: PhotoRow[];
  loadPhotoBytes: (photo: PhotoRow) => Promise<Buffer | null>;
}

async function evaluateT4(ctx: T4Context): Promise<{ coherent: boolean; raison?: string } | null> {
  const placedPhotos = ctx.photos.filter((p) => p.is_placed_on_plan);
  if (placedPhotos.length < 2) return null;

  // Charge en parallèle, downscale via sharp pour limiter les tokens vision
  const sharp = (await import("sharp")).default;
  const imageInputs: Array<{ type: "input_image"; image_url: string; detail: "auto" }> = [];
  for (const photo of placedPhotos) {
    const bytes = await ctx.loadPhotoBytes(photo);
    if (!bytes) continue;
    try {
      const small = await sharp(bytes).resize(512, 512, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
      imageInputs.push({
        type: "input_image",
        image_url: `data:image/jpeg;base64,${small.toString("base64")}`,
        detail: "auto",
      });
    } catch (err) {
      console.warn("[ambiguity-detector] T4 thumbnail failed for photo", photo.id, err);
    }
  }
  if (imageInputs.length < 2) return null;

  const label = getRoomLabelSafe(ctx.room);
  const sysPrompt = `Voici ${imageInputs.length} photos d'une même pièce (${label}). Évalue si elles montrent des états COHÉRENTS pour générer des visuels post-travaux unifiés.
Critères d'incohérence: éclairage très différent (jour vs nuit), état très différent (brut vs partiellement meublé), saison/décor visiblement différents.
Réponds STRICTEMENT en JSON: {"coherent": true|false, "raison": "courte phrase si non cohérent"}`;

  try {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: sysPrompt },
        { role: "user", content: imageInputs },
      ],
    });
    const textOutput = response.output.find((o: { type: string }) => o.type === "message");
    if (!textOutput || textOutput.type !== "message") return null;
    const msg = textOutput as { content: Array<{ type: string; text?: string }> };
    const textContent = msg.content.find((c) => c.type === "output_text");
    if (!textContent?.text) return null;
    const cleaned = textContent.text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const parsed: { coherent?: boolean; raison?: string } = JSON.parse(cleaned);
    if (parsed.coherent !== false) return null;
    return { coherent: false, raison: parsed.raison ?? "états visuels divergents" };
  } catch (err) {
    console.warn("[ambiguity-detector] T4 gpt-4o-mini vision call failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

function buildT4Question(room: RoomRow, raison: string): string {
  const label = getRoomLabelSafe(room);
  return `Les photos de ${label} semblent montrer des états différents (${raison}). Quel état cible pour les visuels ? (A) état actuel + meubles cibles, (B) après gros œuvre seulement, (C) entièrement remeublé. Répondez A, B ou C.`;
}

// ─── Orchestration principale ──────────────────────────────────────

export interface DetectAmbiguitiesOptions {
  /** Style choisi pour le projet (utilisé par T3). */
  styleId: string;
  /**
   * Loader de bytes photo pour T4 — découplé du module pour permettre
   * différentes sources (filesystem local, Object Storage, etc.).
   */
  loadPhotoBytes: (photo: PhotoRow) => Promise<Buffer | null>;
}

/**
 * Évalue les 5 triggers sur toutes les pièces actives du projet,
 * persiste les nouvelles questions et retourne la liste pour le frontend.
 *
 * Idempotent partiel : si une question existe déjà avec le même (room_id,
 * trigger_type, status='asked'), on ne la duplique pas. Permet de relancer
 * la détection sans flooder la table.
 *
 * @returns Liste complète des questions status='asked' pour ce projet
 *          (nouvelles + anciennes encore en attente).
 */
export async function detectAmbiguities(
  projectId: string,
  options: DetectAmbiguitiesOptions
): Promise<AmbiguityQuestion[]> {
  // 1. Charger toutes les pièces actives du projet (avec settings + count photos)
  const roomsResult = await query<RoomRow>(
    `
    SELECT
      r.id,
      r.lot_id,
      r.room_type,
      r.custom_label,
      r.surface_m2::FLOAT AS surface_m2,
      rs.comment_text,
      COALESCE(rs.target_visual_count, 3) AS target_visual_count,
      (SELECT COUNT(*)::INT FROM vs_photos p
         WHERE p.room_id = r.id AND p.is_placed_on_plan = true) AS photo_count
    FROM vs_rooms r
    JOIN vs_lots l ON l.id = r.lot_id
    LEFT JOIN vs_room_settings rs ON rs.room_id = r.id
    WHERE l.project_id = $1
    `,
    [projectId]
  );
  const rooms = roomsResult.rows;
  if (rooms.length === 0) return [];

  // 2. Charger les photos placées (pour T4)
  const photosResult = await query<PhotoRow>(
    `
    SELECT p.id, p.room_id, p.file_path, p.taken_at::TEXT AS taken_at, p.is_placed_on_plan
      FROM vs_photos p
      JOIN vs_rooms r ON r.id = p.room_id
      JOIN vs_lots l ON l.id = r.lot_id
     WHERE l.project_id = $1 AND p.is_placed_on_plan = true
    `,
    [projectId]
  );
  const photosByRoom = new Map<string, PhotoRow[]>();
  for (const ph of photosResult.rows) {
    const list = photosByRoom.get(ph.room_id) ?? [];
    list.push(ph);
    photosByRoom.set(ph.room_id, list);
  }

  // 3. Évaluer T1, T2, T5 (déterministes, instantanés)
  type PendingInsert = { trigger_type: TriggerType; room_id: string; question_text: string };
  const pending: PendingInsert[] = [];

  for (const room of rooms) {
    if (room.target_visual_count <= 0) continue; // pièce désactivée → skip
    if (isT1SurfaceAberrante(room)) {
      pending.push({ trigger_type: "surface_aberrante", room_id: room.id, question_text: buildT1Question(room) });
    }
    if (isT2PhotoManquante(room)) {
      pending.push({ trigger_type: "photo_manquante", room_id: room.id, question_text: buildT2Question(room) });
    }
    if (isT5SurfaceInconnue(room)) {
      pending.push({ trigger_type: "surface_inconnue", room_id: room.id, question_text: buildT5Question(room) });
    }
  }

  // 4. Évaluer T3 (parallèle sur toutes les pièces avec commentaire)
  const t3Promises = rooms
    .filter((r: RoomRow) => r.target_visual_count > 0 && r.comment_text)
    .map(async (room: RoomRow) => {
      const result = await evaluateT3({ room, styleId: options.styleId });
      if (!result) return null;
      const styleName = getStyle(options.styleId)?.name ?? options.styleId;
      return {
        trigger_type: "conflit_style_commentaire" as TriggerType,
        room_id: room.id,
        question_text: buildT3Question(room, result.motDetecte ?? "transformation", styleName),
      };
    });
  const t3Results = await Promise.all(t3Promises);
  for (const r of t3Results) if (r) pending.push(r);

  // 5. Évaluer T4 (parallèle sur toutes les pièces ≥ 2 photos)
  const t4Promises = rooms
    .filter((r: RoomRow) => r.target_visual_count > 0 && (photosByRoom.get(r.id)?.length ?? 0) >= 2)
    .map(async (room: RoomRow) => {
      const result = await evaluateT4({
        room,
        photos: photosByRoom.get(room.id) ?? [],
        loadPhotoBytes: options.loadPhotoBytes,
      });
      if (!result) return null;
      return {
        trigger_type: "photos_incoherentes" as TriggerType,
        room_id: room.id,
        question_text: buildT4Question(room, result.raison ?? "états divergents"),
      };
    });
  const t4Results = await Promise.all(t4Promises);
  for (const r of t4Results) if (r) pending.push(r);

  // 6. Persister les nouvelles questions (skip si même (room_id, trigger_type)
  // existe déjà en status='asked' — évite duplicatas si Thomas relance preflight)
  if (pending.length > 0) {
    await withTransaction(async (client) => {
      for (const q of pending) {
        await client.query(
          `
          INSERT INTO vs_visual_questions (project_id, room_id, trigger_type, question_text, status)
          SELECT $1, $2, $3, $4, 'asked'
          WHERE NOT EXISTS (
            SELECT 1 FROM vs_visual_questions
             WHERE project_id = $1 AND room_id = $2 AND trigger_type = $3 AND status = 'asked'
          )
          `,
          [projectId, q.room_id, q.trigger_type, q.question_text]
        );
      }
    });
  }

  // 7. Retourner la liste complète des questions en attente pour le frontend
  const result = await query<AmbiguityQuestion>(
    `
    SELECT id, project_id, room_id, trigger_type, question_text, status, asked_at::TEXT AS asked_at
      FROM vs_visual_questions
     WHERE project_id = $1 AND status = 'asked'
     ORDER BY asked_at ASC
    `,
    [projectId]
  );
  return result.rows;
}

/**
 * Marque une question comme répondue (utilisé par PATCH /api/vs/visuals/questions/:id).
 * Retourne true si la question existait et a été mise à jour.
 */
export async function answerQuestion(questionId: string, answer: string): Promise<boolean> {
  const result = await query(
    `
    UPDATE vs_visual_questions
       SET user_answer = $2,
           answered_at = NOW(),
           status = 'answered'
     WHERE id = $1 AND status = 'asked'
    `,
    [questionId, answer]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Indique si le projet a au moins une question en attente (bloque la génération).
 */
export async function hasBlockingQuestions(projectId: string): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    `
    SELECT EXISTS(
      SELECT 1 FROM vs_visual_questions
       WHERE project_id = $1 AND status = 'asked'
    ) AS exists
    `,
    [projectId]
  );
  return result.rows[0]?.exists ?? false;
}
