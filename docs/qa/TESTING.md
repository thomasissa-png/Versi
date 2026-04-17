# Guide de tests -- Versi

> Produit par @qa | Date : 2026-04-10
> Reference : qa-strategy.md, project-context.md

---

## Prerequis

### Installation

```bash
# Depuis la racine du projet
npm install
npm install -D @playwright/test @axe-core/playwright

# Installer les navigateurs Playwright
npx playwright install chromium
```

### Structure des tests

```
tests/
  e2e/
    versi-fr.spec.js          # Tests E2E versi.fr (one-page + pages legales)
    versi-immobilier.spec.js   # Tests E2E versi-immobilier.fr (multi-pages)
  screenshots/                 # Baselines visuelles (produites par @fullstack)
playwright.config.js           # Configuration Playwright racine
```

---

## Lancer les tests

### Tous les tests

```bash
npx playwright test
```

### Tests d'un seul site

```bash
# versi.fr uniquement
npx playwright test tests/e2e/versi-fr.spec.js

# versi-immobilier.fr uniquement
npx playwright test tests/e2e/versi-immobilier.spec.js
```

### Mode debug (avec navigateur visible)

```bash
npx playwright test --headed --debug
```

### Rapport HTML

```bash
npx playwright test --reporter=html
npx playwright show-report
```

### Tests sur un device specifique

```bash
# Mobile uniquement
npx playwright test --project="Mobile"

# Desktop uniquement
npx playwright test --project="Desktop"
```

---

## Build verification (Gate G28)

Avant tout deploiement, verifier que les deux sites compilent :

```bash
# Build versi.fr
cd src && npm install && npm run build && cd ..

# Build versi-immobilier
cd versi-immobilier && npm install && npm run build && cd ..
```

Les deux builds doivent passer avec 0 erreur.

---

## Web servers pour les tests

Playwright lance automatiquement les serveurs Vite via la configuration `webServer` dans `playwright.config.js` :

- versi.fr : `http://localhost:5173` (port 5173)
- versi-immobilier.fr : `http://localhost:5174` (port 5174)

Les serveurs sont demarres avant les tests et arretes apres. Pas besoin de les lancer manuellement.

---

## Conventions

### Nommage des tests

- Format : `[SITE]-[FEATURE]-[SCENARIO]`
- Exemples : `VF-FORM-01 soumission reussie`, `VI-SELL-03 champs vides`

### Assertions

- Assertions Playwright natives (`expect(locator).toBeVisible()`, etc.)
- axe-core pour l'accessibilite (`expect(accessibilityScanResults.violations).toEqual([])`)
- Pas de `sleep` ni `waitForTimeout` sauf cas justifie (animation 300ms)

### Locators

- Ordre de preference : `getByRole()` > `getByLabel()` > `getByText()` > `getByTestId()` > CSS
- Les selecteurs CSS fragiles (classes generees, IDs dynamiques) sont interdits

---

## Seuils

| Metrique | Seuil | Bloquant |
|---|---|---|
| Tests E2E critiques | 100% PASS | Oui |
| axe-core violations critiques | 0 | Oui |
| Build versi.fr | 0 erreur | Oui |
| Build versi-immobilier | 0 erreur | Oui |
| Placeholders dans le code | 0 (`sk_test_`, `pk_test_`, `=placeholder`) | Oui |

---

## Matrice de traçabilité user stories → tests (Gate G27)

> Ajouté versi-s21 itération 2 — Bundle C (I9)

### US-VS-21 : Pré-création automatique de lots par clustering IA

| Critère d'acceptance | Description | Test | Fichier | Statut |
|---|---|---|---|---|
| AC-01 Happy path clustering | Groupement par (floor, unit_id) → N lots pré-créés | `clusterByUnit groupe 2 pièces` | tests/unit/clustering.test.ts | PASS |
| AC-02 Lots visibles UI | Lots IA affichés avec badges et boutons de validation | `affiche les lots IA avec badge et boutons` | tests/e2e/clustering-ia.spec.ts | PASS |
| AC-03 Seuil confiance 0.7 | Confiance moyenne < 0.7 → groupe rejeté | `rejette un groupe dont la confiance moyenne < seuil` | tests/unit/clustering.test.ts | PASS |
| AC-04 Seuil confidenceMin 0.5 | 1 pièce à 0.4 noie la moyenne → rejeté | `rejette un groupe dont confidenceMin < 0.5` | tests/unit/clustering.test.ts | PASS |
| AC-05 Filtre ≥ 2 pièces | Groupe de 1 pièce non-studio → rejeté | `rejette un groupe de 1 pièce non-studio` | tests/unit/clustering.test.ts | PASS |
| AC-06 Exception studio | Groupe de 1 pièce "Studio" → accepté (I10) | `accepte un groupe de 1 pièce si name_raw contient 'Studio'` | tests/unit/clustering.test.ts | PASS |
| AC-07 Bbox englobante | Union des bounding_box des pièces | `calcule l'enveloppe englobante de 2 rooms` | tests/unit/clustering.test.ts | PASS |
| AC-08 Bbox fallback | Aucune bbox → plein cadre (I3) | `retourne fallback plein cadre si aucune room n'a de bbox` | tests/unit/clustering.test.ts | PASS |
| AC-09 Nommage T{n} | 3 habitables → "T3 RDC" | `3 pièces habitables sur RDC → 'T3 RDC'` | tests/unit/clustering.test.ts | PASS |
| AC-10 Nommage Studio | 1 habitable → "Studio" | `1 seule pièce habitable → 'Studio'` | tests/unit/clustering.test.ts | PASS |
| AC-11 Nommage Lot | 0 habitable → "Lot" | `0 pièce habitable → 'Lot'` | tests/unit/clustering.test.ts | PASS |
| AC-12 Suffixe gauche/droite | 2 lots même étage → suffixe position | `2 lots même étage : gauche et droite` | tests/unit/clustering.test.ts | PASS |
| AC-13 Suffixe numérique 3+ | 3+ lots même étage → #1, #2, #3 (I2) | `3+ lots même étage : numérotation #1, #2, #3` | tests/unit/clustering.test.ts | PASS |
| AC-14 Pièces non habitables | WC, SdB, Couloir, etc. exclus du comptage | `exclut WC, SdB, Couloir, Entrée, Cellier, Cave, Dégagement` | tests/unit/clustering.test.ts | PASS |
| AC-15 unit_id null ignoré | Pièces sans unit_id → pas de groupe | `ignore les pièces avec unit_id = null` | tests/unit/clustering.test.ts | PASS |
| AC-16 floor null ignoré | Pièces sans floor → pas de groupe | `ignore les pièces avec floor = null` | tests/unit/clustering.test.ts | PASS |
| AC-17 Bug split :: (I1) | unit_id contenant "::" → géré correctement | `gère unit_id contenant '::' sans split incorrect` | tests/unit/clustering.test.ts | PASS |
| AC-18 Fallback 0 lot | Confiance < 0.7 → 0 lot, état vide guidé | `fallback etat vide si 0 lot IA` | tests/e2e/clustering-ia.spec.ts | PASS |

### US-VS-22 : Validation 1-clic des lots IA

| Critère d'acceptance | Description | Test | Fichier | Statut |
|---|---|---|---|---|
| AC-19 Validation individuelle | Bouton "Valider ce lot" → PATCH status validated | `validation individuelle d'un lot IA` | tests/e2e/clustering-ia.spec.ts | PASS |
| AC-20 Validation globale | Bouton "Tout valider" → PATCH tous les lots IA | `bouton Tout valider envoie PATCH pour chaque lot IA` | tests/e2e/clustering-ia.spec.ts | PASS |
| AC-21 Lots manuels sans badge IA | Lots source=manual → pas de badge IA ni bouton valider | `lots manuels n'ont pas de badge IA` | tests/e2e/clustering-ia.spec.ts | PASS |
| AC-22 Undo lot validé IA | Bouton "Annuler validation" → PATCH status suggested | Non implémenté (Bundle B — U4) | — | A CREER |

### Couverture

- **US-VS-21** : 18/18 critères couverts (AC-01 à AC-18)
- **US-VS-22** : 3/4 critères couverts (AC-22 dépend de l'implémentation UI du Bundle B — U4)
- **Total** : 21/22 critères mappés, 1 en attente du Bundle B

---

**Handoff --> @orchestrator**

- Fichiers produits : `docs/qa/TESTING.md`
- Decisions prises :
  - Playwright comme unique outil de test (pas de Vitest -- sites vitrines sans logique testable en unite)
  - axe-core integre pour accessibilite WCAG 2.2 AA
  - Serveurs Vite lances automatiquement par Playwright
  - Ports : 5173 (versi.fr) et 5174 (versi-immobilier)
- Points d'attention :
  - `npx playwright install chromium` necessaire avant premiere execution
  - Les baselines screenshots dans `tests/screenshots/` ne sont pas utilisees par les tests E2E (comparaison visuelle a implementer si besoin en V2)
