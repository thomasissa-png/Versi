/**
 * API Route — /api/vs/rooms/[id]/generate
 * POST : Lance la génération d'un visuel post-travaux (async)
 *
 * Flux : crée une entrée vs_visuals status='processing', lance la génération
 * en arrière-plan, retourne immédiatement le visual_id pour polling.
 *
 * Si OPENAI_API_KEY n'est pas configurée, simule la génération avec un placeholder.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import { generateVisual } from "@/lib/vs/visual-generator";
import type { VsVisual, VsPhoto, VsRoom, ApiResponse } from "@/lib/vs/types";
import { getStyle } from "@/lib/vs/styles";
import { readFile } from "fs/promises";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// ─── POST /api/vs/rooms/[id]/generate ─────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ visual_id: string }>>> {
  try {
    await ensureDbReady();
    const { id: roomId } = await params;

    if (!isValidUUID(roomId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de pièce invalide." },
        { status: 400 }
      );
    }

    // Lire le body
    const body = await request.json() as {
      photo_id: string;
      style_id: string;
      structural_instructions?: string | null;
    };

    if (!body.photo_id || !isValidUUID(body.photo_id)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de photo invalide." },
        { status: 400 }
      );
    }

    if (!body.style_id || !getStyle(body.style_id)) {
      return NextResponse.json(
        { success: false, error: "Style de décoration invalide." },
        { status: 400 }
      );
    }

    // Valider structural_instructions (optionnel, max 500 caractères)
    const structuralInstructions = body.structural_instructions?.trim() || null;
    if (structuralInstructions && structuralInstructions.length > 500) {
      return NextResponse.json(
        { success: false, error: "La description des travaux ne peut pas dépasser 500 caractères." },
        { status: 400 }
      );
    }

    // Vérifier que la pièce existe
    const roomResult = await query<VsRoom>(
      "SELECT * FROM vs_rooms WHERE id = $1",
      [roomId]
    );
    if (roomResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pièce introuvable." },
        { status: 404 }
      );
    }
    const room = roomResult.rows[0];

    // Vérifier que la photo existe et appartient à cette pièce
    const photoResult = await query<VsPhoto>(
      "SELECT * FROM vs_photos WHERE id = $1 AND room_id = $2",
      [body.photo_id, roomId]
    );
    if (photoResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Photo introuvable pour cette pièce." },
        { status: 404 }
      );
    }
    const photo = photoResult.rows[0];

    // Compter les itérations existantes pour cette photo + style
    const countResult = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM vs_visuals WHERE photo_id = $1 AND style_id = $2",
      [body.photo_id, body.style_id]
    );
    const iterationCount = parseInt(countResult.rows[0].count, 10);

    // Créer l'entrée visuel en status processing
    const visualResult = await query<VsVisual>(
      `INSERT INTO vs_visuals (photo_id, style_id, status, iteration_count)
       VALUES ($1, $2, 'processing', $3)
       RETURNING *`,
      [body.photo_id, body.style_id, iterationCount]
    );
    const visual = visualResult.rows[0];

    // Lancer la génération en arrière-plan
    // IMPORTANT : sur Replit autoscale, on doit await avant la réponse.
    // Mais la génération prend ~90s, donc on lance et on attend via polling.
    // Compromis V1 : on lance sans await, le frontend poll le statut.
    generateVisualAsync(visual.id, photo, room, body.style_id, structuralInstructions);

    return NextResponse.json(
      { success: true, data: { visual_id: visual.id } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API] POST /api/vs/rooms/[id]/generate erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de lancer la création du visuel." },
      { status: 500 }
    );
  }
}

// ─── Génération asynchrone ────────────────────────────────────────

async function generateVisualAsync(
  visualId: string,
  photo: VsPhoto,
  room: VsRoom,
  styleId: string,
  structuralInstructions: string | null = null
): Promise<void> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const hasRealKey = apiKey && apiKey !== "..." && apiKey.length > 10;

    if (!hasRealKey) {
      // Mode simulation : attendre 3s puis marquer comme généré avec placeholder
      await new Promise((r) => setTimeout(r, 3000));
      await query(
        `UPDATE vs_visuals SET status = 'generated', file_path = 'placeholder', prompt_used = 'Mode simulation — OPENAI_API_KEY non configurée'
         WHERE id = $1`,
        [visualId]
      );
      console.log(`[visual-gen] Visuel ${visualId} : mode simulation terminé.`);
      return;
    }

    // Lire la photo depuis le disque
    const photoBuffer = await readFile(photo.file_path);
    const photoBase64 = photoBuffer.toString("base64");

    // Déduire le MIME type depuis l'extension
    const ext = photo.file_path.substring(photo.file_path.lastIndexOf(".")).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    const mimeType = mimeMap[ext] || "image/jpeg";

    // Appeler le générateur (avec transformations structurelles si renseignées)
    const result = await generateVisual(
      photoBase64,
      mimeType,
      room.room_type,
      styleId,
      room.surface_m2 ? Number(room.surface_m2) : null,
      photo.angle_description,
      structuralInstructions
    );

    if (!result) {
      await query(
        `UPDATE vs_visuals SET status = 'failed', error_message = 'La génération a échoué après plusieurs tentatives.'
         WHERE id = $1`,
        [visualId]
      );
      return;
    }

    // Sauvegarder l'image générée sur disque
    const { writeFile: writeFileAsync, mkdir: mkdirAsync } = await import("fs/promises");
    const { join } = await import("path");
    const { v4: uuidv4 } = await import("uuid");

    const outputDir = "/tmp/vs-uploads/visuals";
    await mkdirAsync(outputDir, { recursive: true });
    const outputFileName = `${uuidv4()}.png`;
    const outputPath = join(outputDir, outputFileName);
    await writeFileAsync(outputPath, Buffer.from(result.image_base64, "base64"));

    // Mettre à jour en base
    await query(
      `UPDATE vs_visuals SET status = 'generated', file_path = $1, prompt_used = $2
       WHERE id = $3`,
      [outputPath, result.prompt_used, visualId]
    );

    console.log(`[visual-gen] Visuel ${visualId} : génération terminée.`);
  } catch (err) {
    console.error(`[visual-gen] Visuel ${visualId} : erreur fatale.`, err);
    await query(
      `UPDATE vs_visuals SET status = 'failed', error_message = $1
       WHERE id = $2`,
      [err instanceof Error ? err.message : "Erreur inconnue", visualId]
    ).catch(() => {});
  }
}
