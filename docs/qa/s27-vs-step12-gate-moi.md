# s27 — Gate @moi synthèse Round 2 audit cross-agents Versi Studio Étapes 1+2

**Date** : 2026-04-27 — **Session** : s27 — **Auteur** : @moi (proxy fondateur Thomas)
**Périmètre** : synthèse des 4 audits Round 1 (@ia, @design, @persona-marchand, @ux)

---

## 1. Verdict gate finale Thomas

**NO-GO PRODUCTION — strict unanimité 10/10 non atteinte**

Préférence fondateur appliquée : « 1 agent < 10 = NO-GO ». Aucun des 4 audits n'atteint 10/10. Le min absolu est 5,2/10 (@ia). Verdict bloquant maintenu.

| Audit | Note | Verdict local |
|---|---|---|
| @ia | 5,2/10 | NO-GO prod |
| @design | 7,4/10 | NO-GO |
| @persona-marchand | 6,5/10 | NO-GO |
| @ux | 7,2/10 | GO conditionnel |

## 2. Note synthèse

- **Moyenne arithmétique** : (5,2 + 7,4 + 6,5 + 7,2) / 4 = **6,575/10**
- **Min appliqué (règle Thomas)** : **5,2/10** (@ia — pipeline IA bloquant)
- **Note retenue pour le gate** : **5,2/10** — NO-GO

## 3. Top 5 défauts P0 CONVERGENTS (cités par 2+ agents)

1. **Tracé IA non conforme au plan** (@ia, @persona, @ux implicite) — convex hull dans `envelope-polygon.ts` + outline-shrinker rectangle = root cause géométrique des plaintes Thomas s27 « rien à voir avec le plan ». BLOQUANT absolu.
2. **Jargon « contours » x2 dans LotPanel** (@persona, @ux) — `LotPanel.tsx` L344+L360. Terme banni s25, gate G33 BLOQUANT. Fix 5 min. **TRAITÉ EN AUTONOME ORCHESTRATEUR (commit pending)**.
3. **Boutons zoom/undo/redo non confirmés visibles canvas** (@design, @persona, @ux) — toolbar PlanCanvas non auditable, règle s22 « feature invisible = inexistante ». 3 agents sur 4 incapables de confirmer.
4. **Reality check empirique impossible en sandbox** (@ia, @design, @persona) — DNS bloque OpenAI, aucun screenshot, migration `afa382e` gpt-image-2 jamais testée. Pilotage à l'aveugle.
5. **Tokens design system fragmentés** (@design, @ux partiel) — `--color-success` dupliqué (#15803D vs #16A34A), badges confiance Tailwind bruts (red/orange/green), bannière amber hors tokens.

## 4. Top 5 défauts P0 mono-agent

1. **Convex hull `envelope-polygon.ts:67`** (@ia seul) — Andrew's monotone chain déforme tout L/U/T. Fix : concave hull (alpha-shape).
2. **Stepper mobile absent Étape 2** (@design seul) — `aside w-64` sans `hidden md:block`. Inutilisable mobile.
3. **Gates G1-G4 canonicalizer permissifs** (@ia seul) — `whiteRatio ≥ 0.6` vs 0.95 théorique, garbage-in garantie.
4. **Renommage lot non-discoverable mobile** (@ux seul) — bouton crayon `opacity-0 group-hover:opacity-100`, invisible touch.
5. **Bannière calibration non métier** (@persona seul) — « m2_per_pixel » technique, persona ne comprend pas le bénéfice.

## 5. Plan d'action Round 3

**Agents à lancer** (ordre) :
1. **@fullstack** — fixes UI rapides : jargon (DÉJÀ FAIT orchestrateur autonomie) ; stepper mobile E2 (pattern E1) ; bouton crayon `opacity-100` ; tokens `--color-success` unifié + badges confiance via tokens ; H1 E2 → `vs-h3` ; toolbar PlanCanvas zoom/undo visible et permanente.
2. **@ia** — refonte `envelope-polygon.ts` (convex→concave hull alpha-shape) + `outline-shrinker.ts` (suppression rectangle forcé) + durcir gates G1-G4 canonicalizer.
3. **@copywriter** — reformuler bannière calibration en langage métier marchand de biens.

**Fichiers à modifier** : `LotPanel.tsx` ✅, `PlanCanvas.tsx` (jargon ✅, toolbar à confirmer), `lots/page.tsx`, `globals.css`, `envelope-polygon.ts`, `outline-shrinker.ts`, `plan-canonicalizer.ts`.

**P0 prioritaires** : convergent #1 (tracé IA) > convergent #3 (toolbar) > convergent #5 (tokens) > mono #2 (stepper mobile).

**Estimé Round 3** : ~14 tasks (6 @fullstack + 4 @ia + 1 @copywriter + 3 re-audits Round 4).

## 6. Question stratégique Thomas — reality check empirique

Sandbox bloque OpenAI + aucun screenshot Playwright disponible. Le Round 3 corrigera le code mais NE PROUVERA PAS la conformité. Critères de validation Thomas exigés AVANT GO PROD :

1. **Test E2E manuel sur 3 plans hétérogènes** (calque archi propre + scan basse-def + croquis main) avec audit visuel comparatif Yann avant/après.
2. **Screenshots Playwright 3 breakpoints** (375/768/1280) sur les 2 étapes, déposés dans `tests/screenshots/`, re-audit @design.
3. **Tracé IA aligné aux murs** sur ≥2/3 plans test (verbatim Thomas s27 résolu) — preuve visuelle exigée.
4. **Toolbar canvas zoom/undo visible permanent** confirmée par screenshot (règle s22 fondateur).
5. **Query SQL `vs_plans.canonical_fallback_reason`** lancée par Thomas pour valider que gpt-image-2 ne tombe pas en fallback systématique post-`afa382e`.

**Sans ces 5 preuves, GO PROD impossible même si Round 3 atteint 10/10 code-level.**

---

**Handoff → @orchestrator**
- Verdict : NO-GO maintenu, note retenue 5,2/10 (min appliqué)
- Round 3 : lancer @fullstack + @ia + @copywriter en parallèle sur les 5 P0 convergents + 5 P0 mono-agent
- Reality check : Thomas doit valider manuellement les 5 critères avant tout GO PROD post-Round 3
- Fidélité @moi : HAUTE (préférences documentées appliquées strictement — 10/10 obligatoire, min agent, jargon banni s25, découvrabilité s22, reality check E2E s24)
