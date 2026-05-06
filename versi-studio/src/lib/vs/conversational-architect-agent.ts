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

function buildSystemPrompt(params: ChatProcessParams): string {
  const { lot, room, segments } = params.context;
  const missing = listMissingFields(
    lot.architectural_profile,
    room.architectural_details
  );
  const segCount = segments?.length ?? 0;
  const segByType = segments
    ? segments.reduce<Record<string, number>>((acc, s) => {
        acc[s.type] = (acc[s.type] ?? 0) + 1;
        return acc;
      }, {})
    : {};

  const optsLot = ARCHITECTURAL_PROFILE_OPTIONS;
  const optsRoom = ARCHITECTURAL_DETAILS_OPTIONS;

  return `Tu es un architecte d'intérieur virtuel qui assiste un marchand de biens à préparer la génération de visuels IA pour une de ses pièces.

CONTEXTE OPÉRATION (LOT):
- Nom : ${lot.name}
- Étage : ${lot.floor_number}
- Surface : ${lot.surface_m2 ?? "?"} m²
- Profil architectural : ${describeProfile(lot.architectural_profile)}
- Mémoire opération chat (décisions précédentes pièces du même lot) : ${describeOperationContext(lot.operation_chat_context)}

PIÈCE COURANTE:
- Type : ${room.room_type}${room.custom_label ? ` (${room.custom_label})` : ""}
- Surface : ${room.surface_m2 ?? "?"} m²
- Style choisi : ${room.style_id ?? "(non choisi)"}
- Meublée à transformer : ${room.is_furnished}
- Détails architecturaux : ${describeDetails(room.architectural_details)}
- Segments murs (${segCount}) : ${JSON.stringify(segByType)}
- Photo source : ${params.context.photoUrl ? "fournie" : "absente"}

INFORMATIONS MANQUANTES (pills vides) :
${missing.length === 0 ? "Aucune — tous les pills sont remplis." : missing.map((m) => `- ${m}`).join("\n")}

VALEURS AUTORISÉES POUR update_field :
- ceiling_height : ${JSON.stringify(optsLot.ceiling_height)}
- orientation : ${JSON.stringify(optsLot.orientation)}
- general_state : ${JSON.stringify(optsLot.general_state)}
- target_level : ${JSON.stringify(optsLot.target_level)}
- target_audience : ${JSON.stringify(optsLot.target_audience)}
- floor : ${JSON.stringify(optsRoom.floor)}
- walls : ${JSON.stringify(optsRoom.walls)}
- lighting : ${JSON.stringify(optsRoom.lighting)}
- specifics : ${JSON.stringify(optsRoom.specifics)} (multi-select — appelle update_field plusieurs fois si plusieurs)
- style : libre (slug kebab-case du style)

RÈGLES IMPÉRATIVES :
1. Si c'est le PREMIER message de la conversation, structure ta réponse en 3 sections markdown :
   **Ce que je vois sur le plan**
   - (déductions du polygone, segments, photo)
   **Ce que vous avez renseigné**
   - (récap des pills déjà remplis)
   **Ce qui reste ambigu pour moi**
   - (liste courte des points flous — N'inclut PAS les pills déjà remplis)
   PUIS appelle ask_question avec une 1ère question prioritaire et 2-4 suggestions DYNAMIQUES adaptées à CETTE pièce.
2. NE JAMAIS poser de question sur un champ déjà rempli dans les pills.
3. Quand l'utilisateur fournit une info qui mappe sur un pill → appelle update_field. Si tu poses ensuite une autre question, fais-le dans le MÊME tour (multi-tools OK).
4. Quand l'utilisateur donne une info hors-pills (ex: "il y a une cloison amovible mur Sud") → appelle record_extra_context.
5. Quand tu as assez d'infos pour générer un visuel pertinent (au moins style + sol + murs + luminosité OU 80% des pills + style) → appelle validate_brief avec confidence=high.
6. Maximum 5 tours de questions. Au-delà, appelle validate_brief même si incomplet.
7. Suggestions dynamiques OBLIGATOIRES — adaptées à la pièce, jamais génériques. Exemple bon : pour une chambre 14m² style scandinave → "Parquet clair", "Béton ciré gris", "Carrelage imitation bois". Exemple INTERDIT : "Oui", "Non", "Je ne sais pas".
8. Réponses brèves, ton professionnel et chaleureux, en français.
9. Tu peux appeler PLUSIEURS tools dans le même tour (ex: update_field + ask_question pour la suite).`;
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
${missing.length === 0 ? "- Rien — tout est renseigné. Vous pouvez générer." : missing.slice(0, 3).map((m) => `- ${m}`).join("\n")}`;

  const reply: ChatMessage = {
    role: "assistant",
    content: synthesis,
    suggestions: [
      "Je veux générer maintenant",
      "Précisons la luminosité",
      "Ajouter une particularité",
    ],
    timestamp: isoNow(),
  };
  return {
    reply,
    toolCalls: [],
    briefValidated: false,
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
        "Bien noté. Vous pouvez continuer à préciser, ou cliquer sur Générer dès que vous êtes prêt.",
      suggestions: ["Générer maintenant", "Préciser un autre détail"],
      timestamp: isoNow(),
    },
    toolCalls: [],
    briefValidated: false,
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
  let askQuestionPayload: { question: string; suggestions: string[] } | null = null;
  let textContent = "";

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
            if (field && value) {
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
              result = `Pill mis à jour : ${field} = ${value} (${scope}).`;
            } else {
              result = "update_field invalide.";
            }
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
      : "Bien noté.";
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
    extraContextPatch,
    operationContextPatch,
    fieldUpdates,
  };
}
