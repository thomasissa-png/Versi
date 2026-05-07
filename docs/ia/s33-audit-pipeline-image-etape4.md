# s33 — Audit pipeline image Étape 4 Visuels (READ-ONLY)

**Date** : 2026-05-07 — **Agent** : @ia — **Branche** : `claude/versi-s33-propagation-context-u8L8y`
**Trigger** : 3 issues prod Thomas après smoke test (portes mal placées, IA ignore la saisie marchand, angles internes incohérents).

---

## 1. Synthèse — verdict

**Criticité : P0 (bloquant prod).** Les 3 issues sont des bugs réels, identifiés au niveau du **prompt** (pas du modèle). Root causes :

1. **Issue #1 (portes/fenêtres mal placées)** = bug sémantique de framing. Les annotations segments SONT injectées dans le prompt (cf. `coherent-visual-generator.ts:159-162` et `:211-214`), MAIS le bloc `ROOM CHARACTERISTICS` est noyé sans tag de priorité, et la STRICT RULE 1 (« KEEP all structural elements EXACTLY ») contredit l'instruction de placer les ouvertures conformément au plan. Le LLM image, en cas de conflit photo source vs annotations plan, suit la photo (path of least resistance).
2. **Issue #2 (saisie marchand pas en priorité)** = bug de hiérarchie d'instructions. Le bloc `ARCHITECTURAL BRIEF — DEALER INPUT (authoritative, priority over visual inference)` existe et tag bien `(dealer-confirmed)` (cf. `visual-generator.ts:524, 541, 461, 478`), MAIS il est positionné APRÈS `STRUCTURAL TRANSFORMATIONS` et le bloc segments — sans répétition dans les STRICT RULES. La directive de priorité est noyée, le modèle ne la traite pas comme "law".
3. **Issue #3 (angles incohérents multi-vues)** = bug de référentiel spatial. Les segments sont positionnés en **côtés du plan** (top/right/bottom/left du floor plan vu de dessus, cf. `segment-prompt.ts:262-271`), pas relativement à la **caméra**. Le prompt mélange ensuite « Camera angle: view from the north-east » (`visual-generator.ts:347-354`) et « door on right side of the floor plan » sans transformer les coords. Conséquence : le LLM interprète « right side » comme « right of the camera frame » → la porte apparaît au même endroit visuel quel que soit l'angle.

**Diff attendu** = additif au prompt (pas de refactor). 3 modifications localisées, 1 helper de transformation côté → caméra. Aucun nouveau modèle, aucun nouvel appel API.

---

## 2. Cartographie données disponibles vs injectées

Source vérité = `loadRoomsToGenerate()` `visual-job-runner.ts:110-187` + `loadRoomSegments()` ligne 215.

| Source DB | Stocké | Injecté dans prompt | Tag dealer-confirmed | Diagnostic |
|---|---|---|---|---|
| `vs_rooms.polygon` | OK | partiel (centroïde calculé pour `selectAnchorPhoto`) | n/a | OK |
| `vs_rooms.surface_m2` | OK | OUI (qualifier compact/standard/généreux) | non | OK |
| `vs_rooms.style_id` | OK | OUI (style.prompt_hint) | non | OK |
| `vs_rooms.is_furnished` | OK | OUI (`openingSentence` + RULE 9) | non | OK |
| `vs_rooms.architectural_details.floor` | OK | OUI (`buildArchitecturalBrief`) | OUI `(dealer-confirmed)` ou `(visually identified)` | OK |
| `vs_rooms.architectural_details.walls` | OK | OUI | OUI | OK |
| `vs_rooms.architectural_details.lighting` | OK | OUI | OUI | OK |
| `vs_rooms.architectural_details.specifics[]` | OK | OUI (filtre "Aucune") | OUI (+ low confidence si vision) | OK |
| `vs_rooms.architectural_details.level` | OK | OUI (`Quality level`) | OUI | OK |
| `vs_rooms.architectural_details.technical_constraints[]` | OK | OUI (mention `immutable, must be preserved`) | OUI | OK |
| `vs_lots.architectural_profile` (5 champs) | OK | OUI (Lot profile) | non taggé individuellement | **BUG MINEUR** : pas de tag `(dealer-confirmed)` sur les 5 champs lot, vs ils sont 100% saisis marchand. |
| `vs_room_segments.type` (door/window/bay/opening/flexible/wall) | OK | OUI (`buildSegmentDescriptionEn`) | **NON** (aucun tag priorité) | **BUG #1.1** : annotations injectées en bloc neutre `ROOM CHARACTERISTICS`, sans `(dealer-confirmed)` ni mention « priority over photo ». |
| `vs_room_segments.notes` | OK | OUI (en queue) | NON | **BUG #1.2** : notes libres marchand pas taggées. |
| `vs_room_segments.segment_index` → côté plan | calculé `computeSegmentSide` | OUI **côté du plan** (top/right/etc.) | n/a | **BUG #3** : côté du plan injecté tel quel, jamais transformé en référentiel caméra. |
| `vs_photos.angle_degrees` | OK | OUI (`angleDegreesToCardinal` → "view from the north-east") | n/a | **BUG #3 (suite)** : angle caméra cardinal injecté, mais sans pont avec les côtés du plan. Le modèle hallucine la correspondance. |
| `vs_room_settings.comment_text` | OK | OUI (User-specified constraints + `structural_instructions`) | non taggé | À taguer pour cohérence (saisie marchand). |
| `vs_visual_questions[answered]` | OK | OUI (`Clarifications from operator`) | implicite | OK (formulation correcte). |
| `vs_lots.operation_chat_context` | OK | OUI (`buildChatInsightsBrief`, secondaire) | non | OK (correctement positionné comme secondaire). |
| `vs_room_chats.extra_context` | OK | OUI (cap 8 entrées / 800 chars) | non | OK. |
| `vs_rooms.intentions_travaux` | **NON présent dans `loadRoomsToGenerate`** | NON | n/a | **BUG #2.1** : si la table `vs_rooms` a un champ d'intentions travaux explicite, il n'est pas chargé. À vérifier. (Si absent, tout passe par `comment_text` ou `architectural_details` — OK.) |

**Constat global** : la donnée EST presque toujours en BDD et chargée. Le problème n'est pas l'absence de données, c'est leur **hiérarchisation** dans le prompt et leur **référentiel spatial**.

---

## 3. Issue #1 root cause — portes/fenêtres mal placées

**Code en cause** :
- `versi-studio/src/lib/vs/ui/segment-prompt.ts:330` — bloc final injecté : `"ROOM CHARACTERISTICS (annotated by the operator on the plan):\n..."`
- `versi-studio/src/lib/vs/visual-generator.ts:665-667` — injection : `const segmentBlock = p.segmentDescription && p.segmentDescription.trim().length > 0 ? \`\n\n${p.segmentDescription.trim()}\` : "";`
- `versi-studio/src/lib/vs/visual-generator.ts:680` — STRICT RULE 1 (no transformations) : `"1. KEEP all structural elements EXACTLY (walls, windows, doors, openings, bay windows...) preserve every existing door, window and opening visible in the source photo with its exact position..."`

**Pourquoi le bug** : conflit d'autorité dans le prompt.

- Le bloc segments dit « il y a 1 porte sur le côté droit du plan, 2 fenêtres sur le côté gauche ».
- La STRICT RULE 1 dit « préserve EXACTEMENT toutes les portes/fenêtres visibles dans la photo source ».
- Si la photo source a une porte sur ce qui apparaît à gauche dans le frame caméra (= côté droit du plan vu de dessus), le LLM voit 2 instructions divergentes et tranche en faveur de la photo (instruction la plus concrète, source visuelle directe).
- Le bloc segments **n'a aucun tag de priorité explicite** : pas de `(dealer-confirmed)`, pas de `authoritative`, pas de mention « override the photo if there's a discrepancy ».

**Conséquence** : annotations marchand devenues décoratives. Pattern « pills-decoys-bug-silencieux-pipeline » P1 s32 répliqué (la donnée est saisie, la donnée est lue, la donnée est concaténée — mais la donnée n'est pas ÉCOUTÉE par le LLM par manque d'instruction explicite de priorité).

---

## 4. Issue #2 root cause — saisie marchand pas en priorité

**Code en cause** :
- `versi-studio/src/lib/vs/visual-generator.ts:554` — l'en-tête du brief existe : `"ARCHITECTURAL BRIEF — DEALER INPUT (authoritative, priority over visual inference):"` — c'est correct, dealer-confirmed est bien présent.
- `versi-studio/src/lib/vs/visual-generator.ts:694` — ordre d'injection dans `buildVisualPromptAnchor` : `${openingSentence}${structuralBlock}${segmentBlock}${architecturalBrief}${chatInsightsBrief}` puis STYLE DETAILS, CONTEXT, STRICT RULES.

**Pourquoi le bug**, malgré l'existence du tag :

1. **Le bloc DEALER INPUT n'est jamais référencé dans les STRICT RULES.** Les 9 STRICT RULES (`visual-generator.ts:704-713`) parlent de structurel, mobilier, photoréalisme — aucune ne dit « in case of conflict between photo and DEALER INPUT, DEALER INPUT wins ». Le LLM n'a pas de règle d'arbitrage.
2. **L'`openingSentence`** (ligne 687-689) **est neutre vis-à-vis de la priorité dealer**. Elle parle de « adapt and upgrade existing layout » ou « bring complete furniture set » — sans nommer le brief comme source de vérité.
3. **Les segments (issue #1) sont injectés AVANT le DEALER INPUT** (`segmentBlock` puis `architecturalBrief`) — l'ordre suggère que le bloc dealer est annexe, alors qu'il devrait être en tête.
4. **`comment_text` (User-specified constraints)** est dans CONTEXT, pas dans le DEALER INPUT — alors que c'est aussi de la saisie marchand. Aucun tag.
5. Pas de **directive d'inversion priorité photo→texte** explicite. Le LLM image par défaut suit la photo (c'est son input principal). Sans instruction contraire, il ne peut pas savoir que le texte doit prévaloir sur le visuel pour certains champs (état murs, sol, niveau de prestation, contraintes techniques).

**Pattern fondateur s32 violé** (`docs/founder-preferences.md:104-113`) : « Saisie marchand > inférence IA » — implémentation partielle (tag présent) mais directive de priorité non transmise au LLM image.

---

## 5. Issue #3 root cause — cohérence multi-angles

**Code en cause** :
- `versi-studio/src/lib/vs/ui/segment-prompt.ts:57-84` — `computeSegmentSide()` calcule le côté **dans le référentiel canvas du plan** (axe x = droite du plan, axe y = bas du plan vu de dessus).
- `versi-studio/src/lib/vs/ui/segment-prompt.ts:262-271` — labels EN : `"top side of the floor plan"`, `"right side"`, etc. → côtés DU PLAN.
- `versi-studio/src/lib/vs/visual-generator.ts:347-354` — `angleDegreesToCardinal()` retourne `"view from the north-east of the room"` → angle CAMÉRA sur boussole abstraite (0=nord).
- `coherent-visual-generator.ts:167, 219` — chaque photo (anchor + secondaires) injecte SON propre `angleDegrees`, MAIS le `segmentDescription` est calculé UNE SEULE FOIS sur le polygone et ré-injecté à l'identique (`coherent-visual-generator.ts:159-162` puis `:211-214`).

**Pourquoi le bug** :

- **Coords absolues injectées au lieu de relatives à la caméra.** Le bloc segments dit « door on right side of the floor plan » — c'est une coord ABSOLUE dans le repère du plan vu de dessus.
- **L'angle caméra n'est pas mathématiquement composé avec les coords plan.** Le LLM reçoit deux référentiels disjoints (boussole nord vs côtés du plan) et doit deviner la transformation. Il devine mal ou ignore.
- **Le bloc segments est strictement identique pour anchor et tous les secondaires** : le LLM voit la même phrase « door on right side » dans 3 prompts à 3 angles différents → conclusion la plus simple = « la porte est à droite dans le frame » → porte au même endroit visuel partout.
- **Pas de transformation explicite.** Si Thomas a annoté la porte en x=100% du plan (droite du floor plan), et que la caméra anchor regarde depuis le nord-ouest (caméra en x=0%, y=0%, regardant vers x↑ y↑), alors la porte apparaît en arrière-plan droit. Mais si une caméra secondaire regarde depuis le sud-est, la même porte apparaît en arrière-plan GAUCHE. Cette transformation devrait être faite côté code, ou au minimum explicitement décrite au LLM.

**Conséquence** : la position des murs/portes est figée dans le frame caméra, indépendante de l'angle de vue → toutes les photos générées « du même angle » visuellement, comme remonté par Thomas.

---

## 6. Diff attendu (pseudo-diff, NON implémenté)

### 6.1 — `buildSegmentDescriptionEn()` : taguer dealer-confirmed + transformer côté plan → côté caméra

```diff
- return `ROOM CHARACTERISTICS (annotated by the operator on the plan):\n${lines.join("\n")}`;
+ return `ROOM OPENINGS — OPERATOR-ANNOTATED (dealer-confirmed, AUTHORITATIVE: these locations override anything inferred from the source photo):\n${lines.join("\n")}\n
+ Note for the model: these positions are expressed relative to the floor plan viewed from above. The camera angle for THIS specific photo is described in the CONTEXT section below — translate these floor-plan sides into the camera's frame accordingly. If a door is on "right side of the floor plan" and the camera looks "from the south-west", the door must appear in the right portion of the frame. If the camera looks "from the north-east", the same door must appear in the LEFT portion of the frame.`;
```

### 6.2 — Nouveau helper `transformSideToCameraFrame(side, cameraAngleDegrees)` (option avancée)

Pré-calculer côté code la position attendue dans le frame caméra (gauche/centre/droite/derrière), pour ne pas faire dépendre le LLM d'une trigonométrie textuelle :

```diff
+ function transformSideToCameraFrame(
+   plansSide: RelativeSide,
+   cameraAngleDeg: number | null
+ ): "left of frame" | "center of frame" | "right of frame" | "behind camera" | "unknown" {
+   if (cameraAngleDeg == null) return "unknown";
+   // côté plan en angle (0=est, 90=sud, 180=ouest, 270=nord du plan)
+   const sideAngle = { droit: 0, "bas-droit": 45, bas: 90, ... }[plansSide];
+   const relative = (sideAngle - cameraAngleDeg + 360) % 360;
+   if (relative >= 315 || relative < 45) return "behind camera";
+   if (relative >= 45 && relative < 135) return "right of frame";
+   if (relative >= 135 && relative < 225) return "center of frame";
+   return "left of frame";
+ }
```

Puis injection : `"On the right side of the floor plan (= right of frame for this camera angle): 1 door."`

### 6.3 — `buildVisualPromptAnchor()` : hisser DEALER INPUT au-dessus de tout

```diff
- return `${openingSentence}${structuralBlock}${segmentBlock}${architecturalBrief}${chatInsightsBrief}
+ // Le brief dealer est désormais en tête, segments suivent (les deux dealer-confirmed),
+ // structural transformations restent en haut car directives explicites travaux.
+ return `${openingSentence}${architecturalBrief}${segmentBlock}${structuralBlock}${chatInsightsBrief}
```

### 6.4 — Nouvelle STRICT RULE 0 (priorité absolue dealer)

```diff
  STRICT RULES:
+ 0. PRIORITY OF SOURCES (in case of conflict): (a) ARCHITECTURAL BRIEF — DEALER INPUT and ROOM OPENINGS — OPERATOR-ANNOTATED override the source photo. The operator has the ground truth for floor type, wall finish, opening positions and quality level. The photo is a visual reference for current state and camera framing only. (b) STRUCTURAL TRANSFORMATIONS override both photo and current state. (c) STYLE DETAILS apply to all elements not constrained above.
  1. APPLY the structural transformations above ...
```

### 6.5 — Tag `(dealer-confirmed)` sur les 5 champs `architectural_profile` (lot)

`visual-generator.ts:386-422` — chaque `parts.push(...)` doit suffixer `(dealer-confirmed)` (ces champs sont 100% saisis marchand, jamais inférés Vision pour le profil lot).

### 6.6 — Tag `(dealer-confirmed)` sur `comment_text` et `user_answers`

`visual-generator.ts:652-657` — la User-specified constraints + Clarifications sont 100% marchand. Suffixer `(dealer-confirmed, AUTHORITATIVE)`.

---

## 7. Tests régression à prévoir (Vitest + 1 E2E)

À placer dans `versi-studio/src/lib/vs/__tests__/visual-prompt.test.ts`.

1. **`buildVisualPromptAnchor injects ROOM OPENINGS as authoritative`** — donner segments avec 1 door + 1 window, asserter que le prompt contient `dealer-confirmed`, `AUTHORITATIVE`, `override anything inferred from the source photo`. (Couvre Issue #1.)
2. **`buildArchitecturalBrief precedes segmentBlock`** — asserter que `prompt.indexOf("ARCHITECTURAL BRIEF") < prompt.indexOf("ROOM OPENINGS")`. (Couvre ordre Issue #2.)
3. **`STRICT RULE 0 priorité dealer présent`** — asserter le prompt contient `PRIORITY OF SOURCES` et `dealer input ... override the source photo`. (Couvre Issue #2.)
4. **`secondary prompt has different camera-frame transform`** — donner même polygone + segments mais 2 angles différents (anchor 0°, secondary 180°), asserter que le bloc segments contient soit des positions différentes (right of frame vs left of frame), soit une mention explicite de transformation. (Couvre Issue #3.)
5. **E2E** : 1 pièce de test avec 3 photos placées à 3 angles cardinaux, run `runVisualJob`, asserter que les 3 prompts capturés (champ `vs_visuals.prompt_used`) ne sont pas identiques sur la portion segments — si identiques → bug #3 toujours présent.

Bonus regression `dealer-confirmed propagation` : grep `(dealer-confirmed)` dans le prompt retourné, asserter ≥ 5 occurrences quand le profil lot et les détails pièce sont 100% saisis.

---

## 8. Risques résiduels (hors périmètre cet audit)

- **Qualité visuelle gpt-image-2** : même avec un prompt parfait, le modèle peut halluciner une porte à un endroit non spécifié si la photo source en montre une. Aucun moyen de garantir 100% pixel-perfect — un Vision verifier post-génération (`visual-verifier.ts` existe) pourrait scorer la conformité dealer mais c'est un check, pas une garantie.
- **Photos source bruitées** : si la photo brute a une porte cachée derrière des cartons, le LLM peut l'omettre dans le rendu. Hors périmètre prompt.
- **Annotations partielles** : si Thomas annote 2 segments sur 6 (les 4 autres restent en `wall`), le LLM peut inférer librement sur les 4 walls. Comportement actuel volontaire (cf. `segment-prompt.ts:166-167`), à challenger en review UX si trop permissif.
- **Référentiel spatial 2D** : la transformation côté plan → frame caméra reste une **approximation azimutale**. La hauteur (étage de la porte, baie en hauteur) n'est pas modélisée. Hors scope étape actuelle.
- **Cohérence anchor↔secondary au-delà du frame** : la signature visuelle (`extractVisualSignature`) gère palette/meubles/finitions. Elle ne gère PAS la position relative des éléments structurels — c'est l'objet de la fix #6.2. Si la fix textuelle ne suffit pas, il faudra explorer le mode multi-image natif gpt-image-2 (déjà tenté `coherent-visual-generator.ts:243-280`) ou injecter un mini-schéma JSON du floor plan.
- **Tests E2E modèle réel** : les tests Vitest ne valident que le prompt. La vraie cohérence visuelle requiert un appel gpt-image-2 réel, coûteux ($0.21/image), à factoriser en suite manuelle « 1 fois par release Étape 4 ».

---

**Handoff → @orchestrator**

- **Fichier produit** : `/home/user/Versi/docs/ia/s33-audit-pipeline-image-etape4.md`
- **Verdict** : 3 issues = bugs prompt P0, fix additif (pas refactor), localisé sur 4 fonctions (`buildSegmentDescriptionEn`, `buildVisualPromptAnchor`, `buildArchitecturalBrief` pour profil lot, + 1 helper `transformSideToCameraFrame`).
- **Root causes** : (1) annotations segments sans tag priorité ni override photo, (2) DEALER INPUT positionné après et non rappelé en STRICT RULE, (3) côtés du plan injectés sans transformation vers frame caméra.
- **Prochaine étape recommandée** : invoquer @fullstack avec ce document + diff section 6 pour implémentation. Tests section 7 obligatoires avant deploy. Aucun changement de modèle ni d'API requis.
- **Points d'attention** :
  - Préf fondateur s32 « Saisie marchand > inférence IA » à respecter strictement — le tag `dealer-confirmed` doit être propagé partout (5 champs profil lot manquants, comment_text manquant, user_answers manquants).
  - Anti-pattern « propagation oubliée » (.claude/agents/ia.md) : la fix doit être appliquée dans `buildVisualPromptAnchor` ET `buildVisualPromptSecondary` (héritage via `base + coherenceBlock` rend l'anchor fix automatiquement propagée — vérifier).
  - Pas de WebSearch tarifs (déjà fait s29-s32, gpt-image-2 = $0.21/image, exclusivement).
  - Audit READ-ONLY : aucun code modifié, livrable Markdown unique.
