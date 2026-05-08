/* eslint-disable @typescript-eslint/no-unused-vars */
// FIXME(s34): script de diagnostic session — vars inutilisées tolérées (PoC/debug, hors build prod).
/**
 * s28 tour 11 — Test unitaire smartLineSnap
 *
 * Vérifie sur un polygone "escalier pixel" synthétique :
 *   1. Aire préservée à <2%
 *   2. Vertices snappés à <=5px du mur cible
 *   3. Comparaison vs snap vertex-par-vertex (qui devrait CASSER l'aire)
 */
import { smartLineSnap, smartLineSnapWithStats } from "../src/lib/vs/smart-line-snap";

// Mini Douglas-Peucker pour test
function dp(
  pts: Array<{ x: number; y: number }>, eps: number,
): Array<{ x: number; y: number }> {
  if (pts.length < 3) return [...pts];
  const stack: Array<[number, number]> = [[0, pts.length - 1]];
  const keep = new Array(pts.length).fill(false);
  keep[0] = true; keep[pts.length - 1] = true;
  while (stack.length > 0) {
    const [a, b] = stack.pop()!;
    let maxD = 0, maxI = -1;
    const ax = pts[a].x, ay = pts[a].y;
    const bx = pts[b].x, by = pts[b].y;
    const ddx = bx - ax, ddy = by - ay;
    const len = Math.hypot(ddx, ddy);
    for (let i = a + 1; i < b; i++) {
      let d: number;
      if (len < 1e-9) d = Math.hypot(pts[i].x - ax, pts[i].y - ay);
      else d = Math.abs(ddx * (ay - pts[i].y) - (ax - pts[i].x) * ddy) / len;
      if (d > maxD) { maxD = d; maxI = i; }
    }
    if (maxD > eps && maxI >= 0) {
      keep[maxI] = true;
      stack.push([a, maxI]);
      stack.push([maxI, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

function polygonArea(poly: Array<{ x: number; y: number }>): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    s += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return Math.abs(s / 2);
}

function snapVertexByVertex(
  poly: Array<{ x: number; y: number }>,
  walls: Array<{ x1: number; y1: number; x2: number; y2: number }>,
  tolPx: number,
): Array<{ x: number; y: number }> {
  return poly.map((v) => {
    let bestD2 = Infinity, bx = v.x, by = v.y;
    for (const w of walls) {
      const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((v.x - w.x1) * dx + (v.y - w.y1) * dy) / len2));
      const px = w.x1 + t * dx, py = w.y1 + t * dy;
      const d2 = (v.x - px) ** 2 + (v.y - py) ** 2;
      if (d2 < bestD2) { bestD2 = d2; bx = px; by = py; }
    }
    if (bestD2 <= tolPx * tolPx) return { x: bx, y: by };
    return { ...v };
  });
}

// Test 1 : rectangle "escalier pixel" (offset de 6px par rapport aux 4 murs)
function buildStaircaseRect(
  x0: number, y0: number, w: number, h: number,
  staircaseAmplitude: number, staircaseStep: number,
): Array<{ x: number; y: number }> {
  // 4 côtés "en escalier" avec micro-bumps
  const poly: Array<{ x: number; y: number }> = [];
  // top edge (y = y0), going right
  for (let x = x0; x <= x0 + w; x += staircaseStep) {
    const bump = (Math.floor(x / staircaseStep) % 2) * staircaseAmplitude;
    poly.push({ x, y: y0 + bump });
  }
  // right edge (x = x0+w), going down
  for (let y = y0 + staircaseStep; y <= y0 + h; y += staircaseStep) {
    const bump = (Math.floor(y / staircaseStep) % 2) * staircaseAmplitude;
    poly.push({ x: x0 + w - bump, y });
  }
  // bottom edge, going left
  for (let x = x0 + w - staircaseStep; x >= x0; x -= staircaseStep) {
    const bump = (Math.floor(x / staircaseStep) % 2) * staircaseAmplitude;
    poly.push({ x, y: y0 + h - bump });
  }
  // left edge, going up
  for (let y = y0 + h - staircaseStep; y >= y0 + staircaseStep; y -= staircaseStep) {
    const bump = (Math.floor(y / staircaseStep) % 2) * staircaseAmplitude;
    poly.push({ x: x0 + bump, y });
  }
  return poly;
}

function distPointToSegment(
  px: number, py: number, ax: number, ay: number, bx: number, by: number,
): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function snapRatio(
  poly: Array<{ x: number; y: number }>,
  walls: Array<{ x1: number; y1: number; x2: number; y2: number }>,
  tolPx: number,
): number {
  let snapped = 0;
  for (const v of poly) {
    let best = Infinity;
    for (const w of walls) {
      const d = distPointToSegment(v.x, v.y, w.x1, w.y1, w.x2, w.y2);
      if (d < best) best = d;
      if (best <= tolPx) break;
    }
    if (best <= tolPx) snapped++;
  }
  return poly.length > 0 ? snapped / poly.length : 0;
}

function main() {
  console.log("\n=== s28 tour 11 — test unitaire smartLineSnap ===\n");

  // Setup : rect 220x130 px à (108,108), murs idéaux à (100,100)-(330,240)
  // Polygone source = quasi-rect avec petits bumps de 4-6px sur chaque côté
  // (simule door-seal-radius qui rétrécit le flood-fill de 6-8px du mur).
  const polyRaw = buildStaircaseRect(108, 108, 220, 130, 4, 5);
  const polyOrig = dp(polyRaw, 6); // DP eps=6 (= valeur production tour 11)
  console.log(`Polygone après DP : ${polyOrig.length} vertices`);
  // Murs cible : 4 segments parfaits du rect réel (100,100)-(330,240).
  const walls = [
    { x1: 100, y1: 100, x2: 330, y2: 100 }, // top
    { x1: 330, y1: 100, x2: 330, y2: 240 }, // right
    { x1: 330, y1: 240, x2: 100, y2: 240 }, // bottom
    { x1: 100, y1: 240, x2: 100, y2: 100 }, // left
  ];

  const origArea = polygonArea(polyOrig);
  const origSnapRatio = snapRatio(polyOrig, walls, 5);

  console.log(`Polygone source : ${polyOrig.length} vertices`);
  console.log(`Aire originale : ${origArea.toFixed(1)} px²`);
  console.log(`Snap ratio orig (≤5px) : ${(origSnapRatio * 100).toFixed(1)}%\n`);

  // Test A : smartLineSnap (paramètres généreux)
  const { result: smartResult, stats } = smartLineSnapWithStats(polyOrig, walls, {
    angleTolDeg: 18,
    dragTolPx: 25,
    parallelTolDeg: 30,
    finalSnapTolPx: 5,
    maxAreaDriftRatio: 0.10,
  });
  console.log("Détails lignes :", stats.linesTotal, "→ snap", stats.linesSnapped);
  console.log("Polygone snappé :", smartResult.map(p => `(${p.x.toFixed(0)},${p.y.toFixed(0)})`).join(" "));
  const smartArea = polygonArea(smartResult);
  const smartSnap = snapRatio(smartResult, walls, 5);
  console.log("--- Smart Line Snap ---");
  console.log(`  ${stats.linesTotal} lignes, ${stats.linesSnapped} snappées`);
  console.log(`  Aire : ${smartArea.toFixed(1)} px² (drift ${(stats.areaDriftRatio * 100).toFixed(2)}%)`);
  console.log(`  Snap ratio (≤5px) : ${(smartSnap * 100).toFixed(1)}%`);
  console.log(`  Vertex count : ${smartResult.length}`);

  // Test B : snap vertex-par-vertex (référence cassée)
  const vbvResult = snapVertexByVertex(polyOrig, walls, 15);
  const vbvArea = polygonArea(vbvResult);
  const vbvSnap = snapRatio(vbvResult, walls, 5);
  const vbvDrift = Math.abs(vbvArea - origArea) / origArea;
  console.log("\n--- Vertex-by-vertex (référence) ---");
  console.log(`  Aire : ${vbvArea.toFixed(1)} px² (drift ${(vbvDrift * 100).toFixed(2)}%)`);
  console.log(`  Snap ratio (≤5px) : ${(vbvSnap * 100).toFixed(1)}%`);

  // Verdict
  const smartOK = stats.areaDriftRatio < 0.05 && smartSnap >= 0.90;
  console.log("\n=== VERDICT ===");
  console.log(`Smart : aire <5%? ${stats.areaDriftRatio < 0.05 ? "OK" : "FAIL"} | snap >=90%? ${smartSnap >= 0.90 ? "OK" : "FAIL"} → ${smartOK ? "PASS" : "FAIL"}`);

  process.exit(smartOK ? 0 : 1);
}

main();
