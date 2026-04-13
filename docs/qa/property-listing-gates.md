# Gates annonces immobilières — Versi Immobilier

> Produit par @orchestrator + @copywriter + @creative-strategy + @sophie + @qa | Date : 2026-04-13, v3
> Références : `docs/qa/blog-gates-editorial.md`, `docs/strategy/vi-blog-autonomous-pipeline.md` (ton Versi), `project-context.md` (données source biens)
> Usage : ces gates s'appliquent à TOUTE annonce de bien immobilier avant publication. Une annonce qui échoue une gate BLOQUANT n'est pas publiée. Évaluation par IA review, grep/regex, ou fondateur.

---

## 1. Tableau des gates annonces (GA-1 à GA-22)

### Gates BLOQUANT (publication interdite si FAIL)

| # | Nom | Méthode | PASS | FAIL |
|---|---|---|---|---|
| GA-1 | Accroche — atout différenciateur en première phrase | IA review | La 1re phrase pose ce qui rend CE bien unique vs les autres du programme/marché. Contient le mot-clé différenciateur du brief. | 1re phrase générique applicable à tout appartement ("Bel appartement lumineux", "Situé à Lille-Sud") |
| GA-2 | Zéro donnée inventée | Cross-check `project-context.md` | Toutes surfaces, prix, dates, caractéristiques correspondent exactement aux données confirmées par le fondateur | Au moins 1 donnée inventée, arrondie abusivement, ou non confirmée |
| GA-3 | Zéro mot/formulation interdit(e) | Grep/regex | Aucun mot de la blacklist unifiée (voir section 2) | Au moins 1 occurrence |
| GA-4 | Ton Versi — faits, pas de posture commerciale | Grep + IA review | Zéro superlatif de la blacklist (section 2). Zéro formulation agence. Zéro conditionnel qui présente une incertitude comme acquise | Au moins 1 superlatif creux, formulation agence, ou conditionnel trompeur |
| GA-5 | Projection d'usage — scène de vie concrète | IA review (critère précis) | Au moins 1 phrase avec : sujet humain (implicite ou "on/vous") + verbe d'action + espace nommé. Ex : "on pose la table dehors", "vous installez le bureau dans la chambre" | Aucune scène tangible. "Idéal pour recevoir" = FAIL (abstrait) |
| GA-6 | Prix transparent — double grille | Regex | 2 montants en euros (avant travaux + prêt à habiter) + mention HFN ou "hors frais de notaire" | Prix unique, flou sur ce que le prix inclut, ou HFN absent |
| GA-9 | Équipements fidèles à la réalité | Cross-check brief | Type exact de chaque équipement (parking, cave, terrasse, box, extérieur) conforme au brief fondateur | Parking "couvert" au lieu de "extérieur", surface terrasse fausse, etc. |
| GA-14 | Cohérence données titre/description/features | Extraction chiffres | Surfaces, pièces, étages strictement identiques dans le titre, la description ET les features | Divergence : 40,5 m² dans la description mais "40 m²" dans le titre |
| GA-17 | Ancrage géographique — ville + quartier dans les 50 premiers mots | Grep | Ville ET (quartier OU rue) cités dans les 50 premiers mots de l'annonce | Aucune mention géographique dans le premier paragraphe |
| GA-19 | Zéro conditionnel trompeur | Grep + IA review | Aucun conditionnel présentant une incertitude comme acquise ("pourrait offrir", "peut éventuellement", "envisageable") | Au moins 1 conditionnel flou sur une caractéristique du bien |

### Gates REQUIS (corriger avant publication)

| # | Nom | Méthode | PASS | FAIL |
|---|---|---|---|---|
| GA-7 | Calendrier et garanties complets | Grep | Mois + année début travaux + mois + année livraison + mention "dommages-ouvrage" + mention "garantie décennale" — les 4 éléments présents. **S'applique si la vente implique des travaux Versi (rénovation ou VEFA). N/A pour les ventes en l'état sans travaux.** | Un des 4 éléments manquant ou vague ("courant 2026") |
| GA-8 | CTA de clôture sobre | Grep patterns | Dernière phrase contient un verbe d'action parmi : visiter, contacter, recevoir, appeler, écrire | Annonce se termine sur les garanties/finitions sans suite |
| GA-10 | Pas de copier-coller inter-annonces | Diff | Le bloc finitions/garanties a < 30% de similarité (Levenshtein) avec les autres annonces du même programme | Même paragraphe copié mot pour mot entre 2 biens |
| GA-12 | Paragraphes courts | Compteur | Chaque paragraphe fait max 5 lignes | Un paragraphe dépasse 5 lignes |
| GA-13 | Titre descriptif — type + surface + atout | Regex pattern | Titre contient : type de bien (T2/T3/Duplex/Maison) + surface en m² + 1 atout libre | Titre ambigu ou manquant un des 3 éléments |
| GA-15 | Zéro point d'exclamation | Grep `!` | 0 occurrence | Au moins 1 |
| GA-16 | Vouvoiement cohérent | Grep tu/ton/ta/tes | "Vous" systématique si adresse au lecteur. "On" accepté pour projections. 0 alternance tu/vous | Tutoiement ou alternance |
| GA-18 | Surface habitable présente et cohérente | Cross-check | Surface totale en m² présente dans le titre ET la description, cohérente avec le brief | Surface absente ou divergente du brief |
| GA-20 | Transparence contraintes — au moins 1 limite physique/structurelle | IA review | L'annonce mentionne au moins 1 contrainte physique, structurelle ou géographique réelle du bien (étage sans ascenseur, travaux à prévoir, vis-à-vis, parking extérieur pas couvert, DPE en cours, quartier en développement...). La contrainte doit être factuelle, pas une formule de qualification prospect | Annonce 100% positive sans aucune nuance, OU contrainte purement commerciale ("budget à prévoir") sans lien avec le bien physique |
| GA-21 | Statut juridique mentionné | Grep patterns | Au moins 1 terme indicateur du cadre juridique parmi : `avant travaux`, `prêt à habiter`, `VEFA`, `vente en l'état`, `vente classique`, `sur plan`, `livré clé en main`. Le lecteur sait dans quel cadre il achète | Aucun terme indicateur du cadre juridique de la transaction |
| GA-22 | Longueur description — 180 à 350 mots | Compteur | Corps de la description entre 180 et 350 mots (hors titre, features/caractéristiques et price_note) | < 180 mots ou > 350 mots |

---

## 2. Blacklist unifiée (GA-3 + GA-4)

Source unique pour les deux gates. Toute mise à jour se fait ICI.

### Mots interdits (GA-3) — grep case-insensitive

```
expertise, expert, clé en main, solutions, découvrez, découvrir, n'hésitez pas,
bienvenue, passionné, accompagnement sur mesure, à votre écoute, de qualité,
professionnel(s) qualifié(s), prestations, espaces de vie, commodités
```

Exception validée par le fondateur : "logements de qualité" est autorisé.

### Superlatifs et formulations agence (GA-4) — grep case-insensitive

```
magnifique, exceptionnel, rare, unique en son genre, coup de coeur,
à ne pas manquer, sublime, prestigieux, idéal pour, parfait,
idéalement situé, belles prestations, au calme absolu,
luminosité exceptionnelle, nous vous proposons, ce bien dispose,
situé dans un écrin, vous méritez, vous apprécierez,
notre savoir-faire, nous sommes fiers, grâce à notre expérience
```

### Conditionnels trompeurs (GA-19) — grep

```
pourrait offrir, pourrait convenir, peut éventuellement, envisageable,
susceptible de, devrait permettre, pourrait accueillir
```

---

## 3. Détail des gates clés

### GA-1 — Accroche : atout différenciateur

**Comment vérifier**
Prompt IA : "Lis la première phrase de cette annonce. PASS si elle pose un fait spécifique à CE bien qui le distingue des autres biens de l'immeuble ou du marché. FAIL si c'est une description générique (type, surface, localisation) sans élément différenciateur."

**Exemple PASS**
> "C'est le seul appartement de l'immeuble avec un espace extérieur privatif."
> "Terrasse de 12 m² donnant sur l'église du quartier. Vue sur pierre, pas sur fenêtres d'immeuble."

**Exemple FAIL**
> "Appartement T2 au rez-de-chaussée."

---

### GA-5 — Projection d'usage

**Critère binaire** : au moins 1 phrase contenant (sujet humain implicite ou explicite) + (verbe d'action au présent) + (lieu ou moment concret).

**Exemples PASS**
> "On pose la table dehors et on mange à l'air libre." (sujet: on, action: pose/mange, lieu: dehors)
> "Table de 8, canapé d'angle, coin bureau, tout rentre sans compromis." (projection spatiale concrète)
> "On prend le café dehors le matin avec vue sur le clocher." (sujet: on, action: prend, lieu+moment: terrasse matin)

**Exemples FAIL**
> "Séjour spacieux, idéal pour recevoir." (abstrait, pas de scène)
> "Cuisine fonctionnelle." (description, pas de projection)

---

### GA-20 — Transparence contraintes (physique/structurelle)

**Critère PASS/FAIL**
L'annonce mentionne explicitement au moins 1 contrainte **physique, structurelle ou géographique** réelle du bien. Exemples valides : parking extérieur (pas couvert), DPE en cours, travaux à réaliser, quartier en développement, pas d'ascenseur, vis-à-vis partiel, charges à préciser. Exemples **invalides** (ne comptent pas) : "budget à prévoir", "investissement", formulations purement commerciales sans lien avec la réalité physique du bien.

**Pourquoi cette gate existe** : une annonce 100% positive sans aucune nuance ne crée pas la confiance. Le positionnement Versi repose sur la transparence — cela inclut les limites.

---

### GA-21 — Statut juridique

**Patterns grep (au moins 1 requis)** :
```
avant travaux, prêt à habiter, VEFA, vente en l'état, vente classique, sur plan, livré clé en main
```

**Critère PASS/FAIL**
L'annonce contient au moins 1 des patterns ci-dessus. Le lecteur comprend dans quel cadre juridique il achète.

**Exemples PASS**
> "Deux formules : à 95 000 € vous achetez avant travaux et vous choisissez vos finitions, à 130 000 € on vous livre prêt à habiter."
(Le lecteur comprend que c'est une vente classique avec option de travaux par le vendeur)

**Exemples FAIL**
> Description sans aucune mention du cadre d'achat — le lecteur ne sait pas s'il achète sur plan, en l'état, ou clé en main.

---

## 4. Longueur cible (voir GA-22)

Une annonce doit faire entre **180 et 350 mots** dans le **corps de la description uniquement** (hors titre, features/caractéristiques et price_note).
- < 180 mots : trop court pour projeter et rassurer
- > 350 mots : trop long pour une fiche bien (le détail va dans le dossier complet)

---

## 5. Verdict

- **PUBLIER** : 0 gate BLOQUANT FAIL + 0 gate REQUIS FAIL
- **CORRIGER** : 0 gate BLOQUANT FAIL + 1+ gate REQUIS FAIL → corriger avant publication
- **REFAIRE** : 1+ gate BLOQUANT FAIL → réécriture nécessaire

---

## Handoff

**Destinataire** : @copywriter (rédaction d'annonces), @fullstack (validation avant seed/publication), @qa (intégration dans pipeline de validation)
**Fichiers produits** : `docs/qa/property-listing-gates.md`
**Action requise** : ces gates doivent être exécutées sur toute nouvelle annonce AVANT qu'elle soit insérée dans la base de données (seed ou back-office).
**Évolution** : la blacklist (section 2) doit être enrichie au fil des annonces produites. Tout nouveau pattern détecté est ajouté ici.
