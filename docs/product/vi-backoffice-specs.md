# Specs fonctionnelles — Back office admin versi-immobilier.fr

**Agent** : @product-manager
**Date** : 2026-04-10
**Version** : 1.0
**Statut** : Draft — prêt pour @fullstack

---

## 1. Vue d'ensemble

Le back office admin de versi-immobilier.fr permet aux 3 fondateurs (Thomas, Maxime, Carl) de gérer les biens en vente et les réalisations (projets) directement depuis une interface web protégée par mot de passe, sans manipulation de fichiers JS ni redéploiement. Les données basculent de fichiers statiques JS vers une base PostgreSQL Replit. Les photos sont stockées en base64 dans la BDD (approche recommandée — voir section 6). Un mécanisme d'inscription et de notification email informe les inscrits quand un nouveau bien est publié.

---

## 2. Modèle de données — Schéma SQL

### 2.1 Table `properties` (biens en vente)

```sql
CREATE TABLE properties (
  id               TEXT PRIMARY KEY,                  -- slug kebab-case ex: appartement-t3-lille
  title            TEXT NOT NULL,
  city             TEXT NOT NULL,
  location         TEXT NOT NULL,                     -- "Lille, Hauts-de-France"
  neighborhood     TEXT,
  address          TEXT,
  nearby_transport TEXT,
  nearby_amenities TEXT,
  type             TEXT NOT NULL,                     -- "Appartement", "Local mixte", etc.
  surface          TEXT NOT NULL,                     -- "68 m²"
  rooms            INTEGER,
  price            TEXT NOT NULL,                     -- "185 000 €" (affichage)
  price_num        INTEGER,                           -- 185000 (tri/filtre)
  price_note       TEXT,
  status           TEXT NOT NULL DEFAULT 'disponible', -- 'disponible' | 'archive' | 'vendu'
  dpe              TEXT,                              -- lettre A-G
  dpe_note         TEXT,
  floor            TEXT,
  tenancy          TEXT,                              -- "Libre" | "Loué"
  renovation_year  TEXT,
  charges          TEXT,
  description      TEXT NOT NULL,
  works            JSONB DEFAULT '[]',                -- ["Réfection électricité", ...]
  features         JSONB DEFAULT '[]',                -- ["Parquet massif", ...]
  sort_order       INTEGER DEFAULT 0,                 -- ordre d'affichage
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 Table `property_photos` (photos des biens)

```sql
CREATE TABLE property_photos (
  id           SERIAL PRIMARY KEY,
  property_id  TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  data         TEXT NOT NULL,    -- base64 dataURL : "data:image/jpeg;base64,..."
  filename     TEXT NOT NULL,    -- nom d'origine ex: salon.jpg
  mime_type    TEXT NOT NULL,    -- "image/jpeg" | "image/png" | "image/webp"
  size_bytes   INTEGER,          -- taille fichier original en octets
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_property_photos_property_id ON property_photos(property_id);
```

### 2.3 Table `projects` (réalisations)

```sql
CREATE TABLE projects (
  id               TEXT PRIMARY KEY,                  -- slug kebab-case
  title            TEXT NOT NULL,
  city             TEXT NOT NULL,
  type             TEXT NOT NULL,                     -- "Immeuble de rapport", "Actif mixte", etc.
  surface          TEXT NOT NULL,                     -- "450 m²"
  units            INTEGER,                           -- nb de lots
  status           TEXT NOT NULL DEFAULT 'completed', -- 'completed' | 'in-progress' | 'archive'
  buy_price        TEXT,                              -- "380 000 €"
  works_amount     TEXT,                              -- "120 000 €"
  sell_price       TEXT,                              -- "620 000 €" (null si en cours)
  offer_delay      INTEGER,                           -- jours (offre ferme)
  signature_delay  INTEGER,                           -- jours (signature acte)
  duration         TEXT,                              -- "8 mois"
  description      TEXT NOT NULL,
  featured         BOOLEAN DEFAULT false,
  sort_order       INTEGER DEFAULT 0,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.4 Table `project_photos` (photos des réalisations)

```sql
CREATE TABLE project_photos (
  id          SERIAL PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  data        TEXT NOT NULL,
  filename    TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_project_photos_project_id ON project_photos(project_id);
```

### 2.5 Table `subscribers` (inscrits aux notifications)

```sql
CREATE TABLE subscribers (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active      BOOLEAN DEFAULT true
);

CREATE INDEX idx_subscribers_email ON subscribers(email);
```

### 2.6 Table `admin_sessions` (sessions admin)

```sql
CREATE TABLE admin_sessions (
  id          TEXT PRIMARY KEY,           -- UUID v4 généré server-side
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  ip          TEXT
);

CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);
```

### 2.7 Triggers — updated_at automatique

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 3. API REST — Tableau des endpoints

Tous les endpoints `/api/admin/*` nécessitent l'en-tête `Authorization: Bearer <session_id>` (sauf `/api/admin/login`).
Les endpoints `/api/public/*` sont accessibles sans authentification.

### 3.1 Authentification

| Méthode | URL | Body (JSON) | Réponse succès | Réponse erreur |
|---|---|---|---|---|
| POST | `/api/admin/login` | `{ password: "allezpsg" }` | `200 { ok: true, token: "<uuid>", expiresAt: "<ISO>" }` | `401 { ok: false, error: "Mot de passe incorrect" }` |
| POST | `/api/admin/logout` | — | `200 { ok: true }` | `401 { ok: false, error: "Non authentifié" }` |
| GET | `/api/admin/me` | — | `200 { ok: true, authenticated: true }` | `401 { ok: false, error: "Session expirée" }` |

### 3.2 Biens — Lecture publique

| Méthode | URL | Query params | Réponse succès |
|---|---|---|---|
| GET | `/api/public/properties` | `?status=disponible\|archive\|vendu\|all` | `200 { properties: [...] }` — sans les photos (perf) |
| GET | `/api/public/properties/:id` | — | `200 { property: {...}, photos: [...] }` — avec les photos |

### 3.3 Biens — CRUD admin

| Méthode | URL | Body (JSON) | Réponse succès | Notes |
|---|---|---|---|---|
| GET | `/api/admin/properties` | — | `200 { properties: [...] }` — toutes les entrées (tous statuts) | |
| POST | `/api/admin/properties` | Objet bien complet (sans id — généré server-side) | `201 { ok: true, property: { id, ...} }` | Déclenche notification email si status='disponible' |
| PUT | `/api/admin/properties/:id` | Objet bien modifié (champs partiels autorisés) | `200 { ok: true, property: {...} }` | |
| PATCH | `/api/admin/properties/:id/archive` | — | `200 { ok: true }` | Passe status à 'archive' |
| PATCH | `/api/admin/properties/:id/vendu` | — | `200 { ok: true }` | Passe status à 'vendu' |
| PATCH | `/api/admin/properties/:id/restaurer` | — | `200 { ok: true }` | Passe status à 'disponible' |
| DELETE | `/api/admin/properties/:id` | — | `200 { ok: true }` | Suppression définitive — cascade photos |

### 3.4 Photos biens — CRUD admin

| Méthode | URL | Body | Réponse succès | Notes |
|---|---|---|---|---|
| GET | `/api/admin/properties/:id/photos` | — | `200 { photos: [...] }` | |
| POST | `/api/admin/properties/:id/photos` | `{ data: "<base64>", filename: "...", mime_type: "...", size_bytes: N }` | `201 { ok: true, photo: { id, ... } }` | Validation taille max 5 Mo |
| DELETE | `/api/admin/properties/:propertyId/photos/:photoId` | — | `200 { ok: true }` | |
| PATCH | `/api/admin/properties/:id/photos/reorder` | `{ order: [id1, id2, ...] }` | `200 { ok: true }` | Réordonne les photos |

### 3.5 Réalisations — Lecture publique

| Méthode | URL | Query params | Réponse succès |
|---|---|---|---|
| GET | `/api/public/projects` | `?status=completed\|in-progress\|all` | `200 { projects: [...] }` — sans les photos |
| GET | `/api/public/projects/:id` | — | `200 { project: {...}, photos: [...] }` |

### 3.6 Réalisations — CRUD admin

| Méthode | URL | Body (JSON) | Réponse succès | Notes |
|---|---|---|---|---|
| GET | `/api/admin/projects` | — | `200 { projects: [...] }` | Tous statuts |
| POST | `/api/admin/projects` | Objet réalisation complet | `201 { ok: true, project: { id, ... } }` | |
| PUT | `/api/admin/projects/:id` | Objet réalisation modifié | `200 { ok: true, project: {...} }` | |
| PATCH | `/api/admin/projects/:id/archive` | — | `200 { ok: true }` | Passe status à 'archive' |
| DELETE | `/api/admin/projects/:id` | — | `200 { ok: true }` | |

### 3.7 Photos réalisations — CRUD admin

Identique à 3.4 mais avec `/api/admin/projects/:id/photos` et `/api/admin/projects/:projectId/photos/:photoId`.

### 3.8 Inscrits aux notifications

| Méthode | URL | Body (JSON) | Réponse succès | Notes |
|---|---|---|---|---|
| POST | `/api/public/subscribe` | `{ email: "..." }` | `200 { ok: true }` | Visible sur le site public |
| GET | `/api/admin/subscribers` | — | `200 { subscribers: [...], total: N }` | |
| DELETE | `/api/admin/subscribers/:id` | — | `200 { ok: true }` | Désinscription admin |

### 3.9 Corps des requêtes — Schémas détaillés

**POST /api/admin/properties — request body :**
```json
{
  "title": "Appartement T3 rénové — Lille",
  "city": "Lille",
  "location": "Lille, Hauts-de-France",
  "neighborhood": "Moulins",
  "address": "10 rue des Muguets, 59000 Lille",
  "nearby_transport": "Métro Porte de Douai (5 min)",
  "nearby_amenities": "Écoles, commerces, parc Jean-Baptiste Lebas",
  "type": "Appartement",
  "surface": "68 m²",
  "rooms": 3,
  "price": "185 000 €",
  "price_num": 185000,
  "price_note": "Prix net vendeur — frais de notaire en sus (~14 800 €)",
  "status": "disponible",
  "dpe": "D",
  "dpe_note": "Estimation charges énergétiques : ~900 €/an",
  "floor": "2e étage",
  "tenancy": "Libre",
  "renovation_year": "2024",
  "charges": "120 €/mois",
  "description": "...",
  "works": ["Réfection complète électricité", "Salle de bains neuve"],
  "features": ["Parquet massif", "Double vitrage"]
}
```

**POST /api/admin/projects — request body :**
```json
{
  "title": "Lille — Immeuble de rapport",
  "city": "Lille",
  "type": "Immeuble de rapport",
  "surface": "450 m²",
  "units": 6,
  "status": "completed",
  "buy_price": "380 000 €",
  "works_amount": "120 000 €",
  "sell_price": "620 000 €",
  "offer_delay": 5,
  "signature_delay": 45,
  "duration": "8 mois",
  "description": "...",
  "featured": true
}
```

### 3.10 Règles de validation server-side

| Champ | Règle |
|---|---|
| `id` (property/project) | Généré server-side : slugify(title) + suffixe aléatoire 4 chars si collision |
| `status` property | Enum strict : `disponible`, `archive`, `vendu` |
| `status` project | Enum strict : `completed`, `in-progress`, `archive` |
| `dpe` | Enum : A, B, C, D, E, F, G ou null |
| photo `data` | Doit commencer par `data:image/` |
| photo `size_bytes` | Max 5 242 880 (5 Mo) — refus avec 413 |
| photo `mime_type` | `image/jpeg`, `image/png`, `image/webp` uniquement |
| `email` subscriber | Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| Session token | UUID v4, durée 8h, suppression auto via cron |

---

## 4. Pages admin — Wireframes textuels

L'admin est une SPA React accessible via `/admin`. Pas de lib CSS admin — du CSS inline ou un fichier `admin.css` minimaliste suffit. Fond blanc, typographie système, tableaux HTML natifs.

### 4.1 Page de connexion `/admin/login`

```
+--------------------------------------------------+
|           VERSI IMMOBILIER — Admin               |
|                                                  |
|  Mot de passe :  [__________________________]   |
|                                                  |
|                  [ Se connecter ]                |
|                                                  |
|  [Message d'erreur si mauvais mdp]               |
+--------------------------------------------------+
```

**Comportement :**
- Champ password (type="password")
- Soumission → POST /api/admin/login → stockage du token en localStorage
- Si token déjà présent et valide → redirection directe vers /admin/biens
- Erreur 401 → message "Mot de passe incorrect" sous le champ

### 4.2 Layout admin (post-connexion)

```
+--------------------------------------------------+
|  Versi Admin  |  Biens  |  Réalisations  | Inscrits | [Déconnexion]  |
+--------------------------------------------------+
|                                                  |
|  [contenu de la section active]                  |
|                                                  |
+--------------------------------------------------+
```

Navigation horizontale avec 3 sections : Biens, Réalisations, Inscrits.

### 4.3 Section Biens `/admin/biens`

```
+--------------------------------------------------+
|  BIENS EN VENTE                    [+ Ajouter]   |
+--------------------------------------------------+
| Filtre : [Tous ▼]  [Disponibles ▼]  [Archivés ▼] |
+--------------------------------------------------+
| Titre           | Ville    | Prix      | Statut | Actions |
|-----------------|----------|-----------|--------|---------|
| Appt T3 rénové  | Lille    | 185 000 € | DISPO  | [Edit][Archive][Vendu] |
| Appt T2 terr.   | Tourcoing| 120 000 € | DISPO  | [Edit][Archive][Vendu] |
| Local pro.      | Tourcoing|  95 000 € | DISPO  | [Edit][Archive][Vendu] |
| Appt T4 familial| Lille    | 245 000 € | VENDU  | [Edit][Restaurer]      |
+--------------------------------------------------+
```

**Statuts affichés** : pastille colorée — vert DISPONIBLE, gris ARCHIVÉ, noir VENDU.
**Actions disponibles selon statut** :
- DISPONIBLE → [Éditer] [Archiver] [Marquer vendu]
- ARCHIVÉ → [Éditer] [Restaurer] [Supprimer]
- VENDU → [Éditer] [Restaurer]

### 4.4 Formulaire ajout/édition bien `/admin/biens/nouveau` et `/admin/biens/:id/editer`

```
+--------------------------------------------------+
|  AJOUTER UN BIEN / MODIFIER UN BIEN              |
+--------------------------------------------------+
| Titre*        [________________________________] |
| Ville*        [________________________________] |
| Localisation* [________________________________] |
| Quartier      [________________________________] |
| Adresse       [________________________________] |
| Transports    [________________________________] |
| Commodités    [________________________________] |
|                                                  |
| Type*         [Appartement ▼]                    |
| Surface*      [______] m²                        |
| Pièces        [______]                           |
| Étage         [________________________________] |
| Situation loc.[Libre ▼]   Occup. : Loué          |
| Année rénov.  [______]                           |
| Charges       [______] €/mois                    |
|                                                  |
| Prix affiché* [________________________________] |
| Prix numérique[______]  (pour le tri)            |
| Note de prix  [________________________________] |
| DPE           [D ▼]                              |
| Note DPE      [________________________________] |
|                                                  |
| Statut        [disponible ▼]                     |
|                                                  |
| Description*  [                              ]   |
|               [   (textarea 6 lignes)        ]   |
|                                                  |
| Travaux réalisés                                 |
|  [Ajouter un item +]                             |
|  • Réfection complète électricité  [Suppr.]      |
|  • Salle de bains neuve            [Suppr.]      |
|                                                  |
| Équipements                                      |
|  [Ajouter un item +]                             |
|  • Parquet massif                  [Suppr.]      |
|                                                  |
| Photos                                           |
|  [Choisir des fichiers]  (max 5 Mo/photo)        |
|  [Aperçu 1] [Aperçu 2] [Suppr.]                  |
|                                                  |
|     [Annuler]   [Enregistrer]                    |
+--------------------------------------------------+
```

**Champs obligatoires** (marqués *) : title, city, location, type, surface, price, price_num, description.
**Upload photos** : input type="file" multiple, accept="image/jpeg,image/png,image/webp". Conversion en base64 côté client avant POST.

### 4.5 Section Réalisations `/admin/realisations`

```
+--------------------------------------------------+
|  RÉALISATIONS                       [+ Ajouter]  |
+--------------------------------------------------+
| Filtre : [Tous ▼]  [Terminées ▼]  [En cours ▼]  |
+--------------------------------------------------+
| Titre                    | Ville  | Statut  | Actions          |
|--------------------------|--------|---------|------------------|
| Lille — Immeuble rapport | Lille  | TERMINÉ | [Edit][Archive]  |
| Tourcoing — Actif mixte  | Tourcoing | TERMINÉ | [Edit][Archive] |
| Roubaix — Maison         | Roubaix| EN COURS| [Edit][Terminer][Archive] |
| Valenciennes — Immeuble  | Valenciennes | TERMINÉ | [Edit][Archive] |
+--------------------------------------------------+
```

### 4.6 Formulaire ajout/édition réalisation

```
+--------------------------------------------------+
|  AJOUTER UNE RÉALISATION / MODIFIER              |
+--------------------------------------------------+
| Titre*        [________________________________] |
| Ville*        [________________________________] |
| Type*         [Immeuble de rapport ▼]            |
| Surface*      [______] m²                        |
| Nb de lots    [______]                           |
| Statut        [completed ▼]                      |
| Mise en avant [x] Afficher en Featured           |
|                                                  |
| Prix d'achat  [________________________________] |
| Coût travaux  [________________________________] |
| Prix de vente [________________________________] |
|               (laisser vide si en cours)         |
| Délai offre   [______] jours                     |
| Délai signature[______] jours                   |
| Durée opérat. [________________________________] |
|                                                  |
| Description*  [                              ]   |
|               [   (textarea 6 lignes)        ]   |
|                                                  |
| Photos                                           |
|  [Choisir des fichiers]  (max 5 Mo/photo)        |
|  [Aperçu 1] [Suppr.]                             |
|                                                  |
|     [Annuler]   [Enregistrer]                    |
+--------------------------------------------------+
```

### 4.7 Section Inscrits `/admin/inscrits`

```
+--------------------------------------------------+
|  INSCRITS AUX NOTIFICATIONS                      |
+--------------------------------------------------+
| Total : 42 inscrits actifs                       |
+--------------------------------------------------+
| Email                      | Date inscription | Actions |
|----------------------------|------------------|---------|
| jean.dupont@gmail.com      | 10/04/2026       | [Suppr.] |
| marie.martin@yahoo.fr      | 09/04/2026       | [Suppr.] |
+--------------------------------------------------+
```

**Pas de pagination en V1** — liste complète (prévu < 1000 inscrits initialement).

### 4.8 États UI par écran

| Écran | Défaut | Loading | Vide | Erreur | Succès |
|---|---|---|---|---|---|
| Login | Formulaire vide, focus sur le champ | Bouton désactivé "Connexion..." | N/A | Message rouge "Mot de passe incorrect" | Redirection /admin/biens |
| Liste biens | Tableau avec données | Skeleton 4 lignes | "Aucun bien. Ajoutez le premier." + bouton Ajouter | "Erreur de chargement. Réessayer." | N/A |
| Formulaire bien | Champs vides (ajout) ou pré-remplis (édition) | Bouton désactivé "Enregistrement..." | N/A | Messages de validation sous chaque champ invalide | Redirection vers /admin/biens + message "Bien enregistré" |
| Upload photo | Dropzone "Choisir des fichiers" | Aperçu avec spinner | Dropzone vide | "Fichier trop lourd (max 5 Mo)" ou "Format non supporté" | Aperçu de la photo dans la grille |
| Liste inscrits | Tableau avec données | Skeleton | "Aucun inscrit pour l'instant." | "Erreur de chargement." | N/A |

---

## 5. Authentification

### Mécanisme choisi : mot de passe partagé + session token

**Justification** : 3 utilisateurs connus, mot de passe partagé imposé par le fondateur. Pas de gestion de comptes individuels. Approche la plus simple et la plus rapide à implémenter.

### Flux complet

```
1. Admin ouvre /admin → React vérifie localStorage["vi_admin_token"]
   → Token absent ou expiré → redirection /admin/login
   → Token présent → GET /api/admin/me → token valide → accès accordé

2. Admin soumet le formulaire de connexion avec "allezpsg"
   → POST /api/admin/login { password }
   → Server compare avec process.env.ADMIN_PASSWORD (valeur : "allezpsg")
   → Génère un UUID v4 comme session token
   → INSERT dans admin_sessions (id, expires_at = NOW() + 8h)
   → Répond { ok: true, token, expiresAt }
   → Client stocke token dans localStorage["vi_admin_token"]
   → Redirection vers /admin/biens

3. Chaque requête admin envoie :
   Authorization: Bearer <token>
   → Middleware Express : vérifie existence + non-expiration dans admin_sessions
   → Si invalide : 401 → client redirige vers /admin/login

4. Déconnexion :
   → POST /api/admin/logout avec le token
   → DELETE FROM admin_sessions WHERE id = token
   → Client supprime localStorage["vi_admin_token"]
   → Redirection vers /admin/login
```

### Variables d'environnement requises

| Variable | Valeur | Notes |
|---|---|---|
| `ADMIN_PASSWORD` | `allezpsg` | Ne jamais hardcoder dans le code — lire depuis process.env |
| `DATABASE_URL` | Fournie par Replit | Connexion PostgreSQL |
| `RESEND_API_KEY` | Existant | Déjà configuré |
| `CONTACT_EMAIL` | Existant | Déjà configuré |

### Sécurité

- Le mot de passe n'est JAMAIS exposé côté client ni dans les logs
- Le token de session expire après 8h — nettoyage via cron `setInterval` (comme le rate limiting existant)
- Route `/admin` dans React Router : wrapper `<ProtectedRoute>` qui vérifie le token avant de rendre la page
- Le slug `/admin` est réservé — le SPA fallback Express NE doit PAS servir `index.html` pour `/api/*`
- Rate limiting sur `/api/admin/login` : max 10 tentatives par IP par heure (réutiliser le mécanisme existant)

---

## 6. Upload photos — Approche recommandée

### Analyse des options

| Option | Avantages | Inconvénients | Verdict |
|---|---|---|---|
| Filesystem Replit (`/uploads/`) | Simple à coder | Les fichiers sont PERDUS à chaque redéploiement Replit — inutilisable | ÉCARTÉ |
| Base64 en BDD PostgreSQL | Persistant, zéro dépendance externe, cohérent avec DATABASE_URL | Taille BDD plus grande, pas adapté si >100 photos / >5 Mo chacune | RETENU pour V1 |
| Cloudinary (service externe) | Optimisation automatique, CDN, transformations | Dépendance externe, compte à créer, clé API supplémentaire | FALLBACK si BDD > 1 Go |

### Approche retenue : base64 en PostgreSQL

**Raison principale** : le filesystem Replit est éphémère — les fichiers uploadés disparaissent au redéploiement. PostgreSQL Replit persiste les données. Avec un parc de 4-8 biens actifs et 5-10 photos par bien, le volume total reste raisonnable (< 50 Mo en base64).

### Implémentation côté client

```javascript
// Conversion base64 avant envoi
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // "data:image/jpeg;base64,..."
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

### Validation côté client (avant envoi)

- Format accepté : `image/jpeg`, `image/png`, `image/webp`
- Taille max : 5 Mo par fichier (vérification `file.size <= 5242880`)
- Message d'erreur si dépassement : "Ce fichier dépasse 5 Mo. Compressez l'image avant l'upload."

### Validation côté serveur

- Vérifier que `data` commence par `data:image/`
- Vérifier `mime_type` dans la liste autorisée
- Vérifier `size_bytes <= 5242880`
- Réponse 413 si trop lourd

### Exposition des photos au frontend public

Les endpoints `/api/public/properties/:id` et `/api/public/projects/:id` retournent les photos avec leur champ `data` (base64). Le composant React affiche directement `<img src={photo.data} />`.

### Plan de migration vers Cloudinary (si nécessaire)

Si la BDD dépasse 1 Go ou si les performances se dégradent (temps de réponse > 2s sur les pages bien), migrer les photos vers Cloudinary :
1. Ajouter variable `CLOUDINARY_URL` dans Replit
2. Modifier les endpoints photo pour uploader vers Cloudinary et stocker uniquement l'URL publique en base
3. Les champs `data` deviennent des URLs (`https://res.cloudinary.com/...`)
4. Le frontend n'a pas à changer (src={photo.data} reste valide)

---

## 7. Notifications email

### 7.1 Inscription aux notifications (côté site public)

Un widget d'inscription est ajouté sur le site public versi-immobilier.fr (emplacement recommandé : en dessous de la section biens disponibles ou dans le footer).

**Formulaire public :**
```
Restez informé des nouveaux biens disponibles
[Votre email ________________] [Je m'inscris]
```

**Flow :**
1. Utilisateur saisit son email → POST /api/public/subscribe { email }
2. Server valide le format email
3. INSERT INTO subscribers (email) ON CONFLICT (email) DO NOTHING (désinscription → réinscription silencieuse)
4. Réponse 200 { ok: true }
5. Affichage confirmation : "Vous serez notifié à l'arrivée du prochain bien."

### 7.2 Déclenchement de la notification

La notification est déclenchée automatiquement par le serveur quand :
- Un nouveau bien est créé via POST /api/admin/properties **avec status = 'disponible'**
- Un bien est restauré de 'archive' ou 'vendu' vers 'disponible' via PATCH /api/admin/properties/:id/restaurer

Elle n'est PAS déclenchée pour :
- Les modifications de biens existants (édition de description, prix, etc.)
- La création avec status = 'archive' (bien préparé mais pas encore publié)

### 7.3 Template email de notification

**Sujet** : `[Versi Immobilier] Nouveau bien disponible — {title}`

**Corps HTML :**
```
Bonjour,

Un nouveau bien vient d'être mis en vente sur Versi Immobilier.

[TITRE DU BIEN]
Ville : [VILLE]
Surface : [SURFACE]
Prix : [PRIX]

[Voir ce bien → lien direct vers /bien/:id]

---
Vous recevez cet email car vous vous êtes inscrit aux alertes biens
de versi-immobilier.fr.
Pour vous désinscrire, répondez à cet email avec "STOP".
```

### 7.4 Implémentation technique

```javascript
// Dans le handler POST /api/admin/properties et PATCH /restaurer
async function sendPropertyNotification(property) {
  const subscribers = await db.query(
    'SELECT email FROM subscribers WHERE active = true'
  );
  
  if (subscribers.rows.length === 0) return;
  
  // Resend ne supporte pas les envois en masse natifs en V1
  // Envoi séquentiel avec délai (max 2 emails/s sur plan gratuit Resend)
  for (const { email } of subscribers.rows) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `[Versi Immobilier] Nouveau bien disponible — ${property.title}`,
      html: buildNotificationHtml(property),
    });
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms entre chaque envoi
  }
}
```

**Limite V1** : envoi séquentiel avec délai 500ms. Pour 100 inscrits → 50 secondes d'envoi côté serveur. Exécution en arrière-plan (répondre 201 immédiatement, envoyer les emails en async). Si la liste dépasse 500 inscrits, migrer vers Resend Broadcast ou une queue Redis.

### 7.5 Gestion des désinscrits

En V1 : suppression manuelle par l'admin depuis la section Inscrits (/admin/inscrits). Pas de lien de désinscription automatique dans l'email (complexité inutile pour un démarrage). L'admin répond aux demandes de désinscription reçues par email.

---

## 8. Migration des données statiques

### 8.1 Stratégie : migration par script one-shot

Les données actuelles dans `properties.js`, `projects.js` et `testimonials.js` sont migrées via un script Node.js exécuté une seule fois. Ce script n'a pas à être beau — il doit juste fonctionner.

### 8.2 Script de migration `scripts/migrate-seed.js`

```javascript
// scripts/migrate-seed.js
// Exécuter une seule fois : node scripts/migrate-seed.js
import pg from 'pg';
import { PROPERTIES } from '../versi-immobilier/src/config/properties.js';
import { PROJECTS } from '../versi-immobilier/src/config/projects.js';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Migration des biens
    for (const p of PROPERTIES) {
      await client.query(`
        INSERT INTO properties (
          id, title, city, location, neighborhood, address,
          nearby_transport, nearby_amenities, type, surface, rooms,
          price, price_num, price_note, status, dpe, dpe_note,
          floor, tenancy, renovation_year, charges, description,
          works, features, sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
                  $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
        ON CONFLICT (id) DO NOTHING
      `, [
        p.id, p.title, p.city, p.location, p.neighborhood, p.address,
        p.nearbyTransport, p.nearbyAmenities, p.type, p.surface, p.rooms,
        p.price, p.priceNum, p.priceNote, p.status, p.dpe, p.dpeNote,
        p.floor, p.tenancy, p.renovationYear, p.charges, p.description,
        JSON.stringify(p.works || []), JSON.stringify(p.features || []),
        PROPERTIES.indexOf(p)
      ]);
    }

    // Migration des projets
    for (const proj of PROJECTS) {
      await client.query(`
        INSERT INTO projects (
          id, title, city, type, surface, units, status,
          buy_price, works_amount, sell_price, offer_delay,
          signature_delay, duration, description, featured, sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (id) DO NOTHING
      `, [
        proj.id, proj.title, proj.city, proj.type, proj.surface, proj.units,
        proj.status, proj.buyPrice, proj.worksAmount, proj.sellPrice,
        proj.offerDelay, proj.signatureDelay, proj.duration, proj.description,
        proj.featured, PROJECTS.indexOf(proj)
      ]);
    }

    await client.query('COMMIT');
    console.log('Migration terminée avec succès.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur migration :', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
```

### 8.3 Ordre d'exécution migration

1. Créer les tables (script SQL section 2 — à exécuter dans le REPL PostgreSQL Replit)
2. Exécuter `node scripts/migrate-seed.js`
3. Vérifier les données : `SELECT count(*) FROM properties;` → attendu 4 / `SELECT count(*) FROM projects;` → attendu 4
4. Une fois validé, les fichiers statiques `properties.js` et `projects.js` restent dans le repo mais **ne sont plus importés** dans les composants React (voir section 9)

### 8.4 `testimonials.js` — pas de migration en V1

Les témoignages sont des données stables, peu susceptibles de changer. Ils restent dans le fichier statique en V1. Pas de table testimonials ni d'interface admin pour les témoignages. Si besoin, à ajouter en V2.

### 8.5 `contact.js` — inchangé

Configuration contact (email, téléphone) reste dans le fichier statique. Pas d'interface admin pour ça en V1.

---

## 9. Impact frontend — Composants publics

### 9.1 Composants à modifier

| Composant | Modification requise |
|---|---|
| `src/pages/AvailablePropertiesPage.jsx` (ou équivalent) | Remplacer `import { PROPERTIES }` par un appel `GET /api/public/properties?status=disponible` |
| `src/pages/PropertyDetailPage.jsx` | Remplacer l'import statique par `GET /api/public/properties/:id` |
| Composant sections réalisations (homepage + page dédiée) | Remplacer `import { PROJECTS }` par `GET /api/public/projects` |
| Footer ou section "Alertes" | Ajouter le widget d'inscription (POST /api/public/subscribe) |

### 9.2 Pattern de data fetching à adopter

Utiliser un custom hook React simple (pas de lib comme React Query — stack existante sans nouvelle dépendance lourde) :

```javascript
// src/hooks/useProperties.js
import { useState, useEffect } from 'react';

export function useProperties(status = 'disponible') {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/properties?status=${status}`)
      .then(r => r.json())
      .then(data => {
        setProperties(data.properties);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [status]);

  return { properties, loading, error };
}
```

Même pattern pour `useProperty(id)`, `useProjects()`, `useProject(id)`.

### 9.3 Gestion de la régression — fallback statique

Pendant la migration, les fichiers `properties.js` et `projects.js` restent dans le repo. Si l'API ne répond pas (DATABASE_URL non configuré), le comportement doit être :
- Affichage d'un message d'erreur sur la page biens : "Les biens seront bientôt disponibles."
- Ne pas afficher de données vides comme si le portefeuille était vide

### 9.4 SEO et rendu côté serveur

Le site est une SPA React (pas de SSR). Les données ne sont pas pré-rendues. Impact SEO : les biens ne seront pas indexés par Google dans la version SPA actuelle. Ce point est accepté en V1 — le site versi-immobilier.fr n'a pas d'objectif SEO fort (trafic principalement direct via réseau). Si le SEO devient un enjeu, la migration vers Next.js est à envisager en V2.

### 9.5 Routing React — nouvelles routes à ajouter

```javascript
// App.jsx ou équivalent — routes à ajouter au router existant
<Route path="/admin/login" element={<AdminLogin />} />
<Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
  <Route index element={<Navigate to="biens" />} />
  <Route path="biens" element={<AdminBiens />} />
  <Route path="biens/nouveau" element={<AdminBienForm />} />
  <Route path="biens/:id/editer" element={<AdminBienForm />} />
  <Route path="realisations" element={<AdminRealisations />} />
  <Route path="realisations/nouveau" element={<AdminRealisationForm />} />
  <Route path="realisations/:id/editer" element={<AdminRealisationForm />} />
  <Route path="inscrits" element={<AdminInscrits />} />
</Route>
```

### 9.6 Composant `ProtectedRoute`

```javascript
// src/admin/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }) {
  const token = localStorage.getItem('vi_admin_token');
  const expiresAt = localStorage.getItem('vi_admin_expires');
  
  if (!token || !expiresAt || new Date(expiresAt) < new Date()) {
    localStorage.removeItem('vi_admin_token');
    localStorage.removeItem('vi_admin_expires');
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
}
```

---

## 10. User stories

<!-- Section remplie en Edit -->

---

## 11. Handoff → @fullstack

<!-- Section remplie en Edit -->
