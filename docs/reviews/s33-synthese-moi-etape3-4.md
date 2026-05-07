# Synthèse @moi — Vague 2 Étape 3 + Étape 4 Versi Studio (s33)

**Date** : 2026-05-07
**Branche** : `claude/versi-s33-propagation-context-u8L8y`
**Mode** : Shadow Phase 1 — proxy Thomas. Périmètre : 5 audits vague 1 (UX/Design/Copy/QA/Persona) + 2 audits issues prod déjà fixées.

---

## 1. Verdict global

**NO-GO 10/10 BOUT-EN-BOUT — Score moyen 7.0/10.**

Les 5 agents convergent indépendamment vers un score 6-7.5/10. Cumul : 9 P0 distincts (3 UX + 1 Design + 2 Copy + 3 QA), 6 P0 sont **bloquants persona terrain** (undo invisible, empty state absent, bouton grisé sans hint, anglicisme `uploadez`, jargon `rattrape l'état`, stepper Étape 4 absent). Préférence fondateur **« 10/10 strict, pas de 8.5/10 »** + **« pixel-parfait sur TOUS les critères »** = 1 P0 ouvert = NO-GO. Ici 9 P0 + 12 P1 = NO-GO mécanique. Aucun agent au-dessus de 7.5/10 → réflexe Thomas direct : *« Inutile de me proposer 8/10, merci. »*

| UX | Design | Copy | QA | Persona | **Moyenne** |
|---|---|---|---|---|---|
| 7/10 | 7.5/10 | 7/10 | 6/10 | 7.5/10 | **7.0/10** |

---

## 2. Synthèse cross-axes

| Axe | Score | Top 1 P0 |
|---|---|---|
| UX | 7/10 | Bouton « Générer cette pièce » grisé sans hint conditionnel (`VisualWizardRoomStep.tsx:215-218`) |
| Design | 7.5/10 | Token `--color-info` absent → badge Ancre VisualGallery undefined (`VisualGallery.tsx:241-247`) |
| Copy | 7/10 | Anglicisme `uploadez la photo` G33 BLOQUANT (`visuals/placement/page.tsx:293`) |
| QA | 6/10 | Pre-commit Vitest + CI/CD ABSENTS (G29/G30 FAIL) + `useVisualsStream` 506L jamais testé |
| Persona | 7.5/10 | GP8 FAIL Étape 4 — Stepper absent (`visuals/placement/page.tsx`) |

Aucun agent ne s'est risqué à donner 8/10 — signal fort. La QA tire la moyenne (gouvernance projet, pas produit fini). Le produit lui-même plafonne à 7-7.5 sur 4 axes indépendants. **Convergence inattaquable.**

---

## 3. P0 + P1 cumulés tous axes (top 12 prioritisés)

| # | Issue | Sév. | Source | Fichier:ligne | Effort |
|---|---|---|---|---|---|
| 1 | Stepper absent Étape 4 (cassure visuelle Étape 3→4) | P0 | Persona GP8 FAIL | `visuals/placement/page.tsx` | 5 min |
| 2 | Anglicisme `uploadez la photo` G33 BLOQUANT | P0 | Copy | `visuals/placement/page.tsx:293` | 5 min |
| 3 | Jargon dev `on rattrape l'état` visible prod | P0 | Copy | `VisualWizard.tsx:1216` | 5 min |
| 4 | Boutons ↶/↷ Undo/Redo invisibles RoomCanvas | P0 | UX (préf s22) | `RoomCanvas.tsx:75-79` | 1-2 h |
| 5 | Empty state canvas Étape 4 absent (1er accès) | P0 | UX | `VisualWizardRoomStep.tsx:208-212` | 30 min |
| 6 | Bouton « Générer cette pièce » grisé sans hint conditionnel | P0 | UX | `VisualWizardRoomStep.tsx:215-218` | 1 h |
| 7 | Token `--color-info` absent → badge Ancre undefined | P0 | Design | `globals.css` + `VisualGallery.tsx:241-247` | 30 min |
| 8 | Pre-commit Vitest + CI/CD GitHub Actions absents | P0 | QA G29/G30 FAIL | `.husky/`, `.github/workflows/`, `package.json` | 1 h |
| 9 | `useVisualsStream` 506L jamais testé (SSE 4 patterns + polling 4s) | P0 | QA | hook `useVisualsStream` | 3 h |
| 10 | Bulk « Tout confirmer » pièces IA Étape 3 (8 clics → 1) | P1 | Persona GP3+GP7 | `rooms/page.tsx:589-599` | 1 h |
| 11 | `PASTILLE_COLORS` hex hardcodés + `text-[11px]` contraste 4.1:1 (WCAG AA fail) | P1 | Design | `RoomSegmentsPanel.tsx:63-66`, `ArchitectChatPanel.tsx:333` | 1h20 |
| 12 | Régression issue #4 lightbox + cleanup unmount issue #5 non couvertes auto | P1 | QA | E2E + RTL jsdom | 1 h |

**Effort total top 12** : ~13 h cumul.

---

## 4. Convergences entre audits (signal fort)

| Convergence | Agents | Implication |
|---|---|---|
| Stepper Étape 4 absent / cassure visuelle Étape 3→4 | @persona (GP8 FAIL) + @design | P0 confirmé — cassure documentée par 2 angles |
| Découvrabilité défaillante (feature invisible = inexistante) | @ux (Undo, empty state, hint bouton) + @persona (GP10 PARTIAL) | Pattern systémique sur Étape 4 |
| Touch targets < 44px | @ux (Undo FAB) + @design (toggle chat 32px) | WCAG 2.5.5 viole sur 2+ composants |
| Mot pivot métier `lot/pièce` tenu | @copy + @ux | PASS confirmé — pas de `polygone/zone/calque` JSX |
| Saisie marchand priorité respectée (dealer-confirmed) | @copy + @persona (GP4) + @ux (préf s32) | PASS confirmé — guardrail s32 effectif |
| Reality check VISUEL absent / canvas non audité | @design + @qa (snapshots figés s22-s28) + @ux | **Risque résiduel critique** — preuve visuelle Thomas live obligatoire |

---

## 5. Divergences entre audits (à arbitrer)

| Divergence | Position A | Position B | Arbitrage @moi |
|---|---|---|---|
| Bulk « Tout confirmer » Étape 3 | Persona P1 | UX non flag | **P1 confirmé** — préf valeur > effort |
| `animate-bounce` typing chat | Design P1 | UX/Persona non flag | **P1 confirmé** — préf hero fade global anti-cascade |
| `text-[11px]` WCAG | Design P1 | UX non détecté | **P1 confirmé** — fix `text-xs` 5 min |
| Tests SSE `useVisualsStream` | QA P0 | autres axes non flag | **P0 confirmé** — risque régression silencieuse type s33 commit `1da2d78` |
| Anglicisme `Upload` props internes | Copy P2 | non flag ailleurs | **P2 OK** — confiné code |

---

## 6. Plan d'actions s34 prioritisé (Lots cohérents)

| Lot | Périmètre | Effort | Dépendances |
|---|---|---|---|
| **A — Copy quick wins** | 5 Edits : `uploadez`→`déposez`, `rattrape l'état`→formulation pro, double libellé Régénérer pièces IA, etc. | **25 min** | Aucune — INDÉPENDANT |
| **B — UX P0 critiques** | Stepper Étape 4 (5 lignes) + boutons ↶/↷ FAB undo/redo + empty state canvas + hint conditionnel bouton « Générer » | **3-4 h** | Aucune — parallèle Lot A |
| **C — Design tokens + WCAG** | `--color-info` token + `PASTILLE_COLORS` tokenisés + `text-[11px]`→`text-xs` + toggle chat 44px + `focus-visible` + `animate-bounce`→spinner SVG | **2 h 45** | Lot A + B |
| **D — QA infra** | Pre-commit Vitest + scripts `package.json` + `.husky/pre-commit` + CI GitHub Actions + branch protection | **1 h 30** | Aucune — parallèle |
| **E — QA tests régression** | Tests unit `useVisualsStream` (12-16 cas SSE+polling) + E2E lightbox issue #4 + RTL cleanup unmount issue #5 | **5 h** | Lot D |
| **F — UX P1 ergonomie** | Bulk « Tout confirmer » + toast 5s→8s + suppression pièce avec toast Undo + sélecteur nb visuels footer | **5 h** | Lot B |
| **G — Reality check Thomas live** | Smoke test bout-en-bout PDF Muguets prod mobile : R+1, 8 pièces, 5 visuels/pièce, lightbox, refine | **30 min Thomas** | Tous lots A→F |

**Total** : ~17 h dev + 30 min Thomas. **Ordre** : A+D parallèle → B → C+F parallèle → E → G.

---

## 7. Verdict GO/NO-GO 10/10 par étape

### Étape 3 — Pièces : **NO-GO 10/10**
- Bloqueurs : Undo/Redo invisibles (préf s22 explicite), bulk « Tout confirmer » manquant (GP3+GP7 PARTIAL), `PASTILLE_COLORS` hex hors système.
- Score actuel 7.5/10, post-Lot A+B+C+F : 9/10 atteignable. 10/10 nécessite Lot G + zéro régression.

### Étape 4 — Visuels : **NO-GO 10/10**
- Bloqueurs : Stepper absent (GP8 FAIL), empty state canvas inexistant, bouton « Générer » grisé sans hint, anglicisme `uploadez`, jargon `rattrape l'état`, token `--color-info` undefined.
- Score actuel 7/10, post-Lot A+B+C+E+F : 9/10 atteignable. 10/10 nécessite Lot G + zéro régression visuelle.

### Verdict global s33 → s34 : **NO-GO 10/10. GO conditionnel après Lots A+B+C+D+E+F+G validés reality check.**

---

## 8. Risques résiduels & reality check Thomas live obligatoire

Audits statiques (Read/Grep) **ne couvrent PAS** :

1. **Canvas HTML5 RoomCanvas rendu réel** — overlays 40% opacity polygones non vérifiable sans screenshot 375px + 1280px. Action s34 : @design screenshots prod après Lot B+C, lecture visuelle Read() obligatoire.
2. **Latence prod SSE/polling** — `useVisualsStream` mocké en unit ≠ comportement Replit réel (proxy buffering, timeout 60s). Action s34 : E2E sur Replit avec 5 visuels x 8 pièces parcours bout-en-bout.
3. **Parcours mobile Thomas réel sur PDF Muguets** — audit persona statique a évalué le code, pas le terrain. Action s34 OBLIGATOIRE : Thomas envoie screenshots après Lot G, validation par preuve visuelle.
4. **Densité Étape 4 sur 768px** (placements + style + détails + chat ouvert) — risque surcharge non testé.
5. **Visuels IA réels** — confiance structurelle PASS, confiance visuelle terrain non évaluable sans génération réelle. Action s34 : audit visuel humain sur 3 premières générations s34 avant industrialisation.
6. **Concurrent modification** Étape 4 (2 onglets, refine simultané) — non testé, non documenté.

**Re-audit après Lot A+B+C+D+E+F** : recommandation @ux + @design + @qa + @persona réauditent ciblé sur 9 P0 fixés AVANT reality check Thomas Lot G. Sinon on reproduit le pattern « 2 patches réactifs sans audit exhaustif » (préf s32).
