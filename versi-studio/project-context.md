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
