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
- **Réglementation** : Carte T (transaction immobilière) en cours d'obtention. Versi Invest n'est PAS un agent immobilier — la carte T est détenue pour conformité réglementaire.
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
| @legal | 2026-04-14 | docs/legal/vi2-legal-audit.md, docs/legal/vi2-mentions-legales-draft.md, docs/legal/vi2-privacy-policy.md, docs/legal/vi2-rgpd-checklist.md | Activité soumise Loi Hoguet — carte T requise avant sourcing actif ; pas de statut CIF/AMF (immobilier physique) ; IOBSP à étudier si accompagnement financement central ; honoraires 5% TTC légaux sous mandat écrit ; disclaimer simulation indicative (pas de disclaimer AMF "performances passées") ; double mandat Versi Immo/Versi Invest à déclarer par écrit ; base légale RGPD = mesures précontractuelles ; Umami = exemption CNIL ; éditeur = SAS Gradient One pendant période transitoire | Disclaimer "performances passées ne préjugent pas" écarté : Versi Invest accompagne à l'immobilier physique et ne collecte pas de fonds — réglementation AMF non applicable. Qualification CIF écartée : l'immobilier physique n'est pas un instrument financier au sens du CMF. IOBSP : non tranché — dépend du positionnement de l'accompagnement financement (simple conseil vs présentation d'offres de crédit). |

---

## Performance des agents

| Agent | Date | Livrable | Complétude | Cohérence | Actionnabilité | Messages | Spécificité | Notes |
|-------|------|----------|------------|-----------|----------------|----------|-------------|-------|
| | | | | | | | | |

---

### Mémo de reprise

**Branche** : À définir lors du lancement
**Date de clôture** : —
**Dernier commit** : —

**Résumé** : Projet Versi Invest créé. project-context.md prêt. En attente du lancement autopilot.

**Prochaines actions** :
1. Lancer le prompt autopilot (phases 0→5)
2. @creative-strategy définit le persona, les frustrations, les verbatims, le benchmark concurrentiel
3. Phase 0 complète (stratégie + legal + specs)
4. Checkpoint fondateur avant Phase 1

**Commande de reprise suggérée** :
```
@orchestrator Lance mon projet en mode autopilot (phases 0→5). [coller le prompt autopilot complet]
```
