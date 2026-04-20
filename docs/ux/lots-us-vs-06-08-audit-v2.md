# Audit UX v2 — Étape 2 Lots (US-VS-06/07/08)
Date : 2026-04-16
Verdict : GO
Note : 8.5/10

## Findings v1 — statut

| # | Finding | Statut | Évidence |
|---|---|---|---|
| F01 | Bouton Réessayer (P0) | PASS | page.tsx:L448 — `onClick={() => { setError(null); fetchData(); }}` + bouton `×` séparé L454 |
| F02 | Rollback fetchData sur erreur saveLotZone (P0) | PASS | page.tsx:L197–201 — `fetchData()` appelé en catch ET en cas `!json.success`. Message "Modifications non enregistrées. Rechargez la page pour reprendre depuis la dernière version sauvegardée." |
| F03 | Responsive `flex flex-col md:flex-row` (P0) | PASS | page.tsx:L520 — `flex-1 flex flex-col md:flex-row gap-0 min-h-[500px]` |
| F04 | Icône stylo hover/focus dans LotCard (P0) | PASS | LotPanel.tsx:L133–141 — bouton stylo `opacity-0 group-hover:opacity-100 focus-visible:opacity-100`, `onClick` → `setEditing(true)`. Double-clic conservé L124 |
| F05 | Surface m² temps réel pendant drag (P1) | FAIL | PlanCanvas.tsx — aucun overlay texte surface calculée dans `draw()`. La surface est affichée dans LotPanel depuis `lot.surface_m2` (BDD), pas calculée localement pendant le drag |
| F06 | State `saving` + indicateur "Sauvegarde en cours..." (P1) | PASS | page.tsx:L86 state `saving`, L189 `setSaving(true)`, L204 `setSaving(false)`. Rendu L480–485 avec spinner animé et texte "Sauvegarde en cours…" |
| F07 | aria-live polite changement étage (P1) | PASS | page.tsx:L477–479 — `<div aria-live="polite" className="sr-only">` avec annonce étage + nombre de lots |
| F08 | Canvas tabIndex=0 + role="application" + aria-label + onKeyDown (P1) | PASS | PlanCanvas.tsx:L640–643 — `tabIndex={0}`, `role="application"`, `aria-label` complet, `onKeyDown={handleCanvasKeyDown}` L639. Handler L607–624 (flèches + Shift×5) |
| F09 | Bouton "Ajouter un lot" inline dans empty state (P1) | PASS | LotPanel.tsx:L214–222 — bouton dashed directement dans le bloc `lots.length === 0`, avec icône + label "Ajouter un lot" |
| F10 | Stroke rouge chevauchement via tokens (P2) | PASS | PlanCanvas.tsx:L239–240 — `borderColor = tokenErrorStrong` (lu depuis `--color-error-strong` L180). Appliqué à `overlappingIds.has(lot.id)` L224 |
| F11 | Fusion lots non traitée — hors scope s17 (P2) | N/A | Hors scope confirmé — aucune régression détectée |

## Gates

| Gate | v1 | v2 | Justification |
|---|---|---|---|
| G21 5 états UI | FAIL | PASS | F01 corrigé : bouton Réessayer présent L448. F09 corrigé : CTA inline dans empty state. Les 5 états sont couverts : défaut (L521–546), loading (L368–383), vide (LotPanel L209–223 avec CTA), erreur (L429–475 avec Réessayer + ×), succès (L303–314 + redirect L343) |
| G33 Zéro anglicisme | PASS | PASS | Grep confirmé : aucun `upload/download/feedback/meeting/forwarder` dans les 3 fichiers |

## Résidus éventuels

- **F05 FAIL (P1 résiduel)** : la surface m² en temps réel pendant le drag n'est pas implémentée dans `PlanCanvas.tsx`. La fonction `draw()` dessine les labels de nom (L258–268) mais aucun overlay calculant `width_percent × height_percent` sur le rectangle actif. `lot.surface_m2` vient de la BDD et n'est pas interpolé localement. Correction restante : dans `draw()`, pour le lot dont `lot.id === selectedLotId` et pendant `dragRef.current !== null`, afficher en overlay `~${(zone.width_percent * zone.height_percent / 100).toFixed(0)} m²` sous le label nom. Note : valeur approximative (ratio plan non calibré) — mentionner le tilde ou "~" pour éviter une promesse de précision.
- **Micro-friction mobile non résolue** : le drawer fixe bas sur mobile (40vh) décrit dans F03 du v1 n'est pas implémenté — le LotPanel reste en colonne `flex-col md:flex-row` mais sans `position: fixed; bottom: 0; height: 40vh` sur mobile. Sur viewport 375px, LotPanel s'empile sous le canvas mais occupe toute la hauteur restante, sans comportement drawer. Impact : UX mobile dégradée mais pas bloquante pour un outil interne (Thomas travaille principalement sur desktop). Non bloquant, P2.
- **Tab cycling entre lots (canvas)** : l'aria-label mentionne "Tab pour cycler entre les lots" (PlanCanvas.tsx:L642) mais le handler `handleCanvasKeyDown` ne gère que les flèches (L616–619), pas la touche Tab. Légère incohérence documentation/implémentation. P2, non bloquant.

## Handoff → @moi

- **Verdict** : GO — G21 PASS, G33 PASS, aucun gate bloquant en échec
- **Note** : 8.5/10 (v1 : 6.5/10 — progression de +2 points)
- **Bloquants restants** : aucun gate BLOQUANT en FAIL
- **Résidus P1** : F05 (surface temps réel pendant drag) non implémenté — à traiter en Batch 3 si priorisé
- **Résidus P2** : drawer mobile non implémenté, Tab cycling canvas non fonctionnel malgré aria-label
- **Recommandation** : les 4 P0 et 4 P1 sur 5 sont corrigés. La feature est validable pour passer à l'étape suivante. F05 peut être traité en parallèle sans bloquer la progression.
