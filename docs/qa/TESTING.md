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
