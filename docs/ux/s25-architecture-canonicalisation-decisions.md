# Architecture UX canonicalisation s25 — décisions

**Date** : 2026-04-22 · **Agent** : @ux · **Session** : versi-s25

---

## Contexte : 5 trous identifiés

L'impl @fullstack s25 a ajouté la canonicalisation en amont du pipeline IA (plan brut → plan reformaté avant extraction). L'UI downstream (Étapes 2/3) n'a pas été adaptée. Cinq trous :

1. Étapes 2/3 affichent `file_path` (plan original) mais les polygones IA ont été calculés sur le plan reformaté → décalage géométrique
2. Calibration m² (`m2_per_pixel`) mesurée sur original mais extraction sur reformaté → ratio potentiellement faux
3. `label-snap.ts` OCR tourne sur une source ambiguë → labels risquent d'être perdus
4. Absence d'interface visible pour Thomas sur l'étape de reformatage (comparateur passif non actionnable)
5. Fallback silencieux actuel : Thomas ne sait pas si son plan a été reformaté ou non

---

## D1 — Étape Reformatage : verdict A

**Verdict : (a) Oui, étape dédiée avec CTA "Valider le reformatage"**

Justification : Le comparateur passif ne satisfait pas la règle découvrabilité s22 — une feature non actionnée n'existe pas pour Thomas. Une étape dédiée entre dépôt du plan et Étape 2 Lots rend visible l'opération IA la plus critique du pipeline. Elle permet aussi de piloter explicitement le fallback (D5). Mot pivot UI : "Reformatage du plan". Jamais "canonicalisation".

Pattern validé s22 : bouton permanent, visible à l'arrivée sur la page, pas conditionnel. La validation en 1 clic aligne sur la règle minimum de clics : "Valider le plan reformaté" avance ET valide en même temps.

Comportement : si reformatage réussi → comparateur avant/après obligatoire (pattern s22 comparateur IA) + CTA "Utiliser ce plan". Si fallback → bannière orange + CTA "Continuer avec le plan original". Dans les deux cas, Thomas avance sans blocage.

---

## D2 — Affichage canvas étapes 2/3 : verdict A

**Verdict : (a) Afficher le plan reformaté (canonical) dans le canvas des étapes 2 et 3**

Justification : Les polygones IA ont été calculés sur le plan reformaté. Afficher le plan original avec ces polygones produit un décalage visuel garanti — c'est le bug actuel. La cohérence IA prime sur la familiarité du plan original. Thomas a précisé "meilleure solution marché pour marchand de biens" : le plan reformaté est plus lisible (meubles supprimés, murs nets), il est fonctionnellement supérieur.

L'option C (toggle) ajoute 1 clic et 2 états à maintenir — contre la règle minimum de clics. L'option B (original + reprojection affine) ajoute une transformation géométrique supplémentaire et un point de défaillance sans gain utilisateur réel.

Condition : si le reformatage a échoué (fallback déclenché), afficher le plan original — comportement identique à s24, pas de régression.

Implémentation : `planImageUrl` dans `lots/page.tsx` doit pointer vers `canonical_image_url` (colonne DB déjà créée s25) quand non null, sinon `file_path` (fallback).

---

## D3 — Calibration m² : verdict C

**Verdict : (c) La calibration se fait toujours sur le plan reformaté (canonical)**

Justification : L'option A (invalider + recalibration forcée) crée une interruption de workflow non justifiée si Thomas a déjà calibré. L'option B (recalcul automatique du facteur affine) est fragile : si le ratio canonical/original n'est pas exactement 1:1 (crop, padding IA), la conversion introduit une erreur difficile à détecter.

La solution propre : la calibration s'effectue TOUJOURS sur le plan affiché dans le canvas, qui est désormais le plan reformaté (D2). Le `m2_per_pixel` est calculé depuis les dimensions naturelles du plan reformaté. Zéro conversion, zéro ambiguïté.

Conséquence UI : si Thomas a calibré avant la mise en prod s25, sa calibration existante est invalide. Afficher une bannière d'avertissement "Calibration à vérifier — le plan a été reformaté" avec CTA "Recalibrer". Ne pas bloquer le workflow, avertir uniquement.

---

## D4 — Snap-to-label OCR : verdict B

**Verdict : (b) OCR sur le plan original, coordonnées converties vers le plan reformaté via transformation**

Justification : Le plan reformaté supprime explicitement tous les textes (règle #3 du prompt canonicalisation : "no text labels, no room names"). Faire tourner l'OCR sur le plan reformaté produit donc 0 label par construction — c'est un bug structurel, pas un risque.

L'option C (OCR sur les deux) est redondante : on fait l'OCR là où les labels existent (original), on obtient les coordonnées dans le repère original, on applique la transformation affine original→canonical pour les positionner sur le plan reformaté.

La transformation affine est simple si gpt-image-1 préserve le ratio (hypothesis actuelle, à confirmer en reality check). Si distorsion > 3px détectée : snap-to-label se rabat sur les coordonnées IA directement sans OCR (fallback déjà en place s23).

---

## D5 — Fallback si reformatage échoue : verdict C

**Verdict : (c) Fallback avec retry auto 2x puis bannière orange non bloquante**

Justification : L'option A (fallback silencieux) viole la règle découvrabilité s22 — Thomas ne sait pas ce qui s'est passé. L'option B (bloquer) viole la règle minimum de clics et pénalise le cas fréquent (plans complexes, API momentanément lente).

Le pattern C combine fiabilité technique (2 retries couvrent les timeouts transitoires) et transparence utilisateur (bannière visible). La bannière ne bloque pas — Thomas peut continuer avec le plan original, les polygones IA seront calculés sur l'original (comportement s24 garanti). Le texte de la bannière : "Le reformatage automatique du plan n'a pas pu aboutir. Les résultats peuvent être moins précis."

---

## Wireframe — flow utilisateur

```
[Dépôt du plan]
       │
       ▼
[Reformatage du plan]  ← NOUVELLE ÉTAPE UI
  ┌────────────────────────────────────────┐
  │  Avant         │  Après (reformaté)   │
  │  [plan brut]   │  [plan épuré]        │
  │                │                      │
  │  CTA unique : "Utiliser ce plan →"    │
  └────────────────────────────────────────┘
  (si fallback : bannière orange + "Continuer avec le plan original →")
       │
       ▼
[Étape 2 — Lots]
  Canvas affiche : plan reformaté (canonical_image_url)
  Polygones IA collent aux murs reformatés ✓
  Calibration m² sur plan reformaté ✓
       │
       ▼
[Étape 3 — Pièces]
  Canvas affiche : plan reformaté (canonical_image_url)
  OCR sur original → coords converties → snap sur reformaté ✓
       │
       ▼
[Étape 4 — Visuels]
```

---

## Specs détaillées pour @fullstack (Round B)

### 1. Nouvelle page/étape UI "Reformatage"

**Fichier à créer** : `versi-studio/src/app/vs/projects/[id]/reformatage/page.tsx`

- Lire `canonical_image_url` et `file_path` depuis `vs_plans` (plan de l'étage courant)
- Si `canonical_image_url` non null : afficher comparateur avant/après Grid 2 colonnes 50/50 (pattern s22 VisualResult.tsx)
  - Label gauche : "Plan original"
  - Label droite : "Plan reformaté"
  - CTA : bouton primaire "Utiliser ce plan →" → navigue vers `/lots`
- Si `canonical_image_url` null (fallback) : afficher bannière orange + texte "Le reformatage automatique du plan n'a pas pu aboutir. Les résultats peuvent être moins précis." + CTA "Continuer avec le plan original →" → navigue vers `/lots`
- Stepper : insérer entre Étape 1 (upload) et Étape 2 (lots). Index stepper = 1.5 ou renuméroter 1→2→3→4→5.

### 2. `lots/page.tsx` — planImageUrl depuis canonical

**Fichier** : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`

- Ligne 204-207 : modifier `planImageUrl` pour utiliser `canonical_image_url` en priorité
```typescript
const planImageUrl = useMemo(() => {
  if (!currentPlan) return null;
  const src = currentPlan.canonical_image_url ?? currentPlan.file_path;
  return `/api/vs/files?path=${encodeURIComponent(src)}`;
}, [currentPlan]);
```
- Ajouter `canonical_image_url` dans le type `VsPlan` si absent

### 3. `rooms/page.tsx` — même correction planImageUrl

**Fichier** : `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx`

- Appliquer la même modification que lots/page.tsx (même pattern, même ligne approximative)

### 4. `label-snap.ts` — OCR sur plan original

**Fichier** : `versi-studio/src/lib/vs/label-snap.ts` (ou route extract)

- S'assurer que l'OCR Tesseract lit `file_path` (plan original), PAS `canonical_image_url`
- Après snap, si `canonical_image_url` existe : appliquer transformation affine coordinates original → canonical
- Transformation affine minimale : si les deux images ont même ratio (2048×2048), la transformation est une simple mise à l'échelle. Calculer `scaleX = canonicalW / originalW`, `scaleY = canonicalH / originalH`.
- Si ratio diverge > 5% : log warning, utiliser coords OCR sans transformation (fallback gracieux)

### 5. Bannière "Calibration à vérifier" (étape 2)

**Fichier** : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`

- Condition : `currentPlan.canonical_image_url !== null && currentPlan.m2_per_pixel !== null && currentPlan.calibration_source === 'original'`
- Si vrai : afficher bannière jaune "Ce plan a été reformaté. Vérifiez la calibration m² pour garantir des surfaces précises." avec CTA "Recalibrer"
- Ajouter colonne `calibration_source` dans `vs_plans` (valeurs : `'original'` | `'canonical'` | null) OU déduire de la date de calibration vs date de canonicalisation

### 6. Stepper — mise à jour

**Fichier** : composant stepper Versi Studio (à identifier via Glob `src/**/Stepper*`)

- Insérer étape "Reformatage" entre dépôt et lots
- Respecter règle : étape complétée = cliquable indéfiniment (s22)

---

## Critères 10/10 post-impl (pour @qa)

| Critère | Test | Seuil |
|---|---|---|
| C1 — Cohérence canvas | Polygones lots/pièces collent aux murs du plan affiché | 0 décalage visible > 3px |
| C2 — Comparateur reformatage | Page reformatage affiche avant/après avec CTA actionnable | Visible dès arrivée, pas conditionnel |
| C3 — Fallback visible | Bannière orange si canonical_image_url null | Affichée dans 100% des cas fallback |
| C4 — OCR labels préservés | Snap-to-label identifie ≥ 80% des labels présents sur plan original | Test sur 5 plans réels P00-P03+Muguets |
| C5 — Calibration m² | Surface lot calculée sur plan reformaté = surface attendue ± 5% | Test calibration + mesure lot connu |
| C6 — Découvrabilité | CTA "Utiliser ce plan" visible sans scroll sur desktop 1280px | Screenshot Playwright |
| C7 — Navigation libre | Retour Étape 2 depuis Étape 3 n'invalide pas les lots saisis | Test navigation aller-retour |
| C8 — Zéro anglicisme UI | Aucun "canonical", "upload", "fallback" visible dans l'UI | Grep `src/**/*.tsx` |
| C9 — Undo/redo canvas | Ctrl+Z restaure le dernier déplacement de lot sur plan reformaté | Test Playwright |
| C10 — Performance | Page reformatage charge en < 3s sur connexion standard | Lighthouse / Network tab |

---

## Tests UX — flow reformatage

| Test | Critère de succès | Statut |
|---|---|---|
| Parcours Thomas : voir le plan reformaté avant de travailler | CTA visible dès arrivée page reformatage | A valider impl |
| Charge cognitive : ≤ 3 actions sur page reformatage | 1 action = CTA "Utiliser ce plan" | Conforme (1 action) |
| Time-to-value : reformatage → lots ≤ 1 clic | CTA avance directement vers /lots | Conforme |
| Edge case : reformatage échoué | Bannière + CTA fallback, pipeline non bloqué | Spécifié D5 |
| Edge case : calibration existante sur plan original | Bannière avertissement jaune, recalibration proposée | Spécifié spec 5 |
| Accessibilité WCAG 2.2 AA | Contrastes bannière, focus CTA, taille cible ≥ 44px | A vérifier impl |

---

## Handoff

**→ @fullstack (Round B)**

Fichiers produits :
- `/home/user/Versi/docs/ux/s25-architecture-canonicalisation-decisions.md`

Décisions prises :
- D1 : Nouvelle étape UI "Reformatage" entre dépôt et Étape 2 Lots
- D2 : Canvas étapes 2/3 affiche plan reformaté (`canonical_image_url` prioritaire sur `file_path`)
- D3 : Calibration m² sur plan reformaté, bannière avertissement si recalibration nécessaire
- D4 : OCR sur plan original, coordonnées converties via affine scaling vers plan reformaté
- D5 : Retry 2x automatique, puis bannière orange non bloquante

Points d'attention critiques :
- `planImageUrl` dans lots/page.tsx (ligne ~204) et rooms/page.tsx : 1 ligne à modifier chacun
- Nouvelle page reformatage : composant comparateur avant/après Pattern s22 (Grid 2col 50/50)
- `label-snap.ts` : vérifier source image OCR = `file_path`, pas `canonical_image_url`
- Colonne `calibration_source` dans `vs_plans` OR dérivation par date — à arbitrer avec @product-manager si migration DB nécessaire
- Stepper : renumérotation des étapes à discuter (insérer 1.5 ou shift 2→3→4→5)
- Zéro anglicisme UI : "reformaté" pas "canonical", "plan original" pas "fallback"
- Reality check E2E obligatoire (règle s22/s23/s24) avant GO PRODUCTION : screenshot Playwright des 5 plans P00-P03+Muguets sur les 3 breakpoints (375/768/1280px)
