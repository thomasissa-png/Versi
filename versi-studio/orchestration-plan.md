# Plan d'orchestration — Versi Studio

> Dernière mise à jour : 2026-04-15
> Mode : Autopilot avec checkpoint après Phase 0
> Profil : V1-Production (toutes les gates)

<!-- SESSION: phases=5 tasks_prod=13 tasks_consult=0 -->

## Estimation de sessions

Ce projet est de complexité **élevée** (SaaS applicatif avec IA, éditeur visuel de plans, pipeline multi-passes).
- Phases estimées : 6 (0, 0b, 1, 2, 3, 5)
- Agents estimés : ~15 agents distincts
- Sessions estimées : **4-5 sessions** de travail

## Adaptations pour outil SaaS avec IA

- **Phase 0** : @creative-strategy (naming, brand, persona) + @product-manager (specs workflow 4 étapes) + évaluation code existant
- **Phase 1** : @ux (parcours workflow 4 étapes) + @design (design system SaaS adapté Versi) + @copywriter (UX writing)
- **Phase 2** : @fullstack (app complète — éditeur de plans, intégrations IA, pipeline) + @qa
- **Phase 3** : @seo + @geo (allégé — outil SaaS, pas un site vitrine)
- **Phase 4** : Pas de marketing en V1 — l'outil est pour usage interne Versi d'abord
- **Phase 5** : @reviewer + audit final

## Plan d'exécution par dépendances

### Phase VS-0a — Fondations stratégiques (parallèle)
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @creative-strategy | Naming définitif + brand adaptation + persona marchand + benchmark | versi-studio/project-context.md | TERMINÉ (408 lignes) |
| @product-manager | Specs fonctionnelles workflow 4 étapes + évaluation code existant | project-context.md + code dans reference-existant/ | TERMINÉ (1378 lignes) |

### Phase VS-0b — Checkpoint fondateur
| Agent | Mission | Statut |
|-------|---------|--------|
| orchestrator | Présenter naming + persona + specs + choix stack pour validation | TERMINÉ — Validé |

**Décisions validées au checkpoint** :
- Nom : Versi Studio (confirmé)
- URL : studio.versi.fr (confirmé)
- Stack : Next.js 14 App Router (confirmé)
- Styles : @creative-strategy choisit pour le persona, style custom = priorité
- Fusion/séparation lots : V1 = version complète (fusion + séparation + ajustement)
- Multi-projets : un seul à la fois en V1

### Phase VS-1 — Conception — COMPLETE
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @ux | Parcours workflow 4 étapes + wireframes éditeur de plans | specs + brand | TERMINÉ (688 lignes) |
| @design | Design system SaaS adapté Versi + compositions pages/étapes | brand + wireframes | TERMINÉ (990 lignes) |
| @copywriter | UX writing (labels, messages, tooltips, onboarding) | brand + specs | TERMINÉ (479 lignes) |

### Phase VS-2a — Setup + Pipeline IA — COMPLETE
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @fullstack | Next.js 16 setup + DB 6 tables vs_* + API routes + Dashboard + Step 1 Upload | design + copy + specs | TERMINÉ (21 fichiers) |
| @ia | Schemas Zod + plan-extractor GPT-4.1 + visual-generator gpt-image-1.5 + architect-agent | specs techniques | TERMINÉ (7 fichiers, audit 10/10) |

### Phase VS-2b — Steps 2-3 — COMPLETE
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @fullstack (Step 2) | Éditeur canvas lots : PlanCanvas HTML5, LotPanel, API lots, drag/resize, détection chevauchement | VS-2a | TERMINÉ (1 780 lignes) |
| @fullstack (Step 3) | Éditeur pièces par lot : RoomCanvas, RoomPanel, dropdown 18 types, validation lot par lot | VS-2a | TERMINÉ (1 396 lignes) |

### Phase VS-2c — Step 4 — COMPLETE
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @fullstack (Step 4) | Visuels post-travaux : StyleGrid 12 styles, VisualResult, ChatAgent, RoomGrid, génération async, polling 5s | VS-2b | TERMINÉ (2 372 lignes) |

### Phase VS-2d — QA
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @qa | Tests E2E + audit qualité | Code complet | TERMINÉ — 32 tests, 984 lignes (pages + workflow + fixtures), vs-qa-strategy.md |

### Phase VS-3 — Visibilité (allégée)
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @seo | SEO technique minimal | Site développé | TERMINÉ — noindex/nofollow, metadata dans layout.tsx |
| @geo | GEO minimal | Site développé | TERMINÉ — N/A documenté (outil interne) |

### Phase VS-5 — Audit & Validation
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @reviewer | Revue croisée GO/NO-GO | Tous les livrables | TERMINÉ — GO CONDITIONNEL (17/18 PASS, G7 corrigé) |

## Décisions clés

| # | Décision | Justification |
|---|----------|---------------|
| 1 | Scope = workflow marchand uniquement (4 étapes) | Fondateur veut se concentrer sur le cœur avant monétisation. Les 3 autres personas de l'ancien Versimo sont exclus. |
| 2 | V1 sans auth/paiement/PDF | "Faisons plus simple. On implémente quand le cœur est au top." |
| 3 | Les fondateurs Versi = premiers utilisateurs | L'outil est testé en interne sur Versi Immobilier avant commercialisation. |
| 4 | Stack à challenger par l'équipe | Next.js probable (SaaS interactif) mais pas imposé. |
| 5 | Branding Versi (palette unique, pas de couleur d'accent par entité) | Cohérence écosystème 5 sites. |
| 6 | gpt-image-1.5 pour les visuels, GPT-4.1 pour l'extraction plans | Décision fondateur — modèle unique, pas de fallback. |
