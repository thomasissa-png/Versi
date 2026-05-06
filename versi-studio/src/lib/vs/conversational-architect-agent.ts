/**
 * s32 (Phase 9) — Architecte conversationnel.
 *
 * Service de chat ciblé qui pose des questions sur les ambiguïtés non couvertes
 * par les pills V3 (architectural_profile + architectural_details). Les pills
 * restent la source de vérité ; le chat est ADDITIF.
 *
 * Anti-patterns à NE PAS reproduire :
 *   - `ChatAgent.tsx` existant a `CHAT_SUGGESTIONS` HARDCODÉES — interdit ici.
 *   - Les suggestions DOIVENT être générées dynamiquement par le LLM via le tool
 *     `ask_question`, contextualisées à la pièce courante.
 *
 * Tools exposés au LLM (gpt-4o-mini, function calling) :
 *   1. ask_question      → { question, suggestions[2-4] }   — pose une question ciblée
 *   2. update_field      → { field, value, scope } — pré-remplit pill côté UI + toast
 *   3. record_extra_context → { key, value } — info hors-pills (cloison amovible, etc.)
 *   4. validate_brief    → { confidence, summary } — signal IA prête → bouton vert
 *
 * Flux :
 *   - userMessage=null → init : génère synthèse 3 sections + 1ère question
 *   - userMessage="..." → réponse : LLM décide d'appeler 1+ tools
 *   - Le client applique les tool_calls (PATCH pills, toast, bouton vert) et
 *     persiste le transcript via /api/vs/rooms/:id/chat/message.
 *
 * Mode dégradé : si OPENAI_API_KEY absente OU si parsing échoue → renvoie un
 * fake transcript minimal (pas d'erreur 500). UI doit fonctionner sans LLM.
 *
 * Coût indicatif : ~500 in + 300 out tokens par tour → ~$0.0003 / tour. Négligeable.
 */

import OpenAI from "openai";
import type {
  ChatMessage,
  VsLot,
  VsRoom,
  OperationChatContext,
  ArchitecturalProfile,
  ArchitecturalDetails,
  VsRoomSegment,
} from "./types";
import {
  ARCHITECTURAL_PROFILE_OPTIONS,
  ARCHITECTURAL_DETAILS_OPTIONS,
} from "./types";

// ─── Singleton OpenAI ──────────────────────────────────────────────
let _openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.startsWith("sk-placeholder") || key.length < 20) {
    return null;
  }
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: key });
  }
  return _openaiClient;
}

const MODEL = "gpt-4o-mini";
const TIMEOUT_MS = 30_000;
const MAX_TOOL_ROUNDS = 3;

// ─── Types publics ─────────────────────────────────────────────────

export interface ChatProcessParams {
  roomId: string;
  /** null = init de la conversation (synthèse + 1ère question). */
  userMessage: string | null;
  context: {
    lot: VsLot;
    room: VsRoom;
    photoUrl?: string;
    segments?: VsRoomSegment[];
    transcript: ChatMessage[];
  };
}

export interface ChatToolCall {
  name: "ask_question" | "update_field" | "record_extra_context" | "validate_brief";
  args: Record<string, unknown>;
  result: string;
}

export interface ChatProcessResult {
  reply: ChatMessage;
  toolCalls: ChatToolCall[];
  briefValidated: boolean;
  /** Confidence retournée par validate_brief (high/medium/low). null si non appelé. */
  briefConfidence: "high" | "medium" | "low" | null;
  /** Patch d'extra_context à merger côté API (clé→valeur). */
  extraContextPatch: Record<string, string>;
  /** Patch operation_chat_context à merger côté API (lot-level). */
  operationContextPatch: Partial<OperationChatContext>;
  /** Field updates à propager côté UI (toast + handler local). */
  fieldUpdates: Array<{ field: string; value: string; scope: "room" | "lot" }>;
}

// ─── Tools schemas (OpenAI Function Calling) ───────────────────────

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "ask_question",
      description:
        "Pose UNE question ciblée à l'utilisateur sur un détail manquant ou ambigu. Génère 2 à 4 suggestions de réponses dynamiques contextualisées à la pièce. NE JAMAIS poser de question sur un champ déjà rempli dans les pills.",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "Question courte en français, ciblée, sans préambule.",
          },
          suggestions: {
            type: "array",
            description:
              "2 à 4 réponses suggérées dynamiques, contextualisées à la pièce. Pas de réponses génériques.",
            items: { type: "string" },
            minItems: 2,
            maxItems: 4,
          },
        },
        required: ["question", "suggestions"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_field",
      description:
        "Met à jour un pill (champ structuré) côté UI quand l'utilisateur a fourni l'info. Déclenche aussi un toast visible.",
      parameters: {
        type: "object",
        properties: {
          field: {
            type: "string",
            enum: [
              "floor",
              "walls",
              "lighting",
              "specifics",
              "level",
              "technical_constraints",
              "ceiling_height",
              "orientation",
              "general_state",
              "target_level",
              "target_audience",
              "style",
            ],
          },
          value: { type: "string" },
          scope: { type: "string", enum: ["room", "lot"] },
        },
        required: ["field", "value", "scope"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_extra_context",
      description:
        "Stocke une info hors-pills (ex: 'cloison amovible mur Sud', 'cheminée décorative seulement'). Sera injectée dans le prompt de génération.",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Clé snake_case courte (ex: 'cloison_amovible').",
          },
          value: { type: "string", description: "Description libre." },
        },
        required: ["key", "value"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "validate_brief",
      description:
        "Signal que tu disposes d'assez d'infos pour générer un visuel de qualité. Le bouton Générer passe en vert.",
      parameters: {
        type: "object",
        properties: {
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          summary: {
            type: "string",
            description: "Résumé court (1 phrase) du brief consolidé.",
          },
        },
        required: ["confidence", "summary"],
        additionalProperties: false,
      },
    },
  },
];

// ─── Helpers ───────────────────────────────────────────────────────

function describeProfile(p: ArchitecturalProfile | null | undefined): string {
  if (!p) return "vide";
  const parts: string[] = [];
  if (p.ceiling_height) parts.push(`hauteur ${p.ceiling_height}`);
  if (p.orientation) parts.push(`orientation ${p.orientation}`);
  if (p.general_state) parts.push(`état ${p.general_state}`);
  if (p.target_level) parts.push(`niveau ${p.target_level}`);
  if (p.target_audience) parts.push(`public ${p.target_audience}`);
  return parts.length ? parts.join(", ") : "vide";
}

function describeDetails(d: ArchitecturalDetails | null | undefined): string {
  if (!d) return "vides";
  const parts: string[] = [];
  if (d.floor?.value) parts.push(`sol ${d.floor.value}`);
  if (d.walls?.value) parts.push(`murs ${d.walls.value}`);
  if (d.lighting?.value) parts.push(`luminosité ${d.lighting.value}`);
  if (d.specifics && d.specifics.length > 0) {
    const labels = d.specifics
      .filter((s) => s.value)
      .map((s) => s.value as string);
    if (labels.length > 0) parts.push(`particularités: ${labels.join(", ")}`);
  }
  return parts.length ? parts.join(", ") : "vides";
}

function describeOperationContext(c: OperationChatContext | null | undefined): string {
  if (!c) return "vide";
  const parts: string[] = [];
  if (c.style) parts.push(`style ${c.style}`);
  if (c.target_audience) parts.push(`public ${c.target_audience}`);
  if (c.budget_estimate) parts.push(`budget ${c.budget_estimate}`);
  if (c.custom_notes && c.custom_notes.length > 0) {
    parts.push(`notes: ${c.custom_notes.join(" / ")}`);
  }
  return parts.length ? parts.join(", ") : "vide";
}

function listMissingFields(
  profile: ArchitecturalProfile | null | undefined,
  details: ArchitecturalDetails | null | undefined
): string[] {
  const missing: string[] = [];
  if (!profile?.ceiling_height) missing.push("ceiling_height (lot)");
  if (!profile?.orientation) missing.push("orientation (lot)");
  if (!profile?.general_state) missing.push("general_state (lot)");
  if (!profile?.target_level) missing.push("target_level (lot)");
  if (!profile?.target_audience) missing.push("target_audience (lot)");
  if (!details?.floor?.value) missing.push("floor (room)");
  if (!details?.walls?.value) missing.push("walls (room)");
  if (!details?.lighting?.value) missing.push("lighting (room)");
  if (!details?.specifics || details.specifics.length === 0) {
    missing.push("specifics (room — peut être 'Aucune')");
  }
  return missing;
}

/** s32 (Phase 9 + audit Thomas) — helpers de description « déjà rempli » par champ.
 *  Renvoie une chaîne lisible « Sol : Parquet (user) » OU « Sol : non renseigné ».
 *  Sert à injecter la liste KNOWN dans le system prompt pour interdire la
 *  redondance de questions. */
function fieldStatus(
  label: string,
  field: { value: string | null; source: "user" | "vision" | null; confirmed?: boolean } | undefined,
  fallback = "non renseigné"
): string {
  if (!field || field.value == null) return `${label} : ${fallback}`;
  const src = field.source ?? "user";
  const conf = field.confirmed === false ? " — à confirmer" : "";
  return `${label} : ${field.value} (${src}${conf})`;
}

function fieldStatusMulti(
  label: string,
  list: Array<{ value: string | null; source: "user" | "vision" | null; confirmed?: boolean }> | undefined,
  fallback = "non renseigné"
): string {
  if (!list || list.length === 0) return `${label} : ${fallback}`;
  const parts = list
    .filter((f) => f.value != null)
    .map((f) => {
      const src = f.source ?? "user";
      const conf = f.confirmed === false ? " — à confirmer" : "";
      return `${f.value} (${src}${conf})`;
    });
  if (parts.length === 0) return `${label} : ${fallback}`;
  return `${label} : ${parts.join(", ")}`;
}

function buildSystemPrompt(params: ChatProcessParams): string {
  const { lot, room, segments } = params.context;
  const segCount = segments?.length ?? 0;
  const segByType = segments
    ? segments.reduce<Record<string, number>>((acc, s) => {
        acc[s.type] = (acc[s.type] ?? 0) + 1;
        return acc;
      }, {})
    : {};

  const optsLot = ARCHITECTURAL_PROFILE_OPTIONS;
  const optsRoom = ARCHITECTURAL_DETAILS_OPTIONS;
  const profile = lot.architectural_profile;
  const details = room.architectural_details;

  // ─── Section "ALREADY KNOWN" — discipline LLM stricte ──────────────
  // s32 audit Thomas marchand 7/10 : injecter la valeur réelle de chaque
  // champ avec source/confirmed — l'IA ne doit JAMAIS re-demander un champ
  // qui a déjà une valeur. La distinction (user/vision/à-confirmer) permet
  // au LLM de décider intelligemment si elle peut suggérer une confirmation
  // pour un champ Vision non confirmé.
  const knownLot = [
    fieldStatus("Hauteur sous plafond", profile?.ceiling_height ? { value: profile.ceiling_height, source: "user" } : undefined),
    fieldStatus("Orientation", profile?.orientation ? { value: profile.orientation, source: "user" } : undefined),
    fieldStatus("État général", profile?.general_state ? { value: profile.general_state, source: "user" } : undefined),
    fieldStatus("Niveau visé (lot)", profile?.target_level ? { value: profile.target_level, source: "user" } : undefined),
    fieldStatus("Public cible", profile?.target_audience ? { value: profile.target_audience, source: "user" } : undefined),
  ].join("\n  - ");

  const knownRoom = [
    fieldStatus("Sol", details?.floor),
    fieldStatus("Murs", details?.walls),
    fieldStatus("Luminosité", details?.lighting),
    fieldStatusMulti("Particularités", details?.specifics),
    fieldStatus("Niveau prestation pièce", details?.level),
    fieldStatusMulti("Contraintes techniques", details?.technical_constraints),
  ].join("\n  - ");

  // ─── Liste explicite des champs ENCORE VIDES (peut être interrogée) ──
  const askable: string[] = [];
  if (!profile?.ceiling_height) askable.push("ceiling_height (lot)");
  if (!profile?.orientation) askable.push("orientation (lot)");
  if (!profile?.general_state) askable.push("general_state (lot)");
  if (!profile?.target_level) askable.push("target_level (lot)");
  if (!profile?.target_audience) askable.push("target_audience (lot)");
  if (!details?.floor?.value) askable.push("floor (room)");
  if (!details?.walls?.value) askable.push("walls (room)");
  if (!details?.lighting?.value) askable.push("lighting (room)");
  if (!details?.specifics || details.specifics.length === 0) askable.push("specifics (room)");
  if (!details?.level?.value) askable.push("level (room)");
  if (!details?.technical_constraints || details.technical_constraints.length === 0) {
    askable.push("technical_constraints (room)");
  }
  if (!room.style_id) askable.push("style (room)");

  return `Tu es un architecte d'intérieur virtuel qui assiste un marchand de biens à préparer la génération de visuels IA pour une de ses pièces.

═══════════════════════════════════════
CHAMPS DÉJÀ RENSEIGNÉS — NE JAMAIS RE-DEMANDER
═══════════════════════════════════════

Profil lot (FIXÉ pour toute l'opération) :
  - ${knownLot}

Pièce courante (RENSEIGNÉE par le marchand ou détectée par Vision) :
  - ${knownRoom}

Style choisi : ${room.style_id ?? "(non choisi)"}
Pièce déjà meublée à transformer : ${room.is_furnished ? "oui" : "non"}
Mémoire opération (décisions pièces précédentes du lot) : ${describeOperationContext(lot.operation_chat_context)}
Segments murs (${segCount}) : ${JSON.stringify(segByType)}
Photo source : ${params.context.photoUrl ? "fournie" : "absente"}

═══════════════════════════════════════
RÈGLE ABSOLUE
═══════════════════════════════════════
Tu ne dois POSER AUCUNE QUESTION sur les champs ci-dessus s'ils ont une valeur.
Si le marchand veut les modifier, il le fera via les pills, pas via toi.
Tu poses UNIQUEMENT des questions sur :
  1. Les champs ENCORE VIDES listés ci-dessous (askable).
  2. Les préférences spécifiques NON CAPTURÉES par les pills (ex : « cheminée
     fonctionnelle ou décorative ? », « les rideaux sont-ils à conserver ? »).
  3. Les intentions de travaux non encore annotées sur les segments
     (ex : « voulez-vous abattre la cloison entre la cuisine et le séjour ? »).
  4. Les contraintes implicites (ex : « la baie côté jardin est-elle existante
     ou à créer ? »).

CHAMPS ENCORE VIDES (askable) :
${askable.length === 0 ? "  Aucun — tous les pills sont remplis. Concentre-toi sur les préférences (2)/(3)/(4) ou appelle validate_brief si tu as assez d'infos." : askable.map((m) => `  - ${m}`).join("\n")}

═══════════════════════════════════════
VALEURS AUTORISÉES POUR update_field
═══════════════════════════════════════
- ceiling_height (lot) : ${JSON.stringify(optsLot.ceiling_height)}
- orientation (lot) : ${JSON.stringify(optsLot.orientation)}
- general_state (lot) : ${JSON.stringify(optsLot.general_state)}
- target_level (lot) : ${JSON.stringify(optsLot.target_level)}
- target_audience (lot) : ${JSON.stringify(optsLot.target_audience)}
- floor (room) : ${JSON.stringify(optsRoom.floor)}
- walls (room) : ${JSON.stringify(optsRoom.walls)}
- lighting (room) : ${JSON.stringify(optsRoom.lighting)}
- specifics (room — multi-select, appelle update_field plusieurs fois si plusieurs) : ${JSON.stringify(optsRoom.specifics)}
- level (room — niveau prestation par pièce) : ${JSON.stringify(optsRoom.level)}
- technical_constraints (room — multi-select, contraintes immuables) : ${JSON.stringify(optsRoom.technical_constraints)}
- style (room) : libre (slug kebab-case du style)

═══════════════════════════════════════
RÈGLES IMPÉRATIVES
═══════════════════════════════════════
1. Si c'est le PREMIER message de la conversation, structure ta réponse en 3 sections markdown :
   **Ce que je vois sur le plan**
   - (déductions du polygone, segments, photo)
   **Ce que vous avez renseigné**
   - (récap LITTÉRAL des pills déjà remplis ci-dessus — sans rien inventer)
   **Ce qui reste ambigu pour moi**
   - (liste courte des points flous — UNIQUEMENT champs vides ou préférences hors-pills)
   PUIS appelle ask_question avec une 1ère question prioritaire et 2-4 suggestions DYNAMIQUES adaptées à CETTE pièce.

2. INTERDICTION ABSOLUE : ne pose JAMAIS une question sur un champ déjà rempli dans les pills.
   Si le marchand mentionne incidemment vouloir changer un champ confirmé (source='user'),
   réponds par une suggestion de modification (« Je peux mettre à jour [champ] vers [valeur] —
   confirmez-vous ? ») mais n'écrase PAS sans son accord explicite.

3. Quand l'utilisateur fournit une info qui mappe sur un pill VIDE → appelle update_field.
   Si tu poses ensuite une autre question, fais-le dans le MÊME tour (multi-tools OK).

4. Quand l'utilisateur donne une info hors-pills (ex: "il y a une cloison amovible mur Sud")
   → appelle record_extra_context.

5. Quand tu as assez d'infos pour générer un visuel pertinent (au moins style + sol + murs
   + luminosité OU 80% des pills + style) → appelle validate_brief avec confidence=high.

6. Maximum 5 tours de questions. Au-delà, appelle validate_brief même si incomplet.

7. Suggestions dynamiques OBLIGATOIRES — adaptées à la pièce, jamais génériques.
   Exemple bon : pour une chambre 14m² style scandinave → "Parquet clair",
   "Béton ciré gris", "Carrelage imitation bois". Exemple INTERDIT : "Oui", "Non", "Je ne sais pas".

8. Réponses brèves, ton professionnel et direct, en français.

9. Tu peux appeler PLUSIEURS tools dans le même tour (ex: update_field + ask_question).`;
}

function transcriptToOpenAIMessages(
  transcript: ChatMessage[]
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return transcript
    .filter((m) => m.role === "assistant" || m.role === "user")
    .map((m) => ({
      role: m.role as "assistant" | "user",
      content: m.content,
    }));
}

function isoNow(): string {
  return new Date().toISOString();
}

// ─── Mode dégradé (sans LLM ou parsing échoué) ─────────────────────

// Mapping FR pour traduire les snake_case techniques en libellés lisibles
// (utilisé en mode dégradé dans la synthèse "Ce qui reste ambigu pour moi").
const FIELD_LABELS_FR: Record<string, string> = {
  ceiling_height: "Hauteur sous plafond",
  orientation: "Orientation",
  general_state: "État général",
  target_level: "Niveau visé",
  target_audience: "Cible",
  floor: "Sol",
  walls: "Murs",
  lighting: "Luminosité",
  specifics: "Particularités",
};

function humanizeMissingField(raw: string): string {
  // Format reçu : "ceiling_height (lot)" ou "specifics (room — peut être 'Aucune')"
  const match = raw.match(/^(\w+)/);
  const key = match ? match[1] : raw;
  const label = FIELD_LABELS_FR[key] ?? key;
  // Récupère le suffixe entre parenthèses (scope ou note) et le simplifie
  const scopeMatch = raw.match(/\(([^)]+)\)/);
  if (!scopeMatch) return label;
  const scope = scopeMatch[1];
  if (scope === "lot") return `${label} (niveau lot)`;
  if (scope === "room") return label;
  // Note libre (ex: "room — peut être 'Aucune'") : on garde le label seul
  return label;
}

function buildFallbackInitMessage(params: ChatProcessParams): ChatProcessResult {
  const { lot, room } = params.context;
  const missing = listMissingFields(
    lot.architectural_profile,
    room.architectural_details
  );
  const synthesis = `**Ce que je vois sur le plan**
- Pièce ${room.room_type}${room.custom_label ? ` (${room.custom_label})` : ""}, environ ${room.surface_m2 ?? "?"} m².

**Ce que vous avez renseigné**
- Profil lot : ${describeProfile(lot.architectural_profile)}
- Détails pièce : ${describeDetails(room.architectural_details)}

**Ce qui reste ambigu pour moi**
${missing.length === 0 ? "- Rien — tout est renseigné. Vous pouvez générer." : missing.slice(0, 3).map((m) => `- ${humanizeMissingField(m)}`).join("\n")}

Service IA temporairement indisponible. Utilisez les pills ci-dessous pour renseigner les détails de la pièce.`;

  const reply: ChatMessage = {
    role: "assistant",
    content: synthesis,
    // Pas de suggestions hardcodées en mode dégradé — l'utilisateur revient
    // aux pills (source de vérité). Honnêteté > faux engagement.
    suggestions: [],
    timestamp: isoNow(),
  };
  return {
    reply,
    toolCalls: [],
    briefValidated: false,
    briefConfidence: null,
    extraContextPatch: {},
    operationContextPatch: {},
    fieldUpdates: [],
  };
}

function buildFallbackUserReply(): ChatProcessResult {
  return {
    reply: {
      role: "assistant",
      content:
        "Noté. Vous pouvez affiner d'autres détails ou lancer la génération dès que vous êtes prêt.",
      suggestions: ["Générer maintenant", "Préciser un autre détail"],
      timestamp: isoNow(),
    },
    toolCalls: [],
    briefValidated: false,
    briefConfidence: null,
    extraContextPatch: {},
    operationContextPatch: {},
    fieldUpdates: [],
  };
}

// ─── Main : processChatMessage ─────────────────────────────────────

export async function processChatMessage(
  params: ChatProcessParams
): Promise<ChatProcessResult> {
  const openai = getOpenAI();
  const isInit = params.userMessage === null;

  if (!openai) {
    console.warn(
      "[conversational-architect] OPENAI_API_KEY absent ou placeholder, mode dégradé."
    );
    return isInit ? buildFallbackInitMessage(params) : buildFallbackUserReply();
  }

  // Construction des messages OpenAI
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(params) },
    ...transcriptToOpenAIMessages(params.context.transcript),
  ];

  if (params.userMessage !== null) {
    messages.push({ role: "user", content: params.userMessage });
  } else {
    // Init : on demande à l'IA d'ouvrir la conversation
    messages.push({
      role: "user",
      content:
        "[INIT] Ouvre la conversation : 1) la synthèse 3 sections, 2) appelle ask_question avec la 1ère question prioritaire et des suggestions dynamiques.",
    });
  }

  // Boucle tool-calling : on laisse l'IA appeler 1+ tools en cascade.
  const toolCalls: ChatToolCall[] = [];
  const fieldUpdates: Array<{ field: string; value: string; scope: "room" | "lot" }> = [];
  const extraContextPatch: Record<string, string> = {};
  const operationContextPatch: Partial<OperationChatContext> = {};
  let briefValidated = false;
  let briefConfidence: "high" | "medium" | "low" | null = null;
  let askQuestionPayload: { question: string; suggestions: string[] } | null = null;
  let textContent = "";

  // ─── s32 Phase 4 — Guardrails update_field (Thomas marchand audit) ──
  // Snapshot de l'état initial des champs « user-confirmed » (verrouillés).
  // Le LLM a beau être briefé via le system prompt, on défend en profondeur :
  // si une valeur est saisie volontairement par le marchand (source='user' ET
  // confirmed=true), aucun update_field venant de l'IA ne peut l'écraser.
  // Pour les champs Vision non confirmés OU les champs vides : OK.
  const userLockedRoom = new Set<string>();
  const userLockedLot = new Set<string>();
  // s32 P0-4 — pour les champs multi-select (specifics, technical_constraints),
  // on ne lock pas le set entier ; on lock uniquement les valeurs déjà
  // user-confirmed (autorise l'append d'une nouvelle valeur identifiée).
  const userLockedRoomMulti = new Map<string, Set<string>>();
  const det = params.context.room.architectural_details;
  const prof = params.context.lot.architectural_profile;
  // Helper : un champ est "user-locked" si source='user' ET (confirmed!==false).
  // Default confirmed=true pour source='user' (saisie volontaire).
  const isUserLocked = (
    f?: { value: string | null; source: "user" | "vision" | null; confirmed?: boolean }
  ): boolean => f != null && f.value != null && f.source === "user" && f.confirmed !== false;
  if (det) {
    if (isUserLocked(det.floor)) userLockedRoom.add("floor");
    if (isUserLocked(det.walls)) userLockedRoom.add("walls");
    if (isUserLocked(det.lighting)) userLockedRoom.add("lighting");
    if (det.level && isUserLocked(det.level)) userLockedRoom.add("level");
    // s32 P0-4 — multi-select : on collecte les valeurs user-confirmed
    // par champ. L'IA peut AJOUTER une nouvelle valeur (vision identifie
    // « Poutres apparentes » alors que marchand a confirmé « Cheminée »),
    // mais NE PEUT PAS écraser une valeur déjà user-confirmed.
    if (det.specifics?.length) {
      const lockedVals = new Set(
        det.specifics.filter(isUserLocked).map((v) => String(v.value))
      );
      if (lockedVals.size > 0) userLockedRoomMulti.set("specifics", lockedVals);
    }
    if (det.technical_constraints?.length) {
      const lockedVals = new Set(
        det.technical_constraints.filter(isUserLocked).map((v) => String(v.value))
      );
      if (lockedVals.size > 0) {
        userLockedRoomMulti.set("technical_constraints", lockedVals);
      }
    }
  }
  // Profile lot : pas de "source/confirmed" tracking (saisie marchand 100%
  // via panneau latéral V3). Tout champ NON-NULL est lock pour update_field.
  if (prof) {
    if (prof.ceiling_height) userLockedLot.add("ceiling_height");
    if (prof.orientation) userLockedLot.add("orientation");
    if (prof.general_state) userLockedLot.add("general_state");
    if (prof.target_level) userLockedLot.add("target_level");
    if (prof.target_audience) userLockedLot.add("target_audience");
  }
  if (params.context.room.style_id) userLockedRoom.add("style");

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await openai.chat.completions.create(
        {
          model: MODEL,
          messages,
          tools: TOOLS,
          tool_choice: "auto",
          temperature: 0.7,
          max_tokens: 800,
        },
        { timeout: TIMEOUT_MS }
      );

      const choice = completion.choices[0];
      if (!choice) break;
      const msg = choice.message;

      if (msg.content && msg.content.trim().length > 0) {
        textContent = textContent
          ? `${textContent}\n\n${msg.content.trim()}`
          : msg.content.trim();
      }

      const calls = msg.tool_calls ?? [];
      if (calls.length === 0) {
        break; // L'IA n'a plus rien à dire.
      }

      // On enregistre l'appel assistant avec ses tool_calls dans la conversation
      messages.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: calls,
      });

      for (const call of calls) {
        if (call.type !== "function") continue;
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(call.function.arguments) as Record<string, unknown>;
        } catch (err) {
          console.warn(
            `[conversational-architect] tool args parse failed: ${call.function.name}`,
            err
          );
        }

        let result = "ok";
        const name = call.function.name as ChatToolCall["name"];

        switch (name) {
          case "ask_question": {
            const q = String(parsedArgs.question ?? "").trim();
            const sug = Array.isArray(parsedArgs.suggestions)
              ? (parsedArgs.suggestions as unknown[])
                  .map((s) => String(s ?? "").trim())
                  .filter((s) => s.length > 0)
                  .slice(0, 4)
              : [];
            if (q && sug.length >= 2) {
              askQuestionPayload = { question: q, suggestions: sug };
              result = "Question enregistrée pour l'utilisateur.";
            } else {
              result = "Question invalide (manque 2 suggestions minimum).";
            }
            break;
          }
          case "update_field": {
            const field = String(parsedArgs.field ?? "");
            const value = String(parsedArgs.value ?? "").trim();
            const scope = (parsedArgs.scope === "lot" ? "lot" : "room") as
              | "room"
              | "lot";
            if (!field || !value) {
              result = "update_field invalide.";
              break;
            }
            // s32 Phase 4 — guardrail user-confirmed.
            // Si le champ a été saisi/confirmé par le marchand (pill bleu),
            // on REFUSE l'écrasement. L'IA voit l'erreur tool et doit
            // reformuler en suggestion textuelle (« Voulez-vous changer X ? »).
            const lockedSet = scope === "lot" ? userLockedLot : userLockedRoom;
            if (lockedSet.has(field)) {
              result = `Field already confirmed by dealer (${field}, scope=${scope}, current value preserved). Cannot overwrite. Suggest the change as a question instead.`;
              break;
            }
            // s32 P0-4 — multi-select (specifics, technical_constraints) :
            // on autorise l'append d'une NOUVELLE valeur, mais on refuse
            // l'écrasement d'une valeur déjà user-confirmed.
            if (scope === "room" && userLockedRoomMulti.has(field)) {
              const lockedVals = userLockedRoomMulti.get(field)!;
              if (lockedVals.has(value)) {
                result = `Value '${value}' already confirmed by dealer (${field}). Cannot overwrite. Suggest a different value or as a question instead.`;
                break;
              }
              // valeur nouvelle → autorisée en append (on ne la lock pas
              // dans userLockedRoom global pour préserver les autres
              // valeurs déjà confirmées).
            }
            fieldUpdates.push({ field, value, scope });
            // Synchroniser operation_chat_context si pertinent
            if (scope === "lot") {
              if (field === "target_audience") {
                operationContextPatch.target_audience = value;
              } else if (field === "target_level") {
                operationContextPatch.budget_estimate = value;
              }
            }
            if (field === "style") {
              operationContextPatch.style = value;
            }
            // s32 Phase 4 — après application, on lock pour le reste du
            // tour (évite qu'un autre tool_call dans la même boucle écrase).
            // s32 P0-4 — pour multi-select, on lock uniquement la valeur
            // précise dans userLockedRoomMulti (autres valeurs restent
            // ouvertes à l'append dans le même tour).
            if (scope === "lot") {
              userLockedLot.add(field);
            } else if (field === "specifics" || field === "technical_constraints") {
              const set = userLockedRoomMulti.get(field) ?? new Set<string>();
              set.add(value);
              userLockedRoomMulti.set(field, set);
            } else {
              userLockedRoom.add(field);
            }
            result = `Pill mis à jour : ${field} = ${value} (${scope}).`;
            break;
          }
          case "record_extra_context": {
            const key = String(parsedArgs.key ?? "")
              .trim()
              .replace(/[^a-z0-9_]/gi, "_")
              .toLowerCase()
              .slice(0, 64);
            const value = String(parsedArgs.value ?? "").trim().slice(0, 500);
            if (key && value) {
              extraContextPatch[key] = value;
              result = `Note enregistrée : ${key}.`;
            } else {
              result = "record_extra_context invalide.";
            }
            break;
          }
          case "validate_brief": {
            const conf = String(parsedArgs.confidence ?? "");
            if (conf === "high" || conf === "medium" || conf === "low") {
              briefValidated = true;
              briefConfidence = conf;
              result = `Brief validé (confidence=${conf}).`;
            } else {
              result = "validate_brief : confidence invalide.";
            }
            break;
          }
          default:
            result = `Tool inconnu : ${name}.`;
        }

        toolCalls.push({ name, args: parsedArgs, result });

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
      }

      // Si on a déjà une question + au moins 1 update, on peut s'arrêter pour
      // limiter la latence (le LLM aurait tendance à boucler sinon).
      if (askQuestionPayload && (fieldUpdates.length > 0 || briefValidated)) {
        break;
      }
      // Si seulement une question sans update : sortir aussi.
      if (askQuestionPayload && round >= 0) {
        break;
      }
      // Si validate_brief sans question : sortir.
      if (briefValidated && !askQuestionPayload) {
        break;
      }
    }
  } catch (err) {
    console.error("[conversational-architect] LLM error:", err);
    if (!textContent) {
      return isInit ? buildFallbackInitMessage(params) : buildFallbackUserReply();
    }
  }

  // Construction de la réponse finale
  let finalContent = textContent;
  if (askQuestionPayload) {
    finalContent = finalContent
      ? `${finalContent}\n\n${askQuestionPayload.question}`
      : askQuestionPayload.question;
  }
  if (!finalContent && briefValidated) {
    finalContent =
      "J'ai assez d'infos pour générer un visuel de qualité. Vous pouvez cliquer sur Générer.";
  }
  if (!finalContent) {
    finalContent = isInit
      ? "Bonjour, on va préparer ensemble la génération de cette pièce."
      : "Noté.";
  }

  const reply: ChatMessage = {
    role: "assistant",
    content: finalContent,
    suggestions: askQuestionPayload?.suggestions,
    timestamp: isoNow(),
  };

  return {
    reply,
    toolCalls,
    briefValidated,
    briefConfidence,
    extraContextPatch,
    operationContextPatch,
    fieldUpdates,
  };
}
