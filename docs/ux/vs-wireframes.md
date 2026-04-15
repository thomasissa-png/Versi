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

[SECTION EN COURS]

---

## 4. Wireframe — Étape 1 : Upload des plans

[SECTION EN COURS]

---

## 5. Wireframe — Étape 2 : Découpe des lots

[SECTION EN COURS]

---

## 6. Wireframe — Étape 3 : Identification des pièces

[SECTION EN COURS]

---

## 7. Wireframe — Étape 4 : Visuels post-travaux

[SECTION EN COURS]

---

## 8. Composants UX clés

[SECTION EN COURS]

---

## 9. États critiques par étape (Gate G21)

[SECTION EN COURS]

---

## 10. Recommandations UX

[SECTION EN COURS]

---

## Handoff

[SECTION EN COURS]
