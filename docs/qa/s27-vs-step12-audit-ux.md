# Audit UX — Versi Studio Étapes 1+2 (session 27)
Persona : Thomas, marchand de biens. Date : 2026-04-27.

---

## 1. Note globale et verdict

**Note : 7,2 / 10 — GO conditionnel** (3 P0 à corriger avant release publique)

---

## 2. Critères détaillés

### C1 — Étape 1 Upload : compréhension immédiate — 8/10
Points forts : titre "Déposez vos plans" direct, sous-texte explicite ("Un plan par lot, ou un plan d'ensemble"), progression XHR en temps réel, retry par fichier, modal de confirmation suppression. Bouton "Lancer l'analyse" toujours rendu (disabled si 0 plan, conforme s22). Frictions résiduelles : le bouton est disabled+opaque sans message d'aide visible au repos (title tooltip invisible sur touch). La limite de fichiers n'est visible qu'après upload.

### C2 — Étape 2 Lots : interactivité polygones, mot pivot "lot" — 7/10
Mot pivot "lot" systématiquement utilisé dans les labels, noms générés ("Lot 1 — RDC"), titres, messages d'état. Polygone libre disponible via "Dessiner un lot". Friction : dans LotPanel l'aide IA dit "Vérifiez les contours" — "contours" est un jargon technique (violation C4). La bannière de statut IA affiche "lots détectés" puis "Vérifiez les contours, puis validez" : premier message bon, second à corriger.

### C3 — Stepper navigation libre — 6/10
Le Stepper est présent (latéral desktop, horizontal mobile). MAIS : les étapes passées ont `completedSteps` → cliquables selon l'implémentation du composant Stepper (non auditable sans lire ce fichier). Le bouton retour "← Plans" est présent en Étape 2 mais libellé minimal ("Plans" seul, sans "Retour à"). Aucun lien vers l'étape suivante depuis Étape 1 autre que "Lancer l'analyse" — Thomas ne peut pas sauter à l'Étape 3 depuis l'Étape 1 si les lots existent déjà. Navigation régressive correcte, navigation progressive conditionnée à l'action = friction pour un Thomas qui revient.

### C4 — Zéro jargon interdit — 6,5/10
Bonne élimination : "uploader" → "déposer", "polygone" absent des labels UI visibles. VIOLATIONS détectées :
- LotPanel L346 : "Vérifiez les contours" → "contours" est un terme technique (même domaine que "polygone")
- LotPanel L359 : "Les contours proposés par l'IA sont des estimations" → double occurrence
- lots/page.tsx L883 : titre h1 "Découpez vos lots" ✅ — conforme
- PlanCanvas commentaire interne "polygone" → acceptable (code, non visible utilisateur)
Score pénalisé pour les 2 occurrences de "contours" exposées à Thomas.

### C5 — Boutons toujours visibles (découvrabilité s22) — 8/10
Points forts : "Ajouter un lot", "Dessiner un lot", "Valider et passer aux pièces" toujours rendus dans LotPanel (pas conditionnels à hover). Bouton "Lancer l'analyse" toujours rendu en Étape 1. FRICTION : le bouton de renommage du lot (icône crayon) est `opacity-0 group-hover:opacity-100` — invisible au repos sur mobile/touch. L'action double-clic pour renommer n'est pas discoverable (title tooltip "Double-cliquez pour renommer" sur le bouton, mais Thomas ne lira pas un title sur touch).

---

## 3. Top 3 BLOQUANTS P0

**P0.1 — "Contours" exposé 2x à Thomas (C4 violation)**
LotPanel L346 et L359 : "Vérifiez les contours" / "Les contours proposés par l'IA sont des estimations". Substitution requise : "Vérifiez les délimitations de chaque lot" / "Les délimitations proposées par l'IA sont des estimations." Coordonner @copywriter.

**P0.2 — Renommage lot non-discoverable sur mobile (C5)**
Le bouton crayon est `opacity-0` au repos. Sur tablette (usage terrain de Thomas), l'action est invisible. Le double-clic n'est pas disponible sur touch. Solution : rendre le bouton crayon toujours visible (opacity-100) ou ajouter un tap long handler. Pattern s22 : bouton UI permanent obligatoire.

**P0.3 — Navigation libre stepper non confirmée (C3)**
L'audit ne peut pas confirmer que les étapes complétées dans le Stepper sont cliquables sans lire le composant Stepper. Si les étapes passées ne sont pas des liens actifs, Thomas qui revient sur l'Étape 1 depuis l'Étape 2 est bloqué par le flow linéaire. Vérifier et activer la navigation libre sur `completedSteps`.

---

## 4. Top 3 améliorations P1

**P1.1 — Feedback "pourquoi le bouton est désactivé" visible sans hover**
En Étape 1, le bouton "Lancer l'analyse" est disabled sans texte d'aide visible (le `title` est inaccessible touch). Ajouter un sous-texte permanent sous le bouton : "Déposez au moins un plan pour lancer l'analyse." — affiché uniquement si `plans.length === 0`.

**P1.2 — Titre h1 Étape 2 trop générique au premier chargement**
"Découpez vos lots" s'affiche même quand l'IA a détecté N lots. Le titre passe dynamiquement à "N lots à valider" seulement si `hasAiExtracted && aiSuggestedLots.length > 0`. Cas manquant : si l'IA a tourné mais 0 lot détecté, le titre reste "Découpez vos lots" sans signal d'échec IA. Ajouter : "Aucun lot détecté — dessinez-les manuellement."

**P1.3 — Validation individuelle vs globale : hiérarchie visuelle insuffisante**
Dans LotPanel, le bouton "Valider ce lot" (par carte) et "Valider et passer aux pièces" (global) ont des styles proches. Thomas risque de valider un lot unique en pensant valider tout. Différencier visuellement : bouton individuel en outline, bouton global en filled primary (déjà le cas) mais ajouter un séparateur visuel ou un compteur "X/N lots validés".
