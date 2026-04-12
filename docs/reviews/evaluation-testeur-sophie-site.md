# Evaluation testeur-persona Sophie — versi-immobilier.fr

**Date** : 2026-04-12
**Évaluatrice** : Sophie, 42 ans, propriétaire vendeuse (immeuble de rapport hérité, 6 logements, province)
**Site évalué** : versi-immobilier.fr (code source React)
**Livrable évalué** : Hero.jsx, SellerBanner.jsx, SellPage.jsx, Nav.jsx

---

## Première impression (5 secondes)

J'arrive sur la homepage. Je lis "VERSI IMMOBILIER — MARCHAND DE BIENS". Le titre dit "Peu de biens. Pas d'approximation." — ça parle plutôt à quelqu'un qui cherche à acheter. Mais juste en dessous il y a "Vous avez un bien à vendre ? →" en lien secondaire, et dans la barre de navigation un bouton "Céder un bien" bien visible à droite. Je comprends donc que ce site peut aussi s'adresser à moi. Ce n'est pas immédiatement évident — j'arrive en me demandant si je suis au bon endroit — mais je vois rapidement les signaux qui me concernent.

---

## Verdicts GP1-GP10

| # | Gate | Verdict | Justification Sophie |
|---|---|---|---|
| GP1 | Compréhension immédiate | PASS | "En 5 secondes, je vois 'Vous avez un bien à vendre ? →' dans le Hero et 'Céder un bien' dans la nav. Le site est d'abord fait pour les acheteurs, ça se sent — mais je comprends qu'il y a une porte pour moi. Je ne ferme pas l'onglet." |
| GP2 | Valeur perçue | PASS | "La page /vendre est sans ambiguïté : 'Offre ferme en 7 jours', 'Sans condition suspensive de financement', 'Aucune zone grise'. Ce sont exactement les mots que je voulais lire. Pas de baratin, pas de 'on vous recontacte'. C'est précis, engageant, crédible." |
| GP3 | Crédibilité | PASS CONDITIONNEL | "Les chiffres '3,2M€ de volume traité', '21 appartements' apparaissent dans la FAQ. Le process est détaillé en 3 étapes avec des délais exacts. La FAQ répond à mes objections réelles. Mais l'équipe — je ne la vois pas dans ces fichiers. La FAQ mentionne 'nos trois fondateurs sont identifiés avec leurs parcours complets' et 'vérifiables sur LinkedIn', mais aucun nom n'apparaît dans le code que j'ai lu. Si cette page Équipe n'existe pas ou est cachée, c'est un problème." |
| GP4 | Parcours fluide | PASS | "Dans la nav, le bouton 'Céder un bien' est en position CTA à droite — visible, distinct des autres liens. Dans le menu mobile, 'CÉDER UN BIEN' est mis en avant. Sur la homepage, le Hero a un lien direct vers /vendre. Je ne cherche pas, je trouve en 1 clic. C'est correct." |
| GP5 | Conditions transparentes | PASS | "La page /vendre répond à ma grande question : pourquoi en dessous du marché ? La FAQ dit 'Notre offre est calculée sur la valeur de transformation du bien — pas sur votre méconnaissance du marché. Nous vous expliquons la logique de notre prix.' C'est honnête. Les critères sont aussi clairs : immeubles 3-15 logements, 250k-1M€, zones géographiques listées. Je sais si je rentre dans les cases avant même de soumettre." |
| GP6 | Recommandation | PASS | "Oui, je recommanderais ce site à une amie dans ma situation. La page /vendre est sérieuse, les engagements sont écrits noir sur blanc, la FAQ anticipe exactement mes objections. C'est mieux que ce que j'ai vu chez les 2 autres marchands de biens que j'ai consultés." |
| GP7 | Conviction | PASS CONDITIONNEL | "La page /vendre me donne envie de remplir le formulaire. Le process est clair, les délais sont concrets, les engagements sont sans flou. Mais deux points me freinent : (1) je ne vois pas l'équipe dans ces pages — la FAQ dit qu'ils sont identifiables, mais où ? (2) Le formulaire SellForm est un composant importé — je ne vois pas ses champs dans le code fourni. Si c'est un formulaire générique 'Nom, Email, Message', ça casse tout. Je suis convaincue à 80% — les 20% restants dépendent du formulaire réel et de la page équipe." |
| GP8 | Look and feel | PASS | "Le ton est sobre, direct, sans fioritures. Pas de promesses en majuscules criardes, pas de photo de villa de luxe. Les titres sont courts et affirmatifs : 'Trois engagements. Aucune zone grise.' 'Trois étapes. Sept jours.' C'est le registre d'un professionnel qui sait ce qu'il fait. Ni cheap ni corporate — c'est bien calibré pour quelqu'un comme moi." |
| GP9 | Process utile | PASS | "Le process en 3 étapes numérotées est excellent. Étape 01 : soumission, réponse sous 24h. Étape 02 : visite sous 48-72h. Étape 03 : offre ferme sous 7 jours. Chaque étape a un délai explicite. Je sais exactement ce qui m'attend. C'est précisément ce que je cherchais — pas 'on vous recontacte', mais un calendrier." |
| GP10 | Fidélisation | N/A | "Je vends mon immeuble une fois. Je ne reviens pas. Gate non applicable — transaction one-shot." |

---

## Points forts

- **"Céder un bien" dans la nav** est un CTA distinct, en position secondaire droite — visible immédiatement sans avoir à chercher
- **Le lien vendeur dans le Hero** ("Vous avez un bien à vendre ? →") crée un chemin direct depuis la homepage
- **Les trois engagements de la page /vendre** sont rédigés sans langue de bois : "offre ferme, pas une estimation", "sans condition suspensive", "7 jours, pas 7 semaines" — exactement les mots que je voulais
- **La FAQ répond à mes 5 objections réelles** : prix en dessous du marché, rétractation après compromis, locataires en place, agence vs MDB, crédibilité de Versi. C'est du travail.
- **Les critères d'acquisition sont listés** : type de bien, fourchette de prix, zones géographiques. Je sais avant de soumettre si je rentre dans les cases.
- **Le process en 3 étapes avec délais chiffrés** : accusé réception 24h, visite 48-72h, offre 7 jours. Pas de vague, pas de "dès que possible".
- **Section prescripteurs** : notaire, agent immobilier, courtier — ça montre que le site est connecté au réseau professionnel, ça rassure.
- **Le SellerBanner sur la homepage** : "Versi Immobilier achète en direct, sur fonds propres. Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée." — c'est dense et convaincant, même pour quelqu'un qui scrolle vite.

---

## Points faibles / Frictions

- **L'équipe n'est pas visible dans les fichiers évalués.** La FAQ fait une promesse forte : "nos trois fondateurs sont identifiés avec leurs parcours complets, vérifiables sur LinkedIn." Mais cette information n'est pas accessible depuis la page /vendre. Il faut aller chercher ailleurs. Pour quelqu'un qui confie un bien à 300k€, voir des noms et des visages sur la même page que le formulaire est non-négociable.
- **Le Hero de la homepage parle d'abord aux acheteurs.** "Des appartements sélectionnés, préparés, disponibles." — je suis propriétaire vendeuse, pas acheteuse. Je comprends après 5 secondes que le site a une porte pour moi, mais ce n'est pas immédiat. Le SellerBanner corrige ça plus bas, mais si je suis sur mobile et que je vois le Hero + le CTA "Voir les biens" avant tout, je peux douter.
- **Le formulaire SellForm est non évalué.** C'est un composant externe non fourni dans les fichiers à lire. C'est le point de contact final — si c'est un formulaire "Nom, Email, Message" sans champs spécifiques (type de bien, surface, localisation, situation : héritage/divorce/etc.), ça mine toute la confiance construite par la page /vendre.
- **Pas de section équipe sur la page /vendre.** La FAQ renvoie à la crédibilité de l'équipe mais ne l'affiche pas. Je dois naviguer ailleurs pour vérifier. Friction inutile.
- **"VENDRE UN BIEN" absent du menu principal.** La nav affiche : Biens disponibles, Réalisations, Blog, Notre approche, Contact. Le lien vendeur est le bouton CTA "Céder un bien" en position secondaire. C'est fonctionnel mais un vendeur qui scanne la nav cherche naturellement "Vendre" ou "Céder" parmi les items de liste. Le bouton CTA séparé est une bonne pratique UX — mais son libellé "Céder un bien" est moins immédiat que "Vendre un bien" pour quelqu'un qui tape "vendre immeuble rapidement" dans Google.

---

## Verdict global

**GO CONDITIONNEL**

- Gates BLOQUANT (GP1, GP2, GP3, GP4, GP7) : 3 PASS complets, 2 PASS CONDITIONNELS (GP3 et GP7 dépendent de l'équipe visible et du formulaire SellForm)
- Gates REQUIS (GP5, GP6, GP8, GP9) : 4 PASS
- Gate N/A : GP10

Le site est solide pour une vendeuse. La page /vendre est bien construite, les engagements sont crédibles, le process est clair. Le GO est bloqué sur deux éléments non visibles dans les fichiers évalués : le contenu réel du formulaire SellForm et l'accessibilité de l'équipe depuis la page /vendre.

---

## Recommandations

**P0 — Vérifier le formulaire SellForm (bloquant pour GP7)**
Le formulaire doit comporter des champs dédiés vendeur : type de bien (immeuble, maison, local mixte), surface, nombre de logements, localisation, situation (héritage, investissement, divorce, déménagement), présence de locataires (oui/non). Un formulaire "Nom, Email, Message" sur cette page serait une rupture totale avec la qualité du reste du contenu.

**P0 — Afficher l'équipe sur la page /vendre (bloquant pour GP3 et GP7)**
Intégrer un mini-bloc équipe directement dans la page /vendre, au-dessus ou en dessous du formulaire : photo, prénom, rôle, lien LinkedIn. Ne pas renvoyer vers une page séparée. La promesse "nos fondateurs sont vérifiables sur LinkedIn" est forte — la tenir visuellement sur la page où je dois signer.

**P1 — Revoir le libellé du CTA nav**
"Céder un bien" est correct mais peut créer un micro-doute pour quelqu'un qui cherche "vendre". Tester "Vendre un bien" ou "Vous vendez ?" — plus proche du vocabulaire de recherche naturelle d'un propriétaire non professionnel.

**P1 — Ajouter un encart crédibilité au-dessus du formulaire**
Juste avant le formulaire, afficher en condensé : "3,2M€ de volume traité — 21 opérations réalisées — Fonds propres, sans condition de financement." Une ligne, pas un pavé. L'acte de soumission doit être précédé d'une dernière confirmation que ces gens sont sérieux.

**P2 — Préciser la zone géographique dans le SellerBanner homepage**
Le SellerBanner est efficace mais générique. Ajouter "Paris, Île-de-France et grandes villes françaises" ou équivalent permettrait à une vendeuse en province de savoir dès la homepage si elle est dans le périmètre — ou de comprendre qu'elle peut soumettre quand même.

---

**Handoff → @orchestrator**

- Évaluation produite : rapport GP1-GP10 sur les composants homepage et page /vendre de versi-immobilier.fr (Hero.jsx, SellerBanner.jsx, SellPage.jsx, Nav.jsx)
- Verdict : GO CONDITIONNEL
- Gates BLOQUANT concernées : GP3 et GP7 en PASS CONDITIONNEL — conditionnés au formulaire SellForm (contenu non fourni à l'évaluation) et à la visibilité de l'équipe depuis la page /vendre
- Gates PASS complets : GP1, GP2, GP4, GP5, GP6, GP8, GP9
- Gate N/A : GP10 (transaction one-shot)
- Agents à relancer : @fullstack pour audit du composant SellForm (vérifier les champs), @fullstack ou @copywriter pour intégrer un mini-bloc équipe dans SellPage.jsx
- Points d'attention pour les agents correcteurs : (1) le SellForm doit avoir des champs structurés vendeur — pas un textarea libre ; (2) le mini-bloc équipe sur /vendre doit afficher photo + nom + rôle + lien LinkedIn sans redirection ; (3) ne pas toucher aux engagements et au process qui sont excellents tels quels
