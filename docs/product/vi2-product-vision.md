# Vision produit — Versi Invest

> Agent : @product-manager | Date : 2026-04-14
> Référence : versi-invest/project-context.md, docs/strategy/vi2-brand-platform.md

---

## 1. Vision

Versi Invest rend l'investissement immobilier locatif rentable accessible aux particuliers qui veulent se constituer un patrimoine — sans y consacrer 10 heures par semaine.

Le site versi-invest.fr est la vitrine de crédibilité et l'entonnoir d'inscription. Il ne vend rien. Il démontre l'expertise, simule honnêtement la rentabilité, et qualifie les investisseurs sérieux pour un accompagnement fondateur de A à Z.

---

## 2. Persona cible

**Nicolas, 41 ans** — Directeur commercial dans une ETI à Lille. Propriétaire de sa RP, un studio locatif acheté au feeling. Apport disponible : 60-80k€. Veut scaler son patrimoine locatif mais n'a ni le temps (60h/semaine) ni les compétences pour analyser un immeuble de rapport.

Ce que Nicolas cherche : un interlocuteur qui lui montre les vrais chiffres et qui suit son dossier personnellement.

Ce que Nicolas fuit : les plateformes volume, les promesses de rendement, les commerciaux interchangeables.

---

## 3. KPI North Star

**Nombre d'inscriptions qualifiées sur la liste d'attente**

Un inscrit est "qualifié" s'il a rempli : nom, email, téléphone, budget, zone, premier investissement. Le simple email ne compte pas.

### Métriques secondaires

| Métrique | Cible V1 | Mesure |
|----------|----------|--------|
| Taux de conversion formulaire | > 5% des visiteurs uniques page Contact | Umami + BDD |
| Temps moyen sur simulateur | > 90 secondes | Umami events |
| Taux de rebond homepage | < 50% | Umami |
| Pages vues par session | > 3 | Umami |
| Taux de clic simulateur teaser → simulateur complet | > 20% | Umami events |

---

## 4. Scope V1 vs V2

### V1 (ce projet)
- Site vitrine multi-pages (9 pages + légales)
- Simulateur rendement/cashflow côté client
- Formulaire de qualification investisseur → PostgreSQL
- 5 références en placeholder (données réelles uploadées par Thomas)
- Blog avec 3 articles seed
- SEO + GEO de base

### V2 (futur)
- Espace client : dashboard investisseur avec suivi de son dossier
- CRM intégré : pipeline des inscrits (prospect → qualifié → en cours → clôturé)
- Estimation IA : rendement estimé par adresse + surface (API données immobilières)
- Back office CRUD références : ajout/modification des immeubles de référence
- Gestion locative : suivi des loyers, alertes impayés
- Signature électronique du mandat de recherche
- Notifications : email automatique quand une nouvelle opportunité correspond au profil

---

## 5. Risques et hypothèses

### Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Carte T pas encore obtenue | Ne peut pas facturer d'honoraires | Le site est une vitrine — les inscriptions sont possibles avant l'obtention. Mention "carte T en cours" sur le site. |
| Références en placeholder au lancement | Crédibilité réduite | Track record Groupe Versi (21 apparts, 3,2M€) compense. Thomas uploade les 5 vrais immeubles rapidement. |
| Pas de témoignages réels | Nicolas veut des preuves sociales | Cas d'étude anonymisés + chiffres vérifiables + LinkedIn fondateurs |
| Simulateur mal calibré | Promesses de rendement irréalistes | Scénario prudent systématique + disclaimer légal visible |

### Hypothèses

| Hypothèse | Comment valider |
|-----------|-----------------|
| Nicolas préfère un interlocuteur fondateur à un process automatisé | Taux de conversion formulaire > 5% + feedback qualitatif premiers inscrits |
| Le simulateur transparent est un facteur de confiance | Temps passé sur simulateur > 90s + taux de clic CTA post-simulation |
| L'off-market est un différenciateur perçu (pas juste réel) | Mentionné spontanément par les inscrits lors du premier appel |
| Le blog améliore le SEO et l'autorité perçue | Trafic organique > 30% après 3 mois |

---

**Handoff → @ux + @design**
- Fichiers produits : `docs/product/vi2-product-vision.md`, `docs/product/vi2-functional-specs.md`
- Décisions prises : KPI = inscriptions qualifiées, simulateur côté client, pas de back office V1, 5 références placeholder, blog séparé
- Points d'attention : le simulateur est le principal outil de conversion (Nicolas passe du "curieux" au "je veux m'inscrire") — l'UX doit être impeccable
