# Plan d'orchestration — s25 refonte pipeline étape 1 (reformatage plan)

## Contexte

Après reality check s24+s25 sur prod Replit, Thomas constate :
- Rooms étape 3 mal positionnées, formes bizarres, espaces vides, "ne lit pas le plan"
- Lots étape 2 parfois dupliqués/fantômes
- Pipeline IA actuel (passe-1 + passe-2 + passe-3 + passe-4 envelope + passe-5 tiling + snap-to-label) plafonne à ~9.35/10 sur P00 et beaucoup moins sur plans complexes type haussmannien réel

Verdict Thomas : "fais le nécessaire pour que ce soit la meilleure solution marché pour marchand de biens. Si faut reformater, autant commencer par ça. Mieux vaut être nickel."

## Objectif stratégique

Refondre le pipeline étape 1 pour **reformater/canonicaliser le plan à l'upload** avant toute extraction IA. Un plan canonicalisé = représentation simplifiée et prévisible → extraction IA fiable 10/10.

## Constitution équipe agents

| Phase | Agent | Rôle |
|---|---|---|
| 0 | @product-manager | Vision produit + specs fonctionnelles + user stories refonte |
| 0 | @creative-strategy | Benchmark marché concurrents floorplan AI + positionnement Versi |
| 0 | @ia | POC technique 3 approches (pré-rendu IA / CV classique / hybride) |
| 1 | @moi | Arbitrage approche basé sur les 3 livrables |
| 2 | @ux | Flow utilisateur étape 1 refonte |
| 2 | @ia | Implémentation pipeline choisi |
| 2 | @fullstack | Route API + UI + persist `plan_canonicalise` en DB |
| 2 | @qa | Tests E2E + reality check multi-plans |
| 3 | @moi | Gate GO PRODUCTION |

## Phases

### Phase 0 — Cadrage parallèle (session actuelle)

3 briefs lancés en parallèle (Task concurrentes) :
- PM → specs
- Creative strategy → benchmark
- @ia → POC technique

Durée estimée : 20-40 min selon complexité POC.

### Phase 1 — Décision approche

@moi synthétise les 3 livrables et tranche. Critères :
1. Qualité sortie (fidélité géométrique du plan canonicalisé)
2. Coût ($ + temps de traitement)
3. Robustesse (taux d'échec sur plans variés)
4. Impact persona Thomas (qu'apporte chaque approche à son métier)

### Phase 2 — Implémentation

Selon approche retenue :
- Nouvelle étape dans pipeline upload (pre-passe)
- Modification `extract/route.ts` pour consommer le plan canonicalisé
- UI étape 1 : affichage plan original + plan canonicalisé avec toggle
- Feature flag `VS_PLAN_CANONICALIZE` pour rollback facile
- Migration DB : ajout colonne `canonicalized_image_path` dans `vs_plans`

### Phase 3 — Validation

- Reality check E2E sur 4-6 plans variés (P00-P03 + plan Thomas "10 Rue des Muguets" si fourni)
- Audit visuel @interior-architect (Yann Duval, grille 10 critères) sur les rooms produites
- Gate @moi GO PRODUCTION

## Critères de succès

- 10/10 sur les 4 critères Thomas (lot colle, pièces couvrent tout, pas de déformation, visuel propre)
- Taux de succès ≥95% sur panel diversifié de plans (haussmannien, moderne, duplex, scan qualité variable)
- Temps total pipeline ≤90s (tolérance Replit 60s sur extract + canonicalize en parallèle)
- Coût/plan ≤$0.10 (~$0.05 actuel + $0.05 canonicalisation)

## Durée globale estimée

- Phase 0 : 30-60 min (session actuelle)
- Phase 1 : 15 min
- Phase 2 : 60-120 min (session actuelle ou suivante)
- Phase 3 : 30-45 min

Total : 2-4 heures si tout se déroule bien. Session s25 pourrait livrer Phase 0+1 seulement, Phase 2+3 en s26.

## Statut live

- [x] 2026-04-22 14h00 — Plan créé
- [ ] Phase 0 lancée
