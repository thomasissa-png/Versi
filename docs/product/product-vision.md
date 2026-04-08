# Vision produit — versi.fr

> Produit par @product-manager | Date : 2026-04-08
> Livrable allégé (site vitrine one-page, pas de SaaS). Référence : project-context.md, brand-platform.md, personas.md.

---

## Objectif du site en une phrase

Convaincre Laurent (investisseur privé / family office) en moins de 10 secondes que Versi est un opérateur immobilier intégré crédible et structuré, afin de générer des prises de contact qualifiées via le formulaire.

---

## Public cible priorisé

| Rang | Persona | Pourquoi il arrive sur versi.fr | Ce qu'il doit trouver |
|---|---|---|---|
| 1 | Laurent, 48 ans — investisseur privé / family office | Lien partagé dans un réseau pro ou recherche "holding immobilière intégrée France". Il vérifie la crédibilité de Versi avant tout échange. | Site institutionnel, équipe identifiée, structure formalisée, 4 métiers visibles, formulaire de contact. |
| 2 | Pierre, 45 ans — notaire / courtier / agent prescripteur | Un confrère lui parle de Versi. Il vérifie en 2 minutes pour décider d'ajouter Versi à son carnet d'opérateurs. | Mêmes signaux que Laurent + clarté sur le spectre d'intervention (géographie, types d'actifs). |
| 3 | Sophie, 42 ans — propriétaire cédante | Google "marchand de biens [ville]" ou lien d'un tiers. Elle compare 3-4 opérateurs. | Voir ci-dessous — décision H2. |

---

## Décision H2 — Sophie sur versi.fr V1

**Décision : Sophie est un persona secondaire sur versi.fr V1, adressé implicitement via la section Activités (carte Versi Développement), mais pas comme cible principale.**

**Justification :**
- versi.fr est le site de la holding, pas du marchand de biens. Laurent et Pierre sont les audiences primaires d'une holding.
- Sophie atterrit naturellement sur versi-developpement.fr (hors scope V1), pas sur la holding.
- Mentionner explicitement "vous avez un immeuble à céder" sur versi.fr diluerait le positionnement institutionnel premium qui convainc Laurent.
- La carte "Versi Développement — Marchand de biens" dans la section Activités suffit à orienter Sophie vers le bon interlocuteur, sans dégrader l'expérience de Laurent.
- Sur versi-developpement.fr (V2), Sophie sera l'audience principale avec un message dédié.

**Alternative écartée :** adresser explicitement Sophie dans la section Mission ou dans le Hero. Rejeté car le message "vous avez un immeuble à céder" est trop transactionnel pour le registre institutionnel de la holding — et Laurent fermerait l'onglet s'il perçoit que le site s'adresse à des propriétaires novices.

---

## Ce que le site DOIT accomplir

1. **Crédibilité instantanée (0-3s)** : le design transmet "opérateur institutionnel sérieux" avant que Laurent lise un mot.
2. **Identification de la structure (3-10s)** : Laurent comprend que Versi est une holding avec 4 métiers intégrés — pas un opérateur à un seul maillon.
3. **Identification de l'équipe (10-30s)** : 3 fondateurs nommés, parcours vérifiables (liens LinkedIn). Laurent sait à qui il a affaire.
4. **Compréhension de la méthode (30-60s)** : la section Approche valide que Versi a une méthode structurée, pas une intuition.
5. **Prise de contact qualifiée** : le formulaire est trouvé sans effort, le CTA est sobre et direct.

## Ce que le site NE DOIT PAS faire

- Pas de blog, pas de contenu éditorial, pas de section "actualités".
- Pas de login, pas de dashboard, pas de fonctionnalité applicative.
- Pas de chat bot, pas de pop-up, pas de bandeau cookies (Plausible analytics, cookieless).
- Pas de prix affiché, pas de simulation, pas de calculateur.
- Pas d'images de synthèse ou de stock photo générique — uniquement photos architecturales.
- Pas de rôles CEO/COO/CMO pour les fondateurs — strictement "Co-fondateur".
- Pas de vocabulaire proscrit : "expertise", "accompagnement", "passion", "solutions", "échangeons", "clé en main".

---

## KPI North Star

**Nombre de prises de contact qualifiées via le formulaire du site.**

Un contact est "qualifié" si le message mentionne un projet d'investissement, un actif à céder, ou une proposition de partenariat — et non une demande générique ou hors cible.

---

## Scope V1 strict

### IN (scope V1 — versi.fr)

- Site one-page scrolling en React (statique, sans backend)
- 7 sections : Hero, Mission, Activités, Approche, Implantation, Équipe, Contact
- Navigation sticky avec 5 items + CTA "Nous contacter"
- Formulaire de contact via Formspree (Nom, Prénom, Email, Téléphone, Message) + honeypot anti-spam
- Footer : contact@versi.fr, mentions légales, politique de confidentialité
- Analytics Plausible (cookieless, sans bandeau — conforme RGPD, recommandé par @legal)
- Responsive : mobile (375px), tablette (768px), desktop (1280px)
- Pages légales séparées : /mentions-legales, /confidentialite (ou modales)
- Accessibilité : WCAG 2.2 AA (contrastes, focus-visible, touch targets >= 44px)

### OUT (hors scope V1 — projets séparés)

- Sites des 4 entités (versi-developpement.fr, versi-invest.fr, versi-capital.fr, versi-finance.fr)
- Blog ou contenu éditorial
- Espace membre ou authentification
- Tracking events avancé (la version V1 se limite à Plausible pageviews + event formulaire soumis)
- Version multilingue (EN)
- Section track record / portfolio d'opérations (à ajouter en V2 quand les opérations sont publiques)

---

**Handoff → @fullstack**
- Fichier produit : `/home/user/Versi/docs/product/product-vision.md`
- Décisions clés : Sophie adressée implicitement via carte Versi Développement, pas comme cible principale. Scope V1 strict documenté.
- Points d'attention : lire `functional-specs.md` pour le détail de chaque section avant de coder.
