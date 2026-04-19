/**
 * API Route — /api/vs/projects/[id]/rooms/resolve-overlaps
 * POST : Re-applique resolveRoomOverlaps sur les pièces EXISTANTES en DB
 *
 * Contexte s23 régression — les fixes resolver f7a2699/c57aba3 ne s'appliquent
 * qu'au POST /extract. Les projets créés avant ces commits conservent leurs
 * polygones superposés en DB (et côté rendu Étape 3). Cet endpoint permet de
 * migrer les données existantes SANS relancer une extraction IA complète.
 *
 * Principe :
 * 1. Liste tous les lots du projet + leurs pièces.
 * 2. Pour chaque lot :
 *    a. Reconstruit lotPolygon plan-global (rect → 4 points, ou polygon direct).
 *    b. Reconvertit chaque room.polygon lot-local % → plan-global %.
 *    c. Appelle resolveRoomOverlaps.
 *    d. Reconvertit les polygones résolus plan-global → lot-local.
 *    e. UPDATE vs_rooms.polygon.
 * 3. Retourne { lots_resolved, rooms_updated, warnings }.
 *
 * Idempotent — peut être rejoué sans effet secondaire (resolver déterministe).
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { VsLot, VsRoom, ApiResponse } from "@/lib/vs/types";
import { resolveRoomOverlaps, type RoomWithPolygon, type Point } from "@/lib/vs/polygon-resolver";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

interface ZoneRectRaw {
  type?: "rect";
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

interface ZonePolygonRaw {
  type: "polygon";
  points: Array<{ x_percent: number; y_percent: number }>;
}

/** Construit le polygone plan-global du lot à partir de zone_data. */
function lotContainmentPolygon(zoneData: Record<string, unknown>): Point[] | null {
  if (!zoneData) return null;
  // Cas polygon
  if (zoneData.type === "polygon" && Array.isArray(zoneData.points)) {
    const pts = (zoneData as unknown as ZonePolygonRaw).points.map((p) => ({
      x_percent: Number(p.x_percent),
      y_percent: Number(p.y_percent),
    }));
    if (pts.length >= 3) return pts;
    return null;
  }
  // Cas rect (avec ou sans type)
  const rect = zoneData as unknown as ZoneRectRaw;
  if (
    typeof rect.x_percent !== "number" ||
    typeof rect.y_percent !== "number" ||
    typeof rect.width_percent !== "number" ||
    typeof rect.height_percent !== "number"
  ) {
    return null;
  }
  return [
    { x_percent: rect.x_percent, y_percent: rect.y_percent },
    { x_percent: rect.x_percent + rect.width_percent, y_percent: rect.y_percent },
    { x_percent: rect.x_percent + rect.width_percent, y_percent: rect.y_percent + rect.height_percent },
    { x_percent: rect.x_percent, y_percent: rect.y_percent + rect.height_percent },
  ];
}

/** Retourne la bbox englobante d'un polygone. */
function polygonBbox(pts: Point[]): { x: number; y: number; w: number; h: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x_percent < minX) minX = p.x_percent;
    if (p.y_percent < minY) minY = p.y_percent;
    if (p.x_percent > maxX) maxX = p.x_percent;
    if (p.y_percent > maxY) maxY = p.y_percent;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ─── POST /api/vs/projects/[id]/rooms/resolve-overlaps ────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<
  NextResponse<
    ApiResponse<{
      lots_resolved: number;
      rooms_updated: number;
      rooms_skipped: number;
      warnings: number;
    }>
  >
> {
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
    const projectCheck = await query(
      "SELECT id FROM vs_projects WHERE id = $1",
      [projectId]
    );
    if (projectCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Opération introuvable." },
        { status: 404 }
      );
    }

    // Récupérer tous les lots du projet
    const lotsResult = await query<VsLot>(
      "SELECT * FROM vs_lots WHERE project_id = $1",
      [projectId]
    );

    let lotsResolved = 0;
    let roomsUpdated = 0;
    let roomsSkipped = 0;
    let totalWarnings = 0;

    for (const lot of lotsResult.rows) {
      // Récupérer les pièces avec polygone non-null
      const roomsResult = await query<VsRoom>(
        "SELECT * FROM vs_rooms WHERE lot_id = $1",
        [lot.id]
      );
      const rooms = roomsResult.rows;
      if (rooms.length === 0) continue;

      const lotPoly = lotContainmentPolygon(lot.zone_data);
      if (!lotPoly) {
        // Lot sans zone_data valide : skip (impossible de contraindre)
        roomsSkipped += rooms.length;
        continue;
      }

      const lotBbox = polygonBbox(lotPoly);
      if (lotBbox.w <= 0 || lotBbox.h <= 0) {
        roomsSkipped += rooms.length;
        continue;
      }

      // Convertir room.polygon lot-local % → plan-global %
      // Formule inverse de celle utilisée dans POST /extract :
      //   local = ((global - lotStart) / lotSize) * 100
      // → global = lotStart + (local / 100) * lotSize
      const roomsForResolver: RoomWithPolygon[] = rooms
        .map((r): RoomWithPolygon | null => {
          if (!Array.isArray(r.polygon) || r.polygon.length < 3) return null;
          const globalPoly: Point[] = r.polygon.map((p) => ({
            x_percent: lotBbox.x + (Number(p.x_percent) / 100) * lotBbox.w,
            y_percent: lotBbox.y + (Number(p.y_percent) / 100) * lotBbox.h,
          }));
          return {
            id: r.id,
            bounding_polygon: globalPoly,
            surface_m2: r.surface_m2,
          };
        })
        .filter((r): r is RoomWithPolygon => r !== null);

      if (roomsForResolver.length === 0) {
        roomsSkipped += rooms.length;
        continue;
      }

      const resolverResult = resolveRoomOverlaps(roomsForResolver, lotPoly);
      totalWarnings += resolverResult.warnings.length;

      // Persister les polygones résolus (reconversion plan-global → lot-local)
      const resolvedById = new Map<string, Point[]>();
      for (const resolved of resolverResult.resolved) {
        if (resolved.bounding_polygon && resolved.bounding_polygon.length >= 3) {
          resolvedById.set(resolved.id, resolved.bounding_polygon);
        }
      }

      for (const room of rooms) {
        const resolved = resolvedById.get(room.id);
        if (!resolved) {
          roomsSkipped++;
          continue;
        }
        // global → lot-local
        const localPoly = resolved.map((p) => ({
          x_percent: Math.max(
            0,
            Math.min(100, ((p.x_percent - lotBbox.x) / lotBbox.w) * 100)
          ),
          y_percent: Math.max(
            0,
            Math.min(100, ((p.y_percent - lotBbox.y) / lotBbox.h) * 100)
          ),
        }));

        // Recalculer position (bbox du polygone lot-local) pour garder cohérence
        const xs = localPoly.map((p) => p.x_percent);
        const ys = localPoly.map((p) => p.y_percent);
        const newPosition = {
          x_percent: Math.min(...xs),
          y_percent: Math.min(...ys),
          width_percent: Math.max(...xs) - Math.min(...xs),
          height_percent: Math.max(...ys) - Math.min(...ys),
        };

        await query(
          `UPDATE vs_rooms
             SET polygon = $1,
                 position = $2
           WHERE id = $3`,
          [JSON.stringify(localPoly), JSON.stringify(newPosition), room.id]
        );
        roomsUpdated++;
      }

      lotsResolved++;
    }

    return NextResponse.json({
      success: true,
      data: {
        lots_resolved: lotsResolved,
        rooms_updated: roomsUpdated,
        rooms_skipped: roomsSkipped,
        warnings: totalWarnings,
      },
    });
  } catch (err) {
    console.error(
      "[API] POST /api/vs/projects/[id]/rooms/resolve-overlaps erreur :",
      err
    );
    return NextResponse.json(
      { success: false, error: "Impossible de recalculer la disposition des pièces." },
      { status: 500 }
    );
  }
}
