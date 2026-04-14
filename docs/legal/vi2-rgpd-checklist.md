# Checklist RGPD — Versi Invest

> Agent : @legal | Date : 2026-04-14 | Version : 1.0
> Statut : Document de pilotage — à mettre à jour à chaque évolution du produit
> Chemin : docs/legal/vi2-rgpd-checklist.md

---

## Résumé statut global

| Statut | Nombre |
|--------|--------|
| FAIT | 2 |
| À FAIRE — @fullstack | 4 |
| À FAIRE — Fondateur | 3 |
| À VÉRIFIER | 1 |
| **Total** | **10** |

---

## Checklist détaillée

| # | Obligation RGPD | Statut | Owner | Action requise |
|---|----------------|--------|-------|----------------|
| 1 | Formulaire : case de consentement explicite (non pré-cochée) | A FAIRE | @fullstack | Ajouter une checkbox non pré-cochée libellée : "J'accepte que mes données soient utilisées par Versi Invest pour me recontacter dans le cadre de mon projet d'investissement immobilier." + lien cliquable vers la politique de confidentialité. Sans cette checkbox cochée, la soumission du formulaire doit être bloquée. |
| 2 | Mention d'information courte sur le formulaire (art. 13 RGPD) | A FAIRE | @fullstack | Afficher sous le formulaire (avant le bouton de soumission) : "Vos données sont collectées par Versi Invest pour qualifier votre projet et vous recontacter. Durée de conservation : 3 ans. Droits : accès, rectification, suppression sur demande à contact@versi.fr. Voir notre [politique de confidentialité]." |
| 3 | Lien vers politique de confidentialité dans le footer | A FAIRE | @fullstack | Ajouter "Politique de confidentialité" et "Mentions légales" dans le footer de toutes les pages. Ces liens doivent être accessibles sans scroll sur mobile. |
| 4 | Registre des traitements (art. 30 RGPD) | A FAIRE | Fondateur | Documenter le traitement "Formulaire qualification investisseur" dans un registre interne (tableau Excel ou Notion suffisant pour une structure de cette taille) : finalité, base légale, catégories de données, destinataires, durée de conservation, mesures de sécurité. |
| 5 | Contrat de sous-traitance avec Replit (DPA) | A VÉRIFIER | Fondateur | Replit propose un Data Processing Agreement (DPA) dans ses conditions Enterprise. Vérifier que le DPA Replit couvre explicitement le traitement de données de ressortissants UE et inclut les clauses contractuelles types (CCT). URL à vérifier : https://replit.com/site/dpa — signer et archiver le document. |
| 6 | Durée de conservation documentée | FAIT | @legal | Définie dans vi2-privacy-policy.md : données actives = relation + 3 ans ; inactifs = suppression après 2 ans sans interaction ; données commerciales = 5 ans. |
| 7 | Procédure de suppression sur demande (droit à l'effacement) | A FAIRE | Fondateur | Créer une procédure interne documentée : (1) email reçu à contact@versi.fr → (2) identification de la personne en base de données → (3) suppression dans la base + confirmation au demandeur → délai max 30 jours. Documenter la procédure dans Notion ou un fichier interne. |
| 8 | Export et portabilité des données (art. 20 RGPD) | A FAIRE | @fullstack | Implémenter une route d'export des données d'un inscrit (JSON ou CSV) déclenchable manuellement par le fondateur sur réception d'une demande. Pas besoin d'interface self-service à ce stade — une route admin suffisante. |
| 9 | Mesure d'audience sans cookies | FAIT | — | Umami configuré sur le projet. Pas de cookie déposé, pas de donnée personnelle collectée, pas de transfert hors UE. Conforme aux lignes directrices CNIL — consentement non requis. |
| 10 | Mentions légales complètes et à jour | A FAIRE | Fondateur | Compléter vi2-mentions-legales-draft.md avec : adresse du siège social, capital social, numéro TVA, numéro de carte T (dès obtention), assureur RCP, médiateur de la consommation. Mettre en ligne dès l'immatriculation de SAS Versi Invest. |

---

## Points de vigilance spécifiques à Versi Invest

### Données patrimoniales — sensibilité accrue

Le budget d'investissement collecté dans le formulaire constitue une donnée patrimoniale. Sans être une "donnée sensible" au sens strict de l'article 9 du RGPD, elle justifie des mesures de sécurité renforcées :
- Accès restreint aux seuls fondateurs habilités
- Pas d'affichage de budgets individuels dans des interfaces partagées
- Chiffrement en base de données recommandé

### Carte T et collecte de données avant autorisation

Tant que la carte T n'est pas obtenue, Versi Invest opère en mode "liste d'attente". Le formulaire ne doit PAS promettre de services d'intermédiation rémunérée. La mention sur le formulaire doit être : "Inscrivez-vous sur la liste d'attente pour être recontacté dès l'ouverture." — pas "Trouvez votre bien off-market" (engagement contractuel prématuré).

### Conflit d'intérêts Versi Immobilier ↔ Versi Invest

Si un même contact est présent dans la base Versi Immobilier (côté vente) et dans la base Versi Invest (côté achat), la transparence est obligatoire. Informer le contact de la double relation et obtenir un consentement spécifique pour chaque finalité.

---

## Prochaine révision recommandée

- **À l'immatriculation de SAS Versi Invest :** mettre à jour les mentions légales et la politique de confidentialité avec les coordonnées définitives
- **À l'obtention de la carte T :** ajouter le numéro de carte dans les mentions légales + réviser la politique si l'activité évolue (ex : collecte de mandats écrits)
- **À 6 mois :** vérifier les durées de conservation, purger les contacts inactifs, s'assurer que le DPA Replit est signé

---

**Handoff → @fullstack :** implémenter les points 1, 2, 3 et 8 (consentement formulaire, mention d'information, liens footer, route d'export). Ces 4 points conditionnent la mise en ligne légale du formulaire de qualification.

**Handoff → Fondateur :** compléter les points 4, 5, 7 et 10 (registre des traitements, DPA Replit, procédure de suppression, mentions légales définitives). Le point 5 (DPA Replit) est à vérifier en priorité car il conditionne la licéité du transfert vers les États-Unis.
