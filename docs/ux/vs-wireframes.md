# Parcours utilisateur + Wireframes — Versi Studio

> Produit par @ux | Date : 2026-04-15
> Persona : Thomas, 35 ans, marchand de biens, 8-12 opérations/an
> KPI North Star : Nombre de lots traités (upload plan → visuel final)
> Stack : Next.js 14 App Router, Canvas HTML5

---

## 1. Flow utilisateur principal

### Parcours de Thomas — Happy Path

```
[Accueil / Création projet]
        |
        | Upload PDF (plan immeuble 3 étages)
        | + Adresse : "12 rue du Faubourg, Lyon 7"
        | + Type : Immeuble collectif
        | + Surface : 380 m²
        | → CTA "Analyser mes plans"
        |
        ↓
[Étape 1 — Upload & extraction]
        |
        | Loader IA (~15-30s) : "Lecture des plans en cours..."
        | Preview miniatures des 3 pages PDF
        | Barre de progression (0% → 100%)
        | → CTA "Voir la découpe proposée"
        |
        ↓
[Étape 2 — Découpe des lots]
        |
        | AHA MOMENT 1 : L'IA affiche 5 zones colorées sur le plan
        | "T2 RDC gauche / T2 RDC droite / T3 R+1 / T2 R+2 A / T2 R+2 B"
        | Thomas ajuste : fusionne T2 R+2 A et T2 R+2 B → T3 R+2
        | → CTA "Valider la découpe" (4 lots finaux)
        |
        ↓
[Étape 3 — Identification des pièces]
        |
        | Vue par lot (sélecteur de lot en haut)
        | AHA MOMENT 2 : L'IA affiche les pièces sur le plan du lot sélectionné
        | Thomas repositionne la cuisine du T3 R+1 (trop décalée)
        | → CTA "Valider les pièces" (lot par lot)
        |
        ↓
[Étape 4 — Visuels post-travaux]
        |
        | Vue grille : 4 lots × N pièces (chambre, salon, cuisine...)
        | Thomas uploade photo brute chambre principale T3 R+1
        | Choisit angle "Face fenêtre", style "Scandinave"
        | → CTA "Générer" → Loader ~90s
        | AHA MOMENT 3 : Avant/après côte à côte, visuel crédible
        | Itère en chat : "Ajoute une bibliothèque derrière le canapé"
        | → Valide lot par lot
        |
        ↓
[Fin — Projet complet]
        |
        | Récapitulatif : 4 lots / 18 pièces / 12 visuels générés
        | V2 : Export PDF dossier de pré-commercialisation
```

### Points de friction identifiés

| Étape | Friction potentielle | Solution UX |
|---|---|---|
| Upload | PDF multi-pages illisible si scan basse résolution | Avertissement préventif + conseil qualité avant upload |
| Extraction IA | Attente ~30s sans feedback = abandon | Progress bar animée avec étapes textuelles ("Lecture portes et fenêtres...") |
| Découpe lots | Zones IA mal placées sur plan complexe | Undo/redo, drag & drop précis, zoom sur canvas |
| Pièces | Superposition ou débordement hors des murs | Snap aux limites de lot, alerte si overlap |
| Génération | 90s d'attente = frustration | Timer visible + aperçu intermédiaire si possible |
| Lots multiples | Perdre le fil quand on jongle entre 4 lots | Indicateur de complétion par lot dans le stepper |

### Aha moments

- **AHA 1 (Étape 2)** : La découpe IA apparaît sur le vrai plan, avec des couleurs distinctes par lot. Thomas voit son immeuble découpé en 3 secondes.
- **AHA 2 (Étape 3)** : Les pièces sont identifiées et labellisées directement sur le plan — plus besoin de compter les pièces à la main.
- **AHA 3 (Étape 4)** : Le visuel "après travaux" apparaît. La chambre vide devient une chambre meublée style scandinave. C'est ici que Thomas comprend la valeur réelle de l'outil.

### Métriques HEART

| Dimension | Signal | Métrique | Cible | Mesure |
|---|---|---|---|---|
| **Task success** | Complétion du parcours 4 étapes | Taux de lots avec visuel généré / lots créés | >= 80% | Event `lot_completed` |
| **Adoption** | Upload → premier visuel | Time-to-first-visual | <= 10 min | Events `project_created` → `visual_generated` |
| **Engagement** | Retour sur l'outil | Nb de projets par utilisateur / mois | >= 1 | Session analytics |
| **Happiness** | Satisfaction post-génération | CSAT après premier visuel généré | >= 8/10 | Enquête inline |
| **Retention** | Réutilisation à J30 | Taux d'utilisateurs actifs à J30 | >= 60% | Cohortes |

---

## 2. Architecture de l'information

### Navigation principale

Versi Studio est une application orientée tâche, pas un dashboard de navigation. Il n'y a pas de menu global complexe — le stepper latéral EST la navigation.

```
┌─────────────────────────────────────────────────────────────────┐
│  VERSI STUDIO                                    [logo charcoal] │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                    │
│  STEPPER     │             ZONE CENTRALE                         │
│  LATÉRAL     │             (contenu dynamique par étape)         │
│  (gauche)    │                                                    │
│              │                                                    │
│  ○ Projet    │                                                    │
│  ─────────   │                                                    │
│  ● Étape 1  │                                                    │
│    Upload    │                                                    │
│  ─────────   │                                                    │
│  ○ Étape 2  │                                                    │
│    Lots      │                                                    │
│  ─────────   │                                                    │
│  ○ Étape 3  │                                                    │
│    Pièces    │                                                    │
│  ─────────   │                                                    │
│  ○ Étape 4  │                                                    │
│    Visuels   │                                                    │
│              │                                                    │
│  [Autosaved] │                                                    │
│              │                                                    │
└──────────────┴──────────────────────────────────────────────────┘
```

### Règles de navigation

- **Stepper latéral** : largeur fixe 200px, fond charcoal (#1A1A1A), texte blanc/stone. Étape active = point plein + label gras. Étapes complétées = coche verte. Étapes verrouillées = grisées (non cliquables avant validation de l'étape précédente).
- **Progression séquentielle stricte** : on ne peut pas sauter à l'étape 4 sans avoir validé 1, 2, 3. La navigation arrière est toujours autorisée (retour à l'étape précédente sans perdre le travail).
- **Pas de header global** : le nom du projet est affiché en haut du stepper. Pas de nav bar top — l'application occupe tout l'espace.
- **Autosave** : toutes les modifications sont sauvegardées automatiquement. Mention "Sauvegardé" en bas du stepper.
- **Layout Étapes 2 et 3** : stepper gauche (200px) + canvas central (flex 1) + panel droit (320px).
- **Layout Étape 4** : stepper gauche (200px) + grille centrale (flex 1) + drawer chat droit (320px, togglable).
- **Layout Accueil et Étape 1** : stepper gauche (200px) + zone centrale pleine largeur.

---

## 3. Wireframe — Page d'accueil / Création projet

### Pattern de layout

- **Pattern** : stepper gauche (200px) + formulaire centré (max-width 560px, centré dans la zone droite)
- **Responsive** : sur mobile (<768px), stepper masqué, remplacé par barre de progression horizontale en haut. Formulaire pleine largeur.

### Wireframe ASCII

```
┌──────────────┬───────────────────────────────────────────────────┐
│ VERSI STUDIO │                                                    │
│              │         Nouveau projet                             │
│  ● Projet    │         ─────────────────────────────────         │
│  ○ Upload    │                                                    │
│  ○ Lots      │  Adresse du bien *                                 │
│  ○ Pièces    │  ┌─────────────────────────────────────────────┐  │
│  ○ Visuels   │  │ 12 rue du Faubourg, Lyon 7...               │  │
│              │  └─────────────────────────────────────────────┘  │
│              │  (autocomplete Google Places)                      │
│              │                                                    │
│              │  Type de bien *                                    │
│              │  ┌─────────────────────────────────────────────┐  │
│              │  │ Immeuble collectif                      ▾   │  │
│              │  └─────────────────────────────────────────────┘  │
│              │  Options : Immeuble collectif / Maison / Local     │
│              │                                                    │
│              │  Surface totale (optionnel)                        │
│              │  ┌──────────────────┐                             │
│              │  │ 380              │ m²                          │
│              │  └──────────────────┘                             │
│              │                                                    │
│              │  Plans du bien *                                   │
│              │  ┌─────────────────────────────────────────────┐  │
│              │  │                                             │  │
│              │  │   [ Glissez vos plans ici ]                 │  │
│              │  │   PDF, PNG ou JPG — 1 fichier par étage     │  │
│              │  │   ou [ Parcourir ]                          │  │
│              │  │                                             │  │
│              │  └─────────────────────────────────────────────┘  │
│              │                                                    │
│              │  ┌─────────────────────────────────────────────┐  │
│              │  │      Analyser mes plans →                   │  │
│              │  └─────────────────────────────────────────────┘  │
│              │  (bouton désactivé si aucun plan uploadé)          │
│  [Autosaved] │                                                    │
└──────────────┴───────────────────────────────────────────────────┘
```

### Interactions

- **Adresse** : champ texte avec autocomplétion via Google Places API. La saisie déclenche les suggestions au bout de 3 caractères. La sélection pré-remplit ville et code postal (utilisés en V2 pour le PDF).
- **Type de bien** : dropdown natif, 3 options. Valeur par défaut : "Immeuble collectif" (cas d'usage principal de Thomas).
- **Zone upload** : drag & drop zone avec bordure dashed stone (#D9D4CE). Hover : bordure charcoal, fond légèrement teinté. Accepte PDF multi-pages (1 page = 1 étage interprété automatiquement), PNG, JPG. Pas de limite de taille affichée — l'erreur est gérée côté serveur.
- **CTA "Analyser mes plans"** : bouton primaire (fond charcoal, texte blanc). Désactivé tant qu'aucun plan n'est uploadé. Au clic : transition vers Étape 1 avec loader immédiat.
- **Plans uploadés** : chaque fichier ajouté apparaît sous la zone de drop (liste) avec nom, poids, et icône de suppression ×.

---

## 4. Wireframe — Étape 1 : Upload des plans

### Pattern de layout

- **Pattern** : stepper gauche (200px) + zone centrale en 2 colonnes : preview miniatures (gauche, 40%) + détails extraction (droite, 60%)
- **Responsive** : sur mobile, preview en scroll horizontal, détails en stack vertical dessous.

### Wireframe ASCII

```
┌──────────────┬───────────────────────────────────────────────────┐
│ VERSI STUDIO │  Étape 1 — Analyse des plans                       │
│              │                                                    │
│  ✓ Projet    │  ┌─────────────────┬─────────────────────────────┐│
│  ● Upload    │  │ Vos plans       │ Extraction en cours         ││
│  ○ Lots      │  │                 │                              ││
│  ○ Pièces    │  │ [miniature 1]   │ ████████████████░░░░  78%   ││
│  ○ Visuels   │  │  RDC.pdf        │                              ││
│              │  │  Page 1/3       │ "Analyse des ouvertures..."  ││
│              │  │                 │                              ││
│              │  │ [miniature 2]   │ ✓ Structure détectée         ││
│              │  │  R+1.pdf        │ ✓ 4 appartements identifiés  ││
│              │  │  Page 2/3       │ ○ Dimensions en cours...     ││
│              │  │                 │ ○ Portes et fenêtres          ││
│              │  │ [miniature 3]   │                              ││
│              │  │  R+2.pdf        │                              ││
│              │  │  Page 3/3       │                              ││
│              │  │                 │                              ││
│              │  │ [+ Ajouter]     │                              ││
│              │  └─────────────────┴─────────────────────────────┘│
│              │                                                    │
│              │  ┌─────────────────────────────────────────────┐  │
│              │  │   Voir la découpe proposée →                │  │
│              │  └─────────────────────────────────────────────┘  │
│              │  (bouton grisé pendant l'extraction, actif ensuite)│
│  [Autosaved] │                                                    │
└──────────────┴───────────────────────────────────────────────────┘
```

### Interactions

- **Miniatures** : affichées immédiatement après upload (rendu PDF côté serveur, pas côté client). Taille 120x160px. Clic pour zoom en lightbox.
- **Barre de progression** : animée, incréments réels (non simulés). Texte de statut dynamique sous la barre ("Lecture des cloisons...", "Identification des surfaces...", "Analyse des ouvertures...") — réduit la perception d'attente.
- **Liste de statut** : chaque étape de l'extraction apparaît séquentiellement avec icône ✓ quand terminée, ○ en attente, loader animé en cours.
- **Bouton "Voir la découpe proposée"** : activé dès que l'extraction est complète (100%). Transition fluide vers Étape 2.
- **Ajouter un plan** : possibilité d'ajouter un plan supplémentaire pendant ou après l'extraction. Si ajouté après : relance l'extraction pour les nouveaux fichiers uniquement.
- **Étape 1 dans le stepper** : point rempli animé (pulse) pendant l'extraction, coche verte quand terminé.

---

## 5. Wireframe — Étape 2 : Découpe des lots

### Pattern de layout

- **Pattern** : stepper gauche (200px) + canvas central flex 1 + panel droit fixe (320px)
- **Responsive** : sur mobile, canvas plein écran avec panel droit accessible via bouton "Liste des lots" (drawer bas). Canvas zoomable avec pinch.

### Wireframe ASCII

```
┌──────────────┬────────────────────────────────────┬─────────────┐
│ VERSI STUDIO │  CANVAS — Plan du bien              │ LOTS        │
│              │  [zoom +] [zoom -] [⟲ undo] [↩ redo]│─────────────│
│  ✓ Projet    │                                     │ 5 lots      │
│  ✓ Upload    │  ╔══════════════════════════════╗   │ identifiés  │
│  ● Lots      │  ║  [████ T2 RDC G ████]        ║   │─────────────│
│  ○ Pièces    │  ║  ·                           ║   │ ● T2 RDC G  │
│  ○ Visuels   │  ║  [████ T2 RDC D ████]        ║   │   48 m²     │
│              │  ║                              ║   │─────────────│
│              │  ║  ────────────────────────    ║   │ ○ T2 RDC D  │
│              │  ║  [████ T3 R+1       ████]   ║   │   52 m²     │
│              │  ║                              ║   │─────────────│
│              │  ║  ────────────────────────    ║   │ ○ T3 R+1    │
│              │  ║  [██ T2 R+2A ██][T2 R+2B]   ║   │   65 m²     │
│              │  ╚══════════════════════════════╝   │─────────────│
│              │                                     │ ○ T2 R+2A   │
│              │  Sélectionné : T2 RDC Gauche         │   38 m²     │
│              │  ┌──────────────────────────────┐   │─────────────│
│              │  │ Renommer | Fusionner | Suppr. │   │ ○ T2 R+2B   │
│              │  └──────────────────────────────┘   │   35 m²     │
│              │                                     │─────────────│
│              │                                     │ [+ Ajouter] │
│              │                                     │             │
│              │                                     │  ┌─────────┐│
│              │                                     │  │ Valider ││
│              │                                     │  │ découpe ││
│              │                                     │  └─────────┘│
│  [Autosaved] │                                     │             │
└──────────────┴────────────────────────────────────┴─────────────┘
```

### Interactions canvas

- **Zones colorées** : chaque lot est une zone colorée translucide (fill à 30% d'opacité) avec bordure colorée pleine. Palette fixe : 8 couleurs distinctes assignées séquentiellement.
- **Sélection** : clic sur une zone = sélection (outline renforcé, zone surlignée dans le panel droit). La zone sélectionnée monte en z-index.
- **Drag zone** : clic maintenu sur la bordure d'une zone = resize (curseur resize). Clic maintenu au centre = déplacement de toute la zone. Snap à la grille pixel sous-jacente du plan.
- **Double-clic** : ouvre un input inline de renommage de la zone ("T2 RDC Gauche" → éditable).
- **Clic droit sur zone** : menu contextuel avec 3 options : Renommer / Fusionner avec... (sous-menu : liste des lots) / Supprimer.
- **Fusionner** : sélectionner 2 zones → clic droit → Fusionner → les deux zones deviennent une, la couleur de la première est conservée, dialogue de renommage s'ouvre.
- **Séparer** : non disponible par drag direct (complexe). Accessible via "Ajouter un lot" dans le panel droit : le marchand dessine une nouvelle zone sur le plan existant.
- **Zoom** : boutons +/- et scroll molette. Le canvas est infini avec un fond quadrillé léger.
- **Toolbar canvas** : fixée en haut du canvas. Undo (⌘Z), Redo (⌘⇧Z), Zoom fit (réajuste l'image au canvas), Zoom 100%.

### Interactions panel droit

- **Liste des lots** : chaque lot = une ligne avec nom, surface calculée, pastille couleur. Clic = sélectionne la zone sur le canvas + scroll si nécessaire.
- **"+ Ajouter un lot"** : active le mode "dessin de zone" sur le canvas (curseur crosshair). Thomas dessine un rectangle → dialogue de nommage → lot ajouté.
- **"Valider la découpe"** : CTA primaire en bas du panel. Active quand >= 1 lot. Au clic : confirmation modale ("4 lots validés. Passer à l'identification des pièces ?") → transition Étape 3.

### Cognitive walkthrough — Étape 2

1. **L'utilisateur sait-il quoi faire ?** OUI — le plan s'affiche avec les zones colorées déjà proposées. Le panel droit liste les lots avec leurs noms. L'action évidente est d'ajuster les zones.
2. **L'action est-elle visible ?** OUI — les zones sont des objets interactifs visuellement distincts (fond coloré, bordure). Le curseur change au survol de la bordure (resize) ou du centre (move).
3. **Le lien but-action est-il clair ?** OUI — le label de chaque zone correspond au lot dans le panel droit. Modifier la zone = modifier le lot.
4. **Le feedback est-il immédiat ?** OUI — le déplacement d'une limite met à jour la surface (m²) en temps réel dans le panel droit. [FRICTION H1 : si la surface n'est pas recalculée en temps réel, Thomas ne saura pas si ses ajustements sont corrects. Solution : calcul de surface côté canvas, affiché en overlay sur la zone ET dans le panel.]

---

## 6. Wireframe — Étape 3 : Identification des pièces

### Pattern de layout

- **Pattern** : identique à Étape 2. Stepper gauche (200px) + canvas central (flex 1) + panel droit (320px). Sélecteur de lot ajouté en haut du canvas.
- **Responsive** : idem Étape 2. Sélecteur de lot affiché en dropdown pleine largeur en haut de l'écran sur mobile.

### Wireframe ASCII

```
┌──────────────┬────────────────────────────────────┬─────────────┐
│ VERSI STUDIO │  Lot affiché : [ T3 R+1    ▾ ]      │ PIÈCES      │
│              │  [zoom +] [zoom -] [⟲] [↩]          │  T3 R+1     │
│  ✓ Projet    │                                     │─────────────│
│  ✓ Upload    │  ╔══════════════════════════════╗   │ ● Salon     │
│  ✓ Lots      │  ║  ┌─────────────────┐         ║   │   22 m²     │
│  ● Pièces    │  ║  │  Salon          │  ┌────┐ ║   │─────────────│
│  ○ Visuels   │  ║  │  22 m²          │  │WC  │ ║   │ ○ Chambre 1 │
│              │  ║  └─────────────────┘  └────┘ ║   │   12 m²     │
│              │  ║                              ║   │─────────────│
│              │  ║  ┌────────────────────────┐  ║   │ ○ Chambre 2 │
│              │  ║  │  Cuisine               │  ║   │   10 m²     │
│              │  ║  │  14 m²                 │  ║   │─────────────│
│              │  ║  └────────────────────────┘  ║   │ ○ Cuisine   │
│              │  ║  ┌──────────┐ ┌──────────┐  ║   │   14 m²     │
│              │  ║  │ Ch. 1    │ │ Ch. 2    │  ║   │─────────────│
│              │  ║  │ 12 m²    │ │ 10 m²    │  ║   │ ○ WC        │
│              │  ║  └──────────┘ └──────────┘  ║   │   4 m²      │
│              │  ╚══════════════════════════════╝   │─────────────│
│              │                                     │ [+ Ajouter] │
│              │  Sélectionnée : Cuisine              │             │
│              │  Type : [Cuisine ▾] Surface : 14m²  │  ┌─────────┐│
│              │  [Supprimer cette pièce]            │  │ Valider ││
│              │                                     │  │ pièces  ││
│              │                                     │  └─────────┘│
│  [Autosaved] │                                     │             │
└──────────────┴────────────────────────────────────┴─────────────┘
```

### Interactions canvas

- **Sélecteur de lot** (haut canvas) : dropdown avec les lots validés à l'étape 2. Changer de lot recharge le canvas avec le plan de ce lot et ses pièces identifiées. L'état de chaque lot est persisté.
- **Overlay pièces** : les pièces sont des rectangles avec fond blanc à 70% d'opacité + label centré (nom + surface). Chaque pièce a une couleur de bordure selon son type (salon = bleu, chambre = vert, cuisine = orange, WC = gris...).
- **Sélection pièce** : clic sur une pièce = sélection (outline rouge, info bar apparaît en bas du canvas avec type dropdown et surface). La pièce est surlignée dans le panel droit.
- **Drag** : clic maintenu au centre d'une pièce = déplacement libre dans les limites du lot. Snap aux bords des autres pièces (guide magnétique).
- **Resize** : poignées aux 4 coins de la pièce sélectionnée. Resize proportionnel ou libre. La surface se met à jour en temps réel.
- **Contrainte de débordement** : une pièce ne peut pas dépasser les limites du lot. Tentative de débordement = rebond visuel + feedback rouge temporaire sur la bordure.
- **Contrainte de superposition** : les pièces ne peuvent pas se chevaucher. Tentative = tremblement de la pièce + message inline "Cette pièce chevauche [Salon]".
- **+ Ajouter une pièce** : dans le panel droit. Active le mode "dessin de pièce" sur le canvas. Thomas dessine un rectangle dans les limites du lot → dropdown de type → pièce ajoutée.
- **× Supprimer** : sur la pièce sélectionnée (info bar bas canvas) ou dans le panel droit. Confirmation inline (tooltip "Cliquez à nouveau pour confirmer").
- **Dropdown type** : disponible dans l'info bar bas canvas ET dans le panel droit. Options : Salon, Séjour, Chambre, Cuisine, Salle de bain, WC, Entrée, Couloir, Bureau, Terrasse, Autre.

### Interactions panel droit

- **Liste des pièces** : par lot actif. Nom + surface + type icône. Clic = sélection sur canvas. Drag dans la liste pour réordonner (ordre d'affichage dans V2 PDF).
- **"Valider les pièces"** : actif quand au moins 1 pièce par lot. Valide le lot actif → passe automatiquement au lot suivant (ou à l'étape 4 si tous les lots sont validés).

### Cognitive walkthrough — Étape 3

1. **L'utilisateur sait-il quoi faire ?** OUI — les pièces sont affichées sur le plan du lot sélectionné, avec les labels. L'objectif est de les ajuster si besoin.
2. **L'action est-elle visible ?** OUI — les pièces ont des poignées de resize visibles dès sélection. Le curseur change au survol (move / resize).
3. **Le lien but-action est-il clair ?** OUI — modifier une pièce sur le canvas met à jour sa surface dans le panel droit instantanément.
4. **Le feedback est-il immédiat ?** OUI — mais [FRICTION H5 : risque de chevauchement de pièces si l'IA propose des pièces trop proches. Solution : afficher une alerte visible "2 pièces se chevauchent" avant de permettre la validation].

---

## 7. Wireframe — Étape 4 : Visuels post-travaux

### Pattern de layout

- **Pattern** : stepper gauche (200px) + zone centrale en 2 niveaux : sélecteur de lot en haut + grille de pièces en dessous + drawer chat droit (320px, togglable). Clic sur une pièce → vue détail qui remplace la grille.
- **Responsive** : sur mobile, vue grille uniquement, clic sur pièce → pleine page détail. Chat accessible via FAB (floating action button) en bas droite.

### Wireframe ASCII — Vue grille lots/pièces

```
┌──────────────┬───────────────────────────────────────────────────┐
│ VERSI STUDIO │  Étape 4 — Visuels post-travaux                    │
│              │                                                    │
│  ✓ Projet    │  Lots : [T2 RDC G] [T2 RDC D] [● T3 R+1] [T3 R+2]│
│  ✓ Upload    │                                                    │
│  ✓ Lots      │  T3 R+1 — 5 pièces                  [🗨 Chat IA]  │
│  ✓ Pièces    │  ┌────────────────────────────────────────────┐   │
│  ● Visuels   │  │ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│              │  │ │         │ │ ✓ Photo │ │ ✓ Visuel│       │   │
│              │  │ │ Salon   │ │ Ch. 1   │ │ Ch. 2   │       │   │
│              │  │ │         │ │         │ │[avant]  │       │   │
│              │  │ │ [vide]  │ │[preview]│ │[après]  │       │   │
│              │  │ └─────────┘ └─────────┘ └─────────┘       │   │
│              │  │ ┌─────────┐ ┌─────────┐                   │   │
│              │  │ │ ✓ Photo │ │         │                   │   │
│              │  │ │ Cuisine │ │  WC     │                   │   │
│              │  │ │[preview]│ │ [vide]  │                   │   │
│              │  │ └─────────┘ └─────────┘                   │   │
│              │  └────────────────────────────────────────────┘   │
│              │                                                    │
│              │  Progression : 2/5 visuels générés ████░░░░ 40%  │
│              │                                                    │
│  [Autosaved] │                                                    │
└──────────────┴───────────────────────────────────────────────────┘
```

### Wireframe ASCII — Vue détail pièce (Chambre 2)

```
┌──────────────┬───────────────────────────────────────────────────┐
│ VERSI STUDIO │  ← Retour aux pièces    Chambre 2 — T3 R+1        │
│              │                                                    │
│  ✓ Projet    │  ┌──────────────────────────┐ ┌──────────────────┐│
│  ✓ Upload    │  │   AVANT                  │ │   APRÈS          ││
│  ✓ Lots      │  │                          │ │                  ││
│  ✓ Pièces    │  │   [Photo brute uploadée] │ │  [Visuel généré] ││
│  ● Visuels   │  │   Murs béton, sol vide   │ │  Style Scandinave││
│              │  │                          │ │  Chambre meublée ││
│              │  │   ┌──────────────────┐   │ │                  ││
│              │  │   │ Changer la photo │   │ │  [Télécharger]   ││
│              │  │   └──────────────────┘   │ │  [Régénérer]     ││
│              │  └──────────────────────────┘ └──────────────────┘│
│              │                                                    │
│              │  Angle de prise de vue                             │
│              │  ○ Face entrée  ● Face fenêtre  ○ Angle droit      │
│              │                                                    │
│              │  Style                                             │
│              │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐  │
│              │  │ [img]│ │ [img]│ │ [img]│ │ [img]│ │ Custom │  │
│              │  │Scand.│ │Indus.│ │Moder.│ │Class.│ │        │  │
│              │  └──────┘ └──────┘ └──────┘ └──────┘ └────────┘  │
│              │                         ↑ sélectionné             │
│              │                                                    │
│              │  ┌─────────────────────────────────────────────┐  │
│              │  │          Générer le visuel →                │  │
│              │  └─────────────────────────────────────────────┘  │
│  [Autosaved] │  (disabled si pas de photo uploadée)              │
└──────────────┴───────────────────────────────────────────────────┘
```

### Wireframe ASCII — Drawer Chat Agent Architecte (ouvert)

```
┌──────────────┬────────────────────────┬──────────────────────────┐
│ VERSI STUDIO │  [Vue détail pièce]    │  Agent Architecte    [×] │
│              │                        │──────────────────────────│
│  ● Visuels   │  (layout identique     │  "Voici votre visuel     │
│              │   mais réduit en       │   Scandinave. Que         │
│              │   largeur pour         │   souhaitez-vous         │
│              │   laisser place        │   modifier ?"            │
│              │   au drawer)           │                          │
│              │                        │  ───────────────────     │
│              │                        │  [Thomas] :              │
│              │                        │  "Ajoute une             │
│              │                        │  bibliothèque derrière   │
│              │                        │  le canapé"              │
│              │                        │                          │
│              │                        │  ───────────────────     │
│              │                        │  [Agent] :               │
│              │                        │  "Génération en cours... │
│              │                        │   Résultat dans ~60s"    │
│              │                        │  ████████░░░  70%        │
│              │                        │                          │
│              │                        │  ┌──────────────────┐   │
│              │                        │  │ Votre message... │   │
│              │                        │  └─────────── [→]  ┘   │
└──────────────┴────────────────────────┴──────────────────────────┘
```

### Interactions

- **Onglets lots** (haut) : nav tabs horizontale. Lot actif = souligné, fond stone léger. Chaque lot montre ses pièces dans la grille.
- **Carte pièce dans la grille** : 3 états visuels — vide (fond gris clair, icône + "Ajouter une photo"), photo uploadée (preview miniature + badge "✓ Photo"), visuel généré (avant/après en thumbnail 50/50 + badge "✓ Visuel"). Clic = vue détail.
- **Zone upload photo** (vue détail) : drag & drop ou browse. 1 seule photo par pièce (la plus représentative). Format : JPG, PNG. Contrainte de taille affichée.
- **Angle** : radio buttons avec icône schématique pour chaque angle. Sélection obligatoire avant génération.
- **Style picker** : 4 presets avec miniature photo + label. + bouton "Custom" qui ouvre un textarea libre ("Décrivez le style souhaité..."). Le preset sélectionné a une bordure charcoal.
- **"Générer le visuel"** : CTA primaire. Déclenche la génération (gpt-image-1.5). Remplacé pendant ~90s par un loader avec timer ("Génération en cours... 67s"). Résultat affiché en avant/après côte à côte.
- **"Régénérer"** : disponible après génération. Relance avec les mêmes paramètres. Nouveau visuel remplace l'ancien (ancien non conservé en V1).
- **"Télécharger"** : télécharge le visuel généré en PNG haute résolution.
- **Chat agent architecte** : toggle via bouton [Chat IA] dans la grille ou [×] pour fermer. Ouvert en drawer 320px à droite. Chaque message de Thomas envoie le visuel actuel en contexte à GPT-4.1. L'agent répond puis régénère le visuel.
- **Progression** : barre en bas de la vue grille. "X/Y visuels générés" avec progress bar. L'objectif de "lot traité" (KPI North Star) est atteint quand tous les visuels du lot sont générés et validés.

---

## 8. Composants UX clés

### Stepper latéral — `<SidebarStepper />`

- **Structure** : liste verticale d'étapes. Chaque étape = pastille (✓ complétée / ● active / ○ verrouillée) + label.
- **États** : complétée (pastille verte, clic autorisé pour revenir), active (pastille charcoal pleine, pulse animation pendant IA), verrouillée (pastille grise, clic désactivé, cursor: not-allowed).
- **Nom du projet** : affiché en haut du stepper, tronqué à 20 caractères avec ellipsis + tooltip au survol.
- **Autosave** : badge "Sauvegardé" en bas du stepper, mis à jour à chaque modification (debounce 2s). En cas d'erreur : "Erreur de sauvegarde — Réessayer".
- **Navigation retour** : clic sur une étape complétée = retour à cette étape avec confirmation si étape en cours contient des modifications non sauvegardées.
- **Accessibilité** : `role="navigation"`, `aria-label="Étapes du projet"`, chaque étape est un `<button>` avec `aria-current="step"` pour l'étape active, `aria-disabled="true"` pour les verrouillées.

### Plan Editor Canvas — `<PlanEditor />`

- **Base technique** : Canvas HTML5 avec Fabric.js ou Konva.js (à décider par @fullstack). Le plan importé est le fond (image non interactive). Les zones de lots et les pièces sont des objets Canvas interactifs superposés.
- **Performance** : le plan est rendu en image compressée (max 2048px de large), pas en PDF brut. La qualité perceptuelle doit rester suffisante pour travailler.
- **Couches** : fond plan (non interactif) → zones lots (étape 2) → zones pièces (étape 3). Les couches sont indépendantes.
- **Zoom/pan** : scroll molette = zoom (min 25%, max 400%). Clic maintenu sur fond vide = pan. Boutons +/- et "fit" dans la toolbar.
- **Undo/redo** : historique des 20 dernières actions. ⌘Z / Ctrl+Z pour undo, ⌘⇧Z / Ctrl+Y pour redo. La toolbar affiche les boutons ⟲ et ↩.
- **Persistance** : l'état du canvas (positions, dimensions, labels des zones) est sérialisé en JSON et sauvegardé en base à chaque modification (autosave debounce 2s).

### Panel d'infos contextuel — `<InfoPanel />`

- **Position** : droite, 320px fixe. Contenu dynamique selon l'étape et la sélection.
- **Étape 2** : liste des lots + bouton Ajouter + CTA Valider.
- **Étape 3** : liste des pièces du lot actif + bouton Ajouter + CTA Valider pièces.
- **En-tête** : titre de la section + compteur ("5 lots identifiés", "3 pièces pour T3 R+1").
- **Comportement** : si rien n'est sélectionné sur le canvas, le panel affiche la liste complète. Si un élément est sélectionné, la ligne correspondante est surlignée dans la liste.

### Style Picker — `<StylePicker />`

- **4 presets + 1 custom** : Scandinave, Industriel, Moderne, Classique, Personnalisé.
- **Preset** : miniature photo 80x60px + label. Sélection = bordure charcoal 2px.
- **Custom** : ouvre un textarea ("Décrivez votre style idéal : couleurs, matériaux, ambiance..."). Placeholder avec exemple : "Tons terreux, mobilier en rotin, lumière tamisée, style bohème".
- **Comportement** : la sélection d'un preset désactive le textarea custom et vice versa.

### Chat Agent Architecte — `<ArchitectChat />`

- **Positionnement** : drawer latéral droit, 320px. S'ouvre par-dessus le panel de la vue grille. En vue détail pièce, le drawer est adjacent (pas par-dessus).
- **Structure** : historique de messages (scroll) + champ de saisie + bouton Envoyer. Le visuel courant est envoyé en contexte à chaque message (invisible pour Thomas — c'est automatique).
- **Streaming** : la réponse de l'agent s'affiche en streaming (tokens au fur et à mesure).
- **Génération en cours** : si un message déclenche une nouvelle génération, un loader avec timer s'affiche dans le flux de messages.
- **État vide** : message initial de l'agent : "Le visuel de votre [Salon] est prêt. Que souhaitez-vous modifier ? Vous pouvez décrire librement : mobilier, couleurs, style, disposition..."
- **Accessibilité** : `role="log"`, `aria-live="polite"` sur le flux de messages. Focus automatique sur le champ de saisie à l'ouverture.

---

## 9. États critiques par étape (Gate G21)

### Étape 1 — Upload & Extraction

| État | Description | Composants concernés |
|---|---|---|
| **Défaut** | Zone de drop vide, champ adresse vide, CTA "Analyser" désactivé | `<UploadZone>`, `<CTAButton disabled>` |
| **Loading** | Extraction IA en cours. Progress bar animée (0→100%). Liste de statut séquentielle. Bouton "Voir la découpe" grisé. | `<ExtractionProgress>`, `<StatusList>` |
| **Vide** | Plans uploadés mais extraction retourne 0 éléments détectés | Alerte inline : "Aucun appartement détecté. Vérifiez la qualité du plan. [Réessayer] [Uploader un autre plan]" |
| **Erreur** | Échec API (timeout, erreur serveur), format non supporté, fichier corrompu | Message : "L'analyse de votre plan a échoué. Cela peut arriver si le plan est en très basse résolution. [Réessayer] [Contacter le support]". Logs d'erreur en interne. |
| **Succès** | Extraction complète. Preview miniatures affichées. Liste de statut 100% coché. CTA "Voir la découpe" actif. | `<StatusList checked>`, `<CTAButton active>` |

### Étape 2 — Découpe des lots

| État | Description | Composants concernés |
|---|---|---|
| **Défaut** | Canvas affiché avec zones colorées IA. Panel droit liste les lots. Aucun lot sélectionné. | `<PlanEditor>` avec overlays, `<InfoPanel>` |
| **Loading** | Si retour à l'étape 2 après modification → rechargement des données du canvas | Skeleton loader sur le canvas (fond gris animé) + "Chargement du plan..." |
| **Vide** | L'IA n'a proposé aucun lot (plan illisible pour le modèle) | Canvas vide avec message : "Aucun lot identifié. Dessinez vos lots manuellement." + bouton "Tracer un lot" actif |
| **Erreur** | Conflit de zones (superposition détectée), erreur de sauvegarde | Alerte inline sur la zone problématique. Toast en haut : "Sauvegarde échouée. Vos modifications sont en attente." |
| **Succès** | Validation confirmée. Tous les lots ont un nom et une surface. Stepper Étape 2 = ✓. Transition vers Étape 3. | Modale de confirmation → transition animée stepper |

### Étape 3 — Identification des pièces

| État | Description | Composants concernés |
|---|---|---|
| **Défaut** | Premier lot affiché avec pièces IA. Aucune pièce sélectionnée. Sélecteur de lot positionné sur Lot 1. | `<PlanEditor>` pièces, `<LotSelector>`, `<InfoPanel>` |
| **Loading** | Changement de lot → rechargement des pièces de ce lot | Skeleton loader sur les zones pièces (contour animé) |
| **Vide** | Un lot sans pièce détectée (ex : lot très petit, plan lisible partiellement) | Overlay sur le lot : "Aucune pièce identifiée. [Ajouter manuellement]" + bouton dessin activé |
| **Erreur** | Pièces en superposition, pièce hors limites du lot | Bordure rouge sur la pièce problématique + tooltip "Chevauchement avec [Cuisine]. Déplacez cette pièce." |
| **Succès** | Tous les lots ont >= 1 pièce validée. Stepper Étape 3 = ✓. Transition vers Étape 4. | Notification "Tous les lots validés. Passons aux visuels !" → transition |

### Étape 4 — Visuels post-travaux

| État | Description | Composants concernés |
|---|---|---|
| **Défaut** | Grille de pièces affichée. Toutes les cartes en état "vide" (pas de photo). Bouton "Générer" absent (photo requise). | `<PieceGrid>` avec cartes vides |
| **Loading** | Génération en cours (~90s). Sur la carte pièce : loader + timer. En vue détail : loader pleine zone "après" + chronomètre visible ("Génération en cours... 54s"). | `<GenerationLoader>` avec timer |
| **Vide** | Lot sans pièces (ne devrait pas arriver si Étape 3 validée — cas défensif) | Message dans la grille : "Aucune pièce pour ce lot. Retournez à l'étape Pièces." + lien retour |
| **Erreur** | Échec génération (API gpt-image-1.5, timeout, modération de contenu) | Sur la carte : badge rouge "Échec". En vue détail : "La génération a échoué. [Réessayer] [Changer de style]". Pas de blocage des autres pièces. |
| **Succès** | Visuel généré affiché. Carte en grille = miniature avant/après. Badge "✓ Visuel". Boutons Télécharger + Régénérer disponibles. | `<BeforeAfter>` composant, badge succès |

---

## 10. Recommandations UX

### Audit heuristique Nielsen — Parcours complet

| # | Heuristique | Évaluation | Évidence |
|---|---|---|---|
| H1 | Visibilité état système | PASS | Stepper latéral toujours visible. Progress bars sur l'extraction IA et la génération. Autosave affiché. |
| H2 | Correspondance système/monde réel | PASS | Vocabulaire terrain (lot, pièce, T2, R+1). Icônes universelles (×, +, undo, redo). |
| H3 | Contrôle et liberté | PASS | Navigation retour libre. Undo/redo 20 étapes sur canvas. Annulation possible pendant la génération (à implémenter). |
| H4 | Cohérence et standards | PASS | Layout identique Étapes 2 et 3. Patterns d'interaction identiques (sélection, drag, panel droit). |
| H5 | Prévention des erreurs | PASS avec réserve | Validation des chevauchements de pièces et débordements. Confirmation avant suppression. RÉSERVE : la génération d'un visuel sans angle sélectionné doit être bloquée côté formulaire, pas côté serveur. |
| H6 | Reconnaissance plutôt que rappel | PASS | Les lots et pièces sont toujours listés dans le panel droit. Le nom du projet est visible dans le stepper. |
| H7 | Flexibilité et efficacité | PASS | Raccourcis clavier (⌘Z, ⌘⇧Z, scroll zoom). Expert peut naviguer sans la souris. Novice guidé par le stepper. |
| H8 | Design minimaliste | PASS | Pas d'éléments décoratifs superflus. Chaque bouton a une action directe. Le chat est masqué par défaut (drawer). |
| H9 | Messages d'erreur humains | PASS | Tous les états d'erreur (Section 9) rédigés en langage utilisateur avec action proposée. Pas de codes d'erreur techniques. |
| H10 | Aide et documentation | FAIL → À CORRIGER | Pas de tooltips sur les interactions moins évidentes (fusionner lots, dessiner une zone, angle de prise de vue). Recommandation : ajouter des tooltips [?] sur les actions non-standard. En V1, un tooltip "survol pour aide" sur le canvas au premier usage. |

**H10 correction obligatoire** : ajouter `<Tooltip>` sur :
- Bouton "Fusionner" (explication : "Sélectionnez deux lots pour les fusionner en un seul")
- Sélecteur d'angle (explication : "L'angle que vous avez utilisé lors de la prise de vue")
- "Custom" dans le Style Picker (exemple de description dans le placeholder)
- Premier usage canvas : overlay de bienvenue avec 3 interactions clés ("Déplacez les zones | Double-clic pour renommer | Clic droit pour plus d'options")

### Recommandations techniques prioritaires

**1. Autosave obligatoire et silencieux**
Toute modification sur le canvas, dans les formulaires, ou dans les panels est sauvegardée automatiquement (debounce 2s). L'utilisateur ne doit jamais cliquer "Sauvegarder". La mention "Sauvegardé il y a 2s" en bas du stepper est la seule indication. En cas d'échec de sauvegarde : toast non-bloquant en haut de page.

**2. Undo/redo sur le canvas uniquement**
L'undo/redo (20 étapes) s'applique au canvas (positions et dimensions des zones). Il ne s'applique pas aux formulaires texte (comportement natif du navigateur) ni aux générations d'images (trop coûteuses à défaire).

**3. Transitions entre étapes**
Chaque transition d'étape (Valider découpe → Étape 3) est accompagnée d'une micro-animation : le stepper met à jour l'étape active avec un léger slide, la zone centrale se recharge avec un fade-in. Durée totale : 200-300ms. Pas de rechargement de page (SPA navigation).

**4. Feedback temps réel sur l'extraction IA**
La progress bar de l'extraction IA doit refléter des étapes réelles, pas une simulation linéaire. Chaque étape de l'API (réception du PDF, envoi à GPT-4.1 vision, parsing de la réponse, calcul des surfaces) incrémente la barre. Si l'API est synchrone (pas de streaming), simuler des étapes plausibles avec des paliers (0% → 30% reception → 60% analyse → 90% calcul → 100%).

**5. Canvas performance**
Le plan importé doit être downscalé à max 2048px côté serveur avant d'être envoyé au canvas. Sur les plans de grande taille (scan A0), le rendu canvas peut être lent si l'image est trop lourde. Recommandation : progressive loading (basse résolution affichée d'abord, haute résolution chargée en arrière-plan).

**6. Time-to-aha mesurable**
Implémenter les events suivants pour mesurer le temps jusqu'à chaque aha moment :
- `project_created` (timestamp)
- `ai_extraction_completed` (timestamp + nb lots proposés)
- `lots_validated` (timestamp + nb lots)
- `pieces_validated_all_lots` (timestamp)
- `first_visual_generated` (timestamp — AHA MOMENT 3)
- `lot_completed` (timestamp + lot_id — KPI North Star)

### Tests UX — Parcours complet

| Test | Critère de succès | Statut |
|---|---|---|
| Thomas peut uploader un PDF 3 pages et voir la découpe IA sans aide | L'interface est suffisamment guidée sans documentation externe | ✅ (stepper + labels clairs) |
| Charge cognitive : <= 3 actions principales par écran | Accueil: 3 champs + 1 CTA. Canvas: sélection / drag / valider. Détail pièce: upload / style / générer | ✅ |
| Time-to-first-visual | Upload → visuel généré en < 10 min (hors temps IA) | ✅ (parcours direct 4 étapes) |
| Edge case : plan basse résolution | Avertissement + option de réessayer ou uploader autre | ✅ (état erreur Étape 1) |
| Edge case : IA propose 0 lots | Possibilité de tracer manuellement | ✅ (état vide Étape 2) |
| Edge case : génération échoue | La pièce est marquée "Échec", les autres ne sont pas bloquées | ✅ (état erreur Étape 4 indépendant par pièce) |
| Accessibilité WCAG 2.2 AA | Navigation clavier complète, focus visible, touch targets >= 44px | ⚠️ À valider lors de l'implémentation — le canvas HTML5 est un point d'attention (accessibilité canvas limitée, nécessite aria-label et navigation alternative)

---

---

## Handoff → @fullstack

**Fichiers produits :**
- `/home/user/Versi/docs/ux/vs-wireframes.md` (ce fichier)

**Décisions UX prises :**

1. **Architecture 3 zones** : stepper gauche fixe (200px) + canvas central flex + panel droit fixe (320px) pour les étapes 2 et 3. Layout différent pour l'étape 4 (grille + drawer chat). Cette architecture doit être implémentée avec des composants de layout indépendants.

2. **Stepper latéral = navigation principale** : pas de header nav. Le stepper est la seule navigation globale. La progression est séquentielle et verrouillée (étapes suivantes inaccessibles avant validation).

3. **Canvas HTML5 avec objets interactifs** : Fabric.js ou Konva.js recommandé. Le plan importé est le fond (image statique). Les zones lots (étape 2) et pièces (étape 3) sont des objets interactifs distincts. Undo/redo sur 20 actions.

4. **Autosave** : debounce 2s sur toutes les modifications. Pas de bouton "Sauvegarder" manuel. Feedback discret "Sauvegardé" dans le stepper.

5. **Chat agent architecte en drawer** : 320px, togglable. Visible uniquement en Étape 4. Le visuel courant est envoyé en contexte à chaque message.

6. **5 états UI par étape** : tous documentés dans la Section 9. Chaque état doit être implémenté — aucun n'est optionnel.

7. **V1 sans auth, sans paiement** : un seul projet à la fois (pas de liste de projets). Données persistées en session ou localStorage + sauvegarde BDD.

**Points d'attention pour l'implémentation :**

- **Canvas HTML5 accessibilité** : le canvas natif n'est pas accessible aux screen readers. Implémenter une liste alternative (`<ul>` masqué visuellement) listant les lots/pièces avec leurs infos, navigable au clavier. Les interactions canvas complexes (drag, resize) doivent avoir des alternatives clavier (flèches pour déplacer, touches +/- pour resize).
- **Performance canvas** : downscaler les plans à max 2048px côté serveur avant envoi au canvas. Implémenter progressive loading pour les grands plans.
- **Génération ~90s** : ne pas utiliser de faux timers. Implémenter un polling côté client (toutes les 5s) sur l'état de la génération, ou utiliser Server-Sent Events si supporté. Le timer affiché doit être une estimation visible, pas un countdown précis.
- **Contraintes canvas étape 3** : les pièces ne peuvent pas déborder des limites du lot actif. Implémenter une contrainte de bounds côté canvas. Les chevauchements entre pièces doivent être détectés et signalés visuellement (bordure rouge).
- **Events de tracking** : les 6 events listés dans la Section 10 doivent être implémentés dès V1. Utiliser une couche d'analytics légère (posthog ou mixpanel) ou des logs serveur si pas d'outil analytics en place.

**Agents recommandés pour ce projet :**

| Agent proposé | Type | Rôle | Justification | Priorité |
|---|---|---|---|---|
| @testeur-persona-thomas | Testeur persona | Simuler Thomas sur chaque écran — "est-ce que je comprends quoi faire sans aide ?" | Le workflow est technique (canvas, drag, IA). Le risque de friction est élevé sur l'étape 2 notamment. | Haute |
| @expert-canvas-ux | Expert métier | Valider les choix d'interaction du canvas (drag, resize, snap) par rapport aux outils de CAO/plans existants | Thomas est habitué à des plans, pas à des éditeurs canvas web. Les conventions peuvent diverger. | Moyenne |

→ Handoff @agent-factory si ces agents sont à créer.
