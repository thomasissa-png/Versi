# Re-audit SEO post-corrections s8 — Versi Immobilier

**Date** : 2026-04-14
**Auditeur** : @seo
**Référence** : suite de `docs/reviews/seo-audit-s8.md` (score initial : 5/10)

---

## Score global : 7,5/10

Progression significative depuis l'audit initial (5/10). Les corrections s8 ont résolu les problèmes critiques : unicité des balises SEO par page, structured data acquéreur, canonical propre, FAQ schema, sitemap enrichi, prerender Playwright. Le site est désormais crawlable et techniquement solide pour Google. Trois zones de friction persistent : (1) le prerender reste un workaround SPA — Bing rendra le JS moins bien que Google, (2) les pages de détail dynamiques (`/nos-biens/:id`, `/blog/:slug`, `/realisations/:id`) ne sont pas pré-rendues et n'ont pas de canonical absolu garanti côté serveur, (3) le sitemap ne couvre pas les URLs dynamiques et ses `lastModified` sont régénérés à la date du build (problème Bing).

---

## Scores par dimension /10

| Dimension | Score | Évolution vs s8 |
|---|---|---|
| SEO technique (crawl, canonical, sitemap, robots) | 7/10 | +3 (était 4/10) |
| On-page (title, description, H1, mots-clés) | 8/10 | +3 (était 5/10) |
| Contenu & intention (persona Kévin, FAQ, structured data) | 8/10 | +4 (était 4/10) |
| Blog & autorité thématique | 6/10 | +1 (était 5/10) |

**Score global calculé** : moyenne pondérée (technique ×1,5 + on-page ×1 + contenu ×1 + blog ×0,5) = **7,4/10 → arrondi 7,5/10**

## Audit page par page

---

### 1. / — HomePage

**Note SEO : 8/10**

**Points forts**
- Title exact-match acquéreur : "Versi Immobilier — Appartements rénovés à vendre, Lille et Hauts-de-France" — mot-clé principal en position 1
- BuyerFAQ.jsx avec 5 Q/R acquéreur + JSON-LD FAQPage injecté via `useEffect` — doublon avec le FAQPage de `index.html` (voir point faible)
- Canonical auto-généré par PageHead vers `https://versi-immobilier.fr/` — correct

**Points faibles restants**
- Double FAQPage JSON-LD : `index.html` contient un FAQPage statique (5 questions) ET BuyerFAQ.jsx injecte un second FAQPage dynamique via `useEffect`. Google peut traiter les deux mais c'est une pratique risquée — le validateur Rich Results peut signaler un conflit. Bing ne tolère pas les doublons de même type.
- Description générique sans chiffre différenciateur : "Des appartements sélectionnés, rénovés et vendus en direct par un marchand de biens" — pas de chiffre (3,2M€, 21 appartements) qui ancrerait la crédibilité dans la SERP
- Pas de BreadcrumbList schema sur la homepage (attendu pour les SERP Google avec rich snippets)

**Action corrective**
Fusionner les deux FAQPage en un seul : supprimer le FAQPage statique de `index.html` et laisser BuyerFAQ.jsx gérer le JSON-LD dynamique. Enrichir la meta description : "21 appartements rénovés vendus en direct à Lille. Diagnostics fournis, garantie décennale, zéro frais d'agence. Versi Immobilier, 3,2M€ de volume."

---

### 2. /nos-biens — PropertiesPage

**Note SEO : 8,5/10**

**Points forts**
- Title optimal avec localisation et intention transactionnelle : "Appartements et biens rénovés à vendre — Lille, Hauts-de-France | Versi Immobilier"
- H1 enrichi aligné sur l'intention acquéreur : "Appartements et biens rénovés à vendre — Lille et Hauts-de-France."
- États UI complets (loading, erreur, empty, résultats, filtrés vides) — excellent pour UX et Googlebot

**Points faibles restants**
- Description tronquée sur l'intention : "Biens disponibles et en précommercialisation. Diagnostics inclus, visite sur demande. Vente directe sans frais d'agence." — manque les mots-clés "primo-accédant", "appartement Lille prix" ou fourchette de prix
- Filtres dynamiques (type, localisation, budget) : le contenu filtré est rendu côté client uniquement — les URLs de filtre ne sont pas crawlées et n'ont pas de canonical. Risque faible (pas de paramètres d'URL visibles) mais les bots voient la page sans données si l'API ne répond pas au prerender
- Pas de ItemList schema pour les biens disponibles (aurait pu enrichir la SERP avec un rich snippet liste)

**Action corrective**
Enrichir la meta description avec la fourchette de prix dynamique déjà calculée dans le composant : "Appartements rénovés à Lille dès [priceRange.min] €. Dossier complet avant visite, zéro frais d'agence. Vente directe marchand de biens." Ajouter un ItemList JSON-LD pour les 3 premiers biens disponibles.

---

### 3. /vendre — SellPage

**Note SEO : 7,5/10**

**Points forts**
- Title ciblé intention transactionnelle vendeur : "Céder un bien immobilier — Offre ferme en 7 jours | Versi Immobilier"
- FAQ vendeur riche (5 questions) avec accordéon accessible — contenu de qualité E-E-A-T
- Canonical correct, H1 clair ("Vous cédez un bien. Offre ferme en 7 jours.")

**Points faibles restants**
- Aucun FAQPage JSON-LD sur cette page : la FAQ vendeur est rendue visuellement mais sans schema markup. Google ne peut pas extraire les rich snippets FAQ pour cette page
- Title sans mot-clé géographique : "Céder un bien immobilier" est générique — "Céder un bien immobilier à Lille — Offre ferme 7 jours | Versi Immobilier" serait plus pertinent pour le local
- Description sans déclencheur émotionnel : "Versi Immobilier achète en direct, sans condition suspensive de financement. Offre ferme sous 7 jours ou refus motivé par écrit." — fonctionnel mais pas de differentiation vs agences dans la SERP

**Action corrective**
Ajouter un FAQPage JSON-LD dynamique sur SellPage (même pattern que BuyerFAQ.jsx). Réviser le title : "Vendre un bien à Lille — Offre ferme en 7 jours | Versi Immobilier". Enrichir la description : "Vendez sans agence, sans condition suspensive. Offre ferme ou refus motivé sous 7 jours. Versi Immobilier achète en fonds propres à Lille et Hauts-de-France."

---

### 4. /realisations — RealisationsPage

**Note SEO : 7/10**

**Points forts**
- Title descriptif avec différenciateur chiffré : "Réalisations — Immeubles et appartements rénovés | Versi Immobilier"
- Description avec preuve : "3,2M€ de volume traité depuis 2022" — signal E-E-A-T fort
- Bandeau CTA vendeur en bas de page — bon maillage interne /realisations → /vendre

**Points faibles restants**
- H1 générique "Réalisations." sans mot-clé : Google lit "Réalisations." comme H1, sans contexte sémantique. Un H1 comme "Réalisations — Appartements rénovés à Lille, Hauts-de-France" serait plus exploitable
- Pas de Schema ItemList sur les projets affichés — opportunité rich snippet manquée
- Title sans localisation géographique : "Réalisations — Immeubles et appartements rénovés" s'applique à n'importe quel marchand de biens en France. "Réalisations à Lille et Hauts-de-France — Versi Immobilier" serait plus ciblé

**Action corrective**
Réviser le H1 : "Nos réalisations — Appartements et immeubles rénovés à Lille." Réviser le title : "Réalisations à Lille — Appartements rénovés, 3,2M€ traités | Versi Immobilier". Ajouter un ItemList JSON-LD sur les projets terminés.

---

### 5. /notre-approche — ApprochePage

**Note SEO : 7/10**

**Points forts**
- Contenu E-E-A-T riche : photos fondateurs, parcours détaillés (Sony, Algolia, TEOS), LinkedIn vérifiables
- Title informatif : "Comment Versi Immobilier travaille — Méthode et équipe"
- Structure H2 logique : Quatre étapes, Trois engagements, Équipe, Ce que nous achetons

**Points faibles restants**
- Title sans mot-clé principal : "Comment Versi Immobilier travaille" est navigationnel, pas informationnel. Opportunité manquée sur "marchand de biens Lille" ou "opérateur immobilier Hauts-de-France"
- Aucun schema Person sur les fondateurs : les données structured data Person (name, jobTitle, sameAs LinkedIn) permettraient à Google d'associer les fondateurs à l'organisation
- H1 générique "Comment Versi travaille." — le mot-clé "marchand de biens" absent du H1, alors qu'il est dans le contenu

**Action corrective**
Réviser le title : "Marchand de biens à Lille — Méthode et équipe Versi Immobilier". Réviser le H1 : "Comment Versi Immobilier, marchand de biens, travaille." Ajouter un JSON-LD Person pour chaque fondateur (name, jobTitle, sameAs) via useEffect.

---

### 6. /blog — BlogPage

**Note SEO : 6/10**

**Points forts**
- Title orienté persona acquéreur : "Blog immobilier Lille — Achat, rénovation, marché | Versi Immobilier"
- Description ciblée : "Guides pratiques pour acheter à Lille" — intention claire
- Filtres thématiques (Acheter rénové, Financement, Marchand de biens, Investir à Lille) — structure de cocon sémantique en devenir

**Points faibles restants**
- H1 "Notre regard." : titre de marque, pas un titre SEO. Google ne peut pas extraire l'intention de recherche. "Blog immobilier Lille — Guides pour acheter rénové" serait exploitable
- Aucun article pré-rempli visible dans le code — si la base de données est vide, Googlebot voit une page vide. Le prerender bloque l'API (`page.route('**/api/**', fulfill [])`) et renvoie un tableau vide, ce qui signifie que la page pré-rendue affiche l'état vide "Les premiers articles arrivent bientôt" — **non indexable avec valeur**
- Pas de schema Blog ou ItemList sur les articles listés

**Action corrective**
Réviser le H1 : "Blog immobilier — Guides pour acheter à Lille" (ou variante). Revoir la stratégie de prerender pour /blog : soit injecter les N premiers articles dans le HTML pré-rendu (requête Supabase côté serveur), soit accepter que /blog ne soit pas pré-rendu avec contenu. Ajouter schema ItemList sur les articles.

---

### 7. /contact — ContactPage

**Note SEO : 7/10**

**Points forts**
- Title fonctionnel : "Contact — Versi Immobilier"
- Numéro de téléphone et email en dur dans le DOM — crawlables par Google
- H1 dynamique selon le contexte (bien sélectionné vs contact générique) — UX élaborée

**Points faibles restants**
- Title et description trop courts et génériques : "Contact — Versi Immobilier" / "Contactez Versi Immobilier pour visiter un bien..." — pas d'intention de recherche exploitable. "Contacter un marchand de biens à Lille — Versi Immobilier" serait plus ciblé
- Aucun LocalBusiness schema sur cette page : c'est la page la plus logique pour un schema LocalBusiness avec address, telephone, openingHours
- La page /contact n'est pas dans le sitemap.xml — erreur de couverture à corriger

**Action corrective**
Réviser title : "Contacter Versi Immobilier — Marchand de biens Lille". Ajouter LocalBusiness JSON-LD sur ContactPage. Ajouter /contact au sitemap.xml.

---

### 8. /investir — InvestirPage

**Note SEO : 9/10**

**Points forts**
- `noindex` correctement appliqué via PageHead : `<meta name="robots" content="noindex, follow">` — page exclue de l'index sans bloquer le crawl
- Canonical généré par PageHead — cohérent
- Prerender inclus dans ROUTES (`/investir` listé dans scripts/prerender.js) — le noindex sera présent dans le HTML statique

**Points faibles restants**
- Le lien sortant vers `versi-invest.fr` en `target="_blank"` sans `nofollow` — si versi-invest.fr n'est pas encore établi (domaine neuf), passer du PageRank vers ce domaine peut être neutre mais mérite un suivi
- Page courte avec peu de contenu — si la page est découverte malgré noindex (via sitemap ou lien entrant), son contenu mince ne pose pas de problème puisqu'elle est noindex

**Action corrective**
Retirer /investir du sitemap.xml (une page noindex ne devrait pas figurer dans le sitemap — signal contradictoire pour Bing). C'est le seul point d'amélioration.

---

### 9. /nos-biens/:id — PropertyDetailPage

**Note SEO : 6,5/10**

**Points forts**
- PageHead dynamique : title = `${property.title} — ${property.city} | Versi Immobilier` — personnalisé par bien
- Schema RealEstateListing complet : name, description, url, offers (price, currency, availability), address, floorSize, numberOfRooms, seller — conforme schema.org
- Seller linkée à l'Organization via `"@id": "https://versi-immobilier.fr/#organization"` — excellent pour le knowledge graph

**Points faibles restants**
- Schema injecté via `useEffect` (CSR) uniquement : le schema n'est pas présent dans le HTML pré-rendu car les pages dynamiques `/nos-biens/:id` ne sont pas dans ROUTES de prerender.js. Googlebot (qui rend JS) peut le voir, mais Bingbot risque de le manquer
- Canonical dépend de `useLocation()` de react-router : sur une page de détail `/nos-biens/abc123`, si l'URL contient des paramètres de query (`?bien=X` depuis le ContactPage), le canonical pourrait inclure ces paramètres — à vérifier. Le composant PageHead utilise `pathname` sans query string — correct en théorie mais non validé sur les cas de redirection
- Description générique : `${property.type}, ${property.surface}, ${property.price}. Visite sur demande.` — pas d'argument de vente différenciateur dans la meta description

**Action corrective**
Enrichir la description : ajouter "Vente directe sans frais d'agence. Diagnostics fournis." dans le template de description. Pour le schema, envisager une solution SSR ou un prerender avec données réelles pour les fiches bien les plus importantes. Vérifier que le canonical ne contient jamais de query strings.

---

### 10. /blog/:slug — BlogArticlePage

**Note SEO : 7/10**

**Points forts**
- PageHead conditionnel : rendu uniquement quand `article` existe — évite un title vide pendant le loading
- Schema BlogPosting complet : headline, description, author (Organization + 3 Person), publisher, datePublished, dateModified, mainEntityOfPage
- CTA acquéreur en bas d'article : "Vous cherchez un appartement rénové à Lille ?" → /nos-biens — excellent maillage interne acquéreur

**Points faibles restants**
- Schema BlogPosting injecté via `useEffect` (CSR uniquement) : même problème que PropertyDetailPage — non présent dans le prerender
- `window.location.origin` dans le schema : si le prerender était implémenté, `window` n'est pas disponible côté serveur. Ce pattern bloquant est à remplacer par une constante `SITE_URL` comme dans PageHead.jsx
- Author schema : les `Person` author n'ont pas de `sameAs` LinkedIn ni d'`identifier` — signal E-E-A-T réduit. Le schema Organization author fait doublon avec publisher.

**Action corrective**
Remplacer `window.location.origin` par `const SITE_URL = 'https://versi-immobilier.fr'` dans le schema BlogPosting. Ajouter `sameAs` LinkedIn aux Person author. Supprimer l'Organization dans `author` (doublon avec `publisher`).

---

### 11. /realisations/:id — RealisationDetailPage

**Note SEO : 6,5/10**

**Points forts**
- PageHead dynamique : title = `${project.title} — Réalisation Versi Immobilier` — clair
- Description avec chiffres contextuels : type, localisation, surface, prix de vente
- Galerie avant/après avec navigation accessible (aria-label, role tabpanel) — signal UX positif

**Points faibles restants**
- Aucun JSON-LD sur les pages de réalisation : contrairement à PropertyDetailPage (RealEstateListing) et BlogArticlePage (BlogPosting), les pages de réalisation n'ont aucun schema markup. Un schema `ItemPage` ou `Article` (avec les chiffres clés : surface, prix, durée) améliorerait l'extractibilité
- CTAs de bas de page orientés vendeur uniquement ("Soumettre mon bien", "Nous contacter") : manque un CTA acquéreur ("Voir les biens disponibles") — incohérence avec la stratégie persona Kévin
- Pas de prerender pour les pages dynamiques : même problème structurel que les autres pages dynamiques

**Action corrective**
Ajouter un schema `CreativeWork` ou `ItemPage` JSON-LD avec les chiffres clés (surface, prix, durée chantier, localisation). Ajouter un CTA acquéreur ("Appartements rénovés à vendre" → /nos-biens) entre les CTAs existants. Envisager l'ajout des N premières réalisations dans un prerender statique.

---

### 12. /mentions-legales — MentionsLegales

**Note SEO : 8/10**

**Points forts**
- PageHead correct : title "Mentions légales — Versi Immobilier" + description sobre
- Structure H1/H2 propre, contenu légal complet (RGPD, cookies, données)
- Double H1 intentionnel (Mentions légales + Politique de confidentialité) — acceptable pour une page utilitaire distincte

**Points faibles restants**
- Siège social avec placeholder "[adresse à compléter avant mise en ligne]" et hébergeur avec placeholders : si la page est indexée avec ces valeurs, Google peut pénaliser pour contenu incomplet. **C'est un blocage avant mise en ligne**
- Aucun `noindex` sur cette page : les mentions légales n'ont aucune valeur SEO et devraient être en noindex pour concentrer le crawl budget sur les pages à valeur. Pas critique mais recommandé
- `robots.txt` ne mentionne pas `/mentions-legales` en Disallow — c'est cohérent avec l'absence de noindex, mais si on ajoute le noindex, pas besoin de Disallow

**Action corrective**
Compléter les placeholders avant le lancement (adresse siège, hébergeur). Ajouter `noindex` via PageHead — `<PageHead noindex title="Mentions légales — Versi Immobilier" description="..." />`. Retirer /mentions-legales du sitemap si noindex ajouté.

## Problèmes restants (score < 10/10)

### Critiques (bloquent l'indexation ou la qualité Bing)

**P1 — Double FAQPage JSON-LD sur la HomePage**
`index.html` contient un FAQPage statique (5 questions). `BuyerFAQ.jsx` injecte un second FAQPage dynamique via `useEffect`. Résultat : deux schemas FAQPage simultanés sur la même URL. Google peut gérer les doublons mais risque de ne retenir qu'un seul. Bing peut rejeter les deux.
Action : supprimer le FAQPage de `index.html`, laisser BuyerFAQ.jsx seul.

**P2 — /contact absent du sitemap.xml**
La page /contact n'est pas dans le sitemap.xml. C'est la page de conversion principale — elle doit être indexée avec priorité 0.8.
Action : ajouter `<url><loc>https://versi-immobilier.fr/contact</loc>...</url>` dans le sitemap.

**P3 — /investir présent dans le sitemap.xml alors qu'elle est noindex**
Un signal contradictoire : "je te soumets cette URL" + "ne l'indexe pas". Bing est particulièrement sensible à ces incohérences.
Action : retirer /investir du sitemap.xml.

**P4 — lastModified du sitemap = date du build (2026-04-14 sur toutes les URLs)**
Toutes les URLs ont `lastmod: 2026-04-14`. Bing interprète une date identique sur toutes les URLs comme un signal de spam ou de sitemap généré automatiquement sans valeur. Google l'ignore mais Bing peut déprioriser le crawl.
Action : utiliser des dates réelles de dernière modification de contenu par page (statiques, pas régénérées à chaque build).

**P5 — Placeholders non remplis dans /mentions-legales**
"[adresse à compléter avant mise en ligne]" et "[Nom de l'hébergeur]" sont visibles dans le DOM. Si Google crawle cette page avant le lancement, il indexe du contenu incomplet.
Action : compléter avant mise en ligne, ou ajouter noindex temporairement.

**P6 — Schema BlogPosting et RealEstateListing : `window.location.origin` non compatible prerender**
BlogArticlePage.jsx utilise `window.location.origin` dans le JSON-LD. Si un prerender côté serveur est implémenté ultérieurement, ce code plantera. Mauvaise pratique à corriger maintenant.
Action : remplacer par `const SITE_URL = 'https://versi-immobilier.fr'`.

### Importants (freinent les performances SEO sans bloquer)

**P7 — Aucune FAQ JSON-LD sur /vendre**
La page /vendre a 5 questions FAQ visuellement rendues mais sans schema markup. Opportunité rich snippet manquée.

**P8 — Aucun schema Person pour les fondateurs**
Les données fondateurs sont présentes sur /notre-approche avec LinkedIn, parcours, photos — idéales pour un schema Person. Sans markup, Google ne peut pas rattacher ces personnes au schema Organization.

**P9 — Aucun schema pour /realisations/:id**
Les pages de réalisation n'ont aucun JSON-LD. Un schema CreativeWork ou ItemPage permettrait l'extractibilité des chiffres clés.

**P10 — H1 faibles sur /realisations, /blog, /notre-approche**
Trois H1 génériques sans mot-clé géographique ou sémantique : "Réalisations.", "Notre regard.", "Comment Versi travaille." Bing donne beaucoup de poids à l'exact-match dans le H1.

**P11 — CTA manquant acquéreur sur /realisations/:id**
Pages de réalisation orientées vendeur uniquement. Le persona Kévin (acquéreur) qui lit une réalisation n'a pas de chemin vers /nos-biens.

**P12 — Titles sans géolocalisation sur /notre-approche et /realisations**
Deux pages sans "Lille" ou "Hauts-de-France" dans leur title. Manque pour le SEO local.

---

## Recommandations pour atteindre 10/10

### Actions P0 (avant lancement — bloquantes)

1. **Supprimer le FAQPage de `index.html`** (garder uniquement BuyerFAQ.jsx)
2. **Compléter les placeholders de /mentions-legales** (adresse siège + hébergeur)
3. **Corriger le sitemap.xml** : ajouter /contact, retirer /investir, mettre des dates lastModified réelles par page
4. **Remplacer `window.location.origin` par `SITE_URL` dans BlogArticlePage.jsx**

### Actions P1 (première semaine post-lancement)

5. **Ajouter FAQPage JSON-LD sur /vendre** (même pattern que BuyerFAQ.jsx — créer un `SellerFAQ` useEffect)
6. **Ajouter schema Person pour les 3 fondateurs** sur /notre-approche (useEffect, name + jobTitle + sameAs LinkedIn)
7. **Ajouter CTA acquéreur sur /realisations/:id** : section "Voir les biens disponibles" avant les CTAs existants
8. **Réviser les H1 faibles** :
   - `/realisations` : "Nos réalisations — Appartements rénovés à Lille et Hauts-de-France."
   - `/blog` : "Blog immobilier — Guides pour acheter à Lille"
   - `/notre-approche` : "Comment Versi Immobilier, marchand de biens à Lille, travaille."
9. **Réviser les titles sans géolocalisation** :
   - `/notre-approche` → "Marchand de biens à Lille — Méthode et équipe Versi Immobilier"
   - `/realisations` → "Réalisations à Lille — Appartements rénovés, 3,2M€ traités | Versi Immobilier"
10. **Ajouter LocalBusiness JSON-LD sur /contact** (address, telephone, email, areaServed)

### Actions P2 (dans le mois)

11. **Ajouter noindex sur /mentions-legales** et la retirer du sitemap
12. **Enrichir meta descriptions avec chiffres et différenciateurs** :
    - `/` : mentionner "21 appartements", "3,2M€", "zéro frais d'agence"
    - `/nos-biens` : fourchette de prix dynamique depuis `priceRange`
    - `/vendre` : "Lille et Hauts-de-France" dans la description
13. **Prerender ou SSG des pages dynamiques critiques** : à moyen terme, /nos-biens/:id et /blog/:slug nécessitent un rendu serveur pour Bing. Options : Next.js SSG avec ISR, ou prerender Playwright étendu aux URLs dynamiques importantes (fiches des N premiers biens actifs)
14. **IndexNow pour Bing** : implémenter l'endpoint IndexNow ou le plugin Vite pour notifier Bing instantanément à chaque ajout de bien ou article — Bing crawle moins fréquemment que Google, ce levier compense directement

### Synthèse des gains attendus par action

| Action | Impact SEO | Complexité |
|---|---|---|
| Supprimer double FAQPage | Élimine risque Bing + rich snippet propre | Faible |
| Corriger sitemap | Signal Bing correct | Faible |
| FAQ JSON-LD /vendre | Rich snippet FAQ sur une page transactionnelle | Faible |
| Schema Person fondateurs | E-E-A-T + knowledge graph | Moyen |
| Réviser H1 x3 | Exact-match Bing + sémantique Google | Faible |
| LocalBusiness /contact | SEO local + Maps | Moyen |
| Prerender pages dynamiques | Indexation Bingbot garantie | Élevée |
| IndexNow | Crawl Bing accéléré | Faible |

---

**Score projeté post-corrections P0+P1 : 9/10**
**Score projeté post-corrections P0+P1+P2 : 9,5/10**
Le 10/10 absolu nécessiterait un SSR/SSG (Next.js) pour garantir le rendu des pages dynamiques pour tous les bots. Avec React + Vite, le prerender Playwright est un workaround efficace pour Google mais structurellement limité pour Bing sur les routes dynamiques.

---

**Handoff → @fullstack**
- Fichiers produits : `/home/user/Versi/docs/reviews/seo-reaudit-s8.md`
- Décisions prises : score 7,5/10, 12 problèmes identifiés classés P0/P1/P2
- Actions immédiates (P0, avant lancement) :
  1. Supprimer le bloc FAQPage JSON-LD de `versi-immobilier/index.html` (lignes 119–167)
  2. Compléter les placeholders `[adresse à compléter]` et `[Nom de l'hébergeur]` dans `src/pages/MentionsLegales.jsx`
  3. Corriger `versi-immobilier/public/sitemap.xml` : ajouter /contact (priorité 0.8), retirer /investir, mettre des `lastmod` réelles par page (non régénérées au build)
  4. Remplacer `window.location.origin` par `const SITE_URL = 'https://versi-immobilier.fr'` dans `src/pages/BlogArticlePage.jsx` (ligne 155)
- Points d'attention :
  - Les pages dynamiques `/nos-biens/:id` et `/blog/:slug` ne sont pas pré-rendues — Bingbot voit un shell HTML vide. Évaluer l'ajout de ces URLs dans le prerender avec données mockées ou l'implémentation d'un vrai SSG
  - La page /contact est absente du sitemap — c'est la page de conversion principale, prioritaire
  - Coordonner l'implémentation IndexNow avec @seo pour la configuration de l'endpoint Bing
