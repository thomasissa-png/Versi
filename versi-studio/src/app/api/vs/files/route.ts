/**
 * API Route — /api/vs/files?path=...
 * GET : Sert un fichier uploadé depuis /tmp/vs-uploads/
 *
 * V1 sans auth. Validation : le chemin doit commencer par /tmp/vs-uploads/.
 *
 * Bugfix versi-s20 : un PDF uploadé n'est pas affichable dans <img>. Pour les
 * plans PDF, on convertit à la volée en PNG (page 1) avec pdf-to-img, même
 * pattern que plan-extractor.ts et auto-calibrate/route.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";

const UPLOAD_PREFIX = "/tmp/vs-uploads/";

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");

  if (!filePath || !filePath.startsWith(UPLOAD_PREFIX)) {
    return NextResponse.json(
      { success: false, error: "Chemin invalide." },
      { status: 400 }
    );
  }

  // Protection contre le path traversal
  if (filePath.includes("..")) {
    return NextResponse.json(
      { success: false, error: "Chemin invalide." },
      { status: 400 }
    );
  }

  try {
    const data = await readFile(filePath);
    const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    // Conversion PDF → PNG à la volée (page 1) pour que <img src="..."> affiche
    // le plan dans le canvas. Les PDF natifs ne sont pas décodables par new Image().
    if (ext === ".pdf") {
      try {
        const { pdf } = await import("pdf-to-img");
        const pages = await pdf(data, { scale: 2 });
        for await (const page of pages) {
          // Page est déjà un Buffer PNG.
          return new NextResponse(new Uint8Array(page), {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      } catch (pdfErr) {
        console.error("[API] Conversion PDF → PNG échouée pour", filePath, pdfErr);
        return NextResponse.json(
          { success: false, error: "Impossible de convertir le PDF en image." },
          { status: 500 }
        );
      }
    }

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Fichier introuvable." },
      { status: 404 }
    );
  }
}
