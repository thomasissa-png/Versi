# Stratégie SEO — Versi Invest (versi-invest.fr)

> Agent : @seo | Date : 2026-04-14
> Référence : docs/seo/seo-strategy.md (versi.fr), docs/product/vi2-functional-specs.md

---

## 1. Contexte et objectifs

**Domaine** : versi-invest.fr (neuf, aucun historique SEO)
**Objectif SEO** : apparaître sur les requêtes investissement locatif accompagné en Hauts-de-France et IDF
**KPI SEO** : trafic organique → inscriptions qualifiées (conversion formulaire)
**Contrainte** : SPA React — nécessite prerender pour l'indexation

---

## 2. Audit technique SPA

### 2.1 Architecture existante

- React 19 + Vite 8 + React Router 7
- react-helmet-async : PageHead par page (title, description, canonical)
- Serveur Express : SPA fallback (toutes les routes renvoient index.html)

### 2.2 Actions techniques requises

| # | Action | Priorité | Statut |
|---|--------|----------|--------|
| T1 | PageHead avec title ≤ 60 chars + desc ≤ 155 chars sur CHAQUE page | P0 | À vérifier |
| T2 | Canonical dynamique : `https://versi-invest.fr${pathname}` | P0 | À implémenter |
| T3 | robots.txt (Allow: /, Disallow: /api/, Sitemap) | P0 | À créer |
| T4 | sitemap.xml (10 routes statiques) | P0 | À créer |
| T5 | Prerender Playwright (même script que versi-immobilier) | P1 | À adapter |
| T6 | og:image spécifique Versi Invest (1200×630) | P1 | À créer |
| T7 | favicon multi-résolution (16/32/48/64) | P1 | À créer |
| T8 | llms.txt pour crawlers IA | P2 | À créer |

### 2.3 Règle SEO/UX (learning versi-s8)

**SEO dans les meta tags invisibles (PageHead), UX dans les H1 visibles.**
Les agents @seo et @geo n'ont PAS le droit de modifier les H1 ni le copy visible. Le SEO passe par les meta tags, pas par le contenu.

---

## 3. Mots-clés cibles

### 3.1 Mots-clés primaires

| Mot-clé | Volume estimé | Difficulté | Page cible | Intention |
|---------|---------------|------------|------------|-----------|
| investissement locatif accompagné | 500-1000/mois | Moyenne | Accueil | Transactionnelle |
| investissement immobilier Lille | 1000-2000/mois | Élevée | Accueil / Blog | Informationnelle |
| cashflow positif immobilier | 300-800/mois | Faible | Simulateur | Informationnelle |
| accompagnement investissement locatif | 200-500/mois | Moyenne | Services | Transactionnelle |
| simulateur rendement locatif | 500-1500/mois | Moyenne | Simulateur | Outil |

### 3.2 Mots-clés secondaires

| Mot-clé | Volume estimé | Page cible |
|---------|---------------|------------|
| rendement locatif 8% | 100-300/mois | Références |
| bien off-market investissement | 100-200/mois | Comment ça marche |
| investir immobilier Hauts-de-France | 200-500/mois | Blog |
| immeuble de rapport rendement | 300-800/mois | Références / Blog |
| marchand de biens investissement | 100-300/mois | Comment ça marche |

### 3.3 Longue traîne

| Mot-clé | Page cible |
|---------|------------|
| comment investir immobilier locatif sans temps | Blog |
| investissement locatif autofinancé 2026 | Simulateur / Blog |
| accompagnement achat immeuble rapport Lille | Services |
| calcul cashflow net immobilier locatif | Simulateur |
| investir immobilier off-market France | Comment ça marche |

---

## 4. Métadonnées par page

| Page | Title (≤ 60 chars) | Description (≤ 155 chars) |
|------|--------------------|---------------------------|
| Accueil | Versi Invest — Investissement locatif accompagné | Biens off-market qui s'autofinancent. Rendement 8%+ ciblé. Fondateurs en direct, de A à Z. Inscrivez-vous. |
| Comment ça marche | Comment investir avec Versi Invest | Sourcing off-market, visite accompagnée, simulation financière, financement, travaux, mise en location. 6 étapes. |
| Services | Nos services — Versi Invest | Sourcing, visite, simulation, financement, travaux, location. 5% d'honoraires côté investisseur. Zéro côté vendeur. |
| Simulateur | Simulateur rendement locatif — Versi Invest | Calculez cashflow net, rendement brut et net, effort d'épargne. Scénario nominal et prudent. Gratuit. |
| Références | Références investissement — Versi Invest | Immeubles de rapport, maisons divisées : rendement, cashflow, montage. Cas réels anonymisés. |
| Équipe | L'équipe Versi Invest | 3 co-fondateurs, Groupe Versi. 21 appartements rénovés, 3,2M€ de volume opéré. |
| Contact | S'inscrire — Versi Invest | Rejoignez la liste d'attente. Un fondateur vous recontacte sous 48h pour un premier échange. |
| Blog | Blog investissement locatif — Versi Invest | Rendement, cashflow, zones Hauts-de-France et IDF. Analyses terrain par les fondateurs. |
| Mentions légales | Mentions légales — Versi Invest | Informations légales du site versi-invest.fr. Éditeur, hébergeur, droits. |
| Politique confidentialité | Politique de confidentialité — Versi Invest | Traitement des données personnelles, droits RGPD, cookies, analytics Umami. |

---

## 5. Schema.org

### 5.1 Organization (index.html — global)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Versi Invest",
  "url": "https://versi-invest.fr",
  "logo": "https://versi-invest.fr/og-image.png",
  "description": "Accompagnement à l'investissement immobilier locatif. Biens off-market, simulation financière, suivi fondateur de A à Z.",
  "parentOrganization": {
    "@type": "Organization",
    "name": "Groupe Versi",
    "url": "https://versi.fr"
  },
  "sameAs": [
    "https://versi.fr",
    "https://versi-immobilier.fr"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "contact@versi.fr",
    "contactType": "customer service"
  }
}
```

### 5.2 FAQPage (page Simulateur ou Process)

5-8 questions investisseur :
- "Quel rendement attendre d'un investissement locatif ?"
- "Qu'est-ce qu'un bien off-market ?"
- "Combien coûte l'accompagnement Versi Invest ?"
- "Faut-il un apport pour investir ?"
- "Qu'est-ce que le cashflow positif ?"

### 5.3 WebSite (index.html)

SearchAction pour le blog (si applicable).

---

## 6. Blog SEO

### 6.1 Stratégie mots-clés blog

3 articles V1 → ciblage longue traîne :
1. "Rendement locatif : brut, net, net-net" → "calcul rendement locatif"
2. "Cashflow positif : mythe ou réalité en 2026 ?" → "cashflow positif immobilier"
3. "Investir dans les Hauts-de-France" → "investir immobilier Hauts-de-France"

### 6.2 Maillage interne

- Chaque article → lien vers /simulateur (outil)
- Chaque article → lien vers /contact (CTA inscription)
- Homepage → lien vers les 3 derniers articles
- Articles entre eux (maillage sémantique)

---

## 7. Fichiers techniques à produire

| Fichier | Contenu |
|---------|---------|
| `public/robots.txt` | User-agent: *, Allow: /, Disallow: /api/, Sitemap: https://versi-invest.fr/sitemap.xml |
| `public/sitemap.xml` | 10 URLs (accueil, process, services, simulateur, references, equipe, contact, blog, mentions-legales, politique-confidentialite) |
| `public/llms.txt` | Description structurée pour crawlers IA |
| `public/og-image.png` | Image OG 1200×630 spécifique Versi Invest |

---

**Handoff → @fullstack**
- Fichiers produits : `docs/seo/vi2-seo-strategy.md`
- Décisions prises : 15 mots-clés ciblés, meta tags par page, Schema.org Organization + FAQPage, prerender requis
- Points d'attention :
  - Implémenter les PageHead avec les titles/descriptions EXACTES du tableau section 4
  - Créer robots.txt + sitemap.xml + llms.txt dans public/
  - Ajouter Schema.org Organization dans index.html (JSON-LD)
  - Prerender les 10 routes statiques via Playwright (même script que versi-immobilier)
  - NE PAS modifier les H1 visibles pour le SEO (learning versi-s8)
