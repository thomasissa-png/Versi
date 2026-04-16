/**
 * API Route — /api/vs/projects/[id]/extract
 * POST : Lance l'extraction IA sur tous les plans du projet.
 *
 * Lit chaque plan depuis le filesystem, appelle le plan-extractor,
 * puis crée les lots suggérés en base (vs_lots).
 *
 * V1 sans auth — tout est public.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { VsPlan, VsProject, ApiResponse } from "@/lib/vs/types";
import { readFile } from "fs/promises";
import { extractPlanData } from "@/lib/vs/plan-extractor";
import type { PlanExtractionResult } from "@/lib/vs/schemas";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

// ─── POST /api/vs/projects/[id]/extract ───────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ lots_created: number }>>> {
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
    const projectResult = await query<VsProject>(
      "SELECT * FROM vs_projects WHERE id = $1",
      [projectId]
    );
    if (projectResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Opération introuvable." },
        { status: 404 }
      );
    }
    const project = projectResult.rows[0];

    // Récupérer les plans
    const plansResult = await query<VsPlan>(
      "SELECT * FROM vs_plans WHERE project_id = $1 ORDER BY floor_number ASC",
      [projectId]
    );
    if (plansResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucun plan déposé pour cette opération." },
        { status: 400 }
      );
    }

    // Marquer tous les plans en "processing"
    await query(
      "UPDATE vs_plans SET extraction_status = 'processing' WHERE project_id = $1",
      [projectId]
    );

    // Stratégie versi-s20 : NE PAS pré-créer de lots génériques.
    // Un rectangle englobant aléatoire des pièces produit un découpage faux qui pollue
    // l'écran et oblige Thomas (marchand) à supprimer avant de redessiner. L'état vide
    // guidé est meilleur — l'utilisateur arrive sur l'Étape 2 avec 0 lot et utilise
    // « Dessiner un polygone » ou « + Ajouter un lot » pour partir d'une page blanche.
    //
    // La stratégie clustering `unit_id` (IA) est documentée pour s21 (audit @ia P0 #1) :
    // l'IA produira directement des suggestions de lots fiables (un lot = un appartement
    // identifié), avec polygones IA (P0 #2) et gate cohérence surface (P0 #3).
    //
    // Les `extraction_data` (avec rooms et bounding_box) restent extraites et utilisées
    // en Étape 3 (Pièces).

    // Extraire chaque plan
    for (const plan of plansResult.rows) {
      try {
        // Lire le fichier
        const fileBuffer = await readFile(plan.file_path);
        const base64 = fileBuffer.toString("base64");

        // Appeler le plan-extractor
        const extraction: PlanExtractionResult = await extractPlanData(
          base64,
          plan.mime_type,
          project.type_bien
        );

        // Sauvegarder le résultat d'extraction (utilisé en Étape 3 — Pièces)
        await query(
          "UPDATE vs_plans SET extraction_data = $1, extraction_status = 'done' WHERE id = $2",
          [JSON.stringify(extraction), plan.id]
        );
      } catch (planErr) {
        console.error(
          `[API] Extraction plan ${plan.id} échouée :`,
          planErr
        );
        // Marquer ce plan en échec mais continuer les autres
        await query(
          "UPDATE vs_plans SET extraction_status = 'failed' WHERE id = $1",
          [plan.id]
        );
      }
    }

    // 0 lot pré-créé : l'utilisateur démarre sur l'écran vide guidé.
    return NextResponse.json({
      success: true,
      data: { lots_created: 0 },
    });
  } catch (err) {
    console.error("[API] POST /api/vs/projects/[id]/extract erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de lancer l'extraction." },
      { status: 500 }
    );
  }
}
