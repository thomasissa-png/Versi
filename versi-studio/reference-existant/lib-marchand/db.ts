/**
 * Tables SQL + fonctions CRUD pour le pipeline marchand Versimo.
 *
 * Source de vérité : docs/marchand-pivot/ia/technical-architecture.md section 5.
 * Pattern : copié de lib/db.ts (Pool pg singleton, fire-and-forget pour non-critiques).
 *
 * NOTE : users.id est TEXT dans le schema existant (lib/db.ts), donc user_id est TEXT ici
 * (pas UUID comme dans la spec théorique) pour assurer la compatibilité FK.
 */
import { getPool, ensureTable as ensureBaseTable } from "@/lib/db";
import type {
  TypeBien,
  ProjectStatus,
  LotStatus,
  RoomType,
  RoomShape,
  RoomSource,
  GenerationStatus,
  TargetBuyer,
  ActionType,
  ImpactLevel,
  PlanExtractionResult,
  ExtractedRoom,
} from "@/lib/marchand/schemas";

// ─── Auto-create marchand tables on first use ───────────────────────
let proTablesEnsured = false;

export async function ensureProTables(): Promise<void> {
  if (proTablesEnsured) return;

  // Ensure base tables first (users, generation_logs)
  await ensureBaseTable();

  const db = getPool();

  // Enable uuid generation if not already available
  await db.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  await db.query(`
    -- ============================================================
    -- Table: pro_projects
    -- 1 projet = 1 bien immobilier
    -- ============================================================
    CREATE TABLE IF NOT EXISTS pro_projects (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      adresse         TEXT NOT NULL,
      type_bien       TEXT NOT NULL CHECK (type_bien IN ('immeuble','appartement','maison','bureaux','local_commercial')),
      surface_totale  DECIMAL(8,2) CHECK (surface_totale IS NULL OR (surface_totale > 0 AND surface_totale <= 10000)),
      plan_file_path  TEXT,
      plan_mime_type  TEXT,
      status          TEXT NOT NULL DEFAULT 'plan_uploaded'
                      CHECK (status IN ('plan_uploaded','lots_defined','extraction_done','validated','qualified',
                                        'plan_final','generating','visuals_done','delivered','extraction_failed')),
      extraction_data JSONB,
      stripe_payment_id TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pro_projects_user_id ON pro_projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_pro_projects_status ON pro_projects(status);
    CREATE INDEX IF NOT EXISTS idx_pro_projects_created_at ON pro_projects(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pro_projects_dedup ON pro_projects(user_id, adresse, created_at);

    -- ============================================================
    -- Table: pro_lots
    -- 1 lot = 1 unité (appartement dans un immeuble, ou le bien entier)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS pro_lots (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id            UUID NOT NULL REFERENCES pro_projects(id) ON DELETE CASCADE,
      name                  TEXT NOT NULL,
      floor                 INTEGER DEFAULT 0 CHECK (floor IS NULL OR (floor >= 0 AND floor <= 20)),
      target_buyer          TEXT CHECK (target_buyer IS NULL OR target_buyer IN (
                              'famille','couple_sans_enfant','etudiant',
                              'investisseur_locatif','senior','professionnel_liberal')),
      style_id              TEXT,
      custom_style_text     TEXT,
      budget_travaux        DECIMAL(10,2) CHECK (budget_travaux IS NULL OR budget_travaux >= 0),
      contraintes           TEXT,
      notes_commerciales    TEXT,
      commercial_description TEXT,
      description_is_manual BOOLEAN NOT NULL DEFAULT FALSE,
      status                TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','qualified','plan_final','generating','visuals_done','pdf_ready')),
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pro_lots_project_id ON pro_lots(project_id);

    -- ============================================================
    -- Table: pro_rooms
    -- 1 room = 1 pièce extraite ou saisie manuellement
    -- ============================================================
    CREATE TABLE IF NOT EXISTS pro_rooms (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lot_id              UUID REFERENCES pro_lots(id) ON DELETE CASCADE,
      project_id          UUID NOT NULL REFERENCES pro_projects(id) ON DELETE CASCADE,
      name                TEXT NOT NULL,
      room_type           TEXT NOT NULL DEFAULT 'autre'
                          CHECK (room_type IN ('salon','sejour','salle_a_manger','cuisine','chambre','chambre_parentale','sdb','wc','bureau','entree','dressing','cellier','terrasse','garage','couloir','cave','salle_reunion','open_space','accueil','local_technique','autre')),
      surface_m2          DECIMAL(6,2) CHECK (surface_m2 IS NULL OR (surface_m2 > 0 AND surface_m2 < 1000)),
      length_m            DECIMAL(5,2) CHECK (length_m IS NULL OR length_m > 0),
      width_m             DECIMAL(5,2) CHECK (width_m IS NULL OR width_m > 0),
      ceiling_height_m    DECIMAL(4,2) CHECK (ceiling_height_m IS NULL OR ceiling_height_m > 0),
      windows_count       INTEGER NOT NULL DEFAULT 0 CHECK (windows_count >= 0),
      doors_count         INTEGER NOT NULL DEFAULT 1 CHECK (doors_count >= 0),
      floor               INTEGER DEFAULT 0,
      shape               TEXT CHECK (shape IS NULL OR shape IN ('rectangular','square','L-shaped','narrow_corridor','irregular')),
      is_estimated        BOOLEAN NOT NULL DEFAULT FALSE,
      confidence          DECIMAL(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
      photo_path          TEXT,
      visual_pass1_path   TEXT,
      visual_output_path  TEXT,
      generation_status   TEXT NOT NULL DEFAULT 'pending'
                          CHECK (generation_status IN ('pending','generating_pass1','generating_pass2','done','failed')),
      generation_error    TEXT,
      source              TEXT NOT NULL DEFAULT 'ai_extraction'
                          CHECK (source IN ('ai_extraction','manual')),
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pro_rooms_lot_id ON pro_rooms(lot_id);
    CREATE INDEX IF NOT EXISTS idx_pro_rooms_project_id ON pro_rooms(project_id);
    CREATE INDEX IF NOT EXISTS idx_pro_rooms_generation_status ON pro_rooms(generation_status);

    -- ============================================================
    -- Table: pro_recommendations
    -- Recommandations architecte IA par lot
    -- ============================================================
    CREATE TABLE IF NOT EXISTS pro_recommendations (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lot_id              UUID NOT NULL REFERENCES pro_lots(id) ON DELETE CASCADE,
      title               TEXT NOT NULL,
      description         TEXT NOT NULL,
      action_type         TEXT NOT NULL CHECK (action_type IN ('redistribution','cloison','affectation','deco','sol','luminaire')),
      estimated_cost_eur  DECIMAL(8,2),
      impact_level        TEXT NOT NULL CHECK (impact_level IN ('basse','moyenne','haute')),
      affected_rooms      TEXT[] NOT NULL,
      rationale_buyer     TEXT,
      is_accepted         BOOLEAN,
      is_active           BOOLEAN NOT NULL DEFAULT TRUE,
      version             INTEGER NOT NULL DEFAULT 1,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pro_recommendations_lot_id ON pro_recommendations(lot_id);
    CREATE INDEX IF NOT EXISTS idx_pro_recommendations_active ON pro_recommendations(lot_id, is_active);

    -- ============================================================
    -- Table: pro_share_links
    -- Liens de partage tokenisés pour les acquéreurs
    -- ============================================================
    CREATE TABLE IF NOT EXISTS pro_share_links (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lot_id            UUID NOT NULL REFERENCES pro_lots(id) ON DELETE CASCADE,
      token             TEXT UNIQUE NOT NULL,
      expires_at        TIMESTAMPTZ NOT NULL,
      is_active         BOOLEAN NOT NULL DEFAULT TRUE,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_accessed_at  TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_pro_share_links_token ON pro_share_links(token);
    CREATE INDEX IF NOT EXISTS idx_pro_share_links_lot_id ON pro_share_links(lot_id);
  `);

  // ─── Migrations (additive columns on existing tables) ────────────
  // share_token: UUID for public share link (per-project)
  await db.query(`
    ALTER TABLE pro_projects ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
  `).catch(() => { /* column may already exist */ });
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_pro_projects_share_token ON pro_projects(share_token);
  `).catch(() => { /* index may already exist */ });

  // selling_price: prix de vente du bien
  await db.query(`
    ALTER TABLE pro_projects ADD COLUMN IF NOT EXISTS selling_price DECIMAL(12,2) CHECK (selling_price IS NULL OR selling_price > 0);
  `).catch(() => { /* column may already exist */ });

  // ─── Sprint lots/biens — colonnes découpe ─────────────────────────
  // lot_type: type de lot (appartement, commerce, bureau, parking, autre)
  await db.query(`
    ALTER TABLE pro_lots ADD COLUMN IF NOT EXISTS lot_type VARCHAR(20) DEFAULT 'appartement';
  `).catch(() => { /* column may already exist */ });

  // color: couleur hex pour l'affichage plan
  await db.query(`
    ALTER TABLE pro_lots ADD COLUMN IF NOT EXISTS color VARCHAR(7);
  `).catch(() => { /* column may already exist */ });

  // sort_order: ordre d'affichage des lots
  await db.query(`
    ALTER TABLE pro_lots ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
  `).catch(() => { /* column may already exist */ });

  // zone_rect: zone dessinée sur le plan pour ce lot (rectangle en % de l'image)
  await db.query(`
    ALTER TABLE pro_lots ADD COLUMN IF NOT EXISTS zone_rect JSONB;
  `).catch(() => { /* column may already exist */ });

  // zone_polygon: zone polygonale dessinée sur le plan (points en % de l'image)
  await db.query(`
    ALTER TABLE pro_lots ADD COLUMN IF NOT EXISTS zone_polygon JSONB;
  `).catch(() => { /* column may already exist */ });

  // surface_m2: surface calculée de la zone du lot (pour validation quality gates)
  await db.query(`
    ALTER TABLE pro_lots ADD COLUMN IF NOT EXISTS surface_m2 DECIMAL(8,2);
  `).catch(() => { /* column may already exist */ });

  // photo_direction: position et angle de prise de vue sur le plan
  await db.query(`
    ALTER TABLE pro_rooms ADD COLUMN IF NOT EXISTS photo_direction JSONB;
  `).catch(() => { /* column may already exist */ });

  // Add bounding_box JSONB column to pro_rooms (for plan spatial positioning)
  await db.query(`
    ALTER TABLE pro_rooms ADD COLUMN IF NOT EXISTS bounding_box JSONB;
  `).catch(() => { /* column may already exist */ });

  // lots_defined status on pro_projects
  await db.query(`
    ALTER TABLE pro_projects DROP CONSTRAINT IF EXISTS pro_projects_status_check;
  `).catch(() => { /* constraint may not exist */ });
  await db.query(`
    ALTER TABLE pro_projects ADD CONSTRAINT pro_projects_status_check
      CHECK (status IN ('plan_uploaded','extraction_done','lots_defined','validated','qualified',
                        'plan_final','generating','visuals_done','delivered','extraction_failed'));
  `).catch(() => { /* constraint may already exist with new values */ });

  proTablesEnsured = true;
}

// ─── Project CRUD ───────────────────────────────────────────────────

export interface CreateProjectInput {
  userId: string;
  adresse: string;
  typeBien: TypeBien;
  surfaceTotale?: number | null;
  planFilePath?: string | null;
  planMimeType?: string | null;
}

export interface ProProject {
  id: string;
  user_id: string;
  adresse: string;
  type_bien: TypeBien;
  surface_totale: number | null;
  plan_file_path: string | null;
  plan_mime_type: string | null;
  status: ProjectStatus;
  extraction_data: PlanExtractionResult | null;
  stripe_payment_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createProject(input: CreateProjectInput): Promise<ProProject> {
  await ensureProTables();
  const db = getPool();
  const result = await db.query<ProProject>(
    `INSERT INTO pro_projects (user_id, adresse, type_bien, surface_totale, plan_file_path, plan_mime_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.userId,
      input.adresse,
      input.typeBien,
      input.surfaceTotale ?? null,
      input.planFilePath ?? null,
      input.planMimeType ?? null,
    ]
  );
  return result.rows[0];
}

export async function getProject(projectId: string): Promise<ProProject | null> {
  await ensureProTables();
  const db = getPool();
  const result = await db.query<ProProject>(
    `SELECT * FROM pro_projects WHERE id = $1`,
    [projectId]
  );
  return result.rows[0] ?? null;
}

export async function getProjectsByUser(userId: string): Promise<ProProject[]> {
  await ensureProTables();
  const db = getPool();
  const result = await db.query<ProProject>(
    `SELECT * FROM pro_projects WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus,
  extractionData?: PlanExtractionResult
): Promise<void> {
  await ensureProTables();
  const db = getPool();
  if (extractionData) {
    await db.query(
      `UPDATE pro_projects SET status = $1, extraction_data = $2, updated_at = NOW() WHERE id = $3`,
      [status, JSON.stringify(extractionData), projectId]
    );
  } else {
    await db.query(
      `UPDATE pro_projects SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, projectId]
    );
  }
}

// ─── Lot CRUD ───────────────────────────────────────────────────────

export interface CreateLotInput {
  projectId: string;
  name: string;
  floor?: number | null;
  targetBuyer?: TargetBuyer | null;
  styleId?: string | null;
  lotType?: string | null;
  color?: string | null;
  sortOrder?: number | null;
  zoneRect?: LotZoneRect | null;
  zonePolygon?: LotZonePolygon | null;
  surfaceM2?: number | null;
}

export interface LotZoneRect {
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

export interface LotZonePolygon {
  points: Array<{ x_percent: number; y_percent: number }>;
}

export interface ProLot {
  id: string;
  project_id: string;
  name: string;
  floor: number | null;
  target_buyer: TargetBuyer | null;
  style_id: string | null;
  custom_style_text: string | null;
  budget_travaux: number | null;
  contraintes: string | null;
  notes_commerciales: string | null;
  commercial_description: string | null;
  description_is_manual: boolean;
  status: LotStatus;
  lot_type: string | null;
  color: string | null;
  sort_order: number | null;
  zone_rect: LotZoneRect | null;
  zone_polygon: LotZonePolygon | null;
  surface_m2: number | null;
  created_at: Date;
}

export async function createLot(input: CreateLotInput): Promise<ProLot> {
  await ensureProTables();
  const db = getPool();
  const result = await db.query<ProLot>(
    `INSERT INTO pro_lots (project_id, name, floor, target_buyer, style_id, lot_type, color, sort_order, zone_rect, zone_polygon, surface_m2)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      input.projectId,
      input.name,
      input.floor ?? 0,
      input.targetBuyer ?? null,
      input.styleId ?? null,
      input.lotType ?? "appartement",
      input.color ?? null,
      input.sortOrder ?? 0,
      input.zoneRect ? JSON.stringify(input.zoneRect) : null,
      input.zonePolygon ? JSON.stringify(input.zonePolygon) : null,
      input.surfaceM2 ?? null,
    ]
  );
  return result.rows[0];
}

export async function getLotsByProject(projectId: string): Promise<ProLot[]> {
  await ensureProTables();
  const db = getPool();
  const result = await db.query<ProLot>(
    `SELECT * FROM pro_lots WHERE project_id = $1 ORDER BY floor ASC, name ASC`,
    [projectId]
  );
  return result.rows;
}

export async function getLot(lotId: string): Promise<ProLot | null> {
  await ensureProTables();
  const db = getPool();
  const result = await db.query<ProLot>(
    `SELECT * FROM pro_lots WHERE id = $1`,
    [lotId]
  );
  return result.rows[0] ?? null;
}

export async function updateLot(
  lotId: string,
  fields: Partial<Pick<ProLot, "name" | "floor" | "target_buyer" | "style_id" | "custom_style_text" | "budget_travaux" | "contraintes" | "notes_commerciales" | "commercial_description" | "description_is_manual" | "status">>
): Promise<void> {
  await ensureProTables();
  const db = getPool();

  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;

  const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`);
  const values = entries.map(([, v]) => v);

  await db.query(
    `UPDATE pro_lots SET ${setClauses.join(", ")} WHERE id = $${entries.length + 1}`,
    [...values, lotId]
  );
}

export async function deleteLot(lotId: string): Promise<void> {
  await ensureProTables();
  const db = getPool();
  // Unassign rooms before deleting (set lot_id to NULL)
  await db.query(`UPDATE pro_rooms SET lot_id = NULL WHERE lot_id = $1`, [lotId]);
  await db.query(`DELETE FROM pro_lots WHERE id = $1`, [lotId]);
}

export async function deleteProjectLots(projectId: string): Promise<void> {
  await ensureProTables();
  const db = getPool();
  // Unassign all rooms first
  await db.query(`UPDATE pro_rooms SET lot_id = NULL WHERE project_id = $1`, [projectId]);
  // Delete all lots for this project
  await db.query(`DELETE FROM pro_lots WHERE project_id = $1`, [projectId]);
}

export async function updateRoomLot(roomId: string, lotId: string | null): Promise<void> {
  await ensureProTables();
  const db = getPool();
  await db.query(`UPDATE pro_rooms SET lot_id = $1 WHERE id = $2`, [lotId, roomId]);
}

// ─── Room CRUD ──────────────────────────────────────────────────────

export interface PhotoDirection {
  x_percent: number;  // camera position X on plan (0-100)
  y_percent: number;  // camera position Y on plan (0-100)
  angle_deg: number;  // direction angle in degrees (0=right, 90=down, 180=left, 270=up)
}

export interface ProRoom {
  id: string;
  lot_id: string | null;
  project_id: string;
  name: string;
  room_type: RoomType;
  surface_m2: number | null;
  length_m: number | null;
  width_m: number | null;
  ceiling_height_m: number | null;
  windows_count: number;
  doors_count: number;
  floor: number;
  shape: RoomShape | null;
  is_estimated: boolean;
  confidence: number | null;
  photo_path: string | null;
  visual_pass1_path: string | null;
  visual_output_path: string | null;
  generation_status: GenerationStatus;
  generation_error: string | null;
  source: RoomSource;
  bounding_box: { x_percent: number; y_percent: number; width_percent: number; height_percent: number } | null;
  photo_direction: PhotoDirection | null;
  created_at: Date;
}

export async function createRoomsFromExtraction(
  projectId: string,
  lotId: string | null,
  extractedRooms: ExtractedRoom[]
): Promise<ProRoom[]> {
  await ensureProTables();
  const db = getPool();
  const rooms: ProRoom[] = [];

  for (const room of extractedRooms) {
    const result = await db.query<ProRoom>(
      `INSERT INTO pro_rooms (
        project_id, lot_id, name, room_type, surface_m2, length_m, width_m,
        ceiling_height_m, windows_count, doors_count, floor, shape,
        is_estimated, confidence, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        projectId,
        lotId,
        room.name_raw,
        "autre", // Default — user corrects in validation step
        room.surface_m2,
        room.dimensions?.length_m ?? null,
        room.dimensions?.width_m ?? null,
        room.ceiling_height_m,
        room.windows_count,
        room.doors_count,
        room.floor ?? 0,
        room.shape,
        room.dimensions === null, // is_estimated = true if no dimensions
        room.confidence,
        "ai_extraction",
      ]
    );
    rooms.push(result.rows[0]);
  }

  return rooms;
}

export async function getRoomsByProject(projectId: string): Promise<ProRoom[]> {
  await ensureProTables();
  const db = getPool();
  const result = await db.query<ProRoom>(
    `SELECT * FROM pro_rooms WHERE project_id = $1 ORDER BY floor ASC, name ASC`,
    [projectId]
  );
  return result.rows;
}

export async function getRoomsByLot(lotId: string): Promise<ProRoom[]> {
  await ensureProTables();
  const db = getPool();
  const result = await db.query<ProRoom>(
    `SELECT * FROM pro_rooms WHERE lot_id = $1 ORDER BY floor ASC, name ASC`,
    [lotId]
  );
  return result.rows;
}

export async function getRoom(roomId: string): Promise<ProRoom | null> {
  await ensureProTables();
  const db = getPool();
  const result = await db.query<ProRoom>(
    `SELECT * FROM pro_rooms WHERE id = $1`,
    [roomId]
  );
  return result.rows[0] ?? null;
}

export async function updateRoom(
  roomId: string,
  fields: Partial<Pick<ProRoom, "lot_id" | "name" | "room_type" | "surface_m2" | "length_m" | "width_m" | "ceiling_height_m" | "windows_count" | "doors_count" | "floor" | "shape" | "is_estimated" | "photo_path" | "visual_pass1_path" | "visual_output_path" | "generation_status" | "generation_error" | "photo_direction">>
): Promise<void> {
  await ensureProTables();
  const db = getPool();

  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;

  const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`);
  const values = entries.map(([, v]) => v);

  await db.query(
    `UPDATE pro_rooms SET ${setClauses.join(", ")} WHERE id = $${entries.length + 1}`,
    [...values, roomId]
  );
}

// ─── Recommendation CRUD ────────────────────────────────────────────

export interface ProRecommendation {
  id: string;
  lot_id: string;
  title: string;
  description: string;
  action_type: ActionType;
  estimated_cost_eur: number | null;
  impact_level: ImpactLevel;
  affected_rooms: string[];
  rationale_buyer: string | null;
  is_accepted: boolean | null;
  is_active: boolean;
  version: number;
  created_at: Date;
}

export async function createRecommendations(
  lotId: string,
  recommendations: Array<{
    title: string;
    description: string;
    action_type: ActionType;
    estimated_cost_eur: number | null;
    impact_level: ImpactLevel;
    affected_rooms: string[];
    rationale_buyer: string;
  }>
): Promise<ProRecommendation[]> {
  await ensureProTables();
  const db = getPool();

  // Deactivate previous recommendations for this lot
  await db.query(
    `UPDATE pro_recommendations SET is_active = FALSE WHERE lot_id = $1`,
    [lotId]
  );

  // Get next version number
  const versionResult = await db.query<{ max_version: number | null }>(
    `SELECT MAX(version) as max_version FROM pro_recommendations WHERE lot_id = $1`,
    [lotId]
  );
  const nextVersion = (versionResult.rows[0]?.max_version ?? 0) + 1;

  const results: ProRecommendation[] = [];
  for (const rec of recommendations) {
    const result = await db.query<ProRecommendation>(
      `INSERT INTO pro_recommendations (
        lot_id, title, description, action_type, estimated_cost_eur,
        impact_level, affected_rooms, rationale_buyer, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        lotId,
        rec.title,
        rec.description,
        rec.action_type,
        rec.estimated_cost_eur,
        rec.impact_level,
        rec.affected_rooms,
        rec.rationale_buyer,
        nextVersion,
      ]
    );
    results.push(result.rows[0]);
  }

  return results;
}

export async function getActiveRecommendations(lotId: string): Promise<ProRecommendation[]> {
  await ensureProTables();
  const db = getPool();
  const result = await db.query<ProRecommendation>(
    `SELECT * FROM pro_recommendations WHERE lot_id = $1 AND is_active = TRUE ORDER BY impact_level DESC, created_at ASC`,
    [lotId]
  );
  return result.rows;
}

export async function updateRecommendationAcceptance(
  recommendationId: string,
  isAccepted: boolean
): Promise<void> {
  await ensureProTables();
  const db = getPool();
  await db.query(
    `UPDATE pro_recommendations SET is_accepted = $1 WHERE id = $2`,
    [isAccepted, recommendationId]
  );
}

// ─── Share links ────────────────────────────────────────────────────

export interface ProShareLink {
  id: string;
  lot_id: string;
  token: string;
  expires_at: Date;
  is_active: boolean;
  created_at: Date;
  last_accessed_at: Date | null;
}

export async function createShareLink(
  lotId: string,
  token: string,
  expiresAt: Date
): Promise<ProShareLink> {
  await ensureProTables();
  const db = getPool();
  const result = await db.query<ProShareLink>(
    `INSERT INTO pro_share_links (lot_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [lotId, token, expiresAt]
  );
  return result.rows[0];
}

export async function getShareLinkByToken(token: string): Promise<ProShareLink | null> {
  await ensureProTables();
  const db = getPool();
  const result = await db.query<ProShareLink>(
    `SELECT * FROM pro_share_links WHERE token = $1 AND is_active = TRUE AND expires_at > NOW()`,
    [token]
  );
  if (result.rows[0]) {
    // Fire-and-forget: update last_accessed_at
    db.query(
      `UPDATE pro_share_links SET last_accessed_at = NOW() WHERE id = $1`,
      [result.rows[0].id]
    ).catch(() => { /* non-critical */ });
  }
  return result.rows[0] ?? null;
}

export async function getActiveShareLink(lotId: string): Promise<ProShareLink | null> {
  await ensureProTables();
  const db = getPool();
  const result = await db.query<ProShareLink>(
    `SELECT * FROM pro_share_links WHERE lot_id = $1 AND is_active = TRUE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [lotId]
  );
  return result.rows[0] ?? null;
}

// ─── Ownership check ────────────────────────────────────────────────

export async function verifyProjectOwnership(
  projectId: string,
  userId: string
): Promise<boolean> {
  await ensureProTables();
  const db = getPool();
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM pro_projects WHERE id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  return parseInt(result.rows[0].count, 10) > 0;
}

// ─── Share token (project-level) ────────────────────────────────────

/**
 * Get or create a share token for a pro project.
 * The token is a UUID that allows public (unauthenticated) access
 * to a read-only view of the project dossier.
 */
export async function getOrCreateShareToken(projectId: string): Promise<string> {
  await ensureProTables();
  const db = getPool();

  // Check if token already exists
  const existing = await db.query<{ share_token: string | null }>(
    `SELECT share_token FROM pro_projects WHERE id = $1`,
    [projectId]
  );

  if (existing.rows[0]?.share_token) {
    return existing.rows[0].share_token;
  }

  // Generate and store a new token
  const token = crypto.randomUUID();
  await db.query(
    `UPDATE pro_projects SET share_token = $1, updated_at = NOW() WHERE id = $2`,
    [token, projectId]
  );

  return token;
}

/**
 * Fetch a pro project by its share token (public, no auth).
 * Returns project data + lots + rooms with visuals for the public dossier view.
 */
export async function getProjectByShareToken(token: string): Promise<{
  project: ProProject & { selling_price: number | null };
  lots: Array<ProLot & { rooms: ProRoom[] }>;
} | null> {
  await ensureProTables();
  const db = getPool();

  const projectResult = await db.query(
    `SELECT *, selling_price FROM pro_projects WHERE share_token = $1`,
    [token]
  );

  if (projectResult.rows.length === 0) return null;

  const project = projectResult.rows[0] as ProProject & { selling_price: number | null };

  // Load lots
  const lotsResult = await db.query<ProLot>(
    `SELECT * FROM pro_lots WHERE project_id = $1 ORDER BY floor ASC, name ASC`,
    [project.id]
  );

  // Load rooms for each lot
  const lotsWithRooms = await Promise.all(
    lotsResult.rows.map(async (lot) => {
      const roomsResult = await db.query<ProRoom>(
        `SELECT * FROM pro_rooms WHERE lot_id = $1 ORDER BY name ASC`,
        [lot.id]
      );
      return { ...lot, rooms: roomsResult.rows };
    })
  );

  return { project, lots: lotsWithRooms };
}
