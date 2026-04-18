/**
 * API Route — /api/vs/projects/[id]/lots
 * GET  : Liste tous les lots d'un projet (triés par floor_number, puis created_at)
 * POST : Crée un lot manuellement
 *
 * V1 sans auth — tout est public.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type {
  VsLot,
  CreateLotPayload,
  ApiResponse,
} from "@/lib/vs/types";
import { isValidZone } from "@/lib/vs/types";

// Désactive le cache Route Handler de Next.js 15.
// Sans cela, GET renvoie une réponse cachée après mutation → l'item supprimé
// réapparaît au reload (pattern du fix s22, étendu session s22 maintenance).
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

// ─── GET /api/vs/projects/[id]/lots ───────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsLot[]>>> {
  try {
    await ensureDbReady();
    const { id: projectId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de projet invalide." },
        { status: 400 }
      );
    }

    // Vérifier que le projet existe
    const projectCheck = await query(
      "SELECT id FROM vs_projects WHERE id = $1",
      [projectId]
    );
    if (projectCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Opération introuvable." },
        { status: 404 }
      );
    }

    const result = await query<VsLot>(
      "SELECT * FROM vs_lots WHERE project_id = $1 ORDER BY floor_number ASC, created_at ASC",
      [projectId]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("[API] GET /api/vs/projects/[id]/lots erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de charger les lots." },
      { status: 500 }
    );
  }
}

// ─── POST /api/vs/projects/[id]/lots ──────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsLot>>> {
  try {
    await ensureDbReady();
    const { id: projectId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de projet invalide." },
        { status: 400 }
      );
    }

    // Vérifier que le projet existe
    const projectCheck = await query(
      "SELECT id FROM vs_projects WHERE id = $1",
      [projectId]
    );
    if (projectCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Opération introuvable." },
        { status: 404 }
      );
    }

    const body = (await request.json()) as CreateLotPayload;

    // Validation du nom
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Le nom du lot est obligatoire." },
        { status: 400 }
      );
    }

    // Validation de la zone
    if (!isValidZone(body.zone_data)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Zone invalide. Les coordonnées doivent être en pourcentage (0-100).",
        },
        { status: 400 }
      );
    }

    const floorNumber =
      body.floor_number != null ? Math.round(body.floor_number) : 0;
    const surfaceM2 =
      body.surface_m2 != null && body.surface_m2 > 0 ? body.surface_m2 : null;

    const result = await query<VsLot>(
      `INSERT INTO vs_lots (project_id, name, floor_number, surface_m2, zone_data, status, source)
       VALUES ($1, $2, $3, $4, $5, 'suggested', 'manual')
       RETURNING *`,
      [
        projectId,
        body.name.trim(),
        floorNumber,
        surfaceM2,
        JSON.stringify(body.zone_data),
      ]
    );

    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API] POST /api/vs/projects/[id]/lots erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de créer le lot." },
      { status: 500 }
    );
  }
}
