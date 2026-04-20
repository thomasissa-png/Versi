# Audit copy — Étape 2 (Lots)

> Produit par @copywriter | Session s23 | 2026-04-20
> Framework : UX writing — audit complet + propositions de remplacement
> Persona : Thomas, marchand de biens. Vocabulaire métier : lot, surface, étage, pièce, contour.
> Niveau de conscience : Product-Aware — Thomas est dans l'outil, il connaît son métier, pas notre jargon technique.
> Objections traitées : "je ne comprends pas ce qu'on me demande" / "c'est quoi un polygone ?" — méthode : vocabulaire métier direct, instruction orientée résultat.

---

## 1. Diagnostic — tableau complet

| Fichier | Ligne | Texte actuel | Problème | Priorité |
|---|---|---|---|---|
| `page.tsx` | 863 | `"Dessiner un polygone"` (lien dans le sous-titre) | Jargon dev. Thomas trace un contour, il ne dessine pas un polygone. | P0 |
| `LotPanel.tsx` | 518 | `"Dessiner un polygone"` (bouton) | Idem — le terme est exposé dans l'action principale. | P0 |
| `LotPanel.tsx` | 438–439 | `"Mode dessin polygone actif"` (bandeau) | "Mode dessin polygone" = double jargon. Le bandeau devrait dire ce que Thomas est en train de faire. | P0 |
| `page.tsx` | 862–863 | `"Utilisez « Dessiner un polygone » pour les formes complexes (appartements en L, retraits, pièces obliques)."` | Phrase longue + "polygone" + exemples trop techniques. Thomas comprend "appartement en L" mais pas la phrase entière. | P0 |
| `LotPanel.tsx` | 359 | `"Les zones sont une approximation rectangulaire de l'union des pièces détectées."` | "Approximation rectangulaire", "union des pièces détectées" — jargon IA/géométrie. Thomas a besoin de comprendre pourquoi les contours ne collent pas parfaitement, pas comment l'algorithme fonctionne. | P1 |
| `LotPanel.tsx` | 373–374 | `"Lancez l'extraction IA ou dessinez un lot manuellement."` | "Extraction IA" et "dessinez un lot manuellement" — acceptable mais peut être plus direct. | P1 |
| `LotPanel.tsx` | 129 | `"${Number(lot.surface_m2).toFixed(0)} m² (avant calibration)"` | "avant calibration" — jargon. Thomas ne sait pas ce que "calibration" veut dire dans ce contexte. Si le plan n'est pas calibré, la surface est une estimation de l'IA, pas une mesure réelle. | P1 |
| `LotPanel.tsx` | 131 | `"Calibrez le plan pour afficher la surface"` | "Calibrez" est un terme technique. OK en bannière (contexte plus large), borderline ici en micro-label. | P2 |
| `PlanCalibration.tsx` | 190 | `"Calibrer le plan"` (titre modale) | Acceptable en titre de modale si le contexte est posé. Le terme est cohérent avec la bannière. | P2 |
| `PlanCalibration.tsx` | 193 | `"Tracez une ligne sur un mur dont vous connaissez la longueur (cliquez sur deux points), puis indiquez la longueur en mètres."` | Instruction correcte mais passif indirect ("dont vous connaissez"). Peut être raccourci. | P2 |
| `PlanCalibration.tsx` | 261–263 | `"Étape 1 sur 2 — cliquez sur le premier point de la ligne."` / `"Étape 2 sur 2 — cliquez sur le second point de la ligne."` | Format "Étape X sur Y" est un peu bureaucratique. L'action est claire — le compteur d'étape est superflu. | P2 |
| `PlanCanvas.tsx` | 940 | `"Le polygone se croise — ajustez les sommets"` | "Polygone" + "sommets" — double jargon géométrique. | P0 |
| `PlanCanvas.tsx` | 944 | `"Le polygone est trop petit ou aplati"` | Idem. | P0 |
| `PlanCanvas.tsx` | 1387 | `"Ajoutez au moins 3 sommets pour fermer la forme"` | "Sommets" = jargon géométrique. | P0 |
| `PlanCanvas.tsx` | 1104 | `"Calibrez le plan pour la surface"` / `"Calibrez le plan pour la longueur"` | Acceptable dans le canvas (contexte de tracé). | P2 |
| `page.tsx` | 524 | `"${failedIds.size} lot(s) n'ont pas pu être validé(s)."` | Parenthèses (s) — interdit brand voice. Pluralisation à coder. | P1 |

---

## 2. Reformulations

### P0 — Jargon totalement incompréhensible

**"Dessiner un polygone"** (bouton + lien dans le sous-titre)

- Proposition : `Tracer un contour libre`
- Rationale : Thomas trace des contours sur des plans. Le terme "libre" indique que la forme n'est pas contrainte à un rectangle. Pas de jargon géométrique.

**Bandeau actif** `"Mode dessin polygone actif"`

- Proposition : `Tracé libre en cours`
- Sous-texte actuel : "Cliquez pour ajouter un sommet, double-cliquez pour fermer la forme, Échap pour annuler, Retour arrière pour supprimer le dernier point."
- Proposition sous-texte : `Cliquez pour poser un point. Double-cliquez pour fermer le contour. Échap pour annuler.`
- Rationale : "sommet" → "point", "fermer la forme" → "fermer le contour", suppression de "Retour arrière" (évident pour un utilisateur qui cherche à effacer).

**Sous-titre page** (actuel ligne 862–863) :
> "Ajustez chaque lot par glisser-déposer. Zoomez à la molette, puis glissez le fond pour naviguer. Utilisez « Dessiner un polygone » pour les formes complexes (appartements en L, retraits, pièces obliques)."

- Proposition :
> `Ajustez chaque lot par glisser-déposer. Zoomez à la molette pour naviguer. Pour un lot en L ou avec des retraits, utilisez « Tracer un contour libre ».`
- Rationale : suppression des "pièces obliques" (trop technique), alignement sur le nouveau label du bouton.

**Erreurs canvas — polygone**

| Actuel | Proposition |
|---|---|
| `"Le polygone se croise — ajustez les sommets"` | `"Le contour se croise — corrigez les points qui se chevauchent."` |
| `"Le polygone est trop petit ou aplati"` | `"Le contour est trop petit. Tracez une zone plus grande."` |
| `"Ajoutez au moins 3 sommets pour fermer la forme"` | `"Posez au moins 3 points avant de fermer le contour."` |

---

### P1 — Sous-optimal mais compris

**"Les zones sont une approximation rectangulaire de l'union des pièces détectées."** (LotPanel.tsx ligne 359)

- Proposition : `Les contours proposés par l'IA sont des estimations. Ajustez-les si nécessaire.`
- Rationale : explication du comportement attendu (les contours sont des estimations), instruction claire (ajustez si besoin). Suppression de "rectangulaire", "union", "détectées".

**État vide — IA a tourné** (LotPanel.tsx lignes 370–374) :
> "L'IA n'a pas détecté de lots fiables sur ce plan. Dessinez vos lots manuellement avec le bouton ci-dessous."

- Proposition : `Aucun lot détecté sur ce plan. Tracez-les manuellement avec le bouton ci-dessous.`
- Rationale : "fiables" = jugement de valeur sur l'IA qui inquiète Thomas. "Dessinez" → "Tracez" pour cohérence avec le nouveau label du bouton.

**État vide — IA pas encore lancée** (LotPanel.tsx lignes 375–377) :
> "Aucun lot pour le moment. Lancez l'extraction IA ou dessinez un lot manuellement."

- Proposition : `Aucun lot pour le moment. Lancez la détection IA ou tracez un lot manuellement.`
- Rationale : "extraction IA" → "détection IA" (terme plus naturel pour Thomas). "dessinez" → "tracez".

**Surface avant calibration** (LotPanel.tsx ligne 129) :
> `"${Number(lot.surface_m2).toFixed(0)} m² (avant calibration)"`

- Proposition : `${Number(lot.surface_m2).toFixed(0)} m² (estimation IA)`
- Rationale : "avant calibration" est incompréhensible sans contexte. "estimation IA" dit la même chose : cette surface vient de l'IA, pas d'une mesure réelle du plan.

**Pluralisation** (page.tsx ligne 524) :
> `"${failedIds.size} lot(s) n'ont pas pu être validé(s)."`

- Proposition : `${failedIds.size} lot${failedIds.size > 1 ? "s" : ""} n'${failedIds.size > 1 ? "ont" : "a"} pas pu être validé${failedIds.size > 1 ? "s" : ""}.`
- Rationale : les parenthèses (s) sont interdites par le brand voice. Pluralisation explicite côté code.

---

### P2 — Cosmétique

**Instructions calibration** (PlanCalibration.tsx lignes 261–263) :

| Actuel | Proposition |
|---|---|
| `"Étape 1 sur 2 — cliquez sur le premier point de la ligne."` | `"Cliquez sur le premier point de votre ligne de référence."` |
| `"Étape 2 sur 2 — cliquez sur le second point de la ligne."` | `"Cliquez sur le second point."` |
| `"Indiquez la longueur réelle puis validez."` | `"Indiquez la longueur réelle en mètres."` |

**Instruction principale modale** (PlanCalibration.tsx ligne 193) :
> "Tracez une ligne sur un mur dont vous connaissez la longueur (cliquez sur deux points), puis indiquez la longueur en mètres."

- Proposition : `Cliquez sur deux extrémités d'un mur dont vous connaissez la longueur, puis saisissez cette longueur en mètres.`

---

## 3. Glossaire métier — mapping IA/dev → marchand de biens

| Terme technique | Terme recommandé | Contexte |
|---|---|---|
| Polygone | Contour libre | Bouton, bandeau, messages d'erreur |
| Dessin polygone | Tracé libre | Mode actif |
| Sommet(s) | Point(s) | Instructions de tracé |
| Fermer la forme | Fermer le contour | Instruction de fin de tracé |
| Approximation rectangulaire | Estimation | Explication des contours IA |
| Extraction IA | Détection IA | État vide, bouton |
| Union des pièces | — (ne pas traduire — ne pas mentionner) | Supprimer de l'UI |
| Mode dessin | Tracé libre | Bandeau actif |
| Avant calibration | Estimation IA | Label surface |
| Lot(s) n'ont pas pu être validé(s) | Pluralisation explicite par code | Message d'erreur |

---

## 4. Récapitulatif des priorités

**P0 — À corriger avant la prochaine démo (jargon bloquant)**
- "Dessiner un polygone" → "Tracer un contour libre" (bouton + sous-titre page)
- "Mode dessin polygone actif" → "Tracé libre en cours" (bandeau)
- Messages d'erreur canvas : polygone / sommets → contour / points

**P1 — À corriger dans le sprint suivant (sous-optimal)**
- Note IA sur les contours rectangulaires
- États vides : "dessinez" → "tracez", "extraction" → "détection", "fiables" → supprimer
- Surface "(avant calibration)" → "(estimation IA)"
- Pluralisation (s) → conditionnelle dans le code

**P2 — À traiter lors d'un pass polish**
- Instructions pas à pas de la modale calibration
- "Calibrez le plan pour afficher la surface" (micro-label dans LotCard)

---

## 5. Cohérence avec le livrable pièces non assignées

Le livrable `docs/copy/s23-etape2-pieces-non-assignees-copy.md` (session s23 parallèle) retient le terme "Hors lots" pour les zones non vendables. Ce terme est cohérent avec le vocabulaire du présent audit :

- "lot" reste le mot pivot — il est utilisé par Thomas dans son métier (copropriété, découpe d'immeuble).
- "contour libre" (tracé polygone) ne crée pas de conflit avec "Hors lots".
- Le mapping `technical_label → human_label` pour les sigles (ECS, etc.) est documenté dans le livrable pièces non assignées — ne pas dupliquer ici.

Aucun conflit de vocabulaire identifié entre les deux livrables.

---

**Handoff → @fullstack**
- Fichier produit : `/home/user/Versi/docs/copy/s23-etape2-audit-copy.md`
- Fichiers à modifier :
  - `versi-studio/src/app/vs/projects/[id]/lots/page.tsx` — lignes 862–863 (sous-titre), ligne 524 (pluralisation)
  - `versi-studio/src/components/vs/LotPanel.tsx` — lignes 129, 131, 359, 370–377, 438–439, 518
  - `versi-studio/src/components/vs/PlanCanvas.tsx` — lignes 940, 944, 1387 (messages d'erreur mode tracé)
  - `versi-studio/src/components/vs/PlanCalibration.tsx` — lignes 193, 261–263 (instructions pas à pas)
- Décisions non négociables : "Tracer un contour libre" remplace "Dessiner un polygone" partout. "Points" remplace "sommets" dans tous les messages du canvas. Pluralisation explicite (jamais de parenthèses).
- Points d'attention :
  - La recherche/remplacement "Dessiner un polygone" → "Tracer un contour libre" doit couvrir les deux fichiers (page.tsx et LotPanel.tsx)
  - Le bandeau mode tracé (`drawingPolygon`) a deux éléments à modifier : le titre P et le sous-texte. Ne modifier que le texte visible, pas les props ni les handlers.
  - Les messages d'erreur canvas (`showDrawingError(...)`) sont appelés à 6 endroits dans PlanCanvas.tsx — 3 occurrences par message. Utiliser replace_all.
  - La pluralisation de `failedIds.size` (page.tsx ligne 524) nécessite une expression ternaire — voir section 2 pour le pattern exact.
