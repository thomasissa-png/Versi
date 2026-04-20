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
import {
  resolveRoomOverlaps,
  clipPolygonToBoundary,
  type RoomWithPolygon,
  type Point as ResolverPoint,
} from "@/lib/vs/polygon-resolver";
import {
  verifyAndCorrectPolygons,
  applyCorrections,
  type RoomForVerify,
} from "@/lib/vs/visual-verifier";
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

    // s23 — Conserver l'imageBuffer PNG par plan pour la passe-3 (verif visuelle)
    const planIdToImageBuffer = new Map<string, Buffer>();

    // s23 final — Conserver le building_outline par plan pour le hard clipping
    // EXTERIOR-EXCLUSION (empêche les pièces de déborder sur la terrasse).
    const planIdToBuildingPolygon = new Map<string, ResolverPoint[]>();

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

        // s23 final — Mémoriser le building_outline en polygone CCW (4 points
        // en % plan-global) pour le hard clipping après le resolver.
        if (extraction.building_outline) {
          const bo = extraction.building_outline;
          // Rectangle axis-aligned converti en 4 sommets CCW (order : TL, TR, BR, BL)
          const boundary: ResolverPoint[] = [
            { x_percent: bo.x_percent, y_percent: bo.y_percent },
            { x_percent: bo.x_percent + bo.width_percent, y_percent: bo.y_percent },
            { x_percent: bo.x_percent + bo.width_percent, y_percent: bo.y_percent + bo.height_percent },
            { x_percent: bo.x_percent, y_percent: bo.y_percent + bo.height_percent },
          ];
          planIdToBuildingPolygon.set(plan.id, boundary);
        }

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

            // s23 — memoriser pour passe-3 (verif visuelle apres resolver)
            planIdToImageBuffer.set(plan.id, imageBuffer);

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

        // ─── s23 Bug 1 — Post-process non-overlap pièces du lot ─────
        // Greedy pairwise clipping : résout les superpositions générées par
        // l'IA (prompt NO-OVERLAP pas toujours respecté sur plans denses).
        // Contrainte de contenance : chaque pièce reste dans la bbox du lot.
        // Toutes les coords sont en % plan-global ici (avant conversion lot-local).
        const lotContainmentPolygon = [
          { x_percent: zoneData.x_percent, y_percent: zoneData.y_percent },
          { x_percent: zoneData.x_percent + zoneData.width_percent, y_percent: zoneData.y_percent },
          { x_percent: zoneData.x_percent + zoneData.width_percent, y_percent: zoneData.y_percent + zoneData.height_percent },
          { x_percent: zoneData.x_percent, y_percent: zoneData.y_percent + zoneData.height_percent },
        ];
        const roomsForResolver: RoomWithPolygon[] = group.rooms.map((r, idx) => ({
          id: r.name_raw || `room_${idx}`,
          bounding_polygon: r.bounding_polygon ?? null,
          surface_m2: r.surface_m2,
        }));
        const resolverResult = resolveRoomOverlaps(roomsForResolver, lotContainmentPolygon);
        // Réappliquer les polygones résolus sur group.rooms par matching d'index/nom
        const resolvedById = new Map<string, RoomWithPolygon>();
        for (const resolved of resolverResult.resolved) {
          resolvedById.set(resolved.id, resolved);
        }
        for (let idx = 0; idx < group.rooms.length; idx++) {
          const r = group.rooms[idx];
          const rid = r.name_raw || `room_${idx}`;
          const resolved = resolvedById.get(rid);
          if (resolved && resolved.bounding_polygon) {
            r.bounding_polygon = resolved.bounding_polygon;
          } else if (resolverResult.dropped.some((d) => d.id === rid)) {
            // Pièce droppée : conserver polygone original + log warning (pas de suppression destructive)
            console.warn(
              `[non-overlap] ${rid}: polygone résiduel trop faible, conservation du polygone original`
            );
          }
        }
        if (resolverResult.warnings.length > 0) {
          console.log(
            `[non-overlap] ${lotName}: ${resolverResult.warnings.length} warnings`,
            resolverResult.warnings.map((w) => `${w.room_id}:${w.type}`).join(", ")
          );
        }

        // ─── s23 Passe-3 — Vérification visuelle par overlay ─────────
        // Envoie plan + polygones colorés à GPT-4.1 vision pour détecter
        // les pièces mal positionnées (drift > 1 m). Applique corrections
        // avec confidence >= 0.8. Objectif : corriger le bug de position
        // (pièces placées à ~3m de leur vraie localisation, bug Thomas s23).
        const VISUAL_VERIFY_ENABLED = process.env.VS_VISUAL_VERIFY !== "false";
        if (
          VISUAL_VERIFY_ENABLED &&
          group.rooms.length >= 2 &&
          planIdToImageBuffer.has(floorToPlanId.get(group.floor) ?? "")
        ) {
          const planIdForVerify = floorToPlanId.get(group.floor)!;
          const imageBufForVerify = planIdToImageBuffer.get(planIdForVerify)!;

          const roomsForVerify: RoomForVerify[] = group.rooms
            .map((r, idx) => {
              // Fallback : si pas de polygone (rare), derive de la bbox
              let polygon = r.bounding_polygon ?? null;
              if ((!polygon || polygon.length < 4) && r.bounding_box) {
                const bb = r.bounding_box;
                polygon = [
                  { x_percent: bb.x_percent, y_percent: bb.y_percent },
                  { x_percent: bb.x_percent + bb.width_percent, y_percent: bb.y_percent },
                  { x_percent: bb.x_percent + bb.width_percent, y_percent: bb.y_percent + bb.height_percent },
                  { x_percent: bb.x_percent, y_percent: bb.y_percent + bb.height_percent },
                ];
              }
              if (!polygon || polygon.length < 4) return null;
              return {
                id: r.temp_id || `room_${idx}`,
                name: r.name_raw,
                polygon,
                surface_m2: r.surface_m2,
              };
            })
            .filter((x): x is RoomForVerify => x !== null);

          if (roomsForVerify.length >= 2) {
            try {
              const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
              // s23 final : seuil 0.8 → 0.6. Mieux vaut une correction à
              // confidence modérée qu'un drift 3m non corrigé.
              const verifyResult = await verifyAndCorrectPolygons(
                imageBufForVerify,
                roomsForVerify,
                openaiClient,
                lotName,
                0.6,
              );
              if (verifyResult.applied > 0) {
                console.log(
                  `[passe-3] ${lotName}: ${verifyResult.applied}/${roomsForVerify.length} pièces corrigées (drift moyen: ${(
                    verifyResult.corrections.reduce((s, c) => s + c.drift_meters, 0) /
                    Math.max(verifyResult.corrections.length, 1)
                  ).toFixed(2)}m)`,
                );
                const corrected = applyCorrections(roomsForVerify, verifyResult.corrections);
                // Réappliquer les polygones corrigés sur group.rooms par id stable
                const correctedById = new Map<string, RoomForVerify>();
                for (const c of corrected) correctedById.set(c.id, c);
                for (let idx = 0; idx < group.rooms.length; idx++) {
                  const r = group.rooms[idx];
                  const rid = r.temp_id || `room_${idx}`;
                  const c = correctedById.get(rid);
                  if (!c) continue;
                  // Appliquer uniquement si on a une correction effective
                  const wasCorrected = verifyResult.corrections.some(
                    (cc) => cc.room_id === rid,
                  );
                  if (wasCorrected) {
                    r.bounding_polygon = c.polygon;
                  }
                }
              } else {
                console.log(`[passe-3] ${lotName}: aucune correction nécessaire (${verifyResult.globalAssessment.slice(0, 100)})`);
              }
            } catch (verifyErr) {
              console.error(
                `[passe-3] ${lotName}: erreur passe-3, on garde polygones passe-2`,
                verifyErr instanceof Error ? verifyErr.message : verifyErr,
              );
            }
          }
        }

        // ─── s23 FINAL — Hard clipping au building_outline (EXTERIOR-EXCLUSION)
        // Garde-fou absolu : aucune pièce ne peut déborder sur l'extérieur
        // (terrasse, balcon, jardin). Même si le prompt, le resolver et la
        // passe-3 ont échoué à contenir la pièce, le clipping force.
        //
        // Règles :
        // - polygone résiduel >= 4 points ET aire >= 50% de l'originale → remplacer
        // - sinon → warn + conserver l'original (clip trop destructif, signal
        //   que le building_outline détecté est peut-être trop étroit)
        {
          const planIdForClipping = floorToPlanId.get(group.floor);
          const buildingPolygon = planIdForClipping
            ? planIdToBuildingPolygon.get(planIdForClipping)
            : null;
          if (buildingPolygon && buildingPolygon.length >= 4) {
            let clippedCount = 0;
            let preservedCount = 0;
            for (const r of group.rooms) {
              if (!r.bounding_polygon || r.bounding_polygon.length < 4) continue;
              const { polygon: clipped, residualRatio } = clipPolygonToBoundary(
                r.bounding_polygon,
                buildingPolygon,
                0.5,
              );
              if (clipped && clipped.length >= 4) {
                r.bounding_polygon = clipped;
                clippedCount++;
              } else {
                console.warn(
                  `[hard-clip] ${lotName}/${r.name_raw}: clip destructif (résidu ${(residualRatio * 100).toFixed(0)}%), conservation de l'original`,
                );
                preservedCount++;
              }
            }
            console.log(
              `[hard-clip] ${lotName}: ${clippedCount} pièces clippées au building_outline, ${preservedCount} préservées (clip destructif).`,
            );
          } else {
            console.log(
              `[hard-clip] ${lotName}: pas de building_outline disponible, clipping skipped.`,
            );
          }
        }

        // ─── s23 Bug fondamental Étape 3 — Recalculer l'envelope du lot ─────
        // `zoneData` était calculé ligne 304 depuis les bounding_box IA approximatifs
        // (souvent plus larges que la vraie pièce). Les polygones ont ensuite été
        // raffinés (passe-2), clippés (resolver non-overlap), vérifiés visuellement
        // (passe-3) et hard-clippés au building_outline. Le zoneData initial ne
        // reflète plus la réalité → lot trop grand vers le bas, Séjour drag bloqué
        // au mauvais endroit à l'Étape 3. Fix : recalculer depuis les polygones finaux.
        let finalMinX = 100, finalMinY = 100, finalMaxX = 0, finalMaxY = 0;
        let hasAnyPolygon = false;
        for (const r of group.rooms) {
          const poly = r.bounding_polygon;
          if (poly && poly.length >= 3) {
            hasAnyPolygon = true;
            for (const p of poly) {
              if (p.x_percent < finalMinX) finalMinX = p.x_percent;
              if (p.y_percent < finalMinY) finalMinY = p.y_percent;
              if (p.x_percent > finalMaxX) finalMaxX = p.x_percent;
              if (p.y_percent > finalMaxY) finalMaxY = p.y_percent;
            }
          } else if (r.bounding_box) {
            const bb = r.bounding_box;
            if (bb.x_percent < finalMinX) finalMinX = bb.x_percent;
            if (bb.y_percent < finalMinY) finalMinY = bb.y_percent;
            if (bb.x_percent + bb.width_percent > finalMaxX) finalMaxX = bb.x_percent + bb.width_percent;
            if (bb.y_percent + bb.height_percent > finalMaxY) finalMaxY = bb.y_percent + bb.height_percent;
          }
        }
        if (hasAnyPolygon && finalMaxX > finalMinX && finalMaxY > finalMinY) {
          const oldZone = { ...zoneData };
          zoneData.x_percent = Math.max(0, finalMinX);
          zoneData.y_percent = Math.max(0, finalMinY);
          zoneData.width_percent = Math.min(100, finalMaxX) - zoneData.x_percent;
          zoneData.height_percent = Math.min(100, finalMaxY) - zoneData.y_percent;
          console.log(
            `[envelope-recompute] ${lotName}: zone recalculée depuis polygones finaux. ` +
            `Avant: y=${oldZone.y_percent.toFixed(1)} h=${oldZone.height_percent.toFixed(1)} ` +
            `Après: y=${zoneData.y_percent.toFixed(1)} h=${zoneData.height_percent.toFixed(1)}`
          );
        }

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
