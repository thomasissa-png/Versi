# Stratégie SEO — Versi

> Produit par @seo | Date : 2026-04-08
> Références : project-context.md, docs/strategy/brand-platform.md, docs/copy/landing-page-copy.md, src/index.html
> Stack : React (Vite) — SPA client-side routing, site statique

---

## 1. Diagnostic de la situation SEO de Versi

### 1.1 Contexte de départ

Versi part de zéro : domaine versi.fr non enregistré, aucun historique d'indexation, aucune autorité de domaine. C'est à la fois un handicap (pas d'historique) et un avantage (pas de dette technique, pas de redirections 301 à gérer).

**Priorité SEO pour Versi** : le site n'est pas un moteur d'acquisition de volume. Laurent (investisseur 48 ans) ne tape pas "holding immobilière" sur Google pour trouver Versi — il arrive par le réseau, LinkedIn, bouche-à-oreille. Le rôle du SEO ici est de **validation de crédibilité** : quand Laurent reçoit une recommandation ou un email de Versi, il googlise le nom. Versi doit apparaître en position 1 sur sa marque, et afficher des méta-données et structured data qui renforcent immédiatement la confiance institutionnelle.

**Objectif SEO réaliste à 6 mois** :
- Position 1 sur "Versi" + "Versi immobilier" + "Versi holding" (branded)
- Présence dans les résultats sur 3-5 mots-clés longue traîne sectoriels (volume faible, intention forte)
- Knowledge Panel Google déclenché par Organization schema

### 1.2 Contrainte structurelle : React SPA et crawl

Versi est une SPA React/Vite avec client-side routing (React Router). **Problème** : Googlebot crawle l'HTML initial, qui ne contient qu'un `<div id="root"></div>`. Le contenu et les meta tags ne sont injectés qu'après exécution du JavaScript.

Google déclare crawler les SPA mais le rendering est différé (parfois 24-48h) et moins fiable qu'un HTML statique. Bing/Bingbot est encore moins performant sur les SPA JS — le contenu critique peut ne jamais être crawlé.

**Solution recommandée pour Versi : pré-rendu statique (SSG) via vite-plugin-ssr ou react-snap.**

---

## 2. Architecture SEO technique

### 2.1 Solution pré-rendu (priorité absolue)

**Option A — vite-plugin-prerender (recommandé pour Versi)**

Génère des snapshots HTML statiques au build pour chaque route. Bing et Googlebot reçoivent un HTML complet avec contenu, H1, meta tags et JSON-LD embarqués.

```
npm install vite-plugin-prerender --save-dev
```

Configuration `vite.config.js` :
```js
import prerender from 'vite-plugin-prerender'
export default defineConfig({
  plugins: [
    react(),
    prerender({
      routes: ['/', '/mentions-legales', '/politique-de-confidentialite'],
      renderer: '@prerenderer/renderer-puppeteer'
    })
  ]
})
```

Résultat : `dist/index.html` contient le HTML complet de la HomePage (Hero, Mission, Activités, Équipe...) avec tous les meta tags. Googlebot et Bingbot reçoivent cet HTML — pas de JavaScript à exécuter.

**Option B — Migration Next.js (non recommandée pour Versi V1)**
Surcoût de migration injustifié pour un site one-page sans blog ni contenu dynamique. À envisager uniquement si Versi ajoute un blog ou des pages d'entités dynamiques.

### 2.2 react-helmet-async (gestion des meta tags)

Installer `react-helmet-async` pour injecter dynamiquement les meta tags par page (utile pour les pages /mentions-legales et /politique-de-confidentialite).

```
npm install react-helmet-async
```

Dans `main.jsx` : envelopper `<App>` dans `<HelmetProvider>`.
Dans chaque page : `<Helmet><title>...</title><meta name="description" content="..." /></Helmet>`

### 2.3 Structure Hn du one-page

Le one-page Versi doit respecter une hiérarchie Hn stricte. Une seule balise H1 sur la page entière.

| Section | Balise | Contenu recommandé |
|---|---|---|
| Hero | H1 | "Holding immobilière intégrée — Quatre métiers. Un cycle maîtrisé." |
| Mission | H2 | "Un opérateur immobilier intégré. Quatre métiers. Un cycle." |
| Activités | H2 | "Nos activités — Marchand de biens, investissement, foncière, finance" |
| Versi Développement | H3 | "Versi Développement — Marchand de biens" |
| Versi Invest | H3 | "Versi Invest — Structuration d'investissement immobilier" |
| Versi Capital | H3 | "Versi Capital — Foncière" |
| Versi Finance | H3 | "Versi Finance — Ingénierie financière immobilière" |
| Approche | H2 | "Notre approche — Sourcer, analyser, transformer, opérer" |
| Implantation | H2 | "Implantation — Paris, Lille et métropoles françaises" |
| Équipe | H2 | "L'équipe Versi — Trois co-fondateurs" |
| Contact | H2 | "Contacter Versi" |

**Signal Bing** : le mot-clé exact "holding immobilière intégrée" doit figurer dans le H1 ET dans le premier paragraphe visible. Bing donne un poids supérieur aux exact-match dans ces positions.

### 2.4 Balises meta optimisées

**Title tag actuel** (dans index.html) :
`Versi — Holding immobilière intégrée | Paris & Lille`

Analyse : correct, mais peut être amélioré pour la longue traîne et le signal Bing exact-match.

**Title tag recommandé** :
`Versi — Holding immobilière intégrée | Marchand de biens, Investissement, Foncière`

Justification : intègre 3 mots-clés de sous-activités à intention directe. Sous la limite 60 caractères (57 caractères). Bing valorise les keywords dans le title.

**Meta description actuelle** :
`Versi acquiert, transforme et structure des actifs immobiliers en France. Quatre métiers intégrés, un cycle maîtrisé en interne. Co-investissement et mandats.`

**Meta description recommandée** :
`Versi est une holding immobilière intégrée opérant en France — marchand de biens, foncière, structuration d'investissement et ingénierie financière. Paris et Lille.`

Justification : reformulation qui intègre les 4 mots-clés de métiers, cite la localisation, max 155 caractères.

### 2.5 OG tags à compléter dans index.html

Les balises OG existantes sont correctes. Ajouter :
```html
<meta property="og:image" content="https://versi.fr/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Versi — Holding immobilière intégrée" />
<meta name="twitter:description" content="Versi opère l'ensemble du cycle immobilier en France — 4 métiers intégrés, équipe fondatrice identifiée." />
```

L'image OG doit être créée : 1200x630px, identité visuelle Versi, tagline "Quatre métiers. Un cycle maîtrisé."

### 2.6 Canonical

Site one-page : une seule page principale. La balise canonical doit pointer vers elle-même sur chaque route.

Dans index.html (statique) :
```html
<link rel="canonical" href="https://versi.fr" />
```

Pour `/mentions-legales` et `/politique-de-confidentialite` : canonical vers leur propre URL (via react-helmet-async). Ces pages doivent avoir `<meta name="robots" content="noindex, follow" />` — elles n'ont aucune valeur SEO et ne doivent pas diluer le PageRank.

### 2.7 sitemap.xml

Créer `public/sitemap.xml` :
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://versi.fr/</loc>
    <lastmod>2026-04-08</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

Note Bing : la date `lastmod` doit être stable et réelle. Ne pas la régénérer automatiquement à chaque build (signal de spam pour Bing). La mettre à jour uniquement lors d'une modification substantielle du contenu.

Seule la page principale est incluse. Les pages légales sont exclues (noindex).

### 2.8 robots.txt

Créer `public/robots.txt` :
```
User-agent: *
Allow: /
Disallow: /mentions-legales
Disallow: /politique-de-confidentialite

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# Autoriser les crawlers IA — ne pas bloquer (signal GEO positif)
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: https://versi.fr/sitemap.xml
```

Note : les pages légales sont bloquées dans robots.txt ET marquées noindex — double protection contre leur indexation.

---

## 3. Schema.org JSON-LD — Organization + Fondateurs

Le JSON-LD doit être injecté dans le `<head>` du HTML rendu (via react-helmet-async ou directement dans le pré-rendu). Il déclenche le Knowledge Panel Google et renforce la crédibilité pour Bing.

### Schema Organization (principal)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Versi",
  "legalName": "Versi",
  "url": "https://versi.fr",
  "logo": "https://versi.fr/favicon.svg",
  "description": "Holding immobilière intégrée opérant en France — acquisition, transformation, détention et structuration financière d'actifs immobiliers.",
  "foundingDate": "2026",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Paris",
    "addressCountry": "FR"
  },
  "areaServed": {
    "@type": "Country",
    "name": "France"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "contact@versi.fr",
    "contactType": "customer support",
    "availableLanguage": "French"
  },
  "sameAs": [],
  "founder": [
    {
      "@type": "Person",
      "name": "Thomas Issa",
      "jobTitle": "Co-fondateur",
      "worksFor": { "@type": "Organization", "name": "Versi" }
    },
    {
      "@type": "Person",
      "name": "Maxime Lemoine",
      "jobTitle": "Co-fondateur",
      "worksFor": { "@type": "Organization", "name": "Versi" }
    },
    {
      "@type": "Person",
      "name": "Carl Standertskjold-Nordenstam",
      "jobTitle": "Co-fondateur",
      "worksFor": { "@type": "Organization", "name": "Versi" }
    }
  ]
}
```

Compléter `sameAs` dès que la page LinkedIn entreprise Versi est créée : `"sameAs": ["https://www.linkedin.com/company/versi"]`

### Schema LocalBusiness (complémentaire)

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Versi",
  "url": "https://versi.fr",
  "email": "contact@versi.fr",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Paris",
    "addressRegion": "Île-de-France",
    "addressCountry": "FR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 48.8566,
    "longitude": 2.3522
  },
  "areaServed": ["Paris", "Lille", "France"],
  "priceRange": "Sur mesure"
}
```

---

## 4. Checklist multi-moteurs (Google + Bing)

| Item | Statut | Action |
|---|---|---|
| robots.txt avec directives par bot | A faire | Créer `public/robots.txt` |
| Canonical explicite et absolu | A faire | Ajouter `<link rel="canonical">` dans index.html et via Helmet |
| sitemap.xml avec lastmod stable | A faire | Créer `public/sitemap.xml` |
| noindex sur pages légales | A faire | Via react-helmet-async dans MentionsLegales.jsx et PolitiqueConfidentialite.jsx |
| Schema Organization JSON-LD | A faire | Via react-helmet-async dans HomePage.jsx |
| Pré-rendu HTML (crawl JS) | A faire | Installer vite-plugin-prerender |
| Mot-clé exact dans H1 + premier §  | A faire | Vérifier Hero.jsx — "holding immobilière intégrée" en H1 |
| OG image 1200x630 | A faire | Créer og-image.jpg et référencer dans index.html |
| IndexNow (Bing natif) | Recommandé | Endpoint ou plugin — notifier Bing à chaque déploiement |
| Bing Webmaster Tools | A faire post-launch | Soumettre le sitemap manuellement après go-live |
| Google Search Console | A faire post-launch | Vérifier propriété, soumettre sitemap |
| AI crawlers non bloqués | A faire | robots.txt — GPTBot, ClaudeBot, PerplexityBot autorisés |
| llms.txt | Recommandé | Créer `public/llms.txt` — coordonner avec @geo |

---

## 5. Signaux E-E-A-T pour Versi

Versi opère dans un secteur à haute confiance (immobilier, argent). Les signaux E-E-A-T sont critiques pour la crédibilité Google.

- **Experience** : chiffres factuels dans la section Mission (35+ actifs, 3 immeubles) — ne jamais supprimer, ils ancrent l'expérience réelle
- **Expertise** : schema Person pour les 3 fondateurs, bios avec parcours (Sony, Algolia, Inbolt, TEOS)
- **Authoritativeness** : page entreprise LinkedIn dès que possible (sameAs dans Organization schema). Backlinks futurs depuis presse immobilière (Le Monde Immo, Business Immo, Capital)
- **Trustworthiness** : mentions légales accessibles, email contact@versi.fr affiché en clair, HTTPS obligatoire, Plausible cookieless (conforme RGPD = signal de confiance)

---

## 6. Recommandations post-launch

### Bing Webmaster Tools (priorité haute)
Versi n'a aucun historique de crawl Bing. Bing crawle moins fréquemment que Google. Après go-live :
1. Vérifier la propriété sur Bing Webmaster Tools (méta-tag ou DNS)
2. Soumettre le sitemap manuellement
3. Activer IndexNow pour les déploiements futurs

### Signaux sociaux Bing
Bing utilise officiellement les signaux sociaux comme facteur de ranking. Dès que la page LinkedIn entreprise Versi est créée, chaque annonce (lancement site, opération, équipe) génère des signaux positifs pour Bing. Coordonner avec @social.

### Pas de blog en V1
Un blog est inutile pour Versi V1. Le persona Laurent ne cherche pas de contenu éditorial — il évalue une crédibilité. Ajouter un blog uniquement si les sites entités (versi-developpement.fr, versi-invest.fr) sont lancés avec des intentions de recherche spécifiques à couvrir.

---

**Handoff → @fullstack**
- Fichiers à créer : `public/robots.txt`, `public/sitemap.xml`, `public/og-image.jpg` (1200x630)
- Packages à installer : `react-helmet-async`, `vite-plugin-prerender` (+ `@prerenderer/renderer-puppeteer`)
- Modifications `vite.config.js` : ajouter plugin prerender avec routes `['/', '/mentions-legales', '/politique-de-confidentialite']`
- Modifications `main.jsx` : envelopper App dans `<HelmetProvider>`
- JSON-LD Organization : injecter dans `<Helmet>` de `HomePage.jsx`
- Balises noindex : ajouter `<Helmet>` dans `MentionsLegales.jsx` et `PolitiqueConfidentialite.jsx`
- Balise canonical : ajouter dans `index.html` (page principale) + via Helmet pour les autres routes
- H1 Hero : vérifier que `Hero.jsx` rend bien un `<h1>` contenant "holding immobilière intégrée"
- Décisions prises : pré-rendu statique via vite-plugin-prerender (vs migration Next.js écartée — surcoût injustifié pour V1 one-page)
- Points d'attention : ne pas régénérer le lastmod du sitemap à chaque build (signal spam Bing) — mettre à jour manuellement à chaque modification substantielle
