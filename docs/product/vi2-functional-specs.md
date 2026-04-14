# Spécifications fonctionnelles — Versi Invest (versi-invest.fr)

> Agent : @product-manager | Date : 2026-04-14
> Référence : versi-invest/project-context.md, docs/strategy/vi2-brand-platform.md, docs/strategy/vi2-personas.md
> Persona principal : Nicolas, 41 ans, directeur commercial ETI Lille — apport 60-80k€

---

## 1. Vue d'ensemble

**Type** : site vitrine multi-pages + simulateur + formulaire de qualification
**Pages** : 9 pages + 2 pages légales
**Stack** : React 19 + Vite 8 + React Router 7 + Express + PostgreSQL Replit
**Design system** : PP Neue Montreal, tokens charcoal/calcaire/accent (partagés groupe Versi)
**Email** : contact@versi.fr (unique pour tout le groupe)
**Analytics** : Umami

**Navigation sticky** : Accueil | Comment ça marche | Services | Simulateur | Références | Équipe | Contact
**CTA permanent** : "S'inscrire"
**Footer** : liens pages, lien versi.fr, mentions légales, politique confidentialité, "Une entité du Groupe Versi"
**Hero pattern** : fade global 300ms ease-out (préférence fondateur validée)

---

## 2. Spécifications page par page

### 2.1 Accueil (HomePage)

**Hero** :
- Titre : promesse principale (cashflow + autofinancement)
- Sous-titre : positionnement (off-market + fondateurs en direct)
- CTA principal : "S'inscrire sur la liste d'attente"
- Animation : fade global 300ms

**Section Références teaser** :
- Affiche 3 des 5 immeubles de référence (placeholders V1)
- Chaque carte : ville, type, nb lots, rendement brut, cashflow net/mois
- CTA : "Voir toutes nos références"
- INTERDIT : prix d'achat, marge, montant travaux

**Section Simulateur teaser** :
- 2 champs : prix d'acquisition + apport personnel
- Résultat rapide : cashflow estimé, rendement brut
- CTA : "Simuler en détail"

**Section Process** :
- 6 étapes visuelles : Sourcing → Visite → Simulation → Financement → Travaux → Location
- Chaque étape : icône + titre + description 1 ligne

**Section Confiance** :
- "Groupe Versi — 21 appartements rénovés, 3,2M€ de volume opéré"
- Lien vers versi.fr

**5 états UI** : défaut (contenu complet) | loading (skeleton cards) | vide (N/A — contenu statique) | erreur (N/A) | succès (N/A)

---

### 2.2 Comment ça marche (ProcessPage)

6 étapes détaillées :

| # | Étape | Description | Inclus | Durée estimée |
|---|-------|-------------|--------|---------------|
| 1 | Sourcing off-market | Identification de biens via le réseau Versi Immobilier | Recherche, analyse préliminaire, présélection | 2-4 semaines |
| 2 | Visite accompagnée | Visite physique avec un fondateur | Déplacement, analyse sur site, photos, rapport de visite | 1 journée |
| 3 | Simulation financière | Projection complète rendement/cashflow | Calcul détaillé, scénario nominal + prudent, document PDF | 2-3 jours |
| 4 | Accompagnement financement | Mise en relation courtier + optimisation montage | Dossier bancaire, comparatif offres, choix structure (SCI/nom propre) | 3-6 semaines |
| 5 | Pilotage travaux | Suivi de la rénovation si applicable | Sélection artisans, suivi chantier, réception travaux | 2-4 mois |
| 6 | Mise en location | Recherche locataire + juridique baux | Publication annonce, visites locataires, rédaction bail, état des lieux | 2-4 semaines |

**5 états UI** : défaut uniquement (page statique)

---

### 2.3 Nos services (ServicesPage)

6 volets détaillés :

**Volet 1 — Sourcing off-market** :
- Description : accès prioritaire aux biens identifiés par Versi Immobilier, non disponibles sur les portails publics
- Inclus : recherche, analyse financière préliminaire, présélection sur critères investisseur
- Non inclus : sourcing sur portails publics (SeLoger, LeBonCoin)
- Bénéfice Nicolas : ne perd pas 10h/semaine à chercher sur les portails

**Volet 2 — Visite accompagnée** :
- Description : visite physique systématique avec un fondateur Versi
- Inclus : déplacement, analyse technique du bien, estimation travaux, rapport de visite
- Non inclus : contre-visite avec l'architecte (si nécessaire, sur devis)
- Bénéfice Nicolas : un expert sur place, pas juste des photos

**Volet 3 — Simulation financière** :
- Description : projection complète avec tous les postes de charges
- Inclus : calcul rendement brut/net, cashflow mensuel, scénario nominal + prudent, effort d'épargne
- Non inclus : conseil fiscal personnalisé (orientation vers expert-comptable)
- Bénéfice Nicolas : les vrais chiffres, pas une plaquette marketing

**Volet 4 — Accompagnement financement** :
- Description : accompagnement dans le montage financier
- Inclus : mise en relation courtier partenaire, optimisation structuration (SCI IS/IR, nom propre), comparatif offres bancaires
- Non inclus : courtage direct (Versi Invest n'est pas IOBSP)
- Bénéfice Nicolas : le bon montage dès le départ

**Volet 5 — Pilotage travaux** :
- Description : suivi de la rénovation par un fondateur
- Inclus : sélection artisans (réseau Versi Immobilier), suivi chantier, réception travaux
- Non inclus : maîtrise d'oeuvre (si projet complexe, orientation vers architecte)
- Bénéfice Nicolas : qualité de rénovation Versi, pas un artisan trouvé sur Google

**Volet 6 — Mise en location + juridique** :
- Description : recherche locataire et mise en place juridique
- Inclus : publication annonce, visites, rédaction bail, état des lieux d'entrée, choix assurance loyers impayés
- Non inclus : gestion locative courante (possible en V2)
- Bénéfice Nicolas : le bien rapporte dès le premier mois

**Honoraires** : mention visible "5% du prix d'acquisition, facturés à l'investisseur. Zéro côté vendeur. Inscrits dans le mandat de recherche."

**5 états UI** : défaut uniquement (page statique)

---

### 2.4 Simulateur (SimulateurPage)

**Inputs** :

| Champ | Type | Défaut | Validation |
|-------|------|--------|------------|
| Prix d'acquisition (€) | number | vide | requis, > 0 |
| Apport personnel (€) | number | vide | requis, >= 0 |
| Taux d'emprunt (%) | number | 3.50 | > 0, < 15 |
| Durée emprunt | select | 20 ans | 15 / 20 / 25 ans |
| Loyer mensuel estimé (€) | number | vide | requis, > 0 |
| Charges copropriété (€/mois) | number | 0 | >= 0 |
| Taxe foncière (€/an) | number | 0 | >= 0 |
| Taux de vacance (%) | number | 8 | 0-100 |

**Formules de calcul** :

```
honoraires = prix × 0.05
montant_emprunte = prix - apport + honoraires
taux_mensuel = taux_emprunt / 100 / 12
mensualite = montant_emprunte × taux_mensuel / (1 - (1 + taux_mensuel)^(-duree × 12))
loyer_net_mois = loyer × (1 - vacance/100) - charges_copro - (taxe_fonciere / 12)
cashflow_brut = loyer - mensualite
cashflow_net = loyer_net_mois - mensualite
rendement_brut = (loyer × 12) / prix × 100
rendement_net = (loyer_net_mois × 12) / prix × 100
effort_epargne = max(0, -cashflow_net)
```

**Outputs affichés** :

| Métrique | Format |
|----------|--------|
| Mensualité crédit | €/mois |
| Cashflow brut | €/mois (vert si > 0, rouge si < 0) |
| Cashflow net | €/mois (vert si > 0, rouge si < 0) |
| Rendement brut | % |
| Rendement net | % |
| Effort d'épargne mensuel | €/mois (affiché si cashflow net < 0) |

**Scénario prudent** : bouton "Voir le scénario prudent" → recalcul avec charges +15% et vacance +1 mois/an (vacance_prudent = vacance + 8.33)

**Disclaimer** (obligatoire, visible, non masquable) :
> "Simulation indicative et non contractuelle. Les résultats ne constituent pas un conseil en investissement. Les performances passées ne préjugent pas des performances futures. Chaque projet fait l'objet d'une analyse personnalisée."

**CTA** : "Ces chiffres vous intéressent ? Inscrivez-vous pour accéder à nos opportunités off-market."

**5 états UI** : défaut (formulaire vide) | loading (calcul en cours — instantané côté client) | vide (N/A) | erreur (champs invalides — messages inline) | succès (résultats affichés avec animations)

---

### 2.5 Références (ReferencesPage)

**Grille de 5 immeubles** (placeholders V1 — données réelles uploadées par Thomas plus tard)

**Structure de chaque référence** :

| Champ | Type | Exemple placeholder |
|-------|------|---------------------|
| Localisation | ville + département | "Lille (59)" |
| Type | texte | "Immeuble de rapport" |
| Nombre de lots | number | 4 |
| Rendement brut | % | "8.7%" |
| Cashflow mensuel net | €/mois | "+340€/mois" |
| Montage | texte | "SCI à l'IS" |
| Année | number | 2024 |
| Description | texte anonymisé | "Immeuble 4 lots, Hauts-de-France, rénové intégralement..." |

**RÈGLES ABSOLUES** :
- JAMAIS de prix d'achat, marge brute/nette, montant travaux, rendement sur fonds propres, ROI, plus-value (décision fondateur — cf. docs/qa/reference-gates.md)
- JAMAIS de noms fictifs comme faux témoignages — cas d'étude anonymisés uniquement
- Les images seront ajoutées par Thomas via upload direct (pas de placeholder image identique)

**5 états UI** : défaut (grille peuplée) | loading (skeleton cards) | vide ("Nos références arrivent bientôt. Inscrivez-vous pour être informé.") | erreur (message générique) | succès (grille affichée)

---

### 2.6 Équipe (EquipePage)

- 3 co-fondateurs dans cet ordre : Maxime Lemoine, Thomas Issa, Carl Standertskjold-Nordenstam
- Titre affiché : "Co-fondateur" pour les 3. AUCUN rôle spécifique (CEO, COO, etc.)
- Pour chaque fondateur : photo, nom, titre, bio courte (2-3 phrases), lien LinkedIn
- Photos : mêmes assets que versi.fr et versi-immobilier.fr (src/assets/team/)

**Section "Le Groupe Versi"** :
- "Versi Invest est une entité du Groupe Versi — holding immobilière intégrée."
- Chiffres : "21 appartements rénovés — 3,2M€ de volume opéré"
- CTA : lien vers versi.fr

**5 états UI** : défaut uniquement (page statique)

---

### 2.7 Contact / Liste d'attente (ContactPage)

**Formulaire de qualification investisseur** :

| Champ | Type | Requis | Options |
|-------|------|--------|---------|
| Nom | text | oui | — |
| Email | email | oui | — |
| Téléphone | tel | oui | — |
| Budget estimé | select | oui | < 100k€ / 100-200k€ / 200-500k€ / 500k€+ |
| Zone de sourcing souhaitée | select | oui | Hauts-de-France / Île-de-France / Autre (les investisseurs peuvent résider partout en France — ce champ concerne la zone où ils souhaitent investir) |
| Premier investissement ? | radio | oui | Oui / Non |
| Message | textarea | non | — |
| Consentement RGPD | checkbox (non pré-cochée) | oui | "J'accepte que mes données soient utilisées pour me recontacter dans le cadre de mon projet d'investissement. Voir notre [politique de confidentialité]." |

**Stockage** : table PostgreSQL `waitlist_entries`

```sql
CREATE TABLE waitlist_entries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  budget VARCHAR(50) NOT NULL,
  zone VARCHAR(100) NOT NULL,
  first_investment BOOLEAN NOT NULL,
  message TEXT,
  consent BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Notification** : email à contact@versi.fr à chaque nouvelle inscription (via nodemailer ou service tiers)

**Message de confirmation** : "Inscription confirmée. Merci pour votre intérêt. Un fondateur Versi Invest vous recontactera sous 48h pour un premier échange."

**5 états UI** : défaut (formulaire vide) | loading (envoi en cours — spinner sur CTA) | vide (N/A) | erreur (validation inline + message global) | succès (message de confirmation vert avec checkmark)

---

### 2.8 Blog (BlogPage + BlogArticlePage)

**Structure identique au blog versi-immobilier** :
- Page liste : grille d'articles avec image, titre, extrait, date
- Page article : titre, date, auteur, contenu complet, articles suggérés

**Stockage** : table PostgreSQL `blog_articles`

```sql
CREATE TABLE blog_articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  author VARCHAR(100) DEFAULT 'Versi Invest',
  image_url VARCHAR(500),
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Articles V1 (seed)** : 3 articles minimum
1. "Rendement locatif : brut, net, net-net — comment s'y retrouver ?"
2. "Cashflow positif : mythe ou réalité en 2026 ?"
3. "Investir dans les Hauts-de-France : les zones à surveiller"

**5 états UI** : défaut (grille articles) | loading (skeleton) | vide ("Articles à venir. Inscrivez-vous pour être informé.") | erreur (fetch fail — message retry) | succès (articles affichés)

---

### 2.9 Pages légales

**Mentions légales** (MentionsLegalesPage) :
- Contenu : docs/legal/vi2-mentions-legales-draft.md
- Les champs [À REMPLIR PAR LE FONDATEUR] peuvent être masqués ou affichés en mode draft

**Politique de confidentialité** (PolitiqueConfidentialitePage) :
- Contenu : docs/legal/vi2-privacy-policy.md

---

## 3. User Stories prioritaires

### US-01 — Inscription liste d'attente
**Given** Nicolas est sur la page Contact
**When** il remplit tous les champs requis et clique "S'inscrire"
**Then** ses données sont stockées en BDD avec timestamp, il voit le message de confirmation, un email notification est envoyé à contact@versi.fr

### US-02 — Simulation rendement
**Given** Nicolas est sur la page Simulateur
**When** il saisit les paramètres de son projet (prix, apport, loyer, charges)
**Then** il voit instantanément : mensualité, cashflow brut/net, rendement brut/net, effort d'épargne. Un bouton propose le scénario prudent (+15% charges, +1 mois vacance).

### US-03 — Consultation références
**Given** Nicolas consulte la page Références
**When** il parcourt les 5 immeubles
**Then** il voit rendement, cashflow, nb lots, montage, description anonymisée — mais JAMAIS le prix d'achat ni la marge

### US-04 — Parcours de découverte
**Given** Nicolas arrive sur la homepage depuis LinkedIn
**When** il scrolle la page d'accueil
**Then** en 5 secondes il comprend : ce que fait Versi Invest, pourquoi c'est crédible (track record), comment s'inscrire (CTA)

### US-05 — Blog
**Given** Nicolas cherche des infos sur l'investissement locatif Lille
**When** il consulte le blog via Google ou navigation directe
**Then** il trouve des articles terrain et factuels qui renforcent la crédibilité de Versi Invest

### US-06 — Simulateur teaser homepage
**Given** Nicolas est sur la homepage
**When** il entre un prix et un apport dans le simulateur teaser
**Then** il voit un résultat rapide et un CTA vers le simulateur complet

### US-07 — Navigation prescripteur
**Given** Pierre (courtier) consulte le site pour évaluer Versi Invest
**When** il parcourt Références + Équipe + Comment ça marche
**Then** il trouve des preuves de crédibilité suffisantes pour recommander à ses clients

---

## 4. Éléments transversaux

- **Responsive** : mobile-first, breakpoints 375px / 768px / 1280px
- **Favicon** : multi-résolution 16/32/48/64 (cf. pattern versi-immobilier)
- **OG image** : og-image.png spécifique Versi Invest
- **robots.txt + sitemap.xml** : générés automatiquement
- **llms.txt** : fichier pour visibilité IA (cf. pattern versi-immobilier)
- **react-helmet-async** : PageHead par page (title ≤ 60 chars, description ≤ 155 chars)
- **Prerender** : script Playwright pour les routes statiques (SEO SPA)
- **ScrollToTop** : composant pour reset scroll sur navigation

---

## 5. Hors scope V1

- Espace client / dashboard investisseur
- Back office CRUD biens (les références sont en seed/config)
- Gestion locative
- Paiement en ligne / signature électronique
- Estimation IA de rendement
- CRM intégré
- Notifications push

---

## Hypothèses à valider

- [HYPOTHÈSE : le taux d'emprunt par défaut de 3.50% sera mis à jour manuellement — pas de feed automatique]
- [HYPOTHÈSE : les 5 références sont en seed JS, pas en BDD admin — Thomas les mettra à jour via le code ou un futur back office]
- [HYPOTHÈSE : le blog utilise la même structure BDD que versi-immobilier mais avec une table séparée]

---

**Handoff → @fullstack + @ux + @design**
- Fichiers produits : `docs/product/vi2-functional-specs.md`
- Décisions prises : simulateur côté client (pas de backend), formules de calcul documentées, 5 références en placeholder, formulaire 8 champs + RGPD, blog en BDD
- Points d'attention :
  - Disclaimer simulateur OBLIGATOIRE et non masquable (cf. docs/legal/vi2-legal-audit.md)
  - Checkbox RGPD non pré-cochée (bloquant mise en ligne)
  - Aucun prix d'achat/marge dans les références (décision fondateur)
  - contact@versi.fr partout (jamais d'autre adresse)
  - Ordre fondateurs : Maxime → Thomas → Carl
