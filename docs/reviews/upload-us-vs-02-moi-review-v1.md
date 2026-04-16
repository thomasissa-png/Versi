# Revue @moi — Upload US-VS-02 v1

> Contenu produit par @moi le 2026-04-16 lors du Batch 3 versi-s15. Livré inline par l'agent (conflit system prompt), sauvegardé par Claude principal pour exploitation @fullstack Batch 4.

## 1. Synthèse 5 audits

- **@qa (6/10)** : 3 P0 code — L106 floor_number hardcodé "0", L141 confirm() natif, L186 handleAnalyze sans extraction IA. 11/13 AC sans test E2E. G21/G26/G27 FAIL.
- **@ux (6/10)** : 3 P0 UX — F1 confirm() natif L141 (rupture DS), F2 floor_number optimistic sans persistance (mensonge UX L170), F3 bouton Analyser sans loading state L186 (double-submit).
- **@copywriter (6/10)** : 2 P0 copy — F6 typo "irreversible" → "irréversible" (L141), F5 erreur réseau L122 non actionnable. 8 P1 (anglicismes "uploader/uploadé" × 4 occurrences).
- **@product-manager (arbitrages 4/4)** : upload parallèle OK, retry par fichier OK, WEBP aligné vers spec (pas code), floor_number calculé `plans.length + index` + PATCH /api/vs/plans/[id].
- **@design (6.5/10)** : F18 P0 Stepper actif incohérent DS (fond blanc vs spec fond noir + texte inverse). 4 violations G22 (F3 contraste muted/blanc, F5 outline:none input étage, F6 focus+touch bouton fermer toast, F11 prefers-reduced-motion absent). F12 primitive `gris-pierre` directe = violation G31.

## 2. Convergence détectée

**Signal fort** — 3 agents indépendants convergent sur les mêmes 3 lignes de code :

| Ligne | @qa | @ux | @copywriter | @design |
|---|---|---|---|---|
| **L141 confirm()** | P0 (bug) | P0 (F1 rupture DS) | P0 (F6 typo "irreversible") | — |
| **L170 floor_number PATCH** | P0 (bug bloquant) | P0 (F2 mensonge UX) | — | — |
| **L186 handleAnalyze** | P0 (bug) | P0 (F3 pas loading) | P1 (F14 pas actionnable) | P1 (F17) |
| **L106 floor_number="0"** | P0 (bug silencieux) | — | — | — |
| **L122 erreur réseau** | — | — | P0 (F5 pas actionnable) | — |

Les convergences L141 / L170 / L186 sont **bloquantes non négociables**.

## 3. Contradictions inter-agents

**Aucune contradiction bloquante détectée.** 3 points méritent arbitrage :

- **Upload parallèle (L102-126)** : @pm tranche "parallèle" (spec AC08), @ux confirme (F4 P1), @qa classe en P2-03. → Arbitrage @pm prime : **P0 parallèle**.
- **Retry par fichier** : @pm P0, @qa P2-04, @ux P1 (F5). → Arbitrage @pm prime : **P0**.
- **WEBP** : @qa T-P2-07 "à clarifier", @pm tranche "aligner spec sur code". → **Mise à jour spec uniquement, zéro action code**.

**Doublon P0 consolidé** : @copywriter F6 (typo) et @ux F1 (confirm natif) adressent L141 — le refactor modal absorbe la typo.

## 4. Priorités P0 consolidées pour @fullstack Batch 4

| # | Finding | Source agents | Ligne code | Action attendue |
|---|---|---|---|---|
| **P0.1** | Modal de confirmation suppression (remplace `confirm()` natif + typo "irréversible") | @qa + @ux (F1) + @copy (F6) | `page.tsx:141` + nouveau `src/components/vs/ConfirmModal.tsx` | Créer `<ConfirmModal>` réutilisable : titre "Supprimer ce plan ?", message "Cette action est irréversible. Le fichier sera supprimé définitivement.", boutons "Supprimer" (destructeur) + "Annuler". Focus trap + Escape. Tokens DS (`color-status-error-*`). |
| **P0.2** | `floor_number` auto-incrémenté côté client + endpoint PATCH | @qa (L106) + @ux (F2) + @pm | `page.tsx:106` + nouveau `src/app/api/vs/plans/[id]/route.ts` | (a) L106 : `formData.append("floor_number", String(plans.length + index))`. (b) Créer PATCH `/api/vs/plans/[id]` body `{floor_number: number}` pour persister `handleFloorChange` L170. |
| **P0.3** | Bouton "Analyser" avec état loading + extraction IA déclenchée | @qa + @ux (F3) | `page.tsx:186` | (a) State `isAnalyzing`, `setIsAnalyzing(true)` début, `setIsAnalyzing(false)` dans catch. (b) `disabled={isAnalyzing}` + spinner + "Analyse en cours…". (c) Ajouter `POST /api/vs/projects/[id]/extract` AVANT `router.push('/lots')`. |
| **P0.4** | Erreur réseau actionnable | @copy (F5) | `page.tsx:122` | `${file.name} n'a pas pu être déposé — vérifiez votre connexion et réessayez.` |
| **P0.5** | Upload parallèle (refactor `for…of` → `Promise.allSettled`) + AbortController | @pm AC08 + @ux (F4) | `page.tsx:102-126` | `Promise.allSettled(filesToUpload.map((file, index) => uploadFile(file, index)))`. Index utilisé pour floor_number (P0.2). Inclure AbortController (race conditions). |
| **P0.6** | Retry par fichier (AC09) | @pm + @ux (F5) + @qa | `page.tsx` + UI grille | State `failedFiles: {file, error}[]`. Tuile "Échec — Réessayer" par fichier échoué. Bouton relance isolée. |
| **P0.7** | Stepper actif conforme DS (+ mapping token `error`) | @design (F18) + F4 | `src/components/vs/Stepper.tsx` | État actif : `bg-bg-dark text-text-inverse border-l-[3px] border-text-default`. Supprimer `bg-bg-card border border-border-default`. Mapper token `error` sur `color-status-error-*`. |
| **P0.8** | Mise à jour spec WEBP | @pm arbitrage | `docs/product/vs-functional-specs.md:304` | AC04 : message toast "Format non supporté — utilisez PDF, PNG, JPG ou WEBP". L323 : `floor_number: number` obligatoire + ajouter endpoint PATCH documenté. |

**P1 packagés dans la même passe @fullstack** :
- Anglicismes "uploadez" → "déposez" × 4 occurrences (H1 L233, compteur L305-308, progression L294-296, CTA "Lancer l'analyse" L341).
- `motion-reduce:animate-none` + `motion-reduce:transition-none` (4 fichiers).
- `hover:border-gris-pierre/50` → token sémantique.
- `focus-visible:outline-2` sur input étage (PlanThumbnail).
- Touch + focus bouton fermer toast.
- Alimenter `completedSteps` depuis `project.status`.
- "Étage 0 — RDC" dans PlanThumbnail.

## 5. Arbitrages si j'étais Thomas (fondateur)

- **Upload parallèle vs séquentiel** : **parallèle** sans hésitation. Marchand de biens ne peut pas attendre 50s pour 10 plans. Coût dev quasi nul.
- **Retry par fichier vs global** : **par fichier**. Re-déposer 10 fichiers pour 1 échec inacceptable. **P0 confirmé**.
- **WEBP** : **aligner spec sur code**. iOS natif WEBP = friction pour rien.
- **`confirm()` natif modal** : **modal DS obligatoire**. Rupture crédibilité maximale sinon. 1h pour un composant réutilisable US-VS-03/04/05.
- **`floor_number`** : **client + serveur**. Les deux, coût identique.
- **Extraction IA dans `handleAnalyze`** : **à valider par Thomas** — où est déclenchée l'extraction IA dans la chaîne actuelle ? Aucun audit ne le dit.
- **Anglicismes "uploader/uploadé"** : **remontée en P0**. Signal de qualité, pas détail de registre. 4 Edits triviaux.
- **Typo "irreversible"** : **P0 immédiat même si modal repoussé**. 1 caractère.

## 6. Risques pour la clôture Étape 1

- **Risque 1 — Extraction IA floue** : `handleAnalyze` ne déclenche pas `POST /extract`. Aucun audit ne tranche **où** l'extraction IA se déclenche. **Gate bloquante pour 10/10** : clarifier avant Batch 4 (sinon violation règle n°18 "process métier = vérité fondateur").
- **Risque 2 — Baselines screenshots G26** : aucune baseline `versi-studio/tests/screenshots/upload/`. @fullstack doit exécuter la boucle visuelle AVANT que @qa écrive les tests.
- **Risque 3 — Tests E2E vs code buggé** : séquencement obligatoire → @fullstack corrige → boucle visuelle → @qa tests → re-audit.
- **Risque 4 — Token `error` non défini** : couplage P0.7 + F4 dans le même Edit Stepper.
- **Risque 5 — `AbortController` absent** : regrouper dans refactor P0.5.

## 7. Handoff

**→ @orchestrator (planning Batch 4)**

- **Décisions prises** :
  - 8 P0 consolidés (P0.1 à P0.8) — convergence QA+UX+Copy+Design+PM
  - P1 anglicismes remontés en P0 côté fondateur
  - Typo "irréversible" absorbée dans P0.1 (P0 immédiat si modal reporté)
- **Ordre d'exécution recommandé** (séquencement strict) :
  1. **Clarification extraction IA** (décision Thomas ou @ia préalable) — bloque P0.3
  2. **@fullstack Batch 4a — Corrections code P0.1 à P0.7** (parallélisables)
  3. **@fullstack Batch 4b — Boucle visuelle screenshots** (3 devices × 3+ états) APRÈS P0.7
  4. **@pm Batch 4c — Mise à jour spec WEBP** (P0.8, parallélisable)
  5. **@qa Batch 5 — 7 tests P0 + fixtures adversariaux** (APRÈS code + baselines)
  6. **Re-audit complet @ux + @design + @copy + @qa** (9/10 min sur chaque)
- **Validation finale Étape 1** : unanimité 9/10 min + gates BLOQUANT PASS (G21, G22, G26, G27).

**À valider par Thomas** :
1. **Architecture extraction IA** : où est déclenché `POST /extract` ? Client `handleAnalyze` ? Serveur au status change `step_1_complete` ? Page `/lots` au chargement ?
2. **Priorité anglicismes** : OK pour remonter en P0 ou maintenir en P1 ?

**Points d'attention** :
- Consolidation P0.1 : le modal `<ConfirmModal>` sera réutilisé US-VS-03/04/05 — spécifier dans `component-library.md`
- Couplage F4 design + P0.7 : Stepper ET mapping token `error` dans la même passe
- AbortController à inclure dans P0.5
- Compteur session : Task #8/15. Reste 7 slots avant ALERTE ROUGE.

---

**Limite de fidélité @moi** : HAUTE sur P0.1 à P0.7 (convergence multi-agents = signal maximal). MOYENNE sur P0.8 (WEBP — pas de précédent Thomas). `[NOUVEAU TERRITOIRE — extraction IA]` : priorité maximale pour enrichir founder-preferences.md post-décision.
