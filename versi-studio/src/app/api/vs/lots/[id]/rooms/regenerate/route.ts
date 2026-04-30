/**
 * API Route — /api/vs/lots/[id]/rooms/regenerate
 * POST : Régénère les pièces IA d'un lot unique depuis extraction_data des plans.
 *
 * Cas d'usage s25 BUG 1 : un lot (manuel OU IA pré-c5ea140 sans rooms) affiche
 * "L'IA n'a pas détecté de pièces". Thomas clique "Régénérer les pièces IA" pour
 * peupler le lot sans relancer tout le pipeline extract (coûteux, 5min).
 *
 * Stratégie :
 * 1. Charger le lot + projet + plans
 * 2. Lire extraction_data sauvegardé sur les plans de l'étage du lot
 * 3. Filtrer les rooms IA dont le centroïde/bbox tombe dans zone_data du lot
 *    (critère : ≥60% de la surface du bounding_box IA recouvre la zone_data)
 * 4. Supprimer les rooms IA existantes du lot (DELETE source='ai')
 * 5. Insérer les nouvelles rooms en vs_rooms
 *
 * V1 sans auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { VsLot, VsPlan, ApiResponse } from "@/lib/vs/types";
import { inferRoomTypeFromName } from "@/lib/vs/plan-extractor";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

interface BBox {
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

interface ExtractedRoomLike {
  temp_id?: string;
  name_raw: string;
  surface_m2?: number | null;
  floor?: number;
  bounding_box?: BBox | null;
  bounding_polygon?: Array<{ x_percent: number; y_percent: number }> | null;
}

type ZoneDataAny =
  | BBox
  | { type: "polygon"; points: Array<{ x_percent: number; y_percent: number }> };

function getZoneBBox(zone: ZoneDataAny | null): BBox | null {
  if (!zone) return null;
  if ("type" in zone && zone.type === "polygon" && zone.points?.length > 0) {
    let minX = 100, minY = 100, maxX = 0, maxY = 0;
    for (const p of zone.points) {
      if (p.x_percent < minX) minX = p.x_percent;
      if (p.y_percent < minY) minY = p.y_percent;
      if (p.x_percent > maxX) maxX = p.x_percent;
      if (p.y_percent > maxY) maxY = p.y_percent;
    }
    return {
      x_percent: minX,
      y_percent: minY,
      width_percent: maxX - minX,
      height_percent: maxY - minY,
    };
  }
  if ("x_percent" in zone) return zone as BBox;
  return null;
}

function bboxOverlapRatio(inner: BBox, outer: BBox): number {
  const ix1 = Math.max(inner.x_percent, outer.x_percent);
  const iy1 = Math.max(inner.y_percent, outer.y_percent);
  const ix2 = Math.min(
    inner.x_percent + inner.width_percent,
    outer.x_percent + outer.width_percent
  );
  const iy2 = Math.min(
    inner.y_percent + inner.height_percent,
    outer.y_percent + outer.height_percent
  );
  if (ix2 <= ix1 || iy2 <= iy1) return 0;
  const inter = (ix2 - ix1) * (iy2 - iy1);
  const innerArea = inner.width_percent * inner.height_percent;
  return innerArea > 0 ? inter / innerArea : 0;
}

function polygonBBox(
  poly: Array<{ x_percent: number; y_percent: number }>
): BBox | null {
  if (!poly || poly.length < 3) return null;
  let minX = 100, minY = 100, maxX = 0, maxY = 0;
  for (const p of poly) {
    if (p.x_percent < minX) minX = p.x_percent;
    if (p.y_percent < minY) minY = p.y_percent;
    if (p.x_percent > maxX) maxX = p.x_percent;
    if (p.y_percent > maxY) maxY = p.y_percent;
  }
  return {
    x_percent: minX,
    y_percent: minY,
    width_percent: maxX - minX,
    height_percent: maxY - minY,
  };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ rooms_created: number; reason?: string }>>> {
  try {
    await ensureDbReady();
    const { id: lotId } = await params;

    if (!isValidUUID(lotId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de lot invalide." },
        { status: 400 }
      );
    }

    // Charger le lot
    const lotResult = await query<VsLot>(
      "SELECT * FROM vs_lots WHERE id = $1",
      [lotId]
    );
    if (lotResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Lot introuvable." },
        { status: 404 }
      );
    }
    const lot = lotResult.rows[0];

    // Charger les plans de l'étage du lot
    const plansResult = await query<VsPlan>(
      "SELECT * FROM vs_plans WHERE project_id = $1 AND floor_number = $2",
      [lot.project_id, lot.floor_number ?? 0]
    );

    if (plansResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Aucun plan disponible pour cet étage. Relancez l'analyse IA complète depuis l'étape 1.",
        },
        { status: 400 }
      );
    }

    // Agréger les rooms de extraction_data des plans (ne pas relancer l'IA)
    const allRooms: ExtractedRoomLike[] = [];
    let planIdForRooms: string | null = null;
    for (const plan of plansResult.rows) {
      if (!plan.extraction_data) continue;
      const data = plan.extraction_data as { rooms?: ExtractedRoomLike[] };
      if (!data.rooms || !Array.isArray(data.rooms)) continue;
      if (!planIdForRooms) planIdForRooms = plan.id;
      for (const r of data.rooms) {
        allRooms.push(r);
      }
    }

    if (allRooms.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Aucune pièce IA mémorisée sur les plans. Relancez l'analyse IA complète depuis l'étape 1.",
        },
        { status: 400 }
      );
    }

    // Bbox du lot (support polygon ou rect)
    const zoneData = (lot.zone_data as unknown) as ZoneDataAny | null;
    const zoneBBox = getZoneBBox(zoneData);
    if (!zoneBBox || zoneBBox.width_percent <= 0 || zoneBBox.height_percent <= 0) {
      return NextResponse.json(
        { success: false, error: "Zone du lot invalide." },
        { status: 400 }
      );
    }

    // Filtrer rooms dont ≥50% du bbox IA tombe dans zone_data du lot
    const matchedRooms: ExtractedRoomLike[] = [];
    for (const r of allRooms) {
      let roomBB: BBox | null = null;
      if (r.bounding_polygon && r.bounding_polygon.length >= 3) {
        roomBB = polygonBBox(r.bounding_polygon);
      }
      if (!roomBB && r.bounding_box) {
        roomBB = r.bounding_box;
      }
      if (!roomBB) continue;
      const overlap = bboxOverlapRatio(roomBB, zoneBBox);
      if (overlap >= 0.5) {
        matchedRooms.push(r);
      }
    }

    // s28 fix Bug 2 — Si aucune pièce ne match par overlap MAIS qu'il n'y a
    // qu'UN seul lot pour cet étage dans le projet, prendre TOUTES les pièces
    // du/des plan(s) (mapping 1:1 plan→lot du pipeline NEW v6 vectoriel s27).
    // Sans ce fallback : régénération impossible quand l'IA produit des coords
    // plan-global incohérentes avec le polygone vectoriel pixel-perfect.
    if (matchedRooms.length === 0) {
      const otherLotsResult = await query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM vs_lots WHERE project_id = $1 AND floor_number = $2",
        [lot.project_id, lot.floor_number ?? 0]
      );
      const lotsOnFloor = parseInt(otherLotsResult.rows[0]?.count ?? "0", 10);
      if (lotsOnFloor === 1) {
        console.log(
          `[regenerate] lot ${lotId}: 1 seul lot sur cet étage (pipeline NEW v6 ?), ` +
            `fallback : prendre toutes les ${allRooms.length} pièces du/des plan(s)`
        );
        for (const r of allRooms) {
          matchedRooms.push(r);
        }
      }
    }

    if (matchedRooms.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Aucune pièce IA ne correspond à la zone dessinée pour ce lot. Ajustez la zone du lot ou ajoutez les pièces manuellement.",
        },
        { status: 400 }
      );
    }

    // Supprimer les anciennes rooms IA du lot (préserver les manuelles)
    await query(
      "DELETE FROM vs_rooms WHERE lot_id = $1 AND source = 'ai'",
      [lotId]
    );

    // Insérer les nouvelles rooms. Coordonnées = lot-local (0-100%) dans bbox du lot.
    let inserted = 0;
    for (const room of matchedRooms) {
      const roomType = inferRoomTypeFromName(room.name_raw);

      let polygonLocal: Array<{ x_percent: number; y_percent: number }> | null =
        null;
      if (
        room.bounding_polygon &&
        room.bounding_polygon.length >= 3 &&
        zoneBBox.width_percent > 0 &&
        zoneBBox.height_percent > 0
      ) {
        polygonLocal = room.bounding_polygon.map((pt) => ({
          x_percent: Math.max(
            0,
            Math.min(
              100,
              ((pt.x_percent - zoneBBox.x_percent) / zoneBBox.width_percent) * 100
            )
          ),
          y_percent: Math.max(
            0,
            Math.min(
              100,
              ((pt.y_percent - zoneBBox.y_percent) / zoneBBox.height_percent) * 100
            )
          ),
        }));
      }

      // Position = bbox du polygonLocal sinon re-normalisation du bbox IA
      let position: Record<string, number> | null = null;
      if (polygonLocal && polygonLocal.length >= 3) {
        const pbb = polygonBBox(polygonLocal);
        if (pbb) {
          position = {
            x_percent: Math.max(0, Math.min(100, pbb.x_percent)),
            y_percent: Math.max(0, Math.min(100, pbb.y_percent)),
            width_percent: Math.max(1, Math.min(100, pbb.width_percent)),
            height_percent: Math.max(1, Math.min(100, pbb.height_percent)),
          };
        }
      }
      if (!position && room.bounding_box) {
        const bb = room.bounding_box;
        const x = ((bb.x_percent - zoneBBox.x_percent) / zoneBBox.width_percent) * 100;
        const y = ((bb.y_percent - zoneBBox.y_percent) / zoneBBox.height_percent) * 100;
        const w = (bb.width_percent / zoneBBox.width_percent) * 100;
        const h = (bb.height_percent / zoneBBox.height_percent) * 100;
        position = {
          x_percent: Math.max(0, Math.min(100, x)),
          y_percent: Math.max(0, Math.min(100, y)),
          width_percent: Math.max(1, Math.min(100 - Math.max(0, x), w)),
          height_percent: Math.max(1, Math.min(100 - Math.max(0, y), h)),
        };
      }

      await query(
        `INSERT INTO vs_rooms (lot_id, plan_id, name, room_type, surface_m2, position, polygon, source, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ai', 'suggested')`,
        [
          lotId,
          planIdForRooms,
          room.name_raw,
          roomType,
          room.surface_m2 ?? null,
          position ? JSON.stringify(position) : null,
          polygonLocal ? JSON.stringify(polygonLocal) : null,
        ]
      );
      inserted++;
    }

    return NextResponse.json({
      success: true,
      data: {
        rooms_created: inserted,
      },
    });
  } catch (err) {
    console.error("[API] POST /api/vs/lots/[id]/rooms/regenerate erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de régénérer les pièces." },
      { status: 500 }
    );
  }
}
