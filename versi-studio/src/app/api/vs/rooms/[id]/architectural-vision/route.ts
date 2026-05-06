/**
 * s32 — POST /api/vs/rooms/[id]/architectural-vision
 *
 * Lance l'analyse Vision (gpt-4o-mini) sur la première photo placée d'une pièce
 * pour pré-remplir les 4 détails architecturaux (sol, murs, luminosité, particularités).
 *
 * Body : aucun (le serveur choisit la photo source).
 * Response : { success, data: ArchitecturalDetails } — chaque champ a source='vision'
 *            avec confidence ∈ [0,1], ou source=null si indéterminé/échec.
 *
 * Le client filtre côté UI (ex: ne pré-remplir que si confidence ≥ 0.7).
 *
 * Saisie marchand toujours prioritaire : ce endpoint NE doit JAMAIS écraser
 * un champ ayant source='user' en DB. La logique de merge est côté client (le
 * client envoie un PATCH /rooms/:id avec architectural_details composé des
 * champs Vision retenus + champs user existants).
 *
 * V1 sans auth — tout est public.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { ApiResponse, ArchitecturalDetails } from "@/lib/vs/types";
import { emptyArchitecturalDetails } from "@/lib/vs/types";
import { analyzePhotoForArchitecturalDetails } from "@/lib/vs/architectural-vision";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

interface PhotoRow {
  id: string;
  file_path: string;
}

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ArchitecturalDetails>>> {
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
    const roomCheck = await query("SELECT id FROM vs_rooms WHERE id = $1", [
      roomId,
    ]);
    if (roomCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pièce introuvable." },
        { status: 404 }
      );
    }

    // Charger la 1re photo placée (ou la 1re photo tout court si aucune placée).
    // Vision n'a pas besoin de la position, juste d'une image représentative.
    const photoResult = await query<PhotoRow>(
      `SELECT id, file_path
         FROM vs_photos
        WHERE room_id = $1
        ORDER BY is_placed_on_plan DESC, taken_at ASC NULLS LAST, id ASC
        LIMIT 1`,
      [roomId]
    );

    if (photoResult.rows.length === 0) {
      // Pas de photo : on retourne un détail vide (le client n'affichera rien
      // de pré-rempli, mais l'opération réussit).
      return NextResponse.json({
        success: true,
        data: emptyArchitecturalDetails(),
      });
    }

    const photo = photoResult.rows[0];

    // Lire le fichier local + encoder data URL pour OpenAI Vision.
    const ext = photo.file_path
      .toLowerCase()
      .slice(photo.file_path.lastIndexOf("."));
    const mime = MIME_BY_EXT[ext] ?? "image/jpeg";

    let dataUrl: string;
    try {
      const buffer = await readFile(photo.file_path);
      dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
    } catch (err) {
      console.error(
        "[architectural-vision] photo introuvable sur disque :",
        photo.file_path,
        err
      );
      return NextResponse.json({
        success: true,
        data: emptyArchitecturalDetails(),
      });
    }

    const details = await analyzePhotoForArchitecturalDetails({
      photoUrl: dataUrl,
    });

    return NextResponse.json({ success: true, data: details });
  } catch (err) {
    console.error("[API] POST /api/vs/rooms/[id]/architectural-vision :", err);
    return NextResponse.json(
      {
        success: false,
        error: "L'analyse Vision a échoué. Saisissez les détails manuellement.",
      },
      { status: 500 }
    );
  }
}
