/**
 * API Route — /api/health
 * Health check obligatoire : SELECT 1 sur PostgreSQL.
 * Retourne "degraded" si DB inaccessible (pas crash).
 */

import { NextResponse } from "next/server";
import { healthCheck } from "@/lib/vs/db";

export async function GET() {
  const result = await healthCheck();
  const statusCode = result.status === "healthy" ? 200 : 503;

  return NextResponse.json(
    {
      status: result.status,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}
