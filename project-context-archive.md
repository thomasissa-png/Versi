# Archive — Mémos de reprise sessions anciennes (Versi)

Ce fichier archive les mémos de reprise des sessions > 5 sessions (règle TTL commandement n°8 CLAUDE.md). Sessions conservées dans `project-context.md` : s22, s23, s24, s25, s26. Sessions archivées ci-dessous : s21, s20, s19, s18, s17, s16, s14.

Rotation : à la clôture de chaque nouvelle session, la session la plus ancienne de `project-context.md` (6ème rang) migre ici.

---

### Mémo de reprise versi-s21 (archive)

**Branche dernière clôturée** : `claude/versi-s21-launch-OsqlY`
**Date de clôture** : 2026-04-17
**Statut s21** : CLÔTURÉE — Clustering IA `unit_id` + Polygones IA implémentés, 3 itérations audit 7.0 → 9.04 → 9.37/10, @moi GO PRODUCTION ferme

**Résumé session versi-s21 (~22 commits, 7 phases)** :

1. **Phase 0 propagation learnings s20** : 7/7 propagés (cross-agents 3 iter, @creative-strategy proxy, canvas.width guard, double-clic polygone, PDF→PNG, validation factorisée, no AI > bad AI)

2. **Phase 1 branche + décision P1 Thomas** : option A+B combinée (clustering unit_id + polygones IA)

3. **Phase 2 specs** : docs/product/clustering-ia-spec.md (US-VS-21/22) + docs/ia/extraction-enrichie-spec.md (schema enrichi + prompt STEP 3b/5b/7)

4. **Phase 3 implémentation** : schemas.ts + plan-extractor.ts + extract/route.ts + clustering.ts + LotPanel.tsx + lots/page.tsx + db.ts (colonne confidence_avg)

5. **Phase 4 audit cross-agents 3 itérations** :
   - **it1** : 5 audits parallèles (QA 5.8, UX 7.4, PM 7.4, IA 7.2, persona Thomas 7.2) = moyenne 7.0/10, 10 P0
   - **it2** : 3 bundles parallèles (A backend + B UI + C tests) → re-audits (QA 8.8, UX 9.2, PM 9.2, IA 9.2, persona 8.8) = moyenne 9.04, 0 P0
   - **it3 mini typist** : 5 fix ciblés en 25 lignes (route.continue→fulfill 404, touch 44px, H1 conditionnel, note bbox, bordure IA) → re-audits QA 9.0 + UX 9.6 + persona 9.5 = moyenne 9.37

6. **Phase 5 tests** : 23 cas Vitest clustering.test.ts + matrice G27 TESTING.md + fix flaky waitForTimeout

7. **Phase 6 gate finale @moi** : GO PRODUCTION ferme (pas conditionnel). Thomas fondateur "renouvelle l'abonnement sans hésitation"

8. **Phase "rouverte" P3+P5+P4** (Thomas a demandé "pourquoi clôturer ?") :
   - **P3 tests exécutés réellement** : `npm install` + `npx vitest run` 58/58 PASS + `npx tsc --noEmit` 0 erreur + `npm run lint` 0 erreur prod (2 erreurs legacy `reference-existant/`) + `npx playwright test clustering-ia.spec.ts` 5/5 PASS après fix 3 régressions tests
   - **P5 Vitest `isValidZone`** : 30/30 cas (zone-validation.test.ts NEW), 0 bug détecté dans `types.ts`, validation DRY s20 confirmée
   - **P4 Analytics events** : spec `docs/analytics/vs-s21-clustering-events.md` + helper `analytics.ts` isomorphe + 4 inserts (extract/route.ts + lots/page.tsx) via typist @fullstack — V1 logging JSON sans SDK externe, stack PostHog/Mixpanel reportée s22 via `/api/vs/analytics`

**Priorités pour s22 (proposées, Thomas tranche au démarrage)** :

| # | Priorité | Estimation Tasks |
|---|---|---|
| P1 | **POC OCR auto-calibration en réel** (seul item du brief s21 non traité) : `OPENAI_API_KEY` + 5-10 plans (haussmanniens R+3, immeubles modernes, villas, scans basse qualité) à déposer dans `/home/user/Versi/test-plans/` + mesure accuracy réelle → décision GO V1 promotion / ajustement seuil 0.9 / suppression POC | 1-2 |
| P2 | **Backlog produit suivant** : Auth (D) / Dashboard multi-projets (E) / Export acquéreur PDF+lien (F) / Validation cross-étapes KPI NS (G) / Finitions (H) | 5-8 selon option |
| P3 | **Stack analytics V2** : migration logging JSON → SDK (PostHog self-hosted ou Plausible) + endpoint `/api/vs/analytics` + dashboard KPI North Star "taux validation 1-clic" | 3-5 |
| P4 | **Nettoyage P1 backlog maintenance s21** (7 items cosmétiques/défensifs documentés dans `docs/reviews/vs-s21-audit-it2-bundle.md`) : bordure IA ternaire sélection (UX-P1-R2), icône ★ → SVG inline (UX-P1-N1), `computeAvgX([])` NaN (QA), `.nullable().optional()` Zod redondant (IA), double regex insensibilité (QA), duplication mock routes E2E (QA), fix 2 erreurs ESLint legacy `reference-existant/PlanEditor.tsx` | 1-2 |
| P5 | **Hypothèses complexes (si pertinent)** : refonte onboarding Versi Studio / intégration Stripe abonnement / multi-tenants / migration Replit→Vercel | 8-12 |

**Propagation P0/P1 OBLIGATOIRE s22 (gate de reprise — AVANT tout nouveau travail)** :

10 learnings versi-s21 statut propagation = `à-faire` à propager (6 initiaux + 4 nouveaux de la session rouverte) :
1. **Orchestrator background n'a PAS Task** (P0) → `CLAUDE.md` règle n°4 exception + `orchestrator.md` STOP
2. **Pattern audit cross-agents 3 itérations — méthode canonique** (P1) → `orchestrator.md` promotion
3. **Pattern typist it3 mini** (P1) → `orchestrator.md` section dédiée
4. **Triple filtre clustering IA (avg + min + count)** (P1) → `ia.md` patterns clustering
5. **Anti-pattern `route.continue()` fallback Playwright** (P1) → `qa.md` patterns E2E
6. **Bundle P0 unanimes + isolés** (P2) → `orchestrator.md` consolidation post-audits
7. **Clôture prématurée après P1** (P1 — Thomas a dû rouvrir la session) → `orchestrator.md` + `CLAUDE.md` : ne jamais clôturer une session sans avoir traité TOUTES les priorités du brief initial
8. **Tests écrits ≠ tests validés** (P1) → `qa.md` + `CLAUDE.md` règle n°3 : ajouter "les tests DOIVENT être exécutés RÉELLEMENT avant de déclarer une feature terminée" (pas juste écrits)
9. **Port dev 5000 vs Playwright 3000** (P2) → `fullstack.md` + `qa.md` : aligner `PORT` dans `package.json` et `playwright.config.ts`
10. **Vitest absent de package.json versi-s21** (P2) → `qa.md` : ajouter `vitest` comme `devDependency` lors de la création de `tests/unit/*.test.ts`

**Marqueur de contenu validé** : `Grep "clusterByUnit" versi-studio/src/lib/vs/clustering.ts` (clustering IA unit_id ajouté s21)

**Patterns validés à réutiliser** :
- **Pattern audit cross-agents 3 itérations** (validé 2x : s20 + s21) → méthode canonique refonte persona-sensitive
- **Pattern typist it3 mini** (nouveau s21) — quand it2 ≥ 9.0 avec ≤5 P1 triviaux, 5 fix ciblés < 80 lignes en 1 @fullstack + re-audit 3 agents
- **Pattern Express 4 batches** (versi-s19 × 3) — stabilisé pour étapes frontend complexes non persona-sensitive
- **Pattern @creative-strategy proxy persona** (versi-s20 + s21) — incarner Thomas marchand pour audit valeur métier

**Blocage résolu en fin de session** : `node_modules` absent en début de session, installé via `npm install` (versi-studio) + `npm install -D vitest` + `npx playwright install chromium` (browsers dans `/opt/pw-browsers`). Environnement de test complet et fonctionnel. Pour Playwright, lancer le serveur dev sur **port 3000** (pas 5000 par défaut) : `npx next dev -p 3000 -H 0.0.0.0 &` puis `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx playwright test`.

**Commande de reprise suggérée pour s22** (archivée, s22 clôturée) :

```
@orchestrator session versi-s22. Lire project-context.md mémo reprise s21→s22 (priorités P1-P5 + 10 learnings à propager).
```

---

### Propagation P0/P1 OBLIGATOIRE s23 (gate de reprise — AVANT tout nouveau travail)

16 learnings s22 statut propagation = `à-propager` (corrections source faites, propagation dans agents/CLAUDE.md restante) :

**Learnings P0** (4 items) :
1. **Reality check E2E obligatoire avant GO PRODUCTION** → CLAUDE.md règle n°21 + qa.md + moi.md + orchestrator.md
2. **Découvrabilité UI : feature invisible = feature inexistante** → CLAUDE.md règle discoverability + ux.md + founder-preferences.md
3. **Pas de négociation sur la note cible** (Thomas refuse 8/10) → founder-preferences.md + moi.md + ia.md
4. **Validation "10/10" superficielle** (Canvas non-vide ≠ reality check) → CLAUDE.md règle n°21 renforcée + qa.md + moi.md
5. **Canvas éditeur = undo/redo obligatoire** (Ctrl+Z + boutons UI) → ux.md + fullstack.md + founder-preferences.md

**Learnings P1** (7 items) :
6. **Pattern typist parallèle 3 Task** → orchestrator.md
7. **Pattern 2-pass extraction polygones** → ia.md section patterns IA vision
8. **Règles négatives > positives pour gpt-image-1** → ia.md section prompt engineering image
9. **Minimum de clics par défaut** (bouton unique préféré) → ux.md + founder-preferences.md
10. **`openai.responses.create()` ne supporte pas gpt-image-1** → ia.md section OpenAI API endpoints
11. **Comparateur avant/après obligatoire sur génération IA** → ux.md + founder-preferences.md
12. **Import agents Versimo + workflow audit visuel** → orchestrator.md rappel utilisation

**Learnings P2** (3 items) :
13. **Orchestrator subagent faux négatif sur outil Task** → orchestrator.md (déjà en partie dans s21, renforcer)
14. **@ia timeout sur briefs > 2000 mots** → CLAUDE.md règle n°3 section @ia + ia.md
15. **Pattern fallback orphan rooms clustering** → ia.md section clustering

**Bonus** (cas particulier) :
16. **Pas de modification silencieuse du workflow métier** (nav sans revalidation) → ux.md + founder-preferences.md

**Format propagation** : pour chaque learning, Edit le fichier cible avec section/règle correspondante. Après propagation, passer statut à `propagé` dans `docs/lessons-learned.md`.

### Priorités proposées pour s23 (Thomas tranche au démarrage)

| # | Priorité | Estimation Tasks | Notes |
|---|---|---|---|
| P1 | **Migration Versimo v61 — implémentation** : adopter style-resolver + style-variants + builders par pièce (kitchen/bathroom/bedroom/living-room) + equipment preservation + cleanup temporaires. Référence `/tmp/versimo-ref/` (cloner si nécessaire depuis `thomasissa-png/Architecture` branche `claude/session-recovery-analysis-SoNoa`). | 3-5 (1 @ia + 2-3 @fullstack typist) | Rapport d'analyse déjà fait `docs/ia/versimo-v61-migration.md`. NON-RÉGRESSION OBLIGATOIRE : les 4 transformations 10/10 s22 doivent rester 10/10. |
| P2 | **Tests audit visuel via les 3 agents Versimo** : utiliser le workflow pré-fetch documenté dans CLAUDE.md pour faire auditer 6 générations Versi Studio récentes par Yann / Lucas / Camille. Identifier les régressions persona métier. | 2-3 (fetch + lancement agents + consolidation) | Agents @interior-architect + @ai-image-expert + @paysagiste disponibles. Nécessite DB + OpenAI + plans test. |
| P3 | **Finitions UX restantes s22** : (1) modale `isDirty` si modifications non sauvegardées avant retour (reportée par @fullstack s22), (2) pinch-to-zoom tactile Étape 2 (P5 historique), (3) boutons +/-/0 keyboard shortcuts Étape 2 (P5 historique). | 1-2 (@fullstack) | Tous en P5 historique, à faire uniquement si Thomas les demande explicitement. |
| P4 | **Stack analytics V2** (reporté s21) : migration logging JSON → SDK (PostHog self-hosted ou Plausible) + endpoint `/api/vs/analytics` + dashboard KPI North Star "taux validation 1-clic". | 3-5 | Stack V1 (JSON logging) validé s21. V2 = infra robuste pour Thomas quand volume >10 projets/mois. |
| P5 | **Backlog produit suivant** : Auth / Dashboard multi-projets / Export acquéreur PDF+lien / Validation cross-étapes KPI NS / Onboarding. | 5-8 | Hors scope pour s23 — à discuter roadmap. |

**Marqueur de contenu validé** (s22) :
- `Grep "refineRoomPolygon" versi-studio/src/lib/vs/polygon-refiner.ts` (2-pass polygones s22)
- `Grep "structural_instructions" versi-studio/src/lib/vs/visual-generator.ts` (transformations conditionnelles s22)
- `Grep "STRUCTURAL TRANSFORMATIONS" versi-studio/src/lib/vs/visual-generator.ts` (bloc dédié s22)
- `Grep "useHistory" versi-studio/src/hooks/useHistory.ts` (undo/redo s22)
- `ls .claude/agents/interior-architect.md` (agent Versimo importé s22)

**Nom de branche recommandé pour s23** : `claude/versi-s23-<description>-<suffix-auto>`
- Exemples selon la priorité retenue :
  - Si P1 Versimo → `claude/versi-s23-versimo-v61-migration-<suffix>`
  - Si P2 Audit → `claude/versi-s23-audit-versimo-agents-<suffix>`
  - Si P3 Finitions → `claude/versi-s23-ux-finishes-<suffix>`
- Le `<suffix-auto>` est généré automatiquement par Claude Code au démarrage

**Environnement disponible pour s23** :
- PostgreSQL 16 local (`versi_studio`, user `versi`/`versi_dev`) — relancer via `service postgresql start`
- Serveur Next.js dev port 5000 : `cd versi-studio && npm run dev`
- Clé OpenAI dans `versi-studio/.env.local`
- Playwright chromium dans `/opt/pw-browsers/chromium-1217` (exporter `PLAYWRIGHT_BROWSERS_PATH`)
- Repo Versimo cloné dans `/tmp/versimo-ref/` (éphémère, re-clone si nécessaire)
- 4 projets test en DB (P00 RDC, P01 R+1, P02 R+2, P03 R+3)

**Commande de reprise suggérée pour s23** :

```
@orchestrator session versi-s23. Lire project-context.md mémo reprise s22→s23 (5 priorités + 2 travaux en cours).

Gate de reprise obligatoire : propager les learnings P0/P1 s22 non-propagés (détails docs/lessons-learned.md).

Quelle priorité s23 parmi :
- P1 Migration Versimo v61 implémentation (rapport analyse déjà fait, implémentation restante)
- P2 Audit visuel via 3 agents Versimo (@interior-architect/@ai-image-expert/@paysagiste)
- P3 Finitions UX restantes (isDirty modale, pinch-to-zoom, keyboard shortcuts)
- P4 Stack analytics V2
- P5 Backlog produit suivant

Compteur Task producteurs initial : 0/18. Contraintes : anti-timeout n°3, règle n°4 délégation, règle n°5 mindset IA, règles n°19/20/21/22 BLOQUANT, node_modules installé (tests réels exécutables).
```

---

### Mémo de reprise versi-s20 (archive)

**Branche dernière clôturée** : `claude/resume-versi-s20-sAewb`
**Date de clôture** : 2026-04-16
**Statut s20** : CLÔTURÉE — Étape 2 Lots refondue avec polygones N côtés + zoom canvas + AppHeader/Footer Versi + 3 itérations d'audit jusqu'à 9.68/10 unanime (4/5 agents en GO 10/10)

**Résumé session (versi-s20) — productivité massive : ~25 commits, 7+ phases majeures** :

1. **3 hotfixes Replit** (Replit déploiement) :
   - Hotfix #1 : import dynamique pdf-to-img + déclaration deps
   - Hotfix #2 : openai v6→v5.23 + `detail: "auto"` sur input_image + type Response explicite
   - Hotfix #3 : zod v4→v3.25 + allowedDevOrigins + dev port 5000

2. **Phase 0 propagation** : 8 learnings P0/P1 versi-s19 propagés (Pattern Express, audits v1 priorisation, Waves parallélisables, brief typist, pattern @ia, limitation @moi, pré-vérif Grep, mindset IA)

3. **Phase 1 audits P0** : E2E Playwright + cross-review 34 gates → GO CONDITIONNEL avec 5 P1 docs internes

4. **Phase 2 corrections docs + ESLint** : 3 Tasks parallèles (@copywriter vs-ux-writing, @product-manager rename US-VS-19, @fullstack ESLint)

5. **AppHeader + AppFooter Versi cohérents** :
   - Logo VERSI STUDIO (medium + light, baseline-aligned, letter-spacing 0.18em / 0.12em)
   - Header sombre #1A1A1A opaque (vs transparent qui était invisible sur fond clair)
   - Footer sombre #0F0F0F + entités groupe (Versi Immobilier · Versi Invest · Versi Capital · Versi Finance) + mentions
   - 12 favicons + manifest + robots.txt complets (alignés versi.fr / versi-immobilier / versi-invest)

6. **Bug P0 Lots boucle infinie** (4 fix successifs, validés Playwright) :
   - Fix #1 : `useMemo overlappingIds` + guard ResizeObserver <1px
   - Fix #2 : `position: absolute; inset: 0` canvas (sort du flux flex)
   - Fix #3 : circuit breaker ResizeObserver (>10/sec bloqué)
   - Fix #4 (CRITIQUE) : `clearRect` + `setTransform` reset (mon guard sur canvas.width = X désactivait le clear automatique → accumulation rectangles)

7. **Phase 1+2 ZOOM + POLYGONES** (le gros chantier s20) :
   - **Zoom canvas** : molette centré curseur + Ctrl/middle-click drag pan + double-clic vide reset + bouton overlay "Réinitialiser le zoom (X.X×)"
   - **Lots polygonaux N côtés** : data model union `Zone = ZoneRect | ZonePolygon` (backward compat), UI dessin (clic=sommet, snap fermeture sur 1er point + clic simple, double-clic fallback, Escape annule, Backspace supprime dernier), surface temps réel progressive (1pt=0m², 2pts=longueur, 3+pts=surface shoelace), détection chevauchement SAT rect↔polygon, validation API durcie (NaN reject, cap 100 points, aire min 0.5%)
   - **Fonctions UX bonus** : suppression Delete clavier + clic droit menu contextuel + Escape désélection
   - **PDF→PNG à la volée** : `/api/vs/files` convertit PDF en PNG page 1 via pdf-to-img (validé local sur plan "Rue des Muguets" 2381×1684)

8. **3 itérations d'audit cross-agents (5 agents : @qa, @ux, @PM, @ia, Thomas marchand via @creative-strategy)** :
   - Itération 1 : moy **7.34/10** (Thomas marchand 6.2 = blocage plan invisible)
   - Itération 2 : moy **8.66/10** (+1.32 — bundle 7 corrections P0 unanimes)
   - Itération 3 : moy **9.68/10** (+1.02 — snap polygone + memo getComputedStyle + clamp pan + 7 tests E2E + surface dès 1er sommet + dégénéré bloqué + curseur persistant)
   - Notes finales : @qa 9.6 / @ia 10.0 / @PM 10.0 / @ux 9.4→10 (fix bouton polygone) / Thomas marchand 9.4 ("oui j'utilise au quotidien")

9. **7 tests E2E assertifs** : `lots-edge-cases.spec.ts` (Delete, reset zoom, overlap rect+poly, Escape, backward compat, validation API NaN/<3 points)

10. **Brief Replit 1er build** : `docs/infra/replit-first-build-guide.md` (728 lignes, 13 sections : import + secrets + DB + commands + .replit + ports + smoke tests + monitoring + dette + troubleshooting + checklist)

11. **Suppression pré-définition lot générique** : `extract/route.ts` ne crée plus 1 lot bbox englobante par étage (était pollueur — Thomas devait supprimer-redessiner). État vide guidé ("Aucun lot — utilisez bouton Dessiner") = UX supérieure.

**Compteur Tasks producteurs versi-s20** : ~25-30 (au-dessus du seuil 18 ALERTE ROUGE — débordement assumé sur 1 longue session avec 3 itérations d'audit)

**Commits versi-s20** : ~25 commits sur branche `claude/resume-versi-s20-sAewb`

**Travail restant — PROCHAINE SESSION (versi-s21)** :

**PRIORITÉ 1 — CLUSTERING IA `unit_id` pour pré-définition lots intelligente** (audit @ia P0 #1)
Actuellement : aucun lot pré-créé (suppression bug s20). Idéal s21 : extraction GPT-4.1 retourne aussi `unit_id` par pièce → backend groupe par `(floor, unit_id)` → 1 lot = 1 appartement (pas 1 étage entier).
Estimation : modif schema + prompt STEP 7 + tests éval sur 5+ plans réels. ~2-3 sessions.

**PRIORITÉ 2 — POLYGONES IA dans extraction**
Étendre `PLAN_EXTRACTION_JSON_SCHEMA` avec `bounding_polygon` optionnel (4-8 points). Prompt STEP 5 : si pièce L/T (rect area > 1.4× actual) → polygon. Connecter `extract/route.ts` au type `ZonePolygon` déjà supporté. Combiné avec P1 `unit_id` = lots pré-tracés en polygones sur les vrais murs.

**PRIORITÉ 3 — Test POC OCR auto-calibration en réel**
Configurer `OPENAI_API_KEY` valide + tester sur 5-10 plans réels d'architecte. Mesurer accuracy GPT-4.1 Vision. Décision data-driven : promotion V1 / ajustement seuil 0.9 / suppression POC.

**PRIORITÉ 4 — Backlog produit suivant** (à trancher avec Thomas)
Le workflow Étapes 1→4 est COMPLET et VALIDÉ. Options post-Étape 4 :
- **A** Auth / Onboarding (signin/signup + protection routes + session)
- **B** Dashboard projet (multi-projets + KPI North Star visible)
- **C** Export / partage acquéreur (PDF complet ou lien public read-only)
- **D** Settings utilisateur (profil + facturation)
- **E** Validation cross-étapes UI (≥1 pièce validée/lot)
- **F** Polish + finitions s20 différées (voir P5)

**PRIORITÉ 5 — Finitions s20 différées (cosmétique non-bloquant)**
- Analytics events (`polygon_completed`, `lot_added`, `lot_validated`, `drawing_cancelled`) → @data-analyst
- Snap dynamique adaptatif au zoom (Thomas marchand frustration mineure : 15px logique trop fin à scale=1)
- Mid-snap entre sommets de polygones existants
- Touch mobile (pinch-to-zoom + dessin polygone tactile)
- Undo Ctrl+Z en cours de tracé polygone
- Test unit Vitest `isValidZone` (12 cas)
- Gate cohérence surface totale extraction (audit @ia P0 #3)

**Propagation learnings versi-s20 (à propager au démarrage s21 — 6 learnings statut `à-faire`)** :
1. **Pattern audit cross-agents 3 itérations** : 5 agents (qa+ux+pm+ia+persona) → bundle corrections P0 unanimes → re-audit → itération jusqu'à 10/10. Validé sur Étape 2 Lots (7.34→9.68/10). À documenter dans `orchestrator.md` comme protocole "Autopilote qualité multi-agents persona".
2. **Pattern persona audit via @creative-strategy** : utiliser @creative-strategy en proxy persona métier (Thomas marchand de biens) si pas d'agent testeur dédié — efficace pour faire émerger frustrations utilisateur réelles. À documenter `orchestrator.md`.
3. **Anti-pattern `canvas.width = X` guard désactive clear automatique** (bug P0 critique s20) : modifier `canvas.width` ou `canvas.height` réinitialise automatiquement le contexte. Si on ajoute un guard `if (canvas.width !== X) canvas.width = X`, le canvas n'est plus effacé entre 2 draws → accumulation visuelle. Toujours `clearRect` explicite + `setTransform` reset au début de draw(). À documenter `fullstack.md` règle Canvas.
4. **Anti-pattern double-clic comme mécanisme fermeture polygone** : crée systématiquement un sommet parasite (1er clic ajoute point AVANT double-clic ferme). Convention CAO Figma/Photoshop = snap visuel sur 1er point + clic simple. À documenter `ux.md` pattern dessin polygone.
5. **Pattern PDF→PNG à la volée pour affichage canvas** : un PDF natif n'est pas affichable via `<Image>`. Route serveur intercepte `.pdf` et convertit page 1 via pdf-to-img → Cache-Control 1h. À documenter `infrastructure.md` pattern fichiers.
6. **Validation API factorisée dans types.ts (DRY)** : ne pas dupliquer `isValidZoneRect/Polygon` dans chaque route — factoriser dans un module unique avec `Number.isFinite` + cap + aire min. À documenter `qa.md` pattern validation.

---

### Mémo de reprise versi-s19 (archive)

**Branche dernière clôturée** : `claude/versi-s19-visuels-autopilot-K7mQr`
**Date de clôture** : 2026-04-16
**Statut s19** : CLÔTURÉE — GO ABSOLU 9,2/10 @moi sur Étape 4 Visuels + 6 priorités complétées + POC OCR auto-calibration livré

**Résumé session (versi-s19) — 6 priorités + F05 impl + POC OCR complétés en autopilote, compteur 18/18 Tasks producteurs** :

1. **P1 Étape 4 Visuels (US-VS-19/20/21/22)** : Express 4 batches + Batch 2.5 → **GO ABSOLU 9,2/10 @moi**
   - Trajectoire : v1 7,47 NO-GO → v2 8,57 GO CONDITIONNEL unanime → @moi 9,2 GO ABSOLU
   - Pattern Express validé pour la 3e fois consécutive (Étape 2 Lots 9,1 / Étape 3 Pièces 9,3 / Étape 4 Visuels 9,2)
   - Arbitrage Thomas via @moi : "Modifier" conservé (vocabulaire opérationnel marchand de biens > terme IA "Itérer")

2. **P2 Fix BUG-1 PlanThumbnail floorInput resync** : useEffect ajouté + assertion T2 upload-p0.spec.ts renforcée

3. **P3 Audit `route.continue()` 4 specs E2E** : 17 occurrences auditées, **4 corrections** (workflow:194/541/561 + pages:177), 12 conservées (else défensifs handler unique). Livrable `docs/qa/audit-route-continue-s19.md`

4. **P4 Spec UX F05 surface m² + Implémentation** :
   - Spec : `docs/product/vs-spec-f05-surface-m2-temps-reel.md` (316L)
   - Décisions Thomas : Q1 = 1 décimal `.toFixed(1)` / Q2 = modal calibration V1 / Q3 = POC OCR LANCÉ (mindset IA)
   - Implémentation manuelle 4/4 OK : PlanCalibration.tsx (~220L), PlanCanvas.tsx overlay rAF, API PATCH étendu, lots/page.tsx intégration

5. **P5 Upload % refactor XHR** : `fetch()` → `XMLHttpRequest` avec `xhr.upload.onprogress`, state Set→Map, AbortController préservé, UI barre progressbar a11y

6. **P6 Migration G26 stricte** : 3 specs visual DÉJÀ migrées vers `toHaveScreenshot maxDiffPixelRatio: 0.005`. Gate G26 stricte ACTIVÉE.

7. **Q3 OCR/IA POC livré** (verdict initial NO-GO V2 RÉVISÉ après rappel règle n°5 mindset IA) :
   - Recherche faisabilité : `docs/ia/recherche-faisabilite-ocr-plan-v2.md` (184L, 5 sources WebSearch)
   - **POC implémenté** : `plan-scale-detector.ts` (GPT-4.1 Vision + Zod + self-correction calque `plan-extractor.ts`) + route `/api/vs/plans/[id]/auto-calibrate` + modif `PlanCalibration.tsx` (3 bannières conditionnelles : loading / suggestion auto / fallback manuel)
   - Approche assistant (pas remplacement) : si confidence ≥ 0.9 → pré-remplit lengthMeters dans modale, Thomas valide d'1 clic au lieu de 30s
   - Fallback manuel V1 préservé : zéro régression si OPENAI_API_KEY absent ou confidence < 0.9
   - Correction règle n°13 UTF-8 appliquée : `&apos;` → `'` canonique dans bannière

**Compteur Tasks producteurs versi-s19** : 18/18 (pile sur seuil ALERTE ROUGE — limite atteinte, pas de débordement)

**Commits versi-s19** : 13 commits sur branche `claude/versi-s19-visuels-autopilot-K7mQr` (setup + propagation + Batches 1-2-2.5-3-4 + Wave 1 + Wave 2 + P4 spec + F05 impl + OCR Q3 + finalisation @ux + POC OCR + clôture)

**Travail restant — PROCHAINE SESSION (versi-s20)** :

**PRIORITÉ 1 — Backlog produit suivant à définir avec Thomas**
Le workflow Versi Studio Étapes 1→4 est COMPLET (Upload → Lots → Pièces → Visuels). Backlog post-Étape 4 à définir :
- Onboarding / auth (signin/signup) ?
- Dashboard projet (vue d'ensemble multi-projets) ?
- Export / partage avec acquéreur ?
- Settings utilisateur ?
- Validation cross-étapes UI (KPI North Star `vs_visuals.status = 'validated'` au moins 1 pièce par lot) ?

**PRIORITÉ 2 — Test POC OCR auto-calibration en réel**
- Configurer `OPENAI_API_KEY` valide en environnement de test
- Tester sur 5-10 plans d'architecte réels (avec barres d'échelle 1:100, 1:200, dimensions cotées, et plans sans échelle)
- Mesurer accuracy réelle de GPT-4.1 Vision sur ce use case
- Décision data-driven : promotion en V1 / ajustement seuil confiance / suppression POC

**PRIORITÉ 3 — Re-run E2E avant merge final s19**
- `npx playwright test workflow.spec.ts pages.spec.ts` (P3 fixes route.continue → route.fallback)
- `npx playwright test upload-visual lots-visual rooms-visual` (G26 stricte activée)
- `npx playwright test vs-lots-*.spec.ts` (changement prop m2PerPixel sur PlanCanvas)
- Si POC OCR test réel : ajouter `tests/e2e/plan-calibration.spec.ts` (mock OpenAI + assert pré-remplissage / fallback)

**PRIORITÉ 4 — Cosmétique post-merge bundle backlog (P2 différés)**
- F02 UX Étape 4 : sélecteur multi-photos manquant US-VS-19:935-942 (à confirmer usage Thomas)
- F17 UX : bouton "Fermer le chat" `ChatAgent.tsx:88` sans `min-h-[44px]`
- R-V2-04 Design : textarea ChatAgent `focus:` au lieu de `focus-visible:`
- F09 Copy : triple "Décrivez les modifications souhaitées" dans ChatAgent
- RoomGrid.tsx:124 : `text-[10px]` résiduel Étape 3 Pièces

**Propagation learnings versi-s19 (à propager au démarrage s20 — 7 learnings statut `à-faire`)** :
1. Pattern Express 4 batches = méthode canonique (validé 3x) → orchestrator.md
2. Audits v1 : prioriser sections 1+2 (synthèse + 5 dimensions) AVANT sections 3-5 (recaps) → ux/design/copywriter.md
3. Parallélisation Waves P2-P6 résiduels (scope disjoint) → orchestrator.md
4. Spec UX/PM doit toujours inclure "Brief typist prêt à coller" (code EXACT) → ux.md + product-manager.md
5. Pattern @ia recherche faisabilité V2 (3 approches + max 2 WebSearch + verdict pragmatique + alternative) → ia.md
6. Limitation outil @moi (pas de Write) — pattern récurrent confirmé s17+s19 → orchestrator.md + moi.md frontmatter
7. Pré-vérification état avant brief migration (Grep rapide évite Task gaspillée — leçon P6) → orchestrator.md
8. **NOUVEAU LEARNING CRITIQUE** : @ia (et tous agents) doivent appliquer mindset IA règle n°5 par défaut. Verdict @ia OCR Q3 initial = NO-GO V2 basé sur arguments humains (ROI/payback/volume), corrigé après rappel Thomas. À documenter dans tous les agents stratégiques (@ia, @creative-strategy, @product-manager, @growth) : "Avant tout verdict GO/NO-GO sur une feature, vérifier qu'aucun argument humain (coût homme-jour, payback, volume seuil) n'est utilisé. Avec équipe IA, coût marginal quasi nul = seul critère = valeur persona."

---

### Mémo de reprise versi-s18 (archive)

**Plan d'exécution versi-s19 — 6 priorités ordonnées (budget cible ~10-13 Tasks producteurs sur 18 max)**

| # | Priorité | Mode | Estimation Tasks |
|---|---|---|---|
| P1 | **Étape 4 Visuels (US-VS-19/20/21/22)** — composants `StyleGrid.tsx`, `VisualRoom.tsx`, `VisualResult.tsx`, `ChatAgent.tsx` + page `vs/projects/[id]/visuals/page.tsx`. Note : RoomGrid/RoomCanvas/RoomPanel sont composants Étape 3 Pièces (s18, hors scope). Pattern Express 4 batches validé sur Étape 2 Lots (s17, 9,1/10) ET Étape 3 Pièces (s18, 9,3/10). Persona gate finale = @moi (outil INTERNE, mapping persona→gate s16). | Express 4 batches | ~6-8 |
| P2 | **Fix BUG-1 PlanThumbnail floorInput resync** — `versi-studio/src/components/vs/PlanThumbnail.tsx:26` ajouter `useEffect(() => setFloorInput(plan.floor_number ?? ""), [plan.floor_number])` (3 lignes) + renforcer T2 dans `upload-p0.spec.ts` pour vérifier l'input visuel après rollback. Réf : `docs/qa/upload-p0-investigation.md` BUG-1. | Typist + test | 1 |
| P3 | **Audit pattern `route.continue()` sur 4 specs E2E restantes** — Grep `await route.continue()` dans `versi-studio/tests/e2e/` (lots-visual, rooms-visual, workflow, pages). Remplacer par `route.fallback()` si même pattern incorrect que upload-p0. Learning versi-s18 P6. | @qa | 1 |
| P4 | **F05 surface m² temps réel pendant drag** — résidu versi-s17→s18. Brief dédié spec UX (calibration pixel→m² + UI overlay) + DB (champ projet `m2_per_pixel`?). À chiffrer après spec validée. | @ux + @fullstack | 1-2 |
| P5 | **Upload % feedback fichiers > 5 Mo** — résidu P3 versi-s18. Refactor XHR avec `onprogress` (fetch ne supporte pas). TODO P2 marqué dans `upload/page.tsx:468`. | @fullstack | 1 |
| P6 | **Migration G26 stricte (si budget)** — migrer `page.screenshot({ path })` → `toHaveScreenshot({ maxDiffPixelRatio: 0.005 })` sur les 3 specs visual (upload, lots, rooms) pour activer la gate G26 stricte. | @qa | 1 |

**Pattern Express attendu pour P1 Étape 4 Visuels** :
- Batch 1 : 3 audits v1 parallèles (UX + Design + Copy) sur RoomGrid + VisualRoom + VisualResult + page visuals
- Batch 2 : 2 @fullstack scope disjoint (Alpha = page + tokens globaux, Beta = composants feuilles)
- Batch 3 : 3 re-audits v2 parallèles
- **Batch 2.5 conditionnel** (si unanimité 8,5-8,9/10 GO CONDITIONNEL avec ≤3 résiduels triviaux) : typist micro-corrections + vérification Grep orchestrateur
- Batch 4 : gate finale @moi (proxy fondateur Thomas)

**Profil de rigueur** : V1-Production — toutes gates G1-G34 actives, gate G33 anglicismes BLOQUANT, gate G34 collisions @theme BLOQUANT, exceptions canvas R02/R03/R04 documentées (vs-design-system.md §2.4 — ne pas signaler G23 sur ces patterns).

**Propagation P0/P1 versi-s18 (PRÉ-REQUIS BLOQUANT — gate de reprise de session)** :
- 7 learnings versi-s18 statut propagation = `à-faire` à propager AVANT tout nouveau travail :
  1. Pattern Batch 2.5 micro-corrections post-v2 audits → `.claude/agents/orchestrator.md`
  2. @moi gate finale post-Batch 2.5 doit re-vérifier en code → `.claude/agents/moi.md` + brief @moi orchestrateur
  3. @qa boucle visuelle bundle multi-étapes (tier 1/2/3) → `.claude/agents/qa.md`
  4. @qa Playwright `route.fallback()` vs `route.continue()` + filtre `__next-route-announcer__` → `.claude/agents/qa.md`
  5. @qa frontière investigation vs implémentation (signaler bugs, ne pas corriger sans accord) → `.claude/agents/qa.md`
  6. Exceptions G23 documentées au design-system (canvas R02/R03/R04) → `.claude/agents/design.md` + `.claude/agents/reviewer.md`
  7. Bundle backlog typist (recensement précis + brief patterns EXACT + Grep vérif) → `.claude/agents/orchestrator.md`
- + 1 learning versi-s16 P2 statut `à-faire` : G33 périmètre messages d'erreur API → CLAUDE.md (déjà fait dans `docs/founder-preferences.md` mais à vérifier dans CLAUDE.md G33)
- + 1 learning versi-s16 P1 statut `à-faire` : ordonnancement Batch G27 (matrice avant tests) → `.claude/agents/qa.md` + `.claude/agents/orchestrator.md`

**Compteur Tasks producteurs** : 0/18 (ALERTE ROUGE > 18). Mis à jour à chaque batch par l'orchestrateur.

---

### Mémo de reprise versi-s18 (archive)

**Branche** : `claude/versi-s18-pieces-autopilot-Vlowg`
**Date de clôture** : 2026-04-16
**Session** : versi-s18 — Étape 3 Pièces GO ABSOLU 9,3/10 + Bundle backlog Upload + Boucle visuelle G26 (43 baselines) + upload-p0.spec.ts FIXED (7/7 PASS)

**Résumé session (versi-s18) — 6 priorités complétées en autopilote Express** :

1. **P1 Étape 3 Pièces (US-VS-13/14/15)** : Express 4 batches + Batch 2.5 micro-corrections
   - Batch 1 (audits v1) : UX 6,8 / Design 7,2 / Copy 7,6 — moyenne 7,2/10 NO-GO
   - Batch 2 (typist Alpha+Beta scope disjoint) : 18 corrections P0/P1 appliquées
     - Alpha = `page.tsx` + `globals.css` (state validationBlocked, ConfirmModal, message succès, warning lot invalidé, debounce désactivé sur type)
     - Beta = `RoomPanel.tsx` + `RoomCanvas.tsx` (tokens bg-bg-card/text-inverse, 6 états composants, touch 44px, empty state CTA, scroll-to-selected, sr-only ul/buttons clavier, surbrillance rouge double surface, code couleur bureau/dressing → gris)
   - Batch 3 (re-audits v2) : UX 8,8 / Design 8,8 / Copy 8,8 — unanimité 8,8/10 GO CONDITIONNEL avec 3 résiduels
   - Batch 2.5 (typist micro-corrections) : 3 résiduels corrigés (P0 UTF-8 `&apos;`→`'`, P1 token `--color-bg-canvas`, P1 `aria-describedby` Valider)
   - Batch 4 (gate @moi) : **GO ABSOLU 9,3/10** (5 critères PASS) — "Validé. L'Étape 3 Pièces est au niveau de l'Étape 2 Lots — même DNA, même sobriété, zéro friction. On passe à l'Étape 4 Visuels."

2. **P2 F05 surface m² overlay drag PlanCanvas** : SKIP justifié par Beta — pas de fonction `pixelsToM2` existante, calibration utilisateur requise (hors scope typist). À traiter en versi-s19 avec brief dédié spec UX/DB.

3. **P3 Bundle backlog Upload (8 items P2 différés s16/s17)** : 7 OK + 1 SKIP
   - Touch target PlanThumbnail 44×44px, ConfirmModal `bg-bg-overlay`, Stepper border arbitrary commenté R02, DropZone `border-hover`, Stepper labels mobile visibles, bouton Réessayer rooms+visuals, message rollback étage enrichi
   - 2 nouveaux tokens sémantiques : `--color-bg-overlay`, `--color-border-hover`
   - SKIP justifié : Upload % feedback (fetch sans `onprogress`, refactor XHR hors scope versi-s19)

4. **P4 Boucle visuelle Playwright G26 — bundle Upload+Lots+Pièces** : 54 baselines générées
   - Upload : 15 baselines (existantes)
   - Lots : 18 baselines (NOUVEAU — 6 états × 3 viewports)
   - Pièces : 21 baselines (NOUVEAU — 7 états × 3 viewports)
   - 3 specs : `upload-visual.spec.ts` (existant), `lots-visual.spec.ts` (NOUVEAU 333L), `rooms-visual.spec.ts` (NOUVEAU 415L)
   - Procédure refresh documentée : `docs/qa/visual-regression-bundle.md`
   - **Pré-requis CI à intégrer** : `npm install` + `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx playwright install chromium` doivent être dans le pipeline (étaient absents en local, installés pendant la session)
   - **Prochaine étape G26** : migrer `page.screenshot({ path })` vers `toHaveScreenshot({ maxDiffPixelRatio: 0.005 })` pour activer la gate G26 stricte (hors scope versi-s18, à faire versi-s19)

5. **P5 Documenter exceptions canvas** : section 2.4 ajoutée à `docs/design/vs-design-system.md`
   - R02 : `ctx.fillStyle/strokeStyle` canvas API native
   - R03 : palette métier `ROOM_TYPE_STYLES` (tier 2 sémantique)
   - R04 : overlay rgba validation bloquée
   - Tableau mappage hex → token sémantique (4 entrées)

6. **P6 Investigation upload-p0.spec.ts (échecs préexistants versi-s16)** : 1 PASS / 6 FAIL → **7 PASS / 0 FAIL en 15,3s**
   - 4 patterns techniques diagnostiqués (tous côté tests) :
     1. T1 obsolète : focus "Annuler" (safer default) vs attendu "Supprimer"
     2. T3/T4/T6 : `route.continue()` ne délègue pas au mock GET → remplacé par `route.fallback()`
     3. T5 : sélecteur "Lancer l'analyse" obsolète (devient "Analyse en cours…")
     4. T2/T4 : `__next-route-announcer__` Next.js → strict mode violations
   - **BUG-1 (P1) APPLICATIF DÉCOUVERT** : `PlanThumbnail.tsx:26` — `floorInput` state local jamais resync avec prop `plan.floor_number` après rollback PATCH 500. Fix proposé inline (useEffect 3 lignes). À arbitrer Thomas en versi-s19.

**Compteur Tasks producteurs versi-s18** : 16 sur 18 budget (sous seuil ALERTE ROUGE).

**Gates Étape 3 Pièces** : G21 PASS (5 états UI), G22 PASS (WCAG AA + touch + reduced-motion), G23 PASS (zéro hardcoded JSX hors exceptions R02/R03/R04 documentées), G24 PASS (registre "vous"), G27 PASS (matrice traçabilité couverte par upload-p0 + visuals), G31 PASS (tokens 3 tiers), G32 PASS (6 états composant), G33 PASS (zéro anglicisme), G34 PASS (zéro collision @theme), Règle n°13 PASS (UTF-8 canonique). G26 PASS (43 baselines bundle générées).

**Travail restant — PROCHAINE SESSION (versi-s19)** :

**PRIORITÉ 1 — Étape 4 Visuels Versi Studio (US-VS-19/20/21/22)**
- Composants : `RoomGrid.tsx`, `VisualRoom.tsx`, `VisualResult.tsx` + page `/visuals/page.tsx`
- Pattern Express 4 batches (validé sur Étape 3) attendu : ~10-13 Tasks producteurs

**PRIORITÉ 2 — Fix BUG-1 PlanThumbnail floorInput resync (P1 versi-s18)**
- `versi-studio/src/components/vs/PlanThumbnail.tsx:26` : ajouter `useEffect(() => setFloorInput(plan.floor_number ?? ""), [plan.floor_number])` (3 lignes)
- Renforcer T2 dans `upload-p0.spec.ts` pour vérifier l'input visuel après rollback

**PRIORITÉ 3 — Audit pattern `route.continue()` sur 4 autres specs E2E**
- `lots-visual.spec.ts`, `rooms-visual.spec.ts`, `workflow.spec.ts`, `pages.spec.ts`
- Grep `await route.continue()` dans `versi-studio/tests/e2e/` → décider remplacer par `route.fallback()`

**PRIORITÉ 4 — F05 surface m² temps réel pendant drag (résidu versi-s17→s18)**
- Brief dédié spec UX (calibration pixel→m² + UI overlay) + DB (champ projet `m2_per_pixel`?)
- À chiffrer après spec validée

**PRIORITÉ 5 — Upload % feedback fichiers > 5 Mo (résidu P3 versi-s18)**
- Refactor XHR avec `onprogress` (fetch ne supporte pas)
- TODO P2 marqué dans `upload/page.tsx:468`

**Propagation learnings versi-s18 (à compléter en clôture)** :
- Pattern Batch 2.5 micro-corrections post-v2 audits (relais court entre re-audits CONDITIONNEL et gate @moi)
- Audits v2 vite obsolètes après corrections rapides (signaler au @moi pour pas re-déclencher)
- Pattern `route.fallback()` vs `route.continue()` Playwright (à documenter dans `.claude/agents/qa.md`)
- Exceptions canvas R02/R03/R04 documentées : @design/@reviewer ne doivent plus signaler G23 sur ces patterns

---

### Mémo de reprise versi-s17 (archive)

**Branche** : `claude/versi-s17-lots-autopilot-ocDqn`
**Date de clôture** : 2026-04-16
**Session** : versi-s17 — Étape 2 Lots GO ABSOLU (unanimité 9,0/10 audits + @moi 9,1/10)
**Dernier commit** : voir `git log --oneline -1`

**Résumé session (versi-s17) — Étape 2 Lots US-VS-06/07/08 GO ABSOLU 9,1/10** :

1. **Propagation learnings P0/P1 versi-s16** : aucun non-propagé bloquant détecté.
2. **Batch 1** : 3 audits v1 parallèles — @ux 6,5/10 NO-GO (11 findings : 4 P0, 5 P1, 2 P2), @design 6/10 NO-GO (18 findings, 4 gates FAIL : G22/G23/G31/G32), @copywriter 6,5/10 NO-GO (9 findings : 2 P0, 7 P1, gates règle n°13 UTF-8 + cohérence ConfirmModal FAIL). Moyenne 6,33/10.
3. **P4 Matrice G27 race condition résolue** : @qa a re-mappé `upload-p0.spec.ts` T1-T7 aux 7 AC P0 Upload. AC08/AC09/AC11/AC16 PARTIEL→PASS. Couverture 31%→38%.
4. **Batch 2** : @fullstack Alpha (page.tsx + globals.css) + Beta (LotPanel + PlanCanvas) en parallèle scope disjoint, pattern typiste strict. 28 corrections appliquées : ConfirmModal remplace confirm() natif, bouton Réessayer + rollback fetchData, tokens erreur 3 variantes, prefers-reduced-motion, responsive flex-col md:flex-row, canvas a11y (tabIndex + aria-label + onKeyDown), getComputedStyle pour 5 tokens canvas (zéro hex JSX), UTF-8 m² direct, touch target 44px mobile, empty state CTA inline, badge succès, aria-live étage + sauvegarde.
5. **Batch 3a** : 3 re-audits v2 parallèles — @ux 8,5/10 GO (10/11 PASS, F05 surface temps réel drag résiduel P1 non bloquant), @design 9/10 GO (4 gates FAIL→PASS, 4 résidus P2 canvas justifiés), @copywriter 9,5/10 GO (9/9 PASS, 2 gates FAIL→PASS). Moyenne 9,0/10, unanimité GO.
6. **Batch 4** : gate @moi (proxy Thomas) — **GO ABSOLU 9,1/10**, parité confirmée avec Étape 1 Upload (9,17/10). Boucle visuelle Playwright = à faire sur bundle complet fin versi-s17 (pas gate par étape). Registre "vous" impératif neutre re-validé.

**Scoring final Étape 2 Lots** :
| Agent | v1 | v2 | Delta |
|---|---|---|---|
| @ux | 6.5 | **8.5** | +2.0 |
| @design | 6.0 | **9.0** | +3.0 |
| @copywriter | 6.5 | **9.5** | +3.0 |
| **Moyenne audits** | 6.33 | **9.00** | +2.67 |
| @moi (gate finale) | — | **9.1** (GO ABSOLU) | — |

**Gates Étape 2 Lots** : G21 PASS (5 états UI — bouton Réessayer + empty state CTA), G22 PASS (WCAG AA contrastes + focus-visible + touch targets + reduced-motion), G23 PASS (zéro hardcoded JSX, 2 hex canvas documentés justifiés), G24 PASS (registre "vous" uniforme), G31 PASS (tokens 3 tiers), G32 PASS (6 états composant), G33 PASS (zéro anglicisme), Règle n°13 PASS (UTF-8 canonique). G26 boucle visuelle DIFFÉRÉ fin versi-s17.

**Travail restant — PROCHAINE SESSION (versi-s18 ou fin versi-s17)** :

**PRIORITÉ 1 — Étape 3 Versi Studio** (prochaine US ou Tantièmes) — continuer la série pendant que le standard est en place. Reproduire le protocole 4 batches Lots (vs 7 batches historiques).

**PRIORITÉ 2 — F05 Surface m² temps réel pendant drag** (résidu P1 UX Lots)
- Dans `PlanCanvas.tsx` `draw()` : afficher overlay texte surface calculée localement sur le rectangle actif pendant mousemove.
- À traiter en même temps que le polish Étape 3.

**PRIORITÉ 3 — P2 backlog Upload (différé versi-s16/s17)**
- 3 violations G31 tokens primitives : `bg-noir-profond/60`, `border-l-[3px]`, `hover:border-gris-pierre/50` → créer `--color-overlay-modal`, `--border-width-accent`.
- Touch target bouton supprimer PlanThumbnail → `p-sm` minimum.
- Labels Stepper mobile masqués : `<span sr-only>` + label 10px sous cercle actif.
- États `:active` systémiques (`vs-btn-primary` défaut) : ajouter `active:scale-95` ou `active:opacity-70`.
- P1 actionabilité : bouton "Réessayer" sur erreur fetchData chargement initial (page.tsx:89).
- P2 message rollback étage enrichi (page.tsx:296).
- Double rouge global + tuiles : masquer `failedFiles` si `error` fetchData présent.

**PRIORITÉ 4 — Boucle visuelle Playwright G26 sur bundle complet**
- `tests/screenshots/` baselines sur iPhone 13 / iPad / Desktop 1280 × 5 états × toutes les étapes livrées.
- À produire quand Étape 3 sera mergée.

**PRIORITÉ 5 — Documenter exceptions canvas dans vs-design-system.md**
- R02/R03 : `#F7F5F2` fond canvas + `rgba(255,255,255,0.85)` fond label (justifié : canvas 2D API ne lit pas CSS vars, fallback performance).
- R04 : HANDLE_HIT_SIZE 20px acceptable desktop, à porter à 44 si version touch planifiée.

**PRIORITÉ 6 — P5 Investigation upload-p0.spec.ts échecs préexistants**
- Tests PATCH floor / workflow state qui échouent (signalés préexistants versi-s16).
- Debugger + corriger pour G27 100% vert.

**Propagation learnings versi-s17 à compléter (P1 à-faire)** :
- Budget autopilote révisable 4 batches (vs 7) → `.claude/agents/orchestrator.md`
- Vérification Glob post-agent décisionnel (exception règle n°4) → `.claude/agents/orchestrator.md`
- Batch 3b boucle visuelle conditionnelle par bundle → `.claude/agents/orchestrator.md`
- Pattern fullstack Alpha/Beta scope disjoint → `.claude/agents/orchestrator.md`

---

### Mémo de reprise versi-s16 (archive)

**Branche** : `claude/resume-versi-s16-upload-cK4ex`
**Date de clôture** : 2026-04-16
**Session** : versi-s16 — Étape 1 Upload GO ABSOLU (unanimité 9,17/10)
**Dernier commit** : voir `git log --oneline -1`

**Résumé session (versi-s16) — Étape 1 Upload UNANIMITÉ 9/10 ATTEINTE** :

1. **Propagation 3 P0/P1 learnings versi-s15** : Tailwind v4 `@theme` collision → gate G34 ; matrice G27 Batch 1 obligatoire → qa.md mis à jour ; anglicismes → règle n°19 + gate G33 + founder-preferences.md.
2. **P1 re-validation audit v2** : @reviewer 8.5/10 GO CONDITIONNEL confirmé, 12/12 P0+ECART PASS, découverte P1-NEW-1 (test regex `/analyser les plans/i` vs code label `"Lancer l'analyse"`).
3. **P2 Batch 5b** : matrice G27 livrée (16/16 AC mappés), 7 tests P0 écrits (`upload-p0.spec.ts` 377 L), fix Tailwind v4 systémique (`--spacing-*` → `--space-*` + 126 `@utility` directives zero-refactor), P1-NEW-1 corrigé (pages.spec.ts:297 + workflow.spec.ts:292), 15/15 screenshots PASS.
4. **P3 Batch 6a** : 3 re-audits — @ux timeout, @design timeout, @copywriter 7,5/10 FAIL BLOQUANT G33 (5 anglicismes).
5. **P3 Batch 6b** : @fullstack corrections — 9 anglicismes G33 (page.tsx:134, vs/page.tsx:26, layout.tsx:12, RoomGrid.tsx:154, VisualRoom.tsx:242+547, DropZone.tsx:37 + 3 API routes), UX P1 × 3 (CTA visible disabled, Stepper `completedSteps`, focus ConfirmModal "Annuler"), Design P1 (PlanThumbnail input `focus-visible` WCAG 18.33:1).
6. **P3 Batch 6c** : re-audits post-corrections finalisés — @ux 9/10 GO, @design 9/10 GO, @copywriter 9,5/10 GO (G33 PASS grep exhaustif).
7. **P3 Batch 6d** : gate finale @moi (proxy Thomas) — **GO ABSOLU**, 6/6 questions fondateur OUI/NUANCÉ, moyenne 9,17/10.

**Résumé session précédente (versi-s15) — Étape 1 Upload GO CONDITIONNEL 8.5/10** :

1. **Propagation 4 P1 learnings versi-s14** : dual Stepper responsive, boucle visuelle obligatoire, brief tableau strict @qa, budget correction ≈10-12 fixes/étape frontend.
2. **Batch 4a** : 3 Task parallèles — ConfirmModal (focus trap + Escape + portalisé), API PATCH `/api/vs/plans/[id]` (floor_number [-5, 50]), Stepper DS `bg-bg-dark text-text-inverse`.
3. **Batch 4b** : refactor `versi-studio/src/app/vs/projects/[id]/upload/page.tsx` 351→577 lignes (P0.1-P0.7) + spec WEBP alignée par @pm (docs/product/vs-functional-specs.md).
4. **Batch 4c** : boucle visuelle Playwright — 15 baselines screenshots (3 devices × 5 états), 3 ECARTs détectés (VS-1 Stepper mobile compression, VS-2 ConfirmModal Tailwind v4, VS-3 tests cassés par rename "uploadés→déposés").
5. **Batch 4d** : fix 3 ECARTs — dual Stepper (`hidden md:block` sidebar + `md:hidden` horizontal variant), ConfirmModal portalisé (`createPortal(modalContent, document.body)` + `style={{ maxWidth: "28rem" }}` inline contournement Tailwind v4), tests E2E alignés (pages.spec.ts:294, workflow.spec.ts:334).
6. **Batch 5 re-audit @qa** : 2× timeouts consécutifs (complet 324s/40 tool_uses, puis réduit 200 lignes 99s/4 tool_uses). Règle n°4 escalade versi-s12 déclenchée → fallback Claude principal avec audit manuel `docs/qa/upload-us-vs-02-audit-v2.md` (score 8.5/10, 12/12 P0+ECART PASS, verdict GO CONDITIONNEL).

**Scoring final Étape 1 Upload** :
| Agent | v1 | v2 |
|---|---|---|
| @creative-strategy | 7 | — |
| @copywriter | 7.5 | — |
| @product-manager | 8 | — |
| @qa | 6 | **8.5** (audit manuel fallback) |
| @ia | 8 | — |
| @moi | 6.5 | — |
| @persona Laurent | 7 | — |

**Gates Étape 1 Upload** : G21 PASS (5 états UI), G22 PASS conditionnel (contrastes `bg-error/10` à re-valider @design), G23 PASS (tokens sémantiques), G26 PASS (15/15 screenshots), G27 **REPORTÉ versi-s16** (matrice AC→tests non produite, timeouts @qa), G28 PASS (tsc + lint + tests), G31 PASS (tokens 3 tiers).

**Travail restant — PROCHAINE SESSION (versi-s17)** :

**PRIORITÉ 1 — Autopilote Étape 2 Lots** (bloqueur débloqué : Étape 1 Upload GO absolu)
- Fichier : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`
- Composants : `PlanCanvas.tsx`, `LotPanel.tsx`
- Spec : `docs/product/vs-functional-specs.md` §4 (US-VS-03/04/05)
- Protocole autopilote : 7 agents / 4 batches (reproduire s16 Upload)

**PRIORITÉ 2 — Conditions versi-s17 Étape 1 Upload (backlog non-bloquant @moi)**
- Touch target bouton supprimer PlanThumbnail → `p-sm` minimum (P2 mobile)
- 3 violations G31 tokens primitives : `bg-noir-profond/60` (overlay ConfirmModal), `border-l-[3px]` (Stepper arbitrary value), `hover:border-gris-pierre/50` (DropZone) → créer tokens sémantiques `--color-overlay-modal`, `--border-width-accent`, remplacer primitives par sémantiques
- Labels Stepper mobile masqués : ajouter `<span sr-only>` + label 10px sous le cercle actif uniquement
- Feedback progression upload : mention "peut prendre quelques secondes" si fichier > 5 Mo (court terme) + XHR `onprogress` barre réelle (long terme)
- États `:active` systémiques manquants (vs-btn-primary défaut) — ajouter `active:scale-95` ou `active:opacity-70`
- P1 actionabilité : bouton "Réessayer" manquant sur erreur fetchData chargement initial (page.tsx:89)
- P2 message rollback étage : enrichir `"...la valeur précédente a été restaurée. Vérifiez..."` (page.tsx:296)
- Double rouge global + tuiles : masquer `failedFiles` si `error` fetchData présent

**PRIORITÉ 3 — Décision fondateur P1 registre tu/vous**
- Status quo : "vous" de politesse uniforme (décision @moi GO absolu)
- @copywriter avait suggéré canonique "tu" pour Versi Studio — à valider/infirmer par Thomas avant Étape 2 Lots

**PRIORITÉ 4 — Matrice G27 race condition (résiduel s16)**
- `docs/qa/upload-us-vs-02-traceability.md` liste `upload-p0.spec.ts` en "à créer" mais le fichier a été créé en parallèle (Batch 5b)
- Re-mapper les 7 AC P0 couverts par upload-p0.spec.ts (T1-T7) dans la matrice + corriger le gate G27 status

**PRIORITÉ 5 — Investigation upload-p0.spec.ts échecs préexistants**
- Quelques tests échouent sur PATCH floor / workflow state (signalés préexistants par @fullstack, hors scope s16)
- Debugger + corriger avant de considérer G27 100% vert

**PRIORITÉ 6 — Deprecated (versi-s15 legacy)** :
- Ci-dessous, l'ancienne priorisation versi-s16 pour archivage :

**[ARCHIVE versi-s15] PRIORITÉ 2 — Batch 5b : compléter Étape 1 Upload (bloquant unanimité 9/10)**
- **Matrice G27** : `docs/qa/upload-us-vs-02-traceability.md` — mapping US-VS-02 AC01..AC16 → tests E2E existants (upload-visual.spec.ts + pages.spec.ts + workflow.spec.ts)
- **7 tests P0 flows métier** : tests de régression modal (focus trap, Escape), PATCH floor_number + rollback, retry failed files, AbortController cleanup, isAnalyzing + POST /extract, Promise.allSettled race safety, erreurs réseau actionnables
- **Bug Tailwind v4 systémique** (hors scope Upload) : renommer `--spacing-*` en `--space-*` OU remplacer `max-w-md` par `max-w-[28rem]` partout (5+ composants impactés : VisualResult, ChatAgent, VisualRoom, vs/page, vs/error)

**PRIORITÉ 3 — Batch 6 : re-audits Étape 1 Upload (4 agents, unanimité 9/10 min)**
- @ux re-audit (parcours + frictions + 5 états visibles)
- @design re-audit (contrastes `bg-error/10`, PlanThumbnail non audité v1, dark mode si applicable)
- @copywriter re-audit (anglicismes "déposer", micro-copy erreurs, compteur "emplacements restants")
- @testeur-persona-laurent re-audit (GP1-GP10)

**PRIORITÉ 4 — Autopilote Étape 2 Lots**
- Fichier : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`
- Composants : `PlanCanvas.tsx`, `LotPanel.tsx`
- Spec : `docs/product/vs-functional-specs.md` §4 (US-VS-03/04/05)
- Même protocole 7 agents / 4 batches

**PRIORITÉ 5 — Résiduels Étape 0 (non-traités s15)** :
- R1/R4 PM (aria-busy `<form>` + focus-visible Annuler)
- R2 PM (bornes surface 9-5000 propagées specs)
- R6 qa (useToast réel vs stub)
- R7 qa (tests Vitest validation CreateProjectForm)

**PRIORITÉ 6 — Créer testeur-persona-thomas-marchand** (optionnel, reporté depuis s14)
- Laurent utilisé par substitution pour Thomas MDB — profils divergents
- Action : @agent-factory crée `.claude/agents/testeur-persona-thomas-marchand.md` calqué sur Nicolas

**Actions Thomas hors-agent** (inchangées depuis s11) :
- Versi Immobilier — GEO off-site (Crunchbase + Pappers.fr + LinkedIn entreprise)
- Versi Immobilier — Photos biens Muguets via back office
- Versi Immobilier — 5 références Nanterre photos (script prêt)
- versi-capital.fr + versi-finance.fr (scope futur)

**Protocole autopilote — règles anti-timeout (enrichies s15)** :
- Max 2 agents par message (batch) — 3 possible mais marge réduite
- Brief < 800 mots par agent
- Format de sortie imposé (tableau strict, colonnes fixes, pas de prose)
- Write squelette IMMÉDIATEMENT, puis Edit
- Max 1 Read par fichier, max 50 lignes
- **NOUVEAU s15** : pour audit-only, lister exhaustivement les fichiers à auditer dans le brief + offset précis par fichier
- **NOUVEAU s15** : boucle visuelle Playwright obligatoire AVANT commit principal sur tout livrable front responsive OU portalisé
- Seuil session : max 2 étapes par session (16 Task producteurs, sous ALERTE ROUGE 18)
- **Escalade règle n°4** : après 2 timeouts agent → fallback manuel Claude principal + audit agent 10/10 obligatoire en session suivante

**Décisions cumulées Versi Studio (s12-s15)** :
- Stack Next.js 16 (version réelle, specs alignées)
- Persona = Thomas marchand de biens (à distinguer de Thomas fondateur = @moi)
- Outil INTERNE : noindex/nofollow, pas de SEO public
- Design = endorsed brand (charcoal + stone Versi, pas de couleur d'accent)
- V1 = sans auth, sans paiement, sans PDF
- Workflow 4 étapes : Upload → Lots → Rooms → Visuels
- **NOUVEAU s15** : extraction IA déclenchée sur clic "Lancer l'analyse" (option A), pas auto-upload
- **NOUVEAU s15** : anglicismes ("upload/uploader/uploadé") = P0 bloquant → "déposer/déposé/déposez" obligatoire
- **NOUVEAU s15** : bug Tailwind v4 systémique latent — renommer `--spacing-*` en `--space-*` dans une passe dédiée

**Prompt de reprise suggéré** :
```
@orchestrator mode reprise de session. Lis project-context.md (mémo de reprise).
Étape 1 Upload clôturée versi-s16 en GO ABSOLU (@moi) avec unanimité 9,17/10
(@ux 9, @design 9, @copywriter 9,5). Bloqueur débloqué : Étape 2 Lots démarre.
Priorités versi-s17 :
(1) Autopilote Étape 2 Lots : US-VS-03/04/05, composants PlanCanvas + LotPanel.
    Protocole 7 agents / 4 batches (reproduire s16 Upload).
(2) Conditions backlog Étape 1 (non-bloquant) : 3 violations G31 tokens primitives,
    touch target bouton supprimer PlanThumbnail, labels Stepper mobile, états :active
    systémiques, bouton "Réessayer" erreur fetchData, rollback étage message enrichi.
(3) Décision fondateur P1 registre tu/vous (status quo "vous" ou passage "tu").
(4) Matrice G27 race condition : re-mapper upload-p0.spec.ts (7 AC P0 couverts).
(5) Investigation upload-p0.spec.ts échecs préexistants (PATCH floor / workflow state).
Protocole : anti-timeout strict, boucle visuelle obligatoire, brief typiste, rédaction en tu/vous pro.
```

---

### Mémo de reprise (archive)

#### versi-s14 — Finalisation autopilote Étape 0 Dashboard (clôturée 2026-04-16)

**Résumé session versi-s14 — Étape 0 Dashboard CLÔTURÉE** :

1. **Correction @creative-strategy v2→v3** : brief `docs/reviews/autopilot/vs-step0-creative-fix-brief.md` (P1-P4) + 5 fixes appliqués par @fullstack sur `page.tsx`. Re-audit @creative v3 : **GO 9/10** (6→7→9).
2. **Décision D2 bornes surface** arbitrée par persona Laurent : min=9 / max=5000 / step=1 (`docs/reviews/autopilot/vs-step0-d2-arbitrage-surface-laurent.md`).
3. **US-VS-00 (Dashboard listing)** ajoutée aux specs par @pm (gate G27 — traçabilité).
4. **11 fixes F1-F11 appliqués** sur `versi-studio/src/app/vs/page.tsx` (F1-F5 par Claude principal fallback après 2× 529 ; F6-F11 par @fullstack async après 4× 529, puis audit obligatoire).
5. **Fix P0 error message** : regression F7 détectée par @qa v3 avant timeout — alignement avec spec US-VS-00:113 + test E2E `pages.spec.ts:265` (commit `535a5f1`).
6. **Re-audits v3 des 3 agents < 10/10** :
   - @copywriter v3 : **GO 9/10** (4/4 corrections R1-R4 PASS)
   - @product-manager v3 : **GO 9/10** (5/5 corrections P1-P5 PASS, 4 résiduels mineurs)
   - @qa v3 : **GO 9.2/10** (12/12 fixes + P0 PASS, 8/8 gates critiques PASS)

**Scoring final Étape 0 Dashboard** :
| Agent | v1 | v2 | v3 |
|---|---|---|---|
| @creative-strategy | 6 | 7 | **9** |
| @copywriter | 8 | 7.5 | **9** |
| @product-manager | 7.2 | 7.5 | **9** |
| @qa | 7.6 | 8.1 | **9.2** |
| @ia | 8.8 | — | — |
| @moi | 5.5 | 10 | — |
| @persona Laurent | 6.4 | 8 | — |

**Moyenne session versi-s14 (4 agents re-audités)** : 9.05/10 (vs 7.3 en s13). Dashboard prêt merge.

**Travail restant — PROCHAINE SESSION (versi-s15)** :

**PRIORITÉ 1 — Autopilote Étape 1 Upload**
- Fichier : `versi-studio/src/app/vs/projects/[id]/upload/page.tsx`
- Composants : `DropZone.tsx`, `PlanThumbnail.tsx`, `Stepper.tsx`
- Spec : `docs/product/vs-functional-specs.md` §3 (US-VS-01)
- Même protocole : 7 agents en 4 batches (A @qa+@copy / B @creative+@pm / C @ia+@moi / D @persona)
- Itérations @fullstack jusqu'à 9/10+ pour chaque agent

**PRIORITÉ 2 — Résiduels non-bloquants Étape 0 à traiter avant ou pendant Étape 1** :
- **R1 (PM)** : aria-busy sur `<form>` en cosmétique (ajout 1 ligne)
- **R2 (PM)** : propager les bornes surface 9-5000 dans `docs/product/vs-functional-specs.md` (spec écrit encore 10-9999)
- **R3 (PM)** : spec analytics events (propriétés + timings) pour Umami (backlog)
- **R4 (PM)** : focus-visible explicite sur bouton Annuler form (1 ligne)
- **R5 (copy)** : signal textuel "Continuer →" sur ProjectCard (optionnel polissage UX)
- **R6 (qa)** : implémenter `useToast()` réel (remplace stub `console.log`)
- **R7 (qa)** : tests Vitest validation CreateProjectForm (adresse<5, surface<9, surface>5000)
- **R8 (qa)** : clarifier event `vs_project_created` (server-side dans API ou client ?)

**PRIORITÉ 3 — Autopilote Etapes 2, 3, 4** (même protocole)
- Etape 2 Lots : `lots/page.tsx` + `PlanCanvas.tsx`, `LotPanel.tsx` — spec §4
- Etape 3 Rooms : `rooms/page.tsx` + `RoomCanvas.tsx`, `RoomPanel.tsx` — spec §5
- Etape 4 Visuals : `visuals/page.tsx` + `StyleGrid.tsx`, `VisualRoom.tsx`, `VisualResult.tsx`, `ChatAgent.tsx` — spec §6

**PRIORITÉ 4 — Créer testeur-persona-thomas-marchand** (optionnel)
- Actuellement, @testeur-persona-laurent est utilisé par substitution pour Thomas (marchand de biens Versi Studio)
- Laurent = investisseur holding, pas marchand de biens. Le profil diverge.
- Action : @agent-factory crée `.claude/agents/testeur-persona-thomas-marchand.md` calqué sur le modèle Nicolas

**Actions Thomas hors-agent** (inchangées depuis s11) :
- Versi Immobilier — GEO off-site (Crunchbase + Pappers.fr + LinkedIn entreprise)
- Versi Immobilier — Photos biens Muguets via back office
- Versi Immobilier — 5 références Nanterre photos (script prêt)
- versi-capital.fr + versi-finance.fr (scope futur)

**Protocole autopilote — règles anti-timeout validées** :
- Max 2 agents par message (batch) — 3 possible mais marge réduite
- Brief < 800 mots par agent
- Format de sortie imposé (tableau 5 lignes, pas de prose)
- Write squelette IMMÉDIATEMENT, puis Edit
- Max 1 Read par fichier, max 50 lignes
- Seuil session : max 2 étapes par session (16 Task producteurs, sous ALERTE ROUGE 18)

**Décisions cumulées Versi Studio (s12-s13)** :
- Stack Next.js 16 (version réelle, specs ont été alignées)
- Persona = Thomas marchand de biens (à distinguer de Thomas fondateur = @moi)
- Outil INTERNE : noindex/nofollow, pas de SEO public
- Design = endorsed brand (charcoal + stone Versi, pas de couleur d'accent)
- V1 = sans auth, sans paiement, sans PDF
- Workflow 4 étapes : Upload → Lots → Rooms → Visuels

**Prompt de reprise suggéré** :
```
@orchestrator mode reprise de session. Lis project-context.md (mémo de reprise).
Étape 0 Dashboard clôturée (versi-s14) avec scoring ≥ 9/10 sur tous les agents re-audités.
Priorité : lancer l'autopilote sur Étape 1 Upload (US-VS-01, page.tsx upload) avec le
protocole validé (7 agents en 4 batches, anti-timeout strict, brief typiste si 529).
Avant de commencer : traiter R1-R5 PM/copy résiduels Étape 0 en préalable si pertinent
pour Étape 1 (notamment R2 propagation bornes surface dans specs).
```
