# Audit SEO final — versi.fr & versi-immobilier.fr

**Date :** 2026-04-11
**Agent :** @seo
**Périmètre :** 15 points SEO × 2 sites

---

## versi.fr — Note : 7.5/10

### Détail par point

| # | Point | Statut | Détail |
|---|---|---|---|
| 1 | Title tag | ✅ | "Versi — Holding immobilière intégrée | Paris & Lille" — 53 chars, mot-clé en tête |
| 2 | Meta description | ✅ | 157 chars, mentionne les 4 métiers + CTA implicite (co-investissement, mandats) |
| 3 | H1 unique | ✅ | "Quatre métiers. Un cycle maîtrisé." — présent dans Hero.jsx, une seule occurrence |
| 4 | Schema.org JSON-LD | ✅ | Organization + Corporation, WebSite, FAQPage — tous présents, @id cross-référencé avec versi-immobilier via parentOrganization |
| 5 | Canonical | ✅ | `<link rel="canonical" href="https://versi.fr/" />` — absolu, cohérent |
| 6 | robots.txt | ⚠️ | Présent, sitemap déclaré. **Problème :** `Disallow: /mentions-legales` et `Disallow: /politique-de-confidentialite` — ces pages sont aussi dans le sitemap.xml. Incohérence robots/sitemap. Par ailleurs : zéro directive spécifique GPTBot/ClaudeBot/Bingbot |
| 7 | sitemap.xml | ⚠️ | 3 URLs présentes. **Problème critique Bing :** `lastmod` figé à `2026-04-08` pour toutes les URLs — acceptable si stable. **Problème majeur :** `/mentions-legales` et `/politique-de-confidentialite` sont dans le sitemap mais bloquées dans robots.txt — contradiction directe |
| 8 | Open Graph | ⚠️ | og:title, og:description, og:type, og:url, og:locale, og:site_name présents. **Manquant : `og:image`** — sans image OG, les partages sur LinkedIn/X n'affichent pas de visuel. Pénalité significative pour la visibilité sociale |
| 9 | Alt text images | ✅ | Team.jsx : alt dynamique `"[Prénom Nom], Co-fondateur Versi"` — bien formulé avec contexte |
| 10 | Maillage interne | ⚠️ | Footer.jsx : lien vers `versi-immobilier.fr` présent. **Manquant :** pas de lien retour depuis versi-immobilier vers versi.fr dans la nav principale (seulement dans le footer). Le maillage inter-sites est asymétrique |
| 11 | Performance | ✅ | `preconnect` sur fonts.cdnfonts.com, fonts.googleapis.com, fonts.gstatic.com. Script Umami en `defer`. Chargement de police optimisé |
| 12 | Mobile (viewport) | ✅ | `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` présent |
| 13 | Umami Analytics | ✅ | Script `defer`, website-id `6e0f3a96-c528-4113-bc2a-c1548ab0c76a`, cookieless |
| 14 | Favicons | ✅ | favicon.svg, favicon-32x32.png, favicon-16x16.png, apple-touch-icon.png, site.webmanifest — complet |
| 15 | Headers serveur | ❌ | versi.fr est un site statique (Vite + Netlify/_redirects). **Aucun fichier `_headers` Netlify détecté** — X-Frame-Options, Content-Security-Policy, Referrer-Policy non définis côté serveur. Seul le front est servi, sans headers de sécurité |

### Points forts versi.fr

- Schema.org de qualité : triple JSON-LD (Organization+Corporation, WebSite, FAQPage) avec @id cohérents et cross-référence vers versi-immobilier via parentOrganization
- Meta description précise et différenciante (4 métiers nommés, co-investissement, mandats)
- llms.txt complet et bien structuré — bon signal GEO
- Title tag respecte la contrainte <60 chars avec mot-clé géographique

### Corrections pour 10/10

1. **[P0] robots.txt vs sitemap — versi.fr** : supprimer `/mentions-legales` et `/politique-de-confidentialite` du sitemap.xml, OU retirer les `Disallow` du robots.txt. La cohérence est obligatoire pour Bing. Recommandation : retirer du sitemap (ces pages ont priorité 0.2, aucune valeur SEO).
   - Fichier : `/home/user/Versi/src/public/robots.txt` + `/home/user/Versi/src/public/sitemap.xml`

2. **[P1] og:image manquante** : ajouter `<meta property="og:image" content="https://versi.fr/og-image.jpg" />` dans `index.html`. Créer une image 1200×630px (logo Versi sur fond sombre). Sans og:image, les partages sociaux n'ont pas de visuel — signal négatif pour les backlinks sociaux Bing.
   - Fichier : `/home/user/Versi/src/index.html` (après ligne 16)

3. **[P1] Headers serveur Netlify** : créer `/home/user/Versi/src/public/_headers` avec :
   ```
   /*
     X-Frame-Options: DENY
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
     Content-Security-Policy: default-src 'self'; script-src 'self' https://cloud.umami.is; style-src 'self' 'unsafe-inline' https://fonts.cdnfonts.com https://fonts.googleapis.com; font-src 'self' https://fonts.cdnfonts.com https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none';
   ```

4. **[P2] robots.txt — directives bots IA** : ajouter directives explicites GPTBot, ClaudeBot, PerplexityBot (Allow: /) en miroir de versi-immobilier. Cohérence inter-sites.
   - Fichier : `/home/user/Versi/src/public/robots.txt`

5. **[P2] Maillage inter-sites** : versi-immobilier a 4 points de lien retour vers versi.fr (footer ×2, approche, contact). versi.fr ne pointe que via le footer. Ajouter dans la nav de versi.fr un lien "Versi Immobilier" ou dans la section Activités, un lien `href="https://versi-immobilier.fr"` ancré sur le nom de l'entité.

---

## versi-immobilier.fr — Note : 8/10

### Détail par point

| # | Point | Statut | Détail |
|---|---|---|---|
| 1 | Title tag | ✅ | "Versi Immobilier — Marchand de biens | Acquisition, transformation, revente" — 74 chars. **Attention :** légèrement au-dessus de 60 chars (Google tronque vers 60). Mot-clé "marchand de biens" en position 2, bien placé pour Bing |
| 2 | Meta description | ✅ | 137 chars, CTA fort ("Offre ferme sans condition suspensive. Décision en 7 jours."), différenciante |
| 3 | H1 par page | ✅ | HomePage : "Peu de biens. Pas d'approximation." (Hero.jsx). SellPage : "Vous cédez un bien. Offre ferme en 7 jours." PropertiesPage : "Les biens disponibles." ApprochePage : "Comment Versi travaille." ContactPage : "Écrivez-nous." RealisationsPage : "Réalisations." InvestirPage : "Investir avec un opérateur intégré." — H1 uniques par page |
| 4 | Schema.org JSON-LD | ⚠️ | Organization + RealEstateAgent, WebSite, FAQPage (5 Q&A) présents. **Manquant :** pas de schema `Product` sur les fiches bien (PropertyDetailPage), pas de schema `BreadcrumbList`, pas de schema `LocalBusiness` avec adresse physique. Le schema RealEstateAgent sans adresse est incomplet pour le SEO local |
| 5 | Canonical | ✅ | `<link rel="canonical" href="https://versi-immobilier.fr/" />` — absolu. **Limite :** canonical uniquement sur index.html, pas géré dynamiquement par page (SPA React). Les pages secondaires n'ont pas de canonical explicite — risque pour Bing |
| 6 | robots.txt | ✅ | Très bien : `/api/` bloqué, directives GPTBot/Google-Extended/ClaudeBot/Amazonbot explicites. Sitemap déclaré. **Manquant :** PerplexityBot (à ajouter) et Bingbot (implicitement inclus dans `User-agent: *` mais absence de directive dédiée) |
| 7 | sitemap.xml | ⚠️ | 9 URLs. **Problème critique Bing :** absence totale de `<lastmod>` sur toutes les URLs. Pour Bing, un sitemap sans lastmod est traité comme signal de faible qualité. **Autre problème :** `/politique-de-confidentialite` dans le sitemap (priorité 0.3) sans valeur SEO. Les pages dynamiques `/nos-biens/:id` et `/realisations/:id` sont absentes — Bing ne les découvrira pas sans IndexNow ou crawl manuel |
| 8 | Open Graph | ⚠️ | og:title, og:description, og:type, og:url, og:locale, og:site_name présents. **Manquant : `og:image`** — identique au problème versi.fr. Critiques pour le partage et les signaux sociaux Bing |
| 9 | Alt text images | ✅ | ApprochePage : `"[Nom], Co-fondateur Versi Immobilier"`. PropertyDetailPage : alt dynamique depuis les données ou fallback sur le titre. TeamTeaser : alt nommé. Admin : alt sur filename (acceptable, hors SEO public) |
| 10 | Maillage interne | ✅ | Maillage riche : footer 4 colonnes (acquéreurs + vendeurs), liens contextuels dans les pages (SellPage → /realisations, /contact ; PropertiesPage → /contact ; ApprochePage → /vendre, /contact). Liens vers versi.fr présents (footer, approche, contact) |
| 11 | Performance | ✅ | `preconnect` présents pour fonts.cdnfonts.com et Google Fonts. Umami en `defer`. Images team avec `loading="lazy"` et dimensions explicites (width/height). |
| 12 | Mobile (viewport) | ✅ | `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` présent |
| 13 | Umami Analytics | ✅ | Script `defer`, website-id `0cb4e7ac-e1aa-4600-aaf1-0d90023b1f9b`, cookieless |
| 14 | Favicons | ✅ | favicon.svg, favicon-32x32.png, favicon-16x16.png, apple-touch-icon.png, site.webmanifest — complet. site.webmanifest inclut name "Versi Immobilier" et short_name "Versi Immo" |
| 15 | Headers serveur | ✅ | server.js ligne 26-31 : X-Content-Type-Options, X-Frame-Options (DENY), Referrer-Policy, X-XSS-Protection, Content-Security-Policy tous définis. **Réserve :** CSP `img-src 'self' data:` bloque les images externes (photos biens depuis S3/CDN si applicable) — à vérifier en production |

### Points forts versi-immobilier.fr

- Headers serveur complets (X-Frame-Options, CSP, Referrer-Policy) — le seul des deux sites à avoir une sécurité transport en place
- H1 uniques et intentionnels sur toutes les pages — aucune duplication détectée
- robots.txt multi-bots le plus complet des deux sites
- Maillage interne dense et bidirectionnel avec versi.fr
- llms.txt très complet avec FAQ, chiffres clés, process — excellent signal GEO
- Footer 4 colonnes avec navigation segmentée acquéreurs/vendeurs — bon signal de structure pour Google

### Corrections pour 10/10

1. **[P0] sitemap.xml — lastmod manquant** : ajouter `<lastmod>` sur chaque URL avec la date de dernière modification réelle du contenu (pas la date de build). Pour Bing, c'est bloquant pour l'évaluation de fraîcheur.
   - Fichier : `/home/user/Versi/versi-immobilier/public/sitemap.xml`
   - Correction : ajouter `<lastmod>2026-04-08</lastmod>` sur les URLs statiques, date dynamique pour les URLs de biens via un script de génération

2. **[P0] og:image manquante** : ajouter `<meta property="og:image" content="https://versi-immobilier.fr/og-image.jpg" />`. Image 1200×630px recommandée (photo d'une réalisation ou visuel de marque).
   - Fichier : `/home/user/Versi/versi-immobilier/index.html` (après ligne 16)

3. **[P1] Title tag — longueur** : "Versi Immobilier — Marchand de biens | Acquisition, transformation, revente" = 74 chars. Google tronque à ~60. Proposer : "Versi Immobilier — Marchand de biens Paris & Lille" (51 chars) ou "Versi Immobilier — Achat immobilier direct en 7 jours" (53 chars).
   - Fichier : `/home/user/Versi/versi-immobilier/index.html` ligne 7

4. **[P1] Canonicals par page (SPA)** : les pages secondaires (SellPage, PropertiesPage, etc.) n'ont pas de canonical dynamique. En SPA React, Googlebot gère bien le JS mais Bingbot moins. Implémenter `react-helmet-async` ou un composant `<Head>` pour injecter canonical + title + meta description par page. Priorité : pages /vendre et /nos-biens qui ciblent des intentions transactionnelles.

5. **[P1] Schema.org manquants** :
   - Ajouter `BreadcrumbList` sur les pages secondaires (ex: Accueil > Nos biens > [titre bien])
   - Ajouter schema `LocalBusiness` avec adresse (Paris + Hauts-de-France) sur index.html pour le SEO local
   - PropertyDetailPage : ajouter schema `Product` ou `RealEstateListing` sur les fiches biens (prix, statut, localisation)
   - Fichiers : `/home/user/Versi/versi-immobilier/index.html` et `PropertyDetailPage.jsx`

6. **[P2] URLs dynamiques dans le sitemap** : les pages `/nos-biens/:id` et `/realisations/:id` sont absentes du sitemap. Générer un sitemap dynamique côté server.js qui liste toutes les fiches biens actives — ou implémenter IndexNow pour notifier Bing à chaque création/modification de fiche.

7. **[P2] CSP img-src** : server.js ligne 30 — `img-src 'self' data:` bloque les images hébergées sur un domaine externe. Si les photos de biens sont servies depuis une URL externe (CDN, Supabase Storage, etc.), ajouter ce domaine à la CSP. À vérifier en production.
   - Fichier : `/home/user/Versi/versi-immobilier/server.js` ligne 30

8. **[P2] PerplexityBot dans robots.txt** : ajouter `User-agent: PerplexityBot` / `Allow: /` en cohérence avec les autres bots IA déclarés.
   - Fichier : `/home/user/Versi/versi-immobilier/public/robots.txt`

---

## Synthèse comparative

| Point | versi.fr | versi-immobilier.fr |
|---|---|---|
| Title tag | ✅ | ⚠️ (74 chars) |
| Meta description | ✅ | ✅ |
| H1 unique | ✅ | ✅ |
| Schema.org | ✅ | ⚠️ (incomplet) |
| Canonical | ✅ | ⚠️ (SPA, pas par page) |
| robots.txt | ⚠️ (incohérence sitemap) | ✅ |
| sitemap.xml | ⚠️ (incohérence robots) | ⚠️ (pas de lastmod) |
| Open Graph | ⚠️ (og:image manquant) | ⚠️ (og:image manquant) |
| Alt text | ✅ | ✅ |
| Maillage interne | ⚠️ (asymétrique) | ✅ |
| Performance | ✅ | ✅ |
| Mobile viewport | ✅ | ✅ |
| Umami Analytics | ✅ | ✅ |
| Favicons | ✅ | ✅ |
| Headers serveur | ❌ (absent Netlify) | ✅ |

**versi.fr : 7.5/10** — Base solide, 3 corrections bloquantes (robots/sitemap incohérence, og:image, headers Netlify)
**versi-immobilier.fr : 8/10** — Meilleur des deux sur la technique serveur, 2 corrections bloquantes (og:image, lastmod sitemap) + 1 importante (title length)

### Point commun critique : og:image

Les deux sites partagent le même angle mort. L'absence d'og:image est la correction la plus rapide et la plus impactante — elle affecte tous les partages sociaux (signal de ranking direct pour Bing) et les previews dans les outils de partage.

### IndexNow — recommandation spécifique versi-immobilier.fr

versi-immobilier.fr est un site avec contenu dynamique (biens, réalisations créés/modifiés régulièrement). Bing crawle moins fréquemment que Google. Sans IndexNow, les nouvelles fiches biens peuvent mettre plusieurs semaines à être indexées par Bing. Implémenter un appel IndexNow depuis server.js à chaque création ou modification de bien/réalisation :

```javascript
// Endpoint à ajouter dans server.js
async function notifyIndexNow(url) {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return;
  await fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${key}`);
}
// Appeler après POST /api/biens et PUT /api/biens/:id
```

---

**Handoff → @fullstack**
- Fichiers produits : `docs/reviews/seo-final-audit.md`
- Décisions prises : 7.5/10 pour versi.fr, 8/10 pour versi-immobilier.fr
- Corrections P0 à implémenter :
  1. `og:image` sur les deux `index.html` (versi.fr + versi-immobilier) — 10 minutes de travail
  2. `_headers` Netlify pour versi.fr (`/home/user/Versi/src/public/_headers`) — nouveau fichier
  3. Cohérence robots.txt/sitemap.xml versi.fr — retirer les pages légales du sitemap
  4. `lastmod` dans le sitemap versi-immobilier (`/home/user/Versi/versi-immobilier/public/sitemap.xml`)
- Corrections P1 à implémenter :
  5. Title tag versi-immobilier raccourcir à <60 chars (`index.html` ligne 7)
  6. Canonicals dynamiques par page via `react-helmet-async` (pages /vendre, /nos-biens prioritaires)
  7. Schema LocalBusiness + BreadcrumbList dans `index.html` versi-immobilier
- Points d'attention : la CSP img-src versi-immobilier (`server.js` ligne 30) doit être validée en production selon l'hébergement des photos de biens
