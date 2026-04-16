# Audit Copy — Étape 3 Pièces Versi Studio (US-VS-13/14/15) v1

**Session** : versi-s18
**Date** : 2026-04-16
**Auditeur** : @copywriter
**Périmètre** : page.tsx (583 L), RoomPanel.tsx (402 L), RoomCanvas.tsx (414 L), route.ts rooms (165 L), route.ts validate (90 L)
**Référence canonique** : LotPanel.tsx (9,5/10 versi-s17)

---

## Tableau d'audit

| Critère | Note /10 | Findings (P0/P1/P2) | Corrections EXACTES |
|---|---|---|---|
| 1. G33 — Zéro anglicisme client-facing | 10/10 | Aucun anglicisme trouvé dans les 5 fichiers. Grep `upload\|download\|feedback\|meeting\|forwarder` : 0 occurrence en surface visible, ARIA ou messages API. | — |
| 2. G24 — Registre "vous impératif neutre" uniforme | 7/10 | **P1 page.tsx:317** — `confirm("Supprimer cette piece ? Cette action est irreversible.")` : registre `confirm()` natif non formaté, absence d'accents (piece, irreversible), registre neutre non maintenu. **P1 RoomPanel.tsx:225** — `<option value="non_identifie" disabled>Sélectionnez un type</option>` : impératif deuxième personne du pluriel correct, mais forme "Sélectionnez" sans contexte de possession ("votre type"). Forme acceptable mais incohérente avec le pattern canonique LotPanel "impératif direct". **P2 page.tsx:504** — titre H1 `"Identifiez les pièces"` : correct, impératif neutre. | **P1 page.tsx:317** — Remplacer `confirm("Supprimer cette piece ? Cette action est irreversible.")` par `confirm("Supprimer cette pièce ? Cette action est irréversible.")` (accents UTF-8). Note : l'usage de `confirm()` natif est une dette UX (modal non stylée), signalé P1 pour le registre, la correction UTF-8 est P0 — voir Critère 3. |
| 3. Règle n°13 UTF-8 (m², …, caractères directs) | 7/10 | **P0 page.tsx:317** — `"Supprimer cette piece ? Cette action est irreversible."` : `piece` (manque è), `irreversible` (manque é et è). Deux caractères accentués manquants dans une string visible (modal confirm). **P0 RoomPanel.tsx:4** (commentaire) — `pieces`, `selectionne`, `Selectionner`, `valide`, `definissez` — mais ces occurrences sont dans les commentaires code (non visibles), donc hors périmètre G33/règle 13 pour l'affichage. **PASS** m² : RoomPanel.tsx:190 `m²` correct (UTF-8 direct ✓), RoomCanvas.tsx:246 `m²` correct ✓. **PASS** `…` : aucun `...` (3 points) trouvé en surface visible. **PASS** escape sequences `\u00XX` : aucune trouvée dans les strings visibles. | **P0 page.tsx:317** — Remplacer `"Supprimer cette piece ? Cette action est irreversible."` par `"Supprimer cette pièce ? Cette action est irréversible."` |
| 4. Conformité messages spec §5 | 6/10 | **P1 page.tsx:427** — Message loading actuel : `"Identification des pièces en cours..."` — spec exige : `"L'IA identifie les pièces du [nom du lot]..."`. Le message actuel est générique et ne nomme pas le lot ni l'IA. **P0 RoomPanel.tsx:321** — Message vide actuel : `"Aucune pièce détectée — ajoutez-en manuellement"` — spec exige : `"L'IA n'a pas détecté de pièces — ajoutez-en manuellement"` + bouton `"Ajouter une pièce"`. Le bouton "Ajouter une pièce" existe (RoomPanel.tsx:344) mais est en bas des actions, pas dans l'empty state. **PASS** Erreur validation : `"Définissez le type de toutes les pièces avant de valider"` présent exactement en RoomPanel.tsx:379 et validate/route.ts:59. **ABSENT** Succès dernier lot : `"Tous les lots sont validés — vous pouvez générer les visuels"` — absent. Le bouton "Continuer vers les visuels" apparaît (RoomPanel.tsx:395) mais sans message contextuel de succès. **ABSENT** Warning lot invalidé : `"Le lot a été invalidé — validez-le à nouveau avant de continuer"` — état `invalidated` non géré côté UI. | **P1 page.tsx:427** — Remplacer `"Identification des pièces en cours..."` par `"L'IA identifie les pièces du lot..."` (sans nom dynamique si non disponible à ce stade de chargement). **P0 RoomPanel.tsx:319-323** — Ajouter le bouton "Ajouter une pièce" dans l'empty state (en plus du bouton en bas). Remplacer `"Aucune pièce détectée — ajoutez-en manuellement"` par `"L'IA n'a pas détecté de pièces — ajoutez-en manuellement"`. **P1 RoomPanel.tsx — avant le bouton "Continuer vers les visuels"** — Ajouter `<p className="text-sm text-success text-center">Tous les lots sont validés — vous pouvez générer les visuels</p>` conditionnel sur `allLotsValidated`. **P1 — warning lot invalidé** — Ajouter la gestion de l'état `invalidated` dans RoomPanel : si `currentLot?.status === "invalidated"`, afficher `"Le lot a été invalidé — validez-le à nouveau avant de continuer"` en bandeau warning (même pattern que le badge "Lot validé", couleur warning). |
| 5. ARIA labels + microcopy actionnable + cohérence Lots | 8/10 | **PASS ARIA** : canvas `aria-label="Plan du lot avec les pièces identifiées"` + `role="img"` (RoomCanvas.tsx:399). Bouton fermeture erreur `aria-label="Fermer le message d'erreur"` (page.tsx:529). Tabs `role="tablist"` + `aria-label="Sélection du lot"` + `aria-selected` (RoomPanel.tsx:83-91). Select lot `<label htmlFor="lot-selector">` en sr-only (RoomPanel.tsx:126-128). Selects de type pièce `<label htmlFor={...}>` en sr-only (RoomPanel.tsx:197-201). **P1 ARIA manquant** : bouton "Ajouter une pièce" (RoomPanel.tsx:334) sans `aria-label` descriptif — juste le texte visible. Acceptable mais le bouton "Valider ce lot" (RoomPanel.tsx:349) est sans `aria-describedby` liant au message d'avertissement `hasUntypedRooms`. **P1 microcopy** : bouton "Valider ce lot" en état `disabled` ne communique pas la raison à l'utilisateur (le `title` tooltip existe mais n'est pas accessible sur mobile, et la phrase d'avertissement n'est conditionnellement affichée que si `hasUntypedRooms`). **P2 cohérence Lots** : LotPanel canonique utilise "Surface non renseignée" pour les surfaces nulles — RoomPanel utilise l'absence d'affichage (RoomPanel.tsx:188 : `{room.surface_m2 && ...}`). Mineur mais cohérence possible. **PASS** : pas de toast "Réessayer" manquant — les erreurs sont affichées en bandeau global avec bouton de fermeture (page.tsx:509-546), ce qui est acceptable même si un bouton "Réessayer" enrichirait l'UX. | **P1 RoomPanel.tsx:349** — Ajouter `aria-describedby="untyped-rooms-warning"` sur le bouton "Valider ce lot" et `id="untyped-rooms-warning"` sur le `<p>` d'avertissement. **P1 microcopy** — Ajouter un bouton "Réessayer" dans le bandeau d'erreur global (page.tsx:525) : `<button onClick={fetchData} className="...">Réessayer</button>` conditionnel sur les erreurs de chargement. |

**Note finale** : **(7 + 10 + 7 + 6 + 8) / 5 = 7,6 / 10**
**Verdict** : GO CONDITIONNEL — 1 gate BLOQUANT en attente (G33 PASS, mais P0 UTF-8 critique), conformité spec §5 insuffisante (4 messages sur 5 non conformes)

---

## Détail des findings

### Critère 1 — G33 Anglicismes : 10/10

Grep exhaustif sur les 5 fichiers — zéro occurrence de `upload`, `download`, `feedback`, `meeting`, `forwarder` en surface visible, ARIA labels, messages d'erreur API ou strings JSX rendues. Gate G33 : PASS.

### Critère 2 — G24 Registre : 7/10

Le registre global est "vous impératif neutre" cohérent avec LotPanel canonique. Le seul écart significatif est la `confirm()` native à page.tsx:317 qui combine deux problèmes : absence d'accents (traité en Critère 3) et registre de la modale non stylée (dette UX hors périmètre copy). Aucun `\btu\b|\bton\b|\btes\b` trouvé en copy visible. La possession "vos lots" (RoomPanel.tsx) est absente — ce qui est juste, les lots ne sont pas possédés dans ce contexte.

Le pattern impératif est globalement respecté : "Valider ce lot", "Ajouter une pièce", "Retour aux lots", "Retour aux opérations", "Continuer vers les visuels" — tous conformes au registre canonique LotPanel. La forme "Sélectionnez un type" (dropdown disabled) est correcte.

### Critère 3 — Règle n°13 UTF-8 : 7/10

Deux P0 dans la même string visible (page.tsx:317, `confirm()`). La surface est réduite mais le P0 est bloquant : une string rendue à l'utilisateur sans accents est une régression de marque.

Les m² sont correctement encodés partout (RoomPanel.tsx:190, RoomCanvas.tsx:246). Aucun `...` en trois points en surface visible. Aucune escape sequence Unicode.

Les commentaires en tête de RoomPanel.tsx et RoomCanvas.tsx contiennent de nombreux mots sans accents (`pieces`, `selectionne`, `valide`, etc.) — hors périmètre règle 13 (commentaires code), mais signalés P2 pour la lisibilité interne.

### Critère 4 — Conformité messages spec §5 : 6/10

Bilan des 5 messages obligatoires :

| Message spec | Statut | Localisation actuelle |
|---|---|---|
| Loading : "L'IA identifie les pièces du [nom du lot]..." | FAIL — version générique | page.tsx:427 |
| Vide : "L'IA n'a pas détecté de pièces..." + bouton dans empty state | FAIL — texte proche mais sans "L'IA" + bouton absent de l'empty state | RoomPanel.tsx:321 |
| Erreur validation : "Définissez le type de toutes les pièces..." | PASS — texte exact | RoomPanel.tsx:379 + validate/route.ts:59 |
| Succès dernier lot : "Tous les lots sont validés — vous pouvez générer les visuels" | FAIL — absent, bouton sans message | RoomPanel.tsx:395 |
| Warning lot invalidé : "Le lot a été invalidé — validez-le à nouveau..." | FAIL — état non géré | Aucun fichier |

Score : 1 PASS sur 5. Note 6/10 (un message critique est correct, et les deux FAIL les plus importants ont des équivalents fonctionnels proches).

### Critère 5 — ARIA + microcopy + cohérence Lots : 8/10

Le niveau ARIA est nettement supérieur à la moyenne d'un premier jet. Les éléments structurants sont correctement labelisés. Les lacunes sont des améliorations d'accessibilité (aria-describedby sur le bouton désactivé) et de recovery (bouton Réessayer), non des absences critiques.

La cohérence avec LotPanel canonique est bonne sur le registre. Le pattern de toast d'erreur est différent (bandeau global vs toast flottant) mais cohérent en interne — acceptable pour V1.

---

## Synthèse des corrections prioritaires

### P0 (bloquant — corriger avant merge)

1. **page.tsx:317** — `"Supprimer cette piece ? Cette action est irreversible."` → `"Supprimer cette pièce ? Cette action est irréversible."` (2 caractères accentués manquants)

2. **RoomPanel.tsx:321** — Ajouter le bouton "Ajouter une pièce" directement dans l'empty state (pas seulement en bas du panel) :
```tsx
<div className="text-center py-2xl">
  <p className="text-sm text-text-muted mb-md">
    L'IA n'a pas détecté de pièces — ajoutez-en manuellement
  </p>
  <button
    onClick={onAddRoom}
    className="px-md py-sm rounded-md text-sm font-medium bg-interactive-primary text-text-inverse hover:bg-interactive-hover transition-colors duration-200"
  >
    Ajouter une pièce
  </button>
</div>
```

### P1 (à corriger dans la session)

3. **page.tsx:427** — `"Identification des pièces en cours..."` → `"L'IA identifie les pièces du lot..."`

4. **RoomPanel.tsx — section allLotsValidated** — Ajouter avant le bouton "Continuer vers les visuels" :
```tsx
{allLotsValidated && (
  <p className="text-sm text-success text-center">
    Tous les lots sont validés — vous pouvez générer les visuels
  </p>
)}
```

5. **RoomPanel.tsx — badge lot invalidé** — Ajouter après le badge "Lot validé" (conditionnel sur `currentLot?.status === "invalidated"`) :
```tsx
{currentLot?.status === "invalidated" && (
  <div className="px-md py-sm bg-warning/10 border-b border-warning/20">
    <p className="text-sm text-warning">
      Le lot a été invalidé — validez-le à nouveau avant de continuer
    </p>
  </div>
)}
```

6. **RoomPanel.tsx:349** — Lier le warning ARIA au bouton désactivé :
```tsx
<button aria-describedby={hasUntypedRooms ? "untyped-rooms-warning" : undefined} ...>
```
Et sur le `<p>` d'avertissement : `id="untyped-rooms-warning"`.

### P2 (nice to have)

7. Ajouter un bouton "Réessayer" dans le bandeau d'erreur global (page.tsx:525) pour les erreurs de chargement réseau.
8. Harmoniser les commentaires de code (accents manquants dans RoomPanel.tsx et RoomCanvas.tsx) — lisibilité interne.

---

## Hypothèses à valider

- [HYPOTHÈSE] : le message loading spec mentionné (`"L'IA identifie les pièces du [nom du lot]..."`) suppose que le nom du lot est disponible au moment du chargement. Or, `loading = true` précède la réception des données lot — il faudrait soit un message générique sans nom, soit stocker le dernier lot sélectionné en localStorage. Demander au fondateur quelle approche est attendue avant implémentation.
- [HYPOTHÈSE] : l'état `invalidated` des lots est prévu en base (`status` field) mais non géré en UI. S'il n'existe pas encore de route pour invalider un lot, le warning correspondant peut être ajouté sans handler fonctionnel (affichage conditionnel défensif).

---

**Handoff → @fullstack**
- Fichiers produits : `docs/reviews/copy-rooms-us-vs-13-15-v1.md`
- Corrections P0 à appliquer : page.tsx:317 (accents), RoomPanel.tsx empty state (texte + bouton intégré)
- Corrections P1 à appliquer : page.tsx:427 (message loading), RoomPanel.tsx (message succès allLots, warning invalidated, aria-describedby)
- Points d'attention : ne pas déplacer le bouton "Ajouter une pièce" existant en bas du panel — le dupliquer dans l'empty state uniquement. Le message succès allLotsValidated doit apparaître AU-DESSUS du bouton "Continuer vers les visuels", pas en dessous.
