/**
 * API Route — /api/vs/rooms/[id]/photos
 * POST : Upload d'une photo brute de pièce (multipart/form-data)
 *
 * V1 : stockage dans /tmp/vs-uploads/photos/. Max 10 Mo. JPEG/PNG/WEBP uniquement.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { VsPhoto, ApiResponse } from "@/lib/vs/types";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = "/tmp/vs-uploads/photos";
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10 Mo
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  return map[mimeType] || ".bin";
}

// ─── POST /api/vs/rooms/[id]/photos ───────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsPhoto>>> {
  try {
    await ensureDbReady();
    const { id: roomId } = await params;

    if (!isValidUUID(roomId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de pièce invalide." },
        { status: 400 }
      );
    }

    // Vérifier que la pièce existe
    const roomCheck = await query(
      "SELECT id FROM vs_rooms WHERE id = $1",
      [roomId]
    );
    if (roomCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pièce introuvable." },
        { status: 404 }
      );
    }

    // Lire le fichier multipart
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const angleDescription = (formData.get("angle_description") as string) || null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Aucun fichier fourni." },
        { status: 400 }
      );
    }

    // Valider le type MIME
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Format non supporté. Formats acceptés : JPG, PNG, WEBP.",
        },
        { status: 400 }
      );
    }

    // Valider la taille
    if (file.size > MAX_PHOTO_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "Le fichier dépasse la taille maximale de 10 Mo.",
        },
        { status: 400 }
      );
    }

    // Créer le dossier d'upload
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Sauvegarder le fichier
    const fileId = uuidv4();
    const ext = getExtension(file.type);
    const fileName = `${fileId}${ext}`;
    const filePath = join(UPLOAD_DIR, fileName);

    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    // Insérer en base
    const result = await query<VsPhoto>(
      `INSERT INTO vs_photos (room_id, file_path, angle_description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [roomId, filePath, angleDescription]
    );

    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API] POST /api/vs/rooms/[id]/photos erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de déposer la photo." },
      { status: 500 }
    );
  }
}
