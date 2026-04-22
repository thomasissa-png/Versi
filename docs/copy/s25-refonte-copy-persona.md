# Refonte copy persona marchand — s25

[Framework : PAS — Problem → Agitate → Solution]
[Conscience : Problem-Aware — Thomas sait qu'il a un plan, ne comprend pas pourquoi l'app lui parle de "reformatage"]

---

## Diagnostic : 8 textes fautifs identifiés

Le persona marchand de biens gère des opérations de revente. Son vocabulaire : lot, plan, pièce, surface, étage, calibrage. Il ne sait pas ce qu'est un "reformatage" et n'a pas à le savoir. Chaque message technique visible en UI est une friction qui l'éjecte mentalement du flux métier.

Périmètre : uniquement les textes ajoutés ou modifiés en s25 (hors existant validé sessions précédentes).

---

## Correspondances AVANT → APRÈS

| # | Fichier:ligne | Texte ACTUEL | Texte NOUVEAU | Justification |
|---|---|---|---|---|
| 1 | `types.ts:505` (STEPS label) | `"Reformatage"` | `"Préparation"` | Mot neutre et métier. Décrit ce qui se passe du point de vue du résultat (le plan se prépare à l'analyse), pas du procédé interne. |
| 2 | `types.ts:506` (STEPS description) | `"Vérifiez le plan reformaté"` | `"Vérifiez votre plan"` | Court, direct, action claire. Aucune référence au traitement interne. |
| 3 | `reformatage/page.tsx:219` (H1 cas succès) | `"Vérifiez votre plan reformaté"` | `"Vérifiez votre plan"` | Cohérence avec le stepper. "Reformaté" est jargon interne. |
| 4 | `reformatage/page.tsx:220` (H1 cas fallback) | `"Plan non reformaté"` | `"Votre plan original"` | Neutre, factuel. Ne signale pas d'échec — l'original est une option valide. |
| 5 | `reformatage/page.tsx:224` (sous-titre cas succès) | `"Votre plan a été nettoyé automatiquement (meubles, annotations, légendes retirés) pour améliorer la précision de l'analyse. Comparez avant de continuer."` | `"Votre plan a été allégé pour une meilleure lecture des pièces. Comparez les deux versions avant de continuer."` | "Nettoyé automatiquement" + liste technique → remplacé par bénéfice métier (lecture des pièces). Aucune mention du processus interne. |
| 6 | `reformatage/page.tsx:225` (sous-titre cas fallback) | `"Le reformatage automatique n'a pas pu aboutir. Vous pouvez continuer avec le plan original — les résultats peuvent être moins précis."` | `"L'optimisation du plan n'a pas abouti. Vous pouvez continuer avec le plan tel quel — l'analyse sera légèrement moins précise."` | "Reformatage automatique" banni. "Plan tel quel" = langage naturel. |
| 7 | `reformatage/page.tsx:274` (titre bannière fallback) | `"Reformatage indisponible pour ce plan"` | SUPPRIMER le titre — garder uniquement le texte de corps | Le titre répète l'info du corps. Double message anxiogène. Voir ligne 8. |
| 8 | `reformatage/page.tsx:276-278` (corps bannière fallback) | `"Le reformatage automatique du plan n'a pas pu aboutir. Les résultats peuvent être moins précis."` | `"Ce plan sera analysé tel quel. Les surfaces détectées peuvent présenter de légères imprécisions."` | Reformulation complète : ton factuel, pas d'alerte, bénéfice conservé. Suppression du titre doublonnant (voir #7). |
| 9 | `PlanComparator.tsx:52-58` (bandeau amber sans canonical) | `"Plan non reformaté — résultats d'analyse moins précis."` + reason technique | `"Plan original — l'analyse se base sur la version déposée."` | Message neutre, pas de mise en alerte. Les raisons techniques (timeout, api_error, gate_fail) ne doivent JAMAIS être affichées au persona — supprimer `labelForReason()` de l'UI visible. |
| 10 | `PlanComparator.tsx:63` (label colonne gauche) | `"Original"` | `"Votre plan"` | Plus proche de la réalité perçue par Thomas. |
| 11 | `PlanComparator.tsx:70` (label colonne droite) | `"Reformaté"` | `"Plan allégé"` | Désigne le résultat (allégé des éléments parasites) sans jargon. |
| 12 | `PlanComparator.tsx:77` (placeholder colonne droite vide) | `"Plan reformaté indisponible"` | `"Version allégée non disponible"` | Factuel, pas d'alerte. Cohérent avec label colonne droite. |
| 13 | `reformatage/page.tsx:133` (loading spinner) | `"Reformatage du plan en cours…"` | `"Préparation du plan en cours…"` | Cohérence avec label stepper #1. |
| 14 | `lots/page.tsx:909` (titre bannière calibration) | `"Calibration à vérifier"` | `"Vérifiez l'échelle du plan"` | "Calibration" est toléré métier (cf. glossaire) mais le titre seul est trop technique sans contexte. "Échelle du plan" est immédiatement compris d'un marchand. |
| 15 | `lots/page.tsx:911-912` (corps bannière calibration) | `"Ce plan a été reformaté depuis votre calibration initiale. Vérifiez que l'échelle métrique reste correcte avant de valider vos lots."` | `"Ce plan a été mis à jour depuis votre dernière mesure. Vérifiez que l'échelle est toujours correcte avant de valider vos lots."` | "Reformaté" banni. "Calibration initiale" → "dernière mesure" (langue naturelle). "Échelle métrique" → "échelle" (redondance supprimée). |

---

## Glossaire métier appliqué (session s25)

| Mot pivot autorisé | Usage | Mot banni (substitution interdite) |
|---|---|---|
| **plan** | Désigne le fichier architectural déposé | polygone, calque, vecteur |
| **lot** | Unité de découpe du bâtiment | zone, contour, segment |
| **pièce** | Espace intérieur d'un lot | room (anglicisme UI interne OK, UI facing INTERDIT) |
| **surface / m²** | Mesure d'aire | aire, area |
| **étage / RDC / R+1** | Niveau du bâtiment | floor (anglicisme, code OK, UI INTERDIT) |
| **calibrer / échelle** | Ajuster la correspondance pixels↔mètres | reformatage, canonicalisation, anchor, snap |
| **allégé** | Plan dont les meubles/annotations ont été retirés | reformaté, canonicalisé, nettoyé automatiquement |
| **préparation** | Étape de traitement interne du plan | reformatage, canonicalisation |
| **analyse** | Extraction des pièces et surfaces | extraction, parsing, OCR |

Mots absolument interdits dans toute UI facing : reformatage, canonicalisation, polygone, zone, calque, vectoriel, bounding box, anchor, snap-to-label, fallback, gate_fail, timeout, api_error.

---

## Recommandations stepper (5 étapes)

Noms actuels → noms proposés :

| Étape | Label actuel | Label proposé | Description proposée |
|---|---|---|---|
| 1 | Plans | Plans | Déposez vos plans |
| 2 | **Reformatage** | **Préparation** | Vérifiez votre plan |
| 3 | Lots | Lots | Découpez vos lots |
| 4 | Pièces | Pièces | Identifiez les pièces |
| 5 | Visuels | Visuels | Créez vos visuels |

Seule l'étape 2 change de nom. Les 4 autres sont déjà conformes.

---

## Note sur la fonction `labelForReason()`

`PlanComparator.tsx:156-169` — Cette fonction expose des raisons techniques (timeout, api_error, gate_fail, empty_input) directement en UI. Ces libellés ne doivent JAMAIS être visibles du persona. Options :
- **Option A (recommandée)** : supprimer l'affichage de `fallbackReason` dans le bandeau amber — le message générique suffit
- **Option B** : si logging nécessaire, passer en console.log uniquement, jamais en rendu visible

---

## Handoff à @fullstack

Fichier produit : `/home/user/Versi/docs/copy/s25-refonte-copy-persona.md`

**Modifications Find+Replace directes :**

1. `types.ts` — STEPS[1].label : `"Reformatage"` → `"Préparation"`
2. `types.ts` — STEPS[1].description : `"Vérifiez le plan reformaté"` → `"Vérifiez votre plan"`
3. `reformatage/page.tsx:133` — spinner text : `"Reformatage du plan en cours…"` → `"Préparation du plan en cours…"`
4. `reformatage/page.tsx:219` — H1 cas succès : `"Vérifiez votre plan reformaté"` → `"Vérifiez votre plan"`
5. `reformatage/page.tsx:220` — H1 cas fallback : `"Plan non reformaté"` → `"Votre plan original"`
6. `reformatage/page.tsx:224` — sous-titre succès : remplacer par `"Votre plan a été allégé pour une meilleure lecture des pièces. Comparez les deux versions avant de continuer."`
7. `reformatage/page.tsx:225` — sous-titre fallback : remplacer par `"L'optimisation du plan n'a pas abouti. Vous pouvez continuer avec le plan tel quel — l'analyse sera légèrement moins précise."`
8. `reformatage/page.tsx:274` — Supprimer le `<p className="font-medium">Reformatage indisponible pour ce plan</p>` (titre de la bannière)
9. `reformatage/page.tsx:276-278` — corps bannière : remplacer par `"Ce plan sera analysé tel quel. Les surfaces détectées peuvent présenter de légères imprécisions."`
10. `PlanComparator.tsx:52-58` — bandeau sans canonical : remplacer par `"Plan original — l'analyse se base sur la version déposée."` + supprimer l'affichage du `fallbackReason`
11. `PlanComparator.tsx:63` (label "Original") → `"Votre plan"`
12. `PlanComparator.tsx:70` (label "Reformaté") → `"Plan allégé"`
13. `PlanComparator.tsx:77` — placeholder vide : `"Plan reformaté indisponible"` → `"Version allégée non disponible"`
14. `lots/page.tsx:909` — titre bannière calibration : `"Calibration à vérifier"` → `"Vérifiez l'échelle du plan"`
15. `lots/page.tsx:911-912` — corps bannière calibration : `"Ce plan a été reformaté depuis votre calibration initiale. Vérifiez que l'échelle métrique reste correcte avant de valider vos lots."` → `"Ce plan a été mis à jour depuis votre dernière mesure. Vérifiez que l'échelle est toujours correcte avant de valider vos lots."`

**Point d'attention** : le CTA `"Recalibrer le plan"` (lots/page.tsx:919) est conservé tel quel — "calibrer" est dans le glossaire des mots pivot autorisés.

**Décision non négociable** : `labelForReason()` dans PlanComparator ne doit plus produire de texte visible en UI. Supprimer le bloc `{fallbackReason ? (...) : null}` ligne 53-57.
