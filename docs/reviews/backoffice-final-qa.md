# Audit QA Final -- Back Office Admin versi-immobilier.fr

**Date** : 2026-04-11
**Auditeur** : @qa
**Scope** : server.js, src/admin/*, src/hooks/*, db.js, scripts/*
**Contexte** : 4e iteration (3 corrections successives). Dernier score 7.4/10 GO CONDITIONNEL.

---

## NOTE GLOBALE : 9.2 / 10 -- VERDICT : GO

Les corrections majeures ont ete appliquees avec succes. Le back office est solide pour une mise en production. Les points restants (0.8 point) sont des ameliorations non-bloquantes, detaillees en fin de document.

---

## Grille de notation (8 criteres)

| # | Critere | Note | Commentaire |
|---|---------|------|-------------|
| 1 | **Securite authentification** | 9.5/10 | Cookie httpOnly + SameSite=Strict + Path=/api/admin. timingSafeEqual pour la comparaison de mot de passe. Rate limiting login 10/h. Sessions en BDD avec expiration 8h + CRON nettoyage 30min. Seul point mineur : le cookie n'a pas le flag `Secure` (acceptable si HTTPS est force au niveau reverse proxy/Replit, mais a ajouter en production). |
| 2 | **Securite headers et XSS** | 10/10 | CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, X-XSS-Protection desactive (correct -- CSP fait le travail). escapeHtml() systematique sur tous les outputs HTML. Validation MIME type serveur. |
| 3 | **Validation des inputs** | 9.5/10 | Whitelist sur status (properties et projects). Whitelist sur query param `?status=`. Validation DPE whitelist A-G. Champs requis verifies cote serveur. Validation MIME type + taille base64 serveur (5 Mo). Validation email regex. Point mineur : pas de validation `maxLength` serveur sur les champs texte (title, description, etc.) -- un payload de 10 Mo de texte dans `description` passerait. Le `express.json({ limit: '10mb' })` limite la taille globale, ce qui mitigue le risque. |
| 4 | **Gestion des erreurs** | 9/10 | Tous les `alert()` remplaces par `setError()`. Tous les catch serveur renvoient un JSON structure `{ ok: false, error: '...' }` avec le bon status code. Erreurs BDD loguees serveur sans leak vers le client. `adminFetch` gere globalement le 401. Point mineur : les blocs `catch {}` vides dans les composants front (AdminLogin, AdminLayout) n'affichent rien a l'utilisateur quand `fetch('/api/admin/me')` echoue (acceptable car c'est un check de session au mount, pas une action utilisateur). |
| 5 | **Protection anti-abus** | 9/10 | Rate limiting formulaires : 5/h par IP. Rate limiting login : 10/h par IP. Header `Retry-After` renvoye. Honeypot sur formulaires publics. Anti double-clic : `disabled={saving}` sur tous les boutons submit des formulaires. Point mineur : le rate limiting est en memoire (perdu au restart), acceptable pour le volume attendu. |
| 6 | **Integrite BDD et requetes** | 9/10 | Requetes parametrees ($1, $2...) partout -- zero risque d'injection SQL. Transactions pour reorder photos (BEGIN/COMMIT/ROLLBACK + client.release dans finally). ON DELETE CASCADE sur les FK photos. Slug retry 5 tentatives avec fallback UUID. `ON CONFLICT DO NOTHING` sur la migration seed. Triggers updated_at. Index sur FK et expires_at. Point mineur : la colonne `data TEXT` pour les photos base64 en BDD est une dette technique (devrait etre du stockage objet), mais c'est un choix architectural conscient, pas un bug. |
| 7 | **UX admin et robustesse front** | 9/10 | Etats loading/error/empty geres sur tous les ecrans. Filtres par statut. Confirmation avant suppression (window.confirm). Toast de succes avec auto-dismiss 3s. Export CSV des inscrits. Retour navigation coherent. Validation front avant soumission. Point mineur : le message d'erreur en haut du formulaire AdminBienForm peut etre masque si l'utilisateur est en bas du formulaire (pas de scroll automatique vers l'erreur). |
| 8 | **Hooks publics et architecture** | 9.5/10 | Hooks propres et idempotents. `encodeURIComponent` sur les parametres URL. Gestion du 404 dans useProperty/useProject. Mapping snake_case vers camelCase pour le front. useFadeIn respecte `prefers-reduced-motion`. Separation claire admin/public. |

---

## Bugs restants (non-bloquants -- ameliorations recommandees)

### B1 -- Flag `Secure` manquant sur le cookie de session (Severite : BASSE)

**Fichier** : `server.js` ligne 287
**Actuel** :
```js
`vi_admin_token=${sessionId}; HttpOnly; SameSite=Strict; Max-Age=${8 * 60 * 60}; Path=/api/admin`
```
**Attendu** : ajouter `; Secure` en production pour forcer HTTPS. En dev local HTTP, le cookie serait rejete, donc conditionner :
```js
const securePart = process.env.NODE_ENV === 'production' ? '; Secure' : '';
`vi_admin_token=${sessionId}; HttpOnly; SameSite=Strict; Max-Age=${8 * 60 * 60}; Path=/api/admin${securePart}`
```
**Impact** : sans le flag Secure, le cookie peut transiter en clair sur HTTP. En pratique, Replit et la plupart des hebergeurs forcent HTTPS au niveau du proxy, donc le risque reel est faible.

### B2 -- Pas de validation `maxLength` serveur sur les champs texte (Severite : BASSE)

**Fichier** : `server.js` lignes 466-518 (POST properties), 793-835 (POST projects)
**Actuel** : les champs `title`, `description`, `city`, etc. ne sont pas bornes en longueur cote serveur.
**Impact** : le `express.json({ limit: '10mb' })` global protege deja contre les payloads enormes. Un attaquant ne pourrait pas envoyer plus de 10 Mo au total. Risque residuel faible.
**Recommandation** : ajouter une validation `if (title.length > 500)` / `if (description.length > 10000)` sur les champs principaux pour une defense en profondeur.

### B3 -- Cookie de logout non securise de la meme maniere (Severite : NEGLIGEABLE)

**Fichier** : `server.js` ligne 302-303
**Actuel** :
```js
'vi_admin_token=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/api/admin'
```
**Attendu** : ajouter le meme flag `Secure` conditionnel que B1 pour la coherence. Sans impact reel puisque Max-Age=0 efface le cookie immediatement.

### B4 -- AdminBiens et AdminRealisations : double affichage conditionnel de `error` (Severite : COSMETIQUE)

**Fichier** : `src/admin/AdminBiens.jsx` lignes 84-91 et 96
**Detail** : quand `error` est non-vide, le composant affiche le bloc erreur complet (lignes 84-91) ET sort du rendu (`return`). Puis ligne 96, `{error && <p>...}` est present dans le rendu normal. Les deux chemins ne peuvent pas s'afficher simultanement grace au `return` anticipee, donc pas de bug fonctionnel, mais le `{error && ...}` de la ligne 96 est du code mort dans le contexte actuel.
**Impact** : zero. Nettoyage cosmetique uniquement.

---

## Corrections confirmees depuis le dernier audit (7.4/10)

| Correction | Statut |
|------------|--------|
| Headers securite (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection) | FAIT -- server.js L25-31 |
| Slug retry 5 tentatives | FAIT -- server.js L491-495 (properties) et L813-817 (projects) |
| Validation whitelist query param `?status=` | FAIT -- server.js L323-326 (properties) et L368-371 (projects) |
| `alert()` remplaces par `setError()` | FAIT -- tous les composants admin utilisent setError() |
| Anti double-clic `disabled={saving}` | FAIT -- AdminBienForm L483, AdminRealisationForm L343 |

---

## Synthese des points forts

1. **Zero injection SQL** : 100% des requetes sont parametrees.
2. **Auth robuste** : httpOnly cookie, timingSafeEqual, rate limiting, session BDD avec expiration.
3. **Validation serveur exhaustive** : MIME whitelist, taille base64 recalculee serveur-side, status whitelist, DPE whitelist.
4. **Gestion d'erreur coherente** : format JSON structure, codes HTTP corrects, erreurs loguees sans leak.
5. **Anti-abus multicouche** : rate limiting IP, honeypot, anti double-clic.
6. **Integrite referentielle** : CASCADE sur FK, transactions sur reorder, triggers updated_at.

---

**Verdict final : 9.2/10 -- GO**

Les 4 points restants (B1-B4) sont des ameliorations non-bloquantes de type defense-en-profondeur ou cosmetique. Aucun ne constitue un risque de securite exploitable en conditions reelles de production (HTTPS force par l'hebergeur). Le back office est pret pour la production.

---

**Handoff -> @infrastructure**
- Fichier produit : `docs/reviews/backoffice-final-qa.md`
- Decisions prises : GO a 9.2/10, 4 points non-bloquants documentes
- Points d'attention : B1 (flag Secure sur cookie) a ajouter lors de la mise en production, B2 (maxLength) en amelioration future
