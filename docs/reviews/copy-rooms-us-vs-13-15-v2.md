# Audit Copy — Étape 3 Pièces Versi Studio (US-VS-13/14/15) v2

**Session** : versi-s18
**Date** : 2026-04-16
**Auditeur** : @copywriter
**Périmètre** : rooms/page.tsx, RoomPanel.tsx, RoomCanvas.tsx
**Référence v1** : `docs/reviews/copy-rooms-us-vs-13-15-v1.md` (score 7,6/10)
**Branche** : `claude/versi-s18-pieces-autopilot-Vlowg`

---

## Tableau comparatif v1 → v2

| Critère | v1 /10 | v2 /10 | Verdict |
|---|---|---|---|
| G33 Zéro anglicisme (surface visible) | 10 | 10 | PASS |
| G24 Registre "vous" uniforme | 7 | 10 | PASS |
| Règle n°13 UTF-8 | 7 | 7 | FAIL — P0 résiduel |
| Conformité spec §5 (5 messages) | 6 | 9 | PASS conditionnel |
| ARIA + microcopy + cohérence Lots | 8 | 8 | P1 résiduel (CORR-5 non implémenté) |

**Note v2** : (10 + 10 + 7 + 9 + 8) / 5 = **8,8 / 10**
**Verdict** : **GO CONDITIONNEL** — 1 P0 résiduel bloquant (règle n°13), 1 P1 résiduel (CORR-5 aria)

---

## Détail critère par critère

### Critère 1 — G33 Anglicismes : 10/10 (stable)

Grep exhaustif sur rooms/page.tsx, RoomPanel.tsx, RoomCanvas.tsx :
- `upload|uploader|uploadé|uploadez|download|downloader|feedback|meeting|forwarder` → **0 occurrence** en surface visible, ARIA, strings JSX.

Les occurrences dans VisualRoom.tsx et upload/page.tsx sont hors périmètre de cet audit (étape 3 Pièces).

Gate G33 : **PASS**.

---

### Critère 2 — G24 Registre "vous impératif neutre" : 10/10 (était 7/10)

**Correction P0.1 appliquée** — ConfirmModal page.tsx:697-698 :
- v1 : `confirm("Supprimer cette piece ? Cette action est irreversible.")` (confirm() natif sans accents)
- v2 : `title="Supprimer cette pièce ?"` + `message="Cette action est irréversible."` → **ConfirmModal stylée, accents corrects, registre neutre**

Registre global vérifié :
- Impératifs directs : "Valider ce lot", "Ajouter une pièce", "Retour aux lots", "Continuer vers les visuels" — conformes
- Aucun `\btu\b|\bton\b|\btes\b` en strings visibles
- Pattern canonique LotPanel respecté

Gate G24 : **PASS**.

---

### Critère 3 — Règle n°13 UTF-8 : 7/10 (stable — P0 résiduel)

**Correction P0.2 partiellement appliquée** :
- page.tsx:697-698 : "pièce" et "irréversible" corrigés dans la ConfirmModal — **PASS**
- RoomPanel.tsx:342 : `L&apos;IA n&apos;a pas détecté de pièces — ajoutez-en manuellement` — **FAIL P0 résiduel**

L'entité HTML `&apos;` est interdite dans les strings JSX rendues (règle n°13 : caractères UTF-8 directs obligatoires). Le texte doit utiliser l'apostrophe typographique directe : `L'IA n'a pas détecté de pièces — ajoutez-en manuellement`.

Autres vérifications :
- m² : RoomPanel.tsx:190, RoomCanvas.tsx — correct (UTF-8 direct)
- `...` (3 points) : page.tsx:503 utilise `…` (ellipse UTF-8) — **PASS**
- Escape séquences `\u00XX` : aucune dans les strings visibles — **PASS**
- Entités HTML `&eacute;|&egrave;|&agrave;` : aucune hors RoomPanel:342 — PASS pour le reste

**P0 résiduel : RoomPanel.tsx:342** — remplacer `L&apos;IA n&apos;a pas détecté` par `L'IA n'a pas détecté`.

---

### Critère 4 — Conformité messages spec §5 : 9/10 (était 6/10)

Bilan des 5 messages obligatoires après corrections Batch 2 :

| Message spec | Statut v1 | Statut v2 | Localisation |
|---|---|---|---|
| Loading : `L'IA identifie les pièces du [nom du lot]…` | FAIL (générique) | **PASS** | page.tsx:503 — template string avec `currentLot?.name ?? "lot"` |
| Vide : `L'IA n'a pas détecté de pièces…` + bouton dans empty state | FAIL | **PASS fonctionnel / P0 forme** | RoomPanel.tsx:339-351 — texte correct + bouton dans l'empty state. Réserve : `&apos;` (P0 ci-dessus) |
| Erreur validation : `Définissez le type de toutes les pièces…` | PASS | PASS | RoomPanel.tsx:430 |
| Succès dernier lot : `Tous les lots sont validés — vous pouvez générer les visuels` | FAIL (absent) | **PASS** | page.tsx:654-658 — conditionnel `allLotsValidated`, `role="status"` |
| Warning lot invalidé : `Le lot a été invalidé — validez-le à nouveau avant de continuer` | FAIL (non géré) | **PASS** | page.tsx:291, déclenché sur changement de type d'un lot validé |

Score : 4,5/5 (empty state texte juste mais encodage P0). Note 9/10.

Observation sur le warning lot invalidé : il est déclenché uniquement par le changement de type de pièce sur un lot validé (page.tsx:284-293). Le bandeau d'affichage global warningMessage gère l'affichage. Logique correcte, conforme spec.

---

### Critère 5 — ARIA + microcopy + cohérence Lots : 8/10 (stable)

**CORR-5 non implémenté** (confirmé par Grep `aria-describedby` → 0 résultat dans RoomPanel.tsx) :
- Bouton "Valider ce lot" sans `aria-describedby` liant au message d'avertissement `hasUntypedRooms`
- P1 résiduel — non bloquant pour V1, requis pour accessibilité complète

ARIA existant :
- Canvas `aria-label` + `role="img"` — PASS
- Tabs `role="tablist"` + `aria-selected` — PASS
- Labels sr-only sur les selects — PASS
- `role="status"` sur message succès allLotsValidated (page.tsx:655) — PASS (ajout batch 2)

Microcopy : cohérence globale avec LotPanel canonique maintenue.

---

## Synthèse des corrections résiduelles

### P0 (bloquant — corriger avant merge)

**RoomPanel.tsx:342** — Entité HTML en surface visible :
```tsx
// Actuel (FAIL)
L&apos;IA n&apos;a pas détecté de pièces — ajoutez-en manuellement

// Corrigé (PASS)
L'IA n'a pas détecté de pièces — ajoutez-en manuellement
```

### P1 (à corriger dans la session)

**RoomPanel.tsx — bouton "Valider ce lot"** — CORR-5 aria-describedby :
```tsx
// Sur le bouton (RoomPanel.tsx ~:379)
<button
  aria-describedby={hasUntypedRooms ? "untyped-rooms-warning" : undefined}
  ...
>

// Sur le paragraphe d'avertissement
<p id="untyped-rooms-warning" className="text-xs text-warning text-center">
  Définissez le type de toutes les pièces avant de valider
</p>
```

---

## Corrections Batch 2 validées

| Correction | Statut | Notes |
|---|---|---|
| P0.1 UTF-8 ConfirmModal (pièce + irréversible) | VALIDÉ | page.tsx:697-698 |
| P0.2 Empty state RoomPanel (texte + bouton) | VALIDÉ (forme P0 résiduel) | Texte conforme spec, encodage &apos; à corriger |
| P1-loading template string | VALIDÉ | page.tsx:503 avec nom dynamique |
| P1-succès allLotsValidated | VALIDÉ | page.tsx:654-658 avec role="status" |
| P1-warning lot invalidé | VALIDÉ | page.tsx:291 via warningMessage |
| P1-aria CORR-5 | NON IMPLÉMENTÉ | P1 résiduel |

---

**Handoff → @fullstack**
- Fichiers produits : `docs/reviews/copy-rooms-us-vs-13-15-v2.md`
- P0 résiduel à corriger : RoomPanel.tsx:342 — remplacer `L&apos;IA n&apos;a pas détecté` par `L'IA n'a pas détecté` (apostrophe UTF-8 directe)
- P1 résiduel à corriger : RoomPanel.tsx bouton "Valider ce lot" — ajouter `aria-describedby={hasUntypedRooms ? "untyped-rooms-warning" : undefined}` + `id="untyped-rooms-warning"` sur le paragraphe d'avertissement
- Points d'attention : toutes les autres corrections Batch 2 sont validées — ne pas re-toucher page.tsx:503/654-658/291 ni la ConfirmModal
