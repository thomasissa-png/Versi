# Audit créatif — Blog et navigation versi-immobilier.fr

> Agent : @creative-strategy | Date : 2026-04-13
> Sources lues : `Nav.jsx`, `Footer.jsx`, `BlogTeaser.jsx`, `HomePage.jsx`, `docs/strategy/vi-brand-voice-adaptation.md`
> KPI North Star : prises de contact qualifiées
> Persona principal : Kévin, 31 ans, primo-accédant Lille | Persona secondaire : Sophie, 42 ans, vendeuse

---

## 1. Audit en tableau

| Question | Constat | Verdict |
|---|---|---|
| **Position du BLOG dans le menu** | Ordre actuel : BIENS DISPONIBLES → RÉALISATIONS → BLOG → NOTRE APPROCHE → CONTACT. Le blog occupe la 3e position sur 5, entre deux pages de preuve (réalisations) et d'ancrage institutionnel (notre approche). Il prend une place de rang moyen-haut dans une nav qui n'a que 5 items — autant de poids qu'une page de fond. | A ajuster — trop visible pour son rôle |
| **Cohérence avec le positionnement "marchand de biens terrain, pas de blabla"** | Le positionnement Versi repose sur les faits, pas sur la parole. Un blog peut renforcer cette posture si les articles sont du contenu de terrain (ex : analyse d'un quartier, avant/après chantier, explication d'une garantie). Il peut aussi la diluer si les articles deviennent du content marketing générique ("5 conseils pour acheter votre premier bien"). Le risque n'est pas l'existence du blog — c'est son traitement éditorial. Sur la forme structurelle, le risque de dilution est réel si le blog est aussi visible que BIENS DISPONIBLES. | Acceptable si les sujets restent terrain — risque éditorial à surveiller, risque de positionnement si trop mis en avant |
| **Label "BLOG"** | "BLOG" est le mot le plus générique possible — il ne dit pas le territoire éditorial, ni le ton, ni la valeur. Le BlogTeaser utilise "Notre regard" (label) + "Derniers articles" (titre). Cette dichotomie crée une incohérence : la nav dit "BLOG", la section homepage dit "Notre regard". "Notre regard" est nettement plus aligné avec le positionnement Versi — il implique un point de vue, pas une production de contenu. Autres candidats : "Analyses" (trop savant), "Le terrain" (cohérent avec le territoire, un peu affecté), "Actualités" (trop institutionnel / mairie). | A ajuster — "Notre regard" ou "Le terrain" vaut mieux que "BLOG" |
| **Placement du BlogTeaser dans la homepage** | Ordre des sections : Hero → Arguments → AvailableProperties → Stats → TeamTeaser → **BlogTeaser** → SellerBanner. Le BlogTeaser est en avant-dernière position, juste avant le bloc vendeurs. C'est une zone de bas de page, après la conversion principale (biens disponibles), après la preuve (stats, équipe). Cette position est correcte : le parcours conversion de Kévin (Hero → biens → contact) n'est pas perturbé. Le blog arrive après que l'essentiel a été exposé. | Correct — position basse de page appropriée |
| **Impact sur le parcours Kévin vers /nos-biens** | Sur la homepage, le BlogTeaser est positionné après AvailableProperties — Kévin a déjà vu les biens avant de croiser le blog. Aucun risque de déflection précoce. Sur la nav en revanche, BLOG en position 3 est un lien de sortie potentiel avant même que Kévin ne soit allé sur /nos-biens. Un Kévin qui arrive sur la homepage et scanne la nav pourrait cliquer sur BLOG par curiosité, lire un article, et ne jamais convertir. Ce risque est faible (la nav n'est pas le parcours principal), mais il n'est pas nul. | Risque faible sur homepage, risque modéré dans la nav |

---

## 2. Recommandations

### P0 — Repositionner le BLOG en fin de nav

**Problème :** BLOG en position 3 lui donne un poids visuel que son rôle ne justifie pas. Ce n'est pas une page de conversion, pas une page de preuve directe. C'est un contenu complémentaire.

**Action :** déplacer le lien blog en dernière position avant CONTACT, ou entre NOTRE APPROCHE et CONTACT.

**Ordre recommandé :**
```
BIENS DISPONIBLES → RÉALISATIONS → NOTRE APPROCHE → NOTRE REGARD → CONTACT
```

CONTACT reste en dernière position — c'est la conversion terminale. Le blog en avant-dernière signale qu'il est là, mais ne concurrence pas les pages d'entrée principale.

---

### P0 — Renommer le label "BLOG" en "NOTRE REGARD"

**Problème :** "BLOG" est générique et incohérent avec le label déjà utilisé dans le BlogTeaser sur la homepage. Deux noms pour la même chose = signal d'incohérence.

**Action :** dans `Nav.jsx`, remplacer `{ label: 'BLOG', href: '/blog' }` par `{ label: 'NOTRE REGARD', href: '/blog' }`. Même changement dans `Footer.jsx` ligne 127 (`Blog` → `Notre regard`).

**Bénéfice secondaire :** "Notre regard" est aligné avec le positionnement "point de vue terrain" — il implique une sélection éditoriale, pas une production en volume.

---

### P1 — Conditionner l'existence du BlogTeaser en homepage à la qualité des articles

**Problème :** `BlogTeaser.jsx` affiche les 3 derniers articles sans filtre éditorial. Si les articles ne sont pas terrain (ex : articles SEO génériques), ils fragilisent le positionnement "pas de blabla".

**Action :** définir un critère éditorial minimum avant publication. Chaque article doit répondre à l'une de ces trois questions : (1) Qu'est-ce que ça donne concrètement sur ce chantier / ce quartier ? (2) Qu'est-ce que Kévin doit savoir avant d'acheter dans ce secteur ? (3) Qu'est-ce qui a changé sur le marché Hauts-de-France ce mois-ci, et comment ça change le calcul d'un acheteur ? Tout article qui ne répond à aucune des trois n'est pas publié.

---

### P2 — Vérifier la cohérence du label dans le titre de la page BlogPage

**Action :** s'assurer que la page `/blog` utilise bien "Notre regard" dans son H1 ou son titre visible — et non "Blog". La consultation de `BlogPage.jsx` permettrait de confirmer, mais c'est une vérification de cohérence à faire sans urgence.

---

## 3. Verdict global

**A ajuster — deux points bloquants de cohérence.**

La structure est saine : le BlogTeaser est bien positionné en bas de homepage, le footer est cohérent. Le blog n'est pas un problème de fond pour le positionnement Versi — à condition que le traitement éditorial reste terrain.

Les deux ajustements P0 sont des corrections de 10 minutes dans Nav.jsx et Footer.jsx :
1. Déplacer BLOG de la position 3 à la position 4 (avant CONTACT)
2. Renommer "BLOG" → "NOTRE REGARD" dans la nav et le footer

Ces deux points corrigent une incohérence visible (deux labels pour la même destination) et alignent la nav avec le positionnement "regard de terrain, pas de contenu générique".

---

**Handoff → @fullstack**
- Fichiers produits : `docs/reviews/creative-audit-blog-nav.md`
- Décisions prises :
  - Le blog est légitime dans la nav mais mal positionné (trop haut) et mal nommé ("BLOG" vs "Notre regard" déjà utilisé dans le BlogTeaser)
  - Ordre nav recommandé : BIENS DISPONIBLES → RÉALISATIONS → NOTRE APPROCHE → NOTRE REGARD → CONTACT
  - Label recommandé : "NOTRE REGARD" dans `Nav.jsx` et `Footer.jsx`
  - Placement du BlogTeaser en homepage (avant-dernier) : validé, pas de modification nécessaire
- Points d'attention :
  - Changement de label dans Nav.jsx ligne 8 : `'BLOG'` → `'NOTRE REGARD'`
  - Changement de position dans NAV_ITEMS : index 2 → index 3
  - Changement dans Footer.jsx ligne 127 : texte "Blog" → "Notre regard"
  - Vérifier que le H1 de BlogPage.jsx est aligné avec le label retenu
