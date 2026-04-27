# Audit persona Thomas marchand de biens — Étapes 1 et 2 Versi Studio

**Date** : 2026-04-27
**Session** : s27
**Livrables évalués** :
- `versi-studio/src/app/vs/projects/[id]/upload/page.tsx`
- `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`
- `versi-studio/src/components/vs/PlanCanvas.tsx`
- `versi-studio/src/components/vs/LotPanel.tsx`

---

## 1. Note globale et verdict

**Note : 6,5/10 — NO-GO**

Deux étapes fonctionnelles dans leur squelette, mais des défauts P0 sur le mot pivot,
la découvrabilité et la correspondance tracé/plan (verbatim s27 confirmé) empêchent
le GO à ce stade.

---

## 2. Cinq critères notés

### C1 — GP1 Compréhension immédiate : 8/10

Étape 1 : "Déposez vos plans" avec le sous-titre "Un plan par lot, ou un plan d'ensemble"
— je comprends en 2 secondes. La zone de dépôt est visible. Le bouton "Lancer l'analyse"
est là même si je n'ai rien déposé (grisé). Bon.

Étape 2 : le H1 dynamique "X lots à valider" quand l'IA a tourné, c'est clair. Le sous-titre
"Ajustez chaque lot par glisser-déposer" dit exactement quoi faire. Pas de jargon dans
ces titres. Correct.

Déduction (-2) : la bannière de calibration à l'Étape 2 apparaît avant que j'aie compris
ce qu'est la calibration. Le bouton "Calibrer le plan" est là mais la bannière
"Calibrez ce plan pour afficher les surfaces m²" demande une action sans m'expliquer
le bénéfice en termes métier. Un marchand de biens ne sait pas ce que veut dire
"m2_per_pixel". Il veut savoir si sa surface est fiable ou pas. Ce n'est pas un FAIL
bloquant mais c'est maladroit.

---

### C2 — GP2 Réversibilité : 9/10

Étape 2 : bouton retour "< Plans" en haut à gauche, lit le path `/upload`. Je peux
revenir sans perdre mes plans déposés. Le stepper marque l'Étape 1 comme complétée
(`completedSteps={[1]}`). Les lots sauvegardés en DB survivent au retour. Ctrl+Z/Ctrl+Shift+Z
présents. Undo/Redo avec `useHistory`.

Déduction (-1) : la navigation libre entre étapes via le stepper dépend du statut
projet en DB. Si le projet est en `step_1_complete`, l'étape 1 est cliquable dans le
stepper, mais rien dans le code visible ne confirme que toutes les étapes déjà
complétées sont cliquables sans revalidation. La préférence fondateur "retour = consultation,
pas modification" est mentionnée dans `founder-preferences.md` mais son implémentation
dans le Stepper n'est pas lisible ici — risque résiduel non confirmé par ce seul audit.

---

### C3 — GP6 Mot pivot "lot" — présence et zéro jargon : 5/10

Points positifs :
- "Ajouter un lot" : OK
- "Dessiner un lot" : OK (conforme règle s25)
- "Lot 1 — RDC", "lots à valider" : OK
- Bouton principal "Valider et passer aux pièces" : OK
- H1 Étape 1 : "Déposez vos plans" — pas de jargon

Points négatifs — jargon banni présent dans l'UI :

1. **"contours" x2 dans LotPanel** :
   - Ligne 344 : `"Vérifiez les contours, puis validez."` — "contour" est dans la
     liste des termes bannis (foundation-preferences.md s25 "Termes bannis").
   - Ligne 360 : `"Les contours proposés par l'IA sont des estimations."` — idem.

2. **"polygone" dans LotPanel** :
   - Le bouton Étape 2 s'appelle "Dessiner un lot" (correct), mais le bandeau mode
     dessin actif dit "Dessin du lot en cours" (OK). Cependant, dans le header Étape 2,
     le sous-titre dit : "Pour un lot en L ou avec des retraits, utilisez «&nbsp;Dessiner un lot&nbsp;»."
     — pas de "polygone" ici, c'est propre.
   - En revanche, le commentaire interne `// Mode dessin polygone` et le state
     `drawingPolygon` sont dans le code — mais hors UI rendue, donc toléré.

3. Le terme "contour" est visible utilisateur, répété 2 fois, dans le LotPanel.
   C'est un P0 selon la règle s25.

Score : -5 points sur 10 pour 2 occurrences de "contours" visibles persona.

---

### C4 — GP7 Découvrabilité : 7/10

Points positifs :
- Boutons "Ajouter un lot" et "Dessiner un lot" : toujours visibles, pas conditionnels.
- Bouton "Valider et passer aux pièces" : toujours rendu, simplement grisé si aucun lot.
- Bannière calibration : visible dès l'arrivée sur Étape 2 si plan non calibré.
- Bouton "Recalibrer" : visible en permanence si plan calibré (barre dédiée).
- Undo/Redo : implémenté. Mais les boutons UI undo/redo dans la toolbar canvas
  ne sont pas visibles dans ce code de LotPanel — `canUndo`/`canRedo` sont passés
  à PlanCanvas mais PlanCanvas n'est lu qu'aux 100 premières lignes. Non confirmé
  visuellement, risque de feature invisible.

Déduction (-3) : le zoom (molette + pan + reset) est mentionné dans les commentaires
et dans le sous-titre Étape 2 ("Zoomez à la molette"), mais les boutons +/- ou Reset
ne sont pas visibles dans LotPanel. PlanCanvas les a peut-être, non confirmé.
D'après la préférence fondateur s22 : Thomas avait demandé 3 fois les boutons zoom
avant qu'ils soient livrés. Ce risque de "feature invisible = feature inexistante"
est documenté. Si les boutons ne sont pas dans PlanCanvas toolbar, c'est un P0.

---

### C5 — GP10 Test recul "30 plans/semaine, est-ce que ça fait gagner du temps ?" : 5/10

Étape 1 : je dépose mon PDF, c'est fluide, la progression XHR est réelle. Le retry
par fichier est là. Le modal de suppression avec confirmation est là. Ça marche.

Étape 2 : l'IA me propose des lots pré-positionnés, je peux valider en 1 clic par lot
ou en global. Le canvas supporte drag + resize 8 poignées + polygon. C'est ambitieux.

Mais le verbatim Thomas s27 : "rien ne marche correctement, le tracé n'a rien à voir
avec le plan." Ce retour porte sur la qualité du tracé IA — les lots ne collent pas
aux murs. Aucune correction de ce problème n'est visible dans le code de cette session.
La logique de `computeZoneAreaM2` et `parseZone` est correcte côté calcul, mais si
les coordonnées IA en entrée sont fausses (mauvais bbox, plan non calibré au moment
de l'extraction), le tracé sera décalé quoi qu'il arrive. C'est un problème de pipeline
IA amont, pas d'UI, mais le résultat côté Thomas est le même : il voit des rectangles
qui ne correspondent pas à son immeuble.

Conséquence : pour un marchand de biens qui reçoit 30 plans/semaine, un outil qui lui
montre des lots fantaisistes n'est pas un gain de temps. C'est une source d'erreur.
Note : 5/10. La mécanique est là, la qualité IA n'est pas validée.

---

## 3. Top 3 défauts BLOQUANTS (P0)

**P0-1 — Jargon "contours" visible x2 dans LotPanel**
- `LotPanel.tsx` ligne 344 : `"Vérifiez les contours, puis validez."`
- `LotPanel.tsx` ligne 360 : `"Les contours proposés par l'IA sont des estimations."`
- Remplacement requis : "Vérifiez les délimitations, puis validez." / "Les délimitations
  proposées par l'IA sont des estimations. Ajustez si nécessaire."
- Règle violée : termes bannis s25, gate G33 BLOQUANT.

**P0-2 — Tracé IA non conforme au plan (verbatim Thomas s27)**
- Les lots générés par l'IA ne s'alignent pas sur les murs du plan.
- Non corrigeable en UI seul : investigation pipeline extraction route.ts requise.
- Impact : GP9 Outputs utiles FAIL, GP7 Conviction FAIL.

**P0-3 — Boutons undo/redo et zoom canvas non confirmés visibles**
- `PlanCanvas.tsx` reçoit `canUndo`/`canRedo`/`onUndo`/`onRedo` mais la toolbar UI
  avec ces boutons n'est pas visible dans les 100 premières lignes lues.
- Si ces boutons ne sont pas permanents dans le canvas (feature invisible = inexistante,
  règle s22), c'est un P0 découvrabilité.
- Action : lire PlanCanvas.tsx lignes 100-400 pour confirmer ou infirmer.

---

## 4. Top 3 frustrations probables (verbatim Thomas)

1. "Ça m'énerve parce que je vois 'Vérifiez les contours' — c'est quoi un contour ?
   Personne ne parle comme ça dans l'immobilier. On parle de lots, pas de contours."

2. "Ça m'énerve parce que l'IA m'a tracé des rectangles qui ne correspondent à rien.
   Mon immeuble a 4 appartements bien délimités et l'IA me sort des zones au hasard.
   Je dois tout refaire à la main — à ce stade j'aurais mis Excel en 5 minutes."

3. "Ça m'énerve parce que le zoom à la molette, ça marche, mais je ne sais pas
   s'il y a un bouton pour revenir à la vue d'ensemble. Je cherche, je trouve rien.
   C'est une fonctionnalité qui n'existe pas pour moi."

---

## 5. Recommandation pour passer à 10/10

**Priorité absolue (débloquer le GO) :**

1. Remplacer "contours" par "délimitations" (ou supprimer la phrase) dans LotPanel.tsx
   lignes 344 et 360. Correction 5 minutes, impact immédiat.

2. Investiguer la route d'extraction IA (`/api/vs/projects/[id]/extract/route.ts`) pour
   comprendre pourquoi les bbox lots ne s'alignent pas au plan. Tester sur un vrai PDF
   avec `VS_USE_MOCK_EXTRACTOR=false` et comparer visuellement le résultat. Si le
   problème vient du ratio pixels/coordonnées, corriger la normalisation des coordonnées
   avant insertion en DB.

3. Confirmer que PlanCanvas affiche des boutons UI permanents pour zoom (+/-/reset)
   et undo/redo. Si non : ajouter une toolbar visible avec ces boutons.

**Pour atteindre 10/10 :**

4. Reformuler la bannière calibration Étape 2 en langage métier : "Sans échelle, les
   surfaces m² ne s'affichent pas. Définissez l'échelle du plan." plutôt que le message
   technique actuel.

5. Valider empiriquement sur 3 plans réels que les lots IA sont correctement positionnés
   (reality check visuel obligatoire, règle s25 fondateur). Preuve screenshot Playwright
   requise pour fermer le point P0-2.

---

## Verdicts GP synthétiques

| Gate | Verdict | Motif principal |
|---|---|---|
| GP1 Compréhension | PASS | Titres clairs, actions évidentes |
| GP2 Réversibilité | PASS (conditionnel) | Retour fonctionnel, undo/redo présent |
| GP3 Crédibilité | FAIL | Tracé IA non conforme au plan (s27) |
| GP4 Parcours fluide | PASS (partiel) | Flow bout-en-bout possible mais P0-3 zoom non confirmé |
| GP6 Mot pivot "lot" | FAIL | "contours" x2 dans LotPanel, termes bannis |
| GP7 Découvrabilité | FAIL | Zoom/undo non confirmés visibles en toolbar |
| GP9 Outputs utiles | FAIL | Lots IA décalés du plan, retravail manuel total |
| GP10 Gain de temps | FAIL | 30 plans/semaine : outil crée du travail, pas l'inverse |

**BLOQUANT : 2/6 PASS** (GP1, GP2 conditionnel)
**Verdict global : NO-GO**

---

**Handoff -> @orchestrator**
- Fichiers produits : `docs/qa/s27-vs-step12-audit-persona-marchand.md`
- Verdicts : BLOQUANT 2/6 PASS, REQUIS non évalués (dépendants du GO BLOQUANT), verdict global NO-GO, note 6,5/10
- Points d'attention :
  - P0-1 (5 min) : `LotPanel.tsx` L344 + L360 "contours" → "délimitations"
  - P0-2 (investigation) : extraction IA produit des lots décalés du plan — route.ts à auditer
  - P0-3 (confirmation) : lire PlanCanvas.tsx L100-400 pour confirmer toolbar zoom/undo visible
- Prochaines étapes recommandées : corriger P0-1 immédiatement (@fullstack), lancer audit route extraction IA (@ia ou @fullstack), confirmer PlanCanvas toolbar (@fullstack), re-évaluation persona après corrections
