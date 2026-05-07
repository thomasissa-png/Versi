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

[À remplir]

## 7. Plan de prioritisation (effort)

[À remplir]

## 8. Risques résiduels

[À remplir]
