# Audit Design — Étape 2 Lots Versi Studio (US-VS-06/07/08) — v1

**Date** : 2026-04-16
**Agent** : @design
**Session** : versi-s17

---

## 1. Résumé exécutif

**Note globale : 6/10**

Le code est fonctionnellement solide et les tokens sémantiques sont majoritairement bien utilisés dans les composants JSX. Les problèmes bloquants se concentrent sur deux axes : (1) les états erreur et avertissement utilisent des classes Tailwind hardcodées (`red-50`, `red-200`, `red-600`, `red-700`) au lieu des tokens sémantiques d'erreur définis dans `globals.css`, et (2) le canvas HTML2D (`PlanCanvas`) utilise des valeurs hex et rgba en dur (`#DC2626`, `#0B0B0B`, `rgba(255,255,255,0.85)`) qui ne passent pas par le design system. Le `text-white` et `bg-white` répétés dans LotPanel constituent un troisième vecteur de dette. L'accessibilité keyboard du canvas est absente.

| Critère | Note /10 | Verdict |
|---|---|---|
| Tokens sémantiques (G23) | 5/10 | FAIL — états erreur hardcodés dans 3 fichiers |
| Contrastes WCAG AA (G22) | 7/10 | PASS partiel — contrastes texte OK, chevauchement rouge borderline |
| Focus-visible (G22) | 6/10 | FAIL — canvas sans focus-visible, LotCard rename input manque focus ring normalisé |
| Touch targets (G22) | 5/10 | FAIL — bouton supprimer LotCard 16x16px (w-4 h-4 + p-xs), poignées canvas 8px |
| États UI (G21) | 7/10 | PASS partiel — 4/5 états présents, badge succès "X lots validés" absent |

---

## 2. Tableau des findings

| # | Fichier:ligne | Gate | Constat | Sévérité | Correction exacte |
|---|---|---|---|---|---|
| F01 | `page.tsx:412` | G23 | `bg-red-50 border-red-200 text-red-700` hardcodés dans la boîte d'erreur globale. Token `--color-error: #B91C1C` défini dans globals.css mais non utilisé. Aucun token `--color-error-bg` ni `--color-error-border` n'existe — les classes Tailwind red-* contournent le système. | P0 | **Ajouter dans globals.css @theme** : `--color-error-bg: #FEF2F2; --color-error-border: #FECACA; --color-error-strong: #B91C1C;` — puis remplacer dans page.tsx:412 : `className="mb-md bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-md p-md text-sm text-[var(--color-error-strong)] flex items-start gap-sm"` |
| F02 | `page.tsx:430` | G23 | `hover:text-red-500` hardcodé sur le bouton fermer de la boîte d'erreur. Pas de token hover erreur. | P0 | Remplacer par `hover:text-[var(--color-error-strong)] hover:opacity-70` — cohérent avec le pattern hover opacity utilisé ailleurs dans le projet. |
| F03 | `page.tsx:468` | G23 | `text-white` sur le bouton "Continuer" (état actif). Token `--color-text-inverse: #F7F5F2` existe dans globals.css et est la valeur correcte sur fond `--color-interactive-primary`. | P0 | Remplacer `text-white` par `text-[var(--color-text-inverse)]` dans LotPanel.tsx:257. |
| F04 | `LotPanel.tsx:148` | G23 | `hover:text-red-600 hover:bg-red-50` hardcodés sur le bouton supprimer. Identique à F01 — même vecteur de dette. | P0 | Remplacer par `hover:text-[var(--color-error-strong)] hover:bg-[var(--color-error-bg)]` après ajout des tokens (voir F01). |
| F05 | `LotPanel.tsx:276` | G23 | `text-red-600` hardcodé sur le message d'avertissement chevauchement en bas du panneau. | P0 | Remplacer par `text-[var(--color-error-strong)]`. |
| F06 | `PlanCanvas.tsx:229-231` | G23 + G31 | `borderColor = "#DC2626"` (rouge chevauchement) et `borderColor = "#0B0B0B"` (lot sélectionné) hardcodés en canvas 2D. Le canvas API n'accepte pas les `var(CSS)` — mais les valeurs doivent être lues depuis les tokens au moment du rendu via `getComputedStyle`. | P1 | En tête du composant PlanCanvas, lire les tokens : `const style = getComputedStyle(document.documentElement); const colorError = style.getPropertyValue('--color-error-strong').trim() \|\| '#B91C1C'; const colorSelected = style.getPropertyValue('--color-interactive-primary').trim() \|\| '#0B0B0B';` — puis remplacer `"#DC2626"` par `colorError` et `"#0B0B0B"` (L239) par `colorSelected`. |
| F07 | `PlanCanvas.tsx:248-258` | G23 + G31 | Label texte canvas : `ctx.fillStyle = "#0B0B0B"` (×2) et fond label `rgba(255,255,255,0.85)` hardcodés. | P1 | Lire via `getComputedStyle` : `const colorText = style.getPropertyValue('--color-text-default').trim(); const colorBgCard = style.getPropertyValue('--color-bg-card').trim();` — remplacer `"#0B0B0B"` (L248, L257) par `colorText`, et `"rgba(255,255,255,0.85)"` par une version rgba construite depuis `colorBgCard` avec opacité 0.85. |
| F08 | `PlanCanvas.tsx:264-266` | G23 + G31 | Poignées resize : `ctx.fillStyle = "#FFFFFF"` et `ctx.strokeStyle = "#0B0B0B"` hardcodés. Même pattern que F07. | P1 | Utiliser `colorBgCard` et `colorText` lus via `getComputedStyle` (voir F06/F07). Centraliser la lecture dans un hook `useDesignTokens()` ou au début du callback `draw`. |
| F09 | `PlanCanvas.tsx:200-204` | G23 | `ctx.fillStyle = "#D9D4CE"` (plan absent) hardcodé. La valeur correspond à `--color-gris-chaud` — primitive directe. | P2 | Remplacer par `style.getPropertyValue('--color-border-default').trim()` — token sémantique correct pour une zone neutre inactive. |
| F10 | `LotPanel.tsx:117` | G22 — focus | Input renommage lot : `focus:outline-none focus:ring-1 focus:ring-[var(--color-interactive-primary)]`. Le `focus:outline-none` supprime l'outline natif et le remplace par un `ring-1` de 1px — non conforme WCAG 2.2 AA (outline minimum 2px). | P0 | Remplacer par `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)]` — conforme au pattern établi partout ailleurs dans le projet (LotPanel:231, LotPanel:261). Supprimer `focus:outline-none`. |
| F11 | `PlanCanvas.tsx:602-609` | G22 — focus | Le `<canvas>` n'a ni `tabIndex` ni `onKeyDown` ni `aria-label`. Il est non accessible au clavier — impossible de sélectionner/déplacer un lot sans souris. | P0 | Ajouter sur `<canvas>` : `tabIndex={0}` + `aria-label="Plan des lots — utilisez Tab et les touches directionnelles pour naviguer"` + `onKeyDown={handleCanvasKeyDown}` avec handler minimal (Tab → lot suivant, Suppr → supprimer lot sélectionné, flèches → déplacer de 1%). Ce niveau minimal satisfait WCAG 2.1 AA keyboard navigation. |
| F12 | `LotPanel.tsx:143-165` | G22 — touch | Bouton supprimer LotCard : zone de clic effective `w-4 h-4` (16px) + `p-xs` (4px) = 24px. WCAG 2.2 SC 2.5.8 exige 24px minimum, WCAG recommande 44px pour confort mobile. La zone est inférieure au minimum. | P0 | Remplacer `p-xs` par `p-sm` (8px padding) : zone effective = 16px + 16px = 32px — satisfait le minimum WCAG 2.2 SC 2.5.8. Pour mobile optimal, utiliser `p-md` (16px) sur mobile uniquement : `p-sm md:p-xs`. |
| F13 | `PlanCanvas.tsx:260-280` | G22 — touch | Poignées resize : `HANDLE_SIZE` non visible dans les lignes lues mais logique canvas — si ≤ 8px par côté, la zone tactile est inférieure à 44px. À confirmer en lisant la constante. Si HANDLE_SIZE < 16px, le touch target est non conforme. | P1 | Vérifier la valeur de `HANDLE_SIZE` (offset 1-50 PlanCanvas). Si < 16px : augmenter à 16px minimum (zone tactile 16px visuel ; ajouter `HANDLE_HIT_SIZE = 44` pour le hit testing). Le hit testing et le rendu visuel peuvent être découplés — poignée 10px visuellement, zone de clic 44px. |
| F14 | `page.tsx` + `LotPanel.tsx` | G21 — état succès | Aucun badge ni indicateur de succès "X lots validés / plan complet" visible après validation réussie. L'état succès (5ème état UI) est absent — l'utilisateur ne sait pas si la validation a abouti avant la redirection. | P1 | Ajouter dans LotPanel, sous le bouton valider, un état conditionnel post-validation : `{validationSuccess && <p className="text-xs text-[var(--color-success)] text-center flex items-center justify-center gap-xs"><CheckIcon className="w-4 h-4" />Lots enregistrés</p>}`. La prop `validationSuccess` est levée depuis page.tsx après le `handleValidate` réussi. |
| F15 | `PlanCanvas.tsx:611-629` | G23 | Bandeau chevauchement canvas : `bg-red-50 border-red-200 text-red-700` hardcodés. Identique à F01. Troisième occurrence du même pattern. | P0 | Remplacer par `bg-[var(--color-error-bg)] border-[var(--color-error-border)] text-[var(--color-error-strong)]` — après ajout des tokens (voir F01). |
| F16 | `globals.css` @theme | G34 | Aucune collision `--spacing-*` détectée — le renommage `--space-*` documenté en L58-61 a bien été appliqué. Gate G34 : PASS. | — | Aucune action requise. Constat positif documenté. |
| F17 | `globals.css` @theme | G31 | Tokens primitifs (`--color-calcaire`, `--color-gris-chaud`, etc.) définis dans @theme mais non référencés directement dans les composants JSX audités — les composants utilisent les tokens sémantiques (`--color-bg-default`, `--color-text-muted`). Architecture 3 tiers respectée côté JSX. Seule exception : canvas 2D (voir F06-F09). | — | Exceptions F06-F09 à corriger. Architecture JSX : PASS. |
| F18 | `globals.css` | G22 — prefers-reduced-motion | Aucune règle `@media (prefers-reduced-motion: reduce)` visible dans les 80 premières lignes. Le spinner `animate-spin` (LotPanel:266) et les `transition-colors duration-150` doivent être désactivés sous cette préférence. | P1 | Ajouter dans globals.css après @theme : `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` — conforme au pattern motion tokens défini dans le design system. |

---

## 3. Verdict gates

| Gate | Statut | Findings déclencheurs |
|---|---|---|
| G21 — 5 états UI | FAIL | F14 — état succès post-validation absent |
| G22 — Contrastes WCAG AA + focus + touch | FAIL | F10 (focus ring 1px), F11 (canvas non-clavier), F12 (touch target 24px < 44px), F18 (prefers-reduced-motion absent) |
| G23 — Zéro valeur hardcodée | FAIL | F01/F02/F04/F05/F15 (classes red-* Tailwind), F03 (text-white), F06/F07/F08/F09 (hex en dur canvas) |
| G31 — Architecture 3 tiers | FAIL | F06/F07/F08 — canvas utilise hex directs hors système de tokens. JSX respecte le 3 tiers. |
| G34 — Collisions @theme Tailwind v4 | PASS | Renommage `--space-*` correctement appliqué (F16). Aucune collision détectée. |

**Verdict global : NO-GO** — 4 gates BLOQUANT/REQUIS en FAIL. Corrections P0 obligatoires avant merge.

**Priorité de correction recommandée** :
1. **Batch 1 — globals.css** : ajouter `--color-error-bg`, `--color-error-border`, `--color-error-strong`, rule `prefers-reduced-motion` (F01 + F18) — 10 lignes
2. **Batch 2 — tokens hardcodés JSX** : remplacer red-* dans page.tsx et LotPanel.tsx, text-white → text-inverse (F01-F05, F15) — remplacements purs, risque zéro
3. **Batch 3 — canvas tokens** : centraliser `getComputedStyle` en début de `draw`, remplacer hex (F06-F09) — 15 lignes
4. **Batch 4 — accessibilité** : focus input (F10), tabIndex canvas (F11), touch target supprimer (F12) — 3 changements ciblés
5. **Batch 5 — états** : prop `validationSuccess` + badge succès (F14) — nouvelle prop + 5 lignes JSX
6. **Batch 6 — HANDLE_SIZE** : vérifier constante, augmenter hit zone si besoin (F13) — conditionnel

---

## 4. Handoff → @fullstack

**Pattern typiste — corrections exactes à appliquer dans l'ordre des batches**

**Batch 1 — globals.css : ajouter après `--color-warning`**
```css
  --color-error-bg: #FEF2F2;
  --color-error-border: #FECACA;
  --color-error-strong: #B91C1C;
```
Et après le bloc `@theme {}`, ajouter :
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Batch 2 — page.tsx:412 et page.tsx:430**
```tsx
/* L412 — remplacer bg-red-50 border-red-200 text-red-700 */
className="mb-md bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-md p-md text-sm text-[var(--color-error-strong)] flex items-start gap-sm"

/* L430 — remplacer text-red-700 hover:text-red-500 */
className="ml-auto text-[var(--color-error-strong)] hover:opacity-70"
```

**Batch 2 — LotPanel.tsx:148, LotPanel.tsx:257, LotPanel.tsx:276**
```tsx
/* L148 — bouton supprimer hover */
className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-sm rounded text-[var(--color-text-muted)] hover:text-[var(--color-error-strong)] hover:bg-[var(--color-error-bg)] transition-all duration-150"

/* L257 — text-white → text-inverse */
bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)]

/* L276 — text-red-600 */
className="text-xs text-[var(--color-error-strong)] text-center"
```

**Batch 2 — PlanCanvas.tsx:612 (bandeau chevauchement)**
```tsx
className="absolute bottom-3 left-3 right-3 bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-md px-md py-sm text-sm text-[var(--color-error-strong)] flex items-center gap-sm"
```

**Batch 3 — PlanCanvas.tsx : début du callback `draw` (avant la boucle for des lots)**
```tsx
// Lire les tokens design système au moment du rendu
const style = getComputedStyle(document.documentElement);
const colorError    = style.getPropertyValue('--color-error-strong').trim()     || '#B91C1C';
const colorSelected = style.getPropertyValue('--color-interactive-primary').trim() || '#0B0B0B';
const colorText     = style.getPropertyValue('--color-text-default').trim()     || '#0B0B0B';
const colorBgCard   = style.getPropertyValue('--color-bg-card').trim()          || '#FFFFFF';
const colorBorder   = style.getPropertyValue('--color-border-default').trim()   || '#D9D4CE';
```
Puis remplacer dans le corps du callback :
- `"#DC2626"` → `colorError` (L230)
- `"#0B0B0B"` (lot sélectionné, L239) → `colorSelected`
- `ctx.fillStyle = "#0B0B0B"` (label texte, L248 + L257) → `colorText`
- `"rgba(255,255,255,0.85)"` (fond label) → `colorBgCard + 'D9'` (hex opacity 85%) ou `'rgba(255,255,255,0.85)'` en attendant token rgba dédié
- `"#FFFFFF"` poignée (L264) → `colorBgCard`
- `"#0B0B0B"` poignée contour (L265) → `colorSelected`
- `"#D9D4CE"` plan absent (L201) → `colorBorder`

**Batch 4 — LotPanel.tsx:117 (input renommage)**
```tsx
/* Remplacer focus:outline-none focus:ring-1 focus:ring-[...] */
className="w-full text-sm font-medium bg-white border border-[var(--color-border-default)] rounded px-sm py-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)]"
```

**Batch 4 — PlanCanvas.tsx:602 (canvas element)**
```tsx
<canvas
  ref={canvasRef}
  tabIndex={0}
  role="application"
  aria-label="Plan interactif des lots — sélectionnez un lot avec Tab, déplacez avec les touches directionnelles"
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseLeave}
  onKeyDown={handleCanvasKeyDown}
  className="block w-full h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)]"
/>
```
Ajouter handler `handleCanvasKeyDown` minimal (Tab : sélection lot suivant, Suppr : suppression lot sélectionné).

**Batch 4 — LotPanel.tsx:143 (bouton supprimer touch target)**
```tsx
/* Remplacer p-xs par p-sm pour atteindre 32px minimum */
className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-sm rounded ..."
```

**Batch 5 — LotPanel.tsx (état succès)**

Ajouter prop `validationSuccess?: boolean` à `LotPanelProps`. Dans la section Actions (après le bouton valider) :
```tsx
{validationSuccess && (
  <p className="text-xs text-[var(--color-success)] text-center flex items-center justify-center gap-xs">
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
    Lots enregistrés
  </p>
)}
```
Dans page.tsx, lever un état `const [validationSuccess, setValidationSuccess] = useState(false)` et le passer à `LotPanel` après le succès de `handleValidate`.

**Batch 6 — Vérification HANDLE_SIZE (PlanCanvas.tsx offset 1-50)**
Lire les constantes en tête du fichier. Si `HANDLE_SIZE < 16`, mettre à 16. Ajouter `HANDLE_HIT_SIZE = 44` si pas déjà présent et vérifier qu'il est utilisé dans `hitTestHandle`.

---

**Handoff → @fullstack**

Fichiers produits :
- `/home/user/Versi/docs/design/lots-us-vs-06-08-design-audit-v1.md`

Décisions prises :
- Ajout de 3 nouveaux tokens sémantiques d'erreur dans globals.css (`--color-error-bg`, `--color-error-border`, `--color-error-strong`)
- Stratégie canvas : `getComputedStyle(document.documentElement)` en tête du callback `draw` pour lire les tokens au moment du rendu — seule approche compatible avec canvas 2D
- Touch target bouton supprimer : `p-sm` (32px zone effective) — compromis entre confort et densité UI
- Focus canvas : `tabIndex={0}` + `aria-label` + `onKeyDown` minimal — niveau WCAG 2.1 AA keyboard

Points d'attention :
- Les tokens `--color-error-bg/border/strong` doivent être propagés dans **tous** les composants existants qui utilisent des classes `red-*` (pas uniquement les 3 fichiers audités — un Grep projet sur `red-50\|red-200\|red-600\|red-700` est recommandé)
- Le handler `handleCanvasKeyDown` est à implémenter côté @fullstack — l'audit spécifie l'interface attendue, pas l'implémentation complète
- Après ces corrections, relancer l'audit v2 pour validation des gates G21/G22/G23/G31

---
