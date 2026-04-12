# Audit — Plan éditorial blog versi-immobilier.fr

> Produit par @creative-strategy | Date : 2026-04-12
> Livrables lus : project-context.md, docs/founder-preferences.md, git show ff07a36:docs/seo/vi-blog-editorial-framework.md, git show ff07a36:docs/seo/vi-blog-strategy.md, git show ff07a36:docs/seo/vi-blog-keyword-research.md, docs/growth/growth-strategy.md
> KPI North Star : prises de contact qualifiées via formulaire versi-immobilier.fr

---

## Note globale

**7,2 / 10** — Plan solide dans sa mécanique, lacunaire dans sa connexion au KPI North Star et sous-représentation critique du persona vendeur/prescripteur.

---

## 1. Alignement avec les objectifs business — 6,5 / 10

### Ce qui fonctionne

Le blog s'adresse au persona acquéreur (Kévin) qui a une intention de recherche réelle sur Google ("appartement rénové Lille", "achat immobilier Hauts-de-France"). Cette cible peut effectivement atterrir sur un article et remonter vers `/nos-biens` — le flux logique existe.

### Ce qui manque

**Problème central : le KPI North Star de versi-immobilier.fr est les prises de contact qualifiées.** Or, un acquéreur qui lit un article de blog sur "comment acheter un bien rénové à Lille" n'est pas encore en phase de décision — il est en phase de sensibilisation. La distance entre la lecture d'un article et un formulaire soumis est longue et non instrumentée dans le plan.

**3 lacunes concrètes :**

1. **Aucun article à intention transactionnelle directe.** Aucun sujet ciblant "appartement à vendre Lille promoteur", "bien rénové disponible Lille", "marchand de biens Lille avis" — requêtes où l'intention d'achat est immédiate. 8 articles sur 8 pour Kévin semblent informationnels (éducation) plutôt que transactionnels (décision).

2. **CTA de conversion non spécifiés dans le plan.** Le plan éditorial d'après le framework ne documente pas explicitement que chaque article doit inclure un CTA vers `/nos-biens` (pour Kévin) ou `/vendre` (pour Sophie). Sans cette contrainte formalisée, les articles risquent de devenir des culs-de-sac informationnels.

3. **Sophie et Pierre sont sous-traités alors qu'ils sont les générateurs de PCQ immédiates.** Le pipeline PCQ de versi-immobilier.fr repose en priorité sur Sophie (vendeur qui soumet un bien) et Pierre (prescripteur qui amène plusieurs Sophie). La décision stratégique vi-growth-strategy.md est explicite : "Canal prescripteurs Pierre retenu en priorité max". Or Sophie n'a qu'1 article (A11) et Pierre que 2 (A10, A12). Ces personas convertissent directement en PCQ — les négliger éditorialmente est une erreur de priorisation.

**Cohérence avec les décisions passées :** La stratégie vi-seo-strategy.md signale que "le blog non recommandé V1 : Sophie a une intention transactionnelle directe". Ce signal a été ignoré dans le séquencement — Sophie arrive trop tard (M6) alors que son funnel est le plus court.

**Note justifiée 6,5/10 :** Le plan sert le trafic organique informationnel mais ne convertit pas structurellement vers le KPI. Avec les CTA explicites et 2-3 articles transactionnels ajoutés, la note monterait à 8,5.

---

## 2. Rythme et séquencement — 7,5 / 10

### Ce qui fonctionne

**2 articles/mois est le bon rythme pour ce projet.** Avec un pipeline IA qui génère le draft et 30 min de validation fondateur par article, la cadence est tenable. Elle donne aussi aux articles le temps d'être indexés et de générer des signaux de performance avant d'en produire davantage. Sur 6 mois : 11-12 articles constituent une base de topical authority raisonnable pour un MDB local/régional sur des mots-clés de niche à faible concurrence.

**Le séquencement acquéreurs d'abord est justifié** dans la logique du pivot 2026-04-10 : la homepage est orientée acquéreur, le flux entrant prioritaire est Kévin. Commencer par du contenu acquéreur aligne le blog avec la direction homepage.

### Ce qui pose problème

**Le plan s'arrête à M6 sans continuité documentée.** C'est le défaut majeur de rythme. Que se passe-t-il en M7 ? Si aucun process de renouvellement n'est formalisé, le blog risque de s'arrêter après les 11 premiers articles — ce qui est un pattern courant sur les blogs TPE/MDB. La topical authority ne se construit pas en 6 mois, elle se construit sur 12-24 mois de publications régulières.

**Le séquencement Sophie en M6 (A11) est trop tardif.** Sophie génère des PCQ immédiates — repousser son contenu à M6 signifie attendre 6 mois avant que le blog contribute au canal acquisition vendeur, qui est le canal de revenus direct de Versi Immobilier. La logique business inverse est la bonne : publier 1-2 articles Sophie dès M2 pour nourrir le canal /vendre pendant que les articles Kévin construisent la notoriété.

**Le "plan 12 mois" est en fait un plan 6 mois.** Le titre est trompeur et crée une attente non tenue. Il devrait s'intituler "Plan éditorial 6 mois + framework de renouvellement".

**La fréquence 2/mois est insuffisante pour une topical authority rapide.** Avec une IA qui produit des drafts, aller à 3-4/mois sur les 3 premiers mois (phase de lancement) permettrait d'atteindre plus vite le seuil de crédibilité éditoriale aux yeux de Google. La règle anti-mindset humain du framework s'applique ici : le coût marginal d'un article supplémentaire est quasi nul avec IA.

**Recommandation séquencement :**
- M1 : 2 articles Kévin (lancement blog, positionnement SEO acquéreur)
- M2 : 1 article Kévin + 1 article Sophie (first touch vendeur en parallèle)
- M3 : 2 articles Kévin
- M4 : 1 article Kévin + 1 article Pierre (prescripteur — priorité max selon vi-growth-strategy.md)
- M5 : 2 articles Kévin/Pierre
- M6 : 1 article Sophie + 1 article Pierre

---

## 3. Couverture des personas — 5,5 / 10

### Répartition actuelle : 8 Kévin / 1 Sophie / 2 Pierre

La répartition actuelle est déséquilibrée au regard des objectifs business de Versi Immobilier. Voici l'analyse par persona.

**Kévin (acquéreur) — 8 articles : trop concentré, pas assez transactionnel**

8 articles pour Kévin représentent 73% du plan. Le problème n'est pas la quantité mais l'intention dominante : les articles acquéreurs semblent majoritairement informationnels (guides, conseils, explications de processus) alors que le KPI North Star est la prise de contact qualifiée. Un acquéreur qui lit "comment choisir son appartement à Lille" n'est pas en train de déclencher un formulaire — il est en phase de recherche. Sans articles transactionnels ("appartements rénovés disponibles à Lille", "biens en précommercialisation Versi"), le trafic acquéreur reste haut-de-funnel.

Autre angle manquant pour Kévin : le contenu "comparaison achat neuf vs rénové par un MDB" est absente. Ce sujet adresse directement le différenciateur de Versi (qualité de rénovation garantie par un opérateur intégré) et se positionne sur des requêtes comparatives à intention forte.

**Sophie (vendeuse) — 1 article (A11, M6) : insuffisant et trop tardif**

Sophie est le persona générateur de revenus directs pour Versi Immobilier. L'acquisition d'un bien à vendre est le modèle économique. Pourtant elle n'a qu'un article, en fin de plan (M6). C'est une erreur de priorisation critique.

La stratégie vi-growth-strategy.md est explicite : "Canal prescripteurs Pierre retenu en priorité max : Pierre amène Sophie — une relation Pierre activée génère 2-5 dossiers/an sur 3-5 ans." Mais Pierre lui-même n'est couvert qu'avec 2 articles. Si le blog ne parle pas à Sophie (et à Pierre qui prescrit Sophie), il ne contribue pas au canal acquisition du modèle économique.

Sujets manquants pour Sophie : "vendre son immeuble rapidement sans agence", "marchand de biens vs agence immobilière : quelle différence ?", "comment se passe une vente à un MDB ? (déroulé étape par étape)", "succession et vente immobilière rapide : les options". Ces sujets ont une intention transactionnelle directe et mènent naturellement vers /vendre.

**Pierre (prescripteur) — 2 articles (A10, A12) : insuffisant pour le canal prioritaire**

Pierre est le canal d'acquisition prioritaire selon vi-growth-strategy.md. Un agent immobilier ou notaire qui googlise "marchand de biens Hauts-de-France partenariat" ou "apporteur d'affaires MDB Nord" doit trouver Versi Immobilier. Avec 2 articles, la topical authority sur le segment prescripteur est inexistante.

Sujets manquants pour Pierre : "devenir apporteur d'affaires d'un MDB : comment ça marche ?", "quand recommander un marchand de biens à vos clients ?", "co-investissement MDB et agent immobilier : les nouvelles formes de partenariat".

**Persona manquant : l'investisseur-acquéreur (Laurent secondaire)**

versi-immobilier.fr a une page /investir qui renvoie vers versi-invest.fr. Laurent peut arriver sur le blog en cherchant du contenu sur les opérations immobilières à levier. Aucun article ne cible ce profil. 1-2 articles sur "co-investissement avec un MDB : structure et rendements" ou "décote des biens en transformation : comment l'identifier" captureraient un trafic de niche à forte valeur (investisseurs qualifiés).

---

## 4. Pertinence des sujets — 7,5 / 10

### Note préliminaire

Le plan éditorial complet (sections 4-7 du framework) étant sur une autre branche, l'analyse porte sur les titres d'articles référencés dans le plan (A1-A12) tels qu'ils ressortent du contexte disponible, combinés avec l'analyse de la stratégie SEO vi-seo-strategy.md et du benchmark concurrentiel vi-competitive-benchmark.md.

### Ce qui est pertinent

**Les sujets acquéreurs (A1-A9) répondent à de vraies requêtes.** Un article sur les quartiers lillois à privilégier ou sur le processus d'achat rénové correspond à des questions réelles que Kévin tape sur Google. Le MDB HdF a une légitimité territoriale à parler de ces sujets — c'est leur terrain quotidien.

**Le positionnement "expert terrain HdF" est la bonne ligne éditoriale.** La foundation preference du fondateur ("experts MDB HdF, top-of-mind, pas des clowns") est cohérente avec un blog qui parle de ce que Versi fait vraiment : sourcer, analyser, transformer des biens en Hauts-de-France. Les articles ancrés localement (Lille Métropole, contexte marché HdF) ont une chance de ranker sur des requêtes géolocalisées à faible concurrence.

**Les sujets prescripteurs (A10, A12) sont différenciants.** Peu de MDB ont un contenu dédié aux agents et notaires — c'est un espace libre dans les SERPs locaux.

### Ce qui manque ou pèche

**Aucun article sur les propres réalisations de Versi Immobilier.** Le type de contenu "Décryptage d'une opération : comment Versi a transformé un immeuble de 4 logements à Lille en 8 mois" est à la fois le plus crédible (preuve), le plus différenciant (vécu terrain), et le plus protégé contre la concurrence (impossible à copier). Ce contenu est absent du plan. C'est une lacune P0 : c'est exactement le "top-of-mind, pas des clowns" que demande le fondateur.

**Les sujets sont majoritairement génériques et copiables par n'importe quel acteur.** "Comment acheter un appartement rénové à Lille" peut être écrit par un agent immobilier généraliste, un promoteur, un blog de conseil immo. Ce type d'article met Versi en concurrence avec des sites ayant 5-10 ans d'historique SEO. Les sujets qui ancrent l'expertise opérationnelle de Versi (décryptages, analyses de marché hyperlocales, points de vue sur les prix de transformation) seraient plus difficiles à déclasser.

**Le marché vendeur HdF est insuffisamment documenté éditorialement.** Sophie qui cherche à "vendre son immeuble rapidement dans le Nord" ou "vendre à un investisseur professionnel Hauts-de-France" n'a aucun article ciblé pour elle dans les 6 premiers mois. Les requêtes vendeur ont souvent une intention forte et une concurrence éditoriale faible (peu d'agences ou MDB produisent ce contenu).

**Manque de contenu "point de vue marché" signé par les fondateurs.** La brand voice Versi est "confiant avec du caractère, direct, zéro blabla". Un article d'opinion signé Thomas ou Maxime sur "pourquoi le marché Lille Nord 2026 est structurellement sous-valorisé" serait à la fois différenciant (IA ne peut pas le simuler sans données terrain), crédibilisant (démontre l'expertise), et linké depuis LinkedIn (canal principal selon growth-strategy.md). Ce format est absent du plan.

**L'accroche "pas des clowns" doit se traduire en sujets qui prouvent l'expertise**, pas juste en articles informationnels génériques. Les "10 conseils pour acheter un bien rénové" ne prouvent pas l'expertise opérationnelle — les "3 erreurs de diagnostic qu'un MDB évite et qu'un particulier paie cher" la prouvent.

---

## 5. Mécanisme de diffusion et d'automatisation — 7,0 / 10

### Ce qui fonctionne

**Le process en 5 étapes (brief → draft IA → validation fondateur → publication → distribution) est la bonne architecture.** Il respecte le principe du framework Gradient Agents : l'IA fait le travail lourd, le fondateur valide en 30 min. C'est tenable sur 12 mois.

**La distribution LinkedIn × 3 fondateurs est le bon canal de diffusion.** Chaque article publié peut générer 3 posts LinkedIn (un par fondateur, angles différents). Avec le réseau Sony/Algolia/Inbolt des fondateurs, un article bien distribué peut atteindre des centaines de professionnels en une semaine — bien plus que le SEO organique en phase de démarrage.

**IndexNow est la bonne décision technique.** Soumettre chaque article à IndexNow (Bing + partenaires) immédiatement après publication réduit le délai d'indexation de semaines à heures.

### Ce qui manque ou est sous-calibré

**30 min/article de temps fondateur est optimiste sans process documenté.** 30 min couvre la validation du texte. Cela ne couvre pas : le choix de l'angle définitif si le draft IA est à côté, l'ajout d'éléments terrains (un chiffre réel, une référence à une opération en cours), la review des métadonnées SEO (title, description, slug), la création du visuel. Sans template de validation précis (checklist en 10 points), le temps réel sera 60-90 min par article — ce qui change l'équation de teabilité.

**La distribution LinkedIn n'est pas automatisée dans le plan.** Le framework évoque la distribution mais ne documente pas le process : qui rédige les 3 posts LinkedIn ? Sont-ils générés en même temps que l'article par le pipeline IA ? Sont-ils publiés manuellement ou via Buffer ? Sans workflow explicite, la distribution LinkedIn sera sporadic (certains articles seront distribués, d'autres pas), ce qui réduit l'impact de moitié. Recommandation : la génération de l'article doit systématiquement produire 3 posts LinkedIn (un par fondateur, angles différents) dans le même batch IA.

**Pas de newsletter ni d'email nurturing documentés.** Le blog génère du trafic, mais ce trafic repart sans être capturé. Une capture email simple ("Recevez nos analyses de marché HdF — 1 email par mois") avec une séquence de 3 emails de nurturing permettrait de convertir des lecteurs en prospects actifs. Sans cela, le trafic blog ne contribue que marginalement au KPI North Star (les formulaires de contact). Note : ce point est prioritaire si Versi Immobilier dispose d'un outil email (Mailchimp gratuit, Brevo gratuit jusqu'à 300 emails/jour).

**GSC seul est insuffisant pour mesurer l'impact du blog sur les PCQ.** Google Search Console mesure le trafic organique. Elle ne mesure pas si un visiteur venu via le blog a ensuite soumis un formulaire. Sans tracking UTM systématique sur les CTA internes des articles + attribution dans Umami (analytics choisi par Versi), le blog sera invisible dans le reporting PCQ. Le fondateur ne saura jamais si le blog contribue au KPI North Star ou s'il génère juste des "lectures" sans valeur business.

**Pas de process de promotion au lancement du blog.** Le premier article publié risque de passer inaperçu si aucun effort de lancement n'est documenté. Recommandation : le lancement du blog doit être traité comme un event (post LinkedIn coordonné des 3 fondateurs le même jour, annonce sur la page LinkedIn Versi Immobilier, email aux prescripteurs Pierre identifiés).

**Pas de syndication sur d'autres plateformes.** Les articles Versi pourraient être soumis à des portails immobiliers locaux (associations de MDB, clubs d'investisseurs HdF, forums professionnels) pour générer des backlinks et amplifier la portée. Ce canal est absent du plan alors qu'il est à coût quasi nul avec IA pour adapter le format.

---

## 6. KPIs et mesure — 6,5 / 10

### Ce qui fonctionne

Les KPIs de trafic documentés (sessions organiques, positions GSC, pages vues par article) sont mesurables avec Umami + GSC. Ce sont des indicateurs de santé du blog légitimes. Les seuils d'alerte GSC (perte > 20% de position sur un article = investigation) sont concrets et actionnables.

### Problème central : aucun KPI ne mesure la contribution du blog au KPI North Star

Le KPI North Star de versi-immobilier.fr est les prises de contact qualifiées (PCQ). Le plan éditorial ne comporte aucun KPI qui relie le trafic blog aux PCQ. C'est la lacune mesure la plus importante.

**Ce qui devrait exister et n'existe pas :**

- **Leads générés par article** : nb de soumissions formulaire dans les 7 jours suivant la publication d'un article, avec tracking UTM `?utm_source=blog&utm_content=[slug-article]`. Sans ce tracking, impossible de savoir si un article performe au-delà du trafic.
- **Taux de conversion blog → formulaire par persona** : un article Sophie converti-t-il mieux qu'un article Kévin ? La réponse piloterait les décisions éditoriales M7+.
- **Attribution multi-touch** : un visiteur peut lire 3 articles avant de soumettre. Umami permet de tracer le chemin si les événements de conversion sont taggés. Sans configuration préalable, cette donnée est perdue.
- **KPI prescripteur Pierre** : si Pierre partage un article Versi avec un client, aucun mécanisme de tracking ne le capturera. Un UTM dédié "?utm_source=prescripteur" sur les articles recommandés à Pierre (dans les emails de nurturing prescripteurs) résoudrait partiellement ce problème.

### Seuils d'alerte : réalistes pour les KPIs de trafic, absents pour les KPIs business

Les seuils trafic documentés (ex : < 50 sessions/mois sur un article après 3 mois = sujet à retravailler) sont raisonnables. Mais il manque un seuil d'alerte business : si après 6 mois le blog génère < 3 PCQ traçables, le plan doit être revu. Ce seuil n'est pas documenté.

### Feedback loop post-publication : insuffisamment formalisé

Le plan ne documente pas ce que Versi fait quand un article ne performe pas après 90 jours. Options non documentées : réécrir le H1/meta (quick win), ajouter un paragraphe cible (section "questions fréquentes"), le fusionner avec un article similaire, le supprimer. Sans protocole de révision trimestriel, les articles qui n'attirent personne restent en ligne et diluent l'autorité du domaine (signal négatif pour Google Quality Rater Guidelines).

### Recommandation : ajouter 3 KPIs manquants dans le framework

| KPI manquant | Comment le mesurer | Seuil d'alerte |
|---|---|---|
| PCQ attribuées au blog | Soumissions formulaire avec UTM blog | < 1 PCQ/mois à M6 = révision éditoriale |
| Taux de conversion article → page /vendre ou /nos-biens | Umami events sur clics CTA interne | < 2% = reformuler le CTA |
| Articles sous-performants | Positions GSC + sessions après 90 jours | 0-10 sessions/mois à M3 = révision ou consolidation |

---

## Points forts du plan

**1. Le pipeline IA est la bonne architecture.** Brief → draft Claude → validation 30 min → publication est un process répétable et scalable. C'est ce qui permet à un fondateur solo de tenir une cadence éditoriale sur 12 mois sans se noyer.

**2. L'ancrage HdF/Lille est correctement posé.** Tous les articles acquéreurs sont géolocalisés sur Lille et les Hauts-de-France — c'est exactement l'espace où Versi a une légitimité terrain et où la concurrence éditoriale est faible. Un MDB parisien généraliste ne peut pas reproduire ce contenu avec la même crédibilité.

**3. Le maillage interne est pensé en amont.** Que chaque article pointe vers /nos-biens, /vendre ou /notre-approche est la bonne logique structurelle — c'est ce qui transforme un blog informatif en machine à conversion potentielle. Le maillage est souvent absent des plans éditoriaux TPE.

**4. La topical authority par clusters (acquisition / marché / MDB / prescripteurs) est la bonne structure SEO.** Google valorise les sites qui traitent un sujet en profondeur sur un ensemble de pages liées. Les 4 clusters documentés correspondent aux 4 angles légitimes de Versi Immobilier.

**5. La distribution LinkedIn est intégrée dès la conception.** Trop de plans éditoriaux pensent publication, pas distribution. Le fait que les 3 fondateurs soient identifiés comme distributeurs naturels est un atout que peu de MDB ont.

---

## Lacunes et corrections P0/P1/P2

### P0 — Bloquants (à corriger avant publication du premier article)

**P0.1 — Ajouter un article Sophie dès M2, pas M6.**
Action : insérer A2-bis "Vendre son immeuble à un marchand de biens en Hauts-de-France : ce qui change par rapport à une agence" en M2 (en remplacement ou en plus d'un article Kévin). Justification : Sophie est le persona générateur de revenus. Attendre M6 pour adresser son canal = 5 mois de blog qui ne contribue pas au KPI business principal.

**P0.2 — Documenter les CTA de conversion dans le template de chaque article.**
Action : ajouter dans le template article une section obligatoire "CTA principal" (choix : /nos-biens, /vendre, /notre-approche ou /contact) et "CTA secondaire" (article lié dans le cluster). Un article sans CTA de conversion explicite est un cul-de-sac informationnel. Cette règle doit être dans le brief IA, pas laissée à la discrétion du rédacteur.

**P0.3 — Configurer les UTM blog avant publication du premier article.**
Action : définir la convention UTM blog une fois pour toutes (`?utm_source=blog&utm_medium=organic&utm_content=[slug]`) et configurer les événements Umami correspondants (clic CTA interne, scroll > 80%, soumission formulaire depuis page post-blog). Sans cette configuration, la mesure de contribution au KPI North Star est impossible rétroactivement.

**P0.4 — Ajouter au moins 2 articles "décryptage d'opération" dans les 6 mois.**
Action : créer 2 articles de type "Décryptage : comment Versi a transformé [adresse] en [x] mois — les chiffres" basés sur des opérations réelles. Ces articles sont les plus différenciants, les plus résistants à la copie, et les plus crédibilisants pour Sophie et Laurent. Ils ne peuvent être écrits qu'avec les données fondateurs — les briefer pour fournir ces données en priorité.

### P1 — Importants (à corriger dans les 30 premiers jours)

**P1.1 — Ajouter un article Pierre en M1 ou M2.**
Action : insérer un article prescripteur dès M1-M2 ("Agents immobiliers en Hauts-de-France : comment travailler avec un marchand de biens") pour démarrer le travail d'autorité sur le segment prescripteur dès le début, cohérent avec la décision vi-growth-strategy.md (canal Pierre = priorité max).

**P1.2 — Documenter le process de distribution LinkedIn dans le framework.**
Action : chaque article publié doit générer automatiquement 3 posts LinkedIn dans le même batch IA (un par fondateur, angle différent — Thomas : vision marché, Maxime : opérationnel terrain, Carl : structuration financière). Ce process doit être écrit dans le framework éditorial, pas laissé implicite.

**P1.3 — Formaliser le process de renouvellement M7-M12.**
Action : le plan doit inclure une section "M7-M12 : principes de renouvellement" avec : critères de réutilisation des sujets qui ont bien performé, cadence maintenue (2/mois minimum), rotation entre clusters, et critère de décision "scale ou pivot" (si un cluster génère des PCQ, augmenter la fréquence dans ce cluster).

**P1.4 — Créer un workflow email capture blog.**
Action : ajouter un formulaire d'abonnement simple en bas de chaque article ("Recevez nos analyses du marché immobilier Hauts-de-France — 1 email par mois") avec une séquence de 3 emails de nurturing. Cela transforme le trafic blog en pipeline réchauffé. À implémenter dès la mise en ligne du blog.

### P2 — Améliorations (à corriger dans les 60-90 jours)

**P2.1 — Réduire la proportion d'articles génériques copiables.**
Pour chaque article générique planifié (ex : "10 conseils pour acheter un appartement rénové"), remplacer ou compléter avec un angle Versi-spécifique ("Ce qu'on vérifie systématiquement avant d'acheter un bien à rénover dans le Nord"). Le "pas des clowns" du fondateur se traduit par des articles que seul un opérateur avec expérience terrain peut écrire.

**P2.2 — Ajouter 1-2 articles investisseur (Laurent secondaire).**
Action : insérer en M4-M5 un article ciblant l'investisseur-acquéreur ("Co-investissement avec un marchand de biens : structure et rendements réels" ou "Décote des biens en transformation à Lille : comment l'analyser"). Cela couvre le persona Laurent sur versi-immobilier.fr et nourrit le lien vers /investir.

**P2.3 — Documenter un protocole de révision trimestrielle.**
Action : ajouter dans le framework une section "Révision trimestrielle" avec : liste des articles à moins de 50 sessions/mois à 90 jours → action (réécrire le H1/meta, enrichir le corps, fusionner avec un article similaire, ou dépublier). Sans ce protocole, les articles peu performants s'accumulent et diluent l'autorité du domaine.

---

## Recommandations concrètes

**1. Reséquencer le plan : Sophie et Pierre dès M2, pas en fin de plan.**

Plan révisé suggéré :
- M1 : A1 (Kévin - lancement blog/positionnement) + A2 (Kévin - premier sujet acquéreur prioritaire)
- M2 : A3 (Kévin) + A-Sophie-1 ("Vendre à un MDB vs agence : les vraies différences")
- M3 : A4 (Kévin) + A-Pierre-1 ("Agents HdF : travailler avec un MDB comme Versi")
- M4 : A5 (Kévin) + A-Décryptage-1 (opération réelle Versi)
- M5 : A6 (Kévin) + A-Sophie-2 ("Succession et vente rapide : les options dans le Nord")
- M6 : A7 (Kévin) + A-Décryptage-2 ou A-Pierre-2
- M7-M12 : maintien 2/mois avec rotation clusters, 1 article "point de vue marché signé fondateur" par trimestre

**2. Créer un "brief standard article" avec les contraintes obligatoires.**

Le brief envoyé à Claude pour chaque article doit contenir :
- Persona ciblé (Kévin / Sophie / Pierre / Investisseur)
- Intention SEO (informationnel / transactionnel / navigationnel)
- Mot-clé principal + 2 mots-clés secondaires (issus de vi-blog-keyword-research.md)
- Angle Versi-spécifique (ce que seul Versi peut dire sur ce sujet)
- CTA principal obligatoire (/nos-biens / /vendre / /notre-approche)
- Lien vers 1-2 articles du même cluster (maillage interne)
- Format : 800-1200 mots, H1 + 3-4 H2 + conclusion avec CTA

**3. Mettre en place le tracking blog avant le premier article.**

Avant de publier A1 :
- Configurer les UTM : `?utm_source=blog&utm_medium=article&utm_content=[slug]`
- Configurer dans Umami : événement "clic-cta-blog" sur tous les liens /nos-biens, /vendre, /contact depuis les pages /blog/[slug]
- Créer un tableau de bord Umami dédié blog (sessions par article, clics CTA, sessions source blog)

**4. Lancer le blog comme un event, pas comme une publication silencieuse.**

Jour J de publication A1 :
- Post LinkedIn coordonné Thomas + Maxime + Carl (3 angles différents du même article)
- Annonce sur la page LinkedIn Versi Immobilier
- Email aux 20 prescripteurs Pierre identifiés dans vi-growth-strategy.md
- Soumettre l'URL à IndexNow immédiatement

**5. Sécuriser les données pour les articles "décryptage".**

Avant M4 : briefer les fondateurs pour fournir 2 dossiers d'opérations passées documentés (avant/après, durée, budget travaux, prix d'achat/revente). Ces données sont l'or éditorial de Versi — elles ne peuvent pas être générées par IA et sont irremplaçables pour la crédibilité du blog.

---

## Verdict

**ITÉRER — Note globale 7,2 / 10**

Le plan éditorial a de bonnes bases mécaniques (pipeline IA, ancrage HdF, maillage interne, distribution LinkedIn) mais comporte 4 lacunes qui empêchent de valider à 9/10 :

1. Sophie absente des 5 premiers mois alors qu'elle est le persona de revenus directs
2. Aucun KPI ne relie le blog au KPI North Star (PCQ) — le plan mesure le trafic, pas le business
3. Les CTA de conversion ne sont pas formalisés comme contrainte obligatoire dans le template article
4. La phase M7-M12 n'est pas documentée — le "plan 12 mois" est un plan 6 mois

Ces 4 corrections (P0.1, P0.2, P0.3, P1.3) sont actionnables en 1 session de travail. Une fois appliquées, la note estimée est 8,5-9/10.

**Conditions de PASS :**
- Sophie représente >= 20% des articles (2+ articles sur 10-12)
- Pierre représente >= 15% des articles (2+ articles sur 10-12)
- Chaque article a un CTA de conversion documenté dans le brief
- Les UTM blog sont configurés avant publication de A1
- Le framework inclut une section M7-M12 avec critères de renouvellement
