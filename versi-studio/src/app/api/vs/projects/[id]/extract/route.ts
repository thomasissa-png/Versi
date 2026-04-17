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
import { extractPlanData, inferRoomTypeFromName } from "@/lib/vs/plan-extractor";
import { refineRoomPolygon } from "@/lib/vs/polygon-refiner";
import type { PlanExtractionResult, ExtractedRoom } from "@/lib/vs/schemas";
import OpenAI from "openai";
import sharp from "sharp";
import {
  clusterByUnit,
  computeEnvelopeBbox,
  generateLotName,
  countHabitableRooms,
  computeAvgX,
  CLUSTERING_CONFIDENCE_THRESHOLD,
} from "@/lib/vs/clustering";
import { track } from "@/lib/vs/analytics";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

// ─── POST /api/vs/projects/[id]/extract ───────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{
  lots_created: number;
  extraction_reason: "success" | "no_units_detected" | "low_confidence";
  warnings: Array<{ type: string; message: string }>;
}>>> {
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

        // ─── Passe 2 — Raffinement polygones par crop (s22 v4) ─────
        // Pour chaque piece avec bbox, crop l'image et appel GPT-4.1
        // dedie pour tracer le polygone precis sur le zoom.
        const REFINE_POLYGONS = process.env.VS_REFINE_POLYGONS !== "false";
        if (REFINE_POLYGONS) {
          try {
            // Obtenir le buffer PNG de l'image (reconvertir PDF si besoin)
            let imageBuffer: Buffer;
            if (plan.mime_type === "application/pdf" || base64.startsWith("JVBERi0")) {
              const { pdf } = await import("pdf-to-img");
              const pdfBuffer = Buffer.from(base64, "base64");
              const pages = await pdf(pdfBuffer, { scale: 3 });
              let pngBuffer: Buffer | null = null;
              for await (const page of pages) {
                pngBuffer = Buffer.from(page);
                break;
              }
              imageBuffer = pngBuffer!;
            } else {
              imageBuffer = Buffer.from(base64, "base64");
            }

            const metadata = await sharp(imageBuffer).metadata();
            const imgW = metadata.width || 1;
            const imgH = metadata.height || 1;

            const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            console.log(`[passe-2] Raffinement de ${extraction.rooms.length} pieces pour plan ${plan.id}...`);

            for (const room of extraction.rooms) {
              if (!room.bounding_box) continue;
              try {
                const refined = await refineRoomPolygon(
                  imageBuffer,
                  imgW,
                  imgH,
                  room.name_raw,
                  room.bounding_box,
                  openaiClient,
                );
                if (refined && refined.length >= 4) {
                  room.bounding_polygon = refined;
                  console.log(`[passe-2] ${room.name_raw}: raffiné → ${refined.length} pts`);
                } else {
                  console.log(`[passe-2] ${room.name_raw}: conserve polygone passe 1`);
                }
              } catch (refineErr) {
                console.error(`[passe-2] Echec pour ${room.name_raw}:`, refineErr instanceof Error ? refineErr.message : refineErr);
                // Conserver le polygone grossier de la passe 1
              }
            }
          } catch (pass2Err) {
            console.error(`[passe-2] Erreur globale passe 2 pour plan ${plan.id}:`, pass2Err instanceof Error ? pass2Err.message : pass2Err);
            // Continuer avec les polygones passe 1
          }
        }

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

    // ─── Map floor → plan_id (pour associer rooms → plan) ─────────
    const floorToPlanId = new Map<number, string>();
    for (const plan of plansResult.rows) {
      floorToPlanId.set(plan.floor_number, plan.id);
    }

    // ─── Clustering par unit_id (versi-s21) ───────────────────────
    //
    // Principe "no AI > bad AI" : si confiance clustering < 0.7,
    // ne rien pré-créer. Thomas démarre sur l'écran vide guidé.
    //
    // U2 : filtre ≥ 2 pièces + confidenceMin ≥ 0.5 (sauf studios I10)
    // I1 : nested map — plus de split "::" fragile
    // I5 : warning si > 50% des groupes rejetés
    // I6 : extraction_reason dans la réponse

    const { accepted: unitGroups, candidateCount } = clusterByUnit(
      allRooms,
      CLUSTERING_CONFIDENCE_THRESHOLD
    );

    // I5 — Warning si taux de rejet élevé
    const warnings: Array<{ type: string; message: string }> = [];
    if (candidateCount > 0) {
      const rejectionRate = 1 - unitGroups.length / candidateCount;
      if (rejectionRate > 0.5) {
        warnings.push({
          type: "unit_clustering_low_confidence",
          message: `${Math.round(rejectionRate * 100)}% des groupes IA ont été rejetés (confiance insuffisante).`,
        });
      }
    }

    const lotsCreated: Array<{ name: string; confidenceAvg: number }> = [];

    if (unitGroups.length > 0) {
      // Compter les groupes par étage pour le nommage (détection doublon)
      // I2 : trier par avgX pour affecter positionIndex stable
      const groupsByFloor = new Map<number, typeof unitGroups>();
      for (const g of unitGroups) {
        const existing = groupsByFloor.get(g.floor);
        if (existing) {
          existing.push(g);
        } else {
          groupsByFloor.set(g.floor, [g]);
        }
      }

      // I2 — Trier chaque liste par avgX pour positionIndex cohérent
      for (const [, floorList] of groupsByFloor) {
        floorList.sort((a, b) => computeAvgX(a.rooms) - computeAvgX(b.rooms));
      }

      for (const group of unitGroups) {
        const habitableCount = countHabitableRooms(group.rooms);
        const avgX = computeAvgX(group.rooms);

        const floorGroups = groupsByFloor.get(group.floor) || [];
        // I2 — positionIndex = rang dans la liste triée par avgX
        const positionIndex = floorGroups.indexOf(group);

        const lotName = generateLotName(
          habitableCount,
          group.floor,
          positionIndex,
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

        // U1 — Persister confidence_avg dans vs_lots
        const lotInsertResult = await query<{ id: string }>(
          `INSERT INTO vs_lots (project_id, name, floor_number, surface_m2, zone_data, source, status, confidence_avg)
           VALUES ($1, $2, $3, $4, $5, 'ai', 'suggested', $6)
           RETURNING id`,
          [
            projectId,
            lotName,
            group.floor,
            surfaceM2 > 0 ? surfaceM2 : null,
            JSON.stringify(zoneData),
            group.confidenceAvg,
          ]
        );

        const lotId = lotInsertResult.rows[0].id;

        // ─── S22 — Pré-créer les rooms IA dans vs_rooms ─────────
        // Convertir les bounding_box plan-global (%) → position lot-local (%)
        const planIdForFloor = floorToPlanId.get(group.floor) ?? null;

        for (const room of group.rooms) {
          const bb = room.bounding_box;
          // Position lot-local : re-normaliser la bbox de la room
          // relativement à la bbox englobante du lot (zoneData)
          let position: Record<string, number> | null = null;
          if (bb && zoneData.width_percent > 0 && zoneData.height_percent > 0) {
            position = {
              x_percent: ((bb.x_percent - zoneData.x_percent) / zoneData.width_percent) * 100,
              y_percent: ((bb.y_percent - zoneData.y_percent) / zoneData.height_percent) * 100,
              width_percent: (bb.width_percent / zoneData.width_percent) * 100,
              height_percent: (bb.height_percent / zoneData.height_percent) * 100,
            };
            // Clamper dans [0, 100]
            position.x_percent = Math.max(0, Math.min(100, position.x_percent));
            position.y_percent = Math.max(0, Math.min(100, position.y_percent));
            position.width_percent = Math.max(1, Math.min(100 - position.x_percent, position.width_percent));
            position.height_percent = Math.max(1, Math.min(100 - position.y_percent, position.height_percent));
          }

          const roomType = inferRoomTypeFromName(room.name_raw);

          // Convertir bounding_polygon plan-global → lot-local (même re-normalisation que position)
          let polygonLocal: Array<{ x_percent: number; y_percent: number }> | null = null;
          if (room.bounding_polygon && room.bounding_polygon.length >= 4 && zoneData.width_percent > 0 && zoneData.height_percent > 0) {
            polygonLocal = room.bounding_polygon.map((pt) => ({
              x_percent: Math.max(0, Math.min(100, ((pt.x_percent - zoneData.x_percent) / zoneData.width_percent) * 100)),
              y_percent: Math.max(0, Math.min(100, ((pt.y_percent - zoneData.y_percent) / zoneData.height_percent) * 100)),
            }));
          }

          await query(
            `INSERT INTO vs_rooms (lot_id, plan_id, name, room_type, surface_m2, position, polygon, source, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'ai', 'suggested')`,
            [
              lotId,
              planIdForFloor,
              room.name_raw,
              roomType,
              room.surface_m2,
              position ? JSON.stringify(position) : null,
              polygonLocal ? JSON.stringify(polygonLocal) : null,
            ]
          );
        }

        lotsCreated.push({ name: lotName, confidenceAvg: group.confidenceAvg });

        // Analytics — lot pré-créé par IA (versi-s21)
        track({
          event: "lot_auto_created",
          project_id: projectId,
          lot_name: lotName,
          floor_number: group.floor,
          confidence_avg: group.confidenceAvg,
          surface_m2: surfaceM2 > 0 ? surfaceM2 : null,
          room_count: group.rooms.length,
          habitable_room_count: habitableCount,
          source: "ai",
        });
      }
    }

    // I6 — Réponse enrichie : extraction_reason + warnings
    const extractionReason =
      lotsCreated.length > 0
        ? "success"
        : candidateCount === 0
          ? "no_units_detected"
          : "low_confidence";

    // Analytics — fallback IA (0 lot créé malgré des candidats ou 0 unit_id)
    if (lotsCreated.length === 0) {
      track({
        event: "ia_fallback_triggered",
        project_id: projectId,
        reason: candidateCount === 0 ? "no_units_detected" : "low_confidence",
        candidate_count: candidateCount,
        plan_count: plansResult.rows.length,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        lots_created: lotsCreated.length,
        extraction_reason: extractionReason,
        warnings,
      },
    });
  } catch (err) {
    console.error("[API] POST /api/vs/projects/[id]/extract erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de lancer l'extraction." },
      { status: 500 }
    );
  }
}
