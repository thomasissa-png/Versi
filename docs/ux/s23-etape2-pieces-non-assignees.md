# UX — Pièces non assignées à l'Étape 2 (Lots)

Session s23 — Décision et instructions @fullstack

---

## 1. Diagnostic actuel

**Localisation** : `LotPanel.tsx` lignes 410–427 — bloc rendu après la grille de lots, avant les boutons d'action.

**Rendu** : section `bg-gray-50` avec titre "Pièces non assignées (N)", liste `<ul>` en `text-xs` avec pour chaque pièce : `name_raw · surface_m2 ou "surface inconnue" · étage N`, puis note italique "Ces pièces n'ont pas été rattachées à un lot".

**Condition de rendu** : `unassignedRooms && unassignedRooms.length > 0` — toujours visible si au moins une room sans `unit_id` existe dans `extraction_data` du plan courant.

**Actions disponibles** : aucune. La liste est purement informative — Thomas ne peut ni assigner, ni supprimer, ni ignorer une pièce non assignée depuis cette UI.

---

## 2. Analyse de valeur pour le persona

**Contexte de l'Étape 2** : Thomas valide des lots IA (un lot = un appartement). Son objectif cognitif est "les contours sont-ils corrects ? Dois-je ajuster ou valider ?". Il veut passer à l'Étape 3 en < 1 minute.

**Cas réel testé** : ECS (ballon d'eau chaude), étage 0, surface inconnue.

| Critère | Analyse |
|---|---|
| Actionnable ? | Non — pas de bouton "Assigner" ni "Ignorer". L'info ne génère aucune action à l'Étape 2. |
| Compréhensible ? | Faiblement. `name_raw` = label brut IA ("ECS", "SAS PALIER"). Thomas n'a pas le contexte pour interpréter. "Surface inconnue" = non informatif. |
| Pertinent au focus Étape 2 ? | Non. Thomas valide des LOTS (appartements). L'ECS ou le palier n'est pas un lot — il ne doit pas s'en occuper ici. |
| Risque de friction ? | Oui. Le bloc attire l'attention sur une "anomalie" qui n'en est pas une (ECS = normal dans un immeuble). Thomas peut se demander si quelque chose est cassé ou s'il doit agir. |
| Valeur transparence IA | Réelle mais prématurée. L'info est utile à l'Étape 3 (pièces d'un lot) où Thomas peut contrôler ce qui est dans chaque appartement — pas ici. |

**Verdict** : le bloc crée un bruit cognitif sans valeur actionnelle à l'Étape 2. Il répond à la question "qu'a détecté l'IA ?" alors que la question du moment est "mes lots sont-ils bons ?".

---

## 3. Recommandation : Option A — Supprimer le bloc de l'Étape 2

**Choix** : Option A (supprimer), avec conservation des données en DB et réinjection possible à l'Étape 3.

**Rationale** :

- Zéro action possible = zéro raison d'afficher. H8 Nielsen (design minimaliste) : chaque élément visible doit avoir une raison d'être. Ce bloc n'en a pas à l'Étape 2.
- L'ECS et le palier ne font pas partie d'un lot — les afficher dans le panneau de validation des lots est sémantiquement incorrect. Thomas pourrait croire que ces pièces devraient être dans un lot et que l'IA a échoué.
- La vraie valeur de cette info (transparence sur ce que l'IA a détecté mais non assigné) est à l'Étape 3, lors de la vérification pièce par pièce d'un lot. C'est là que Thomas peut voir "j'ai 5 pièces + 1 ECS non rattachée" et décider.
- Découvrabilité (learning s22) : les données ne disparaissent pas, elles sont cachées de l'UI Étape 2 uniquement. `extraction_data` reste intact en DB.

**Option B écartée** : un collapse "Détails techniques" réduit le bruit mais ne le supprime pas. Thomas verra le titre, s'interrogera, déplient — friction maintenue. L'info collapsée par défaut = l'info qu'on n'assume pas d'afficher.

**Option C écartée** : ajouter des boutons "Assigner / Supprimer" alourdit l'Étape 2. Assigner une pièce à un lot, c'est le travail de l'Étape 3.

**Option D (Étape 3)** : pertinente mais hors scope s23. À challenger sur une session dédiée selon les retours réels de Thomas à l'Étape 3. Pas de modification silencieuse du workflow — voir règle s22.

---

## 4. Instructions @fullstack

### 4.1 — LotPanel.tsx

**Fichier** : `versi-studio/src/components/vs/LotPanel.tsx`

**Modification** : supprimer le bloc I7 "Pièces non assignées" (lignes 410–427) — le bloc JSX conditionnel `{unassignedRooms && unassignedRooms.length > 0 && ( ... )}`.

Ne pas supprimer :
- Le calcul `unassignedRooms` dans `page.tsx` (conserver pour usage futur Étape 3)
- La prop `unassignedRooms?: ExtractedRoom[]` dans l'interface `LotPanelProps` (peut rester, simplement inutilisée)
- L'import `ExtractedRoom` dans LotPanel.tsx (peut rester si prop conservée, sinon retirer pour éviter warning lint)

### 4.2 — lots/page.tsx

**Fichier** : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`

**Modification** : aucune. Le calcul `unassignedRooms` (lignes 734–739) et son passage en prop à `LotPanel` (ligne 1035) restent en place — ils serviront à l'Étape 3 si la feature est relancée.

### 4.3 — Validation attendue

Après modification : l'Étape 2 ne doit afficher aucune mention de "Pièces non assignées", "ECS", "surface inconnue" ni note italique associée. La section doit passer directement de la grille de lots aux boutons d'action.

---

## 5. Coordination @copywriter

Le fichier `docs/copy/s23-etape2-pieces-non-assignees-copy.md` commandé en parallèle devient caduc si l'option A est validée — le bloc est supprimé, il n'y a pas de wording à retravailler.

Si Thomas choisit une autre option après lecture de ce doc, relancer @copywriter avec la décision finale.

---

## Tests UX — Suppression bloc pièces non assignées

| Test | Critère de succès | Statut |
|---|---|---|
| Charge cognitive Étape 2 | Panneau lots : uniquement grille lots + boutons action | OK post-modification |
| Focus persona : Thomas valide les lots sans distraction | Aucun élément non actionnable dans le panneau | OK post-modification |
| Données préservées | `unassignedRooms` reste calculé et accessible | OK (code page.tsx inchangé) |
| H8 — Design minimaliste | Zéro élément sans action disponible | OK post-modification |

---

**Handoff → @fullstack**

Fichiers produits : `/home/user/Versi/docs/ux/s23-etape2-pieces-non-assignees.md`

Décision prise : Option A — supprimer le bloc JSX "Pièces non assignées" dans LotPanel.tsx (lignes 410–427). Données conservées en DB et dans le state page.tsx, simplement masquées de l'UI Étape 2.

Points d'attention :
- Ne pas toucher au calcul `unassignedRooms` dans page.tsx — réutilisable Étape 3
- Vérifier que la suppression du bloc JSX ne laisse pas d'import orphelin (`ExtractedRoom`) qui ferait échouer le lint/build — retirer l'import si la prop est aussi retirée, sinon conserver
- Pré-commit obligatoire : `npx tsc --noEmit && npx next lint && npm run build`
