/**
 * POST /api/vs/plans/[id]/auto-calibrate
 *
 * Détecte automatiquement l'échelle d'un plan via GPT-4.1 vision.
 * Retourne une suggestion de calibration que la modale PlanCalibration
 * pré-remplit (assistant, pas remplacement). Fallback silencieux si la
 * détection échoue ou si la confiance est insuffisante.
 */
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { query } from "@/lib/vs/db";
import {
  detectPlanScale,
  suggestCalibrationFromScale,
  PlanScaleError,
} from "@/lib/vs/plan-scale-detector";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Identifiant de plan manquant." },
      { status: 400 }
    );
  }

  // Récupérer le plan
  const result = await query(
    `SELECT id, file_path, file_type FROM vs_plans WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Plan introuvable." }, { status: 404 });
  }

  const plan = result.rows[0];
  if (!plan.file_path) {
    return NextResponse.json(
      { error: "Fichier de plan introuvable sur le disque." },
      { status: 404 }
    );
  }

  // Lire l'image / PDF (réutilise pdf-to-img si nécessaire — voir plan-extractor.ts pour pattern)
  let imageBase64: string;
  let mimeType: string;
  try {
    const buffer = await readFile(plan.file_path);
    imageBase64 = buffer.toString("base64");
    mimeType = plan.file_type || "image/png";

    // Si PDF, convertir en PNG (réutilise pdf-to-img comme plan-extractor.ts)
    if (mimeType === "application/pdf" || imageBase64.startsWith("JVBERi0")) {
      const { pdf } = await import("pdf-to-img");
      const pages = await pdf(buffer, { scale: 2 });
      for await (const page of pages) {
        imageBase64 = Buffer.from(page).toString("base64");
        mimeType = "image/png";
        break;
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Impossible de lire le fichier du plan." },
      { status: 500 }
    );
  }

  // Appeler le détecteur d'échelle
  try {
    const scaleResult = await detectPlanScale(imageBase64, mimeType);

    // Si confiance suffisante, suggérer une calibration
    const suggestion = suggestCalibrationFromScale(scaleResult, 1000, 1000);
    return NextResponse.json({
      success: true,
      scale: scaleResult,
      suggestion,
    });
  } catch (err) {
    if (err instanceof PlanScaleError) {
      return NextResponse.json(
        {
          error: "Détection automatique indisponible. Calibrez manuellement.",
          code: err.code,
        },
        { status: 200 }
      );
    }
    return NextResponse.json(
      {
        error: "Erreur inattendue. Calibrez manuellement.",
        code: "UNKNOWN",
      },
      { status: 200 }
    );
  }
}
