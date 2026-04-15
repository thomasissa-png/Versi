/**
 * Schemas Zod pour le pipeline marchand Versimo.
 *
 * Source de verite : docs/marchand-pivot/ia/technical-architecture.md section 2.
 * Importes par les modules IA ET par les API routes pour validation double.
 */
import { z } from "zod";

// ─── Enums partages ────────────────────────────────────────────────

export const TypeBienEnum = z.enum([
  "immeuble",
  "appartement",
  "maison",
  "bureaux",
  "local_commercial",
]);
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
  "salle_reunion",
  "open_space",
  "accueil",
  "local_technique",
  "autre",
]);
export type RoomType = z.infer<typeof RoomTypeEnum>;

export const TargetBuyerEnum = z.enum([
  "famille",
  "couple_sans_enfant",
  "etudiant",
  "investisseur_locatif",
  "senior",
  "professionnel_liberal",
]);
export type TargetBuyer = z.infer<typeof TargetBuyerEnum>;

export const ProjectStatusEnum = z.enum([
  "plan_uploaded",
  "extraction_done",
  "lots_defined",
  "validated",
  "qualified",
  "plan_final",
  "generating",
  "visuals_done",
  "delivered",
  "extraction_failed",
]);
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;

export const LotStatusEnum = z.enum([
  "pending",
  "qualified",
  "plan_final",
  "generating",
  "visuals_done",
  "pdf_ready",
]);
export type LotStatus = z.infer<typeof LotStatusEnum>;

export const GenerationStatusEnum = z.enum([
  "pending",
  "generating_pass1",
  "generating_pass2",
  "done",
  "failed",
]);
export type GenerationStatus = z.infer<typeof GenerationStatusEnum>;

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

export const ActionTypeEnum = z.enum([
  "redistribution",
  "cloison",
  "affectation",
  "deco",
  "sol",
  "luminaire",
]);
export type ActionType = z.infer<typeof ActionTypeEnum>;

export const ImpactLevelEnum = z.enum(["basse", "moyenne", "haute"]);
export type ImpactLevel = z.infer<typeof ImpactLevelEnum>;

export const ExtractionWarningEnum = z.enum([
  "no_dimensions_found",
  "low_resolution",
  "partial_occlusion",
  "no_scale_reference",
  "technical_symbols_ignored",
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

// ─── 2.1 PlanExtractionResult ──────────────────────────────────────

export const ExtractedRoomSchema = z.object({
  temp_id: z
    .string()
    .describe("Identifiant temporaire unique (r1, r2, ...)"),
  name_raw: z
    .string()
    .min(1)
    .describe("Nom de la piece en francais tel que lu sur le plan"),
  surface_m2: z
    .number()
    .positive()
    .nullable()
    .describe("Surface estimee en m2, null si non deductible"),
  dimensions: z
    .object({
      length_m: z.number().positive().describe("Longueur en metres"),
      width_m: z.number().positive().describe("Largeur en metres"),
    })
    .nullable()
    .describe("Dimensions L x l, null si pas de cotes lisibles"),
  ceiling_height_m: z
    .number()
    .positive()
    .nullable()
    .describe("Hauteur sous plafond, null si non indiquee"),
  windows_count: z
    .number()
    .int()
    .min(0)
    .describe("Nombre de fenetres detectees"),
  doors_count: z
    .number()
    .int()
    .min(0)
    .describe("Nombre de portes detectees"),
  floor: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe("Etage (0 = RDC), null si indetermine"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Score de confiance IA 0-1 sur cette piece"),
  shape: RoomShapeEnum.nullable().describe(
    "Forme approximative de la piece"
  ),
  notes: z
    .string()
    .nullable()
    .describe("Notes IA (ex: mur porteur detecte, piece humide)"),
  bounding_box: z
    .object({
      x_percent: z.number().min(0).max(100).describe("Position X en % de la largeur de l'image (0-100)"),
      y_percent: z.number().min(0).max(100).describe("Position Y en % de la hauteur de l'image (0-100)"),
      width_percent: z.number().min(0).max(100).describe("Largeur en % de la largeur de l'image"),
      height_percent: z.number().min(0).max(100).describe("Hauteur en % de la hauteur de l'image"),
    })
    .optional()
    .describe("Position estimée de la pièce sur le plan (pourcentages 0-100)"),
});
export type ExtractedRoom = z.infer<typeof ExtractedRoomSchema>;

export const BuildingOutlineSchema = z.object({
  x_percent: z.number().min(0).max(100).describe("Position X du coin haut-gauche du bâtiment en % de l'image"),
  y_percent: z.number().min(0).max(100).describe("Position Y du coin haut-gauche du bâtiment en % de l'image"),
  width_percent: z.number().min(1).max(100).describe("Largeur du bâtiment en % de l'image"),
  height_percent: z.number().min(1).max(100).describe("Hauteur du bâtiment en % de l'image"),
});
export type BuildingOutline = z.infer<typeof BuildingOutlineSchema>;

export const PlanExtractionResultSchema = z.object({
  rooms: z
    .array(ExtractedRoomSchema)
    .min(1)
    .describe("Liste des pieces detectees"),
  building_outline: BuildingOutlineSchema
    .nullable()
    .describe("Rectangle englobant les murs extérieurs du bâtiment (en % de l'image)"),
  total_surface_m2: z
    .number()
    .positive()
    .nullable()
    .describe("Surface totale estimee"),
  floors_count: z
    .number()
    .int()
    .min(1)
    .describe("Nombre de niveaux detectes"),
  extraction_warnings: z
    .array(ExtractionWarningEnum)
    .describe("Avertissements d'extraction"),
  scale_reference: ScaleReferenceEnum.describe(
    "Reference d'echelle utilisee par le modele"
  ),
});
export type PlanExtractionResult = z.infer<
  typeof PlanExtractionResultSchema
>;

// ─── 2.2 ArchitectRecommendation ───────────────────────────────────

export const RecommendationSchema = z.object({
  id: z.string().describe("Identifiant unique (rec_1, rec_2, ...)"),
  title: z
    .string()
    .min(5)
    .max(100)
    .describe("Titre court de la recommandation"),
  description: z
    .string()
    .min(20)
    .max(500)
    .describe("Description argumentee 2-3 phrases"),
  action_type: ActionTypeEnum.describe("Type d'action recommandee"),
  estimated_cost_eur: z
    .number()
    .min(0)
    .nullable()
    .describe("Cout estime en euros, null si non estimable"),
  impact_level: ImpactLevelEnum.describe(
    "Impact sur la valeur percue du bien"
  ),
  affected_rooms: z
    .array(z.string())
    .min(1)
    .describe("IDs des pieces concernees (temp_id ou room_id)"),
  rationale_buyer: z
    .string()
    .max(200)
    .describe(
      "Pourquoi cette modification parle a la cible acheteur"
    ),
});
export type ArchitectRecommendation = z.infer<
  typeof RecommendationSchema
>;

export const ArchitectRecommendationSetSchema = z.object({
  recommendations: z
    .array(RecommendationSchema)
    .min(1)
    .max(8)
    .describe(
      "Liste de 1 a 8 recommandations, ordonnees par impact decroissant"
    ),
  summary: z
    .string()
    .max(300)
    .describe(
      "Resume global de la strategie de valorisation du lot"
    ),
});
export type ArchitectRecommendationSet = z.infer<
  typeof ArchitectRecommendationSetSchema
>;

// ─── 2.3 LotDefinition ────────────────────────────────────────────

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
    .describe("IDs des pieces dans ce lot"),
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
    .describe("Etage principal du lot"),
});
export type LotDefinition = z.infer<typeof LotDefinitionSchema>;

export const LotSuggestionSetSchema = z.object({
  lots: z.array(LotDefinitionSchema).min(1),
  grouping_strategy: GroupingStrategyEnum.describe(
    "Strategie de groupement utilisee"
  ),
});
export type LotSuggestionSet = z.infer<typeof LotSuggestionSetSchema>;

// ─── 2.4 ValidatedRoom (post-correction utilisateur) ──────────────

export const ValidatedRoomSchema = ExtractedRoomSchema.extend({
  id: z.string().uuid().describe("UUID DB"),
  room_type: RoomTypeEnum,
  lot_id: z.string().uuid().nullable(),
  is_estimated: z.boolean(),
  photo_path: z
    .string()
    .nullable()
    .describe("Cle Object Storage de la photo source"),
});
export type ValidatedRoom = z.infer<typeof ValidatedRoomSchema>;

// ─── 2.5 LotQualification ─────────────────────────────────────────

export const LotQualificationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  target_buyer: TargetBuyerEnum,
  style_id: z.string(),
  budget_travaux: z.number().nullable(),
  contraintes: z.string().nullable(),
  notes_commerciales: z.string().nullable(),
  rooms: z.array(ValidatedRoomSchema),
});
export type LotQualification = z.infer<typeof LotQualificationSchema>;

// ─── Types complementaires pour API routes ─────────────────────────

/** Donnees lot enrichies pour la generation de description commerciale. */
export interface LotWithRooms {
  id: string;
  name: string;
  surface_m2: number | null;
  floor: number | null;
  target_buyer: TargetBuyer | null;
  style_id: string | null;
  rooms: Array<{
    name: string;
    room_type: RoomType;
    surface_m2: number | null;
  }>;
}

/** Infos projet pour la generation de description commerciale. */
export interface ProjectInfo {
  adresse: string;
  type_bien: TypeBien;
  surface_totale: number | null;
}

/** Recommandation acceptee (post-decision utilisateur). */
export interface AcceptedRecommendation {
  id: string;
  title: string;
  description: string;
  action_type: ActionType;
  affected_rooms: string[];
}
