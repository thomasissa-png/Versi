<!-- GRADIENT-AGENTS-START -->
# Gradient Agents — 7 commandements

Chaque ligne de ce fichier coûte des tokens sur CHAQUE agent. Ne contient QUE les règles universelles.
Détails, gates, protocoles : voir `_base-agent-protocol.md`. Référence gates : voir `_gates.md`.

## 1. Contexte obligatoire

Avant toute action, lire `project-context.md`. S'il est absent : s'arrêter et demander à l'utilisateur de le remplir. Ne jamais commencer sans contexte validé.

## 2. Zéro invention de données

Ne JAMAIS inventer une donnée manquante. Signaler le manque, demander à l'utilisateur. Hypothèses acceptables uniquement si marquées `[HYPOTHÈSE : ...]` avec autorisation.

## 3. Écris d'abord, optimise ensuite (anti-timeout)

Le timeout vient d'un agent qui **lit trop avant d'écrire**. Règles :
- Max 10-15 Read/Grep avant le premier Write
- Write le squelette immédiatement, Edit les détails ensuite
- Max ~150 lignes par Write, sauvegarder au fur et à mesure
- Un fichier = un appel Write. Jamais plusieurs fichiers d'un coup

**Chaque prompt de lancement de sous-agent DOIT inclure** : `ANTI-TIMEOUT : écris le fichier IMMÉDIATEMENT après lecture. Write d'abord, Edit ensuite.`

## 4. Toujours déléguer aux agents spécialisés

Ne JAMAIS produire un livrable à la place d'un agent. Invoquer l'agent via `subagent_type`. Exceptions : éditions mineures, réponses aux questions, opérations git, modifications de project-context.md.

## 5. Mindset IA, pas équipe humaine

Calibrer sur la vélocité IA : V1 complète (pas MVP), parallélisation par défaut, plan par dépendances (pas sprints), ne jamais couper une feature "par manque de temps". Automatiser tout contenu récurrent.

Exception : si project-context.md mentionne une équipe humaine, adapter la calibration.

## 6. Pre-commit build check

Avant tout commit de code dans `src/` :
```bash
npx tsc --noEmit && npx next lint && npm run build
```
Si échec : corriger d'abord, ne PAS commiter.

## 7. Anti-inflation de ce fichier

Seuil dur : **120 lignes max** (enforced par hook pre-commit). Avant d'ajouter une ligne, se demander : "concerne-t-elle TOUS les agents ?" Si non → `_base-agent-protocol.md` ou l'agent concerné.

---

## Règles communes (condensé)

1. Travailler en français (sauf code)
2. Lire project-context.md + historique des interventions avant toute production
3. Zéro output générique — taillé pour CE projet
4. Handoff structuré obligatoire en fin de livrable
5. Mettre à jour l'historique des interventions après chaque livrable
6. Respecter les règles anti-timeout (commandement 3)
7. Objectif qualité : 100% gates PASS (30 gates G1-G30, voir `_gates.md`)
8. UTF-8 dans le code (é, è, à — jamais `\u00E9`)
9. Zéro mention de concurrent par nom dans les livrables client-facing
10. Actions Replit dans `REPLIT_ACTIONS.md` si modification code/config
11. Emails client-facing = brouillons obligatoires (jamais envoi direct)
12. Après tout renommage global (repo, branche par défaut, domaine, nom de projet), Grep l'ancien nom dans tous les fichiers et remplacer

## Routage agents

| Demande | Agent principal |
|---|---|
| Projet complet | @orchestrator |
| Code / dev | @fullstack |
| Stratégie | @creative-strategy |
| Specs / roadmap | @product-manager |
| UX / parcours | @ux |
| Design / UI | @design |
| Contenu / texte | @copywriter |
| SEO | @seo |
| Visibilité IA | @geo |
| Analytics | @data-analyst |
| Acquisition | @growth |
| Social media | @social |
| Vente | @sales-enablement |
| Tests / QA | @qa |
| Infrastructure | @infrastructure |
| IA / LLM | @ia |
| Juridique | @legal |
| Review qualité | @reviewer |
| Audit stratégique | @elon |
| Proxy fondateur | @moi |
| Créer un agent | @agent-factory |

Agents dans `.claude/agents/`. Multi-domaine → @orchestrator. Tâche ciblée → agent directement.

## Modèles

- **Opus** : orchestrator, agent-factory, reviewer, elon, fullstack, ia, qa, infrastructure, moi
- **Sonnet** : copywriter, creative-strategy, data-analyst, design, geo, growth, legal, product-manager, seo, social, ux

## Références

- Protocoles communs, conventions de chemin, mémoire organisationnelle : `_base-agent-protocol.md`
- Gates binaires G1-G30 + GP/GC + verdicts : `_gates.md`
- Protocole de test du framework : `_base-agent-protocol.md` section "Test du framework"
- Préférences fondateur : `docs/founder-preferences.md`
- Historique des sessions : `CHANGELOG.md`
<!-- GRADIENT-AGENTS-END -->

## Workflow d'audit visuel des générations (RÈGLE CRITIQUE)

Les agents d'audit visuel (Yann `@interior-architect`, Lucas `@ai-image-expert`, Camille `@paysagiste`) n'ont **PAS accès à WebFetch**. Les outils disponibles sont définis par le subagent_type côté système — modifier le frontmatter .md ne change rien. Ces agents ne peuvent PAS fetcher des URLs HTTP.

### Architecture du workflow

Le **parent** (orchestrateur, utilisateur, session principale) est TOUJOURS responsable de :
1. Fetcher les logs JSON (API production ou requête SQL sur `vs_visuals`/`vs_rooms`)
2. Télécharger les images INPUT + OUTPUT en local
3. Passer les chemins locaux aux agents dans leur prompt de lancement

Les **agents d'audit** reçoivent :
- Un fichier JSON de metadata en chemin local
- Des images INPUT + OUTPUT en chemins locaux
- Ils lisent tout avec `Read` (qui fonctionne sur les images)

### Procédure de pré-fetch (à exécuter AVANT de lancer un agent)

```
Étape 1 — Fetch des logs JSON
  Récupérer metadata des générations à auditer (API ou SQL)
  Sauvegarder dans audit-data/logs.json (Write)

Étape 2 — Pour chaque génération, télécharger les images
  Lire input_image_path et output_image_path du JSON
  curl / WebFetch / copy depuis storage
  Sauvegarder audit-data/gen-{id}-input.png et audit-data/gen-{id}-output.png

Étape 3 — Lancer l'agent avec les chemins locaux
  Le prompt DOIT contenir le chemin JSON + les chemins images
```

### Template de prompt pour lancer un audit

```
Audite les générations suivantes de Versi Studio.

Metadata : /home/user/Versi/audit-data/logs.json

Générations à auditer :
- #XX : style [nom]
  - Input : /home/user/Versi/audit-data/gen-XX-input.png
  - Output : /home/user/Versi/audit-data/gen-XX-output.png

Lis le JSON pour les prompts construits et metadata.
Lis les images avec Read. Note chaque génération sur ta grille 10 critères.
Produis le rapport dans docs/reviews/audit-visuel-[date]-[agent].md
Max 6 générations par audit.
```

### Règles permanentes

- **JAMAIS lancer un agent d'audit sans pré-fetch** — il échouera ou inventera des observations
- **JAMAIS plus de 6 générations par session** — au-delà, timeout garanti
- **Les images pass1 (intermédiaires) ne sont PAS téléchargées par défaut** — uniquement sur demande de l'agent
- **Le dossier `audit-data/` est éphémère** — supprimer après audit, rapports persistent dans `docs/reviews/`
- **Si fetch échoue** → noter "image indisponible", l'agent s'adapte

### Agents d'audit disponibles

| Agent | Persona | Subagent type | Focus |
|---|---|---|---|
| Yann Duval | Architecte d'intérieur, 20 ans XP | `interior-architect` | Fidélité stylistique, composition, échelle, crédibilité pro |
| Lucas Moreau | Expert IA image, photographe pro | `ai-image-expert` | Préservation géométrie, lumière, ombres, photoréalisme |
| Camille Verdier | Paysagiste conceptrice, 15 ans XP | `paysagiste` | Extérieurs, jardins, végétaux, perspectives paysagères |

Importés depuis Versimo (projet parallèle avec 38+ sessions de maturité sur les prompts image).
