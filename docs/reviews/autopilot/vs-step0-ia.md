# Audit @ia — Etape 0 Dashboard

**Fichier audite** : `versi-studio/src/app/vs/page.tsx` (383 lignes)
**Date** : 2026-04-16
**Contexte** : dashboard listant les projets Versi Studio. Pas d'appel IA direct — mais declenche la chaine IA downstream via la creation de projet.

---

| # | Critere | Note /10 | Justification | Correction (si < 10) |
|---|---|---|---|---|
| C1 | Donnees bien structurees pour IA | 8/10 | Les champs `adresse`, `type_bien` (enum via TYPE_BIEN_OPTIONS), `surface_totale` sont typés et validés. `type_bien` en enum = excellent pour prompt conditionnel downstream (immeuble vs maison vs appartement → prompts specialisés). Adresse trim + minLength 5. Mais : pas de normalisation d'adresse (BAN API), pas de capture du code postal/ville separé — un LLM downstream qui veut geolocaliser devra re-parser. Surface optionnelle acceptable. | Optionnel (post-V1) : integrer l'API BAN (adresse.data.gouv.fr) pour normaliser l'adresse a la saisie et extraire code_postal/ville/coordonnees en champs distincts. Benefice : prompts downstream plus precis (contexte geo), reduction hallucinations sur ville ambigue. |
| C2 | Gestion async IA-ready | 10/10 | Status initial `draft` clair, enum de progression (`draft` → `step_1_complete` → `step_2_complete` → `step_3_complete` → `completed`) parfaitement adaptee a un pipeline IA multi-etapes. Apres creation, redirection immediate vers `/upload` (etape suivante du pipeline). Le dashboard ne bloque JAMAIS en attendant un traitement IA — il prepare le terrain puis delegue. AbortController sur fetch = nettoyage propre. | — |
| C3 | Pas de dependance IA bloquante | 10/10 | Zero import OpenAI/Anthropic/Replicate dans ce fichier. Aucun appel `/api/ai/*`. Si OpenAI est down, ce dashboard fonctionne a 100% (liste, creation, navigation). L'IA n'intervient qu'apres upload des plans (etapes downstream). Architecture parfaite : separation stricte CRUD vs pipeline IA. | — |
| C4 | Cout/tokens maitrise | 10/10 | Zero appel LLM sur cette page. Zero embedding. Zero classification IA sur la saisie (ex: on aurait pu etre tente de "deviner le type_bien depuis l'adresse via GPT" → ici c'est un select manuel, cout 0 et qualite superieure). Cout marginal par affichage dashboard = 0€. | — |
| C5 | Telemetrie IA | 6/10 | Aucun hook de tracing (pas de PostHog, pas de Langfuse, pas de correlation_id genere a la creation du projet). Le `project.id` peut servir de trace_id downstream, mais aucun event n'est emis ici ("project_created", "pipeline_started"). Si un probleme survient en aval du pipeline IA, on ne pourra pas correler facilement au moment de creation. Gate requise par @ia en production. | Ajouter a la creation reussie (dans `handleProjectCreated`) un event telemetrie : `track('vs_project_created', { project_id, type_bien, has_surface })`. Ce trace_id sera ensuite propage dans chaque appel LLM downstream (Langfuse session_id = project_id). Cela permet : (1) coût IA par projet, (2) correlation erreurs upload→analyse→generation, (3) funnel d'abandon par etape du pipeline. Si PostHog deja integre au projet → 5 lignes. Sinon → a ajouter dans `docs/ia/ai-architecture.md` section observabilite. |

---

**Score global** : 8.8/10 (44/50)

**Top 3 corrections** :
1. **[P1 — C5]** Ajouter event telemetrie `vs_project_created` avec `project.id` comme trace_id pipeline. Prerequis pour observabilite IA downstream (coût par projet, correlation d'erreurs multi-etapes).
2. **[P2 — C1]** Normaliser l'adresse via API BAN (adresse.data.gouv.fr) a la saisie. Ameliore la qualite des prompts downstream (geolocalisation, contexte marche local) et reduit les hallucinations sur adresses ambigues. Post-V1 acceptable.
3. **[P3 — C1]** Exposer `code_postal` et `ville` en champs separes (derives de BAN ou saisie manuelle) pour que les prompts downstream n'aient pas a re-parser l'adresse brute.

**Verdict** : GO. Le dashboard est parfaitement IA-ready sur l'essentiel (C2, C3, C4 = 10/10). Les deux faiblesses (telemetrie absente, adresse non normalisee) sont des optimisations, pas des bloquants pour l'etape 0. Le choix fort : aucune IA sur le dashboard = coût 0 + fiabilité max + pipeline clairement delegué aux etapes downstream. C'est exactement ce qu'on veut voir sur un ecran d'entree.

---

**Handoff → @orchestrator**
- Fichier produit : `docs/reviews/autopilot/vs-step0-ia.md`
- Decisions prises : dashboard valide IA-ready (8.8/10). Ajouter telemetrie `vs_project_created` avant de brancher le pipeline IA downstream (prerequis observabilite).
- Points d'attention : la telemetrie (C5) devient BLOQUANTE des que l'etape 1 (analyse IA des plans) est implementee — a planifier en meme temps que le premier appel LLM du pipeline.
