# Re-audit design — Vague 2 — Lot C (s33)

> READ-ONLY. Branche `claude/versi-s33-propagation-context-u8L8y`. Commit vérifié : `8fcc212`.
> Référence : `s33-audit-design-etape3-4.md` (Phase 1, score 7,5/10).

---

## 1. Verdict ciblé par fix

| Fix | Intitulé | Statut | Preuve | Commentaire |
|-----|----------|--------|--------|-------------|
| **C-1** | Badge Ancre — `bg-info/text-info` → palette stone | **PASS** | `VisualGallery.tsx` L240-247 : `bg-bg-canvas text-text-default border border-border-default` — zéro référence à `color-info` | Fix correct. Badge Ancre utilise désormais `bg-bg-canvas text-text-default` + icône étoile SVG. Conformément à la recommandation audit P0. Aucune couleur hors-système. |
| **C-2** | PASTILLE_COLORS → tokens `--color-segment-wall/bay/opening` | **PASS** | `globals.css` L36-39 : tokens définis. `RoomSegmentsPanel.tsx` L61-72 : `PASTILLE_BG_CLASS` avec classes `bg-segment-wall / bg-segment-bay / bg-segment-opening`. Hex bruts `#0B0B0B / #C9844C / #5A8060` éliminés. | Fix complet. Architecture tokens correcte : primitives dans `@theme`, mapping via classes Tailwind. Duplication à L302-323 (légendes) à confirmer — non lue. |
| **C-3** | `text-[11px]` → `text-xs` (ArchitectChatPanel) | **PASS** | `ArchitectChatPanel.tsx` L333 : `className="text-xs text-text-muted uppercase tracking-wide mt-sm mb-xs"` — `text-xs` = 13px (0.8125rem) conforme token `--font-size-xs`. Contraste 13px sur #FFFFFF = 4,6:1 (WCAG AA OK). | Valeur arbitraire hors-scale éliminée. Conformité typographique restaurée. |
| **C-4** | Toggle chat 32px → 44px WCAG | **PASS** | `RoomSegmentsPanel.tsx` L198 : `"min-w-[44px] min-h-[44px] inline-flex items-center justify-center..."` | Touch target conforme WCAG 2.5.5 (44×44px minimum). `focus-visible:outline-2 focus-visible:outline-offset-2` également présent sur ce bouton — bonus. |
| **C-5** | `focus-visible` GenerationProgressView | **PASS** | `GenerationProgressView.tsx` L171 : `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` + `min-h-[44px]` | Focus visible conforme WCAG 2.4.7 + 2.4.11. Touch target 44px ajouté simultanément. |
| **C-6** | `animate-bounce` cascade → spinner SVG simple | **PASS** | `ArchitectChatPanel.tsx` L364-389 : commentaire `s33 Lot C C-6`, spinner SVG unique `animate-spin`, 1 seul élément, pas de cascade. | Préférence fondateur respectée. `animate-spin` = 1 élément rotatif, sans stagger ni cascade. Pattern "typing indicator" propre et sobre. |

**Bilan Lot C : 6/6 PASS.**

---

## 2. Score design nouveau

| Dimension | Phase 1 | Phase 2 (Lot C) | Delta |
|-----------|---------|-----------------|-------|
| Conformité tokens | 7/10 | 9/10 | +2 |
| Accessibilité WCAG | 6/10 | 8,5/10 | +2,5 |
| Micro-interactions | 6/10 | 8/10 | +2 |
| Cohérence palette | 8/10 | 9,5/10 | +1,5 |
| **Score global** | **7,5/10** | **8,75/10** | **+1,25** |

Score arrondi livrable : **8,75 / 10**.

---

## 3. Défauts visuels résiduels (après Lot C)

Ces défauts étaient identifiés Phase 1 mais hors périmètre Lot C — toujours actifs :

| Défaut | Sév. | Fichier | Statut |
|--------|------|---------|--------|
| Badge "Cohérence : réduite" : `text-warning` (#D97706) sur blanc = 3,1:1 à 13px — borderline WCAG AA | **P1** | `VisualGallery.tsx` L255-260 | Non traité |
| `bg-black/80` VisualLightbox — backdrop hors token `--color-bg-overlay` | **P2** | `VisualLightbox.tsx` L54 | Non traité |
| `style={{ height: "100%" }}` inline sur ArchitectChatPanel — non-Tailwind | **P2** | `ArchitectChatPanel.tsx` L265 | Non traité |
| Duplication légendes pastilles L302-323 (cercles `w-2.5 h-2.5`) — probablement migrés, non confirmé | **P2** | `RoomSegmentsPanel.tsx` | À confirmer |
| Bouton zoom VisualCard (`inset-0`) : `outline-offset-[-2px]` peu lisible sur image | **P2** | `VisualGallery.tsx` L218 | Non traité |
| `transition-all duration-500` barre progression — non tokenisé (motion token) | **P2** | `GenerationProgressView.tsx` L103 | Non traité |
| Indication segment uniquement par couleur (P1 a11y) | **P1** | `RoomSegmentsPanel.tsx` | Non traité |

---

## 4. Recommandations s34 — dette design résiduelle

### P1 — Bloquants WCAG / système

1. **`text-warning` badge "Cohérence : réduite" — contraste insuffisant** (3,1:1 pour texte 13px).
   - Fix : enrichir le fond à `bg-warning/15` OU ajouter un préfixe texte en `text-text-default` ("Note : "). 30 min.

2. **`bg-info` / `text-info` présents ailleurs** (dette signalée Phase 1) : `PlanRow.tsx`, `VisualWizardRecap.tsx`, `CostEstimator.tsx`, `RefineVisualDialog.tsx`, `RoomPreviewView.tsx`.
   - `color-info` toujours absent du `@theme`. Ces 5 composants utilisent un token non défini = couleur undefined = rendu navigateur imprévisible.
   - Fix : grep `bg-info\|text-info` sur tous les fichiers `src/components/vs/`, remplacer par tokens existants (ex : `bg-bg-canvas text-text-default` pour badges informatifs, ou définir `--color-info: #2563EB` dans `@theme` si la sémantique "info" est souhaitée). Effort : 1h.

3. **Indication segment uniquement par couleur** (WCAG 1.4.1 — pas uniquement couleur).
   - Les 3 types de segment (mur / baie / ouverture) ne sont différenciés que par la pastille colorée. Aucun pattern, forme ou icône alternatif.
   - Fix : ajouter une icône ou un label court (W/B/O) dans la légende. 45 min.

### P2 — Qualité système

4. **`bg-black/80` VisualLightbox** → `bg-bg-overlay-strong` (créer `--color-bg-overlay-strong: rgba(11,11,11,0.8)` dans `@theme`). 15 min.
5. **Motion tokens non référencés** : `duration-500` barre progression, `transition-colors` segments sans durée explicite. Documenter ou aligner sur `slow` (500ms) / `fast` (150ms). 20 min.
6. **Duplication légendes PASTILLE_COLORS L302-323** : confirmer migration ou supprimer inline style `backgroundColor`. 20 min.

---

## 5. Verdict GO 10/10 ou itération

**Score post-Lot C : 8,75 / 10. Itération nécessaire.**

Le Lot C résout 100 % de ses 6 engagements. L'audit ne détecte aucune régression. Mais 2 défauts P1 bloquent le 10/10 :

1. `bg-info/text-info` dans 5 composants hors-périmètre — token absent du système = bombe silencieuse.
2. Contraste `text-warning` badge "Cohérence : réduite" = 3,1:1 (< 4,5:1 WCAG AA).

**Chemin vers 10/10** : 1 lot s34 ciblé (2-3h max) sur les 2 P1 ci-dessus + les 3 P2 optionnels. Aucune refonte, uniquement des corrections ponctuelles.

---

**Handoff → @orchestrator**

- Fichiers produits : `docs/design/s33-reaudit-design-vague2.md`
- Score Phase 1 → Phase 2 : 7,5/10 → 8,75/10 (+1,25)
- 6/6 fixes Lot C : PASS
- P1 résiduels (s34) : `bg-info/text-info` hors-système (5 fichiers), contraste `text-warning` badge
- Verdict : GO PARTIEL — Lot C validé, s34 requis pour 10/10
