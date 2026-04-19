# UX — Étape 2 Lots : rework layout (session s23)

**Auteur** : @ux  
**Date** : 2026-04-19  
**Fichiers sources** : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx` (lignes 916-962), `versi-studio/src/components/vs/LotPanel.tsx`

---

## 1. Diagnostic — Layout actuel (problème identifié)

### Ordre de rendu dans `page.tsx` (bloc principal, lignes ~916–987)

```
┌─────────────────────────────────────────────────────────┐
│  En-tête (titre, sous-titre)                            │
│  Erreur globale (conditionnel)                          │
│  Sélecteur d'étage (conditionnel)                       │
│                                                         │
│  [BANNIÈRE CALIBRATION]  ← "Calibrer le plan" [bouton] │
│  ← warning border-l-4, pleine largeur                  │
│                                                         │
│  [BANNIÈRE IA] ← "L'IA a pré-créé X lots..."           │
│  ← bg-blue-50, pleine largeur                          │
│                                                         │
│  [CANVAS plan] ← 400-550px de haut                     │
│  [LotPanel — grille + boutons d'action]                 │
└─────────────────────────────────────────────────────────┘
```

### Problème identifié

Les deux bannières (calibration + IA) sont empilées **au-dessus du canvas**, entre l'en-tête et le plan. Quand les deux sont présentes simultanément, l'utilisateur voit :

1. Titre
2. Bannière calibration (avec bouton "Calibrer le plan")
3. Bannière IA (message pré-création lots)
4. Canvas
5. Actions LotPanel

**Conséquence** : le bouton "Calibrer le plan" est enfoncé visuellement entre deux blocs informatifs. Il est proéminent dans sa bannière mais la bannière IA qui suit immédiatement dilue l'attention et "éclipse" la zone calibration. L'utilisateur perçoit deux messages concurrents sans savoir lequel traiter en premier.

**Heuristique violée** : H8 (design minimaliste — trop d'éléments visuellement équivalents) + H1 (visibilité de l'état — l'utilisateur ne sait pas dans quel ordre agir).

---

## 2. Layout proposé

### Principe de hiérarchie

- **Calibration = action bloquante pré-requise** → doit rester en position haute, avant le canvas. C'est un prérequis aux m². Statut : warning actif.
- **Message IA = information de contexte post-extraction** → ne doit PAS interrompre le flux entre calibration et canvas. Doit être intégré dans le LotPanel (panneau des lots), là où l'utilisateur va agir sur ces lots.

### Schéma proposé

```
┌─────────────────────────────────────────────────────────┐
│  En-tête (titre, sous-titre)                            │
│  Erreur globale (conditionnel)                          │
│  Sélecteur d'étage (conditionnel)                       │
│                                                         │
│  [BANNIÈRE CALIBRATION] — si plan non calibré           │
│  ← seule bannière avant le canvas                       │
│  ← bouton "Calibrer" bien isolé, pas concurrencé        │
│                                                         │
│  [CANVAS plan] ← pleine largeur                         │
│                                                         │
│  [LotPanel]                                             │
│    ├── [INFO IA — intégrée en haut du panneau]          │
│    │   "X lots pré-détectés — vérifiez et validez"      │
│    │   Style : discret (texte + badge, pas de bloc bleu)│
│    ├── Grille de cards lots                             │
│    └── Actions (Ajouter, Dessiner, Valider et passer)   │
└─────────────────────────────────────────────────────────┘
```

### Rendu du message IA dans LotPanel

Le message IA doit être intégré dans le composant `LotPanel`, en haut de la section liste (avant la grille de cards), sous la forme d'une ligne contextuelle légère — pas d'un bloc alert avec couleur de fond :

```
┌─ LotPanel ────────────────────────────────────────────┐
│  2 lots  ·  [badge IA]  X lots pré-détectés           │
│  (ligne fine, text-muted, pas de bg coloré)           │
│                                                       │
│  [ Card Lot 1 ]  [ Card Lot 2 ]  [ Card Lot 3 ]      │
│  ...                                                  │
│  [ + Ajouter ]  [ Dessiner ]  [ Valider et passer ]   │
└───────────────────────────────────────────────────────┘
```

**Wording final du message intégré** : à définir par @copywriter dans `docs/copy/s23-etape2-message-rework.md`. Le placeholder à ce stade : "{N} lots pré-détectés · vérifiez et ajustez si besoin".

---

## 3. Justification de la hiérarchie

| Élément | Position actuelle | Position proposée | Pourquoi |
|---|---|---|---|
| Bannière calibration | Avant canvas (OK) | Avant canvas (inchangé) | Action bloquante, pré-requise avant tout tracé |
| Bannière IA | Avant canvas (PROBLÈME) | Dans LotPanel, en-tête | L'info concerne les lots, pas le canvas. L'utilisateur agit dans le panel, pas au-dessus du plan |
| Canvas | Après 2 bannières | Après 1 seule bannière max | Accès direct au plan, moins de friction visuelle |

**Gain** : le bouton "Calibrer" n'est plus concurrencé visuellement. Il est le seul call-to-action entre l'en-tête et le canvas quand le plan n'est pas calibré. Quand le plan est calibré, la bannière disparaît et le canvas est accessible immédiatement sous l'en-tête.

---

## 4. Todo pour @fullstack

### Modification 1 — `page.tsx` : supprimer la bannière IA avant le canvas

**Fichier** : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`  
**Lignes concernées** : 950–962 (bloc `{/* U5 — Bannière feedback post-extraction IA */}`)  
**Action** : supprimer entièrement ce bloc JSX. Ne pas le déplacer ici — il sera recréé dans LotPanel.

### Modification 2 — `LotPanel.tsx` : ajouter l'info IA dans l'en-tête du panneau

**Fichier** : `versi-studio/src/components/vs/LotPanel.tsx`  
**Localisation** : bloc `{/* En-tête */}` (lignes 297–306)  
**Action** : ajouter sous le `<h2>` (compteur de lots) une ligne contextuelle affichant le nombre de lots IA suggérés, conditionnelle à `aiSuggestedLots.length > 0`.  
**Props requises** : `aiSuggestedLots` est déjà calculé dans LotPanel (ligne 290) — pas de nouveau prop nécessaire.  
**Style** : texte xs, text-muted ou color-interactive-primary (pas de bg coloré, pas de bordure). Simple ligne inline.  
**Wording** : utiliser la valeur finale de `docs/copy/s23-etape2-message-rework.md` quand disponible. En attendant : `"{N} lot{s} pré-détecté{s} par l'IA — vérifiez et ajustez si besoin"`.

### Modification 3 (optionnelle, si validation Thomas) — séparer visuellement calibration et canvas

Si la bannière calibration reste la seule bannière avant le canvas, envisager d'ajouter un `mb-lg` supplémentaire entre la bannière et le canvas pour créer une respiration visuelle claire. À confirmer visuellement après les modifications 1 et 2.

---

## 5. Coordination @copywriter

Le wording du message IA intégré dans LotPanel est délégué à @copywriter.  
Fichier attendu : `docs/copy/s23-etape2-message-rework.md`  
Contraintes de wording transmises :
- Court : max 1 ligne (le message est inline, pas dans un bloc)
- Orienté action : l'utilisateur doit comprendre qu'il doit vérifier, pas juste lire
- Pas de jargon technique ("extraction", "pré-créé" jugé peu clair par Thomas)
- Ton : direct, sobre (pas "Super ! L'IA a...")

---

## Tests UX — Étape 2 layout rework

| Test | Critère de succès | Statut |
|---|---|---|
| Bouton Calibrer visible sans concurrent | Seul CTA entre en-tête et canvas quand plan non calibré | A vérifier post-implémentation |
| Message IA non-intrusif | Pas de bloc coloré dominant avant le canvas | A vérifier post-implémentation |
| Charge cognitive | 1 seule décision demandée avant d'accéder au canvas | Oui (calibrer OU continuer) |
| Découvrabilité info IA | Message visible dans LotPanel dès ouverture | A vérifier post-implémentation |
| WCAG 2.2 AA | Contraste texte muted sur bg blanc >= 4.5:1 | Inchangé (tokens existants) |

---

**Handoff → @fullstack**

- Fichier produit : `/home/user/Versi/docs/ux/s23-etape2-layout-rework.md`
- Décisions prises :
  - La bannière IA (bloc blue-50) est supprimée de `page.tsx` avant le canvas
  - Un message contextuel léger (1 ligne, sans bg coloré) est ajouté dans l'en-tête de `LotPanel.tsx`
  - La bannière calibration reste en position actuelle, inchangée
- Points d'attention :
  - Ne pas modifier l'ordre des autres éléments de `page.tsx` (sélecteur d'étage, gestion erreurs)
  - Le wording final du message LotPanel viendra de `docs/copy/s23-etape2-message-rework.md` — utiliser un placeholder en attendant
  - Aucun nouveau prop nécessaire dans LotPanel (aiSuggestedLots est déjà calculé localement)
