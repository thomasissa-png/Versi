# Lessons Learned — Versi

> Capitalisation des apprentissages actifs. Entrées anciennes (TTL > 5 sessions OU > 90 jours) dans [`lessons-learned-archive.md`](./lessons-learned-archive.md). Patterns devenus règles stables dans `CLAUDE.md` + agents concernés.

**Cap commandement n°8** : 80 L — net-zero par session. Toute nouvelle entrée nécessite la migration d'une ancienne vers archive OU la promotion en règle d'agent.

---

## Patterns actifs non-promus en règle (sessions s22-s25)

Sessions 2026-04-17 → 2026-04-23. Ces patterns attendent soit promotion, soit consolidation, soit expiration TTL au prochain audit.

| Session | P | Pattern | Statut | Action prochaine |
|---|---|---|---|---|
| s21 | P1 | Filtrage clustering triple confiance (avg + min + count) | propagé `@ia` | TTL expire s26 → candidat archive |
| s21 | P1 | Pattern audit cross-agents 3 itérations (méthode canonique refonte) | propagé `@orchestrator` | Stable — garder en règle |
| s21 | P1 | Pattern typist it3 mini (< 80 L, code exact) | propagé `@orchestrator` | Stable |
| s21 | P1 | Anti-`route.continue()` Playwright (remplacer par `route.fulfill 404`) | propagé `@qa` | Stable |
| s22 | P0 | Reality check E2E avant GO PRODUCTION | promu `@qa` + `@moi` + `@reviewer` (s26) | Stable |
| s22 | P0 | Découvrabilité UI : feature invisible = inexistante | promu `@ux` + `@design` (s26) | Stable |
| s22 | P0 | Validation "10/10" visuelle obligatoire (comparaison pixel-par-pixel) | promu `@qa` + `@reviewer` (s26) | Stable |
| s22 | P2 | `@ia` briefs > 2000 mots = timeout quasi-garanti | promu `@ia` section "Gestion des timeouts" (s26) | Stable |
| s23 | P0 | Reality check E2E : UI ou DB read obligatoire (renforcée) | promu `@qa` (s26) | Stable |
| s23 | P0 | Agrégats calculés sur données RAFFINÉES (jamais brutes) | promu `@fullstack` + `@ia` (s26) | Stable |
| s23 | P1 | Sync représentations multiples : point source unique | promu `@fullstack` (s26) | Stable |
| s23 | P1 | "Fail fast, ask early" — 2 tentatives puis question | promu `_base-agent-protocol` (s26) | Stable |
| s23 | P1 | 10/10 objectif strict — technique adjacente si plafond | promu `@moi` + `@reviewer` (s26) | Stable |
| s23 | P1 | Ressources réelles fournies = reality check immédiat | propagé `CLAUDE.md s23` | Stable |
| s24 | P0 | Reality check E2E = route Next.js + DB + UI (pas CLI seul) | promu `@qa` + `@moi` (s26) | Stable |
| s24 | P0 | Pixel-parfait sur TOUS critères listés | promu `@reviewer` + `@moi` (s26) | Stable |
| s24 | P0 | Orchestrator teste lui-même, ne renvoie pas à Thomas | promu `@orchestrator` (s26) | Stable |
| s24 | P1 | Build prod = tsc sans filtre sur TOUT le projet | promu `@infrastructure` + `@qa` (s26) | Stable |
| s24 | P1 | Réponses orientées résultat + preuve (pas récit process) | promu `_base-agent-protocol` (s26) | Stable |
| s24 | P1 | Mot pivot métier UI — jargon substitué interdit | promu `@copywriter` + `@ux` (s26) | Stable |
| s25 | P0 | Canonicalisation pipeline refonte — sessions s25 à détailler au prochain commit | en-cours | Thomas tranche |

---

## Format d'ajout d'un learning

Ajouter une ligne dans le tableau ci-dessus uniquement si :
1. Le learning n'est pas déjà couvert par un commandement CLAUDE.md ou un agent
2. Une entrée plus ancienne est archivée en contrepartie (net-zero)
3. Le statut est suivi : `brut` → `propagé` → `stable` → `archive` (TTL)

Voir `project-context.md` section "Historique des interventions agents" pour le journal complet.
