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

### 6.1 Architecture modulaire

Le gate runner est une fonction Node.js qui orchestre l'exécution séquentielle des gates par catégorie.

```js
// gate-runner.js — orchestrateur de gates

const GATE_REGISTRY = {
  auto: ['V1','V2','V3','V4','V5','V6','V7','V8','V9','V10','V11','V12','V13','V14','V15','V16','V17','V18','V19','V20','V21','V22'],
  ia: ['GE-1','GE-2','GE-3','GE-4','GE-5','GS-1','GS-2','GS-3','GP-1','GP-2','GP-3'],
  human: ['GH-1','GH-2','GH-3','GH-4'],
};

async function runGates(articleId, pool) {
  const { rows } = await pool.query('SELECT * FROM blog_articles WHERE id = $1', [articleId]);
  if (!rows.length) throw new Error('Article non trouvé');
  const article = rows[0];
  const brief = article.brief_json || {};

  const results = {};

  // 1. Gates auto (V1-V22) — exécution synchrone, ~10ms total
  const autoResults = runAutoGates(article, brief);
  Object.assign(results, autoResults);

  // 2. Gates IA (GE/GS/GP) — appels Claude, ~15s total
  const iaResults = await runIAGates(article, brief);
  Object.assign(results, iaResults);

  // 3. Gates humaines — marquées pending si déclenchées
  const humanResults = resolveHumanGates(article, brief, results);
  Object.assign(results, humanResults);

  // 4. Calcul du statut global
  const blockingFails = Object.entries(results)
    .filter(([, g]) => g.classe === 'BLOQUANT' && g.pass === false);
  const pendingHuman = Object.entries(results)
    .filter(([, g]) => g.pass === null);

  const gateStatus = blockingFails.length > 0 ? 'fail'
    : pendingHuman.length > 0 ? 'pending_human'
    : 'pass';

  // 5. Persistence
  await pool.query(
    `UPDATE blog_articles SET gate_results = $1, gate_status = $2 WHERE id = $3`,
    [JSON.stringify(results), gateStatus, articleId]
  );

  return { gateStatus, results, blockingFails: blockingFails.map(([k]) => k), pendingHuman: pendingHuman.map(([k]) => k) };
}
```

### 6.2 Gates auto (V1-V22)

```js
function runAutoGates(article, brief) {
  const content = article.content || '';
  const results = {};

  // V1 — Mots interdits
  const FORBIDDEN = ['Expertise', 'Clé en main', 'Solutions', 'Découvrez', "N'hésitez pas", 'Bienvenue'];
  const found = FORBIDDEN.filter(w => content.toLowerCase().includes(w.toLowerCase()));
  results['V1'] = { pass: found.length === 0, label: 'Mots interdits absents', detail: found.length ? `Trouvés : ${found.join(', ')}` : null, classe: 'BLOQUANT' };

  // V2 — Zéro exclamation
  const exclCount = (content.match(/!/g) || []).length;
  results['V2'] = { pass: exclCount === 0, label: 'Zéro point d\'exclamation', detail: exclCount ? `${exclCount} occurrence(s)` : null, classe: 'BLOQUANT' };

  // V3 — Vouvoiement
  const tuMatch = content.match(/\b(tu |ton |ta |tes |toi )/gi) || [];
  results['V3'] = { pass: tuMatch.length === 0, label: 'Vouvoiement systématique', detail: tuMatch.length ? `Tutoiement détecté : ${tuMatch.slice(0,3).join(', ')}` : null, classe: 'BLOQUANT' };

  // V4-V6 — Requête cible dans H1, chapeau, H2
  const mainQuery = (brief.seo?.main_query || '').toLowerCase();
  const h1Match = content.match(/^#\s+(.+)/m);
  const h1Text = h1Match ? h1Match[1].toLowerCase() : '';
  results['V4'] = { pass: mainQuery && h1Text.includes(mainQuery), label: 'Requête cible dans H1', detail: null, classe: 'BLOQUANT' };

  const firstPara = content.split('\n\n').find(p => p && !p.startsWith('#')) || '';
  results['V5'] = { pass: mainQuery && firstPara.toLowerCase().includes(mainQuery), label: 'Requête cible dans chapeau', detail: null, classe: 'BLOQUANT' };

  const h2s = (content.match(/^##\s+(.+)/gm) || []).map(h => h.toLowerCase());
  const h2Matches = h2s.filter(h => h.includes(mainQuery)).length;
  results['V6'] = { pass: h2Matches >= 2, label: 'Requête cible dans >= 2 H2', detail: `${h2Matches} H2 contiennent la requête`, classe: 'BLOQUANT' };

  // V7 — Longueur
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const target = brief.editorial?.word_count_target || 1000;
  const tolerance = target * 0.1;
  results['V7'] = { pass: wordCount >= target - tolerance && wordCount <= target + tolerance, label: 'Longueur dans fourchette', detail: `${wordCount} mots (cible ${target})`, classe: 'REQUIS' };

  // V8 — Nombre de H2
  const h2Count = h2s.length;
  results['V8'] = { pass: h2Count >= 3 && h2Count <= 5, label: 'Nombre de H2 conforme (3-5)', detail: `${h2Count} H2`, classe: 'REQUIS' };

  // V9 — CTA présent
  const ctaUrl = brief.conversion?.cta_url || '/nos-biens';
  results['V9'] = { pass: content.includes(ctaUrl), label: 'CTA présent avec bonne URL', detail: null, classe: 'BLOQUANT' };

  // V10 — Liens internes blog
  const internalLinks = (content.match(/\/blog\/[a-z0-9-]+/g) || []).length;
  results['V10'] = { pass: internalLinks >= 1, label: 'Liens internes présents', detail: `${internalLinks} lien(s)`, classe: 'REQUIS' };

  // V11 — Slug conforme
  const slug = article.slug || '';
  results['V11'] = { pass: /^[a-z0-9-]+$/.test(slug), label: 'Slug conforme', detail: slug, classe: 'BLOQUANT' };

  // V12 — Frontmatter complet (vérif via brief_json)
  const requiredFields = ['title', 'slug', 'excerpt', 'author'];
  const missingFields = requiredFields.filter(f => !article[f]);
  results['V12'] = { pass: missingFields.length === 0, label: 'Frontmatter complet', detail: missingFields.length ? `Manquants : ${missingFields.join(', ')}` : null, classe: 'BLOQUANT' };

  // V13 — Zéro placeholder
  const placeholders = content.match(/\{\{[A-Z_]+\}\}|\[A REMPLIR\]|\[TODO\]|\[PLACEHOLDER\]/g) || [];
  results['V13'] = { pass: placeholders.length === 0, label: 'Zéro placeholder résiduel', detail: placeholders.length ? placeholders.join(', ') : null, classe: 'BLOQUANT' };

  // V14 — Paragraphes <= 5 lignes
  const longParas = content.split('\n\n').filter(p => p.split('\n').length > 5 && !p.startsWith('#'));
  results['V14'] = { pass: longParas.length === 0, label: 'Paragraphes <= 5 lignes', detail: longParas.length ? `${longParas.length} paragraphe(s) trop longs` : null, classe: 'REQUIS' };

  // V15 — Intro non molle
  const mollePatterns = /^(dans le monde|vous vous demandez|il est important|de nos jours|aujourd'hui plus que jamais)/i;
  results['V15'] = { pass: !mollePatterns.test(firstPara.trim()), label: 'Premier paragraphe sans intro molle', detail: null, classe: 'REQUIS' };

  // V16 — Données chiffrées sourcées (semi-auto)
  const numbers = content.match(/\d[\d\s]*[€%m²]/g) || [];
  const sourcedNumbers = content.match(/\d[\d\s]*[€%m²].*?\(.*?source|selon|d'après/gi) || [];
  results['V16'] = { pass: numbers.length === 0 || sourcedNumbers.length > 0, label: 'Données chiffrées sourcées', detail: `${numbers.length} chiffres, ${sourcedNumbers.length} sourcés`, classe: 'REQUIS' };

  // V17-V18 — Meta title/description
  const metaTitle = brief.seo?.meta_title || article.title || '';
  const metaDesc = brief.seo?.meta_description || article.excerpt || '';
  results['V17'] = { pass: metaTitle.length <= 60, label: 'Meta title <= 60 chars', detail: `${metaTitle.length} chars`, classe: 'BLOQUANT' };
  results['V18'] = { pass: metaDesc.length <= 155, label: 'Meta description <= 155 chars', detail: `${metaDesc.length} chars`, classe: 'BLOQUANT' };

  // V19 — Canonical
  results['V19'] = { pass: !!article.slug, label: 'Canonical présent', detail: `/blog/${article.slug}`, classe: 'BLOQUANT' };

  // V20 — Image alt
  const imageAlt = brief.technique?.image_alt || '';
  results['V20'] = { pass: imageAlt.length > 0 && (!mainQuery || imageAlt.toLowerCase().includes(mainQuery)), label: 'image_alt contient requête', detail: imageAlt || 'absent', classe: 'REQUIS' };

  // V21 — Lien transactionnel
  const transLinks = content.match(/\/(nos-biens|vendre|contact|realisations)/g) || [];
  results['V21'] = { pass: transLinks.length >= 1, label: 'Lien vers page transactionnelle', detail: `${transLinks.length} lien(s)`, classe: 'REQUIS' };

  // V22 — Schema.org BlogPosting
  const schemaFields = ['title', 'author', 'excerpt'].filter(f => !article[f]);
  results['V22'] = { pass: schemaFields.length === 0, label: 'Schema.org BlogPosting complet', detail: schemaFields.length ? `Manquants : ${schemaFields.join(', ')}` : null, classe: 'BLOQUANT' };

  return results;
}
```

### 6.3 Gates IA (GE/GS/GP)

```js
async function runIAGates(article, brief) {
  const results = {};
  const content = article.content || '';
  const persona = brief.editorial?.persona || 'Kévin';

  const IA_GATES = [
    { id: 'GE-1', label: 'Ton conforme à la brand voice', classe: 'BLOQUANT',
      prompt: `Évalue si cet article respecte la brand voice Versi Immobilier : confiant, direct, zéro blabla, premium par la substance. Vouvoiement systématique. Aucun superlatif auto-décerné. Score 1-10 et verdict PASS (>=7) ou FAIL.` },
    { id: 'GE-2', label: 'Zéro formule générique IA', classe: 'BLOQUANT',
      prompt: `Détecte les formules typiques de contenu IA : "en conclusion", "il est important de noter", "ainsi", "en effet", "n'hésitez pas", "il convient de". Liste chaque occurrence. PASS si 0, FAIL si >= 1.` },
    { id: 'GE-3', label: 'Valeur actionnable pour le lecteur', classe: 'REQUIS',
      prompt: `Le lecteur repart-il avec au moins 1 information concrète et actionnable (chiffre, processus, adresse, délai) ? Score 1-10, PASS >= 7.` },
    { id: 'GE-4', label: 'Cohérence argumentaire', classe: 'REQUIS',
      prompt: `La structure argumentaire est-elle logique ? Pas de saut logique ni contradiction interne. Score 1-10, PASS >= 7.` },
    { id: 'GE-5', label: 'Chapeau accrocheur', classe: 'REQUIS',
      prompt: `Le premier paragraphe entre-t-il directement dans le sujet ? Pas de banalité ni définition Wikipedia. Score 1-10, PASS >= 7.` },
    { id: 'GS-1', label: 'Alignement persona cible', classe: 'BLOQUANT',
      prompt: `Cet article s'adresse-t-il clairement au persona ${persona} avec son vocabulaire et ses préoccupations ? Score 1-10, PASS >= 7.` },
    { id: 'GS-2', label: 'Positionnement Versi visible', classe: 'REQUIS',
      prompt: `Versi Immobilier est-il positionné comme opérateur crédible sans autopromotion excessive ? Score 1-10, PASS >= 7.` },
    { id: 'GS-3', label: 'Différenciation vs contenu générique', classe: 'REQUIS',
      prompt: `Cet article apporte-t-il un angle ou des données que seul un marchand de biens actif pourrait fournir ? Score 1-10, PASS >= 7.` },
    { id: 'GP-1', label: 'Compréhension immédiate', classe: 'BLOQUANT',
      prompt: `En tant que ${persona}, je comprends en 10 secondes de quoi parle cet article et pourquoi ça me concerne. Score 1-10, PASS >= 7.` },
    { id: 'GP-2', label: 'Crédibilité perçue', classe: 'BLOQUANT',
      prompt: `En tant que ${persona}, cet article me donne confiance. Les affirmations sont étayées. Score 1-10, PASS >= 7.` },
    { id: 'GP-3', label: 'Utilité perçue', classe: 'REQUIS',
      prompt: `En tant que ${persona}, je trouve cet article utile pour mon projet immobilier. Score 1-10, PASS >= 7.` },
  ];

  // Batch en un seul appel Claude pour économiser les tokens
  const batchPrompt = IA_GATES.map((g, i) =>
    `[${g.id}] ${g.prompt}`
  ).join('\n\n');

  const systemPrompt = `Tu es un évaluateur qualité pour le blog de Versi Immobilier (marchand de biens Lille). Pour chaque gate ci-dessous, évalue l'article fourni. Réponds EXACTEMENT en JSON : {"gates": [{"id": "GE-1", "score": 8, "pass": true, "detail": "..."}, ...]}. Seuil PASS = score >= 7.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `ARTICLE :\n${content}\n\nGATES À ÉVALUER :\n${batchPrompt}` }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      for (const gate of parsed.gates || []) {
        const def = IA_GATES.find(g => g.id === gate.id);
        if (def) {
          results[gate.id] = {
            pass: gate.pass,
            label: def.label,
            detail: `Score IA : ${gate.score}/10 — ${gate.detail || ''}`,
            classe: def.classe,
          };
        }
      }
    }
  } catch (err) {
    // Fallback : toutes les gates IA en pending si l'API échoue
    for (const g of IA_GATES) {
      results[g.id] = { pass: null, label: g.label, detail: `Erreur API : ${err.message}`, classe: g.classe };
    }
  }

  return results;
}
```

### 6.4 Gates humaines

```js
function resolveHumanGates(article, brief, currentResults) {
  const results = {};
  const pillar = brief.editorial?.pillar || '';
  const requiresProprietary = brief.editorial?.requires_proprietary_data || false;
  const autoScore = Object.values(currentResults).filter(g => g.pass === true).length;
  const autoTotal = Object.values(currentResults).length;

  // GH-1 — Validation fondateur si pilier P2 (réalisation terrain)
  if (pillar === 'P2') {
    results['GH-1'] = { pass: null, label: 'Validation fondateur (P2)', detail: 'En attente — article réalisation terrain', classe: 'BLOQUANT' };
  }

  // GH-2 — Données propriétaires
  if (requiresProprietary) {
    results['GH-2'] = { pass: null, label: 'Validation données propriétaires', detail: 'En attente — chiffres Versi à vérifier', classe: 'BLOQUANT' };
  }

  // GH-3 — Escalade si score auto < 100% après 2 passes
  if (autoScore < autoTotal) {
    const passCount = article.gate_pass_count || 0;
    if (passCount >= 2) {
      results['GH-3'] = { pass: null, label: 'Escalade échec auto', detail: `Score ${autoScore}/${autoTotal} après ${passCount} passes`, classe: 'REQUIS' };
    }
  }

  // GH-4 — Prévisualisation mobile (toujours requise)
  results['GH-4'] = { pass: null, label: 'Prévisualisation mobile', detail: 'À valider dans l\'admin UI', classe: 'REQUIS' };

  return results;
}
```

---

## 7. Specs admin UI

### 7.1 Page liste des articles — colonne gate_status

Ajouter une colonne "Gates" dans le tableau admin existant (`AdminArticles.jsx`) :

| Statut | Affichage | Couleur |
|--------|-----------|---------|
| `null` | — | gris |
| `running` | En cours... | jaune clignotant |
| `pass` | PASS (30/30) | vert |
| `fail` | FAIL (27/30) | rouge |
| `pending_human` | En attente (29/30) | orange |
| `override` | Override | bleu |

### 7.2 Page détail article — panneau de gates

Sous le formulaire d'édition, ajouter un panneau "Validation" :

```
┌─────────────────────────────────────────────────┐
│  Validation                    [Lancer les gates]│
├─────────────────────────────────────────────────┤
│  SEO (V1-V22)           22/22  ●                │
│  ├ V1  Mots interdits          PASS             │
│  ├ V2  Zéro exclamation        PASS             │
│  └ ...                                          │
│                                                 │
│  Éditorial (GE-1 à GE-10)     8/10  ●          │
│  ├ GE-1 Accroche              PASS  8/10        │
│  ├ GE-2 Brand voice           PASS  9/10        │
│  └ GE-3 Spécificité Versi     FAIL  5/10        │
│         "Aucune donnée propriétaire Versi"       │
│         [Override ▼]                             │
│                                                 │
│  Stratégique (GS-1 à GS-3)    3/3   ●          │
│  Persona (GP-1 à GP-3)        3/3   ●          │
│                                                 │
│  Humain (GH-1 à GH-4)         1/2   ◐          │
│  ├ GH-1 Validation fondateur  ◐ EN ATTENTE     │
│  │       [Valider] [Rejeter]                     │
│  └ GH-4 Prévisualisation      ✓ Validé          │
│                                                 │
├─────────────────────────────────────────────────┤
│  Statut global : PENDING HUMAN                  │
│  Bloquant : 0 FAIL | Humain : 1 en attente     │
│                                                 │
│  [Publier]  (désactivé tant que gates != pass)  │
└─────────────────────────────────────────────────┘
```

### 7.3 Interactions

- **Lancer les gates** : appel `POST /api/admin/blog/:id/validate`, affiche un spinner, puis met à jour le panneau
- **Override** : dropdown → "Override (fondateur)" → appel `PATCH /api/admin/blog/:id/gates/:gateId` avec `pass: true, override: true, reason: "..."`
- **Valider/Rejeter** (gates humaines) : appel `PATCH /api/admin/blog/:id/gates/:gateId` avec `pass: true/false`
- **Publier** : bouton actif uniquement si `gate_status === 'pass'` ou `gate_status === 'override'`. Sinon grisé avec tooltip "Toutes les gates doivent être PASS"

---

## 8. Handoff

**Fichiers produits :**
- `docs/qa/blog-gate-system.md` — architecture technique complète (ce fichier)
- `docs/qa/blog-gates-editorial.md` — gates éditoriales par @copywriter

**Handoff → @fullstack — ordre d'implémentation :**

1. **Migration SQL** : ajouter `gate_results JSONB`, `gate_status TEXT`, `brief_json JSONB`, `scheduled_at TIMESTAMP` à `blog_articles` (section 2.4)
2. **Gate runner** : implémenter `runGates()`, `runAutoGates()`, `runIAGates()`, `resolveHumanGates()` dans un fichier `gate-runner.js` (section 6)
3. **Endpoint `POST /validate`** : brancher le gate runner (section 4.1)
4. **Endpoint `GET /gates`** : lecture simple du champ `gate_results` (section 4.2)
5. **Endpoint `PATCH /gates/:gateId`** : override humain (section 4.3)
6. **Modifier `PATCH /publish`** : refuser si `gate_status !== 'pass' && gate_status !== 'override'` (section 4.4)
7. **Admin UI** : panneau de gates dans `AdminArticleForm.jsx` (section 7)
8. **Cron publication** : publier les articles `scheduled_at <= NOW() AND gate_status = 'pass'` (section 5.3)
9. **Intégration gates @copywriter** : ajouter les 10 gates GE du prompt de review éditorial (`docs/qa/blog-gates-editorial.md`)

**Points d'attention :**
- Les gates IA nécessitent `ANTHROPIC_API_KEY` en variable d'environnement
- Utiliser `claude-sonnet-4-6` pour les gates IA (coût optimisé vs qualité suffisante)
- Les gates humaines ne bloquent PAS le pipeline autonome si aucune condition de déclenchement n'est remplie (ex: article P1 sans données propriétaires → pas de GH-1 ni GH-2)
- Le bouton "Publier" doit être visuellement distinct selon `gate_status` : vert si pass, grisé si fail/pending
