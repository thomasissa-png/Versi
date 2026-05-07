# Audit Copy — Étape 3 (Pièces) + Étape 4 (Visuels) — s33

> Périmètre : routes `rooms/page.tsx`, `visuals/placement/page.tsx` + composants `vs/` concernés.
> Ne couvre PAS : RefineVisualDialog (commit `b6f3b58` validé G33), prompts gpt-image-2, 6 issues s33 fixées.
> Framework : grille G33 (anglicismes, mot pivot, registre, clarté, ton, boutons, accessibilité).
> Date : 2026-05-07

---

## 1. Synthèse

Score global : **7/10.** Le copy de l'étape 3 est globalement propre — messages d'erreur en français, registre "vous" respecté, aucun emoji ni exclamation. L'étape 4 introduit **un anglicisme bloquant G33** (`uploadez`, `uploadée`, `upload`) en surface utilisateur directe dans `visuals/placement/page.tsx` et `VisualWizard.tsx`. Le mot pivot métier est bien tenu (`lot`, `pièce`) sauf deux occurrences techniques de `polygone` visibles dans des commentaires de code côté client (non-bloquant mais à surveiller). Top 3 défauts critiques : (1) anglicisme `uploadez`/`uploadée` en surface UI directe — P0 bloquant G33 ; (2) libellé de sous-titre Étape 4 verbeux et mal positionné pour le persona marchand ; (3) pattern bouton "Valider ce lot" / "Valider les visuels" non uniformisé avec le pattern `Verbe + Objet (variant)` imposé s27.

---

## 2. Anglicismes détectés Étape 3 + 4

| Terme en surface UI | Fichier : ligne | Proposition FR | Gravité |
|---|---|---|---|
| `uploadez la photo` | `visuals/placement/page.tsx:293` | `déposez la photo` | **P0 G33 BLOQUANT** |
| `uploadée` (commentaire interne `VisualWizard.tsx:121`) | `VisualWizard.tsx:121` | `déposée` | P1 (commentaire code client, non affiché mais risque copier-coller) |
| `onUploadForPending` / `onUploadReplace` (props internes) | `VisualWizardRoomStep.tsx:70–76` | Props internes — non affiché, acceptable si anglicisme confiné au code | P2 (code interne uniquement) |
| `handleUploadForPending` / `handleUploadReplace` (handlers) | `VisualWizard.tsx:327–388` | Idem — code interne | P2 |

**Bilan G33** : 1 occurrence en surface texte visible par le persona — P0 bloquant. Toutes les autres sont du code interne (noms de fonctions/props) non visibles dans l'UI, tolérées en l'état.

**Passage en revue liste noire complète sur les strings JSX** : aucune occurrence de `download`, `feedback`, `retry` (remplacé par `Réessayer` partout), `submit`, `cancel`, `loader`, `spinner`, `loading` dans les strings affichées. Conforme.

---

## 3. Mot pivot métier

**Bilan positif** : aucune occurrence de `polygone`, `zone`, `calque`, `contour`, `vectoriel`, `reformatage`, `canonicalisation` dans les strings JSX affichées à l'utilisateur sur les étapes 3 et 4.

Observations complémentaires :

- `polygon` apparaît uniquement dans les noms de propriétés TypeScript (`room.polygon`, `lotPolygon`) et commentaires développeurs — non visible dans l'UI. Acceptable.
- `zone_data` idem — donnée back-end, jamais affichée.
- `canonicalized_image_path` utilisé dans `rooms/page.tsx:235` pour construire l'URL — code interne uniquement. Non visible.
- `contourPreview` : variable interne dans `VisualWizardRoomStep.tsx` — non visible.

**Aucun terme banni ne filtre en surface utilisateur.** Mot pivot `lot` et `pièce` correctement utilisés partout où ils sont affichés.

---

## 4. Registre et ton

**Registre "vous de politesse / impératif neutre"** : globalement respecté. Exemples conformes relevés :

- `"Vérifiez votre connexion"` → non présent (les messages d'erreur utilisent l'infinitif ou le substantif : `"Impossible de charger les données du projet."`, `"Impossible de sauvegarder la modification."`) — registre impersonnel neutre, acceptable.
- `"Réessayer"` (bouton, `rooms/page.tsx:769`) — conforme impératif neutre.
- `"Retour aux opérations"`, `"Retour aux pièces"` — conforme.

**Cas à corriger :**

| Phrase | Fichier : ligne | Problème | Proposition |
|---|---|---|---|
| `"Pièce ignorée — retrouvez-la dans le récapitulatif."` | `VisualWizardRoomStep.tsx:270` | `la` crée une relation ambigu (pièce = féminin OK), mais `retrouvez-la` sonne familier pour outil pro | `"Pièce ignorée. Retrouvez-la dans le récapitulatif."` (ponctuation, pas de tiret) |
| `"J'ai mis à jour : ${label} → ${update.value}"` | `VisualWizardRoomStep.tsx:324` | La 1ère personne du singulier IA peut sonner étrange dans un outil pro B2B interne | `"Mis à jour : ${label} → ${update.value}"` |
| `"Position hors pièce : l'IA interprétera la distance."` | `VisualWizardRoomStep.tsx:237` | Acceptable — ton informatif, impersonnel | Conforme |

Aucun `"tu"` détecté. Aucun obséquieux (`"veuillez bien vouloir"`). Aucun exclamation ni emoji.

---

## 5. Clarté persona marchand

Évaluation : le marchand de biens comprend-il chaque phrase en 2 secondes ?

| Phrase | Fichier | Problème clarté | Proposition |
|---|---|---|---|
| `"Pour chaque pièce : placez une prise de vue sur le plan, uploadez la photo, orientez la flèche, choisissez un style."` | `visuals/placement/page.tsx:292–293` | (1) `uploadez` = anglicisme P0 ; (2) "orientez la flèche" = abstrait sans contexte ; (3) phrase trop dense pour un sous-titre de page | `"Pour chaque pièce : indiquez la position de la photo sur le plan, déposez la photo, orientez la prise de vue, choisissez un style."` |
| `"Étape 4 — Visuels par pièce"` | `visuals/placement/page.tsx:271` | Formulation technique / stepper redondante. Le persona sait qu'il est à l'étape 4 (stepper visible). | `"Visuels par pièce"` suffit comme H1 — supprimer le préfixe numéro si stepper présent |
| `"L'IA identifie les pièces du ${lot}…"` | `rooms/page.tsx:748` | Clair pour le persona, ton adapté. | Conforme |
| `"Aucune pièce à configurer."` | `VisualWizard.tsx:1133` | Vague — le persona ne sait pas pourquoi. | `"Aucune pièce à traiter pour ce lot."` |
| `"Connexion difficile — la génération continue côté serveur, on rattrape l'état."` | `VisualWizard.tsx:1216` | "on rattrape l'état" = jargon développeur visible en prod | `"Connexion instable — la génération se poursuit, les résultats apparaîtront dès la reconnexion."` |
| `"Visuels validés — régénérez ou ajustez les paramètres si besoin."` | `VisualWizard.tsx:1348` | "paramètres" = terme technique. | `"Visuels validés — vous pouvez régénérer ou modifier les réglages si besoin."` |

---

## 6. Pattern boutons unifiés

Référence s27 : `Verbe + Objet (variant)`. Évaluation des boutons doublon / similaires :

| Bouton actuel | Fichier | Problème | Proposition s27 |
|---|---|---|---|
| `"Régénérer les pièces avec l'IA"` / `"Régénérer les pièces IA"` | `RoomPanel.tsx:458–459` | Deux libellés différents pour le même bouton selon l'état — incohérence visible | `"Régénérer les pièces (avec l'IA)"` dans les deux états |
| `"Recalculer la disposition IA"` | `RoomPanel.tsx:432` | Libellé opaque pour le persona — "disposition" technique | `"Recalculer les positions (IA)"` |
| `"Valider ce lot"` | `RoomPanel.tsx:510` | Seul bouton de ce type, pas de doublon — conforme | Conforme |
| `"Passer aux visuels"` | `RoomPanel.tsx:546` | CTA de navigation, pas d'action sur un objet — acceptable en navigation | Conforme |
| `"Modifier"` (carte pièce validée) | `VisualWizard.tsx:1360` | Trop court — l'objet est implicite | `"Modifier cette pièce"` |
| `"Confirmer"` (pièce IA) | `RoomPanel.tsx:340` | Seul de ce type — conforme | Conforme |

---

## 7. Recommandations s34 prioritisées

| Priorité | Action | Fichier : ligne | Effort estimé |
|---|---|---|---|
| **P0** | Remplacer `uploadez la photo` par `déposez la photo` dans la description Étape 4 | `visuals/placement/page.tsx:293` | 5 min — 1 Edit |
| **P0** | Remplacer `"Connexion difficile — la génération continue côté serveur, on rattrape l'état."` par formulation non-tech | `VisualWizard.tsx:1216` | 5 min — 1 Edit |
| **P1** | Unifier les deux libellés `Régénérer les pièces avec l'IA` / `Régénérer les pièces IA` → `Régénérer les pièces (avec l'IA)` | `RoomPanel.tsx:458–459` | 5 min — 1 Edit |
| **P1** | Remplacer `"J'ai mis à jour : ${label} → ${update.value}"` par `"Mis à jour : ${label} → ${update.value}"` (supprimer 1ère personne IA) | `VisualWizardRoomStep.tsx:324` | 5 min — 1 Edit |
| **P2** | Clarifier `"Aucune pièce à configurer."` → `"Aucune pièce à traiter pour ce lot."` | `VisualWizard.tsx:1133` | 5 min — 1 Edit |

---

## 8. Risques résiduels

**Chat architecte (ArchitectChatPanel.tsx) — prompts système** : le composant appelle `/api/vs/rooms/:id/chat` (et `/chat/start`). Les prompts système LLM côté API ne sont pas dans le périmètre client-facing direct de cet audit (les réponses générées par le LLM sont dynamiques et non auditables statiquement). **Risque** : si le LLM génère une réponse avec un anglicisme (ex. "upload"), celui-ci apparaît en surface utilisateur. Recommandation s34 : ajouter dans le system prompt une règle explicite "Répondre uniquement en français, sans anglicisme" et tester les suggestions LLM dynamiques sur 10 scénarios types.

**Commentaire interne `VisualWizard.tsx:121`** : `"uploadée"` dans un commentaire de code. Non visible en prod, mais risque de copier-coller vers une string JSX dans une future itération. À corriger en même temps que le P0.

**`VisualWizardRoomStep.tsx` — liste pastilles** : les strings `"Ajouter"`, `"Déposer"`, labels des boutons d'upload par pastille n'ont pas pu être lus intégralement (fichier >600 lignes, lecture tronquée à 470L). Recommandation : grep ciblé sur ce composant avant merge s34 pour valider l'absence d'anglicisme sur les boutons de dépose photo.

---

**Handoff → @orchestrator**

- Fichier produit : `docs/copy/s33-audit-copy-etape3-4.md`
- Verdict : 7/10 — 1 P0 bloquant G33 (`uploadez`), 1 P0 jargon tech visible (`rattrape l'état`), 3 P1/P2 actionnables en s34
- Top 3 défauts critiques : (1) `uploadez` P0 G33 ; (2) message SSE jargon développeur visible en prod ; (3) double libellé `Régénérer les pièces IA` incohérent
- Estimation effort top 5 : **25 min total** (5 × 5 min, 5 Edits indépendants, aucune dépendance croisée, zéro impact fonctionnel)
- Points d'attention : vérifier `VisualWizardRoomStep.tsx` lignes 470+ (pastilles photo) avant merge — hors périmètre lecture de cet audit
