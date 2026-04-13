# Gates références / réalisations — Versi Immobilier

> Produit par @orchestrator | Date : 2026-04-13, v2
> Références : `docs/qa/property-listing-gates.md` (gates annonces), `project-context.md` (données source)
> Usage : ces gates s'appliquent au champ `description` de TOUT projet/réalisation avant publication sur la page /realisations. Une gate BLOQUANT en FAIL interdit la publication.

---

## 1. Tableau des gates références (GR-1 à GR-15)

### Gates BLOQUANT (publication interdite si FAIL)

| # | Nom | Méthode | PASS | FAIL |
|---|---|---|---|---|
| GR-1 | Accroche factuelle — le bien d'origine en première phrase | IA review | La 1re phrase décrit concrètement ce que Versi a acheté (type de bâtiment, surface, situation). Le lecteur comprend le point de départ de l'opération | 1re phrase abstraite ou centrée sur Versi plutôt que sur le bien ("Versi a réalisé une opération...") |
| GR-2 | Zéro donnée inventée | Cross-check `project-context.md` | Toutes surfaces, prix de vente, durées, caractéristiques correspondent exactement aux données confirmées par le fondateur | Au moins 1 donnée inventée, arrondie abusivement, ou non confirmée |
| GR-3 | Zéro mot/formulation interdit(e) | Grep blacklist | Aucun mot de la blacklist annonces (`property-listing-gates.md` section 2). Aucune formulation agence | Au moins 1 occurrence |
| GR-4 | Ton Versi — faits et réalisations, pas de posture | Grep + IA review | Zéro superlatif de la blacklist. Le texte décrit ce qui a été fait, pas ce que Versi "est". Pas de formulation auto-congratulatoire ("notre savoir-faire", "notre expertise", "nous avons su") | Au moins 1 formulation auto-congratulatoire ou superlatif creux |
| GR-5 | Prix de vente uniquement — zéro marge exposée | Grep | Le texte mentionne uniquement le prix de cession/vente. Aucune mention du prix d'achat, du montant des travaux, de la marge brute ou nette, du rendement de l'opération | Au moins 1 mention de prix d'achat, montant travaux, marge, ou rendement |
| GR-6 | Zéro conditionnel trompeur | Grep blacklist GA-19 | Aucun conditionnel de la blacklist annonces | Au moins 1 occurrence |
| GR-7 | Acheteur final non nommé — RGPD + discrétion | Grep noms propres | Aucun nom propre d'acquéreur dans le texte. Aucune information permettant d'identifier l'acheteur (profession, entreprise, situation familiale) | Au moins 1 nom propre ou information identifiante d'un acquéreur |

### Gates REQUIS (corriger avant publication)

| # | Nom | Méthode | PASS | FAIL |
|---|---|---|---|---|
| GR-8 | Transformation décrite — avant/après lisible | IA review | Le lecteur comprend (a) ce qu'était le bâtiment avant, (b) ce qu'il est devenu après. La transformation est le coeur du texte | La transformation n'est pas claire — on ne comprend pas ce que Versi a fait |
| GR-9 | Projection d'usage ou tangibilité spatiale — 4 catégories | IA review | Au moins 1 élément parmi ces 4 catégories : (a) matériau nommé (ex : chêne, verre trempé, zinc), (b) volume ou cote chiffrée (ex : double hauteur, 47 m²), (c) source de lumière identifiée (ex : verrière, baies toute hauteur, lumière traversante), (d) scène d'usage avec sujet + verbe + espace (ex : "on prend le café sur la terrasse") | Texte purement technique/abstrait sans aucun des 4 éléments |
| GR-10 | Durée de l'opération mentionnée | Grep | Le temps de l'opération est mentionné (ex : "6 mois", "bouclée en X mois") | Aucune mention de la durée |
| GR-11 | Prix de cession mentionné | Grep pattern € | Le prix de vente est mentionné en euros | Aucun prix dans le texte |
| GR-12 | Ville mentionnée | Grep | La ville de l'opération est citée dans le texte | Aucune mention géographique |
| GR-13 | Paragraphes courts | Compteur | Chaque paragraphe fait max 5 lignes | Un paragraphe dépasse 5 lignes |
| GR-14 | Longueur — 60 à 150 mots | Compteur | Description entre 60 et 150 mots. La référence doit être concise — c'est une fiche, pas un article | < 60 mots (trop sec) ou > 150 mots (trop long pour une fiche référence) |
| GR-15 | Zéro point d'exclamation | Grep `!` | 0 occurrence | Au moins 1 |

---

## 2. Blacklist spécifique références

En plus de la blacklist annonces (`property-listing-gates.md` section 2), les formulations suivantes sont interdites dans les descriptions de références :

### Formulations auto-congratulatoires — grep case-insensitive

```
notre savoir-faire, notre expertise, nous avons su, nous avons réussi,
grâce à notre expérience, notre équipe a, nous sommes fiers,
un défi que nous avons relevé, une opération réussie,
une transformation remarquable, un résultat à la hauteur
```

### Formulations financières interdites (GR-5) — grep

```
prix d'achat, prix d'acquisition, montant des travaux, coût des travaux,
marge brute, marge nette, rendement, rentabilité, ROI, retour sur investissement,
plus-value, bénéfice, acheté à, acquis pour, travaux pour
```

---

## 3. Détail des gates clés

### GR-1 — Accroche factuelle

**Comment vérifier**
Prompt IA : "Lis la première phrase. PASS si elle décrit le bien d'origine (type, surface, situation) de façon concrète. FAIL si elle parle de Versi en tant que sujet ou utilise un langage abstrait."

**Exemples PASS**
> "136 m² de bureaux désaffectés, un seul volume sans cloison."
> "Immeuble de rapport de 4 lots, vacant depuis 2 ans, à 800 m de la gare."

**Exemples FAIL**
> "Versi a mené une opération de réhabilitation ambitieuse."
> "Cette réalisation témoigne de notre capacité à transformer."

---

### GR-5 — Prix de vente uniquement

**Pourquoi cette gate existe** : le fondateur refuse explicitement d'exposer les marges de Versi. Les références montrent le résultat (qualité de la transformation + prix de vente), pas la structure financière de l'opération.

**Exemples PASS**
> "Opération bouclée en 6 mois. Cession à 750 000 €."

**Exemples FAIL**
> "Acquis à 350 000 €, travaux 180 000 €, cession à 750 000 €."
> "Marge nette de 28% sur l'opération."

---

### GR-9 — Projection d'usage ou tangibilité spatiale (4 catégories)

**Critère PASS/FAIL**
Au moins 1 élément parmi ces 4 catégories vérifiables :
- **(a) Matériau nommé** : chêne, verre trempé, zinc, béton ciré, carrelage grand format…
- **(b) Volume ou cote chiffrée** : double hauteur, 47 m², 3 mètres sous plafond…
- **(c) Source de lumière identifiée** : verrière, baies toute hauteur, lumière traversante, puits de lumière…
- **(d) Scène d'usage** (sujet + verbe + espace) : "on prend le café sur la terrasse", "on pose la table dehors"…

**Exemples PASS**
> "On passe du séjour au patio sans transition, dedans et dehors communiquent." → catégorie (d) scène d'usage
> "Double hauteur sous mezzanine, verrière d'atelier, baies vitrées toute hauteur côté patio." → catégories (b) + (c)
> "Escalier sur mesure en chêne massif, garde-corps verre trempé." → catégorie (a)

**Exemples FAIL**
> "Réhabilitation complète avec finitions haut de gamme." (abstrait — aucune des 4 catégories)

---

## 4. Verdict

- **PUBLIER** : 0 gate BLOQUANT FAIL + 0 gate REQUIS FAIL
- **CORRIGER** : 0 gate BLOQUANT FAIL + 1+ gate REQUIS FAIL → corriger avant publication
- **REFAIRE** : 1+ gate BLOQUANT FAIL → réécriture nécessaire

---

## Handoff

**Destinataire** : @copywriter (rédaction références), @fullstack (validation avant seed/publication), @qa (intégration dans pipeline de validation)
**Fichiers produits** : `docs/qa/reference-gates.md`
**Action requise** : ces gates doivent être exécutées sur toute nouvelle description de référence AVANT publication.
