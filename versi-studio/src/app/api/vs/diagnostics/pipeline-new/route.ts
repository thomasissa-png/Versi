/**
 * Route diagnostic interne — exécute le pipeline NEW (M1→M5) en SSR Next.js
 * sur un PDF fixture Muguets et retourne les résultats. Permet de reproduire
 * en local + CI les conditions exactes de Replit Autoscale (Webpack bundle SSR)
 * pour détecter les bugs spécifiques à l'environnement de production.
 *
 * Cas d'usage : pre-push hook + GitHub Actions CI.
 *
 * USAGE :
 *   curl http://localhost:3100/api/vs/diagnostics/pipeline-new
 *
 * Réponse 200 OK → pipeline NEW fonctionnel en SSR. Réponse 500 → bug
 * spécifique au build prod (typiquement bug 5102 path/cmaps).
 *
 * Sécurité : route activée uniquement si NODE_ENV=development OU
 * VS_DIAGNOSTICS_ENABLED=true. Sinon → 404.
 */

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { detectPdfType } from "@/lib/vs/pdf-type-detector";
import {
  extractWallSegments,
  filterWallsByLineWidth,
} from "@/lib/vs/pdf-vector-parser";
import { buildWallGraph, detectRooms } from "@/lib/vs/wall-graph";
import { classifyRooms, type OcrLabelLite } from "@/lib/vs/lot-classifier";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FIXTURE_PATH = join(
  process.cwd(),
  "reference-existant",
  "plans-test",
  "P 00 - Pr2_plan RDC_ projet2.pdf",
);

const MOCK_OCR: OcrLabelLite[] = [
  { text: "T3 RDC", x: 240, y: 265, confidence: 0.9 },
  { text: "Escalier", x: 90, y: 215, confidence: 0.9 },
  { text: "Palier", x: 75, y: 415, confidence: 0.9 },
];

export async function GET() {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.VS_DIAGNOSTICS_ENABLED !== "true"
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const t0 = Date.now();
  try {
    const buffer = await readFile(FIXTURE_PATH);
    const m1 = await detectPdfType(buffer);
    const m2 = await extractWallSegments(buffer);
    const minLineWidth = parseFloat(
      process.env.VS_WALL_MIN_LINEWIDTH ?? "1.13",
    );
    const walls = filterWallsByLineWidth(m2.segments, minLineWidth);
    const graph = buildWallGraph(walls, 2);
    const rooms = detectRooms(graph);
    const result = await classifyRooms(rooms, Buffer.from("fake"), {
      ocrFn: async () => MOCK_OCR,
    });

    const duration = Date.now() - t0;
    return NextResponse.json({
      ok: true,
      duration_ms: duration,
      fixture: FIXTURE_PATH,
      m1: {
        type: m1.type,
        vectorPathCount: m1.vectorPathCount,
        imageCount: m1.imageCount,
        confidence: m1.confidence,
      },
      m2: {
        total_segments: m2.segments.length,
        filtered_walls: walls.length,
        page_width: m2.pageWidth,
        page_height: m2.pageHeight,
      },
      m4: {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        rooms: rooms.length,
      },
      m5: {
        lots: result.lots.length,
        communs: result.communs.length,
        lot_names: result.lots.map((l) => l.name),
      },
      // Critères PASS attendus pour Muguets RDC :
      expected: {
        m1_type: "vector",
        m1_paths_min: 5000,
        m4_rooms_max: 30,
        m5_lots_min: 1,
      },
      assertions: {
        m1_type_ok: m1.type === "vector",
        m1_paths_ok: m1.vectorPathCount >= 5000,
        m4_rooms_ok: rooms.length <= 30,
        m5_lots_ok: result.lots.length >= 1,
      },
    });
  } catch (err) {
    const duration = Date.now() - t0;
    // Walk the cause chain to surface the real underlying error
    const chain: Array<{ name?: string; message?: string; code?: string }> = [];
    let cur: unknown = err;
    let depth = 0;
    while (cur && depth < 5) {
      const e = cur as { name?: string; message?: string; code?: string; cause?: unknown };
      chain.push({ name: e.name, message: e.message, code: e.code });
      cur = e.cause;
      depth++;
    }
    return NextResponse.json(
      {
        ok: false,
        duration_ms: duration,
        fixture: FIXTURE_PATH,
        error: {
          name: err instanceof Error ? err.name : "Unknown",
          message: err instanceof Error ? err.message : String(err),
          stack:
            err instanceof Error
              ? err.stack?.split("\n").slice(0, 12).join("\n")
              : null,
          chain,
        },
      },
      { status: 500 },
    );
  }
}
