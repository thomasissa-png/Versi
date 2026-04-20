/**
 * Fuzz test du resolver — détecter les régressions sur des cas aléatoires.
 * Run: npx tsx scripts/s23-resolver-fuzz.ts
 *
 * Génère N configurations aléatoires de 3 à 8 pièces avec overlaps probables,
 * applique resolveRoomOverlaps, vérifie qu'aucun overlap résiduel > 0.5.
 */

import { resolveRoomOverlaps, polygonArea, type RoomWithPolygon, type Point } from "../src/lib/vs/polygon-resolver";
import polygonClipping from "polygon-clipping";

function toMulti(p: Point[]) {
  return [[p.map((pt): [number, number] => [pt.x_percent, pt.y_percent])]] as const;
}

function intersectionArea(a: Point[], b: Point[]): number {
  try {
    const inter = polygonClipping.intersection(toMulti(a) as never, toMulti(b) as never);
    let area = 0;
    for (const poly of inter) {
      for (const ring of poly) {
        const pts = ring.map((p) => ({ x_percent: p[0], y_percent: p[1] }));
        area += polygonArea(pts);
      }
    }
    return area;
  } catch {
    return 0;
  }
}

function randomRect(idx: number): RoomWithPolygon {
  const x = Math.random() * 60;
  const y = Math.random() * 60;
  const w = 10 + Math.random() * 30;
  const h = 10 + Math.random() * 30;
  // Probabilité 30% : surface null (simulation comportement IA)
  const surface = Math.random() > 0.3 ? 20 + Math.random() * 50 : null;
  return {
    id: `room_${idx}`,
    surface_m2: surface,
    bounding_polygon: [
      { x_percent: x, y_percent: y },
      { x_percent: x + w, y_percent: y },
      { x_percent: x + w, y_percent: y + h },
      { x_percent: x, y_percent: y + h },
    ],
  };
}

function countOverlaps(rooms: { id: string; bounding_polygon: Point[] | null | undefined }[]): { count: number; maxArea: number; pair: string | null } {
  let count = 0;
  let maxArea = 0;
  let pair: string | null = null;
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i].bounding_polygon;
      const b = rooms[j].bounding_polygon;
      if (!a || !b) continue;
      const area = intersectionArea(a, b);
      const threshold = Math.max(0.05, polygonArea(a) * 0.01);
      if (area > threshold) {
        count++;
        if (area > maxArea) {
          maxArea = area;
          pair = `${rooms[i].id} ∩ ${rooms[j].id}`;
        }
      }
    }
  }
  return { count, maxArea, pair };
}

async function main() {
  const N = 200;
  let failed = 0;
  let worstCase: { seed: number; before: number; after: number; pair: string | null } | null = null;

  for (let seed = 0; seed < N; seed++) {
    const nRooms = 3 + Math.floor(Math.random() * 6);
    const rooms: RoomWithPolygon[] = [];
    for (let k = 0; k < nRooms; k++) rooms.push(randomRect(k));
    const lot: Point[] = [
      { x_percent: 0, y_percent: 0 },
      { x_percent: 100, y_percent: 0 },
      { x_percent: 100, y_percent: 100 },
      { x_percent: 0, y_percent: 100 },
    ];

    const { resolved } = resolveRoomOverlaps(rooms, lot);
    const beforeStats = countOverlaps(rooms);
    const afterStats = countOverlaps(resolved);

    if (afterStats.count > 0) {
      failed++;
      if (!worstCase || afterStats.maxArea > worstCase.after) {
        worstCase = {
          seed,
          before: beforeStats.count,
          after: afterStats.maxArea,
          pair: afterStats.pair,
        };
      }
    }
  }

  console.log(`\n=== Fuzz ${N} configurations ===`);
  console.log(`FAIL : ${failed}/${N} (${((failed / N) * 100).toFixed(1)}%)`);
  if (worstCase) {
    console.log(`Pire cas seed ${worstCase.seed} : before=${worstCase.before} overlap(s), after max area=${worstCase.after.toFixed(2)} (${worstCase.pair})`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
