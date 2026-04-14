# Audit SEO — versi-immobilier.fr
> Produit par @seo | Date : 2026-04-14
> Persona principal audité : Kévin (acquéreur primo-accédant / investisseur locatif, Hauts-de-France)
> Persona secondaire : Sophie (propriétaire vendeuse)
> KPI North Star : Prises de contact qualifiées via formulaire
> Références : project-context.md (Scope V2, pivot 2026-04-10), versi-immobilier/index.html, pages JSX, sitemap.xml, robots.txt, llms.txt, docs/seo/vi-blog-strategy.md, docs/seo/vi-blog-keyword-research.md, docs/geo/geo-strategy.md

---

## Scores globaux

| Dimension | Score /10 | Tendance |
|---|---|---|
| **SEO Technique** | **5/10** | Problèmes structurels SPA non résolus |
| **SEO On-page** | **4/10** | Meta tags uniquement sur l'accueil, H1 génériques |
| **SEO Contenu** | **6/10** | Pivot acquéreur partiellement intégré |
| **Stratégie Blog** | **7/10** | Fondations solides, implémentation manquante |
| **Score global** | **5/10** | Risque d'invisibilité sur Bing, sous-optimisation persona |

---

## Top 5 — Problèmes critiques

### P0-1 : SPA React sans pré-rendu — Bingbot ne crawle pas le contenu

Le site est une SPA React/Vite avec client-side routing. L'HTML servi par le serveur ne contient qu'un `<div id="root"></div>`. Tout le contenu (H1, meta description, JSON-LD) est injecté après exécution du JavaScript côté client.

**Impact Google** : Googlebot déclare crawler les SPA, mais le rendering est différé (jusqu'à 48h) et dégradé. Le H1 "Peu de biens. Pas d'approximation." de Hero.jsx n'est pas dans l'HTML initial.

**Impact Bing** : Bingbot est significativement moins performant sur le JS. Règle confirmée (@seo — identité agent) : "Bing est plus strict que Google sur le rendering JS — les pages critiques doivent avoir un rendu SSR/SSG complet." Concrètement : la page d'accueil, la page `/nos-biens`, les fiches biens et la page `/vendre` risquent de ne jamais être crawlées correctement par Bingbot. Les mots-clés cibles ("appartement rénové Lille", "marchand de biens Hauts-de-France") sont inexistants pour Bing.

**Recommandation** : implémenter `vite-plugin-prerender` (déjà documenté dans `docs/seo/seo-strategy.md`) sur les routes critiques : `/`, `/nos-biens`, `/vendre`, `/realisations`, `/notre-approche`, `/contact`, et les fiches biens connues. Cette recommandation a été posée lors de l'audit versi.fr — elle n'a toujours pas été implémentée sur versi-immobilier.fr.

### P0-2 : Meta tags inexistants sur toutes les pages sauf l'accueil

Le fichier `index.html` contient des meta tags corrects pour la page d'accueil : title "Versi Immobilier — Marchand de biens | Lille et Paris", meta description orientée activité, og:title, canonical. Mais c'est la seule page correctement équipée.

Aucune des autres pages ne dispose de meta tags spécifiques :
- `/nos-biens` : title = "Versi Immobilier — Marchand de biens | Lille et Paris" (celui de index.html, identique pour toutes les pages)
- `/vendre` : idem
- `/realisations` : idem
- `/notre-approche` : idem
- `/blog` : idem
- Fiches biens individuelles : idem, sans mention du bien ni de la ville

**Impact** : en SPA React sans react-helmet-async ou équivalent, le `<title>` dans index.html est le seul titre visible pour les crawlers. Google et Bing voient le même title pour toutes les pages du site. Cannibalisation garantie sur les mots-clés de marque. Les SERP affichent "Versi Immobilier — Marchand de biens | Lille et Paris" pour toutes les URLs — le CTR organique en souffre car aucun titre ne correspond à l'intention spécifique de la requête.

**Recommandation** : installer `react-helmet-async` et définir des templates de meta tags par page (voir section 5).

### P1-1 : H1 génériques — aucun mot-clé acquéreur en position critique

Inventaire des H1 actuels :

| Page | H1 actuel | Mot-clé acquéreur ? |
|---|---|---|
| Accueil (Hero) | "Peu de biens. Pas d'approximation." | Non — copywriting, pas SEO |
| /nos-biens | "Les biens disponibles." | Partiel |
| /vendre | "Vous cédez un bien. Offre ferme en 7 jours." | Vendeur uniquement |
| /realisations | "Réalisations." | Non |
| /notre-approche | "Comment Versi travaille." | Non |
| /blog | "Notre regard." | Non |
| /investir | "Investir avec un opérateur intégré." | Investisseur, pas acquéreur Kévin |
| /contact | "Écrivez-nous." / "Demander une présentation." | Neutre |

**Constats** :
1. Aucun H1 ne contient un mot-clé de recherche organique ciblant Kévin : "appartement rénové Lille", "achat immobilier Hauts-de-France", "bien rénové marchand de biens".
2. Le H1 de l'accueil est un slogan copywriting efficace — mais aucune valeur SEO directe sur les requêtes cibles. Bing valorise le mot-clé exact dans le H1 plus que Google.
3. La page `/vendre` a un H1 exclusivement vendeur — cohérent avec son rôle mais invisible pour Kévin.
4. La page `/nos-biens` est la page centrale acquéreur mais son H1 "Les biens disponibles." ne contient aucun signal géographique ni sémantique.

### P1-2 : Sitemap lastModified non stable + pages manquantes (blog)

Le sitemap (`/public/sitemap.xml`) liste 7 URLs avec `lastModified` fixé au `2026-04-11` pour toutes les entrées. Deux problèmes :

**Problème A — lastModified statique** : Bing est documenté pour utiliser cette date pour décider de recrawler. Si le sitemap est régénéré à chaque build (probable avec Vite), la date change sans que le contenu ait changé. Signal de spam potentiel pour Bingbot.

**Problème B — Pages manquantes** : le blog existe (`/blog`, `BlogPage.jsx`, `BlogArticlePage.jsx`) mais n'est pas référencé dans le sitemap. Idem pour `/blog/*` (articles individuels). Les fiches biens (`/nos-biens/:id`) et fiches réalisations (`/realisations/:id`) sont absentes.

**Problème C — Priorités discutables** : `/vendre` a une priorité 0.9 (identique à `/nos-biens`), alors que le pivot acquéreur place `/nos-biens` comme page centrale. La priorité devrait être `/nos-biens` = 1.0, `/vendre` = 0.7-0.8.

### P1-3 : Schema.org adressé au persona vendeur, pas à l'acquéreur

Le JSON-LD FAQPage dans index.html contient 5 questions. Audit du ciblage persona :

| Question | Persona ciblé |
|---|---|
| "Comment fonctionne Versi Immobilier ?" | Neutre |
| "Versi Immobilier est-il un agent immobilier ?" | Mixte (acheteur ET vendeur) |
| "Quels types de biens Versi Immobilier achète-t-il ?" | **Vendeur** (critères d'acquisition) |
| "Comment est financé l'achat ?" | **Vendeur** (pas de condition suspensive) |
| "Qui sont les fondateurs ?" | Neutre (crédibilité) |

**Résultat** : 2 questions sur 5 ciblent explicitement le vendeur (Sophie). Zéro question ne répond à une interrogation d'acquéreur (Kévin) : "Quelles garanties ai-je en achetant chez un marchand de biens ?", "Comment visiter un bien Versi Immobilier ?", "Les biens sont-ils rénovés avant la vente ?".

Le llms.txt est également vendeur-centrique dans son process décrit ("Process de vente" = process côté vendeur). La section acquéreur manque.

---

## 1. Audit SEO Technique

### 1.1 Checklist multi-moteurs (Google + Bing)

| Élément | État | Google | Bing | Priorité |
|---|---|---|---|---|
| `robots.txt` | Présent — Allow: / pour tous les bots majeurs (GPTBot, ClaudeBot, Amazonbot, Bingbot implicite via `*`) | OK | OK | — |
| Directives `bingbot` explicites | Absentes — couvert par `User-agent: *` | N/A | Fonctionnel mais non optimisé | P2 |
| Canonical | Présent sur `/` dans index.html — absentes sur toutes les autres pages | Risque faible | **RISQUE ÉLEVÉ** — Bing ignore les pages sans canonical explicite | **P0** |
| Sitemap.xml | Présent, 7 URLs, lastModified 2026-04-11 | OK | Risque si date régénérée à chaque build | P1 |
| `noindex` pages sans valeur | Absent — `/investir` (page vide redirectant vers versi-invest.fr) devrait être noindexée | OK | OK | P1 |
| IndexNow | Non implémenté | N/A | **Signal manquant** — Bing crawle moins fréquemment | P1 |
| Bing Webmaster Tools | Non vérifié dans le code | N/A | Non confirmé | P1 |
| llms.txt | Présent, bien structuré | N/A | N/A | OK |
| Rendu SSR/SSG | Absent — SPA pure | **Dégradé** | **Absent probable** | **P0** |
| HTTPS | Non vérifiable en audit code | Signal mineur | Pas un facteur de ranking Bing | — |

### 1.2 Analyse robots.txt

```
User-agent: *
Allow: /
Disallow: /api/

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

Sitemap: https://versi-immobilier.fr/sitemap.xml
```

**Points positifs** :
- AI crawlers autorisés (GPTBot, ClaudeBot) — cohérent avec la stratégie GEO
- Sitemap déclaré
- `/api/` correctement bloqué

**Points à corriger** :
- `Amazonbot` (Alexa) est référencé dans le fichier mais n'a aucun effet sur le ranking. Sa présence est neutre.
- `PerplexityBot` absent — à ajouter pour la stratégie GEO (cohérence avec `geo-strategy.md`)
- `Bingbot` devrait avoir une directive explicite si des règles différenciées sont souhaitées

### 1.3 Analyse sitemap.xml

Présent, valide syntaxiquement. Problèmes identifiés :

1. `/blog` manquant — page existante non référencée
2. `/blog/:slug` (articles individuels) — non référencés. Solution : sitemap dynamique côté serveur ou génération au build
3. `/nos-biens/:id` (fiches biens) — non référencées. Critique : les fiches biens sont les pages de conversion acquéreur
4. `/realisations/:id` (fiches réalisations) — non référencées
5. `lastModified` identique pour toutes les pages (2026-04-11) — date statique acceptable si elle correspond à la date de dernier déploiement réel, mais doit être maintenue manuellement à chaque update
6. `/vendre` priorité 0.9 = priorité identique à `/nos-biens` — incohérent avec le pivot acquéreur

### 1.4 Canonical — Problème critique Bing

Le seul canonical présent est dans `index.html` : `<link rel="canonical" href="https://versi-immobilier.fr/">`. Cette balise s'applique à **toutes les pages du site** car c'est une SPA — l'HTML servi est toujours index.html.

**Conséquence** : pour Bing, toutes les URLs du site ont le même canonical (`https://versi-immobilier.fr/`). Bing va traiter `/nos-biens`, `/vendre`, `/realisations` et toutes les fiches comme des duplicates de la homepage. **Aucune page secondaire ne sera indexée correctement par Bing.**

Pour Google, ce problème est atténué par la capacité de Google à interpréter les SPA, mais le risque de déclassement des pages secondaires existe.

**Fix requis** : `react-helmet-async` pour injecter le canonical correct par route. Implémentable côté fullstack en < 2h.

### 1.5 Schema.org — Audit complet

Trois blocs JSON-LD dans index.html :

**Bloc 1 — Organization + RealEstateAgent** : correct. `@id`, `name`, `url`, `logo`, `parentOrganization`, `areaServed`, `contactPoint`, `founders`, `knowsAbout`. Manque : `address` (pour le local SEO Lille), `sameAs` (LinkedIn Versi Immobilier s'il existe), `telephone`.

**Bloc 2 — WebSite** : correct et minimal.

**Bloc 3 — FAQPage** : voir P1-3. Questions biaisées vendeur. Aucune question acquéreur. Rich snippets FAQ (feature SERP Google) inexploités côté acquéreur.

**Manquants critiques** :
- `RealEstateListing` / `Product` sur les fiches biens — chaque fiche bien devrait avoir un schema de bien immobilier avec prix, adresse, surface, statut
- `BreadcrumbList` — absent sur toutes les pages
- `LocalBusiness` avec adresse Lille — renforce le SEO local pour "marchand de biens Lille"
- `BlogPosting` — présent dans BlogArticlePage.jsx mais injecté côté client (JS) — non crawlable par Bing

### 1.6 Core Web Vitals — Analyse par construction

Sans accès aux données réelles de Google Search Console ou Lighthouse CI, l'analyse est basée sur la lecture du code.

**LCP (Largest Contentful Paint)** :
- Deux polices chargées : PP Neue Montreal (cdnfonts.com) + DM Sans (Google Fonts) — double requête externe au chargement initial. Risque de FOUT (Flash Of Unstyled Text) et de blocage du rendu.
- `link rel="preconnect"` présent pour les deux domaines de polices — bonne pratique.
- Pas de `link rel="preload"` sur la police principale — LCP potentiellement impacté.
- Hero.jsx : le composant démarre avec `loaded = false` et applique une animation CSS (`hero__content--hidden` → `hero__content--visible`). L'image de fond (si présente en CSS) n'est pas préchargée via `<link rel="preload">` dans index.html.

**INP (Interaction to Next Paint)** :
- Filtres PropertiesPage.jsx : utilisation de `useMemo` — correct.
- Animations `fade-in` / `fade-hidden` avec `useFadeIn` hook — probablement basé sur IntersectionObserver, pas de CLS si bien implémenté.

**CLS (Cumulative Layout Shift)** :
- Images avec `width` et `height` définis dans SellPage.jsx (photos équipe : 60x60px) — bonne pratique.
- Images de galerie dans PropertyDetailPage.jsx sans dimensions explicites — risque de CLS.
- Pas d'attribut `aspect-ratio` visible sur les images de galerie principale.

**Recommandations CWV** :
- Ajouter `link rel="preload"` pour la police principale dans index.html
- Définir `width` et `height` sur les images de galerie des fiches biens
- Envisager de retirer DM Sans (fallback) si PP Neue Montreal est disponible avant le rendu — évite le double chargement

---

## 2. Audit SEO On-page

### 2.1 Meta tags — Inventaire complet

Le site n'utilise pas `react-helmet-async` ou équivalent. Toutes les pages héritent des meta tags d'`index.html`.

| Page | Title réel crawlé | Description réelle crawlée | Canonical crawlé |
|---|---|---|---|
| `/` | "Versi Immobilier — Marchand de biens \| Lille et Paris" | "Versi Immobilier achète, transforme et revend…" | `https://versi-immobilier.fr/` |
| `/nos-biens` | **Identique** | **Identique** | **`https://versi-immobilier.fr/`** ← FAUX |
| `/vendre` | **Identique** | **Identique** | **`https://versi-immobilier.fr/`** ← FAUX |
| `/realisations` | **Identique** | **Identique** | **`https://versi-immobilier.fr/`** ← FAUX |
| `/notre-approche` | **Identique** | **Identique** | **`https://versi-immobilier.fr/`** ← FAUX |
| `/blog` | **Identique** | **Identique** | **`https://versi-immobilier.fr/`** ← FAUX |
| `/contact` | **Identique** | **Identique** | **`https://versi-immobilier.fr/`** ← FAUX |
| `/nos-biens/:id` | **Identique** | **Identique** | **`https://versi-immobilier.fr/`** ← FAUX |
| `/blog/:slug` | Injecté via JS (`document.title`) — non crawlable Bing | Absente | Non injecté |

**BlogArticlePage.jsx** injecte un titre dynamique via `document.title` et un JSON-LD via `document.createElement('script')` dans un `useEffect`. Ces injections sont côté client — non crawlables par Bing, partiellement crawlables par Google avec délai.

### 2.2 Structure Hn — Audit par page

**Règle Bing** : mot-clé exact dans le H1 + premier paragraphe = signal fort.

| Page | H1 | Analyse Hn | Mot-clé cible manquant |
|---|---|---|---|
| `/` | "Peu de biens. Pas d'approximation." | H1 unique, H2 absents en Hero (sections sans balises Hn visibles dans Hero.jsx) | "appartement rénové Lille", "marchand de biens" |
| `/nos-biens` | "Les biens disponibles." | H1 + H2 "Vendus." — structure minimale | "appartement Lille", "bien rénové Hauts-de-France" |
| `/vendre` | "Vous cédez un bien. Offre ferme en 7 jours." | H1 vendeur, H2 présents (3 engagements, process, FAQ) — structure correcte pour vendeur | Correct pour son persona |
| `/realisations` | "Réalisations." | H1 + structure attendue | "rénovation Lille", "marchand de biens réalisations" |
| `/notre-approche` | "Comment Versi travaille." | H1 + H2/H3 présents — bon | Acceptable |
| `/blog` | "Notre regard." | H1 générique, H2 = titres articles | "blog immobilier Lille", "achat immobilier Hauts-de-France" |
| `/investir` | "Investir avec un opérateur intégré." | H1 seul, contenu minimal | Non prioritaire |
| `/contact` | "Écrivez-nous." | H1 seul | Non prioritaire |

**Problème spécifique `/nos-biens`** : cette page est la page centrale acquéreur (pivot 2026-04-10). Son H1 "Les biens disponibles." ne contient ni "Lille", ni "appartement", ni "rénové", ni "Hauts-de-France". Le premier paragraphe dit "Appartements et biens mixtes en Hauts-de-France et Île-de-France" — c'est le bon signal géographique, mais il est en `<p>`, pas en H1 ni H2.

**Proposition H1 amélioré pour `/nos-biens`** : "Appartements et biens rénovés à vendre — Lille et Hauts-de-France" — contient les mots-clés exacts sur lesquels Kévin cherche.

### 2.3 URLs — Audit

| URL | Structure | Problème |
|---|---|---|
| `/nos-biens` | Courte, descriptive | OK |
| `/vendre` | Courte | OK — mais "vendre-son-bien" serait plus explicite |
| `/realisations` | Descriptive | OK |
| `/notre-approche` | Descriptive | OK |
| `/investir` | Ambigu — "investir" peut cibler un investisseur (Laurent) ou l'investissement locatif (Kévin) | P2 — clarifier avec contenu |
| `/blog/:slug` | Structure blog standard | OK si slug = mots-clés |
| `/nos-biens/:id` | ID numérique probable | À vérifier — idéalement `/nos-biens/appartement-3-pieces-lille-muguets` plutôt que `/nos-biens/12` |

### 2.4 Alt images — Audit

| Composant | Alt présents ? | Qualité |
|---|---|---|
| SellPage.jsx — photos équipe | Oui : "Maxime Lemoine, Co-fondateur Versi Immobilier" | Correct — nom + rôle + marque |
| ApprochePage.jsx — photos fondateurs | Oui : "{member.name}, Co-fondateur Versi Immobilier" | Correct |
| PropertyDetailPage.jsx — galerie principale | Conditionnel : `photos[0].alt \|\| property.title` | Acceptable — le alt par défaut = titre du bien |
| PropertyDetailPage.jsx — galerie thumbs | `photos[n].alt \|\| "{property.title} — photo n"` | Acceptable |
| PropertyDetailPage.jsx — placeholder "Photos bientôt disponibles" | `aria-label` sur le `div` | Correct accessibilité, pas SEO |
| BlogArticlePage.jsx — cover_image | `alt={article.title}` | Acceptable mais peu descriptif — idéalement `alt="{titre article} — Versi Immobilier"` |

**Recommandation** : les photos de réalisations et de biens devraient avoir des alt contextuels incluant le quartier et le type de bien : "Appartement T3 rénové rue des Muguets, Fives, Lille — Versi Immobilier".

### 2.5 Maillage interne — Audit

| Depuis | Vers | Type |
|---|---|---|
| Accueil | `/nos-biens` | CTA Hero principal |
| Accueil | `/vendre` | CTA secondaire Hero + SellerBanner |
| `/nos-biens` | `/vendre` | Bandeau vendeur en bas de page |
| `/nos-biens/:id` | `/contact?bien=...` | CTA fiche bien |
| `/nos-biens/:id` | Autres fiches biens | Section "D'autres biens disponibles" |
| `/vendre` | `/realisations` | Lien "Toutes nos réalisations" |
| `/vendre` | `/contact` | CTA prescripteurs |
| `/blog` | `/vendre` | Bandeau vendeur |
| `/blog/:slug` | `/blog` | Back link seulement |

**Lacunes maillage** :
1. `/blog/:slug` → `/nos-biens` : absent. Chaque article devrait pointer vers les biens disponibles via un CTA contextuel. C'est le pipeline acquéreur défini dans `vi-blog-strategy.md` — non implémenté dans le composant.
2. `/realisations` → `/nos-biens` : non visible dans le code
3. `/notre-approche` → `/nos-biens` : CTA "Voir les biens" absent
4. Aucun article de blog vers une fiche bien spécifique — maillage interne profond inexistant
5. `/nos-biens/:id` → `/blog` : absent — une fiche bien pourrait pointer vers un article "Guide acquéreur Lille" pour nurturing

---

## 3. Audit SEO Contenu — Persona acquéreur

### 3.1 Alignement global contenu / persona acquéreur (Kévin)

Le pivot acquéreur du 2026-04-10 a été partiellement intégré dans le contenu visible. Audit page par page :

**Homepage (`/`)** :

Le Hero est acquéreur : "Peu de biens. Pas d'approximation." + CTA "Voir les biens". Le bandeau SellerBanner en bas reste, en position secondaire — correct selon le pivot. La section `Arguments` et `AvailableProperties` sont acquéreur. La section `Stats` (21 appartements, 100% vendus) est neutre.

Problème : le `BlogTeaser` est présent mais probablement vide au lancement. La homepage présente des composants vides qui dégradent l'expérience.

Verdict homepage contenu : **7/10** — bien aligné acquéreur, mais H1 sans mots-clés.

**Page `/nos-biens`** :

Contenu acquéreur. Les filtres (type, localisation, budget) répondent à l'intention de navigation de Kévin. Le texte d'en-tête mentionne "Hauts-de-France et Île-de-France" et "diagnostics, historique, garanties" — signal de réassurance acquéreur pertinent. Le bandeau vendeur en bas est discret et secondaire.

Point positif : la gestion de l'état "aucun bien" redirige vers un CTA de notification avant mise en ligne — bonne pratique acquéreur.

Verdict `/nos-biens` : **7/10** — bon fond, H1 sans mots-clés, pas de meta tag dédié.

**Fiches biens (`/nos-biens/:id`)** :

PropertyDetailPage.jsx présente : galerie, specs (type, surface, pièces, DPE, étage, disponibilité), description, travaux réalisés, emplacement, charges, price card avec CTA "Demander une présentation". La double tarification "avant travaux / prêt à habiter" est une fonctionnalité acquéreur pertinente.

Lacunes SEO critiques :
- Le `<title>` côté serveur est celui de l'index (voir P0-2)
- Pas de schema `RealEstateListing` ou `Product` — opportunité de rich snippet manquée
- L'alt de la photo principale est `property.title` — fonctionnel mais pas optimisé pour le local SEO

**Page `/vendre`** :

Page Sophie-centric — correct. H1 "Vous cédez un bien. Offre ferme en 7 jours." = exact-match requête vendeur. FAQ vendeur bien structurée avec `aria-expanded`. Section prescripteurs (Pierre, agents/notaires/courtiers) — bonus.

Un seul point de friction acquéreur : le bandeau final de la page blog renvoie vers `/vendre` (voir BlogPage.jsx) — si Kévin arrive par un article blog, il est renvoyé vers un CTA vendeur. Problème de persona croisé.

**Page `/investir`** :

Page quasi-vide renvoyant vers versi-invest.fr. Contenu minimal ("Acquisition, transformation, structuration"). Cette page existe dans la navigation mais n'est pas dans la nav principale (`NAV_ITEMS` dans Nav.jsx). Elle est accessible directement mais absente des liens visibles.

Problème de cohérence : "Investir" comme concept peut attirer Kévin en mode investisseur locatif — la page l'envoie vers un autre site sans explication adaptée à son profil.

### 3.2 Couverture sémantique — Termes manquants côté acquéreur

Termes clés Kévin absents ou sous-représentés dans le contenu statique visible :

| Terme | Importance | Présence actuelle | Action |
|---|---|---|---|
| "appartement rénové Lille" | Forte | Absent des H1/H2 | À intégrer dans H1 `/nos-biens` + titre fiches |
| "achat immobilier Hauts-de-France" | Forte | Mentionné en texte courant seulement | À intégrer H2 + meta |
| "primo-accédant Lille" | Moyenne | Absent | À intégrer dans blog + filtres |
| "bien rénové sans travaux" | Forte | Concept présent ("prêt à habiter") mais pas en mots-clés | À intégrer dans titres |
| "garanties marchand de biens" | Forte | Absent des pages statiques (présent dans vi-blog-strategy.md) | À intégrer dans `/notre-approche` + FAQ schema |
| "DPE appartement Lille" | Moyenne | Affiché en specs mais pas en contenu éditorial | À traiter en blog |
| "précommercialisation Lille" | Forte (niche, quasi zéro concurrence) | Absent | Opportunité unique à saisir |
| "marchand de biens Hauts-de-France" | Forte | Présent dans llms.txt, absent des pages visibles | À intégrer dans H1 homepage ou sous-titre |

### 3.3 Cohérence FAQPage schema — Persona acquéreur

5 questions actuelles dans le JSON-LD FAQPage : 2 vendeur, 3 neutres, 0 acquéreur.

Questions à ajouter pour Kévin (rich snippets Google + signal GEO) :

1. "Quelles garanties offre un marchand de biens à l'acheteur ?" → Réponse : garantie décennale sur les travaux, DPE certifié, dossier technique complet avant visite. Pas de vices cachés non déclarés.
2. "Comment visiter un bien proposé par Versi Immobilier ?" → Réponse : demande de présentation via le formulaire, visite planifiée sous 48h avec un fondateur.
3. "Les appartements Versi Immobilier sont-ils rénovés avant la vente ?" → Réponse : oui, rénovation complète ou option "avant travaux" à prix réduit selon le bien.
4. "Peut-on acheter un bien Versi Immobilier en précommercialisation ?" → Réponse : oui, certains biens sont proposés avant la fin des travaux. Contacter via le formulaire pour être alerté.

---

## 4. Audit Stratégie Blog

### 4.1 Évaluation de vi-blog-strategy.md

**Note globale : 7/10** — stratégie solide, implémentation à concrétiser.

Points forts :
- Argumentaire acquéreur bien fondé : le persona Kévin est en phase de recherche informationnelle → intention de blog correctement identifiée
- Les 4 piliers éditoriaux sont cohérents avec le topical authority search : Opérateur expliqué + Réalisations + Guide Lille + Décryptage
- Alignement blog → pages transactionnelles documenté (articles → fiches biens via CTA)
- E-E-A-T : le pilier "Réalisations" comme contenu first-hand est la meilleure pratique pour le secteur immobilier YMYL

Lacunes identifiées :
1. **Pas de topical map formalisée** : `vi-blog-strategy.md` liste des articles mais ne formalise pas l'arborescence pilier → cluster → article avec maillage bidirectionnel. Le livrable `docs/seo/topical-map.md` est absent.
2. **Calendrier éditorial absent** : l'article mentionne "10 articles cibles" mais ne produit pas de calendrier perpétuel avec workflow d'automatisation. La règle CLAUDE.md s'applique : "si un blog est recommandé, produire un pipeline de génération automatisée (templates, prompts, workflow)." Ce pipeline n'est pas documenté.
3. **Pipeline de génération IA non documenté** : aucun prompt de génération, aucun template d'article, aucun endpoint `/api/blog/generate` spécifié pour @fullstack.
4. **Fréquence non justifiée** : le nombre d'articles cibles (10) est cité sans fréquence de publication ni justification SEO (combien de semaines pour atteindre la masse critique ?).

### 4.2 Évaluation de vi-blog-keyword-research.md

**Note globale : 7/10** — honnête sur les limites des données, analyses SERP utiles.

Points forts :
- Transparence sur l'absence d'accès aux outils de volume (règle n°2 respectée)
- Analyse SERP qualitative concrète avec 8 résultats analysés par requête
- Identification correcte des lacunes concurrentielles (angle acquéreur inexploité)

Lacunes :
- Seulement 3 requêtes analysées en détail dans la partie lue. La liste complète des 10 mots-clés n'est pas disponible dans les 80 premières lignes.
- Absence de regroupement par cluster sémantique : les requêtes sont listées individuellement sans organisation en cocons.

### 4.3 Implémentation blog — État actuel

Le blog est **techniquement implémenté** (BlogPage.jsx, BlogArticlePage.jsx, hooks `useBlogArticles`, `useBlogArticle`). Les filtres par catégorie sont en place. Le schema `BlogPosting` est généré dynamiquement.

**Problèmes d'implémentation SEO** :
1. Schema BlogPosting injecté via `useEffect` (JS client) — non crawlable par Bing
2. `document.title` injecté via JS — non crawlable par Bing
3. Pas de canonical par article — tous les articles héritent du canonical `/`
4. La page `/blog` n'est pas dans le sitemap
5. Les slugs des articles dépendent du backend (non auditables sans accès aux données)
6. Bandeau vendeur ("Vous avez un bien à céder ?") en fin de BlogPage — incohérent avec le persona acquéreur qui arrive par le blog. Kévin ne veut pas vendre un bien. Ce CTA devrait être remplacé par un CTA acquéreur : "Voir les biens disponibles".

### 4.4 Recommandations blog

**Priorité 1 — CTA de fin de BlogPage** : remplacer le bandeau vendeur par un bandeau acquéreur. → @fullstack : modifier `BlogPage.jsx`, section bandeau final, remplacer "Vous avez un bien à céder ?" par "Voir les appartements disponibles" + lien `/nos-biens`.

**Priorité 2 — CTA maillage dans les articles** : chaque article doit se terminer par un encart "Voir les biens disponibles à Lille →" pointer vers `/nos-biens`. À implémenter dans `BlogArticlePage.jsx` après le contenu, avant le footer.

**Priorité 3 — Blog dans le sitemap** : ajouter `/blog` et les slugs d'articles au sitemap.xml dès la première publication.

**Priorité 4 — Pipeline de génération** : produire le pipeline complet (templates prompts IA + workflow publication). À déléguer à une session dédiée.

---

## 5. Recommandations priorisées

### Sprint 1 — Corrections bloquantes (à faire avant toute indexation active)

**R1 — Pré-rendu SSG** *(P0 — owner : @fullstack)*

Implémenter `vite-plugin-prerender` sur les routes statiques. Routes minimales à pré-rendre :
- `/` (accueil)
- `/nos-biens`
- `/vendre`
- `/realisations`
- `/notre-approche`
- `/contact`
- `/blog`

Critère de done : `curl -s https://versi-immobilier.fr/nos-biens | grep "Les biens disponibles"` retourne le H1.

**R2 — react-helmet-async + meta tags par page** *(P0 — owner : @fullstack)*

Installer `react-helmet-async`. Injecter dans chaque page :

| Page | Title cible | Description cible |
|---|---|---|
| `/` | "Versi Immobilier — Appartements rénovés à vendre, Lille et Hauts-de-France" | "Des appartements sélectionnés, rénovés et vendus en direct par un marchand de biens. Dossier complet avant visite. Lille et Hauts-de-France." |
| `/nos-biens` | "Appartements et biens rénovés à vendre — Lille, Hauts-de-France \| Versi Immobilier" | "Grille filtrée des biens disponibles et en précommercialisation. Diagnostics inclus, visite sur demande. Prix entre 95 000 € et 350 000 €." |
| `/vendre` | "Céder un bien immobilier — Offre ferme en 7 jours \| Versi Immobilier" | "Versi Immobilier achète en direct, sans condition suspensive de financement. Offre ferme sous 7 jours ou refus motivé par écrit." |
| `/realisations` | "Réalisations — Immeubles et appartements rénovés \| Versi Immobilier" | "Chaque rénovation documentée : adresse, délais, chiffres. 3,2M€ de volume traité depuis 2022." |
| `/notre-approche` | "Comment Versi Immobilier travaille — Méthode et équipe" | "Sourcer, analyser, acquérir, transformer. Quatre étapes, zéro délégation. Les trois fondateurs gèrent chaque opération en direct." |
| `/blog` | "Blog immobilier Lille — Achat, rénovation, marché \| Versi Immobilier" | "Guides pratiques pour acheter à Lille : marché, prix au m², garanties d'un marchand de biens, financement. Rédigés par l'équipe Versi." |
| `/blog/:slug` | `{article.title} — Versi Immobilier` | `{article.excerpt}` |
| `/nos-biens/:id` | `{property.title} — {property.city} \| Versi Immobilier` | `{type}, {surface}, {price}. {description courte}. Visite sur demande.` |

Critère de done : `curl -s https://versi-immobilier.fr/nos-biens | grep "<title>"` retourne le bon title.

**R3 — Canonical par route** *(P0 — owner : @fullstack)*

Via react-helmet-async : `<link rel="canonical" href="https://versi-immobilier.fr{pathname}" />` dans chaque page. Critère de done : canonical de `/nos-biens` = `https://versi-immobilier.fr/nos-biens`.

### Sprint 2 — Optimisations on-page

**R4 — H1 `/nos-biens` avec mots-clés** *(P1 — owner : @fullstack)*

Remplacer "Les biens disponibles." par "Appartements et biens rénovés à vendre — Lille et Hauts-de-France". Critère : H1 contient "Lille" + "rénovés" + "vendre".

**R5 — Sitemap.xml mise à jour** *(P1 — owner : @fullstack)*

Ajouter : `/blog` (changefreq weekly, priority 0.8), modifier `/vendre` en priority 0.7, aligner `/nos-biens` en priority 1.0.
Pour les fiches biens et articles : générer dynamiquement au build ou via un script CI.

**R6 — FAQPage schema — Questions acquéreur** *(P1 — owner : @fullstack)*

Ajouter dans `index.html` les 4 questions acquéreur définies en section 3.3. Ne pas supprimer les questions existantes — les compléter.

**R7 — Schema LocalBusiness + adresse Lille** *(P1 — owner : @fullstack)*

Ajouter dans le JSON-LD Organization :
```json
"address": {
  "@type": "PostalAddress",
  "addressLocality": "Lille",
  "addressRegion": "Hauts-de-France",
  "addressCountry": "FR"
}
```

**R8 — CTA blog → nos-biens** *(P1 — owner : @fullstack)*

Modifier `BlogPage.jsx` : remplacer le bandeau vendeur par "Voir les appartements disponibles → /nos-biens".
Modifier `BlogArticlePage.jsx` : ajouter un encart CTA après le contenu de l'article.

### Sprint 3 — Signaux Bing et performance

**R9 — IndexNow** *(P2 — owner : @fullstack)*

Implémenter un webhook ou script CI qui envoie une requête IndexNow vers Bing à chaque déploiement. Endpoint : `https://www.bing.com/IndexNow`. Clé à générer sur Bing Webmaster Tools.

**R10 — Core Web Vitals** *(P2 — owner : @fullstack)*

- `<link rel="preload" as="font">` pour PP Neue Montreal dans index.html
- `width` et `height` explicites sur les images de galerie (`PropertyDetailPage.jsx`)
- Mesurer LCP sur mobile avec Lighthouse CI dans le pipeline

**R11 — Pipeline blog automatisé** *(P2 — owner : @seo dans une session dédiée)*

Produire `docs/seo/blog-pipeline.md` : templates d'articles par pilier, prompts IA calibrés sur vi-brand-voice-adaptation.md, workflow de publication, fréquence recommandée (1 article/semaine minimum pour atteindre la masse critique en 3 mois).

**R12 — noindex `/investir`** *(P2 — owner : @fullstack)*

La page `/investir` est quasi-vide et renvoie vers un autre domaine. Elle doit recevoir une balise `<meta name="robots" content="noindex, follow">` pour ne pas diluer l'autorité du domaine.

---

## 6. Vérification persona — Acquéreur vs Investisseur holding

[SECTION À REMPLIR]

---

## Handoff → @fullstack

[SECTION À REMPLIR]
