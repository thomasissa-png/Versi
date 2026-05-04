/**
 * Versi Studio — Token bucket simple en mémoire pour OpenAI images.edit
 *
 * Contexte s29 (Étape 4 v2) : 1 projet de 10 pièces × 2 visuels = ~20 appels
 * gpt-image-2 images.edit en parallèle inter-pièces (pool 4). Le tier OpenAI
 * de Versi Studio est limité à ~10 img/min — sans rate limiting interne, on
 * hit le 429 en mid-pipeline et 50% des visuels échouent.
 *
 * Implémentation : token bucket classique, capacity 8, refill 8 tokens/min.
 * Suffisant pour V2 mono-instance Replit autoscale. À remplacer par Redis
 * (rate limit distribué) si V3 multi-worker.
 *
 * Usage :
 *   await imagesEditLimiter.acquireToken();
 *   await openai.images.edit({ ... });
 *
 * NE PAS appliquer aux appels gpt-4o-mini (analyses signature, T3, T4) — ils
 * ont leur propre rate limit (beaucoup plus généreux : 500 req/min Tier 4).
 */

export interface TokenBucketConfig {
  /** Nombre maximum de tokens disponibles à un instant T. */
  capacity: number;
  /** Nombre de tokens régénérés par minute. */
  refillPerMinute: number;
}

/**
 * Token bucket simple en mémoire (mono-process).
 *
 * Garanties :
 * - acquireToken() bloque jusqu'à disponibilité (Promise resolve quand 1 token dispo)
 * - Pas de starvation : FIFO sur les waiters
 * - Refill continu : taux constant `refillPerMinute / 60` tokens par seconde
 * - Cap à `capacity` : un bucket plein ne déborde pas
 */
export class OpenAIRateLimiter {
  private tokens: number;
  private readonly capacity: number;
  private readonly refillRatePerMs: number;
  private lastRefillAt: number;
  /** File FIFO des promesses en attente de token. */
  private waiters: Array<() => void> = [];

  constructor(config: TokenBucketConfig) {
    if (config.capacity <= 0) {
      throw new Error("OpenAIRateLimiter: capacity must be > 0");
    }
    if (config.refillPerMinute <= 0) {
      throw new Error("OpenAIRateLimiter: refillPerMinute must be > 0");
    }
    this.capacity = config.capacity;
    this.tokens = config.capacity; // bucket plein au démarrage
    this.refillRatePerMs = config.refillPerMinute / 60_000;
    this.lastRefillAt = Date.now();
  }

  /**
   * Régénère les tokens accumulés depuis le dernier appel.
   * Appelé à chaque acquireToken() pour mise à jour lazy (pas de timer).
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillAt;
    if (elapsed <= 0) return;
    const refilled = elapsed * this.refillRatePerMs;
    this.tokens = Math.min(this.capacity, this.tokens + refilled);
    this.lastRefillAt = now;
  }

  /**
   * Acquiert 1 token, attend si nécessaire.
   *
   * Si bucket > 0 : retourne immédiatement (consomme 1 token).
   * Sinon : enqueue un waiter, attend le prochain refill suffisant.
   *
   * Pas de timeout côté limiter — le caller doit wrapper d'un AbortSignal
   * si nécessaire (typiquement le timeout HTTP gère le cas).
   */
  async acquireToken(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    // Pas de token dispo — enqueue et attendre
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
      this.scheduleNextRefillTick();
    });
  }

  /**
   * Programme un tick de réveil pour servir le prochain waiter dès qu'un token
   * est dispo. Utilise setTimeout calibré sur le delta nécessaire pour atteindre
   * 1 token (évite le polling fréquent).
   */
  private scheduleNextRefillTick(): void {
    if (this.waiters.length === 0) return;
    // Temps pour produire 1 token entier depuis l'état actuel
    const tokensNeeded = 1 - this.tokens;
    const msUntilOneToken = Math.max(50, Math.ceil(tokensNeeded / this.refillRatePerMs));
    setTimeout(() => this.tickWaiters(), msUntilOneToken);
  }

  /** Sert les waiters tant qu'on a des tokens. */
  private tickWaiters(): void {
    this.refill();
    while (this.tokens >= 1 && this.waiters.length > 0) {
      this.tokens -= 1;
      const resolve = this.waiters.shift();
      if (resolve) resolve();
    }
    // S'il reste des waiters sans tokens, replanifier
    if (this.waiters.length > 0) {
      this.scheduleNextRefillTick();
    }
  }

  /** Diagnostic : tokens disponibles (utile pour /api/health). */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /** Diagnostic : nombre de waiters en attente. */
  getQueueLength(): number {
    return this.waiters.length;
  }
}

// ─── Singleton partagé pour images.edit ────────────────────────────
//
// Capacité 8 + refill 8/min = ~1 appel toutes les 7.5s à régime soutenu.
// Burst initial : 8 appels immédiats puis throttling.
// Compatible avec Tier 4 OpenAI (10 img/min) avec marge de sécurité.
export const imagesEditLimiter = new OpenAIRateLimiter({
  capacity: 8,
  refillPerMinute: 8,
});
