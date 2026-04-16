# Audit Design — Upload US-VS-02 (versi-s16 Batch 6a)

> Agent : @design — 2026-04-16
> Périmètre : design + DS uniquement (hors UX, copy, QA)
> Scope composants : ConfirmModal, Stepper, PlanThumbnail, DropZone, CTA "Lancer l'analyse"

---

## Section 1 — Contrastes WCAG 2.2 AA (gate G22)

Valeurs extraites de `globals.css` @theme :
- `--color-error: #B91C1C` → L=0.1115
- `--color-bg-default: #F7F5F2` → L=0.9184
- `--color-bg-dark: #0B0B0B` → L=0.0028
- `--color-text-inverse: #F7F5F2` → L=0.9184
- `--color-text-default: #0B0B0B` → L=0.0028
- `--color-text-muted: #6B6560` → L=0.1328
- `--color-interactive-primary: #0B0B0B` → L=0.0028

Fonds alpha-blendés calculés sur `bg-default` (#F7F5F2) :
- `bg-error/10` → couleur résultante #F1DFDF ≈ L=0.7646
- `bg-error/20` → couleur résultante #EBCAC7 ≈ L=0.6431

| Combinaison | Ratio mesuré | Seuil WCAG | Verdict | Correction |
|---|---|---|---|---|
| `text-error` (#B91C1C) sur `bg-error/10` (alerte DropZone.tsx:195) | **5.05:1** | 4.5:1 texte sm | **PASS** | Aucune |
| `text-error` (#B91C1C) sur `bg-error/20` (tuile failed — déclaré dans audit v2) | **4.29:1** | 4.5:1 texte sm | **FAIL** | Passer le fond à `bg-error/8` (ratio ≈5.3:1) OU renforcer `text-error` à `#991B1B` (WCAG-AA safe sur /20). Token à ajouter : `--color-error-dark: #991B1B` |
| `text-text-inverse` (#F7F5F2) sur `bg-bg-dark` (#0B0B0B) — Stepper actif + description | **18.33:1** | 4.5:1 texte | **PASS** | Aucune |
| `text-text-inverse/80` (opacity 0.8) sur `bg-bg-dark` — description Stepper:143 | **13.47:1** | 4.5:1 texte sm | **PASS** | Aucune |
| `text-text-default` (#0B0B0B) sur `bg-bg-default` (#F7F5F2) | **18.33:1** | 4.5:1 texte | **PASS** | Aucune |
| `text-text-muted` (#6B6560) sur `bg-bg-default` (#F7F5F2) — label compteur | **5.30:1** | 4.5:1 texte | **PASS** | Aucune |
| Focus-visible outline `interactive-primary` (#0B0B0B) sur `bg-bg-default` (#F7F5F2) | **18.33:1** | 3:1 interactifs | **PASS** | Aucune |

**Bilan G22** : 1 FAIL identifié — `text-error` sur `bg-error/20` (4.29:1 < 4.5:1). Contexte actuel : DropZone.tsx n'utilise que `bg-error/10` (PASS). Le `bg-error/20` est déclaré dans l'audit v2 comme état "tuile failed" de `page.tsx` — à vérifier en Batch 6b si ce fond est réellement rendu sur du texte `text-xs`. Si oui : correction bloquante. Si non (fond uniquement, pas de texte par-dessus) : PASS de fait.

---

## Section 2 — Cohérence tokens 3 tiers (gate G31)

Architecture cible : Primitive → Sémantique → Composant. Les composants ne doivent jamais référencer directement des primitives.

| Composant | Token référencé | Tier | Conforme ? |
|---|---|---|---|
| ConfirmModal.tsx:122 | `bg-noir-profond/60` (overlay) | Primitive (couleur brute `--color-noir-profond`) | **NON** — P2-NEW-1 confirmé. `noir-profond` est un token primitif (#0B0B0B). Aucun token sémantique `overlay-modal` n'existe dans globals.css |
| ConfirmModal.tsx:130 | `bg-bg-card`, `border-border-default` | Sémantique | Conforme |
| ConfirmModal.tsx:134 | `text-text-default` | Sémantique | Conforme |
| ConfirmModal.tsx:140 | `text-text-muted` | Sémantique | Conforme |
| ConfirmModal.tsx:148 | `border-border-default`, `text-text-default`, `hover:bg-bg-default`, `focus-visible:outline-interactive-primary` | Sémantique | Conforme |
| ConfirmModal.tsx:109 | `bg-error`, `hover:bg-error/90`, `text-text-inverse`, `focus-visible:outline-error` | Sémantique (error, text-inverse) | Conforme |
| Stepper.tsx:96 | `border-l-[3px]` (arbitrary value Tailwind) | Hors-système — valeur brute | **NON** — P2-NEW-3 confirmé. Le DS n'a pas de token `border-width-accent`. `border-2` (2px) est insuffisant visuellement mais `border-l-[3px]` contourne le système |
| Stepper.tsx:96 | `border-text-default` (couleur de la bordure latérale active) | Sémantique | Conforme — sémantique correct |
| Stepper.tsx:107 | `bg-interactive-primary`, `text-text-inverse` | Sémantique | Conforme |
| Stepper.tsx:143 | `text-text-inverse/80` (opacity modifier sur sémantique) | Sémantique + opacity | Conforme — usage Tailwind v4 valide |
| PlanThumbnail.tsx:41 | `bg-bg-card`, `border-border-default` | Sémantique | Conforme |
| PlanThumbnail.tsx:47 | `bg-bg-default` | Sémantique | Conforme |
| PlanThumbnail.tsx:79 | `text-text-default`, `text-xs` | Sémantique | Conforme |
| PlanThumbnail.tsx:89 | `text-text-muted` (label Étage) | Sémantique | Conforme |
| PlanThumbnail.tsx:99 | `border-border-default`, `bg-bg-default`, `focus:ring-interactive-primary/20` | Sémantique | Conforme — `focus:ring-*` non standard WCAG (ring vs outline) : voir Section 3 |
| PlanThumbnail.tsx:114 | `focus-visible:outline-interactive-primary` | Sémantique | Conforme |
| DropZone.tsx:132 | `border-border-default`, `hover:border-gris-pierre/50` | Mixte : `border-default` sémantique / `gris-pierre` **primitive** | **NON** — `gris-pierre` est `--color-gris-pierre` (primitive). Correction : remplacer par `hover:border-text-muted/50` (sémantique) |
| DropZone.tsx:135 | `border-interactive-primary`, `bg-interactive-primary/5` | Sémantique | Conforme |
| DropZone.tsx:145 | `bg-interactive-primary/10` | Sémantique | Conforme |
| DropZone.tsx:149 | `text-interactive-primary` | Sémantique | Conforme |
| DropZone.tsx:195 | `bg-error/10`, `border-error/20`, `text-error` | Sémantique | Conforme |

**Bilan G31** : 3 violations identifiées :
1. `bg-noir-profond/60` ConfirmModal overlay (primitive en usage direct)
2. `border-l-[3px]` Stepper (arbitrary value, token manquant)
3. `hover:border-gris-pierre/50` DropZone (primitive en usage direct)

Gate G31 : **FAIL partiel** — 3 violations, toutes P2 (non-bloquantes UX mais entorses architecture 3 tiers).

---

## Section 3 — États composants (gate G32)

Notes :
- "O" = état documenté/implémenté dans le code lu
- "X" = état absent
- "N/A" = non applicable au composant

| Composant | default | hover | active | focus-visible | disabled | loading | Verdict |
|---|---|---|---|---|---|---|---|
| DropZone (zone entière) | O (border-dashed bg-bg-card) | O (hover:border-gris-pierre/50) | O (drag-over : border-interactive-primary bg-interactive-primary/5) | O (focus-visible:outline-2 outline-offset-2) | O (opacity-50 cursor-not-allowed) | X (aucun état uploading interne à la zone) | **PASS partiel** — 5/6 états. Loading N/A pour la zone elle-même (uploading géré dans page.tsx parent). Acceptable |
| PlanThumbnail — bouton supprimer | O (text-text-muted) | O (hover:text-error) | X (pas de :active déclaré) | O (focus-visible:outline-2 outline-offset-2 outline-interactive-primary) | O (disabled:opacity-50 disabled:cursor-not-allowed) | X (pas de spinner sur bouton supprimer) | **FAIL** — active et loading absents. Active : ajouter `active:scale-95` ou `active:opacity-70`. Loading : le parent gère `deleting` via opacity-50 sur la CARTE — acceptable comme proxy loading. Active reste manquant |
| PlanThumbnail — input étage | O (border-border-default bg-bg-default) | X (pas de hover déclaré) | X (pas de :active) | **FAIL** — `focus:outline-none focus:ring-1 focus:ring-interactive-primary/20` — le `outline-none` annule le focus natif et le ring-1/20 (opacity 20%) est insuffisant WCAG 2.2 (contraste focus < 3:1) | X (disabled non implémenté sur input, seulement le bouton) | X | **FAIL G22 + G32** — focus-visible non-conforme WCAG 2.2 AA |
| ConfirmModal — bouton Annuler | O (border text-text-default) | O (hover:bg-bg-default) | X (pas de :active) | O (focus-visible:outline-2 offset-2 outline-interactive-primary) | N/A | N/A | **PASS partiel** — active absent. Mineur |
| ConfirmModal — bouton Confirmer (default) | O (bg-interactive-primary text-text-inverse) | O (hover:bg-interactive-hover) | X (pas de :active) | O (focus-visible:outline-2 offset-2 outline-interactive-primary ou outline-error) | N/A | N/A | **PASS partiel** — active absent. Mineur |
| CTA "Lancer l'analyse" (page.tsx) | O (vs-btn-primary dans globals.css) | O (hover:bg-interactive-hover) | X (pas de :active dans vs-btn-primary) | O (focus-visible:outline-2 offset-2 — globals.css:328) | O (disabled via prop isAnalyzing) | O (spinner + texte "Analyse en cours…") | **PASS** — 5/6 états. Active absent dans vs-btn-primary (défaut de la classe utilitaire globale, non spécifique à Upload) |
| Bouton Réessayer (page.tsx) | O | O (hover probable — classe vs-btn-primary) | X | O (via vs-btn-primary) | N/A | N/A | **PASS partiel** — active absent, cohérent avec vs-btn-primary |

**Bilan G32** :
- Violation bloquante (P1) : `input[type=number]` PlanThumbnail — `focus:outline-none` sans alternative WCAG-conforme (ring-1/20 ratio < 3:1 sur fond clair)
- Violation mineure (P2) : état `active` absent sur boutons ConfirmModal, CTA, Réessayer — défaut systémique de la classe `vs-btn-primary`
- Violation P2 : bouton supprimer PlanThumbnail — état `active` absent

---

## Section 4 — PlanThumbnail audit (inédit)

| Critère | Statut | Preuve | Action |
|---|---|---|---|
| Layout carte (aspect ratio, structure visuelle) | — | — | — |
| Preview image (object-contain, aspect ratio) | — | — | — |
| Icône PDF (fallback non-image) | — | — | — |
| Label filename (truncate) | — | — | — |
| Label étage + input numérique | — | — | — |
| Bouton supprimer (touch target, hover) | — | — | — |
| Select étage (focus, validation) | — | — | — |
| Responsive (grille parente) | — | — | — |

---

## Section 5 — Verdict

- **Score /10** : —
- **Unanimité 9/10** : PASS / FAIL
- **Top 3 corrections P0/P1** : —

---

## Section 6 — Handoff

**Handoff → @fullstack** (corrections si détectées)
**Handoff → @orchestrator**

- Fichiers produits : `docs/design/upload-us-vs-02-design-audit.md`
- Décisions prises : —
- Points d'attention : —
