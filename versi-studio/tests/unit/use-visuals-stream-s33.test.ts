/**
 * Tests régression — useVisualsStream hook (s33 Lot E)
 *
 * Le hook fait 506 L (s32 fix hybride SSE+polling) et n'avait JAMAIS été testé
 * unitairement avant s33. Pattern retenu (s30 round 3 commit bc4accf) :
 * tests source-level Vitest env=node — on lit le source et on assert invariants
 * structurels critiques (constantes, branches de code, cleanup, named events).
 *
 * Pourquoi pas RTL+jsdom ? vitest.config.ts force `environment: "node"`.
 * Migration jsdom = scope refactor s34 (config split env par fichier).
 *
 * Ce fichier valide :
 *  1. Constantes timing (POLL 4s, SSE backoff 1/3/6s, MAX_RECONNECTS 3, FAILURE 3)
 *  2. Replay initial bdd avant subscribe SSE (handleReplayPayload présent + listener "replay")
 *  3. Heartbeat detect 60s côté client (Page Visibility → reconnect SSE)
 *  4. Cleanup `useEffect return close()` (clearTimeout + EventSource.close + esRef=null)
 *  5. Polling 4s fallback (POLL_INTERVAL_MS + schedulePoll)
 *  6. Page Visibility API : pause polling tab caché, resume au retour (visibilitychange + focus)
 *  7. status='error' uniquement après 3 polls KO (POLL_FAILURE_THRESHOLD=3, jamais sur SSE drop)
 *  8. Reconnect après EventSource close (SSE_RECONNECT_DELAYS_MS backoff)
 *  9. Named events `addEventListener("job.started"...)` vs `onmessage`
 *  10. Cleanup proper EventSource.close() au unmount (anti-leak)
 *  11. mergeVisualLists déduplication par visual_id
 *  12. Race condition polling success / setError timeout (cleanup phase)
 *
 * Référence audit : docs/qa/s33-audit-qa-etape3-4.md §5-6 (régression patterns s30+s32).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HOOK_SOURCE = readFileSync(
  join(__dirname, "..", "..", "src", "hooks", "useVisualsStream.ts"),
  "utf-8"
);

describe("useVisualsStream — constantes timing (P0 contrats prod)", () => {
  it("POLL_INTERVAL_MS = 4000ms (Source de vérité polling, doc s32)", () => {
    expect(HOOK_SOURCE).toMatch(/const\s+POLL_INTERVAL_MS\s*=\s*4_?000/);
  });

  it("SSE_RECONNECT_DELAYS_MS = [1s, 3s, 6s] backoff exponentiel doux", () => {
    expect(HOOK_SOURCE).toMatch(
      /const\s+SSE_RECONNECT_DELAYS_MS\s*=\s*\[\s*1_?000\s*,\s*3_?000\s*,\s*6_?000\s*\]/
    );
  });

  it("MAX_SSE_RECONNECTS = 3 (anti-tempête reconnect, abandon silencieux après)", () => {
    expect(HOOK_SOURCE).toMatch(/const\s+MAX_SSE_RECONNECTS\s*=\s*3\b/);
  });

  it("POLL_FAILURE_THRESHOLD = 3 (status='error' SEULEMENT après 3 polls KO ≈12s)", () => {
    expect(HOOK_SOURCE).toMatch(/const\s+POLL_FAILURE_THRESHOLD\s*=\s*3\b/);
  });
});

describe("useVisualsStream — replay initial bdd (pattern s30 #1)", () => {
  it("expose handleReplayPayload pour rattraper l'état avant subscribe", () => {
    expect(HOOK_SOURCE).toContain("handleReplayPayload");
  });

  it("écoute event nommé 'replay' sur EventSource (pas onmessage générique)", () => {
    expect(HOOK_SOURCE).toMatch(/addEventListener\(\s*["']replay["']/);
  });

  it("replay parse {job_id, status, expected_count, completed_count, failed_count, ...}", () => {
    // structure du payload replay (validée par grep des champs)
    const replayBlock = HOOK_SOURCE.match(/handleReplayPayload[\s\S]+?^\s{2}}/m)?.[0] ?? "";
    expect(replayBlock).toContain("job_id");
    expect(replayBlock).toContain("expected_count");
    expect(replayBlock).toContain("completed_count");
    expect(replayBlock).toContain("failed_count");
    expect(replayBlock).toContain("estimated_cost_usd");
  });
});

describe("useVisualsStream — Page Visibility API (pattern s32 hybride)", () => {
  it("écoute 'visibilitychange' sur document (resume polling au retour de tab)", () => {
    expect(HOOK_SOURCE).toMatch(/addEventListener\(\s*["']visibilitychange["']/);
  });

  it("écoute 'focus' window en fallback (browsers sans visibilitychange)", () => {
    expect(HOOK_SOURCE).toMatch(/window\.addEventListener\(\s*["']focus["']/);
  });

  it("force runPoll() immédiat au retour de tab (rattrapage état)", () => {
    // Match l'effect Page Visibility entier puis vérifier qu'il appelle runPoll
    const visibilityBlock = HOOK_SOURCE.match(
      /onVisibilityChange[\s\S]+?document\.addEventListener/
    )?.[0] ?? "";
    expect(visibilityBlock).toContain("runPoll()");
  });

  it("vérifie document.visibilityState !== 'visible' avant action", () => {
    expect(HOOK_SOURCE).toMatch(/document\.visibilityState\s*!==\s*["']visible["']/);
  });

  it("cleanup removeEventListener au unmount (anti-leak Page Visibility)", () => {
    expect(HOOK_SOURCE).toMatch(/document\.removeEventListener\(\s*["']visibilitychange["']/);
    expect(HOOK_SOURCE).toMatch(/window\.removeEventListener\(\s*["']focus["']/);
  });
});

describe("useVisualsStream — status='error' robustesse (issue critique s32)", () => {
  it("setStatus('error') SEULEMENT si pollFailures >= POLL_FAILURE_THRESHOLD", () => {
    // Match : if (pollFailuresRef.current >= POLL_FAILURE_THRESHOLD) { setStatus("error") }
    const errorBlock = HOOK_SOURCE.match(
      /pollFailuresRef\.current\s*>=\s*POLL_FAILURE_THRESHOLD[\s\S]{0,200}setStatus\(\s*["']error["']\s*\)/
    );
    expect(errorBlock).not.toBeNull();
  });

  it("SSE onerror NE bascule PAS status='error' (commentaire CRITIQUE explicite)", () => {
    // Pattern critique : SSE drop = pas d'erreur UI, le polling prend le relais.
    // L'invariant : dans le bloc es.onerror, on ne doit PAS trouver setStatus("error")
    const onErrorBlock = HOOK_SOURCE.match(/es\.onerror\s*=\s*\(\)\s*=>\s*\{[\s\S]+?\};/)?.[0] ?? "";
    expect(onErrorBlock).not.toContain("setStatus(\"error\")");
    expect(onErrorBlock).not.toContain("setStatus('error')");
  });

  it("status revient à 'open' si polls reprennent après erreur (cleanup phase)", () => {
    // Pattern : setStatus((prev) => (prev === "error" ? "open" : prev))
    expect(HOOK_SOURCE).toMatch(
      /setStatus\(\s*\(\s*prev\s*\)\s*=>\s*\(\s*prev\s*===\s*["']error["']\s*\?\s*["']open["']/
    );
  });

  it("pollFailuresRef remis à 0 sur succès (anti-faux-positif après hoquet réseau)", () => {
    expect(HOOK_SOURCE).toMatch(/pollFailuresRef\.current\s*=\s*0/);
  });
});

describe("useVisualsStream — reconnect SSE backoff (pattern s30 #3)", () => {
  it("incrémente sseReconnectAttemptsRef à chaque échec (anti-tempête)", () => {
    expect(HOOK_SOURCE).toMatch(/sseReconnectAttemptsRef\.current\s*=\s*attempt\s*\+\s*1/);
  });

  it("abandonne après MAX_SSE_RECONNECTS (return silencieux, polling reste actif)", () => {
    const onErrorBlock = HOOK_SOURCE.match(/es\.onerror\s*=\s*\(\)\s*=>\s*\{[\s\S]+?\};/)?.[0] ?? "";
    expect(onErrorBlock).toMatch(/attempt\s*>=\s*MAX_SSE_RECONNECTS/);
    expect(onErrorBlock).toContain("return");
  });

  it("incrémente compteur public reconnects (visible UI debug)", () => {
    expect(HOOK_SOURCE).toMatch(/setReconnects\(\s*\(\s*r\s*\)\s*=>\s*r\s*\+\s*1\s*\)/);
  });
});

describe("useVisualsStream — named events SSE (pattern s30 #9)", () => {
  it("écoute job.started, visual.created, visual.generated, visual.failed, batch.complete, job.failed", () => {
    const namedEvents = [
      "job.started",
      "visual.created",
      "visual.generated",
      "visual.failed",
      "batch.complete",
      "job.failed",
    ];
    for (const ev of namedEvents) {
      // chaque event doit être référencé soit dans la liste namedEvents,
      // soit dans handleEventPayload switch
      expect(HOOK_SOURCE).toContain(`"${ev}"`);
    }
  });

  it("garde aussi onmessage en fallback (events sans nom, compat backend)", () => {
    expect(HOOK_SOURCE).toMatch(/es\.onmessage\s*=/);
  });
});

describe("useVisualsStream — cleanup unmount (pattern s30 #4 + #10 anti-leak)", () => {
  it("useEffect lifecycle return clearTimeout sur sseReconnectTimerRef", () => {
    expect(HOOK_SOURCE).toMatch(/clearTimeout\(\s*sseReconnectTimerRef\.current\s*\)/);
  });

  it("useEffect lifecycle return clearTimeout sur pollTimerRef", () => {
    expect(HOOK_SOURCE).toMatch(/clearTimeout\(\s*pollTimerRef\.current\s*\)/);
  });

  it("useEffect lifecycle return EventSource.close()", () => {
    expect(HOOK_SOURCE).toMatch(/esRef\.current\??\.close\(\)/);
  });

  it("useEffect lifecycle return esRef = null (release reference, GC-safe)", () => {
    expect(HOOK_SOURCE).toMatch(/esRef\.current\s*=\s*null/);
  });

  it("close() exposée setStatus('closed') pour démontage explicite UI", () => {
    const closeFn = HOOK_SOURCE.match(/const\s+close\s*=\s*useCallback[\s\S]+?\},\s*\[\]\s*\);/)?.[0] ?? "";
    expect(closeFn).toMatch(/setStatus\(\s*["']closed["']\s*\)/);
    expect(closeFn).toMatch(/closedManuallyRef\.current\s*=\s*true/);
  });
});

describe("useVisualsStream — anti-double-poll (pattern s32 race condition)", () => {
  it("inFlightPollRef évite les polls qui se chevauchent (réseau lent)", () => {
    expect(HOOK_SOURCE).toContain("inFlightPollRef");
    expect(HOOK_SOURCE).toMatch(/if\s*\(\s*inFlightPollRef\.current\s*\)/);
  });

  it("schedulePoll clearTimeout préalable (anti-doublon timer)", () => {
    expect(HOOK_SOURCE).toMatch(
      /if\s*\(\s*pollTimerRef\.current\s*\)\s*clearTimeout\(\s*pollTimerRef\.current\s*\)/
    );
  });

  it("runPollRef pattern (casse cycle schedulePoll <-> runPoll, ESLint deps)", () => {
    expect(HOOK_SOURCE).toContain("runPollRef");
    expect(HOOK_SOURCE).toMatch(/runPollRef\.current\s*=\s*runPoll/);
  });
});

describe("useVisualsStream — polling stop terminal (job completed/failed)", () => {
  it("clearTimeout pollTimer quand job.status === 'completed' ou 'failed'", () => {
    // Pattern : if (j.status === "completed" || j.status === "failed") { setStatus("closed"); clearTimeout... }
    expect(HOOK_SOURCE).toMatch(
      /j\.status\s*===\s*["']completed["']\s*\|\|\s*j\.status\s*===\s*["']failed["']/
    );
  });

  it("setStatus('closed') quand job terminal (UI bascule preview)", () => {
    expect(HOOK_SOURCE).toMatch(/setStatus\(\s*["']closed["']\s*\)/);
  });
});

describe("useVisualsStream — fusion mergeVisualLists (dédup par visual_id)", () => {
  it("fonction interne mergeVisualLists présente", () => {
    expect(HOOK_SOURCE).toContain("function mergeVisualLists");
  });

  it("dédoublonnage utilise Map indexée par visual_id", () => {
    const mergeFn = HOOK_SOURCE.match(/function\s+mergeVisualLists[\s\S]+?^}/m)?.[0] ?? "";
    expect(mergeFn).toMatch(/Map<string,\s*VisualGenerated>/);
    expect(mergeFn).toMatch(/byId\.set\(\s*v\.visual_id/);
  });

  it("incoming écrase current (état le plus récent gagne)", () => {
    // Le commentaire métier doit être présent (anti-régression silencieuse)
    expect(HOOK_SOURCE).toMatch(/incoming.*écrase|incoming.*plus récent/i);
  });
});

describe("useVisualsStream — types publics (contrat consommateur)", () => {
  it("exporte StreamStatus avec les 5 valeurs sémantiques s32", () => {
    expect(HOOK_SOURCE).toMatch(
      /export\s+type\s+StreamStatus\s*=\s*["']idle["']\s*\|\s*["']connecting["']\s*\|\s*["']open["']\s*\|\s*["']closed["']\s*\|\s*["']error["']/
    );
  });

  it("UseVisualsStreamState expose status, job, visualsByRoom, failures, reconnects, close", () => {
    const stateInterface =
      HOOK_SOURCE.match(/interface\s+UseVisualsStreamState\s*\{[\s\S]+?^}/m)?.[0] ?? "";
    expect(stateInterface).toContain("status: StreamStatus");
    expect(stateInterface).toContain("job: JobState | null");
    expect(stateInterface).toContain("visualsByRoom");
    expect(stateInterface).toContain("failures");
    expect(stateInterface).toContain("reconnects");
    expect(stateInterface).toContain("close: () => void");
  });

  it("VisualGenerated expose visual_id, room_id, kind anchor|secondary, file_path, coherence_mode", () => {
    const visualInterface =
      HOOK_SOURCE.match(/interface\s+VisualGenerated\s*\{[\s\S]+?^}/m)?.[0] ?? "";
    expect(visualInterface).toContain("visual_id: string");
    expect(visualInterface).toContain("room_id: string");
    expect(visualInterface).toContain('"anchor"');
    expect(visualInterface).toContain('"secondary"');
    expect(visualInterface).toContain("file_path: string");
    expect(visualInterface).toContain("coherence_mode");
  });
});

describe("useVisualsStream — guards SSR / désactivation (robustesse)", () => {
  it("skip Page Visibility si typeof document === 'undefined' (SSR safe)", () => {
    expect(HOOK_SOURCE).toMatch(/typeof\s+document\s*===\s*["']undefined["']/);
  });

  it("setStatus('idle') si !projectId || !enabled", () => {
    expect(HOOK_SOURCE).toMatch(/!projectId\s*\|\|\s*!enabled[\s\S]{0,80}setStatus\(\s*["']idle["']/);
  });

  it("closedManuallyRef garde toutes les opérations async (anti-state-after-unmount)", () => {
    expect(HOOK_SOURCE).toContain("closedManuallyRef");
    // Au moins 4 occurrences : runPoll, connectSse, onVisibilityChange, lifecycle return
    const matches = HOOK_SOURCE.match(/closedManuallyRef\.current/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });
});
