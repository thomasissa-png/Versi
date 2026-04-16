# Audit Design — Étape 4 Visuels Versi Studio (US-VS-19/20/21/22) — v1
Session versi-s19 | Branche `claude/versi-s19-visuels-autopilot-K7mQr` | 2026-04-16

## Périmètre audité

- `versi-studio/src/app/vs/projects/[id]/visuals/page.tsx`
- `versi-studio/src/components/vs/StyleGrid.tsx`
- `versi-studio/src/components/vs/VisualRoom.tsx`
- `versi-studio/src/components/vs/VisualResult.tsx`
- `versi-studio/src/components/vs/ChatAgent.tsx`
- `versi-studio/src/app/globals.css` (G34)

Spec source : `docs/product/vs-functional-specs.md` §6 L877-1180 (US-VS-19/20/21/22)
Référence canonique DNA : Étape 3 Pièces (design 9,3/10 versi-s18)
Exceptions canvas : `docs/design/vs-design-system.md` §2.4 (R02/R03/R04) — lues, appliquées.

---

## 1. Synthèse exécutive

**Note globale : 7,6 / 10**
**Verdict : GO CONDITIONNEL** (< 8,0 — 3 corrections P0/P1 bloquantes à appliquer)

L'Étape 4 Visuels est structurellement saine. Les tokens sémantiques sont massivement utilisés, le `prefers-reduced-motion` est couvert, les 6 états des composants principaux sont présents dans l'ensemble. La base est nettement meilleure que l'Étape 3 Pièces en v1 (7,2/10).

Trois points bloquent le GO ABSOLU :

1. **G23 P0** : deux occurrences de primitives `gris-chaud` utilisées directement en JSX (`bg-gris-chaud/20`) dans `VisualResult.tsx` — violation du contrat token 3 tiers. Pas couvert par R02/R03/R04 (ce n'est pas du canvas 2D).
2. **G32 P1** : état `:active` systématiquement absent sur tous les boutons d'action de `VisualResult.tsx` (Valider, Modifier, Essayer un autre style, Réessayer) — même défaut de pattern que l'Étape 3 avant corrections.
3. **G22 P1** : le bouton d'envoi du `ChatAgent` n'a pas de `focus-visible` explicite (seule une `focus:border` est définie sur la textarea, mais le bouton submit est icône seule sans label visible — `aria-label="Envoyer"` est là mais le focus ring est absent).

Aucune violation G34 détectée. `globals.css` utilise `--space-*`, `--radius-*` sans collision builtin Tailwind — learning versi-s15 appliqué correctement.

---

## 2. 5 dimensions notées

### Dimension 1 — Architecture tokens 3 tiers G31 — 8/10

Très bon niveau global. Les composants Étape 4 utilisent massivement les tokens sémantiques : `bg-bg-card`, `bg-bg-default`, `text-text-default`, `text-text-muted`, `text-text-inverse`, `border-border-default`, `bg-interactive-primary`, `bg-interactive-hover`, `text-error`, `text-success`, `text-warning`. Le pattern appris en Étape 2/3 est intégré.

**Findings :**

- **P0 — `VisualResult.tsx:191` et `:312`** : `bg-gris-chaud/20` — référence directe à la primitive `gris-chaud` (tier 1) au lieu du token sémantique. Ces lignes rendent le fond des placeholders image (état "pas de visuel" et historique). Token à utiliser : `bg-bg-subtle` (ou `bg-border-default/30`). Pattern à remplacer :
  ```
  // Ligne 191 — placeholder image principale
  "w-full h-64 bg-gris-chaud/20 flex items-center justify-center"
  → "w-full h-64 bg-bg-subtle flex items-center justify-center"

  // Ligne 312 — placeholder historique thumbnail
  "w-full h-16 bg-gris-chaud/20 flex items-center justify-center"
  → "w-full h-16 bg-bg-subtle flex items-center justify-center"
  ```
  Note : `--color-bg-subtle` est défini dans `globals.css` via `--color-bg-canvas: #F0EDE8` — si `bg-subtle` n'est pas mappé, utiliser `bg-bg-canvas` (même valeur sémantique, fond secondaire).

- **P2 — `StyleGrid.tsx:43`** : `border-gris-pierre` en hover state — référence primitive directe (tier 1). Token sémantique à utiliser : `hover:border-border-strong` (token fort) ou `hover:border-interactive-primary` (cohérence avec l'état sélectionné). Mineur car c'est un état hover, mais rompt le contrat 3 tiers.
  ```
  // StyleGrid.tsx:44-46
  "border border-border-default bg-bg-card hover:border-gris-pierre hover:shadow-sm"
  → "border border-border-default bg-bg-card hover:border-interactive-primary hover:shadow-sm"
  ```

- **P2 — `VisualRoom.tsx:532`** : `hover:border-gris-pierre` identique — même primitive en hover sur la drop zone upload.
  ```
  // VisualRoom.tsx:532
  "cursor-pointer hover:border-gris-pierre transition-colors duration-200"
  → "cursor-pointer hover:border-interactive-primary transition-colors duration-200"
  ```

### Dimension 2 — 6 états composants G32 — 7/10

Les états default, hover, disabled, loading sont bien couverts sur la majorité des composants. Le focus-visible est présent sur les boutons primaires de la page (`page.tsx:275`). L'état `:active` est systématiquement absent — même défaut que l'Étape 3 avant corrections Batch 2.

**Findings :**

- **P1 — VisualResult.tsx — boutons d'action** : état `:active` absent sur les 4 boutons principaux (Valider ce visuel L222, Modifier L234, Essayer un autre style L241, Réessayer L145). Pattern canonique attendu : ajouter `active:opacity-80` sur chaque.
  ```
  // Exemple bouton "Valider ce visuel" (VisualResult.tsx:222-230)
  className="flex-1 px-lg py-sm rounded-md text-sm font-medium
    bg-interactive-primary text-text-inverse
    hover:bg-interactive-hover transition-colors duration-200
    disabled:opacity-50 disabled:cursor-not-allowed"
  → ajouter : "active:opacity-80"
  // Appliquer idem sur les 3 autres boutons d'action
  ```

- **P1 — ChatAgent.tsx:219-243 — bouton submit** : état `focus-visible` absent. Le bouton icône d'envoi n'a ni `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` ni `:active`. Thomas peut naviguer au clavier dans le chat — le focus ring doit être visible.
  ```
  // ChatAgent.tsx:222-229
  className="self-end px-md py-sm rounded-md text-sm font-medium
    bg-interactive-primary text-text-inverse
    hover:bg-interactive-hover transition-colors duration-200
    disabled:opacity-50 disabled:cursor-not-allowed"
  → ajouter : "active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
  ```

- **P1 — ChatAgent.tsx:184-210 — textarea input** : `focus:outline-none focus:border-interactive-primary` est défini — c'est `focus:` non `focus-visible:`. Sur navigateur desktop (Thomas), `:focus` et `:focus-visible` sont généralement équivalents, mais le pattern canonique du DS préfère `focus-visible`. Mineur dans l'usage interne mais incohérent avec le pattern du projet.
  ```
  "focus:outline-none focus:border-interactive-primary"
  → "focus:outline-none focus-visible:border-interactive-primary focus-visible:ring-0"
  ```

- **P2 — StyleGrid.tsx — boutons style** : état `:active` absent. Les boutons de sélection de style sont interactifs, Thomas clique dessus. Ajouter `active:opacity-80`.

- **P2 — VisualResult.tsx:295-335 — historique thumbnails** : boutons de l'historique sans `:active` et sans `focus-visible` explicite.

### Dimension 3 — WCAG AA G22 — 8/10

**prefers-reduced-motion** : PASS. `globals.css:88-95` couvre toutes animations/transitions avec `0.01ms`. Point de vigilance : `VisualResult.tsx:103` — la barre de progression utilise `transition-all duration-1000` qui sera neutralisée par le media query global. La progression sera invisible pour les utilisateurs avec reduced-motion. À considérer comme comportement acceptable (la progression reste fonctionnelle via le timer textuel `{elapsed}s écoulées`).

**focus-visible** : PASS partiel. `page.tsx:275` (bouton Réessayer) porte le pattern complet `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary`. Les boutons `VisualRoom.tsx:617-627` (bouton Créer le visuel) ont `disabled` mais pas de `focus-visible` explicite. Les boutons `VisualResult.tsx` n'ont pas de `focus-visible` — finding P1 relevé en dimension 2.

**Contrastes** : PASS (combinaisons identiques à Étape 3 validée). `text-text-default` (#0B0B0B) sur `bg-bg-card` (#FFFFFF) = ~21:1. `text-text-muted` (#6B6560) sur `bg-bg-default` (#F7F5F2) = ~5.5:1. `text-success` (#15803D) sur `bg-success/10` ≈ 5.0:1 conforme 4.5:1. `text-error` (#B91C1C) sur blanc ≈ 5.8:1 conforme.

**Touch targets** : PASS sur les boutons principaux. `page.tsx:275` `min-h-[44px]` — conforme. `VisualRoom.tsx:617` `px-xl py-md` = 16px padding vertical + font ≈ 46px — conforme. `ChatAgent.tsx:219` `self-end px-md py-sm` — `py-sm` = 8px padding vertical + font 14px ≈ 30px. **P1** — bouton submit ChatAgent sous le seuil 44px mobile. Corriger en `min-h-[44px]`.

**Animate-bounce ChatAgent** : `ChatAgent.tsx:172-174` — dots de traitement `animate-bounce`. Neutralisé par `globals.css prefers-reduced-motion` global — PASS.

**Finding P1 — touch target bouton submit ChatAgent** :
```
// ChatAgent.tsx:219-229
className="self-end px-md py-sm rounded-md..."
→ ajouter "min-h-[44px]"
```

### Dimension 4 — Hardcoded G23 (avec exceptions R02/R03/R04) — 8/10

Aucune hex ou rgb hardcodée en JSX hors exceptions documentées. Les exceptions R02/R03/R04 concernent `RoomCanvas.tsx` et `styles.ts` qui sont hors périmètre de cet audit (Étape 3 Pièces).

**Findings :**

- **P0 — `VisualResult.tsx:191` et `:312`** : `bg-gris-chaud/20` (déjà signalé G31). C'est une primitive token utilisée directement comme classe Tailwind — constitue aussi une violation G23. `gris-chaud` est le token primitif tier 1 (`#D9D4CE`). Pas une exception canvas (composant JSX standard, pas de Canvas 2D API).

- **P0 — `VisualResult.tsx:330`** : `text-[10px]` — valeur de font-size arbitraire hardcodée hors scale typographique. Le DS définit `--font-size-xs: 0.8125rem` (13px) comme minimum. 10px est sous le minimum et hors scale.
  ```
  "text-[10px] text-text-muted truncate"
  → "text-xs text-text-muted truncate"
  // (text-xs = 13px dans le DS Versi Studio, conforme minimum)
  ```

- **P0 — `ChatAgent.tsx:152` et `:213`** : `text-[10px]` — identique. Timestamp des messages et compteur caractères.
  ```
  // ChatAgent.tsx:152 — timestamp
  "text-[10px] mt-2xs"
  → "text-xs mt-2xs"  (13px)

  // ChatAgent.tsx:213 — compteur chars
  "absolute bottom-sm right-sm text-[10px]"
  → "absolute bottom-sm right-sm text-xs"
  ```

- **P1 — `VisualRoom.tsx:591`** : `tracking-widest` — classe Tailwind builtin (letter-spacing arbitraire hors scale DS). À vérifier si le DS définit un token letter-spacing ou si Tailwind builtin est acceptable ici. Dans le DS, les labels utilisent `tracking` custom via `text-label`. En l'absence d'un token `--tracking-wide` dans le `@theme`, `tracking-widest` est acceptable comme classe builtin Tailwind (pas une valeur hardcodée). **P2 non bloquant.**

**Aucun hex RGB hardcodé en JSX** (hors primitives-as-classes listées ci-dessus). Vérification : aucune occurrence de `#`, `rgb(`, `rgba(` en dehors des fichiers canvas Étape 3.

### Dimension 5 — Cohérence DNA Étape 2/3 + sobriété pro — 7/10

L'esprit minéral Versi est présent. La palette calcaire/noir/gris-pierre, la typographie PP Neue Montreal uppercase pour les labels, les icônes Heroicons strokeWidth minimal — cohérent avec Étape 2 et 3.

**Findings :**

- **P1 — Bouton "Créer le visuel" manque `focus-visible`** (`VisualRoom.tsx:617-627`) : bouton primaire sans `focus-visible:outline-2 focus-visible:outline-offset-2`. DNA Étape 3 validée avec ce pattern sur tous les boutons primaires.

- **P1 — "Finaliser le projet" utilise `text-white`** (`page.tsx:411`) : `bg-success text-white` — `text-white` est une primitive Tailwind, pas `text-text-inverse`. Incohérence avec le token sémantique. À remplacer par `text-text-inverse`.
  ```
  // page.tsx:411
  "bg-success text-white hover:bg-success/90"
  → "bg-success text-text-inverse hover:bg-success/90"
  ```

- **P1 — Grille de styles sans preview** : `StyleGrid.tsx` v1 sans preview image — acceptable pour V1 (documenté dans le composant), mais les 12 cartes sont des icônes maison générique identiques. Thomas ne peut pas différencier "Scandinave" de "Japandi" visuellement. Risque d'erreur métier (mauvais style sélectionné). Recommandation Batch 2 : ajouter une couleur d'accentuation par style (`bgColor` dans `STYLES`) ou une image de référence minuscule. **P1 fonctionnel, pas bloquant design.**

- **P2 — ChatAgent header : aria-label bouton fermer manque `:active`** — pattern identique aux autres boutons.

- **P2 — Animation bounce `ChatAgent.tsx:172-174`** : les dots de traitement `animate-bounce` avec stagger (`animationDelay: "0ms"`, `"150ms"`, `"300ms"`) utilisent des `style={}` inline pour les délais — pas un token motion. Acceptable pour V1 mais à noter.

- **P2 — Scroll horizontal historique sans scrollbar visible** (`VisualResult.tsx:288`) : `overflow-x-auto pb-sm` — le paddingBottom réservé au scrollbar est fonctionnel mais la scrollbar peut être invisible sur macOS (scrollbar auto-hide). Ajouter `scrollbar-thin` ou une indication visuelle de scroll. Mineur outil interne.

---

## 3. Findings consolidés

[SECTION — rempli ci-dessous]

---

## 4. Gates

[SECTION — rempli ci-dessous]

---

## 5. Handoff

[SECTION — rempli ci-dessous]
