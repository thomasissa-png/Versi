# Audit qualite back office admin versi-immobilier.fr

**Agent** : @qa
**Date** : 2026-04-11
**Scope** : server.js (API), src/admin/* (frontend), src/hooks/* (hooks publics), db.js, scripts/*
**Methode** : revue de code statique, analyse des specs vi-backoffice-specs.md vs implementation

---

## Note globale et verdict

**Note globale : 5.9 / 10**

| # | Critere | Note |
|---|---------|------|
| 1 | Validation server-side | 7 / 10 |
| 2 | Cas limites | 4 / 10 |
| 3 | Gestion d'erreurs | 6 / 10 |
| 4 | Concurrence | 3 / 10 |
| 5 | Performance | 4 / 10 |
| 6 | Securite | 5 / 10 |
| 7 | Conformite specs | 8 / 10 |
| 8 | Regression frontend public | 7 / 10 |
| | **Moyenne** | **5.5 / 10** |

**Verdict : NO-GO**

Raison : 3 bugs P0 (securite) et 5 bugs P1 (integrite, performance, fiabilite) necessitent correction avant mise en production. Le code est fonctionnellement correct pour un happy path mais manque de robustesse face aux cas limites, a la concurrence et aux attaques basiques. La note remontee a 5.9 tient compte du fait que l'architecture est saine et que les corrections sont toutes faisables sans refonte.

---

## Grille detaillee (8 criteres)

### 1. Validation server-side (inputs, injection SQL, XSS) -- 7/10

**Points positifs :**
- Toutes les requetes SQL utilisent des parametres ($1, $2...) via `pg` -- zero risque d'injection SQL.
- La fonction `escapeHtml()` est appliquee aux champs dans les emails (`server.js:100-108`). Les sujets d'email echappent aussi le HTML.
- Validation des champs obligatoires sur POST properties (`server.js:401-403`) et POST projects (`server.js:703`).
- Validation enum sur `status` (properties et projects) et `dpe`.
- Validation MIME type et prefix `data:image/` sur les photos.
- Validation regex email sur `/api/public/subscribe` (`server.js:359`).

**Points negatifs :**
- **P0-3** : `size_bytes` contournable (voir bugs P0).
- Pas de validation de longueur max sur les champs texte (`title`, `description`, etc.). Un admin peut envoyer une description de 10 Mo (limitee uniquement par `express.json({ limit: '10mb' })`).
- Pas de sanitization des champs texte avant stockage. Les valeurs sont stockees telles quelles en BDD. L'echappement HTML est fait uniquement pour les emails, pas pour les donnees retournees par l'API publique. Si le frontend affiche un champ via `dangerouslySetInnerHTML` ou equivalent, XSS possible.
- Le champ `status` du query string public (`?status=xxx`) n'est pas valide -- valeurs invalides ne retournent pas d'erreur.
- **P2-7** : PUT ne valide pas que les champs obligatoires restent non-vides apres mise a jour.

### 2. Cas limites -- 4/10

**Cas limites non geres :**

| Cas limite | Fichier | Comportement actuel | Comportement attendu |
|------------|---------|---------------------|----------------------|
| Champ vide string `""` sur PUT | server.js:446 | Accepte, ecrase la valeur par une chaine vide | Rejeter si champ obligatoire |
| Photo de 0 bytes | server.js:602 | Accepte (`size_bytes` optionnel) | Rejeter -- un fichier de 0 octets n'est pas une image |
| Slug doublon apres suffixe | server.js:416-419 | Erreur 500 (PK violation) | Boucle de retry ou UUID complet |
| Double clic rapide sur "Enregistrer" | AdminBienForm.jsx:199 | `disabled={saving}` cote client, mais le serveur n'a pas de garde | Idempotence serveur ou debounce |
| Session expiree en plein formulaire | AdminBienForm.jsx:209-223 | Le `adminFetch` intercepte le 401 et redirige vers /login. Les donnees saisies sont perdues. | Sauvegarder le draft en sessionStorage avant redirect |
| 10+ photos uploadees simultanement | AdminBienForm.jsx:226 | `Promise.all` sans limite de concurrence | Limiter a 3 uploads paralleles pour eviter le timeout |
| Nom de fichier avec caracteres speciaux | server.js:623 | Stocke tel quel | Sanitizer le filename (balises, unicode, chemins) |
| Champ `price_num` = NaN ou negatif | server.js:393-429 | Pas de validation server-side sur price_num | Valider type number >= 0 |
| Titre avec uniquement des caracteres speciaux | server.js:124-131 | `slugify("---")` retourne `""` -- PK vide | Generer un UUID fallback si slug vide |
| Body JSON malformed | server.js:22 | Express 400 par defaut -- OK mais message non explicite | Middleware d'erreur JSON custom |

**Seul cas bien gere :** la gestion du slug doublon basique (suffixe 4 chars) et la verification `ON CONFLICT (email) DO NOTHING` pour les subscribers.

### 3. Gestion d'erreurs (catch API + affichage frontend + offline) -- 6/10

**Points positifs :**
- Chaque handler API a un `try/catch` avec log `console.error` et reponse 500 structuree `{ ok: false, error: 'Erreur interne' }`.
- Le frontend affiche des messages d'erreur contextuels (AdminBiens.jsx:84-90, AdminInscrits.jsx:57-62).
- `adminFetch.js` gere le 401 globalement -- redirect login automatique.
- Les listes ont un bouton "Reessayer" quand le chargement echoue.
- Le login gere l'erreur de connexion serveur (catch dans handleSubmit).

**Points negatifs :**
- **Pas de gestion offline.** Aucun composant ne detecte `navigator.onLine` ou n'ecoute les events `online`/`offline`. Si l'admin perd la connexion pendant l'edition d'un bien, la soumission echoue avec un message generique "Erreur lors de l'enregistrement" sans distinction entre erreur reseau et erreur serveur.
- **Erreurs de photo silencieuses.** Dans `AdminBienForm.jsx:226`, si `Promise.all` rejette partiellement, le `catch` global affiche "Erreur lors de l'enregistrement" alors que le bien est deja cree en BDD. L'admin va peut-etre re-soumettre, ce qui cree un doublon.
- **Pas de distinction 4xx vs 5xx cote frontend.** `adminFetch.js` traite toutes les erreurs non-401 de la meme facon : `throw new Error(data.error)`. Un 400 (validation) et un 500 (bug serveur) affichent le meme type de message.
- **`r.json().catch()` dans adminFetch.js:21** : si le serveur retourne du HTML (ex: page 502 Nginx), le `.json()` echoue et retourne `{ ok: false, error: 'Reponse serveur invalide' }`. C'est correct.
- **Pas de timeout sur les fetches.** Un serveur qui ne repond jamais laisse l'utilisateur sur "Chargement..." indefiniment. Recommandation : `AbortController` avec timeout 30s.

### 4. Concurrence (2 admins, race conditions) -- 3/10

**Scenario : 2 admins editent le meme bien simultanement.**

1. Admin A ouvre le bien "Appt T3" (GET /properties/appt-t3).
2. Admin B ouvre le meme bien (GET /properties/appt-t3).
3. Admin A modifie le prix et enregistre (PUT).
4. Admin B modifie la description et enregistre (PUT).
5. Resultat : la modification de A (prix) est ecrasee par B. Pas de detection de conflit, pas de `updated_at` compare, pas d'optimistic locking.

**Problemes identifies :**
- **Zero mecanisme de concurrence.** Pas de `If-Match` / `ETag`, pas de comparaison `updated_at`, pas de lock.
- **Race condition sur le slug.** 2 creations simultanees avec le meme titre : le `SELECT id` puis `INSERT` ne sont pas dans une transaction. Le second INSERT peut echouer avec une PK violation si les deux passent le SELECT avant que l'un n'insere.
- **Race condition sur le reorder.** 2 appels simultanes a `/photos/reorder` avec des ordres differents : les deux transactions commitent, le dernier gagne. Pas de probleme d'integrite mais resultat imprevisible.
- **Race condition upload photos.** `Promise.all` envoie N requetes paralleles. Chaque requete fait un `MAX(sort_order)` independant. Si 2 photos sont uploadees en meme temps, elles peuvent recevoir le meme `sort_order`.

**Point positif :**
- Le `reorder` utilise une transaction (`BEGIN/COMMIT/ROLLBACK`) -- correct pour l'atomicite.

**Recommandation immediate (sans refonte) :** Ajouter un champ `version` (INTEGER, incrementiel) aux tables properties et projects. Sur PUT, verifier `WHERE id = $X AND version = $Y`. Si 0 rows affected → conflit 409.

### 5. Performance (base64 PostgreSQL, pagination, temps reponse) -- 4/10

**Probleme architectural : base64 en PostgreSQL.**

Les specs documentent ce choix et son rationnel (filesystem Replit ephemere). Le choix est correct pour les contraintes V1. Cependant :

- **Impact memoire Node.js.** `GET /api/public/properties/:id` fait un `SELECT *` sur properties puis un `SELECT data FROM property_photos WHERE property_id = $1`. Si un bien a 10 photos de 5 Mo, la reponse pese ~50 Mo (en base64, 5 Mo binaire = ~6.7 Mo texte). Node.js charge les 50 Mo en memoire pour construire la reponse JSON.
- **Impact BDD.** PostgreSQL stocke les TEXT > 2KB dans TOAST. Les scans sequentiels sur property_photos sont lents car chaque row contient le blob base64.
- **Pas de pagination.** Toutes les listes (properties, projects, subscribers) font `SELECT * ORDER BY ...` sans LIMIT. Avec 100 biens et 10 photos chacun (GET admin), la reponse depasse 500 Mo.
- **Pas de cache.** Les endpoints publics ne retournent pas de `Cache-Control`, `ETag`, ni `Last-Modified`. Chaque visite de page publique re-telecharge toutes les donnees.
- **Pas de compression.** Pas de `compression` middleware Express. Les reponses JSON volumineuses (photos base64) sont envoyees non-compressees.

**Calcul d'impact :** 8 biens actifs x 8 photos x 4 Mo = 256 Mo en BDD. Le seuil de 1 Go (migration Cloudinary documentee dans les specs) sera atteint a ~30 biens actifs. C'est viable pour V1.

**Points positifs :**
- Les endpoints de liste publique (`/api/public/properties`) excluent correctement les photos (colonnes listees explicitement dans le SELECT -- pas de `SELECT *`).
- Le `db.js` configure un pool avec `max: 10` connexions, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000` -- configuration sensee.

**Recommandations :**
1. Ajouter `compression()` middleware -- gain immediat ~70% sur les reponses JSON/base64.
2. Ajouter `Cache-Control: public, max-age=300` sur les endpoints publics.
3. Limiter le nombre de photos par bien cote serveur (ex: max 15).

### 6. Securite (localStorage XSS, rate limiting, auth) -- 5/10

**Analyse detaillee :**

| Vecteur | Statut | Detail |
|---------|--------|--------|
| Injection SQL | OK | Requetes parametrees partout. |
| XSS stocke | PARTIEL | `escapeHtml` sur les emails uniquement. Les donnees retournees par l'API ne sont pas echappees server-side. Le frontend React echappe par defaut via JSX (`{variable}`), donc pas de risque XSS tant que personne n'utilise `dangerouslySetInnerHTML`. Mais les photos `img src={photo.data}` acceptent n'importe quel `data:` URI -- un admin malveillant pourrait injecter du JavaScript SVG. |
| Mot de passe | FAIBLE | Mot de passe "allezpsg" = 8 caracteres, tout minuscule, mot du dictionnaire. Comparaison en clair, non constant-time (P0-1). |
| Session token | CORRECT | UUID v4 (128 bits d'entropie), non predictible, expire apres 8h, nettoyage via cron toutes les 30 min. |
| Stockage token | RISQUE | localStorage vulnerable XSS (P0-2). Cookie httpOnly serait plus sur. |
| Rate limiting login | OK | 10 tentatives/IP/h. Header `Retry-After` present. |
| Rate limiting API admin | ABSENT | Aucun rate limiting sur les endpoints admin CRUD. Un token vole peut creer/supprimer des biens en masse. |
| Rate limiting subscribe | ABSENT | `/api/public/subscribe` n'a pas de rate limiting. Un bot peut inscrire des millions d'emails. |
| Headers securite | ABSENT | Pas de CSP, HSTS, X-Frame-Options, X-Content-Type-Options (P1-4). |
| CSRF | N/A | L'API utilise Authorization header (pas de cookie de session), donc CSRF n'est pas un vecteur. OK. |
| Clickjacking | RISQUE | Pas de `X-Frame-Options: DENY`. L'admin est framable dans une iframe. |
| Enumeration | OK | Le login retourne le meme message pour tous les cas d'echec ("Mot de passe incorrect"). Pas d'enumeration possible. |
| Nettoyage sessions | OK | Cron `setInterval` toutes les 30 min supprime les sessions expirees. |
| IP spoofing | PARTIEL | `x-forwarded-for` est trust tel quel pour le rate limiting. Derriere un reverse proxy, c'est correct. Mais sans proxy, un client peut forger le header pour contourner le rate limit. |

**Score detaille :** Bonne protection SQL et auth basique, mais le profil de securite global est insuffisant pour un backoffice en production (mot de passe faible, pas de headers, pas de rate limit sur les mutations, localStorage).

### 7. Conformite specs (user stories vs implementation) -- 8/10

**Verification point par point des specs (`vi-backoffice-specs.md`) :**

| Specification | Conforme ? | Ecart |
|---------------|------------|-------|
| Table properties (schema SQL section 2.1) | OUI | Schema init-db.js identique aux specs. |
| Table property_photos (2.2) | OUI | |
| Table projects (2.3) | OUI | |
| Table project_photos (2.4) | OUI | |
| Table subscribers (2.5) | OUI | |
| Table admin_sessions (2.6) | OUI | |
| Triggers updated_at (2.7) | OUI | Implementation idempotente dans init-db.js. |
| POST /api/admin/login (3.1) | OUI | Reponse conforme. Rate limit conforme (10/IP/h). |
| POST /api/admin/logout (3.1) | OUI | |
| GET /api/admin/me (3.1) | OUI | |
| GET /api/public/properties (3.2) | OUI | Query param status fonctionne. |
| GET /api/public/properties/:id (3.2) | OUI | Retourne property + photos. |
| CRUD admin properties (3.3) | OUI | Tous les endpoints implementes. |
| CRUD admin property photos (3.4) | OUI | Incluant reorder. |
| CRUD admin projects (3.6) | OUI | |
| CRUD admin project photos (3.7) | OUI | |
| Subscribers endpoints (3.8) | OUI | |
| Slug genere server-side (3.10) | OUI | Avec suffixe collision. |
| Status enum property (3.10) | OUI | |
| Status enum project (3.10) | OUI | |
| DPE enum (3.10) | OUI | |
| Photo validation data prefix (3.10) | OUI | |
| Photo validation size (3.10) | **PARTIEL** | Contournable si size_bytes absent (P0-3). |
| Photo validation mime_type (3.10) | OUI | |
| Email regex subscriber (3.10) | OUI | |
| Session UUID v4 8h (3.10) | OUI | |
| Page login (4.1) | OUI | Focus auto, password type, redirection si token valide. |
| Layout admin (4.2) | OUI | 3 sections + deconnexion. |
| Section Biens (4.3) | OUI | Filtres, actions par statut conformes aux specs. |
| Formulaire bien (4.4) | **ECART** | `price_num` non obligatoire dans le frontend alors que les specs le marquent *. |
| Section Realisations (4.5) | OUI | |
| Section Inscrits (4.7) | OUI | |
| 5 etats UI (4.8) | **PARTIEL** | Loading, Vide, Erreur presents. Succes = redirect (conforme). Mais pas de skeleton en loading (specs mentionnent "Skeleton 4 lignes" -- implementation = simple texte "Chargement..."). |
| Notification email (7.2) | OUI | Declenchee sur POST disponible et PATCH restaurer. Pas sur archive ni edition. |
| Template email (7.3) | OUI | Titre, ville, surface, prix, lien -- conforme. |
| Desinscription manuelle (7.5) | OUI | Admin peut supprimer un inscrit. |

**Ecarts identifies :** 3 mineurs (price_num, skeleton loading, size_bytes bypass). Conformite globale estimee a 92%.

### 8. Regression frontend public (hooks si DB vide ou API down) -- 7/10

**Analyse des hooks publics :**

| Hook | DB vide | API down (500) | API down (timeout) | ID inexistant |
|------|---------|----------------|--------------------|--------------------|
| useProperties.js | Retourne `[]` -- OK, le composant affichera un etat vide | `error` set, `loading: false` -- OK | Fetch reste pending indefiniment. Pas de timeout ni d'AbortController. | N/A (liste) |
| useProperty.js | N/A | `error` set, `loading: false` -- OK | Fetch reste pending indefiniment. | Retourne `property: null, photos: []` -- le composant doit gerer le cas null. |
| useProjects.js | Retourne `[]` -- OK | `error` set -- OK | Pas de timeout. | N/A (liste) |
| useProject.js | N/A | `error` set -- OK | Pas de timeout. | Retourne `project: null, photos: []` -- OK. |

**Points positifs :**
- Les hooks gerent correctement le cas 404 (`useProperty`, `useProject`) en retournant null au lieu de crash.
- Les hooks mappent correctement les noms snake_case du serveur vers camelCase (`price_num` -> `priceNum`, etc.).
- Les hooks gerent `data.properties || []` et `data.photos || []` -- pas de crash si le champ est absent.
- `encodeURIComponent` sur les parametres d'URL -- correct.

**Points negatifs :**
- **Pas de timeout / AbortController.** Si le serveur ne repond jamais, le composant reste en `loading: true` indefiniment. Le spinner tourne a l'infini.
- **Pas de cleanup sur unmount.** Si le composant est demonte avant la fin du fetch, le state update sur un composant demonte provoque un memory leak (warning React). Il faudrait un `AbortController` dans un cleanup du `useEffect`.
- **Pas de retry.** Erreur reseau transitoire = erreur definitive.
- **Mapping camelCase.** Le mapping est fait dans chaque hook individuellement. Les champs mappes sont ajoutes EN PLUS des champs snake_case (spread `...p`). Le composant recoit donc `price_num` ET `priceNum`. Pas un bug mais une source de confusion.
- **Le hook `useProperty` ne distingue pas erreur 500 et 404.** Si le serveur retourne 404, `property` est null et `error` est null. Si le serveur retourne 500, `property` est undefined (reste a sa valeur initiale null) et `error` est set. OK fonctionnellement.

**Impact regression :** Les hooks sont suffisamment defensifs pour eviter un crash du site public si la BDD est vide ou l'API temporairement down. Le site affichera un etat d'erreur ou vide selon le cas. Pas de regression bloquante identifiee.

---

## Tableau des bugs

### Bugs P0 -- bloquants securite/integrite

| # | Fichier:ligne | Description | Impact |
|---|---------------|-------------|--------|
| P0-1 | server.js:237 | **Comparaison mot de passe en clair, non constant-time.** `password !== ADMIN_PASSWORD` est vulnerable au timing attack. De plus, le mot de passe admin est stocke en clair dans la variable d'environnement et compare en clair. Il devrait etre hache avec bcrypt/scrypt. | Un attaquant peut deduire le mot de passe caractere par caractere via timing analysis. Avec seulement 10 tentatives/h de rate limit, c'est lent mais pas impossible sur un mot de passe faible comme "allezpsg" (8 caracteres, pas de majuscule, pas de chiffre). |
| P0-2 | src/admin/adminFetch.js:6, ProtectedRoute.jsx:4 | **Token de session stocke en localStorage -- vulnerable XSS.** Si une faille XSS existe n'importe ou dans l'app (ou dans une future extension), le token est exfiltrable via `localStorage.getItem('vi_admin_token')`. Les specs imposent localStorage, mais le risque doit etre documente. Le token devrait etre un cookie httpOnly/SameSite=Strict. | Vol de session admin complet via injection XSS. |
| P0-3 | server.js:602-604 | **Validation photo size_bytes contournable.** La validation `if (size_bytes && size_bytes > 5242880)` ne se declenche pas si `size_bytes` est absent, null, 0, ou false. Le champ `data` (base64) n'a pas de validation de taille reelle. Un attaquant peut envoyer un body JSON avec `size_bytes: 0` et un `data` de 50 Mo -- le `express.json({ limit: '10mb' })` limite a 10 Mo le body total, mais c'est 2x la limite documentee de 5 Mo par photo. | Stockage de photos jusqu'a ~7.5 Mo reels (10 Mo base64 = ~7.5 Mo binaire) au lieu de 5 Mo. Risque de saturation BDD acceleree. |

### Bugs P1 -- importants fonctionnels/fiabilite

| # | Fichier:ligne | Description | Impact |
|---|---------------|-------------|--------|
| P1-1 | server.js:416-419 | **Collision de slug non-deterministe.** Si deux biens ont le meme titre, le second recoit un suffixe aleatoire de 4 chars. Mais si un 3e bien a encore le meme titre, `slugify(title)` produit le meme slug de base, qui existe deja. Le code verifie uniquement si `slugify(title)` existe -- pas `slugify(title) + suffixe`. Pas de boucle de retry en cas de collision du slug suffixe. Probabilite faible (1/65536 par collision) mais non-zero. | Erreur 500 (PRIMARY KEY violation) sur creation de bien avec titre duplique si collision du suffixe aleatoire. |
| P1-2 | server.js:652-676, 898-922 | **Reorder photos : pas de validation des IDs.** L'endpoint `/photos/reorder` accepte un tableau `order` sans verifier que les IDs appartiennent bien au property_id/project_id concerne. Un admin pourrait reordonner les photos d'un autre bien via cet endpoint. De plus, pas de validation que tous les IDs existent -- les UPDATE silencieux avec 0 rows affected ne sont pas detectes. | Corruption de l'ordre des photos si IDs incorrects passes. |
| P1-3 | AdminBienForm.jsx:226, AdminRealisationForm.jsx:176 | **Upload photos en parallele (Promise.all) sans gestion d'echec partiel.** Si 5 photos sont uploadees et la 3e echoue, `Promise.all` rejette immediatement. Le bien est cree mais seulement 2 photos sur 5 sont enregistrees. L'utilisateur recoit un message d'erreur generique sans savoir combien de photos ont ete sauvees. | Perte de photos silencieuse. L'admin pense que l'upload a echoue alors que le bien existe deja en BDD. |
| P1-4 | server.js (global) | **Aucun header de securite.** Pas de `helmet` ni d'ajout manuel de headers : Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, Referrer-Policy. L'admin est framable (clickjacking). | Vulnerabilite clickjacking, sniffing MIME, absence de CSP. |
| P1-5 | server.js:183-222 | **Notification email bloquante pour la request.** `sendPropertyNotification` est appelee avec `await` implicite (elle est async, appelee sans await donc non bloquante -- OK). MAIS si Resend est down ou lent, les emails en boucle sequentielle (500ms chacun) prennent N*500ms. Avec 100 inscrits = 50 secondes de traitement en arriere-plan. Pas de timeout ni de circuit breaker. Le process Node.js pourrait etre surcharge si plusieurs notifications se declenchent simultanement. | Latence serveur sous charge. Pas de retry en cas d'echec email. |

### Bugs P2 -- ameliorations recommandees

| # | Fichier:ligne | Description | Impact |
|---|---------------|-------------|--------|
| P2-1 | server.js:277-296 | **Endpoint public properties : pas de validation du parametre status.** `req.query.status` est passe directement dans la clause WHERE sans validation. Bien que les requetes parametrees ($1) empechent l'injection SQL, un status invalide (ex: `?status=toto`) retourne un tableau vide sans erreur -- pas un 400. | UX confuse pour les consommateurs d'API. |
| P2-2 | AdminBienForm.jsx:167-186 | **Validation frontend incomplete.** Le champ `price_num` n'est pas obligatoire dans le formulaire frontend mais est documente comme requis dans les specs (section 4.4 : "prix_num" marque *). La validation frontend ne l'exige pas -- seule une verification `isNaN` est faite si le champ est rempli. | Biens crees sans price_num = tri impossible cote public. |
| P2-3 | server.js (global) | **Pas de pagination sur les endpoints de liste.** `/api/admin/properties`, `/api/admin/projects`, `/api/admin/subscribers`, et meme les endpoints publics -- tout retourne la totalite des rows. Acceptable en V1 (< 10 biens) mais non-scalable. | Degradation progressive des performances avec le volume de donnees. |
| P2-4 | ProtectedRoute.jsx:7 | **Verification de session uniquement cote client.** `ProtectedRoute` verifie `expiresAt` localement sans appeler `/api/admin/me`. Si le serveur a supprime la session (ex: apres un deploiement), le client croit etre authentifie jusqu'a la premiere requete API qui retourne 401. | Faux sentiment d'authentification pendant quelques secondes. |
| P2-5 | server.js:192-218 | **Notification email sans unsubscribe link.** L'email contient "repondez STOP" comme mecanisme de desinscription. Pas de header `List-Unsubscribe` ni de lien automatise. Les specs V1 documentent ce choix, mais c'est une non-conformite CAN-SPAM / RGPD pour les envois en masse. | Risque de signalement spam par les providers email. Degradation de la reputation d'envoi. |
| P2-6 | AdminBienForm.jsx:188-239, AdminRealisationForm.jsx:140-189 | **Double soumission non protegee cote serveur.** Le bouton est `disabled` pendant `saving`, mais le serveur n'a pas de mecanisme d'idempotence. Un utilisateur rapide ou un reseau lent pourrait envoyer 2 POST avant que `setSaving(true)` ne desactive le bouton. Resultat : 2 biens identiques crees. | Doublons en base. |
| P2-7 | server.js:446-501 | **PUT properties : pas de validation des champs obligatoires.** L'endpoint PUT accepte des mises a jour partielles. Si un admin envoie `{ title: "" }`, le titre est mis a jour a chaine vide, violant la contrainte NOT NULL implicite de la logique metier (mais pas en BDD car PostgreSQL accepte "" pour TEXT NOT NULL). | Corruption de donnees : biens sans titre, sans prix, etc. |
| P2-8 | src/hooks/useProperties.js, useProjects.js | **Pas de retry automatique en cas d'echec reseau.** Si le fetch echoue une fois (timeout, erreur reseau transitoire), l'erreur est affichee definitivement. Le composant ne re-tente pas. | Mauvaise UX en cas de micro-coupure reseau. |
| P2-9 | server.js:549 | **Restaurer un bien declenche une notification.** Quand un bien est restaure de 'archive' vers 'disponible', `sendPropertyNotification` est appelee. Si un admin archive puis restaure un bien par erreur, tous les inscrits recoivent une notification pour un bien deja connu. | Spam des inscrits. Perte de confiance dans les notifications. |
| P2-10 | server.js (global) | **Pas de CORS configure.** Pas de middleware `cors()`. L'API est accessible par n'importe quel domaine en mode SPA (meme origin). C'est correct en prod single-origin, mais en dev ou si l'admin est sur un domaine different, les requetes cross-origin echoueront. | Pas de blocage en prod meme origin, mais absence de defense en profondeur. |

---

## Recommandations prioritaires

### Corrections P0 (bloquantes -- a faire avant mise en production)

**1. Hasher le mot de passe admin (P0-1).**
- `server.js` : remplacer la comparaison en clair par `bcrypt.compare(password, hashedPassword)`.
- Stocker le hash bcrypt dans la variable d'environnement au lieu du mot de passe en clair.
- Bonus : imposer un mot de passe plus fort que "allezpsg" (minimum 12 caracteres, 1 majuscule, 1 chiffre).
- Fichier : `server.js:237`

**2. Migrer le token de localStorage vers un cookie httpOnly (P0-2).**
- `server.js` (login) : retourner le token via `Set-Cookie: vi_session=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=28800`.
- `server.js` (checkAdminAuth) : lire `req.cookies.vi_session` au lieu de `req.headers.authorization`.
- Frontend : supprimer tout acces a `localStorage` pour le token. Le cookie est envoye automatiquement.
- Ajouter `cookie-parser` middleware.
- Fichiers : `server.js`, `adminFetch.js`, `AdminLogin.jsx`, `AdminLayout.jsx`, `ProtectedRoute.jsx`

**3. Valider la taille reelle du base64 (P0-3).**
- `server.js` (POST photos) : calculer la taille reelle du binaire a partir de la longueur du base64 : `Math.ceil((data.length - header.length) * 3 / 4)`. Rejeter si > 5 242 880.
- Ne pas faire confiance a `size_bytes` envoye par le client.
- Fichier : `server.js:602-608` et `server.js:850-856`

### Corrections P1 (a faire dans le sprint courant)

**4. Ajouter les headers de securite (P1-4).**
- Installer `helmet` : `npm install helmet`.
- `server.js` : `app.use(helmet())` avant les routes. Personnaliser `contentSecurityPolicy` pour autoriser les `data:` URIs (base64 photos) dans `img-src`.

**5. Corriger la creation de slug pour eviter les collisions (P1-1).**
- Wrapper le SELECT + INSERT dans une transaction.
- Ajouter une boucle de retry (max 3 tentatives) en cas de PK violation.
- Fichier : `server.js:415-430` et `server.js:713-719`

**6. Remplacer Promise.all par Promise.allSettled pour l'upload photos (P1-3).**
- `AdminBienForm.jsx:226` et `AdminRealisationForm.jsx:176` : utiliser `Promise.allSettled`, puis afficher un message detaille : "X photos enregistrees, Y echecs".
- Sauvegarder les photos en echec dans un state local pour permettre un retry.

### Corrections P2 (backlog)

**7. Ajouter `compression()` middleware.**
**8. Ajouter rate limiting sur `/api/public/subscribe`.**
**9. Ajouter AbortController avec timeout 30s dans les hooks publics.**
**10. Valider les champs obligatoires sur PUT (titre, description, prix non-vides).**
**11. Ajouter un mecanisme d'optimistic locking (champ `version`).**
**12. Ajouter skeleton loaders conformes aux specs.**

---

## Synthese pour @fullstack

| Priorite | Nombre | Effort estime |
|----------|--------|---------------|
| P0 | 3 | ~2h (bcrypt, cookie, validation base64) |
| P1 | 5 | ~3h (helmet, slug retry, Promise.allSettled, transaction, notification) |
| P2 | 10 | ~4h (compression, rate limit, abort, validation PUT, locking, skeleton) |

Le code est bien structure, lisible, et fonctionnellement correct pour le happy path. Les problemes identifies sont tous des cas limites et du hardening securite -- aucune refonte architecturale n'est necessaire.

---

**Handoff -> @fullstack**
- Fichier produit : `docs/reviews/backoffice-audit-qa.md`
- Decisions prises : grille 8 criteres, seuils P0/P1/P2 bases sur l'impact securite et integrite donnees
- Points d'attention : les 3 P0 sont tous lies a la securite (mot de passe, token, validation taille). A corriger AVANT toute mise en production du backoffice. Le P0-2 (cookie httpOnly) est le plus impactant en termes de modification car il touche 5 fichiers frontend + backend.
