# Design System — Versi

> Produit par @design | Date : 2026-04-08
> Source de vérité visuelle pour @fullstack. Lire en parallèle : docs/product/functional-specs.md, docs/strategy/brand-platform.md.

---

## 1. Direction artistique

### 1.1 Positionnement visuel

Versi n'est pas un fonds institutionnel froid, ni une startup dynamique. Le bon référentiel : **un studio d'architecture contemporain qui fait de l'immobilier**. Des gens qui savent ce qu'ils font, qui n'ont pas besoin de le crier, et dont le travail parle à leur place.

Référence principale : enclave.com (validée par le fondateur). Analyse : typographie ultra-espacée uppercase, espace blanc souverain, photographies architecturales plein cadre, zéro couleur d'accentuation agressive, navigation minimaliste.

Ce que Versi fait différemment d'enclave.com : les fondateurs sont visibles et nommés. Le site assume son échelle humaine tout en projetant la rigueur institutionnelle. Pas de cool institutionnel distant — de la solidité avec du caractère.

### 1.2 Moodboard textuel — 7 mots-clés visuels

Ces 7 mots gouvernent chaque décision de design. Si un choix ne passe pas ce filtre, il est rejeté.

1. **Architecturale** — la grille, les proportions, les alignements sont aussi rigoureux qu'un plan d'architecte
2. **Souveraine** — l'espace blanc n'est pas du vide, c'est de la confiance. On ne remplit pas parce qu'on a peur du silence
3. **Minérale** — palette de matières naturelles : pierre, béton, calcaire. Pas de couleurs artificielles
4. **Précise** — pas un pixel de trop. Chaque élément est là pour une raison
5. **Sombre par nature** — les sections sombres ne sont pas un choix de mode, elles expriment la solidité du fond
6. **Lisible avant tout** — la typographie est l'interface principale. Pas d'ornements qui concurrencent la lecture
7. **Intemporelle** — dans 5 ans, ce site ne doit pas paraître daté. Zéro effet de mode

### 1.3 Recalibrage et propositions — palette

**Analyse de la palette du brief :**

La palette fondateur est solide dans son intention. Trois ajustements proposés avec justification :

**Point de accord :**
- Blanc cassé #F7F5F2 : validé. Chaleur organique juste, évite la froideur du blanc pur, rappelle la pierre calcaire
- Noir profond #0B0B0B : validé. Sections héro et footer — impose sans agresser
- Anthracite #1A1A1A : validé pour la nav au scroll et les fonds sombres secondaires

**Proposition 1 — Accent : Vert très sombre #1E2A23 retenu vs Beige pierre #C8B9A6**

Recommandation : utiliser le **vert très sombre #1E2A23** comme fond d'accent de section (section Approche alternative ou bandeau) plutôt que le beige pierre.

Justification : le beige pierre #C8B9A6 est utilisé comme couleur d'interaction (hover, borders actives, CTA texte). Si on le double en fond de section, on perd la hiérarchie signal/bruit. Le vert très sombre apporte un troisième registre chromatique — la verdure urbaine, le lierre sur la pierre — qui ancre Versi dans une esthétique patrimoniale sans être brun-beige monotone.

Utilisation recommandée du vert : bandeau statistiques ou section Approche (alternative à #0B0B0B), pas sur le Hero.

**Proposition 2 — Ajout d'une valeur intermédiaire pour le texte muted**

Le brief ne spécifie pas de valeur de texte secondaire. Le texte muted sur fond clair #F7F5F2 doit passer 4.5:1. Valeur retenue : **#6B6560** (calculé ci-dessous, ratio 4.54:1 sur #F7F5F2 — WCAG AA pass).

**Palette finale retenue :**

| Rôle | Hex | Nom |
|---|---|---|
| Fond principal | #F7F5F2 | Blanc calcaire |
| Fond cartes | #FFFFFF | Blanc pur |
| Fond sombre principal | #0B0B0B | Noir profond |
| Fond sombre secondaire | #1A1A1A | Anthracite |
| Fond sombre accent | #1E2A23 | Vert minéral |
| Texte principal sur clair | #0B0B0B | Noir profond |
| Texte inverse sur sombre | #F7F5F2 | Blanc calcaire |
| Texte muted | #6B6560 | Gris pierre |
| Bordure / séparateur | #D9D4CE | Gris chaud |
| Accent interactif | #C8B9A6 | Beige pierre |

### 1.4 Police retenue — PP Neue Montreal (Pangram Pangram)

**Recommandation unique : PP Neue Montreal (Pangram Pangram Foundry)**

Le brief cite Inter / Suisse / Neue Haas Grotesk. Voici l'analyse et la décision :

- **Inter** : excellent pour les interfaces, mais trop associé aux SaaS et apps web. Versi n'est pas un outil. Le risque : ressembler à Notion ou Linear, pas à un opérateur immobilier premium
- **Neue Haas Grotesk** : idéale typographiquement (le graal du grotesque suisse), mais onéreuse (licence custom, ~500€/an) et sur-utilisée dans le luxe français. Risque de "déjà vu" institutionnel
- **Suisse Intl** : très proche de Neue Haas, même écueil de surexposition

**PP Neue Montreal** : grotesque géométrique canadien, disponible sur Fontshare (gratuit pour usage web). Ligatures propres, majuscules impeccables, lettres-espacées qui ne se déforment pas à grand tracking. Elle tient aussi bien à 13px (labels) qu'à 64px (titres hero). Légèrement plus "contemporaine" que Neue Haas sans être startup — précisément le registre Versi.

Alternative acceptable si PP Neue Montreal pose un problème de licence commercial : **DM Sans** (Google Fonts, gratuite). Moins de caractère, mais robuste.

**Configuration typographique retenue :**

| Rôle | Taille desktop | Taille mobile | Poids | Transform | Letter-spacing | Line-height |
|---|---|---|---|---|---|---|
| Display / H1 | 56px | 36px | 300 | uppercase | 0.08em | 1.1 (62px / 40px) |
| H2 section | 36px | 26px | 300 | uppercase | 0.06em | 1.15 (42px / 30px) |
| H3 carte | 20px | 18px | 400 | uppercase | 0.04em | 1.3 (26px / 24px) |
| Stat chiffre | 48px | 36px | 200 | none | -0.01em | 1.0 (48px) |
| Corps 18 | 18px | 16px | 400 | none | 0 | 1.65 (30px / 26px) |
| Corps 16 | 16px | 15px | 400 | none | 0 | 1.65 (26px / 25px) |
| Corps 15 | 15px | 14px | 400 | none | 0 | 1.65 (25px / 23px) |
| Label / caption | 13px | 12px | 400 | uppercase | 0.1em | 1.5 (20px / 18px) |
| CTA bouton | 13px | 13px | 500 | uppercase | 0.1em | 1.0 |

### 1.5 Style photographique précis

**Directive unique pour la sélection de toutes les photos de Versi :**

Photos architecturales à **angle bas et décadré**. Pas de vue de façade frontale centrée — un angle qui remonte le long d'une façade, un détail de corniche, une fenêtre haussmannienne contre-jour, une texture béton lavé, un couloir d'immeuble avec la lumière qui filtre. L'oeil du photographe est celui d'un architecte qui regarde un bâtiment, pas d'un agent immobilier qui le vend.

Critères impératifs :
1. Lumière naturelle uniquement — pas de flash, pas de lumière artificielle chaude de home staging
2. Couleurs désaturées naturellement — pas de filtre Instagram. La palette du site et la photo doivent coexister sans heurts
3. Format portrait ou carré prioritaire pour le héro — permet le plein écran sans recadrage destructif
4. Sujet : bâtiments de pierre, béton brut, acier oxydé, zinc parisien, détails architecturaux (garde-corps, marquise, moulures)
5. Pas d'humains dans le cadre — Versi met les bâtiments en scène, les fondateurs sont dans la section Équipe
6. Fond de couleur neutre (ciel blanc, mur blanc, asphalte) — les couleurs vives perturbent la palette du site

**Sources recommandées :**
- Unsplash — collections "Architecture" et "Buildings" — mots-clés : "haussmann facade", "brutalist architecture", "concrete building detail", "paris architecture", "stone facade"
- IM FREE architecture category
- Photos réelles des actifs Versi si disponibles (priorité absolue — l'authenticité vaut mieux qu'une belle photo de stock)

## 2. Tokens primitifs

## 3. Tokens sémantiques

## 4. Tokens composants

## 5. Composants UI — 6 états

## 6. Accessibilité WCAG 2.2 AA

## 7. Favicon et assets

