# User Flows — versi.fr

> Produit par @ux | Date : 2026-04-08
> Référence : personas.md, functional-specs.md, project-context.md
> Site one-page scrolling — zéro authentification. Conversion = formulaire de contact.

---

## Flow 1 — Laurent, l'investisseur (persona principal)

**Déclencheur** : lien reçu d'un contact réseau ou recherche "holding immobilière opérateur intégré France"
**Objectif** : évaluer la crédibilité de Versi en < 60 secondes, décider de contacter ou non

| Étape | Section vue | Question de Laurent | Signal de continuation | Signal d'abandon |
|---|---|---|---|---|
| 1 | Chargement | "Ça charge vite ?" | < 3s → OK | Spinner > 3s → ferme l'onglet |
| 2 | Hero (0-5s) | "Est-ce institutionnel ou encore un WordPress à 200€ ?" | Design épuré, H1 lisible, image architecturale → reste | Générique ou amateur → ferme |
| 3 | Hero → Mission | "Ils font quoi exactement ?" | "4 métiers. Un cycle." + 35+ actifs → continue | Vague, sans chiffres → sceptique |
| 4 | Activités | "4 entités distinctes ou du marketing creux ?" | 4 cartes structurées, noms précis, métiers identifiés → crédible | Liste de mots sans substance → scroll rapide |
| 5 | Approche | "Comment ils opèrent ? C'est rigoureux ?" | Sourcer → Analyser → Transformer → Opérer → méthode perçue | Discours générique → skip |
| 6 | Équipe | "Qui sont ces gens ? Puis-je les vérifier ?" | 3 co-fondateurs + photos + LinkedIn → confiance installée | Profils anonymes ou sans LinkedIn → **abandon** |
| 7 | Contact | "Est-ce que ça vaut un message ?" | Formulaire court (4 champs), email direct visible → soumet | Formulaire long, champs prématurés → abandonne |

**Aha moment de Laurent** : section Équipe. C'est là que Versi passe de "site à évaluer" à "opérateur potentiel". Sans profils réels et vérifiables, pas de conversion.

**Filtre n°1** (étape 2) : si le Hero ne transmet pas "institutionnel" en 5 secondes, Laurent n'atteint jamais l'Équipe. C'est la friction éliminatoire.

**Action finale** : formulaire avec message qualifié (co-investissement ou mandat). Ou sauvegarde du site + suivi LinkedIn.

---

## Flow 2 — Pierre, le prescripteur (canal d'acquisition zéro budget)

**Déclencheur** : lien partagé par un confrère ou recherche LinkedIn d'opérateurs actifs
**Objectif** : décider en 2 minutes si Versi mérite une place dans son carnet, et peut être présenté à ses clients

| Étape | Section vue | Question de Pierre | Signal de continuation | Signal d'abandon |
|---|---|---|---|---|
| 1 | Hero (0-3s) | "Puis-je montrer ça à un client sans rougir ?" | Design institutionnel → dans la liste | Bricolage → éliminé immédiatement |
| 2 | Nav | "Quel spectre ? Un métier ou tout le cycle ?" | Ancres "Activités" visibles → clique directement | Navigation floue → perd du temps |
| 3 | Activités | "Marchand de biens, oui — mais aussi la structuration ?" | 4 entités couvrant le cycle complet → polyvalent | Un seul métier → canal trop limité |
| 4 | Approche | "Comment ils analysent un dossier ?" | Process en 4 étapes → méthode structurée | Absent ou vague → pas rassurant |
| 5 | Équipe | "Qui répond quand j'envoie un dossier ?" | 3 co-fondateurs identifiés, LinkedIn vérifiable → interlocuteurs réels | Équipe anonyme → non |
| 6 | Implantation | "Interviennent-ils là où mes clients ont des biens ?" | Paris + Lille + métropoles → couverture suffisante | Géographie trop restreinte → cas d'usage limité |
| 7 | Contact | "Comment les contacter pour un premier dossier ?" | Email direct contact@versi.fr visible + formulaire → choisit son canal | Seul formulaire sans email → friction |

**Aha moment de Pierre** : section Activités — 4 entités couvrant le cycle complet. Pierre a besoin d'un opérateur polyvalent. Si Versi couvre l'ensemble, Pierre peut recommander pour des dossiers variés.

**Différence clé vs Laurent** : Pierre va directement à Activités via la nav (il ne lit pas le Hero en détail). Il ne lit pas le corps de texte — il scanne les titres H2/H3 et les noms d'entités. Sa conversion = email direct avec un premier dossier de test, pas le formulaire.

---

## Micro-décisions transversales — "Je continue à scroller ?"

| Section | Question binaire | OUI → action | NON → risque |
|---|---|---|---|
| Hero | "Institutionnel en 3 secondes ?" | Continue vers Mission | Fermeture onglet (Laurent) / élimination (Pierre) |
| Mission | "Je comprends le rôle de Versi sans effort ?" | Continue vers Activités | Scroll superficiel |
| Activités | "Les 4 entités couvrent ce dont j'ai besoin ?" | Continue vers Approche | Skip vers Équipe |
| Approche | "La méthode rassure sur l'exécution ?" | Continue vers Implantation | Skip vers Équipe |
| Implantation | "Ils interviennent dans ma zone ?" | Continue vers Équipe | Potentiel abandon si hors zone |
| Équipe | "Ces gens sont réels et vérifiables ?" | Continue vers Contact | Abandon (critère éliminatoire) |
| Contact | "Je peux les contacter facilement ?" | Envoi formulaire ou email | Abandon si formulaire trop complexe |

---

## Edge cases

| Cas | Comportement attendu |
|---|---|
| Image Hero ne charge pas | Fond fallback `#1A1A1A`, texte lisible, contraste ≥ 4.5:1 — spécifié dans functional-specs.md |
| Liens entités inactifs (V1) | Tooltip "Site en cours de construction", curseur `not-allowed`, `aria-disabled="true"` |
| Formulaire vide soumis | Validation inline champ par champ avant envoi — pas de rechargement de page |
| Formspree KO | Message "Écrivez-nous directement à contact@versi.fr" — email visible en fallback |
| Arrivée via mobile (Laurent ou Pierre) | Hamburger 44x44px, overlay plein écran, section Équipe lisible sans zoom |
| Visite de retour (Pierre, J+14) | Page statique — pas de state conservé, même expérience |

---

## HEART — Métriques de succès

| Dimension | Signal | Métrique | Cible | Méthode |
|---|---|---|---|---|
| Task success | Complétion Hero → Contact | % sessions scrollant jusqu'à #contact | ≥ 40% | Plausible scroll depth |
| Adoption | Soumission formulaire | Taux conversion visite → form_submit | ≥ 5% (B2B institutionnel) | Plausible event |
| Engagement | Lecture section Équipe | % sessions atteignant #equipe | ≥ 60% | Plausible scroll depth |
| Happiness | Qualité des contacts | % contacts qualifiés (dossier concret) | ≥ 50% | Jugement fondateurs |
| Retention | N/A — site vitrine | N/A | N/A | N/A |

---

## Tests UX

| Test | Critère de succès | Statut |
|---|---|---|
| Laurent comprend l'offre Versi en < 5s | H1 visible sans scroll, vocabulaire métier correct | ✅ documenté dans specs |
| Équipe accessible en < 2 clics depuis Hero | Ancre "ÉQUIPE" visible en nav sticky | ✅ spécifié functional-specs.md |
| Formulaire completable sans aide | 4 champs, labels clairs, validation inline | ✅ spécifié |
| Edge case Formspree KO | Email direct visible dans section Contact | ✅ à implémenter |
| Navigation clavier complète | Tab sur chaque lien nav, CTA, champ formulaire | Critique WCAG 2.2 AA |
| Pierre trouve email direct sans formulaire | contact@versi.fr en clair dans #contact | ✅ à vérifier implémentation |

---

**Handoff → @design**

Fichiers produits :
- `/home/user/Versi/docs/ux/user-flows.md` (ce fichier)

Décisions prises :
- 2 flows documentés : Laurent (investisseur, 7 étapes) et Pierre (prescripteur, 7 étapes). Sophie HORS V1.
- Section Équipe = conversion critique pour Laurent. Section Activités = déclencheur Pierre.
- Email contact@versi.fr doit apparaître en clair dans #contact (fallback Formspree + canal Pierre)
- Formulaire = 4 champs max. Tout champ supplémentaire augmente l'abandon Laurent.
- Hiérarchie visuelle : permettre le scan de titres pour Pierre (H2/H3 lisibles sans lire le corps)

Points d'attention pour @fullstack :
- Liens entités inactifs : `aria-disabled`, tooltip, curseur — spécifié en functional-specs.md §5
- Fallback email Formspree KO : état erreur formulaire obligatoire (edge case documenté)
- LinkedIn obligatoire sur chaque carte co-fondateur (critère éliminatoire Laurent)
