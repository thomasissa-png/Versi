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

<!-- Section remplie en Edit -->

---

## 4. Pages admin — Wireframes textuels

<!-- Section remplie en Edit -->

---

## 5. Authentification

<!-- Section remplie en Edit -->

---

## 6. Upload photos — Approche recommandée

<!-- Section remplie en Edit -->

---

## 7. Notifications email

<!-- Section remplie en Edit -->

---

## 8. Migration des données statiques

<!-- Section remplie en Edit -->

---

## 9. Impact frontend — Composants publics

<!-- Section remplie en Edit -->

---

## 10. User stories

<!-- Section remplie en Edit -->

---

## 11. Handoff → @fullstack

<!-- Section remplie en Edit -->
