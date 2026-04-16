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
import { query, ensureDbReady, withTransaction } from "@/lib/vs/db";
import type { VsPlan, VsProject, VsLot, ApiResponse, ZoneRect } from "@/lib/vs/types";
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

    let totalLotsCreated = 0;

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

        // Sauvegarder le résultat d'extraction
        await query(
          "UPDATE vs_plans SET extraction_data = $1, extraction_status = 'done' WHERE id = $2",
          [JSON.stringify(extraction), plan.id]
        );

        // Créer les lots suggérés à partir des pièces extraites
        // Stratégie V1 : un lot = une zone englobante des pièces par étage
        const roomsByFloor = new Map<number, typeof extraction.rooms>();
        for (const room of extraction.rooms) {
          const floor = room.floor ?? plan.floor_number;
          if (!roomsByFloor.has(floor)) {
            roomsByFloor.set(floor, []);
          }
          roomsByFloor.get(floor)!.push(room);
        }

        await withTransaction(async (client) => {
          let lotIndex = 0;
          for (const [floor, rooms] of roomsByFloor) {
            // Calculer la bounding box englobante
            let minX = 100, minY = 100, maxX = 0, maxY = 0;
            let totalSurface = 0;
            let hasBox = false;

            for (const room of rooms) {
              if (room.bounding_box) {
                hasBox = true;
                minX = Math.min(minX, room.bounding_box.x_percent);
                minY = Math.min(minY, room.bounding_box.y_percent);
                maxX = Math.max(
                  maxX,
                  room.bounding_box.x_percent + room.bounding_box.width_percent
                );
                maxY = Math.max(
                  maxY,
                  room.bounding_box.y_percent + room.bounding_box.height_percent
                );
              }
              if (room.surface_m2) {
                totalSurface += room.surface_m2;
              }
            }

            // Fallback si pas de bounding box
            const zoneData: ZoneRect = hasBox
              ? {
                  x_percent: Math.max(0, minX - 1),
                  y_percent: Math.max(0, minY - 1),
                  width_percent: Math.min(100, maxX - minX + 2),
                  height_percent: Math.min(100, maxY - minY + 2),
                }
              : {
                  x_percent: 10 + lotIndex * 5,
                  y_percent: 10 + lotIndex * 5,
                  width_percent: 30,
                  height_percent: 30,
                };

            const floorLabel = floor === 0 ? "RDC" : `R+${floor}`;
            const lotName = `Lot ${totalLotsCreated + lotIndex + 1} — ${floorLabel}`;

            await client.query(
              `INSERT INTO vs_lots (project_id, name, floor_number, surface_m2, zone_data, status, source)
               VALUES ($1, $2, $3, $4, $5, 'suggested', 'ai')`,
              [
                projectId,
                lotName,
                floor,
                totalSurface > 0 ? totalSurface : null,
                JSON.stringify(zoneData),
              ]
            );
            lotIndex++;
          }
          totalLotsCreated += lotIndex;
        });
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

    return NextResponse.json({
      success: true,
      data: { lots_created: totalLotsCreated },
    });
  } catch (err) {
    console.error("[API] POST /api/vs/projects/[id]/extract erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de lancer l'extraction." },
      { status: 500 }
    );
  }
}
