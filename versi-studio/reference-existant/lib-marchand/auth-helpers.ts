/**
 * Shared auth + ownership helpers for /api/pro/* routes.
 *
 * Centralises session retrieval and project ownership verification
 * to avoid duplication across 6+ route files.
 */

import { NextResponse } from "next/server";
import { getSessionRobust } from "@/lib/session";
import { getPool } from "@/lib/db";
import { ensureProTables } from "@/lib/marchand/db";

// ─── Types ──────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface ProjectOwnershipResult {
  user: AuthenticatedUser;
  project: {
    id: string;
    status: string;
    type_bien: string;
    plan_file_path: string | null;
    plan_mime_type: string | null;
    adresse: string;
    surface_totale: number | null;
  };
}

// ─── Auth check ─────────────────────────────────────────────────────

/**
 * Verify the request is from an authenticated user.
 * Returns the user or a 401 NextResponse.
 */
export async function requireAuth(
  request: Request
): Promise<AuthenticatedUser | NextResponse> {
  const session = await getSessionRobust(request);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "Connexion requise." },
      { status: 401 }
    );
  }
  return {
    id: session.user.id,
    email: (session.user as { email?: string }).email || "",
    name: (session.user as { name?: string }).name || "",
  };
}

/**
 * Type guard: is the result an error response?
 * Works for any union of T | NextResponse.
 */
export function isErrorResponse<T>(
  result: T | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

// ─── Ownership check ────────────────────────────────────────────────

/**
 * Verify auth + that the authenticated user owns the project.
 * Returns user + project data, or a 401/403/404 NextResponse.
 */
export async function requireProjectOwnership(
  request: Request,
  projectId: string
): Promise<ProjectOwnershipResult | NextResponse> {
  const authResult = await requireAuth(request);
  if (isErrorResponse(authResult)) return authResult;

  await ensureProTables();

  const db = getPool();
  const result = await db.query(
    `SELECT id, status, type_bien, plan_file_path, plan_mime_type, adresse, surface_totale
     FROM pro_projects WHERE id = $1`,
    [projectId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Projet introuvable." },
      { status: 404 }
    );
  }

  const project = result.rows[0];

  // Ownership check: the project must have a user_id column
  const ownerCheck = await db.query(
    `SELECT 1 FROM pro_projects WHERE id = $1 AND user_id = $2`,
    [projectId, authResult.id]
  );

  if (ownerCheck.rows.length === 0) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Vous n'avez pas accès à ce projet." },
      { status: 403 }
    );
  }

  return {
    user: authResult,
    project: {
      id: project.id,
      status: project.status,
      type_bien: project.type_bien,
      plan_file_path: project.plan_file_path,
      plan_mime_type: project.plan_mime_type,
      adresse: project.adresse,
      surface_totale: project.surface_totale
        ? Number(project.surface_totale)
        : null,
    },
  };
}

// ─── Rate limit (generic per-key) ───────────────────────────────────

const rateLimitMaps = new Map<string, Map<string, { count: number; resetAt: number }>>();

/**
 * Generic rate limiter. Returns true if allowed, false if exceeded.
 *
 * @param namespace - isolates rate limits (e.g. "extract", "recommend")
 * @param key - rate limit key (e.g. projectId, userId)
 * @param maxRequests - max requests per window
 * @param windowMs - window duration in milliseconds
 */
export function checkRateLimit(
  namespace: string,
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  if (!rateLimitMaps.has(namespace)) {
    rateLimitMaps.set(namespace, new Map());
  }
  const map = rateLimitMaps.get(namespace)!;
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// Cleanup all rate limit maps every 10 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitMaps.forEach((map) => {
    map.forEach((entry, key) => {
      if (now > entry.resetAt) map.delete(key);
    });
  });
}, 600_000);
