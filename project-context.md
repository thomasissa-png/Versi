# Contexte Projet — Versi

> Ce fichier est lu par tous les agents avant toute action.
> Remplis chaque champ. Les champs vides bloquent les agents.
> **ATTENTION** : ce fichier peut contenir des informations stratégiques (budget, pricing, concurrents). S'assurer que le repo est **privé** si des données confidentielles y sont renseignées.
> Dernière mise à jour : 2026-04-08

---

## Identité
- **Nom du projet** : Versi
- **URL (si existante)** : https://versi.fr (à créer)
- **Secteur** : Holding immobilière intégrée — acquisition, transformation, détention et structuration d'opérations immobilières en France
- **Stade** : [x] Idée  [ ] V1  [ ] Production  [ ] Croissance
- **Date de début** : avril 2026

---

## Cible
- **Persona principal** : Laurent, 48 ans, investisseur immobilier privé ou family office manager, cherche des opérateurs immobiliers crédibles pour co-investir ou confier des mandats. Il reçoit des dizaines de dossiers par mois et élimine en 10 secondes ceux qui ne font pas "sérieux". Sa frustration : trop d'opérateurs immobiliers avec des sites amateurs qui ne permettent pas d'évaluer leur crédibilité rapidement.
- **Problème principal** : Besoin de comprendre en moins de 5 secondes qui est Versi, ce qu'ils font, pourquoi ils sont crédibles, et comment les contacter. Un site qui ne transmet pas immédiatement la solidité et la structuration = fermeture de l'onglet.
- **Alternative actuelle** : LinkedIn des fondateurs, bouche-à-oreille, pas de site institutionnel → perte de crédibilité face à des concurrents mieux présentés
- **Persona secondaire** : Sophie, 42 ans, propriétaire d'un immeuble à rénover en province, cherche un marchand de biens capable de lui faire une offre rapide. Elle compare 3-4 opérateurs et choisit celui qui inspire le plus confiance.
- **Verbatims persona** : 
  - "Je veux voir en 10 secondes si ces gens sont sérieux ou si c'est encore un site WordPress à 200€"
  - "Les track records, c'est la seule chose qui compte — pas les promesses"
  - "Si je ne trouve pas qui est derrière en 2 clics, je passe"
  - "Un site pro, c'est le minimum — si le site est bâclé, je me demande ce que ça donne sur un chantier"

---

## Positionnement
- **Promesse unique** : Versi est une plateforme immobilière intégrée qui maîtrise l'ensemble du cycle de vie d'un actif — de l'acquisition à la structuration financière — avec la rigueur d'un investisseur, la maîtrise d'un opérateur et la vision long terme d'un gestionnaire de patrimoine.
- **Ton de marque** : Premium et sobre — institutionnel sans être corporate froid, précis sans être technique, ambitieux sans être arrogant
- **3 mots qui DÉFINISSENT la marque** : Rigueur, Solidité, Précision
- **3 mots qui ne DÉFINISSENT PAS la marque** : Flashy, Startup, Discount
- **Concurrent principal** : Opérateurs immobiliers intégrés avec présence web institutionnelle (type Enclave, fonds immobiliers avec sites premium)
- **Notre différence clé vs lui** : Trio complémentaire marketing/stratégie/sales avec track record prouvé (Sony, Algolia, Inbolt, TEOS, 35+ biens locatifs), opérant en direct sur l'ensemble de la chaîne de valeur (pas juste un fonds passif)

---

## Objectifs
- **Objectif principal à 6 mois** : Site versi.fr live, crédible et fonctionnel — servant de vitrine institutionnelle pour les prises de contact investisseurs et partenaires
- **KPI North Star** : Nombre de prises de contact qualifiées via le formulaire du site (objectif : démontrer la crédibilité dès le premier contact)
- **Objectif secondaire** : Poser les bases visuelles et techniques réutilisables pour les sites des entités (versi-developpement.fr, versi-invest.fr, versi-capital.fr, versi-finance.fr)
- **Ce que le succès ressemble à 12 mois** : Écosystème de 5 sites cohérents (holding + 4 entités) avec un design system partagé, chacun optimisé pour son audience spécifique

---

## Stack technique
- **Frontend** : [x] React  [ ] Next.js  [ ] Expo/React Native  [ ] Autre :
- **Backend** : Pas de backend — site statique (formulaire de contact via service tiers type Formspree ou EmailJS)
- **Base de données** : Aucune (site vitrine statique)
- **Authentification** : Aucune
- **Hébergement** : Replit (environnement de développement actuel) — déploiement final à déterminer (Vercel, Netlify, ou hébergement custom pour versi.fr)
- **Outils IA utilisés** : Aucun en production — IA utilisée uniquement pour la conception/développement
- **Budget IA mensuel (tokens)** : N/A
- **Volume d'usage IA prévu** : N/A
- **Latence IA cible** : N/A
- **Outils d'analytics** : À recommander (probablement Plausible ou GA4 pour le suivi des conversions formulaire)

---

## Modèle économique et juridique
- **Modèle économique** : [x] Site vitrine  [ ] SaaS  [ ] E-commerce  [ ] Marketplace  [ ] App mobile  [ ] API/produit technique  [ ] Média/contenu  [ ] Open source  [ ] Autre :
- **Pays de commercialisation** : France
- **Données sensibles collectées** : [x] Non — uniquement nom/email/téléphone/message via formulaire de contact
- **Utilisation d'IA générative** : [x] Non

---

## Contraintes
- **Budget mensuel infrastructure** : Minimal — site statique, hébergement < 20€/mois
- **Budget mensuel acquisition** : 0€ (pas d'acquisition payante — le site est une vitrine, le business vient du réseau et du terrain)
- **Budget analytics** : À recommander (gratuit ou < 10€/mois)
- **Timeline de lancement** : Dès que possible — pas de date butoir mais le site est nécessaire pour crédibiliser les démarches en cours
- **Contraintes légales ou sectorielles** : Mentions légales obligatoires (société française), RGPD sur le formulaire de contact, pas de contrainte AMF (pas de collecte de fonds publique sur versi.fr)
- **Ressources disponibles** : [x] Solo (Thomas pilote le développement avec les agents IA, Carl et Maxime valident le contenu)

---

## Existant (projets en place uniquement)
- **URL du site actuel** : Aucune — versi.fr n'existe pas encore
- **Comptes sociaux existants** : LinkedIn individuels des 3 fondateurs (pas de page entreprise Versi encore)
- **Outils analytics en place** : Aucun
- **Contenu existant** : Brief de conception (PDF dans le repo), profils fondateurs (PDF dans le repo), photos des 3 fondateurs (dans /Photos/)
- **Historique SEO** : Aucun — domaine pas encore indexé

---

## Scope et périmètre du projet actuel

**Scope V1 (ce projet)** : versi.fr — site one-page institutionnel de la holding Versi

**Structure du site (one-page scrolling)** :
- Navigation sticky : Vision | Activités | Équipe | Implantation | Contact
- CTA permanent : "Nous contacter"

**Sections** :
1. **Hero** — Positionnement immédiat (titre + sous-titre + CTA)
2. **Mission** — Rôle de Versi (holding immobilière intégrée)
3. **Activités** — 4 entités avec liens vers leurs futurs sites :
   - Versi Développement (marchand de biens) → versi-developpement.fr
   - Versi Invest (structuration d'investissement) → versi-invest.fr
   - Versi Capital (foncière) → versi-capital.fr
   - Versi Finance (structuration financière) → versi-finance.fr
4. **Approche** — Process en 4 étapes : Sourcer → Analyser → Transformer → Opérer
5. **Implantation** — Paris + Lille + métropoles françaises (carte minimaliste)
6. **Équipe** — 3 co-fondateurs présentés à parité :
   - Thomas Issa — Co-fondateur
   - Maxime Lemoine — Co-fondateur
   - Carl Standertskjold-Nordenstam — Co-fondateur
   (Pas de rôle spécifique affiché — les 3 sont strictement co-fondateurs, présentés à parité)
7. **Contact** — Formulaire (Nom, Email, Téléphone, Message) + email contact@versi.fr

**Hors scope V1** : les sites des 4 entités (versi-developpement.fr, etc.) — seront des projets séparés utilisant le même design system.

## Direction artistique (brief fondateur)

**Identité visuelle cible** : Fonds immobilier moderne et institutionnel
**Référence principale** : enclave.com
**Mots-clés** : minimal, architectural, premium, précis, intemporel

**Palette de couleurs (brief)** :
- Blanc cassé : #F7F5F2
- Gris chaud : #D9D4CE
- Anthracite : #1A1A1A
- Noir profond : #0B0B0B
- Accent (usage minimal) : Beige pierre #C8B9A6 ou Vert très sombre #1E2A23

**Typographie (brief)** : Inter / Suisse / Neue Haas Grotesk — Titres uppercase tracking large, corps sobre et moderne

**Images** : Architecturales uniquement (façades, détails, matières, espaces intérieurs, textures). Lumière naturelle, cadrage propre, composition minimaliste, couleurs neutres. Pas d'images génériques.

**Layout** : Beaucoup d'espace blanc, grandes marges, grilles strictes, alignements précis, sections aérées

**UI** : Boutons rectangulaires simples, coins légèrement arrondis, couleur sombre. Cartes fond blanc, bordures fines, ombres très légères. Animations très discrètes (fade uniquement).

**Note pour les agents** : le fondateur demande explicitement que l'équipe rechallenge le brief et soit force de proposition. Les specs visuelles ci-dessus sont un point de départ, pas un cahier des charges figé.

---

## Historique des interventions agents

> Ce tableau est le journal de bord du projet. Chaque agent DOIT le compléter après chaque livrable.
> La colonne "Pourquoi" est obligatoire : elle capture le raisonnement, pas juste la décision.
> Tout agent démarrant une session DOIT lire ce tableau pour comprendre les décisions passées et leur justification.

| Agent | Date | Livrable produit | Décisions clés | Pourquoi / Alternatives écartées |
|-------|------|-----------------|----------------|----------------------------------|
| orchestrator | 2026-04-08 | project-context.md | Scope = versi.fr one-page uniquement. React (pas Next.js). Profil V1-Production. Persona principal = investisseur/partenaire, pas grand public. | Site vitrine institutionnel = SEO secondaire vs crédibilité. React suffit (pas de SSR nécessaire pour un one-page). Le persona "grand public" est trop vague — le site doit convaincre des professionnels de l'immobilier et des investisseurs. |
| legal | 2026-04-08 | docs/legal/legal-audit.md, docs/legal/mentions-legales-draft.md, docs/legal/privacy-policy.md, docs/legal/rgpd-checklist.md | Base légale formulaire = intérêt légitime (art. 6.1.f RGPD). Analytics recommandé = Plausible (cookieless, exempt de bandeau). Pas de CGU/CGV ni de DPO obligatoires. Pas de contrainte AMF pour ce site vitrine. Durée conservation données contact = 3 ans (référentiel CNIL). 6 items bloquants avant mise en ligne identifiés. | Intérêt légitime retenu vs consentement : le contact est initié volontairement par l'utilisateur, la collecte est limitée au strict nécessaire — la base "consentement" aurait requis une case à cocher et complexifié le formulaire inutilement. Plausible retenu vs GA4 : GA4 impose un bandeau cookies et des transferts vers les USA (Schrems II) — incompatible avec le positionnement institutionnel et premium de Versi. Pas de DPO : traitement non sensible, non massif, seuil réglementaire non atteint (moins de 250 salariés, pas de données sensibles, pas de profilage). |

---

## Performance des agents

> Ce tableau mesure la qualité de chaque intervention. Rempli par l'agent après livraison, validé/corrigé par @reviewer.
> Un agent avec 2+ interventions à <3/5 en spécificité → son prompt doit être revu.

| Agent | Date | Livrable | Complétude | Cohérence | Actionnabilité | Messages | Spécificité | Notes |
|-------|------|----------|------------|-----------|----------------|----------|-------------|-------|
| | | | | | | | | |

**Légende (échelle 1-5 alignée avec CLAUDE.md) :**
- **Complétude** : 1 (sections manquantes) → 3 (sections principales couvertes) → 5 (tout rempli, rien à ajouter)
- **Cohérence** : 1 (contredit des livrables existants) → 3 (pas de contradiction) → 5 (référence explicitement les livrables amont)
- **Actionnabilité** : 1 (trop vague) → 3 (implémentable avec interprétation) → 5 (directement implémentable, zéro ambiguïté)
- **Messages** : 1 (silencieux sur les manques) → 3 (a signalé certains manques) → 5 (a signalé tous les manques, hypothèses marquées)
- **Spécificité** : 1 (générique) → 3 (partiellement spécifique) → 5 (100% taillé pour ce projet)

---

## Notes libres

- Thomas pilote le projet via Claude Code et les agents Gradient Agents. Carl et Maxime valident le contenu et les visuels.
- Le brief PDF (dans le repo) couvre aussi la partie 2 (versi-developpement.fr) mais c'est hors scope pour cette V1.
- Les photos des 3 fondateurs sont dans `/Photos/` (Carl-picture.jfif, max.png, thomas.png).
- Versi est une entité de la holding Gradient One, mais Gradient One n'apparaît pas sur le site versi.fr.
- **IMPORTANT : PAS de rôles spécifiques (CEO, COO, CMO).** Les 3 sont présentés strictement comme "Co-fondateur", point. Aucun titre hiérarchique, aucune différenciation de fonction sur le site. Le brief mentionnait des rôles mais c'est annulé par le fondateur.
- Le fondateur demande explicitement que l'équipe d'agents rechallenge le brief et soit force de proposition sur les choix stratégiques, visuels et structurels.
- Branche de développement : `claude/setup-gradient-agents-uMuy0`
- Profil de rigueur : V1-Production (toutes les gates G1-G32 + GP + GC si applicable)

### Mémo de reprise

Pour reprendre ce projet : `Lis project-context.md et docs/orchestration-plan.md, continue où on s'est arrêté.`
