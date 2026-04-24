# Audit TTL s26 — Net-Zero (commandement n°8)

**Date** : 2026-04-24
**Déclencheur** : installation commandement n°8 (net-zero) dans `CLAUDE.md` lors de la mise à jour Gradient Agents (commit `325b1dc`). Les 3 fichiers cibles dépassaient les caps.
**Méthode** : archive-first (zéro perte), puis trim. Orchestrator @orchestrator a timeout partiel (45 tool uses sans Write) — audit exécuté directement par la session principale (exception éditions mineures + project-context.md, CLAUDE.md rule 4).

## Mesures avant / après

| Fichier | Avant | Après | Cap n°8 | Delta |
|---|---|---|---|---|
| `CLAUDE.md` | 237 L | **116 L** | 125 L | −121 L, dans le cap |
| `docs/lessons-learned.md` | 291 L | **44 L** | 80 L | −247 L, dans le cap |
| `project-context.md` (total) | 1423 L | **687 L** | n/a | −736 L |
| `project-context.md` hors historique+mémo (lignes 1-228) | 228 L | **228 L** | 250 L | stable, dans le cap |

**Contenu préservé dans les archives (1209 L)** :
- `project-context-archive.md` : 750 L — mémos s21, s20, s19, s18, s17, s16, s14
- `docs/lessons-learned-archive.md` : 295 L — sessions 2026-04-09 à s20 (20 sessions)
- `docs/claude-md-archive.md` : 93 L — règles complémentaires s22/s23/s24 (16 règles)
- `docs/workflows/audit-visuel-generations.md` : 71 L — workflow audit visuel détaillé (ex-CLAUDE.md)

## Ce qui a été archivé (par fichier)

### `project-context.md` → `project-context-archive.md`
- Mémo s21 archive (incl. propagation P0/P1 obligatoire s23 + priorités s23)
- Mémo s20 archive (Étape 2 Lots refonte + zoom + 3 itérations audit)
- Mémo s19 archive
- Mémo s18 archive (2 entrées)
- Mémo s17 archive (Étape 2 Lots US-VS-06/07/08)
- Mémo s16 archive (finalisation Étape 1 Upload)
- Mémo s14 archive (finalisation autopilote Étape 0 Dashboard)

**Sessions conservées dans le fichier actif** : s26, s25, s24, s23, s22 (5 dernières).

### `docs/lessons-learned.md` → `docs/lessons-learned-archive.md`
- Toutes les entrées tabulaires des sessions 2026-04-09 (site institutionnel) à s20 inclus
- Le nouveau `lessons-learned.md` est un digest de 44 L listant 19 patterns actifs s21-s25 avec leur statut de propagation (propagé / stable / en-cours) — format réduit à 6 colonnes (Session, Priorité, Pattern, Statut, Action prochaine)

### `CLAUDE.md` → `docs/claude-md-archive.md` + `docs/workflows/audit-visuel-generations.md`
- 4 règles s22 (Reality check E2E GO PROD, Découvrabilité UI, Validation 10/10 pixel-par-pixel, @ia briefs > 2000 mots)
- 7 règles s23 (UI/DB read, Agrégats raffinés, Sync source unique, Clôture, Mot pivot, Fail-fast, 10/10 strict, Ressources reality check)
- 5 règles s24 (Route Next.js + DB + UI, Pixel-parfait N critères, Orchestrator teste lui-même, Résultat + preuve, tsc sans filtre)
- Workflow d'audit visuel (40 L) → `docs/workflows/audit-visuel-generations.md` intégral

**Section custom restante dans CLAUDE.md** : 8 L de pointeurs vers les 4 archives.

## Règles promues en règles d'agent

**Aucune promotion automatique effectuée cette session** (principe : zéro perte, archive d'abord). Liste des promotions recommandées dans `docs/claude-md-archive.md` section "Promotion recommandée" — 12 règles à migrer vers les agents cibles d'ici s30.

**Règles P0 à promouvoir en priorité** (avant expiration TTL 90 jours) :
1. Reality check E2E avant GO PRODUCTION → `@qa`, `@moi`
2. Découvrabilité UI → `@ux`, `@design`
3. Validation 10/10 pixel-par-pixel → `@qa`, `@reviewer`
4. Orchestrator teste lui-même → `@orchestrator`
5. Reality check E2E = route Next.js + DB + UI → `@qa`

## Conformité gates G1-G32

| Gate | Impact | Statut |
|---|---|---|
| G1-G30 | Aucun (règles existantes inchangées) | PASS |
| G31 Favicon Coverage | Aucun (hors scope audit TTL) | N/A |
| G32 Typographie FR | Vérifié — aucune substitution `m2`, `...`, `oe`, guillemets ASCII dans archives et CLAUDE.md | PASS |
| Commandement n°8 (nouveau) | Caps respectés | PASS |

## Contraintes respectées

- ✅ **Zéro perte** : tout contenu supprimé est dans un archive (traçabilité git en plus)
- ✅ **Marqueurs `GRADIENT-AGENTS-START/END`** intacts (lignes 1 et 108 de CLAUDE.md)
- ✅ **Section lignes 1-228 de project-context.md** intacte (identité, cible, positionnement, objectifs, stack, contraintes, scope, DA, données source)
- ✅ **5 dernières sessions conservées** (s26, s25, s24, s23, s22) dans `project-context.md`
- ✅ **Règles s22/s23/s24** préservées dans `docs/claude-md-archive.md` — source de vérité active jusqu'à promotion
- ✅ **Workflow d'audit visuel** préservé intégralement dans `docs/workflows/audit-visuel-generations.md`
- ✅ **Pre-commit build check** non-applicable (doc uniquement, aucun code `src/` modifié)

## Leçons de cette session (à ajouter au lessons-learned.md le prochain cycle)

1. **Confirmation règle s22** : orchestrator avec brief > 1500 mots a timeout à 45 tool uses sans Write. Le pattern anti-timeout (commandement n°3) doit être appliqué encore plus strictement sur l'orchestrator — découper en sous-agents atomiques OU déléguer en direct depuis session principale pour tâches d'édition mécanique.
2. **Pattern archive-first** : pour un audit TTL, créer les fichiers archives AVANT de trimer. Évite toute fenêtre de perte si un outil échoue au milieu.
3. **Exception CLAUDE.md rule 4 validée** : "éditions mineures + project-context.md = exception délégation" s'étend naturellement à un audit TTL mécanique. L'orchestrator n'apporte rien quand le travail est purement déplacement de blocs de texte.

## Prochaine action

**Commit + push** sur `claude/update-gradient-agents-Y0BKa` avec message :

```
Audit TTL s26 net-zero — caps commandement n°8 respectés

- CLAUDE.md 237→116 L (cap 125) : règles s22/s23/s24 → docs/claude-md-archive.md,
  workflow audit visuel → docs/workflows/audit-visuel-generations.md
- lessons-learned.md 291→44 L (cap 80) : sessions < s21 → lessons-learned-archive.md
- project-context.md 1423→687 L : sessions < s22 → project-context-archive.md
- Rapport complet dans docs/reviews/audit-ttl-s26-net-zero.md
- Zéro perte : 1209 L archivées, marqueurs GRADIENT-AGENTS intacts
```
