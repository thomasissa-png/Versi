# Checklist RGPD — Versi Invest

> Agent : @legal | Date : 2026-04-14 | Version : 1.0
> Périmètre : site Versi Invest — formulaire de qualification investisseur, analytics Umami, sous-traitants
> À compléter avant mise en ligne et à réviser trimestriellement

---

## Résumé exécutif — Risques en 5 points

| # | Point | Statut |
|---|-------|--------|
| R1 | Consentement formulaire qualification : case non pré-cochée obligatoire | À implémenter |
| R2 | Registre des traitements : obligatoire dès la première collecte | À créer |
| R3 | DPA sous-traitants : Replit et Formspree doivent signer un accord de traitement | À faire avant mise en ligne |
| R4 | Procédure suppression : réponse sous 30 jours à toute demande | À documenter |
| R5 | Durée de conservation : purge à mettre en place dès les premiers contacts | À implémenter |

---

## 1. Consentement et information — Formulaire de qualification

| # | Item | Statut | Action |
|---|------|--------|--------|
| C1 | Case à cocher consentement marketing présente dans le formulaire | À FAIRE | Ajouter une checkbox distincte "J'accepte de recevoir des informations de Versi Invest" |
| C2 | Case à cocher consentement marketing non pré-cochée | À FAIRE | Vérifier l'implémentation frontend — case vide par défaut |
| C3 | Mention d'information RGPD affichée sous le formulaire | À FAIRE | Afficher : "En soumettant ce formulaire, vos données sont traitées par Versi Invest pour qualifier votre projet. [Lien : Politique de confidentialité]" |
| C4 | Lien vers la politique de confidentialité accessible depuis le formulaire | À FAIRE | Lien cliquable vers /politique-de-confidentialite |
| C5 | Données de qualification soumissibles sans consentement marketing (consentement marketing = optionnel) | À FAIRE | Validation frontend : la qualification ne doit pas être bloquée si la case marketing n'est pas cochée |
| C6 | Preuve de consentement conservée (timestamp + état de la case) | À FAIRE | Logger le timestamp et l'état de la case à chaque soumission — conserver 3 ans après retrait |

---

## 2. Registre des traitements

Le registre des traitements est obligatoire pour tout responsable de traitement (art. 30 RGPD). Tenu à jour, présentable à la CNIL sur demande.

| # | Item | Statut | Action |
|---|------|--------|--------|
| R1 | Registre des traitements créé | À FAIRE | Créer un tableur ou document interne listant tous les traitements |
| R2 | Traitement "Qualification investisseur" documenté | À FAIRE | Finalité, base légale, données, durée, sous-traitants, destinataires |
| R3 | Traitement "Analytics Umami" documenté | À FAIRE | Données anonymisées — documenter la configuration exemption CNIL |
| R4 | Traitement "Gestion des missions clients" documenté | À FAIRE | Données contractuelles, durée 5 ans, accès équipe Versi Invest |
| R5 | Registre mis à jour à chaque nouveau traitement | CONTINU | Responsable : [À REMPLIR PAR LE FONDATEUR] |

**Modèle de fiche registre (à dupliquer pour chaque traitement) :**

```
Nom : Qualification investisseur
Responsable : SAS Gradient One / Versi Invest
Finalité : Qualifier le profil avant accompagnement
Base légale : Art. 6.1.b (précontractuel) + art. 6.1.a (consentement marketing)
Données : identité, coordonnées, budget, capacité emprunt, objectifs
Destinataires : équipe Versi Invest uniquement
Sous-traitants : Replit Inc. (hébergement), Formspree (formulaire)
Transferts hors UE : oui (USA) — Clauses Contractuelles Types UE
Durée : 3 ans prospects / 5 ans clients
Sécurité : HTTPS, accès restreint, 2FA
```

---

## 3. Sous-traitants — Accords de traitement (DPA)

| # | Sous-traitant | Rôle | DPA signé | Action |
|---|--------------|------|-----------|--------|
| S1 | Replit Inc. | Hébergement site et données | À FAIRE | Vérifier si Replit propose un DPA — chercher sur replit.com/legal |
| S2 | Formspree | Traitement des soumissions de formulaire | À FAIRE | Télécharger et signer le DPA Formspree sur formspree.io/legal |
| S3 | Umami auto-hébergé | Analytics | N/A | Auto-hébergé = pas de sous-traitant externe |
| S4 | Tout nouvel outil (CRM, email, etc.) | À définir | À FAIRE | Vérifier DPA et localisation des données avant tout nouvel outil |

---

## 4. Durée de conservation et procédure de purge

| # | Catégorie | Durée | Méthode | Statut |
|---|-----------|-------|---------|--------|
| D1 | Prospects non convertis | 3 ans après dernier contact | Suppression manuelle ou CRM — revue annuelle en janvier | À IMPLÉMENTER |
| D2 | Clients — données mission | 5 ans après fin de mission | Archivage sécurisé puis suppression | À IMPLÉMENTER |
| D3 | Simulations financières | 3 ans après la simulation | Suppression ou anonymisation | À IMPLÉMENTER |
| D4 | Logs Umami Analytics | 13 mois glissants | Paramètre natif Umami (purge automatique) | À VÉRIFIER |
| D5 | Preuves de consentement | 3 ans après retrait | Conservation spécifique — ne pas purger avant délai | À IMPLÉMENTER |

---

## 5. Procédure d'exercice des droits RGPD

| # | Étape | Délai légal | Responsable | Statut |
|---|-------|-------------|-------------|--------|
| E1 | Réception d'une demande à contact@versi.fr | — | Thomas Issa | À documenter |
| E2 | Accusé de réception | Immédiat | Thomas Issa | À documenter |
| E3 | Vérification de l'identité du demandeur | J+0 à J+5 | Thomas Issa | À documenter |
| E4 | Traitement : accès, rectification, suppression, portabilité | J+30 maximum | Thomas Issa | À documenter |
| E5 | Information du demandeur de la suite donnée | J+30 maximum | Thomas Issa | À documenter |
| E6 | Documentation de la demande et de la réponse | À la clôture | Thomas Issa | À documenter |
| E7 | En cas de refus : information du droit de réclamation CNIL | Avec le refus | Thomas Issa | À documenter |

**Procédure suppression (cas particulier) :**
1. Vérifier si une obligation légale de conservation s'oppose à la suppression (données clients = 5 ans)
2. Si oui : informer le demandeur de l'obligation légale et du délai résiduel
3. Si non : supprimer dans tous les systèmes (CRM, email, formulaire) sous 30 jours
4. Confirmer la suppression par email

---

## 6. Sécurité — Mesures minimales

| # | Mesure | Statut | Action |
|---|--------|--------|--------|
| SEC1 | HTTPS sur l'ensemble du site Versi Invest | À VÉRIFIER | Confirmer certificat SSL actif sur le domaine |
| SEC2 | Accès aux données prospects limité à l'équipe Versi Invest | À FAIRE | Définir les accès dans chaque outil |
| SEC3 | Mots de passe forts sur tous les outils | À FAIRE | Utiliser un gestionnaire de mots de passe (Bitwarden, 1Password) |
| SEC4 | Authentification à deux facteurs (2FA) sur les outils contenant des données personnelles | À FAIRE | Activer 2FA sur email, CRM, hébergeur |
| SEC5 | Procédure de notification de violation de données documentée | À FAIRE | En cas de fuite : notifier la CNIL sous 72h (art. 33 RGPD) + personnes concernées si risque élevé |

---

## 7. Synthèse — Statut global avant mise en ligne

| Zone | Items | Fait | À faire | Bloquant mise en ligne |
|------|-------|------|---------|----------------------|
| Consentement formulaire | 6 | 0 | 6 | Oui — C1, C2, C3, C4 |
| Registre des traitements | 5 | 0 | 5 | Non — recommandé dès J1 |
| DPA sous-traitants | 4 | 0 | 4 | Oui — S1, S2 |
| Durée de conservation | 5 | 0 | 5 | Non — à mettre en place dans les 3 premiers mois |
| Procédure droits | 7 | 0 | 7 | Non — à documenter avant premiers contacts |
| Sécurité | 5 | 0 | 5 | Oui — SEC1, SEC3, SEC4 |

**4 items bloquants avant mise en ligne :**
1. C1/C2 : checkbox consentement marketing non pré-cochée dans le formulaire
2. C3/C4 : mention RGPD + lien politique de confidentialité sous le formulaire
3. S1/S2 : DPA Replit + DPA Formspree signés
4. SEC1 : HTTPS actif sur le domaine Versi Invest

---

**Handoff → @fullstack**
- Fichiers produits : docs/legal/vi2-rgpd-checklist.md
- Décisions prises : registre des traitements à créer ; DPA Replit + Formspree bloquants avant mise en ligne ; checkbox consentement marketing non pré-cochée et optionnelle ; procédure droits via contact@versi.fr en 30 jours max
- Points d'attention à implémenter :
  - Formulaire : ajouter checkbox consentement marketing non pré-cochée + mention RGPD + lien politique de confidentialité
  - Logger timestamp + état de la case à chaque soumission
  - HTTPS à vérifier sur le domaine Versi Invest
  - 2FA à activer sur tous les outils contenant des données personnelles
