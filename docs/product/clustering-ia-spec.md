# Spec fonctionnelle — Clustering IA unit_id + lots pre-crees

**Date** : 2026-04-17
**Agent** : @product-manager (livrable produit par orchestrateur faute d'outil Task — audit @PM requis)
**Projet** : Versi Studio s21
**Persona** : Thomas, 35 ans, marchand de biens, 8-12 operations/an
**Dependances amont** : `docs/product/vs-functional-specs.md` (Etape 2), `docs/ia/extraction-enrichie-spec.md`
**KPI North Star** : Nombre de lots traites (upload plan -> visuel final)

---

## 1. Probleme

Apres la suppression de la pre-definition lot generique (s20 — "no AI > bad AI"), l'Etape 2 Lots demarre avec 0 lot. Thomas doit dessiner manuellement chaque polygone de lot sur le plan. Pour un immeuble R+3 avec 4 appartements par etage, ca represente 12 polygones a tracer manuellement.

**Objectif s21** : l'IA identifie les appartements dans le plan et pre-cree les lots correspondants. Thomas valide d'1 clic ou ajuste. Gain : passer de ~5 min/lot (dessin polygone) a ~10 sec/lot (validation 1 clic).

## 2. Flux backend — Clustering par (floor, unit_id)

### Algorithme de clustering

Apres extraction GPT-4.1 (qui retourne desormais `unit_id` et `bounding_polygon` par piece) :

```
Pour chaque plan du projet :
  1. Grouper les pieces par (floor, unit_id) -- ignorer les pieces avec unit_id = null
  2. Pour chaque groupe (floor, unit_id) avec >= 2 pieces :
     a. Calculer la confiance moyenne du groupe
     b. Si confiance_moyenne >= 0.7 :
        - Creer un lot en base avec :
          - name : genere automatiquement (ex: "T{nb_pieces_hors_sdb_wc} Etage {floor}" 
            ou "Lot {index} Etage {floor}" si nb_pieces < 2)
          - floor_number : floor du groupe
          - zone_data : union des bounding_polygon (ou bounding_box si polygon absent) des pieces
          - source : 'ai'
          - status : 'suggested'
        - Associer les rooms IA au lot (pour Etape 3)
     c. Si confiance_moyenne < 0.7 :
        - Ne PAS creer de lot (principe "no AI > bad AI")
        - Les pieces restent non-assignees, Thomas les voit dans le panneau
  3. Pieces avec unit_id = null (parties communes, indeterminees) :
     - Ne pas creer de lot
     - Afficher dans un groupe "Pieces non assignees" dans le panneau lateral
```

### Calcul de zone_data pour le lot

La zone du lot est calculee a partir des zones des pieces qui le composent :

**Option A — Bounding box englobante** (simple, fiable) :
```
zone_data = bounding_box englobante de toutes les pieces du groupe
          = { type: "rect", x: min(x), y: min(y), w: max(x+w)-min(x), h: max(y+h)-min(y) }
```

**Option B — Union convexe des polygones** (plus precis mais plus complexe) :
```
Si au moins 1 piece a un bounding_polygon :
  zone_data = convex_hull(tous les points de tous les bounding_polygon/bounding_box du groupe)
Sinon :
  Fallback sur option A
```

**Decision** : Option A pour la V1 (fiable, pas de bug geometrique). Les polygones IA par piece sont stockes en `extraction_data` et disponibles pour V2 (tracage precis).

### Nommage automatique des lots

| Nb pieces habitables (hors SdB, WC, couloir, entree, cellier) | Nom genere |
|---|---|
| 1 | "Studio Etage {floor}" |
| 2 | "T2 Etage {floor}" |
| 3 | "T3 Etage {floor}" |
| 4 | "T4 Etage {floor}" |
| 5+ | "T5+ Etage {floor}" |
| 0 (que des parties humides/techniques) | "Lot {index} Etage {floor}" |

Si floor = 0 : "RDC" au lieu de "Etage 0".
Si doublon de nom (ex: 2 T3 au meme etage) : ajouter suffixe " gauche"/"droite" base sur position x_percent moyenne (< 50% = gauche, >= 50% = droite).

## 3. User Stories

### US-VS-21 : Pre-creation automatique de lots par clustering IA

**Persona** : Thomas
**Epic** : Decoupe par lots (enrichissement)
**Dependances** : US-VS-03 (extraction), `docs/ia/extraction-enrichie-spec.md`
**Priorite** : P0 (objectif principal s21)

#### Job-to-be-done
En tant que Thomas, je veux que l'IA pre-cree les lots par appartement (pas par etage entier) apres extraction, afin de valider d'1 clic au lieu de dessiner manuellement chaque lot.

#### Criteres d'acceptance

**Happy path :**
- [ ] GIVEN un immeuble R+2 avec 2 appartements par etage WHEN extraction terminee THEN 6 lots sont pre-crees (2 par etage x 3 etages) avec noms "T3 RDC gauche", "T2 RDC droite", etc.
- [ ] GIVEN les lots pre-crees WHEN Thomas arrive sur Etape 2 THEN les overlays des 6 lots s'affichent sur le plan, le panneau lateral liste les 6 lots avec statut "suggere"
- [ ] GIVEN un lot pre-cree "T3 Etage 1 gauche" WHEN Thomas clique sur "Valider" dans le panneau THEN le lot passe en statut "valide" sans modifier sa zone

**Fallback "no AI > bad AI" :**
- [ ] GIVEN un plan illisible ou confiance clustering < 0.7 WHEN extraction terminee THEN 0 lot pre-cree, etat vide guide "Aucun lot detecte — utilisez le bouton Dessiner"
- [ ] GIVEN 3 pieces sur 6 ont unit_id=null WHEN lots pre-crees THEN les 3 pieces sans unit_id apparaissent dans "Pieces non assignees" du panneau lateral, pas dans un lot

**Cas limites :**
- [ ] GIVEN un plan de maison individuelle (type_bien="maison") WHEN extraction terminee THEN 1 seul lot "Maison" englobant toutes les pieces
- [ ] GIVEN un plan avec 1 seul etage et 1 seul appartement WHEN extraction THEN 1 lot pre-cree (pas de clustering necessaire)
- [ ] GIVEN 2 T3 identiques au meme etage WHEN nommage THEN les lots sont differencies par position ("T3 Etage 1 gauche" / "T3 Etage 1 droite")

#### 5 etats UI — Lots pre-crees IA

| Etat | Comportement | Message/Affichage |
|---|---|---|
| Defaut | Lots IA affiches avec overlays, statut "suggere" (bordure pointillee) | Badge "IA" sur chaque lot + panneau lateral avec bouton "Valider" par lot |
| Loading | Clustering en cours (apres extraction) | "Organisation des lots..." — skeleton |
| Vide | Aucun lot pre-cree (confiance faible) | "L'IA n'a pas detecte de lots fiables — dessinez manuellement" + bouton "Dessiner un polygone" |
| Erreur | Erreur backend clustering | Toast "Impossible d'organiser les lots — vous pouvez les creer manuellement" |
| Succes | Tous les lots IA valides | Badge vert "X lots valides" + bouton "Continuer vers les pieces" actif |

#### Events analytics

| Event | Proprietes | Quand |
|---|---|---|
| `lot_auto_created` | `project_id`, `lot_id`, `unit_id`, `confidence_avg`, `nb_rooms` | Lot IA pre-cree en base |
| `lot_auto_validated` | `project_id`, `lot_id`, `time_since_created_ms` | Thomas clique "Valider" sur un lot IA |
| `lot_manually_adjusted` | `project_id`, `lot_id`, `adjustment_type` (rename/resize/move) | Thomas modifie un lot IA avant validation |
| `ia_fallback_triggered` | `project_id`, `reason` (low_confidence/no_unit_id/error) | 0 lot pre-cree, fallback etat vide |

### US-VS-22 : Validation rapide "1 clic" des lots IA

**Persona** : Thomas
**Epic** : Decoupe par lots (enrichissement)
**Dependances** : US-VS-21
**Priorite** : P0

#### Job-to-be-done
En tant que Thomas, je veux pouvoir valider un lot pre-cree par l'IA en 1 seul clic (sans modifier la zone) afin de gagner du temps sur les lots bien detectes.

#### Criteres d'acceptance

- [ ] GIVEN un lot IA "suggere" WHEN Thomas clique "Valider" THEN le lot passe en "valide", l'overlay change (bordure pleine), le bouton devient "Valide" (coche verte)
- [ ] GIVEN 6 lots IA "suggeres" WHEN Thomas clique "Tout valider" THEN les 6 lots passent en "valides" en 1 action
- [ ] GIVEN un lot IA valide WHEN Thomas veut revenir en arriere THEN bouton "Annuler la validation" (retour en "suggere")
- [ ] GIVEN 6 lots IA dont 4 corrects et 2 a ajuster WHEN Thomas valide les 4 bons et ajuste les 2 autres THEN les 4 passent en valide, les 2 restent en "suggere" apres ajustement puis validation manuelle

#### Differenciation visuelle lots IA vs manuels

| Etat | Overlay | Panneau |
|---|---|---|
| Lot IA suggere | Bordure pointillee + badge "IA" | Bouton "Valider" + "Ajuster" |
| Lot IA valide | Bordure pleine + badge "IA" + coche | "Valide" (coche verte) + "Annuler" |
| Lot manuel | Bordure pleine (pas de badge) | "Valide" automatiquement a la creation |

## 4. Impact sur le code existant

### Route extract (modification)

`versi-studio/src/app/api/vs/projects/[id]/extract/route.ts` :

Apres l'extraction de chaque plan, ajouter le clustering :

```
1. Extraire extraction_data (comme avant)
2. Sauvegarder extraction_data en base (comme avant)
3. NOUVEAU : Lire unit_id de chaque room dans extraction_data
4. NOUVEAU : Grouper par (floor, unit_id) ou unit_id != null
5. NOUVEAU : Pour chaque groupe avec confiance >= 0.7 :
   - Calculer bounding_box englobante
   - Generer le nom automatique
   - INSERT INTO vs_lots (name, floor_number, zone_data, source='ai', status='suggested')
6. Retourner { lots_created: N }
```

### Frontend Etape 2 (modification mineure)

Le frontend actuel affiche deja les lots de la base. Les lots IA pre-crees apparaitront automatiquement. Modifications :
- Ajouter badge "IA" si `source = 'ai'`
- Bordure pointillee si `status = 'suggested'`
- Bouton "Valider" (PATCH lot status → 'validated')
- Bouton "Tout valider" dans le panneau
- Section "Pieces non assignees" si des pieces extraction_data ont unit_id=null

### Fichiers impactes

| Fichier | Nature de la modification |
|---|---|
| `schemas.ts` | + unit_id + bounding_polygon dans ExtractedRoomSchema + warning |
| `plan-extractor.ts` | + STEP 3b + 5b + 7 dans prompt + schema JSON |
| `extract/route.ts` | + logique clustering + creation lots IA |
| `lots/page.tsx` | + badge IA + bordure pointillee + bouton "Valider" + "Tout valider" |
| `LotPanel.tsx` | + section "Pieces non assignees" + bouton "Tout valider" |
| `types.ts` | eventuellement : source field dans VsLot si pas deja present |

## 5. Regles de non-regression

- Les lots manuels (crees via "Dessiner un polygone" ou "+ Ajouter un lot") ne sont PAS impactes
- Le dessin polygone, le drag/resize, le zoom canvas restent identiques
- L'Etape 3 (Pieces) lit les rooms depuis la base — pas de changement
- L'extraction existante en base (projets s20) n'a pas unit_id → pas de lot pre-cree, ce qui est le comportement actuel (0 lot)

---

**Handoff -> @fullstack**
- Fichiers produits : `docs/product/clustering-ia-spec.md`
- Decisions cles : clustering par (floor, unit_id), confiance >= 0.7, nommage T{n}, bbox englobante V1
- Points d'attention : "no AI > bad AI" (0 lot si confiance < 0.7), differentiation visuelle IA vs manuel
- Prochaines etapes : implementation extract/route.ts + frontend lots (Phase 3)
