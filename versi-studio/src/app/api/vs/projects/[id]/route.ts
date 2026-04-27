/**
 * API Route — /api/vs/projects/[id]
 * GET   : Détail d'un projet
 * PATCH : Modification partielle d'un projet
 *
 * V1 sans auth — tout est public.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type {
  VsProject,
  UpdateProjectPayload,
  ApiResponse,
  TypeBien,
  ProjectStatus,
} from "@/lib/vs/types";

const VALID_TYPES: TypeBien[] = ["immeuble", "maison", "appartement"];
const VALID_STATUSES: ProjectStatus[] = [
  "draft",
  "step_1_complete",
  "step_2_complete",
  "step_3_complete",
  "completed",
  "archived",
];

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

// ─── GET /api/vs/projects/[id] ─────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsProject>>> {
  try {
    await ensureDbReady();
    const { id } = await params;

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Identifiant invalide." },
        { status: 400 }
      );
    }

    const result = await query<VsProject>(
      "SELECT * FROM vs_projects WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Opération introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("[API] GET /api/vs/projects/[id] erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de charger l'opération." },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/vs/projects/[id] ──────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsProject>>> {
  try {
    await ensureDbReady();
    const { id } = await params;

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Identifiant invalide." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as UpdateProjectPayload;

    // Construire la requête dynamiquement
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.adresse !== undefined) {
      if (body.adresse.trim().length < 5) {
        return NextResponse.json(
          {
            success: false,
            error: "L'adresse doit contenir au moins 5 caractères.",
          },
          { status: 400 }
        );
      }
      setClauses.push(`adresse = $${paramIndex++}`);
      values.push(body.adresse.trim());
    }

    if (body.type_bien !== undefined) {
      if (!VALID_TYPES.includes(body.type_bien)) {
        return NextResponse.json(
          {
            success: false,
            error: "Type de bien invalide.",
          },
          { status: 400 }
        );
      }
      setClauses.push(`type_bien = $${paramIndex++}`);
      values.push(body.type_bien);
    }

    if (body.surface_totale !== undefined) {
      setClauses.push(`surface_totale = $${paramIndex++}`);
      values.push(
        body.surface_totale != null && body.surface_totale > 0
          ? Math.round(body.surface_totale)
          : null
      );
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: "Statut invalide." },
          { status: 400 }
        );
      }
      setClauses.push(`status = $${paramIndex++}`);
      values.push(body.status);

      // s27 — sync archived_at avec le statut.
      // Single source of truth : status drive archived_at (pas de double vérité).
      if (body.status === "archived") {
        setClauses.push("archived_at = NOW()");
      } else {
        setClauses.push("archived_at = NULL");
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucune modification fournie." },
        { status: 400 }
      );
    }

    // Toujours mettre à jour updated_at
    setClauses.push("updated_at = NOW()");
    values.push(id);

    const result = await query<VsProject>(
      `UPDATE vs_projects SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Opération introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("[API] PATCH /api/vs/projects/[id] erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de modifier l'opération." },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/vs/projects/[id] ─────────────────────────────────
// s27 — hard delete (CASCADE supprime plans, lots, rooms, photos, visuals).
// L'archivage (soft delete) se fait via PATCH { status: "archived" }.

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  try {
    await ensureDbReady();
    const { id } = await params;

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Identifiant invalide." },
        { status: 400 }
      );
    }

    const result = await query<{ id: string }>(
      "DELETE FROM vs_projects WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Opération introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    console.error("[API] DELETE /api/vs/projects/[id] erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de supprimer l'opération." },
      { status: 500 }
    );
  }
}
