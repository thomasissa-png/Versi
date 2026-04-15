/**
 * API Route — /api/vs/projects
 * GET  : Liste tous les projets (triés par date desc)
 * POST : Crée un nouveau projet
 *
 * V1 sans auth — tout est public.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type {
  VsProject,
  CreateProjectPayload,
  ApiResponse,
  TypeBien,
} from "@/lib/vs/types";

const VALID_TYPES: TypeBien[] = ["immeuble", "maison", "appartement"];

// ─── GET /api/vs/projects ──────────────────────────────────────────

export async function GET(): Promise<NextResponse<ApiResponse<VsProject[]>>> {
  try {
    await ensureDbReady();
    const result = await query<VsProject>(
      "SELECT * FROM vs_projects ORDER BY created_at DESC"
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("[API] GET /api/vs/projects erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de charger les opérations." },
      { status: 500 }
    );
  }
}

// ─── POST /api/vs/projects ─────────────────────────────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<VsProject>>> {
  try {
    await ensureDbReady();

    const body = (await request.json()) as CreateProjectPayload;

    // Validation
    if (!body.adresse || body.adresse.trim().length < 5) {
      return NextResponse.json(
        {
          success: false,
          error: "L'adresse est obligatoire (5 caractères minimum).",
        },
        { status: 400 }
      );
    }

    if (!body.type_bien || !VALID_TYPES.includes(body.type_bien)) {
      return NextResponse.json(
        {
          success: false,
          error: "Le type de bien est obligatoire (immeuble, maison ou appartement).",
        },
        { status: 400 }
      );
    }

    const surfaceTotale =
      body.surface_totale != null && body.surface_totale > 0
        ? Math.round(body.surface_totale)
        : null;

    const result = await query<VsProject>(
      `INSERT INTO vs_projects (adresse, type_bien, surface_totale)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [body.adresse.trim(), body.type_bien, surfaceTotale]
    );

    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API] POST /api/vs/projects erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de créer l'opération." },
      { status: 500 }
    );
  }
}
