# Checklist de deploiement Replit -- Versi

> Derniere mise a jour : 2026-04-11
> Auteur : @infrastructure

---

## Architecture de deploiement

### Topologie

Un seul process Express (versi-immobilier/server.js) sert les deux sites depuis Replit Autoscale.
Replit Autoscale n'expose qu'un seul port par deploiement.

| Site | Domaine | Chemin servi | Mecanisme |
|---|---|---|---|
| versi-immobilier.fr | versi-immobilier.fr | `/` (defaut) | `express.static('dist')` + SPA fallback |
| versi.fr | versi.fr | Via reverse proxy hostname | `express.static('../src/dist')` conditionnel sur `req.hostname` |

### Flow de build

```
.replit build command
  |
  +-- cd src && npm install && npm run build
  |     \--> produit src/dist/ (React/Vite SPA)
  |
  +-- cd versi-immobilier && npm install && npm run build
  |     \--> produit versi-immobilier/dist/ (React/Vite SPA)
  |
  (les deux dist/ sont presents avant le start)
```

### Flow de demarrage

```
.replit run command = npm start
  |
  +-- (racine) package.json: "start" = "cd versi-immobilier && node scripts/init-db.js && node server.js"
        |
        +-- init-db.js : cree les tables si elles n'existent pas (idempotent)
        +-- server.js : Express sur PORT (defaut 3001)
              |
              +-- Middleware hostname routing (fonction isVersiFr()) :
              |     Si hostname contient "versi-immobilier" --> sert versi-immobilier/dist/
              |     Si hostname contient "versi.fr" ou "versi-fr" --> sert src/dist/
              |     Sinon (localhost, Replit preview, etc.) --> sert versi-immobilier/dist/ (defaut)
              |
              +-- API routes /api/* (contact, sell, biens, admin, blog)
              +-- SPA fallback par hostname
```

---

## Corrections appliquees

### 1. Build command (.replit) -- npm install manquant pour versi-immobilier

**Probleme** : le build Replit faisait `cd src && npm install && npm run build && cd ../versi-immobilier && npm run build` -- le `npm install` pour versi-immobilier etait absent du build command (seul le postinstall racine l'installait, mais le build Replit ne lance pas forcement npm install racine avant).

**Correction** : ajout de `npm install` dans la step versi-immobilier du build command.

### 2. Serveur multi-site (versi-immobilier/server.js) -- versi.fr non servi

**Probleme** : le serveur versi-immobilier ne servait que `versi-immobilier/dist/`. Le site versi.fr (`src/dist/`) n'etait accessible que via son propre serveur `src/server.js` sur un port different -- impossible sur Replit Autoscale (un seul port).

**Correction** : ajout d'un routing par hostname dans server.js. Le serveur detecte le hostname de la requete et sert le bon dossier `dist/`.

### 3. Init-db automatique au demarrage

**Probleme** : `scripts/init-db.js` devait etre lance manuellement. Si la DB Replit est reinitialisee apres un redeploy, les tables disparaissent.

**Correction** : le script `npm start` de versi-immobilier execute `init-db.js` avant de lancer le serveur.

### 4. Endpoint /api/health manquant

**Probleme** : aucun health check pour verifier l'etat du serveur et de la base de donnees.

**Correction** : ajout de `GET /api/health` qui verifie la connexion DB et retourne un statut degrade si indisponible.

### 5. .env.example incomplet

**Probleme** : les variables DATABASE_URL, ADMIN_PASSWORD, PORT, SITE_URL n'etaient pas documentees.

**Correction** : mise a jour de `.env.example` avec toutes les variables necessaires.

### 6. Handler /api/contact multi-site

**Probleme** : versi.fr et versi-immobilier.fr ont des formulaires de contact avec des champs differents (versi.fr : nom, email, telephone optionnel, message / versi-immobilier : prenom, nom, email, telephone, objet, message). Avec le serveur unifie, le meme handler recoit les requetes des deux sites.

**Correction** : le handler `/api/contact` detecte le hostname et adapte la validation et le formatage de l'email. Les emails sont envoyes a des adresses differentes selon le site source (CONTACT_EMAIL pour versi-immobilier, CONTACT_EMAIL_VERSI pour versi.fr).

### 8. CSP header bloquait Umami Analytics

**Probleme** : le Content-Security-Policy dans server.js avait `script-src 'self'` sans autoriser `cloud.umami.is`. Le script Umami etait bloque par le navigateur.

**Correction** : ajout de `https://cloud.umami.is` dans `script-src` et `connect-src` du CSP.

### 7. init-db.js -- gestion d'erreur amelioree

**Probleme** : si DATABASE_URL est absente ou la connexion echoue, `pool.connect()` leve une exception non capturee (hors du try/catch).

**Correction** : verification explicite de DATABASE_URL avant la connexion, et `pool.connect()` place dans le bloc try/catch.

---

## Variables d'environnement (Replit Secrets)

Toutes ces variables doivent etre configurees dans Replit Secrets (jamais dans .env ou en dur) :

| Variable | Obligatoire | Description |
|---|---|---|
| DATABASE_URL | Oui | URL de connexion PostgreSQL Replit (fournie automatiquement par Replit quand PostgreSQL est provisionne) |
| ADMIN_PASSWORD | Oui | Mot de passe admin pour le backoffice versi-immobilier |
| RESEND_API_KEY | Oui | Cle API Resend pour l'envoi d'emails transactionnels |
| FROM_EMAIL | Non | Adresse expeditrice (defaut: formulaire@versi-immobilier.fr) |
| CONTACT_EMAIL | Non | Adresse de reception des formulaires versi-immobilier (defaut: contact@versi-immobilier.fr) |
| CONTACT_EMAIL_VERSI | Non | Adresse de reception des formulaires versi.fr holding (defaut: contact@versi.fr) |
| PORT | Non | Port du serveur (defaut: 3001, Replit injecte automatiquement) |
| SITE_URL | Non | URL publique du site (defaut: https://versi-immobilier.fr) |

**ATTENTION** : DATABASE_URL peut changer apres un redeploy Replit. Le code lit `process.env.DATABASE_URL` au runtime via le pool pg -- jamais mis en cache au boot. OK.

---

## Limites Replit connues

| Limite | Impact | Workaround |
|---|---|---|
| Cold starts (Autoscale) | Premiere requete apres inactivite = 2-5s de latence | Le health check permet au monitoring externe de garder le serveur chaud |
| Un seul port expose | Impossible de lancer 2 serveurs independants | Routing multi-site par hostname dans un seul serveur Express |
| Storage ephemere | Les fichiers ecrits sur le filesystem disparaissent apres redeploy | Les photos sont stockees en base (data TEXT base64) -- OK mais a migrer vers S3/R2 a terme |
| Pas de cron natif | Les setInterval dans server.js fonctionnent tant que le process tourne | Pour les taches critiques (backup), utiliser un cron externe (GitHub Actions, cron-job.org) |
| Memoire limitee | ~512 Mo sur le plan gratuit, 2-4 Go sur les plans payes | Les photos base64 en DB consomment beaucoup de memoire lors des requetes -- surveiller |
| DB peut etre reinitialisee | Apres certaines mises a jour Replit | init-db.js idempotent au demarrage -- recree les tables si absentes |

---

## Procedure de deploiement

### Premier deploiement

1. Provisionner PostgreSQL depuis le dashboard Replit
2. Configurer toutes les variables dans Replit Secrets (voir tableau ci-dessus)
3. Cliquer "Deploy" dans Replit -- le build command s'execute automatiquement
4. Verifier `/api/health` retourne `{ "status": "ok" }`
5. Configurer les domaines custom (versi.fr et versi-immobilier.fr) dans Replit

### Redeploiement

1. Push le code sur GitHub (ou edition directe dans Replit)
2. Replit rebuild automatiquement (build command dans .replit)
3. Verifier `/api/health` apres le redeploy
4. Si `/api/health` retourne `"degraded"` : verifier que DATABASE_URL est toujours valide dans Replit Secrets

### Rollback

1. Dans Replit : "Deployments" > selectionner un deployment precedent
2. Ou : `git revert` du commit problematique + redeploy

---

## Monitoring post-deploiement

| Check | Outil | Seuil |
|---|---|---|
| Uptime | BetterStack ou UptimeRobot (gratuit) | Alerte si downtime > 1 min |
| Health check | GET /api/health toutes les 60s | status != "ok" => alerte |
| Error tracking | Sentry free tier (5K events/mois) ou console.error structure | error rate > 1% => alerte |

---

## Backup base de donnees

**Strategie recommandee** : pg_dump via GitHub Actions cron (quotidien), stocke dans un bucket S3/R2 ou en artifact GitHub.

**RTO** : < 1h (restauration depuis le dernier backup + init-db.js)
**RPO** : < 24h (backup quotidien)

A implementer : un workflow GitHub Actions avec `pg_dump` schedule daily.
