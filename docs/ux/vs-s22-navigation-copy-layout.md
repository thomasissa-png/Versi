# Spec UX/Copy — Navigation, boutons et layout (s22)
Date : 2026-04-17
Auteur : @ux

---

## Point 1 — Navigation retour/suivant dans le flow 4 étapes

**Recommandation : bouton Retour en haut à gauche, texte contextuel, stepper cliquable.**

- **Position** : en-tête de page, rangée gauche, avant le titre de l'étape. Pas dans le canvas — le canvas est une zone de travail, pas de navigation. Sur mobile, cette rangée passe en colonne (bouton Retour au-dessus du titre).
- **Texte** : libellé contextuel selon l'étape en cours. `← Plans` (Étape 2 → Étape 1), `← Lots` (Étape 3 → Étape 2), `← Pièces` (Étape 4 → Étape 3). Pas de formule générique "Étape précédente" : l'utilisateur sait où il va, pas juste qu'il recule. Précision > généricité.
- **Stepper latéral** : cliquable uniquement vers les étapes déjà complétées (statut `validated`). Une étape future reste visuellement inactive (curseur `not-allowed`, opacité 50 %). Empêche les sauts en avant qui laissent des données incomplètes.
- **Comportement Retour** : navigation directe sans confirmation si l'étape en cours n'a aucune modification non sauvegardée. Si des modifications sont en attente, déclencher une modale de confirmation légère (2 actions : « Quitter sans sauvegarder » / « Rester »).

## Point 2 — Étape 2 : boutons « Tout valider » et « Continuer »

**Recommandation : Option A — deux boutons renommés, toujours visibles.**

- **Retenus** : `✓ Valider tous les lots` (action sur les données) + `→ Passer aux pièces` (navigation, bloqué tant que des lots ne sont pas validés).
- **Pourquoi A et pas B ou C** : deux intentions distinctes, deux boutons distincts. L'option B (bouton contextuel qui change d'étiquette) introduit un état invisible : Thomas ne sait pas si le bouton qu'il voit est "valider" ou "continuer" tant qu'il n'a pas regardé. L'option C fusionne une action données et une action navigation dans un seul geste — si la sauvegarde échoue, l'utilisateur ne sait pas si les lots sont validés ou s'il a simplement navigué. Coût cognitif minimal avec A : les deux boutons sont toujours présents, leur état désactivé suffit à guider.
- **Hiérarchie visuelle** : `✓ Valider tous les lots` en secondaire (outline), `→ Passer aux pièces` en primaire (fond plein). La CTA principale est toujours la navigation — la validation est un prérequis visible, pas le but final.
- **État désactivé** : `→ Passer aux pièces` est `disabled` + tooltip au survol : « Validez tous les lots pour continuer ». Pas de message d'erreur — anticipation de la friction avant le clic.

## Point 3 — Layout Étape 3 : plan en pleine largeur

**Nouveau layout : stack vertical — plan 100 % largeur en haut, grille de cards en bas, footer sticky.**

- **Plan** : `width: 100%`, hauteur fixe entre 500 px et 700 px selon viewport (550 px par défaut desktop). Ratio 2:1 respecté avec `object-fit: contain` ou canvas CSS `aspect-ratio: 2/1` plafonné à 700 px. Fond neutre (gris clair) sur les bandes vides si le plan est plus étroit que le conteneur.
- **Cards pièces** : grille 3 colonnes sur desktop (≥ 1024 px), 2 colonnes sur tablette (768–1023 px), 1 colonne sur mobile (< 768 px). Chaque card : 300 × 150 px compacts — nom de la pièce en titre, surface m² en sous-titre, dropdown type de pièce, deux actions inline `Confirmer` (vert) + `Supprimer` (rouge texte, pas de fond pour alléger).
- **Footer sticky** : `position: sticky; bottom: 0` avec fond blanc + ombre légère. Contient `✓ Valider toutes les pièces` (outline) + `→ Passer aux visuels` (primaire, désactivé jusqu'à validation complète). Même pattern que l'Étape 2 — cohérence du flow.
- **Application à l'Étape 2 (Lots)** : appliquer le même principe de stack vertical à `lots/page.tsx` — plan pleine largeur en haut, `LotPanel` en dessous plutôt qu'en sidebar 40 %. Le canvas retrouve l'espace nécessaire pour la précision du dessin des polygones.

## Handoff → @fullstack

**Fichiers à modifier :**

| Fichier | Modifications |
|---|---|
| `versi-studio/src/app/vs/projects/[id]/lots/page.tsx` | (1) Ajouter bouton `← Plans` en haut à gauche dans l'en-tête. (2) Renommer les boutons : `✓ Valider tous les lots` + `→ Passer aux pièces` (désactivé + tooltip si lots non validés). (3) Passer le layout en stack vertical : plan pleine largeur, `LotPanel` en dessous. |
| `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx` | (1) Ajouter bouton `← Lots` en haut à gauche. (2) Plan 100 % largeur, hauteur 550 px desktop, `aspect-ratio: 2/1`. (3) Grille 3 colonnes de cards sous le plan. (4) Footer sticky avec `✓ Valider toutes les pièces` + `→ Passer aux visuels`. |
| `versi-studio/src/components/vs/LotPanel.tsx` | Adapter le composant pour fonctionner en mode full-width sous le plan (suppression des styles sidebar fixes, passage en layout horizontal scrollable si beaucoup de lots). |
| `versi-studio/src/components/vs/RoomPanel.tsx` | Refactorer en grille de cards 300 × 150 px : nom, surface m², dropdown type, actions Confirmer/Supprimer inline. |

**Stepper** : rendre les étapes déjà complétées (`validated`) cliquables. Les étapes futures restent non cliquables (`pointer-events: none`, opacité 50 %). Localiser le composant stepper et identifier le prop de statut par étape avant modification.

**Modale retour** : si l'étape courante a des modifications non sauvegardées (`isDirty`), afficher une modale 2 actions avant de naviguer en arrière : « Quitter sans sauvegarder » / « Rester ».

---

_Validé par @ux — revue avec pensée copywriter pour le wording_
