/**
 * Schemas Zod pour le pipeline IA Versi Studio.
 *
 * Adaptés de reference-existant/lib-marchand/schemas.ts.
 * Simplifiés pour la V1 sans auth : pas de user_id, pas de Stripe,
 * pas de lots qualifiés, pas de target buyer.
 *
 * Importés par les modules IA (plan-extractor, visual-generator, architect-agent)
 * ET par les API routes pour validation double.
 */
import { z } from "zod";

// ─── Enums partagés ───────────────────────────────────────────────

export const TypeBienEnum = z.enum(["immeuble", "appartement", "maison"]);
export type TypeBien = z.infer<typeof TypeBienEnum>;

export const RoomTypeEnum = z.enum([
  "salon",
  "sejour",
  "salle_a_manger",
  "cuisine",
  "chambre",
  "chambre_parentale",
  "sdb",
  "wc",
  "bureau",
  "entree",
  "dressing",
  "cellier",
  "terrasse",
  "garage",
  "couloir",
  "cave",
  "balcon",
  "autre",
]);
export type RoomType = z.infer<typeof RoomTypeEnum>;

export const ProjectStatusEnum = z.enum([
  "draft",
  "step_1_complete",
  "step_2_complete",
  "step_3_complete",
  "completed",
]);
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;

export const RoomShapeEnum = z.enum([
  "rectangular",
  "square",
  "L-shaped",
  "narrow_corridor",
  "irregular",
]);
export type RoomShape = z.infer<typeof RoomShapeEnum>;

export const RoomSourceEnum = z.enum(["ai_extraction", "manual"]);
export type RoomSource = z.infer<typeof RoomSourceEnum>;

export const ExtractionWarningEnum = z.enum([
  "no_dimensions_found",
  "low_resolution",
  "partial_occlusion",
  "no_scale_reference",
  "technical_symbols_ignored",
  "unit_clustering_low_confidence",
]);
export type ExtractionWarning = z.infer<typeof ExtractionWarningEnum>;

export const ScaleReferenceEnum = z.enum([
  "dimensions_on_plan",
  "door_standard_83cm",
  "scale_bar",
  "none",
]);
export type ScaleReference = z.infer<typeof ScaleReferenceEnum>;

export const GroupingStrategyEnum = z.enum([
  "by_floor",
  "by_zone",
  "manual_suggestion",
]);
export type GroupingStrategy = z.infer<typeof GroupingStrategyEnum>;

export const StyleIdEnum = z.enum([
  "scandinave",
  "industriel",
  "moderne",
  "boheme",
  "classique",
  "minimaliste",
  "art-deco",
  "tropical",
  "wabi-sabi",
  "mid-century",
  "cottagecore",
  "japandi",
]);
export type StyleId = z.infer<typeof StyleIdEnum>;

export const VisualStatusEnum = z.enum([
  "pending",
  "generating",
  "done",
  "failed",
]);
export type VisualStatus = z.infer<typeof VisualStatusEnum>;

// ─── 1. PlanExtractionResult ──────────────────────────────────────

export const ExtractedRoomSchema = z.object({
  temp_id: z
    .string()
    .describe("Identifiant temporaire unique (r1, r2, ...)"),
  name_raw: z
    .string()
    .min(1)
    .describe("Nom de la pièce en français tel que lu sur le plan"),
  surface_m2: z
    .number()
    .positive()
    .nullable()
    .describe("Surface estimée en m², null si non déductible"),
  dimensions: z
    .object({
      length_m: z.number().positive().describe("Longueur en mètres"),
      width_m: z.number().positive().describe("Largeur en mètres"),
    })
    .nullable()
    .describe("Dimensions L x l, null si pas de cotes lisibles"),
  ceiling_height_m: z
    .number()
    .positive()
    .nullable()
    .describe("Hauteur sous plafond, null si non indiquée"),
  windows_count: z
    .number()
    .int()
    .min(0)
    .describe("Nombre de fenêtres détectées"),
  doors_count: z
    .number()
    .int()
    .min(0)
    .describe("Nombre de portes détectées"),
  floor: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe("Étage (0 = RDC), null si indéterminé"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Score de confiance IA 0-1 sur cette pièce"),
  shape: RoomShapeEnum.nullable().describe(
    "Forme approximative de la pièce"
  ),
  notes: z
    .string()
    .nullable()
    .describe("Notes IA (ex: mur porteur détecté, pièce humide)"),
  bounding_box: z
    .object({
      x_percent: z
        .number()
        .min(0)
        .max(100)
        .describe("Position X en % de la largeur de l'image (0-100)"),
      y_percent: z
        .number()
        .min(0)
        .max(100)
        .describe("Position Y en % de la hauteur de l'image (0-100)"),
      width_percent: z
        .number()
        .min(0)
        .max(100)
        .describe("Largeur en % de la largeur de l'image"),
      height_percent: z
        .number()
        .min(0)
        .max(100)
        .describe("Hauteur en % de la hauteur de l'image"),
    })
    .nullable()
    .optional()
    .describe(
      "Position estimée de la pièce sur le plan (pourcentages 0-100)"
    ),
  unit_id: z
    .string()
    .nullable()
    .describe(
      "Identifiant de l'unité logique (appartement/logement). " +
      "Pièces partageant le même unit_id forment un même lot. " +
      "Format: 'u1', 'u2', ... null si indéterminé ou partie commune."
    ),
  bounding_polygon: z
    .array(
      z.object({
        x_percent: z.number().min(0).max(100),
        y_percent: z.number().min(0).max(100),
      })
    )
    .min(4)
    .max(8)
    .nullable()
    .optional()
    .describe(
      "Contour polygonal de la pièce en % de l'image (4-8 sommets aux coins des murs). " +
      "Recommandé pour toutes les pièces. null uniquement si contour indéterminable."
    ),
});
export type ExtractedRoom = z.infer<typeof ExtractedRoomSchema>;

export const BuildingOutlineSchema = z.object({
  x_percent: z
    .number()
    .min(0)
    .max(100)
    .describe("Position X du coin haut-gauche du bâtiment en % de l'image"),
  y_percent: z
    .number()
    .min(0)
    .max(100)
    .describe("Position Y du coin haut-gauche du bâtiment en % de l'image"),
  width_percent: z
    .number()
    .min(1)
    .max(100)
    .describe("Largeur du bâtiment en % de l'image"),
  height_percent: z
    .number()
    .min(1)
    .max(100)
    .describe("Hauteur du bâtiment en % de l'image"),
});
export type BuildingOutline = z.infer<typeof BuildingOutlineSchema>;

export const PlanExtractionResultSchema = z.object({
  rooms: z
    .array(ExtractedRoomSchema)
    .min(1)
    .describe("Liste des pièces détectées"),
  building_outline: BuildingOutlineSchema.nullable().describe(
    "Rectangle englobant les murs extérieurs du bâtiment (en % de l'image)"
  ),
  total_surface_m2: z
    .number()
    .positive()
    .nullable()
    .describe("Surface totale estimée"),
  floors_count: z
    .number()
    .int()
    .min(1)
    .describe("Nombre de niveaux détectés"),
  extraction_warnings: z
    .array(ExtractionWarningEnum)
    .describe("Avertissements d'extraction"),
  scale_reference: ScaleReferenceEnum.describe(
    "Référence d'échelle utilisée par le modèle"
  ),
});
export type PlanExtractionResult = z.infer<
  typeof PlanExtractionResultSchema
>;

// ─── 2. LotDefinition ────────────────────────────────────────────

export const LotDefinitionSchema = z.object({
  temp_id: z.string().describe("Identifiant temporaire du lot"),
  name: z
    .string()
    .min(1)
    .max(100)
    .describe("Nom du lot (ex: T3 RDC gauche)"),
  room_ids: z
    .array(z.string())
    .min(1)
    .describe("IDs des pièces dans ce lot"),
  surface_m2: z
    .number()
    .positive()
    .nullable()
    .describe("Surface totale du lot"),
  floor: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe("Étage principal du lot"),
});
export type LotDefinition = z.infer<typeof LotDefinitionSchema>;

export const LotSuggestionSetSchema = z.object({
  lots: z.array(LotDefinitionSchema).min(1),
  grouping_strategy: GroupingStrategyEnum.describe(
    "Stratégie de groupement utilisée"
  ),
});
export type LotSuggestionSet = z.infer<typeof LotSuggestionSetSchema>;

// ─── 3. Visual Generation ────────────────────────────────────────

export const VisualGenerationInputSchema = z.object({
  room_type: RoomTypeEnum.describe("Type de pièce"),
  style_id: StyleIdEnum.describe("Style de décoration choisi"),
  surface_m2: z.number().positive().nullable().describe("Surface en m²"),
  angle_description: z
    .string()
    .nullable()
    .optional()
    .describe("Description de l'angle de prise de vue (optionnel)"),
});
export type VisualGenerationInput = z.infer<
  typeof VisualGenerationInputSchema
>;

export const VisualGenerationResultSchema = z.object({
  visual_id: z.string().describe("Identifiant unique du visuel généré"),
  status: VisualStatusEnum.describe("Statut de la génération"),
  image_base64: z
    .string()
    .nullable()
    .describe("Image générée en base64 (null si en cours ou échouée)"),
  prompt_used: z
    .string()
    .describe("Prompt complet utilisé pour la génération"),
  error_message: z
    .string()
    .nullable()
    .describe("Message d'erreur si échec"),
});
export type VisualGenerationResult = z.infer<
  typeof VisualGenerationResultSchema
>;

// ─── 4. Architect Agent (itération visuelle V1) ──────────────────

export const ArchitectIterationInputSchema = z.object({
  instruction: z
    .string()
    .min(1)
    .describe("Instruction utilisateur en langage naturel"),
  current_visual_base64: z
    .string()
    .describe("Visuel courant en base64"),
  style_id: StyleIdEnum.describe("Style de décoration actif"),
  room_type: RoomTypeEnum.describe("Type de pièce"),
  surface_m2: z.number().positive().nullable().describe("Surface en m²"),
});
export type ArchitectIterationInput = z.infer<
  typeof ArchitectIterationInputSchema
>;

export const EnrichedPromptSchema = z.object({
  enriched_prompt: z
    .string()
    .min(10)
    .describe("Prompt enrichi pour gpt-image-1.5"),
  interpretation: z
    .string()
    .describe("Reformulation de la demande de l'utilisateur"),
  changes_described: z
    .array(z.string())
    .min(1)
    .describe("Liste des modifications à appliquer"),
});
export type EnrichedPrompt = z.infer<typeof EnrichedPromptSchema>;
