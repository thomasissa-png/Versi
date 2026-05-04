/**
 * API Route — POST /api/vs/projects/[id]/preflight
 *
 * Détecte les ambiguïtés T1-T5 sur le projet AVANT de lancer la génération.
 * Tant qu'au moins une question reste status='asked', la génération est
 * bloquée (cf. /api/vs/rooms/[id]/generate qui appelle hasBlockingQuestions).
 *
 * Body : { style_id: string }
 * Response 200 : { questions: AmbiguityQuestion[] }   (peut être []
 *   → preflight passé, génération autorisée)
 *
 * Conformité s30 :
 *  - Wire-grep cmd 6 : route prod (vs ancien /api/vs/visuals/preflight inexistant)
 *  - Pas de blocage budget (préf fondateur s29) — on signale juste les questions.
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureDbReady, query } from "@/lib/vs/db";
import { detectAmbiguities, type AmbiguityQuestion } from "@/lib/vs/ambiguity-detector";
import { getStyle } from "@/lib/vs/styles";
import { readFile } from "node:fs/promises";
import type { ApiResponse } from "@/lib/vs/types";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

interface PreflightResponse {
  questions: AmbiguityQuestion[];
  ready_for_generation: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PreflightResponse>>> {
  try {
    await ensureDbReady();
    const { id: projectId } = await params;
    if (!isValidUUID(projectId)) {
      return NextResponse.json({ success: false, error: "Identifiant projet invalide." }, { status: 400 });
    }

    const body = (await request.json()) as { style_id?: string };
    const styleId = body.style_id?.trim();
    if (!styleId || !getStyle(styleId)) {
      return NextResponse.json({ success: false, error: "style_id invalide." }, { status: 400 });
    }

    // Vérifier projet existe
    const projCheck = await query<{ id: string }>("SELECT id FROM vs_projects WHERE id = $1", [projectId]);
    if (projCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Projet introuvable." }, { status: 404 });
    }

    // Loader photo bytes pour T4 (vision incoherent photos)
    const loadPhotoBytes = async (photo: { file_path: string }): Promise<Buffer | null> => {
      try {
        return await readFile(photo.file_path);
      } catch {
        return null;
      }
    };

    const questions = await detectAmbiguities(projectId, { styleId, loadPhotoBytes });

    return NextResponse.json({
      success: true,
      data: {
        questions,
        ready_for_generation: questions.length === 0,
      },
    });
  } catch (err) {
    console.error("[API] POST /api/vs/projects/[id]/preflight erreur:", err);
    return NextResponse.json(
      { success: false, error: "Préflight échoué — réessayez." },
      { status: 500 }
    );
  }
}
