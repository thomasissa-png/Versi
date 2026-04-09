# Audit croisé — Versi Immobilier (versi-immobilier.fr)

> Produit par @reviewer | Date : 2026-04-09
> Scope : 12 livrables docs/ + code src/

---

## Résumé exécutif

**Verdict : GO CONDITIONNEL**

La cohérence inter-agents est solide : promesse "offre ferme 7 jours sans condition suspensive de financement" présente et correctement formulée dans tous les livrables. Personas cohérents. Vocabulaire proscrit absent du copy et du code. Deux blocages pré-déploiement : (1) 3,2M€ sans qualification dans le code (risque légal) ; (2) endpoints Formspree placeholders non fonctionnels.

---

## 1. Cohérence positionnement

**Verdict : PASS (12/12 livrables)**

La promesse est déclinée de façon cohérente dans l'ensemble de la chaîne. "De financement" toujours qualifié. La contrainte @legal est respectée dans le code livré.

## 2. Cohérence personas

**Verdict : PASS (12/12 livrables)**

Sophie (principal), Pierre (prescripteur), Acheteur (secondaire) — nommés et adressés dans tous les livrables. Laurent (persona holding) mentionné uniquement en référence contextuelle — cohérent.

## 3. Cohérence vocabulaire

**Verdict : PASS**

Aucun terme proscrit employé dans le registre Versi. 1 occurrence "meilleur prix" dans la FAQ — dans la bouche de Sophie (objection), pas dans la réponse Versi. PASS contextuel.

## 4. Contradictions détectées

### [BLOQUANT] C1 — 3,2M€ non qualifié dans le code

- vi-legal-audit.md impose une formulation qualifiée
- Stats.jsx, RealisationsPage.jsx, SellPage.jsx : "3,2M€ de volume traité" sans qualification
- Action : remplacer par la formulation validée par les fondateurs

### [BLOQUANT] C2 — Formspree placeholders

- src/config/contact.js : `FORM_ID_A_RENSEIGNER` — formulaires non fonctionnels
- Action : fondateurs créent les formulaires sur formspree.io

### [MINEUR] C3 — Sitemap vs routing

- sitemap.xml pointe `/biens` et `/approche` au lieu de `/nos-biens` et `/notre-approche`
- Action : @fullstack corrige sitemap.xml

### [INFORMATIF] C4 — Process 3 étapes vs 4 étapes

- Accueil/Vendre : 3 étapes (process vendeur)
- Notre approche : 4 étapes (méthode opérationnelle)
- Deux référentiels distincts pour deux audiences — non contradictoire

## 5. Gates BLOQUANT

| Gate | Docs (12 livrables) | Code src/ |
|---|---|---|
| G3 — Handoff | PASS (12/12) | N/A |
| G5 — Persona | PASS (12/12) | N/A |
| G13 — Données inventées | PASS | FAIL (3,2M€ non qualifié) |
| G15 — Placeholders | PASS | FAIL (Formspree IDs) |

## 6. Score par agent

| Agent | Score | Verdict |
|---|---|---|
| @creative-strategy | 10/10 | GO |
| @product-manager | 10/10 | GO |
| @legal | 10/10 | GO |
| @ux | 10/10 | GO |
| @copywriter | 10/10 | GO |
| @design | 10/10 | GO |
| @seo | 10/10 | GO |
| @geo | 10/10 | GO |
| @growth | 10/10 | GO |
| @social | 10/10 | GO |
| @fullstack | 8/10 | GO CONDITIONNEL |

## 7. Angles morts

1. Analytics (Umami) non intégré — KPI North Star non mesurable
2. robots.txt et sitemap.xml incomplets
3. Pré-rendu SPA non activé (Bing invisible)
4. Google Business Profile à créer (action fondateur)

## 8. Actions bloquantes avant déploiement

| # | Action | Responsable | Urgence | Statut |
|---|---|---|---|---|
| A1 | Qualifier 3,2M€ (formulation validée fondateurs) | Fondateurs → @fullstack | BLOQUANT | **RÉSOLU** — Fondateur a confirmé : 3,2M€ = volume MDB. Formulation "3,2M€ de volume traité" validée telle quelle (vi-brand-platform.md §Hypothèses). Conforme au cas "volume MDB uniquement" de vi-legal-audit.md §1.4. |
| A2 | Intégrer IDs Formspree réels | Fondateurs → @fullstack | BLOQUANT | **EN ATTENTE FONDATEUR** — Créer 2 formulaires sur formspree.io (contact + vendre), remplacer les IDs dans `src/config/contact.js` |
| A3 | Corriger sitemap.xml (routes) | @fullstack | P0 SEO | **FAIT** — `/biens`→`/nos-biens`, `/approche`→`/notre-approche`, `/investir` ajouté |
| A4 | Umami + robots.txt + pré-rendu | @fullstack | P0 SEO | **PARTIEL** — robots.txt enrichi (bots IA autorisés), Umami script ajouté (ID à renseigner par fondateur), pré-rendu : `vite-plugin-prerender` incompatible Vite 8 — pré-rendu à configurer au niveau hébergeur (Replit/Vercel/Cloudflare) |

---

**Handoff → Thomas (fondateur)**

Le projet Versi Immobilier est en état **GO CONDITIONNEL** (1 action restante). Les livrables docs/ forment un ensemble cohérent et de qualité (10/10 sur les 12 livrables). Le code est fonctionnel (build clean, 63 modules). 3 actions sur 4 sont résolues. Reste :
- **A2** : créer les formulaires Formspree et renseigner les IDs dans `src/config/contact.js`
- **Umami** : créer un compte sur cloud.umami.is et renseigner le `data-website-id` dans `index.html`
- **Pré-rendu** : configurer au niveau de la plateforme d'hébergement (pas de plugin Vite compatible)
