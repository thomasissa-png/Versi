# Audit SEO Bing — Gates par page — Session S8
Date : 2026-04-14

---

## SITE 1 — versi-immobilier.fr

### Architecture SEO
- Composant centralisé : `PageHead.jsx` (react-helmet-async) — title + description + canonical par page
- Canonical : généré dynamiquement `${SITE_URL}${pathname}` — absolu, cohérent
- OG tags : définis dans `index.html` (fallback global). Non surchargés par page via PageHead

---

### Tableau des gates par page

| Page | G-TITLE (≤60) | G-H1 (=1) | G-DESC (≤160) | G-CANONICAL | G-OG | Notes |
|---|---|---|---|---|---|---|
| **HomePage** | PASS [54] | PASS — H1 dans Hero.jsx | PASS [149] | PASS (dynamic `pathname`) | PASS (index.html fallback) | OK |
| **PropertiesPage** | PASS [49] | PASS — H1 inline dans JSX | PASS [120] | PASS | PASS | OK |
| **SellPage** | PASS [51] | PASS — H1 inline dans JSX | **FAIL [171]** | PASS | PASS | Desc dépasse 160 de 11 chars |
| **RealisationsPage** | PASS [49] | PASS — H1 inline dans JSX | PASS [142] | PASS | PASS | OK |
| **ApprochePage** | PASS [52] | PASS — H1 inline dans JSX | PASS [129] | PASS | PASS | OK |
| **BlogPage** | PASS [54] | PASS — H1 inline dans JSX | PASS [134] | PASS | PASS | OK |
| **ContactPage** | PASS [26] | PASS — H1 inline (conditionnel) | PASS [99] | PASS | PASS | H1 conditionnel selon `?bien=` — voir note |
| **InvestirPage** | PASS [38] | PASS — H1 inline dans JSX | PASS [135] | PASS | PASS | noindex correct (page redirect) |
| **PropertyDetailPage** | PASS (template) | PASS — H1 = `project.title` | PASS (template) | PASS | PASS (fallback) | RISQUE title : `slice(0,35)` + city — peut atteindre 62 chars si ville longue |
| **BlogArticlePage** | PASS [≤57] | PASS — H1 dans article.h1 | PASS (excerpt) | PASS | PASS (fallback) | ATTENTION si PageHead conditionnel (`article &&`) — pas de title en état loading/error |
| **RealisationDetailPage** | PASS [≤60] | PASS — H1 = `project.title` | PASS (template) | PASS | PASS (fallback) | Borderline 60 chars si location="Hauts-de-France" |
| **MentionsLegales** | PASS [35] | PASS — 1 H1 correct (corrigé) | PASS [56] | PASS | PASS (fallback) | noindex correct. Politique de confidentialité incluse dans même page — pas de route séparée |
| **NotFound** | **FAIL** | PASS — H1 présent | **FAIL** — pas de meta desc | **FAIL** — pas de canonical | PASS (fallback) | Aucun PageHead — title = fallback index.html "Versi Immobilier — Marchand de biens \| Lille et Paris" |

---

### Problèmes identifiés — versi-immobilier.fr

#### P1 — BLOQUANT : NotFound sans PageHead
- Aucun `PageHead` dans `versi-immobilier/src/pages/NotFound.jsx`
- Title = fallback index.html (page d'accueil), description absente, canonical absent
- Bing voit une page 404 sans canonical → confusion d'indexation
- Fix : ajouter `<PageHead title="Page introuvable — Versi Immobilier" description="La page demandée n'existe pas." noindex />` + `<link rel="canonical" href="https://versi-immobilier.fr/404" />` (ou supprimer le canonical pour les 404, mais au moins noindex)

#### P2 — REQUIS : SellPage description trop longue
- Actuel : 171 chars — dépasse la limite de 160
- Bing tronque à 160 chars, Google aussi
- Phrase coupée dans les SERP : "...fonds propres, ou refus mo..." — perte de sens
- Fix : `"Versi Immobilier achète en direct à Lille, sans condition suspensive. Offre ferme sous 7 jours, fonds propres, ou refus motivé par écrit."` (140 chars)

#### P3 — MINEUR : PropertyDetailPage — title à risque sur villes longues
- Template : `property.title.slice(0,35) — ${city} | Versi Immo`
- Worst case avec `city="Valenciennes"` (12 chars) : 62 chars → FAIL Bing
- Fix recommandé : réduire slice à 30 chars : `property.title.slice(0,30) — ${city} | Versi Immo` (max ~57 chars)

#### P4 — MINEUR : BlogArticlePage — PageHead conditionnel
- `{article && <PageHead title={...} />}` — si article null (loading ou erreur), aucun title injecté
- Bing peut crawler pendant le loading state côté SSR (impossible ici, React CSR pur) — risque faible mais comportement propre = PageHead toujours présent avec titre de fallback
- Fix recommandé : PageHead inconditionnel avec titre de fallback

#### P5 — INFO : OG tags non personnalisés par page
- Les tags og:title / og:description viennent du `index.html` global (fallback homogène)
- PageHead ne passe pas de og:title/og:description via Helmet
- Impact : partages sociaux des pages internes (SellPage, BlogPage) utilisent l'OG de la homepage
- Fix recommandé (optionnel pour V1) : étendre PageHead avec props `ogTitle` et `ogDesc`

#### P6 — INFO : ContactPage H1 conditionnel
- H1 = `{bien ? 'Demander une présentation.' : 'Contactez Versi Immobilier — Lille et Hauts-de-France.'}`
- Logique : H1 change selon le param `?bien=` en query string
- SEO impact faible (même URL, même canonical), mais Bing indexe le H1 sans param = "Contactez Versi Immobilier — Lille et Hauts-de-France." — acceptable

---

### Score versi-immobilier.fr : **7/10**

- 12/13 pages avec title présent et ≤ 60 chars
- 12/13 pages avec H1 unique et correct
- 12/13 pages avec meta description ≤ 160 chars
- 13/13 pages avec canonical (sauf NotFound)
- 1 BLOQUANT (NotFound sans PageHead), 1 REQUIS (SellPage desc), 2 MINEURS

---

## SITE 2 — versi.fr

### Architecture SEO
- Site one-page React (SPA). **Pas de react-helmet-async.**
- Title, description, canonical, OG : tous définis dans `src/index.html` — statiques, partagés par TOUTES les routes
- MentionsLegales et PolitiqueConfidentialite injectent `noindex, nofollow` via `useEffect` (injection JS dynamique)

---

### Tableau des gates par page

| Page | G-TITLE (≤60) | G-H1 (=1) | G-DESC (≤160) | G-CANONICAL | G-OG | Notes |
|---|---|---|---|---|---|---|
| **HomePage** | PASS [52] — index.html | PASS — Hero.jsx `<h1>` | PASS [158] — index.html | PASS [hardcodé] `https://versi.fr/` | PASS — og:title + og:desc dans index.html | Site one-page, normal |
| **MentionsLegales** | **FAIL** — title = index.html (homepage title) | PASS — H1 présent | **FAIL** — desc = index.html (homepage desc) | **FAIL** — canonical = `https://versi.fr/` (pointe homepage) | **FAIL** — OG = homepage | Route `/mentions-legales` avec title de la homepage = problème |
| **PolitiqueConfidentialite** | **FAIL** — title = index.html (homepage title) | PASS — H1 présent | **FAIL** — desc = index.html (homepage desc) | **FAIL** — canonical = `https://versi.fr/` (pointe homepage) | **FAIL** — OG = homepage | Même problème |
| **NotFound (404)** | **FAIL** — title = index.html | PASS — H1 présent | **FAIL** | **FAIL** — canonical homepage | **FAIL** | Pas de noindex |

---

### Problème structurel versi.fr — CRITIQUE

**versi.fr n'utilise pas react-helmet-async.** Toutes les pages partagent le même title/meta/canonical depuis `index.html`. C'est cohérent UNIQUEMENT si le site est 100% one-page avec une seule URL (`/`). Mais le site dispose de 3 routes supplémentaires (`/mentions-legales`, `/politique-confidentialite`, `/404`) qui :

1. Partagent le title "Versi — Holding immobilière intégrée | Paris & Lille" — Bing voit 4 pages avec le même title
2. Ont un canonical `https://versi.fr/` qui pointe vers la homepage — Bing ignore ces pages ou les traite comme duplicates
3. Pas de noindex sur la 404

**Pour Bing spécifiquement :** Bing est plus strict sur les canonicals incohérents. Un canonical `https://versi.fr/` sur la page `/mentions-legales` est une incohérence que Bing détecte et peut sanctionner. Google le gère avec une logique de fallback, pas Bing.

**Recommandation :** Installer `react-helmet-async` sur versi.fr (même implémentation que versi-immobilier) et créer un `PageHead.jsx` identique. Les pages légales doivent avoir : title propre + noindex + canonical correct (ou canonical absent pour les noindex).

---

### Problèmes identifiés — versi.fr

#### P1 — BLOQUANT : Absence de react-helmet-async
- Toutes les routes `/mentions-legales`, `/politique-confidentialite`, `/404` partagent le title et le canonical de la homepage
- Bing : duplicate titles + canonical incohérent = pages ignorées ou sous-indexées
- Fix : installer react-helmet-async + PageHead.jsx (15 min de travail — copier l'implémentation de versi-immobilier)

#### P2 — BLOQUANT : NotFound sans noindex
- La page 404 est indexable (pas de noindex). Canonical = homepage
- Fix : ajouter noindex via Helmet une fois react-helmet-async installé

#### P3 — INFO : Title versi.fr/index.html légèrement long pour certains SERP
- "Versi — Holding immobilière intégrée | Paris & Lille" = 52 chars — OK ≤ 60
- Bing affiche généralement 60-65 chars — pas de problème

---

### Score versi.fr : **5/10**

- 1/4 pages avec title correct et unique (homepage uniquement)
- 4/4 pages avec H1 présent
- 1/4 pages avec meta description correcte et unique
- 1/4 pages avec canonical correct
- 1/4 pages avec OG complets
- Problème structurel (absence react-helmet-async) impacte 3/4 pages

---

## Synthèse et priorités

### Corrections urgentes (avant soumission Bing Webmaster Tools)

| Priorité | Site | Fichier | Fix |
|---|---|---|---|
| P1 — BLOQUANT | versi.fr | Tous | Installer react-helmet-async + PageHead.jsx par route |
| P1 — BLOQUANT | versi-immobilier.fr | `NotFound.jsx` | Ajouter PageHead avec noindex |
| P2 — REQUIS | versi-immobilier.fr | `SellPage.jsx` | Réduire description à ≤ 160 chars |
| P3 — MINEUR | versi-immobilier.fr | `PropertyDetailPage.jsx` | Réduire slice title à 30 chars |
| P3 — MINEUR | versi-immobilier.fr | `BlogArticlePage.jsx` | Rendre PageHead inconditionnel |
| P4 — OPTIONNEL | versi-immobilier.fr | `PageHead.jsx` | Étendre avec props ogTitle/ogDesc |

### Checklist Bing post-corrections
- [ ] Bing Webmaster Tools : site vérifié (les deux domaines)
- [ ] Sitemap soumis manuellement sur les deux sites
- [ ] IndexNow configuré (endpoint ou plugin) — notification instantanée à Bing des nouvelles pages blog
- [ ] Vérifier robots.txt : pas de blocage Bingbot

---

**Handoff → @fullstack**
- Fichiers produits : `docs/reviews/seo-bing-audit-s8.md`
- Corrections à implémenter (par ordre de priorité) :
  1. `src/` (versi.fr) : installer react-helmet-async, créer `PageHead.jsx`, mettre à jour `main.jsx` avec `HelmetProvider`, ajouter PageHead dans `MentionsLegales.jsx`, `PolitiqueConfidentialite.jsx`, `NotFound.jsx`
  2. `versi-immobilier/src/pages/NotFound.jsx` : ajouter `<PageHead title="Page introuvable — Versi Immobilier" description="La page demandée n'existe pas." noindex />`
  3. `versi-immobilier/src/pages/SellPage.jsx` : réduire description à 140 chars max
  4. `versi-immobilier/src/pages/PropertyDetailPage.jsx` : `property.title.slice(0,30)` (ligne 155)
  5. `versi-immobilier/src/pages/BlogArticlePage.jsx` : rendre PageHead inconditionnel avec titre de fallback
