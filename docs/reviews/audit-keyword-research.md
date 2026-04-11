# Audit — Étude de mots-clés blog versi-immobilier.fr

> Produit par @creative-strategy | Date : 2026-04-11
> Livrable audité : `docs/seo/vi-blog-keyword-research.md` (609 lignes — @seo, 2026-04-11)
> Références lues : `docs/founder-preferences.md`, `project-context.md`, `docs/strategy/brand-platform.md`, `docs/seo/vi-blog-strategy.md`

---

## Note globale : 7,6/10

---

## 1. Qualité de la recherche SERP — NOTE : 8/10

### Ce qui est bien fait

L'agent @seo a effectué des recherches WebSearch réelles sur 11 requêtes (documentées en bas du livrable avec la date du 2026-04-11) et a produit pour chacune un tableau structuré des 8 à 10 premiers résultats SERP. Chaque tableau identifie le type de site (annuaire, portail, blog formation, diagnostiqueur, etc.), le format du contenu, la longueur estimée et la présence de SERP features. Cet effort de documentation est solide et traçable.

Les verdicts d'opportunité sont systématiquement fondés sur une lecture de la composition de la SERP : "la requête est dominée par des annuaires sans contenu éditorial → opportunité FORTE", "la requête est dominée par SeLoger/PAP/Meilleurs Agents avec rich results → opportunité FAIBLE". La logique est cohérente et vérifiable.

Plusieurs analyses identifient des insights non évidents : la requête A2 ("appartement rénové marchand de biens garanties") est traitée en SERP du point de vue du MDB vendeur (ses obligations), alors que l'angle acquéreur est inexploité. La requête A6 ("précommercialisation") est traitée en SERP soit par des glossaires soit par des articles destinés aux MDB — l'angle acquéreur est "la meilleure opportunité du blog". Ces insights sont précis et actionnables.

La requête A3 (branded/adresse exacte) est correctement qualifiée : volume = zéro, valeur = E-E-A-T et maillage interne, pas trafic direct. Ce niveau de nuance est appréciable.

### Réserves

**Avertissement données bien placé mais répété** : le doc signale correctement l'absence d'accès aux outils de volume (Keyword Planner, Ahrefs) et qualifie les volumes comme "estimations qualitatives". Cet avertissement est respectueux de la règle n°2 (zéro invention). Cependant, certains verdicts d'opportunité semblent légèrement optimistes sans justification par des données de concurrence de domaine (DA/DR des sites concurrents non mentionnés). L'absence de metric de domain authority sur les concurrents est une limite réelle — un site à DA 70 en page 1 est une barrière autrement plus difficile qu'un annuaire local.

**Données SERP sur A4 (prix m² Lille)** : les prix constatés "3 370-4 540 €/m² selon les quartiers" sont sourcés (PAP, SeLoger, Meilleurs Agents, Efficity — avril 2026). C'est bien, mais les fourchettes par quartier ne sont pas précisées dans le livrable. L'article A4 devra demander à @copywriter de récupérer ces données directement depuis les sources citées — le livrable délègue correctement cette responsabilité.

**Absence de mention des SERP features pour les requêtes concurrentielles** : pour A9 ("financement premier achat Lille 2026"), le tableau SERP recense des courtiers et banques, mais ne mentionne pas si des featured snippets ou People Also Ask blocs sont présents — ce qui influe directement sur l'espace disponible pour un nouveau site. Ce manque est présent sur 2-3 requêtes.

---

## 2. Pertinence stratégique — NOTE : 7/10

### Ce qui est bien fait

L'étude identifie correctement les deux flux du positionnement éditorial : acquéreurs (Kévin, clusters C1 à C8) et vendeurs/prescripteurs (cluster C9, article A10). La majorité du travail est centrée sur Kévin, ce qui correspond au contexte de versi-immobilier.fr (site acquéreur, V2 du projet).

La logique de topical authority est présente et bien argumentée : les 9 articles forment un cluster sémantique cohérent autour de "achat chez un marchand de biens à Lille", avec des intentions différenciées (TOFU/MOFU) et un maillage interne pensé. C'est aligné avec l'objectif "top-of-mind dans la zone de chalandise".

Le document reconnaît et traite l'angle différenciant de Versi : transparence sur le process, réponse honnête aux questions difficiles (PTZ applicable ou non, DPE E = risque réel ou non), chiffres réels des opérations. C'est cohérent avec le positionnement "premium par la substance, pas par le jargon".

### Problème majeur : le flux vendeurs/apporteurs est structurellement sous-traité

L'objectif éditorial du fondateur est explicite dans `docs/founder-preferences.md` : **"Deux axes : (1) capter les acquéreurs qui veulent acheter des biens, (2) capter les vendeurs/apporteurs qui veulent proposer des biens à Versi."** Ces deux flux doivent être servis simultanément.

Or, sur les 9 articles, un seul (A10 — "immeuble de rapport Lille : notre méthode") s'adresse partiellement aux vendeurs — et il est classé en dernière position (publication 9), qualifié de "public B2B/prescripteur, pas Kévin" avec un score de pertinence business de 1/3. Ce traitement secondaire est une lacune stratégique réelle.

Les vendeurs/apporteurs ont leurs propres requêtes informationnelles qui ne sont pas couvertes :
- "vendre immeuble à marchand de biens Lille" (différent de "immeuble rapport Lille")
- "proposer un bien à un marchand de biens Hauts-de-France"
- "comment contacter un marchand de biens pour vendre"
- Personas notaires, agents immobiliers, courtiers (prescripteurs qui apportent des affaires) — inexistants dans le clustering

L'étude pose une hypothèse implicite : versi-immobilier.fr est uniquement un site acquéreur (ce qui est vrai dans le scope V2), donc le blog = Kévin uniquement. Cette hypothèse est raisonnable si versi-immobilier.fr est distinct de versi.fr — mais le fondateur veut que le contenu serve les DEUX flux. Une note explicite sur ce choix éditorial délibéré est absente du livrable.

### Problème secondaire : ancrage géographique "Hauts-de-France" sous-exploité

Le positionnement fondateur est "experts marchands de biens **Hauts-de-France**", pas uniquement Lille. Or, la quasi-totalité des requêtes ciblées sont géolocalisées sur "Lille" uniquement. Les villes de la zone de chalandise étendue (Roubaix, Tourcoing, Valenciennes, Amiens, Arras, Dunkerque) ne sont mentionnées nulle part dans les clusters, ni en longue traîne.

Le territoire "Hauts-de-France" représente un potentiel de topical authority étendu que l'étude laisse complètement de côté. Un article "marchand de biens Roubaix : ce qui change pour l'acquéreur" est aussi accessible à écrire qu'un article Lille, et couvre une partie de la zone de chalandise réelle de Versi.

### Problème tertiaire : IDF absente mais non expliquée

Versi est "également présent en IDF mais en montants plus modestes". Le positionnement éditorial dit "ne pas surjouer la taille sur l'IDF". L'étude ne cible aucune requête IDF, ce qui est un choix justifiable — mais il n'est pas explicité dans le livrable. Un lecteur ne saurait pas si l'IDF a été oubliée ou délibérément écartée.

---

## 3. Complétude — NOTE : 8/10

### Ce qui est bien fait

Toutes les sections principales sont remplies sans "À compléter" ni placeholder. Les 9 clusters sont documentés avec : intention unifiée, mot-clé principal, mots-clés secondaires, longue traîne, questions PAA identifiées (pour les clusters où c'est pertinent). Le mapping intention (section 4) est présent avec colonne "SERP features à viser" — c'est une bonne addition par rapport à un simple tableau de mots-clés.

L'analyse de cannibalisation (section 3) est exhaustive et traitée pour chaque article potentiellement problématique. La recommandation de fusion A5+A9 est justifiée et actionnable. Le traitement du risque A3/réalisations (duplicate content entre article blog et fiche réalisation) est précis.

Les hypothèses à valider sont correctement documentées en fin de livrable avec le marqueur `[HYPOTHÈSE : ...]` conformément à la règle n°2.

Le handoff est structuré avec fichiers produits, décisions prises numérotées, et points d'attention différenciés pour @copywriter et @creative-strategy.

### Lacunes

**Cluster C9 manque de longue traîne** : le cluster C9 (immeuble rapport, article A10) n'a pas de questions PAA documentées, contrairement à tous les autres clusters. Ce manque est cohérent avec la nature B2B/prescripteur de cet article (les PAA sont moins fréquents sur des requêtes B2B), mais il aurait dû être expliqué.

**Aucun cluster sur les requêtes vendeur/apporteur** : comme signalé en section 2, les requêtes de type "vendre à un marchand de biens" sont absentes. Il n'y a pas de cluster C10 ou équivalent.

**Géographies secondaires non couvertes** : aucune requête sur Roubaix, Tourcoing, Valenciennes, Amiens, Arras. Le périmètre est posé comme "Lille uniquement" sans justification.

**SERP features à viser partiellement incomplètes** : pour A10, le mapping (section 4) dit "Aucune" sur les SERP features à viser. C'est cohérent avec l'analyse SERP (annonces/listings en Top 10), mais un article méthodologique B2B pourrait viser les PAA sur des requêtes type "comment un MDB valorise un immeuble de rapport". Cette nuance est manquante.

**Format des articles non précisé pour certains clusters** : la longueur cible est précisée pour les articles principaux (800-1 200 mots, 1 000-1 200 mots, etc.) mais pas systématiquement dans les fiches cluster. Un @copywriter doit retrouver la longueur dans le texte narratif plutôt que dans un champ dédié.

---

## 4. Actionnabilité — NOTE : 8/10

[À remplir]

---

## 5. Cohérence avec le positionnement — NOTE : 7/10

[À remplir]

---

## Points forts

[À remplir]

---

## Points faibles

[À remplir]

---

## Actions correctives

[À remplir]

---

## Verdict

ITÉRER — Score 7,6/10 (seuil PASS = 9/10)
