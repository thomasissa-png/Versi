# Audit juridique — Versi (versi.fr)

> Agent : @legal | Date : 2026-04-08 | Version : 1.0
> Périmètre : site vitrine statique one-page, holding immobilière française, formulaire de contact

---

## Résumé exécutif — Risques en 5 points

| # | Risque | Criticité | Statut |
|---|--------|-----------|--------|
| R1 | Absence de mentions légales au lancement | CRITIQUE — amende jusqu'à 375 000 € (personne morale) | À traiter avant mise en ligne |
| R2 | Formulaire de contact sans information RGPD ni droit d'opposition | ÉLEVÉ — contrôle CNIL en hausse (280+ sanctions en 2025) | À traiter avant mise en ligne |
| R3 | Analytics sans consentement si solution non exemptée (ex. GA4) | MOYEN — illégal sans bandeau cookies conforme | Conditionnel au choix analytics |
| R4 | Mentions des 4 entités (versi-developpement.fr, etc.) sans sites actifs | FAIBLE — pas d'obligation active, vigilance sur les promesses implicites | Suivi recommandé |
| R5 | Qualification AMF / AIFM si évolution vers collecte de capitaux | FAIBLE à ce stade — versi.fr ne collecte pas de fonds | À réévaluer si modèle économique évolue |

**Note** : ce document est un audit de référence produit par un agent IA à partir des textes en vigueur. Il ne constitue pas un avis juridique formel. La validation par un avocat spécialisé en droit du numérique est recommandée avant la mise en production, notamment pour les mentions légales.

---

## 1. Cadre juridique applicable

### 1.1 Textes de référence

| Texte | Portée | Impact sur versi.fr |
|-------|--------|---------------------|
| Loi n° 2004-575 du 21 juin 2004 (LCEN) | Mentions légales obligatoires pour tout site professionnel | Obligatoire — éditeur, hébergeur, directeur de publication |
| Règlement (UE) 2016/679 (RGPD) | Protection des données personnelles | Obligatoire — formulaire de contact collecte nom/email/téléphone |
| Loi n° 78-17 du 6 janvier 1978 (Informatique et Libertés, modifiée) | Transposition nationale du RGPD | Obligatoire — complémentaire au RGPD |
| Directive ePrivacy (2002/58/CE), transposée à l'article 82 de la loi I&L | Cookies et traceurs | Obligatoire si analytics ou cookies déposés |
| Code de la propriété intellectuelle | Protection du nom, du logo, du contenu | Recommandé — protéger la marque Versi |
| Code de commerce (art. L. 210-1 et s.) | Mentions obligatoires pour les sociétés | Capital social, RCS, forme juridique dans les mentions légales |

### 1.2 Régime applicable à Versi

Versi est une holding immobilière opérant en France, exploitant un site vitrine institutionnel sans vente en ligne, sans abonnement, sans collecte de paiement. Ce positionnement simplifie considérablement le périmètre réglementaire :

- **Pas de CGV obligatoires** : absence de transaction commerciale sur le site
- **Pas d'obligation DSA/DMA** : site vitrine non qualifiable de plateforme en ligne au sens du Digital Services Act
- **Pas d'obligation AMF** : Versi ne collecte pas de fonds auprès du public et ne propose pas d'instruments financiers sur ce site. L'activité de holding opérationnelle (acquisition, transformation, détention de biens en propre) ne constitue pas une gestion pour compte de tiers soumise à agrément AMF
- **Pas d'EU AI Act applicable** : aucun système d'IA sur le site

---

## 2. Obligations obligatoires — Site vitrine de société française

### 2.1 Mentions légales (LCEN, article 6-III)

Obligatoires pour tout site à titre professionnel. Sanctions en cas d'absence : 1 an d'emprisonnement et 75 000 € (personne physique) ou 375 000 € (personne morale).

**Informations requises pour une société :**
- Dénomination sociale : Versi (à compléter avec la forme juridique exacte)
- Siège social (adresse complète)
- Numéro RCS (ville d'immatriculation + numéro SIREN)
- Capital social
- Numéro de TVA intracommunautaire (si assujetti)
- Directeur de la publication (personne physique responsable du contenu)
- Coordonnées de contact (email non surtaxé + téléphone non surtaxé)
- Hébergeur (raison sociale, adresse, contact)

**Informations recommandées (non obligatoires mais professionnelles) :**
- Crédits photographiques et droits des images utilisées
- Mention de propriété intellectuelle sur le contenu du site
- Liens vers la politique de confidentialité

### 2.2 Information RGPD sur le formulaire de contact

Le formulaire de contact de versi.fr collecte : nom, email, téléphone, message. Ces données constituent des données personnelles au sens de l'article 4 du RGPD.

**Obligations applicables :**
- Information de la personne concernée au moment de la collecte (art. 13 RGPD)
- Mention de la finalité du traitement
- Mention de la base légale
- Durée de conservation
- Droits de la personne (accès, rectification, suppression, portabilité, opposition)
- Coordonnées du responsable de traitement
- Droit de saisir la CNIL

**Base légale retenue** : l'intérêt légitime du responsable de traitement (art. 6.1.f RGPD) est la base la plus adaptée pour répondre à une demande de contact initiée volontairement par l'utilisateur. Cette base est conforme aux recommandations CNIL pour les formulaires de contact sur les sites vitrines professionnels.

**Durée de conservation recommandée** : 3 ans à compter du dernier contact émanant du prospect (référentiel CNIL pour les données prospects/contacts commerciaux).

### 2.3 Cookies et traceurs

**Situation actuelle** : le site est un site statique React sans backend. À ce stade, si aucun analytics tiers n'est intégré, aucun cookie n'est déposé et aucun bandeau n'est requis.

**Si Plausible Analytics est intégré** (recommandé pour versi.fr) : Plausible est une solution cookieless — elle ne dépose aucun cookie et ne collecte pas de données personnelles identifiables. Aucun bandeau de consentement n'est requis. Aucune inscription au registre des traitements RGPD n'est nécessaire pour Plausible en mode standard.

**Si Google Analytics 4 est intégré** : GA4 dépose des cookies et collecte des données transférées vers des serveurs américains (problématique Schrems II). Un bandeau de consentement conforme CNIL est obligatoire. Non recommandé pour versi.fr au regard du profil de risque et du positionnement institutionnel.

**Recommandation** : adopter Plausible Analytics — solution européenne (hébergement EU), cookieless, conforme RGPD par conception, exempt de bandeau de consentement.

---

## 3. Spécificités secteur immobilier — Holding intégrée

### 3.1 Qualification réglementaire de Versi

Versi est une holding immobilière opérationnelle qui :
- Acquiert des biens en propre (fonds propres ou dette)
- Transforme et revend (marchand de biens via Versi Développement)
- Détient en propre (patrimoine locatif via Versi Capital)
- Structure financièrement ses propres opérations (Versi Finance)

**Ce que Versi N'EST PAS au regard de la réglementation financière :**
- Pas un fonds d'investissement alternatif (FIA) : Versi n'investit pas les capitaux de tiers
- Pas un organisme de placement collectif (OPC) : pas de collecte publique de fonds
- Pas soumis à agrément AMF ou AIFM : seuil d'assujettissement AIFM = gestion pour compte de tiers au-delà de 100M€ d'actifs ou 500M€ sans levier

**Ce que versi.fr peut et ne peut pas faire :**
- Peut : présenter ses activités, ses fondateurs, son approche, proposer un formulaire de contact
- Peut : mentionner ses projets réalisés (track record) sans qualification financière
- Ne peut pas : promettre des rendements ou performances à des tiers, proposer des investissements, présenter des opportunités co-investisseurs avec promesse de gains (risque d'appel public à l'épargne ou démarchage financier sans agrément)

**Vigilance sur la section "Activités"** : la mention de Versi Invest ("structuration d'investissement") et Versi Capital ("foncière") doit rester descriptive et institutionnelle. Éviter tout langage évoquant des opportunités d'investissement ouvertes au public.

### 3.2 Carte Professionnelle de l'Immobilier (loi Hoguet)

**Non applicable à versi.fr** : la loi Hoguet (n° 70-9 du 2 janvier 1970) impose la détention d'une carte professionnelle T (transaction), G (gestion) ou S (syndic) pour exercer ces activités pour le compte d'autrui. Versi opère pour son propre compte — la loi Hoguet ne s'applique pas à l'activité de marchand de biens ni à la gestion de son propre patrimoine.

**Recommandation** : si une entité du groupe (Versi Développement ou autre) exerce des activités de transaction ou gestion pour compte de tiers, vérifier la nécessité d'obtenir une carte professionnelle et de la mentionner sur le site correspondant. Non requis pour versi.fr à ce stade.

---

## 4. Propriété intellectuelle

### 4.1 Protection du nom et de la marque Versi

**Risque identifié** : le nom "Versi" n'est pas protégé en tant que marque à ce stade (aucune mention de dépôt INPI dans le project-context.md). Un tiers pourrait déposer ce nom.

**Recommandation** : déposer la marque "Versi" à l'INPI (marque française, classe 36 — services immobiliers et financiers) avant le lancement du site. Coût : environ 190 € pour une classe.

**Vérification préalable obligatoire** : avant dépôt, rechercher les antériorités sur base.marques.inpi.fr et sur la base de données EUIPO (marque européenne). Cette vérification doit être effectuée par le fondateur ou un conseil en propriété intellectuelle.

### 4.2 Contenu du site

- **Textes** : droits d'auteur sur les contenus originaux — les mentionner dans les mentions légales
- **Photos des fondateurs** : droits d'image à obtenir par écrit de chaque fondateur (Carl, Maxime, Thomas) — un email de validation interne entre co-fondateurs suffit
- **Photos architecturales** : utiliser uniquement des photos libres de droits (Unsplash, Pexels, sources commerciales) ou des photos propriétaires. Mentionner les crédits dans les mentions légales
- **Logo Versi** : si un logo est créé, s'assurer que le prestataire ou l'agent cède expressément les droits à Versi

---

## 5. Recommandations par ordre de priorité

| Priorité | Action | Délai | Responsable |
|----------|--------|-------|-------------|
| P0 — Avant mise en ligne | Intégrer les mentions légales complètes (draft fourni) | Avant lancement | Thomas (compléter les champs SIRET/forme/capital) |
| P0 — Avant mise en ligne | Intégrer la politique de confidentialité (draft fourni) | Avant lancement | Thomas → @fullstack pour intégration |
| P0 — Avant mise en ligne | Ajouter l'information RGPD sous le formulaire de contact | Avant lancement | @fullstack |
| P1 — Dans le mois | Choisir Plausible Analytics (évite le bandeau cookies) | Post-lancement | Thomas |
| P1 — Dans le mois | Vérifier disponibilité marque "Versi" sur base INPI | Avant lancement | Thomas (recherche gratuite en ligne) |
| P1 — Dans le mois | Déposer marque Versi à l'INPI (classe 36) | Dès que possible | Thomas ou conseil PI |
| P2 — Dans les 3 mois | Constituer le registre des traitements RGPD | 3 mois post-lancement | Thomas |
| P2 — Dans les 3 mois | Vérifier les droits sur les photos architecturales utilisées | Avant publication de contenu | Thomas |
| P3 — À anticiper | Si co-investisseurs : consulter un avocat avant toute communication sur versi.fr | Avant évolution du modèle | Thomas + avocat |

---

## 6. Ce que versi.fr N'a PAS besoin (simplifications)

- Pas de CGV (aucune vente en ligne)
- Pas de CGU (aucune inscription, aucun espace membre)
- Pas de bandeau cookies si Plausible est retenu
- Pas d'agrément AMF pour le site vitrine actuel
- Pas de DPO obligatoire (pas de traitement à grande échelle ni de données sensibles)
- Pas de registre de traitement formalisé immédiatement (obligation des 250 employés ou traitement régulier — applicable dès que le traitement est régulier, recommandé dès le lancement)

---

## Hypothèses à valider

- [HYPOTHÈSE : Versi n'a pas encore de numéro SIRET attribué — à vérifier. Si la société est en cours d'immatriculation, mentionner "immatriculation en cours" dans les mentions légales]
- [HYPOTHÈSE : La forme juridique (SAS, SARL, SA...) n'est pas précisée dans project-context.md — à compléter obligatoirement]
- [HYPOTHÈSE : L'hébergeur final (Vercel/Netlify/autre) n'est pas encore déterminé — à compléter avant mise en ligne]
- [HYPOTHÈSE : Plausible Analytics est retenu comme solution d'analytics — si GA4 est préféré, les obligations cookies changent]

---

**Handoff → @fullstack**

- Fichiers produits : `/docs/legal/legal-audit.md`
- Décisions prises : Pas de bandeau cookies si Plausible Analytics. Intérêt légitime comme base légale pour le formulaire de contact. Pas de CGU/CGV nécessaires. Pas d'obligation AMF pour ce site vitrine.
- Points d'attention :
  - Intégrer l'information RGPD directement sous le formulaire de contact (voir rgpd-checklist.md pour le texte exact)
  - Ajouter un lien "Politique de confidentialité" dans le footer (pointe vers privacy-policy.md)
  - Ajouter un lien "Mentions légales" dans le footer (pointe vers mentions-legales-draft.md)
  - Thomas doit compléter les champs [À COMPLÉTER] avant mise en ligne (SIRET, forme juridique, capital, hébergeur)
  - Validation avocat recommandée pour les mentions légales finales
