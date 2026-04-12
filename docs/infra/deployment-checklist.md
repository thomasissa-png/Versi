# Checklist de deploiement Replit -- Versi

> Derniere mise a jour : 2026-04-12 (v2 — CSP corrige, sections email/analytics/securite/performance ajoutees)
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

### 9. CSP incomplet -- Google Fonts et CDN Fonts bloques

**Probleme** : le Content-Security-Policy autorisait `script-src` et `connect-src` pour cloud.umami.is, mais pas les domaines de polices. Les deux sites chargent PP Neue Montreal depuis `fonts.cdnfonts.com` et DM Sans depuis `fonts.googleapis.com` / `fonts.gstatic.com`. Le navigateur bloquait silencieusement le chargement des polices.

**Correction** : ajout de `https://fonts.cdnfonts.com` et `https://fonts.googleapis.com` dans `style-src`, et `https://fonts.cdnfonts.com` et `https://fonts.gstatic.com` dans `font-src`.

CSP final :
```
default-src 'self';
img-src 'self' data:;
style-src 'self' 'unsafe-inline' https://fonts.cdnfonts.com https://fonts.googleapis.com;
font-src 'self' https://fonts.cdnfonts.com https://fonts.gstatic.com;
script-src 'self' https://cloud.umami.is;
connect-src 'self' https://cloud.umami.is;
frame-ancestors 'none';
```

---

## Configuration DNS

Les deux domaines doivent pointer vers le deploiement Replit Autoscale. Replit fournit un domaine interne (ex: `versi.repl.app`) qui sert de cible pour les enregistrements DNS.

### Etapes de configuration

1. Dans Replit : aller dans "Deployments" > "Custom Domains"
2. Ajouter `versi.fr` et `versi-immobilier.fr`
3. Replit genere les instructions DNS specifiques (CNAME target)

### Enregistrements DNS requis

Configurer chez le registrar des deux domaines :

**versi.fr**

| Type | Nom | Valeur | TTL |
|---|---|---|---|
| CNAME | www | [cible fournie par Replit, ex: versi.repl.app] | 3600 |
| A ou ALIAS | @ | [IP ou ALIAS fourni par Replit pour apex domain] | 3600 |

**versi-immobilier.fr**

| Type | Nom | Valeur | TTL |
|---|---|---|---|
| CNAME | www | [cible fournie par Replit, ex: versi.repl.app] | 3600 |
| A ou ALIAS | @ | [IP ou ALIAS fourni par Replit pour apex domain] | 3600 |

**Attention domaines apex (@)** : Replit Autoscale utilise un load balancer. Les CNAME ne fonctionnent pas sur les apex domains (versi.fr sans www). Deux solutions :
- Si le registrar supporte ALIAS/ANAME (Cloudflare, Route53) : utiliser un enregistrement ALIAS vers la cible Replit
- Sinon : rediriger @ vers www via le registrar, et configurer le CNAME sur www uniquement

**Verification** : apres propagation DNS (quelques minutes a 48h), tester :
- `curl -I https://versi.fr` → doit retourner HTTP 200 avec le contenu versi.fr
- `curl -I https://versi-immobilier.fr` → doit retourner HTTP 200 avec le contenu versi-immobilier

**HTTPS** : Replit Autoscale fournit automatiquement un certificat TLS (Let's Encrypt) pour les custom domains. Aucune configuration supplementaire.

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

### Premier deploiement (checklist pas-a-pas)

**Phase 1 : Prerequis**

- [ ] Compte Replit actif avec plan supportant Autoscale (Core ou Teams)
- [ ] Repository GitHub connecte a Replit
- [ ] Domaines versi.fr et versi-immobilier.fr achetes et accessibles chez le registrar
- [ ] Compte Resend cree avec domaines verifies (versi.fr et versi-immobilier.fr)
- [ ] Compte Umami Cloud cree (cloud.umami.is) avec les deux sites ajoutes

**Phase 2 : PostgreSQL Replit**

- [ ] Depuis le dashboard Replit : onglet "Database" > "Create a PostgreSQL database"
- [ ] Replit injecte automatiquement DATABASE_URL dans les Secrets — verifier sa presence
- [ ] Tester la connexion : dans le shell Replit, `node -e "const pg=require('pg');const p=new pg.Pool({connectionString:process.env.DATABASE_URL});p.query('SELECT 1').then(()=>console.log('OK')).catch(e=>console.error(e)).finally(()=>p.end())"`

**Phase 3 : Replit Secrets**

Configurer toutes les variables obligatoires (voir tableau "Variables d'environnement" ci-dessus) :

- [ ] DATABASE_URL — fournie automatiquement par Replit (verifier qu'elle est presente)
- [ ] ADMIN_PASSWORD — mot de passe fort (min 16 caracteres, melange alpha/num/special)
- [ ] RESEND_API_KEY — cle API Resend (re_xxxxxxxxxx)
- [ ] FROM_EMAIL — adresse expeditrice (domaine verifie dans Resend)
- [ ] CONTACT_EMAIL — adresse de reception versi-immobilier
- [ ] CONTACT_EMAIL_VERSI — adresse de reception versi.fr

**Phase 4 : Deploy**

- [ ] Verifier que `.replit` est present a la racine avec deploymentTarget = "autoscale"
- [ ] Dans Replit : cliquer "Deploy" > choisir "Autoscale"
- [ ] Le build command s'execute automatiquement (construit les deux sites)
- [ ] Si le build echoue : verifier les logs de build dans Replit. Causes frequentes : npm install timeout, erreur Vite build
- [ ] Au demarrage : init-db.js cree les tables PostgreSQL automatiquement

**Phase 5 : Verification post-deploy**

- [ ] `GET /api/health` retourne `{ "status": "ok" }` avec database.status = "ok"
- [ ] Acceder au domaine Replit par defaut (*.repl.app) — versi-immobilier s'affiche (comportement par defaut)
- [ ] Tester les pages principales : accueil, biens, realisations, blog, contact
- [ ] Tester le formulaire de contact — verifier reception de l'email
- [ ] Tester le formulaire "Vendre un bien" — verifier reception
- [ ] Acceder a /admin — se connecter avec ADMIN_PASSWORD
- [ ] Creer un bien de test via l'admin, verifier qu'il apparait en public

**Phase 6 : Custom domains**

- [ ] Configurer les DNS (voir section "Configuration DNS" ci-dessus)
- [ ] Dans Replit : "Deployments" > "Custom Domains" > ajouter versi.fr
- [ ] Dans Replit : "Deployments" > "Custom Domains" > ajouter versi-immobilier.fr
- [ ] Attendre la propagation DNS et la generation du certificat TLS
- [ ] Tester : `https://versi.fr` affiche le site holding
- [ ] Tester : `https://versi-immobilier.fr` affiche le site marchand de biens
- [ ] Tester : `https://versi-immobilier.fr/api/health` retourne status "ok"

**Phase 7 : Monitoring**

- [ ] Configurer UptimeRobot ou BetterStack : endpoint `https://versi-immobilier.fr/api/health` toutes les 60s
- [ ] Configurer une alerte email/Slack si downtime > 1 min
- [ ] Verifier que Umami collecte les visites (verifier dans le dashboard Umami Cloud)

### Redeploiement

1. Push le code sur GitHub (ou edition directe dans Replit)
2. Replit detecte les changements et rebuild automatiquement (build command dans .replit)
3. Verifier `/api/health` apres le redeploy — le serveur se relance avec init-db.js (recree les tables si necessaire)
4. Si `/api/health` retourne `"degraded"` :
   - Verifier que DATABASE_URL est toujours valide dans Replit Secrets
   - Replit peut changer la DATABASE_URL apres un redeploy — le code lit process.env au runtime, pas de cache
   - Si la DB a ete reinitialisee : init-db.js recree les tables, mais les donnees sont perdues (restaurer depuis backup)

### Rollback

1. Dans Replit : "Deployments" > historique > selectionner un deployment precedent > "Promote"
2. Alternative : `git revert` du commit problematique, push, attendre le rebuild Replit
3. Si rollback DB necessaire : restaurer depuis le dernier pg_dump (voir section Backup)

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

### Procedure de restauration

1. Recuperer le dernier dump depuis l'artifact GitHub Actions ou le bucket S3/R2
2. Se connecter au shell Replit
3. Executer : `psql $DATABASE_URL < backup.sql`
4. Verifier : `node -e "import('pg').then(m => { const p = new m.default.Pool({connectionString: process.env.DATABASE_URL}); p.query('SELECT count(*) FROM properties').then(r => console.log(r.rows[0])).finally(() => p.end()) })"`
5. Redemarrer le serveur si necessaire (le pool se reconnecte automatiquement)

---

## Delivrabilite email (Resend)

### Configuration DNS email

Les deux domaines d'envoi doivent avoir les enregistrements DNS email configures dans Resend :

**Pour chaque domaine (versi.fr et versi-immobilier.fr) :**

1. Aller dans Resend > Domains > ajouter le domaine
2. Resend fournit les enregistrements DNS a ajouter chez le registrar :

| Type | Nom | Valeur | But |
|---|---|---|---|
| TXT | (fourni par Resend) | (fourni par Resend) | SPF — autorise Resend a envoyer |
| CNAME | (fourni par Resend) | (fourni par Resend) | DKIM — signature cryptographique |
| TXT | _dmarc | v=DMARC1; p=quarantine; rua=mailto:dmarc@versi.fr | DMARC — politique anti-usurpation |

3. Attendre la verification dans le dashboard Resend (quelques minutes a 24h)

### Seuils de delivrabilite

| Metrique | Seuil acceptable | Action si depasse |
|---|---|---|
| Taux de delivrance | > 95% | Verifier SPF/DKIM/DMARC, contenu des emails |
| Taux de bounce | < 5% | Verifier les adresses email invalides |
| Spam complaints | < 0.1% | Revoir le contenu, verifier opt-in |

### Checklist email

- [ ] Domaine versi.fr verifie dans Resend
- [ ] Domaine versi-immobilier.fr verifie dans Resend
- [ ] SPF configure pour les deux domaines
- [ ] DKIM configure pour les deux domaines
- [ ] DMARC configure pour les deux domaines
- [ ] Test d'envoi depuis le formulaire de contact versi-immobilier.fr
- [ ] Test d'envoi depuis le formulaire de contact versi.fr
- [ ] Verifier que les emails arrivent en inbox (pas en spam)

---

## Analytics (Umami Cloud)

### Configuration

1. Creer un compte sur [cloud.umami.is](https://cloud.umami.is) (gratuit jusqu'a 10K events/mois)
2. Ajouter deux sites :
   - `versi.fr` — recuperer le website ID
   - `versi-immobilier.fr` — recuperer le website ID
3. Le script Umami est deja integre dans les deux `index.html` (src/ et versi-immobilier/)
4. Verifier que le `data-website-id` correspond au bon site dans chaque index.html

### Verification post-deploy

- [ ] Visiter versi.fr et verifier qu'une visite apparait dans le dashboard Umami
- [ ] Visiter versi-immobilier.fr et verifier qu'une visite apparait dans le dashboard Umami
- [ ] Verifier que le CSP autorise bien `cloud.umami.is` (script-src + connect-src) — fait dans la correction #8/#9
- [ ] Verifier les evenements custom si configures (formulaire contact, clics CTA)

---

## Securite — Verification pre-launch

| Check | Statut | Notes |
|---|---|---|
| HTTPS force (TLS via Replit) | Auto | Replit fournit le certificat Let's Encrypt |
| CSP header complet | OK | Inclut fonts, Umami, inline styles |
| X-Frame-Options: DENY | OK | Protection clickjacking |
| X-Content-Type-Options: nosniff | OK | Protection MIME sniffing |
| Referrer-Policy: strict-origin-when-cross-origin | OK | Limite les donnees de referrer |
| Rate limiting formulaires | OK | 5 envois/IP/heure |
| Rate limiting login admin | OK | 5 tentatives/IP/heure |
| Sessions admin HttpOnly + Secure | OK | Cookie non accessible en JS |
| Sessions admin expiration | OK | 8h + nettoyage automatique toutes les 30 min |
| ADMIN_PASSWORD dans Secrets | A verifier | Jamais en dur dans le code |
| Input sanitization (escapeHtml) | OK | Protection XSS sur les formulaires |
| Validation server-side photos | OK | Verification base64, taille max 5 Mo |
| npm audit | A executer | `cd versi-immobilier && npm audit` avant chaque deploy |

---

## Limites de performance connues

### Photos base64 en PostgreSQL

Les photos sont stockees en base64 dans la colonne `data` (TEXT) des tables `property_photos` et `project_photos`. Ceci est un choix delibere (filesystem ephemere sur Replit), mais a des implications :

- **Memoire** : chaque photo base64 prend ~33% de plus que le fichier original. Une photo de 3 Mo = ~4 Mo en base64. Le serveur charge tout en memoire lors d'un `SELECT *`.
- **Latence** : le transfert de photos base64 dans les reponses JSON est plus lent qu'un CDN.
- **Migration future** : quand le volume de photos augmentera (>50 biens avec 5+ photos chacun), envisager une migration vers Cloudflare R2 ou AWS S3. Stocker l'URL dans la DB au lieu du base64. Le serveur proxy les images depuis le bucket.

### Cold starts Autoscale

- Premier acces apres inactivite : 2-5 secondes de latence (demarrage du process + init-db)
- Mitigation : le monitoring externe (BetterStack/UptimeRobot) ping `/api/health` toutes les 60s, ce qui maintient le serveur actif
- Si cold starts trop frequents : passer au plan Replit avec "Always On" ou augmenter la frequence du health check
