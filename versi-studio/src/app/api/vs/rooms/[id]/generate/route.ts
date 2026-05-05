/**
 * API Route — POST /api/vs/rooms/[id]/generate (DÉPRÉCIÉE s31)
 *
 * Cette route a été dépréciée lors de la finalisation HOTFIX-2 Étape 4 v2 (s31).
 *
 * Historique :
 *  - s30 : refactorisée en mode V2 cohérent mono-room (target=1) + fallback V1 legacy.
 *  - s31 HOTFIX-2 : la nouvelle UI v2 (`/visuals/placement`) utilise exclusivement
 *    `POST /api/vs/projects/[id]/visuals/generate` (pipeline cohérent multi-pièces
 *    + jobs persistants `vs_visual_jobs` + SSE). Le seul appelant restant de cette
 *    route — le composant v1 `VisualRoom.tsx` — a été supprimé en s31.
 *  - s31 (actuel) : route convertie en 410 Gone. Élimine le risque "fire-and-forget
 *    Replit autoscale" (pattern `void runCoherentMonoRoom(...)` qui pouvait perdre
 *    le job si l'instance était tuée mid-génération).
 *
 * Migration côté client : utiliser `POST /api/vs/projects/[id]/visuals/generate`
 * (body `{ style_id, target_visual_count, ... }`, retour `{ jobId }`, polling SSE
 * via `GET /api/vs/projects/[id]/visuals/stream`).
 */

import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/vs/types";

export async function POST(
  _request: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<never>>> {
  return NextResponse.json(
    {
      success: false,
      error:
        "Route dépréciée. Utiliser POST /api/vs/projects/[id]/visuals/generate (pipeline cohérent multi-pièces + jobs persistants).",
    },
    { status: 410 }
  );
}
