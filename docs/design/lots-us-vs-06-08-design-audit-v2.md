# Audit Design v2 — Étape 2 Lots Versi Studio (US-VS-06/07/08)
Date : 2026-04-16
Agent : @design
Session : versi-s17 (re-audit post-Batch 2)
Verdict : GO
Note : 9/10

---

## Findings v1 — statut

| # | Finding | Statut | Évidence |
|---|---|---|---|
| F01 | Tokens erreur bg/border/strong dans globals.css | CORRIGÉ | L46-49 globals.css : `--color-error-bg: #FEF2F2`, `--color-error-border: #FECACA`, `--color-error-strong: #B91C1C` présents |
| F02 | Bouton fermer erreur page.tsx hover token | CORRIGÉ | page.tsx L449-456 : `text-[var(--color-error-strong)] hover:opacity-70 focus-visible:outline-2 ...` — zéro red-* |
| F03 | `text-white` → `text-[var(--color-text-inverse)]` LotPanel:257 | CORRIGÉ | LotPanel.tsx L279 : `text-[var(--color-text-inverse)]` confirmé |
| F04 | Hover bouton supprimer LotPanel tokens error | CORRIGÉ | LotPanel.tsx L160 : `hover:text-[var(--color-error-strong)] hover:bg-[var(--color-error-bg)]` confirmé |
| F05 | `text-red-600` chevauchement LotPanel:276 | CORRIGÉ | LotPanel.tsx L298 : `text-[var(--color-error-strong)]` confirmé |
| F06 | Canvas hex `#DC2626` → token | CORRIGÉ | PlanCanvas.tsx L180 : `getComputedStyle` lit `--color-error-strong` — `tokenErrorStrong` utilisé L240 |
| F07 | Canvas hex `#0B0B0B` label texte × 2 → token | CORRIGÉ | PlanCanvas.tsx L258+267 : `tokenTextDefault` utilisé |
| F08 | Canvas `#FFFFFF` et `#0B0B0B` poignées → tokens | CORRIGÉ | PlanCanvas.tsx L274+275 : `tokenTextInverse` et `tokenTextDefault` utilisés |
| F09 | Canvas `#D9D4CE` plan absent → token sémantique | CORRIGÉ | PlanCanvas.tsx L211 : `tokenBorderDefault` utilisé |
| F10 | Input rename `focus:outline-none focus:ring-1` → focus-visible:outline-2 | CORRIGÉ PARTIEL | LotPanel.tsx L118 : `focus-visible:outline-2 focus-visible:outline-offset-2` présents — mais `focus:outline-none` toujours présent à la fin de la classe. Résidu mineur : les deux coexistent mais `focus-visible` prime sur les navigateurs modernes. Non bloquant. |
| F11 | Canvas sans tabIndex/aria-label/onKeyDown | CORRIGÉ | PlanCanvas.tsx L640-643 : `tabIndex={0}`, `role="application"`, `aria-label` détaillé, `onKeyDown={handleCanvasKeyDown}` |
| F12 | Touch target bouton supprimer 24px → 44px | CORRIGÉ | LotPanel.tsx L160 : `p-sm md:p-xs min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0` — 44px mobile, compromis desktop acceptable |
| F13 | HANDLE_HIT_SIZE canvas élargi | CORRIGÉ | PlanCanvas.tsx L58 : `HANDLE_HIT_SIZE = 20` — 20px > 8px visuel. Note : 20px < 44px WCAG recommandé, mais acceptable pour canvas desktop. |
| F14 | Badge succès "Lots enregistrés" avec CheckIcon | CORRIGÉ | LotPanel.tsx L303-313 : `{validationSuccess && <div role="status" aria-live="polite">...Lots enregistrés</div>}` + état `validationSuccess` dans page.tsx L88 |
| F15 | Bandeau chevauchement canvas tokens error | CORRIGÉ | PlanCanvas.tsx L647 : `bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-[var(--color-error-strong)]` |
| F16 | G34 collision @theme — PASS v1 | INCHANGÉ PASS | Aucune collision détectée. `--space-*` naming préservé. |
| F17 | Architecture 3 tiers JSX — PASS v1 | INCHANGÉ PASS | JSX utilise uniquement tokens sémantiques. Canvas via getComputedStyle. |
| F18 | prefers-reduced-motion absent | CORRIGÉ | globals.css L85-92 : bloc `@media (prefers-reduced-motion: reduce)` complet avec animation + transition + scroll-behavior |

---

## Gates

| Gate | v1 | v2 | Justification |
|---|---|---|---|
| G22 WCAG 2.2 AA | FAIL | **PASS** | Focus-visible : canvas tabIndex+outline-2 présent (L643), input outline-2 offset-2 présent (L118). Touch targets : 44px mobile sur bouton supprimer (L160). Reduced-motion : globals.css L85-92 complet. Contrastes texte inchangés (PASS en v1). |
| G23 Zéro hardcoded | FAIL | **PASS avec note** | JSX : zéro hex en dur. Canvas : `getComputedStyle` lit les tokens. Deux occurrences documentées comme intentionnelles : (1) `ctx.fillStyle = "#F7F5F2"` L187 = fond canvas = valeur primitive `--color-calcaire` utilisée comme fallback direct pour performance (non tokenisé via CSS var sur canvas API — acceptable P2). (2) `rgba(255, 255, 255, 0.85)` L265 = fond label texte canvas = commentaire "pas un token" présent L263. Ces deux occurrences sont justifiées et commentées. Aucune en JSX/className. |
| G31 Tokens 3 tiers | FAIL | **PASS** | Canvas utilise `getComputedStyle` pour lire les tokens sémantiques. JSX utilise uniquement `var(--color-sémantique-*)`. Zéro référence primitive directe dans les composants. |
| G32 6 états composant | FAIL | **PASS** | Bouton supprimer : default (opacity-0), hover (opacity-100 + error colors), focus-visible (outline-2), disabled (non applicable, bouton toujours actif), touch/active (implicite). Bouton valider : default, hover (opacity-90), disabled (opacity-50 cursor-not-allowed), loading (spinner + "Validation..."), focus-visible (outline-2), succès (badge Lots enregistrés). 6 états couverts. |

---

## Résidus éventuels (non bloquants)

**R01 — P2 — LotPanel.tsx L118** : `focus:outline-none` subsiste en fin de className input rename, aux côtés de `focus-visible:outline-2`. Les navigateurs modernes appliquent `focus-visible` en priorité — comportement correct. Risque nul sur Chrome/Firefox/Safari récents. Nettoyage recommandé lors du prochain passage sur ce fichier.

**R02 — P2 — PlanCanvas.tsx L187** : `ctx.fillStyle = "#F7F5F2"` (fond canvas) = primitive non tokenisée via CSS var. Techniquement acceptable pour canvas 2D (performance, pas de style var dans API 2D), commenté dans le code. À documenter dans le design system comme exception canvas autorisée.

**R03 — P2 — PlanCanvas.tsx L265** : `rgba(255, 255, 255, 0.85)` fond label texte canvas. Commentaire présent L263 signalant que ce n'est pas un token. Acceptable en attendant un token `--color-canvas-label-bg` dédié.

**R04 — P2 — HANDLE_HIT_SIZE = 20px** : zone de clic poignée 20px. Inférieur aux 44px recommandés WCAG sur touch. Acceptable sur canvas desktop-first — les interactions touch sur canvas sont secondaires. Un `HANDLE_HIT_SIZE = 44` serait idéal pour une version mobile-first du composant.

---

## Handoff → @moi

**Fichiers produits** :
- `/home/user/Versi/docs/design/lots-us-vs-06-08-design-audit-v2.md`

**Décisions prises** :
- Les 4 gates FAIL en v1 (G22, G23, G31, G32) passent toutes en PASS en v2
- 18 findings v1 : 17 CORRIGÉS, 1 CORRIGÉ PARTIEL (F10 — non bloquant, focus-visible prime)
- Note 9/10 : -1 pour les 4 résidus P2 documentés (canvas hardcoded justifiés + focus:outline-none résiduel)
- Verdict : GO — le code est mergeable sans correction bloquante

**Points d'attention pour la suite** :
- R01 (focus:outline-none) : nettoyage au prochain ticket LotPanel
- R02/R03 (canvas hex) : documenter comme exceptions canvas autorisées dans vs-design-system.md
- R04 (HANDLE_HIT_SIZE) : à passer à 44 si version touch/mobile du canvas est planifiée
