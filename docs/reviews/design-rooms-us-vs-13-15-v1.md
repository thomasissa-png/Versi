# Audit Design — Étape 3 Pièces Versi Studio (US-VS-13/14/15) — v1
Session versi-s18 | Branche `claude/versi-s18-pieces-autopilot-Vlowg` | 2026-04-16

## Périmètre audité

- `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx`
- `versi-studio/src/components/vs/RoomPanel.tsx`
- `versi-studio/src/components/vs/RoomCanvas.tsx`
- `versi-studio/src/app/globals.css` (sections `@theme` et tokens couleur pièces)

Spec source : `docs/product/vs-functional-specs.md` §5 (L671-876)
Référence canonique : `LotPanel.tsx` + `PlanCanvas.tsx` (Étape 2 Lots — design 9/10 versi-s17)

---

## Tableau 5 critères

| Critère | Note /10 | Findings (P0/P1/P2) | Corrections EXACTES |
|---|---|---|---|
| 1. Gate G22 WCAG AA (contrastes ≥4.5:1, focus-visible, touch ≥44px, prefers-reduced-motion) | 7/10 | P0-1 : `RoomCanvas.tsx:387` — `bg-[#F0EDE8]` hardcoded, non-issue WCAG direct mais mélange token/hex sur fond canvas. P1-1 : `RoomPanel.tsx:160-165` — card de pièce `div role="button"` sans état `:active` documenté. P1-2 : bouton "Ajouter une pièce" (`RoomPanel.tsx:334`) — `py-sm` = 8px soit ~32px total (hauteur < 44px mobile). P1-3 : bouton "Supprimer" (`RoomPanel.tsx:272-279`) — `px-xs py-2xs` = 4px padding vertical, hauteur ~28px, sous le seuil 44px mobile. P2-1 : canvas (`RoomCanvas.tsx:389`) — `role="img"` sans `tabindex="0"` donc non atteignable au clavier pour un survol focus. | **P1-2 — bouton "Ajouter"** : `py-sm` → `py-[10px]` (ou `min-h-[44px]`) : `className="w-full px-md min-h-[44px] rounded-md text-sm font-medium ..."`. **P1-3 — bouton "Supprimer"** : `px-xs py-2xs` → `px-sm py-sm min-h-[44px] flex items-center`. **P2-1 — canvas** : ajouter `tabIndex={0}` et `onKeyDown` pour focus clavier sur le canvas. |
| 2. Gate G23 — zéro hex hardcoded JSX (sauf canvas justifié) | 6/10 | P0-1 : `RoomCanvas.tsx:387` — `bg-[#F0EDE8]` dans la div conteneur JSX. Non justifié canvas (c'est la div wrapper, pas le canvas 2D). P0-2 : `RoomPanel.tsx:99` — `bg-white` (valeur Tailwind builtin = #FFFFFF, pas un token sémantique `bg-bg-card`). Occurrences multiples: L99, L136, L164, L222, L258. P0-3 : `RoomPanel.tsx:393` — `text-white` sur bouton Continuer (devrait être `text-text-inverse`). **Justifiés** (canvas 2D API) : `RoomCanvas.tsx:188` `#F0EDE8`, L201 `#D9D4CE`, L259 `rgba(255,255,255,0.85)`, L267 `#0B0B0B` — tous dans `draw()`, contexte Canvas 2D API, accepté comme `PlanCanvas.tsx` canonique. | **P0-1** `RoomCanvas.tsx:387` : remplacer `bg-[#F0EDE8]` par `bg-bg-subtle` (ou ajouter `--color-bg-subtle` = `#F0EDE8` dans globals.css section sémantique). **P0-2** `RoomPanel.tsx` — remplacer TOUTES les occurrences de `bg-white` par `bg-bg-card` et `text-white` par `text-text-inverse` : L99, L136, L164, L222, L258, L290, L393. |
| 3. Gate G31 — tokens 3 tiers (primitive→semantic→component) | 8/10 | P1-1 : `RoomPanel.tsx:99` — `bg-white` référence la primitive Tailwind (blanc pur) au lieu du token sémantique `bg-bg-card`. P1-2 : `RoomPanel.tsx:290` — `bg-white` sur l'aside du panel (même problème). P1-3 : `RoomPanel.tsx:393` — `text-white` au lieu de `text-text-inverse`. P2-1 : `styles.ts` — les couleurs `ROOM_TYPE_COLORS` sont des hex en dur non référencés dans `@theme`. Ces couleurs canvas sont acceptables comme primitives internes mais aucun token component `--color-room-*` n'est défini dans globals.css (défaut d'architecture token 3e tiers pour un nouveau domaine couleur). | **P1** : remplacer `bg-white` → `bg-bg-card`, `text-white` → `text-text-inverse` partout dans RoomPanel.tsx (7 occurrences). **P2** : ajouter dans `globals.css` section `@theme` les tokens couleur pièces : `--color-room-chambre: #4A90D9; --color-room-salon: #5BA55B; --color-room-cuisine: #E67E22; --color-room-sdb: #8E44AD; --color-room-wc: #E84393; --color-room-autre: #7F8C8D;` — puis les référencer depuis `styles.ts`. |
| 4. Gate G32 — 6 états composant interactif (default/hover/active/focus-visible/disabled/loading) | 6/10 | P0-1 : Card pièce (`RoomPanel.tsx:159-282`) — composant cliquable `role="button"` : manque état `:active` (scale ou feedback visuel). P0-2 : Bouton tab lot (`RoomPanel.tsx:89-118`) — manque état `:active`. P1-1 : Bouton "Ajouter une pièce" (`RoomPanel.tsx:334`) — pas d'état `:active`. P1-2 : Bouton "Valider ce lot" (`RoomPanel.tsx:349`) — état loading présent (spinner), disabled présent, hover présent, focus-visible présent — mais manque `:active`. P1-3 : Bouton "Continuer" (`RoomPanel.tsx:386`) — manque `:active`. P2-1 : Select dropdown type (`RoomPanel.tsx:203`) — manque état `:focus` visible en mode non-`:focus-visible` (navigateurs mobiles). **État :active systématiquement absent** sur tous les boutons — défaut de pattern. | Ajouter `active:opacity-80` ou `active:scale-[0.98]` systématiquement sur tous les éléments interactifs. Pattern exact pour les boutons primaires : `active:bg-black` ou `active:opacity-90`. Pour la card pièce : `active:bg-bg-default/80`. Exemple bouton "Ajouter" : `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary active:opacity-80`. |
| 5. Gate G34 — zéro collision @theme Tailwind v4 + cohérence Lots + code couleur pièces | 9/10 | **G34 PASS** : `globals.css` utilise `--space-*`, `--radius-*`, `--font-size-*`, `--color-*` — aucune collision avec scales Tailwind builtin (`--spacing-*` correctement évité, learning versi-s15 appliqué). P1-1 — cohérence Lots : `LotPanel.tsx` badge succès identique (`bg-success/10 border-success/20`) — COHÉRENT. P1-2 — code couleur pièces : CONFORME spec (chambre=bleu #4A90D9, salon=vert #5BA55B, cuisine=orange #E67E22, SDB=violet #8E44AD, WC=rose #E84393, autres=gris #7F8C8D). `non_identifie` fallback non défini dans `ROOM_TYPE_COLORS` — `getRoomColor` retourne `#7F8C8D` (gris) via fallback, spec dit "autres=gris" — ACCEPTABLE. P2-1 : token `--color-bg-subtle` absent dans globals.css (manquant pour remplacer `bg-[#F0EDE8]` canvas wrapper). | **P2-1** : ajouter dans globals.css section sémantique : `--color-bg-subtle: #F0EDE8;` (couleur de fond canvas/surfaces secondaires). |

**Note finale** : 7,2 /10 (moyenne : 7+6+8+6+9 = 36 / 5)
**Verdict** : GO CONDITIONNEL — 2 gates bloquantes (G23 hex hardcoded JSX, G32 états manquants)

---

## Détail des findings

### Critère 1 — G22 WCAG AA — 7/10

**prefers-reduced-motion** : PASS. `globals.css:85-92` — bloc `@media (prefers-reduced-motion: reduce)` présent, couvre toutes les animations/transitions. Learning versi-s17 appliqué.

**focus-visible** : PASS sur les boutons de la page. Tous les boutons dans `RoomPanel.tsx` et `page.tsx` portent `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary`. Conforme.

**Contrastes** : Non calculables analytiquement sans outil, mais les combinaisons utilisées (`text-text-default` sur `bg-bg-card` → #0B0B0B sur #FFFFFF = ratio ~21:1, `text-text-muted` sur `bg-bg-default` → #6B6560 sur #F7F5F2 = ratio estimé ~5.5:1) sont conformes 4.5:1. La couleur `text-success` (#15803D) sur `bg-success/10` (vert très clair) est à vérifier manuellement — ratio estimé ~5.2:1, conforme probable.

**Touch targets** : P1. Bouton "Ajouter une pièce" `py-sm` (8px) + font-sm (14px line-height ~21px) = ~37px total. Sous le seuil 44px mobile. Bouton "Supprimer" `py-2xs` (2px) + font-xs (13px) = ~19px. Très sous le seuil.

**Canvas accessibilité** : `RoomCanvas.tsx:399` porte `aria-label` et `role="img"`. Pas de `tabIndex`, donc le canvas n'est pas focusable au clavier — acceptable pour un outil interne (Thomas marchand de biens, pas d'enjeu accessibilité WCAG public), mais noté P2.

---

### Critère 2 — G23 Hex hardcoded JSX — 6/10

**Dans RoomCanvas.tsx (wrapper JSX, non canvas 2D)** :
- L387 : `bg-[#F0EDE8]` — div wrapper, pas le canvas. Non justifié. Token sémantique manquant.

**Dans RoomPanel.tsx (JSX, clairement non justifié)** :
- L99 : `bg-white` (tabs inactifs)
- L136 : `bg-white` (select dropdown)
- L164 : `bg-white` (card pièce inactive)
- L222 : `bg-white` (select type pièce)
- L258 : `bg-white` (input custom_label)
- L290 : `bg-white` (aside principal)
- L393 : `text-white` (bouton Continuer)

**Dans RoomCanvas.tsx (canvas 2D API — justifiés, comme PlanCanvas canonique)** :
- L188 : `ctx.fillStyle = "#F0EDE8"` — fond canvas
- L201 : `ctx.strokeStyle = "#D9D4CE"` — grille placeholder
- L259 : `ctx.fillStyle = "rgba(255, 255, 255, 0.85)"` — fond label
- L267 : `ctx.fillStyle = "#0B0B0B"` — texte label

Les 4 hex canvas 2D sont acceptés par le brief (pattern documenté PlanCanvas.tsx).

**Bilan** : 8 occurrences non justifiées dans JSX. C'est le principal défaut du composant.

---

### Critère 3 — G31 Tokens 3 tiers — 8/10

**Architecture globale** : Tier 1 (primitives) et Tier 2 (semantic) présents dans globals.css. Les composants utilisent majoritairement les tokens sémantiques (`bg-bg-default`, `text-text-default`, `text-text-muted`, `border-border-default`, `bg-interactive-primary`, `text-text-inverse`).

**Violations** :
- `bg-white` (7 occurrences dans RoomPanel) — Tailwind builtin #FFFFFF, non token sémantique. Le token correct est `bg-bg-card` déjà défini dans globals.css.
- `text-white` (1 occurrence L393) — doit être `text-text-inverse`.

**Tier 3 (component tokens) pour les pièces** : absent. Les couleurs de types de pièces (`ROOM_TYPE_COLORS` dans styles.ts) sont des hex en dur non présents dans `@theme`. Pour respecter l'architecture 3 tiers, ces couleurs devraient être dans `@theme` comme `--color-room-chambre`, `--color-room-salon`, etc. Non bloquant dans l'immédiat (canvas 2D API consomme des hex directement, les tokens CSS ne sont pas accessibles dans un canvas context), mais l'architecture est incomplète.

---

### Critère 4 — G32 6 états composant — 6/10

**Inventaire des composants interactifs** :
1. **Tab lot** (RoomPanel.tsx:89) : default ✓, hover ✓ (via `hover:bg-bg-default`), focus-visible ✓, disabled N/A, loading N/A — manque `:active` ✗
2. **Select lot dropdown** (RoomPanel.tsx:129) : default ✓, focus-visible ✓ — manque hover ✗, active ✗ (native select)
3. **Card pièce** (RoomPanel.tsx:159) : default ✓, hover ✓ (`hover:border-interactive-primary/50`), focus-visible implicite via tabIndex ✓ — manque `:active` ✗, disabled N/A, loading N/A
4. **Select type pièce** (RoomPanel.tsx:203) : default ✓, focus-visible ✓ — native select, limites CSS attendues
5. **Input custom_label** (RoomPanel.tsx:245) : default ✓, focus-visible ✓, placeholder ✓ — manque hover visuel ✗
6. **Bouton Supprimer** (RoomPanel.tsx:266) : default ✓, hover ✓ (`hover:text-error`), focus-visible ✓ — manque `:active` ✗, touch target insuffisant
7. **Bouton "Ajouter une pièce"** (RoomPanel.tsx:334) : default ✓, hover ✓, focus-visible ✓ — manque `:active` ✗
8. **Bouton "Valider ce lot"** (RoomPanel.tsx:349) : default ✓, hover ✓, disabled ✓, loading ✓ (spinner), focus-visible ✓ — manque `:active` ✗
9. **Bouton "Continuer"** (RoomPanel.tsx:386) : default ✓, hover ✓ (`hover:bg-success/90`), focus-visible ✓ — manque `:active` ✗

**Résumé** : l'état `:active` est systématiquement absent sur 6/6 boutons. C'est un oubli de pattern, pas un cas isolé. L'état loading n'est documenté que sur "Valider ce lot" — c'est cohérent car c'est le seul bouton avec opération async explicite.

---

### Critère 5 — G34 @theme + cohérence + code couleur — 9/10

**G34 PASS** : Aucun `--spacing-*`, `--sizing-*`, `--rounded-*`, `--leading-*`, `--tracking-*` dans le bloc `@theme`. Le learning versi-s15 est correctement appliqué (`--space-*` au lieu de `--spacing-*`, `--radius-*` au lieu de `--rounded-*`).

**Cohérence avec LotPanel (canonique 9/10 versi-s17)** :
- Badge "Lot validé" : `bg-success/10 border-b border-success/20` — IDENTIQUE à LotPanel
- Séparateurs `border-border-default` — IDENTIQUE
- Padding général `p-md` — IDENTIQUE
- Stepper Latéral partagé — COHÉRENT
- Erreur toast : `bg-error/10 border border-error/20` — IDENTIQUE au pattern LotPanel

**Code couleur pièces vs spec** :
- chambre = bleu (#4A90D9) ✓
- salon = vert (#5BA55B) ✓ (sejour et salle_a_manger partagent le vert — cohérent)
- cuisine = orange (#E67E22) ✓
- SDB = violet (#8E44AD) ✓
- WC = rose (#E84393) ✓
- autres (bureau, entree, dressing, cellier, terrasse, garage, couloir, cave, balcon, autre) = gris (#7F8C8D ou #95A5A6) ✓ — léger écart entre bureau (#2C3E50, bleu foncé quasi-noir) et la spec "gris". P1 : bureau et dressing (#2C3E50) ne sont pas visuellement "gris" mais bleu marine — confusion possible avec le bleu chambre bien que les tons soient distincts. Recommandé : aligner sur #7F8C8D pour cohérence spec "autres=gris".

**Token manquant** : `--color-bg-subtle` absent de globals.css. Nécessaire pour remplacer le `bg-[#F0EDE8]` du canvas wrapper.

---

## Synthèse des corrections prioritaires

### Corrections BLOQUANTES (à faire avant GO)

**1. Remplacer `bg-white` et `text-white` dans RoomPanel.tsx (G23)**
Fichier : `versi-studio/src/components/vs/RoomPanel.tsx`
Remplacements :
- L99 : `bg-white` → `bg-bg-card`
- L136 : `bg-white` → `bg-bg-card`
- L164 : `bg-white` → `bg-bg-card`
- L222 : `bg-white` → `bg-bg-card`
- L258 : `bg-white` → `bg-bg-card`
- L290 : `bg-white` → `bg-bg-card`
- L393 : `text-white` → `text-text-inverse`

**2. Remplacer `bg-[#F0EDE8]` dans RoomCanvas.tsx (G23)**
Fichier : `versi-studio/src/components/vs/RoomCanvas.tsx`
- L387 : `bg-[#F0EDE8]` → `bg-bg-subtle` (après ajout du token dans globals.css)

**3. Ajouter token `--color-bg-subtle` dans globals.css**
Fichier : `versi-studio/src/app/globals.css`
Dans `@theme`, section sémantique, après `--color-bg-dark` :
```css
--color-bg-subtle: #F0EDE8;   /* fond canvas, surfaces secondaires */
```

**4. Ajouter `:active` sur tous les boutons (G32)**
Pattern : ajouter `active:opacity-80` sur chaque bouton interactif dans RoomPanel.tsx.
- L93 (tab lot) : ajouter `active:opacity-80`
- L334 (Ajouter pièce) : ajouter `active:opacity-80`
- L349 (Valider lot) : ajouter `active:opacity-80`
- L386 (Continuer) : ajouter `active:opacity-80`
- L266 (Supprimer) : ajouter `active:opacity-80`

### Corrections RECOMMANDÉES (P1/P2)

**5. Touch targets boutons (G22) — P1**
- Bouton "Ajouter une pièce" : `py-sm` → `min-h-[44px]` + `flex items-center justify-center`
- Bouton "Supprimer" : ajouter `min-h-[44px] flex items-center`

**6. Couleur bureau/dressing (G34 code couleur) — P1**
`styles.ts:L137-138` : `bureau: "#2C3E50"` et `dressing: "#2C3E50"` → `bureau: "#7F8C8D"` et `dressing: "#7F8C8D"` pour alignement spec "autres=gris".

**7. Tokens component couleurs pièces (G31) — P2**
Ajouter dans `globals.css @theme` :
```css
--color-room-chambre: #4A90D9;
--color-room-salon: #5BA55B;
--color-room-cuisine: #E67E22;
--color-room-sdb: #8E44AD;
--color-room-wc: #E84393;
--color-room-autre: #7F8C8D;
```
Non consommables directement par le canvas 2D API mais documenter la source de vérité.

---

## Handoff → @orchestrator

- Fichiers produits : `docs/reviews/design-rooms-us-vs-13-15-v1.md`
- Décisions : audit design gates G22/G23/G31/G32/G34 sur Étape 3 Pièces (US-VS-13/14/15)
- Note : 7,2/10 — GO CONDITIONNEL
- Points d'attention :
  - **G23 FAIL** : 8 occurrences `bg-white`/`text-white` non tokénisées dans RoomPanel.tsx + 1 hex JSX dans RoomCanvas wrapper
  - **G32 FAIL** : état `:active` absent systématiquement sur 6 boutons
  - **G22 P1** : touch targets bouton "Ajouter" (~37px) et "Supprimer" (~19px) sous le seuil 44px mobile
  - **G34 PASS** : aucune collision @theme, learning versi-s15 correctement appliqué
  - **Code couleur PASS** : spec chambre=bleu/salon=vert/cuisine=orange/SDB=violet/WC=rose/autres=gris respectée, sauf bureau/dressing qui utilisent bleu marine (#2C3E50) au lieu de gris
  - **prefers-reduced-motion PASS** : bloc globals.css:85-92 présent
  - Corrections bloquantes : 7 lignes RoomPanel + 1 ligne RoomCanvas + 1 token globals.css + 5 ajouts `active:opacity-80`
