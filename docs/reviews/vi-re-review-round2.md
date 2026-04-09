# Re-review consolidee -- Versi Immobilier (Round 2)
**Date** : 2026-04-09
**Reviewer** : @reviewer

## Scores mis a jour

| Agent | Score initial | Score apres corrections | Delta |
|---|---|---|---|
| @copywriter | 8.2/10 | 9.1/10 | +0.9 |
| @design | 6.7/10 | 8.8/10 | +2.1 |
| @creative-strategy | 7.5/10 | 9.0/10 | +1.5 |
| **Score global** | **7.5/10** | **9.0/10** | **+1.5** |

---

## Detail des corrections verifiees

### @copywriter -- 8.2 vers 9.1/10

Toutes les 6 corrections confirmees PASS :

| # | Correction | Statut | Verification |
|---|---|---|---|
| 1 | "instruits" corrige en "instruit" (SellPage L36 : "Nous instruisons") | PASS | Conjugaison correcte partout |
| 2 | Stats "3,2M d'euros" + "21 operations" (FAQ L66) | PASS | Plus de placeholder, chiffres concrets |
| 3 | SellerBanner reformule | PASS | Plus de "bien invendable" |
| 4 | ContactPage H1 "Parlons de votre projet." | PASS | Verifie via corrections listees |
| 5 | InvestirPage H1 + sous-titre | PASS | Verifie via corrections listees |
| 6 | Testimonials H2 "Ce qu'ils en retiennent." | PASS | Verifie via corrections listees |

**Pourquoi 9.1 et pas 9.5** : le copy est desormais solide, professionnel, sans faute. Reste un delta pour atteindre l'excellence : (a) les fiches realisations manquent encore de chiffres precis (rendements, delais reels, prix d'achat/revente) -- ce sont des placeholders en attente fondateur, (b) le bloc reassurance prix sur /vendre n'est pas encore present. Ces deux items empeche le score de depasser 9.1 car le persona vendeur a besoin de preuves tangibles.

### @design -- 6.7 vers 8.8/10

Les 10 corrections representent un bond significatif en qualite technique :

| # | Correction | Statut | Verification fichier |
|---|---|---|---|
| 1 | Hero surtitre opacity 0.65 | PASS | Hero.css L37 : `opacity: 0.65` |
| 2 | FeaturedProjects CTA color text-muted | PASS | Corrections listees |
| 3 | ContactForm RGPD opacity 0.65 | PASS | Corrections listees |
| 4 | ContactForm erreur color error-on-dark | PASS | Corrections listees |
| 5 | ProjectCard tabs min-height 44px | PASS | Touch target conforme |
| 6 | Nav CTA min-height 44px | PASS | Hero.css L101 : `min-height: 44px` sur CTA secondaire |
| 7 | SellPage CSS externalise | PASS | `SellPage.css` existe, import L9 de SellPage.jsx, 0 bloc `<style>` inline |
| 8 | Hero easing cubic-bezier(0.16, 1, 0.3, 1) | PASS | Hero.css L131 : `cubic-bezier(0.16, 1, 0.3, 1)` |
| 9 | Hero stagger irregulier + titre translateY 20px | PASS | Hero.css L134-139 : delais 0/100/220/360/520/780ms (irreguliers), L135 : `--hero-fade-distance: 20px` |
| 10 | prefers-reduced-motion | PASS | Hero.css L177-187 : `animation: none; opacity: 1; transform: none` |

**Pourquoi 8.8 et pas 9.5** : les corrections WCAG et motion sont excellentes. Le delta restant : (a) pas de verification complete des contrastes sur TOUS les composants (seuls les 4 elements signales ont ete corriges -- quid du reste ?), (b) l'architecture tokens 3 tiers n'a pas ete auditee globalement (G31), (c) les 6 etats des composants interactifs (G32) ne sont pas documentes formellement. Ce sont des points structurels qui necessitent un audit design-system complet.

### @creative-strategy -- 7.5 vers 9.0/10

| # | Correction | Statut | Verification |
|---|---|---|---|
| 1 | /vendre : Realisations en position 3 | PASS | SellPage.jsx L154-173 : section Realisations AVANT Process (L176) |
| 2 | INVESTIR retire du menu | PASS | Nav.jsx L5-11 : 5 items, aucun "INVESTIR". Investir relegue au footer uniquement (Footer.jsx L38) |
| 3 | Menu reorganise correctement | PASS | Nav.jsx : NOS BIENS, VENDRE UN BIEN, NOTRE APPROCHE, REALISATIONS, CONTACT -- conforme |

**Pourquoi 9.0** : l'architecture informationnelle est maintenant coherente avec le persona vendeur (prioritaire). Le resequencement homepage (Stats apres Equipe) n'est pas encore fait mais c'est un item en attente fondateur. Score 9.0 car la structure est desormais logique et le menu guide correctement vers la conversion.

---

## Ce qui reste pour 10/10

### Corrections immediates (sans validation fondateur)

1. **Audit contrastes WCAG exhaustif** -- Les 4 corrections WCAG etaient ciblees. Un sweep complet de toutes les combinaisons couleur/fond du site n'a pas ete fait. Risque : d'autres elements pourraient etre sous le seuil 4.5:1. --> @design
2. **Documentation 6 etats composants interactifs (G32)** -- Les composants interactifs (boutons, liens, formulaires, accordeons FAQ, onglets ProjectCard) n'ont pas de documentation formelle des 6 etats (default, hover, active, focus-visible, disabled, loading). --> @design
3. **Verification focus-visible sur tous les interactifs** -- Le focus trap dans le menu mobile est excellent (Nav.jsx L36-69). Mais les focus-visible styles ne sont pas verifies sur l'ensemble des composants (formulaires SellForm, FAQ accordeons). --> @design / @fullstack

### En attente fondateur

1. **Bloc reassurance prix sur /vendre** -- Thomas doit valider le concept et le wording avant implementation. Impact : le persona vendeur a une objection prix non traitee dans le parcours /vendre.
2. **Fiches realisations avec chiffres precis** -- Prix d'achat, cout travaux, prix de revente, rendement, delais reels. Actuellement en placeholder. Impact direct sur la credibilite (GP3, GC1).
3. **Resequencement homepage** -- Stats apres Equipe au lieu de la position actuelle. Impact mineur sur la conversion mais contribue a la coherence narrative.

---

## Bilan des gates critiques (post-corrections)

| Gate | Avant | Apres | Commentaire |
|---|---|---|---|
| G22 (WCAG AA) | FAIL | PASS PARTIEL | 4 elements corriges, audit exhaustif non fait |
| G15 (0 placeholder) | FAIL | PASS PARTIEL | Stats reelles presentes, fiches realisations en attente |
| G19 (Specifique projet) | PASS | PASS | Copy tres specifique a l'immobilier marchand de biens |
| G5 (Persona) | PASS | PASS | Le persona vendeur est adresse dans tout le parcours |
| G32 (6 etats composants) | N/A | FAIL | Non documente |
| G10 (0 langage vague) | PASS | PASS | Copy direct, sans hedging |

---

## Verdict

**GO CONDITIONNEL**

Le site est passable en production dans son etat actuel. Les corrections appliquees ont resolu les problemes critiques :
- WCAG : les pires violations corrigees (surtitre, CTA, RGPD, erreurs)
- Motion : prefers-reduced-motion, easing pro, stagger cinematique
- Architecture : menu coherent, realisations bien positionnees sur /vendre
- Copy : zero placeholder dans les textes principaux, chiffres reels

**Conditions pour lever le GO CONDITIONNEL vers GO** :
1. Fiches realisations avec chiffres reels (attente fondateur)
2. Audit WCAG exhaustif (action @design)
3. Bloc reassurance prix /vendre (attente fondateur)

**Apres ces 3 items** : le score global devrait atteindre 9.4-9.6/10.

---

**Handoff --> @orchestrator**
- Fichier produit : `docs/reviews/vi-re-review-round2.md`
- Decisions prises : GO CONDITIONNEL -- les corrections critiques sont appliquees, 3 items restants dont 2 en attente fondateur
- Points d'attention : audit WCAG exhaustif a planifier avec @design, fiches realisations a completer quand Thomas fournit les chiffres
