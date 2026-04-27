# Audit persona Thomas marchand de biens — Étapes 1+2 Versi Studio — Round 4

**Date** : 2026-04-27
**Session** : s27 Round 4 (après Round 3 fixes)
**Baseline** : 6,5/10 (Round 1 — `s27-vs-step12-audit-persona-marchand.md`)

---

## 1. Note globale et delta

**Note : 8,5/10 — GO CONDITIONNEL**
**Δ vs Round 1 : +2,0 points**

Les 5 corrections Round 3 sont toutes confirmées en code. Les 3 P0 bloquants du Round 1
sont levés. Il reste 2 frustrations mineures qui empêchent le 10/10 pur.

---

## 2. Cinq critères /10

### C1 — GP1 Compréhension immédiate : 8/10 (était 8/10 — stable)

La bannière calibration est confirmée corrigée : `PlanCanvas.tsx` rendu —
"Indiquez une mesure connue" / "Modifier la mesure" remplacent "Calibrez ce plan" /
"Recalibrer". Le mot pivot "mesure" est dans l'UI. En tant que Thomas, je lis
"Indiquez une mesure connue" et je comprends : je dois entrer une distance réelle
pour que l'outil calcule les m². C'est du langage métier. La compréhension passe.

Déduction stable (-2) : l'enchaînement Étape 1 → Étape 2 nécessite toujours de
comprendre que la calibration est une action distincte de l'extraction IA. L'ordre
des actions n'est pas entièrement guidé — risque résiduel non bloquant.

---

### C2 — GP2 Réversibilité : 9/10 (était 9/10 — stable)

Undo/Redo confirmés permanents dans `PlanCanvas.tsx` L1722-1751 : toolbar bas-droit,
boutons conditionnels sur `(onUndo || onRedo)` — passés systématiquement depuis
`lots/page.tsx`. Le zoom (−/reset/+) et le mode main sont permanents L1671-1751.
P0-3 du Round 1 fermé.

---

### C3 — GP6 Mot pivot "lot" — zéro jargon : 9/10 (était 5/10, +4 pts)

**Correction confirmée :**
- `LotPanel.tsx` L343 : "Vérifiez les délimitations, puis validez." — "contours" éliminé.
- `LotPanel.tsx` L358-359 : "Les délimitations proposées par l'IA sont des estimations.
  Ajustez-les si nécessaire." — "contours" éliminé.

Les 2 occurrences P0 du Round 1 sont corrigées. Le mot pivot "délimitations" est en
place. Je lis le panneau et je parle le même langage qu'un géomètre.

Déduction (-1) : `showDrawingError` dans `PlanCanvas.tsx` L973 utilise encore
"Le lot se croise — corrigez les points qui se chevauchent." — message d'erreur
polygon visible utilisateur, formulation technique "se croise / points". Non critique
(chemin rare, erreur explicite), mais perfectible : "Les tracés de ce lot se
superposent — retracez la zone." serait plus naturel pour Thomas.

---

### C4 — GP7 Découvrabilité : 9/10 (était 7/10, +2 pts)

**Toolbar PlanCanvas confirmée permanente** (L1671-1752) : bouton main, dézoomer,
pourcentage zoom cliquable (reset), zoomer, undo, redo — 7 contrôles, always visible,
coin bas-droit, z-index 20. P0-3 du Round 1 définitivement fermé.

**Crayon mobile LotCard confirmé** : L195 `opacity-100` permanent (vs `opacity-0
group-hover:opacity-100` desktop). Sur mobile je vois le crayon sans hover.

**Stepper mobile Étape 2 confirmé** : `hidden md:block` — canvas full-width sur
mobile, le stepper ne squatte plus 30% de l'écran.

Déduction (-1) : le bouton suppression lot dans LotCard reste `opacity-0
group-hover:opacity-100` sur desktop (L274). Sur mobile c'est `min-w-[44px]
min-h-[44px]` (accessible), mais le desktop-hover-only pour supprimer est
asymétrique vs le crayon qui lui est permanent. Mineur mais incohérent.

---

### C5 — GP10 Gain de temps "30 plans/semaine" : 7/10 (était 5/10, +2 pts)

La pipeline géométrie concave hull (correction Round 3) est documentée dans le fix —
les formes L/U/T sont théoriquement préservées. Les gates durcis filtrent les lots
aberrants avant insertion.

Gains confirmés en code :
- "délimitations" remplace "contours" → zéro friction vocabulaire
- Toolbar zoom permanente → moins d'actions pour naviguer
- Crayon mobile permanent → utilisable sur tablette chantier

Ce qui reste non validé empiriquement (verbatim Thomas s27 toujours ouvert) :
le tracé IA sur un vrai PDF. La correction concave hull est dans le pipeline mais
aucun screenshot Playwright ou reality check visuel n'accompagne le Round 3.
Je ne peux pas dire "les lots collent aux murs" sans l'avoir vu sur un plan réel.
Note 7/10 plutôt que 5/10 parce que le vecteur est bon — mais pas 9/10 sans preuve.

---

## 3. Verbatim Thomas — frustrations résiduelles

"Ça m'énerve parce que je vois 'Le lot se croise' quand je rate un tracé. Je comprends,
mais 'corrigez les points qui se chevauchent' c'est du jargon de développeur. Dis-moi
juste de retirer le dernier point et de recommencer."

"Ça m'énerve parce que le bouton supprimer sur les lots desktop reste invisible jusqu'à
ce que je passe la souris dessus — alors que le crayon, lui, est toujours là. C'est
pas cohérent. Je cherche comment effacer un lot et je ne vois pas le bouton."

---

## 4. Verdicts GP synthétiques

| Gate | R1 | R4 | Motif R4 |
|---|---|---|---|
| GP1 Compréhension | PASS | PASS | Bannière "mesure connue" — langage métier |
| GP2 Réversibilité | PASS (cond.) | PASS | Toolbar undo/redo/zoom permanente confirmée |
| GP3 Crédibilité | FAIL | PASS (cond.) | Concave hull livré, reality check visuel manquant |
| GP4 Parcours fluide | PASS (partiel) | PASS | Toolbar confirmée, stepper mobile ok |
| GP6 Mot pivot | FAIL | PASS | "contours" → "délimitations" x2 confirmé |
| GP7 Découvrabilité | FAIL | PASS | Toolbar permanente confirmée L1671-1751 |
| GP9 Outputs utiles | FAIL | PASS (cond.) | Pipeline hull corrigé, non validé sur vrai plan |
| GP10 Gain de temps | FAIL | PASS (cond.) | Mécanique ok, preuve empirique manquante |

**BLOQUANT : 6/6 PASS** (dont 3 conditionnels — reality check visuel requis)
**Verdict global : GO CONDITIONNEL**

---

## 5. Verdict final

**8,5/10 — GO CONDITIONNEL**

Conditions pour GO 10/10 :
1. Reality check visuel obligatoire sur 1 PDF réel avec `VS_USE_MOCK_EXTRACTOR=false`
   — screenshot Playwright comparant tracé IA vs murs du plan. Si les lots collent :
   P0-2 fermé, note monte à 9,5/10.
2. Reformuler `showDrawingError` polygon L973 : "Le lot se croise — corrigez les points
   qui se chevauchent." → "Ce tracé se superpose lui-même. Retirez le dernier point
   ou recommencez." (LotPanel non concerné — c'est PlanCanvas.tsx L973).
3. Optionnel : rendre le bouton supprimer lot permanent (comme le crayon) sur desktop
   pour cohérence UX. (`LotCard` L274 : retirer `opacity-0 group-hover:opacity-100`).

---

**Handoff -> @orchestrator**
- Fichiers produits : `docs/qa/s27-vs-step12-audit-persona-marchand-r4.md`
- Verdicts : BLOQUANT 6/6 PASS (3 conditionnels), note 8,5/10, GO CONDITIONNEL, Δ +2,0 vs Round 1
- Points d'attention :
  - Reality check visuel sur PDF réel manquant (condition principale du GO pur)
  - `PlanCanvas.tsx` L973 : message erreur polygon encore technique
  - `LotCard` L274 : bouton supprimer desktop `opacity-0` incohérent vs crayon permanent
- Prochaines étapes recommandées : lancer un test E2E Playwright sur un vrai PDF (@qa),
  corriger L973 message erreur (@fullstack 5 min), optionnel L274 cohérence UX (@fullstack)
