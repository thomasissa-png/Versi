# Plan d'orchestration — Versi Immobilier (versi-immobilier.fr)

> Dernière mise à jour : 2026-04-10
> Mode : Autopilot avec checkpoint après Phase 0
> Profil : V1-Production (toutes les gates)
> Scope : docs/strategy/vi-*, docs/product/vi-*, docs/ux/vi-*, docs/design/vi-*, docs/copy/vi-*

<!-- SESSION: phases=7 tasks_prod=20 tasks_consult=2 -->

## Estimation de sessions

Ce projet est de complexité **moyenne-haute** (site multi-pages opérationnel, showcases, formulaires multiples, 3 personas).
- Phases estimées : 6 (0, 1, 2, 3, 4, 5)
- Agents estimés : ~14 agents distincts
- Sessions estimées : **3-4 sessions** de travail

## Adaptations pour site opérationnel marchand de biens

- **Phase 0** : @creative-strategy (positionnement MDB spécifique) + @product-manager (specs multi-pages) + @legal (conformité MDB)
- **Phase 0b** : @agent-factory (testeur-persona Sophie — vendeuse)
- **Phase 1** : @ux (parcours 3 personas) + @design (compositions multi-pages) + @copywriter (copy opérationnel)
- **Phase 2** : @fullstack (développement multi-pages) + boucle visuelle + @qa
- **Phase 3** : @seo (SEO opérationnel — acquisition volume cette fois) + @geo
- **Phase 4** : @growth + @social (pas de @sales-enablement — site vitrine opérationnel, pas SaaS)
- **Phase 5** : @reviewer + testeur-persona Sophie

## Plan d'exécution par dépendances

### Phase 0 — Fondations stratégiques
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @creative-strategy | Positionnement Versi Immobilier, personas affinés, benchmark MDB | project-context.md (scope V2) | **DONE** (benchmark 176L + personas 500L + brand-platform 346L) |
| @product-manager | Specs fonctionnelles multi-pages, user stories, architecture info | Après @creative-strategy | **DONE** (1216L, 10 pages, 15 user stories) |
| @legal | Audit juridique spécifique MDB (pub immobilière, RGPD formulaire vendeur) | project-context.md | **DONE** (426L, 8 blocages identifiés) |

### Phase 0b — Agent testeur
| Agent | Mission | Statut |
|-------|---------|--------|
| @agent-factory | Créer testeur-persona Sophie (vendeuse 42 ans) | EN ATTENTE |

### Phase 1 — Conception
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @ux | Parcours utilisateur 3 personas + wireframes multi-pages | vi-brand-platform + vi-functional-specs | **DONE** (1446L) |
| @design | Compositions de pages (10 pages) + variante design system entité | vi-brand-platform + vi-wireframes | **DONE** (315L) |
| @copywriter | Copy complet toutes pages | vi-brand-platform + vi-wireframes + brand-voice.md | **DONE** (1009L) |

### Phase 2 — Développement
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @fullstack | Développement multi-pages complet + boucle visuelle | vi-design + vi-copy + vi-wireframes | **DONE** (37 fichiers, build clean) |
| @qa | Tests E2E + audit qualité | Code déployé | EN ATTENTE |

### Phase 3 — Visibilité
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @seo | SEO technique + local + mots-clés MDB | Site développé | **DONE** (870L) |
| @geo | Visibilité LLM Versi Immobilier | vi-brand-platform + site | **DONE** (615L) |

### Phase 4 — Acquisition (allégée)
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @growth | Stratégie acquisition vendeurs + partenaires | vi-brand-platform + site | **DONE** (456L) |
| @social | Stratégie LinkedIn opérationnel | vi-brand-platform | **DONE** (218L) |

### Phase 5 — Audit & Validation
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @reviewer | Revue croisée GO/NO-GO (32 gates) | Tous les livrables | **DONE** — GO CONDITIONNEL |
| @copywriter | Review copy code vs docs (vi-copy-review.md) | Code déployé | **DONE** (8,2/10 → corrections P0+P1 appliquées) |
| @design | Review design (vi-design-review.md) | Code déployé | **DONE** (6,7/10 → corrections appliquées) |
| @creative-strategy | Review stratégie (vi-creative-review.md) | Code déployé | **DONE** (7,5/10 → corrections appliquées) |
| Re-review Round 2 | Audit croisé post-corrections (vi-re-review-round2.md) | Corrections appliquées | **DONE** (9,0/10 GO CONDITIONNEL) |
| testeur-persona | Audit Sophie GP1-GP10 | Site final | EN ATTENTE (post-corrections) |

## Décisions clés

| # | Décision | Justification |
|---|----------|---------------|
| 1 | React + Vite (même stack que versi.fr) | Cohérence monorepo, design system partagé |
| 2 | Multi-pages (pas one-page) | Site opérationnel avec showcases, listings, formulaires spécialisés |
| 3 | Versi Immobilier d'abord, Versi Invest ensuite | Demande explicite du fondateur |
| 4 | Design system partagé avec variante entité | Architecture Endorsed Brand — même tokens, accent possible différent |
| 5 | Placeholders photos/chiffres projets | Données réelles à venir, structure facile à alimenter |
| 6 | Page "Investir" = passerelle vers versi-invest.fr | Cross-selling entre entités |
| 7 | Profil V1-Production | Demande explicite du fondateur : 100% gates PASS |
| 8 | Hero fade global 300ms (pas cascade) | Aligné sur pattern validé versi.fr — fondateur a rejeté cascade 6 éléments |
