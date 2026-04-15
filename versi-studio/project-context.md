# Contexte Projet — Versi Studio

> Ce fichier est lu par tous les agents avant toute action.
> Remplis chaque champ. Les champs vides bloquent les agents.
> **ATTENTION** : ce fichier peut contenir des informations stratégiques (budget, pricing, concurrents). S'assurer que le repo est **privé** si des données confidentielles y sont renseignées.
> Dernière mise à jour : 2026-04-15

---

## Identité
- **Nom du projet** : Versi Studio (nom provisoire — validation @creative-strategy en cours. Anciennement "Versimo")
- **URL (si existante)** : À définir (anciennement versimo.fr/marchand, potentiellement studio.versi.fr ou autre)
- **Secteur** : PropTech / Outil de pré-commercialisation pour marchands de biens — Lecture de plans, découpe en lots, identification des pièces, génération de visuels post-travaux par IA
- **Stade** : [x] Idée (repartir quasi de zéro sur le front, garder les fonctions IA backend qui marchent)
- **Date de début** : avril 2026
- **Relation écosystème** : 4e entité Versi. Endorsed Brand comme Versi Immobilier et Versi Invest. Les fondateurs Versi sont les premiers utilisateurs (utilisation pour Versi Immobilier), puis commercialisation.

---

## Cible
- **Persona principal** : Thomas, 35 ans, marchand de biens (fondateur Versi lui-même), 8-12 opérations/an. Gère des immeubles qu'il rénove et revend par lots. Besoin : un outil qui lit ses plans, propose une découpe par lots, identifie les pièces, et génère des visuels "après travaux" pour les dossiers de pré-commercialisation. Frustration : aujourd'hui c'est un process 100% manuel — dessiner la découpe à la main, briefer un architecte d'intérieur ou home stager pour les visuels (200-500€/planche, 48-72h de délai), assembler le dossier manuellement.
- **Problème principal** : La pré-commercialisation d'un bien en travaux est longue, chère et artisanale. Les acquéreurs ne se projettent pas sur des murs bruts. Le marchand de biens perd du temps et de l'argent à chaque opération pour produire des visuels qui aident les acheteurs à se projeter.
- **Alternative actuelle** : Home stagers humains (200-500€/planche, 48-72h), architectes d'intérieur (encore plus cher), ou rien (plans bruts envoyés aux acquéreurs → moins de ventes, plus lent).
- **Persona secondaire** : Autres marchands de biens en France (cible commerciale après validation interne).
- **Verbatims persona** :
  - "Je veux uploader mon plan et que l'outil me propose direct la découpe — je l'ajuste et c'est bon"
  - "Payer 500€ pour 3 visuels meublés à chaque opération, c'est du délire"
  - "Les acquéreurs ne se projettent pas sur des murs vides, c'est la réalité du terrain"
  - "Je veux que ça soit simple, rapide, et que les visuels soient crédibles"

---

## Positionnement
- **Promesse unique** : L'outil qui transforme un plan brut en dossier de pré-commercialisation complet — découpe des lots, identification des pièces, visuels post-travaux par IA — en quelques minutes au lieu de plusieurs jours.
- **Ton de marque** : Identique à Versi — Confiant avec du caractère, direct, zéro blabla, zéro bullshit. Premium par la substance, pas par le jargon. Vouvoiement.
- **3 mots qui DÉFINISSENT la marque** : Précision, Efficacité, Terrain
- **3 mots qui ne DÉFINISSENT PAS la marque** : Gadget, Cheap, Générique
- **Concurrent principal** : Gepetto (Bordeaux, architecte d'intérieur, positionnement qualité), Renovate Club (9,99€/mois, illimité, 10 000+ users), home stagers traditionnels
- **Notre différence clé** : Workflow intégré de bout en bout (plan → lots → pièces → visuels) vs outils de home staging qui ne gèrent qu'une photo à la fois. C'est un outil de production de dossiers, pas juste un générateur de visuels.

---

## Objectifs
- **Objectif principal à 6 mois** : Outil fonctionnel utilisé par les fondateurs Versi sur leurs propres opérations (Versi Immobilier)
- **KPI North Star** : Nombre de lots traités (de l'upload plan au visuel final)
- **Objectif secondaire** : Valider la valeur auprès de 5-10 marchands de biens externes
- **Ce que le succès ressemble à 12 mois** : Outil commercialisé en SaaS, pricing par lot ou par photo, utilisé par 50+ marchands de biens en France

---

## Workflow métier — Les 4 étapes (source de vérité fondateur)

### Étape 1 — Upload des plans
Le marchand de biens uploade un ou plusieurs plans (PDF). Typiquement un plan par étage pour un immeuble. Les plans peuvent être propres (architecte) ou plus bruts (scan, photo). L'outil doit gérer les deux.

### Étape 2 — Découpe par lots
L'IA lit les plans et propose une découpe en lots (ex: T2 RDC gauche, T3 R+1). Un lot peut couvrir un étage, une partie d'étage, ou plusieurs étages. Le marchand ajuste **visuellement sur le plan** avec le curseur : déplacer des limites, fusionner, séparer. L'outil propose, le marchand valide.

### Étape 3 — Identification des pièces
L'IA relit les plans et propose les pièces par lot (salon, chambre, WC, cuisine...) en respectant le métrage, sans superposition, sans débordement hors du bien. Le marchand peut **repositionner, ajuster, ajouter, enlever** les pièces visuellement sur le plan. Outil complet mais simple d'usage.

### Étape 4 — Visuels post-travaux
Pour chaque pièce, le marchand uploade un ou plusieurs visuels (photos réelles de la pièce brute) et précise l'angle de prise de vue. L'IA (gpt-image-1.5) génère des visuels "après travaux" dans le style souhaité (presets : Scandinave, Industriel, etc.). Le marchand peut itérer en discutant avec un agent architecte IA (chat itératif pour raffiner les visuels).

### Étape 5-6 — Dossier de pré-commercialisation (V2, après que les étapes 1-4 fonctionnent)
Génération d'un PDF brandé au nom et aux couleurs du marchand (logo, coordonnées). Plan + visuels avant/après par pièce. Lien partageable en ligne. À implémenter dans un second temps.

---

## Stack technique
- **Frontend** : À définir par l'équipe — Next.js (App Router) recommandé car application SaaS interactive (vs site vitrine React/Vite pour les autres sites Versi)
- **Backend** : Next.js API Routes (comme l'existant) ou Express séparé — à challenger
- **Base de données** : PostgreSQL (Replit)
- **Authentification** : Hors scope V1 — auth simple plus tard (NextAuth Google + email/password)
- **Paiement** : Hors scope V1 — Stripe à implémenter quand le cœur fonctionne
- **Hébergement** : Replit
- **Outils IA utilisés** :
  - **Lecture de plans** : OpenAI GPT-4.1 (vision) pour extraire les pièces, dimensions, portes, fenêtres
  - **Génération de visuels** : OpenAI gpt-image-1.5 (Responses API, input_fidelity "high") — modèle unique, pas de fallback
  - **Agent architecte** : GPT-4.1 en mode conversationnel pour itérer sur les visuels
  - **Pre-processing prompts** : GPT-4.1-mini pour enrichissement des prompts de génération
- **Budget IA mensuel** : À évaluer après les premières utilisations
- **Latence IA cible** : Extraction plan < 30s, génération visuel < 90s
- **Outils d'analytics** : Umami (cohérence Versi)

---

## Modèle économique et juridique
- **Modèle économique** : SaaS — pricing par lot ou par photo (à définir). Hors scope V1.
- **Pays de commercialisation** : France
- **Données sensibles collectées** : [x] Non — Plans architecturaux et photos de chantier uniquement
- **Utilisation d'IA générative** : [x] Oui — Lecture de plans (GPT-4.1 vision) + Génération de visuels meublés (gpt-image-1.5)

---

## Contraintes
- **Budget mensuel infrastructure** : Minimal en V1 — hébergement Replit
- **Budget mensuel IA** : À évaluer — dépend du volume de générations
- **Timeline de lancement** : Pas de date butoir mais les fondateurs veulent l'utiliser sur leurs opérations en cours
- **Ressources disponibles** : [x] Solo (Thomas pilote avec les agents IA)
- **Code existant** : Le repo `thomasissa-png/Architecture` (branche `claude/extract-project-context-X8Rqd`) contient une base de code (Next.js + Tailwind) avec les fonctions marchand. Le front est décrit comme "horrible" et "ne marche pas très bien" par le fondateur. Les fonctions IA backend (extraction plans, schémas Zod, agent architecte) sont à évaluer et potentiellement récupérer. TOUT est à challenger.
- **Plans de test** : 4 PDFs de vrais plans (immeuble 10 rue des Muguets, Lille) disponibles dans le repo existant.

---

## Direction artistique
- **Branding** : Endorsed Brand Versi — même famille visuelle que versi.fr, versi-immobilier.fr, versi-invest.fr
- **Palette** : Blanc cassé #F7F5F2, Gris chaud #D9D4CE, Anthracite #1A1A1A, Noir profond #0B0B0B, pas de couleur d'accent par entité (palette unique écosystème Versi)
- **Typographie** : Inter (cohérence Versi)
- **Layout** : Adapté SaaS (vs site vitrine) — sidebar ou stepper pour le workflow, zones d'interaction larges pour l'éditeur de plan
- **Référence design** : Les 3 sites Versi existants pour le branding, mais adapté à une application interactive

---

## Scope V1

**Ce qu'on fait** :
- Les 4 étapes du workflow (upload → lots → pièces → visuels)
- Éditeur visuel de plans (interaction directe sur le plan)
- Génération de visuels par IA (gpt-image-1.5)
- Agent architecte IA pour itérer sur les visuels
- Branding Versi

**Ce qu'on ne fait PAS en V1** :
- Authentification / comptes utilisateurs
- Paiement / Stripe
- PDF de pré-commercialisation brandé
- Lien partageable
- Blog / SEO / Landing page marketing
- Multi-personas (architecte, particulier)

---

## Notes pour les agents
- Le fondateur demande explicitement que l'équipe d'agents **challenge tout** — le code existant, le workflow, le naming, le design.
- Le fondateur est lui-même le persona principal — il utilisera l'outil au quotidien.
- Branche de développement : `claude/extract-project-context-72rHa`
- Profil de rigueur : V1-Production (toutes les gates G1-G32)
- Code existant de référence : `/tmp/architecture-ref/` (cloné depuis GitHub)

---

## Historique des interventions agents

> Ce tableau est le journal de bord du projet. Chaque agent DOIT le compléter après chaque livrable.

| Agent | Date | Livrable produit | Décisions clés | Pourquoi / Alternatives écartées |
|-------|------|-----------------|----------------|----------------------------------|
| orchestrator | 2026-04-15 | versi-studio/project-context.md | Scope = workflow marchand 4 étapes uniquement. V1 sans auth/paiement/PDF. Nom provisoire "Versi Studio" (pending @creative-strategy). Stack à challenger. Code existant à évaluer. | Le fondateur veut se concentrer sur le cœur (plan → visuels) avant toute monétisation. Les 3 autres personas de l'ancien Versimo (architecte, particulier, agence) sont exclus — ce n'est plus un outil multi-cible mais un outil métier pour marchands de biens. |
| creative-strategy | 2026-04-15 | docs/strategy/vs-brand-platform.md | Naming "Versi Studio" retenu (usage interne + premiers MDB externes). URL recommandée : studio.versi.fr. Positionnement = outil de production de dossiers (pas home staging) — territoire libre, aucun concurrent direct. Persona Thomas documenté avec jobs-to-be-done, objections, parcours d'achat. Personas acheteurs de lots (Marie, Philippe) documentés comme clients du persona. Ton identique Versi avec adaptation SaaS (moins cérémonieux). Benchmark : Gepetto (17-325€/mois, photo uniquement), Renovate Club (10€/mois illimité, photo uniquement) — aucun ne couvre le workflow plan→lots→pièces→visuels. | "Versimo" écarté : casse la règle de cohérence Versi, perd la crédibilité écosystème. "Studio" accepté malgré le risque de confusion (évoque créatif plus que SaaS) car la légitimité terrain prime sur la clarté du descripteur pour un usage interne + early adopters. Options alternatives analysées (Versi Opérations, Versi Plans, Versi Dossiers) mais aucune ne combine mieux cohérence + mémoriabilité + clarté partielle. |
| ux | 2026-04-15 | docs/ux/vs-wireframes.md | Architecture 3 zones (stepper 200px + canvas flex + panel 320px) pour étapes 2-3. Layout grille + drawer chat pour étape 4. Stepper = navigation principale (pas de header nav). Autosave obligatoire, pas de bouton sauvegarder. Canvas HTML5 avec Fabric.js/Konva.js recommandé (couches indépendantes fond/lots/pièces). 5 états UI documentés par étape. 3 aha moments identifiés (étapes 2, 3, 4). H10 (aide/documentation) = seule heuristique Nielsen en FAIL — correction via tooltips sur actions non-standard. Events de tracking définis pour mesurer time-to-aha. | Pas de header nav car application orientée tâche — le stepper suffit. Chat agent en drawer (pas inline) pour ne pas réduire la zone de travail en vue grille. Génération par pièce indépendante (pas de blocage si une pièce échoue). Navigation retour toujours autorisée (liberté utilisateur H3). Canvas plutôt qu'une approche formulaire pour les étapes 2-3 car le verbatim Thomas est explicite : "je veux ajuster visuellement sur le plan". |
| design | 2026-04-15 | docs/design/vs-design-system.md | Tokens 3 tiers (gate G31). 8 couleurs de lots palette minérale (argile, sable, ardoise, lin, lichen, calcite, silex, ocre) — overlays semi-transparents sur canvas. Layout desktop-first : header 56px + sidebar 240px + canvas flex + panel 320px. 10 composants SaaS avec 6 états (gate G32). Mobile = consultation seule (pas d'édition canvas). Logo "VERSI STUDIO" avec em-space. | Palette minérale choisie pour cohérence Versi (pas de couleurs vives/rainbow). Desktop-first inversé vs les sites vitrines car c'est un outil de travail. Mobile consultation-only car canvas HTML5 tactile = UX dégradée. |
| copywriter | 2026-04-15 | docs/copy/vs-ux-writing.md | Principes UX writing : concis, terrain, actionnable. Zéro mot "IA" dans l'UI ("créer" au lieu de "générer"). 18 types de pièces en français courant. Ton agent architecte défini (professionnel, pas chatbot). Formulations interdites documentées pour le prompt système. Vouvoiement systématique. | "Générer" remplacé par "créer" car le fondateur veut un outil professionnel, pas un gadget tech. L'agent architecte parle comme un professionnel car c'est la perception de valeur — pas comme un assistant IA. |
| product-manager | 2026-04-15 | docs/product/vs-functional-specs.md | Évaluation 9 fichiers existants. Workflow simplifié 8→4 étapes. 13 user stories détaillées (Given/When/Then). Recommandation Next.js 14 App Router. Modèle BDD 6 tables vs_*. 26 endpoints API. Stack : Next.js + Tailwind + PostgreSQL + Canvas HTML5. | 8→4 étapes car les étapes intermédiaires (qualification, recommandations) sont des raffinements V2 — le fondateur veut le workflow core. Next.js car l'existant est déjà en Next.js et les API Routes évitent un serveur séparé. |
| orchestrator | 2026-04-15 | Phase VS-2 complète (versi-studio/src/) | Next.js 16 (pas 14 — version plus récente lors de l'init). Tailwind v4 @theme CSS. Canvas HTML5 natif (pas Konva/Fabric.js — budget bundle). Pipeline IA : schemas Zod, plan-extractor, visual-generator, architect-agent — audit 10/10. 4 steps complets : Upload, Lots (canvas drag/resize), Pièces (lot par lot), Visuels (12 styles, chat agent). 19 API routes. Mode simulation si OPENAI_API_KEY absente. | Next.js 16 car init automatique, pas de raison de downgrade. Canvas natif car le bundle Konva (200-400Ko) n'apporte que 20% des features nécessaires. Stockage /tmp en V1 (éphémère) car Object Storage Replit requiert une config supplémentaire — à migrer en V2. Fire-and-forget pour la génération async (acceptable en V1, à améliorer avec job queue en V2). |
| fullstack | 2026-04-15 | versi-studio/src/ (setup + Step 1 + Step 2 + Step 3 + Step 4) | Setup Next.js 16 + Tailwind v4 @theme + DB Pool pg singleton + ensureVsTables 6 tables. Step 1 : DropZone drag-and-drop, PlanThumbnail, upload multipart /tmp. Step 2 : PlanCanvas HTML5 natif drag/resize 8 poignées, détection chevauchement, LotPanel édition inline, API lots CRUD + validate transaction atomique. Step 3 : RoomCanvas zoom sur lot, RoomPanel dropdown 18 types, validation lot par lot, passage auto au lot suivant. Step 4 : StyleGrid 12 styles, VisualResult 4 états (processing/failed/generated/validated), ChatAgent drawer, RoomGrid panneau latéral, génération async fire-and-forget + polling 5s, mode simulation. | Validation server-side manuelle (pas de Zod dans les API routes V1) car ça évite une dep supplémentaire et la complexité est gérable. Font PP Neue Montreal via Fontshare CDN (pas de local hosting en V1). Debounce 1s pour toutes les sauvegardes auto (lots, pièces). Optimistic UI partout avec rollback sur erreur. Chat agent côté client uniquement (pas en DB en V1). |
| ia | 2026-04-15 | versi-studio/src/lib/vs/ (schemas + plan-extractor + visual-generator + architect-agent + styles + types) | Schemas Zod adaptés V1 : TypeBien limité à 3, ProjectStatus simplifié, StyleIdEnum 12 styles, VisualGenerationInputSchema, ArchitectIterationInputSchema. Plan-extractor : system prompt expert 7 étapes, JSON schema strict compatible Zod, self-correction, sanitizeSurfaces (10x, cm→m, caps), validateExtraction 7 gates. Visual-generator : gpt-image-1.5 via Responses API, prompt de transformation photoréaliste, enrichissement via gpt-4.1-mini. Architect-agent : enrichissement instruction + génération itérative. | Audit 10/10 après 7 corrections (JSON schema contraintes numériques alignées Zod, deep clone sanitizeSurfaces, gates G6/G7 ajoutées, typage strict Set<ExtractionWarning>, type guard isMessageItem). Les schemas V1 excluent volontairement target_buyer, recommendations, lot_qualification — réintroduits en V2. |
| geo | 2026-04-15 | docs/geo/vs-geo-strategy.md | GEO N/A pour Versi Studio — outil interne sans contenu public indexable. robots noindex,nofollow. Pas de llms.txt, pas de Schema.org SaaS. GEO actif sur versi.fr, versi-immobilier.fr, versi-invest.fr uniquement. | Si une landing marketing publique est créée pour Versi Studio (commercialisation externe), relancer @geo pour une stratégie GEO dédiée sur cette page uniquement. |

### Mémo de reprise

**Branche** : `claude/phase-2-orchestration-KsLoA`
**Date de clôture** : 2026-04-15
**Dernier commit** : `e2312f2` (chore: ignore versi-studio-tmp)

**Résumé session (versi-s12)** : Session de développement Phase 2 complète. (1) Phase VS-2a : setup Next.js 16 + Tailwind v4 tokens Versi + DB 6 tables vs_* + API routes projects/plans + Dashboard + Step 1 Upload + pipeline IA complet (schemas, plan-extractor GPT-4.1, visual-generator gpt-image-1.5, architect-agent) — audit 10/10 sur les 3 modules IA. (2) Phase VS-2b : Step 2 éditeur canvas lots (PlanCanvas HTML5 natif, drag/resize 8 poignées, détection chevauchement, LotPanel, sauvegarde debounce 1s) + Step 3 éditeur pièces par lot (RoomCanvas, RoomPanel dropdown 18 types, validation lot par lot, optimistic UI). (3) Phase VS-2c : Step 4 visuels post-travaux (StyleGrid 12 styles, VisualResult 4 états, ChatAgent drawer itération, RoomGrid panneau latéral, génération async polling 5s, mode simulation sans API key).

**Total livré** : ~16 000 lignes de code, 50 fichiers, 4 steps complets, 19 API routes, 12 composants, pipeline IA 3 modules.

**Phases terminées** : VS-0a, VS-0b (checkpoint), VS-1, VS-2a, VS-2b, VS-2c
**Phase suivante** : VS-2d (QA) puis VS-3 (SEO/GEO allégé) puis VS-5 (audit final)

**Travaux en cours** :
- Build non vérifié (`npm run build` pas exécuté — potentielles erreurs TS)
- Tests E2E non écrits (agent @qa non lancé)
- Stockage fichiers en /tmp (éphémère) — migration Object Storage en V2
- Chat agent : historique côté client uniquement (perdu au refresh)

**Prochaines actions recommandées** :
1. **PRIORITÉ 1 — Build + fix** : `cd versi-studio && npm run build` — corriger toutes les erreurs TypeScript. C'est la gate bloquante avant toute QA. Agent : @fullstack.
2. **PRIORITÉ 2 — @qa Tests E2E** : Playwright sur les 4 étapes. Flux complet upload → lots → pièces → visuels. 5 états UI par page. Edge cases (> 20Mo, chevauchement, pièces non typées). Agent : @qa.
3. **PRIORITÉ 3 — Dev server + test manuel** : Démarrer `npm run dev`, tester le flux avec les vrais plans PDF de test dans `versi-studio/reference-existant/plans-test/`. Agent : @fullstack ou fondateur.

**Blockers** :
- OPENAI_API_KEY nécessaire pour tester les features IA en réel (extraction plans, génération visuels). Mode simulation fonctionnel en attendant.
- PostgreSQL nécessaire pour toutes les API routes (DATABASE_URL). Si pas dispo, les routes retournent 500.

**PROPAGATION P0/P1 EN ATTENTE** (gate bloquante prochaine session) :
1. P0 → CLAUDE.md règle n°3 : ajouter "Pour les fichiers > 300 lignes, DÉCOUPER le brief en 2-3 agents. Brief max 2000 mots pour un agent producteur."
2. P1 → CLAUDE.md règle n°4 : ajouter "Après 2 timeouts, réduire scope 50%. Après 3, écriture manuelle + audit agent 10/10 obligatoire."
3. P1 → .claude/agents/fullstack.md : ajouter "Vérifier la version installée vs demandée (Next.js, Tailwind) et alerter si divergence."
4. P2 → .claude/agents/orchestrator.md : ajouter "Mettre à jour le compteur SESSION après chaque phase, pas en fin de session."

**Commande de reprise** : `@orchestrator mode reprise de session. Lis versi-studio/project-context.md et versi-studio/orchestration-plan.md, continue Phase 2d (QA). Commence par propager les learnings P0/P1 EN ATTENTE, puis npm run build et corrige les erreurs.`
4. **Phase VS-5 — Audit final** : @reviewer revue croisée GO/NO-GO.

**Commande de reprise** : `@orchestrator mode reprise de session. Lis versi-studio/project-context.md et versi-studio/orchestration-plan.md, continue Phase 2d (QA).`
