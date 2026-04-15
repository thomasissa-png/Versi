# Plan d'orchestration — Versi Studio

> Dernière mise à jour : 2026-04-15
> Mode : Autopilot avec checkpoint après Phase 0
> Profil : V1-Production (toutes les gates)

<!-- SESSION: phases=1 tasks_prod=2 tasks_consult=0 -->

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

### Phase VS-1 — Conception (EN COURS)
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @ux | Parcours workflow 4 étapes + wireframes éditeur de plans | specs + brand | EN COURS |
| @design | Design system SaaS adapté Versi + compositions pages/étapes | brand + wireframes | EN COURS |
| @copywriter | UX writing (labels, messages, tooltips, onboarding) | brand + specs | EN ATTENTE |

### Phase VS-2 — Développement
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @fullstack | App complète (Next.js ou React/Vite) + intégrations IA | design + copy + specs | EN ATTENTE |
| @ia | Pipeline IA (extraction plans + génération visuels + agent architecte) | specs techniques | EN ATTENTE |
| @qa | Tests E2E + audit qualité | Code déployé | EN ATTENTE |

### Phase VS-3 — Visibilité (allégée)
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @seo | SEO technique minimal | Site développé | EN ATTENTE |
| @geo | GEO minimal | Site développé | EN ATTENTE |

### Phase VS-5 — Audit & Validation
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @reviewer | Revue croisée GO/NO-GO | Tous les livrables | EN ATTENTE |

## Décisions clés

| # | Décision | Justification |
|---|----------|---------------|
| 1 | Scope = workflow marchand uniquement (4 étapes) | Fondateur veut se concentrer sur le cœur avant monétisation. Les 3 autres personas de l'ancien Versimo sont exclus. |
| 2 | V1 sans auth/paiement/PDF | "Faisons plus simple. On implémente quand le cœur est au top." |
| 3 | Les fondateurs Versi = premiers utilisateurs | L'outil est testé en interne sur Versi Immobilier avant commercialisation. |
| 4 | Stack à challenger par l'équipe | Next.js probable (SaaS interactif) mais pas imposé. |
| 5 | Branding Versi (palette unique, pas de couleur d'accent par entité) | Cohérence écosystème 5 sites. |
| 6 | gpt-image-1.5 pour les visuels, GPT-4.1 pour l'extraction plans | Décision fondateur — modèle unique, pas de fallback. |
