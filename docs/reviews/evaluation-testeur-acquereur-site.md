# Évaluation testeur-persona Kévin (acquéreur) — versi-immobilier.fr

**Date** : 2026-04-10 (mis à jour 2026-04-10 — lecture directe du code source)
**Livrable évalué** : `versi-immobilier/src/` — Hero.jsx, Nav.jsx, Stats.jsx, FeaturedProjects.jsx, Process.jsx, ContactPage.jsx, `config/properties.js`
**Persona** : Kévin, 31 ans, commercial à Lille, primo-accédant, budget 190-210k€, cherche un T3 rénové

---

## Verdicts GP (adaptés acquéreur)

| # | Gate | Verdict | Justification Kévin |
|---|---|---|---|
| GP1 | Compréhension immédiate | PASS | "En 5 secondes, je lis 'Voir les biens disponibles' et 'Des appartements et maisons rénovés, vendus directement par l'opérateur'. Je comprends que c'est un vendeur de biens rénovés à Lille. C'est pour moi." |
| GP2 | Valeur perçue | PASS | "La promesse 'Vous savez ce que vous achetez avant de signer' et les 3 étapes du processus — ça me parle. Je suis fatigué des biens sur Leboncoin où le vendeur cache la moitié des défauts. L'idée d'avoir l'historique complet des travaux, c'est rassurant." |
| GP3 | Crédibilité | PASS PARTIEL | "21 opérations, 3,2M€ de volume, c'est concret. Mais il n'y a PAS UNE SEULE PHOTO dans les fiches bien. Le champ `photos: []` est vide partout. Je lis '68 m², parquet massif, salle de bains neuve' — sans photo c'est du vent. Je ne peux pas me projeter. Ma femme va me demander 'c'est à quoi ça ressemble ?' et je vais pas savoir quoi répondre." |
| GP4 | Parcours fluide | PASS | "Je vois 'NOS BIENS' en premier dans le menu et le CTA 'VOIR LES BIENS' est mis en avant dans la nav. Le bouton 'Voir les biens disponibles' dans le Hero aussi. Le chemin est clair. Le Process en 3 étapes m'explique comment ça marche sans me perdre." |
| GP5 | Prix visible | PASS | "Je vois les prix : 185 000€ pour le T3 à Lille, 120 000€ pour le T2 à Tourcoing, 245 000€ pour le T4 (vendu). Le T3 à 185k est dans mon budget. Je le vois en moins de 10 secondes si je clique sur 'Nos biens'. C'est ce que je voulais." |
| GP6 | Recommandation | PASS CONDITIONNEL | "Je recommanderais ce site à mon ami Sébastien qui cherche aussi un appart à Tourcoing — à condition qu'il y ait des vraies photos. Là en l'état, je lui envoie le lien et il va me dire 'mais il y a pas de photos ?' et c'est gênant." |
| GP7 | Conviction | FAIL | "Après avoir vu le site, je suis partant pour contacter MAIS je ne vais pas le faire maintenant. Je cherche une photo, je n'en trouve pas. Je ne vais pas contacter pour acheter un appartement que j'ai jamais vu en photo. C'est la règle numéro 1 de l'achat immo : on ne visite pas sans avoir vu des photos. Je vais passer à la concurrence sur Leboncoin ou SeLoger où j'ai des dizaines de photos par bien." |
| GP8 | Look & feel | PASS | "Le site fait sérieux. C'est épuré, propre, pas un site bricolé. Ça rassure — c'est pas une arnaque. Le nom 'VERSI IMMOBILIER' et la typo sobre me donnent confiance. C'est pas trop luxe non plus, je me sens pas intimidé comme sur un site de promo parisienne." |

---

## Note globale sur 10

**6/10 — Intéressant mais il manque le principal**

Le site a tout ce qu'il faut pour me convaincre sur le papier : des prix affichés, des biens dans mon budget à Lille, un processus clair, un design rassurant. Le T3 à 185k€ est exactement dans ma fourchette. Si j'avais des photos, ce serait un 8 ou 9 direct.

Mais il n'y a PAS UNE SEULE PHOTO. Les 4 biens dans `properties.js` ont tous `photos: []`. Pour moi c'est rédhibitoire — je n'achète pas un appartement sans avoir vu à quoi il ressemble. C'est exactement comme si un annonceur sur Leboncoin postait une annonce sans photos : je passe à la suivante en 2 secondes.

Deuxième problème : le texte du Hero "Avant le marché. Sans les risques." et le sous-titre avec le mot "opérateur" — ça sonne un peu investisseur/professionnel. Ma femme Amandine, si elle tombe sur cette page, elle va peut-être penser que c'est pour des professionnels de l'immo et pas pour nous. La phrase "Vous êtes propriétaire, prescripteur ou investisseur" sur la page Contact ne m'aide pas non plus — je ne suis pas un "prescripteur", je suis juste un couple qui veut acheter un appart.

Le reste est bon : les prix visibles, la nav claire, les stats, le processus en 3 étapes. La base est là. Il faut des photos.

---

## Objections Kévin

1. **"Où sont les photos ?"** — C'est mon objection numéro 1, de loin. Je ne contacte pas pour visiter un bien sans avoir vu une seule photo. C'est la règle de base de l'achat immo en 2026. Les 4 fiches bien sont vides de photos. C'est un bloquant absolu pour passer à l'action.

2. **"'Opérateur', c'est quoi exactement ?"** — Le mot "opérateur" apparaît dans le Hero et dans le Process. Je ne suis pas dans l'immobilier professionnel, je ne sais pas ce que ça veut dire. Ça me fait penser à un langage B2B, pas à un vendeur qui s'adresse à moi primo-accédant.

3. **"La page Contact dit 'propriétaire, prescripteur ou investisseur' — moi je suis quoi ?"** — Je suis un acheteur particulier. Ces trois catégories, c'est pas pour moi. Ça me donne l'impression que le formulaire n'est pas fait pour ma situation.

4. **"Il y a un bien 'vendu' dans le catalogue — ça m'énerve"** — Le T4 à 245k€ est marqué "vendu". Si je lis les fiches trop vite, je peux croire qu'il y a 4 biens dispo alors qu'il y en a 3. Ça entame la confiance même si c'est anecdotique.

5. **"Le mot 'avant le marché' dans le Hero — j'espère que ça veut pas dire que je vais payer plus cher"** — Je ne comprends pas bien "Avant le marché. Sans les risques." Ça sous-entend quoi ? Que les prix sont plus hauts parce que c'est "avant le marché" ? Ça me laisse perplexe. Je préférerais quelque chose de plus direct.

6. **"FeaturedProjects affiche 'Réalisations récentes' mais je veux voir des biens à vendre"** — Il y a une confusion entre les biens disponibles à l'achat et les réalisations passées. Je veux acheter, je veux voir ce qui est dispo, pas ce qui a déjà été vendu.

---

## Recommandations — 5 actions pour passer de 6/10 à 9/10

**Action 1 (bloquante) — Ajouter des photos à chaque bien disponible**
Sans photos, le site reste un 6/10 maximum. Ajouter au moins 5-6 photos réelles par bien dans `config/properties.js` (ou un système de placeholder visuellement convaincant en attendant les vraies). C'est le critère numéro 1 qui me ferait passer à l'action aujourd'hui.

**Action 2 (forte) — Reformuler le Hero pour les acquéreurs particuliers**
Remplacer "opérateur qui les a transformés" par quelque chose de plus direct comme "les gens qui ont fait les travaux". Remplacer "Avant le marché. Sans les risques." par une accroche qui me parle directement en tant qu'acheteur — par exemple "Des biens rénovés. Des prix clairs. Aucune mauvaise surprise." Le concept "avant le marché" est ambigu pour moi.

**Action 3 (forte) — Reformuler la page Contact pour inclure les acquéreurs**
La phrase "Vous êtes propriétaire, prescripteur ou investisseur" exclut les acheteurs comme moi. Ajouter "Vous cherchez à acheter un bien rénové ?" ou reformuler en "Acheteur, propriétaire, prescripteur ou investisseur". Je dois me sentir attendu sur cette page.

**Action 4 (utile) — Séparer clairement "Biens à vendre" et "Réalisations passées"**
Actuellement, le composant FeaturedProjects parle de "Réalisations récentes" (projets terminés et vendus) et le catalogue des biens mélange disponibles et vendus. Je veux savoir immédiatement ce que je peux acheter MAINTENANT. Mettre les biens "vendus" dans une section séparée ou dans les réalisations passées, pas dans le catalogue actif.

**Action 5 (utile) — Éliminer le jargon "opérateur" et "ticket d'entrée" de la vue acquéreur**
Le mot "opérateur" revient dans le Hero ET dans le Process. Pour moi primo-accédant, c'est du jargon professionnel. Le remplacer par "Versi Immobilier" ou "l'équipe qui a fait les travaux" — simple et concret.

---

## Verdict global

- **BLOQUANT** : GP7 = FAIL (0/1 gates bloquantes sur les points d'action)
- **REQUIS** : GP6 = PASS CONDITIONNEL
- **Verdict** : **NO-GO** pour passer à l'action — le site ne déclenche pas la prise de contact à cause de l'absence totale de photos. Toutes les autres conditions sont réunies (prix visible, biens dans le budget, processus clair, design rassurant). Une seule correction — les photos — ferait basculer ce verdict en GO.

---

**Handoff → @orchestrator**

- Évaluation produite : rapport GP1-GP10 acquéreur sur `versi-immobilier/src/` (composants + config)
- Verdict : NO-GO
- Gate FAIL : GP7 (Conviction) — absence totale de photos dans `config/properties.js` (tous les biens ont `photos: []`)
- Agents à relancer :
  - @fullstack : implémenter l'affichage des photos dans les fiches biens + ajouter des images (vraies ou placeholders visuellement représentatifs) dans `config/properties.js`
  - @copywriter : reformuler le Hero (éliminer le jargon "opérateur", clarifier "Avant le marché"), reformuler la page Contact pour inclure les acquéreurs particuliers
  - @ux : séparer la section "Biens à vendre maintenant" des "Réalisations passées" pour éviter la confusion dans le parcours acquéreur
- Points d'attention pour les agents correcteurs :
  - Le problème photos est BLOQUANT — sans photos, aucun acquéreur ne passe à l'action (règle universelle de l'achat immo)
  - Le jargon "opérateur" et la page Contact orientée B2B créent une friction pour les particuliers comme Kévin
  - Les prix sont bons, la nav est claire, le design est solide — ne pas toucher à ces éléments
  - Le T3 à 185k€ est exactement dans le budget cible (190-210k€, légèrement en dessous) — c'est un argument fort à mettre en avant dans le copy acquéreur
