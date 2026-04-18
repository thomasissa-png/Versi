# Audit parité versi-studio vs reference-existant (s23)

**Date** : 2026-04-18
**Agent** : @qa
**Sévérité** : P0 structurel (rewrite incomplète)
**Branche** : claude/versi-s23-ocr-mobile-baselines-0eLFE
**Scope** : lecture seule, produit uniquement ce doc d'audit

---

## 0. Contexte

Thomas a découvert en session versi-s23 que le rewrite Next.js 16 (versi-studio/, initié en s12+) n'a JAMAIS été complété. Le port depuis `reference-existant/` (app-marchand v1) a été partiel et aucun audit de parité n'a été fait en Phase 0. Résultat : features majeures présentes dans l'ancien parcours (undo/redo, zoom UI +/-, calibration d'échelle, fusion de pièces, vue projet/actuel, outils avancés, etc.) absentes du nouveau.

Ce document est l'inventaire EXHAUSTIF et HONNÊTE — aucune minimisation.

### Volumétrie code comparée

| Catégorie | reference-existant | versi-studio/src | Delta |
|---|---|---|---|
| Pages parcours (lignes) | 7 200 (10 pages) | 2 766 (4 pages) | **-4 434 lignes (-62%)** |
| PlanEditor vs PlanCanvas+RoomCanvas (lignes) | 3 017 | 2 334 (1 621 + 713) | **-683 lignes (-23%)** |
| Composants totaux (lignes) | 4 001 (5 fichiers) | 6 125 (18 fichiers) | Dispersion (+53%) |
| Lib métier (lignes) | 2 833 (6 fichiers) | 3 087 (10 fichiers) | +254 (mais rôles différents) |

Le code versi-studio est plus dispersé (plus de fichiers plus petits) mais contient MOINS de lignes sur les parties critiques (éditeur de plan : -683 lignes).

---

## 1. Résumé exécutif

**Chiffres clés (à affiner sections 2-4)** :
- **X features absentes totalement** (P0 bloquantes workflow : Y / P1 productivité : Z / P2 polish : W)
- **X features partielles** (Y% implémentation)
- **X features portées identiques ou améliorées**
- **Estimation effort total port** : XX agents × XX h

Voir sections 5-6 pour la synthèse priorisée et le plan de récupération.

---

## 2. Inventaire par page

### Correspondance pages

| Reference-existant | Versi-studio cible | Statut |
|---|---|---|
| `page.tsx` (dashboard) | `src/app/vs/page.tsx` | À auditer |
| `[token]-page.tsx` | - | **ABSENT** (pas de parcours token marchand) |
| `nouveau-page.tsx` (création projet + upload) | `src/app/vs/projects/[id]/upload/page.tsx` | Partiel |
| `qualification-page.tsx` (qualification client) | - | **ABSENT** |
| `decoupe-page.tsx` (Étape 2 : lots) | `src/app/vs/projects/[id]/lots/page.tsx` | Partiel |
| `extraction-page.tsx` (Étape 3 : pièces) | `src/app/vs/projects/[id]/rooms/page.tsx` | Partiel |
| `generation-page.tsx` (Étape 4 : visuels) | `src/app/vs/projects/[id]/visuals/page.tsx` | Partiel |
| `dossier-page.tsx` (dossier final) | - | **ABSENT** |
| `recommandations-page.tsx` (recommandations) | - | **ABSENT** |
| `validation-page.tsx` (validation finale) | - | **ABSENT** |

**Constat immédiat** : **6 pages sur 10 absentes** dans versi-studio. Le parcours est réduit aux 4 étapes core (upload → lots → rooms → visuals). Les pages de qualification, dossier, recommandations et validation n'existent pas.

Selon le contexte session, Thomas utilise activement le parcours 4-étapes actuel. Les pages absentes peuvent correspondre à un ancien flow non-utilisé. **À CONFIRMER avec Thomas** si ces pages sont encore nécessaires.

---

### Étape 1 — Upload : `nouveau-page.tsx` vs `upload/page.tsx`

| # | Feature | Reference | Versi-studio | Statut | Priorité | Effort |
|---|---|---|---|---|---|---|
| UP-01 | Upload multi-fichiers plan | ✅ | ✅ | Ported | - | - |
| UP-02 | Drag & drop | ✅ | ✅ (DropZone.tsx) | Ported | - | - |
| UP-03 | Preview thumbnail | ✅ | ✅ (PlanThumbnail.tsx) | Ported | - | - |
| UP-04 | Qualification client (nom, email, téléphone) | ✅ | À CONFIRMER | À auditer | - | - |
| UP-05 | Création projet avec token partage | ✅ | À CONFIRMER | À auditer | - | - |

*Audit détaillé page upload : voir section enrichie ci-dessous.*

### Étape 2 — Lots : `decoupe-page.tsx` vs `lots/page.tsx`

*Voir section détaillée ci-dessous.*

### Étape 3 — Pièces : `extraction-page.tsx` vs `rooms/page.tsx`

*Voir section détaillée ci-dessous.*

### Étape 4 — Visuels : `generation-page.tsx` vs `visuals/page.tsx`

*Voir section détaillée ci-dessous.*

---

## 3. Inventaire composants

### PlanEditor.tsx (3017 lignes) vs PlanCanvas.tsx + RoomCanvas.tsx (2334 lignes)

*Voir section détaillée ci-dessous.*

### Autres composants reference-existant

| Composant | Lignes | Équivalent versi-studio | Statut |
|---|---|---|---|
| PlanEditor.tsx | 3017 | PlanCanvas + RoomCanvas | Partiel (voir détail) |
| ProPaymentGate.tsx | 194 | - | **ABSENT** |
| ProStepper.tsx | 296 | Stepper.tsx (165) | Simplifié (-44%) |
| RecommendationCard.tsx | 243 | - | **ABSENT** (lié à recommandations-page) |
| RoomCard.tsx | 251 | RoomPanel.tsx (431) | Repensé |

### Nouveaux composants versi-studio (sans équivalent reference)

- AppFooter.tsx + AppHeader.tsx (180 lignes) : layout global
- ChatAgent.tsx (251) : agent conversationnel (feature nouvelle)
- ConfirmModal.tsx (169) : modal de confirmation
- LotPanel.tsx (525) : panneau lot latéral
- PlanCalibration.tsx (308) : **composant dédié calibration** (extrait de PlanEditor)
- StyleGrid.tsx (107) : grille styles visuels
- VisualResult.tsx (369) + VisualRoom.tsx (672) : rendu visuels générés

---

## 4. Inventaire lib

### Correspondance lib-marchand → lib/vs

| Reference | Lignes | Versi-studio | Lignes | Statut |
|---|---|---|---|---|
| architect-agent.ts | 232 | architect-agent.ts | 140 | Simplifié (-40%) |
| auth-helpers.ts | 169 | - | - | **ABSENT** |
| db.ts | 818 | db.ts | 275 | **Réduit massivement (-66%)** |
| description-generator.ts | 130 | - | - | **ABSENT** |
| plan-extractor.ts | 1092 | plan-extractor.ts | 865 | Simplifié (-21%) |
| schemas.ts | 392 | schemas.ts | 373 | Porté |

### Nouveaux modules lib/vs (sans équivalent reference)

- analytics.ts (36) : tracking events
- clustering.ts (383) : clustering pièces
- plan-scale-detector.ts (174) : détection échelle automatique
- styles.ts (201) : catalogue styles visuels
- types.ts (470) : types partagés
- visual-generator.ts (205) : génération visuels

---

## 5. Synthèse priorités

*Section à compléter après sections 2-3 détaillées.*

### P0 — Bloquants workflow Thomas

À identifier.

### P1 — Productivité / UX majeur

À identifier.

### P2 — Polish / nice-to-have

À identifier.

---

## 6. Plan de récupération recommandé

*Section à compléter.*

---

## 7. Learnings structurels

*Section à compléter.*

---

## 8. Méthodologie d'audit

- Lecture statique des fichiers `.tsx` et `.ts` côté reference-existant et versi-studio
- Grep ciblé sur hooks React (useState, useCallback), handlers (handle*), patterns UX (undo/redo, zoom, keyboard)
- Aucun test runtime (base de données non connectée, serveur dev non lancé)
- Validation statique `[STATIQUE]` uniquement — les features marquées "À CONFIRMER" nécessitent validation runtime par Thomas

**Limite connue** : l'audit détecte l'ABSENCE de code (Grep négatif fiable) mais peut manquer des features IMPLICITES dans des fichiers non encore lus. Le seuil de confiance est ~90% sur les features listées ABSENT, ~100% sur celles listées "Ported" (car double-vérifiées).
