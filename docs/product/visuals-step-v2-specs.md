# Specs Fonctionnelles — Étape 4 v2 : Visuels sur Plan

Session : versi-s29 | Date : 2026-05-04 | Agent : @product-manager

---

## 1. Résumé exécutif

**Pourquoi cette refonte.** L'Étape 4 actuelle traite chaque pièce de façon isolée : une photo → un style → un visuel. Cette approche ignore la réalité du travail de Thomas : un immeuble a un plan, les pièces ont des positions relatives, un photographe capture plusieurs angles, et un acquéreur doit comprendre l'espace global — pas une succession d'images déconnectées.

**Ce que ça résout.** La v2 transforme l'Étape 4 en canvas spatial : le plan extrait en Étape 3 devient la surface de travail. Thomas place les photos sur le plan (drag-drop), indique l'angle de vue du photographe par une flèche pivotable, choisit combien de visuels par pièce (1 à 5), ajoute un commentaire libre par pièce. L'IA génère des visuels cohérents entre eux — même style, même mobilier, même lumière — et pose des questions bloquantes si une ambiguïté risque de produire un rendu incohérent.

**Personas.** Thomas (utilisateur outil interne, pilote le flux de production) est l'acteur de l'Étape 4. Laurent (48 ans, investisseur immobilier, persona commercial principal de Versi) est le destinataire final : il évalue un dossier en 10 secondes et ferme l'onglet si les visuels ne transmettent pas la solidité de l'opérateur.

**Bénéfice Laurent.** Un dossier avec 3-5 visuels cohérents par pièce, ancrés dans un plan reconnaissable et annotés des angles de vue, communique la maîtrise opérationnelle de Versi et passe le filtre de crédibilité sans effort.

**Arbitrages Thomas déjà tranchés (non rediscutables).** Plan étape 4 = read-only. Cohérence inter-visuels d'une pièce = obligatoire. Questions IA = bloquantes avant génération.

---

## 2. Vision UX

Le plan de l'Étape 3 (read-only en Étape 4) devient un canvas interactif. Thomas dépose des photos dans une zone d'upload latérale gauche, puis les fait glisser sur les polygones de pièces du plan. Un clic sur une photo placée révèle un contrôleur d'angle (flèche pivotable 0-359°) indiquant la direction de vue du photographe. La sidebar droite liste chaque pièce avec un slider "nb visuels" (1-5), un champ commentaire libre, et le compteur de photos déposées. Si l'IA détecte une ambiguïté au moment du clic "Générer" (surface aberrante, photo manquante pour visuels demandés, conflit style/commentaire, photos incohérentes, surface inconnue), elle ouvre une modale chat bloquante — Thomas répond à toutes les questions avant que la génération démarre.

```
┌──────────────────────────────────┬───────────────────────────────┐
│   Canvas — Plan (read-only)      │   Sidebar — Pièces            │
│                                  │                               │
│  ┌──────────┐  ┌──────────┐      │  ▶ Salon (28 m²)             │
│  │  Salon   │  │Chambre 1 │      │    [📷 2 photos placées]      │
│  │ [📷→45°] │  │[📷→90°]  │      │    Visuels : ──●── 3          │
│  └──────────┘  └──────────┘      │    Commentaire : [______]     │
│                                  │  ───────────────────────────  │
│  ┌─────────────────────┐         │  ▶ Chambre 1 (12 m²)          │
│  │      Cuisine        │         │    [📷 1 photo]               │
│  │    [📷→180°]        │         │    Visuels : ●──── 1          │
│  └─────────────────────┘         │    Commentaire : [______]     │
│                                  │                               │
│  [Zone upload — glisser ici]     │  [Générer tous les visuels →] │
└──────────────────────────────────┴───────────────────────────────┘
```

**Navigation flux global :**
- Entrée depuis Étape 3 (plan validé, pièces en statut `validated`)
- Retour Étape 3 via bouton "Modifier le plan" — projet repasse en `step_2_complete`, visuels en cours invalidés, photos uploadées conservées
- Sortie vers export/dossier après `completed` sur toutes les pièces avec `target_visual_count > 0`

---

## 3. User Stories

**US-V4-01 — Uploader des photos dans la zone de dépôt**
En tant que Thomas, je veux déposer des photos (JPG/PNG, max 10 Mo chacune) dans une zone de dépôt latérale par drag-drop ou clic "Parcourir", afin de les avoir disponibles pour les placer sur le plan.

**US-V4-02 — Placer une photo sur une pièce du plan**
En tant que Thomas, je veux faire glisser une photo depuis la zone de dépôt vers un polygone de pièce sur le plan, afin que l'IA sache quelle photo correspond à quelle pièce pour la génération.

**US-V4-03 — Indiquer l'angle de vue du photographe**
En tant que Thomas, je veux cliquer sur une photo placée sur le plan puis pivoter une flèche directionnelle pour indiquer l'angle de prise de vue (0-359°), afin que l'IA génère les visuels avec la bonne perspective et cohérence angulaire entre les N visuels.

**US-V4-04 — Supprimer une photo placée sur le plan**
En tant que Thomas, je veux supprimer une photo déjà placée sur le plan via une croix ou la touche Delete, afin de corriger une mauvaise attribution sans repartir de zéro (la photo retourne dans la zone de dépôt).

**US-V4-05 — Ajouter un commentaire libre par pièce**
En tant que Thomas, je veux saisir un commentaire libre par pièce dans la sidebar (ex : "parquet chêne clair, baie vitrée à conserver"), afin que l'IA intègre ces contraintes spécifiques dans le prompt de génération de cette pièce.

**US-V4-06 — Choisir le nombre de visuels par pièce**
En tant que Thomas, je veux ajuster un slider (1 à 5) pour chaque pièce dans la sidebar, afin d'allouer l'effort de génération selon l'importance commerciale de chaque espace dans le dossier Laurent.

**US-V4-07 — Répondre aux questions bloquantes de l'IA avant génération**
En tant que Thomas, je veux que l'IA me soumette toutes ses questions dans une modale chat au clic sur "Générer" (pas en temps réel), afin de corriger les ambiguïtés en amont et éviter de gaspiller un appel API sur un rendu incohérent.

**US-V4-08 — Naviguer entre les N visuels générés d'une même pièce**
En tant que Thomas, je veux parcourir les N visuels d'une pièce via des chevrons (précédent/suivant) avec indication de position (ex : "2 / 3"), afin de choisir le ou les meilleurs angles à inclure dans le dossier Laurent.

**US-V4-09 — Retourner à l'Étape 3 pour corriger le plan**
En tant que Thomas, je veux cliquer "Modifier le plan" pour revenir à l'Étape 3 sans perdre les photos déjà uploadées, afin de corriger une erreur de découpage de pièce avant de relancer la génération.

**US-V4-10 — Valider l'ensemble des visuels et finaliser le dossier**
En tant que Thomas, je veux cliquer "Valider et exporter" une fois tous les visuels des pièces actives générés et acceptés, afin que le projet passe en statut `completed` et que le dossier soit prêt pour Laurent.

---

## 4. Data Model — Diff vs actuel

Schema actuel pertinent : `VsPhoto { id, room_id, file_path, angle_description, created_at }` et `VsRoom { id, lot_id, plan_id, name, room_type, surface_m2, polygon, ... }`. Pas de table de paramètres visuels par pièce, pas de table de questions IA.

### 4.1 ALTER TABLE vs_photos — ajout positionnement sur plan

```sql
ALTER TABLE vs_photos
  ADD COLUMN position_x        FLOAT   NULL,
  ADD COLUMN position_y        FLOAT   NULL,
  -- Coordonnées en % du canvas plan (0.0 à 1.0), NULL si non placée
  ADD COLUMN angle_degrees     FLOAT   NULL
    CHECK (angle_degrees IS NULL OR (angle_degrees >= 0 AND angle_degrees < 360)),
  -- Angle de vue du photographe en degrés (0 = haut du plan, sens horaire)
  ADD COLUMN is_placed_on_plan BOOLEAN NOT NULL DEFAULT false;
  -- true = Thomas a positionné la photo sur le canvas
```

**Migration :** toutes les photos existantes : `is_placed_on_plan = false`, `position_x/y/angle_degrees = NULL`. Thomas repositionne manuellement lors du premier accès à l'Étape 4 v2. L'ancien champ `angle_description` (TEXT libre) est conservé en parallèle — dépréciation en V3.

### 4.2 CREATE TABLE vs_room_settings — paramètres visuels par pièce

```sql
CREATE TABLE vs_room_settings (
  room_id              UUID  PRIMARY KEY REFERENCES vs_rooms(id) ON DELETE CASCADE,
  comment_text         TEXT  NULL,
  -- Commentaire libre Thomas (contraintes matériaux, travaux, état cible)
  target_visual_count  INT   NOT NULL DEFAULT 1
                             CHECK (target_visual_count BETWEEN 1 AND 5),
  -- Nombre de visuels souhaités (slider 1-5 dans la sidebar)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Relation :** 1 `vs_room` → 0 ou 1 `vs_room_settings`. Ligne créée à la première interaction Thomas sur la sidebar (slider ou commentaire). Suppression en cascade si la pièce est supprimée.

### 4.3 CREATE TABLE vs_visual_questions — questions bloquantes IA

```sql
CREATE TABLE vs_visual_questions (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID  NOT NULL REFERENCES vs_projects(id) ON DELETE CASCADE,
  room_id       UUID  NULL REFERENCES vs_rooms(id) ON DELETE CASCADE,
  -- NULL si question de niveau projet (ex : style global ambigu)
  trigger_type  TEXT  NOT NULL,
  -- Valeurs : 'surface_aberrante' | 'photo_manquante' | 'conflit_style_commentaire'
  --           | 'photos_incoherentes' | 'surface_inconnue'
  question_text TEXT  NOT NULL,
  -- Libellé exact affiché à Thomas dans la modale chat
  user_answer   TEXT  NULL,
  -- NULL tant que Thomas n'a pas répondu = état bloquant
  asked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at   TIMESTAMPTZ NULL
);

CREATE INDEX idx_vs_visual_questions_unanswered
  ON vs_visual_questions (project_id, asked_at)
  WHERE answered_at IS NULL;
-- Index partiel : récupération rapide des questions bloquantes en attente
```

**Règle bloquante :** tant qu'il existe au moins 1 ligne avec `answered_at IS NULL` pour le `project_id` en cours, le bouton "Générer tous les visuels" reste désactivé (grisé + tooltip "Répondez aux questions de l'IA avant de générer").

---

## 5. Règles Métier

### 5.1 Triggers de questions bloquantes — 5 cas

Évaluation au clic "Générer" uniquement (pas en temps réel). L'IA agrège toutes les questions et les présente en une seule modale chat ordonnée.

| # | Trigger | Condition | Question posée à Thomas |
|---|---|---|---|
| T1 | Surface aberrante | `surface_m2 < 4` OU (`surface_m2 > 80` ET `room_type IN ('salon','chambre','salle_de_bain','cuisine')`) | "La surface détectée est [X] m² pour ce [type de pièce]. Est-ce correct, ou faut-il la corriger avant génération ?" |
| T2 | Photo manquante | `target_visual_count > 0` ET `COUNT(photos WHERE is_placed_on_plan = true) = 0` pour une pièce | "Vous demandez [N] visuel(s) pour [nom pièce] mais aucune photo n'y est placée. Placez une photo ou passez le slider à 0." |
| T3 | Conflit style/commentaire | `comment_text` contient 'démolir', 'abattre', 'supprimer', 'détruire' ET `style` IN (`luxueux`, `haussmannien`, `classique`, `prestige`) | "Votre commentaire mentionne [mot détecté] pour [pièce]. Voulez-vous montrer la pièce après transformation structurelle, ou dans son état rénové conservé ?" |
| T4 | Photos incohérentes | 2+ photos d'une même pièce avec écart détecté : lumière jour vs nuit (EXIF heure) OU état brut vs meublé (analyse IA légère sur thumbnail) | "Les photos de [pièce] semblent montrer des états différents. Quel état cible souhaitez-vous projeter dans les visuels ?" |
| T5 | Surface inconnue | `surface_m2 IS NULL` ET `target_visual_count > 0` pour une pièce | "La surface de [pièce] est inconnue. Estimez-la (en m²) pour que l'IA proportionne les meubles correctement." |

**Traitement des réponses :** chaque réponse Thomas est stockée dans `vs_visual_questions.user_answer` et `answered_at`. Le prompt de génération de la pièce concernée intègre la réponse. Génération débloquée quand `answered_at IS NOT NULL` sur toutes les lignes du projet.

### 5.2 Cohérence inter-visuels d'une même pièce

Quand `target_visual_count > 1`, les N visuels d'une pièce doivent partager le même mobilier, la même palette de couleurs et le même style de finitions. Deux options techniques soumises à `@ia` :

**Option A — Img2img ancre (recommandée)** : le premier visuel est généré en texte-vers-image (visuel "ancre"). Les N-1 suivants utilisent ce visuel comme conditionnement image-vers-image (`images.edit` ou équivalent) avec modification de l'angle uniquement. Cohérence forte garantie — le mobilier et les textures sont hérités de l'ancre.

**Option B — Seed fixe + prompt verrouillé** : un hash de description des meubles et finitions est généré à partir du prompt de la pièce et utilisé comme seed fixe. Chaque angle est généré indépendamment. Moins de garantie de cohérence mais plus parallélisable si l'API ne supporte pas l'img2img.

**Recommandation pour `@ia`** : Option A. Si l'API utilisée ne supporte pas le conditionnement image-vers-image, fallback Option B avec note dans `docs/ia/visuals-step-v2-pipeline.md`.

### 5.3 Interprétation de la surface dans le prompt IA

La surface de chaque pièce est injectée dans le prompt de génération avec une annotation de proportion pour guider le choix du mobilier :

```
Surface : ${surface_m2} m²
Meubles : ${
  surface_m2 < 12
    ? "mobilier compact — canapé 2 places, table d'appoint, espace optimisé"
    : surface_m2 < 25
    ? "mobilier standard — canapé 3 places, table basse, fauteuil"
    : "mobilier généreux — canapé d'angle, fauteuil lounge, table basse 120 cm"
}
```

**Si `surface_m2 IS NULL`** : le trigger T5 est obligatoire avant toute génération pour cette pièce. Un meuble mal proportionné (armoire plafond dans 6 m², canapé 2 places dans 45 m²) décrédibilise le dossier face à Laurent en 3 secondes.

---

## 6. États UI par écran

### Écran 1 — Canvas plan + sidebar pièces

| État | Comportement | Affiché | Interactif |
|---|---|---|---|
| **Défaut** | Plan chargé, aucune photo déposée | Plan avec polygones colorés + labels pièces, zone upload vide, sidebar avec sliders à 1 et commentaires vides, bouton "Générer" désactivé | Drag-drop zone upload, sliders, champs commentaires, bouton "Modifier le plan" |
| **Loading** | Chargement initial du plan (fetch image + polygones depuis Étape 3) | Skeleton pleine largeur + spinner centré sur le canvas + "Chargement du plan..." | Rien — état non interactif |
| **Vide** | Aucune photo uploadée ET aucune interaction — première arrivée sur l'écran | Illustration vide state + "Commencez par déposer des photos de vos pièces" + CTA "Déposer des photos" | CTA déposer photos uniquement |
| **Erreur** | Plan introuvable ou erreur fetch (plan supprimé, accès réseau perdu) | Bannière rouge en haut du canvas : "Plan introuvable. Retournez à l'Étape 3 pour re-valider." + bouton "Retour Étape 3" | Bouton "Retour Étape 3" uniquement |
| **Succès** | Tous les visuels générés et acceptés pour toutes les pièces avec `target_visual_count > 0` | Bannière verte "Tous les visuels sont prêts." + bouton "Valider et exporter" proéminent + aperçu miniature des visuels par pièce dans la sidebar | Bouton "Valider et exporter", navigation miniatures, bouton "Régénérer" par pièce |

### Écran 2 — Modale chat questions IA (bloquante)

| État | Comportement | Affiché | Interactif |
|---|---|---|---|
| **Défaut** | Aucune question à poser — aucun trigger T1-T5 activé | Modale absente, génération se lance directement après clic "Générer" | N/A (modale non affichée) |
| **Loading** | IA évalue les 5 triggers après clic "Générer" (< 2 secondes attendu) | Overlay semi-transparent + spinner + "L'IA analyse votre configuration..." | Rien — état non interactif |
| **Question affichée — attente réponse** | 1 ou N questions présentées en chat séquentiel, Thomas répond à chacune | Modale pleine page : titre "Questions avant génération ([N] à répondre)", liste des questions numérotées, champ réponse texte libre + bouton "Confirmer" par question | Champ réponse, bouton "Confirmer" par question, bouton "Annuler tout" (revient au canvas sans générer) |
| **Réponse envoyée — génération en cours** | Toutes les réponses saisies, génération lancée | Modale ferme, canvas affiche barre de progression globale + progression par pièce (ex : "Salon — visuel 1/3 en cours...") | Bouton "Annuler la génération" (stop propre, visuels déjà générés conservés) |
| **Erreur IA indisponible** | Appel API questions ou génération échoue (timeout, quota) | Bannière rouge dans modale ou canvas : "Service IA temporairement indisponible. Vos paramètres sont sauvegardés." + bouton "Réessayer" | Bouton "Réessayer", bouton "Revenir au canvas" |

---

## 7. Edge Cases

| # | Cas | Comportement attendu |
|---|---|---|
| EC-1 | Photo placée sur la frontière entre 2 pièces (centroïde de la photo à cheval sur 2 polygones) | Assigner à la pièce dont le centroïde de polygone est le plus proche du centre de la photo. Indicateur visuel discret : bordure de la pièce assignée pulse 500ms. Aucune question posée — résolution automatique silencieuse. |
| EC-2 | Photo déposée hors de tout polygone de pièce (zone blanche du plan, couloir non découpé, extérieur) | Bloquer le dépôt sur le canvas : photo "rebondit" vers la zone de dépôt, message toast 3s "Placez la photo sur une pièce identifiée. Si cette zone n'est pas découpée, retournez à l'Étape 3." |
| EC-3 | Thomas uploade 5 photos pour une pièce mais `target_visual_count = 3` | L'IA choisit 3 photos parmi les 5 selon la diversité angulaire maximale (angles les plus éloignés les uns des autres en degrés). Les 2 photos non utilisées sont marquées "non sélectionnée" dans la sidebar — Thomas peut forcer une substitution manuelle. |
| EC-4 | Plan modifié en Étape 3 après que Thomas a déjà placé des photos en Étape 4 (retour → modification → retour Étape 4) | Les photos restent dans la zone de dépôt (non perdues). Les positions `position_x/y` sont réinitialisées à NULL et `is_placed_on_plan = false`. Warning persistant en haut du canvas : "Le plan a été modifié. Vérifiez et replacez vos photos sur les nouvelles pièces." Warning disparaît quand toutes les photos sont replacées. |
| EC-5 | 1 visuel sur N échoue pendant la génération (erreur API sur l'appel img2img d'un angle, autres angles OK) | Les visuels générés avec succès sont conservés et affichables. Le visuel en échec affiche un état "failed" dans le carrousel : icône alerte + "Génération échouée" + bouton "Régénérer ce visuel" qui relance uniquement l'appel API manquant. Le projet n'est pas bloqué — Thomas peut valider les visuels réussis et régénérer le visuel raté indépendamment. |

---

## 8. Handoff

**Agents destinataires : `@ux` et `@ia` en parallèle**

### Handoff → @ux

**Mission :** wireframes des 4 écrans de l'Étape 4 v2 + parcours complet Thomas (upload → placement → questions → génération → navigation → validation).

**Inputs requis :**
- Ce fichier : `/home/user/Versi/docs/product/visuals-step-v2-specs.md`
- Composant grille actuel : `versi-studio/src/components/vs/RoomGrid.tsx` (référence UI existante à cohérer)

**Livrables attendus :**
- `docs/ux/visuals-step-v2-wireframes.md` — 4 écrans annotés (canvas vide, canvas avec photos placées, modale questions, résultats visuels)

**Points d'attention pour @ux :**
- Le canvas plan est read-only — aucun clic ne doit modifier les polygones. Distinguer visuellement la zone "plan" (non éditable) de la zone "photos" (interactive)
- Le contrôleur d'angle (flèche pivotable) doit être accessible au clavier (tab + flèches ±15° par incrément)
- Sur mobile : le canvas doit passer en mode "scroll + tap" (pas de drag-drop natif). Décision à documenter dans les wireframes
- La sidebar pièces doit rester visible en scrollant sur le canvas (sticky ou layout fixe)

---

### Handoff → @ia

**Mission :** pipeline de génération multi-input (photos + plan + commentaires + réponses questions) + agent évaluation triggers T1-T5 + mécanique cohérence inter-visuels (Option A img2img recommandée).

**Inputs requis :**
- Ce fichier : `/home/user/Versi/docs/product/visuals-step-v2-specs.md`
- Pipeline de génération actuel : `versi-studio/src/lib/vs/visual-generator.ts` (base à étendre)

**Livrables attendus :**
- `docs/ia/visuals-step-v2-pipeline.md` — architecture du pipeline, schéma des appels API, gestion des fallbacks, coût estimé par projet

**Points d'attention pour @ia :**
- Trigger T4 (photos incohérentes) nécessite une analyse préalable des photos : EXIF heure (jour/nuit) + classification état (brut/meublé). Préciser si cette analyse est synchrone (bloquante au clic "Générer") ou asynchrone (background au fur et à mesure des uploads)
- Option A (img2img ancre) : valider que l'API choisie supporte le conditionnement image-vers-image avec modification d'angle. Si non, documenter le fallback Option B
- Prompt commun par pièce : le commentaire Thomas + les réponses aux questions + la surface + le type de pièce doivent être compilés en 1 prompt maître avant les appels individuels

---

**Fichiers produits par cette session :**
- `/home/user/Versi/docs/product/visuals-step-v2-specs.md` (ce fichier)

---

## Auto-évaluation gates

| Gate | Critère | Statut |
|---|---|---|
| G1 — Contexte lu | project-context.md + types.ts + spec étape 4 précédente lus avant rédaction | PASS |
| G3 — Handoff structuré | Bloc handoff présent avec agents destinataires, inputs et livrables attendus | PASS |
| G5 — Personas nommés | Thomas (acteur) et Laurent (destinataire) nommés et justifiés | PASS |
| G6 — User stories format JTBD | 10 stories au format "En tant que [X], je veux [Y], afin de [Z]" | PASS |
| G9 — Data model diff | 3 opérations SQL (ALTER + 2 CREATE) avec commentaires et contraintes | PASS |
| G10 — Règles métier | 3 sous-sections : 5 triggers, 2 options cohérence, règle surface | PASS |
| G12 — États UI | 2 écrans × 5 états chacun avec comportement, affichage, interactivité | PASS |
| G13 — Edge cases | 5 cas critiques avec comportement attendu précis | PASS |
| G15 — Zéro invention | Aucune donnée inventée. Personas de project-context.md. Types de types.ts. Arbitrages Thomas documentés comme "déjà tranchés". | PASS |

**Sections complètes : 8/8**

**Décisions à confirmer par Thomas :**
1. Trigger T4 (photos incohérentes) — analyse synchrone ou asynchrone ? Recommandation : asynchrone (background au upload, résultat disponible au clic "Générer")
2. Champ `angle_description` (TEXT existant dans `vs_photos`) — dépréciation en V3 ou suppression immédiate en v2 ?
3. Mobile — le canvas drag-drop est-il dans le scope v2 ou uniquement desktop ?
