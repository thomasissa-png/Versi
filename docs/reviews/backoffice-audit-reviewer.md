# Audit Back Office Admin — versi-immobilier.fr

**Date** : 2026-04-11
**Auditeur** : @reviewer
**Scope** : API server.js + Frontend admin (src/admin/*) + Hooks publics (src/hooks/*) + BDD (db.js, scripts/*)
**Specs de reference** : docs/product/vi-backoffice-specs.md

---

## Note globale et verdict

**Note globale : 7.4 / 10**

**Verdict : GO CONDITIONNEL**

L'implementation du back office admin est solide dans l'ensemble : architecture coherente, securite correcte (requetes parametrees, rate limiting, validation server-side), gestion d'erreurs presente partout, et bonne fidelite aux specs. Le code est lisible, bien structure, et les patterns sont consistants.

Cependant, un bug bloquant empeche l'edition des biens et realisations existants (endpoints manquants), et plusieurs ecarts avec les specs necessitent correction avant mise en production.

**Conditions pour GO** :
1. Corriger le P0 : ajouter les endpoints GET /api/admin/properties/:id et GET /api/admin/projects/:id
2. Corriger les P1 documentes ci-dessous

---

## Problemes P0 (bloquants)

### P0-1 : Endpoints GET single-item manquants pour l'edition admin

**Fichier** : `versi-immobilier/server.js`
**Impact** : L'edition de biens et realisations existants est completement cassee.

**Detail** :
- `AdminBienForm.jsx:63` appelle `adminFetch('/api/admin/properties/${id}')` pour charger un bien en mode edition.
- `AdminRealisationForm.jsx:52` appelle `adminFetch('/api/admin/projects/${id}')` pour charger une realisation.
- **Aucun de ces deux endpoints n'existe dans server.js.**
- Le serveur n'a que `GET /api/admin/properties` (liste complete) et `GET /api/admin/projects` (liste complete).
- Les requetes tombent dans le SPA fallback (ligne 1083) qui renvoie du HTML, ce qui fait echouer le parsing JSON dans `adminFetch`.
- Resultat : l'utilisateur voit "Erreur de chargement du bien." a chaque tentative d'edition.

**Correction requise** : ajouter dans server.js :
```javascript
// GET /api/admin/properties/:id
app.get('/api/admin/properties/:id', checkAdminAuth, async (req, res) => {
  // Retourner { property: {...}, photos: [...] }
});

// GET /api/admin/projects/:id
app.get('/api/admin/projects/:id', checkAdminAuth, async (req, res) => {
  // Retourner { project: {...}, photos: [...] }
});
```
**IMPORTANT** : ces routes doivent etre declarees AVANT les routes `PUT /api/admin/properties/:id` et les PATCH pour eviter les conflits Express. Placer apres la route GET liste et avant POST.

**Note** : les specs (section 3.3/3.6) ne definissent pas explicitement un GET single-item admin, mais la section 4.4 (wireframe formulaire) indique "champs pre-remplis (edition)" ce qui implique necessairement un endpoint de chargement unitaire.

---

## Problemes P1 (importants)

### P1-1 : price_num non requis dans la validation frontend (ecart spec)

**Fichier** : `src/admin/AdminBienForm.jsx:173`
**Spec** : Section 4.4 — "Champs obligatoires (*) : title, city, location, type, surface, price, **price_num**, description"
**Code** : `const required = ['title', 'city', 'location', 'type', 'surface', 'price', 'description']` — price_num absent.
**Impact** : Un bien peut etre cree sans prix numerique, ce qui casse le tri/filtre cote public.
**Correction** : ajouter `'price_num'` au tableau `required` ligne 173 ET valider que c'est un nombre.

### P1-2 : Validation server-side ne verifie pas price_num

**Fichier** : `versi-immobilier/server.js:401`
**Spec** : price_num est defini comme INTEGER dans le schema SQL.
**Code** : le serveur ne verifie pas que `price_num` est present ni qu'il est numerique. Il est insere directement via `price_num || null`. Un client pourrait envoyer `"price_num": "abc"` et provoquer une erreur PostgreSQL.
**Correction** : ajouter une validation `if (price_num && isNaN(Number(price_num)))` et inclure `price_num` dans les champs requis serveur.

### P1-3 : Pas de confirmation de succes visible apres creation/edition dans les formulaires

**Fichier** : `src/admin/AdminBienForm.jsx:234` et `AdminRealisationForm.jsx:184`
**Spec** : Section 4.8 — Etat "Succes" du formulaire : "Redirection vers /admin/biens + message 'Bien enregistre'"
**Code** : Le code redirige vers la liste (`navigate('/admin/biens')`) mais ne transmet pas de message de succes. Le toast de succes dans `AdminBiens.jsx` n'est declenche que par les actions locales (archiver, supprimer), pas par un retour depuis le formulaire.
**Impact** : L'utilisateur ne sait pas si l'enregistrement a fonctionne (la redirection seule est ambigue).
**Correction** : passer un state via `navigate('/admin/biens', { state: { success: 'Bien enregistre' } })` et le lire dans AdminBiens avec `useLocation`.

### P1-4 : Notifications email envoyees lors de restauration mais specs partiellement couvertes

**Fichier** : `versi-immobilier/server.js:549`
**Spec** : Section 7.2 — la notification est declenchee quand un bien est restaure vers 'disponible'. PASS.
**Probleme** : L'envoi est synchrone dans le handler PATCH (le `sendPropertyNotification` est appele avec `await` implicite mais pas `await`e -- c'est un fire-and-forget car pas de `await`). Bien. MAIS : si l'envoi echoue pour tous les emails, aucun log n'alerte l'admin. L'admin ne sait pas si les inscrits ont ete notifies.
**Correction** : Mineur en V1, mais ajouter un log recapitulatif `console.log('[NOTIF] X emails envoyes sur Y inscrits')`.

### P1-5 : Endpoint DELETE subscribers supprime au lieu de desactiver

**Fichier** : `versi-immobilier/server.js:945`
**Spec** : Section 7.5 — "suppression manuelle par l'admin". La spec dit suppression, le code fait `DELETE FROM subscribers` (suppression physique).
**Probleme** : La table a un champ `active` (boolean) qui suggere une desactivation logique (soft delete). Le code fait un hard delete. Si un inscrit se reinscrit apres suppression admin, il reapparait (ON CONFLICT DO NOTHING) mais avec `active = true` (defaut). Coherent avec la spec section 7.1, mais le champ `active` est inutilise.
**Impact** : Faible en V1. Le champ `active` est une dette technique mineure.
**Correction** : Soit utiliser `UPDATE subscribers SET active = false` au lieu de DELETE, soit supprimer le champ `active` du schema pour eviter la confusion.

---

## Problemes P2 (mineurs)

### P2-1 : Photo upload en parallele (Promise.all) risque de surcharger le serveur

**Fichier** : `src/admin/AdminBienForm.jsx:226` et `AdminRealisationForm.jsx:176`
**Detail** : `Promise.all(newPhotos.map(...))` envoie toutes les photos simultanement. Avec 10 photos de 5 Mo chacune, cela represente 50 Mo envoyes en parallele. Le body parser Express est configure a 10 Mo (`express.json({ limit: '10mb' })`).
**Impact** : Chaque photo est envoyee dans une requete separee (OK), mais l'upload parallele peut saturer la connexion. Peu probable en V1 (< 10 photos).
**Correction** : Envisager un envoi sequentiel pour les photos (boucle for...of au lieu de Promise.all).

### P2-2 : Libelles techniques dans le select statut des realisations

**Fichier** : `src/admin/AdminBienForm.jsx:369`
**Detail** : Le select de statut des biens affiche les valeurs brutes (`disponible`, `archive`, `vendu`) sans label humain.
**Correction** : Utiliser les STATUT_LABELS pour les options du select.

### P2-3 : Le champ `sort_order` n'est pas exposé dans les formulaires admin

**Fichier** : `src/admin/AdminBienForm.jsx` et `AdminRealisationForm.jsx`
**Spec** : Les tables ont un champ `sort_order` (ordre d'affichage). Le backend l'accepte dans POST/PUT.
**Code** : Aucun champ `sort_order` dans les formulaires admin. L'ordre est par defaut 0 pour toutes les nouvelles entrees.
**Impact** : L'admin ne peut pas controler l'ordre d'affichage des biens/realisations depuis l'interface. Mineur en V1 (< 10 entrees).

### P2-4 : Variable `success` inutilisee dans AdminRealisationForm

**Fichier** : `src/admin/AdminRealisationForm.jsx`
**Detail** : Pas de state `success` declare (contrairement a AdminBienForm qui a `success` mais ne l'utilise jamais non plus apres redirection). Code mort potentiel.

### P2-5 : fileToBase64 duplique dans AdminBienForm et AdminRealisationForm

**Fichier** : `src/admin/AdminBienForm.jsx:37-44` et `src/admin/AdminRealisationForm.jsx:27-34`
**Detail** : La meme fonction utilitaire `fileToBase64` est copiee dans les deux fichiers.
**Correction** : Extraire dans un fichier utilitaire commun `src/admin/utils.js`.

### P2-6 : La grille admin n'a pas de responsive pour les tableaux

**Fichier** : `src/admin/admin.css`
**Detail** : Les tableaux ne sont pas scrollables horizontalement sur mobile. La media query a 640px gere les formulaires mais pas les tableaux.
**Impact** : Faible -- l'admin est utilise principalement sur desktop par 3 utilisateurs.

### P2-7 : Pas de `successMsg` toast dans AdminRealisations (contrairement a AdminBiens)

**Fichier** : `src/admin/AdminRealisations.jsx`
**Detail** : `AdminRealisations` a un state `successMsg` et un toast (via `showSuccess`), ce qui est coherent avec AdminBiens. PASS. Fausse alerte.

---

## Critere 1 — Conformite aux specs (endpoints, champs, user stories)

**Note : 7 / 10**

### Endpoints API — comparaison spec vs code

| Endpoint spec | Present dans server.js | Conforme | Notes |
|---|---|---|---|
| POST /api/admin/login | Oui (L229) | PASS | Body, reponse, 401, 429 conformes |
| POST /api/admin/logout | Oui (L256) | PASS | |
| GET /api/admin/me | Oui (L268) | PASS | |
| GET /api/public/properties | Oui (L277) | PASS | Query param status, filtre 'all' |
| GET /api/public/properties/:id | Oui (L299) | PASS | Retourne property + photos |
| GET /api/admin/properties | Oui (L380) | PASS | Tous statuts |
| POST /api/admin/properties | Oui (L393) | PASS | Validation, slug, notification |
| PUT /api/admin/properties/:id | Oui (L446) | PASS | Update partiel |
| PATCH .../archive | Oui (L505) | PASS | |
| PATCH .../vendu | Oui (L522) | PASS | |
| PATCH .../restaurer | Oui (L539) | PASS | Avec notification |
| DELETE /api/admin/properties/:id | Oui (L559) | PASS | Cascade via FK |
| GET .../properties/:id/photos | Oui (L577) | PASS | |
| POST .../properties/:id/photos | Oui (L591) | PASS | Validation mime, taille, data prefix |
| DELETE .../photos/:photoId | Oui (L635) | PASS | |
| PATCH .../photos/reorder | Oui (L652) | PASS | Transaction |
| GET /api/public/projects | Oui (L317) | PASS | |
| GET /api/public/projects/:id | Oui (L339) | PASS | |
| GET /api/admin/projects | Oui (L683) | PASS | |
| POST /api/admin/projects | Oui (L696) | PASS | |
| PUT /api/admin/projects/:id | Oui (L738) | PASS | |
| PATCH .../projects/:id/archive | Oui (L789) | PASS | |
| DELETE /api/admin/projects/:id | Oui (L806) | PASS | |
| GET .../projects/:id/photos | Oui (L824) | PASS | |
| POST .../projects/:id/photos | Oui (L838) | PASS | |
| DELETE .../projects/photos/:photoId | Oui (L882) | PASS | |
| PATCH .../projects/photos/reorder | Oui (L898) | PASS | |
| POST /api/public/subscribe | Oui (L357) | PASS | |
| GET /api/admin/subscribers | Oui (L930) | PASS | |
| DELETE /api/admin/subscribers/:id | Oui (L943) | PASS | |

**Endpoints conformes : 30/30** -- tous les endpoints des specs sont implementes.

### Ecarts constates

1. **GET /api/admin/properties/:id et GET /api/admin/projects/:id manquants** (P0-1) -- non specifies explicitement dans les specs mais implicitement requis par l'UI d'edition.
2. **price_num non valide comme requis** (P1-1, P1-2) -- spec dit obligatoire, code ne le requiert pas.
3. **Champs SQL** : le schema init-db.js est fidele a 100% aux specs (section 2). PASS.
4. **Triggers updated_at** : presents et idempotents. PASS.
5. **Validation DPE** : enum A-G ou null. PASS.
6. **Validation photo** : data:image prefix, mime_type, size_bytes <= 5Mo, reponse 413. PASS.
7. **Email subscriber** : regex conforme a la spec. PASS.
8. **Session** : UUID v4, duree 8h, cron nettoyage toutes les 30min. PASS.

---

## Critere 2 — Coherence API / Frontend (noms de champs, endpoints appeles)

**Note : 6 / 10**

### Endpoints appeles par le frontend admin

| Composant | Appel | Endpoint serveur | Match |
|---|---|---|---|
| AdminLogin.jsx:25 | POST /api/admin/login | L229 | PASS |
| AdminLayout.jsx:11 | POST /api/admin/logout | L256 | PASS |
| AdminBiens.jsx:38 | GET /api/admin/properties | L380 | PASS |
| AdminBiens.jsx:53 | DELETE /api/admin/properties/:id | L559 | PASS |
| AdminBiens.jsx:63-65 | PATCH archive/vendu/restaurer | L505/522/539 | PASS |
| **AdminBienForm.jsx:63** | **GET /api/admin/properties/:id** | **MANQUANT** | **FAIL (P0-1)** |
| AdminBienForm.jsx:213 | PUT /api/admin/properties/:id | L446 | PASS |
| AdminBienForm.jsx:218 | POST /api/admin/properties | L393 | PASS |
| AdminBienForm.jsx:227 | POST .../photos | L591 | PASS |
| AdminBienForm.jsx:160 | DELETE .../photos/:photoId | L635 | PASS |
| AdminRealisations.jsx:38 | GET /api/admin/projects | L683 | PASS |
| AdminRealisations.jsx:53 | DELETE /api/admin/projects/:id | L806 | PASS |
| AdminRealisations.jsx:64 | PATCH .../archive | L789 | PASS |
| AdminRealisations.jsx:75 | PUT .../projects/:id (status) | L738 | PASS |
| **AdminRealisationForm.jsx:52** | **GET /api/admin/projects/:id** | **MANQUANT** | **FAIL (P0-1)** |
| AdminRealisationForm.jsx:163 | PUT /api/admin/projects/:id | L738 | PASS |
| AdminRealisationForm.jsx:168 | POST /api/admin/projects | L696 | PASS |
| AdminRealisationForm.jsx:177 | POST .../photos | L838 | PASS |
| AdminRealisationForm.jsx:123 | DELETE .../photos/:photoId | L882 | PASS |
| AdminInscrits.jsx:18 | GET /api/admin/subscribers | L930 | PASS |
| AdminInscrits.jsx:31 | DELETE /api/admin/subscribers/:id | L943 | PASS |

**Score : 19/21 PASS** -- 2 FAIL critiques (endpoints manquants pour l'edition).

### Noms de champs -- coherence API body vs frontend form

Le frontend admin utilise des noms snake_case (`nearby_transport`, `price_num`, `buy_price`) qui correspondent directement aux colonnes PostgreSQL. L'API accepte ces memes noms. **Coherence parfaite** entre frontend admin et API.

Le frontend admin **ne fait PAS** de mapping camelCase → snake_case (contrairement aux hooks publics). C'est correct car l'admin travaille directement avec le schema BDD.

---

## Critere 3 — Coherence frontend admin / public (hooks retournent les bons champs)

**Note : 9 / 10**

### Hooks publics -- mapping snake_case → camelCase

Les hooks publics (`useProperties`, `useProperty`, `useProjects`, `useProject`) font un mapping correct des noms de colonnes PostgreSQL (snake_case) vers les noms camelCase attendus par les composants React publics existants :

| Champ API (snake_case) | Champ mappe (camelCase) | Hook |
|---|---|---|
| price_num | priceNum | useProperties, useProperty |
| price_note | priceNote | useProperties, useProperty |
| nearby_transport | nearbyTransport | useProperties, useProperty |
| nearby_amenities | nearbyAmenities | useProperties, useProperty |
| dpe_note | dpeNote | useProperties, useProperty |
| renovation_year | renovationYear | useProperties, useProperty |
| sort_order | sortOrder | useProperties, useProperty, useProjects, useProject |
| buy_price | buyPrice | useProjects, useProject |
| works_amount | worksAmount | useProjects, useProject |
| sell_price | sellPrice | useProjects, useProject |
| offer_delay | offerDelay | useProjects, useProject |
| signature_delay | signatureDelay | useProjects, useProject |

**Tous les champs sont mappes correctement.** PASS.

Les hooks conservent aussi les champs originaux snake_case via le spread `...p`, donc les deux formes sont disponibles. Bon choix pour la retrocompatibilite.

### Gestion d'erreurs des hooks

- `useProperties` : loading + error states, gestion 404 implicite (vide). PASS.
- `useProperty` : gestion explicite du 404 (`r.status === 404` → null sans erreur). PASS.
- `useProjects` : identique a useProperties. PASS.
- `useProject` : gestion explicite du 404. PASS.

### Point d'attention

- Les hooks ne gerent pas le cas ou l'API retourne une reponse HTML (SPA fallback) au lieu de JSON. Si le serveur Express a un probleme de routing, `r.json()` echouera sans message clair. Impact faible (le catch generique affichera "Erreur").
- Le `encodeURIComponent` est utilise sur les parametres (status, id). Bonne pratique.

---

## Critere 4 — Securite (injection SQL, XSS, validation server-side, tokens)

**Note : 8 / 10**

### Injection SQL

**Toutes les requetes utilisent des parametres ($1, $2, ...).** Aucune concatenation de chaine dans les requetes SQL. Verification exhaustive :
- POST/PUT properties : parametres numerotes ($1-$25). PASS.
- POST/PUT projects : parametres numerotes. PASS.
- PATCH archive/vendu/restaurer : parametre $1 pour l'id. PASS.
- DELETE : parametre $1. PASS.
- Photos : parametres. PASS.
- Subscribe : parametre $1. PASS.
- PUT dynamique (L468-491) : les noms de colonnes sont filtres via `allowedFields` (whitelist), pas injectes depuis l'input. PASS.

**Score injection SQL : 10/10**

### XSS

- `escapeHtml()` est utilisee dans les emails HTML (notification, contact, sell). PASS.
- Les donnees renvoyees en JSON ne sont pas echappees (normal -- le JSON est consomme par le frontend React qui echappe nativement). PASS.
- Le champ `data` (base64 des photos) est insere tel quel en BDD et renvoye tel quel. Le frontend l'utilise dans `<img src={photo.data}>`. Un attaquant pourrait potentiellement injecter du contenu non-image dans le champ `data`. La validation `data.startsWith('data:image/')` est une protection minimale mais contournable (un payload XSS pourrait commencer par `data:image/` suivi de contenu malveillant). **Risque faible** car le champ est utilise comme attribut `src` d'un `<img>`, pas injecte dans du HTML brut.

**Score XSS : 8/10** (protection correcte, risque residuel faible)

### Validation server-side

| Validation | Present | Conforme spec |
|---|---|---|
| Champs requis property (title, city, location, type, surface, price, description) | Oui (L401) | PASS (sauf price_num manquant -- P1-2) |
| Champs requis project (title, city, type, surface, description) | Oui (L703) | PASS |
| Enum status property | Oui (L406-408) | PASS |
| Enum status project | Oui (L708-710) | PASS |
| Enum DPE | Oui (L411-412) | PASS |
| Photo data prefix | Oui (L607) | PASS |
| Photo mime_type whitelist | Oui (L598-600) | PASS |
| Photo size_bytes max 5Mo | Oui (L603-604) | PASS -- mais `if (size_bytes && ...)` permet de contourner en omettant le champ |
| Email regex subscriber | Oui (L359) | PASS |

**Faille** : La validation photo `size_bytes` est contournable (P1 potentiel). Si le client envoie une requete sans `size_bytes`, le serveur ne verifie pas la taille. Le `data` (base64) peut alors depasser 5 Mo. La limite Express de 10 Mo (`express.json({ limit: '10mb' })`) est la seule protection.

### Tokens et sessions

- Token genere via `crypto.randomUUID()` -- PASS (UUID v4 cryptographiquement sur).
- Stockage en BDD avec expiration (8h). PASS.
- Middleware `checkAdminAuth` verifie existence + non-expiration. PASS.
- Cron de nettoyage des sessions expirees (30 min). PASS.
- Rate limiting login : 10 tentatives/IP/heure avec reponse 429 + Retry-After. PASS.
- Mot de passe lu depuis `process.env.ADMIN_PASSWORD`, pas hardcode. PASS.

### Point d'attention securite

- Le `ProtectedRoute.jsx` ne verifie que localement (localStorage). Si le token a ete invalide cote serveur (expiration manuelle), l'utilisateur voit l'admin pendant quelques secondes avant que la premiere requete API retourne 401 et force la deconnexion via `adminFetch`. Comportement acceptable en V1 (3 utilisateurs de confiance).

---

## Critere 5 — Gestion d'erreurs (API + frontend)

**Note : 8 / 10**

### Gestion d'erreurs API (server.js)

Chaque endpoint est enveloppe dans un try/catch avec :
- Log `console.error` avec le contexte (`[API]`, `[AUTH]`, `[NOTIF]`). PASS.
- Reponse JSON structuree `{ ok: false, error: 'message' }`. PASS.
- Codes HTTP corrects : 400 (validation), 401 (auth), 404 (not found), 413 (trop lourd), 429 (rate limit), 500 (interne). PASS.
- Aucun endpoint ne peut planter le serveur (pas de throw non-catche). PASS.

### Gestion d'erreurs Frontend admin

| Composant | Loading | Erreur | Vide | Retry |
|---|---|---|---|---|
| AdminBiens | "Chargement..." | "Erreur de chargement" + bouton Reessayer | "Aucun bien. Ajoutez le premier." | Oui |
| AdminBienForm | "Chargement..." | Message rouge | N/A | Non (pas de retry) |
| AdminRealisations | "Chargement..." | "Erreur de chargement" + bouton Reessayer | "Aucune realisation. Ajoutez la premiere." | Oui |
| AdminRealisationForm | "Chargement..." | Message rouge | N/A | Non (pas de retry) |
| AdminInscrits | "Chargement..." | "Erreur de chargement" + bouton Reessayer | "Aucun inscrit pour l'instant." | Oui |
| AdminLogin | "Connexion..." | Message rouge sous le champ | N/A | Non (relance manuelle) |

**Conformite spec section 4.8 (5 etats UI)** :
- Login : Defaut PASS, Loading PASS, Erreur PASS, Succes PASS (redirection). Vide N/A.
- Liste biens : 5 etats presents. PASS.
- Formulaire bien : Defaut PASS, Loading PASS, Erreur PASS, Succes PARTIEL (redirection sans message -- P1-3).
- Upload photo : Erreur affichee ("depasse 5 Mo", "format non supporte"). PASS.
- Liste inscrits : 5 etats presents. PASS.

### adminFetch -- gestion globale 401

Le wrapper `adminFetch.js` intercepte le 401 et redirige vers `/admin/login` en nettoyant le localStorage. Bon pattern. Il gere aussi les reponses non-JSON (`r.json().catch()`). PASS.

### Points d'amelioration

- Les formulaires n'ont pas de bouton "Reessayer" en cas d'erreur de chargement (contrairement aux listes). Mineur.
- Les `alert()` pour les erreurs d'action (archiver, supprimer) pourraient etre remplaces par des toasts. Mineur.

---

## Critere 6 — Completude (toutes les user stories implementees ?)

**Note : 7 / 10**

### User stories vs implementation

| User Story | Statut | Notes |
|---|---|---|
| US-BO-01 : Se connecter | PASS | Login, token, localStorage, redirection, rate limiting |
| US-BO-02 : Se deconnecter | PASS | Logout serveur + nettoyage localStorage |
| US-BO-03 : Voir la liste des biens | PASS | Tableau avec filtres par statut, pastilles colorees |
| US-BO-04 : Ajouter un bien | PASS | Formulaire complet avec tous les champs, upload photos |
| US-BO-05 : Modifier un bien | **FAIL** | Endpoint GET single-item manquant (P0-1) |
| US-BO-06 : Archiver un bien | PASS | PATCH /archive |
| US-BO-07 : Marquer un bien vendu | PASS | PATCH /vendu |
| US-BO-08 : Restaurer un bien | PASS | PATCH /restaurer + notification email |
| US-BO-09 : Supprimer un bien | PASS | DELETE avec confirmation dialog |
| US-BO-10 : Gerer les photos | PASS | Upload, suppression, reorder API (mais reorder UI pas dans l'interface -- drag & drop absent) |
| US-BO-11 : Voir les realisations | PASS | Tableau avec filtres, colonne Featured |
| US-BO-12 : Ajouter une realisation | PASS | Formulaire complet |
| US-BO-13 : Modifier une realisation | **FAIL** | Endpoint GET single-item manquant (P0-1) |
| US-BO-14 : Archiver une realisation | PASS | PATCH /archive |
| US-BO-15 : Supprimer une realisation | PASS | DELETE avec confirmation |
| US-BO-16 : Voir les inscrits | PASS | Tableau avec total, date formatee |
| US-BO-17 : Supprimer un inscrit | PASS | DELETE avec confirmation |
| US-BO-18 : Inscription publique | PASS | POST /api/public/subscribe |
| US-BO-19 : Notification nouveau bien | PASS | Envoi async aux inscrits actifs |
| US-BO-20 : Migration donnees statiques | PASS | Script migrate-seed.js fonctionnel |
| US-BO-21 : Schema BDD | PASS | Script init-db.js idempotent |

**Score : 19/21 user stories PASS** (2 FAIL lies au meme bug P0-1)

### Fonctionnalites presentes mais non specifiees

- **Terminer une realisation** : `AdminRealisations.jsx:73-84` permet de passer le statut de `in-progress` a `completed` via PUT. Non specifie dans les specs (section 3.6 ne mentionne pas de PATCH /terminer), mais implementation via PUT generique. Acceptable.
- **Photo reorder API** : les endpoints PATCH /photos/reorder existent dans l'API mais l'UI admin ne propose pas de drag & drop pour reordonner les photos. Le reorder est une API orpheline en V1.

---

## Critere 7 — Qualite du code (duplication, patterns)

**Note : 7 / 10**

### Points positifs

1. **Pattern adminFetch centralise** : un seul wrapper pour toutes les requetes admin, avec gestion globale du 401 et du JSON parsing. Excellent pattern.
2. **Separation des responsabilites** : db.js isole, server.js structure par sections claires avec commentaires delimiteurs. Bonne lisibilite.
3. **Composants admin isoles** dans `src/admin/` -- pas de melange avec le frontend public.
4. **Hooks publics propres** : pattern identique pour les 4 hooks, mapping clair, gestion 404.
5. **CSS bien organise** : fichier unique `admin.css` avec conventions de nommage coherentes (`.admin-*`, `.status-*`).
6. **Init-db.js idempotent** : `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, verification trigger `pg_trigger`. Excellent.

### Duplication

1. **fileToBase64** duplique dans `AdminBienForm.jsx` et `AdminRealisationForm.jsx` (P2-5). Devrait etre dans un fichier utilitaire commun.
2. **Pattern photo management** (handlePhotoSelect, removeNewPhoto, handleDeleteExistingPhoto) duplique entre les deux formulaires. Le code est quasiment identique (~50 lignes). Candidat pour un hook custom `usePhotoManager`.
3. **Pattern formulaire** (loading, saving, error, handleChange, validate, handleSubmit) est similaire entre les deux formulaires. Acceptable en V1 (2 formulaires seulement), mais un refactoring en hook `useAdminForm` pourrait reduire la duplication.

### Patterns API server.js

- Les handlers CRUD suivent un pattern consistant : validation → query → reponse. PASS.
- La construction dynamique du UPDATE (PUT properties/projects) avec whitelist de champs et parametres indexes est un bon pattern securise. PASS.
- Les transactions sont utilisees pour les operations multi-requetes (reorder photos, migration). PASS.

### Points d'amelioration

1. **Pas de validation TypeScript** : tout est en JS vanilla. Acceptable pour un admin interne V1, mais les bugs de typage sont possibles.
2. **Pas de constantes partagees** : les valeurs d'enum (statuts, types, DPE) sont definies en dur dans le frontend et dans le serveur sans fichier commun. Un changement d'enum necessiterait des modifications a 2-3 endroits.
3. **Le server.js fait 1093 lignes** : un decoupage en routes modulaires (routes/admin.js, routes/public.js) ameliorerait la maintenabilite. Acceptable en V1.

---

## Critere 8 — Integration avec le projet global

**Note : 8 / 10**

### Integration frontend public ↔ API

Les hooks publics (`useProperties`, `useProperty`, `useProjects`, `useProject`) remplacent les imports statiques des fichiers `properties.js` et `projects.js`. Le mapping camelCase assure la retrocompatibilite avec les composants React existants qui attendent des noms camelCase (ex: `priceNum`, `buyPrice`).

**Coherence avec l'architecture existante** :
- Les hooks suivent le meme pattern que le code existant (useState/useEffect, pas de librairie tierce). PASS.
- La spec section 9.2 recommande exactement ce pattern. PASS.
- Le fallback en cas d'erreur API (section 9.3 spec : "Les biens seront bientot disponibles") n'est pas explicitement implemente dans les hooks -- les composants consommateurs doivent gerer l'etat `error` eux-memes. Acceptable mais a verifier dans les pages consommatrices.

### Integration BDD

- `db.js` exporte un pool pg configure avec `DATABASE_URL` (variable Replit). PASS.
- Le pool est robuste : max 10 connexions, timeout connexion 5s, cleanup idle 30s, handler d'erreur. PASS.
- Le script `init-db.js` est idempotent et peut etre re-execute sans risque. PASS.
- Le script `migrate-seed.js` utilise ON CONFLICT DO NOTHING pour l'idempotence. PASS.

### Integration email (Resend)

- Le serveur degradation gracieuse si `RESEND_API_KEY` absent (warn au demarrage, endpoints contact/sell retournent 503). PASS.
- La notification email utilise `escapeHtml` pour les donnees du bien. PASS.
- Le template email est conforme a la spec section 7.3 (sujet, corps, lien, mention desinscription). PASS.

### Integration routing SPA

- Le SPA fallback (`app.get('/{*splat}')`) est en derniere position. PASS.
- Les routes API (`/api/*`) sont definies avant le fallback. PASS.
- **Attention** : le fallback attrape aussi les requetes GET vers des endpoints API inexistants (comme le P0-1) et retourne du HTML au lieu de 404 JSON. Ce n'est pas un probleme pour les endpoints existants mais masque les erreurs pour les endpoints manquants.

### Integration avec le design system Versi

Le CSS admin utilise une palette neutre (noir/blanc/gris) coherente avec le ton de marque Versi : "Confiant, direct, zero blabla, premium par la substance, pas flashy". Typographie systeme, pas de fioritures. PASS.

### Migration des donnees statiques

Le script `migrate-seed.js` mappe correctement les noms camelCase des fichiers statiques vers les noms snake_case de la BDD (ex: `p.nearbyTransport` → colonne `nearby_transport`). PASS.

---

## Synthese des notes

| # | Critere | Note /10 | Commentaire cle |
|---|---|---|---|
| 1 | Conformite aux specs | 7 | 30/30 endpoints spec, mais GET single-item admin implicitement requis et manquant |
| 2 | Coherence API / Frontend | 6 | 19/21 appels corrects, 2 FAIL critiques (edition cassee) |
| 3 | Coherence admin / public | 9 | Mapping camelCase parfait, hooks robustes |
| 4 | Securite | 8 | Zero injection SQL, bon rate limiting, validation photo contournable (size_bytes) |
| 5 | Gestion d'erreurs | 8 | 5 etats UI quasi-complets, adminFetch centralise, message succes manquant |
| 6 | Completude | 7 | 19/21 user stories, edition cassee, photo reorder API sans UI |
| 7 | Qualite du code | 7 | Bons patterns, duplication acceptable V1, pas de TypeScript |
| 8 | Integration projet global | 8 | Retrocompatibilite hooks, BDD robuste, email degrade gracieusement |

**Note globale : 7.5 / 10** (moyenne ponderee : criteres 2 et 6 ont plus de poids car ils contiennent le bug P0)

**Note arrondie : 7.4 / 10** (le P0 empeche l'edition, soit 2/6 des workflows CRUD admin)

---

## Top 3 corrections prioritaires

1. **P0-1** : Ajouter `GET /api/admin/properties/:id` et `GET /api/admin/projects/:id` dans server.js. Sans cela, l'edition de biens et realisations est completement cassee. Correction estimee : 20 lignes de code, 10 minutes.

2. **P1-1 + P1-2** : Ajouter `price_num` aux validations requises (frontend + serveur). Un bien sans prix numerique casse le tri/filtre du site public.

3. **P1-3** : Ajouter un message de succes apres creation/edition (navigation state ou toast). L'admin n'a actuellement aucun feedback de succes apres un enregistrement.

---

## Verdict final

**GO CONDITIONNEL** — Le back office est solide dans son architecture et sa securite. Le bug P0-1 (endpoints GET single-item manquants) est trivial a corriger (20 lignes). Une fois corrige, le back office est operationnel pour les 3 fondateurs. Les P1 et P2 sont des ameliorations souhaitables mais non bloquantes pour un usage interne V1.
