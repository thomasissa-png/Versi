# Systeme de gates de validation des articles de blog — versi-immobilier.fr

> Produit par @qa | Date : 2026-04-13
> References lues : `docs/strategy/vi-blog-autonomous-pipeline.md` (sections 5-6), `versi-immobilier/server.js` (endpoints blog admin), `versi-immobilier/scripts/init-db.js` (schema blog_articles)
> Usage : ce document est la specification technique du systeme de gates qui BLOQUE la publication d'un article tant que toutes les gates ne sont pas PASS. @fullstack lit ce fichier pour implementer.

---

## Sommaire

1. [Architecture technique](#1-architecture-technique)
2. [Schema de donnees](#2-schema-de-donnees)
3. [Taxonomie des gates](#3-taxonomie-des-gates)
4. [Endpoints API](#4-endpoints-api)
5. [Flow de validation](#5-flow-de-validation)
6. [Gate runner — implementation](#6-gate-runner--implementation)
7. [Specs admin UI](#7-specs-admin-ui)
8. [Handoff](#8-handoff)

---

## 1. Architecture technique

### 1.1 Principe

Le gate system est un middleware de validation qui s'intercale entre l'edition d'un article et sa publication. Aucun article ne peut passer en status `published` sans que 100% des gates BLOQUANT soient PASS et 100% des gates REQUIS soient PASS.

### 1.2 Vue schematique

```
                    ARTICLE (draft)
                         |
                         v
              [POST /api/admin/blog/:id/validate]
                         |
                         v
                  +------+------+
                  |             |
                  v             v
           GATES AUTO      GATES IA
           (V1-V22)     (GE-*, GS-*)
           regex/count   appel Claude
                  |             |
                  v             v
              +---+-------------+---+
              |                     |
              v                     v
        gate_results           gate_results
        JSONB update           JSONB update
              |                     |
              +----------+----------+
                         |
                         v
               GATES HUMAINES (GH-*)
               fondateur valide/refuse
               via PATCH /gates/:gateId
                         |
                         v
              +----------+----------+
              |                     |
              v                     v
        ALL PASS              >= 1 FAIL
              |                     |
              v                     v
   PATCH /publish          403 — publication
   autorise                bloquee + detail
```

### 1.3 Types de gates

Le systeme unifie les gates de 4 agents sous un namespace unique :

| Prefixe | Agent source     | Type d'execution | Exemples       |
|---------|------------------|-------------------|----------------|
| `V`     | @seo             | Automatique (regex/count) | V1-V22 |
| `GE`    | @copywriter      | IA (appel Claude)  | GE-1 a GE-N   |
| `GS`    | @creative-strategy | IA (appel Claude) | GS-1 a GS-N  |
| `GP`    | @persona         | IA (appel Claude)  | GP-1 a GP-N   |
| `GH`    | Fondateur        | Humain (override manuel) | GH-1 a GH-N |

### 1.4 Principes d'architecture

1. **Extensible** : ajouter une gate = ajouter une entree dans le registre `GATE_REGISTRY` (objet JS). Zero changement de schema BDD, zero changement d'API.
2. **Idempotent** : relancer `POST /validate` sur le meme article recalcule toutes les gates auto et IA, ecrase les resultats precedents. Les overrides humains sont preserves sauf reset explicite.
3. **Atomique** : le `PATCH /publish` lit `gate_results` au moment de l'execution. Pas de cache, pas de resultat obsolete.
4. **Auditable** : chaque execution de gate stocke le timestamp, le resultat, et le detail. Historique complet dans `gate_results`.

---

## 2. Schema de donnees

### 2.1 Evolution de la table `blog_articles`

La table actuelle a ce schema :

```sql
-- Existant (init-db.js)
blog_articles (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  excerpt       TEXT NOT NULL,
  content       TEXT NOT NULL,
  cover_image   TEXT,
  author        TEXT NOT NULL DEFAULT 'Equipe Versi',
  tags          JSONB DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'draft',
  published_at  TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

**Colonnes a ajouter** :

```sql
ALTER TABLE blog_articles
  ADD COLUMN IF NOT EXISTS gate_results JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS gate_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (gate_status IN ('pending', 'running', 'pass', 'fail', 'override')),
  ADD COLUMN IF NOT EXISTS gate_last_run TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS gate_run_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS brief_json JSONB;
```

**Explication des colonnes** :

| Colonne | Type | Objectif |
|---------|------|----------|
| `gate_results` | JSONB | Resultat detaille de chaque gate (voir 2.2) |
| `gate_status` | TEXT | Verdict global : `pending` (jamais execute), `running` (en cours), `pass` (toutes gates OK), `fail` (>= 1 gate KO), `override` (fondateur a force la publication malgre des FAIL) |
| `gate_last_run` | TIMESTAMPTZ | Timestamp de la derniere execution des gates |
| `gate_run_count` | INTEGER | Nombre de fois que les gates ont ete executees sur cet article |
| `brief_json` | JSONB | Brief JSON hydrate (necessaire pour les checks V4-V22 qui lisent le brief) |

### 2.2 Structure du champ `gate_results`

Le champ JSONB `gate_results` contient un objet ou chaque cle est l'identifiant de la gate :

```json
{
  "V1": {
    "pass": true,
    "label": "Mots interdits absents",
    "detail": null,
    "type": "auto",
    "agent": "seo",
    "classe": "BLOQUANT",
    "ran_at": "2026-04-13T10:30:00Z"
  },
  "V16": {
    "pass": false,
    "label": "Donnees chiffrees sourcees",
    "detail": "2 chiffre(s) potentiellement sans source",
    "type": "auto",
    "agent": "seo",
    "classe": "REQUIS",
    "ran_at": "2026-04-13T10:30:00Z"
  },
  "GE-1": {
    "pass": true,
    "label": "Ton conforme a la brand voice",
    "detail": "Score IA : 9/10",
    "type": "ia",
    "agent": "copywriter",
    "classe": "BLOQUANT",
    "ran_at": "2026-04-13T10:31:15Z"
  },
  "GH-1": {
    "pass": true,
    "label": "Validation fondateur",
    "detail": "Approuve par Thomas le 2026-04-13",
    "type": "human",
    "agent": "fondateur",
    "classe": "BLOQUANT",
    "override": true,
    "overridden_by": "thomas",
    "overridden_at": "2026-04-13T14:00:00Z",
    "ran_at": "2026-04-13T14:00:00Z"
  }
}
```

### 2.3 Contraintes d'integrite

```sql
-- Le status 'published' ne peut etre atteint que si gate_status = 'pass' ou 'override'
-- Cette contrainte est enforced cote applicatif (endpoint PATCH /publish), pas en CHECK SQL,
-- car le CHECK SQL ne peut pas lire conditionnellement gate_results.
-- L'endpoint est le SEUL chemin de publication.

-- Index pour requetes admin (lister les articles par gate_status)
CREATE INDEX IF NOT EXISTS idx_blog_articles_gate_status ON blog_articles(gate_status);
```

### 2.4 Migration SQL complete

```sql
-- Migration: add_gate_system_to_blog_articles
-- Date: 2026-04-13
-- Description: Ajoute le systeme de gates de validation

ALTER TABLE blog_articles
  ADD COLUMN IF NOT EXISTS gate_results JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS gate_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (gate_status IN ('pending', 'running', 'pass', 'fail', 'override')),
  ADD COLUMN IF NOT EXISTS gate_last_run TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS gate_run_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS brief_json JSONB;

CREATE INDEX IF NOT EXISTS idx_blog_articles_gate_status ON blog_articles(gate_status);

-- Les articles deja publies sont marques comme 'override' pour ne pas les bloquer retroactivement
UPDATE blog_articles SET gate_status = 'override' WHERE status = 'published';
```

---

## 3. Taxonomie des gates

### 3.1 Classification par classe

Chaque gate est soit BLOQUANT (publication impossible si FAIL) soit REQUIS (publication deconseilee mais overridable par fondateur).

### 3.2 Gates SEO (V1-V22) — agent @seo — type `auto`

Toutes automatiques, executees par regex/comptage sur le contenu de l'article et le brief JSON.

| Gate | Label | Classe | Methode |
|------|-------|--------|---------|
| V1 | Mots interdits absents | BLOQUANT | Regex sur liste noire |
| V2 | Zero point d'exclamation | BLOQUANT | Regex `!` |
| V3 | Vouvoiement systematique | BLOQUANT | Regex tutoiement |
| V4 | Requete cible dans H1 | BLOQUANT | String match H1 vs brief.seo.main_query |
| V5 | Requete cible dans chapeau | BLOQUANT | String match paragraphe 1 |
| V6 | Requete cible dans >= 2 H2 | BLOQUANT | Count match H2 |
| V7 | Longueur dans fourchette +-10% | REQUIS | Count mots vs brief.editorial.word_count_target |
| V8 | Nombre de H2 conforme (3-5) | REQUIS | Count `## ` |
| V9 | CTA present avec bonne URL | BLOQUANT | Regex sur CTA URL |
| V10 | Liens internes presents | REQUIS | Regex slugs articles cibles |
| V11 | Slug conforme au format | BLOQUANT | Regex `/blog/[a-z0-9-]+` |
| V12 | Frontmatter YAML complet | BLOQUANT | Parse YAML |
| V13 | Zero placeholder residuel | BLOQUANT | Regex `\{\{[A-Z_]+\}\}` |
| V14 | Paragraphes <= 5 lignes | REQUIS | Count lignes par paragraphe |
| V15 | Premier paragraphe sans intro molle | REQUIS | Regex formules interdites |
| V16 | Donnees chiffrees sourcees | REQUIS | Regex (semi-auto, flag NLP) |
| V17 | Meta title <= 60 caracteres | BLOQUANT | brief.seo.meta_title.length |
| V18 | Meta description <= 155 caracteres | BLOQUANT | brief.seo.meta_description.length |
| V19 | Canonical present | BLOQUANT | Parse YAML frontmatter |
| V20 | image_alt contient requete cible | REQUIS | Parse YAML + string match |
| V21 | Lien vers >= 1 page transactionnelle | REQUIS | Regex site_links dans l'article |
| V22 | Schema.org BlogPosting complet | BLOQUANT | Parse YAML champs obligatoires |

### 3.3 Gates editoriales (GE-*) — agent @copywriter — type `ia`

Executees par appel Claude. Chaque gate est evaluee par un prompt specialise qui retourne un score 1-10 et un verdict PASS/FAIL (seuil 7/10 minimum).

| Gate | Label | Classe | Prompt d'evaluation |
|------|-------|--------|---------------------|
| GE-1 | Ton conforme a la brand voice | BLOQUANT | "Evalue si le ton de cet article respecte la brand voice Versi : confiant, direct, zero blabla, premium par la substance. Score 1-10." |
| GE-2 | Zero formule generique IA | BLOQUANT | "Detecte les formules typiques de contenu genere par IA (en conclusion, il est important de noter, ainsi, en effet). Liste chaque occurrence." |
| GE-3 | Valeur actionnable pour le lecteur | REQUIS | "Le lecteur repart-il avec au moins 1 information concrete et actionnable ? Score 1-10." |
| GE-4 | Coherence argumentaire | REQUIS | "La structure argumentaire est-elle logique du debut a la fin ? Pas de saut logique, pas de contradiction interne. Score 1-10." |
| GE-5 | Chapeau accrocheur | REQUIS | "Le premier paragraphe donne-t-il envie de lire la suite ? Pas de banalite, pas de definition Wikipedia. Score 1-10." |

### 3.4 Gates strategiques (GS-*) — agent @creative-strategy — type `ia`

Executees par appel Claude. Verifient l'alignement avec la strategie editoriale de Versi Immobilier.

| Gate | Label | Classe | Prompt d'evaluation |
|------|-------|--------|---------------------|
| GS-1 | Alignement persona cible | BLOQUANT | "Cet article s'adresse-t-il clairement au persona {{persona}} avec son vocabulaire et ses preoccupations ? Score 1-10." |
| GS-2 | Positionnement Versi visible | REQUIS | "Versi Immobilier est-il positionne comme operateur credible et competent dans cet article, sans autopromotion excessive ? Score 1-10." |
| GS-3 | Differenciation vs contenu generique | REQUIS | "Cet article apporte-t-il un angle ou des donnees que seul un marchand de biens actif pourrait fournir ? Ou est-ce du contenu recopiable par n'importe qui ? Score 1-10." |

### 3.5 Gates persona (GP-*) — agent @persona — type `ia`

Executees par appel Claude. Evaluent l'article du point de vue du persona cible.

| Gate | Label | Classe | Prompt d'evaluation |
|------|-------|--------|---------------------|
| GP-1 | Comprehension immediate | BLOQUANT | "En tant que {{persona}}, je comprends en 10 secondes de quoi parle cet article et pourquoi ca me concerne. Score 1-10." |
| GP-2 | Credibilite percue | BLOQUANT | "En tant que {{persona}}, cet article me donne confiance dans l'auteur. Les affirmations sont etayees, pas de bullshit. Score 1-10." |
| GP-3 | Utilite percue | REQUIS | "En tant que {{persona}}, je trouve cet article utile pour mon projet immobilier. Il repond a une question que je me pose. Score 1-10." |

### 3.6 Gates humaines (GH-*) — fondateur — type `human`

Declenchees automatiquement dans certaines conditions. Jamais executees par code — le fondateur les valide manuellement via l'admin UI.

| Gate | Label | Classe | Condition de declenchement |
|------|-------|--------|---------------------------|
| GH-1 | Validation fondateur (P2) | BLOQUANT | L'article est de type P2 (realisation terrain) — les chiffres doivent etre verifies |
| GH-2 | Validation donnees proprietaires | BLOQUANT | `requires_proprietary_data = true` dans le brief |
| GH-3 | Escalade echec auto | REQUIS | Score auto < 22/22 apres 2 passes de correction |
| GH-4 | Previsualisation mobile | REQUIS | Systematique avant publication (visu mobile) |

---

## 4. Endpoints API

### 4.1 `POST /api/admin/blog/:id/validate`

Execute toutes les gates automatiques et IA. Stocke les resultats dans `gate_results`. Declenche les gates humaines si necessaire.

**Authentification** : `checkAdminAuth` (session admin existante)

**Request** : aucun body requis (l'article est lu en BDD)

**Response 200** :
```json
{
  "ok": true,
  "gate_status": "fail",
  "summary": {
    "total": 30,
    "pass": 27,
    "fail": 2,
    "pending_human": 1
  },
  "gates": {
    "V1": { "pass": true, "label": "Mots interdits absents", "detail": null, "classe": "BLOQUANT" },
    "V2": { "pass": false, "label": "Zero point d'exclamation", "detail": "3 occurrences trouvees", "classe": "BLOQUANT" },
    "GE-1": { "pass": true, "label": "Ton conforme a la brand voice", "detail": "Score IA : 8/10", "classe": "BLOQUANT" },
    "GH-1": { "pass": null, "label": "Validation fondateur (P2)", "detail": "En attente de validation humaine", "classe": "BLOQUANT" }
  },
  "blocking_failures": ["V2"],
  "required_failures": [],
  "pending_human": ["GH-1"]
}
```

**Response 404** : article non trouve
**Response 400** : article deja publie (les gates ne peuvent pas etre relancees sur un article publie)

**Logique** :
1. Lire l'article et son `brief_json` en BDD
2. Mettre `gate_status = 'running'`
3. Executer toutes les gates auto (V1-V22) via `validateArticle()`
4. Executer toutes les gates IA (GE-*, GS-*, GP-*) via `runIAGates()`
5. Determiner les gates humaines necessaires (conditions de declenchement)
6. Fusionner les resultats dans `gate_results`, sans ecraser les overrides humains existants
7. Calculer le verdict global (`pass` / `fail`)
8. Mettre a jour `gate_status`, `gate_last_run`, `gate_run_count`
9. Retourner le resultat complet

### 4.2 `GET /api/admin/blog/:id/gates`

Retourne l'etat actuel des gates sans les re-executer.

**Response 200** :
```json
{
  "ok": true,
  "article_id": "marchand-de-biens-hauts-de-france",
  "gate_status": "fail",
  "gate_last_run": "2026-04-13T10:30:00Z",
  "gate_run_count": 2,
  "summary": {
    "total": 30,
    "pass": 28,
    "fail": 1,
    "pending_human": 1
  },
  "gates": { /* ... meme format que POST /validate */ },
  "can_publish": false,
  "publish_blockers": ["V2 — Zero point d'exclamation : 3 occurrences trouvees"]
}
```

### 4.3 `PATCH /api/admin/blog/:id/gates/:gateId`

Override humain d'une gate. Permet au fondateur de forcer PASS ou FAIL sur une gate specifique.

**Request body** :
```json
{
  "pass": true,
  "detail": "Faux positif V16 — le pourcentage est en contexte explicatif"
}
```

**Response 200** :
```json
{
  "ok": true,
  "gate_id": "V16",
  "previous": { "pass": false, "detail": "2 chiffres sans source" },
  "current": { "pass": true, "detail": "Faux positif V16 — override fondateur", "override": true },
  "gate_status": "pass"
}
```

**Logique** :
1. Lire `gate_results` actuel
2. Mettre a jour la gate ciblee avec `override: true`, `overridden_by`, `overridden_at`
3. Recalculer le verdict global
4. Retourner l'etat mis a jour

**Contraintes** :
- Seules les gates de type `human` ou les gates en FAIL peuvent etre overridees
- Un override sur une gate BLOQUANT est trace et visible dans l'admin (alerte visuelle)

### 4.4 `PATCH /api/admin/blog/:id/publish` (modifie)

**Changement critique** : cet endpoint existant doit etre modifie pour REFUSER la publication si les gates ne sont pas toutes PASS.

**Logique actuelle** (a remplacer) :
```js
// AVANT — publication libre
"UPDATE blog_articles SET status = 'published', published_at = NOW() WHERE id = $1"
```

**Nouvelle logique** :
```js
// APRES — publication conditionnee aux gates
// 1. Lire gate_status et gate_results
// 2. Verifier que gate_status = 'pass' ou 'override'
// 3. Si oui : publier
// 4. Si non : retourner 403 avec la liste des gates en echec
```

**Response 403** (gates non satisfaites) :
```json
{
  "ok": false,
  "error": "Publication bloquee — gates de validation non satisfaites",
  "gate_status": "fail",
  "blocking_failures": [
    { "gate": "V2", "label": "Zero point d'exclamation", "detail": "3 occurrences" },
    { "gate": "GE-2", "label": "Zero formule generique IA", "detail": "Score IA : 4/10" }
  ],
  "required_failures": [],
  "pending_human": ["GH-1"]
}
```

**Response 200** (publication autorisee) :
```json
{
  "ok": true,
  "published_at": "2026-04-13T15:00:00Z"
}
```

### 4.5 `POST /api/admin/blog/:id/gates/reset`

Reinitialise toutes les gates d'un article (efface `gate_results`, remet `gate_status = 'pending'`). Utile apres modification majeure du contenu.

**Response 200** :
```json
{
  "ok": true,
  "gate_status": "pending",
  "gate_results": {}
}
```

---

## 5. Flow de validation

### 5.1 Diagramme d'etats de l'article

```
  draft ──[editer]──> draft
    |
    v
  [POST /validate]
    |
    v
  running ──────────> fail ──[re-editer]──> draft
    |                   |
    |                   v
    |            [POST /validate]  (re-run apres correction)
    |                   |
    v                   v
  pass ──────────> [PATCH /publish] ──> published
    |
    v
  (si gates humaines requises)
    |
    v
  fail (pending_human) ──[PATCH /gates/:gateId]──> pass (si toutes OK)
                                                     |
                                                     v
                                              [PATCH /publish] ──> published
```

### 5.2 Cycle de vie detaille

**Etape 1 — Redaction / edition**

L'article est en status `draft`. Le fondateur ou le pipeline autonome redige/modifie le contenu via `POST /api/admin/blog` ou `PUT /api/admin/blog/:id`.

**Etape 2 — Declenchement de la validation**

Le fondateur clique "Valider" dans l'admin UI, ce qui appelle `POST /api/admin/blog/:id/validate`.

**Etape 3 — Execution des gates automatiques (V1-V22)**

Le gate runner execute les 22 checks SEO en < 100ms. Resultats stockes dans `gate_results`. Aucun appel externe.

**Etape 4 — Execution des gates IA (GE-*, GS-*, GP-*)**

Le gate runner appelle Claude API avec les prompts d'evaluation. Chaque gate IA recoit :
- Le contenu complet de l'article
- Le brief JSON (persona, requete cible, pilier)
- Le prompt specifique de la gate

Temps d'execution estime : 3-8 secondes par gate IA, 20-40 secondes total. L'endpoint retourne la reponse quand toutes les gates sont terminees (pas d'async). Si le temps est trop long, les gates IA peuvent etre executees en parallele via `Promise.allSettled()`.

**Etape 5 — Evaluation des conditions humaines**

Le gate runner verifie les conditions de declenchement des gates GH-* :
- `pillar === 'P2'` → declenche GH-1
- `requires_proprietary_data === true` → declenche GH-2
- Score auto < 22/22 apres 2 passes → declenche GH-3
- Toujours → declenche GH-4 (previsu mobile)

Les gates humaines declenchees sont ajoutees a `gate_results` avec `pass: null` (en attente).

**Etape 6 — Calcul du verdict global**

```
Si >= 1 gate BLOQUANT avec pass === false → gate_status = 'fail'
Si >= 1 gate BLOQUANT avec pass === null → gate_status = 'fail' (pending_human)
Si >= 1 gate REQUIS avec pass === false → gate_status = 'fail'
Si toutes les gates applicables sont pass === true → gate_status = 'pass'
```

**Etape 7 — Override humain (si necessaire)**

Le fondateur voit le detail dans l'admin UI. Il peut :
- **Corriger l'article** et relancer la validation (retour etape 2)
- **Overrider une gate** via `PATCH /gates/:gateId` (pour les faux positifs)
- **Valider une gate humaine** (GH-*) via le meme endpoint

Apres chaque override, le verdict global est recalcule. Si toutes les gates passent, `gate_status` passe a `pass`.

**Etape 8 — Publication**

Le fondateur clique "Publier". L'endpoint `PATCH /publish` verifie `gate_status`. Si `pass` ou `override` → publication. Sinon → 403.

### 5.3 Cas du pipeline autonome (cron)

Quand le pipeline autonome genere un article (vi-blog-autonomous-pipeline.md, etape 5), il appelle automatiquement `POST /validate`. Si toutes les gates auto passent ET qu'aucune gate humaine n'est requise → l'article passe directement en `scheduled`. Si une gate humaine est requise → email de notification au fondateur (section 5.4 du pipeline).

---

## 6. Gate runner — implementation

[A REMPLIR]

---

## 7. Specs admin UI

[A REMPLIR]

---

## 8. Handoff

[A REMPLIR]
