# Audit s33 — UI Étape 4 Visuels Versi Studio (3 issues prod)

**Branche** : `claude/versi-s33-propagation-context-u8L8y`
**Date** : 2026-05-07
**Mode** : audit READ-ONLY (Read + Glob + Grep). Aucun code modifié.
**Trigger** : 3 issues remontées par Thomas en prod après smoke test session 32.

---

## 1. Synthèse

**Verdict** : 3 issues confirmées, criticité hétérogène. **Issue #4** (zoom preview) = manque fonctionnel simple, fix < 1h (réutilisation `PlanLightbox` existant + ajout state local + bouton/click handler dans 2 composants `RoomPreviewView` + `VisualGallery.VisualCard`). **Issue #5** (« Délai dépassé » sur Affiner) = race condition entre timeout local 120s du dialog et délai réel de `gpt-image-2` (jusqu'à 180s avec cold start Replit autoscale + fire-and-forget non `await` côté API `/iterate`) ; le visuel arrive bien via le polling parent SSE mais l'erreur reste figée dans le dialog. **Issue #6** (persistance avant/après type Versimo) = la fondation est déjà là (vs_visuals stocke `prompt_used` + `prompt_version` + `parent_visual_id` + `style_id` + `coherence_mode`), il manque essentiellement (a) le lien explicite à l'image SOURCE (photo originale envoyée à OpenAI), (b) la version exacte du modèle, (c) feedback humain / score persona, et (d) une interface d'audit. Aucune migration destructive nécessaire — additif uniquement. **Aucun crash bloquant en prod sur Étape 4**, mais UX dégradée pour Thomas et future capacité d'audit prompts à dérouler proprement.

## 2. Issue #4 — Pop-up zoom manquant sur les aperçus (root cause)

**Composants concernés** (2 surfaces preview) :
- `versi-studio/src/components/vs/RoomPreviewView.tsx:113-126` — preview pendant le wizard, avant validation par pièce. `<Image>` rendu sans `onClick`, aucun lightbox local.
- `versi-studio/src/components/vs/VisualGallery.tsx:182-195` (sous-composant `VisualCard`) — galerie finale post-génération. Idem : `<Image>` sans handler de clic.

**Comportement actuel au clic** : aucun. L'image est `<Image fill className="object-cover">` enrobée dans un `<div className="aspect-[4/3]">`. Aucun `<button>` parent, aucun `cursor-zoom-in`, aucun `role="button"`. L'utilisateur clique → rien ne se passe (le clic propage juste à la `<article>` ou `<li>` qui n'a pas de handler non plus).

**Pattern recommandé** : RÉUTILISER `versi-studio/src/components/vs/PlanLightbox.tsx` (déjà construit pour les plans PDF/image, pattern WCAG conforme : `role=dialog` + `aria-modal` + ESC handler + focus management + `body.style.overflow='hidden'`). Ce n'est pas un Radix Dialog ni un shadcn Dialog — c'est un composant custom léger sans dépendance, parfaitement aligné avec le mindset "10 lignes natives plutôt qu'un package".

**Variante** : `PlanLightbox` est typé pour `VsPlan` (avec `mime_type` / `original_filename`). Pour les visuels générés, créer un nouveau composant frère `VisualLightbox.tsx` (≈ 70 L) qui prend `{ src: string, alt: string, onClose: () => void }` — plus simple et direct.

**Pas de bibliothèque externe nécessaire** (pas de `react-image-lightbox`, pas de `yet-another-react-lightbox`). Note : le pattern Radix Dialog via shadcn/ui serait surdimensionné ici (une lightbox plein écran avec ESC et `next/image` `sizes="100vw"` suffit).

## 3. Issue #4 — Diff attendu (lightbox)

Pseudo-diff, **pas de code écrit** :

1. **Nouveau composant `VisualLightbox.tsx`** (≈ 70 L) : copier-adapter `PlanLightbox.tsx` mais signature `{ src: string | null; alt: string; onClose: () => void }`. Garder ESC handler + body scroll lock + focus close button + click outside close. Utiliser `<img>` (pas `next/image fill` à pleine viewport — `<img className="max-w-full max-h-full object-contain">` est plus simple en lightbox).
2. **Patch `RoomPreviewView.tsx`** : ajouter state `const [zoomTarget, setZoomTarget] = useState<{src:string;alt:string}|null>(null)`. Wrapper l'image dans un `<button>` (zone cliquable) ou ajouter `<button className="absolute inset-0" aria-label="Agrandir le visuel">` au-dessus de l'image (z-0) en restant SOUS le bouton "Affiner" (z-10). Au click → `setZoomTarget({src, alt: ...})`. Rendu conditionnel `{zoomTarget && <VisualLightbox ... onClose={() => setZoomTarget(null)} />}` à côté du rendu existant `{refineTarget && <RefineVisualDialog ...}` (ligne 171).
3. **Patch `VisualGallery.tsx` `VisualCard`** : même pattern, state local au composant ou remonter au parent `VisualGallery` (préférable : un seul lightbox monté). Wrapper `<div aspect-[4/3]>` avec un `<button onClick className="cursor-zoom-in">` ou ajouter cursor-pointer + onClick sur le div conteneur.
4. **A11y obligatoire** : `aria-label="Agrandir le visuel — {roomLabel}"` sur le bouton trigger, focus return au bouton trigger après close (déjà géré par `previouslyFocusedRef` pattern de `RefineVisualDialog`), ESC ferme, click backdrop ferme, alt sur `<img>` reprend le `roomLabel`.
5. **Hiérarchie z-index** : lightbox à `z-50` (comme `PlanLightbox`), `RefineVisualDialog` aussi à `z-50` — vérifier qu'il n'y a pas conflit si l'utilisateur ouvre lightbox PUIS Affiner. Recommandation : désactiver le bouton "Affiner" (pointer-events: none) tant que lightbox ouverte, OU empêcher d'ouvrir le lightbox depuis le dialog Affiner.

## 4. Issue #5 — « Délai dépassé » sur Affiner (root cause)

**Trace du chemin d'erreur** :
- `versi-studio/src/components/vs/RefineVisualDialog.tsx:48` : `const POLL_MAX_DURATION_MS = 120_000;` — timeout LOCAL hardcodé à 2 min.
- `versi-studio/src/components/vs/RefineVisualDialog.tsx:163-208` : fonction `poll()` interne. Polling `/api/vs/visuals/{newId}/status` toutes les 4 s.
  - **Ligne 178** : si `status === "generated"|"validated"` → `onRefined(newId); setBusy(false); return;` → succès, dialog notifie le parent.
  - **Ligne 184-191** : si `status === "failed"` → `setError(error_message); setBusy(false); return;` → erreur explicite serveur.
  - **Ligne 194-198** : `if (Date.now() - startedAt > 120_000) { setError("Délai dépassé — réessayez dans quelques instants."); setBusy(false); return; }` — **C'EST CE BRANCH QUI DÉCLENCHE LE MESSAGE**.
- `versi-studio/src/app/api/vs/visuals/[id]/iterate/route.ts:107` : `iterateVisualAsync(...)` est lancé en **fire-and-forget** (pas de `await` avant `NextResponse.json` ligne 114). Anti-pattern Replit autoscale documenté dans `.claude/agents/fullstack.md` règle « Replit autoscale : zéro fire-and-forget ». Le worker peut être tué après réponse → `iterateVisualAsync` interrompu → `vs_visuals.status` reste à `'processing'` indéfiniment, et le polling client time out à 120 s sans jamais voir `'generated'`.
- **Race condition observée par Thomas** : le visuel APPARAIT quand même → cela vient probablement du fait que (a) Replit a redonné du temps au worker, ou (b) c'est le `useVisualsStream` du parent (4 s polling, source de vérité) qui rattrape le visuel APRÈS T+120 s. Mais le dialog `RefineVisualDialog` a déjà bouclé son `setError("Délai dépassé...")` et retourné → l'erreur reste affichée même si `vs_visuals.status` finit par passer à `'generated'`.

**Pourquoi 120 s est trop court** : `gpt-image-2` réel = 30-90 s en moyenne, mais avec cold start Replit + worker re-spawn + queue OpenAI peut atteindre 150-200 s. Le timeout 120 s est calé sur un cas nominal sans cold start.

**Pourquoi le polling parent récupère** : `useVisualsStream` (`versi-studio/src/hooks/useVisualsStream.ts`) poll `/api/vs/projects/{id}/visuals-job` toutes les 4 s tant que la phase est `generating`/`gallery`. Mais en mode wizard pièce-par-pièce (`VisualWizard.tsx`), le hook est-il actif pendant un Affiner ? Réponse via `RoomPreviewView.tsx:178` → `onVisualRefined` callback déclenche un `fetch(/api/vs/visuals/${newVisualId}/status)` côté wizard (`VisualWizard.tsx:867-879`) qui injecte le visuel localement → indépendant du timeout du dialog.

**Conclusion bug #5** : le timeout local 120 s est (a) trop court pour gpt-image-2 réel + cold start, (b) pas synchronisé avec le polling parent qui finit par récupérer le visuel, (c) déclenche `setError` qui n'est jamais clearé même quand le visuel arrive en background. **Ce n'est pas un timeout réseau ni un bug serveur** — c'est un timeout côté UI mal calibré + absence de mécanisme de cancel quand succès tardif arrive via une autre voie.

## 5. Issue #5 — Diff attendu (timer cleanup / annulation)

3 options classées par préférence (Option A recommandée) :

**Option A — augmenter timeout 120 s → 240 s + transformer le timeout en warning non bloquant** (`RefineVisualDialog.tsx`) :
- `POLL_MAX_DURATION_MS = 240_000` (4 min, couvre gpt-image-2 + cold start + queue).
- À T+90 s : afficher un message inline « Cela prend plus longtemps que prévu — patientez encore une minute. » SANS clear `busy`, SANS arrêter le polling.
- À T+240 s : remplacer `setError("Délai dépassé...")` par un message moins alarmiste « La génération prend plus de temps que d'habitude. Vous pouvez fermer cette fenêtre — le visuel apparaîtra dans la galerie dès qu'il sera prêt. » + bouton « Voir la galerie » qui appelle `onClose()`.
- L'erreur n'est plus affichée comme un échec, et le polling parent finira par capturer le visuel.

**Option B — supprimer le timeout local et déléguer au polling parent** :
- Retirer entièrement le branch `if (Date.now() - startedAt > POLL_MAX_DURATION_MS)`. Le polling continue tant que le dialog est ouvert. L'utilisateur peut fermer manuellement (bouton Annuler — déjà présent) → `pollAbortRef.abort()` au unmount.
- Risque : si la génération est vraiment cassée (status reste `processing` à vie), pas de fallback UX → message bloquant éternel. Doit être combiné avec un detect failure côté serveur (cron qui marque les `processing > 10 min` en `failed`).

**Option C — sync avec polling parent via état partagé** :
- Le dialog ne fait plus son propre polling. Il subscribe au `useVisualsStream` du parent et observe quand `pendingVisualId` apparaît dans `visualsByRoom`. Le polling 4 s parent est déjà actif → zéro duplication.
- Refacto plus profonde, à privilégier en V3.

**Fix backend complémentaire OBLIGATOIRE quelle que soit l'option UI** (`/api/vs/visuals/[id]/iterate/route.ts:107`) :
- Documenter explicitement que `iterateVisualAsync` est fire-and-forget (anti-pattern Replit autoscale).
- Soit migrer vers le pattern `vs_visual_jobs` (table existante depuis migration 006) avec un worker persistant et un cron de reprise.
- Soit `await` la fonction (mais alors la requête HTTP cliente attend 60-180 s — incompatible avec proxy Replit 60 s, donc inviable).
- Recommandation pratique : court terme = Option A (augmenter timeout 240 s), moyen terme = persister l'iterate dans `vs_visual_jobs` + worker.

**Option recommandée immédiate** : Option A (≈ 30 min fullstack, 1 fichier modifié, zéro risque régression).

## 6. Issue #6 — Inventaire persistance avant/après (existant vs Versimo)

**Inventaire `vs_visuals` actuel** (source : `versi-studio/src/lib/vs/db.ts:288-300` + migration `005_s29_visuals_coherence.sql`) :

| Champ | Table | Stocké ? | Exposé via API ? | Interface admin ? |
|---|---|---|---|---|
| Image source (photo originale envoyée à OpenAI) | `vs_visuals.photo_id` → `vs_photos.file_path` | OUI (lien indirect via FK) | OUI (`/api/vs/files?path=...`) | NON |
| Image générée (output OpenAI) | `vs_visuals.file_path` | OUI | OUI | NON |
| Prompt utilisé (texte complet envoyé à gpt-image-2) | `vs_visuals.prompt_used` | OUI (TEXT) | NON exposé directement | NON |
| Version du prompt (template v2.0.0 etc.) | `vs_visuals.prompt_version` | OUI (VARCHAR 20) | NON | NON |
| Style choisi (scandinave, bohème, ...) | `vs_visuals.style_id` | OUI | OUI | NON |
| Lien parent → enfant (itérations Affiner) | `vs_visuals.parent_visual_id` | OUI (FK self) | NON exposé | NON |
| Numéro d'itération | `vs_visuals.iteration_count` | OUI | NON | NON |
| Lien ancre → secondaire | `vs_visuals.anchor_visual_id` | OUI (FK self) | partiellement (`coherence_mode`) | NON |
| Signature visuelle (palette, meubles, lumière) | `vs_visuals.visual_signature_json` | OUI (JSONB) | NON | NON |
| Mode de cohérence | `vs_visuals.coherence_mode` | OUI | OUI | NON |
| Statut (processing/generated/validated/failed) | `vs_visuals.status` | OUI | OUI | NON |
| Message d'erreur si fail | `vs_visuals.error_message` | OUI (TEXT) | NON | NON |
| Timestamp création | `vs_visuals.created_at` | OUI | NON | NON |
| Modèle OpenAI exact (gpt-image-2 vs futur) | — | **NON** | — | NON |
| Temps de génération (latence) | — | **NON** | — | NON |
| Coût exact ($) par visuel | — | **NON** (estimé au niveau job seulement, `vs_visual_jobs.estimated_cost_usd`) | — | NON |
| Score persona / feedback humain | — | **NON** (aucune table) | — | NON |
| Brief consolidé qui a généré le prompt | — | **NON** stocké, reconstruit à la volée par `buildArchitecturalBrief` | — | NON |
| Pills profil lot + détails pièce au moment de la génération (snapshot) | — | **NON** (lu en live depuis `vs_lots`/`vs_rooms.architectural_details` — peut avoir muté depuis) | — | NON |
| Image input réellement envoyée à OpenAI (toFile result) | — | **NON** (le `vs_photos.file_path` est l'original, mais des transformations sharp/heic peuvent avoir lieu en route) | — | NON |
| Tags qualité (good / bad / needs_review) | — | **NON** | — | NON |

**Synthèse des manques pour matcher Versimo** :
1. **Données quantitatives manquantes** : modèle exact, latence, coût exact, paramètres OpenAI (`size`, `quality`, `n`).
2. **Snapshot brief manquant** : le brief consolidé est reconstruit à la volée. Si `vs_lots.architectural_details` ou `vs_rooms.architectural_details` mute après génération, on ne peut plus reproduire l'input qui a généré le prompt → audit impossible. **Critique pour audit Versimo.**
3. **Feedback humain manquant** : aucune table `vs_visual_feedback` ou colonne `quality_score` / `human_label` / `notes_audit`. Le statut `validated` est binaire (validé par marchand) mais ne capture pas la qualité.
4. **Interface admin manquante** : aucune page `/vs/admin/visuals` ou similaire pour parcourir les paires avant/après. Tout est accessible via SQL direct uniquement.
5. **Pas d'export structuré** : pas d'API `GET /api/vs/visuals/audit?since=...` pour bootstrap d'un agent d'audit prompts.

**Décision Thomas A/B/C en attente** (orchestrateur) — cet audit fournit la base, sans trancher.

## 7. Plan de prioritisation (effort)

| Issue | Effort | Description |
|---|---|---|
| **#4 Lightbox preview** | **< 1 h** | 1 nouveau composant `VisualLightbox.tsx` (≈ 70 L copié de `PlanLightbox`) + 2 patches dans `RoomPreviewView.tsx` et `VisualGallery.tsx` (≈ 15 L chacun, state local + button trigger). Tests Vitest sur le composant pur (pattern helper-first). Pre-commit `tsc --noEmit && next lint && next build`. |
| **#5 Affiner timeout** | **30 min — 1 h** (Option A) | 1 fichier modifié (`RefineVisualDialog.tsx`) : 240_000 + warning intermédiaire à 90 s + dégradation UX du message timeout final. Aucune migration DB, aucun API change. Test manuel = 1 Affiner forcé en cold start. |
| **#5 Affiner robuste** | **1 j** (Option B/C + persistance backend) | Migrer `iterateVisualAsync` vers `vs_visual_jobs` + worker reprenable + cron reprise + sync polling parent. À envisager si Affiner devient critique en prod après V2. |
| **#6 Persistance avant/après — additive minimale** | **0,5 — 1 j** | Migration 016 `ALTER TABLE vs_visuals ADD COLUMN IF NOT EXISTS` : `model_used VARCHAR(50)`, `generation_latency_ms INT`, `cost_usd_actual NUMERIC(6,4)`, `brief_snapshot JSONB`, `human_quality_label VARCHAR(20)`, `human_notes TEXT`. Patcher les 2 routes qui créent/updaten visuels (`/iterate` + `/regenerate` + le worker generate) pour remplir ces champs au moment de l'appel OpenAI. Aucune interface admin encore. |
| **#6 Interface admin audit** | **1 — 2 j** | Page `/vs/admin/visuals` (Server Component) avec liste paginée (image source + image générée côte à côte + prompt + métadonnées) + filtres (style, statut, label). API `GET /api/vs/visuals/audit?cursor=...`. Si scope minimal : viewer read-only sans labelisation interactive. |
| **#6 Boucle feedback complète** | **2 — 3 j** | Boutons « Bon / À auditer / Mauvais » sur la page admin + table `vs_visual_feedback` séparée + export CSV pour fine-tuning prompts. Décision Thomas requise sur scope final (A/B/C). |

**Recommandation orchestrateur** :
- **Sprint immédiat (s33)** : Issue #4 + Issue #5 Option A → 2 h fullstack. Débloque Thomas en prod.
- **Sprint suivant (s34)** : Issue #6 additive minimale (migration 016 + remplissage des nouveaux champs) → fondation prête pour audit même sans UI.
- **Sprint ultérieur (s35+)** : Interface admin + boucle feedback selon décision Thomas A/B/C.

## 8. Risques résiduels

**Ce que cet audit NE couvre PAS** :

1. **Pas testé en prod** : audit READ-ONLY sur le code uniquement. Le diagnostic du timeout 120 s n'est pas reproduit avec un vrai cold start Replit + gpt-image-2 chronométré. Si la latence réelle est < 120 s en moyenne, la cause peut être ailleurs (ex : `iterateVisualAsync` jamais relancé après kill worker, le visuel n'arrive donc JAMAIS, et le polling parent finit par stagner au lieu de récupérer). À valider par Thomas en re-testant Affiner avec console ouverte (`Network` tab pour observer la séquence des polls + Performance tab pour mesurer le délai réel).

2. **Pas d'analyse de la concurrence Affiner + génération job** : si Thomas clique Affiner pendant qu'un job de génération principal tourne pour la même pièce, y a-t-il des collisions entre les 2 polls (`useVisualsStream` parent + `RefineVisualDialog` interne) ? Non analysé.

3. **Compatibilité ascendante migration 016 (issue #6)** : les `ALTER TABLE ADD COLUMN IF NOT EXISTS` sont safe (rows existantes auront NULL sur les nouveaux champs). Mais le code consommateur doit gérer NULL gracefully (defensive normalize au load API, pattern règle s32 documenté dans `.claude/agents/fullstack.md` règle « Migration JSONB defensive »). Sinon crash garanti sur visuels antérieurs à la migration.

4. **Volume historique non quantifié** : combien de visuels sont déjà persistés en prod ? Si > 10 000, l'interface admin (issue #6) doit prévoir pagination + indexes. Si < 100, scope minimal viewer suffit. À demander à Thomas.

5. **Perfs lightbox issue #4** : `<img>` non optimisé Next.js sur lightbox plein écran avec image gpt-image-2 1024x1024. Acceptable (1 seule image affichée à la fois). Si Thomas demande zoom/pan pour voir les détails fins (ex : cohérence ancre/secondaire), prévoir `react-zoom-pan-pinch` (out of scope V1).

6. **Sécurité** : la route `/api/vs/files?path=...` (utilisée pour servir les visuels) — pas auditée ici pour exposition path traversal. Si l'interface admin (issue #6) liste tous les visuels d'utilisateurs différents, vérifier en amont qu'il y a bien filter par `user_id` au niveau API.

7. **i18n / copy** : les nouveaux messages UX (Option A timeout dégradé, lightbox alt, etc.) doivent être validés par @copywriter avant prod, et alignés sur `docs/copy/ux-writing-guide.md` si présent.

8. **Pas testé sur mobile** : l'effet zoom (issue #4) est testé seulement en logique. Sur mobile, la lightbox doit gérer pinch-to-zoom natif si attendu — `<img>` standard supporte le pinch sur iOS/Android tant que `meta viewport user-scalable` n'est pas désactivé. À vérifier en `tests/screenshots/`.

---

**Handoff → @orchestrator**
- **Fichiers produits** : `/home/user/Versi/docs/ux/s33-audit-ui-etape4-issues-prod.md` (livrable unique, 8 sections, ≈ 195 L).
- **Fichiers lus** (READ-ONLY, aucune modification de code) : `versi-studio/src/components/vs/VisualPlacementView.tsx`, `RefineVisualDialog.tsx`, `VisualGallery.tsx`, `RoomPreviewView.tsx`, `PlanLightbox.tsx`, `versi-studio/src/hooks/useVisualsStream.ts`, `versi-studio/src/app/api/vs/visuals/[id]/iterate/route.ts`, `versi-studio/src/lib/vs/types.ts:413-440`, `versi-studio/src/lib/vs/db.ts:288-300`, `versi-studio/src/lib/vs/migrations/005_s29_visuals_coherence.sql`, `006_s30_visual_jobs.sql`, `project-context.md:500-575`.
- **Décisions** : aucune — audit pur. Recommandations classées priorité dans section 7. La décision Thomas A/B/C pour issue #6 reste ouverte (fondation déjà bien dimensionnée — scope dépend de la profondeur d'audit voulue).
- **Points d'attention** : (a) issue #5 nécessite reproduction console ouverte côté Thomas pour confirmer le scénario timeout vs autre cause ; (b) issue #6 demande snapshot brief consolidé au moment de la génération sinon audit a posteriori impossible (mutation `vs_lots.architectural_details` post-génération invalide tout) ; (c) backend `iterate` est en fire-and-forget → anti-pattern Replit autoscale à corriger en moyen terme.
- **Actions Replit requises** : aucune (audit pur, pas de migration ni redémarrage).
- **Pre-commit check** : non applicable (1 seul livrable Markdown, pas de code source dans `src/`). Si Thomas approuve les fixes proposés, le prochain agent (@fullstack) devra exécuter `npx tsc --noEmit && npx next lint && npm run build` avant commit.
