/**
 * Reality-check FINAL — Session s23 — 2026-04-19
 *
 * Exécute le pipeline COMPLET (identique à extract/route.ts) sur les 4 plans
 * P00, P01, P02, P03 :
 *  - passe-1 : extractPlanData (bbox + polygone grossier)
 *  - passe-2 : refineRoomPolygon (raffinement polygone par crop)
 *  - resolver : resolveRoomOverlaps (non-overlap + containment lot)
 *  - passe-3 : verifyAndCorrectPolygons (vérif visuelle GPT-4.1, seuil 0.6)
 *  - hard-clip : clipPolygonToBoundary au building_outline (EXTERIOR-EXCLUSION)
 *
 * Génère :
 *  - /tmp/s23-final-P0X-overlay.png : overlay polygones finaux sur plan
 *  - /tmp/s23-final-P0X-result.json : polygones + metrics par plan
 *
 * Usage : set -a && source .env.local && set +a && npx tsx scripts/s23-reality-check-final.ts
 */
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import sharp from "sharp";
import { extractPlanData } from "../src/lib/vs/plan-extractor";
import { refineRoomPolygon } from "../src/lib/vs/polygon-refiner";
import {
  resolveRoomOverlaps,
  clipPolygonToBoundary,
  type Point,
  type RoomWithPolygon,
} from "../src/lib/vs/polygon-resolver";
import {
  verifyAndCorrectPolygons,
  applyCorrections,
  buildOverlayImage,
  type RoomForVerify,
} from "../src/lib/vs/visual-verifier";
import {
  clusterByUnit,
  CLUSTERING_CONFIDENCE_THRESHOLD,
  computeEnvelopeBbox,
} from "../src/lib/vs/clustering";

const PLANS_DIR = path.resolve(__dirname, "../reference-existant/plans-test");
const OUT_DIR = "/tmp";
const REPORT_PATH = path.resolve(__dirname, "../../docs/reviews/s23-reality-check-final-2026-04-19.md");

const PLANS = [
  { id: "P00", file: "P 00 - Pr2_plan RDC_ projet2.pdf" },
  { id: "P01", file: "P 01 - Pr2_plan R+1_ projet2.pdf" },
  { id: "P02", file: "P 02 - Pr2_plan R+2_ projet2.pdf" },
  { id: "P03", file: "P 03 - Pr02_plan R+3_ projet02.pdf" },
];

interface LotMetric {
  unitId: string;
  floor: number;
  roomCount: number;
  roomsBeforeClip: number;
  roomsAfterClip: number;
  passe3Applied: number;
  passe3Skipped: number;
  hardClipApplied: number;
  hardClipPreserved: number;
  hasBuildingOutline: boolean;
  roomNames: string[];
}

interface PlanMetric {
  id: string;
  file: string;
  durationMs: number;
  error?: string;
  totalRooms: number;
  buildingOutline?: { x: number; y: number; w: number; h: number } | null;
  lots: LotMetric[];
  overlayPath: string;
  jsonPath: string;
}

async function pdfToPng(pdfBuf: Buffer): Promise<Buffer> {
  const { pdf } = await import("pdf-to-img");
  const pages = await pdf(pdfBuf, { scale: 3 });
  for await (const page of pages) {
    return Buffer.from(page);
  }
  throw new Error("No PNG page");
}

async function runPlan(planDef: { id: string; file: string }): Promise<PlanMetric> {
  const start = Date.now();
  const result: PlanMetric = {
    id: planDef.id,
    file: planDef.file,
    durationMs: 0,
    totalRooms: 0,
    buildingOutline: null,
    lots: [],
    overlayPath: `${OUT_DIR}/s23-final-${planDef.id}-overlay.png`,
    jsonPath: `${OUT_DIR}/s23-final-${planDef.id}-result.json`,
  };

  try {
    const buffer = await fs.readFile(path.join(PLANS_DIR, planDef.file));
    const base64 = buffer.toString("base64");
    console.log(`[${planDef.id}] passe-1 extractPlanData…`);
    const data = await extractPlanData(base64, "application/pdf", "immeuble");
    result.totalRooms = data.rooms.length;
    result.buildingOutline = data.building_outline
      ? {
          x: data.building_outline.x_percent,
          y: data.building_outline.y_percent,
          w: data.building_outline.width_percent,
          h: data.building_outline.height_percent,
        }
      : null;

    const imgBuf = await pdfToPng(buffer);
    const meta = await sharp(imgBuf).metadata();
    const imgW = meta.width || 1;
    const imgH = meta.height || 1;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Passe-2 : raffinement polygone par crop
    console.log(`[${planDef.id}] passe-2 refineRoomPolygon sur ${data.rooms.length} pieces…`);
    for (const room of data.rooms) {
      if (!room.bounding_box) continue;
      try {
        const refined = await refineRoomPolygon(
          imgBuf,
          imgW,
          imgH,
          room.name_raw,
          room.bounding_box,
          openai,
        );
        if (refined && refined.length >= 4) {
          room.bounding_polygon = refined;
        }
      } catch (e) {
        console.error(`  [passe-2] ${room.name_raw} fail:`, e instanceof Error ? e.message : e);
      }
    }

    // Clustering
    const { accepted } = clusterByUnit(data.rooms, CLUSTERING_CONFIDENCE_THRESHOLD);
    console.log(`[${planDef.id}] clustering: ${accepted.length} lots`);

    // Building outline polygon (pour hard clipping)
    let buildingPolygon: Point[] | null = null;
    if (data.building_outline) {
      const bo = data.building_outline;
      buildingPolygon = [
        { x_percent: bo.x_percent, y_percent: bo.y_percent },
        { x_percent: bo.x_percent + bo.width_percent, y_percent: bo.y_percent },
        { x_percent: bo.x_percent + bo.width_percent, y_percent: bo.y_percent + bo.height_percent },
        { x_percent: bo.x_percent, y_percent: bo.y_percent + bo.height_percent },
      ];
    }

    // Pour overlay : collecter toutes les rooms finales (plan-global %)
    const allFinalRooms: RoomForVerify[] = [];

    for (const group of accepted) {
      const envelope = computeEnvelopeBbox(group.rooms);
      const lotContainmentPolygon: Point[] = [
        { x_percent: envelope.x_percent, y_percent: envelope.y_percent },
        { x_percent: envelope.x_percent + envelope.width_percent, y_percent: envelope.y_percent },
        { x_percent: envelope.x_percent + envelope.width_percent, y_percent: envelope.y_percent + envelope.height_percent },
        { x_percent: envelope.x_percent, y_percent: envelope.y_percent + envelope.height_percent },
      ];

      const lotName = `${group.unitId}@floor${group.floor}`;

      // Resolver non-overlap
      const roomsForResolver: RoomWithPolygon[] = group.rooms.map((r, idx) => ({
        id: r.temp_id || r.name_raw || `room_${idx}`,
        bounding_polygon: r.bounding_polygon ?? null,
        surface_m2: r.surface_m2,
      }));
      const resolverResult = resolveRoomOverlaps(roomsForResolver, lotContainmentPolygon);
      const resolvedById = new Map<string, RoomWithPolygon>();
      for (const resolved of resolverResult.resolved) resolvedById.set(resolved.id, resolved);
      for (let idx = 0; idx < group.rooms.length; idx++) {
        const r = group.rooms[idx];
        const rid = r.temp_id || r.name_raw || `room_${idx}`;
        const resolved = resolvedById.get(rid);
        if (resolved && resolved.bounding_polygon) r.bounding_polygon = resolved.bounding_polygon;
      }

      // Passe-3 visual verify
      let passe3Applied = 0;
      let passe3Skipped = 0;
      const roomsForVerify: RoomForVerify[] = group.rooms
        .map((r, idx) => {
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
        console.log(`[${planDef.id}] passe-3 visual verify ${lotName} (${roomsForVerify.length} pieces, seuil 0.6)…`);
        try {
          const verifyResult = await verifyAndCorrectPolygons(
            imgBuf,
            roomsForVerify,
            openai,
            lotName,
            0.6,
          );
          passe3Applied = verifyResult.applied;
          passe3Skipped = verifyResult.skippedLowConfidence;
          if (verifyResult.applied > 0) {
            const corrected = applyCorrections(roomsForVerify, verifyResult.corrections);
            const correctedById = new Map<string, RoomForVerify>();
            for (const c of corrected) correctedById.set(c.id, c);
            for (let idx = 0; idx < group.rooms.length; idx++) {
              const r = group.rooms[idx];
              const rid = r.temp_id || `room_${idx}`;
              const c = correctedById.get(rid);
              if (!c) continue;
              const wasCorrected = verifyResult.corrections.some((cc) => cc.room_id === rid);
              if (wasCorrected) r.bounding_polygon = c.polygon;
            }
          }
        } catch (e) {
          console.error(`  [passe-3] ${lotName} fail:`, e instanceof Error ? e.message : e);
        }
      }

      // Hard clipping building_outline
      let hardClipApplied = 0;
      let hardClipPreserved = 0;
      if (buildingPolygon && buildingPolygon.length >= 4) {
        for (const r of group.rooms) {
          if (!r.bounding_polygon || r.bounding_polygon.length < 4) continue;
          const { polygon: clipped, residualRatio } = clipPolygonToBoundary(
            r.bounding_polygon,
            buildingPolygon,
            0.5,
          );
          if (clipped && clipped.length >= 4) {
            r.bounding_polygon = clipped;
            hardClipApplied++;
          } else {
            console.warn(`  [hard-clip] ${lotName}/${r.name_raw} destructif (residu ${(residualRatio * 100).toFixed(0)}%), preserve`);
            hardClipPreserved++;
          }
        }
      }

      const lotMetric: LotMetric = {
        unitId: group.unitId,
        floor: group.floor,
        roomCount: group.rooms.length,
        roomsBeforeClip: group.rooms.filter((r) => r.bounding_polygon && r.bounding_polygon.length >= 4).length,
        roomsAfterClip: group.rooms.filter((r) => r.bounding_polygon && r.bounding_polygon.length >= 4).length,
        passe3Applied,
        passe3Skipped,
        hardClipApplied,
        hardClipPreserved,
        hasBuildingOutline: !!buildingPolygon,
        roomNames: group.rooms.map((r) => r.name_raw),
      };
      result.lots.push(lotMetric);

      // Collecter pour overlay
      for (let idx = 0; idx < group.rooms.length; idx++) {
        const r = group.rooms[idx];
        if (!r.bounding_polygon || r.bounding_polygon.length < 4) continue;
        allFinalRooms.push({
          id: (r.temp_id || `r${idx}`).slice(0, 6),
          name: r.name_raw,
          polygon: r.bounding_polygon,
          surface_m2: r.surface_m2,
        });
      }
    }

    // Overlay final (plan + polygones colorés)
    console.log(`[${planDef.id}] building overlay (${allFinalRooms.length} rooms)…`);
    const { buffer: overlayBuf } = await buildOverlayImage(imgBuf, allFinalRooms);

    // Superposer building_outline en noir pointillé pour visualiser la contrainte
    let finalOverlay = overlayBuf;
    if (buildingPolygon) {
      const metaOverlay = await sharp(overlayBuf).metadata();
      const ow = metaOverlay.width || imgW;
      const oh = metaOverlay.height || imgH;
      const bo = data.building_outline!;
      const bx = (bo.x_percent / 100) * ow;
      const by = (bo.y_percent / 100) * oh;
      const bw = (bo.width_percent / 100) * ow;
      const bh = (bo.height_percent / 100) * oh;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ow}" height="${oh}" viewBox="0 0 ${ow} ${oh}">
        <rect x="${bx}" y="${by}" width="${bw}" height="${bh}"
              fill="none" stroke="#000" stroke-width="5" stroke-dasharray="20,10"/>
        <text x="${bx + 10}" y="${by + 30}" fill="#000" font-size="24" font-weight="700" font-family="Arial">building_outline</text>
      </svg>`;
      finalOverlay = await sharp(overlayBuf)
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .png({ compressionLevel: 6 })
        .toBuffer();
    }

    await fs.writeFile(result.overlayPath, finalOverlay);

    // JSON dump
    await fs.writeFile(
      result.jsonPath,
      JSON.stringify(
        {
          plan: planDef,
          buildingOutline: result.buildingOutline,
          lots: result.lots,
          rooms: allFinalRooms.map((r) => ({
            id: r.id,
            name: r.name,
            polygon: r.polygon,
            surface_m2: r.surface_m2,
          })),
        },
        null,
        2,
      ),
    );

    result.durationMs = Date.now() - start;
    console.log(
      `[${planDef.id}] DONE in ${(result.durationMs / 1000).toFixed(1)}s — ${allFinalRooms.length} rooms, ${result.lots.length} lots`,
    );
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
    result.durationMs = Date.now() - start;
    console.error(`[${planDef.id}] FAIL:`, result.error);
  }

  return result;
}

function formatReport(results: PlanMetric[]): string {
  const L: string[] = [];
  L.push(`# Reality Check E2E FINAL — Session s23 — 2026-04-19`);
  L.push(``);
  L.push(`Pipeline complet exécuté sur 4 plans (P00-P03) :`);
  L.push(`passe-1 (extractPlanData) → passe-2 (refineRoomPolygon) → resolver (non-overlap+containment) → passe-3 (visual verify seuil 0.6) → hard-clip (building_outline).`);
  L.push(``);
  L.push(`## Fixes appliqués cette session`);
  L.push(``);
  L.push(`- **A) Seuil passe-3 confidence 0.8 → 0.6** dans \`visual-verifier.ts\` (default) + appelé explicitement avec 0.6 dans \`extract/route.ts\`.`);
  L.push(`- **B) Hard clipping au building_outline** dans \`extract/route.ts\` (après passe-3, avant persist DB). Utilise \`clipPolygonToBoundary\` de \`polygon-resolver.ts\` (polygon-clipping intersection, min 50% aire résiduelle).`);
  L.push(``);
  L.push(`## Tableau de synthèse`);
  L.push(``);
  L.push(`| Plan | Durée | Lots | Pièces | Building outline | Passe-3 appliquée | Hard-clip appliqué | Hard-clip préservé |`);
  L.push(`|------|-------|------|--------|------------------|-------------------|--------------------|--------------------|`);
  for (const r of results) {
    if (r.error) {
      L.push(`| ${r.id} | ERREUR | — | — | — | — | — | — |`);
      continue;
    }
    const totalP3 = r.lots.reduce((s, l) => s + l.passe3Applied, 0);
    const totalHC = r.lots.reduce((s, l) => s + l.hardClipApplied, 0);
    const totalHCP = r.lots.reduce((s, l) => s + l.hardClipPreserved, 0);
    const bo = r.buildingOutline
      ? `x=${r.buildingOutline.x.toFixed(0)} y=${r.buildingOutline.y.toFixed(0)} w=${r.buildingOutline.w.toFixed(0)} h=${r.buildingOutline.h.toFixed(0)}`
      : "non détecté";
    L.push(`| ${r.id} | ${(r.durationMs / 1000).toFixed(1)}s | ${r.lots.length} | ${r.totalRooms} | ${bo} | ${totalP3} | ${totalHC} | ${totalHCP} |`);
  }
  L.push(``);
  L.push(`## Lecture des overlays`);
  L.push(``);
  L.push(`Les overlays PNG sont dans \`/tmp/s23-final-P0X-overlay.png\`.`);
  L.push(`Chaque pièce est tracée en polygone coloré + label \`<id> · <nom>\`.`);
  L.push(`Le rectangle noir pointillé = \`building_outline\` (contrainte EXTERIOR-EXCLUSION).`);
  L.push(``);
  L.push(`**Verdict par plan** : compter manuellement sur l'overlay :`);
  L.push(`- pièces dont le polygone suit les murs de la bonne pièce = **OK**`);
  L.push(`- pièces décalées de plus d'une pièce = **DRIFT**`);
  L.push(`- pièces qui débordent hors du rectangle pointillé = **DÉBORD** (fail hard-clip)`);
  L.push(``);
  L.push(`## Détails par plan`);
  L.push(``);
  for (const r of results) {
    L.push(`### ${r.id} — ${r.file}`);
    L.push(``);
    if (r.error) {
      L.push(`ERREUR : \`${r.error}\``);
      L.push(``);
      continue;
    }
    L.push(`- Overlay : \`${r.overlayPath}\``);
    L.push(`- JSON : \`${r.jsonPath}\``);
    L.push(`- Durée : ${(r.durationMs / 1000).toFixed(1)}s`);
    L.push(`- Pièces totales : ${r.totalRooms}`);
    L.push(`- Lots : ${r.lots.length}`);
    for (const l of r.lots) {
      L.push(``);
      L.push(`**Lot \`${l.unitId}\` étage ${l.floor}** (${l.roomCount} pièces) :`);
      L.push(`- Pièces : ${l.roomNames.join(", ")}`);
      L.push(`- Passe-3 : ${l.passe3Applied} appliquée(s), ${l.passe3Skipped} skippée(s) (< seuil 0.6)`);
      L.push(`- Hard-clip : ${l.hardClipApplied} appliqué(s), ${l.hardClipPreserved} préservé(s) (clip destructif)`);
      L.push(`- Building outline disponible : ${l.hasBuildingOutline ? "oui" : "non"}`);
    }
    L.push(``);
  }
  L.push(`## Verdict global à remplir après lecture visuelle des overlays`);
  L.push(``);
  L.push(`| Plan | % pièces OK | Débord résiduel | Gaps |`);
  L.push(`|------|-------------|-----------------|------|`);
  L.push(`| P00 | — | — | — |`);
  L.push(`| P01 | — | — | — |`);
  L.push(`| P02 | — | — | — |`);
  L.push(`| P03 | — | — | — |`);
  L.push(``);
  return L.join("\n");
}

async function main() {
  console.log(`[reality-check-final] Start — 4 plans, budget OpenAI ~$0.80`);
  const results: PlanMetric[] = [];
  for (const plan of PLANS) {
    const r = await runPlan(plan);
    results.push(r);
    // Dump intermédiaire au fur et à mesure — anti-timeout + robustesse
    const intermediate = formatReport(results);
    await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
    await fs.writeFile(REPORT_PATH, intermediate, "utf-8");
  }
  console.log(`[reality-check-final] Rapport: ${REPORT_PATH}`);
  for (const r of results) {
    console.log(`  - ${r.id}: ${r.error ? "ERROR " + r.error : `${r.lots.length} lots, ${r.totalRooms} pieces, overlay=${r.overlayPath}`}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
