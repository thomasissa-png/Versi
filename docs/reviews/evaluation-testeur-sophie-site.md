# Evaluation testeur-persona Sophie — versi-immobilier.fr

**Date** : 2026-04-12
**Evaluatrice** : Sophie, 42 ans, propriétaire vendeuse — immeuble de rapport hérité, 6 logements dont 2 vacants, province
**Site évalué** : versi-immobilier.fr (code source React)
**Composants lus** : Hero.jsx, SellerBanner.jsx, SellPage.jsx, Nav.jsx

---

## Première impression (5 secondes)

J'arrive sur la homepage. Le Hero dit "Peu de biens. Pas d'approximation." — c'est du vocabulaire acquéreur, ça ne me parle pas en premier réflexe. Mais dans la même seconde je vois le CTA secondaire "Vous avez un bien à vendre ? →" dans le Hero, et le bouton "Céder un bien" bien distinct dans la nav à droite. Je ne ferme pas l'onglet. Ce n'est pas mon site en première lecture, mais il y a une porte pour moi et elle est visible.

---

## Verdicts GP1-GP10

| # | Gate | Verdict | Justification Sophie |
|---|---|---|---|
| GP1 | Compréhension immédiate | PASS | "Le H1 parle aux acheteurs, c'est clair. Mais le lien 'Vous avez un bien à vendre ? →' est dans le Hero lui-même — pas caché en bas de page — et 'Céder un bien' est le bouton CTA distinct dans la nav. En 5 secondes je comprends que ce site peut acheter mon bien. Ce n'est pas 'mon' site en première intention, mais je ne pars pas." |
| GP2 | Valeur perçue | PASS | "La page /vendre est sans ambiguïté : 'Une offre ferme, pas une estimation.', 'Sans condition suspensive de financement.', '7 jours, pas 7 semaines.' Ce sont exactement les mots que je veux lire. Surtout 'sans condition suspensive' — c'est LE critère qui me hante depuis que j'essaie de vendre. Pas de baratin, pas de 'on vous recontacte'." |
| GP3 | Crédibilité | PASS CONDITIONNEL | "La FAQ cite 3,2M€ de volume traité et affirme que 'nos trois fondateurs sont identifiés avec leurs parcours complets, vérifiables sur LinkedIn'. Mais je ne vois aucun nom, aucune photo dans les fichiers évalués. La promesse est forte — mais elle renvoie vers une page extérieure que je dois aller chercher. Si la page equipe n'est pas accessible depuis /vendre en 1 clic, c'est un problème sérieux pour quelqu'un qui confie un bien à 300k€." |
| GP4 | Parcours fluide | PASS | "Dans la nav desktop : 'Céder un bien' est un bouton CTA distinct (classe nav__cta) séparé des liens classiques — impossible à rater. Dans le menu mobile : 'CEDER UN BIEN' en dernier avec style CTA. Sur la homepage : lien direct /vendre dans le Hero. Sur /vendre : CTA 'Soumettre mon bien' avec ancre #formulaire dès le Hero vendeur. 2 clics max depuis n'importe où. C'est fluide." |
| GP5 | Conditions transparentes | PASS | "La FAQ répond directement : 'Notre offre est calculée sur la valeur de transformation du bien — pas sur votre méconnaissance du marché.' C'est honnête et direct. Les critères sont affichés : immeubles 3-15 logements, maisons avec terrain, actifs mixtes, biens avec locataires, biens à rénover. Tickets 250k-1M€, zones géographiques listées. Je sais si mon immeuble rentre dans leurs cases avant de perdre mon temps." |
| GP6 | Recommandation | PASS | "Oui, je recommanderais à une amie dans ma situation — avec une réserve : je lui dirais de cliquer sur 'Céder un bien' dans la nav, sinon elle peut penser que c'est un site pour investisseurs et partir. La page /vendre elle-même est suffisamment bien faite pour convaincre une vendeuse qui prend 2 minutes de lire." |
| GP7 | Conviction | PASS CONDITIONNEL | "Les 3 engagements, le process en 3 étapes avec délais chiffrés, la FAQ qui répond à mes 5 vraies objections — tout ça me donne envie de soumettre mon bien. Mais je bloque sur deux points : (1) L'équipe n'est pas visible sur /vendre — la FAQ en parle mais ne la montre pas. (2) SellForm est un composant importé non lu — si c'est un formulaire générique Nom/Email/Message, tout le travail de la page est gâché. Je suis convaincue à 80%, les 20% restants dépendent de ces deux points." |
| GP8 | Look and feel | PASS | "Le ton est sobre, affirmatif, sans fioritures : 'Trois engagements. Aucune zone grise.' 'Ce que nous avons fait concrètement.' Pas de photos de villa en soleil couchant, pas de 'vendez votre bien en toute sérénité'. C'est le registre d'un professionnel qui assume ce qu'il fait. Ni cheap ni trop corporate — bien calibré pour une propriétaire qui prend une décision sérieuse." |
| GP9 | Process utile | PASS | "Trois étapes numérotées, chacune avec un délai explicite : accusé réception 24h, visite planifiée 48-72h, offre ferme 7 jours calendaires. Chaque étape dit ce que Versi fait ET ce que j'attends. Je comprends que la visite se passe avant l'offre — pas après signature. Je n'ai pas d'interrogation sur le déroulé. C'est exactement ce que je cherchais." |
| GP10 | Fidelisation | N/A | "Je vends mon immeuble une fois. Transaction one-shot. Si ça se passe bien, je recommande — mais je ne reviens pas. Gate non applicable." |

---

## Points forts

- **CTA vendeur dans le Hero lui-même** : "Vous avez un bien à vendre ? →" est dans hero__ctas, pas en bas de page — Sophie le voit en 3 secondes
- **"Céder un bien" en bouton CTA distinct dans la nav** : classe nav__cta séparée des nav__link — visuellement différent, impossible à confondre avec les liens de menu
- **Les 3 engagements répondent mot pour mot à mes angoisses** : pas d'estimation bidon, pas de condition suspensive, 7 jours pas 7 semaines
- **La FAQ anticipe mes 5 objections réelles** : prix en dessous du marché, rétractation après compromis, locataires en place, agence vs MDB, crédibilité — travail sérieux
- **Critères d'acquisition affichés clairement** : je sais si mon immeuble de 6 logements rentre dans leurs cases (oui : immeubles 3-15 logements, biens avec locataires, biens à rénover) avant de soumettre
- **Process en 3 étapes avec délais chiffrés** : pas un mot vague, chaque étape a un timer
- **Section prescripteurs** (notaires, agents, courtiers) : signal que le site est connecté au réseau professionnel — ça rassure
- **SellerBanner homepage** : dense et efficace — "achète en direct, sur fonds propres. Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée."
- **Ton adulte sans condescendance** : on me traite comme quelqu'un qui comprend, pas comme une vendeuse naïve à ménager

## Points faibles / Frictions

- **Equipe invisible sur la page /vendre** : la FAQ dit que les fondateurs sont "identifiés sur LinkedIn" mais aucun nom, aucune photo ne s'affiche dans les composants lus. Je dois aller chercher une autre page. Friction inutile pour quelqu'un qui confie 300k€
- **Homepage orientée acquéreur en H1** : "Des appartements sélectionnés, préparés, disponibles." — première phrase que je lis, et elle ne me concerne pas. Le CTA secondaire corrige ça mais le H1 crée un micro-doute initial
- **SellForm non evaluable** : composant importé, champs inconnus. Risque bloquant si le formulaire est générique
- **"Groupe Versi" cité sans explication** : dans l'engagement sans condition suspensive : "financement déjà structuré en interne — Groupe Versi". Qui est le Groupe Versi ? Si je ne connais pas, ça sonne creux ou suspect
- **Libellé "Céder un bien"** : fonctionnel mais moins immédiat que "Vendre un bien" pour quelqu'un qui a tapé "vendre immeuble rapidement" dans Google

---

## Verdict global

**GO CONDITIONNEL**

- **BLOQUANT** (GP1, GP2, GP3, GP4, GP7) : GP1 PASS, GP2 PASS, GP3 PASS CONDITIONNEL, GP4 PASS, GP7 PASS CONDITIONNEL
- **REQUIS** (GP5, GP6, GP8, GP9) : 4/4 PASS
- **N/A** : GP10

Aucun FAIL franc. Deux gates BLOQUANT en PASS CONDITIONNEL sur des elements non evaluables dans les fichiers fournis (equipe sur /vendre, contenu de SellForm). La page /vendre est structurellement solide. Le GO passe si ces deux points sont confirmés.

---

## Recommandations

**P0 — Verifier et enrichir SellForm (bloquant pour GP7)**
Lire SellForm.jsx immediatement. Si le formulaire est generique (Nom, Email, Message), le remplacer par un formulaire dedie vendeur avec : type de bien, surface, nombre de logements, localisation, situation (heritage / investissement raté / divorce / autre), presence de locataires (oui/non), fourchette de prix espere. Un formulaire generique sur une page aussi bien construite brise toute la confiance.

**P0 — Afficher l'equipe directement sur la page /vendre (bloquant pour GP3 et GP7)**
Integrer un mini-bloc equipe dans SellPage.jsx — photo, prenom, role, lien LinkedIn — positionne juste avant ou apres le formulaire. Ne pas renvoyer vers une page separee. La promesse "fondateurs verifiables sur LinkedIn" doit etre tenue visuellement sur la meme page que le formulaire de soumission.

**P1 — Clarifier "Groupe Versi" dans l'engagement sans condition suspensive**
Ajouter une phrase d'explication : "Versi Immobilier est l'entite marchande du Groupe Versi — nos fonds propres ne dependent pas d'un accord bancaire tiers." Sinon "Groupe Versi" sonne comme du remplissage pour les vendeurs qui ne connaissent pas la structure.

**P1 — Ajouter un encart chiffres au-dessus du formulaire**
Juste avant SellForm : "3,2M€ de volume traite — 21 operations — fonds propres, sans condition de financement." Une seule ligne. L'acte de soumission doit etre precede d'une confirmation finale que ces gens sont credibles.

**P2 — Tester "Vendre un bien" vs "Ceder un bien" dans la nav**
"Ceder" est le vocabulaire professionnel correct mais "vendre" est le mot qu'une propriétaire non professionnelle utilise. A/B tester ou simplement passer a "Vendre un bien".

---

**Handoff -> @orchestrator**

- Evaluation produite : rapport GP1-GP10 sur versi-immobilier.fr (Hero.jsx, SellerBanner.jsx, SellPage.jsx, Nav.jsx)
- Verdict : GO CONDITIONNEL
- Gates FAIL : aucun FAIL franc. GP3 et GP7 en PASS CONDITIONNEL (equipe non visible sur /vendre, formulaire SellForm non evalue)
- Point critique non evaluable : SellForm.jsx non lu — si formulaire generique, GP4 et GP7 passent en FAIL
- Agents a relancer : @fullstack pour audit de SellForm.jsx (verification des champs), @fullstack ou @copywriter pour mini-bloc equipe dans SellPage.jsx
- Points d'attention : ne pas retoucher les engagements, le process et la FAQ qui sont excellents — corriger uniquement les deux lacunes identifiees (equipe invisible, formulaire non confirme)
