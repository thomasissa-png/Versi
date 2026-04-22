# Benchmark floorplan AI — s25 (focus marchand de biens)
> Date : 2026-04-22 | Auteur : @creative-strategy | Session : s25 Phase 0

---

## Panel concurrents

| Outil | Cible | Stack IA approx | Tarif approx | Force | Faiblesse |
|---|---|---|---|---|---|
| **CubiCasa** | Photographes immo, agences | CV deep learning, scan smartphone | Gratuit (basique US) + add-ons payants [N/D FR] | Précision géométrique élevée, livraison 24h | Scan physique obligatoire — incompatible PDF entrant |
| **Magicplan** | Artisans, chantier, restauration | LiDAR + AR smartphone, OCR basique | ~10-30€/mois (abonnement) | Mesure terrain sans équipement pro | Pas d'ingestion PDF — pensé pour mesure physique |
| **Matterport** | Luxe immo, promoteurs | Caméra 3D propriétaire, reconstruction vol. | 500-1500€/an + équipement | Tour 3D immersif, plan schématique en prime | Matériel dédié requis, aucun pipeline PDF |
| **RoomGPT** | Grand public, home staging | Diffusion img-to-img | Freemium | Génération visuelle rapide | Proportions non fiables, zéro extraction structurée |
| **Archilogic** | Promoteurs, facility mgmt B2B | Vectorisation, modèle spatial API | Sur devis (B2B contrats) | API documentée, SDK 2D/3D, modèle de données robuste | Cible entreprises, intégration lourde, pas de self-serve |
| **Planner 5D AI** | Grand public, architectes amateurs | OCR + reconstruction 3D | Freemium + ~30€/mois | Convert PDF → 3D, no-code | Fidélité variable, pas d'extraction sémantique des pièces |

---

## Patterns dominants

1. **Scan physique > PDF entrant** : CubiCasa et Magicplan — leaders du marché — sont bâtis autour du scan terrain. Zéro optimisation pour l'ingestion de plans PDF existants.
2. **Grand public ou enterprise, rien entre les deux** : RoomGPT/Planner5D visent le grand public (proportions approximatives acceptables). Archilogic vise l'enterprise (contrats, SDK). La niche B2B self-serve professionnelle est vide.
3. **Absence totale de logique métier** : aucun outil ne comprend les concepts marchand de biens (lot, surface Carrez, quote-part parties communes). Tous traitent des "pièces", pas des "lots".
4. **Canonicalisation absente** : aucun acteur ne normalise les plans entrants (orientation, échelle, qualité) avant extraction. Les pipelines supposent un input propre.
5. **Génération visuelle découplée de l'extraction** : RoomGPT génère du beau mais ne sait rien de la géométrie. Les extracteurs (CubiCasa, Archilogic) ne génèrent pas de visuels IA.

---

## Trous de marché

1. **Pipeline PDF → extraction sémantique métier (lots Carrez) → visuels IA, en self-serve** : aucun acteur ne couvre ce chemin complet. Le marchand de biens qui reçoit un plan PDF notarial n'a aucun outil adapté.
2. **Canonicalisation pré-extraction** : zéro concurrent n'adresse la variabilité qualité des plans entrants (scan papier, PDF vectoriel, photo téléphone). Qui résout ce problème résout l'angle mort de toute la concurrence.

---

## Reco positionnement Versi

**Claim unique** : "Le seul outil qui transforme n'importe quel plan PDF en dossier de lots prêt à commercialiser — sans scan terrain, sans intégration enterprise."

**2 features must-have**
- Ingestion PDF natif (vectoriel, scan, photo) avec canonicalisation automatique avant extraction
- Extraction sémantique orientée métier : lot, surface Carrez, quote-part — pas juste "pièces"

**2 kill-criteria différenciateurs**
- Zéro matériel requis (vs CubiCasa/Matterport) : le plan PDF du notaire suffit
- Vocabulaire marchand de biens natif (lot, Carrez, parties communes) : aucun concurrent ne parle ce langage

---

## Impact refonte pipeline — canonicalisation

| Approche | Concurrence | Versi |
|---|---|---|
| Sans canonicalisation | Tous les acteurs supposent un input propre (scan pro ou CAD) | Plafonne sur plans PDF variables (rotation, contraste, échelle) |
| Avec canonicalisation | **Aucun concurrent** n'intègre cette étape | Débloque l'ingestion universelle — avantage technique durable |

**Verdict** : la canonicalisation n'est pas un détail pipeline — c'est le seul moyen de tenir la promesse "n'importe quel plan PDF". Sans elle, Versi est CubiCasa sans le scan. Avec elle, Versi est la seule solution qui fonctionne sur les plans réels des marchands de biens (scans notariaux, vieux PDF, photos terrain).

**Recommandation** : investir dans la canonicalisation (normalisation orientation + échelle + qualité) comme gate obligatoire étape 1. C'est un différenciateur structurel, pas une amélioration incrémentale.

---

## Handoff

**Fichiers produits** : `/home/user/Versi/docs/strategy/s25-benchmark-floorplan-ai.md`

**Décisions éclairées** :
- Canonicalisation = prérequis stratégique, pas option technique
- Positionnement cible : B2B self-serve, marchands de biens, PDF entrant — espace vide confirmé
- Différenciateur language métier (lot/Carrez) : non adressé par aucun concurrent

**Points d'attention** : tarifs CubiCasa FR et Archilogic non disponibles publiquement — [INFO NON DISPONIBLE] confirmé sur pricing exact. Les patterns de marché restent valides indépendamment des prix.

---
*Sources benchmark : [CubiCasa pricing](https://www.cubi.casa/pricing/) · [Best AI Floor Plan 2026](https://www.cubi.casa/best-ai-floor-plan/) · [Archilogic](https://www.archilogic.com) · [Planner 5D AI](https://planner5d.com/ai)*
