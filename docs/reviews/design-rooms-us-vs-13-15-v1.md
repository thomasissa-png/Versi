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

### Critère 1 — G22 WCAG AA

[À REMPLIR]

### Critère 2 — G23 Hex hardcoded

[À REMPLIR]

### Critère 3 — G31 Tokens 3 tiers

[À REMPLIR]

### Critère 4 — G32 6 états

[À REMPLIR]

### Critère 5 — G34 Collisions @theme + code couleur pièces

[À REMPLIR]

---

## Synthèse des corrections prioritaires

[À REMPLIR]

---

## Handoff → @orchestrator

- Fichiers produits : `docs/reviews/design-rooms-us-vs-13-15-v1.md`
- Décisions : audit design gates G22/G23/G31/G32/G34 sur Étape 3 Pièces
- Points d'attention : [À REMPLIR après audit]
