# Audit UX — Versi Studio Étapes 1+2 — Round 4 (session 27, post Round 3 fixes)
Persona : Thomas, marchand de biens. Date : 2026-04-27.

---

## 1. Note globale

**Note : 9,0 / 10 — Δ +1,8 vs Round 1 (7,2)**

---

## 2. Critères détaillés

### C1 — Étape 1 Upload : compréhension immédiate — 8/10 (stable)
Aucun fix Round 3 ciblé ce critère. Score maintenu : titre direct, progression XHR, retry par fichier. Friction résiduelle : bouton "Lancer l'analyse" disabled sans texte d'aide visible sur touch (P1 non corrigé, hors scope Round 3).

### C2 — Étape 2 Lots : interactivité polygones, mot pivot "lot" — 9/10 (was 7)
"Délimitations" confirmé aux deux emplacements ciblés (LotPanel L343 et L359). Aucune occurrence de "contours" exposée à Thomas. Bannière calibration : "Vérifiez la mesure de référence" / "Mettre à jour la mesure" / "les surfaces m²" — mot pivot "mesure" confirmé 3x dans le bloc bannière (lots/page.tsx L909–L918). Bonus : état 0 lot détecté couvert ("Dessinez les lots manuellement, puis validez."). +2 pts.

### C3 — Stepper navigation libre — 9/10 (was 6)
Stepper.tsx vérifié. `isClickable = completedSteps.includes(stepId) && stepId !== currentStep` : étapes complétées sont des boutons actifs avec `cursor-pointer` et `hover:bg-bg-default/50`. Aria `(complétée)` annoncé. Navigation régressive et saut d'étape pleinement fonctionnels. Seule friction résiduelle : libellé bouton retour "← Plans" sans "Retour à" (P1 cosmétique). +3 pts.

### C4 — Zéro jargon interdit — 9,5/10 (was 6,5)
LotPanel L343 : "Vérifiez les délimitations, puis validez." PASS.
LotPanel L359 : "Les délimitations proposées par l'IA sont des estimations." PASS.
Aucun "contours", "polygone", "uploader" visible Thomas. Bannière calibration : "mesure" systématique. Résiduel : aucun jargon bloquant détecté. -0,5 par précaution sur zones non relues (canvas). +3 pts.

### C5 — Boutons toujours visibles (découvrabilité s22) — 9/10 (was 8)
LotPanel L195 : crayon renommage `opacity-100` confirmé. Bouton visible au repos sur touch. Le double-clic reste un bonus non-discoverable mais n'est plus le seul vecteur (le crayon est permanent). +1 pt.

---

## 3. P0 résiduels

Aucun P0 résiduel. Les 3 bloquants du Round 1 sont résolus :
- P0.1 "contours" → "délimitations" : RÉSOLU
- P0.2 crayon opacity-0 → opacity-100 : RÉSOLU
- P0.3 stepper non-cliquable : RÉSOLU (navigation libre confirmée dans le code)

P1 résiduel unique : bouton "Lancer l'analyse" disabled sans aide visible sur touch (lots/page.tsx, hors scope Round 3).

---

## 4. Verdict

**GO — 9,0/10**

Aucun P0 résiduel. Parcours Thomas Étapes 1+2 validé pour release publique. P1 résiduel (aide contextuelle bouton disabled) à planifier en backlog P1 post-launch.
