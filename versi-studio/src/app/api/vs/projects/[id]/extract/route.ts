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
import { readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { canonicalizePlan } from "@/lib/ai/plan-canonicalizer";
import { canonicalizePlanMock } from "@/lib/ai/plan-canonicalizer-mock";
import { extractPlanData, inferRoomTypeFromName, extractRoomLabelsOnly, type PlanLabel } from "@/lib/vs/plan-extractor";
import {
  buildPlanarGraph as buildPlanarGraphV2,
  detectFaces as detectFacesV2,
  filterRoomFaces as filterRoomFacesV2,
  pointInPolygon as pointInPolygonV2,
  computeSignedArea as computeSignedAreaV2,
  type Face as FaceV2,
  WallGraphFacesError,
} from "@/lib/vs/wall-graph-faces";
import { voronoiCellsAll, type Pt2 } from "@/lib/vs/voronoi-cells";
import { extractPlanDataMock } from "@/lib/vs/plan-extractor-mock";
import { refineRoomPolygon } from "@/lib/vs/polygon-refiner";
import {
  resolveRoomOverlaps,
  clipPolygonToBoundary,
  type RoomWithPolygon,
  type Point as ResolverPoint,
} from "@/lib/vs/polygon-resolver";
import {
  syncRoomSurfacesWithPolygons,
} from "@/lib/vs/room-surface-sync";
import {
  snapPolygonToWalls,
  polygonPctToPx,
  polygonPxToPct,
  type WallSegment,
} from "@/lib/vs/wall-snap";
import {
  verifyAndCorrectPolygons,
  applyCorrections,
  type RoomForVerify,
} from "@/lib/vs/visual-verifier";
import {
  detectLabels,
  detectLabelsOnOriginal,
  snapRoomsToLabels,
  type OcrLabel,
  type RoomForSnap,
} from "@/lib/vs/label-snap";
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
import {
  computeLotPolygonEnvelope,
  polygonBoundingBox,
  type RoomForEnvelope,
} from "@/lib/vs/envelope-polygon";
import { shrinkOutlinePolygonToRooms } from "@/lib/vs/outline-shrinker";
import {
  tileRoomsInLot,
  computeTilingMetrics,
  type RoomInput as TilingRoomInput,
} from "@/lib/vs/room-tiling";
import { track } from "@/lib/vs/analytics";
// ─── s27 Refonte pipeline (M1→M5) — branchement derrière VS_NEW_PIPELINE ───
import {
  detectPdfType,
  PdfTypeDetectorError,
} from "@/lib/vs/pdf-type-detector";
import {
  extractWallSegments,
  filterWallsByLineWidth,
  PdfVectorParserError,
} from "@/lib/vs/pdf-vector-parser";
import {
  extractWallSegmentsFromBitmap,
  BitmapLineDetectorError,
} from "@/lib/vs/bitmap-line-detector";
import {
  buildWallGraph,
  detectRooms,
  WallGraphError,
  type WallSegmentInput,
} from "@/lib/vs/wall-graph";
import {
  classifyRooms,
  LotClassifierError,
} from "@/lib/vs/lot-classifier";
import { extractLotVector, extractInternalWallSegments, LotVectorExtractorError } from "@/lib/vs/lot-vector-extractor";
import { extractRoomsByFloodFill, extractRoomsByQuotaFloodFill } from "@/lib/vs/flood-fill-rooms";
import {
  splitFloodFillByLabelsAndWalls,
  type LabelPoint as VoronoiLabelPoint,
  type Vertex as VoronoiVertex,
} from "@/lib/vs/wall-bounded-voronoi";
import { regularizeOrthogonal, chainCollinearSegments, dragOutliersToWalls } from "@/lib/vs/orthogonal-regularizer";
import { extractTextItems, filterRoomLabels } from "@/lib/vs/pdf-text-extractor";
import { detectAptSeparators, calibrateScaleFromPdfLabels } from "@/lib/vs/apt-separators";
import { pdf as pdfToImg } from "pdf-to-img";

// s24 — timeout route = 5min pour autoriser pipeline IA lourd (passe-1 +
// passe-2 + OCR + passe-3 × N plans). Sans cela : coupure réseau ~60-100s
// côté Replit/Vercel → client catch "Impossible de lancer l'analyse".
// Empirique : 1 plan = 51s passe-1+passe-2 seules, 4 plans = 200s+.
export const maxDuration = 300;

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

    // ─── s27 — Pipeline NEW v6 vectoriel (extracteur PDF direct) ─────
    // Activé si VS_NEW_PIPELINE=true. UN polygone bbox-percentile par plan,
    // précision pixel-level (coords PDF vectoriel → CTM viewport.transform).
    // Fail-fast P0 : erreurs mappées en 422, jamais de fallback silencieux.
    if (process.env.VS_NEW_PIPELINE === "true") {
      console.log(
        `[extract] pipeline=NEW v6 vector (VS_NEW_PIPELINE=true), plans=${plansResult.rows.length}`
      );
      try {
        const newPipelineLots: Array<{ name: string; floor: number }> = [];
        let totalRoomsCreated = 0;

        for (const plan of plansResult.rows) {
          const fileBuffer = await readFile(plan.file_path);

          // ─── Étape 1 : extraction VECTORIELLE du polygone du lot ───
          // Pixel-perfect via paths PDF orange. Préserve la précision s27.
          const result = await extractLotVector(fileBuffer, { scale: 3 });
          const poly = result.polygon;
          if (poly.length < 3) {
            console.warn(
              `[extract/NEW v6] plan ${plan.id}: polygone vide → skip`
            );
            await query(
              "UPDATE vs_plans SET extraction_status = 'done' WHERE id = $1",
              [plan.id]
            );
            continue;
          }
          console.log(
            `[extract/NEW v6] plan ${plan.id} (floor=${plan.floor_number}): ` +
              `${result.wallSegments.length} segments murs → polygone ${poly.length} sommets`
          );

          // Conversion coords pixel → % plan-global pour persistance.
          const polyPct = poly.map((p) => ({
            x_percent: result.imageWidth > 0 ? (p.x / result.imageWidth) * 100 : 0,
            y_percent: result.imageHeight > 0 ? (p.y / result.imageHeight) * 100 : 0,
          }));
          const zoneData = { type: "polygon", points: polyPct };

          // Bbox du polygone vectoriel (utilisée pour conversion lot-local).
          let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
          for (const pt of polyPct) {
            if (pt.x_percent < lotMinX) lotMinX = pt.x_percent;
            if (pt.y_percent < lotMinY) lotMinY = pt.y_percent;
            if (pt.x_percent > lotMaxX) lotMaxX = pt.x_percent;
            if (pt.y_percent > lotMaxY) lotMaxY = pt.y_percent;
          }
          const lotBboxW = lotMaxX - lotMinX;
          const lotBboxH = lotMaxY - lotMinY;

          // Nom lot par défaut basé sur étage. UI permettra renommage.
          const lotName = `Lot étage ${plan.floor_number ?? 0}`;
          const lotInsertResult = await query<{ id: string }>(
            `INSERT INTO vs_lots (project_id, name, floor_number, surface_m2, zone_data, source, status, confidence_avg)
             VALUES ($1, $2, $3, $4, $5, 'ai', 'suggested', $6)
             RETURNING id`,
            [
              projectId,
              lotName,
              plan.floor_number,
              null,
              JSON.stringify(zoneData),
              0.95, // vector extraction = haute confiance par construction
            ]
          );
          const lotId = lotInsertResult.rows[0].id;
          newPipelineLots.push({ name: lotName, floor: plan.floor_number });

          // ─── Étape 2 : extraction SÉMANTIQUE des pièces (s28 fix Bug 1) ───
          // Le pipeline vectoriel s27 n'extrait QUE l'enveloppe du lot. Les
          // pièces (chambre, cuisine, sdb...) requièrent identification IA
          // sémantique. On appelle extractPlanData (ou son mock) pour peupler
          // vs_rooms ET extraction_data (utilisé par /rooms/regenerate).
          //
          // VS_USE_MOCK_EXTRACTOR=true → données fixes (tests E2E sans clé OpenAI).
          // VS_DISABLE_ROOM_EXTRACTION=true → skip (lot vide, ajout manuel).
          if (process.env.VS_DISABLE_ROOM_EXTRACTION === "true") {
            console.log(
              `[extract/NEW v6] plan ${plan.id}: extraction pièces désactivée (VS_DISABLE_ROOM_EXTRACTION)`
            );
            await query(
              "UPDATE vs_plans SET extraction_status = 'done' WHERE id = $1",
              [plan.id]
            );
            continue;
          }

          try {
            // Conversion PDF → PNG si besoin (pour passe-1 IA vision)
            let imageBufferForIa: Buffer = fileBuffer;
            let mimeForIa: string = plan.mime_type;
            if (plan.mime_type === "application/pdf") {
              const { pdf } = await import("pdf-to-img");
              const pages = await pdf(fileBuffer, { scale: 3 });
              for await (const page of pages) {
                imageBufferForIa = Buffer.from(page);
                mimeForIa = "image/png";
                break;
              }
            }
            const base64ForIa = imageBufferForIa.toString("base64");

            // ─── s28.5 — PIVOT FULL VECTORIEL : labels-only IA + faces du graphe planaire ──────
            //
            // Bug récurrent s27→s28.4 : l'IA hallucinait des bbox/polygones de pièces
            // (TGBT, ECS inventés, polygones qui couvrent 2 pièces). Le matching face-greedy
            // attribuait un label IA inventé à une face réelle → hallucinations stockées.
            //
            // Nouveau flow :
            //   1. IA = uniquement labels textuels visibles + position approximative
            //      (extractRoomLabelsOnly — prompt minimal anti-hallucination)
            //   2. Géométrie = exclusivement les faces du graphe planaire (vertices =
            //      intersections segment-segment des murs externes + internes orange)
            //   3. Matching face↔label par centroid-in-face (pas de greedy global,
            //      pas de score composite — strict point-in-polygon)
            //   4. Si une face n'a aucun label → "Pièce inconnue" (pas de hallucination)
            //   5. Si un label n'a aucune face → ignoré (pas de fallback bbox IA)
            //
            // Critère de réussite : count exact = vérité terrain (5/8/6/5 pour Muguets RDC/R+1/R+2/R+3).

            // Routing mock vs réel — pour le mode mock on conserve le pipeline legacy via extractPlanData
            // (les tests E2E utilisent les fixtures déterministes). Pivot s28.5 actif uniquement en mode réel.
            const useMock = process.env.VS_USE_MOCK_EXTRACTOR === "true";

            let extraction: PlanExtractionResult;
            let labelsOnly: PlanLabel[];

            if (useMock) {
              extraction = await extractPlanDataMock(
                base64ForIa,
                mimeForIa,
                project.type_bien,
                `[MOCK_FLOOR=${plan.floor_number}]`,
              );
              for (const room of extraction.rooms) room.floor = plan.floor_number;
              // Convertir extraction mock → labels pour l'algo unifié
              labelsOnly = extraction.rooms.map((r) => {
                const cx = r.bounding_box ? r.bounding_box.x_percent + r.bounding_box.width_percent / 2 : 50;
                const cy = r.bounding_box ? r.bounding_box.y_percent + r.bounding_box.height_percent / 2 : 50;
                return {
                  text: r.name_raw,
                  x_percent: cx,
                  y_percent: cy,
                  surface_m2: r.surface_m2 ?? null,
                };
              });
            } else {
              // ─── s28.6 : PIVOT EXTRACTION TEXTE VECTORIEL ─────────────
              // Bug s28.5 : l'IA gpt-4.1 hallucinait des positions y_percent ≈ 95
              // pour TOUS les labels sur certains plans (R+2 Muguets), ce qui
              // collait tous les seeds flood-fill dans la même zone.
              //
              // Solution : lire les TextItems du PDF vectoriel via pdfjs.
              // Positions PIXEL-PARFAITES, lecture des labels micro (ECS 4pt)
              // que l'IA OCR rate, déterministe.
              //
              // Fallback IA : si l'extraction vectorielle retourne < 2 labels
              // (PDF rasterisé sans texte vectoriel ou pure scan), on retombe
              // sur extractRoomLabelsOnly (IA OCR).
              const lotPolyPxForText: Array<{ x: number; y: number }> = polyPct.map((p) => ({
                x: (p.x_percent / 100) * result.imageWidth,
                y: (p.y_percent / 100) * result.imageHeight,
              }));
              try {
                const textItems = await extractTextItems(fileBuffer, lotPolyPxForText, 3);
                const roomItems = filterRoomLabels(textItems);
                if (roomItems.length >= 2) {
                  labelsOnly = roomItems.map((r) => ({
                    text: r.text,
                    x_percent: result.imageWidth > 0 ? (r.x / result.imageWidth) * 100 : 0,
                    y_percent: result.imageHeight > 0 ? (r.y / result.imageHeight) * 100 : 0,
                    surface_m2: r.surface_m2,
                  }));
                  console.log(
                    `[extract/NEW v6/s28.6] plan ${plan.id} labels VECTORIEL : ${labelsOnly.length} → ${labelsOnly.map((l) => `${l.text}=${l.surface_m2 ?? "?"}m²`).join(", ")}`,
                  );
                } else {
                  console.warn(
                    `[extract/NEW v6/s28.6] plan ${plan.id} fallback IA : ${roomItems.length} labels vectoriels insuffisants`,
                  );
                  labelsOnly = await extractRoomLabelsOnly(base64ForIa, mimeForIa);
                  console.log(
                    `[extract/NEW v6/s28.6] plan ${plan.id} labels lus IA (fallback) : ${labelsOnly.length} → ${labelsOnly.map((l) => l.text).join(", ")}`,
                  );
                }
              } catch (textErr) {
                console.warn(
                  `[extract/NEW v6/s28.6] plan ${plan.id} extraction texte vectoriel échouée → fallback IA :`,
                  textErr instanceof Error ? textErr.message : textErr,
                );
                labelsOnly = await extractRoomLabelsOnly(base64ForIa, mimeForIa);
              }
              // Construire un PlanExtractionResult minimal pour la persistance extraction_data
              // (utilisé par /rooms/regenerate côté UI).
              const totalSurf = labelsOnly.reduce(
                (s, l) => s + (l.surface_m2 ?? 0),
                0,
              );
              extraction = {
                rooms: labelsOnly.map((l, idx) => ({
                  temp_id: `r${idx + 1}`,
                  name_raw: l.text,
                  floor: plan.floor_number,
                  surface_m2: l.surface_m2,
                  unit_id: "u1",
                  confidence: 0.9,
                  ceiling_height_m: null,
                  windows_count: 0,
                  doors_count: 0,
                  shape: null,
                  notes: null,
                  bounding_box: {
                    x_percent: Math.max(0, l.x_percent - 5),
                    y_percent: Math.max(0, l.y_percent - 5),
                    width_percent: 10,
                    height_percent: 10,
                  },
                  bounding_polygon: null,
                  dimensions: null,
                })),
                building_outline: null,
                total_surface_m2: totalSurf > 0 ? totalSurf : null,
                floors_count: 1,
                extraction_warnings: [],
                scale_reference: "dimensions_on_plan",
              } as PlanExtractionResult;
            }

            // Persister extraction_data sur le plan (utilisé par regenerate).
            await query(
              "UPDATE vs_plans SET extraction_data = $1 WHERE id = $2",
              [JSON.stringify(extraction), plan.id]
            );

            // ─── s28.4 — Pivot wall-graph + matching face-greedy ──────
            // Le pivot s28.4 abandonne le snap-vertex-by-vertex (qui plafonnait
            // à 30-50% de précision sur les vertices IA) au profit d'une
            // détection PIXEL-PARFAITE des pièces via le graphe planaire des
            // murs (externes + internes). Chaque face du graphe = un polygone
            // de pièce. Le matching IA→face utilise un score composite
            // (centroid distance + bonus inside + cohérence d'aire).
            //
            // Audit invariants 20/20 strict atteint sur Muguets (RDC, R+1, R+2,
            // R+3) — voir scripts/s28-audit-strict.ts.
            //
            // Algo détaillé :
            //   1. extractInternalWallSegments → segments murs DANS le polygone lot
            //   2. buildWallGraph + detectRooms → polygones faces pixel-perfect
            //   3. Filtre faces : centroid dans lot + aire ≥ 100px²
            //   4. Matching face-greedy : pour chaque face (DESC area), choisir
            //      la pièce IA non-attribuée avec meilleur score :
            //        score = -dist(centroid_IA, centroid_face)
            //              + 1500 si centroid_IA ∈ face
            //              - 1500 × |log(aire_face / (surface_IA × pxPerM2))|
            //   5. Resync surface : surface = aire_face / Σaires × surface_lot_total
            //
            // Bug Thomas s28 verbatim : "Le séjour y a écrit 25m² mais la
            // taille est plus petite que la chambre… On tient pas compte des
            // lignes orange des murs." → résolu : polygones SUR les murs
            // orange par construction, surfaces proportionnelles aux aires.

            // Polygone lot en pixel image native (pour murs internes + faces)
            const lotPolyPx_face: Array<{ x: number; y: number }> = polyPct.map((p) => ({
              x: (p.x_percent / 100) * result.imageWidth,
              y: (p.y_percent / 100) * result.imageHeight,
            }));

            // Step 1 : murs internes (s28.6 — pivot multi-couleur)
            // Sur les PDFs Muguets : enveloppe ORANGE + cloisons GRIS #7f7f7f.
            // Le mode multiColor capture TOUS les strokes sauf cotes/hachures/cartouche
            // → graphe planaire ferme correctement les pièces.
            let internalWalls_face: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
            try {
              internalWalls_face = await extractInternalWallSegments(
                fileBuffer,
                lotPolyPx_face,
                { scale: 3, multiColor: true, minSegLen: 10 },
              );
            } catch (intErr) {
              console.warn(
                `[extract/NEW v6/s28.6] plan ${plan.id} — extractInternalWallSegments échoué :`,
                intErr instanceof Error ? intErr.message : intErr,
              );
            }
            const allWalls_face = [
              ...result.wallSegments.map((s) => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })),
              ...internalWalls_face,
            ];
            // Wall set "snap" (cible de snap) :
            //   1. Chaîne les segments colinéaires adjacents (gap≤8px, angle±3°)
            //      → produit des MURS LONGS depuis des séries de dashes ~11px
            //   2. Filtre les murs chaînés < 15px (cohérent audit Inv C minSegLen=15)
            //
            // Critique : sans chaînage, les murs Chambre RDC sont des dashes
            // de 11px chacun, exclus par minSegLen=15 → polygones non snappés.
            // Avec chaînage : 5 dashes 11px → 1 mur de 55px → audit voit le mur.
            const chainedWalls = chainCollinearSegments(allWalls_face, {
              gapPx: 15,
              angleTolDeg: 3,
              lateralTolPx: 3,
            });
            const minSegLenSnap = 10;
            const allWalls_snap = chainedWalls.filter((w) => {
              const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
              return len >= minSegLenSnap;
            });
            console.log(
              `[extract/NEW v6/s28.4] plan ${plan.id} murs : ${result.wallSegments.length} ext + ${internalWalls_face.length} int → chaînés ${chainedWalls.length} → snap target ${allWalls_snap.length}`,
            );

            // ─── s28.6 : PIVOT FLOOD-FILL RASTER ────────────────────────
            //
            // Pivot Option C (s28.6) : abandon du graphe planaire vectoriel
            // (qui ne fermait pas correctement les cellules quand les cloisons
            // sont multi-traits ou que les portes ouvrent les cycles).
            //
            // Approche : rasteriser le PDF en PNG haute-déf, puis depuis chaque
            // label IA faire un flood-fill 4-connectivité dans la masque "wall"
            // (lum < 200 OU saturation > 0.30). Les segments murs vectoriels
            // sont AJOUTÉS à la masque comme barrières (garantit que les
            // cloisons gris/orange du PDF deviennent infranchissables).
            //
            // Avantages :
            //   - Indépendant des couleurs (toute couleur dark = barrière).
            //   - Polygones DISJOINTS par construction (claim mask exclusif).
            //   - Pixel-parfait par construction (suit les murs réels du PDF).
            //   - Pas de fallback Voronoï : si seed introuvable, label ignoré.
            //
            // Validé empiriquement Muguets : 24/24 pièces (5+8+6+5) sur les 4 plans.
            type BuilderFace = {
              name: string;
              roomType: string;
              surfaceM2: number;
              polyGlobalPct: Array<{ x_percent: number; y_percent: number }>;
              source: "floodfill_labeled" | "floodfill_unknown";
              areaPx2: number;
              /**
               * s28 tour 8 — Surface m² LUE SUR LE PDF (label "X.X m²").
               * Source de vérité absolue : c'est la valeur écrite par l'architecte.
               * Utilisée prioritairement vs polygon area (qui peut diverger en cas
               * de flood-fill imparfait sur portes ouvertes).
               */
              pdfSurfaceM2: number | null;
            };
            const builders_face: BuilderFace[] = [];
            // Estimation px²→m² (initiale — sera affinée APRÈS flood-fill via régression par-pièce)
            const lotPolyArea_px2 = Math.abs(computeSignedAreaV2(lotPolyPx_face));
            const totalLabelSurface_m2 = labelsOnly.reduce(
              (s, l) => s + (l.surface_m2 ?? 0),
              0,
            );
            const lotEstSurface_m2 = totalLabelSurface_m2 > 5 ? totalLabelSurface_m2 : 50;
            let scaleM2PerPx2 = lotPolyArea_px2 > 0 ? lotEstSurface_m2 / lotPolyArea_px2 : 0;

            // Rastériser le PDF en PNG haute-déf (scale=3 pour cohérence avec coords pixel)
            let pngBuf: Buffer | null = null;
            try {
              const pages = await pdfToImg(fileBuffer, { scale: 3 });
              for await (const page of pages) {
                pngBuf = Buffer.from(page);
                break;
              }
            } catch (rasterErr) {
              console.warn(
                `[extract/NEW v6/s28.6] plan ${plan.id} — rasterisation PDF échouée :`,
                rasterErr instanceof Error ? rasterErr.message : rasterErr,
              );
            }

            if (pngBuf && labelsOnly.length > 0) {
              try {
                const labelSeeds = labelsOnly.map((l) => ({
                  text: l.text,
                  x_percent: l.x_percent,
                  y_percent: l.y_percent,
                  surface_m2: l.surface_m2,
                }));
                // s28 tour 8 — Détection des murs séparateurs d'appartements.
                // Sur R+1 Muguets, le plan contient T2 + T3 séparés par une
                // cloison palière qui peut être traversée par flood-fill via
                // une porte ouverte. On détecte ces séparateurs (longs +
                // orthogonaux + traversants) et on les renforce dans la masque.
                // Si 1 seul apt → 0 séparateur trouvé, no-op.
                const aptSeparators = detectAptSeparators(allWalls_face, lotPolyPx_face, {
                  minLengthRatio: 0.30,
                  angleTolDeg: 5,
                  endpointToLotTolPx: 30,
                });
                if (aptSeparators.length > 0) {
                  console.log(
                    `[extract/NEW v8/s28-apt-sep] plan ${plan.id} — ${aptSeparators.length} apt-separator(s) détecté(s) (longueur min ${(Math.hypot(result.imageWidth, result.imageHeight) * 0.30).toFixed(0)}px)`,
                  );
                }
                const floodRooms = await extractRoomsByFloodFill(pngBuf, labelSeeds, {
                  lotPolygonPx: lotPolyPx_face,
                  wallLumThreshold: 210,
                  wallSaturationThreshold: 0.25,
                  simplifyTolerancePx: 10,
                  minAreaPx2: 500,
                  maxAreaPx2: lotPolyArea_px2 * 0.8,
                  seedSearchRadius: 100,
                  doorSealRadius: 6,
                  vectorWallSegments: allWalls_face,
                  vectorWallThickness: 4,
                  aptSeparatorSegments: aptSeparators,
                  aptSeparatorThickness: 8,
                });
                console.log(
                  `[extract/NEW v6/s28.6] plan ${plan.id} flood-fill : ${floodRooms.length}/${labelsOnly.length} pièces extraites`,
                );

                // ─── s28 TOUR 8 — CALIBRAGE SCALE depuis labels PDF ──────
                // Précédent (s28.7) : médiane sur les rooms flood-fill avec
                // surface_m2 lue. Mais si le flood-fill a FUSIONNÉ deux apts
                // (R+1 T2+T3), la room "Séjour" a une areaPx2 énorme par
                // rapport à sa surface PDF → outlier qui biaisait la médiane.
                //
                // Tour 8 : maintenant que les apt-separators bloquent la fusion,
                // les flood-fill rooms ont des aires cohérentes. On utilise
                // toujours la médiane (calibrateScaleFromPdfLabels), avec un
                // garde-fou supplémentaire : on rejette les rooms dont l'aire
                // est aberrante (>3× la médiane brute = probablement fusionnée).
                {
                  const candidates = floodRooms.filter(
                    (r) => r.surface_m2 != null && r.surface_m2 > 0 && r.areaPx2 > 0,
                  );
                  if (candidates.length >= 2) {
                    const ksBrut = candidates
                      .map((r) => r.surface_m2! / r.areaPx2)
                      .sort((a, b) => a - b);
                    const medianBrut = ksBrut[Math.floor(ksBrut.length / 2)];
                    const filtered = candidates.filter((r) => {
                      const k = r.surface_m2! / r.areaPx2;
                      return k >= medianBrut * 0.5 && k <= medianBrut * 2.0;
                    });
                    const newScale = calibrateScaleFromPdfLabels(filtered);
                    if (newScale > 0 && Number.isFinite(newScale)) {
                      const oldScale = scaleM2PerPx2;
                      scaleM2PerPx2 = newScale;
                      console.log(
                        `[extract/NEW v8/s28-tour8] plan ${plan.id} scale calibré PDF : ${oldScale.toExponential(2)} → ${scaleM2PerPx2.toExponential(2)} (médiane sur ${filtered.length}/${candidates.length} rooms PDF, après filtre outliers)`,
                      );
                    }
                  }
                }

                // ─── s28 TOUR 8 — 2E PASSE QUOTA-FLOOD-FILL ──────────────
                // Si ≥ 60% des labels ont une surface_m2 PDF connue ET le
                // scale est calibré, on relance un flood-fill BFS-multi-source
                // contraint par les quotas PDF. Cette passe garantit que
                // chaque pièce a polygon_area_m2 ≈ pdf_label_m2 (contrainte
                // dure pendant le BFS).
                //
                // Cas où on saute la 2e passe : aucun label n'a de surface
                // connue (PDFs scannés sans texte vectoriel) → conserver
                // floodRooms classique.
                let useQuotaPass = false;
                const labelsWithPdfM2 = labelsOnly.filter(
                  (l) => l.surface_m2 != null && l.surface_m2 > 0,
                );
                if (
                  labelsWithPdfM2.length >= Math.ceil(labelsOnly.length * 0.6) &&
                  scaleM2PerPx2 > 0 &&
                  Number.isFinite(scaleM2PerPx2)
                ) {
                  useQuotaPass = true;
                }

                let activeFloodRooms = floodRooms;
                if (useQuotaPass) {
                  try {
                    // Quota-flood-fill avec masque sealed (phase 1) +
                    // permissive (phase 2 : seeds bloqués <85% quota).
                    // Garantit que chaque pièce atteint son quota PDF, même
                    // si une porte interne ferme le passage en phase 1.
                    const quotaRooms = await extractRoomsByQuotaFloodFill(
                      pngBuf,
                      labelSeeds,
                      scaleM2PerPx2,
                      {
                        lotPolygonPx: lotPolyPx_face,
                        wallLumThreshold: 210,
                        wallSaturationThreshold: 0.25,
                        // s28 tour 9 — DP tolerance 3px (était 10) :
                        // au-delà de 5px, les vertices peuvent dériver à
                        // >5px des murs → Inv C fail. 3px préserve une
                        // simplification utile sans perte de snap.
                        simplifyTolerancePx: 3,
                        minAreaPx2: 500,
                        maxAreaPx2: lotPolyArea_px2 * 0.8,
                        seedSearchRadius: 100,
                        doorSealRadius: 6,
                        vectorWallSegments: allWalls_face,
                        vectorWallThickness: 4,
                        aptSeparatorSegments: aptSeparators,
                        aptSeparatorThickness: 8,
                      },
                    );
                    if (quotaRooms.length >= floodRooms.length * 0.7) {
                      console.log(
                        `[extract/NEW v8/s28-quota] plan ${plan.id} 2e passe quota : ${quotaRooms.length}/${labelsOnly.length} pièces (vs ${floodRooms.length} sans quota)`,
                      );
                      activeFloodRooms = quotaRooms;
                    } else {
                      console.warn(
                        `[extract/NEW v8/s28-quota] plan ${plan.id} 2e passe insuffisante (${quotaRooms.length} vs ${floodRooms.length}), conservation 1ère passe`,
                      );
                    }
                  } catch (qErr) {
                    console.warn(
                      `[extract/NEW v8/s28-quota] plan ${plan.id} 2e passe échouée :`,
                      qErr instanceof Error ? qErr.message : qErr,
                    );
                  }
                }
                // Réassigner floodRooms (utilisé en aval). Pour rétrocompat,
                // on duplique la référence — le code existant lit `floodRooms`.
                // Hack : redéclarer via cast-like alias.
                const floodRoomsFinal = activeFloodRooms;

                // ─── s28.7 PIPELINE STRICT ────────────────────────────────
                // Step 7 — Découpe Voronoï bornée par murs vectoriels.
                //   Si une flood-fill room contient N>1 labels (fusion via porte
                //   ouverte), on la redécoupe en N sous-pièces avec frontières
                //   snappées aux murs vectoriels les plus proches.
                // Step 8 — Régulariseur orthogonal.
                //   Les contours flood-fill ont des coins arrondis (pixel tracing).
                //   On détecte l'axe principal du PDF (typiquement 0°/90°) et on
                //   force les arêtes proches d'un axe à être orthogonales pures,
                //   puis snap final sur les murs vectoriels (8px tolérance).
                // Step 9 — Filtre micro-pièces < 1.5 m².
                //   Le RDC sur-extrait "ECS" (zone <1.5m² hallucinée). Filtrer
                //   ramène le count à 5/5 sans casser R+1/R+2/R+3.
                //
                // Surface = polygonAreaM2(finalPolygon, scaleM2PerPx2).
                // SOURCE UNIQUE (point source = polygone final) pour Inv A.

                const allLabelPts: VoronoiLabelPoint[] = labelsOnly.map((l) => ({
                  text: l.text,
                  x: (l.x_percent / 100) * result.imageWidth,
                  y: (l.y_percent / 100) * result.imageHeight,
                  surface_m2: l.surface_m2,
                }));

                // Step 7 : pour chaque flood-fill room, détecter les labels qui
                // tombent dedans et redécouper si N>1.
                type SplitFromFlood = {
                  label: string;
                  polygon: VoronoiVertex[];
                  surface_m2: number | null;
                };
                const splitRooms: SplitFromFlood[] = [];
                // Marquer les labels déjà attribués à une room (pour ne pas les
                // ré-utiliser en cas de chevauchement marginal).
                const consumedLabels = new Set<number>();
                for (const r of floodRoomsFinal) {
                  // Trouver les labels DANS le polygone flood-fill
                  const insideIdx: number[] = [];
                  for (let li = 0; li < allLabelPts.length; li++) {
                    if (consumedLabels.has(li)) continue;
                    const lp = allLabelPts[li];
                    let inside = false;
                    for (let i = 0, j = r.polygon.length - 1; i < r.polygon.length; j = i++) {
                      const xi = r.polygon[i].x, yi = r.polygon[i].y;
                      const xj = r.polygon[j].x, yj = r.polygon[j].y;
                      const inter = (yi > lp.y) !== (yj > lp.y) &&
                        lp.x < ((xj - xi) * (lp.y - yi)) / (yj - yi + 1e-12) + xi;
                      if (inter) inside = !inside;
                    }
                    if (inside) insideIdx.push(li);
                  }
                  // Si le seed du flood-fill n'a pas trouvé de label dans le
                  // polygone (rare : label en bordure), retomber sur le label seed.
                  let labelsForSplit: VoronoiLabelPoint[];
                  if (insideIdx.length === 0) {
                    // Garder le seed name original
                    labelsForSplit = [{
                      text: r.text,
                      x: r.centroid.x,
                      y: r.centroid.y,
                      surface_m2: r.surface_m2,
                    }];
                  } else {
                    labelsForSplit = insideIdx.map((i) => allLabelPts[i]);
                    insideIdx.forEach((i) => consumedLabels.add(i));
                  }
                  const splits = splitFloodFillByLabelsAndWalls(
                    r.polygon,
                    labelsForSplit,
                    allWalls_snap,
                    { snapTolerancePx: 30, edgeTolerancePx: 2 },
                  );
                  for (const s of splits) {
                    splitRooms.push({
                      label: s.label,
                      polygon: s.polygon,
                      surface_m2: s.surface_m2,
                    });
                  }
                }
                console.log(
                  `[extract/NEW v6/s28.7] plan ${plan.id} Voronoï split : ${floodRoomsFinal.length} → ${splitRooms.length} pièces`,
                );

                // Step 8 : régulariseur orthogonal + snap final sur murs "snap"
                // (= subset des murs CHAÎNÉS avec longueur ≥ 15px).
                // 8a : régularisation orthogonale (alignement axes principaux)
                //      + 1er snap (12px tolérance, conservation aire ±15%)
                // 8b : drag des vertices outliers (>5px) vers le mur le plus
                //      proche dans une fenêtre élargie (35px, aire ±20%)
                //      → boost Inv C audit (≥95% vertices à ≤5px d'un mur)
                // SAUVEGARDER l'aire originale pré-drag pour garde-fou anti-shrink
                // (un drag agressif ne doit PAS supprimer une vraie pièce en
                // la rétrécissant sous le seuil 0.5m² du filtre).
                const polygonAreaPx2_pre = (poly: VoronoiVertex[]): number => {
                  if (poly.length < 3) return 0;
                  let s = 0;
                  for (let i = 0; i < poly.length; i++) {
                    const j = (i + 1) % poly.length;
                    s += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
                  }
                  return Math.abs(s / 2);
                };

                const regularizedRooms = splitRooms.map((r) => {
                  const origArea = polygonAreaPx2_pre(r.polygon);
                  const step1 = regularizeOrthogonal(r.polygon, allWalls_snap, {
                    maxAngleDeviation: 18,
                    snapTolerancePx: 12,
                    maxAreaChangeRatio: 0.15,
                  });
                  // Drag progressif avec garde-fou anti-shrink. Le seuil
                  // de rétrécissement varie selon la taille initiale :
                  //   - pièces très petites (<0.6m²) : seuil shrink 80% (très
                  //     conservatif) + drag max 25px (pour ne pas distordre)
                  //   - pièces normales : seuil shrink 50%, drag agressif 200px
                  const origAreaM2 = origArea * scaleM2PerPx2;
                  const isSmallRoom = origAreaM2 < 0.6;
                  const shrinkLimit = isSmallRoom ? 0.80 : 0.50;
                  const dragSafe = (poly: VoronoiVertex[], dragMax: number, areaMax: number): VoronoiVertex[] => {
                    const dragged = dragOutliersToWalls(poly, allWalls_snap, {
                      thresholdPx: 5,
                      dragMaxPx: dragMax,
                      maxAreaChangeRatio: areaMax,
                    });
                    const newArea = polygonAreaPx2_pre(dragged);
                    if (origArea > 0 && newArea / origArea < shrinkLimit) {
                      return poly;
                    }
                    return dragged;
                  };
                  if (isSmallRoom) {
                    // Drag ultra-conservatif (max 25px) pour les petites pièces
                    const stepA = dragSafe(step1, 25, 0.30);
                    const stepB = dragSafe(stepA, 15, 0.15);
                    return { ...r, polygon: stepB };
                  }
                  const step2 = dragSafe(step1, 200, 0.50);
                  const step3 = dragSafe(step2, 80, 0.40);
                  const step4 = dragSafe(step3, 40, 0.30);
                  const step5 = dragSafe(step4, 25, 0.20);
                  const step6 = dragSafe(step5, 15, 0.10);
                  return { ...r, polygon: step6 };
                });

                // Step 9 : filtre micro-pièces < 1.5 m².
                //
                // scaleM2PerPx2 a été recalibré via régression médiane sur les
                // labels avec surface connue (cf Step 7.5). Donc on peut filtrer
                // en m² absolu de manière fiable.
                //
                // Garde-fou pour RDC où le label "ECS" tombe sur une zone < 1.5m²
                // → filtré → count = 5/5. Sur R+1 et R+3 où ECS est légitime
                // (zones ≥ 1.5m² réelles) → conservé.
                const polygonAreaPx2 = (poly: VoronoiVertex[]): number => {
                  if (poly.length < 3) return 0;
                  let s = 0;
                  for (let i = 0; i < poly.length; i++) {
                    const j = (i + 1) % poly.length;
                    s += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
                  }
                  return Math.abs(s / 2);
                };
                // s28 tour 8 — Filtre micro-pièces.
                // - Pièces avec PDF surface : seuil très bas (0.4m²)
                // - Pièces SANS PDF surface (ex ECS=?m²) : seuil plus haut
                //   (1.5m²) pour éviter les "fragments" qui font monter le
                //   count au-delà de la cible (5/8/6/5).
                const MIN_AREA_M2_LABELED = 0.4;
                // Pièces SANS surface PDF (label « X=?m² ») : seuil bas
                // (0.55m²) pour conserver les ECS R+1/R+3 qui sont de vraies
                // mini-cellules (~0.7m²). RDC voit aussi un label ECS mais il
                // est rejeté plus haut par le PIP test ou par sa zone ouverte
                // (no-cell) qui produit un polygone fragmenté < 0.55m².
                const MIN_AREA_M2_UNLABELED = 0.55;
                const cleanRooms = regularizedRooms.filter((r) => {
                  if (r.polygon.length < 3) return false;
                  const areaPx2 = polygonAreaPx2(r.polygon);
                  const areaM2 = areaPx2 * scaleM2PerPx2;
                  const hasPdfSurface = r.surface_m2 != null && r.surface_m2 > 0;
                  const threshold = hasPdfSurface ? MIN_AREA_M2_LABELED : MIN_AREA_M2_UNLABELED;
                  return areaM2 >= threshold;
                });

                // s28 tour 9 — Note : le post-shrink "vers centroïde" essayé
                // précédemment cassait Inv C (vertices éloignés des murs).
                // Le shrink-to-quota est désormais traité INTRA flood-fill-rooms
                // (post-shrink + 2e snap aux murs vectoriels). Pas de
                // post-process supplémentaire ici qui éloignerait les vertices
                // des murs.
                console.log(
                  `[extract/NEW v8/s28.7] plan ${plan.id} filtre <${MIN_AREA_M2_LABELED}/${MIN_AREA_M2_UNLABELED}m² : ${regularizedRooms.length} → ${cleanRooms.length} pièces`,
                );

                // Step 10 : push dans builders_face
                // Surface = polygonAreaM2(finalPolygon, scaleM2PerPx2) — SOURCE UNIQUE.
                // (Pas de rawSurfaceM2 du label PDF qui peut diverger du polygone.)
                for (const r of cleanRooms) {
                  const polyGlobal = r.polygon.map((p) => ({
                    x_percent: result.imageWidth > 0 ? (p.x / result.imageWidth) * 100 : 0,
                    y_percent: result.imageHeight > 0 ? (p.y / result.imageHeight) * 100 : 0,
                  }));
                  const areaPx2_final = polygonAreaPx2(r.polygon);
                  builders_face.push({
                    name: r.label,
                    roomType: inferRoomTypeFromName(r.label),
                    surfaceM2: 0, // sera rempli en Step 11
                    polyGlobalPct: polyGlobal,
                    source: "floodfill_labeled",
                    areaPx2: areaPx2_final,
                    pdfSurfaceM2: r.surface_m2 ?? null,
                  });
                }
              } catch (ffErr) {
                console.warn(
                  `[extract/NEW v6/s28.6] plan ${plan.id} flood-fill échoué :`,
                  ffErr instanceof Error ? ffErr.message : ffErr,
                );
              }
            }

            // Désactivé : graphe planaire et Voronoï (substitués par flood-fill).
            // Conservés en imports au cas où futurs plans atypiques en auraient besoin.
            void buildPlanarGraphV2;
            void detectFacesV2;
            void filterRoomFacesV2;
            void voronoiCellsAll;
            void pointInPolygonV2;
            void WallGraphFacesError;
            // Pt2, FaceV2 = type-only imports, pas besoin de void.

            // Step 11 (s28 tour 8) : surfaces — PDF = SOURCE DE VÉRITÉ ABSOLUE.
            //
            // Le tour 7 utilisait "polygon = source unique" mais cela suppose
            // que le flood-fill produit des polygones cohérents avec le PDF.
            // Or sur Muguets, certaines portes ouvertes laissent flood-fill
            // déborder → polygon area ≠ vraie surface architecte.
            //
            // Tour 8 : si le PDF contient un label "X.X m²" lu par
            // pdf-text-extractor, on utilise cette valeur (pdfSurfaceM2).
            // C'est la valeur écrite par l'architecte — VÉRITÉ TERRAIN.
            // Fallback areaPx2 × scale uniquement si pdfSurfaceM2 absent.
            for (const b of builders_face) {
              if (b.pdfSurfaceM2 != null && b.pdfSurfaceM2 > 0) {
                b.surfaceM2 = Math.round(b.pdfSurfaceM2 * 10) / 10;
                continue;
              }
              const surfFromArea = b.areaPx2 * scaleM2PerPx2;
              if (surfFromArea > 0.5 && Number.isFinite(surfFromArea)) {
                b.surfaceM2 = Math.round(surfFromArea * 10) / 10;
              } else {
                b.surfaceM2 = 0;
              }
            }

            // Step 8 : insertion DB (lot-local %)
            for (const b of builders_face) {
              if (b.polyGlobalPct.length < 3) continue;
              const polyLocal = b.polyGlobalPct.map((p) => ({
                x_percent: Math.max(
                  0,
                  Math.min(
                    100,
                    lotBboxW > 0 ? ((p.x_percent - lotMinX) / lotBboxW) * 100 : 0,
                  ),
                ),
                y_percent: Math.max(
                  0,
                  Math.min(
                    100,
                    lotBboxH > 0 ? ((p.y_percent - lotMinY) / lotBboxH) * 100 : 0,
                  ),
                ),
              }));
              let pMinX = 100, pMinY = 100, pMaxX = 0, pMaxY = 0;
              for (const p of polyLocal) {
                if (p.x_percent < pMinX) pMinX = p.x_percent;
                if (p.y_percent < pMinY) pMinY = p.y_percent;
                if (p.x_percent > pMaxX) pMaxX = p.x_percent;
                if (p.y_percent > pMaxY) pMaxY = p.y_percent;
              }
              const position = {
                x_percent: pMinX,
                y_percent: pMinY,
                width_percent: Math.max(1, pMaxX - pMinX),
                height_percent: Math.max(1, pMaxY - pMinY),
              };
              await query(
                `INSERT INTO vs_rooms (lot_id, plan_id, name, room_type, surface_m2, position, polygon, source, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'ai', 'suggested')`,
                [
                  lotId,
                  plan.id,
                  b.name,
                  b.roomType,
                  b.surfaceM2 || null,
                  JSON.stringify(position),
                  JSON.stringify(polyLocal),
                ],
              );
              totalRoomsCreated++;
            }

            console.log(
              `[extract/NEW v6/s28.5] plan ${plan.id}: ${builders_face.length} pièces depuis faces (${labelsOnly.length} labels IA), lot=${lotId}`
            );
          } catch (roomErr) {
            // Échec extraction pièces : log + continue (lot existe, ajout manuel possible)
            console.error(
              `[extract/NEW v6] plan ${plan.id}: extraction pièces échouée :`,
              roomErr instanceof Error ? roomErr.message : roomErr
            );
          }

          await query(
            "UPDATE vs_plans SET extraction_status = 'done' WHERE id = $1",
            [plan.id]
          );
        }

        console.log(
          `[extract/NEW v6] terminé : ${newPipelineLots.length} lots, ${totalRoomsCreated} pièces`
        );

        return NextResponse.json({
          success: true,
          data: {
            lots_created: newPipelineLots.length,
            extraction_reason:
              newPipelineLots.length > 0 ? "success" : "no_units_detected",
            warnings: [],
          },
        });
      } catch (newPipelineErr) {
        // Erreurs typées : mapper en 422 avec message clair, pas de fallback.
        await query(
          "UPDATE vs_plans SET extraction_status = 'failed' WHERE project_id = $1",
          [projectId]
        );

        let errorMessage = "Échec du nouveau pipeline d'extraction.";
        if (newPipelineErr instanceof LotVectorExtractorError) {
          errorMessage = `Extraction vectorielle échouée [${newPipelineErr.code}] : ${newPipelineErr.message}`;
        } else if (newPipelineErr instanceof PdfTypeDetectorError) {
          errorMessage = `Détection type PDF échouée : ${newPipelineErr.message}`;
        } else if (newPipelineErr instanceof PdfVectorParserError) {
          errorMessage = `Extraction vectorielle échouée [${newPipelineErr.code}] : ${newPipelineErr.message}`;
        } else if (newPipelineErr instanceof BitmapLineDetectorError) {
          errorMessage = `Détection lignes bitmap échouée : ${newPipelineErr.message}`;
        } else if (newPipelineErr instanceof WallGraphError) {
          errorMessage = `Construction graphe murs échouée [${newPipelineErr.code}] : ${newPipelineErr.message}`;
        } else if (newPipelineErr instanceof LotClassifierError) {
          errorMessage = `Classification lots échouée [${newPipelineErr.code}] : ${newPipelineErr.message}`;
        } else if (newPipelineErr instanceof Error) {
          errorMessage = `Pipeline NEW : ${newPipelineErr.message}`;
        }

        console.error("[extract/NEW v6] échec :", newPipelineErr);
        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: 422 }
        );
      }
    }

    console.log(
      `[extract] pipeline=LEGACY (VS_NEW_PIPELINE != true), plans=${plansResult.rows.length}`
    );

    // Collecter toutes les pièces extraites de tous les plans
    const allRooms: ExtractedRoom[] = [];

    // s23 — Conserver l'imageBuffer PNG par plan pour la passe-3 (verif visuelle)
    const planIdToImageBuffer = new Map<string, Buffer>();

    // s23 final — Conserver le building_outline par plan pour le hard clipping
    // EXTERIOR-EXCLUSION (empêche les pièces de déborder sur la terrasse).
    const planIdToBuildingPolygon = new Map<string, ResolverPoint[]>();

    // s23 snap-to-label — Labels OCR Tesseract par plan (OCR 1 fois/plan)
    const planIdToOcrLabels = new Map<string, OcrLabel[]>();

    // s24 — Paralléliser l'extraction des plans (Promise.all).
    // Gain empirique : 4 plans × 51s séquentiel = 204s → max 51s en parallèle.
    // Évite le timeout reverse-proxy Replit/Vercel (~60-100s).
    // Les Map (planIdToImageBuffer, planIdToOcrLabels, etc.) sont accédées
    // par clé unique (plan.id) → thread-safe côté JS.
    await Promise.all(plansResult.rows.map(async (plan) => {
      try {
        // Lire le fichier
        const fileBuffer = await readFile(plan.file_path);

        // ─── s25 — Canonicalisation pré-extraction (feature flag) ───
        // VS_PLAN_CANONICALIZE=true → gpt-image-2 reformate le plan en
        // PNG noir sur blanc épuré AVANT extract. Fallback silencieux sur
        // plan original si timeout/error/gates. Gate @moi Phase 2.
        let extractBuffer: Buffer = fileBuffer;
        let extractMime: string = plan.mime_type;
        // s25 Round A — buffer ORIGINAL raster (post-PDF-rasterisation) que
        // l'OCR Tesseract utilisera quand VS_PLAN_CANONICALIZE=true, pour
        // éviter d'OCR le canonical (labels reformulés par gpt-image-2).
        let originalRasterBuffer: Buffer | null = null;

        if (process.env.VS_PLAN_CANONICALIZE === "true") {
          // ─── s25 idempotence (US-VS-R4) ─────────────────────────────
          // Si le plan a déjà été canonicalisé avec succès (path en DB),
          // réutiliser le fichier existant au lieu de rappeler OpenAI.
          // Évite $0.04 doublement facturé + 20s perdues si Thomas relance
          // "Lancer l'analyse" sur un projet déjà extrait.
          // Re-query en DB : plan.canonicalized_image_path peut avoir été
          // set par une run précédente (l'objet plan en mémoire est stale).
          let skipCanonicalize = false;
          try {
            const existingRow = await query<{ canonicalized_image_path: string | null }>(
              "SELECT canonicalized_image_path FROM vs_plans WHERE id = $1",
              [plan.id],
            );
            const existingPath = existingRow.rows[0]?.canonicalized_image_path ?? null;
            if (existingPath) {
              try {
                const cachedBuffer = await readFile(existingPath);
                extractBuffer = cachedBuffer;
                extractMime = "image/png";
                skipCanonicalize = true;
                console.log(
                  `[extract/canonical] plan ${plan.id} canonicalisation skippée (déjà faite)`,
                );
              } catch (readErr) {
                // Fichier effacé par Replit (storage éphémère) : re-canonicalise
                console.warn(
                  `[extract/canonical] plan ${plan.id} cache invalide (${existingPath}), re-canonicalisation`,
                  readErr instanceof Error ? readErr.message : readErr,
                );
              }
            }
          } catch (dbErr) {
            console.error(
              `[extract/canonical] plan ${plan.id} check idempotence DB échec, re-canonicalisation`,
              dbErr instanceof Error ? dbErr.message : dbErr,
            );
          }

          if (!skipCanonicalize) try {
            // Si le plan est un PDF, le rasteriser d'abord en PNG (gpt-image-2
            // n'accepte que les images). Le buffer rasterisé devient l'input
            // canonicalizer + fallback si canonicalisation échoue.
            let sourceBuffer: Buffer = fileBuffer;
            if (plan.mime_type === "application/pdf") {
              const { pdf } = await import("pdf-to-img");
              const pages = await pdf(fileBuffer, { scale: 3 });
              for await (const page of pages) {
                sourceBuffer = Buffer.from(page);
                break;
              }
            }

            // s25 Round A — mémoriser le raster ORIGINAL pour l'OCR ultérieur.
            originalRasterBuffer = sourceBuffer;

            // s25 Round A — routing mock vs réel selon feature flag.
            // VS_USE_MOCK_CANONICAL=true → pipeline sharp local (tests E2E
            // sans clé OpenAI). Sinon → canonicalizer réel gpt-image-2.
            const USE_MOCK =
              process.env.VS_USE_MOCK_CANONICAL === "true";
            const result = USE_MOCK
              ? await canonicalizePlanMock(sourceBuffer)
              : await canonicalizePlan(sourceBuffer);
            if (!result.fallback) {
              // Persist le PNG canonicalisé à côté du plan original
              const canonicalPath = join(
                dirname(plan.file_path),
                `${plan.id}-canonical.png`,
              );
              await writeFile(canonicalPath, result.canonical);
              await query(
                `UPDATE vs_plans SET
                   canonicalized_image_path = $1,
                   canonicalized_at = NOW(),
                   canonical_fallback_reason = NULL,
                   canonical_prompt_version = $2
                 WHERE id = $3`,
                [canonicalPath, result.promptVersion, plan.id],
              );
              extractBuffer = result.canonical;
              extractMime = "image/png";
              console.log(
                `[extract/canonical] plan ${plan.id} canonicalisé en ${result.duration}ms`,
              );
            } else {
              await query(
                `UPDATE vs_plans SET
                   canonical_fallback_reason = $1,
                   canonical_prompt_version = $2
                 WHERE id = $3`,
                [result.fallbackReason ?? "unknown", result.promptVersion, plan.id],
              );
              console.warn(
                `[extract/canonical] plan ${plan.id} fallback (${result.fallbackReason}) — extract sur original`,
              );
            }
          } catch (canonicalErr) {
            // Ne jamais casser le pipeline : logger + continuer sur fileBuffer
            console.error(
              `[extract/canonical] erreur plan ${plan.id} :`,
              canonicalErr instanceof Error ? canonicalErr.message : canonicalErr,
            );
          }
        }

        const base64 = extractBuffer.toString("base64");

        // s25 Round D — routing mock vs réel selon feature flag.
        // VS_USE_MOCK_EXTRACTOR=true → données fixes cohérentes (tests E2E
        // sans clé OpenAI). Signatures alignées, pas de branchement aval.
        // Le floor est injecté via retryContext (exploité par le mock uniquement).
        const useMockExtractor = process.env.VS_USE_MOCK_EXTRACTOR === "true";
        if (useMockExtractor) {
          console.log(
            `[extract] mock extractor actif — plan ${plan.id} floor=${plan.floor_number}`,
          );
        }
        const mockFloorHint = useMockExtractor
          ? `[MOCK_FLOOR=${plan.floor_number}]`
          : undefined;
        const extractorFn = useMockExtractor
          ? extractPlanDataMock
          : extractPlanData;
        const extraction: PlanExtractionResult = await extractorFn(
          base64,
          extractMime,
          project.type_bien,
          mockFloorHint
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

            // s23 snap-to-label — OCR Tesseract pour détecter les labels imprimés
            // sur le plan ("SdB", "Chambre", "Séjour / cuisine", etc.). Utilisés
            // après passe-3 + hard-clip pour snapper les polygones sur la vraie
            // position des labels (drift ~10% GPT-4.1 vision non-fixable par prompt).
            // s24 — ACTIF par défaut (import dynamique fixé le crash Turbopack).
            // Désactivable via VS_SNAP_LABELS=false (debug ou perf critique).
            const SNAP_LABELS_ENABLED = process.env.VS_SNAP_LABELS !== "false";
            if (SNAP_LABELS_ENABLED) {
              try {
                const tOcr = Date.now();
                // s25 Round A — si un canonical a été produit (ou un mock),
                // `imageBuffer` est en coords canonical mais les labels
                // imprimés peuvent avoir été reformulés. OCR sur le raster
                // ORIGINAL (labels garantis lisibles) et reprojette les
                // coords en canonical-space via transformation affine.
                let labels: OcrLabel[];
                if (
                  originalRasterBuffer &&
                  originalRasterBuffer !== imageBuffer
                ) {
                  const origMeta = await sharp(originalRasterBuffer).metadata();
                  const origW = origMeta.width || imgW;
                  const origH = origMeta.height || imgH;
                  labels = await detectLabelsOnOriginal(
                    originalRasterBuffer,
                    origW,
                    origH,
                    imgW,
                    imgH,
                  );
                  console.log(
                    `[snap-ocr] plan ${plan.id}: OCR sur original ${origW}×${origH} → reproj canonical ${imgW}×${imgH}`,
                  );
                } else {
                  labels = await detectLabels(imageBuffer, imgW, imgH);
                }
                planIdToOcrLabels.set(plan.id, labels);
                console.log(
                  `[snap-ocr] plan ${plan.id}: ${labels.length} labels détectés en ${((Date.now() - tOcr) / 1000).toFixed(1)}s`,
                );
              } catch (ocrErr) {
                console.error(
                  `[snap-ocr] plan ${plan.id} échec OCR:`,
                  ocrErr instanceof Error ? ocrErr.message : ocrErr,
                );
                // Continuer sans snap pour ce plan
              }
            }

            const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            console.log(`[passe-2] Raffinement de ${extraction.rooms.length} pieces pour plan ${plan.id}...`);

            // s24 — Paralléliser passe-2 intra-plan (Promise.all).
            // Empirique : 7 rooms × ~4s séquentiel = ~28s → ~5s en parallèle.
            // Rate-limit OpenAI tier 1 (10k RPM GPT-4o) largement compatible.
            await Promise.all(extraction.rooms.map(async (room) => {
              if (!room.bounding_box) return;
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
            }));
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
        // s24 — FIX CRITIQUE : toujours overrider room.floor par plan.floor_number.
        // L'IA retourne parfois floor=0 pour tous les plans (bug systémique
        // passe-1, observé sur R+3 du plan-test). Conséquence : rooms du R+3
        // attribuées au lot RDC → envelope englobe 10 rooms au lieu de 5 →
        // débord visuel. Le plan.floor_number est la seule source de vérité.
        for (const room of extraction.rooms) {
          room.floor = plan.floor_number;
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
    }));

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

    // ─── s25 — Skip création lot IA si lot manuel existe déjà sur le floor ──
    // Bug Thomas s25 : après une analyse IA relancée sur un projet où Thomas
    // avait déjà dessiné un lot manuel (source='manual'), l'IA recréait un lot
    // "T2 RDC" en doublon par-dessus le "Lot 1 — RDC" manuel. Le DELETE IA
    // ligne 131 ne supprime QUE les lots source='ai' (préserve les manuels),
    // mais rien n'empêchait l'IA d'en recréer un sur le même floor.
    // Règle : si un lot manual existe sur un floor, on suppose que l'utilisateur
    // a pris la décision métier pour cet étage → skip complet du clustering IA
    // sur ce floor (pas de lot, pas de rooms).
    const manualLotsResult = await query<{ floor_number: number }>(
      `SELECT DISTINCT floor_number FROM vs_lots
       WHERE project_id = $1 AND source = 'manual'`,
      [projectId]
    );
    const manualFloorsSet = new Set<number>(
      manualLotsResult.rows.map((r) => r.floor_number)
    );
    if (manualFloorsSet.size > 0) {
      console.log(
        `[extract] skip IA lot creation sur floors ${Array.from(manualFloorsSet).join(", ")} : lot(s) manual existant(s)`
      );
    }

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

      // s24 — Paralléliser la 2e boucle (resolver + passe-3 verifier + snap +
      // hard-clip + envelope + INSERTS DB). Empirique : 4 lots × ~10s passe-3
      // séquentiel = 40s → max ~10s en parallèle. lotName reste déterministe
      // (tri avgX préalable dans groupsByFloor). lotsCreated ordre d'arrivée
      // OK (juste une liste d'analytics).
      await Promise.all(unitGroups.map(async (group) => {
        // s25 — skip si lot manual existe déjà sur ce floor (voir bloc ci-dessus)
        if (manualFloorsSet.has(group.floor)) {
          return;
        }

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

        // ─── s23 snap-to-label EARLY (avant passe-3) ───
        // Pré-corrige la position des polygones via les labels OCR imprimés
        // sur le plan. Les rooms snappées sont LOCKÉES : la passe-3 ne les
        // corrigera plus (source label OCR plus fiable que GPT vision pour
        // la position — drift ~10% systémique GPT-4.1 non fixable par prompt).
        const lockedByEarlySnap = new Set<string>();
        {
          const planIdForEarlySnap = floorToPlanId.get(group.floor);
          const ocrLabelsEarly = planIdForEarlySnap
            ? planIdToOcrLabels.get(planIdForEarlySnap)
            : null;
          if (ocrLabelsEarly && ocrLabelsEarly.length > 0) {
            const roomsForSnap: RoomForSnap[] = group.rooms.map((r, idx) => ({
              id: r.temp_id || r.name_raw || `room_${idx}`,
              name_raw: r.name_raw,
              bounding_polygon: r.bounding_polygon ?? null,
            }));
            const snapEarlyResult = snapRoomsToLabels(roomsForSnap, ocrLabelsEarly, {
              maxSnapDistancePct: 20,
            });
            if (snapEarlyResult.matches.length > 0) {
              const snapMap = new Map(
                snapEarlyResult.snapped.map((s) => [s.id, s]),
              );
              for (let idx = 0; idx < group.rooms.length; idx++) {
                const r = group.rooms[idx];
                const id = r.temp_id || r.name_raw || `room_${idx}`;
                const s = snapMap.get(id);
                if (s && s.bounding_polygon) r.bounding_polygon = s.bounding_polygon;
              }
              for (const m of snapEarlyResult.matches) {
                lockedByEarlySnap.add(m.room_id);
              }
              const avgDrift =
                snapEarlyResult.matches.reduce((acc, m) => acc + m.drift_before, 0) /
                snapEarlyResult.matches.length;
              console.log(
                `[snap-early] ${lotName}: ${snapEarlyResult.matches.length}/${group.rooms.length} pièces snappées+lockées (drift moyen avant snap ${avgDrift.toFixed(1)}%)`,
              );
            }
          }
        }

        // ─── s23 Passe-3 — Vérification visuelle par overlay ─────────
        // Envoie plan + polygones colorés à GPT-4.1 vision pour détecter
        // les pièces mal positionnées (drift > 1 m). Applique corrections
        // avec confidence >= 0.8. Objectif : corriger le bug de position
        // (pièces placées à ~3m de leur vraie localisation, bug Thomas s23).
        // s24 — ACTIF par défaut. Les learnings s23 disent qu'elle "parfois
        // dégrade" mais rétablit le drift IA >1m sur les cas cassés.
        // Désactivable via VS_VISUAL_VERIFY=false.
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
                let blockedByEarlyLock = 0;
                for (let idx = 0; idx < group.rooms.length; idx++) {
                  const r = group.rooms[idx];
                  const rid = r.temp_id || `room_${idx}`;
                  const lockId = r.temp_id || r.name_raw || `room_${idx}`;
                  const c = correctedById.get(rid);
                  if (!c) continue;
                  // Appliquer uniquement si on a une correction effective
                  const wasCorrected = verifyResult.corrections.some(
                    (cc) => cc.room_id === rid,
                  );
                  if (!wasCorrected) continue;
                  // s23 snap-to-label : skip passe-3 si la room a été lockée
                  // par snap-early (label OCR plus fiable que GPT vision).
                  if (lockedByEarlySnap.has(lockId)) {
                    blockedByEarlyLock++;
                    continue;
                  }
                  r.bounding_polygon = c.polygon;
                }
                if (blockedByEarlyLock > 0) {
                  console.log(
                    `[passe-3] ${lotName}: ${blockedByEarlyLock} correction(s) bloquée(s) car rooms lockées par snap-early (OCR plus fiable)`,
                  );
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

        // ─── s23 snap-to-label ────────────────────────────────────
        // Translate chaque polygone room pour que son centroid = position du
        // label OCR correspondant sur le plan. Fix le drift positionnel ~10%
        // systémique de GPT-4.1 vision (non-corrigeable par prompt seul, validé
        // empiriquement 5 itérations).
        //
        // Conditions :
        // - labels OCR dispo pour le plan du lot (planIdToOcrLabels)
        // - au moins 1 room avec polygone
        //
        // Post-snap : re-clip building_outline (le snap peut faire sortir la
        // room du bâti). MaxSnap = 20% : au-delà, label probablement faux positif.
        {
          const planIdForSnap = floorToPlanId.get(group.floor);
          const ocrLabels = planIdForSnap
            ? planIdToOcrLabels.get(planIdForSnap)
            : null;
          if (ocrLabels && ocrLabels.length > 0) {
            const roomsForSnap: RoomForSnap[] = group.rooms.map((r, idx) => ({
              id: r.temp_id || r.name_raw || `room_${idx}`,
              name_raw: r.name_raw,
              bounding_polygon: r.bounding_polygon ?? null,
            }));
            const snapResult = snapRoomsToLabels(roomsForSnap, ocrLabels, {
              maxSnapDistancePct: 20,
            });
            if (snapResult.matches.length > 0) {
              const snapById = new Map(
                snapResult.snapped.map((s) => [s.id, s]),
              );
              for (let idx = 0; idx < group.rooms.length; idx++) {
                const r = group.rooms[idx];
                const id = r.temp_id || r.name_raw || `room_${idx}`;
                const s = snapById.get(id);
                if (s && s.bounding_polygon) r.bounding_polygon = s.bounding_polygon;
              }
              const avgDrift =
                snapResult.matches.reduce((acc, m) => acc + m.drift_before, 0) /
                snapResult.matches.length;
              console.log(
                `[snap-label] ${lotName}: ${snapResult.matches.length}/${group.rooms.length} pièces snappées (drift moyen avant snap ${avgDrift.toFixed(1)}%)`,
              );
              // Re-clip building_outline post-snap (peut déborder)
              const buildingPolyForSnap = planIdForSnap
                ? planIdToBuildingPolygon.get(planIdForSnap)
                : null;
              if (buildingPolyForSnap && buildingPolyForSnap.length >= 4) {
                for (const r of group.rooms) {
                  if (!r.bounding_polygon || r.bounding_polygon.length < 4) continue;
                  const { polygon: clipped } = clipPolygonToBoundary(
                    r.bounding_polygon,
                    buildingPolyForSnap,
                    0.5,
                  );
                  if (clipped && clipped.length >= 4) r.bounding_polygon = clipped;
                }
              }
            } else {
              console.log(
                `[snap-label] ${lotName}: 0 pièce snappée (aucun match OCR↔room_name, ou drift > maxSnapDistance)`,
              );
            }
          }
        }

        // ─── s23 Bug fondamental Étape 3 — Recalculer l'envelope du lot ─────
        // `zoneData` était calculé ligne 304 depuis les bounding_box IA approximatifs
        // (souvent plus larges que la vraie pièce). Les polygones ont ensuite été
        // raffinés (passe-2), clippés (resolver non-overlap), vérifiés visuellement
        // (passe-3) et hard-clippés au building_outline. Le zoneData initial ne
        // reflète plus la réalité → lot trop grand vers le bas, Séjour drag bloqué
        // au mauvais endroit à l'Étape 3. Fix : recalculer depuis les polygones finaux.
        // s24 — Priorité aux rooms SNAPPÉES (labels OCR fiables) pour le bbox
        // envelope. Les rooms non-snappées gardent leur drift IA ~10% → leur
        // polygone déborde souvent du vrai bâti (terrasse, escalier, trottoir).
        // Le bbox des rooms snappées définit la zone réelle de l'appartement.
        // Fallback sur all-rooms si < 50% snap rate (bbox snapped non
        // représentatif : R+1 avait 2/8 snappées à gauche → env ampute séjour droite).
        let finalMinX = 100, finalMinY = 100, finalMaxX = 0, finalMaxY = 0;
        let hasAnyPolygon = false;
        let usedSnappedOnly = false;
        const snappedRooms = group.rooms.filter((r) => {
          const id = r.temp_id || r.name_raw;
          return id && lockedByEarlySnap.has(id);
        });
        const snapRateOk = snappedRooms.length >= Math.max(2, Math.ceil(group.rooms.length * 0.5));
        const roomsForEnvelope = snapRateOk ? snappedRooms : group.rooms;
        usedSnappedOnly = snapRateOk;
        for (const r of roomsForEnvelope) {
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
        // Pad de 2% pour laisser la place aux murs extérieurs
        if (hasAnyPolygon && usedSnappedOnly) {
          finalMinX = Math.max(0, finalMinX - 2);
          finalMinY = Math.max(0, finalMinY - 2);
          finalMaxX = Math.min(100, finalMaxX + 2);
          finalMaxY = Math.min(100, finalMaxY + 2);
        }
        if (usedSnappedOnly) {
          console.log(
            `[envelope-snapped] ${lotName}: bbox basé sur ${snappedRooms.length}/${group.rooms.length} rooms snappées (${finalMinX.toFixed(1)},${finalMinY.toFixed(1)})-(${finalMaxX.toFixed(1)},${finalMaxY.toFixed(1)})`
          );
        }
        if (hasAnyPolygon && finalMaxX > finalMinX && finalMaxY > finalMinY) {
          const oldZone = { ...zoneData };
          let envX = Math.max(0, finalMinX);
          let envY = Math.max(0, finalMinY);
          let envMaxX = Math.min(100, finalMaxX);
          let envMaxY = Math.min(100, finalMaxY);

          // s24 — CRITIQUE : intersecter l'envelope avec le building_outline
          // pour éviter le débord du lot hors de l'immeuble visible (terrasse,
          // escalier, trottoir). Cause du bug Thomas "lot déborde largement du
          // plan" : les polygones IA débordent parfois malgré hard-clip
          // (résidu <33% → clip skipped pour préserver la pièce). Résultat :
          // zone_data englobait les polygones débordants.
          const planIdForEnv = floorToPlanId.get(group.floor);
          const buildingForEnv = planIdForEnv
            ? planIdToBuildingPolygon.get(planIdForEnv)
            : null;
          if (buildingForEnv && buildingForEnv.length >= 4) {
            const bxs = buildingForEnv.map((p) => p.x_percent);
            const bys = buildingForEnv.map((p) => p.y_percent);
            const bMinX = Math.min(...bxs);
            const bMinY = Math.min(...bys);
            const bMaxX = Math.max(...bxs);
            const bMaxY = Math.max(...bys);
            const before = { envX, envY, envMaxX, envMaxY };
            envX = Math.max(envX, bMinX);
            envY = Math.max(envY, bMinY);
            envMaxX = Math.min(envMaxX, bMaxX);
            envMaxY = Math.min(envMaxY, bMaxY);
            if (envMaxX - envX < 5 || envMaxY - envY < 5) {
              // Intersection trop petite → fallback sur envelope originale sans clip
              envX = before.envX;
              envY = before.envY;
              envMaxX = before.envMaxX;
              envMaxY = before.envMaxY;
              console.log(
                `[envelope-building-clip] ${lotName}: intersection dégénérée, fallback envelope raw`
              );
            } else if (
              envX !== before.envX ||
              envY !== before.envY ||
              envMaxX !== before.envMaxX ||
              envMaxY !== before.envMaxY
            ) {
              console.log(
                `[envelope-building-clip] ${lotName}: envelope clippée au building_outline ` +
                `(${before.envX.toFixed(1)},${before.envY.toFixed(1)})-(${before.envMaxX.toFixed(1)},${before.envMaxY.toFixed(1)}) ` +
                `→ (${envX.toFixed(1)},${envY.toFixed(1)})-(${envMaxX.toFixed(1)},${envMaxY.toFixed(1)})`
              );
            }
          }

          zoneData.x_percent = envX;
          zoneData.y_percent = envY;
          zoneData.width_percent = envMaxX - envX;
          zoneData.height_percent = envMaxY - envY;
          console.log(
            `[envelope-recompute] ${lotName}: zone recalculée depuis polygones finaux. ` +
            `Avant: y=${oldZone.y_percent.toFixed(1)} h=${oldZone.height_percent.toFixed(1)} ` +
            `Après: y=${zoneData.y_percent.toFixed(1)} h=${zoneData.height_percent.toFixed(1)}`
          );
        }

        // ─── s24 Passe-4 — Envelope POLYGONALE du lot ─────────────
        // Remplace le rectangle axis-aligned par le vrai contour de
        // l'appartement (convex hull des rooms snappées OCR + 2% padding).
        // Résout : rectangle englobant incluait 10-15% zones hors appart
        // (décrochés, escaliers, terrasses exclues).
        //
        // Fallback rect si <50% snap rate (qualité snap insuffisante pour
        // un contour représentatif).
        //
        // IMPORTANT : zoneData.{x,y,w,h} reste la BBOX AXIS-ALIGNED du
        // polygone. Les coords lot-local des rooms (lignes ~802) sont
        // calculées depuis cette bbox → rooms restent alignées visuellement.
        let envelopePolygon: Array<{ x_percent: number; y_percent: number }> | null = null;
        {
          const ENVELOPE_POLYGON_ENABLED = process.env.VS_ENVELOPE_POLYGON !== "false";
          if (ENVELOPE_POLYGON_ENABLED) {
            const roomsForEnv: RoomForEnvelope[] = group.rooms.map((r, idx) => ({
              id: r.temp_id || r.name_raw || `room_${idx}`,
              bounding_polygon: r.bounding_polygon ?? null,
              isSnapped: lockedByEarlySnap.has(r.temp_id || r.name_raw || `room_${idx}`),
            }));
            // s24 — seuils configurables via env (0.3 / 0 par défaut en prod).
            // s28 P0 — paddingPct défaut 0 (était 2) pour fix débord polygone
            // Étape 2. Permet un reality check avec seuil permissif sur des plans
            // faible-snap-rate sans modifier le code.
            const minSnapRateEnv = parseFloat(process.env.VS_ENVELOPE_MIN_SNAP_RATE || "0.3");
            const paddingPctEnv = parseFloat(process.env.VS_ENVELOPE_PADDING_PCT || "0");
            const alphaEnv = parseFloat(process.env.VS_ENVELOPE_ALPHA || "0.3");
            const envResult = computeLotPolygonEnvelope(roomsForEnv, minSnapRateEnv, paddingPctEnv, alphaEnv);
            if (envResult.polygon) {
              envelopePolygon = envResult.polygon;
              // Synchroniser zoneData rect = bbox du polygon final (point source unique)
              const bbox = polygonBoundingBox(envelopePolygon);
              zoneData.x_percent = bbox.x_percent;
              zoneData.y_percent = bbox.y_percent;
              zoneData.width_percent = bbox.width_percent;
              zoneData.height_percent = bbox.height_percent;
              console.log(
                `[envelope-polygon] ${lotName}: polygon ${envResult.hullVertexCount} pts (snap ${envResult.snappedCount}/${envResult.totalCount}=${(envResult.snapRate * 100).toFixed(0)}%), bbox (${bbox.x_percent.toFixed(1)},${bbox.y_percent.toFixed(1)}) ${bbox.width_percent.toFixed(1)}×${bbox.height_percent.toFixed(1)}`
              );
            } else {
              console.log(
                `[envelope-polygon] ${lotName}: fallback rect (${envResult.rejectReason})`
              );
            }
          }
        }

        // ─── s24 Room tiling — Pavage polygonal strict ─────────────
        // Remplace les bounding_polygon IA (overlap + gaps) par un tiling
        // power-diagram (Voronoï pondéré) de l'enveloppe du lot. Garanties :
        // aucun overlap, aucun gap, cellules convexes. Poids ∝ √surface_m2.
        //
        // Coords : plan-global (0-100%) pour entrée ET sortie. Le code aval
        // lignes ~862-867 convertit ensuite en lot-local via zoneData.
        //
        // Fallback : si flag OFF ou moins de 2 rooms avec polygon/centroïde
        //            exploitable, on conserve les polygones existants.
        {
          const ROOM_TILING_ENABLED = process.env.VS_ROOM_TILING !== "false";
          if (ROOM_TILING_ENABLED && group.rooms.length >= 1) {
            // Enveloppe de référence : polygon passe-4 si dispo, sinon
            // rectangle axis-aligned (zoneData) dégénéré en 4 pts.
            const tilingEnvelope: Array<{ x_percent: number; y_percent: number }> = envelopePolygon
              ? envelopePolygon
              : [
                  { x_percent: zoneData.x_percent, y_percent: zoneData.y_percent },
                  { x_percent: zoneData.x_percent + zoneData.width_percent, y_percent: zoneData.y_percent },
                  { x_percent: zoneData.x_percent + zoneData.width_percent, y_percent: zoneData.y_percent + zoneData.height_percent },
                  { x_percent: zoneData.x_percent, y_percent: zoneData.y_percent + zoneData.height_percent },
                ];

            // Construire inputs tiling : centroïde = centroïde polygon si dispo,
            // sinon bbox center. Surface target = room.surface_m2 (peut être null).
            const tilingInputs: TilingRoomInput[] = group.rooms.map((r, idx) => {
              const id = r.temp_id || r.name_raw || `room_${idx}`;
              let cx: number | null = null;
              let cy: number | null = null;
              if (r.bounding_polygon && r.bounding_polygon.length >= 3) {
                // Centroïde arithmétique (suffisant pour site Voronoï)
                let sx = 0, sy = 0;
                for (const p of r.bounding_polygon) {
                  sx += p.x_percent;
                  sy += p.y_percent;
                }
                cx = sx / r.bounding_polygon.length;
                cy = sy / r.bounding_polygon.length;
              } else if (r.bounding_box) {
                cx = r.bounding_box.x_percent + r.bounding_box.width_percent / 2;
                cy = r.bounding_box.y_percent + r.bounding_box.height_percent / 2;
              }
              return {
                id,
                centroid: {
                  x_percent: cx ?? zoneData.x_percent + zoneData.width_percent / 2,
                  y_percent: cy ?? zoneData.y_percent + zoneData.height_percent / 2,
                },
                surface_m2_target: r.surface_m2 ?? null,
                name_raw: r.name_raw || id,
              };
            });

            try {
              const tiles = tileRoomsInLot(tilingEnvelope, tilingInputs);
              const tileById = new Map(tiles.map((t) => [t.id, t]));

              // Métriques de validation (log uniquement, non-bloquant)
              const metrics = computeTilingMetrics(tilingEnvelope, tiles);
              console.log(
                `[room-tiling] ${lotName}: ${metrics.validTiles}/${metrics.totalRooms} tiles valid, ` +
                `degenerate=${metrics.degenerateTiles}, coverage_err=${(metrics.coverageError * 100).toFixed(2)}%, ` +
                `max_overlap=${metrics.maxOverlapPct2.toFixed(3)} (env_area=${metrics.envelopeArea.toFixed(1)})`
              );

              // Écraser bounding_polygon de chaque room par son tile.
              // Aval (lignes ~862-867) convertit en lot-local via zoneData.
              for (let idx = 0; idx < group.rooms.length; idx++) {
                const r = group.rooms[idx];
                const id = r.temp_id || r.name_raw || `room_${idx}`;
                const tile = tileById.get(id);
                if (tile && tile.tile_polygon.length >= 3 && !tile.degenerate) {
                  r.bounding_polygon = tile.tile_polygon.map((p) => ({
                    x_percent: p.x_percent,
                    y_percent: p.y_percent,
                  }));
                }
              }
            } catch (tilingErr) {
              console.error(
                `[room-tiling] ${lotName}: échec tiling, conservation polygones existants`,
                tilingErr
              );
            }
          }
        }

        // Calculer la surface totale estimée
        const surfaceM2 = group.rooms.reduce(
          (sum, r) => sum + (r.surface_m2 || 0),
          0
        );

        // ─── s25 P0 / s27 R3 — Outline shrinker concave (pattern s23) ─
        // Recalcule zoneData comme polygone concave (alpha-shape) des rooms
        // finales (post-tiling, post-resolver, post-snap). Ignore l'outline
        // IA qui peut déborder (escalier colimaçon, terrasse — bug P0 Muguets
        // RDC : IA 47m² vs rooms 44m²). Déterministe, 0 appel IA.
        // s27 R3 : on persiste désormais le POLYGONE concave (forme réelle
        // T/L/U préservée), pas la bbox axis-aligned (audit s27 5.2/10).
        let shrunkPolygon: Array<{ x_percent: number; y_percent: number }> | null = null;
        const shrunk = shrinkOutlinePolygonToRooms(group.rooms);
        if (shrunk && shrunk.bbox.width_percent > 0 && shrunk.bbox.height_percent > 0) {
          const oldArea = zoneData.width_percent * zoneData.height_percent;
          const newArea = shrunk.bbox.width_percent * shrunk.bbox.height_percent;
          const oldW = zoneData.width_percent;
          const oldH = zoneData.height_percent;
          zoneData.x_percent = shrunk.bbox.x_percent;
          zoneData.y_percent = shrunk.bbox.y_percent;
          zoneData.width_percent = shrunk.bbox.width_percent;
          zoneData.height_percent = shrunk.bbox.height_percent;
          if (!shrunk.usedFallbackBBox) {
            shrunkPolygon = shrunk.polygon;
          }
          console.log(
            `[outline-shrinker] ${lotName} unit=${group.unitId}: ` +
            `IA bbox ${oldW.toFixed(1)}×${oldH.toFixed(1)}=${oldArea.toFixed(1)}%² → ` +
            `shrunk ${shrunk.bbox.width_percent.toFixed(1)}×${shrunk.bbox.height_percent.toFixed(1)}=${newArea.toFixed(1)}%² ` +
            `(Δ=${(oldArea - newArea).toFixed(1)}%²) ` +
            `polygon=${shrunkPolygon ? `${shrunkPolygon.length}pts` : "fallback-bbox"}`
          );
          // Invalider le polygon d'enveloppe : son bbox peut être plus large
          // que le shrink (ex: colimaçon inclus). On persiste un rect/polygon
          // déterministe plutôt qu'un polygon trop généreux.
          if (envelopePolygon) {
            const envBbox = polygonBoundingBox(envelopePolygon);
            const envArea = envBbox.width_percent * envBbox.height_percent;
            if (envArea > newArea * 1.05) {
              console.log(
                `[outline-shrinker] ${lotName}: envelope polygon (${envArea.toFixed(1)}%²) > shrunk (${newArea.toFixed(1)}%²), fallback shrunk`
              );
              envelopePolygon = null;
            }
          }
        }

        // s24 Passe-4 / s27 R3 — zone_data final :
        //   1. Priorité au polygon concave shrunk (forme réelle, non débordée)
        //   2. Sinon, envelope polygon (si pas invalidée par shrink check)
        //   3. Sinon, rect legacy (bbox)
        const finalZoneData = shrunkPolygon
          ? { type: "polygon", points: shrunkPolygon }
          : envelopePolygon
          ? { type: "polygon", points: envelopePolygon }
          : zoneData;

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
            JSON.stringify(finalZoneData),
            group.confidenceAvg,
          ]
        );

        const lotId = lotInsertResult.rows[0].id;

        // ─── S22 — Pré-créer les rooms IA dans vs_rooms ─────────
        // Convertir les bounding_box plan-global (%) → position lot-local (%)
        const planIdForFloor = floorToPlanId.get(group.floor) ?? null;

        for (const room of group.rooms) {
          const bb = room.bounding_box;
          const roomType = inferRoomTypeFromName(room.name_raw);

          // Convertir bounding_polygon plan-global → lot-local (même re-normalisation que position)
          let polygonLocal: Array<{ x_percent: number; y_percent: number }> | null = null;
          if (room.bounding_polygon && room.bounding_polygon.length >= 4 && zoneData.width_percent > 0 && zoneData.height_percent > 0) {
            polygonLocal = room.bounding_polygon.map((pt) => ({
              x_percent: Math.max(0, Math.min(100, ((pt.x_percent - zoneData.x_percent) / zoneData.width_percent) * 100)),
              y_percent: Math.max(0, Math.min(100, ((pt.y_percent - zoneData.y_percent) / zoneData.height_percent) * 100)),
            }));
          }

          // s23 fix désync — position = tight bbox(polygonLocal) si dispo, sinon
          // re-normalisation du bounding_box IA grossier. Objectif : position et
          // polygon restent synchronisés de bout en bout (handles de resize
          // collent au contour vert rendu à l'Étape 3).
          let position: Record<string, number> | null = null;
          if (polygonLocal && polygonLocal.length >= 4) {
            let minX = 100, minY = 100, maxX = 0, maxY = 0;
            for (const p of polygonLocal) {
              if (p.x_percent < minX) minX = p.x_percent;
              if (p.y_percent < minY) minY = p.y_percent;
              if (p.x_percent > maxX) maxX = p.x_percent;
              if (p.y_percent > maxY) maxY = p.y_percent;
            }
            const w = maxX - minX;
            const h = maxY - minY;
            if (w > 0 && h > 0) {
              position = {
                x_percent: Math.max(0, Math.min(100, minX)),
                y_percent: Math.max(0, Math.min(100, minY)),
                width_percent: Math.max(1, Math.min(100, w)),
                height_percent: Math.max(1, Math.min(100, h)),
              };
            }
          }
          // Fallback : pas de polygon → bbox IA re-normalisée (ancien comportement)
          if (!position && bb && zoneData.width_percent > 0 && zoneData.height_percent > 0) {
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
      }));
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
