# Guide Replit 1er Build — Versi Studio

**Date** : 2026-04-16 (màj commit `893340d`)
**Branche à déployer** : `claude/versi-s21-clustering-polygones-ia`
**Commit build-ready** : `893340d` (post-retour Replit : zod v3 + allowedDevOrigins + dev port 5000)
**Pré-requis** : compte Replit (plan Core recommandé pour PostgreSQL persistant) + accès repo GitHub `thomasissa-png/Versi`

## Adaptations Replit intégrées dans le repo (commit `893340d`)

Les 3 adaptations suivantes sont désormais dans le code, plus besoin de les appliquer manuellement à chaque déploiement :

| Adaptation | Fichier | Effet |
|---|---|---|
| `zod ^3.25.0` (downgrade depuis ^4) | `versi-studio/package.json` | Supprime le conflit peer-dep avec openai v5 → `npm install` sans `--legacy-peer-deps` |
| `allowedDevOrigins: ["*.replit.dev", "*.repl.co", "*.picard.replit.dev"]` + `serverExternalPackages: ["pdf-to-img"]` | `versi-studio/next.config.ts` | Dev server accepte le proxy Replit + pdf-to-img reste externe au bundle |
| Script dev : `next dev -H 0.0.0.0 -p 5000` | `versi-studio/package.json` | Replit attend le port 5000 et 0.0.0.0 pour exposer le dev server |

---

## Résumé en 30 secondes

Versi Studio est une app Next.js 16 App Router + PostgreSQL + OpenAI GPT-4.1 Vision. Déploiement Replit natif, sans Prisma (driver `pg` direct). Les 6 tables `vs_*` sont créées automatiquement au 1er appel runtime via `ensureDbReady()` — pas de migration manuelle à lancer.

**Ordre d'exécution** : §1 import → §2 secrets → §3 database → §4 .replit → §5 install/build → §6 run → §7 smoke tests → §12 checklist finale.

---

## 1. Import du projet sur Replit

### Étapes

1. Se connecter sur [replit.com](https://replit.com) avec le compte propriétaire du projet
2. Bouton **Create Repl** (haut-droite) → onglet **Import from GitHub**
3. Autoriser l'accès GitHub si 1re fois → sélectionner le repo `thomasissa-png/Versi`
4. Dans l'écran de création :
   - **Language / Template** : Replit détecte automatiquement Next.js via `package.json`. Sinon, choisir **Node.js**.
   - **Branch** : saisir `claude/versi-s21-clustering-polygones-ia` (branche build-ready s20)
   - **Name** : `versi-studio` (ou autre, non critique)
   - **Privacy** : Private (recommandé — le repo contient un workflow business)
5. Cliquer **Import from GitHub** → Replit clone le repo (~1-2 min pour un repo de cette taille)

### Particularité : monorepo

Le projet Versi est un monorepo qui contient plusieurs sous-projets :
- `versi-studio/` ← **ce que nous déployons** (V1 production-ready s20)
- `versi-immobilier/` (ancien site legacy)
- `versi-invest-site/` (ancien site legacy)
- `src/` (ancien code non-déployé)

**Important** : le guide `.replit` (§4) pointe EXPLICITEMENT sur `versi-studio/`. Aucune commande ne doit tourner à la racine — toujours `cd versi-studio` d'abord.

### Ancien `.replit` à remplacer

Le repo contient un `.replit` à la racine configuré pour les anciens projets (versi-immobilier + versi-invest-site, port 3001). Ce fichier sera **écrasé** par la nouvelle config §4. Action : suivre §4 et copier/coller le nouveau contenu avant le 1er run.

## 2. Variables d'environnement (Secrets Replit)

Aller sur : onglet **Secrets** (icône cadenas dans la sidebar gauche du Repl) et ajouter les clés ci-dessous.

### Obligatoires (l'app ne démarre pas sans)

| Clé | Valeur | Où l'obtenir |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:port/db?sslmode=require` | Auto-injecté par Replit à la création du PostgreSQL intégré (voir §3). **Ne PAS saisir à la main — Replit le fait.** |
| `OPENAI_API_KEY` | `sk-...` | [platform.openai.com](https://platform.openai.com) → API keys → Create new secret key. Le compte doit avoir des crédits actifs (GPT-4.1 Vision n'est pas free-tier). |

### Recommandées

| Clé | Valeur par défaut | Rôle |
|---|---|---|
| `NODE_ENV` | `production` | Replit le positionne automatiquement à `production` au build. Ne pas le forcer en dev. |
| `NEXT_TELEMETRY_DISABLED` | `1` | Coupe la télémétrie Next.js (défini dans `.replit` §4, pas besoin de le dupliquer ici). |

### Optionnelles / futures

| Clé | Rôle | Défaut |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL publique du repl (utilisée par OpenGraph, sitemap) | `https://[repl-name].[user].repl.co` — à renseigner après le 1er déploiement |
| `LOG_LEVEL` | Verbosité des logs serveur | `info` (non implémenté à ce jour, placeholder) |

### Vérification

Après ajout des Secrets, dans l'onglet **Shell** du Repl :
```sh
echo "DATABASE_URL prefix: ${DATABASE_URL:0:30}..."
echo "OPENAI_API_KEY present: $([ -n "$OPENAI_API_KEY" ] && echo yes || echo NO)"
```
Attendu :
- `DATABASE_URL prefix: postgresql://...` (commence bien par `postgresql://`)
- `OPENAI_API_KEY present: yes`

**Règle sécurité** : ne JAMAIS committer ces valeurs dans le code (ni `.env`, ni README). Uniquement Secrets Replit. Si une clé fuite, rotation immédiate : régénérer sur OpenAI + recréer la DB Replit.

## 3. Configuration Database Replit

Versi Studio utilise **PostgreSQL 15+** via le driver `pg` (pas Prisma, pas d'ORM). Le PostgreSQL intégré à Replit est obligatoire (règle Replit du framework).

### Provisioning

1. Sidebar gauche du Repl → onglet **Database** (icône cylindre)
2. **Create a database** → choisir **PostgreSQL**
3. Replit provisionne une base managée (~30 s) et injecte automatiquement `DATABASE_URL` dans les Secrets.
4. **Vérification** : retourner sur l'onglet Secrets → `DATABASE_URL` doit apparaître avec une valeur `postgresql://...`.

### Création des tables — AUTOMATIQUE

**Pas de `psql -f schema.sql` à lancer manuellement.** Versi Studio crée les 6 tables au 1er appel runtime via la fonction `ensureDbReady()` dans `src/lib/vs/db.ts`. Séquence :

1. L'utilisateur ouvre `/vs` ou appelle une API `/api/vs/*`
2. Le code appelle `ensureDbReady()` qui exécute `CREATE TABLE IF NOT EXISTS` pour :
   - `vs_projects` (projets immobiliers)
   - `vs_plans` (plans uploadés, extraction IA, `m2_per_pixel`)
   - `vs_lots` (zones validées, `zone_data` JSONB)
   - `vs_rooms` (pièces, `position` JSONB)
   - `vs_photos` (photos par pièce)
   - `vs_visuals` (visuels IA générés, iterations)
3. Index créés : `idx_vs_plans_project`, `idx_vs_lots_project`, `idx_vs_rooms_lot`, `idx_vs_photos_room`, `idx_vs_visuals_photo`, `idx_vs_visuals_status`
4. La fonction est idempotente : `CREATE TABLE IF NOT EXISTS` ne plante pas si les tables existent déjà.

### Vérification manuelle (optionnel)

Après 1er hit sur `/vs`, vérifier dans Shell :
```sh
psql $DATABASE_URL -c "\dt vs_*"
```
Attendu : 6 tables listées (`vs_projects`, `vs_plans`, `vs_lots`, `vs_rooms`, `vs_photos`, `vs_visuals`).

### Pool de connexions

Configuration dans `src/lib/vs/db.ts` (déjà adaptée aux cold starts Replit) :
- `max: 5` connexions simultanées (suffisant pour trafic V1)
- `idleTimeoutMillis: 30_000` (recyclage après 30 s d'inactivité)
- `connectionTimeoutMillis: 10_000` (timeout initial)
- Retry automatique : 3 tentatives avec backoff `1s → 2s → 3s`

### Persistance — protection contre les pertes de données

Risque Replit connu : `DATABASE_URL` peut changer après un redéploiement majeur de l'infra Replit. Protections en place :
- `DATABASE_URL` lue au runtime (`process.env.DATABASE_URL` dans `getPool()`), pas mise en cache au boot
- `ensureDbReady()` appelé à chaque démarrage : recrée les tables si une nouvelle DB est provisionnée
- Backup recommandé (action fondateur) : `pg_dump $DATABASE_URL > backup-$(date +%F).sql` hebdomadaire, stocké hors-Replit (Google Drive, S3, local)

**Storage fichiers (plans PDF, photos, visuels IA)** : le storage Replit est éphémère. Action ouverte documentée en §10 — migration S3/R2 requise avant prod publique.

## 4. Configuration `.replit`

### Contenu à écrire (écraser l'existant)

Le fichier `.replit` à la racine du repo contient actuellement la config des anciens projets (versi-immobilier, port 3001). **Remplacer** intégralement son contenu par :

```toml
run = "cd versi-studio && npm run dev"
entrypoint = "versi-studio/src/app/page.tsx"

[nix]
channel = "stable-24_05"

[env]
NEXT_TELEMETRY_DISABLED = "1"

[[ports]]
localPort = 3000
externalPort = 80

[deployment]
deploymentTarget = "autoscale"
build = ["sh", "-c", "cd versi-studio && npm install && npm run build"]
run = ["sh", "-c", "cd versi-studio && npm start"]
```

### Explications ligne par ligne

| Directive | Rôle |
|---|---|
| `run = "cd versi-studio && npm run dev"` | Commande du bouton **Run** (mode dev, hot-reload). Pour itération rapide pendant setup. |
| `entrypoint = "versi-studio/src/app/page.tsx"` | Fichier ouvert par défaut dans l'éditeur Replit. |
| `[nix] channel = "stable-24_05"` | Version du runtime Nix de Replit. Inclut Node.js 20 (compatible Next.js 16). |
| `NEXT_TELEMETRY_DISABLED = "1"` | Coupe la télémétrie Next.js (pas d'appels réseau sortants non-nécessaires). |
| `localPort = 3000` / `externalPort = 80` | Le serveur Next.js écoute sur 3000 en interne, Replit mappe sur 80 (HTTP public). |
| `deploymentTarget = "autoscale"` | Replit Autoscale : scale à zéro quand inactif, redémarre sur trafic. Adapté au pattern Versi Studio (usage ponctuel par projet immobilier). |
| `build = [...]` | Commande exécutée par Replit Deploy. Install + build production. |
| `run = [...]` | Commande exécutée en production (après build). `npm start` lance `next start` sur port 3000. |

### Alternative : `deploymentTarget = "cloudrun"`

Si Autoscale pose problème (cold starts trop lents sur PDF extraction ~40s), basculer sur `cloudrun` :
```toml
deploymentTarget = "cloudrun"
```
Cloud Run maintient l'instance chaude mais coûte plus (facturation continue vs à l'usage). Décision à prendre après les premiers usages réels.

### Validation

Après modification :
1. Sauvegarder `.replit` (Ctrl+S dans l'éditeur Replit)
2. Cliquer le bouton **Stop** puis **Run** pour prendre en compte la nouvelle config
3. Vérifier dans la Console : `> versi-studio@0.1.0 dev` suivi de `✓ Ready in XXXms`

## 5. Install + Build

### Installation des dépendances

Dans l'onglet **Shell** du Repl :
```sh
cd versi-studio
npm install
```

**Note** : depuis le commit `893340d` (2026-04-16), `zod` a été aligné sur `^3.25.0` pour résoudre le conflit avec `openai@^5.23.0` qui veut `zod@^3`. **`--legacy-peer-deps` n'est donc plus nécessaire**. Le code a été vérifié compatible zod v3 (usage limité à `z.object/enum/number/infer/safeParse`, aucune feature v4-only).

Si jamais un conflit réapparaît (après bump d'une dep), fallback : `npm install --legacy-peer-deps`.

Durée attendue : **~60-90 s** (250+ packages sur cold install Replit).

### Build production

```sh
cd versi-studio
npm run build
```

Attendu :
- Compilation Next.js avec Turbopack
- **20 routes** générées (pages `/vs`, `/vs/projects/[id]/*` + 20 routes API `/api/vs/*`)
- 0 erreur TypeScript, 0 erreur ESLint `src/`
- Durée : **~3-5 s** sur Replit (Next.js 16 + Turbopack très rapide, même en cold)

Sortie attendue (extrait) :
```
✓ Compiled successfully
✓ Generating static pages (X/X)
Route (app)                    Size     First Load JS
┌ ○ /                          ...      ...
├ ○ /vs                        ...      ...
├ ƒ /vs/projects/[id]/upload   ...      ...
├ ƒ /vs/projects/[id]/lots     ...      ...
├ ƒ /vs/projects/[id]/rooms    ...      ...
└ ƒ /vs/projects/[id]/visuals  ...      ...
```

Les routes `ƒ` sont dynamiques (SSR) — normal car elles lisent `DATABASE_URL` au runtime.

### Si le build échoue

Cas connus :
1. **`Cannot find module 'openai'`** ou erreur de résolution → `rm -rf node_modules package-lock.json && npm install` (fallback : `npm install --legacy-peer-deps`)
2. **`OOM` (Out of Memory)** → le plan Replit Free a 512 MB RAM, le build Next.js peut dépasser. Upgrade plan Core (2 GB RAM). Cas rare sur Next.js 16 + Turbopack.
3. **Erreur TypeScript non vue en local** → vérifier la version Node (Replit utilise Node 20 via Nix stable-24_05, local peut différer). Sur Shell : `node -v` doit renvoyer `v20.x`.

## 6. Run (dev + production)

### Mode dev (itération rapide)

Bouton **Run** dans Replit (commande `npm run dev` via `.replit`). Ou manuellement en Shell :
```sh
cd versi-studio
npm run dev
```

Attendu :
```
> versi-studio@0.1.0 dev
> next dev

   ▲ Next.js 16.2.3
   - Local:        http://localhost:3000

 ✓ Ready in 1.2s
```

Accès :
- URL publique : affichée dans le panneau **Webview** de Replit (format `https://[repl-name].[user].repl.co`)
- Auto-reload : modifier un fichier `src/**/*.tsx` → rechargement instantané

Limite mode dev : PAS pour la prod. `npm run dev` désactive les optimisations, consomme plus de RAM, et expose des stack traces. Passer en production dès que le smoke test §8 est OK.

### Mode production (après Deploy)

Quand Thomas clique **Deploy** dans Replit :
1. Replit exécute la commande `build` du `.replit` (§4)
2. Puis lance la commande `run` : `cd versi-studio && npm start`
3. L'app tourne en mode optimisé (SSR + static caching + code minifié)

Attendu :
```
> versi-studio@0.1.0 start
> next start

   ▲ Next.js 16.2.3
   - Local:        http://localhost:3000

 ✓ Ready in 280ms
```

### Bascule dev → prod

Recommandation :
- **Phase 1 setup** : `run = "cd versi-studio && npm run dev"` dans `.replit` (permet itération rapide pendant la config)
- **Phase 2 test** : changer `run = "cd versi-studio && npm start"` et vérifier que les smoke tests §8 passent en prod
- **Phase 3 deploy public** : cliquer **Deploy** dans Replit (utilise la section `[deployment]` du `.replit`)

### Cold start

Replit Autoscale scale à zéro après ~5 min d'inactivité. Au 1er hit après repos :
- Démarrage Node.js : ~500 ms
- `ensureDbReady()` (SELECT + CREATE IF NOT EXISTS) : ~200-500 ms
- Total cold start : **~1-2 s** avant 1re réponse HTTP

Acceptable pour usage interne (Thomas seul). Si usage public étendu, basculer sur `deploymentTarget = "cloudrun"` (voir §4).

## 7. Ports + healthcheck

### Ports

| Contexte | Port interne | Port externe | Protocole |
|---|---|---|---|
| Next.js server | 3000 | 80 (HTTP) → 443 (HTTPS auto Replit) | TCP |
| Debug (optionnel) | 9229 | non exposé | TCP |

Mapping défini dans `.replit` → section `[[ports]]`. Pas de configuration additionnelle requise.

### Healthcheck endpoints

| Endpoint | Méthode | Statut attendu | Vérifie |
|---|---|---|---|
| `GET /api/health` | 200 (healthy) / 503 (degraded) | DB | Connexion PostgreSQL via `SELECT 1` |
| `GET /vs` | 200 | UI | Landing page (pas de DB requise côté client) |
| `GET /api/vs/projects` | 200 (liste) / 503 (DB down) | API + DB | Liste des projets + table `vs_projects` |

### Utilisation

**Healthcheck rapide (CI/CD, monitoring externe)** :
```sh
curl -s -o /dev/null -w "%{http_code}\n" https://[repl].repl.co/api/health
```
- Retour `200` → app + DB OK
- Retour `503` → DB inaccessible, investiguer via logs Replit
- Retour `502` / timeout → app crash ou cold start en cours, retry après 2-3 s

**Healthcheck détaillé (debug)** :
```sh
curl -s https://[repl].repl.co/api/health | jq
```
Exemple réponse healthy :
```json
{
  "status": "healthy",
  "latencyMs": 42,
  "timestamp": "2026-04-16T14:30:00.000Z"
}
```

### Monitoring externe recommandé (gratuit)

- **UptimeRobot** (free tier 50 monitors) : configurer un check HTTP GET sur `/api/health` toutes les 5 min, alerte email si > 2 échecs consécutifs
- **BetterStack** (free tier 10 monitors, alternative) : idem, avec status page publique

Action : à configurer après le 1er déploiement réussi. L'URL du repl (`https://...repl.co`) sera injectée dans `NEXT_PUBLIC_SITE_URL` (Secrets §2) et utilisée par le monitoring.

## 8. Post-deploy smoke tests

À exécuter dans l'ordre après le 1er démarrage réussi. Chaque test doit PASS avant de passer au suivant.

### Test 1 — Healthcheck DB

```sh
curl -s https://[repl].repl.co/api/health
```
**Attendu** : JSON `{"status":"healthy","latencyMs":<100,"timestamp":"..."}` avec HTTP 200.
**Si FAIL** : `DATABASE_URL` mal configuré (§2) ou DB non provisionnée (§3). Vérifier Secrets + onglet Database.

### Test 2 — Landing Versi Studio

Ouvrir dans le navigateur : `https://[repl].repl.co/vs`

**Attendu** :
- Page charge en < 2 s
- Stepper 4 étapes visible (Upload plans → Lots → Pièces → Visuels)
- Bouton "Créer un projet" présent
- Aucune erreur dans la console DevTools (F12)

**Si FAIL** : vérifier logs Console Replit. Erreur probable : `ensureDbReady()` a échoué → DB down.

### Test 3 — Création projet

1. Cliquer "Créer un projet"
2. Remplir : adresse (ex: "12 rue des Lilas, 75012 Paris"), type (immeuble/maison/appartement), surface totale (ex: 180)
3. Valider

**Attendu** :
- POST `/api/vs/projects` → HTTP 200 + réponse JSON avec `id` (UUID)
- Redirect vers `/vs/projects/[id]/upload`
- L'URL contient bien l'UUID généré

**Si FAIL** : erreur probable dans `vs_projects` (contrainte CHECK sur `type_bien` ou `status`). Vérifier logs.

### Test 4 — Upload plan + extraction IA

1. Sur la page Upload, déposer un PDF d'architecte (ou PNG/JPG)
   - Plan de test fourni : demander à Thomas de préparer un PDF simple (un seul étage, pièces étiquetées)
2. Attendre le preview (vignette s'affiche)
3. Cliquer "Lancer l'analyse"

**Attendu** :
- POST `/api/vs/projects/[id]/plans` → HTTP 200 (upload)
- POST `/api/vs/projects/[id]/extract` → HTTP 200 (déclenche GPT-4.1 Vision)
- Durée : **~20-40 s** (appel OpenAI avec image PDF → JSON structuré)
- Redirect vers `/vs/projects/[id]/lots` avec suggestions IA affichées

**Si FAIL** :
- Erreur 401 OpenAI → `OPENAI_API_KEY` invalide ou crédit épuisé
- Erreur 504 timeout → Replit Autoscale a coupé trop tôt. Workaround : rester sur page pendant extraction (garde la connexion active)
- Erreur `pdf-to-img` → dépendance `poppler-utils` manquante. Nix `stable-24_05` devrait l'inclure — sinon ajouter dans `replit.nix` (voir §11).

### Test 5 — Workflow complet (bout en bout)

Enchaîner les 4 étapes :
1. **Upload** : plan déposé + extraction OK (Test 4)
2. **Lots** : valider les zones suggérées par l'IA → POST `/api/vs/projects/[id]/lots/validate` OK
3. **Pièces** : pour chaque lot, confirmer les pièces détectées → POST `/api/vs/lots/[id]/rooms/validate` OK
4. **Visuels** : sur une pièce, déposer une photo + sélectionner un style → POST `/api/vs/rooms/[id]/generate` déclenche génération IA → affichage visuel généré

**Attendu** : workflow de bout en bout sans erreur, projet en statut `completed` dans `vs_projects`.

### Test 6 — E2E Playwright (optionnel, validation @qa)

Sur Shell Replit :
```sh
cd versi-studio
npx playwright install --with-deps chromium
npx playwright test --reporter=list
```

**Attendu** : 91/91 tests PASS.
**Si FAIL** : possible drift de baselines screenshots entre local et Replit (fonts antialiasing différent). Régénérer :
```sh
npx playwright test --update-snapshots
```
Puis re-run, doit PASS. Signaler à @qa pour validation review des nouvelles baselines.

## 9. Monitoring / logs

### Logs en temps réel

- **Console Replit** (onglet Console de la sidebar) : stdout + stderr du serveur Next.js. Rafraîchissement temps réel. Persistance : tant que le Repl tourne + ~24h historique.
- **Logs Deployment** : pour le déploiement production (après bouton Deploy), onglet **Deployments** → sélectionner le déploiement actif → tab Logs.

### Préfixes de logs de l'app

Versi Studio loggue avec des préfixes explicites (grep-friendly) :

| Préfixe | Source | Sévérité typique |
|---|---|---|
| `[vs/db]` | `src/lib/vs/db.ts` | Errors (connexion DB), info (création tables) |
| `[plan-extractor]` | `src/lib/vs/plan-extractor.ts` | Info (début extraction), error (timeout OpenAI) |
| `[visual-generator]` | `src/lib/vs/visual-generator.ts` | Info (appel API), error (rate limit) |

Filtrer via Shell Replit (pendant que l'app tourne) :
```sh
# Exemple : filtrer uniquement les erreurs DB
# Note : les logs Replit sont aussi consultables via l'API CLI, pas de pipe direct
```

### Métriques à surveiller (V1)

| Métrique | Seuil alerte | Source |
|---|---|---|
| `/api/health` status | 503 pendant > 2 min | UptimeRobot |
| Latence `/api/vs/projects` P95 | > 2 s | logs Replit (manuel V1) |
| Durée extraction plan | > 90 s | logs `[plan-extractor]` |
| Durée génération visuel IA | > 60 s par visuel | logs `[visual-generator]` |
| Erreurs 500 | > 5/h | Replit Console (manuel V1) |

### Error tracking (futur)

Sentry recommandé pour V1.1 (non installé en s20). Setup en 10 min :
1. Créer un projet Sentry (free tier 5K events/mois)
2. `npm install @sentry/nextjs`
3. `npx @sentry/wizard@latest -i nextjs`
4. Ajouter `SENTRY_DSN` dans Secrets Replit
5. Commit + redeploy

Priorité : à ajouter avant ouverture multi-utilisateurs. V1 solo-fondateur peut tenir sur logs bruts Replit.

## 10. Dette technique documentée (non-bloquant)

Dette connue au commit `5990c68` (build-ready s20). Aucune n'empêche le 1er déploiement. À adresser en sessions ultérieures.

### D1 — Erreurs ESLint dans `reference-existant/`

- **Fichiers** : `versi-studio/reference-existant/**`
- **Impact** : 2 erreurs ESLint au lint racine du projet. Code NON exécuté (dossier de référence historique).
- **Workaround** : `eslint` configuré via `eslint.config.mjs` — ajouter `reference-existant/**` aux `ignores`. Session s21 ou plus tard.
- **Criticité** : aucune sur runtime ; cosmétique CI/CD uniquement.

### D2 — Baselines visuelles Étape 4 (Visuels) absentes

- **Contexte** : la boucle visuelle @fullstack (gate G26) a produit des baselines screenshots pour Upload, Lots, Pièces. Pas pour Visuels.
- **Raison** : décision @moi s17 "différé par bundle" — priorité sur E2E fonctionnel.
- **Impact** : G26 en GO conditionnel. Pas de régression visuelle détectée automatiquement sur l'écran Visuels.
- **Action** : avant prod publique, @fullstack + @qa doivent générer les baselines via `npx playwright test --update-snapshots` sur l'écran `/vs/projects/[id]/visuals`.

### D3 — F02 Sélecteur multi-photos US-VS-19

- **Contexte** : la user-story "uploader plusieurs photos d'une pièce d'un coup" n'est pas implémentée. Actuellement : upload unitaire.
- **Impact** : UX dégradée sur pièces avec 4+ angles. Thomas doit uploader photo par photo.
- **Action** : ticket à traiter en s21 (estimation : 1 Task @fullstack de 30 min).

### D4 — Storage fichiers éphémère (Replit filesystem)

- **Contexte** : les plans PDF, photos uploadées et visuels IA générés sont stockés en local dans `versi-studio/public/uploads/` (ou équivalent). Replit peut reset ce storage en cas de migration d'infra.
- **Impact** : risque de perte de fichiers sur événement Replit (rare mais documenté).
- **Action** : avant prod publique, migrer sur storage externe (Cloudflare R2 = gratuit jusqu'à 10 GB, S3-compatible). Endpoint `/api/vs/files` à adapter pour upload direct R2 via presigned URL.
- **Priorité** : avant ouverture multi-utilisateurs.

### D5 — Pas de rate limiting sur les API

- **Contexte** : les routes `/api/vs/*` n'ont pas de rate limiting. Un utilisateur peut théoriquement boucler sur `/api/vs/rooms/[id]/generate` et épuiser les crédits OpenAI.
- **Impact** : V1 solo-fondateur = risque nul (seul Thomas utilise). Multi-user = critique.
- **Action** : avant ouverture, ajouter middleware rate-limit (ex: `@upstash/ratelimit` + Redis Replit, ou simple Map en mémoire si solo).

### D6 — Pas de CSP headers

- **Contexte** : aucun Content-Security-Policy configuré. Images IA chargées depuis OpenAI blob URLs — à whitelister.
- **Action** : ajouter `headers()` dans `next.config.ts` avant prod publique. Checklist sécurité à produire par @infrastructure en s21.

### D7 — Pas de backup automatisé PostgreSQL

- **Contexte** : pas de `pg_dump` cron. Replit fait des snapshots infra (non accessibles utilisateur).
- **Action** : script `pg_dump $DATABASE_URL > /tmp/backup.sql && upload vers Google Drive` déclenché hebdo. Non bloquant pour V1 solo.

## 11. Troubleshooting

### Build / install

**Symptôme** : `npm install` échoue avec `ERESOLVE could not resolve`
**Cause** : conflit zod 3 vs zod 4 entre peer-deps (corrigé depuis commit `893340d` — zod aligné sur ^3.25)
**Solution** : si le conflit réapparaît après bump de dep, fallback `npm install --legacy-peer-deps`.

**Symptôme** : `Cannot find module 'openai'` au build
**Cause** : node_modules corrompu ou install incomplet
**Solution** :
```sh
cd versi-studio
rm -rf node_modules package-lock.json
npm install
```

**Symptôme** : build échoue avec `Type error: ...`
**Cause** : version Node différente entre local et Replit
**Solution** : vérifier `node -v` (doit être v20.x). Si autre version → mettre à jour `.replit` `[nix] channel = "stable-24_05"` et rebuild.

### Runtime

**Symptôme** : `Error: DATABASE_URL manquante. Configurez-la dans les Replit Secrets.`
**Cause** : Secret DATABASE_URL absent ou Repl redémarré avant injection
**Solution** :
1. Onglet Secrets → vérifier que `DATABASE_URL` est présent
2. Si absent → onglet Database → Create a database (§3)
3. Redémarrer le Repl (Stop puis Run)

**Symptôme** : `/api/health` retourne 503 `status: degraded`
**Cause** : DB inaccessible (pool épuisé, cold start, DATABASE_URL changé après redeploy)
**Solution** :
1. Vérifier logs `[vs/db]` dans Console Replit
2. Si `ECONNREFUSED` → attendre 10-20 s et retry (Postgres Replit cold start)
3. Si persistant → Stop + Run du Repl pour recréer le pool

**Symptôme** : Extraction plan plante avec erreur OpenAI 401
**Cause** : `OPENAI_API_KEY` invalide ou crédit épuisé
**Solution** :
1. platform.openai.com → Usage → vérifier crédit restant
2. Si crédit OK → régénérer la clé et mettre à jour le Secret
3. Redémarrer le Repl

**Symptôme** : Extraction plan timeout à 40 s
**Cause** : GPT-4.1 Vision prend plus de temps sur les PDF complexes (>5 pages)
**Solution** : acceptable jusqu'à 60 s. Si > 90 s → simplifier le PDF (1 étage à la fois) ou upgrade en GPT-4.1 turbo (modifier `src/lib/vs/plan-extractor.ts`).

**Symptôme** : `pdf-to-img` erreur "poppler not found"
**Cause** : binaire `pdftoppm` absent du runtime Nix
**Solution** : créer un fichier `replit.nix` à la racine :
```nix
{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.poppler_utils
  ];
}
```
Puis redémarrer le Repl. Le runtime Nix recharge les packages.

### Réseau / ports

**Symptôme** : Erreur `EADDRINUSE: address already in use :::3000`
**Cause** : Un process Next.js tourne déjà (souvent après crash)
**Solution** :
```sh
pkill -9 node
cd versi-studio && npm start
```

**Symptôme** : URL publique retourne 502 Bad Gateway
**Cause** : Next.js n'a pas fini de démarrer ou a crashé
**Solution** :
1. Vérifier Console : message `✓ Ready in XXXms` présent ?
2. Si non → lire les erreurs au-dessus
3. Si oui → wait 5 s (cold start mapping port) puis retry

### E2E

**Symptôme** : Playwright screenshots divergent > 0.5% de la baseline
**Cause** : fonts antialiasing Replit vs local
**Solution** :
```sh
npx playwright test --update-snapshots
```
Puis commit les nouvelles baselines dans `tests/screenshots/`. Reviewer humain avant prod.

**Symptôme** : `npx playwright install` échoue
**Cause** : dépendances système manquantes pour Chromium
**Solution** : `npx playwright install --with-deps chromium` (force install deps système via apt si disponible, sinon ajouter à replit.nix).

## 12. Checklist de validation 1er déploiement

À cocher dans l'ordre. Si un item FAIL → se reporter à §11 Troubleshooting avant de continuer.

### Phase A — Setup projet

- [ ] Repo `thomasissa-png/Versi` importé sur Replit
- [ ] Branche active : `claude/versi-s21-clustering-polygones-ia`
- [ ] Fichier `.replit` remplacé par la config §4
- [ ] Fichier `.replit` sauvegardé (Ctrl+S)

### Phase B — Configuration

- [ ] PostgreSQL créé via onglet Database (§3)
- [ ] `DATABASE_URL` visible dans Secrets
- [ ] `OPENAI_API_KEY` ajouté dans Secrets (valeur depuis platform.openai.com)
- [ ] Vérification Shell : `echo ${DATABASE_URL:0:30}` commence par `postgresql://`

### Phase C — Build

- [ ] `cd versi-studio && npm install` PASS (60-90 s)
- [ ] `cd versi-studio && npm run build` PASS (0 erreur, 20 routes)
- [ ] `cd versi-studio && npm run dev` démarre sans erreur

### Phase D — Smoke tests

- [ ] Test 1 : `GET /api/health` → 200 `status: healthy`
- [ ] Test 2 : `GET /vs` → landing stepper 4 étapes visible
- [ ] Test 3 : création projet → POST `/api/vs/projects` → 200 + redirect upload
- [ ] Test 4 : upload plan + extraction IA → 20-40 s → redirect lots avec suggestions
- [ ] Test 5 : workflow complet 4 étapes → projet en statut `completed`
- [ ] Test 6 (optionnel) : `npx playwright test` → 91/91 PASS

### Phase E — Production deploy

- [ ] Dans `.replit`, changer `run = "cd versi-studio && npm run dev"` → `run = "cd versi-studio && npm start"`
- [ ] Tester en mode prod : bouton Stop + Run
- [ ] Ré-exécuter Test 1 + Test 2 en mode prod
- [ ] Cliquer **Deploy** dans Replit → attendre build + start
- [ ] URL publique (`https://[repl-name].[user].repl.co`) affiche la landing

### Phase F — Observabilité (optionnel mais recommandé)

- [ ] UptimeRobot configuré sur `/api/health`, alerte email
- [ ] `NEXT_PUBLIC_SITE_URL` renseigné avec l'URL publique finale
- [ ] Backup manuel DB : `pg_dump $DATABASE_URL > backup-$(date +%F).sql` stocké hors-Replit

### Phase G — Documentation post-deploy

- [ ] Dans `project-context.md`, mettre à jour la section "Environnement" avec l'URL publique Replit
- [ ] Dans `project-context.md`, cocher "V1 déployée" dans la roadmap

---

**Critère GO 1er déploiement** : Phases A à D cochées intégralement. Phases E à G peuvent suivre dans les heures qui suivent.

## 13. Ressources

### Repo + branche

- **Repo GitHub** : https://github.com/thomasissa-png/Versi
- **Branche build-ready s20** : `claude/versi-s21-clustering-polygones-ia`
- **Commit de référence** : `5990c68`
- **Sous-dossier à déployer** : `versi-studio/`

### Stack technique (package.json confirmé)

| Package | Version | Rôle |
|---|---|---|
| `next` | 16.2.3 | Framework React App Router |
| `react` / `react-dom` | 19.2.4 | UI |
| `openai` | ^5.23.0 | SDK GPT-4.1 Vision (extraction plan) + Image gen (visuels IA) |
| `pg` | ^8.20.0 | Driver PostgreSQL (pas d'ORM) |
| `pdf-to-img` | ^6.0.0 | Conversion PDF → PNG avant envoi OpenAI Vision |
| `uuid` | ^13.0.0 | Génération IDs côté serveur |
| `zod` | ^4.0.0 | Validation schéma runtime |
| `tailwindcss` | ^4 | Styling (Tailwind v4 via `@tailwindcss/postcss`) |
| `typescript` | ^5 | Mode strict |
| `@playwright/test` | ^1.59.1 | E2E (91 tests au commit 5990c68) |

### Documentation externe

- **Next.js 16** : https://nextjs.org/docs (App Router, Server Components)
- **Replit Deployments** : https://docs.replit.com/category/deployments
- **Replit PostgreSQL** : https://docs.replit.com/tutorials/javascript/storage-database-nodejs
- **Replit Nix config** : https://docs.replit.com/programming-ide/nix-on-replit
- **Tailwind v4** : https://tailwindcss.com/docs/v4-beta
- **OpenAI Vision API** : https://platform.openai.com/docs/guides/vision

### Documentation interne

- `/home/user/Versi/project-context.md` — contexte projet global
- `/home/user/Versi/docs/infra/deployment-checklist.md` — checklist générique (ce guide la spécialise pour Replit)
- `/home/user/Versi/docs/qa/qa-strategy.md` — stratégie E2E Playwright
- `/home/user/Versi/docs/ia/ai-architecture.md` — architecture IA (plan-extractor + visual-generator)
- `/home/user/Versi/docs/product/execution-plan.md` — plan d'exécution s20 et roadmap

### Contacts / escalades

- Bug bloquant déploiement → relancer `@infrastructure` via Claude Code
- Bug code (DB, API, UI) → relancer `@fullstack`
- Bug E2E / qualité → relancer `@qa`
- Décision produit / priorisation → `@moi` (proxy Thomas)

---

## Handoff

- → @orchestrator : guide Replit complet, Thomas peut déployer
- → Thomas : suivre la checklist §12 dans l'ordre
- → @qa : post-déploiement, re-run E2E Playwright (91/91 attendus)
- → @fullstack : si problème DB détecté (`ensureDbReady` FAIL), 1 Task correction possible
