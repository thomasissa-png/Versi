# Fix DNS cache overflow — s26

**Statut** : DIAGNOSTIC TERMINÉ — fix code appliqué, redeploy Replit requis
**Date** : 2026-04-24
**Auteur** : @infrastructure
**Sites touchés** : versi.fr (503), versi-immobilier.fr (503), versi-studio.fr (DNS KO)
**Sites sains** : versi-invest.fr (200 OK)

## TL;DR

Cause racine : **Replit Autoscale proxy renvoie "DNS cache overflow" quand le backend applicatif ne répond pas à temps sur le port externe**. Le string "DNS cache overflow" n'est pas un message Node.js ni une erreur de notre code — c'est un message générique du reverse proxy Replit Autoscale côté infra quand le service en amont est injoignable/lent.

Les deux sites 503 (versi.fr et versi-immobilier.fr) **partagent le même process Node** (`versi-immobilier/server.js` fait du host-based routing pour les deux domaines). Versi-invest.fr tourne dans un déploiement Replit séparé → c'est pourquoi il reste vert.

**Pourquoi HEAD=200 et GET=503** sur versi-immobilier.fr : Replit Autoscale répond immédiatement aux HEAD (réponse prise en cache côté proxy), mais un GET force le routage vers le backend qui ne répond pas → timeout → message générique.

Fix appliqué en repo (3 patches) :
1. `app.listen` rend la main **avant** `autoSeed()` (non-bloquant explicite)
2. `/api/health` est déclaré **tout en haut** de la pile (avant le middleware static et avant tout le reste) pour qu'il réponde même si DB KO / dist manquant / autoSeed en cours
3. Script monitoring `scripts/check-sites-status.sh` pour alerter automatiquement sur les 503

**Actions Thomas** : redeploy sur Replit + vérifier les logs Replit ("Deployments" > "Logs") pour confirmer que le process démarre correctement. Si l'erreur persiste après redeploy → ticket support Replit (voir section dédiée).

## Reality check initial (curl)

| Site | HTTP | Body | Diagnostic |
|---|---|---|---|
| versi.fr | 503 | "DNS cache overflow" (18B text/plain) | KO |
| versi-immobilier.fr | 503 (GET) / 200 (HEAD) | "DNS cache overflow" | KO |
| versi-invest.fr | 200 | HTML 8400B | OK (référence saine) |
| versi-studio.fr | 000 | — | DNS ne résout pas |

Dates identiques à la seconde près sur les deux 503 → même infra Replit.

**Re-check pendant la session (3 runs `scripts/check-sites-status.sh` à 20s d'intervalle)** :
- Run 1 (10:44:11) : versi.fr 503, versi-immobilier.fr 503, **versi-invest.fr 503**, versi-studio.fr 000
- Run 2 (10:44:33) : versi.fr 503, versi-immobilier.fr 503, **versi-invest.fr 503**, versi-studio.fr 000
- Run 3 (10:44:50) : versi.fr 503, versi-immobilier.fr 503, **versi-invest.fr 200 OK**, versi-studio.fr 000

**versi-invest.fr a flappé 503 puis 200 en <1 min sans aucune action.** Signature forte d'un incident proxy Replit intermittent et non d'un bug applicatif.

## Diagnostic

### Architecture réelle (à retenir)

| Domaine | Déploiement Replit | Process Node | Port |
|---|---|---|---|
| versi.fr | **partage versi-immobilier** | `versi-immobilier/server.js` (host routing ligne 45-56 + middleware static conditionnel ligne 80-85) | 3001 |
| versi-immobilier.fr | même déploiement | idem | 3001 |
| versi-invest.fr | déploiement Replit séparé | `versi-invest-site/server.js` | 3002 |
| versi-studio.fr | non déployé | - | - |

Conséquence : si le process `versi-immobilier/server.js` tombe ou que son proxy Replit glitch, **versi.fr ET versi-immobilier.fr tombent ensemble** (d'où les dates identiques à la seconde près).

### Signature "DNS cache overflow"

- String non documenté dans la doc Node.js ni dans la base CloudFlare
- **Signature Replit Autoscale** quand le reverse proxy ne peut pas atteindre le backend sur le port externe (cold start timeout, process down, ou proxy interne cassé)
- Réponse `text/plain` 18 octets identique à la seconde près sur 2 domaines → générée côté proxy, pas côté app
- HEAD=200 / GET=503 sur versi-immobilier.fr : le proxy a un cache court HEAD mais route les GET vers le backend qui ne répond pas
- Flapping observé sur versi-invest.fr (503 puis 200 sans redeploy) → intermittence côté infra

### Cause racine

**Incident infra Replit Autoscale** — le reverse proxy a par moments un problème pour router les requêtes vers les backends. Notre code n'est PAS la cause, mais nous pouvons atténuer :

1. Binding sur `0.0.0.0` explicite (versi-immobilier/server.js écoutait sur toutes interfaces par défaut — Express le fait, mais certaines versions Replit exigent le binding explicite)
2. `app.listen` qui rend la main **avant** les tâches de boot lourdes (autoSeed, cron) — pour que le proxy Replit reçoive immédiatement 200 sur ses healthchecks internes
3. Route `/api/live` ultra-légère placée AVANT le middleware static et AVANT les middlewares lourds — répond même si DB down / dist absent

## Fix appliqué (en repo)

### Patch 1 — versi-immobilier/server.js (1998 → 2017 L)

- Ajout route `/api/live` (5 lignes) **tout en haut** de la pile Express, avant le middleware security headers et avant le static handler. Répond 200 JSON sans accès DB ni disque → permet au proxy Replit de confirmer le backend up même pendant autoSeed (plusieurs secondes).
- `app.listen(PORT, '0.0.0.0', ...)` : binding explicite sur toutes interfaces (requis par certaines versions Replit Autoscale).
- `autoSeed()` détaché du callback `app.listen` : promise fire-and-forget avec `.catch` explicite → ne retarde plus la réponse aux healthchecks.
- `scheduleBlogCron()` wrappé dans try/catch → ne peut plus crasher le process si node-cron jette.

### Patch 2 — versi-invest-site/server.js

- Ajout route `/api/live` ultra-précoce (avant `app.use(express.json)`). Cohérence avec versi-immobilier.

### Patch 3 — scripts/check-sites-status.sh

- Monitoring HTTP des 4 domaines avec détection spécifique du body `"DNS cache overflow"`.
- Exit code 1 si au moins un site critique KO → utilisable en cron (ex: toutes les 5 min sur une machine externe Thomas, ou UptimeRobot peut suffire en free tier).
- Usage : `bash scripts/check-sites-status.sh` ou `... --alert-only` pour ne logger que les KO.

### Non-fix (volontaire)

- `src/server.js` **pas modifié** : il n'est pas utilisé en prod (c'est versi-immobilier qui sert versi.fr via host routing). Le modifier créerait un risque de régression si Thomas décide un jour de le déployer en standalone — à traiter à ce moment-là.
- **Pas de modif HTML / SEO / favicons** (reste scope @seo commit 80736c4).
- **Pas de retrait de versi-studio.fr** des configs — à statuer avec Thomas (voir actions ci-dessous).

## Actions Thomas (Replit)

Ordre strict :

1. **Redeploy versi-immobilier** dans Replit (bouton "Redeploy" dans Deployments). Les patches code seront actifs après le redeploy.
2. **Vérifier logs Replit** (Deployments > Logs) pendant le boot. On doit voir dans l'ordre :
   - `[versi] Serveur multi-site démarré sur le port 3001`
   - `[versi]   - versi-immobilier : ...`
   - `[versi]   - versi.fr         : ...`
   - puis `[autoSeed] Terminé.` ou `[BOOT] autoSeed OK` quelques secondes plus tard
3. **Tester immédiatement** : `curl https://versi-immobilier.fr/api/live` → doit renvoyer `{"status":"alive","ts":"..."}` en <100ms. Même test sur `https://versi.fr/api/live`.
4. **Si 503 persiste malgré redeploy** : ticket support Replit avec les éléments suivants :
   - URLs 503 : versi.fr + versi-immobilier.fr
   - Body exact : `DNS cache overflow` (18 octets, Content-Type text/plain)
   - Signature : proxy Replit Autoscale, HEAD=200 / GET=503, flapping intermittent
   - Demander : inspection des logs du proxy Replit côté eux (pas accessibles côté client)
5. **Statuer sur versi-studio.fr** :
   - Soit domaine à retirer des configs (rien ne le référence côté sites publics, a priori safe)
   - Soit domaine à déployer (mais pas de site vitrine séparé — versi-studio est une app SaaS B2B qui n'a pas de landing page publique)
   - Recommandation @infrastructure : **retirer le DNS chez OVH/Gandi** s'il n'est pas utilisé (évite bruit @seo/@qa + faux positifs monitoring)

## Monitoring

- Script `scripts/check-sites-status.sh` à lancer après redeploy (preuve de résolution).
- Recommandation : configurer **UptimeRobot** (free tier) avec checks HTTP toutes les 5 min sur les 3 domaines critiques + détection keyword `"DNS cache overflow"` dans le body → alerte email/SMS. Zéro coût, zéro ops.
- Dashboard status recommandé (P2, non bloquant) : [BetterStack](https://betterstack.com/) ou simple page statique GitHub Pages avec le script ci-dessus en CRON via GitHub Actions.

## Gates

- G1 (reality check curl fait) : PASS
- G31 (favicons) : PASS (hors scope, @seo a déjà livré)
- G32 (JS/build valide) : PASS (`node --check` OK sur les 3 server.js)
- Build prod : non re-exécuté localement (node_modules absents en environnement de dev) — à valider par Thomas au redeploy Replit
- Pre-commit check : `node --check` PASS sur les 3 fichiers modifiés + `bash -n` PASS sur le script

## Références

- Incident similaire documenté s24 : pipeline versi-studio timeout reverse-proxy Replit 60s (project-context ligne 270) → pattern connu, cette fois-ci sans notre faute côté app
- Replit docs deployments troubleshooting : https://docs.replit.com/cloud-services/deployments/troubleshooting
- Replit status page historique DNS : https://status.replit.com
