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
| s26 | P0 | **Sandbox Claude Code = "DNS cache overflow" 18 B 503** sur domaines non-whitelistés (google, drive, leboncoin, microsoft, ...). Confondu 6 fois cette session avec de vrais bugs prod (versi.fr/versi-immobilier/Drive). Toujours **distinguer** via body curl : 18 B `text/plain` "DNS cache overflow" = sandbox bloque, sinon vrai 503. | brut | propager `_base-agent-protocol.md` reality-check |
| s26 | P0 | **Compléter ≠ remplacer** sur édition copy demandée. Quand Thomas dit "ajouter 3 mots Cashflow/TRI/CoC", garder TOUTE la phrase d'origine + ajouter les 3 mots. Réécrire = violation. | brut | `_base-agent-protocol.md` règle copywriter |
| s26 | P0 | **Reality check VISUEL pixel-par-pixel** (cmd n°7) violé 3 fois en s26 : (a) bloc metrics homepage versi-invest pondéré 80 mots vs autres steps 15 mots — pas vu avant push, (b) hero friedland-2eme-droite "Séjour après rénovation 2.JPG" = chambre vide parquet brut → catastrophe selon Thomas, (c) ProcessPage step 03 idem. À chaque fois corrigé après plainte Thomas. | brut | `@reviewer` + `@design` gate visuel pré-commit |
| s26 | P1 | **Pattern audit visuel @moi via Read multimodal direct** : copier photos vers `/tmp/<slug>.jpg` ASCII-only depuis sandbox NFC-bug, puis Read pour notation /10. Évite le bug NFD/NFC du Read tool sur sub-agents. Validé sur 9 photos audit P1+P2. | brut | `@moi` + `_base-agent-protocol.md` workflow audit visuel |
| s26 | P1 | **Architecture photos durable = pré-compilation locale + commit JPEG dans repo + sharp en devDep**. Pattern `generate-photos.js` (sharp 1600px q85) → `manifest.json` source de vérité → autoSeed prod ne fait QUE INSERT URLs (~1s). Solution au timeout Neon 57P01 (autoSeed > 60s avec resize au boot). | brut | `@fullstack` + `@infrastructure` |
| s26 | P1 | **Net-zero cmd n°8 enforced via archive-first** : avant trim CLAUDE.md/lessons-learned/project-context, créer fichier archive et copier le contenu, puis trim. Zéro perte garantie même si tool échoue mid-process. Validé sur 3 fichiers (1209 L archivées s26). | brut | `_base-agent-protocol.md` |
| s26 | P2 | **Anti-doublon photos partagées** : 2 projets utilisant le même dossier source (Apparts Jardin = 1er+2ème étage Prieuré) doivent avoir des `apresFiles` + `avantFiles` EXPLICITES disjoints. Sinon le même hero apparaît sur 2 cartes voisines = casse la promesse "biens distincts". Vérifié post-curation : 0 doublon entre les paires. | brut | `@creative-strategy` workflow curation |
| s26 | P0 | **[PRÉFÉRENCE FONDATEUR]** Thomas REFUSE les rallonges textuelles non demandées. Quand il dit "rajouter X" il veut X et SEULEMENT X. Toute amélioration "pour bien expliquer" est rejetée comme "bloc moche pas revu". Ton minimaliste, factuel, identique au pattern existant. | brut | `docs/founder-preferences.md` + `@copywriter` |
| s26 | P0 | **[PRÉFÉRENCE FONDATEUR]** Thomas exige solution **propre et durable**, JAMAIS quick fix. Quand on lui propose "lazy load + resize quick win", il répond "à l'équipe de travailler l'architecture, pas à moi. Solution propre et durable". → Refuser tout patch cosmétique, designer la vraie architecture (cf. migration photos s26). | brut | `docs/founder-preferences.md` + `@infrastructure` + `@fullstack` |
| s26 | P1 | **[PRÉFÉRENCE FONDATEUR]** Thomas demande des **chiffres ronds** pour la communication publique : `660 639 € → 660 000 €` sur emprunt Arras. Exception assumée pour les chiffres exacts PDF (frais notaire 60 639 € = chiffre acte officiel). Préférer la lisibilité commerciale à la précision absolue sur les sommes en cents. | brut | `docs/founder-preferences.md` + `@copywriter` |
| s26 | P1 | **[PRÉFÉRENCE FONDATEUR]** Thomas exige **anonymisation des adresses** sur les fiches publiques refs : "rue d'Arras à Lille" → "à Lille (59)". Sécurité + protection portfolio. Mais nom de SCI (MMM/MMO/MLV) acceptable car déjà sur le PDF descriptif. | brut | `docs/founder-preferences.md` + `@copywriter` |
| s26 | P1 | **[PRÉFÉRENCE FONDATEUR]** Thomas considère que **le hero d'une fiche immobilière = la photo qui fait cliquer**. Espace de vie meublé > vue détail > photo vide. Une chambre vide en parquet brut comme hero = "casse la promesse marchand de biens livre du fini". Skip les photos médiocres même si on tombe à 2 photos après seulement (qualité > quantité). | brut | `docs/founder-preferences.md` + `@design` + `@creative-strategy` |

---

## Format d'ajout d'un learning

Ajouter une ligne dans le tableau ci-dessus uniquement si :
1. Le learning n'est pas déjà couvert par un commandement CLAUDE.md ou un agent
2. Une entrée plus ancienne est archivée en contrepartie (net-zero)
3. Le statut est suivi : `brut` → `propagé` → `stable` → `archive` (TTL)

Voir `project-context.md` section "Historique des interventions agents" pour le journal complet.
