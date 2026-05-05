# Rapport diagnostic HOTFIX P0 Étape 4 v2 -- 2026-05-05

> Investigation orchestrée. Aucun fix appliqué. User valide root cause AVANT action.
> Branche source : `claude/versi-s30-session-resumption-Jc4hi` (19 commits s30 poussés).

## 1. Synthèse exécutive

**Root cause unique (HAUTE) : la nouvelle UI Étape 4 v2 n'est PAS câblée à la route Étape 4 active.**

Le code s30 (worker async, bus SSE, hook stream, composants `VisualPlacementView`/`GenerationProgressView`/`VisualGallery`) est intégralement livré mais **non importé** depuis `src/app/vs/projects/[id]/visuals/page.tsx`. La page Étape 4 active rend toujours l'ancien composant `VisualRoom` (UI v1).

Conséquence directe sur les 2 symptômes :
- **A (UI inchangée)** : Thomas voit l'ancienne UI parce que c'est ce qui est rendu sur la route. La nouvelle UI v2 est cantonnée à une sous-route `/visuals/placement` non liée depuis le Stepper.
- **B (job bloqué 10 min)** : le texte "Création en cours — environ 90 secondes" est dans `VisualResult.tsx` (composant v1). Donc Thomas est sur la route v1. Le job qu'il déclenche passe par `POST /api/vs/rooms/[id]/generate` (route legacy refactorée en s30), pas par `/visuals/generate` (route s30 jamais touchée). Le runner async + bus SSE + hook stream sont **morts en prod** — aucun event ne peut arriver au client puisque le client (`VisualRoom`) ne s'abonne à rien.

Ce qui le confirmerait sans accès Replit : `git grep -n "VisualPlacementView\|useVisualsStream\|GenerationProgressView" versi-studio/src/app/vs/projects/[id]/visuals/page.tsx` retourne **0 ligne**.

## 2. Symptôme A -- UI inchangée

### Diagnostic

| Fichier | Imports critiques observés | Verdict |
|---|---|---|
| `src/app/vs/projects/[id]/visuals/page.tsx` (route active) | `Stepper`, `RoomGrid`, `VisualRoom` | UI **v1** uniquement |
| `src/app/vs/projects/[id]/visuals/placement/page.tsx` (sous-route) | `VisualPlacementView` → `GenerateButton`, `GenerationProgressView`, `VisualGallery` | UI **v2** (orpheline) |
| `src/components/vs/Stepper.tsx` | Aucune référence à `/visuals/placement` (Grep négatif) | Pas de lien navigation |
| `src/components/vs/VisualRoom.tsx` | `fetch('/api/vs/rooms/${room.id}/generate')` ligne 309 | Appelle route legacy |

La nouvelle UI v2 n'est atteignable que par modification manuelle de l'URL. Du point de vue Stepper standard, l'utilisateur reste sur l'UI v1.

### Verdict

**La nouvelle UI N'EST PAS câblée à la route active.** Les 19 commits s30 ont produit composants + backend mais ont oublié l'étape finale de wire-up : remplacer le rendu de `page.tsx` par `VisualPlacementView` (ou rediriger `/visuals` → `/visuals/placement`).

Probabilité root cause : **HAUTE**.

## 3. Symptôme B -- Job bloqué 10 min

### Diagnostic chaîne v1 (la chaîne réellement exécutée)

1. `VisualRoom` POST `/api/vs/rooms/[id]/generate` (route legacy)
2. Route legacy refactorée en s30 (commentaire ligne 7-11) : `coherent-visual-generator` en mode mono-room (target=1, 1 photo)
3. Réponse 201 avec `visual_id` legacy → l'UI v1 tombe en mode polling `GET /api/vs/visuals/[id]/status`
4. UI v1 affiche "Création en cours — environ 90 secondes" pendant le polling

### Maillon faible identifié

3 hypothèses crédibles, par ordre de probabilité décroissant :

**B1 (HAUTE)** -- La route legacy `/rooms/[id]/generate` `await` `generateCoherentVisuals` côté API (vu lignes 22-24 du fichier route.ts). Sur Replit, le proxy timeout à ~60s. Si `gpt-image-2` met 90s+ : la requête HTTP côté navigateur reçoit un 502/504, mais le polling `/status` voit une row jamais mise à jour (le worker mourrait avec la requête). Le client polle un visuel "pending" indéfiniment.

**B2 (MOYENNE)** -- `VS_COHERENT_PIPELINE` est resté à `false` côté env Replit après s30. Le code retombe sur `generateVisual` (pipeline V1 mono-photo) qui n'a peut-être pas été testé depuis longtemps (régression silencieuse côté ancien provider d'image).

**B3 (BASSE)** -- Migration `006_s30_visual_jobs.sql` non appliquée (aucun trigger d'`ensureVsTables` au boot — ou erreur silencieuse). Mais cette hypothèse n'explique B que si Thomas avait emprunté la nouvelle route — or il est sur la v1 qui ne touche pas `vs_visual_jobs`. Cette hypothèse explique surtout pourquoi la v2 ne marcherait pas non plus s'il la testait.

### Verdict bootstrap runner

`runVisualJob` est un fire-and-forget côté serveur (`void runVisualJob(...)` ligne 107 de `/visuals/generate/route.ts`). Pas de bootstrap au boot Next nécessaire — le runner démarre uniquement quand la route POST `/visuals/generate` est hit. **Mais cette route n'est jamais hit en prod actuelle** (point 2 ci-dessus). Donc la chaîne s30 est inerte à 100%.

Probabilité root cause B (chaîne v1 cassée) : **HAUTE pour B1, dépendante de B2/B3 pour le reste.**

## 4. Hypothèses classées

| # | Hypothèse | Probabilité | Ce qui la confirmerait |
|---|---|---|---|
| H1 | Route Étape 4 `/visuals/page.tsx` jamais migrée vers `VisualPlacementView` (oubli wire-up s30) | **HAUTE** | `git grep VisualPlacementView versi-studio/src/app/vs/projects/[id]/visuals/page.tsx` → 0 résultat (vérifié, OK). Confirme A et explique pourquoi B passe par chaîne v1. |
| H2 | Route legacy `/rooms/[id]/generate` await `coherent-visual-generator` synchrone → timeout proxy Replit 60s sur `gpt-image-2` qui prend 90s+ | **HAUTE** | Logs Replit : chercher `[POST /rooms/.../generate]` + statut 502/504 ou timeout. Vérifier `vs_visuals` row : `status = 'pending'` figée, `image_url = NULL`, `created_at` > 1 min sans MAJ. |
| H3 | `VS_COHERENT_PIPELINE=false` env Replit → pipeline v1 mono-photo cassé / clé OpenAI sans accès image-gen | MOYENNE | `echo $VS_COHERENT_PIPELINE` côté Replit shell. Si vide ou `false` : route prend la branche `generateVisual` (legacy) potentiellement régressée. |

## 5. Actions de débogage à demander à Thomas (max 5)

1. **Vérifier branche déployée Replit (Symptôme A)** :
   ```bash
   cd ~/$REPL_SLUG && git log -1 --oneline && git status
   ```
   Doit afficher un commit de la branche `claude/versi-s30-session-resumption-Jc4hi` (HEAD origin). Si HEAD différent → c'est juste un sync git (rebuild Replit). Probabilité faible : H1 le confirmera quand même même sur HEAD à jour, donc c'est secondaire.

2. **Confirmer H1 sans Replit (côté local)** :
   ```bash
   grep -n "VisualPlacementView\|useVisualsStream" versi-studio/src/app/vs/projects/[id]/visuals/page.tsx
   ```
   Si 0 ligne (déjà observé) → **H1 CONFIRMÉ**.

3. **État DB jobs bloqués (Symptôme B, branche v1)** :
   ```sql
   SELECT id, room_id, status, image_url IS NULL AS no_image,
          created_at, updated_at, EXTRACT(EPOCH FROM (NOW() - created_at))/60 AS minutes_age
     FROM vs_visuals
    WHERE status = 'pending'
    ORDER BY created_at DESC LIMIT 5;
   ```
   Si rows pending depuis > 5 min sans `image_url` → **H2 ou H3 CONFIRMÉ**.

4. **Logs Replit filtrés (15 dernières minutes)** :
   - chercher `[generate]`, `coherent-visual-generator`, `gpt-image`, `timeout`, `fetch failed`, `502`, `504`
   - chercher aussi `[visual-job-runner]` → si AUCUN log avec ce préfixe en 30 min, c'est la confirmation que la chaîne s30 n'est jamais sollicitée (cohérent H1).

5. **Vérifier env var pipeline (H3)** :
   ```bash
   echo "VS_COHERENT_PIPELINE=$VS_COHERENT_PIPELINE"
   echo "OPENAI_API_KEY défini? $([ -n "$OPENAI_API_KEY" ] && echo OUI || echo NON)"
   ```
   Si `VS_COHERENT_PIPELINE=false` → expliquer pourquoi la chaîne v1 mono-photo est exécutée même via la route refactorée s30.

## 6. Plan de fix par hypothèse (NE PAS CODER MAINTENANT)

### Si H1 confirmé (le plus probable, fix prioritaire)

Trois options par ordre de risque croissant :

**Option A — Redirect simple (LOW RISK, recommandée pour HOTFIX)** :
- Modifier `src/app/vs/projects/[id]/visuals/page.tsx` : remplacer le contenu par un `redirect()` Next vers `/vs/projects/[id]/visuals/placement`
- Aucun risque de régression sur l'ancien parcours v1 puisqu'on bascule entièrement sur v2
- 1 fichier modifié, ~10 lignes

**Option B — Inline VisualPlacementView dans page.tsx** :
- Réécrire `page.tsx` pour rendre directement `VisualPlacementView` (copier le pattern de `placement/page.tsx`)
- Conserver le Stepper et la layout actuelle
- 1 fichier modifié, ~80-120 lignes
- Risque moyen : le data-loading actuel de `page.tsx` (project, lots, rooms, statuses) est différent de ce que `VisualPlacementView` attend en props

**Option C — Garder les 2 routes côte à côte avec feature flag** :
- Ajouter `VS_VISUALS_V2_UI=true` env var
- Renvoyer conditionnellement vers v1 ou v2 selon le flag
- Permet rollback rapide si v2 a un bug
- 1 fichier modifié, ~30 lignes

**Recommandation orchestrateur** : Option A en HOTFIX (rapide, sans risque, le sous-écran `placement` est déjà testé Vitest 107/107 + Playwright 18/0/2). Si le sous-écran ne charge pas correctement seul → fallback Option B.

### Si H2 confirmé (timeout proxy sur route legacy)

- Convertir `POST /api/vs/rooms/[id]/generate` en fire-and-forget : créer une row `vs_visuals` status='pending' immédiatement, lancer `void coherentGenerationAsync()`, retourner 201 avec `visual_id` en < 1s
- L'UI v1 polle déjà `/status` → elle s'auto-réconcilie quand le worker écrit le résultat
- 1 fichier modifié, ~30 lignes
- À combiner avec H1 si H2 est confirmé indépendamment

### Si H3 confirmé (env var ou clé OpenAI)

- Ajouter `VS_COHERENT_PIPELINE=true` dans Replit Secrets (forcer le pipeline cohérent)
- OU régler la clé OpenAI scope `gpt-image-2`
- Aucune modification de code

## 7. Risques résiduels (non-vérifiables sans accès Replit)

- État réel de la branche déployée Replit (HEAD origin sync ?)
- Présence de `vs_visual_jobs` en DB (migration 006 appliquée ?) — pas critique tant qu'on est sur chaîne v1, mais critique pour la suite
- Latence réelle `gpt-image-2` en prod (peut être 30s ou 120s)
- État de `VS_COHERENT_PIPELINE` côté env Replit
- Présence éventuelle d'un cache CDN/Replit qui servirait l'ancien bundle même après pull (faible probabilité — Next.js régénère au build)
- REPLIT_ACTIONS.md mentionne uniquement s29 — actions s30 jamais documentées : potentiel npm install manquant (`heic-convert`, `exifr` toujours OK ? nouveaux deps s30 ?)

## 8. Conclusion

Attends confirmation user pour lancer le fix : **H1 (route Étape 4 jamais migrée vers UI v2 — oubli wire-up s30, fix Option A redirect 10 lignes).**

Action de confirmation rapide demandée à Thomas (30 secondes) :
```bash
grep -n "VisualPlacementView\|useVisualsStream" versi-studio/src/app/vs/projects/[id]/visuals/page.tsx
```
Si 0 résultat → H1 confirmé, lancer le fix Option A immédiatement.

Si Thomas peut aussi exécuter la requête SQL de l'action 3, on saura si H2 doit être traité dans le même hotfix (probable).
