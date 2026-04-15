/**
 * API Route — /api/vs/files?path=...
 * GET : Sert un fichier uploadé depuis /tmp/vs-uploads/
 *
 * V1 sans auth. Validation : le chemin doit commencer par /tmp/vs-uploads/.
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

    return new NextResponse(data, {
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
