# Workflow d'audit visuel des générations IA (RÈGLE CRITIQUE)

Extrait du CLAUDE.md — règles permanentes pour auditer les générations IA via les agents Versimo (Yann `@interior-architect`, Lucas `@ai-image-expert`, Camille `@paysagiste`).

## Contrainte technique — pas de WebFetch

Les 3 agents d'audit visuel n'ont **PAS accès à WebFetch**. Les outils disponibles sont définis par le `subagent_type` côté système — modifier le frontmatter `.md` ne change rien. Ces agents ne peuvent PAS fetcher des URLs HTTP. Conséquence : le parent doit pré-fetcher toutes les ressources.

## Architecture du workflow

Le **parent** (orchestrateur, utilisateur, session principale) est TOUJOURS responsable de :
1. Fetcher les logs JSON (API production ou requête SQL sur `vs_visuals` / `vs_rooms`)
2. Télécharger les images INPUT + OUTPUT en local
3. Passer les chemins locaux aux agents dans leur prompt de lancement

Les **agents d'audit** reçoivent :
- Un fichier JSON de metadata en chemin local
- Des images INPUT + OUTPUT en chemins locaux
- Ils lisent tout avec `Read` (qui fonctionne sur les images)

## Procédure de pré-fetch (AVANT de lancer un agent)

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

## Template de prompt

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

## Règles permanentes

- **JAMAIS lancer un agent d'audit sans pré-fetch** — il échouera ou inventera des observations
- **JAMAIS plus de 6 générations par session** — au-delà, timeout garanti
- **Les images pass1 (intermédiaires) ne sont PAS téléchargées par défaut** — uniquement sur demande de l'agent
- **Le dossier `audit-data/` est éphémère** — supprimer après audit, rapports persistent dans `docs/reviews/`
- **Si fetch échoue** → noter "image indisponible", l'agent s'adapte

## Agents d'audit disponibles

| Agent | Persona | Subagent type | Focus |
|---|---|---|---|
| Yann Duval | Architecte d'intérieur, 20 ans XP | `interior-architect` | Fidélité stylistique, composition, échelle, crédibilité pro |
| Lucas Moreau | Expert IA image, photographe pro | `ai-image-expert` | Préservation géométrie, lumière, ombres, photoréalisme |
| Camille Verdier | Paysagiste conceptrice, 15 ans XP | `paysagiste` | Extérieurs, jardins, végétaux, perspectives paysagères |

Importés depuis Versimo (projet parallèle avec 38+ sessions de maturité sur les prompts image).
