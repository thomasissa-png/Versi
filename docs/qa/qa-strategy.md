# Strategie de tests -- Versi

> Produit par @qa | Date : 2026-04-10
> Reference : project-context.md, functional-specs.md, user-flows.md, lessons-learned.md
> KPI North Star : Nombre de prises de contact qualifiees via formulaire

---

## 1. Perimetre

Deux sites React + Vite dans le meme repo :

| Site | Dossier | Type | Persona principal | Pages |
|---|---|---|---|---|
| versi.fr | `src/` | One-page institutionnel + 2 pages legales + 404 | Laurent (investisseur 48 ans) | 1 one-page (7 sections) + mentions-legales + politique-confidentialite + 404 |
| versi-immobilier.fr | `versi-immobilier/` | Multi-pages marchand de biens | Sophie (vendeuse 42 ans) | Accueil, Nos biens, Fiche bien, Vendre un bien, Realisations, Fiche realisation, Investir, Notre approche, Contact, Mentions legales, 404 |

Stack commune : React 19 + Vite 8 + React Router 7. Pas de backend (formulaires via API interne SMTP). Pas d'authentification.

---

## 2. Strategie de tests (Testing Trophy)

### Distribution cible

| Niveau | Part | Outils | Perimetre |
|---|---|---|---|
| Analyse statique | Gratuit | TypeScript strict (si migre), ESLint | Lint, type safety |
| Tests unitaires | 0% (V1) | -- | Pas de logique metier complexe -- sites vitrines statiques |
| Tests d'integration | 0% (V1) | -- | Pas de backend, pas de BDD |
| **Tests E2E** | **100%** | **Playwright** | **Parcours critiques, formulaires, navigation, responsive, accessibilite** |
| Tests visuels | Complementaire | Playwright screenshots | Comparaison avec baselines existantes dans `tests/screenshots/` |

**Justification** : pour deux sites vitrines React sans backend, sans BDD, sans authentification, les tests unitaires et d'integration ont un ratio signal/bruit tres faible. La valeur maximale est dans les tests E2E qui reproduisent le parcours reel des personas (Laurent qui scrolle et evalue, Sophie qui cherche a vendre).

### Priorisation par risque

| Niveau | Features | Couverture |
|---|---|---|
| **Critique** | Formulaires de contact (KPI North Star), formulaire vendeur | E2E complet : happy path + validation + erreur reseau + double soumission + honeypot |
| **Haut** | Navigation (scroll smooth, ancres, mobile menu, cross-page), Hero (fade-in, premiere impression Laurent), IntersectionObserver (bug P0 connu) | E2E multi-device |
| **Standard** | Sections statiques (Mission, Activites, Approche, Equipe, Implantation), pages legales, footer | E2E verification de presence et structure |
| **Low** | Analytics events, meta SEO | Grep statique en CI |

---

## 3. Plan de tests E2E -- versi.fr

### 3.1 Navigation (US-NAV-01, US-NAV-02, US-NAV-03)

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VF-NAV-01 | Clic nav item scrolle vers la section cible avec offset 80px | Desktop, Mobile | Critique |
| VF-NAV-02 | Nav passe de transparente a opaque apres scroll du Hero | Desktop | Haut |
| VF-NAV-03 | CTA "NOUS CONTACTER" scrolle vers #contact | Desktop | Critique |
| VF-NAV-04 | Menu hamburger ouvre overlay plein ecran sur mobile | Mobile | Critique |
| VF-NAV-05 | Clic item dans overlay ferme le menu et scrolle | Mobile | Critique |
| VF-NAV-06 | Escape ferme le menu mobile, focus retourne au hamburger | Mobile | Haut |
| VF-NAV-07 | Focus trap dans le menu mobile overlay | Mobile | Haut |
| VF-NAV-08 | Navigation par ancres depuis /mentions-legales vers /#section | Desktop | Haut |

### 3.2 Hero (US-HERO-01, US-HERO-02)

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VF-HERO-01 | H1 "Quatre metiers. Un cycle maitrise." visible sans scroll | Desktop, Mobile, Tablet | Critique |
| VF-HERO-02 | Fade-in 300ms se declenche au chargement | Desktop | Haut |
| VF-HERO-03 | CTA "NOTRE APPROCHE" scrolle vers #approche | Desktop | Haut |
| VF-HERO-04 | CTA "NOUS CONTACTER" scrolle vers #contact | Desktop | Critique |

### 3.3 Sections statiques (US-MISSION-01, US-ACT-01 a 04, US-APPR-01, US-IMP-01, US-EQ-01 a 04)

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VF-SECT-01 | 7 sections presentes dans le DOM dans l'ordre correct | Desktop | Critique |
| VF-SECT-02 | Section Mission : H2 et statistiques visibles | Desktop | Standard |
| VF-SECT-03 | Section Activites : 4 cartes entites avec noms et metiers | Desktop | Haut |
| VF-SECT-04 | CTAs entites inactifs : cursor not-allowed, aria-disabled | Desktop | Standard |
| VF-SECT-05 | Section Approche : 4 etapes SOURCER/ANALYSER/TRANSFORMER/OPERER | Desktop | Standard |
| VF-SECT-06 | Section Implantation : carte SVG ou fallback texte | Desktop | Standard |
| VF-SECT-07 | Section Equipe : 3 cartes cofondateurs avec "Co-fondateur" | Desktop | Haut |
| VF-SECT-08 | IntersectionObserver : sections deviennent visibles au scroll | Desktop, Tablet | Critique |

### 3.4 Formulaire de contact (US-CONT-01 a 08) -- KPI NORTH STAR

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VF-FORM-01 | Soumission reussie : happy path (nom + email + message valides) | Desktop, Mobile | Critique |
| VF-FORM-02 | Champ obligatoire vide : message erreur inline | Desktop | Critique |
| VF-FORM-03 | Email invalide : message "adresse email valide" | Desktop | Critique |
| VF-FORM-04 | Message < 20 caracteres : message erreur | Desktop | Critique |
| VF-FORM-05 | Anti-double-soumission : bouton disabled pendant loading | Desktop | Critique |
| VF-FORM-06 | Erreur reseau : message erreur + donnees preservees | Desktop | Critique |
| VF-FORM-07 | Honeypot : soumission rejetee silencieusement | Desktop | Haut |
| VF-FORM-08 | Focus sur premier champ en erreur apres validation | Desktop | Haut |
| VF-FORM-09 | Donnees adversariales : nom avec accents, emojis, caracteres speciaux | Desktop | Haut |

### 3.5 Pages secondaires (US-FOOTER-01, US-TRANS-02, US-TRANS-05)

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VF-PAGE-01 | /mentions-legales accessible, contient Nav + Footer | Desktop | Haut |
| VF-PAGE-02 | /politique-de-confidentialite accessible, contient Nav + Footer | Desktop | Haut |  
| VF-PAGE-03 | Page 404 pour URL inexistante | Desktop | Standard |
| VF-PAGE-04 | Retour arriere navigateur depuis page legale | Desktop | Standard |

### 3.6 Responsive et mobile (US-RESP-01 a 03)

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VF-RESP-01 | Touch targets >= 44px sur mobile (nav, CTAs, LinkedIn) | Mobile | Critique |
| VF-RESP-02 | Input font-size >= 16px (anti-zoom iOS) | Mobile | Critique |
| VF-RESP-03 | Pas de scroll horizontal | Mobile, Tablet, Desktop | Haut |

### 3.7 Accessibilite (WCAG 2.2 AA)

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VF-A11Y-01 | axe-core 0 violation critique sur page principale | Desktop | Critique |
| VF-A11Y-02 | axe-core 0 violation critique sur /mentions-legales | Desktop | Haut |
| VF-A11Y-03 | Navigation clavier complete (Tab sur tous les interactifs) | Desktop | Haut |

---

## 4. Plan de tests E2E -- versi-immobilier.fr

### 4.1 Navigation

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VI-NAV-01 | Tous les liens de navigation fonctionnels | Desktop, Mobile | Critique |
| VI-NAV-02 | Menu hamburger ouvre overlay sur mobile | Mobile | Critique |
| VI-NAV-03 | Logo "VERSI IMMOBILIER" ramene a l'accueil | Desktop | Haut |
| VI-NAV-04 | Page active indiquee dans la nav | Desktop | Standard |

### 4.2 Accueil

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VI-HOME-01 | Hero visible avec titre et CTA | Desktop, Mobile | Critique |
| VI-HOME-02 | Chiffres cles (stats) presents | Desktop | Haut |
| VI-HOME-03 | Projets vedettes affiches | Desktop | Haut |
| VI-HOME-04 | Process (etapes) present | Desktop | Standard |
| VI-HOME-05 | Bandeau vendeur avec CTA vers /vendre | Desktop | Critique |

### 4.3 Nos biens

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VI-BIENS-01 | Page /nos-biens accessible, grille de biens affichee | Desktop | Haut |
| VI-BIENS-02 | Clic sur un bien navigue vers /nos-biens/:id | Desktop | Haut |
| VI-BIENS-03 | Fiche bien : galerie, caracteristiques, prix, CTA contact | Desktop | Haut |

### 4.4 Vendre un bien -- CRITIQUE (KPI)

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VI-SELL-01 | Page /vendre accessible, engagements affiches | Desktop, Mobile | Critique |
| VI-SELL-02 | Formulaire vendeur : happy path (tous champs valides) | Desktop | Critique |
| VI-SELL-03 | Formulaire vendeur : champs obligatoires vides | Desktop | Critique |
| VI-SELL-04 | Formulaire vendeur : email invalide | Desktop | Critique |
| VI-SELL-05 | Formulaire vendeur : telephone invalide | Desktop | Critique |
| VI-SELL-06 | Anti-double-soumission vendeur | Desktop | Critique |
| VI-SELL-07 | Erreur reseau vendeur : donnees preservees | Desktop | Critique |
| VI-SELL-08 | FAQ deroulante fonctionnelle | Desktop | Haut |

### 4.5 Realisations

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VI-REAL-01 | Page /realisations accessible, grille de projets | Desktop | Haut |
| VI-REAL-02 | Clic sur un projet navigue vers /realisations/:id | Desktop | Haut |
| VI-REAL-03 | Fiche realisation : galerie, chiffres, description | Desktop | Haut |

### 4.6 Pages secondaires

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VI-PAGE-01 | /investir accessible, contient lien vers Versi holding | Desktop | Standard |
| VI-PAGE-02 | /notre-approche accessible, process detaille | Desktop | Standard |
| VI-PAGE-03 | /contact accessible, formulaire fonctionnel | Desktop | Critique |
| VI-PAGE-04 | /mentions-legales accessible, contient Nav + Footer | Desktop | Haut |
| VI-PAGE-05 | Page 404 pour URL inexistante | Desktop | Standard |

### 4.7 Formulaire de contact general

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VI-FORM-01 | Soumission reussie : happy path | Desktop, Mobile | Critique |
| VI-FORM-02 | Champs obligatoires vides : messages erreur inline | Desktop | Critique |
| VI-FORM-03 | Email invalide : message erreur | Desktop | Critique |
| VI-FORM-04 | Telephone invalide : message erreur | Desktop | Critique |
| VI-FORM-05 | Honeypot anti-spam | Desktop | Haut |
| VI-FORM-06 | Anti-double-soumission | Desktop | Critique |

### 4.8 Responsive et accessibilite

| Test ID | Description | Devices | Priorite |
|---|---|---|---|
| VI-RESP-01 | Pas de scroll horizontal | Mobile, Tablet, Desktop | Haut |
| VI-RESP-02 | Touch targets >= 44px sur mobile | Mobile | Critique |
| VI-RESP-03 | Input font-size >= 16px (anti-zoom iOS) | Mobile | Critique |
| VI-A11Y-01 | axe-core 0 violation critique sur accueil | Desktop | Critique |
| VI-A11Y-02 | axe-core 0 violation critique sur /vendre | Desktop | Haut |
| VI-A11Y-03 | axe-core 0 violation critique sur /contact | Desktop | Haut |

---

## 5. Problemes connus a couvrir (lessons-learned.md)

| Probleme | Source | Test(s) correspondant(s) |
|---|---|---|
| IntersectionObserver ne se declenche pas sur tablette/desktop | lessons-learned P0 | VF-SECT-08 |
| Hero fade global 300ms doit etre un fade unique, pas cascade | lessons-learned P1 | VF-HERO-02 |
| Navigation par ancres depuis pages non-home | lessons-learned P1 | VF-NAV-08 |
| Pages legales doivent avoir Nav + Footer (pas de mini-nav) | lessons-learned P1 | VF-PAGE-01, VF-PAGE-02, VI-PAGE-04 |
| Titre Mission deborde sur mobile 375px | lessons-learned P2 | VF-RESP-03 |
| SVG map labels trop petits sur mobile | lessons-learned P2 | Couvert par VF-RESP-03 |

---

## 6. Matrice de tracabilite -- Gate G27

### versi.fr

| User Story | Test(s) correspondant(s) | Fichier |
|---|---|---|
| US-NAV-01 : Scroller vers une section | VF-NAV-01 | tests/e2e/versi-fr.spec.js |
| US-NAV-02 : Transition transparente/opaque | VF-NAV-02 | tests/e2e/versi-fr.spec.js |
| US-NAV-03 : CTA "NOUS CONTACTER" | VF-NAV-03 | tests/e2e/versi-fr.spec.js |
| US-HERO-01 : Comprehension instantanee | VF-HERO-01 | tests/e2e/versi-fr.spec.js |
| US-HERO-02 : CTA principal | VF-HERO-03 | tests/e2e/versi-fr.spec.js |
| US-MISSION-01 : Lecture rapide | VF-SECT-02 | tests/e2e/versi-fr.spec.js |
| US-ACT-01 : 4 cartes entites | VF-SECT-03 | tests/e2e/versi-fr.spec.js |
| US-ACT-02 : CTA site inactif | VF-SECT-04 | tests/e2e/versi-fr.spec.js |
| US-APPR-01 : 4 etapes methode | VF-SECT-05 | tests/e2e/versi-fr.spec.js |
| US-IMP-01 : Carte implantation | VF-SECT-06 | tests/e2e/versi-fr.spec.js |
| US-EQ-01 : 3 cofondateurs | VF-SECT-07 | tests/e2e/versi-fr.spec.js |
| US-EQ-04 : Parite visuelle | VF-SECT-07 | tests/e2e/versi-fr.spec.js |
| US-CONT-01 : Soumission reussie | VF-FORM-01 | tests/e2e/versi-fr.spec.js |
| US-CONT-02 : Champ obligatoire manquant | VF-FORM-02 | tests/e2e/versi-fr.spec.js |
| US-CONT-03 : Email invalide | VF-FORM-03 | tests/e2e/versi-fr.spec.js |
| US-CONT-04 : Erreur reseau | VF-FORM-06 | tests/e2e/versi-fr.spec.js |
| US-CONT-05 : Anti-spam honeypot | VF-FORM-07 | tests/e2e/versi-fr.spec.js |
| US-CONT-06 : Double soumission | VF-FORM-05 | tests/e2e/versi-fr.spec.js |
| US-CONT-08 : Message 19 chars | VF-FORM-04 | tests/e2e/versi-fr.spec.js |
| US-FOOTER-01 : Mentions legales | VF-PAGE-01 | tests/e2e/versi-fr.spec.js |
| US-TRANS-02 : Page 404 | VF-PAGE-03 | tests/e2e/versi-fr.spec.js |
| US-TRANS-05 : Retour arriere | VF-PAGE-04 | tests/e2e/versi-fr.spec.js |
| US-TRANS-07 : Perte connexion | VF-FORM-06 | tests/e2e/versi-fr.spec.js |
| US-RESP-01 : Formulaire mobile | VF-RESP-02 | tests/e2e/versi-fr.spec.js |
| US-RESP-02 : Navigation mobile | VF-NAV-04, VF-NAV-05 | tests/e2e/versi-fr.spec.js |
| US-RESP-03 : Touch targets 44px | VF-RESP-01 | tests/e2e/versi-fr.spec.js |

### versi-immobilier.fr

| User Story (implicite des specs) | Test(s) correspondant(s) | Fichier |
|---|---|---|
| Accueil : Hero + stats + projets vedettes | VI-HOME-01 a 05 | tests/e2e/versi-immobilier.spec.js |
| Navigation multi-pages | VI-NAV-01 a 04 | tests/e2e/versi-immobilier.spec.js |
| Nos biens : grille + fiche | VI-BIENS-01 a 03 | tests/e2e/versi-immobilier.spec.js |
| Vendre un bien : formulaire vendeur | VI-SELL-01 a 08 | tests/e2e/versi-immobilier.spec.js |
| Realisations : grille + fiche | VI-REAL-01 a 03 | tests/e2e/versi-immobilier.spec.js |
| Contact : formulaire general | VI-FORM-01 a 06 | tests/e2e/versi-immobilier.spec.js |
| Investir : page passerelle | VI-PAGE-01 | tests/e2e/versi-immobilier.spec.js |
| Notre approche : process | VI-PAGE-02 | tests/e2e/versi-immobilier.spec.js |
| Mentions legales | VI-PAGE-04 | tests/e2e/versi-immobilier.spec.js |
| 404 | VI-PAGE-05 | tests/e2e/versi-immobilier.spec.js |
| Responsive mobile | VI-RESP-01 a 03 | tests/e2e/versi-immobilier.spec.js |
| Accessibilite | VI-A11Y-01 a 03 | tests/e2e/versi-immobilier.spec.js |

---

## 7. Pipeline pre-deploy -- Gate G28

Verification dans cet ordre :

1. `cd src && npm run build` -- 0 erreur
2. `cd versi-immobilier && npm run build` -- 0 erreur
3. Tests E2E Playwright PASS (parcours critiques)
4. Grep pour placeholders : `sk_test_`, `pk_test_`, `="..."`, `=xxx`, `=placeholder` dans src/ -- 0 resultat

---

## 8. Configuration Playwright

- **Browsers** : Chromium uniquement (V1 -- sites vitrines, pas de contrainte cross-browser critique)
- **Devices** : Desktop 1280px, Tablet 768px (iPad), Mobile 375px (iPhone 13)
- **Timeout** : 30s par test, 10s pour les assertions
- **Retries** : 1 retry en CI pour reduire les flaky
- **Web servers** : les deux sites Vite en mode preview sur des ports distincts (5173 pour versi.fr, 5174 pour versi-immobilier)
- **Screenshots** : sur echec uniquement (mode debug)
- **axe-core** : integre via `@axe-core/playwright` dans les tests d'accessibilite

---

## 9. Donnees adversariales

Fixtures de test utilisees dans les formulaires :

| Type | Valeurs | Ou |
|---|---|---|
| Noms avec accents | "Rene Descartes", "Helene Lefebvre" | VF-FORM-09 |
| Emojis | "Laurent Dupont" (pas d'emoji dans nom -- test du happy path) | -- |
| Caracteres speciaux | `<script>alert('xss')</script>` dans message | VF-FORM-09 |
| Email avec +tag | `laurent+versi@example.com` | VF-FORM-09 |
| Message 19 chars | "Dix-neuf chars ic" | VF-FORM-04 |
| Message 20 chars | "Vingt caracteres ici" | VF-FORM-01 |
| Champs vides | Tous vides | VF-FORM-02 |

---

**Handoff --> @orchestrator**

- Fichiers produits : `docs/qa/qa-strategy.md`
- Decisions prises :
  - 100% E2E (pas de tests unitaires/integration pour des sites vitrines statiques)
  - Playwright Chromium uniquement pour V1
  - 3 devices : Desktop 1280px, Tablet 768px, Mobile 375px
  - Formulaires = priorite critique (KPI North Star)
  - IntersectionObserver = test de regression explicite (bug P0 connu)
- Points d'attention :
  - Les deux sites doivent tourner en parallele pour les tests (ports 5173 et 5174)
  - axe-core necessaire pour les tests d'accessibilite (`npm install -D @axe-core/playwright`)
  - Les baselines screenshots existent deja dans `tests/screenshots/`
