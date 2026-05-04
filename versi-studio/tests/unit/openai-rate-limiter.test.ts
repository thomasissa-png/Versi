/**
 * Tests unitaires — openai-rate-limiter (s30 Vague 2 backend)
 *
 * Couvre le token bucket : capacité, refill, blocage propre, sérialisation
 * concurrente, tie-break entre waiters. Pas de mock IO — uniquement timing
 * logique avec `vi.useFakeTimers()`.
 *
 * Source test plan §4.4.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OpenAIRateLimiter } from "@/lib/vs/openai-rate-limiter";

describe("OpenAIRateLimiter — construction", () => {
  it("rejette capacity <= 0", () => {
    expect(() => new OpenAIRateLimiter({ capacity: 0, refillPerMinute: 8 })).toThrow();
    expect(() => new OpenAIRateLimiter({ capacity: -1, refillPerMinute: 8 })).toThrow();
  });

  it("rejette refillPerMinute <= 0", () => {
    expect(() => new OpenAIRateLimiter({ capacity: 8, refillPerMinute: 0 })).toThrow();
    expect(() => new OpenAIRateLimiter({ capacity: 8, refillPerMinute: -1 })).toThrow();
  });

  it("démarre avec le bucket plein (capacity tokens disponibles)", () => {
    const lim = new OpenAIRateLimiter({ capacity: 8, refillPerMinute: 8 });
    expect(lim.getAvailableTokens()).toBe(8);
    expect(lim.getQueueLength()).toBe(0);
  });
});

describe("OpenAIRateLimiter — capacité respectée", () => {
  it("capacity 8 : 8 acquireToken successifs passent immédiatement", async () => {
    const lim = new OpenAIRateLimiter({ capacity: 8, refillPerMinute: 8 });
    const start = Date.now();
    for (let i = 0; i < 8; i++) {
      // Resolve immédiat sans timer
      await lim.acquireToken();
    }
    const elapsed = Date.now() - start;
    // Tolérance : 50ms max pour la machinerie interne
    expect(elapsed).toBeLessThan(50);
    expect(lim.getAvailableTokens()).toBe(0);
  });

  it("9e appel met en queue (waiter)", async () => {
    vi.useFakeTimers();
    const lim = new OpenAIRateLimiter({ capacity: 8, refillPerMinute: 8 });
    for (let i = 0; i < 8; i++) await lim.acquireToken();
    let resolved = false;
    const promise = lim.acquireToken().then(() => {
      resolved = true;
    });
    // Pas encore de tick → 1 waiter en queue
    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(lim.getQueueLength()).toBe(1);
    // Avancer 60s : refill devrait libérer le waiter
    await vi.advanceTimersByTimeAsync(60_000);
    await promise;
    expect(resolved).toBe(true);
    vi.useRealTimers();
  });
});

describe("OpenAIRateLimiter — refill", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("après 60s + capacity vide : tokens reset à capacity", async () => {
    const lim = new OpenAIRateLimiter({ capacity: 8, refillPerMinute: 8 });
    for (let i = 0; i < 8; i++) await lim.acquireToken();
    expect(lim.getAvailableTokens()).toBe(0);
    vi.advanceTimersByTime(60_000);
    // getAvailableTokens force un refill
    expect(lim.getAvailableTokens()).toBe(8);
  });

  it("refill linéaire : 30s = capacity / 2 tokens régénérés", async () => {
    const lim = new OpenAIRateLimiter({ capacity: 8, refillPerMinute: 8 });
    for (let i = 0; i < 8; i++) await lim.acquireToken();
    vi.advanceTimersByTime(30_000);
    // 4 tokens régénérés (8 / min × 30 / 60 = 4)
    expect(lim.getAvailableTokens()).toBe(4);
  });

  it("ne dépasse pas capacity même après long délai", async () => {
    const lim = new OpenAIRateLimiter({ capacity: 8, refillPerMinute: 8 });
    // Bucket plein, on attend 10 minutes
    vi.advanceTimersByTime(600_000);
    expect(lim.getAvailableTokens()).toBe(8); // pas de débordement
  });
});

describe("OpenAIRateLimiter — concurrence FIFO", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("20 acquireToken parallèles : 8 immédiats, 12 attendent", async () => {
    const lim = new OpenAIRateLimiter({ capacity: 8, refillPerMinute: 60 }); // refill rapide
    const order: number[] = [];
    const promises = Array.from({ length: 20 }, (_, i) =>
      lim.acquireToken().then(() => order.push(i))
    );
    // Attendre microtask flush — les 8 premiers résolvent
    await Promise.resolve();
    await Promise.resolve();
    expect(order.length).toBe(8);
    expect(lim.getQueueLength()).toBe(12);
    // Avancer pour libérer le reste
    await vi.advanceTimersByTimeAsync(60_000);
    await Promise.all(promises);
    expect(order.length).toBe(20);
    // FIFO : les 8 premiers doivent être dans l'ordre [0..7]
    expect(order.slice(0, 8)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
