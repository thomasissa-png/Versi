/**
 * API Route — /api/vs/projects/[id]/extract
 * POST : Lance l'extraction IA sur tous les plans du projet,
 *        puis clustering par unit_id pour pré-créer les lots.
 *
 * Stratégie versi-s21 :
 * - L'IA retourne `unit_id` par pièce (appartement identifié)
 * - Backend groupe par (floor, unit_id) → 1 lot = 1 appartement
 * - Si confiance < 0.7 → "no AI > bad AI", 0 lot pré-créé
 *
 * V1 sans auth — tout est public.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { VsPlan, VsProject, ApiResponse } from "@/lib/vs/types";
import { readFile } from "fs/promises";
import { extractPlanData } from "@/lib/vs/plan-extractor";
import type { PlanExtractionResult, ExtractedRoom } from "@/lib/vs/schemas";
import {
  clusterByUnit,
  computeEnvelopeBbox,
  generateLotName,
  countHabitableRooms,
  computeAvgX,
  CLUSTERING_CONFIDENCE_THRESHOLD,
} from "@/lib/vs/clustering";

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

    // Supprimer les anciens lots IA du projet (re-extraction propre)
    await query(
      "DELETE FROM vs_lots WHERE project_id = $1 AND source = 'ai'",
      [projectId]
    );

    // Collecter toutes les pièces extraites de tous les plans
    const allRooms: ExtractedRoom[] = [];

    // Extraire chaque plan
    for (const plan of plansResult.rows) {
      try {
        // Lire le fichier
        const fileBuffer = await readFile(plan.file_path);
        const base64 = fileBuffer.toString("base64");

        // Appeler le plan-extractor (retourne maintenant unit_id + bounding_polygon)
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

        // Collecter les pièces pour le clustering
        // Assigner le floor_number du plan si la pièce n'en a pas
        for (const room of extraction.rooms) {
          if (room.floor == null) {
            room.floor = plan.floor_number;
          }
          allRooms.push(room);
        }
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

    // ─── Clustering par unit_id (versi-s21) ───────────────────────
    //
    // Principe "no AI > bad AI" : si confiance clustering < 0.7,
    // ne rien pré-créer. Thomas démarre sur l'écran vide guidé.

    const unitGroups = clusterByUnit(allRooms, CLUSTERING_CONFIDENCE_THRESHOLD);

    let lotsCreated = 0;

    if (unitGroups.length > 0) {
      // Compter les groupes par étage pour le nommage (détection doublon)
      const groupsByFloor = new Map<number, typeof unitGroups>();
      for (const g of unitGroups) {
        const existing = groupsByFloor.get(g.floor);
        if (existing) {
          existing.push(g);
        } else {
          groupsByFloor.set(g.floor, [g]);
        }
      }

      for (const group of unitGroups) {
        const habitableCount = countHabitableRooms(group.rooms);
        const avgX = computeAvgX(group.rooms);

        const floorGroups = groupsByFloor.get(group.floor) || [];
        const indexOnFloor = floorGroups.indexOf(group);

        const lotName = generateLotName(
          habitableCount,
          group.floor,
          indexOnFloor,
          floorGroups.length,
          avgX
        );

        // Calculer la zone englobante
        const zoneData = computeEnvelopeBbox(group.rooms);

        // Calculer la surface totale estimée
        const surfaceM2 = group.rooms.reduce(
          (sum, r) => sum + (r.surface_m2 || 0),
          0
        );

        // Insérer le lot en base
        await query(
          `INSERT INTO vs_lots (project_id, name, floor_number, surface_m2, zone_data, source, status)
           VALUES ($1, $2, $3, $4, $5, 'ai', 'suggested')`,
          [
            projectId,
            lotName,
            group.floor,
            surfaceM2 > 0 ? surfaceM2 : null,
            JSON.stringify(zoneData),
          ]
        );

        lotsCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      data: { lots_created: lotsCreated },
    });
  } catch (err) {
    console.error("[API] POST /api/vs/projects/[id]/extract erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de lancer l'extraction." },
      { status: 500 }
    );
  }
}
