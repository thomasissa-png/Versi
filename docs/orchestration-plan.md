# Plan d'orchestration — Versi (versi.fr + versi-immobilier.fr)

> Dernière mise à jour : 2026-04-11
> Mode : Autopilot avec checkpoint après Phase 0
> Profil : V1-Production (toutes les gates)

<!-- SESSION: phases=5 tasks_prod=15 tasks_consult=1 -->

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
| @creative-strategy | Brand platform + personas + benchmark | project-context.md | TERMINÉ |
| @legal | Audit juridique (mentions légales, RGPD formulaire) | project-context.md | TERMINÉ |
| @product-manager | Specs fonctionnelles one-page + user stories | Après @creative-strategy | TERMINÉ |

### Phase 0b — Agents testeurs (après checkpoint Phase 0)
| Agent | Mission | Statut |
|-------|---------|--------|
| @agent-factory | Créer testeur-persona (investisseur Laurent) | TERMINÉ |
| @agent-factory | Créer testeur-client si applicable (à évaluer — B2B sans client du persona direct sur un site vitrine) | N/A — site vitrine sans client B2B direct |

### Phase 1 — Conception
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @ux | Parcours utilisateur + wireframes one-page | brand-platform.md + functional-specs.md | TERMINÉ |
| @design | Direction artistique + design system + page compositions | brand-platform.md | TERMINÉ |
| @copywriter | Brand voice + copy de la landing page complète | brand-platform.md + wireframes | TERMINÉ |

### Phase 2 — Développement
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @fullstack | Setup React + développement one-page complet | design-system + copy + wireframes | TERMINÉ |
| @qa | Tests E2E + audit qualité | Code déployé | EN ATTENTE |

### Phase 3 — Visibilité
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @seo | SEO technique + métadonnées + schema.org | Site développé | TERMINÉ |
| @geo | Visibilité LLM (GEO) | brand-platform + site | TERMINÉ |

### Phase 4 — Acquisition (allégée)
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @growth | Stratégie organique (LinkedIn, réseau, partenariats) | brand-platform + site | TERMINÉ |
| @social | Stratégie LinkedIn corporate | brand-platform | TERMINÉ |

### Phase 5 — Audit & Validation
| Agent | Mission | Dépendance | Statut |
|-------|---------|------------|--------|
| @reviewer | Revue croisée GO/NO-GO (32 gates) | Tous les livrables | TERMINÉ — GO CONDITIONNEL |
| @reviewer | Actions correctives G7 + G15 | Après revue | TERMINÉ |
| testeur-persona | Audit final GP1-GP10 | Site final corrigé | EN COURS |

---

## versi-immobilier.fr — Phases ajoutées (sessions s3-s5)

### Phase VI-0 — Stratégie & Specs (session s3)
| Agent | Mission | Statut |
|-------|---------|--------|
| @creative-strategy | Personas VI + brand platform VI | TERMINÉ |
| @legal | Audit juridique VI (Loi Hoguet, offre ferme 7j) | TERMINÉ |
| @product-manager | Specs fonctionnelles 10 pages | TERMINÉ |
| @copywriter | Copy complet 10 pages | TERMINÉ |
| @seo | SEO strategy VI | TERMINÉ |
| @geo | GEO strategy VI | TERMINÉ |
| @growth | Growth strategy VI | TERMINÉ |

### Phase VI-1 — Développement (sessions s3-s4)
| Agent | Mission | Statut |
|-------|---------|--------|
| @fullstack | Site complet 10 pages + serveur Express | TERMINÉ |
| @qa | 216 tests E2E Playwright | TERMINÉ |

### Phase VI-2 — Back office admin (session s5)
| Agent | Mission | Statut |
|-------|---------|--------|
| @product-manager | Specs back office (vi-backoffice-specs.md) | TERMINÉ |
| @fullstack | BDD PostgreSQL + API + frontend admin + migration | TERMINÉ |
| @design | Audit design back office (3 itérations : 6.3→8.2→9.5) | TERMINÉ |
| @qa | Audit QA back office (3 itérations : 5.5→7.4→9.2 GO) | TERMINÉ |
| @reviewer | Audit reviewer back office (7.4→8.8 GO CONDITIONNEL) | TERMINÉ |
| @moi | Audit fondateur back office (7.5 — "J'utilise après corrections") | TERMINÉ |

### Phase VI-3 — Blog (session s5)
| Agent | Mission | Statut |
|-------|---------|--------|
| @seo | Stratégie blog (vi-blog-strategy.md) | TERMINÉ |
| @growth | Évaluation blog (GO conditionnel) | TERMINÉ |
| @fullstack | Implémentation blog (BDD, API, admin, pages publiques) | TERMINÉ |

### Phase VI-4 — SEO/GEO pré-lancement (session s5)
| Agent | Mission | Statut |
|-------|---------|--------|
| @seo | Audit SEO final (versi.fr 7.5, VI 8/10) | TERMINÉ |
| @geo | Audit GEO final (versi.fr 8, VI 9/10) | TERMINÉ |
| orchestrator | Corrections SEO/GEO (og:image, sitemap, Schema, FAQ visible, favicons) | TERMINÉ |

### Phase VI-5 — Pré-déploiement (À FAIRE)
| Agent | Mission | Statut |
|-------|---------|--------|
| @qa | Tests E2E back office + blog | À FAIRE |
| @infrastructure | Déploiement Replit + DNS versi-immobilier.fr | À FAIRE |

## Décisions clés

| # | Décision | Justification |
|---|----------|---------------|
| 1 | React (pas Next.js) | Demande explicite du fondateur. Site statique one-page — SSR non nécessaire |
| 2 | Pas de @data-analyst en Phase 0 | Site vitrine = pas de KPI framework complexe. Analytics basique (formulaire contact) suffit |
| 3 | Pas de @ia | Aucune feature IA sur le site |
| 4 | Phase 4 allégée | Budget acquisition = 0€, site vitrine = pas de funnel AARRR |
| 5 | Profil V1-Production | Demande explicite du fondateur : 100% gates PASS |
