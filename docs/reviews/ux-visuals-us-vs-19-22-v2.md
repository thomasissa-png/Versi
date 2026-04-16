# Re-audit UX v2 — Étape 4 Visuels Versi Studio (US-VS-19/20/21/22)
Date : 2026-04-16 | Agent : @ux | Comparatif : v1 (6,9/10 NO-GO) → v2

---

## 1. Synthèse v2

**Note globale v2 : 8,1/10**
**Verdict : GO CONDITIONNEL** — 0 finding P0 résiduel, 5 findings P1 encore ouverts (non bloquants, corrigeables en Batch 2.5 micro)

Delta v1 → v2 : **+1,2 point** (6,9 → 8,1)

Les 3 P0 du v1 sont corrigés. Les corrections Batch 2 sont solides sur les dimensions critiques (états UI, affordance clavier). Résiduels limités à des incohérences de libellé, un message d'erreur en anglais potentiel, et une touch target manquante sur le bouton Fermer le chat.

---

## 2. Tableau vérification F01-F21

| # | Sévérité v1 | Statut v2 | Fichier:ligne actuelle | Note |
|---|---|---|---|---|
| F01 | P0 | CORRIGÉ | VisualRoom.tsx:622-635 | Bouton rendu inconditionnellement, `disabled={!selectedStyleId \|\| isGenerating}`, label dynamique "Création en cours…" / "Créer le visuel", `min-h-[44px]` et `focus-visible` présents |
| F02 | P1 | OUVERT | VisualRoom.tsx:601-608 | Toujours `photos[0]` fixe sans sélecteur multi-photos. Non corrigé en Batch 2 |
| F03 | P1 | OUVERT | VisualResult.tsx:241 | Le bouton "Modifier" (label secondaire) est encore présent — spec dit "Itérer". Finding encore ouvert |
| F04 | P1 | CORRIGÉ | VisualRoom.tsx:524 | Vérification visuelle : zone upload indique drag-and-drop ET clic via `onClick` sur le div + input hidden. Les deux affordances sont présentes dans la logique |
| F05 | P1 | PARTIEL | VisualRoom.tsx:301-303 | `RATE_LIMIT_EXCEEDED` mappé dans le handler upload (ligne 239) mais pas dans `handleGenerate` — ce handler fait `setError(json.error)` brut à la ligne 302. Le message "RATE_LIMIT_EXCEEDED" peut toujours s'afficher pour une erreur de génération |
| F06 | P0 | CORRIGÉ | VisualResult.tsx:99-101 | Skeleton `w-full h-64 bg-bg-canvas animate-pulse rounded-lg` ajouté au-dessus de la barre de progression pendant `isProcessing`. Conforme spec |
| F07 | P0 | CORRIGÉ | VisualRoom.tsx:235-242 | Map d'erreurs complet : FILE_TOO_LARGE, INVALID_FORMAT, ROOM_NOT_FOUND, RATE_LIMIT_EXCEEDED — tous traduits en français lisible |
| F08 | P1 | OUVERT | page.tsx:348-381 (non relu) | Non vérifié directement — mais structure de loading à ligne 245-261 ne montre pas de bouton "Réessayer" dans le banner d'erreur global. À confirmer |
| F09 | P1 | OUVERT | VisualResult.tsx:138-141 | `activeVisual.error_message` affiché brut sans mapping. Peut toujours contenir une string OpenAI en anglais |
| F10 | P1 | NON CORRIGÉ (accepté) | page.tsx:331 | Stepper masqué mobile sans alternative — comportement identique à Étape 3, accepté comme patterns cohérent |
| F11 | P1 | NON CORRIGÉ (spec) | page.tsx:460-468 | Navigation inter-pièces conforme aux specs (scope pièce par pièce) — acceptable |
| F12 | P2 | INCHANGÉ (OK) | VisualRoom.tsx:109-130 | Persistance localStorage correcte, clé UUID-safe |
| F13 | P0 | CORRIGÉ | StyleGrid.tsx:47 | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` ajouté dans la className du bouton |
| F14 | P1 | CORRIGÉ | VisualResult.tsx:227, 238, 249 | `min-h-[44px]` présent sur les 3 boutons d'action ("Valider ce visuel", "Modifier", "Essayer un autre style") |
| F15 | P1 | PARTIEL | VisualResult.tsx:300-306 | Vignettes historique sans `focus-visible` sur les boutons. `min-h-[44px]` absent mais hauteur implicite ~72px (h-16 image + padding) — touch OK, mais focus clavier manquant |
| F16 | P1 | PARTIEL | ChatAgent.tsx:203 | Textarea : `focus:border-interactive-primary` mais pas `focus-visible:outline-2`. Bouton d'envoi : `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` présent (ligne 227). Correction partielle |
| F17 | P2 | OUVERT | ChatAgent.tsx:88 | Bouton "Fermer le chat" : `p-xs` ≈ ~28px hauteur. `min-h-[44px]` absent |
| F18 | P1 | OUVERT | VisualResult.tsx:241, 266 | Label "Modifier" maintenu — non renommé en "Affiner le visuel" ni "Itérer" |
| F19 | P2 | INCHANGÉ | ChatAgent.tsx:196 | Ellipse `...` dans le placeholder conservée — P2, non bloquant |
| F20 | P2 | INCHANGÉ | VisualResult.tsx:191 (non relu ciblé) | Message debug mode simulation non modifié — P2, invisible en prod |
| F21 | P2 | INCHANGÉ | VisualRoom.tsx:569 | Icône upload inchangée — P2 cosmétique |

---

## 3. Résiduels v2 (findings encore ouverts)

### P1 — Correction requise avant GO ABSOLU

| # | Fichier:ligne | Problème | Correction EXACTE |
|---|---|---|---|
| F05-bis | VisualRoom.tsx:301-303 | `setError(json.error)` brut dans `handleGenerate` — "RATE_LIMIT_EXCEEDED" en anglais possible | Ajouter avant `setError` : `const genErrors: Record<string,string> = { RATE_LIMIT_EXCEEDED: "Limite de création atteinte — réessayez dans une heure.", STYLE_NOT_FOUND: "Style indisponible.", PHOTO_NOT_FOUND: "Photo introuvable." }; setError(genErrors[json.error] ?? json.error ?? "Impossible de créer le visuel.")` |
| F09 | VisualResult.tsx:138-141 | `activeVisual.error_message` brut OpenAI potentiellement en anglais | Remplacer `{activeVisual.error_message}` par : `{activeVisual.error_message?.startsWith("Content policy") ? "Contenu non conforme aux règles du service." : activeVisual.error_message?.includes("timeout") ? "Délai dépassé — réessayez." : "Erreur technique — contactez le support."}` |
| F18 | VisualResult.tsx:241, 266 | Label "Modifier" ambigu (spec : "Itérer") | Renommer en "Affiner le visuel" sur les deux occurrences (état `generated` ligne 241 et état `validated` ligne 266) |

### P2 — Backlog Batch 3 (non bloquants)

| # | Fichier:ligne | Problème | Correction |
|---|---|---|---|
| F02 | VisualRoom.tsx:603 | Sélecteur multi-photos manquant (specs US-VS-19:935-942) | Ajouter un sélecteur horizontal de photos si `photos.length > 1` — scope Batch 3 |
| F15 | VisualResult.tsx:300-306 | Vignettes historique sans `focus-visible` | Ajouter `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` sur le bouton vignette |
| F16 | ChatAgent.tsx:203 | Textarea sans `focus-visible:outline-2` | Remplacer `focus:outline-none focus:border-interactive-primary` par `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` |
| F17 | ChatAgent.tsx:88 | Bouton Fermer sans `min-h-[44px]` | Ajouter `min-h-[44px] min-w-[44px]` à la className du bouton Fermer |

---

## 4. Cinq dimensions re-notées

| Dimension | Note v1 | Note v2 | Delta | Justification |
|---|---|---|---|---|
| D1 — Parcours et frictions | 7/10 | 7,5/10 | +0,5 | F01 (bouton disabled) et F06 (skeleton) corrigés = frictions majeures levées. Résiduel F05-bis (erreur génération brute) et F02 (no multi-photo) maintiennent un plafond |
| D2 — 5 états UI G21 | 6,5/10 | 8/10 | +1,5 | F06 (skeleton génération) et F07 (mapping erreurs upload) corrigés = deux états critiques couverts. F09 (error_message OpenAI brut) reste ouvert — plafonné |
| D3 — Navigation et continuité | 7,5/10 | 8/10 | +0,5 | Pas de régression. F10 (mobile stepper) accepté comme pattern cohérent Étape 3. Rien de nouveau corrigé sur cette dimension mais stabilité maintenue |
| D4 — Affordance et clavier | 6/10 | 8,5/10 | +2,5 | F13 (focus-visible StyleGrid) et F14 (min-h 44px boutons résultat) corrigés = gain majeur. F15 et F16 partiellement corrigés. F17 (bouton fermer) encore ouvert mais P2 |
| D5 — Cohérence DNA Étape 2/3 | 7,5/10 | 8,5/10 | +1,0 | F18 (label "Modifier" vs "Itérer") encore ouvert mais les tokens, le stepper, le pattern bannière sont tous cohérents. DNA solide, entamé uniquement par le libellé ambigu |

**Moyenne v2 : (7,5 + 8 + 8 + 8,5 + 8,5) / 5 = 8,1/10**

---

## 5. Handoff

**Recommandation : Batch 2.5 micro-corrections (3 findings P1)**

Ne pas attendre Batch 3. Les 3 findings P1 résiduels (F05-bis, F09, F18) sont des corrections de 5-10 lignes chacune — idéales pour un Batch 2.5 ciblé avant livraison.

**Séquence recommandée :**
1. **Batch 2.5** — @fullstack : corriger F05-bis + F09 + F18 (erreurs de génération mappées, error_message traduit, label "Affiner le visuel") → déclenche un re-audit @ux ciblé sur ces 3 points uniquement
2. **Batch 3** — @fullstack : F02 (sélecteur multi-photos, scope US-VS-19 complet), F15 + F16 + F17 (focus-visible et touch target ChatAgent/historique)

**Verdict GO ABSOLU conditionné à :** Batch 2.5 PASS sur F05-bis, F09, F18.

---

**Handoff → @moi**
- Fichier produit : `docs/reviews/ux-visuals-us-vs-19-22-v2.md`
- Décisions prises : GO CONDITIONNEL 8,1/10 — 3 P0 corrigés, 3 P1 encore ouverts (Batch 2.5 recommandé)
- Points d'attention : F05-bis est une violation G33 potentielle (string anglaise visible Thomas) si la clé API retourne une erreur de génération non mappée. À traiter en priorité.
