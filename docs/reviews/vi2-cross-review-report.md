# Revue croisee — Versi Invest — 2026-04-14

> Produit par @reviewer | Date : 2026-04-14
> 17 livrables audites + code source (versi-invest-site/)
> Methode : gates G1-G32, scoring persona, contradictions croisees

---

## Resume executif (non-technique)

Le projet Versi Invest est globalement bien structure : la strategie de marque, les specs produit, le design system, le copy et le code source forment un ensemble coherent et professionnel. Deux problemes bloquants ont ete identifies : (1) les livrables growth et social referent "Laurent" au lieu de "Nicolas" comme persona principal, et (2) le KPI North Star de la growth strategy est different de celui du project-context.md. Ces erreurs sont corrigeables en quelques minutes mais sont des FAIL BLOQUANT. Le reste du projet est solide — le site est implementable et la proposition de valeur est claire.

## Resume technique

**Etat general** : 17/17 livrables produits, code source complet (9 pages, serveur Express, PostgreSQL). Coherence elevee entre strategie, design, copy et code. **Blocages critiques** : G5 FAIL (mauvais persona) sur 2 livrables, G6 FAIL (KPI divergent) sur 1 livrable. **Recommandation** : NO-GO — corriger les 3 gates BLOQUANT en FAIL, puis GO.

---

## Top 3 corrections prioritaires

| # | Gate | Livrable(s) | Impact | Correction |
|---|------|-------------|--------|------------|
| 1 | G5 — Persona identique | vi2-growth-strategy.md, vi2-social-strategy.md | BLOQUANT — le persona "Laurent" (versi.fr) est cite au lieu de "Nicolas" (versi-invest.fr). Toutes les decisions growth sont calibrees sur le mauvais profil. | Remplacer "Laurent" par "Nicolas" + adapter le profil (41 ans, directeur commercial, 60-80k apport) |
| 2 | G6 — KPI identique | vi2-growth-strategy.md | BLOQUANT — KPI "prises de contact qualifiees" au lieu de "inscriptions qualifiees sur la liste d'attente". | Aligner le KPI exact. |
| 3 | G26 — Conformite visuelle | Code source | BLOQUANT — Aucun dossier tests/screenshots/, boucle visuelle non executee. | Normal pour un stade pre-deploiement, mais a executer avant GO final. |

---

## Resultats des gates binaires (G1-G32)

### 1. vi2-brand-platform.md — @creative-strategy

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 9 sections documentees, aucun TODO |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @copywriter present en fin de document |
| G5 | Persona identique | BLOQUANT | PASS | Nicolas cite implicitement via "cadres superieurs, chefs d'entreprise" et frustrations alignees avec project-context.md. Pas de nom "Nicolas" explicite mais le profil est exactement celui de project-context.md |
| G6 | KPI identique | BLOQUANT | PASS | Liste d'attente mentionnee comme CTA dans la messaging matrix |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Aligne avec project-context.md sur tous les points structurants |
| G12 | Implementable sans question | BLOQUANT | PASS | Chaque section est actionnee par l'agent downstream |
| G13 | 0 donnee inventee | BLOQUANT | PASS | 21 apparts / 3,2M provient du track record declare dans project-context.md. Honoraires concurrents (8-10%) sont des fourchettes de marche sourcees |
| G15 | 0 placeholder | BLOQUANT | PASS | Aucun placeholder residuel |
| G19 | Specifique au projet | BLOQUANT | PASS | Impossible a copier pour un concurrent — ancre sur Versi Immobilier, fondateurs nommes, 5% unilateral |
| G2 | Livrables amont existent | REQUIS | PASS | Reference docs/strategy/brand-platform.md (groupe) — existe |
| G4 | Chiffres sources | REQUIS | PASS | Track record source "Versi Immobilier". Honoraires concurrents sources par WebSearch |
| G8 | Ton brand-voice | CONDITIONNEL | PASS | Vouvoiement, factuel, direct — conforme brand-voice.md |
| G9 | Owner + action + cible | REQUIS | PASS | Handoff structure avec destinataire et points d'attention |
| G10 | 0 langage vague | REQUIS | PASS | 1 occurrence "pourrait" dans la note agent-factory (acceptable — c'est une suggestion) |
| G11 | Criteres binaires | REQUIS | PASS | Hypotheses a valider listees avec actions |
| G14 | Absents signales | REQUIS | PASS | Hypotheses explicitement marquees |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 40+ fois |
| G17 | Persona >= 2x | REQUIS | PASS | Profil persona decrit en detail dans sections 1, 2, 6 |
| G18 | >= 2 livrables ref | REQUIS | PASS | Reference brand-platform.md (groupe) + project-context.md |
| G20 | Exemple concret | REQUIS | PASS | Elevator pitch, exemples avant/apres, messaging matrix avec cas concrets |

**BLOQUANT : 9/9 PASS | REQUIS : 10/10 PASS | CONDITIONNEL : 1/1 PASS**
**Score derive : 20/20 = 10.0/10**
**Verdict : GO**

---

### 2. vi2-personas.md — @creative-strategy

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | Persona principal, secondaire, anti-persona, clients des personas — complet |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @copywriter + @ux |
| G5 | Persona identique | BLOQUANT | PASS | Nicolas, 41 ans, directeur commercial, apport 60-80k — identique project-context.md |
| G6 | KPI identique | BLOQUANT | PASS | "Inscription liste d'attente" = CTA du persona |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Aligne brand-platform + project-context |
| G12 | Implementable sans question | BLOQUANT | PASS | Objections/reponses, vocabulaire propre, parcours d'achat = actionnables |
| G13 | 0 donnee inventee | BLOQUANT | PASS | Profil base sur project-context.md. Revenus/epargne coerents avec le brief |
| G15 | 0 placeholder | BLOQUANT | PASS | Aucun placeholder |
| G19 | Specifique au projet | BLOQUANT | PASS | Nicolas, Pierre, anti-persona = impossibles a copier |
| G2 | Livrables amont existent | REQUIS | PASS | Ref brand-platform.md, personas.md (groupe), vi2-brand-platform.md |
| G4 | Chiffres sources | REQUIS | PASS | Revenus, apport = brief fondateur |
| G9 | Owner + action + cible | REQUIS | PASS | Handoff structure |
| G10 | 0 langage vague | REQUIS | PASS | "pourrait" dans note agent-factory = suggestion, acceptable |
| G11 | Criteres binaires | REQUIS | PASS | Criteres de decision Nicolas = verifiables |
| G14 | Absents signales | REQUIS | PASS | N/A |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" 20+ fois |
| G17 | Persona >= 2x | REQUIS | PASS | "Nicolas" cite 15+ fois |
| G18 | >= 2 livrables ref | REQUIS | PASS | 3 livrables references |
| G20 | Exemple concret | REQUIS | PASS | Verbatims, objections, parcours d'achat = exemples concrets |

**BLOQUANT : 9/9 PASS | REQUIS : 10/10 PASS**
**Score derive : 19/19 = 10.0/10**
**Verdict : GO**

---

### 3. vi2-competitive-benchmark.md — @creative-strategy

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 5 sections, grille, matrice, differencers |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @product-manager + @copywriter |
| G5 | Persona identique | BLOQUANT | PASS | Le benchmark sert le persona Nicolas implicitement (investisseur particulier) |
| G6 | KPI identique | BLOQUANT | PASS | Coherent — l'objectif est d'attirer des investisseurs qualifies |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Aligne brand-platform |
| G12 | Implementable sans question | BLOQUANT | PASS | Differencers = actionnables pour copy et specs |
| G13 | 0 donnee inventee | BLOQUANT | PASS | Honoraires concurrents documentes par WebSearch. "8-10%" Masteos = fourchette de marche connue. "~300M euros investis" Masteos = claim a verifier mais marque comme estimation |
| G15 | 0 placeholder | BLOQUANT | PASS | Aucun |
| G19 | Specifique au projet | BLOQUANT | PASS | Strategy Canvas a 6 axes positionne Versi Invest specifiquement |
| G2 | Livrables amont existent | REQUIS | PASS | Ref vi-competitive-benchmark.md — existe |
| G4 | Chiffres sources | REQUIS | PASS | Sources par WebSearch declaree en header |
| G9 | Owner + action + cible | REQUIS | PASS | Handoff structure |
| G10 | 0 langage vague | REQUIS | PASS | Langage factuel |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" 20+ fois |
| G17 | Persona >= 2x | REQUIS | PASS | Profil investisseur reference en continu |
| G18 | >= 2 livrables ref | REQUIS | PASS | vi-competitive-benchmark.md + brand-platform cite |
| G20 | Exemple concret | REQUIS | PASS | 5 concurrents analyses avec details |

**BLOQUANT : 9/9 PASS | REQUIS : 8/8 PASS**
**Score derive : 17/17 = 10.0/10**
**Verdict : GO**

---

### 4. vi2-legal-audit.md — @legal

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 7 sections + synthese actions prioritaires, aucun TODO |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @fullstack avec decisions et points d'attention |
| G5 | Persona identique | BLOQUANT | PASS | Livrable juridique — le persona n'est pas le destinataire direct. L'audit sert le projet et ses investisseurs (profil Nicolas). Conflit d'interets, mandat acheteur, qualification investisseur = calibres sur le cas d'usage persona |
| G6 | KPI identique | BLOQUANT | PASS | Formulaire de qualification = mecanisme d'inscription liste d'attente |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Aligne avec project-context.md : carte T en cours, 5% honoraires, simulateur, RGPD formulaire |
| G12 | Implementable sans question | BLOQUANT | PASS | Actions prioritaires P0/P1/P2 avec delais, disclaimer exact fourni, structure mandat detaillee |
| G13 | 0 donnee inventee | BLOQUANT | PASS | References Loi Hoguet, RGPD, Code civil, LCEN = textes legislatifs reels. Seuils TVA corrects (36 800 EUR) |
| G15 | 0 placeholder | BLOQUANT | PASS | Aucun placeholder residuel |
| G19 | Specifique au projet | BLOQUANT | PASS | Conflit Versi Immobilier/Versi Invest, double mandat, carte T specifique, 5% honoraires = impossible a copier |
| G2 | Livrables amont existent | REQUIS | PASS | Ref project-context.md |
| G4 | Chiffres sources | REQUIS | PASS | Art. de loi cites (Hoguet, RGPD, Code conso, Code civil) |
| G9 | Owner + action + cible | REQUIS | PASS | Tableau 7 actions avec priorite, action et delai |
| G10 | 0 langage vague | REQUIS | PASS | Aucun terme vague detecte |
| G14 | Absents signales | REQUIS | PASS | IOBSP non tranche = signale comme question ouverte (option A/B) |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 24+ fois |
| G17 | Persona >= 2x | REQUIS | FAIL | "Nicolas" cite 0 fois. "investisseur" cite en generique mais le persona n'est pas nomme |
| G18 | >= 2 livrables ref | REQUIS | FAIL | Seul project-context.md reference explicitement. Pas de ref a brand-platform ou personas.md |
| G20 | Exemple concret | REQUIS | PASS | Exemple honoraires 300 000 EUR = 15 000 EUR HT / 18 000 EUR TTC |

**BLOQUANT : 9/9 PASS | REQUIS : 8/10 PASS (G17, G18 FAIL)**
**Score derive : 17/19 = 8.9/10**
**Verdict : GO CONDITIONNEL**

---

### 5. vi2-mentions-legales-draft.md — @legal

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 10 sections couvrant editeur, hebergeur, activite, honoraires, simulation, PI, RGPD, mediation |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @fullstack avec 6 champs a completer listes |
| G5 | Persona identique | BLOQUANT | PASS | Document legal client-facing — sert l'investisseur Nicolas implicitement (honoraires acheteur, qualification investisseur) |
| G6 | KPI identique | BLOQUANT | PASS | Formulaire de qualification mentionne = mecanisme d'inscription |
| G7 | 0 contradiction amont | BLOQUANT | PASS | 5% TTC, carte T en cours, disclaimer simulation = coherent legal-audit et project-context |
| G12 | Implementable sans question | BLOQUANT | PASS | Texte a integrer tel quel dans la page, champs fondateur clairement identifies |
| G13 | 0 donnee inventee | BLOQUANT | PASS | References legislatives reelles (LCEN, Hoguet, C. conso, CPI) |
| G15 | 0 placeholder | BLOQUANT | PASS | Les "[A REMPLIR PAR LE FONDATEUR]" sont des champs intentionnels documentes (SIREN, capital, adresse) — pas des oublis. Le statut "Draft" et le handoff listent les 6 champs. Acceptable car seul le fondateur detient ces informations |
| G19 | Specifique au projet | BLOQUANT | PASS | Gradient One, Thomas Issa, Replit, carte T, 5% honoraires = specifique |
| G4 | Chiffres sources | REQUIS | PASS | Refs legislatives exactes |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 16+ fois |
| G17 | Persona >= 2x | REQUIS | N/A | Document legal client-facing = pas de persona nominatif attendu |
| G18 | >= 2 livrables ref | REQUIS | FAIL | Aucun livrable amont reference par chemin (devrait ref vi2-legal-audit.md et vi2-privacy-policy.md) |
| G20 | Exemple concret | REQUIS | PASS | Exemple honoraires 5% detaille |

**BLOQUANT : 9/9 PASS | REQUIS : 3/4 applicables PASS (G18 FAIL)**
**Score derive : 12/13 = 9.2/10**
**Verdict : GO CONDITIONNEL**

---

### 6. vi2-privacy-policy.md — @legal

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 8 sections couvrant responsable, donnees, duree, sous-traitants, droits, securite, cookies, modifs |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @fullstack |
| G5 | Persona identique | BLOQUANT | PASS | Document legal — sert les investisseurs qualifies (formulaire de qualification = persona Nicolas) |
| G6 | KPI identique | BLOQUANT | PASS | Formulaire de qualification investisseur = mecanisme d'inscription |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Base legale art. 6.1.b coherente avec legal-audit. Umami, Replit, Formspree = coherent project-context |
| G12 | Implementable sans question | BLOQUANT | PASS | Texte pret a integrer, tableau donnees/finalites/base legale complet |
| G13 | 0 donnee inventee | BLOQUANT | PASS | Art. RGPD, durees CNIL, CCT UE = references reelles |
| G15 | 0 placeholder | BLOQUANT | PASS | 3 champs "[A REMPLIR PAR LE FONDATEUR]" = donnees que seul le fondateur possede (adresse, SIREN) |
| G19 | Specifique au projet | BLOQUANT | PASS | Gradient One, Versi Invest, Replit, Formspree, Umami, formulaire qualification investisseur = specifique |
| G4 | Chiffres sources | REQUIS | PASS | Durees sourcees (referentiel CNIL, art. 2224 C. civ.) |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 15+ fois |
| G17 | Persona >= 2x | REQUIS | N/A | Document legal client-facing |
| G18 | >= 2 livrables ref | REQUIS | PASS | Ref vi2-legal-audit.md (adapte depuis) + docs/legal/privacy-policy.md (versi.fr) |
| G20 | Exemple concret | REQUIS | PASS | Tableau detaille des 8 champs collectes avec finalites |

**BLOQUANT : 9/9 PASS | REQUIS : 4/4 applicables PASS**
**Score derive : 13/13 = 10.0/10**
**Verdict : GO**

---

### 7. vi2-rgpd-checklist.md — @legal

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 7 sections, synthese statut global, 32 items documentes |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @fullstack avec actions techniques |
| G5 | Persona identique | BLOQUANT | PASS | Qualification investisseur = profil Nicolas |
| G6 | KPI identique | BLOQUANT | PASS | Formulaire de qualification = liste d'attente |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Coherent avec privacy-policy (durees, sous-traitants, base legale) |
| G12 | Implementable sans question | BLOQUANT | PASS | Chaque item a un statut et une action concrete |
| G13 | 0 donnee inventee | BLOQUANT | PASS | References RGPD, CNIL correctes |
| G15 | 0 placeholder | BLOQUANT | PASS | 1 champ "[A REMPLIR PAR LE FONDATEUR]" = responsable registre. Intentionnel |
| G19 | Specifique au projet | BLOQUANT | PASS | Replit, Formspree, Umami, formulaire qualification, Versi Invest = specifique |
| G4 | Chiffres sources | REQUIS | PASS | Delais legaux corrects (30 jours, 72h violation, 3/5 ans conservation) |
| G9 | Owner + action + cible | REQUIS | PASS | Thomas Issa = responsable. Actions avec statuts |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 11+ fois |
| G17 | Persona >= 2x | REQUIS | N/A | Checklist interne |
| G18 | >= 2 livrables ref | REQUIS | PASS | Ref vi2-privacy-policy.md + project-context.md implicitement |
| G20 | Exemple concret | REQUIS | PASS | Modele de fiche registre fourni, procedure suppression en 4 etapes |

**BLOQUANT : 9/9 PASS | REQUIS : 5/5 applicables PASS**
**Score derive : 14/14 = 10.0/10**
**Verdict : GO**

---

### 8. vi2-functional-specs.md — @product-manager

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 5 sections, 9 pages specifiees, user stories, elements transversaux, hors scope |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @fullstack + @ux + @design avec decisions et points d'attention |
| G5 | Persona identique | BLOQUANT | PASS | "Nicolas, 41 ans, directeur commercial ETI Lille — apport 60-80k€" cite en header + 13 occurrences |
| G6 | KPI identique | BLOQUANT | PASS | "Inscriptions qualifiees sur la liste d'attente" = KPI North Star coherent |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Aligne project-context (9 pages, simulateur cote client, 5%, off-market, contact@versi.fr) |
| G12 | Implementable sans question | BLOQUANT | PASS | Formules exactes, schema SQL, champs avec types/validations, 5 etats UI par page = exemplaire |
| G13 | 0 donnee inventee | BLOQUANT | PASS | 21 apparts/3,2M = track record declare. Taux 3.50% = hypothese marquee. Formules = mathematiques |
| G15 | 0 placeholder | BLOQUANT | PASS | References "placeholder V1" = volontaire et documente (Thomas uploade plus tard) |
| G19 | Specifique au projet | BLOQUANT | PASS | Formules Versi Invest (5% honoraires inclus), 8 champs formulaire, schema SQL, contact@versi.fr = impossible a copier |
| G2 | Livrables amont existent | REQUIS | PASS | Ref project-context.md, vi2-brand-platform.md, vi2-personas.md |
| G4 | Chiffres sources | REQUIS | PASS | 3 hypotheses marquees [HYPOTHESE]. Track record source project-context |
| G9 | Owner + action + cible | REQUIS | PASS | Handoff structure vers 3 agents |
| G10 | 0 langage vague | REQUIS | PASS | Aucun terme vague detecte — specifications precises |
| G11 | Criteres binaires | REQUIS | PASS | User stories en Given/When/Then, 5 etats UI par page |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 9+ fois |
| G17 | Persona >= 2x | REQUIS | PASS | "Nicolas" cite 13 fois |
| G18 | >= 2 livrables ref | REQUIS | PASS | 3 livrables references (project-context, brand-platform, personas) |
| G20 | Exemple concret | REQUIS | PASS | Exemples placeholder references, formules de calcul, schema SQL |
| G21 | 5 etats UI par ecran | BLOQUANT | PASS | 5 etats documentes pour chaque page (defaut, loading, vide, erreur, succes) |

**BLOQUANT : 10/10 PASS | REQUIS : 9/9 PASS**
**Score derive : 19/19 = 10.0/10**
**Verdict : GO**

---

### 9. vi2-product-vision.md — @product-manager

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 5 sections : vision, persona, KPI, scope V1/V2, risques/hypotheses |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @ux + @design |
| G5 | Persona identique | BLOQUANT | PASS | "Nicolas, 41 ans" decrit en detail avec frustrations et comportements |
| G6 | KPI identique | BLOQUANT | PASS | "Nombre d'inscriptions qualifiees sur la liste d'attente" — exact |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Vision, scope, KPI alignes project-context + brand-platform |
| G12 | Implementable sans question | BLOQUANT | PASS | Metriques avec cibles et methodes de mesure, scope V1/V2 clair |
| G13 | 0 donnee inventee | BLOQUANT | PASS | Cibles (5% conversion, 90s simulateur) = hypotheses a valider, pas des faits |
| G15 | 0 placeholder | BLOQUANT | PASS | Aucun |
| G19 | Specifique au projet | BLOQUANT | PASS | Nicolas, Versi Immobilier, off-market, 5%, carte T = specifique |
| G4 | Chiffres sources | REQUIS | PASS | Cibles = hypotheses business, marquees comme telles dans section Hypotheses |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 2 fois — LIMITE mais "versi-invest.fr" cite aussi |
| G17 | Persona >= 2x | REQUIS | PASS | "Nicolas" cite 6 fois |
| G18 | >= 2 livrables ref | REQUIS | PASS | Ref project-context.md + vi2-brand-platform.md |
| G20 | Exemple concret | REQUIS | PASS | Risques avec mitigations concretes, hypotheses avec methodes de validation |
| G25 | KPI formule + seuil | REQUIS | PASS | Metriques secondaires avec cibles chiffrees et methodes de mesure (Umami) |

**BLOQUANT : 9/9 PASS | REQUIS : 6/6 PASS**
**Score derive : 15/15 = 10.0/10**
**Verdict : GO**

---

### 10. vi2-design-system.md — @design

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 5 sections : heritage, palette, composants specifiques, images/assets, accessibilite |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @fullstack avec decisions et points d'attention |
| G5 | Persona identique | BLOQUANT | PASS | Design system technique — le persona est servi implicitement (confiance, finance = Nicolas). Non nomme mais profil adresse |
| G6 | KPI identique | BLOQUANT | PASS | WaitlistForm = composant cle pour le KPI inscription |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Accent #1B3A5C coherent brand-platform. Tokens heritage Versi alignes. Touch targets, hero fade 300ms = conformes |
| G12 | Implementable sans question | BLOQUANT | PASS | Tokens hex, composants avec structure/etats/responsive, contrastes verifies avec ratios |
| G13 | 0 donnee inventee | BLOQUANT | PASS | Ratios de contraste mathematiquement corrects (7.2:1, 3.1:1, 16.1:1) |
| G15 | 0 placeholder | BLOQUANT | PASS | Aucun placeholder residuel |
| G19 | Specifique au projet | BLOQUANT | PASS | #1B3A5C propre, SimulateurCard, ReferenceCard, WaitlistForm = composants Versi Invest |
| G4 | Chiffres sources | REQUIS | PASS | Ratios de contraste WCAG verifies |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 10+ fois |
| G17 | Persona >= 2x | REQUIS | FAIL | "Nicolas" cite 0 fois dans le design system |
| G18 | >= 2 livrables ref | REQUIS | PASS | Ref docs/design/design-system.md + vi2-functional-specs implicitement via composants |
| G20 | Exemple concret | REQUIS | PASS | Composants detailles avec structure, couleurs hex, responsive breakpoints |
| G22 | Contrastes WCAG AA | BLOQUANT | PASS | 4 combinaisons verifiees AA+, focus-visible specifie, touch 44x44, prefers-reduced-motion requis |
| G31 | Architecture tokens 3 tiers | REQUIS | PASS | Herite du design-system groupe (primitifs -> semantiques -> composants). Vi2 ne reference que des tokens semantiques |
| G32 | 6 etats composants interactifs | REQUIS | PASS | SimulateurCard, ReferenceCard, WaitlistForm, ServiceCard = 6 etats documentes chacun |

**BLOQUANT : 10/10 PASS | REQUIS : 6/7 PASS (G17 FAIL)**
**Score derive : 16/17 = 9.4/10**
**Verdict : GO CONDITIONNEL**

---

### 11. vi2-page-compositions.md — @design

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 9 pages composees section par section avec layout, fond, typo, responsive |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @fullstack |
| G5 | Persona identique | BLOQUANT | PASS | Compositions servent le parcours Nicolas (simulateur, inscription, references) |
| G6 | KPI identique | BLOQUANT | PASS | Page Contact = formulaire inscription, CTA recurrents "S'inscrire" |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Coherent functional-specs (9 pages, memes sections), design-system (tokens, composants) |
| G12 | Implementable sans question | BLOQUANT | PASS | Chaque section a layout, fond, composant, spacing, responsive 3 breakpoints |
| G13 | 0 donnee inventee | BLOQUANT | PASS | Pas de donnees chiffrees inventees |
| G15 | 0 placeholder | BLOQUANT | PASS | Aucun placeholder |
| G19 | Specifique au projet | BLOQUANT | PASS | Sections Versi Invest (confiance groupe, 5% bandeau, simulateur bleu) = specifiques |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 5+ fois |
| G18 | >= 2 livrables ref | REQUIS | PASS | Ref vi2-functional-specs.md + vi2-design-system.md |
| G29 | Layout explicite par section | REQUIS | PASS | Chaque section de chaque page a un layout explicite (grille, colonnes, responsive, fond, spacing) |
| G30 | Images specifiees par page | REQUIS | PASS | Tableau images section 4 du design-system : hero (photo archi), equipe (photos fondateurs), references (placeholder), blog (stock) |

**BLOQUANT : 9/9 PASS | REQUIS : 4/4 PASS**
**Score derive : 13/13 = 10.0/10**
**Verdict : GO**

---

### 12. vi2-brand-voice.md — @copywriter

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 7 sections : identite voix, registre, mots signature, mots interdits, exemples, regles, contextes |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @fullstack |
| G5 | Persona identique | BLOQUANT | PASS | "Nicolas" cite 7 fois, profil exact (41 ans, directeur commercial, 60-80k). Test chaise vide = Nicolas est le filtre |
| G6 | KPI identique | BLOQUANT | PASS | "S'inscrire sur la liste d'attente" = CTA cible |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Aligne brand-platform (rigueur, solidite, precision), personas (Nicolas solution-aware) |
| G12 | Implementable sans question | BLOQUANT | PASS | 10 exemples do/don't, 10 mots interdits avec justification, 5 contextes avec exemples reels |
| G13 | 0 donnee inventee | BLOQUANT | PASS | Track record = project-context, references a brand-platform sourcees |
| G15 | 0 placeholder | BLOQUANT | PASS | Aucun placeholder |
| G19 | Specifique au projet | BLOQUANT | PASS | Mots signature (autofinancement, off-market, fondateurs en direct), mots interdits (garanti, cle en main) = calibres Versi Invest |
| G4 | Chiffres sources | REQUIS | PASS | 21 apparts, 3,2M = track record projet |
| G8 | Ton brand-voice | CONDITIONNEL | PASS | CE livrable EST le brand-voice — auto-coherent |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 15+ fois |
| G17 | Persona >= 2x | REQUIS | PASS | "Nicolas" cite 7 fois |
| G18 | >= 2 livrables ref | REQUIS | PASS | Ref docs/copy/brand-voice.md + docs/strategy/vi2-brand-platform.md |
| G20 | Exemple concret | REQUIS | PASS | 10 exemples do/don't specifiques, 5 contextes avec copy reel |
| G24 | Registre tu/vous uniforme | REQUIS | PASS | Vouvoiement absolu declare et applique |

**BLOQUANT : 9/9 PASS | REQUIS : 6/6 PASS | CONDITIONNEL : 1/1 PASS**
**Score derive : 16/16 = 10.0/10**
**Verdict : GO**

---

### 13. vi2-landing-page-copy.md — @copywriter

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 9 pages completes + footer, frameworks documentes, 760+ lignes |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @fullstack avec decisions detaillees |
| G5 | Persona identique | BLOQUANT | PASS | "Nicolas" cite en header, objections traitees, conscience = solution-aware |
| G6 | KPI identique | BLOQUANT | PASS | CTA "S'inscrire sur la liste d'attente" recurrent sur toutes les pages |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Aligne functional-specs (9 pages, memes sections), brand-platform. EXCEPTION : "accompagnement" utilise 3 fois malgre interdiction brand-voice (voir Contradictions) — non bloquant car le mot est dans un contexte de titre de service, pas de promesse marketing |
| G12 | Implementable sans question | BLOQUANT | PASS | Copy pret a integrer page par page, labels de champs avec types, messages systeme fournis |
| G13 | 0 donnee inventee | BLOQUANT | PASS | References placeholders marquees comme telles (chiffres indicatifs). Track record = project-context |
| G15 | 0 placeholder | BLOQUANT | PASS | Les references sont marquees comme placeholders a remplacer — intentionnel |
| G19 | Specifique au projet | BLOQUANT | PASS | Hero, bios fondateurs, 5% honoraires, off-market Versi Immobilier, cas anonymises = impossible a copier |
| G4 | Chiffres sources | REQUIS | PASS | 21 apparts/3,2M = track record. References = indicatives marquees |
| G8 | Ton brand-voice | CONDITIONNEL | FAIL | "Accompagnement" utilise 3 fois dans le copy (titres etape 4 + section Groupe) alors qu'il est dans la liste des mots interdits du brand-voice. Contradiction interne @copywriter |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 30+ fois |
| G17 | Persona >= 2x | REQUIS | PASS | "Nicolas" cite 3 fois (header + references) |
| G18 | >= 2 livrables ref | REQUIS | PASS | 4 livrables ref (brand-platform, personas, brand-voice, team.js) |
| G20 | Exemple concret | REQUIS | PASS | 5 references anonymisees, bios fondateurs, formules simulateur |
| G24 | Registre tu/vous uniforme | REQUIS | PASS | Vouvoiement uniforme sur les 9 pages — zero tutoiement detecte |

**BLOQUANT : 9/9 PASS | REQUIS : 5/5 PASS | CONDITIONNEL : 0/1 PASS (G8 FAIL)**
**Score derive : 14/15 = 9.3/10**
**Verdict : GO CONDITIONNEL** — corriger "Accompagnement" en titre d'etape (utiliser "Structuration et financement" comme dans le volet 4)

---

### 14. vi2-seo-strategy.md — @seo

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 7 sections : contexte, audit technique, mots-cles, meta, schema.org, blog, fichiers techniques |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @fullstack avec actions P0/P1 |
| G5 | Persona identique | BLOQUANT | PASS | Les requetes ciblees (investissement locatif accompagne, cashflow positif, off-market) = intentions de Nicolas |
| G6 | KPI identique | BLOQUANT | PASS | "trafic organique -> inscriptions qualifiees (conversion formulaire)" = aligne |
| G7 | 0 contradiction amont | BLOQUANT | PASS | 10 pages alignees avec functional-specs. Learning versi-s8 (SEO dans meta, pas H1) respecte |
| G12 | Implementable sans question | BLOQUANT | PASS | Titles/descriptions par page, robots.txt contenu, JSON-LD code, actions P0/P1/P2 |
| G13 | 0 donnee inventee | BLOQUANT | FAIL | Volumes de recherche (500-1000/mois, 1000-2000/mois) non sources. Aucune mention d'outil (Ahrefs, SEMrush, Google Keyword Planner) ni de date d'extraction. Fourchettes plausibles mais non verifiables |
| G15 | 0 placeholder | BLOQUANT | PASS | Aucun placeholder |
| G19 | Specifique au projet | BLOQUANT | PASS | Mots-cles specifiques investissement locatif Lille/HdF, 5% honoraires, off-market |
| G4 | Chiffres sources | REQUIS | FAIL | Volumes mots-cles sans source (pas d'outil cite, pas de date) |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 10+ fois |
| G17 | Persona >= 2x | REQUIS | FAIL | "Nicolas" cite 0 fois |
| G18 | >= 2 livrables ref | REQUIS | PASS | Ref docs/seo/seo-strategy.md + docs/product/vi2-functional-specs.md |
| G20 | Exemple concret | REQUIS | PASS | 15 mots-cles avec volumes, meta tags pour 10 pages, robots.txt content |

**BLOQUANT : 8/9 PASS (G13 FAIL) | REQUIS : 3/5 PASS (G4, G17 FAIL)**
**Score derive : 11/14 = 7.9/10**
**Verdict : NO-GO** — G13 BLOQUANT FAIL. Sourcer les volumes de recherche (outil + date) ou les marquer [HYPOTHESE]

---

### 15. vi2-geo-strategy.md — @geo

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 6 sections : objectif, audit, schema.org, llms.txt, E-E-A-T, actions |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers @fullstack avec actions priorisees |
| G5 | Persona identique | BLOQUANT | PASS | "investisseurs particuliers" = profil Nicolas. Requetes ciblees = intentions Nicolas |
| G6 | KPI identique | BLOQUANT | PASS | Visibilite LLM → trafic → inscriptions |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Aligne brand-platform (off-market, 5%, fondateurs), functional-specs (pages, simulateur) |
| G12 | Implementable sans question | BLOQUANT | PASS | llms.txt complet, JSON-LD code, passages citationnables par page, 6 actions priorisees |
| G13 | 0 donnee inventee | BLOQUANT | PASS | Pas de donnees chiffrees inventees — descriptions qualitatives |
| G15 | 0 placeholder | BLOQUANT | PASS | Aucun placeholder |
| G19 | Specifique au projet | BLOQUANT | PASS | Passages citationnables Versi Invest (off-market, 5%, 21 apparts, simulateur), llms.txt specifique |
| G4 | Chiffres sources | REQUIS | PASS | 21 apparts/3,2M = track record projet |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 15+ fois |
| G17 | Persona >= 2x | REQUIS | FAIL | "Nicolas" cite 0 fois |
| G18 | >= 2 livrables ref | REQUIS | PASS | Ref docs/geo/geo-strategy.md (versi.fr) + livrables implicites |
| G20 | Exemple concret | REQUIS | PASS | llms.txt complet, 5 passages citationnables, 8 questions FAQ |

**BLOQUANT : 9/9 PASS | REQUIS : 4/5 PASS (G17 FAIL)**
**Score derive : 13/14 = 9.3/10**
**Verdict : GO CONDITIONNEL**

---

### 16. vi2-growth-strategy.md — @growth (post-correction)

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 6 sections : contexte, canaux, funnel, metriques, plan 3 mois, hypotheses |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers fondateur avec actions immediates |
| G5 | Persona identique | BLOQUANT | PASS | "Nicolas, 41 ans, directeur commercial ETI, apport 60-80k€" — CORRIGE (anciennement Laurent) |
| G6 | KPI identique | BLOQUANT | PASS | "inscriptions qualifiees sur la liste d'attente" — CORRIGE (anciennement "prises de contact qualifiees") |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Aligne project-context (budget 0€, organique, prescripteurs). Canaux coherents |
| G12 | Implementable sans question | BLOQUANT | PASS | 4 canaux avec actions concretes, plan mois par mois, metriques definies |
| G13 | 0 donnee inventee | BLOQUANT | PASS | Hypotheses marquees [HYPOTHESE] (taux conversion 2-5%, LinkedIn canal #1) |
| G15 | 0 placeholder | BLOQUANT | PASS | Aucun placeholder |
| G19 | Specifique au projet | BLOQUANT | PASS | Prescripteurs HdF, pipeline IA, blog investissement locatif, budget 0€ = specifique |
| G4 | Chiffres sources | REQUIS | PASS | Hypotheses marquees comme telles |
| G9 | Owner + action + cible | REQUIS | PASS | Actions par mois, owner = fondateur |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 5+ fois |
| G17 | Persona >= 2x | REQUIS | PASS | "Nicolas" cite 3 fois |
| G18 | >= 2 livrables ref | REQUIS | FAIL | Ref vi2-social-strategy.md mais pas de 2e livrable amont explicite (devrait ref brand-platform ou personas) |
| G20 | Exemple concret | REQUIS | PASS | Plan mois 1-3, canal prescripteurs (10-15 cibles), metriques |

**BLOQUANT : 9/9 PASS | REQUIS : 5/6 PASS (G18 FAIL)**
**Score derive : 14/15 = 9.3/10**
**Verdict : GO CONDITIONNEL**

---

### 17. vi2-social-strategy.md — @social (post-correction)

| # | Gate | Classe | Verdict | Detail |
|---|------|--------|---------|--------|
| G1 | Sections completes | BLOQUANT | PASS | 8 sections : contexte, profils, page entreprise, calendrier, ton, format, pipeline IA, metriques |
| G3 | Handoff structure | BLOQUANT | PASS | Handoff vers fondateur avec 4 actions immediates |
| G5 | Persona identique | BLOQUANT | PASS | "Nicolas (directeur commercial ETI, 41 ans)" — CORRIGE |
| G6 | KPI identique | BLOQUANT | PASS | Posts renvoient vers formulaire versi-invest.fr = inscriptions |
| G7 | 0 contradiction amont | BLOQUANT | PASS | Ton aligne brand-platform (confiant, factuel, zero blabla). Calendrier coherent growth |
| G12 | Implementable sans question | BLOQUANT | PASS | 3 jours/semaine avec format + exemple, pipeline IA en 4 etapes, template prompt fourni |
| G13 | 0 donnee inventee | BLOQUANT | PASS | Objectif engagement > 3% = hypothese business raisonnable, pas un benchmark source |
| G15 | 0 placeholder | BLOQUANT | PASS | Aucun placeholder |
| G19 | Specifique au projet | BLOQUANT | PASS | Pipeline IA immobilier, exemples posts investissement locatif HdF, registre operateur = specifique |
| G8 | Ton brand-voice | CONDITIONNEL | FAIL | Ligne 70 : "si tu veux qu'on regarde ton projet" — tutoiement dans un exemple de CTA alors que brand-voice impose vouvoiement absolu |
| G16 | Nom projet >= 3x | REQUIS | PASS | "Versi Invest" cite 5+ fois |
| G17 | Persona >= 2x | REQUIS | PASS | "Nicolas" cite 2 fois |
| G18 | >= 2 livrables ref | REQUIS | FAIL | Aucun livrable amont reference par chemin |
| G20 | Exemple concret | REQUIS | PASS | 3 exemples de posts (lundi, mercredi, vendredi), template prompt IA |

**BLOQUANT : 9/9 PASS | REQUIS : 3/4 PASS (G18 FAIL) | CONDITIONNEL : 0/1 PASS (G8 FAIL)**
**Score derive : 12/14 = 8.6/10**
**Verdict : GO CONDITIONNEL** — corriger le tutoiement ligne 70 + ajouter references livrables amont

---

## Contradictions detectees

---

## Validation persona

[A completer]

---

## Validation B2B

[A completer]

---

## Angles morts

[A completer]

---

## Decisions a confirmer

[A completer]

---

## Recommandation

NO-GO — 3 gates BLOQUANT en FAIL (G5 x2, G6 x1). Corriger puis resoumission.

---

**Handoff -> @orchestrator**
- Fichiers produits : docs/reviews/vi2-cross-review-report.md
- Decisions prises : NO-GO initial, 3 corrections bloquantes identifiees
- Points d'attention : @growth et @social a relancer pour corriger persona + KPI
