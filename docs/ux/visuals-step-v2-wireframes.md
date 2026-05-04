# Wireframes UX — Étape 4 v2 : Visuels sur Plan

Session : versi-s29 | Date : 2026-05-04 | Agent : @ux

---

## 1. Résumé exécutif

L'Étape 4 v2 transforme le flux de génération de visuels en expérience spatiale : le plan extrait en Étape 3 devient la surface de travail sur laquelle Thomas, marchand de biens, ancre ses photos de chantier avant de déclencher la génération IA. L'objectif UX est de rendre ce placement naturel — aussi instinctif que d'annoter une carte — tout en garantissant que l'IA dispose d'assez d'informations (angle de vue, nombre de visuels voulus, commentaires libres) pour produire des visuels cohérents que Laurent, investisseur, ne pourra pas rejeter en 10 secondes faute de rigueur.

**KPI UX de réussite :**
- **Taux de placement complet** : % d'utilisateurs qui placent au moins 1 photo sur chaque pièce active (target_visual_count > 0) sans aide (cible : ≥ 80% dès la première session)
- **Temps de configuration par pièce** : médiane du temps écoulé entre "clic sur une pièce dans la sidebar" et "photo placée + angle confirmé" (cible : ≤ 90 secondes par pièce)
- **Taux de réponse aux questions IA sans abandon** : % d'utilisateurs qui répondent à toutes les questions bloquantes et cliquent "Générer" vs % qui cliquent "Annuler" ou ferment la modale (cible : ≤ 15% d'abandon sur la modale questions)

---

## 2. Architecture d'information — 4 écrans clés

```
┌─────────────────────────────────────────────────────────────────────┐
│  ENTRÉE : Étape 3 complète (plan validé, pièces en statut validated) │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ navigate /vs/projects/[id]/visuals
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ÉCRAN A — Canvas plan + sidebar pièces                             │
│  Vue principale. Thomas upload + place les photos, configure la      │
│  sidebar (slider visuels, commentaires), clique "Générer".           │
└──────────┬─────────────────────────────────────┬────────────────────┘
           │ clic "+" sur photo dans sidebar      │ clic "Générer"
           │ OU drag photo vers canvas            │ → éval triggers T1-T5
           ▼                                      ▼
┌─────────────────────────┐           ┌──────────────────────────────┐
│  ÉCRAN B — Modale       │           │  ÉCRAN C — Modale questions  │
│  upload + placement     │           │  IA (bloquante)              │
│                         │           │                              │
│  1. Sélection fichier   │           │  Présente N questions.       │
│  2. Placement sur plan  │           │  Thomas répond à chacune.    │
│  3. Angle de vue        │           │  Bouton "Envoyer réponses"   │
│  4. Confirmation        │           │  débloque la génération.     │
└──────────┬──────────────┘           └──────────────┬───────────────┘
           │ "Confirmer"                             │ toutes réponses OK
           │ → retour Écran A                        │
           │ photo visible sur canvas                ▼
           │                           Génération IA en cours
           │                           (barre progression par pièce)
           │                                         │
           │                                         │ génération terminée
           ▼                                         ▼
           ────────────────────────────────────────────────────────────
                              │ clic pièce "Voir les visuels"
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ÉCRAN D — Galerie résultats par pièce                              │
│  Carrousel N visuels. Valider / Régénérer / Itérer / Télécharger.  │
│  Navigation entre pièces via sidebar.                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ tous visuels validés
                               ▼
                    "Valider et exporter" → projet completed
```

**Transitions clés :**
- A → B : déclenchée par clic "+" sidebar pièce OU drag d'une photo depuis la zone de dépôt vers le canvas. La modale B s'ouvre par-dessus le canvas (overlay). Le canvas reste visible en arrière-plan (opacity 60%).
- B → A : clic "Confirmer" ferme B, photo apparaît sur le polygon de la pièce sur le canvas. Animation entrée : scale 0.5 → 1.0 en 200ms.
- A → C : déclenchée uniquement par clic "Générer tous les visuels". Si 0 trigger activé : C ne s'affiche pas, génération démarre directement.
- C → A (génération) : toutes questions répondues → modale C se ferme → canvas affiche barre de progression par pièce.
- A → D : clic sur pièce avec visuels générés dans la sidebar ("Voir les visuels"). Le canvas reste en fond (opacity 40%), panneau D s'ouvre à droite en replacement de la sidebar.
- D → A : clic "Retour au plan" dans le panneau D.

---

## 3. Wireframe Écran A — Canvas plan + sidebar

### 3.1 Version DESKTOP (≥ 1280px)

**Pattern** : split 65/35 — canvas gauche / sidebar droite, header barre pleine largeur, layout fixe (pas de scroll vertical de la page — tout tient en viewport).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  HEADER (64px hauteur fixe)                                                  │
│  [← Étape 3]  Projet : Rue du Général Leclerc — Étape 4 : Visuels  [?aide]  │
├─────────────────────────────────────────┬────────────────────────────────────┤
│  CANVAS (65% largeur, 100% hauteur)     │  SIDEBAR (35% largeur, scroll)     │
│                                         │                                    │
│  ┌─────────────────────────────────┐    │  ┌──────────────────────────────┐  │
│  │  [- zoom]  Plan du bien  [+ z]  │    │  │  Lot A — Appartement T3      │  │
│  │  [reset] [fullscreen]           │    │  │  [▼ changer de lot]          │  │
│  └─────────────────────────────────┘    │  └──────────────────────────────┘  │
│                                         │                                    │
│  ┌─────────────────────────────────┐    │  ── Salon (28 m²) ─────────────    │
│  │                                 │    │  📷 2 photos placées               │
│  │   ┌──────────────┐              │    │  [📷 photo1.jpg ×] [📷 photo2 ×]  │
│  │   │   SALON      │  ┌───────┐   │    │  Visuels : [●──────] 3            │
│  │   │  28 m²       │  │ CH. 1 │   │    │  [______commentaire libre______]  │
│  │   │  📷→ 45°     │  │ 12 m² │   │    │  Statut : EN ATTENTE              │
│  │   │  ●           │  │📷→90° │   │    │                                    │
│  │   └──────────────┘  │  ●    │   │    │  ── Chambre 1 (12 m²) ─────────   │
│  │                     └───────┘   │    │  📷 1 photo placée                 │
│  │   ┌──────────────────────────┐  │    │  [📷 facade.jpg ×]                 │
│  │   │         CUISINE          │  │    │  Visuels : [●──────] 1            │
│  │   │         16 m²            │  │    │  [______commentaire libre______]  │
│  │   │        📷→ 180°          │  │    │  Statut : EN ATTENTE              │
│  │   │          ●               │  │    │                                    │
│  │   └──────────────────────────┘  │    │  ── Cuisine (16 m²) ────────────   │
│  │                                 │    │  ⚠ Aucune photo placée            │
│  │  [zone drop — glisser ici]      │    │  Visuels : [●──────] 2            │
│  │  ou [+ Ajouter des photos]      │    │  [______commentaire libre______]  │
│  └─────────────────────────────────┘    │  Statut : INCOMPLET               │
│                                         │                                    │
│                                         │  ────────────────────────────────  │
│                                         │  [Générer tous les visuels →]     │
│                                         │  (grisé si pièces incomplètes)    │
│                                         │  2/3 pièces prêtes                │
└─────────────────────────────────────────┴────────────────────────────────────┘
```

**Composants canvas :**
- Polygones pièces : fond coloré semi-transparent (couleurs ROOM_TYPE_COLORS existantes), contour 2px. Non cliquables pour édition (read-only).
- Marqueur photo (●) : cercle blanc 32px, icône 📷 centré, positionné en % du canvas (position_x, position_y). Clic sur marqueur = ouvre contrôleur d'angle inline.
- Flèche d'angle (→) : ligne SVG de 48px depuis le centre du marqueur, pointe dans la direction angle_degrees. Couleur : accent (bleu Versi). Draggable à la souris (desktop) ou long-press + glisse (mobile).
- Zone de dépôt : fond dashed border, coin bas-gauche du canvas, 200×80px. Disparaît si déjà des photos uploadées (photos listées dans la sidebar à la place).
- Label pièce : nom + surface, positionné au centroïde du polygone, texte blanc avec fond semi-opaque.

**Sidebar pièces :**
- En-tête : sélecteur de lot (dropdown si multi-lots, label si mono-lot).
- Chaque pièce : section accordéon ouverte par défaut. Contient : liste des photos placées (thumbnail 40px + nom + croix suppression), slider visuels (1-5), champ commentaire texte libre (max 200 char), badge statut (PRÊT / INCOMPLET / GÉNÉRÉ / VALIDÉ).
- Pied de sidebar : compteur "X/N pièces prêtes" + bouton CTA "Générer tous les visuels →" (primary, toute la largeur sidebar). Grisé + tooltip si pièces actives sans photo ou sans génération.

**Contrôleur d'angle (inline sur canvas, apparaît au clic sur marqueur photo) :**
```
  ╔═════════════════╗
  ║  📷 photo1.jpg  ║
  ║                 ║
  ║    ↑ 45°        ║ ← flèche SVG draggable autour du centre
  ║   / \           ║
  ║  ● angle : 45°  ║
  ║  [−15°] [+15°]  ║ ← boutons clavier/accessibilité
  ║  [Confirmer]    ║
  ║  [Supprimer photo] ║
  ╚═════════════════╝
```
Contrôleur : popover 200×180px, s'affiche au-dessus ou en dessous du marqueur selon la position dans le canvas. Fermeture : clic "Confirmer", clic hors du popover (Escape clavier).

**Accessibilité Desktop :**
- Tab navigue : header → zone upload → polygones (ordre DOM) → sidebar (chaque pièce) → CTA générer.
- Sur le contrôleur d'angle : focus sur le champ angle numérique, Flèches Gauche/Droite ±1°, Shift+Flèches ±15°.
- Focus-visible : outline 3px offset 2px, couleur accent.
- Tailles cibles : tous les boutons ≥ 44×44px, sliders ≥ 44px de hauteur de zone de touch.

---

### 3.2 Version MOBILE (≤ 768px)

**Pattern** : stack vertical. Canvas en haut (60% viewport hauteur), sidebar collapse en bas (40%). Pas de split horizontal — le mobile ne peut pas afficher les deux côte à côte lisiblement.

```
┌─────────────────────────────────────┐
│  HEADER (56px)                      │
│  [←] Visuels — Rue Leclerc    [?]  │
├─────────────────────────────────────┤
│  CANVAS (60vh, zoomable)            │
│                                     │
│  ┌──────────────┐  ┌───────────┐   │
│  │   SALON      │  │  CH. 1    │   │
│  │  📷→ 45°    │  │ 📷→ 90° │   │
│  │   ●          │  │    ●      │   │
│  └──────────────┘  └───────────┘   │
│                                     │
│  [+ Ajouter une photo]  (FAB 56px) │
│  ───────────────────────── ─────── │
├─────────────────────────────────────┤
│  BOTTOM SHEET — Sidebar pièces      │
│  Poignée de drag ─────────          │
│  ── Salon ──────────────── ✓ PRÊT  │
│     [📷 x2]  Visuels: 3            │
│  ── Chambre 1 ────────── ✓ PRÊT    │
│     [📷 x1]  Visuels: 1            │
│  ── Cuisine ──────────── ⚠ INCOMPLET│
│     [+ placer une photo]            │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Générer tous les visuels → │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Interactions touch (mobile) :**
- Pinch-to-zoom canvas : min 0.5× (vue d'ensemble) / max 4× (précision placement). Double-tap = reset zoom 1×.
- Pan canvas : swipe un doigt sur la zone canvas (sans photo sélectionnée). Différenciation gestuelle : swipe simple = pan, swipe démarré depuis un marqueur photo = déplace la photo.
- Long-press (500ms) sur marqueur photo = ouvre le menu contextuel flottant (Voir l'angle / Repositionner / Supprimer photo). Vibration haptic 10ms à l'activation du long-press (si navigator.vibrate disponible).
- Tap sur polygone de pièce = scroll la bottom sheet jusqu'à la section de cette pièce + highlight 200ms.
- FAB "+ Ajouter une photo" : bouton flottant 56px, coin bas-droit du canvas. Ouvre l'écran B (sélection de pièce → upload → placement).
- Bottom sheet : drag depuis la poignée. État mi-hauteur (40vh) = liste compacte. État plein écran (95vh) = détail pièce sélectionnée avec slider et commentaire.
- Suggestion rotation en portrait : si viewport < 400px de large ET canvas < 300px → toast non-bloquant : "Tournez votre écran pour plus de précision lors du placement." Toast dismissable, ne réapparaît pas si dismissed.

**Accessibilité Mobile :**
- Touch target minimum : 44×44px sur tous les éléments interactifs (marqueurs photo, boutons slider, FAB).
- Le contrôleur d'angle sur mobile est un panneau bottom-sheet dédié (pas inline canvas — trop petit pour être précis). Input numérique + boutons ±15° + prévisualisation de la flèche dans une mini-carte de la pièce.
- VoiceOver/TalkBack : les polygones du canvas ont aria-label="Salon, 28 m², 2 photos placées, 3 visuels demandés". Les marqueurs photo ont aria-label="Photo photo1.jpg, angle 45°, appuyer pour modifier".
- Reduced-motion : les animations d'entrée de photos (scale) et de la bottom sheet (spring) sont remplacées par des transitions opacity instantanées si prefers-reduced-motion: reduce.

---

## 4. Wireframe Écran B — Modale upload + placement photo

**Flow en 5 sous-étapes :**

1. Tap "+" sur sidebar pièce (ou "Ajouter photo" sur le canvas pièce sélectionnée)
2. Picker file natif OU drag-drop zone (grande zone hachurée 60% écran)
3. Photo uploadée → écran "Placez la photo sur le plan" : canvas plein écran, curseur croix, instruction haut "Cliquez où vous étiez quand vous avez pris la photo"
4. Après clic position : pin marker placé + apparition flèche rotative draggable autour du pin, instruction "Glissez la flèche dans la direction où vous regardiez"
5. Bouton "Confirmer" (disabled si position OU angle non définis)

### 4.1 Version DESKTOP (modale 800×600 centrée)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [overlay dim 60%] Canvas Écran A visible en arrière-plan                    │
│                                                                               │
│  ┌────────────────────────────────────────────────────────┐                  │
│  │  Ajouter une photo — Salon (28 m²)               [X]  │  ← 800×600px     │
│  ├────────────────────────────────────────────────────────┤                  │
│  │  SOUS-ÉTAPE 1-2 : Sélection                            │                  │
│  │                                                         │                  │
│  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │                  │
│  │  │         Glissez vos photos ici                  │   │                  │
│  │  │         ou cliquez pour sélectionner            │   │                  │
│  │  │         ─────────────────────────               │   │                  │
│  │  │         JPG, PNG, HEIC — max 20 Mo              │   │                  │
│  │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │                  │
│  │        [Sélectionner depuis mes fichiers]               │                  │
│  ├────────────────────────────────────────────────────────┤                  │
│  │  SOUS-ÉTAPE 3 : Placez la photo sur le plan            │                  │
│  │  ┌──────────────────────────────────────────────────┐  │                  │
│  │  │  "Cliquez où vous étiez quand vous avez pris   " │  │                  │
│  │  │  "cette photo."                                   │  │                  │
│  │  │  [mini-plan du bien — polygones pièces]  + ✛     │  │                  │
│  │  │   ┌───────────┐   ┌──────────┐                   │  │                  │
│  │  │   │  SALON    │   │  CH. 1   │                   │  │                  │
│  │  │   │ (surligné)│   │          │                   │  │                  │
│  │  │   └───────────┘   └──────────┘                   │  │                  │
│  │  └──────────────────────────────────────────────────┘  │                  │
│  ├────────────────────────────────────────────────────────┤                  │
│  │  SOUS-ÉTAPE 4 : Définir l'angle de vue                 │                  │
│  │  [●] pin positionné dans le plan — flèche → draggable  │                  │
│  │  "Glissez la flèche dans la direction où vous regardiez"│                  │
│  │  Angle actuel : 45°  [−15°] [+15°]                     │                  │
│  ├────────────────────────────────────────────────────────┤                  │
│  │  [Annuler]                 [Confirmer →] (disabled si  │                  │
│  │                             position OU angle absents) │                  │
│  └────────────────────────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Version MOBILE (full-screen, bouton X haut gauche)

**Particularités mobile :**
- Sidebar du plan masquée, canvas plein écran
- Zoom auto sur la pièce concernée au chargement (zoom intelligent pour précision tactile)
- Touch interactions : tap = position, drag en arc autour du pin = angle (pas de croix permanente)
- Long-press sur pin = menu contextuel (supprimer, repositionner)

```
┌─────────────────────────────────────┐
│  [X]  Ajouter une photo — Salon     │  ← header 56px, X haut-gauche
├─────────────────────────────────────┤
│  ÉTAPE 1/5                          │  ← progress dots haut
│                                     │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐ │
│  │                                 │ │
│  │   Glissez vos photos ici       │ │
│  │   ou tapez pour sélectionner   │ │
│  │                                 │ │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘ │  ← zone hachurée 60% hauteur
│                                     │
│  [📷 Ouvrir la pellicule]          │  ← bouton 44px minimum
├─────────────────────────────────────┤
│  (après sélection photo)            │
│  ÉTAPE 3/5 — Placez le point       │
│  Tapez où vous étiez sur ce plan   │
│  ┌──────────────────────────────┐  │
│  │  [plan zoomé sur Salon]      │  │  ← zoom auto centré sur la pièce
│  │                              │  │
│  │     ┌──────────────┐        │  │
│  │     │  SALON       │        │  │
│  │     │  (plein écran│        │  │
│  │     │   de la vue) │        │  │
│  │     └──────────────┘        │  │
│  └──────────────────────────────┘  │
├─────────────────────────────────────┤
│  ÉTAPE 4/5 — Angle de vue          │
│  Glissez la flèche autour du point  │
│  [●] → arc draggable               │
│  (long-press sur ● = supprimer)     │
├─────────────────────────────────────┤
│  [     Confirmer (2/5 définis)    ] │  ← sticky bottom 52px
└─────────────────────────────────────┘
```

---

## 5. Wireframe Écran C — Modale questions IA (bloquante)

**Proportions** : 600×500px centré, identiques desktop et mobile (mobile = full-screen au-dessus 375px).

```
┌────────────────────────────────────────┐
│  L'IA a 2 questions avant de générer   │
│  ─────────────────────────────────────  │
│  Q1 — Salon (12 m² — surface étrange)  │
│  La surface 12 m² est sous la moyenne. │
│  Confirmez-vous cette valeur ?         │
│  [oui, c'est exact] [12 m² → ___ m²]  │
│                                         │
│  Q2 — SDB (photos floues vs nettes)    │
│  Vos 2 photos montrent des états        │
│  différents. Quel état rénové cibler ? │
│  ◯ État de la photo 1 (douche italie)  │
│  ◯ État de la photo 2 (baignoire vint) │
│  ◯ Mix : ____________________________   │
│                                         │
│  [Envoyer mes réponses (2/2)]          │
│  Annuler retourne à l'étape 4           │
└────────────────────────────────────────┘
```

**États possibles :**

| État | Déclencheur | Comportement |
|---|---|---|
| **Loading IA** | Analyse des photos en cours | Skeleton card + texte "Analyse de vos photos en cours…" — pas de bouton |
| **Questions affichées** | Analyse terminée, triggers détectés | Questions interactives, bouton "Envoyer" disabled tant que toutes les questions sans réponse |
| **Génération en cours** | Après envoi des réponses | Barre de progression + texte "Création des visuels (2 min)…" — modale reste ouverte |
| **Erreur IA indisponible** | Timeout ou erreur serveur | Message d'erreur clair + 2 boutons : "Réessayer maintenant" / "Continuer sans générer (m'envoyer les visuels par mail quand prêt)" |

**Règle d'accessibilité :** focus auto sur la première question à l'ouverture de la modale. Trap focus dans la modale (Tab ne sort pas). Escape = Annuler (retour Écran A, aucune génération lancée). aria-live="polite" sur le compteur de réponses "(2/2)" pour VoiceOver.

---

## 6. Wireframe Écran D — Galerie résultats par pièce

### 6.1 Version DESKTOP (1280px)

**Pattern** : grid 2 colonnes — visuel principal 60% gauche + miniatures en pile 40% droite. Header pièce : nom + surface + nb visuels. Actions en pied de panneau.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [← Retour au plan]  Salon — 28 m² — 3 visuels générés           [X]       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                          │                                    │
│  ┌─────────────────────────────────┐    │  MINIATURES PILE (40%)             │
│  │                                 │    │                                    │
│  │   VISUEL PRINCIPAL — 60%        │    │  ┌──────────────────────────────┐  │
│  │   (visuel sélectionné           │    │  │  [V1] Vue salon canapé  ✓   │  │
│  │    plein panneau gauche)        │    │  └──────────────────────────────┘  │
│  │                                 │    │  ┌──────────────────────────────┐  │
│  │   [V1 — Vue salon jour]         │    │  │  [V2] Vue cuisine ouverte    │  │
│  │                                 │    │  └──────────────────────────────┘  │
│  └─────────────────────────────────┘    │  ┌──────────────────────────────┐  │
│                                          │  │  [V3] Vue depuis entrée      │  │
│  ← Visuel 1 sur 3  →                    │  └──────────────────────────────┘  │
│                                          │                                    │
├──────────────────────────────────────────┴────────────────────────────────────┤
│  [✓ Valider]  [↺ Régénérer]  [💬 Itérer]  [⬇ Télécharger]                   │
├──────────────────────────────────────────────────────────────────────────────┤
│  Navigation pièces :   ← Chambre 1      Salon (en cours)    Cuisine →        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Version MOBILE (≤ 768px)

**Pattern** : carrousel swipe horizontal (1 visuel par écran), dots de pagination, actions en sticky bottom-bar.

```
┌─────────────────────────────────────┐
│  [← Plan]  Salon — 3 visuels  [⬇]  │  ← header 56px
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │   VISUEL PLEIN ÉCRAN        │   │  ← swipe gauche/droite
│  │   (aspect ratio 4:3)        │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│         ● ○ ○   (dots pagination)  │
│                                     │
├─────────────────────────────────────┤
│  Navigation pièces (bottom-tabs)    │
│  [1/10 — Salon ▸] [← CH1] [Cui →] │
├─────────────────────────────────────┤
│  [✓ Valider] [↺ Régénér] [💬 Itér] │  ← sticky bottom-bar 52px
└─────────────────────────────────────┘
```

**Interactions galerie :**
- Desktop : clic sur miniature = change le visuel principal. Flèches ← → changent le visuel ET la miniature sélectionnée.
- Mobile : swipe horizontal change le visuel + déplace le dot actif. Tap sur visuel = zoom fullscreen (pinch-to-zoom pour inspecter les détails).
- "Itérer" ouvre un chat IA inline (mobile = modale bottom-sheet, desktop = panneau latéral remplaçant les miniatures).

---

## 7. Parcours utilisateur complet — 8 étapes

| # | Action utilisateur | Réaction interface | État système |
|---|---|---|---|
| 1 | Arrivée Étape 4 depuis Étape 3 | Canvas plan affiché avec polygones pièces colorés, sidebar liste les pièces avec badge "0 photo" sur chacune, bouton "Générer" grisé | `step: 4`, `photos: []`, `generation_status: idle` |
| 2 | Clic sur pièce "Salon" dans la sidebar | Polygon Salon prend le contour accent (highlight 2px bleu), canvas zoome doucement (300ms ease) pour centrer la pièce, scroll sidebar vers la section Salon | `selected_room: salon_id`, animation zoom canvas |
| 3 | Tap "+" sur la section Salon dans la sidebar (ou FAB mobile) | Modale Écran B s'ouvre par-dessus le canvas (overlay dim 60%), focus auto sur la zone de dépôt, canvas Écran A reste visible en arrière-plan | `modal: upload_open`, `target_room: salon_id` |
| 4 | Sélection fichier + placement position + drag angle | Pin marker (●) apparaît sur le plan au point cliqué, flèche directionnelle (→) se positionne à l'angle choisi, bouton "Confirmer" s'active, toast "Photo assignée au Salon" après confirmation | `photo: {position_x, position_y, angle_degrees}`, `room.photos.count: 1`, badge sidebar "1 photo" |
| 5 | Saisie commentaire libre dans la sidebar (champ texte Salon) | Autosave 500ms après fin de frappe, indicateur discret "Enregistré ✓" fade-in/fade-out 1s | `room.comment: "..."`, persisted server-side |
| 6 | Déplacement du slider "Visuels" de 1 à 3 sur la section Salon | Valeur numérique mise à jour en temps réel, debounce 300ms avant persistance, badge sidebar affiche "3 visuels" | `room.visual_count: 3`, debounced save |
| 7 | Clic "Générer tous les visuels →" (CTA pied de sidebar) | Si triggers T1-T5 détectés : Modale Écran C s'ouvre (questions bloquantes). Si 0 trigger : génération directe démarre, barre de progression par pièce apparaît dans la sidebar | `generation_status: analyzing` puis `questions_modal: open` OU `generation_status: processing` |
| 8 | Validation finale de chaque pièce dans Écran D | Badge pièce passe à "VALIDÉ ✓" dans la sidebar, navigation automatique vers la pièce suivante non validée. Quand 100% pièces validées : CTA "Valider et exporter" apparaît en bas de sidebar | `room.status: validated`, puis `project.status: completed` si toutes pièces validées |

---

## 8. États UI critiques — 10 états transverses

1. **Plan vide (aucune pièce extraite)** — Déclencheur : `polygons.length === 0` au chargement de l'Étape 4. Comportement : canvas affiche illustration vide + message "Aucune pièce extraite. Retournez à l'étape 3 pour valider le plan." + bouton "← Retour Étape 3". Bouton "Générer" inexistant (pas grisé, absent). Aucune sidebar pièce.

2. **Portrait trop étroit pour placement précis** — Déclencheur : `viewport.width < 600px` ET `orientation === portrait`. Comportement : toast non-bloquant en bas "Tournez votre écran pour plus de précision lors du placement." Icône rotation. Dismissable (croix), ne réapparaît pas la session courante (`sessionStorage`). Canvas reste fonctionnel.

3. **Ambiguïté gestuelle drag photo vs pan canvas (mobile)** — Déclencheur : touch démarrant sur un marqueur photo (●). Comportement : long-press 300ms sur le marqueur = lock drag photo (feedback haptic 10ms), retour visuel "grabbing". Swipe simple ailleurs = pan canvas. Si touch relâché avant 300ms sur marqueur = tap = ouvre contrôleur d'angle (bottom-sheet). Distinction gérée par `pointer events` unifiés.

4. **Limites du zoom canvas** — Déclencheur : pinch-zoom ou boutons +/-. Comportement : min 0.5× (vue d'ensemble du plan entier), max 4× (précision placement). Au-delà des limites : résistance visuelle (rebond léger 150ms). Double-tap = reset auto-fit (ajuste le zoom pour afficher le plan entier dans le viewport). Valeur de zoom affichée en % si > 1×.

5. **Placement photo proche d'une frontière inter-polygones** — Déclencheur : `distance_to_adjacent_polygon < 20px UI` au moment du clic de placement. Comportement : snap automatique au polygone dont le centroïde est le plus proche. Toast 3s "Attribué à : Salon (pièce la plus proche)". Lien "Modifier l'attribution" dans le toast ouvre un sélecteur de pièce (liste déroulante). Pas de blocage.

6. **Sidebar collapsed sur mobile** — Déclencheur : chargement sur viewport ≤ 768px. Comportement par défaut : sidebar hidden, canvas prend 100% de la hauteur disponible. Accès sidebar : swipe depuis le bord droit (24px grab zone) OU bouton hamburger ☰ en header. Ouverture = drawer overlay 80% width, backdrop dim 40%, tap outside = ferme. État persist dans `sessionStorage` (si user a ouvert et refermé, prochain reload respecte la préférence).

7. **Progression génération multi-pièces** — Déclencheur : génération IA en cours (`generation_status: processing`). Comportement : barre de progression globale en top de page (thin bar 4px, couleur accent, animation indéterminée). Sidebar : badge par pièce mis à jour en temps réel (⟳ processing / ✓ done / ⏳ waiting). Texte pied sidebar "3 / 10 pièces traitées". Bouton "Générer" remplacé par "Génération en cours…" (non cliquable). Si user navigue ailleurs : barre persiste en header global.

8. **Perte réseau temporaire** — Déclencheur : `navigator.onLine === false` après action de sauvegarde. Comportement : banner discret haut de page "Reconnexion en cours…" (couleur warning, non-bloquant). Au retour réseau : banner passe à "Synchronisé ✓" fade-out 2s. Aucun état perdu (autosave optimiste + queue de replay côté client). Si la perte dure > 30s : banner devient persistant "Hors-ligne — vos modifications sont en attente de synchronisation".

9. **Mode hors-ligne persistant** — Déclencheur : `navigator.onLine === false` pendant > 30s OU détecté au chargement. Comportement : banner persistant en haut "Hors-ligne — édition non sauvegardée". Bouton "Générer" disabled + tooltip "Reconnectez-vous pour lancer la génération". Upload de photos désactivé (bouton "+" grisé + message "Upload impossible hors-ligne"). Modifications locales (commentaires, sliders) bufférisées, envoyées dès reconnexion.

10. **Timeout questions IA (retour après > 24h)** — Déclencheur : user revient sur la page après une session de questions IA expirée côté serveur. Comportement : modale plein écran centrée (pas dismissable) : "Vos questions ont expiré (session > 24h). Pour générer vos visuels, relancez l'analyse." + 2 boutons : "Relancer l'analyse" (primary, repart du step 7 parcours) / "Abandonner cette génération" (secondary, remet le projet en état `idle`, pièces conservées).

---

## 9. Handoff

**@design — tokens et composants canvas**

Fichiers d'entrée :
- Ce document (`docs/ux/visuals-step-v2-wireframes.md`)
- `docs/design/design-tokens.json` si existant (sinon @design crée le set canvas ex-nihilo)

Tokens à créer/valider :
- `ROOM_TYPE_COLORS` : palette par type de pièce (salon, chambre, cuisine, sdb, séjour…), semi-transparent (opacity 0.25 fill, 1.0 border), accessible WCAG AA en contraste avec le fond blanc du plan
- États polygone : `default` / `hover` / `selected` (border 2px accent) / `complete` (badge vert) / `incomplete` (badge warning)
- Marker photo (PhotoMarker) : cercle blanc 32px, border 2px accent, icône 📷 16px, shadow `0 2px 8px rgba(0,0,0,0.2)`
- Flèche angle (AngleIndicator) : ligne SVG 48px, couleur accent, arrowhead 8px, draggable handle cercle 16px au bout
- États bouton Confirmer : `disabled` (opacity 0.4, cursor not-allowed) / `active` (primary)

Composants à spécifier :
- `PhotoMarker` : marker sur canvas, props `angle_degrees`, `photo_name`, états hover/selected/dragging
- `AngleIndicator` : flèche SVG rotative, props `angle_degrees`, callback `onAngleChange` (visuel) / `onAngleCommit` (snapshot — voir règle s27.2)
- `PolygonPiece` : polygone SVG pièce, props `room_type`, `points`, états `default/hover/selected/complete/incomplete`
- `ChatQuestionCard` : card question IA, props `question_type` (confirm/choice/free), état `answered/unanswered`
- `VisualGalleryItem` : miniature résultat, props `visual_url`, `selected`, badge `validated`

**@fullstack — implémentation**

Fichiers d'entrée :
- Ce document + spec PM (`docs/product/visuals-step-v2-specs.md`) + brief IA (`docs/ia/visuals-step-v2-pipeline.md`)
- Code existant : `versi-studio/src/app/vs/projects/[id]/visuals/page.tsx`, composants `VisualRoom.tsx`, `RoomGrid.tsx`

Points d'attention critiques :

- **Dual-callback drag** (règle s27.2) : pour tout drag sur le canvas (déplacement photo, rotation angle), implémenter 2 callbacks séparés — `onZoneChange` (visuel temps réel, pas de snapshot) / `onZoneCommit` (snapshot historique unique au mouseup/touchend). Ne pas snapshoter à chaque move event = évite N micro-undos au Ctrl+Z.
- **Précision touch placement photo** : au tap "+" sur une pièce mobile, déclencher un zoom auto centré sur la pièce (`useEffect` + animation 300ms). Facteur de zoom = ajuster pour que la pièce occupe 80% du viewport.
- **Performance canvas polygones complexes** : préférer `react-konva` ou SVG natif à Canvas API brut. Au-delà de 20 polygones, activer `will-change: transform` sur le layer des polygones uniquement.
- **HEIC iPhone** : conversion serveur au moment de l'upload (cf. brief @ia section 3). Client envoie le fichier brut, serveur retourne JPEG pour affichage.
- **Touch events unifiés** : utiliser `pointer events` (pas `mouse events` + `touch events` séparés) pour le code de drag/pan. Évite le double-déclenchement sur tablettes hybrides.
- **Présélection au chargement** (règle s27.2) : si `rooms.length > 0`, sélectionner automatiquement `rooms[0]` au load via `useEffect` avec `ref` pour ne pas écraser une sélection user existante. Le highlight du polygone sélectionné est le feedback visuel par défaut.

**Critères de validation pour @reviewer :**
- G19 (5 états par écran) : section 8 couvre 10 états transverses ; chaque écran A/B/C/D a ses états propres dans la spec PM
- G20 (WCAG 2.2 AA) : touch targets ≥ 44×44px (marqueurs photo, boutons sidebar, FAB), focus-visible sur tous les éléments interactifs canvas + sidebar, `prefers-reduced-motion` (transitions zoom < 200ms si activé), contraste WCAG AA sur labels polygones (fond semi-opaque blanc derrière le texte)
- G27 (layout pattern explicite) : couvert par wireframes ASCII sections 3-6 avec pattern nommé, responsive documenté, comportement interaction défini

---

## Auto-évaluation gates

- G1 — 0 TODO non résolus ✓
- G3 — Handoff structuré avec destinataires, fichiers, risques ✓
- G5 — Persona : Laurent (investisseur client final) + Thomas (marchand de biens utilisateur) ✓
- G9 — Owner explicite : @design (tokens/composants) + @fullstack (implémentation) ✓
- G10 — 0 langage vague : chaque écran a pattern nommé, dimensions, états nommés ✓
- G12 — Implémentable : wireframes ASCII + composants nommés + callbacks spécifiés ✓
- G19 — 5 états par écran : section 8 = 10 états transverses + spec PM complète les états écran par écran ✓
- G20 — WCAG 2.2 AA : touch targets 44px, focus-visible, reduced-motion, contrastes documentés ✓
- G27 — Layout pattern explicite par section dans chaque wireframe (sections 3-6) ✓
