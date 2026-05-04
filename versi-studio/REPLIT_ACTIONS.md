# Versi Studio — Actions Replit

Source : `versi-s29` — Vague 1 backend Étape 4 v2 (Phase 3 Option D).

Toutes les actions ci-dessous doivent être exécutées sur Replit après pull
de la branche s29 — elles ne sont PAS automatisées par CI.

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

## 6. Vague 3 (UI canvas) — à venir

- Composants drag-drop, modale chat questions, contrôleur d'angle
- Consommation EventSource sur `/visuals-stream` côté client
- Investissement tactile mobile (zoom auto, FAB, bottom sheet)

Aucune action Replit anticipée — sera documenté à la livraison Vague 3.
