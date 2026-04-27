# Audit Design Versi Studio — Round 4 (post Round 3 fixes)
Session s27 — 2026-04-27 — Audit code-level, commit 4184acc

---

## 1. Note globale

**Note globale : 8,8 / 10** — Δ +1,4 vs Round 1 (7,4 / 10)

---

## 2. Cinq critères /10

### C1 — Cohérence palette charcoal/stone, tokens unifiés : 9 / 10

CONFIRMÉ. `globals.css` : `--color-success: #15803D` présent sans fallback. Les badges
confiance IA dans LotPanel (L221-227) référencent `var(--color-error)`, `var(--color-warning)`,
`var(--color-success)` via les opacités `/10` — zéro couleur Tailwind brute résiduelle
(`bg-red-100`, `bg-orange-100`, `bg-green-100` supprimés). Les trois P0 de palette (P0.2 token
manquant, P0.3 badges hors système) sont résolus.

Point résiduel mineur : la bannière "Vérifiez la mesure de référence" (lots/page.tsx L892-923)
conserve `border-amber-300 bg-amber-50 text-amber-900` (Tailwind bruts). P1.3 Round 1 non
résolu — le token `var(--color-warning)` n'est pas utilisé ici, contrairement à la bannière de
calibration non-calibrée (L1021) qui, elle, l'utilise correctement. Incohérence interne mineure,
non bloquante.

### C2 — Hiérarchie visuelle Étape 1, CTA, états : 8 / 10

Inchangé depuis Round 1. Aucun fix Round 3 ne touche E1. La hiérarchie DropZone → CTA reste
logique. L'état `disabled` à 50% opacité sur fond calcaire reste théoriquement sous 4,5:1 mais
WCAG exclut les composants disabled — non bloquant. Pas de régression.

### C3 — Canvas Étape 2, toolbar zoom/undo, états : 8,5 / 10

Toolbar zoom/undo (PlanCanvas L1671-1751) : boutons 44x44px, focus-visible 2px offset 2px sur
tous les interactifs, separator vertical `h-6`, `disabled:opacity-30 cursor-not-allowed` sur
undo/redo quand non disponibles — conforme découvrabilité s22 et WCAG 2.2 AA. Undo/redo
permanents dans la toolbar (pattern Figma/Miro), pas conditionnels.

Point résiduel : `LOT_OPACITY = 0.4` sur lots clairs (sable, calcite) toujours potentiellement
sous-visible sur plan clair. Non résolu Round 3 (hors scope). Confirmation impossible sans
screenshot — limitation documentée.

### C4 — États empty/loading/error/success : 9 / 10

États E2 stables. L'état loading (L800-816) utilise le pattern `aside hidden md:block w-64` —
le stepper est masqué mobile en loading également, cohérence avec le rendu principal. La bannière
calibration (L1017-1047) passe sur token `var(--color-warning)`. Saving indicator avec
`aria-live="polite"` présent. Aucune régression sur les états existants.

### C5 — Cohérence cross-étapes, stepper mobile, typo H1 : 8,5 / 10

**P0.1 RÉSOLU.** lots/page.tsx L855 et L803 : `aside className="hidden md:block w-64 flex-shrink-0"` — stepper masqué mobile dans le rendu principal ET dans l'état loading. Pattern identique à E1. Correction vérifiée dans le code.

**P1.2 RÉSOLU.** lots/page.tsx L877 : `<h1 className="vs-h3 text-[var(--color-text-default)]">` — classe sémantique utilisée, aligné avec E1.

Point résiduel : la bannière calibration amber (C1 ci-dessus) crée une micro-incohérence entre
les deux bannières de l'E2 elle-même (amber brut vs token warning). P1 non bloquant.

---

## 3. P0 résiduels

**Aucun P0 résiduel confirmé.**

Les trois P0 du Round 1 sont résolus :
- P0.1 Stepper mobile E2 → RÉSOLU (hidden md:block, code vérifié L803 + L855)
- P0.2 Token --color-success non défini → RÉSOLU (globals.css L47 : #15803D, sans fallback)
- P0.3 Badges confiance hors système → RÉSOLU (LotPanel L221-227 : var(--color-error/warning/success))

**P1 résiduel unique :** bannière "Vérifiez la mesure de référence" (showCalibrationWarning)
utilise `border-amber-300 bg-amber-50 text-amber-900` — remplacer par tokens
`var(--color-warning)` + `/10` bg + `var(--color-text-default)`. Impact visuel mineur,
recommandé avant lancement public.

---

## 4. Verdict

**GO conditionnel** — le produit est déployable. Les 3 P0 bloquants sont résolus. La note passe
de 7,4 à 8,8 / 10.

Condition avant lancement public : corriger la bannière amber residuelle (P1, 10 min de code)
pour atteindre la cohérence palette complète. Sans cette correction : GO accepté pour staging /
beta fermée.

Limitation persistante : aucun screenshot dans `tests/screenshots/` — audit 100% code-level.
Recommandation inchangée : capturer via Playwright sur 375px / 768px / 1280px pour valider
C3 (opacité lots clairs) visuellement avant lancement marketing.

---

*Audit produit par @design — code-level uniquement. Commit 4184acc vérifié.*
