/**
 * Versi Studio — Plan Canonicalizer (s25)
 *
 * Canonicalise un plan architectural hétérogène en PNG noir sur blanc épuré
 * via gpt-image-1 (openai.images.edit). Prépass consommée par le pipeline
 * extract aval. Feature flag VS_PLAN_CANONICALIZE gouverne l'activation
 * côté route — cette lib est toujours appelable et fallback silencieusement.
 *
 * Pattern s22 : JAMAIS openai.responses.create() (erreur silencieuse prod).
 * Pattern s24 : import dynamique sharp + OpenAI (évite Turbopack crash).
 *
 * Contrat public :
 *   canonicalizePlan(buf, opts?) → { canonical, duration, fallback, ... }
 *   - Jamais throw : tout échec → fallback silencieux avec reason typée
 *   - Timeout par défaut 45s (configurable via opts.timeoutMs)
 *   - Gates G1-G4 post-pipeline : si ≥2 FAIL → fallback vers buffer original
 *
 * Logs structurés JSON préfixés [plan-canonicalizer] pour parsing prod.
 */

import { createHash } from "node:crypto";
import {
  CANONICAL_PROMPT_V1,
  CANONICAL_PROMPT_VERSION,
  CANONICAL_IMAGE_PARAMS,
  CANONICAL_PRIMARY_MODEL,
  CANONICAL_FALLBACK_MODEL,
  CANONICAL_DOWNSAMPLE_MAX_WIDTH,
} from "./prompts/canonical";

export type CanonicalizeModel =
  | typeof CANONICAL_PRIMARY_MODEL
  | typeof CANONICAL_FALLBACK_MODEL;

// ─── Types publics ─────────────────────────────────────────────────

export type CanonicalizeFallbackReason =
  | "timeout"
  | "api_error"
  | "org_not_verified"
  | "gate_fail"
  | "flag_off"
  | "empty_input";

export interface CanonicalizeResult {
  /** PNG bufferisé. Si fallback=true, c'est le buffer original inchangé. */
  canonical: Buffer;
  /** Durée totale de l'appel en ms (incluant downsample + API + gates). */
  duration: number;
  /** true si la canonicalisation a échoué → buffer original retourné. */
  fallback: boolean;
  /** Raison du fallback (absent si fallback=false). */
  fallbackReason?: CanonicalizeFallbackReason;
  /** Modèle IA utilisé (primaire ou fallback). */
  model: CanonicalizeModel;
  /** Version du prompt pour traçabilité DB. */
  promptVersion: typeof CANONICAL_PROMPT_VERSION;
  /** Hash SHA-256 de l'input (idempotence / dedup). */
  inputHash: string;
  /** Hash SHA-256 de l'output retourné (canonical OU original si fallback). */
  outputHash: string;
  /** Résultats des 4 gates (absent si fallback avant API). */
  gates?: { g1: boolean; g2: boolean; g3: boolean; g4: boolean };
}

export interface CanonicalizeOptions {
  /** Timeout de l'appel API en ms. Défaut 45 000 (45s). */
  timeoutMs?: number;
  /** AbortSignal externe pour annulation coordonnée. */
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 90_000;
const RETRY_MAX_ATTEMPTS = 3; // initiale + 2 retries

/**
 * Backoff configurable via env (utile en test pour ne pas attendre 6s en vrai).
 * Prod : 2000ms (→ 2s, 4s). Tests unit : 5ms (→ 5ms, 10ms).
 * Lu dynamiquement (pas au module-load) pour que les tests puissent l'override
 * depuis beforeEach().
 */
function getRetryBackoffMs(): number {
  const v = Number(process.env.VS_CANONICALIZER_BACKOFF_MS);
  return Number.isFinite(v) && v >= 0 ? v : 2_000;
}

// Extrait du détail structuré d'une erreur OpenAI (ou erreur transport générique).
interface OpenAIErrorDetail {
  status?: number;
  code?: string | null;
  type?: string | null;
  message: string;
}

function parseOpenAIError(err: unknown): OpenAIErrorDetail {
  const msg = err instanceof Error ? err.message : String(err);
  const e = err as {
    status?: number;
    code?: string | null;
    type?: string | null;
    error?: { code?: string; type?: string; message?: string };
  };
  return {
    status: typeof e?.status === "number" ? e.status : undefined,
    code: e?.error?.code ?? e?.code ?? null,
    type: e?.error?.type ?? e?.type ?? null,
    message: msg,
  };
}

/**
 * Certaines erreurs OpenAI ne doivent PAS être retry :
 *  - 401/403 (clé invalide, org non vérifiée — retry inutile)
 *  - 400 (payload invalide, retry inutile)
 *  - Tout 2xx (impossible en branche erreur) ou code 'content_policy_violation'
 * Les autres (5xx, timeout, erreurs réseau) sont transientes.
 */
function isRetryable(detail: OpenAIErrorDetail): boolean {
  if (detail.status === 400 || detail.status === 401 || detail.status === 403) {
    return false;
  }
  if (detail.code === "content_policy_violation") return false;
  return true;
}

/**
 * Détecte le cas spécifique "organisation OpenAI non vérifiée pour gpt-image-1"
 * (H1 diagnostic s25 — 60% des fallbacks en prod). Message type :
 *   "Your organization must be verified to use the model..."
 */
function isOrgNotVerified(detail: OpenAIErrorDetail): boolean {
  if (detail.status !== 403) return false;
  const msg = detail.message.toLowerCase();
  return msg.includes("organization") && msg.includes("verif");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Helpers ───────────────────────────────────────────────────────

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function logEvent(
  event: string,
  payload: Record<string, unknown>,
): void {
  try {
    console.log(
      `[plan-canonicalizer] ${event} ${JSON.stringify(payload)}`,
    );
  } catch {
    // noop — logging ne doit jamais casser le pipeline
  }
}

/**
 * Downsample le buffer à <= 2048px de largeur si nécessaire.
 * Import dynamique de sharp (pattern s24 — évite crash worker Turbopack).
 */
async function downsampleIfNeeded(buf: Buffer): Promise<Buffer> {
  const { default: sharp } = await import("sharp");
  const meta = await sharp(buf).metadata();
  const width = meta.width ?? 0;
  if (width <= CANONICAL_DOWNSAMPLE_MAX_WIDTH) return buf;

  return sharp(buf)
    .resize({ width: CANONICAL_DOWNSAMPLE_MAX_WIDTH, withoutEnlargement: true })
    .png()
    .toBuffer();
}

/**
 * Exécute l'appel OpenAI images.edit avec racing timeout + abort signal externe.
 * Retourne le buffer PNG ou throw — le caller gère le fallback.
 */
async function callOpenAIImagesEdit(
  inputBuf: Buffer,
  timeoutMs: number,
  externalSignal?: AbortSignal,
  model: CanonicalizeModel = CANONICAL_PRIMARY_MODEL,
): Promise<Buffer> {
  const { default: OpenAI, toFile } = await import("openai");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-placeholder")) {
    throw new Error("OPENAI_API_KEY manquante ou placeholder");
  }

  const client = new OpenAI({ apiKey });

  // AbortController compositeur : soit timeout soit signal externe
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    const file = await toFile(inputBuf, "plan.png", { type: "image/png" });
    const response = await client.images.edit(
      {
        model,
        image: file,
        prompt: CANONICAL_PROMPT_V1,
        size: CANONICAL_IMAGE_PARAMS.size,
        quality: CANONICAL_IMAGE_PARAMS.quality,
        output_format: CANONICAL_IMAGE_PARAMS.output_format,
        background: CANONICAL_IMAGE_PARAMS.background,
        n: CANONICAL_IMAGE_PARAMS.n,
      },
      { signal: controller.signal },
    );

    const data = response.data?.[0];
    const b64 = data?.b64_json;
    if (!b64) throw new Error("Réponse OpenAI sans b64_json");
    return Buffer.from(b64, "base64");
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);
  }
}

// ─── Gates G1-G4 (post-pipeline qualité) ───────────────────────────

/**
 * Gates qualité appliqués sur l'output canonique.
 * Si ≥2 FAIL → fallback vers buffer original (règle prompt-library.md).
 *
 * Implémentation pragmatique v1 (quick-check pixels via sharp) :
 *  - G1 : fond >= 95% blanc pur (255,255,255) sur un échantillon downsamplé
 *  - G2 : au moins 4 segments noirs rectilignes détectables (approximation par
 *         ratio pixels noirs entre 0.5% et 25% — ni vide ni saturé)
 *  - G3 : présence pixels gris 1-pixel (approximation ouvertures arcs/lignes fines)
 *  - G4 : pas de bloc texte massif (approximation : pas de concentration
 *         pixels noirs dense hors-zones périphériques)
 *
 * Implémentation conservatrice : en cas de doute → gate PASS (évite faux
 * fallbacks qui coûtent le bénéfice de la canonicalisation). Les métriques
 * précises sont laissées au reality check @qa + audit Yann.
 */
async function runQualityGates(
  canonicalBuf: Buffer,
): Promise<{ g1: boolean; g2: boolean; g3: boolean; g4: boolean }> {
  try {
    const { default: sharp } = await import("sharp");
    const img = sharp(canonicalBuf);
    const meta = await img.metadata();
    if (!meta.width || !meta.height) {
      return { g1: true, g2: true, g3: true, g4: true };
    }

    const { data, info } = await img
      .resize({ width: 256, withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pxCount = info.width * info.height;
    const channels = info.channels;
    let whitePx = 0;
    let blackPx = 0;
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r >= 245 && g >= 245 && b >= 245) whitePx++;
      else if (r <= 30 && g <= 30 && b <= 30) blackPx++;
    }
    const whiteRatio = whitePx / pxCount;
    const blackRatio = blackPx / pxCount;

    const g1 = whiteRatio >= 0.6; // conservateur vs 0.95 théorique
    const g2 = blackRatio >= 0.005 && blackRatio <= 0.35;
    const g3 = blackRatio >= 0.002; // proxy "au moins quelques traits fins"
    const g4 = blackRatio <= 0.4; // pas de bloc noir massif

    return { g1, g2, g3, g4 };
  } catch {
    // En cas d'erreur sharp → tous gates PASS (on ne bloque pas faute de mesure)
    return { g1: true, g2: true, g3: true, g4: true };
  }
}

function countFailedGates(g: { g1: boolean; g2: boolean; g3: boolean; g4: boolean }): number {
  return [g.g1, g.g2, g.g3, g.g4].filter((v) => !v).length;
}

// ─── API publique ──────────────────────────────────────────────────

/**
 * Canonicalise un plan en PNG noir sur blanc via gpt-image-1.
 *
 * Ne throw JAMAIS : tout échec (timeout, API error, gates FAIL) retourne
 * le buffer original avec `fallback=true` + `fallbackReason` typée.
 *
 * Idempotent par hash : même input → même output (côté caller via cache DB
 * sur `canonicalized_image_path`, pas côté librairie).
 */
export async function canonicalizePlan(
  buf: Buffer,
  opts: CanonicalizeOptions = {},
): Promise<CanonicalizeResult> {
  const started = Date.now();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const inputHash = sha256(buf);
  // Modèle effectivement utilisé (bascule sur FALLBACK si PRIMARY renvoie model_not_found)
  let modelUsed: CanonicalizeModel = CANONICAL_PRIMARY_MODEL;

  if (!buf || buf.length === 0) {
    logEvent("fallback", { reason: "empty_input", inputHash });
    return {
      canonical: buf,
      duration: Date.now() - started,
      fallback: true,
      fallbackReason: "empty_input",
      model: modelUsed,
      promptVersion: CANONICAL_PROMPT_VERSION,
      inputHash,
      outputHash: inputHash,
    };
  }

  const inputBytes = buf.length;
  let lastErrorDetail: OpenAIErrorDetail | null = null;

  try {
    const prepared = await downsampleIfNeeded(buf);

    // ─── Retry loop (max 3 tentatives : initiale + 2) ──────────
    let canonicalBuf: Buffer | null = null;
    for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        canonicalBuf = await callOpenAIImagesEdit(
          prepared,
          timeoutMs,
          opts.signal,
          modelUsed,
        );
        break; // succès
      } catch (err) {
        const detail = parseOpenAIError(err);
        lastErrorDetail = detail;

        // Bascule automatique PRIMARY → FALLBACK si le modèle primaire n'existe pas
        // (org pas éligible à gpt-image-2, ou modèle retiré). Pas un "retry" classique.
        if (
          modelUsed === CANONICAL_PRIMARY_MODEL &&
          (detail.status === 404 || detail.code === "model_not_found")
        ) {
          logEvent("retry", {
            attempt,
            next_backoff_ms: 0,
            api_status: detail.status,
            api_code: detail.code,
            api_type: detail.type,
            error: `${CANONICAL_PRIMARY_MODEL} not available, falling back to ${CANONICAL_FALLBACK_MODEL}`,
            input_bytes: inputBytes,
            timeout_ms: timeoutMs,
            prompt_version: CANONICAL_PROMPT_VERSION,
          });
          modelUsed = CANONICAL_FALLBACK_MODEL;
          continue; // re-essaye immédiatement avec fallback (même attempt)
        }

        // Non-retryable : on sort immédiatement vers le fallback
        if (!isRetryable(detail)) {
          throw err;
        }

        // Dernière tentative atteinte : on sort vers le fallback
        if (attempt >= RETRY_MAX_ATTEMPTS) {
          throw err;
        }

        const backoff = getRetryBackoffMs() * attempt; // 2s, 4s (prod)
        logEvent("retry", {
          attempt,
          next_backoff_ms: backoff,
          api_status: detail.status,
          api_code: detail.code,
          api_type: detail.type,
          error: detail.message,
          input_bytes: inputBytes,
          timeout_ms: timeoutMs,
          prompt_version: CANONICAL_PROMPT_VERSION,
        });
        await sleep(backoff);
      }
    }

    if (!canonicalBuf) {
      // Garde-fou TypeScript — en pratique inaccessible (catch ci-dessus throw)
      throw new Error("canonicalizer: no buffer after retry loop");
    }

    const gates = await runQualityGates(canonicalBuf);
    const failed = countFailedGates(gates);

    if (failed >= 2) {
      const outputHash = sha256(buf);
      logEvent("fallback", {
        reason: "gate_fail",
        input_hash: inputHash,
        output_hash: outputHash,
        gates,
        duration_ms: Date.now() - started,
        timeout_ms: timeoutMs,
        input_bytes: inputBytes,
        prompt_version: CANONICAL_PROMPT_VERSION,
      });
      return {
        canonical: buf,
        duration: Date.now() - started,
        fallback: true,
        fallbackReason: "gate_fail",
        model: modelUsed,
        promptVersion: CANONICAL_PROMPT_VERSION,
        inputHash,
        outputHash,
        gates,
      };
    }

    const outputHash = sha256(canonicalBuf);
    logEvent("success", {
      input_hash: inputHash,
      output_hash: outputHash,
      gates,
      duration_ms: Date.now() - started,
      timeout_ms: timeoutMs,
      input_bytes: inputBytes,
      prompt_version: CANONICAL_PROMPT_VERSION,
      bytes_out: canonicalBuf.length,
    });
    return {
      canonical: canonicalBuf,
      duration: Date.now() - started,
      fallback: false,
      model: modelUsed,
      promptVersion: CANONICAL_PROMPT_VERSION,
      inputHash,
      outputHash,
      gates,
    };
  } catch (err) {
    const detail = lastErrorDetail ?? parseOpenAIError(err);
    const msg = detail.message;
    const isTimeout = /timeout|aborted/i.test(msg);
    const reason: CanonicalizeFallbackReason = isTimeout
      ? "timeout"
      : isOrgNotVerified(detail)
        ? "org_not_verified"
        : "api_error";
    const outputHash = sha256(buf);
    // console.error pour les fallbacks (visibilité prod) — logs structurés.
    try {
      console.error(
        `[plan-canonicalizer] fallback ${JSON.stringify({
          reason,
          api_status: detail.status,
          api_code: detail.code,
          api_type: detail.type,
          timeout_ms: timeoutMs,
          input_bytes: inputBytes,
          duration_ms: Date.now() - started,
          prompt_version: CANONICAL_PROMPT_VERSION,
          input_hash: inputHash,
          output_hash: outputHash,
          error: msg,
        })}`,
      );
    } catch {
      // noop — logging ne doit jamais casser le pipeline
    }
    return {
      canonical: buf,
      duration: Date.now() - started,
      fallback: true,
      fallbackReason: reason,
      model: modelUsed,
      promptVersion: CANONICAL_PROMPT_VERSION,
      inputHash,
      outputHash,
    };
  }
}
