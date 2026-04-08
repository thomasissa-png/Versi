# Evaluation testeur-persona Laurent — versi.fr (code source React)

**Date** : 2026-04-08
**Livrable évalué** : src/src/ (tous composants JSX + CSS + configs) + docs/copy/landing-page-copy.md + docs/design/page-compositions.md
**Sources de calibration** : docs/strategy/personas.md, docs/strategy/brand-platform.md, project-context.md

---

## Verdicts

| # | Gate | Verdict | Justification Laurent |
|---|---|---|---|
| GP1 | Compréhension immédiate | **PASS** | "En deux secondes je sais ce que c'est. Le surtitre 'HOLDING IMMOBILIÈRE INTÉGRÉE' est là dès l'entrée. La tagline 'Quatre métiers. Un cycle maîtrisé.' dit exactement ce que fait la structure — pas une promesse, une description. Le sous-titre confirme : 'acquiert, transforme, détient et structure des actifs immobiliers en France'. Je n'ai pas à deviner, je n'ai pas à scroller pour comprendre. C'est le niveau minimum que j'attends et il est atteint." |
| GP2 | Valeur perçue | **PASS** | "Mission me donne des chiffres : 35+ actifs gérés en direct, 3 immeubles en portefeuille, 4 métiers intégrés. Ce ne sont pas des adjectifs — ce sont des faits. 'Nous n'arbitrons pas. Nous opérons.' — cette phrase seule vaut mieux que trois pages de blabla institutionnel. La section Approche (Sourcer, Analyser, Transformer, Opérer) avec 'Décision en semaines, pas en trimestres' répond directement à ma frustration principale sur les délais. La valeur est perçue, pas juste annoncée." |
| GP3 | Crédibilité | **PASS conditionnel** | "Design sobre, palette anthracite/blanc cassé, typographie uppercase tracking large — ça fait fonds d'investissement, pas WordPress à 200€. L'équipe est nommée et chiffrée : Thomas 11 actifs à Paris, Maxime ex-European Sales Manager Sony 3 immeubles 24 contrats, Carl Head of Marketing Inbolt. C'est vérifiable. MAIS les URLs LinkedIn sont vides dans team.js — les icônes ne s'affichent pas. La première chose que je fais sur un fondateur inconnu, c'est LinkedIn. Si le lien n'est pas là, je dois chercher manuellement. C'est une friction qui crée un doute — pas sur eux, mais sur le soin apporté aux détails." |
| GP4 | Parcours fluide | **PASS** | "La nav sticky VISION / ACTIVITÉS / ÉQUIPE / IMPLANTATION / CONTACT avec 'NOUS CONTACTER' permanent — je ne suis jamais perdu. Le scroll indicator de section active (border-bottom accent) confirme ma position. Le parcours Hero → chiffres Mission → 4 entités Activités → méthode Approche → équipe → formulaire suit exactement la logique d'un investisseur qui évalue. L'équipe arrive au 5e bloc, pas au 10e. J'accepte. Si je clique 'ÉQUIPE' dans la nav, j'y suis instantanément." |
| GP5 | Pricing acceptable | **N/A** | Site vitrine institutionnel — pas de pricing affiché. La discussion financière se fait en direct. |
| GP6 | Recommandation | **PASS** | "Je passerais ce lien à un contact sans me justifier. Le site fait sérieux — design propre, équipe identifiée, structure holding 4 entités visible, chiffres concrets. Je ne mettrais pas ma réputation en jeu pour un site bâclé. Là, je pourrais envoyer le lien avant une réunion en disant 'regarde le site avant qu'on se parle' — et ne pas avoir honte de ça." |
| GP7 | Conviction | **PASS** | "Après avoir parcouru le site, j'enverrais un message. Le formulaire est sobre, demande ce qu'il faut — nom, email, message —, pas 15 champs inutiles. L'email contact@versi.fr affiché en clair en colonne gauche me rassure : si le formulaire ne marche pas, j'écris directement. La promesse '72h' est inscrite dans le copy et dans le message de succès — c'est un engagement formalisé, pas 'nous vous répondrons dans les meilleurs délais'. Ça m'incite à envoyer." |
| GP8 | Look and feel | **PASS** | "Le rendu visuel correspond exactement à ce que j'attends d'un opérateur institutionnel : aucun gradient coloré, aucun emoji, aucune animation agressive, aucune image de stock avec des gens qui sourient. La section Approche sur fond noir pur avec les numéros géants en opacité 0.15 est une rupture visuelle élégante — ça crée de la profondeur sans esbroufe. La section Contact en #1A1A1A différenciée de la section Approche en #0B0B0B montre que quelqu'un a réfléchi au détail. Ça ressemble à Enclave, pas à une agence de quartier." |
| GP9 | Outputs utiles | **N/A** | Site vitrine — pas d'outputs générés par la plateforme. |
| GP10 | Fidélisation | **N/A** | Site vitrine one-page — pas de raison de revenir régulièrement. Le site sert à un premier contact, pas à un usage récurrent. |

---

## Verdict global

- **BLOQUANT** : 5/5 PASS (GP1 PASS, GP2 PASS, GP3 PASS conditionnel, GP4 PASS, GP7 PASS)
- **REQUIS** : 2/2 PASS (GP6 PASS, GP8 PASS)
- **Verdict** : **GO CONDITIONNEL**

GP3 en conditionnel uniquement — les gates BLOQUANT sont toutes franchies. Le site peut être mis en ligne avec les corrections listées ci-dessous. Aucun FAIL pur sur les gates actives.

---

## Objections Laurent (en langage investisseur)

**Objection 1 — LinkedIn absent (la plus sérieuse)**

"Dans team.js, les trois champs `linkedin` sont des strings vides. La logique JSX dans Team.jsx est `member.linkedin && (...)` — donc les icônes LinkedIn ne s'affichent pas du tout pour Thomas, Maxime ou Carl. Pour moi, cliquer sur le profil LinkedIn d'un fondateur que je ne connais pas, c'est le premier réflexe. Si ce lien n'est pas là, je dois sortir du site, aller sur LinkedIn, taper le nom à la main — trente secondes de friction inutiles qui peuvent me faire décrocher. Thomas Issa, Maxime Lemoine, Carl Standertskjold-Nordenstam — les noms sont là, c'est vérifiable. Ne pas mettre le lien direct alors que les noms sont publics, c'est paradoxal. Ce point seul suffit à faire tomber GP3 de PASS à PASS conditionnel."

**Objection 2 — Carl sans chiffre immobilier**

"Thomas : 11 actifs locatifs à Paris. Maxime : 3 immeubles, 24 contrats locatifs. Carl : 'Construit la présence de Versi sur les marchés et dans les réseaux de prescripteurs.' Pour les deux premiers, j'ai des faits vérifiables. Pour Carl, j'ai une description de mission. Ce n'est pas éliminatoire — je comprends que tous les fondateurs n'ont pas le même profil opérationnel — mais l'asymétrie est visible. Sur une carte à côté de 'ex-European Sales Manager Sony', ça fait moins dense. Si Inbolt ou Sarani ont des réalisations chiffrables, c'est là qu'il faut aller chercher."

**Objection 3 — CTAs entités désactivés illisibles**

"Les quatre cartes Activités ont un CTA 'ACCÉDER AU SITE →' en `color-text-muted` avec `cursor: not-allowed`. Visuellement, c'est un lien mort. Le tooltip `title='Site en cours de construction'` n'est visible qu'au survol sur desktop — sur mobile, rien. Un visiteur qui scroll vite voit quatre liens qui ne marchent pas. Il n'y a pas de micro-copy 'Bientôt disponible' visible sous le CTA. Pour moi, si je vois quatre entités dont aucun lien ne fonctionne, ça crée un signal 'structure annoncée mais pas encore réelle'. Ce n'est pas bloquant, mais c'est perfectible avant mise en ligne."

**Objection 4 — Formspree non configuré (bloquant technique avant déploiement)**

"Dans contact.js, l'endpoint Formspree est à renseigner. Si le formulaire pointe vers un endpoint vide ou invalide, tout envoi échoue silencieusement ou renvoie une erreur. Or le formulaire de contact est le KPI North Star du projet — c'est là que tout se joue. À tester en staging obligatoirement avant mise en ligne."

---

## Recommandations d'amélioration

**R1 — PRIORITÉ HAUTE : URLs LinkedIn dans team.js**

Action : Thomas, Maxime et Carl fournissent leurs URLs LinkedIn complètes (format `https://www.linkedin.com/in/...`). Les renseigner dans les champs `linkedin: ''` de `src/src/config/team.js`. Les icônes s'afficheront automatiquement — la logique conditionnelle est déjà en place dans Team.jsx.
Critère de done : trois icônes LinkedIn cliquables dans la section Équipe, ouverture dans un nouvel onglet, vérifiés sur desktop et mobile.

**R2 — PRIORITÉ MOYENNE : Micro-copy explicite sur CTAs désactivés**

Action : dans `src/src/config/entities.js`, ajouter un champ `ctaTextDisabled: 'BIENTÔT DISPONIBLE'` pour chaque entité. Dans `Activities.jsx`, utiliser ce champ pour afficher le texte du CTA inactif à la place de `entity.ctaText`. Résultat attendu : un visiteur lit "BIENTÔT DISPONIBLE" sans avoir à survoler.
Critère de done : état inactif intelligible sans tooltip, sur mobile comme sur desktop.

**R3 — PRIORITÉ MOYENNE : Track record de Carl**

Action : identifier avec Carl un élément factuel concret — une réalisation chiffrable chez Inbolt (ex : croissance de marque, périmètre géré), une contribution mesurable au réseau Versi (ex : nombre de prescripteurs activés), ou une implication dans les opérations Versi. À ajouter dans le champ `track` de team.js.
Critère de done : les trois cartes Équipe ont une densité informationnelle comparable — chacune avec au moins un fait vérifiable.

**R4 — PRIORITÉ HAUTE avant déploiement : Formspree configuré et testé**

Action : créer le compte Formspree, obtenir l'endpoint de production, le renseigner dans `src/src/config/contact.js`. Envoyer un message de test en staging. Vérifier la réception à contact@versi.fr.
Critère de done : un message de test reçu à l'adresse cible. Aucune erreur en console au submit.

---

**Handoff -> @orchestrator**

Evaluation produite : rapport GP1-GP10 sur le code source React complet de versi.fr (src/src/ intégral — Nav, Hero, Mission, Activities, Approach, Location, Team, Contact, Footer, index.css + tous CSS composants, team.js, entities.js) + docs/copy/landing-page-copy.md + docs/design/page-compositions.md + docs/strategy/brand-platform.md + docs/strategy/personas.md.

Verdict : GO CONDITIONNEL

Gates FAIL : aucune gate BLOQUANT en FAIL pur. GP3 (Crédibilité) est en PASS conditionnel uniquement en raison des URLs LinkedIn vides dans team.js — les icônes ne s'affichent pas en production.

Agents à relancer :
- @fullstack : R1 (URLs LinkedIn dans team.js — données à collecter auprès des fondateurs), R2 (champ ctaTextDisabled dans entities.js + Activities.jsx), R4 (configuration Formspree + test staging)
- @copywriter : R3 (track record Carl — nécessite des données factuelles de Carl avant intervention)

Points d'attention pour les agents correcteurs :
- Les URLs LinkedIn sont une donnée externe (fondateurs) — @fullstack ne peut pas les inventer. Demander à Thomas explicitement avant intervention.
- La logique d'affichage LinkedIn est correctement implémentée dans Team.jsx — il suffit de renseigner les données dans team.js.
- Pour R2 : ne pas modifier la structure des cartes — juste ajouter un champ `ctaTextDisabled` dans entities.js et l'utiliser dans Activities.jsx.
- Pour R3 : si Carl n'a pas de chiffre immobilier personnel, une métrique de son activité chez Inbolt ou de sa contribution au réseau Versi est acceptable — mais ce doit être un fait, pas une description de poste.
- Formspree endpoint = point bloquant technique absolu avant déploiement — aucune mise en ligne sans test de formulaire fonctionnel.
