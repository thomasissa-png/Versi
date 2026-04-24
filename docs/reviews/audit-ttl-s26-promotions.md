# Audit TTL s26 — Rapport de promotions

**Date** : 2026-04-24
**Mission** : propager les règles s22/s23/s24 de `docs/claude-md-archive.md` vers leurs agents cibles. Tâche mécanique.

## Résultat global

**14/14 règles promues** (12 règles du tableau + 2 bonus). **3 fichiers modifiés** en Edit (10 déjà propagés antérieurement dans les agents lors de la migration archive→agents de la session s25).

## Détail des promotions

| # | Règle | Agent(s) cible(s) | Fichier | Statut | Note |
|---|---|---|---|---|---|
| 1 | Reality check E2E avant GO PROD (4/4 exigé) | `@qa`, `@moi` | qa.md L237-239, moi.md L54-55 | DÉJÀ PROPAGÉ (s25) | Section "Reality check E2E" présente dans qa.md + moi.md |
| 2 | Découvrabilité UI | `@ux`, `@design` | ux.md L28-30, design.md L32-34 | DÉJÀ PROPAGÉ (s25) | Section "Découvrabilité UI" présente dans ux.md + design.md |
| 3 | Validation 10/10 pixel-par-pixel | `@qa`, `@reviewer` | qa.md L245-247, reviewer.md L33-34 | DÉJÀ PROPAGÉ (s25) | Section "Validation 10/10" dans les 2 agents |
| 4 | `@ia` briefs > 2000 mots = timeout | `@ia` | ia.md L20-22 | DÉJÀ PROPAGÉ (s25) | Section "Gestion des timeouts — briefs > 2000 mots" déplacée tout en haut |
| 5 | UI ou DB read obligatoire | `@qa` | qa.md L241-243 | DÉJÀ PROPAGÉ (s25) | Section "UI ou DB read obligatoire" dans qa.md |
| 6 | Agrégats calculés sur données RAFFINÉES | `@fullstack`, `@ia` | fullstack.md L22-24, ia.md L24-26 | DÉJÀ PROPAGÉ (s25) | Section "Agrégats" présente dans les 2 agents |
| 7 | Sync représentations multiples | `@fullstack` | fullstack.md L26-28 | DÉJÀ PROPAGÉ (s25) | Section "Sync représentations multiples" dans fullstack.md |
| 8 | Mot pivot métier UI | `@copywriter`, `@ux` | copywriter.md L31-33, ux.md L32-34 | DÉJÀ PROPAGÉ (s25) | Section "Mot pivot" présente dans les 2 agents |
| 9 | "Fail fast, ask early" (2 tentatives puis question) | `_base-agent-protocol.md` | base L170-172 | **PROMU (s26)** | Ajouté dans section "Protocole d'escalade" |
| 10 | 10/10 objectif strict — technique adjacente | `@moi`, `@reviewer` | moi.md L57-58, reviewer.md L39-40 | DÉJÀ PROPAGÉ (s25) | Section "10/10 objectif strict" dans les 2 agents |
| 11 | Pixel-parfait sur TOUS les critères | `@reviewer`, `@moi` | reviewer.md L36-37, moi.md L60-61 | DÉJÀ PROPAGÉ (s25) | Section "Pixel-parfait" dans les 2 agents |
| 12 | Build prod = tsc sans filtre | `@infrastructure`, `@qa` | infrastructure.md L35 (nouveau), qa.md L249-251 | **PROMU (s26) infrastructure.md / DÉJÀ qa.md** | Ajout nouveau pour infrastructure (absent avant). qa.md déjà OK. |
| B1 | Orchestrator teste lui-même | `@orchestrator` | orchestrator.md section "Learnings s24" | DÉJÀ PROPAGÉ (s25) | Bloc "Learnings s24" présent |
| B2 | Résultat + preuve (pas récit process) | `_base-agent-protocol.md` | base L174-176 | **PROMU (s26)** | Ajouté dans section "Protocole d'escalade" |

## Fichiers modifiés en s26

1. `.claude/agents/infrastructure.md` — ajout section "Build prod = tsc sans filtre sur TOUT le projet" avant "Contraintes Replit"
2. `.claude/agents/_base-agent-protocol.md` — ajout de 2 sections dans "Protocole d'escalade" : "Fail fast, ask early" + "Réponses orientées résultat + preuve"
3. `docs/claude-md-archive.md` — statuts mis à jour `à promouvoir` → `PROMU s26 (fichier Lxx)` pour les 12 règles + 2 bonus
4. `docs/lessons-learned.md` — colonne "Statut" mise à jour : `propagé CLAUDE.md` → `promu @agent-X (s26)` + ajout 2 lignes (mot pivot, résultat+preuve)

## Stats

- **Règles auditées** : 14 (12 du tableau + 2 bonus)
- **Déjà propagées en s25** : 11/14 (79%)
- **Nouvelles promotions s26** : 3 (infrastructure tsc + base fail-fast + base résultat-preuve)
- **Échecs** : 0
- **Fichiers modifiés en Write/Edit** : 4 (infrastructure, _base-agent-protocol, claude-md-archive, lessons-learned)

## Conflits d'emplacement

Aucun conflit détecté. Les règles déjà propagées étaient dans des sections clairement identifiables (titres `### Xxx` + mention `Source sXX, voir docs/claude-md-archive.md`). La migration précédente (s25) a été propre.

## Recommandation de suite

1. **Archiver `docs/claude-md-archive.md`** au prochain audit TTL (session s27 ou s28) car toutes les règles sont maintenant dans les agents. Le fichier peut être déplacé vers `docs/claude-md-archive-s22-s24-archived.md` pour trace historique, puis la ligne de pointeur dans CLAUDE.md retirée.
2. **Vérifier la cohérence** au prochain passage @reviewer : les mêmes règles ne doivent plus apparaître dans plusieurs endroits (éviter duplication agent + archive).
3. **Commit propagation s26** : commit manuel par Thomas (pas par l'agent).

---
**Handoff → utilisateur**
- Fichiers modifiés : `.claude/agents/infrastructure.md`, `.claude/agents/_base-agent-protocol.md`, `docs/claude-md-archive.md`, `docs/lessons-learned.md`
- Décisions prises : promotion des 3 règles non-propagées, mise à jour statut des 11 déjà propagées
- Points d'attention : `docs/claude-md-archive.md` peut maintenant être archivé — toutes les règles sont dans les agents
- Prochaine étape : Thomas commit la propagation s26
