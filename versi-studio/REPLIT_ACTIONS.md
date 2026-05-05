# Versi Studio — Actions Replit

Source : `versi-s29` — Vague 1 backend Étape 4 v2 (Phase 3 Option D).

Toutes les actions ci-dessous doivent être exécutées sur Replit après pull
de la branche s29 — elles ne sont PAS automatisées par CI.

---

## 0. s31 — HOTFIX-2 Étape 4 v2 (déploiement obligatoire)

**Pourquoi** : pendant les vagues s30, toute la nouvelle UI v2 (canvas plan,
photos draggables, worker SSE, AngleController, génération multi-pièces) a été
codée et testée (Vitest 107/107, Playwright 18/0/2) MAIS la route active
`/vs/projects/[id]/visuals` rendait toujours l'ancienne UI v1 (`VisualRoom`,
pièce-par-pièce). Thomas voyait l'ancienne UI + job synchrone bloqué 10 min.

**Fix HOTFIX-2 (Option A — redirect)** : `visuals/page.tsx` est désormais un
Server Component minimal qui `redirect()` vers `/visuals/placement` (la nouvelle
UI v2). Zéro flash UI v1, zéro client JS, redirect côté serveur.

Actions à effectuer sur Replit après pull :

1. `git fetch origin && git checkout claude/versi-s31-hotfix-etape4-IpyM0 && git pull`
   (ou la branche s31 mergée sur main si déjà mergée)
2. `cd versi-studio && npm install` (les deps s30 `heic-convert` et `exifr` sont
   déjà installées si vous étiez à jour s30 — sinon voir section 1)
3. Vérifier l'application des migrations :
   - `001_*.sql` à `006_s30_visual_jobs.sql` doivent être appliquées
   - Migration runner auto via `ensureVsTables()` au boot (voir logs serveur)
   - Sinon : `psql $DATABASE_URL -f versi-studio/src/lib/vs/migrations/006_s30_visual_jobs.sql`
4. Vérifier env vars (Replit Secrets) :
   - `OPENAI_API_KEY` avec scope accès `gpt-image-2`
   - `VS_COHERENT_PIPELINE` à `true` (défaut, ne pas overrider sauf rollback)
5. **Redémarrer Replit (Stop puis Run)** — pas seulement reload, pour purger
   le cache Next.js (le redirect Server Component est susceptible d'être caché
   sur la précédente version)
6. **Test manuel** : aller sur un projet existant → cliquer Étape 4 Visuels →
   l'URL doit basculer automatiquement sur `/visuals/placement` et afficher la
   nouvelle UI :
   - Plan dessiné en background (PDF rendu canvas)
   - Liste de photos draggables côté sidebar (desktop) ou bottom-sheet (mobile)
   - AngleController (cercle pivotable + slider 0-359°) au focus d'une photo
   - Bouton "Générer les visuels" en bas
   - PAS de grille de pièces RoomGrid (= ancienne UI v1, signe de bug si visible)

**Risques résiduels — RÉSOLUS s31 (commit `f51a33b`)** :
- ~~`POST /api/vs/rooms/[id]/generate` fire-and-forget~~ → **route convertie en
  410 Gone** (route dépréciée). Plus aucun caller : la nouvelle UI v2
  (`/visuals/placement`) utilise exclusivement
  `POST /api/vs/projects/[id]/visuals/generate` (pipeline cohérent multi-pièces
  + jobs persistants `vs_visual_jobs` + SSE). Élimine le risque "perte de job
  si instance Replit tuée mid-génération".
- ~~Composants v1 orphelins~~ → **VisualRoom.tsx, RoomGrid.tsx, VisualResult.tsx
  supprimés** (zéro import après HOTFIX-2). Pas de code mort résiduel.

GP3 Crédibilité du verdict persona Thomas s31 : PARTIAL → **PASS** (8.5/10 → 10/10 cible).

---

## 1. Installation des nouvelles dépendances npm (obligatoire)

Deux packages ajoutés pour le pré-traitement des photos Étape 4 v2 :

```bash
npm install heic-convert@^2.1.0 exifr@^7.1.3
```

Ces packages sont déjà déclarés dans `package.json` mais leur premier
`npm install` doit être exécuté manuellement sur Replit (le `node_modules`
n'est pas synchronisé avec git).

**Vérification post-install** :
```bash
node -e "console.log(require('heic-convert'))"  # doit afficher [Function]
node -e "console.log(require('exifr').parse)"    # doit afficher [Function: parse]
```

**Si install échoue sur `heic-convert`** : c'est probablement libvips manquante
dans l'image Replit. Ajouter à `replit.nix` (section `deps`) :
```nix
pkgs.vips
pkgs.libheif
```
Puis rebuild Replit.

---

## 2. Migrations SQL — application automatique au démarrage

**Aucune action manuelle requise** — les 4 nouvelles migrations s29 sont
appliquées automatiquement par `ensureVsTables()` au démarrage du serveur Next.js
(pattern existant Versi Studio). Voir `src/lib/vs/db.ts`.

Migrations appliquées (idempotentes, ALTER TABLE ADD COLUMN IF NOT EXISTS) :
- `002_s29_photo_placement` — colonnes position_x/y, angle_degrees, is_placed_on_plan, taken_at, exif_raw, preprocessing_warnings sur `vs_photos`
- `003_s29_room_settings` — nouvelle table `vs_room_settings` (slider visuels + commentaire)
- `004_s29_visual_questions` — nouvelle table `vs_visual_questions` (T1-T5 bloquants)
- `005_s29_visuals_coherence` — colonnes anchor_visual_id, visual_signature_json, coherence_mode, prompt_version sur `vs_visuals`

**Vérification post-déploiement** :
```sql
-- Doit retourner 7 colonnes nouvelles sur vs_photos
\d vs_photos
-- Doit lister vs_room_settings et vs_visual_questions
\dt vs_*
```

**En cas de réinitialisation DB Replit** : les migrations seront rejouées au
prochain boot — aucune action manuelle. Les données utilisateur (photos
uploadées) sont en filesystem et peuvent disparaître selon le pattern Replit
autoscale (cf. règle DB persistance dans CLAUDE.md).

---

## 3. Variables d'environnement

**Aucune nouvelle variable requise pour la Vague 1 backend.**

Variables existantes utilisées par les nouveaux modules :
- `OPENAI_API_KEY` — gpt-image-2 (génération) + gpt-4o-mini (signature, T3, T4)
- `DATABASE_URL` — PostgreSQL Replit

Variables potentiellement utiles Vague 2/3 (à arbitrer selon implémentation routes API) :
- `VS_RATE_LIMIT_IMAGES_EDIT_CAPACITY` (default 8) — capacité du token bucket gpt-image-2
- `VS_RATE_LIMIT_IMAGES_EDIT_REFILL_PER_MINUTE` (default 8) — refill rate

---

## 4. Tests post-déploiement (smoke tests)

Après déploiement Vague 1, vérifier sur Replit :

1. **Health check DB** : `curl https://<replit-url>/api/health` → doit retourner `{ status: "healthy" }` (les nouvelles migrations s'appliquent automatiquement).

2. **Inspection schema** : via Replit DB tool ou `psql $DATABASE_URL -c "\d vs_visual_questions"` → doit lister toutes les colonnes attendues.

3. **Pré-traitement photo HEIC** (smoke test manuel) :
   ```bash
   # Upload d'une photo HEIC iPhone via une route existante (Vague 2 implémentera la nouvelle route)
   # Vérifier les logs serveur : pas d'erreur "heic-convert non installé"
   ```

---

## 5. s30 Vague 2 — Routes API + SSE + job persistant (livrée)

### 5.1 Migration SQL `006_s30_visual_jobs.sql`

Idempotente, appliquée automatiquement au démarrage via `ensureVsTables()`.
**Aucune action manuelle requise** — vérifier au boot dans les logs :
```
[vs/migrations] applied 006_s30_visual_jobs.sql
```
Exécution manuelle dev (optionnelle) :
```bash
psql $DATABASE_URL -f src/lib/vs/migrations/006_s30_visual_jobs.sql
```

### 5.2 Nouvelles variables d'environnement

| Var | Défaut | Rôle |
|---|---|---|
| `VS_VISUAL_COHERENCE_CHECK` | `false` | Active le check cohérence post-génération (P2 persona — coût $0.10/visuel). Laisser à `false` en prod V2. |
| `VS_COHERENT_PIPELINE` | `true` | Active le pipeline cohérent V2 sur `/rooms/[id]/generate`. Mettre à `false` pour rollback V1 d'urgence. |

À ajouter dans **Replit Secrets** uniquement si on veut overrider les défauts.

### 5.3 Routes API livrées

- `POST /api/vs/projects/[id]/preflight` — détection T1-T5
- `POST /api/vs/projects/[id]/visuals/generate` — lance job multi-pièces
- `GET  /api/vs/projects/[id]/visuals-stream` — SSE temps réel
- `PATCH /api/vs/visual-questions/[id]` — soumet réponse Thomas
- `PATCH /api/vs/photos/[id]/place` — place photo sur plan
- `PUT  /api/vs/rooms/[id]/settings` — slider + commentaire
- `POST /api/vs/visuals/[id]/regenerate` — régénération individuelle (EC-5)
- `POST /api/vs/rooms/[id]/generate` — REFACTO vers pipeline cohérent (V2 par défaut)

### 5.4 Limite Replit autoscale connue

Le bus SSE `visual-job-bus.ts` est in-memory par instance. Multi-instance
autoscale = perte d'events si worker tourne sur instance A et SSE sur B.
Mitigation V2 : la BDD `vs_visual_jobs` reste source de vérité (frontend
peut interroger l'état du job en complément). Migration V3 vers Redis
pub/sub si besoin réel multi-instance.

---

## 6. Vague 3 UI Étape 4 v2 — LIVRÉE s30

**Vague 3a (commit `227b419`)** — UI placement canvas + tactile mobile :
- `VisualPlanCanvas.tsx` (canvas natif HTML5, layers background/polygones/photos/contrôles, zoom auto pièce 70% mobile / 60% desktop, pinch+wheel+pan)
- `PlacementBottomSheet.tsx` (fix P0 GP5 : tap-to-confirm, le doigt ne couvre jamais le polygone)
- `AngleController.tsx` (cercle pivotable + slider 0-359°, dual-callback s27.2)
- `VisualPlacementView.tsx` orchestrateur responsive desktop/mobile
- Page `/vs/projects/[id]/visuals/placement` (route distincte de `/visuals` legacy)

**Vague 3b (commit `cff35e1`)** — UI génération + galerie + SSE consumer :
- `useVisualsStream.ts` (EventSource avec replay + heartbeat 60s + reconnect backoff 3x + cleanup)
- `RoomSettingsSidebar.tsx` (sliders 0-5 + warning ordre inversé inline)
- `CostEstimator.tsx` (Σ × $0.21 informatif, JAMAIS bloquant — préf fondateur s29 propagée)
- `QuestionsModal.tsx` (modale C T1-T5)
- `GenerationProgressView.tsx` (vue progression streaming)
- `VisualGallery.tsx` (galerie + badge "Cohérence : réduite" si fallback textual_signature + EC-5 régénération individuelle)

**Tests** :
- Vitest 107/107 PASS (commit `ea472d8`)
- Playwright Chromium 18/0/2 PASS (commit `7a4b26a`) — WebKit en CI (`npx playwright install` requis)

**Verdict persona Thomas** : GO 8.5/10 (commit `0ea909b`). GP5 ex-FAIL → PASS confirmé.

**Aucune action Replit additionnelle** : pas de nouveau secret, pas de nouvelle dépendance npm (sauf `@vitest/coverage-v8` optionnel pour CI coverage strict).

---
