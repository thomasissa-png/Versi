# Plan d'orchestration — Versi (versi.fr)

> Dernière mise à jour : 2026-04-08
> Mode : Autopilot avec checkpoint après Phase 0
> Profil : V1-Production (toutes les gates)

<!-- SESSION: phases=5 tasks_prod=14 tasks_consult=0 -->

## Phase 0 — COMPLETE
- @creative-strategy : TERMINÉ (brand-platform.md, personas.md, competitive-benchmark.md)
- @legal : TERMINÉ (legal-audit.md, mentions-legales-draft.md, privacy-policy.md, rgpd-checklist.md)
- @product-manager : TERMINÉ (product-vision.md, functional-specs.md)
- **Checkpoint validé** : tagline rejetée (trop corporate), ton recalibré (caractère + zéro bullshit), Sophie hors V1, reste confirmé

## Estimation de sessions

Ce projet est de complexité **moyenne** (site vitrine one-page, pas de backend/auth/BDD).
- Phases estimées : 5 (0, 1, 2, 3, 5 — Phase 4 allégée fusionnée avec Phase 3)
- Agents estimés : ~12 agents distincts
- Sessions estimées : **2-3 sessions** de travail

## Adaptations pour site vitrine institutionnel

Conformément au protocole (Variable 1b — Type de projet : Site vitrine) :
- **Phase 0** : allégée — @creative-strategy + @product-manager (specs légères, pas de roadmap SaaS) + @legal
- **Phase 1** : **coeur du projet** — @ux + @design + @copywriter (le contenu et le design SONT le produit)
- **Phase 2** : @fullstack (React statique one-page) + @qa
- **Phase 3** : @seo + @geo (SEO important pour visibilité institutionnelle)
- **Phase 4** : allégée — @growth (stratégie organique LinkedIn/réseau, pas de paid) + @social (LinkedIn corporate)
- **Phase 5** : @reviewer + revue finale page par page

## Plan d'exécution par dépendances

### Phase 0 — Fondations stratégiques
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @creative-strategy | Brand platform + personas + benchmark | project-context.md | EN COURS |
| @legal | Audit juridique (mentions légales, RGPD formulaire) | project-context.md | EN COURS |
| @product-manager | Specs fonctionnelles one-page + user stories | Après @creative-strategy | EN ATTENTE |

### Phase 0b — Agents testeurs (après checkpoint Phase 0)
| Agent | Mission | Statut |
|-------|---------|--------|
| @agent-factory | Créer testeur-persona (investisseur Laurent) | EN ATTENTE |
| @agent-factory | Créer testeur-client si applicable (à évaluer — B2B sans client du persona direct sur un site vitrine) | EN ATTENTE |

### Phase 1 — Conception
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @ux | Parcours utilisateur + wireframes one-page | brand-platform.md + functional-specs.md | EN ATTENTE |
| @design | Direction artistique + design system + page compositions | brand-platform.md | EN ATTENTE |
| @copywriter | Brand voice + copy de la landing page complète | brand-platform.md + wireframes | EN ATTENTE |

### Phase 2 — Développement
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @fullstack | Setup React + développement one-page complet | design-system + copy + wireframes | EN ATTENTE |
| @qa | Tests E2E + audit qualité | Code déployé | EN ATTENTE |

### Phase 3 — Visibilité
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @seo | SEO technique + métadonnées + schema.org | Site développé | EN ATTENTE |
| @geo | Visibilité LLM (GEO) | brand-platform + site | EN ATTENTE |

### Phase 4 — Acquisition (allégée)
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @growth | Stratégie organique (LinkedIn, réseau, partenariats) | brand-platform + site | EN ATTENTE |
| @social | Stratégie LinkedIn corporate | brand-platform | EN ATTENTE |

### Phase 5 — Audit & Validation
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @reviewer | Revue croisée GO/NO-GO (32 gates) | Tous les livrables | EN ATTENTE |
| @qa + @fullstack | Revue finale page par page (21 dimensions) | Après reviewer | EN ATTENTE |
| testeur-persona | Audit final GP1-GP10 | Site final corrigé | EN ATTENTE |

## Décisions clés

| # | Décision | Justification |
|---|----------|---------------|
| 1 | React (pas Next.js) | Demande explicite du fondateur. Site statique one-page — SSR non nécessaire |
| 2 | Pas de @data-analyst en Phase 0 | Site vitrine = pas de KPI framework complexe. Analytics basique (formulaire contact) suffit |
| 3 | Pas de @ia | Aucune feature IA sur le site |
| 4 | Phase 4 allégée | Budget acquisition = 0€, site vitrine = pas de funnel AARRR |
| 5 | Profil V1-Production | Demande explicite du fondateur : 100% gates PASS |
