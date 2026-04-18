/**
 * API Route — /api/vs/projects/[id]/plans
 * GET  : Liste les plans d'un projet
 * POST : Upload d'un plan (multipart/form-data)
 *
 * V1 : stockage dans /tmp/vs-uploads/ (pas d'Object Storage pour l'instant).
 * Formats acceptés : PDF, PNG, JPG, WEBP. Max 20 Mo.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { VsPlan, ApiResponse } from "@/lib/vs/types";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_PROJECT,
  ACCEPTED_MIME_TYPES,
} from "@/lib/vs/types";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

// Désactive le cache Route Handler de Next.js 15.
// Sans cela, GET renvoie une réponse cachée après DELETE → le plan supprimé
// réapparaît au reload (bug remonté par Thomas, session s22).
export const dynamic = "force-dynamic";
export const revalidate = 0;

const UPLOAD_DIR = "/tmp/vs-uploads";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
  };
  return map[mimeType] || ".bin";
}

// ─── GET /api/vs/projects/[id]/plans ───────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsPlan[]>>> {
  try {
    await ensureDbReady();
    const { id } = await params;

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de projet invalide." },
        { status: 400 }
      );
    }

    // Vérifier que le projet existe
    const projectCheck = await query(
      "SELECT id FROM vs_projects WHERE id = $1",
      [id]
    );
    if (projectCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Opération introuvable." },
        { status: 404 }
      );
    }

    const result = await query<VsPlan>(
      "SELECT * FROM vs_plans WHERE project_id = $1 ORDER BY floor_number ASC, created_at ASC",
      [id]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("[API] GET /api/vs/projects/[id]/plans erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de charger les plans." },
      { status: 500 }
    );
  }
}

// ─── POST /api/vs/projects/[id]/plans ──────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsPlan>>> {
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

    // Vérifier le nombre de plans existants
    const countResult = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM vs_plans WHERE project_id = $1",
      [projectId]
    );
    const currentCount = parseInt(countResult.rows[0].count, 10);
    if (currentCount >= MAX_FILES_PER_PROJECT) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_FILES_PER_PROJECT} plans par opération.`,
        },
        { status: 400 }
      );
    }

    // Lire le fichier multipart
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const floorNumber = parseInt(
      (formData.get("floor_number") as string) || "0",
      10
    );

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Aucun fichier fourni." },
        { status: 400 }
      );
    }

    // Valider le type MIME
    if (
      !ACCEPTED_MIME_TYPES.includes(
        file.type as (typeof ACCEPTED_MIME_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Format non supporté. Formats acceptés : PDF, PNG, JPG, WEBP.",
        },
        { status: 400 }
      );
    }

    // Valider la taille
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Le fichier dépasse la taille maximale de 20 Mo.",
        },
        { status: 400 }
      );
    }

    // Créer le dossier d'upload
    const projectDir = join(UPLOAD_DIR, projectId);
    await mkdir(projectDir, { recursive: true });

    // Sauvegarder le fichier
    const fileId = uuidv4();
    const ext = getExtension(file.type);
    const fileName = `${fileId}${ext}`;
    const filePath = join(projectDir, fileName);

    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    // Insérer en base
    const result = await query<VsPlan>(
      `INSERT INTO vs_plans (project_id, file_path, mime_type, floor_number, original_filename)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [projectId, filePath, file.type, floorNumber, file.name]
    );

    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API] POST /api/vs/projects/[id]/plans erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de déposer le plan." },
      { status: 500 }
    );
  }
}
