# Audit UX versi-s21 — Itération 1

## Note globale : 7.4 / 10

## Tableau 5 critères

| # | Critère | Note /10 | Corrections EXACTES |
|---|---|---|---|
| 1 | Pain point persona adressé | 8/10 | [voir détail ci-dessous] |
| 2 | États UI 5 — G21 | 6/10 | [voir détail ci-dessous] |
| 3 | Ergonomie validation 1-clic | 8/10 | [voir détail ci-dessous] |
| 4 | G33 anglicismes | 10/10 | PASS — 0 occurrence |
| 5 | Cohérence visuelle | 7/10 | [voir détail ci-dessous] |

---

## Détail par critère

### Critère 1 — Pain point persona adressé (8/10)

**Ce qui fonctionne :** Le clustering IA élimine bien la page blanche Étape 2. Les lots sont pré-créés avec noms lisibles ("T3 RDC gauche"), badge "IA" visible, et le bouton "Tout valider" en un clic est présent. Le gain 5 min → 10 sec/lot est crédible.

**Friction détectée :** Quand Thomas arrive sur l'Étape 2 juste après l'extraction, **aucun message contextuel ne lui explique que les lots ont été créés par l'IA** et qu'il peut les valider en masse. Le panneau affiche "3 lots" mais pas de signal d'onboarding du type "L'IA a pré-créé 3 lots — vérifiez et validez en un clic". Thomas doit déduire par lui-même le flux à suivre.

**Correction (LotPanel.tsx, ligne 248-252) :** Ajouter une bannière contextuelle dans l'en-tête du panneau si `aiSuggestedLots.length > 0` :
```tsx
{aiSuggestedLots.length > 0 && (
  <p className="text-xs text-[var(--color-text-muted)] mt-2xs">
    L'IA a pré-créé {aiSuggestedLots.length} lot{aiSuggestedLots.length > 1 ? "s" : ""} — vérifiez et validez.
  </p>
)}
```

---

### Critère 2 — États UI 5 — G21 (6/10) — P0 BLOQUANT

**Spec définie :** les 5 états sont documentés dans clustering-ia-spec.md. Implémentation partielle.

| État | Spec | Implémentation | Verdict |
|---|---|---|---|
| Défaut (lots IA visibles) | Badge IA + bordure pointillée + bouton Valider | PASS — LotPanel.tsx ligne 104-110 | PASS |
| Loading (clustering en cours) | "Organisation des lots..." skeleton | PARTIAL — loading de fetchData (lignes 504-520, lots/page.tsx) mais pas de signal "clustering IA en cours" distinct du simple chargement page | FAIL |
| Vide (0 lot, confiance < 0.7) | "L'IA n'a pas détecté de lots fiables — dessinez manuellement" + bouton Dessiner | FAIL — LotPanel.tsx ligne 258-261 affiche "Aucun lot détecté — utilisez le bouton « Ajouter un lot »" sans distinction si l'extraction a eu lieu ou pas | FAIL |
| Erreur (clustering raté) | Toast "Impossible d'organiser les lots" | PARTIAL — extract/route.ts retourne une erreur générique "Impossible de lancer l'extraction." sans distinguer extraction vs clustering | FAIL |
| Succès (lots IA validés) | Badge vert "X lots valides" + bouton Continuer actif | PARTIAL — badge IA + coche verte OK (LotPanel.tsx ligne 166-172), mais pas de message "X lots valides" récapitulatif | PASS partiel |

**Corrections :**

**État Vide** — `LotPanel.tsx`, ligne 258-261 : distinguer 0 lot jamais cherché vs 0 lot post-extraction. Nécessite prop `hasAiExtracted: boolean` passée depuis `lots/page.tsx` :
```tsx
// LotPanel.tsx — état vide conditionnel
{hasAiExtracted ? (
  <p className="text-sm text-[var(--color-text-muted)]">
    L'IA n'a pas détecté de lots fiables — dessinez vos lots manuellement.
  </p>
) : (
  <p className="text-sm text-[var(--color-text-muted)]">
    Aucun lot — utilisez « Ajouter un lot » ou « Dessiner un polygone ».
  </p>
)}
```

**État Loading distinct** — `lots/page.tsx` : le message "Organisation des lots en cours..." (ligne 514) est correct mais s'affiche pour TOUT chargement (initial + re-fetch). Pas de distinction loading "extraction IA en cours" vs "chargement données". Ajouter un état `extracting: boolean` déclenché quand l'utilisateur lance l'extraction depuis l'Étape 1.

**État Erreur extraction** — `extract/route.ts`, ligne 201 : le message `"Impossible de lancer l'extraction."` est trop générique. Distinguer :
- Erreur plan illisible → `"Le plan est illisible — vérifiez la qualité du fichier déposé."`
- Erreur clustering → `"L'organisation automatique a échoué — créez vos lots manuellement."`

---

### Critère 3 — Ergonomie validation 1-clic (8/10)

**Ce qui fonctionne :**
- Bouton "Valider ce lot" par lot IA suggéré (LotPanel.tsx, ligne 181-192) — P0 livré
- Bouton "Tout valider (N lots IA)" global (LotPanel.tsx, ligne 309-323) — P0 livré
- Undo via "Annuler la validation" **non implémenté côté UI** mais la spec US-VS-22 l'exige

**Friction 1 — Undo manquant :** La spec US-VS-22 (critère d'acceptance 3) demande un bouton "Annuler la validation" sur les lots validés IA. `LotPanel.tsx` ne propose pas ce bouton pour `lot.status === "validated"`. Seule la corbeille est disponible, ce qui n'est pas équivalent.

**Correction (LotPanel.tsx, dans LotCard, après le badge IA ligne 174) :**
```tsx
{lot.source === "ai" && lot.status === "validated" && onValidateSingle && (
  <button
    onClick={(e) => { e.stopPropagation(); /* appeler onUnvalidateSingleLot */ }}
    className="mt-xs px-sm py-2xs rounded text-xs text-[var(--color-text-muted)] underline hover:text-[var(--color-text-default)] min-h-[32px]"
    aria-label={`Annuler la validation de ${lot.name}`}
  >
    Annuler
  </button>
)}
```
Nécessite : prop `onUnvalidateSingleLot?: (lotId: string) => void` + handler dans `lots/page.tsx` qui PATCH `status: 'suggested'`.

**Friction 2 — Pas de confirmation avant "Tout valider" :** 6 lots validés en masse sans confirmation est risqué si Thomas a cliqué par accident. Le spec ne l'impose pas, mais 44% des clics accidentels en masse génèrent de la frustration. Recommandé : ConfirmModal ou au moins un message inline "X lots validés" avec lien "Annuler tout".

---

### Critère 4 — G33 anglicismes client-facing (10/10)

Grep exhaustif sur `LotPanel.tsx`, `lots/page.tsx`, `extract/route.ts` :
- Aucune occurrence de `upload`, `uploader`, `uploadé`, `download`, `feedback`, `meeting`, `forwarder` dans les strings UI ou messages API retournés au client.
- Les messages d'erreur de `extract/route.ts` (lignes 48, 59, 75, 201) sont en français.
- **PASS complet G33.**

---

### Critère 5 — Cohérence visuelle (7/10)

**Ce qui fonctionne :**
- Badge "IA" distinct (fond bleu/10, texte bleu — LotPanel.tsx ligne 164-173)
- Bordure `border-dashed` sur lots IA suggérés (ligne 106)
- Bordure pleine verte sur lots IA validés (ligne 107)
- Touch targets : bouton "Valider ce lot" à `min-h-[32px]` — **FAIL mobile**

**P1 — Touch target insuffisant (LotPanel.tsx, ligne 187) :** `min-h-[32px]` pour le bouton "Valider ce lot" est inférieur aux 44px requis (WCAG 2.2 AA, règle 22). Le bouton "Tout valider" (ligne 319) est à `min-h-[44px]` — correct. Appliquer la même valeur au bouton individuel :
```tsx
// Changer min-h-[32px] → min-h-[44px] (LotPanel.tsx ligne 187)
className="mt-xs px-sm py-2xs rounded text-xs font-medium bg-[var(--color-success,#16A34A)]/10 text-[var(--color-success,#16A34A)] hover:bg-[var(--color-success,#16A34A)]/20 transition-colors min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)]"
```

**P1 — Bordure pointillée lot IA "suggéré" masquée quand sélectionné :** `LotPanel.tsx` ligne 104-109 — les classes CSS sont appliquées avec une logique imbriquée non-exclusive. Quand `isSelected === true`, la classe `border border-[var(--color-border-default)]` (ligne 108) écrase la bordure pointillée bleue du lot IA suggéré. Le statut IA n'est plus visible à la sélection.

**Correction (LotPanel.tsx, ligne 104-109) :** prioritiser la bordure IA sur la sélection :
```tsx
className={`
  group flex items-start gap-sm p-md rounded-md cursor-pointer transition-colors duration-150
  ${lot.source === "ai" && lot.status === "suggested"
    ? "border border-dashed border-[var(--color-interactive-primary)]/40 bg-[var(--color-interactive-primary)]/5"
    : lot.source === "ai" && lot.status === "validated"
    ? "border border-solid border-[var(--color-success,#16A34A)]/40"
    : isSelected
    ? "bg-[var(--color-background-default)] border border-[var(--color-border-default)]"
    : "hover:bg-[var(--color-background-default)]"}
`}
```

---

## P0 bloquants

- **G21 FAIL — État vide non différencié** : `LotPanel.tsx` ligne 258-261 — le message "Aucun lot détecté" ne distingue pas le cas "extraction IA sans résultat (confiance < 0.7)" du cas "pas encore de lots créés". Thomas ne sait pas si l'IA a essayé et échoué ou s'il doit juste ajouter manuellement. Correction : prop `hasAiExtracted` + message conditionnel (voir critère 2).
- **Undo manquant (US-VS-22)** : bouton "Annuler la validation" absent pour lots IA validés (`LotPanel.tsx` — aucune occurrence). C'est un critère d'acceptance P0 de la spec.

## P1 recommandés

- Bannière contextuelle "L'IA a pré-créé N lots" dans l'en-tête panneau à l'arrivée sur l'étape (LotPanel.tsx)
- Touch target `min-h-[32px]` → `min-h-[44px]` sur bouton "Valider ce lot" (LotPanel.tsx ligne 187)
- Bordure IA suggérée masquée à la sélection — correction priorité CSS (LotPanel.tsx lignes 104-109)
- Confirmation optionnelle avant "Tout valider" si N ≥ 4 lots
- Distinguer erreur extraction vs erreur clustering dans `extract/route.ts` (messages différents retournés au client)

---

## Verdict : ITÉRATION 2

Note globale 7.4/10 — 2 P0 bloquants (G21 état vide + undo US-VS-22). Seuil GO = 9.5/10 + 0 P0.

---

## Handoff
→ @orchestrator (consolidation bundle versi-s21)
- Fichiers audités : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`, `versi-studio/src/components/vs/LotPanel.tsx`, `versi-studio/src/app/api/vs/projects/[id]/extract/route.ts`
- P0 bloquants : 2 (G21 état vide + undo US-VS-22 absent)
- P1 : 5 corrections recommandées
- Corrections exactes fournies ci-dessus pour chaque P0 et P1 — prêtes à coder par @fullstack
