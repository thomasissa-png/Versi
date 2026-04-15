/**
 * API Route — /api/vs/visuals/[id]/iterate
 * POST : Lance une itération avec l'agent architecte (async)
 *
 * Flux : crée une nouvelle entrée vs_visuals avec parent_visual_id,
 * lance l'itération en arrière-plan, retourne le new_visual_id pour polling.
 *
 * Si OPENAI_API_KEY n'est pas configurée, simule l'itération avec un placeholder.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import { iterateVisual } from "@/lib/vs/architect-agent";
import type { VsVisual, VsRoom, ApiResponse } from "@/lib/vs/types";
import { readFile } from "fs/promises";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// ─── POST /api/vs/visuals/[id]/iterate ───────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ visual_id: string }>>> {
  try {
    await ensureDbReady();
    const { id: parentVisualId } = await params;

    if (!isValidUUID(parentVisualId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de visuel invalide." },
        { status: 400 }
      );
    }

    // Lire le body
    const body = await request.json() as { instruction: string };

    if (!body.instruction || body.instruction.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "L'instruction de modification est requise." },
        { status: 400 }
      );
    }

    if (body.instruction.trim().length > 500) {
      return NextResponse.json(
        { success: false, error: "L'instruction ne peut pas dépasser 500 caractères." },
        { status: 400 }
      );
    }

    // Vérifier que le visuel parent existe et est généré
    const parentResult = await query<VsVisual>(
      "SELECT * FROM vs_visuals WHERE id = $1",
      [parentVisualId]
    );
    if (parentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Visuel introuvable." },
        { status: 404 }
      );
    }
    const parentVisual = parentResult.rows[0];

    if (parentVisual.status !== "generated" && parentVisual.status !== "validated") {
      return NextResponse.json(
        { success: false, error: "Le visuel parent n'est pas encore prêt." },
        { status: 400 }
      );
    }

    // Récupérer la pièce via la photo
    const roomResult = await query<VsRoom>(
      `SELECT r.* FROM vs_rooms r
       JOIN vs_photos p ON p.room_id = r.id
       WHERE p.id = $1`,
      [parentVisual.photo_id]
    );
    if (roomResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pièce associée introuvable." },
        { status: 404 }
      );
    }
    const room = roomResult.rows[0];

    // Compter les itérations existantes
    const countResult = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM vs_visuals WHERE photo_id = $1 AND style_id = $2",
      [parentVisual.photo_id, parentVisual.style_id]
    );
    const iterationCount = parseInt(countResult.rows[0].count, 10);

    // Créer la nouvelle entrée visuel
    const newVisualResult = await query<VsVisual>(
      `INSERT INTO vs_visuals (photo_id, style_id, status, iteration_count, parent_visual_id)
       VALUES ($1, $2, 'processing', $3, $4)
       RETURNING *`,
      [parentVisual.photo_id, parentVisual.style_id, iterationCount, parentVisualId]
    );
    const newVisual = newVisualResult.rows[0];

    // Lancer l'itération en arrière-plan
    iterateVisualAsync(
      newVisual.id,
      parentVisual,
      room,
      body.instruction.trim()
    );

    return NextResponse.json(
      { success: true, data: { visual_id: newVisual.id } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API] POST /api/vs/visuals/[id]/iterate erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de lancer la modification du visuel." },
      { status: 500 }
    );
  }
}

// ─── Itération asynchrone ────────────────────────────────────────

async function iterateVisualAsync(
  newVisualId: string,
  parentVisual: VsVisual,
  room: VsRoom,
  instruction: string
): Promise<void> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const hasRealKey = apiKey && apiKey !== "..." && apiKey.length > 10;

    if (!hasRealKey) {
      // Mode simulation : attendre 3s puis marquer comme généré
      await new Promise((r) => setTimeout(r, 3000));
      await query(
        `UPDATE vs_visuals SET status = 'generated', file_path = 'placeholder', prompt_used = $1
         WHERE id = $2`,
        [`Mode simulation — instruction : "${instruction}"`, newVisualId]
      );
      console.log(`[iterate] Visuel ${newVisualId} : mode simulation terminé.`);
      return;
    }

    // Lire le visuel parent depuis le disque
    if (!parentVisual.file_path || parentVisual.file_path === "placeholder") {
      await query(
        `UPDATE vs_visuals SET status = 'failed', error_message = 'Visuel parent introuvable sur le disque.'
         WHERE id = $1`,
        [newVisualId]
      );
      return;
    }

    const visualBuffer = await readFile(parentVisual.file_path);
    const visualBase64 = visualBuffer.toString("base64");

    // Déduire le MIME type
    const ext = parentVisual.file_path.substring(parentVisual.file_path.lastIndexOf(".")).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    const mimeType = mimeMap[ext] || "image/png";

    // Appeler l'agent architecte
    const result = await iterateVisual(
      visualBase64,
      mimeType,
      instruction,
      parentVisual.style_id,
      room.room_type,
      room.surface_m2 ? Number(room.surface_m2) : null
    );

    if (!result) {
      await query(
        `UPDATE vs_visuals SET status = 'failed', error_message = 'La modification a échoué après plusieurs tentatives.'
         WHERE id = $1`,
        [newVisualId]
      );
      return;
    }

    // Sauvegarder l'image générée
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
      [outputPath, result.prompt_used, newVisualId]
    );

    console.log(`[iterate] Visuel ${newVisualId} : itération terminée.`);
  } catch (err) {
    console.error(`[iterate] Visuel ${newVisualId} : erreur fatale.`, err);
    await query(
      `UPDATE vs_visuals SET status = 'failed', error_message = $1
       WHERE id = $2`,
      [err instanceof Error ? err.message : "Erreur inconnue", newVisualId]
    ).catch(() => {});
  }
}
