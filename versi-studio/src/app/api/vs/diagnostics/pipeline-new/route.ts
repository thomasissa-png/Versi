/**
 * Route diagnostic interne — exécute le pipeline NEW v5 (vectoriel PDF) en SSR
 * Next.js sur un PDF fixture Muguets et retourne les résultats.
 *
 * Pipeline NEW v5 (s27 finale) : extraction VECTORIELLE des paths PDF orange
 * #ff8000 via pdfjs-dist + viewport.transform comme CTM. Filtre par longueur
 * de segment (≥ 50px) pour exclure les hachures terrasses/escaliers ext.
 * Polygone = bbox des segments murs → 4 sommets, précision pixel-perfect.
 *
 * Cas d'usage : pre-push hook + GitHub Actions CI.
 *
 * USAGE :
 *   curl http://localhost:3199/api/vs/diagnostics/pipeline-new
 *
 * Sécurité : route activée uniquement si NODE_ENV=development OU
 * VS_DIAGNOSTICS_ENABLED=true. Sinon → 404.
 */

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { extractLotVector } from "@/lib/vs/lot-vector-extractor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FIXTURE_PATH = join(
  process.cwd(),
  "reference-existant",
  "plans-test",
  "P 00 - Pr2_plan RDC_ projet2.pdf",
);

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
    const result = await extractLotVector(buffer, { scale: 3 });
    const duration = Date.now() - t0;
    return NextResponse.json({
      ok: true,
      duration_ms: duration,
      fixture: FIXTURE_PATH,
      image: { width: result.imageWidth, height: result.imageHeight },
      mask: {
        total_pixels: result.wallSegments.length,
        cluster_count: 1,
      },
      polygon: {
        vertices: result.polygon.length,
        sample_first_3: result.polygon.slice(0, 3),
      },
      assertions: {
        has_polygon: result.polygon.length === 4,
        polygon_reasonable_size: result.polygon.length === 4,
        has_mask_pixels: result.wallSegments.length >= 100,
      },
    });
  } catch (err) {
    const duration = Date.now() - t0;
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
              ? err.stack?.split("\n").slice(0, 8).join("\n")
              : null,
        },
      },
      { status: 500 },
    );
  }
}
