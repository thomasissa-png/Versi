# Audit Persona Marchand de Biens — Étape 3 (Pièces) + Étape 4 (Visuels)
**Session** : s33 — 2026-05-07
**Branche** : `claude/versi-s33-propagation-context-u8L8y`
**Fichiers évalués** : `rooms/page.tsx`, `RoomCanvas.tsx`, `visuals/placement/page.tsx`, `VisualWizard.tsx`, `VisualWizardRoomStep.tsx`

---

## 1. Verdict global

**GO CONDITIONNEL — 7.5/10**

L'outil fonctionne de bout en bout pour un utilisateur qui comprend déjà le workflow. Les bugs bloquants s28/s31/s32 sont corrigés : plan visible sur le bon étage, pièces IA pré-positionnées, wizard pièce-par-pièce fluide, architecte conversationnel qui tient la discipline known-fields. Mais trois frustrations terrain restent non résolues avant que je puisse donner 10/10 sans hésiter.

**Top 3 frustrations Thomas terrain**
1. **Étape 3 — confirmation pièce IA obligatoire avant validation** : je dois confirmer CHAQUE pièce IA une par une avant de valider le lot. Sur 8 pièces, c'est 8 clics de trop. Si les pièces sont bonnes, je veux juste "Valider tout".
2. **Étape 4 — placement photo = deux actions distinctes** (cliquer sur le plan + uploader la photo) sans feedback clair entre les deux. Je clique, je vois une pastille mais pas de photo. Je ne sais pas si j'ai raté quelque chose.
3. **Étape 4 — Stepper absent** : je ne sais pas où j'en suis dans le flow global (Étape 1/2/3/4). L'Étape 3 a un stepper latéral, l'Étape 4 n'en a pas. Cassure visuelle immédiate.

---

## 2. Étape 3 — Gates GP1-GP10

| Gate | Verdict | Verbatim Thomas | Fichier impacté si FAIL |
|---|---|---|---|
| GP1 Compréhension instantanée | PASS | "Identifiez les pièces — c'est clair. Je vois mon plan, je vois les rectangles colorés, je sais ce que je dois faire." | — |
| GP2 Précision géométrique | PASS | "Le plan du bon étage s'affiche. Bug s28 corrigé. Les polygones sont sur les bonnes pièces, pas sur le RDC quand je suis en R+1." | — |
| GP3 Rapport temps/valeur | PARTIAL | "L'IA me pré-remplit les pièces, c'est bien. Mais je dois confirmer chaque pièce une par une avant de valider. Sur 8 pièces = 8 clics inutiles si tout est bon." | `rooms/page.tsx` L.591-598 (pré-check untouchedAiRooms) |
| GP4 Saisie marchand respectée | PASS | "Je renomme, je déplace, je redimensionne. Le debounce PATCH 1s est invisible. Ctrl+Z fonctionne." | — |
| GP5 Ergonomie tactile mobile | PARTIAL | "Le canvas fait 400px sur mobile, c'est jouable. Mais les poignées de resize (8px) sont microscopiques au doigt. Zone de hit 20px = juste acceptable." | `RoomCanvas.tsx` L.197 (`HANDLE_HIT_SIZE = 20`) |
| GP6 Récupération erreur | PASS | "Toast rouge avec message texte + bouton fermer. Si je valide sans typer les pièces, j'ai un message clair. Si j'oublie de confirmer les IA, idem." | — |
| GP7 Prise de décision rapide | PARTIAL | "La validation lot est bloquée si toutes les pièces IA ne sont pas confirmées. Je comprends pourquoi mais c'est 8 clics de trop si les pièces sont bonnes. Un bouton 'Tout confirmer' serait la correction." | `rooms/page.tsx` L.589-599 |
| GP8 Cohérence inter-écrans | PASS | "Étape 2 → Étape 3 : mon lot est présélectionné, le plan est là, les pièces sont là. Pas de re-saisie." | — |
| GP9 Confiance dans l'output | PASS | "Les pièces IA sont positionnées sur le bon lot, les couleurs par type sont lisibles, les surfaces s'affichent." | — |
| GP10 Maîtrise du process | PASS | "Je vois combien de lots sont validés (badge vert), lequel est en cours, le message 'Tous les lots validés' à la fin. Je sais où j'en suis." | — |

**Étape 3 : BLOQUANT 4/6 PASS, REQUIS 2/2 PASS — GO CONDITIONNEL**
(GP3, GP7 PARTIAL = non FAIL bloquant mais friction réelle terrain)

---

## 3. Étape 4 — Gates GP1-GP10

| Gate | Verdict | Verbatim Thomas | Fichier impacté si FAIL |
|---|---|---|---|
| GP1 Compréhension instantanée | PARTIAL | "Je vois 'Étape 4 — Visuels par pièce' avec une sous-instruction. Bien. Mais pas de stepper — je ne sais pas si c'est l'étape 4 sur 4 ou sur 6. Je cherche mes repères." | `visuals/placement/page.tsx` (pas de `<Stepper>` importé) |
| GP2 Précision géométrique | PASS | "Je clique sur le plan pour placer ma prise de vue, la flèche d'angle pointe vers le centre de la pièce automatiquement. Comportement logique." | — |
| GP3 Rapport temps/valeur | PASS | "Wizard pièce-par-pièce : je configure, je génère, je valide ou je régénère. 3 états clairs. Le SSE me donne un retour en temps réel, je ne fixe pas un spinner muet." | — |
| GP4 Saisie marchand respectée | PASS | "L'architecte conversationnel reprend mes pills sans les re-demander (fix s32 known-fields). 'Sol à rénover', 'niveau premium' — les champs sont injectés dans le brief image." | — |
| GP5 Ergonomie tactile mobile | PARTIAL | "Le pattern tap-to-confirm (s30) est là. Mais cliquer sur le plan pour placer une prise de vue et ensuite trouver le bon bouton upload dans la liste en dessous = deux actions distinctes pas toujours évidentes sur mobile." | `VisualWizardRoomStep.tsx` L.156-166 |
| GP6 Récupération erreur | PASS | "Bandeau erreur avec bouton 'Réessayer'. Erreur par placement (`errorPlacementIds`). Toast d'erreur chat. L'outillage de recovery est là." | — |
| GP7 Prise de décision rapide | PASS | "À chaque pièce : configurer → bouton 'Générer cette pièce' → visuels → 'Valider' ou 'Régénérer'. Les décisions sont simples et enchaînées." | — |
| GP8 Cohérence inter-écrans | FAIL | "L'Étape 3 a un stepper latéral permanent. L'Étape 4 n'en a pas. Je passe d'un écran avec navigation latérale à un écran en pleine largeur sans repères de progression globaux. C'est la même session de travail mais l'interface change de paradigme." | `visuals/placement/page.tsx` (stepper absent) |
| GP9 Confiance dans l'output | PASS | "Le brief architecte est résumé avant génération (BriefSummaryDialog), les visuels générés sont affichés inline avec aperçu lightbox. Je peux montrer ça à un acquéreur." | — |
| GP10 Maîtrise du process | PARTIAL | "Wizard 'Pièce N / Total' est visible dans le header de chaque step. Mais pas de vue d'ensemble 'combien de pièces faites / restantes' sans aller jusqu'au récap final. Je veux pouvoir sauter une pièce et revenir sans me perdre." | `VisualWizard.tsx` L.219-222 (visibleRooms linéaire, pas de jump non-linéaire) |

**Étape 4 : BLOQUANT 4/6 PASS (GP8 FAIL), REQUIS 2/2 non-applicables — GO CONDITIONNEL**
(GP8 est le seul FAIL dur — cassure visuelle documentée)

---

## 4. Cohérence inter-écrans Étape 3 → 4

**Transitions fonctionnelles : OUI**
- Le bouton "Continuer vers les visuels" de l'Étape 3 PATCH le statut projet puis `router.push` vers `/vs/projects/${id}/visuals` (redirect HOTFIX-2 s31 vers `/visuals/placement`). Pas de re-saisie, pas de boucle.
- Les pièces validées en Étape 3 sont directement disponibles dans le wizard Étape 4. Les `room_type`, polygones, surfaces transitent sans friction.

**Cassure visuelle : OUI (GP8 FAIL)**
- Étape 3 : layout `flex gap-2xl` avec `aside w-64` (stepper) + zone principale. Stepper visible en permanence avec les 4 étapes numérotées.
- Étape 4 : layout `flex flex-col`, stepper absent. L'utilisateur perd ses repères de progression globaux au moment précis où il entre dans la phase la plus longue (génération pièce par pièce).
- Re-saisies redondantes : AUCUNE. Le brief architectural pièce (architectural_details) est pré-chargé depuis la DB, les pills sont pré-remplis. Pas de double-saisie.

---

## 5. Précision géométrique — Issues s33 fixées

**Issue #1 (plan mauvais étage)** : CORRIGÉ CONFIRMÉ. `rooms/page.tsx` L.231-233 : `plans.find(p => p.floor_number === currentLot.floor_number) ?? plans[0]`. Le fallback `plans[0]` reste mais n'est atteint que si aucun plan ne correspond à l'étage — cas edge acceptable.

**Issue #2 (polygones décalés)** : CORRIGÉ CONFIRMÉ. `RoomCanvas.tsx` L.141-164 : `getRoomRenderBbox` dérive la tight bbox depuis le polygon réel, pas depuis `position` qui peut être désync DB legacy. Les handles de resize collent au contour visible.

**Issue #3 (désync polygon/bbox après drag/resize)** : CORRIGÉ CONFIRMÉ. `handleMoveRoom` L.435-447 dans `rooms/page.tsx` propage le polygon transformé au PATCH si fourni. `transformPolygon()` dans `RoomCanvas.tsx` L.115-127 scale+translate les points proportionnellement.

**Caveat résiduel** : Le fallback `plans[0]` en Étape 4 (`visuals/placement/page.tsx` L.143-148) utilise `plans.find(p => p.floor_number === selectedLot.floor_number)` sans fallback `?? plans[0]`. Si aucun plan ne matche, `planForLot` est `null` → canvas vide. Comportement correct (écran vide plutôt qu'écran trompeur) mais sans message utilisateur explicite dans ce cas précis.

---

## 6. Confiance dans l'output IA

**Architecte conversationnel** : Le fix s32 `known-fields-list` dans le system prompt empêche le LLM de re-poser les questions déjà répondues. Les pills (level, technical_constraints) sont maintenant injectés dans `buildArchitecturalBrief` avec mapping FR→EN + tag `(dealer-confirmed)`. La saisie Thomas arrive dans le prompt image.

**Visuels générés** : Je ne peux pas évaluer les rendus sans lancer une vraie génération. Sur la base du code : brief complet (room_type + surface + is_furnished + architectural_details + style + commentaire libre + target_count), SSE en temps réel, aperçu lightbox, bouton régénérer. L'infrastructure donne les moyens d'un output pro.

**Limite d'évaluation statique** : Sans accès à de vrais visuels générés sur le PDF Muguets, je ne peux pas confirmer GP9 à 100%. La confiance structurelle est là (brief complet → prompt complet → gpt-image-2). La confiance visuelle terrain demande un smoke test live.

---

## 7. Top 5 frustrations restantes prioritisées

1. **[P1] Confirmation pièce IA individuelle obligatoire avant validation lot (Étape 3)** — Sur 8 pièces IA, 8 clics "Confirmer" avant de pouvoir "Valider le lot". Ajouter un bouton "Tout confirmer" dans le RoomPanel. Correction : `rooms/page.tsx` handler `handleConfirmAllRooms` + appel API bulk PATCH `touched=true` + mise à jour `roomsByLot`.

2. **[P1] Stepper absent en Étape 4** — Cassure visuelle documentée entre Étape 3 (stepper latéral) et Étape 4 (header pleine largeur sans stepper). Ajouter `<Stepper currentStep={4} projectId={projectId} completedSteps={[1,2,3]} />` dans `visuals/placement/page.tsx`. Correction 5 lignes.

3. **[P2] Lien placement → upload pas assez guidé (Étape 4 mobile)** — Je clique sur le plan pour créer une pastille, puis je dois trouver le bouton upload dans la liste en dessous. Sur mobile, ce lien visuel pastille → bouton upload est faible. Un tooltip/highlight sur la pastille créée + scroll auto vers la ligne d'upload réduirait la friction.

4. **[P2] Jump non-linéaire entre pièces absent (Étape 4)** — Le wizard est strictement linéaire (Précédent/Suivant). Si j'ai 6 pièces et que je veux sauter à la pièce 4 directement, je dois naviguer. Un mini-sommaire cliquable (nom pièce + état configuring/generating/preview/validated) éviterait la navigation aveugle.

5. **[P3] Caveat plan null silencieux (Étape 4 multi-étage)** — Si `planForLot` est null (aucun plan pour cet étage), le canvas affiche un fond vide sans message explicite. Ajouter un bandeau "Plan non trouvé pour cet étage — vérifiez l'Étape 1" dans `VisualWizard.tsx` ou `VisualPlacementPage`.

---

## 8. Verbatim final

"L'Étape 3 est solide — le plan est là, les pièces IA sont positionnées, je peux ajuster et valider. Mon seul problème c'est les 8 clics de confirmation un par un avant de valider le lot. C'est de la friction inutile. L'Étape 4 m'impressionne sur le fond — le wizard pièce-par-pièce, l'architecte qui retient mes saisies, le brief qui s'injecte dans la génération — c'est exactement ce que je voulais. Mais je décroche quand je passe de l'Étape 3 à l'Étape 4 : je perds le stepper, je perds mes repères. Corrigez ces deux points et on est à 9/10 sans discussion."

---

**Handoff -> @orchestrator**
- Fichier produit : `docs/qa/s33-audit-persona-marchand-etape3-4.md`
- Verdicts : Étape 3 BLOQUANT 4/6 PASS (GP3+GP7 PARTIAL), Étape 4 BLOQUANT 4/6 PASS (GP8 FAIL), Verdict global GO CONDITIONNEL 7.5/10
- Points d'attention :
  - **GP8 FAIL Étape 4** : stepper absent → `visuals/placement/page.tsx` (correction 5 lignes)
  - **GP3+GP7 PARTIAL Étape 3** : confirmation pièce IA individuelle obligatoire → `rooms/page.tsx` (bouton "Tout confirmer")
  - **GP10 PARTIAL Étape 4** : navigation non-linéaire absente entre pièces
- Prochaines étapes recommandées : corrections @fullstack sur GP8 (stepper Étape 4) + GP3/GP7 (bulk confirm pièces IA) → re-évaluation ciblée si corrections appliquées
