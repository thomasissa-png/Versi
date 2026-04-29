/**
 * Route diagnostic interne — exécute le pipeline NEW v2 (color mask) en SSR
 * Next.js sur un PDF fixture Muguets et retourne les résultats.
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
import { extractLotsByColorMask } from "@/lib/vs/color-mask-extractor";

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

    // Pipeline NEW v2 : pdf-to-img → color mask → alpha-shape → polygone lot.
    // Approche déterministe pixel-based, précision 0.1mm/pixel à scale=3.
    const { pdf } = await import("pdf-to-img");
    const pages = await pdf(buffer, { scale: 3 });
    let pngBuffer: Buffer | null = null;
    for await (const page of pages) {
      pngBuffer = Buffer.from(page);
      break;
    }
    if (!pngBuffer) throw new Error("pdf-to-img n'a produit aucune page");

    const result = await extractLotsByColorMask(pngBuffer, {
      sampleStride: 4,
      habitableRadius: 120,
      habitableRatioRange: [0.005, 0.3],
      simplifyTolerance: 3,
      snapRadius: 16,
      useMarchingSquares: true,
      excludeTopFraction: 0.18,
      excludeBottomFraction: 0.18,
      singleCluster: true,
    });

    const duration = Date.now() - t0;
    const mainPolygon = result.polygons[0];
    return NextResponse.json({
      ok: true,
      duration_ms: duration,
      fixture: FIXTURE_PATH,
      image: {
        width: result.imageWidth,
        height: result.imageHeight,
      },
      mask: {
        total_pixels: result.totalMaskPixels,
        cluster_count: result.clusterCount,
      },
      polygon: {
        vertices: mainPolygon?.length ?? 0,
        sample_first_3: mainPolygon?.slice(0, 3),
      },
      assertions: {
        has_polygon: !!mainPolygon && mainPolygon.length >= 3,
        polygon_reasonable_size: mainPolygon
          ? mainPolygon.length >= 3 && mainPolygon.length <= 500
          : false,
        has_mask_pixels: result.totalMaskPixels >= 1000,
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
