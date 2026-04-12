# Audit Copy — Générateur d'annonces

## Note globale : 6/10

## A. Prompt system (6/10)

### Ce qui fonctionne

Le prompt pose les bonnes bases : ton sobre, factuel, interdiction des superlatifs non sourcés, citation obligatoire des transports et commerces. La règle "prix toujours net vendeur" est bien présente dès la ligne d'identité. La structure en 5 sections couvre les attentes d'un acheteur sérieux (accroche, description, quartier, points forts, potentiel).

La règle "si données manquantes → déduire de l'adresse ou omettre" est pragmatique et évite les sorties avec des placeholders visibles.

### Ce qui pose problème

**P0 — Absence de vouvoiement explicite.** Nulle part le prompt n'impose la forme de politesse à utiliser dans l'annonce. Claude peut alterner "tu peux imaginer" (projection narrative) et "vous pouvez visiter" (adresse directe). Le vouvoiement est le standard MDB professionnel HdF — il doit être explicite.

**P0 — Identité MDB absente.** Le prompt présente Versi comme "un rédacteur d'annonces immobilières expert du marché français" puis mentionne "Versi Immobilier, marchand de biens". Mais la nature MDB (marchand de biens) n'est PAS intégrée dans la logique rédactionnelle. Un MDB vend des biens souvent au potentiel de transformation, de division, d'optimisation fiscale — le prompt ne positionne pas l'annonce sur cette réalité de marché. L'audience cible (investisseurs, primo-accédants attirés par les prix MDB, marchands de biens eux-mêmes) est absente.

**P1 — "Projeter le lecteur dans la vie possible"** (instruction section ACCROCHE) est en contradiction directe avec le ton factuel sobre. Cette instruction narrative encourage l'IA à produire des phrases du type "Imaginez-vous prendre votre café en regardant les toits de Fives..." — exactement le registre "agent immobilier classique" que Versi refuse. L'accroche d'un MDB sobre doit ancrer dans les faits (localisation, configuration, prix), pas dans la projection émotionnelle.

**P1 — Persona lecteur non défini.** Le prompt ne sait pas si l'annonce est lue par un investisseur cherchant un immeuble de rapport à diviser, un accédant cherchant un T3 familial, ou un professionnel MDB partenaire. Cette ambiguïté force l'IA à utiliser un registre moyen qui n'est optimal pour aucun des trois.

**P1 — Section POTENTIEL "optionnel"** laissée à l'appréciation de l'IA. Pour un MDB, le potentiel de transformation est une information structurante — pas optionnelle. Il faudrait conditionner son déclenchement à l'état du bien (brut, à rénover) passé en input, pas à la seule appréciation du modèle.

**P2 — Longueur cible "200-350 mots"** est correcte pour une annonce web, mais aucune instruction ne différencie la longueur selon le type de bien (un immeuble de rapport mérite 400 mots minimum, un parking 80 mots). Résultat prévisible : tous les biens produisent 250 mots, quelle que soit la complexité.

## B. Titre généré (5/10)

### Logique actuelle (ligne 414-419 server.js)

```
const title = [typeLabel, surfaceLabel, locationLabel].filter(Boolean).join(' — ');
// Exemple : "T3 — 65 m² — Lille"
```

### Problèmes

**P0 — Le titre n'est pas généré par le LLM, il est assemblé côté serveur.** Ce n'est pas en soi un problème — c'est même plus fiable. Mais la logique d'assemblage produit des titres génériques qui ne tirent aucun parti des données disponibles.

**P0 — La ville utilisée (`city`) est extraite du geocoding, pas du quartier.** Pour Lille-Fives, le titre affiche "Lille" — et perd l'information quartier qui est pourtant un signal fort pour les acheteurs locaux HdF ("Fives" = profil investisseur précis, "Vieux-Lille" = profil premium, "Moulins" = profil rénovation). Le nom de quartier doit être préservé dans le titre quand il est présent dans l'adresse.

**P1 — Absence du prix dans le titre.** Les annonces MDB les plus efficaces ancrent le prix dès le titre ou le sous-titre — c'est le premier filtre de qualification pour un investisseur. "T3 — 65 m² — Lille — 185 000 € NV" est immédiatement plus actionnable que "T3 — 65 m² — Lille".

**P1 — Séparateur " — " (tiret long avec espaces)** est correct typographiquement. Pas de problème ici.

**P2 — L'état du bien absent du titre.** "Maison 120 m² à rénover — Tourcoing" est plus informatif et qualifie mieux le prospect qu'un titre sans mention de l'état.

## C. Description simulée (6/10)

Les trois cas ci-dessous sont des simulations de ce que le prompt actuel produirait typiquement, basées sur l'analyse de ses instructions. L'objectif est d'identifier les dérapages probables, pas de noter une sortie réelle.

---

### Cas 1 : T3 65 m² — Lille-Fives — 185 000 € NV

**Simulation de sortie probable avec le prompt actuel**

> *Imaginez-vous traverser ce T3 lumineux au coeur de Fives, quartier populaire en pleine renaissance. 65 m² bien agencés pour profiter de chaque recoin de votre futur chez-vous.*
>
> *L'appartement se compose d'un séjour lumineux, de deux chambres, d'une cuisine indépendante et d'une salle de bain. L'ensemble offre une distribution fonctionnelle idéale pour une vie confortable.*
>
> *Le quartier Fives bénéficie d'une bonne desserte en transports : le métro ligne 1 (station Fives) se trouve à environ 8 minutes à pied. Le marché de Wazemmes, les commerces de la rue du Faubourg des Postes et les écoles primaires environnantes complètent l'offre de proximité.*
>
> *Points forts : un bien correctement entretenu à prix accessible dans un quartier en mutation. Potentiel locatif intéressant.*

**Analyse**

Ce qui est correct : la structure est respectée, le quartier est ancré, les transports sont cités avec un temps à pied. La règle anti-superlatifs est partiellement respectée.

Ce qui dérape :
- "Imaginez-vous" en ouverture — projection narrative explicitement interdite par le brand voice Versi. C'est la première phrase produite, donc la plus visible.
- "quartier populaire en pleine renaissance" — superlatif qualitatif sans donnée factuelle.
- "de chaque recoin de votre futur chez-vous" — registre d'agent classique, opposé au ton MDB sobre.
- "votre futur chez-vous" — tutoiement implicite ET registre émotionnel.
- "bonne desserte" est vague malgré la règle anti-vague.
- La section POTENTIEL est silencieuse — normal pour un bien en état, mais le prompt ne l'explique pas à l'utilisateur.

---

### Cas 2 : Immeuble 250 m² — Roubaix — 350 000 € NV

**Simulation de sortie probable**

> *Un immeuble de rapport de 250 m² en plein coeur de Roubaix, quartier Épeule ou centre-ville selon adresse précise. Configuration idéale pour un investisseur souhaitant optimiser son patrimoine.*
>
> *La surface totale de 250 m² se répartit sur plusieurs niveaux. L'immeuble accueille plusieurs logements dont la distribution exacte sera précisée lors de la visite. L'état général est à confirmer.*
>
> *Roubaix bénéficie d'un réseau de transport dense : le métro ligne 2 (stations Eurotéléport ou Roubaix Grand Place selon localisation) et plusieurs lignes de bus desservent l'ensemble de la ville. Les commerces de la rue du Maréchal Foch et les marchés hebdomadaires sont accessibles facilement.*
>
> *Potentiel de rentabilité locative significatif dans un marché roubaisian en cours de valorisation. L'immeuble peut faire l'objet d'une optimisation de sa distribution selon les surfaces actuelles.*

**Analyse**

Ce qui est correct : le profil investisseur est capté ("investisseur souhaitant optimiser"), les transports sont cités, la section POTENTIEL est activée correctement pour un immeuble.

Ce qui dérape :
- "dont la distribution exacte sera précisée lors de la visite" — cette phrase est un aveu que le prompt ne sait pas gérer l'immeuble de rapport sans données de distribution (nb de lots, loyers, état locatif). Un MDB qui vend un immeuble DOIT renseigner ces champs. Le prompt ne les demande pas en input.
- "marché roubaisian en cours de valorisation" — jugement subjectif sans source.
- "potentiel de rentabilité locative significatif" — superlatif sans données de rendement.
- "peut faire l'objet d'une optimisation" — formule vague.
- **Problème structurel majeur** : les champs d'input du générateur ne collectent pas les données spécifiques immeuble (nb de lots, loyers actuels, état locatif, DPE par lot, surface habitable vs surface utile). Sans eux, la description est creuse pour ce type de bien.

---

### Cas 3 : Maison 120 m² — Tourcoing — 280 000 € NV

**Simulation de sortie probable**

> *Belle maison de 120 m² à Tourcoing, implantée dans un secteur résidentiel calme. Un bien solide à découvrir.*
>
> *La maison propose une surface habitable de 120 m², avec un séjour, une cuisine, trois chambres et une salle de bain. La distribution est fonctionnelle. L'état général sera précisé lors de la visite.*
>
> *Tourcoing est desservie par le métro ligne 2 (station Alsace ou Tourcoing Centre selon localisation) et plusieurs lignes de bus. Les commerces du centre-ville, la Grand-Place et les écoles du secteur sont accessibles en quelques minutes.*
>
> *Maison bien positionnée dans un marché tourquennois dynamique.*

**Analyse**

Ce qui est correct : structure respectée, transports cités.

Ce qui dérape sévèrement :
- "Belle maison" en ouverture — superlatif explicitement interdit par la règle du prompt ("NE JAMAIS écrire 'bel appartement'"). Le modèle contourne en écrivant "belle maison" (le prompt interdit "bel appartement" mais pas "belle maison" — lacune de la règle).
- "marché tourquennois dynamique" — superlatif sans source.
- "un bien solide à découvrir" — accroche publicitaire générique.
- L'état du bien n'est pas renseigné en input → la section POTENTIEL est silencieuse alors qu'une maison à 280k€ à Tourcoing est probablement à rénover (contexte MDB HdF). Le prompt ne pousse pas à collecter et valoriser cette information.
- Aucune mention du jardin, garage, sous-sol — données souvent présentes pour une maison, absentes des champs d'input.

## D. Brand voice Versi (5/10)

Le prompt mentionne "Versi Immobilier, marchand de biens basé à Lille et Hauts-de-France" et "prix toujours net vendeur" — c'est un début. Mais la brand voice Versi n'est pas opérationnalisée dans les instructions de rédaction :

- **Vouvoiement non imposé** — le prompt ne dit jamais "vouvoyer le lecteur". Risque de tutoiement ou de projection narrative à la 2ème personne du singulier.
- **"Projeter le lecteur dans la vie possible"** (section ACCROCHE) contredit directement le ton Versi "factuel, sobre, zéro bullshit". Un MDB sobre accroche par les faits (adresse précise, configuration, prix), pas par la narration émotionnelle.
- **L'identité MDB n'est pas dans la logique rédactionnelle.** Un MDB vend des biens qu'il a achetés et transformés — cette réalité devrait colorer l'annonce ("bien acquis et rénové par nos soins", "travaux réalisés par notre équipe").
- **Aucun interdit brand voice** : "Expertise", "Clé en main", "Solutions", "Découvrez" ne sont pas listés dans le prompt.
- **Pas de mention "pas des clowns"** dans le calibrage — le risque est que l'IA glisse vers du registre agence classique.

---

## Note globale : 5,5/10 — ITÉRER

| Critère | Note |
|---------|------|
| A. Prompt system | 6/10 |
| B. Titre généré | 5/10 |
| C. Description simulée | 6/10 |
| D. Brand voice Versi | 5/10 |

---

## Prompt amélioré (complet, prêt à copier-coller dans server.js)

```
Tu es le rédacteur d'annonces de Versi Immobilier, marchand de biens professionnel basé à Lille, opérant dans les Hauts-de-France (Lille, Roubaix, Tourcoing, Valenciennes) et en Île-de-France.

IDENTITÉ : Tu rédiges pour un marchand de biens, pas une agence immobilière. Versi achète, transforme et revend ses propres biens. Chaque annonce doit refléter cette maîtrise opérationnelle.

TON : Factuel, sobre, confiant. Vouvoiement systématique. Zéro projection émotionnelle. Zéro superlatif sans donnée vérifiable. Chaque phrase doit pouvoir être prouvée par une visite.

MOTS INTERDITS : "bel appartement", "belle maison", "charmant", "magnifique", "spacieux", "lumineux" (sauf si orientation/fenêtres documentées), "proche de toutes commodités", "idéalement situé", "rare", "exceptionnel", "coup de coeur", "à saisir", "n'hésitez pas", "découvrez", "clé en main", "expertise", "solutions".

STRUCTURE DE SORTIE (respecter cet ordre, SANS titres de section, SANS numéros) :

1. ACCROCHE (2-3 phrases) : type de bien + adresse précise + configuration principale + prix net vendeur. Ancrage factuel immédiat — pas de narration, pas de projection.

2. DESCRIPTION (3-4 phrases) : surface exacte, distribution des pièces, état du bien, étage si applicable, orientation si connue. Si le bien a été rénové par Versi, le mentionner factuellement ("travaux de rénovation complète réalisés" + scope si connu).

3. QUARTIER (3-4 phrases) : transports (nom de la station + ligne + temps à pied estimé), commerces nommés si connus, écoles si pertinent. ATTENTION : ne cite un transport ou commerce QUE si tu es raisonnablement certain qu'il existe à cette adresse. En cas de doute, reste au niveau du quartier/secteur sans nommer d'établissement précis. Mieux vaut omettre qu'inventer.

4. POINTS FORTS (2-3 phrases) : résumé des atouts vérifiables. Si le prix est fourni et la surface connue, mentionner le prix au m². Comparer au marché local si pertinent.

5. POTENTIEL (conditionnel) : inclure UNIQUEMENT si l'état du bien est "à rénover", "brut", "à rafraîchir" ou si le type est "immeuble". Décrire le potentiel de transformation factuellement (division possible, amélioration DPE, création de pièces). Si le bien est en bon état ou rénové, OMETTRE cette section.

MISE EN FORME :
- Sépare chaque section par une ligne vide.
- NE PAS écrire de titres de section — enchaîner les paragraphes.
- Le texte final contient 3 à 5 paragraphes.

LONGUEUR : adapter au type de bien.
- Studio/T1/T2 : 150-200 mots
- T3/T4/maison : 200-300 mots
- Immeuble/local commercial : 300-400 mots

Si le DPE n'est pas fourni, conclure par : "Diagnostic de performance énergétique communiqué sur demande."

Réponds UNIQUEMENT avec le texte de l'annonce. Pas de guillemets, pas de préfixe, pas de commentaire.
```

---

## Corrections

### P0 — Bloquant
1. **Remplacer le prompt system** par la version améliorée ci-dessus.
2. **Faire générer le titre par le LLM.** Ajouter une instruction dans le prompt ou un appel séparé : "Avant la description, écris sur la PREMIÈRE LIGNE un titre d'annonce de max 80 caractères (type + surface + quartier/ville + état si pertinent). Puis une ligne vide. Puis la description." Parser la première ligne comme titre.
3. **Imposer le vouvoiement** — déjà dans le prompt amélioré.

### P1 — Important
4. **Ajouter le prix dans le titre** — "T3 65 m² — Lille-Fives — 185 000 € NV"
5. **Préserver le nom de quartier** dans le titre (pas juste la ville).
6. **Ajouter des champs spécifiques immeuble** dans le formulaire (nb lots, loyers, état locatif) pour enrichir la génération.
7. **Ajouter un avertissement IA** visible après génération sur la section quartier.
8. **Adapter la longueur au type de bien** — déjà dans le prompt amélioré.

### P2 — Cosmétique
9. **Élargir la liste de mots interdits** — "belle maison" en plus de "bel appartement".
10. **Ajouter l'état du bien dans le titre** si disponible ("à rénover", "rénové").

---

## Verdict : 5,5/10 — ITÉRER

Le prompt actuel est une adaptation minimale de Versimo sans calibration brand voice Versi. Les simulations montrent que le résultat serait publiable avec retouches manuelles mais pas en l'état — risque de ton agence classique, projection émotionnelle, et superlatifs qui passent entre les mailles des interdits. Le prompt amélioré ci-dessus corrige ces lacunes.
