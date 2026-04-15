# Contexte Projet — Versi Invest

> Ce fichier est lu par tous les agents avant toute action.
> Remplis chaque champ. Les champs vides bloquent les agents.
> **ATTENTION** : ce fichier peut contenir des informations stratégiques (budget, pricing, concurrents). S'assurer que le repo est **privé** si des données confidentielles y sont renseignées.
> Dernière mise à jour : 2026-04-14

---

## Identité
- **Nom du projet** : Versi Invest
- **URL (si existante)** : https://versi-invest.fr (à créer)
- **Secteur** : Accompagnement à l'investissement immobilier locatif — sourcing off-market, simulation financière, accompagnement financement/travaux/juridique/mise en location
- **Stade** : [x] Idée  [ ] V1  [ ] Production  [ ] Croissance
- **Date de début** : avril 2026
- **Entité parente** : Groupe Versi (https://versi.fr) — même holding que Versi Immobilier (https://versi-immobilier.fr)

---

## Cible
- **Persona principal** : Nicolas, 41 ans, directeur commercial ETI. Apport 60-80k€, revenus 85k€+, propriétaire RP + 1 studio locatif. Veut scaler son patrimoine locatif sans y passer ses week-ends. Refroidi par les plateformes volume (Masteos, Beanstock). Cherche un interlocuteur qui montre les vrais chiffres. **ATTENTION : les investisseurs peuvent être partout en France** — pas de restriction géographique sur le profil client. Le sourcing est Hauts-de-France + IDF, mais les clients viennent de toute la France.
- **Problème principal** : Veut se constituer un patrimoine immobilier qui s'autofinance et génère du cashflow positif, mais ne sait pas comment trouver les bons biens, monter le financement, gérer les travaux et la mise en location. Ou n'a simplement pas le temps.
- **Alternative actuelle** : Plateformes clé-en-main volume (Masteos 8-10%, Bevouac 7-9%, Beanstock 8-10%), CGPI classiques (pas de sourcing terrain), faire soi-même (LeBonCoin + courtier + artisan), ou ne rien faire (paralysie).
- **Persona secondaire** : Pierre, 55 ans, courtier crédit immobilier — prescripteur qui recommande Versi Invest à ses clients investisseurs.
- **Verbatims persona** : À produire par @creative-strategy.

---

## Positionnement
- **Promesse unique** : Acquérir des biens immobiliers qui s'autofinancent (emprunt couvert par les loyers) et dégagent du cashflow positif. Rendement cible minimum : 8%. Versi Invest ne vend pas de biens — il accompagne l'investisseur de A à Z sur des opportunités off-market sourcées grâce à l'expertise terrain de Versi Immobilier.
- **Ton de marque** : Identique à Versi / Versi Immobilier — confiant avec du caractère, direct, zéro blabla, zéro bullshit. Premium par la substance, pas par le jargon. Sérieux sans être ennuyeux.
- **3 mots qui DÉFINISSENT la marque** : Rigueur, Solidité, Précision (identiques au groupe Versi)
- **3 mots qui ne DÉFINISSENT PAS la marque** : Flashy, Startup, Volume
- **Concurrent principal** : À étudier par @creative-strategy (pistes : Masteos, Bevouac, Beanstock, CGPI classiques)
- **Notre différence clé** : (1) Pas de volume — chaque client est géré personnellement par les fondateurs, pas par un commercial. (2) Expertise locale terrain via Versi Immobilier (21 appartements rénovés, 3,2M€ de volume). (3) Accès à un flux de biens off-market sourcés par l'activité de marchand de biens. (4) Track record vérifiable (5 immeubles de référence).
- **Ce qu'on n'est PAS** : On n'est pas une agence immobilière. On ne vend pas de biens. On ne touche aucune rémunération côté vendeur. La seule rémunération est les 5% d'honoraires facturés à l'investisseur.
- **Positionnement éditorial (blog & contenu)** : Experts en investissement immobilier locatif rentable en Hauts-de-France. Contenu terrain, factuel, pas de marketing générique. Même exigence que Versi Immobilier.

---

## Objectifs
- **Objectif principal à 6 mois** : Site versi-invest.fr live, crédible et fonctionnel — servant de vitrine pour les inscriptions sur la liste d'attente investisseurs
- **KPI North Star** : Nombre d'inscriptions qualifiées sur la liste d'attente (investisseurs qui remplissent le formulaire avec budget, zone, objectif)
- **Objectif secondaire** : Poser les bases visuelles et techniques cohérentes avec l'écosystème Versi (même design system)
- **Ce que le succès ressemble à 12 mois** : Flux régulier d'investisseurs qualifiés via le site, 5+ opérations accompagnées documentées en références

---

## Stack technique
- **Frontend** : [x] React  [ ] Next.js  [ ] Expo/React Native  [ ] Autre :
- **Backend** : Express (serveur léger pour le formulaire d'inscription + simulateur)
- **Base de données** : PostgreSQL Replit (pour stocker les inscriptions liste d'attente)
- **Authentification** : Aucune
- **Hébergement** : Replit (Repl séparé de versi-immobilier, même repo GitHub)
- **Outils IA utilisés** : Aucun en production
- **Outils d'analytics** : Umami (identique aux autres sites Versi)

---

## Modèle économique et juridique
- **Modèle économique** : Service d'accompagnement à l'investissement immobilier — honoraires de 5% du prix d'acquisition, facturés à l'investisseur. Zéro rémunération côté vendeur du bien.
- **Pays de commercialisation** : France
- **Données sensibles collectées** : [x] Non — nom, email, téléphone, budget estimé, zone géographique souhaitée via formulaire de qualification
- **Statut juridique** : SAS en cours de création, entité du Groupe Versi
- **Réglementation** : Carte T (transaction immobilière) obtenue. Versi Invest n'est PAS un agent immobilier — la carte T est détenue pour conformité réglementaire.
- **Disclaimer rendement** : Aucun disclaimer "performances passées" nécessaire — Versi Invest ne propose pas d'investir chez/avec Versi, mais accompagne l'investisseur sur des biens vendus par des tiers.

---

## Contraintes
- **Budget mensuel infrastructure** : Minimal — site React/Vite sur Replit, < 20€/mois
- **Budget mensuel acquisition** : 0€ (même approche que les autres sites Versi — réseau, terrain, bouche-à-oreille)
- **Timeline de lancement** : Dès que possible
- **Contraintes légales ou sectorielles** : Mentions légales obligatoires, RGPD formulaire, carte T en cours
- **Ressources disponibles** : [x] Solo (Thomas pilote avec les agents IA, Carl et Maxime valident)

---

## Existant
- **URL du site actuel** : Aucune — versi-invest.fr n'existe pas encore
- **Comptes sociaux existants** : LinkedIn individuels des 3 fondateurs (pas de page entreprise Versi Invest encore)
- **Contenu existant** : Design system partagé avec versi.fr et versi-immobilier.fr (PP Neue Montreal, tokens charcoal/calcaire/accent). Photos fondateurs existantes.
- **Historique SEO** : Aucun — domaine pas encore indexé

---

## Scope et périmètre du projet actuel

**Scope V1 (ce projet)** : versi-invest.fr — site vitrine multi-pages pour l'entité Versi Invest

**Structure du site** :
1. **Accueil** — Promesse (autofinancement + cashflow positif) + CTA inscription liste d'attente + références (5 immeubles en placeholder) + simulateur teaser
2. **Comment ça marche** — Process en étapes : sourcing off-market → visite accompagnée → simulation financière → accompagnement financement → travaux → mise en location
3. **Nos services** — 6 volets détaillés : sourcing, visite, simulation financière, financement, travaux, juridique/baux. Chaque service avec ce qui est inclus.
4. **Simulateur** — Outil simple : capacité d'emprunt → estimation rendement → cashflow mensuel. Pas de back-end complexe — calcul côté client.
5. **Références** — 5 immeubles (placeholders en V1 — Thomas uploadera les données plus tard). Orienté investisseur : rendement, cashflow mensuel, type de montage, nombre de lots. Cas d'étude anonymisés, pas de faux témoignages avec noms inventés.
6. **Équipe** — Les 3 co-fondateurs (mêmes profils que versi.fr et versi-immobilier.fr)
7. **Contact / Liste d'attente** — Formulaire de qualification : nom, email, téléphone, budget estimé, zone géographique, premier investissement oui/non, message. CTA = "S'inscrire pour être recontacté"
8. **Blog** — Séparé de versi-immobilier, dédié investissement immobilier locatif (rendement, cashflow, montages, zones)
9. **Pages légales** — Mentions légales + Politique de confidentialité

**Ce qui n'est PAS dans le scope V1** :
- Aucun bien affiché publiquement (off-market uniquement, sur demande)
- Pas de back office (pas de CRUD biens)
- Pas de gestion locative (possible sur demande, service à définir plus tard)
- Pas d'espace client / dashboard investisseur

**Éléments partagés avec l'écosystème Versi** :
- Design system : PP Neue Montreal, tokens charcoal/calcaire/accent, mêmes composants de base
- Ton de marque : identique (confiant, direct, zéro bullshit)
- Photos fondateurs : identiques
- Email : contact@versi.fr (adresse unique pour tout le groupe)
- Analytics : Umami
- Hero pattern : fade global 300ms (préférence fondateur)

---

## Notes libres

- Versi Invest est la 2e entité du Groupe Versi à avoir un site dédié (après Versi Immobilier).
- Les biens proposés par Versi Invest proviennent du flux d'opportunités détectées par l'activité de marchand de biens de Versi Immobilier — l'angle de communication exact est à définir par @creative-strategy.
- **IMPORTANT : aucun bien affiché publiquement.** Le site est une vitrine de crédibilité + un entonnoir d'inscription. Les biens sont présentés uniquement aux investisseurs inscrits et qualifiés.
- **IMPORTANT : PAS de rôles spécifiques (CEO, COO, CMO).** Les 3 fondateurs sont présentés comme "Co-fondateur", point.
- **IMPORTANT : contact@versi.fr** est l'unique adresse email pour tous les sites Versi.
- Profil de rigueur : V1-Production (toutes les gates G1-G32 + GP + GC si applicable)
- Les références V1 seront en placeholder — Thomas uploadera les 5 vrais immeubles dans un second temps.
- Les témoignages seront des cas d'étude anonymisés ("Un investisseur, Hauts-de-France, 2024 — immeuble 4 lots, rendement 8,7%, autofinancé") — jamais de noms fictifs.

---

## Historique des interventions agents

| Agent | Date | Fichiers produits | Décisions clés | Pourquoi / Alternatives écartées |
|-------|------|-------------------|-----------------|----------------------------------|
| @legal | 2026-04-14 | docs/legal/vi2-legal-audit.md, vi2-mentions-legales-draft.md, vi2-privacy-policy.md, vi2-rgpd-checklist.md | Carte T requise avant sourcing actif, pas de CIF/AMF, disclaimer simulateur obligatoire, RGPD = mesures précontractuelles, Umami exempté CNIL | Disclaimer AMF écarté (immobilier physique). CIF écarté. IOBSP non tranché. |
| @creative-strategy | 2026-04-14 | docs/strategy/vi2-brand-platform.md, vi2-personas.md, vi2-competitive-benchmark.md | Persona Nicolas (41 ans, Lille, 60-80k apport), positionnement "haute conviction, off-market structurel", accent bleu #1B3A5C, 5 concurrents benchmarkés | Persona distinct de Laurent (versi.fr) — Nicolas cherche un accompagnateur, Laurent évalue un opérateur. Clients partout en France (validation fondateur). |
| @product-manager | 2026-04-14 | docs/product/vi2-functional-specs.md, vi2-product-vision.md | 9 pages spécifiées, simulateur côté client avec formules exactes, formulaire 8 champs, 7 user stories, blog en BDD | Simulateur côté client (pas de backend) — calcul instantané. Références en config seed (pas de back office V1). |
| @design | 2026-04-14 | docs/design/vi2-design-system.md, vi2-page-compositions.md | Accent bleu #1B3A5C (distinct du vert Versi Immobilier), 5 composants spécifiques, 9 pages composées | Bleu profond = confiance/investissement vs vert = patrimoine bâti. Contrastes WCAG AA vérifiés. |
| @copywriter | 2026-04-14 | docs/copy/vi2-brand-voice.md, vi2-landing-page-copy.md | Hero "Des biens qui s'autofinancent. Fondateurs en direct, de A à Z.", 10 mots interdits, 9 pages copyées | "accompagnement" interdit en client-facing (trop proche plateformes volume). |
| @fullstack | 2026-04-14 | versi-invest-site/ (40+ fichiers) | Site complet : 9 pages + serveur Express + PostgreSQL + simulateur + blog + formulaire qualification | 2 agents parallèles (statique + dynamique). Build OK 331 KB JS. |
| @seo | 2026-04-14 | docs/seo/vi2-seo-strategy.md | 15 mots-clés, meta tags 10 pages, Schema.org, prerender requis | SEO dans meta tags, UX dans H1 (learning s8). |
| @geo | 2026-04-14 | docs/geo/vi2-geo-strategy.md | llms.txt, FAQPage 8 questions, contenu citationnable, E-E-A-T | Off-site (LinkedIn, Pappers) = action fondateur. |
| @growth | 2026-04-14 | docs/growth/vi2-growth-strategy.md | Canal prescripteurs = meilleur ROI 30j, LinkedIn 3-5 posts/semaine, blog 2 articles/mois | Budget acquisition = 0€, tout organique. |
| @social | 2026-04-14 | docs/social/vi2-social-strategy.md | Calendrier éditorial 3j/semaine, pipeline IA, format texte+image | Vidéo écartée en V1 (ROI insuffisant). |
| orchestrator | 2026-04-14 | orchestration-plan.md, tous les livrables ci-dessus | Session s9 : Phases 0-4 complètes. Phase 5 (audit) en attente session suivante. | Timeouts récurrents agents → orchestrateur a écrit directement specs, design, SEO, GEO. |
| orchestrator + agents | 2026-04-15 | SEO/GEO technique, audits multi-agents, blog complet, pipeline autonome | Session s10 : SEO/GEO implémenté, 5 rounds audit HomePage, refonte process 8 étapes, fusion Services+Process, blog "Le regard Versi" avec 4 articles + pipeline IA autonome, comparaison VI/VI2, référence réelle Nanterre | Bleu #1B3A5C supprimé (fondateur), off-market retiré comme promesse (pas systématique), simulateur supprimé, stats corrigées 7 immeubles/3,2M€, carte T obtenue (pas "en cours") |
| @reviewer | 2026-04-15 | docs/reviews/vi2-cross-review-report.md | 17/17 livrables audités, GO CONDITIONNEL, G5/G6 corrigés | Persona Laurent→Nicolas corrigé, KPI aligné |
| @creative-strategy | 2026-04-15 | Hero itéré 5 versions, FAQ réécrite, blog strategy | H1 "Biens rares. En direct.", subtitle raccourci, FAQ orientée Nicolas, blog "Le regard Versi" | "Off-market" retiré du H1 (pas systématique), LMNP article remplacé par "60k€ d'apport" (trop concurrentiel) |
| @copywriter | 2026-04-15 | docs/seo/vi2-blog-strategy.md (4 articles complets) | 4 articles itérés 7→9/10, off-market corrigé dans A1/A3, [HYPOTHÈSE] supprimés | A4 LMNP remplacé (trop généraliste vs portails) par article apport 60k€ (spécifique Nicolas) |
| @seo | 2026-04-15 | Audit SEO/GEO 6→9/10, mots-clés blog 5→9/10 | Schema.org corrigé, llms.txt mis à jour, sitemap+robots, FAQ synchronisée JSX/Schema.org | Rythme blog évolutif recommandé (2/mois puis 1/semaine) |
| @design | 2026-04-15 | Audit design 6.5→8/10, menu mobile corrigé | Bleu supprimé, section-padding aligné VI, fondateurs pattern TeamTeaser, menu mobile responsive | Photos cercle→carte rectangulaire (alignement versi-immobilier) |
| @ia | 2026-04-15 | Pipeline blog generate-blog-article.js (2 sites) | 9 gates, audit 4 dimensions, prompt caching, lock file, backup local | Score pipeline 5.75→9.5/10 après 2 rounds d'audit |

---

## Performance des agents

| Agent | Date | Livrable | Complétude | Cohérence | Actionnabilité | Messages | Spécificité | Notes |
|-------|------|----------|------------|-----------|----------------|----------|-------------|-------|
| | | | | | | | | |

---

### Mémo de reprise

**Branche** : `claude/seo-geo-deployment-ycerL`
**Date de clôture** : 2026-04-15
**Dernier commit** : `eb9ae98` (cashflow Nanterre)

**Résumé session (versi-s10)** : Session massive de finition Versi Invest. (1) SEO/GEO technique complet (robots.txt, sitemap, llms.txt, Schema.org, OG tags, FAQPage). (2) Audit reviewer 32 gates → GO CONDITIONNEL, corrections G5/G6 appliquées. (3) 5 rounds d'itération HomePage avec @creative-strategy, @ux, @design (6/10 → 9+/10). (4) Refonte processus : 8 vraies étapes, fusion Services+Process, simulateur supprimé. (5) Blog "Le regard Versi" complet : 25 mots-clés, 4 articles audités 9/10, pipeline IA autonome (9 gates, audit 4-dim, crons node-cron). (6) Alignement versi-immobilier : tokens, favicons, FAQ, Resend, section-padding. (7) Référence réelle Nanterre 8 studios avec photos et chiffres vrais.

**Décisions fondateur cette session** :
- H1 "Biens rares. En direct." (pas off-market — pas systématique)
- Subtitle "Des biens qui s'autofinancent. Cashflow positif. Une seule commission : 5%."
- Carte T OBTENUE (pas "en cours")
- Stats : 7 immeubles, 3,2M€ de volume opéré
- Bleu #1B3A5C supprimé → palette stone/charcoal alignée Versi
- Simulateur supprimé du site
- Blog renommé "Le regard Versi"
- Services et Process fusionnés en une page unique
- Description versi.fr remise à l'originale
- Référence : une seule vraie (Nanterre 8 studios, 590k€, 11,9% brut, +1 750 €/mois cashflow)

**Travail restant — PROCHAINE SESSION** :

1. **Blog en production** :
   - Exécuter `npm run seed:invest` sur Replit (insère les 4 articles)
   - Ajouter `ANTHROPIC_API_KEY` dans les secrets Replit (active les crons blog)

2. **og:image** :
   - Créer asset 1200×630 pour les partages sociaux (action fondateur)
   - Ajouter dans PageHead.jsx

3. **Finitions design** :
   - Vérifier rendu mobile complet (toutes pages)
   - Tester formulaire contact en production

4. **Actions fondateur (hors agents)** :
   - Ajouter prochaines références réelles (photos + chiffres)
   - Créer page LinkedIn entreprise Versi Invest
   - Créer fiche Pappers.fr (dès immatriculation SAS)

**Commande de reprise suggérée** :
```
@orchestrator mode reprise Versi Invest (s11). Lis versi-invest/project-context.md. Priorité : (1) vérifier blog en prod après seed, (2) audit mobile complet, (3) formulaire contact test en production.
```
