# Audit SEO final s8 — Versi Immobilier

**Date** : 2026-04-14
**Auditeur** : @seo
**Référence** : suite de `docs/reviews/seo-reaudit-s8.md` (score intermédiaire : 7,5/10)
**Déjà PASS** : PageHead 12 pages, prerender 9 routes, BuyerFAQ.jsx, RealEstateListing schema, sitemap corrigé, llms.txt

---

## Tableau synthétique par page

| Page | Note /10 | Delta vs re-audit | Points forts | Points faibles restants | Action pour 10/10 |
|---|---|---|---|---|---|
| `/` | 8,5/10 | +0,5 | FAQ dupliquée supprimée de index.html — conflit JSON-LD résolu. Organization enrichi : foundingYear, numberOfEmployees, sameAs. | Meta description sans chiffre différenciateur ("21 appartements", "3,2M€"). BreadcrumbList absent. | Enrichir description : "21 appartements rénovés vendus à Lille dès 2022. Zéro frais d'agence, diagnostics inclus. Versi Immobilier — 3,2M€ de volume." |
| `/nos-biens` | 9/10 | +0,5 | H1 + Title alignés intention transactionnelle acquéreur. Texte statique enrichi ("21 appartements rénovés et vendus en direct depuis 2022", garantie décennale, fourchette de prix dynamique). États UI complets. | Meta description ne reprend pas la fourchette de prix calculée dynamiquement. Pas d'ItemList JSON-LD. | Minor : passer priceRange.min/max dans la description via PageHead dynamique. ItemList JSON-LD sur 3 premiers biens. |
| `/vendre` | 9/10 | +1,5 | FAQPage JSON-LD vendeur ajouté via useEffect — 5 questions rich snippets activés. FAQ Q/R de très haute qualité E-E-A-T. Title transactionnel propre. | Title sans géolocalisation ("Lille"). Description fonctionnelle mais sans déclencheur émotionnel vs agences. | Ajouter "à Lille" dans le title. Enrichir description : "Offre ferme en 7 jours, sans condition suspensive. Pas de mandat. Versi Immobilier rachète votre bien à Lille et en Île-de-France." |
| `/realisations` | 9/10 | +1 | H1 enrichi avec géolocalisation : "Rénovations immobilières — Lille et Hauts-de-France." Title aligné. Stats vérifiables (5 rénovations, 3,2M€). CTA vendeur en bandeau. | Pas de structured data ItemList ou RealEstateProject sur la page listing. Texte introductif court (2 lignes) — peu de contenu textuel crawlable hors H1. | Ajouter 1 paragraphe descriptif (3-4 lignes) sous les stats : processus de rénovation, critères, zone. Ajouter ItemList JSON-LD sur les projets terminés. |
| `/notre-approche` | 9/10 | +1 | JSON-LD Person (3 fondateurs) avec sameAs LinkedIn — signal E-E-A-T fort. Photos identifiées, parcours détaillés vérifiables. Title + H1 cohérents. | Title générique sans mot-clé SEO : "Comment Versi Immobilier travaille — Méthode et équipe" n'inclut pas "marchand de biens Lille". H1 "Comment Versi travaille." sans localisation. | Enrichir title : "Marchand de biens à Lille — Méthode et équipe | Versi Immobilier". H1 : "Comment Versi Immobilier travaille." (nom complet). |
| `/blog` | 9/10 | +1 | H1 enrichi avec intention et géolocalisation : "Blog immobilier — Achat, rénovation, marché à Lille." Title aligné. Filtres par catégorie acquéreur bien structurés. CTA acquéreur en bandeau. | Pas de BreadcrumbList JSON-LD. Pas de description meta qui mentionne la fréquence ou le nombre d'articles. | Ajouter BreadcrumbList. Enrichir description : "X guides immobiliers publiés par l'équipe Versi — marché Lille, financement primo-accédant, garanties marchand de biens." |
| `/contact` | 8,5/10 | +1 | LocalBusiness JSON-LD ajouté avec address, areaServed (Lille + Hauts-de-France), sameAs LinkedIn fondateurs. Téléphone cliquable href tel:. Email cliquable. | LocalBusiness manque : `telephone`, `openingHours`, `@id` pour lier à l'Organization. H1 dynamique ("Écrivez-nous." / "Demander une présentation.") — le fallback "Écrivez-nous." est trop générique pour le SEO. | Ajouter `telephone` et `@id` dans le LocalBusiness. Fixer H1 à "Contactez Versi Immobilier — Lille et Hauts-de-France" (non dynamique pour SEO). |
| `/investir` | 7,5/10 | 0 | Non modifié depuis le re-audit. | Score identique : titre et H1 non audités dans cette passe. Non modifié. | À auditer en session dédiée si la page existe et est indexée. |
| `/nos-biens/:id` | 8/10 | 0 | Déjà PASS sur RealEstateListing schema (re-audit). CTA acquéreur principal déjà présent sur la page (→ /nos-biens). | Non modifié dans cette passe. Canonical dynamique dépend du prerender. | Déjà traité au re-audit. Aucune régression détectée. |
| `/blog/:slug` | 8,5/10 | +0,5 | URL hardcodée `https://versi-immobilier.fr` dans BlogPosting JSON-LD — fix window.location.origin validé. BlogPosting complet : headline, author (Organization + 3 Person), publisher, datePublished, dateModified. | Author schema : 3 Person sans `sameAs` LinkedIn dans le BlogPosting (présents dans ApprochePage mais pas reliés ici). Pas de `wordCount` ni `articleSection`. | Ajouter `sameAs` aux Person dans le BlogPosting author array. Minor : `wordCount` dynamique sur article.content. |
| `/realisations/:id` | 8,5/10 | +0,5 | CTA acquéreur principal ajouté : "Voir les biens disponibles" → /nos-biens en position primaire. CTA vendeur secondaire. Galerie avant/après avec aria. | Pas de structured data RealEstateProject ou ItemPage sur la page de détail réalisation. Title dynamique générique : "[titre] — Réalisation Versi Immobilier" sans géolocalisation. | Ajouter JSON-LD `ItemPage` ou schéma custom avec location. Enrichir title : "[titre] — Rénovation à [location] | Versi Immobilier". |
| `/mentions-legales` | 10/10 | +1 | Siège social complet (54 rue Henri Barbusse, 92000 Nanterre). Hébergeur complet (Replit, Inc. San Francisco). SIREN présent. Politique de confidentialité avec base légale RGPD explicite (art. 6.1.f). Zéro placeholder résiduel. | Aucun point faible SEO-bloquant. Page noindex recommandée (vérifier robots/PageHead). | Vérifier que noindex est bien posé sur cette page via PageHead ou robots.txt. |

---

## Score global /10

**8,5/10** (vs 7,5/10 au re-audit — progression +1 point)

Répartition par dimension :

| Dimension | Score final | Évolution |
|---|---|---|
| SEO technique (crawl, canonical, sitemap, robots) | 8/10 | +1 |
| On-page (title, description, H1, mots-clés) | 9/10 | +1 |
| Contenu & intention (persona Kévin, FAQ, structured data) | 9/10 | +1 |
| Blog & autorité thématique | 7/10 | +1 |
| E-E-A-T (Person schema, fondateurs identifiés, LocalBusiness) | 9/10 | nouveau |

---

## Ce qui manque pour 10/10

**Priorité haute (impact ranking direct)**

1. **Meta description / enrichie avec chiffres différenciateurs** — s'applique à `/`, `/vendre`, `/realisations`. Les descriptions actuelles sont fonctionnelles mais n'exploitent pas les chiffres vérifiables déjà présents dans le code (3,2M€, 21 appartements, 5 rénovations). CTR SERP sous-optimisé.

2. **Title de /notre-approche sans mot-clé SEO** — "Comment Versi Immobilier travaille — Méthode et équipe" ne contient pas "marchand de biens" ni "Lille". Opportunité manquée sur une requête navigationnelle à forte intent.

3. **LocalBusiness JSON-LD incomplet** — ContactPage : manque `telephone` (le numéro est dans le JSX mais pas dans le schema), `@id` pour lier au nœud Organization de index.html. Sans `@id`, Google ne peut pas déduplicater les entités LocalBusiness + Organization.

4. **`/blog/:slug` — Person schema sans sameAs dans BlogPosting** — les auteurs Person dans le schema BlogPosting ne sont pas liés aux profils LinkedIn (contrairement à ApprochePage). E-E-A-T partiel sur les articles.

**Priorité moyenne (rich snippets et autorité)**

5. **Pas d'ItemList JSON-LD** sur `/nos-biens` ni `/realisations` — les pages listing ne génèrent pas de rich snippet liste dans les SERP. Gain potentiel de CTR.

6. **BreadcrumbList absent** sur les pages principales (/, /blog, /realisations) — attendu pour les SERP avec rich snippets Google.

7. **`/realisations/:id` — title sans localisation** — "[titre] — Réalisation Versi Immobilier" n'exploite pas le champ `project.location` déjà disponible dans le composant.

**Priorité basse (finition)**

8. **Vérifier noindex sur /mentions-legales** — s'assurer que la page est bien exclue de l'index via PageHead (aucune valeur SEO, dilution de crawl budget).

9. **`/investir` non audité** dans cette passe — à inclure dans un audit dédié si la page est active et indexée.

---

## Ce qui est désormais 100% propre (PASS définitifs)

- Canonical absolu par page (react-helmet-async + PageHead)
- JSON-LD Organization avec foundingYear, numberOfEmployees, sameAs, founders
- FAQ dupliquée supprimée — un seul FAQPage actif par page (BuyerFAQ.jsx sur /, SellPage FAQPage sur /vendre)
- BlogPosting JSON-LD avec URL hardcodée (fix window.location.origin)
- LocalBusiness sur /contact (Lille + Hauts-de-France)
- JSON-LD Person (3 fondateurs) sur /notre-approche avec sameAs LinkedIn
- Mentions légales sans placeholder — conformité légale + signal confiance
- RealEstateListing schema sur /nos-biens/:id (validé re-audit)
- Prerender 9 routes statiques Playwright (validé re-audit)
- sitemap.xml avec routes statiques + lastModified (validé re-audit)
- llms.txt (validé re-audit)
- H1 enrichis et géolocalisés sur /realisations et /blog
- CTA acquéreur → /nos-biens en position primaire sur /realisations/:id
- Texte statique enrichi sur /nos-biens avec claims vérifiables

---

**Handoff → @fullstack**

- Fichiers audités : `versi-immobilier/src/pages/*.jsx` (10 pages), `versi-immobilier/index.html`
- Rapport produit : `docs/reviews/seo-final-s8.md`
- Décisions prises : score final 8,5/10, 9 actions identifiées, 3 PASS définitifs supplémentaires depuis le re-audit
- Points d'attention pour implémentation :
  - LocalBusiness JSON-LD sur ContactPage : ajouter `telephone: "+33632683274"` et `"@id": "https://versi-immobilier.fr/#localbusiness"` + lien `@id` vers l'Organization dans index.html
  - BlogPosting author : ajouter `sameAs` LinkedIn aux 3 Person dans BlogArticlePage.jsx
  - Title /notre-approche : remplacer par "Marchand de biens à Lille — Méthode et équipe | Versi Immobilier"
  - Title /realisations/:id : interpoler `project.location` dans le title dynamique
  - Vérifier noindex sur /mentions-legales via PageHead
  - ItemList JSON-LD sur /nos-biens et /realisations : peut attendre une prochaine session
