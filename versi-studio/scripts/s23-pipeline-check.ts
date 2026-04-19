/**
 * Reproduit le pipeline EXACT de route.ts extract pour P00
 * puis vérifie si polygonLocal serait null ou valide pour chaque room.
 * Run: set -a && source .env.local && set +a && npx tsx scripts/s23-pipeline-check.ts
 */
import fs from "fs/promises";
import path from "path";
import { extractPlanData } from "../src/lib/vs/plan-extractor";
import { resolveRoomOverlaps } from "../src/lib/vs/polygon-resolver";
import { clusterByUnit, CLUSTERING_CONFIDENCE_THRESHOLD, computeEnvelopeBbox } from "../src/lib/vs/clustering";
import type { RoomWithPolygon } from "../src/lib/vs/polygon-resolver";

const PLANS_DIR = path.resolve(__dirname, "../reference-existant/plans-test");
const PLAN = "P 00 - Pr2_plan RDC_ projet2.pdf";

async function main() {
  console.log(`[pipeline] ${PLAN}…`);
  const buf = await fs.readFile(path.join(PLANS_DIR, PLAN));
  const data = await extractPlanData(buf.toString("base64"), "application/pdf", "immeuble");
  console.log(`[pipeline] ${data.rooms.length} pièces extraites`);

  for (const r of data.rooms) {
    console.log(
      `  - ${r.name_raw} : bounding_polygon = ${r.bounding_polygon ? `${r.bounding_polygon.length} pts` : "null"}`
    );
  }

  const { accepted } = clusterByUnit(data.rooms, CLUSTERING_CONFIDENCE_THRESHOLD);

  for (const group of accepted) {
    console.log(`\n[pipeline] Lot ${group.unitId} (floor ${group.floor}) : ${group.rooms.length} pièces`);
    const envelope = computeEnvelopeBbox(group.rooms);
    const zoneData = envelope;
    const lotContainmentPolygon = [
      { x_percent: envelope.x_percent, y_percent: envelope.y_percent },
      { x_percent: envelope.x_percent + envelope.width_percent, y_percent: envelope.y_percent },
      { x_percent: envelope.x_percent + envelope.width_percent, y_percent: envelope.y_percent + envelope.height_percent },
      { x_percent: envelope.x_percent, y_percent: envelope.y_percent + envelope.height_percent },
    ];

    const roomsForResolver: RoomWithPolygon[] = group.rooms.map((r, idx) => ({
      id: r.name_raw || `room_${idx}`,
      bounding_polygon: r.bounding_polygon ?? null,
      surface_m2: r.surface_m2,
    }));

    const { resolved, dropped } = resolveRoomOverlaps(roomsForResolver, lotContainmentPolygon);
    console.log(`  resolver: ${resolved.length} resolved, ${dropped.length} dropped`);

    const resolvedById = new Map(resolved.map((r) => [r.id, r]));
    for (const r of group.rooms) {
      const rid = r.name_raw;
      const res = resolvedById.get(rid);
      if (res && res.bounding_polygon) r.bounding_polygon = res.bounding_polygon;
    }

    // Simulation de la conversion lot-local (comme route.ts:362-369)
    for (const room of group.rooms) {
      let polygonLocal = null;
      if (room.bounding_polygon && room.bounding_polygon.length >= 4 && zoneData.width_percent > 0 && zoneData.height_percent > 0) {
        polygonLocal = room.bounding_polygon.map((pt) => ({
          x_percent: Math.max(0, Math.min(100, ((pt.x_percent - zoneData.x_percent) / zoneData.width_percent) * 100)),
          y_percent: Math.max(0, Math.min(100, ((pt.y_percent - zoneData.y_percent) / zoneData.height_percent) * 100)),
        }));
      }
      console.log(
        `  ${room.name_raw} : bounding_polygon post-resolver = ${
          room.bounding_polygon?.length ?? 0
        } pts | polygonLocal = ${polygonLocal ? `${polygonLocal.length} pts` : "NULL (fallback rect!)"}`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
