# Versi Immobilier — Audit pivot acquéreur
**Date** : 2026-04-10
**Agent** : @creative-strategy
**Contexte** : Pivot du discours principal — vendeur → acquéreur. Versi Immobilier devient vitrine de biens à vendre et en précommercialisation.

---

## Section 1 — Nouveau positionnement acquéreur

### Proposition de valeur acquéreur

**Le problème du marché classique** : l'acquéreur ne sait jamais ce qu'il achète vraiment — qualité de rénovation inconnue, historique du bien opaque, risques cachés. Il négocie avec un vendeur particulier qui maximise le prix de vente, pas avec un opérateur dont la réputation dépend de la qualité livrée.

**Ce que Versi Immobilier change** : chaque bien du portefeuille a été sourcé, analysé et transformé par un opérateur intégré dont le modèle économique repose sur la qualité de la revente. Pas un particulier qui repeint avant de vendre. Un marchand de biens dont chaque opération est documentée — adresse, délais, chiffres.

**Proposition de valeur acquéreur (1 phrase)** :
Des biens sourcés, transformés et documentés par un opérateur intégré — vous achetez un actif dont vous connaissez l'histoire complète, pas une promesse de particulier.

**Différenciateurs clés pour l'acquéreur** :
1. **Traçabilité totale** : chaque bien a un historique d'opération documenté (avant/après, chiffres, délais)
2. **Qualité opérateur** : la rénovation est faite par un professionnel dont la réputation est en jeu à chaque revente — pas un bricolage entre deux ventes
3. **Précommercialisation** : accès à des biens avant leur mise sur le marché classique, donc avant la concurrence d'autres acheteurs
4. **Structuration possible** : financement possible via le groupe Versi — un seul interlocuteur de l'achat au financement

[HYPOTHÈSE : le profil acquéreur type est un investisseur locatif ou un primo-accédant aisé cherchant un bien rénové clé-en-main, dans la tranche 250k-500k€ — à valider avec le fondateur]

### 3 taglines orientées acquéreur

**Option A — Vitrine directe** :
> "Des biens transformés. Disponibles maintenant."

Avantages : direct, factuel, oriente immédiatement vers le catalogue. Défauts : peu différenciant sur le long terme.

**Option B — Opérateur vs particulier** :
> "Pas un particulier qui revend. Un opérateur qui livre."

Avantages : tranche fort, crée le contraste mental immédiat. Défauts : négatif dans la construction — certains acheteurs peuvent trouver le ton agressif.

**Option C — Recommandée — Accès et qualité** :
> "Avant le marché. Sans les risques."

Avantages : adresse les deux douleurs principales de l'acquéreur (arriver trop tard sur les bons biens, acheter un bien avec des vices cachés). Positif. Premium. Applicable aussi bien à l'investisseur qu'au primo-accédant. Compatible avec le ton Versi — confiant, zéro blabla.

**Recommandation : Option C — "Avant le marché. Sans les risques."**

Surtitre possible : `MARCHAND DE BIENS — FRANCE`
H1 : `Avant le marché. Sans les risques.`
Sous-titre : `Des biens sourcés, transformés et documentés par un opérateur intégré. Disponibles à la vente et en précommercialisation.`

### Ton et registre

- **Vouvoiement** : systématique, identique à Versi
- **Registre** : confiant, factuel, jamais promotionnel. On annonce, on ne vend pas.
- **Vocabulaire prescrit** : "actif", "opération", "transformé", "documenté", "portefeuille", "précommercialisation", "opérateur intégré"
- **Vocabulaire proscrit** : "biens de qualité" (vague), "chez nous c'est différent" (générique), "n'hésitez pas à nous contacter" (mou)

---

## Section 2 — Audit section par section

### 1. Hero

**Verdict : REFONDRE**

**Problème** : le H1 actuel — "Vous avez un bien à céder. Offre ferme en 7 jours." — est 100% vendeur. Un acquéreur qui arrive sur le site comprend en 2 secondes qu'il est au mauvais endroit. Le CTA principal "Soumettre mon bien" renforce cette exclusion. Le site se disqualifie lui-même auprès de sa cible prioritaire post-pivot.

**Correction** :
- Surtitre : `MARCHAND DE BIENS — FRANCE` (conserver)
- H1 : `Avant le marché. Sans les risques.`
- Sous-titre : `Des biens sourcés, transformés et documentés par un opérateur intégré. Disponibles à la vente et en précommercialisation.`
- CTA principal : `Voir les biens disponibles` → `/nos-biens`
- CTA secondaire : `Soumettre un bien →` → `/vendre` (conserver, passe en secondaire)

**Effort** : Moyen — modification Hero.jsx + Hero.css (layout CTA potentiellement à adapter)

---

### 2. Stats

**Verdict : ADAPTER**

**Problème** : les 3 stats actuelles sont `3,2M€ d'actifs acquis`, `7 jours pour une offre ferme`, `21 opérations réalisées`. La stat centrale — "7 jours pour une offre ferme" — est 100% vendeur. Elle n'a aucune résonance pour un acquéreur.

**Correction** : réorienter la stat centrale vers l'acquéreur. Deux options :
- Option 1 : remplacer par `[X] biens disponibles` (stock actuel — [HYPOTHÈSE : à renseigner par le fondateur])
- Option 2 : remplacer par `[X] actifs en portefeuille` pour signaler la profondeur du stock

Conserver `3,2M€ d'actifs acquis` (crédibilité opérateur) et `21 opérations réalisées` (track record).

Ordre recommandé post-pivot :
1. `21 opérations réalisées` (track record en premier — rassure l'acquéreur)
2. `[X] biens disponibles` (ce qui l'intéresse directement)
3. `3,2M€ de volume traité` (crédibilité financière)

**Effort** : Faible — modification du tableau `stats` dans Stats.jsx + données config

---

### 3. FeaturedProjects

**Verdict : ADAPTER**

**Problème** : la section s'intitule "Réalisations récentes" et pointe vers `/realisations`. Elle présente des biens passés (opérations terminées), pas des biens disponibles à l'achat. Pour un acquéreur, c'est de la preuve sociale utile mais ce n'est pas ce qu'il cherche en priorité.

**Correction** : différencier clairement biens disponibles vs réalisations passées. Deux blocs distincts à terme :
- **Bloc 1 — Biens disponibles** (nouveau) : titre "Disponibles maintenant" — biens actuellement à vendre ou en précommercialisation, avec CTA `Voir tous les biens` → `/nos-biens`
- **Bloc 2 — Réalisations** (actuel, renommé) : titre "Nos réalisations" — opérations terminées, preuve du track record. CTA `Toutes nos réalisations` → `/realisations`

À court terme si le portefeuille disponible est vide : conserver FeaturedProjects en réalisations, mais ajouter un titre "Ce que nous avons livré — et ce qui arrive" pour orienter l'acquéreur vers la précommercialisation.

**Effort** : Moyen — nouveau composant `AvailableProperties.jsx` + modification du composant existant

---

### 4. Process

**Verdict : REFONDRE**

**Problème** : les 3 étapes actuelles décrivent intégralement le process vendeur — "Vous soumettez votre dossier", "Nous instruisons", "Nous vous remettons une offre ferme". Zéro pertinence pour un acquéreur.

**Correction** : remplacer par un process acquéreur en 3 étapes.

Proposition :
```
01 — Vous parcourez le portefeuille.
Biens disponibles à la vente et en précommercialisation. Chaque fiche détaille l'opération — adresse, travaux réalisés, prix, disponibilité.

02 — Vous prenez contact.
Un échange direct avec l'équipe Versi Immobilier. Pas un agent intermédiaire — l'opérateur qui a transformé le bien.

03 — Vous signez sans surprise.
Chaque bien est documenté. Vous savez exactement ce que vous achetez avant de signer.
```

Conserver la section Process vendeur sur la page `/vendre` — c'est là qu'elle a du sens.

**Effort** : Faible — modification du tableau `STEPS` dans Process.jsx

---

### 5. SellerBanner

**Verdict : GARDER**

**Problème** : aucun — c'est exactement le bon format pour un discours vendeur secondaire. Un bandeau compact, visible mais non dominant, qui s'adresse au vendeur qui arrive sur un site orienté acquéreur.

**Correction mineure** : affiner le copy pour qu'il soit encore plus tranché.

Copy actuel : "Votre projet de cession a une contrainte temporelle ? Nous instruisons en interne — et nous vous répondons en 7 jours, offre ferme ou refus motivé."

Copy proposé : "Vous avez un bien à céder ? Offre d'achat ferme en 7 jours. Sans condition suspensive. Sans intermédiaire."

Le CTA "Soumettre mon bien" est parfait — conserver.

**Effort** : Minimal — modification du copy dans SellerBanner.jsx

---

### 6. Témoignages

**Verdict : ADAPTER** (section inexistante dans le code actuel — à créer)

**Problème** : section absente du site actuel. Lacune critique pour un acquéreur qui doit faire confiance à un opérateur pour un achat à 250k-1M€.

**Correction** : créer une section `Testimonials.jsx` avec témoignages acquéreurs ET vendeurs, clairement labellisés.
- Priorité : 1-2 témoignages acquéreurs ("J'ai acheté un appartement Versi Immobilier — voici mon expérience")
- Secondaire : 1 témoignage vendeur (preuve track record double-face)

[HYPOTHÈSE : témoignages à collecter auprès des acquéreurs passés — à initier par le fondateur]

**Effort** : Moyen — nouveau composant + collecte des témoignages

---

### 7. Nav

**Verdict : ADAPTER**

**Problème** : la navigation actuelle met "NOS BIENS" en première position — c'est bon. Mais le CTA fixe `SOUMETTRE MON BIEN` est positionné comme l'action principale du site. Pour un acquéreur, ce CTA est invisible (pas pour lui) ou perturbant (il comprend que ce site n'est pas pour lui).

**Correction** :
- Ordre des items : `NOS BIENS` en premier (conserver), `RÉALISATIONS` en second, `NOTRE APPROCHE`, `CONTACT` — et `VENDRE UN BIEN` en dernière position du menu desktop (visible mais clairement secondaire)
- CTA fixe : remplacer `SOUMETTRE MON BIEN` par `VOIR LES BIENS` → `/nos-biens` comme CTA principal
- Ajouter `Vendre un bien` comme lien secondaire à côté du CTA (texte simple, sans fond, sans prominence) pour les vendeurs qui arrivent

Nav actuelle :
```
NOS BIENS | VENDRE UN BIEN | NOTRE APPROCHE | RÉALISATIONS | CONTACT | [CTA: SOUMETTRE MON BIEN]
```

Nav proposée :
```
NOS BIENS | RÉALISATIONS | NOTRE APPROCHE | CONTACT | VENDRE UN BIEN | [CTA: VOIR LES BIENS]
```

**Effort** : Faible — réordonnancement `NAV_ITEMS` dans Nav.jsx + modification du CTA

---

### 8. Page Nos Biens

**Verdict : REFONDRE** (page existante — structure à valider)

**Problème** : c'est la page centrale du pivot. Elle doit être la vitrine principale du portefeuille — biens en vente et en précommercialisation, filtrables, avec fiches complètes.

**Correction** : structure requise pour la page :
- Hero court : titre + sous-titre + nombre de biens disponibles
- Filtres : type (appartement/maison/immeuble), ville/région, prix, statut (disponible/précommercialisation)
- Grille biens : cards avec photo, adresse courte, surface, prix, statut, CTA "Voir le bien"
- Si portefeuille vide : état vide qualitatif — "Nouveau bien en cours d'acquisition. Laissez votre contact pour être notifié en précommercialisation." + formulaire email

**Effort** : Élevé — refonte de la page + système de filtres + gestion état vide

---

### 9. Page Vendre / Soumettre un bien

**Verdict : GARDER**

**Problème** : aucun structurel. Cette page est le bon endroit pour le discours vendeur complet — process, garanties, CTA formulaire.

**Correction mineure** : s'assurer que la page commence par un signal clair "Cette page s'adresse aux propriétaires souhaitant céder un bien." pour éviter toute confusion avec les acquéreurs qui auraient cliqué par erreur.

Le process vendeur (3 étapes actuelles de Process.jsx) doit migrer ici, pas disparaître.

**Effort** : Minimal — ajout d'un chapô + migration du Process.jsx vendeur

---

### 10. Page Contact

**Verdict : ADAPTER**

**Problème** : formulaire de contact générique. Un acquéreur et un vendeur ont des besoins différents — les mélanger dans un seul formulaire produit des leads non qualifiés.

**Correction** : ajouter un sélecteur d'intention en haut du formulaire :
- "Je cherche un bien à acquérir"
- "J'ai un bien à céder"
- "Je suis partenaire / prescripteur"

Le formulaire adapte son contenu et son label de soumission selon la sélection. Ou, plus simple : deux CTA distincts qui pointent vers des formulaires dédiés.

**Effort** : Moyen — modification du formulaire de contact avec logique conditionnelle

---

### 11. Page Notre Approche

**Verdict : ADAPTER**

**Problème** : [HYPOTHÈSE : la page décrit probablement le process opérateur côté acquisition/transformation — à vérifier dans le code] Si c'est le cas, le contenu est potentiellement utile pour l'acquéreur (comprendre la méthode Versi) mais doit être réorienté dans son introduction.

**Correction** : l'intro de la page doit s'adresser aux deux personas de manière explicite — "Voici comment nous travaillons : de l'acquisition d'un bien à sa transformation et sa revente. Une approche intégrée, documentée, reproductible." L'acquéreur comprend pourquoi c'est une garantie de qualité. Le vendeur comprend pourquoi c'est une offre sérieuse.

**Effort** : Faible — révision de l'intro + restructuration des sections si nécessaire

---

### 12. Footer

**Verdict : ADAPTER**

**Problème** : [HYPOTHÈSE : le footer liste probablement les liens principaux du site — à vérifier] Si le CTA principal du footer est vendeur ("Soumettre mon bien"), il doit être équilibré.

**Correction** : le footer doit comporter deux colonnes d'action distinctes :
- Colonne acquéreur : "Nos biens disponibles" → `/nos-biens` + "Précommercialisation — être notifié" → formulaire email
- Colonne vendeur : "Soumettre un bien" → `/vendre`

**Effort** : Faible — modification du contenu Footer.jsx

---

## Section 3 — Hiérarchie homepage proposée

### Ordre actuel (orienté vendeur)
1. Hero — "Vous avez un bien à céder. Offre ferme en 7 jours."
2. Stats — 3,2M€ / 7 jours / 21 opérations
3. FeaturedProjects — Réalisations récentes
4. Process — 3 étapes vendeur
5. SellerBanner — Bandeau vendeur
6. (Témoignages — absent)

### Ordre proposé (orienté acquéreur, vendeur en secondaire)

| Position | Section | Rôle | Persona adressé |
|---|---|---|---|
| 1 | Hero — "Avant le marché. Sans les risques." | Accroche + orientation | Acquéreur |
| 2 | AvailableProperties (nouveau) | Biens disponibles maintenant (3 max en vedette) | Acquéreur |
| 3 | Stats — Track record | Crédibilité opérateur | Acquéreur + Vendeur |
| 4 | Process acquéreur — 3 étapes | Comment ça marche pour l'acquéreur | Acquéreur |
| 5 | FeaturedProjects — Réalisations | Preuve qualité / track record | Acquéreur |
| 6 | Testimonials (à créer) | Confiance | Acquéreur + Vendeur |
| 7 | SellerBanner — Bandeau vendeur | Soumission bien (secondaire) | Vendeur |

**Logique du parcours** : un acquéreur arrive → comprend immédiatement que c'est une vitrine de biens → voit ce qui est disponible → rassurance par les chiffres → comprend le process d'achat → validation par les réalisations et les témoignages → appel à l'action. Le vendeur qui arrive voit aussi dès le Hero qu'il est sur un site marchand de biens, et le SellerBanner en pied de page lui propose l'action adaptée.

---

## Section 4 — Impact docs existants

### Fichiers à mettre à jour obligatoirement

| Fichier | Nature de la mise à jour | Urgence |
|---|---|---|
| `docs/copy/brand-voice.md` | Ajouter section "Persona acquéreur" avec vocabulaire prescrit, exemples de copy before/after, registre émotionnel de l'acquéreur vs vendeur | Haute |
| `docs/strategy/personas.md` (si existe) | Promouvoir l'acquéreur en persona principal, déplacer Sophie (vendeur) en persona secondaire, documenter les "clients des clients" (si applicable) | Haute |
| `docs/strategy/brand-platform.md` (si existe) | Réviser la promesse de marque pour refléter le pivot acquéreur | Haute |
| `docs/strategy/creative-brief.md` (si existe) | Mettre à jour la cible, le message principal et les exclusions créatives | Haute |
| `docs/ux/user-flows.md` (si existe) | Ajouter le parcours acquéreur (homepage → nos biens → fiche bien → contact) | Haute |
| `docs/product/functional-specs.md` (si existe) | Mettre à jour les specs de la page Nos Biens, de la fiche bien, du formulaire de contact | Haute |
| `project-context.md` | Tableau Historique des interventions agents (fait en clôture de ce livrable) | Obligatoire |

### Fichiers à créer

| Fichier | Contenu | Agent responsable |
|---|---|---|
| `docs/strategy/personas.md` | Persona acquéreur (principal) + Sophie vendeur (secondaire) + Pierre partenaire | @creative-strategy |
| `docs/ux/user-flows.md` | Parcours acquéreur + vendeur + partenaire | @ux |
| `docs/copy/vi-copy-acquéreur.md` | Copy homepage post-pivot + fiches biens + emails de précommercialisation | @copywriter |

---

## Section 5 — Handoff

---

**Handoff → @orchestrator**

**Fichiers produits** :
- `/home/user/Versi/docs/strategy/vi-pivot-audit.md`

**Décisions prises** :
- Positionnement acquéreur : "Avant le marché. Sans les risques." — tagline retenue Option C
- Proposition de valeur : opérateur intégré + traçabilité totale + précommercialisation
- Hiérarchie homepage : 7 sections reordonnées, acquéreur en 1-4, vendeur en 7
- Process.jsx : à refondre intégralement (contenu vendeur migre vers /vendre)
- Hero.jsx : à refondre intégralement (H1 + CTA principal)
- Nav.jsx : réordonnancement items + CTA principal bascule vers "VOIR LES BIENS"
- Stats.jsx : stat centrale "7 jours offre ferme" à remplacer par stat acquéreur
- SellerBanner.jsx : garder, copy mineur à affiner
- FeaturedProjects.jsx : adapter + créer AvailableProperties.jsx distinct
- Témoignages : à créer (Testimonials.jsx)
- Page Contact : formulaire à segmenter par intention

**Points d'attention pour la suite** :
- Le portefeuille disponible peut être vide au lancement — @fullstack doit anticiper l'état vide qualitatif dans AvailableProperties et Nos Biens
- Le process vendeur (3 étapes actuelles de Process.jsx) ne doit pas disparaître — il migre sur /vendre
- Les témoignages acquéreurs sont à collecter par le fondateur avant de lancer @copywriter sur cette section
- @copywriter doit produire le copy de toutes les sections refondues en priorité (Hero, Process acquéreur, AvailableProperties)
- @ux doit formaliser le parcours acquéreur avant que @fullstack code les nouvelles pages

---

## Hypothèses à valider

| # | Hypothèse | Impact si fausse |
|---|---|---|
| H1 | L'acquéreur type est un investisseur locatif ou primo-accédant aisé, tranche 250k-500k€ | Repositionner la proposition de valeur si le ticket moyen est systématiquement supérieur |
| H2 | Le portefeuille disponible à la vente est vide ou quasi-vide au lancement | Si des biens sont disponibles maintenant : les mettre en avant immédiatement dans le Hero |
| H3 | La page Notre Approche existe et décrit le process opérateur côté acquisition/transformation | À vérifier dans le code avant que @copywriter la révise |
| H4 | Le footer actuel comporte un CTA vendeur dominant | À vérifier dans Footer.jsx avant modification |
| H5 | Des témoignages acquéreurs existent ou peuvent être collectés rapidement | Si non : la section Testimonials est en placeholder qualitatif au lancement |
