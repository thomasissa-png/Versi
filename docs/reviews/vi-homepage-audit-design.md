# Audit design/UX — Homepage versi-immobilier.fr
**Agent** : @design  
**Date** : 2026-04-10  
**Priorité** : Desktop 1280px+  
**Direction artistique cible** : minimaliste, architectural, premium — fond sombre Hero, typographie light, grilles strictes

---

## 1. NAV

### Layout actuel
Barre fixe, hauteur définie par `--nav-height`. Structure intérieure flex :`logo | [items] | cta-secondary | cta-primary | hamburger`. Le `max-width` est conteneurisé via `--content-max-width`, padding horizontal `--spacing-2xl`. Hamburger masqué sur desktop, les deux CTAs sont visibles. Total desktop : logo + 4 liens + 2 CTAs = 7 éléments en ligne.

### Verdict desktop 1280px+ — PROBLÈME
La nav contient **deux CTAs côte à côte** ("Proposer un bien" en ghost-text + "NOS BIENS" en bordered button) **en plus de 4 liens de navigation**. Résultat : 7 éléments concurrents dans la barre. Le CTA "NOS BIENS" duplique un lien déjà présent dans `NAV_ITEMS` (`/nos-biens`). La hiérarchie est confuse — deux actions primaires au même niveau visuel. Sur un écran 1280px, avec `--spacing-xl` entre les liens (32px) et le padding `--spacing-2xl` des deux côtés, la nav est chargée et manque d'air.

**Problème spécifique** : `nav__cta-secondary` a `opacity: var(--opacity-readable)` au repos, ce qui le rend lisible mais quasi identique en poids visuel au CTA primary. La hiérarchie secondaire/primaire n'est pas clairement perçue.

**Problème de duplication** : "NOS BIENS" en CTA et "NOS BIENS" en NAV_ITEMS pointent tous les deux vers `/nos-biens`. Doublon inutile qui encombre.

### Verdict tablette 768px — PROBLÈME
Entre 768px et 1279px, le gap des liens passe à `--spacing-md` (16px) et le padding à `--spacing-lg` (24px). Le texte des liens passe à `--font-size-small`. Sur 768px, avec les deux CTAs encore présents, la nav est trop dense. Le cta-secondary reçoit `padding: 8px 8px` — touch target insuffisant (< 44px en largeur si le texte "Proposer un bien" fait moins de 28px).

### Verdict mobile 375px — OK
Sur mobile, liens + CTAs masqués, hamburger affiché. Pas de problème structurel.

### Corrections CSS/JSX

**Correction 1 — Supprimer le CTA "NOS BIENS" en doublon (JSX)**
```jsx
// AVANT — dans Nav.jsx :
<Link to="/vendre" className="nav__cta-secondary">Proposer un bien</Link>
<Link to="/nos-biens" className="nav__cta">NOS BIENS</Link>

// APRÈS — supprimer le CTA "NOS BIENS", garder uniquement "Proposer un bien" comme CTA unique :
<Link to="/vendre" className="nav__cta">Proposer un bien</Link>
```

**Correction 2 — Renforcer la différenciation visuelle du CTA unique**
```css
/* AVANT */
.nav__cta {
  border: 1px solid var(--color-text-inverse);
  padding: 10px 20px;
}

/* APRÈS — CTA plus affirmé, distingué des liens texte */
.nav__cta {
  border: 1px solid var(--color-text-inverse);
  padding: 10px 24px;
  background: rgba(247, 245, 242, 0.08);
}
```

**Correction 3 — Fix touch target tablette**
```css
/* APRÈS (768-1279px) — s'assurer que le CTA unique atteint 44px */
@media (min-width: 768px) and (max-width: 1279px) {
  .nav__cta {
    font-size: var(--font-size-small);
    padding: 10px 16px;
    min-height: 44px;
  }
}
```

---

## 2. HERO

### Layout actuel
Section plein écran (`min-height: 100vh`), fond sombre, contenu centré (flex colonne, `align-items: center`, `text-align: center`). Contenu : surtitre label → h1 (3rem light) → accent bar (48px × 1px) → sous-titre → deux CTAs horizontaux. Max-width du contenu : 860px, padding latéral `--spacing-lg` (24px).

### Verdict desktop 1280px+ — OK
La composition est propre et minimaliste. Le h1 à 3rem est bien calibré pour le format centré. La hierarchy surtitre → titre → accent → sous-titre → CTAs fonctionne. La texture grain est subtile et non distrayante.

**Nuance** : l'accent bar (48px × 1px) est trop timide sur desktop. 1px de hauteur la rend presque invisible. Elle remplit son rôle de séparateur rythmique mais manque de présence.

### Verdict tablette 768px — OK
Le titre passe à 2.5rem, correct. Pas de problème.

### Verdict mobile 375px — OK
Titre à 2rem, CTAs en stack vertical pleine largeur, min-height en `100svh` (correction iOS correcte). Conforme.

### Corrections CSS

**Correction — Accent bar : épaissir légèrement pour la rendre lisible sur desktop**
```css
/* AVANT */
.hero__accent {
  width: 48px;
  height: 1px;
}

/* APRÈS */
.hero__accent {
  width: 48px;
  height: 2px;
}
```

---

## 3. AVAILABLE PROPERTIES (grille des biens)

### Layout actuel
Section `featured` sur fond `--color-bg-primary`. Grille CSS : `repeat(3, 1fr)` avec `gap: --spacing-lg` (24px). Responsive : 2 colonnes sous 1280px, 1 colonne sous 768px. Les PropertyCards n'ont pas de contrainte de hauteur fixe.

### Verdict desktop 1280px+ — PROBLÈME MAJEUR

C'est le problème signalé par le fondateur. La cause est identifiée :

**Problème 1 — Aucune contrainte de taille sur les cards en grille**. La PropertyCard contient une image avec `aspect-ratio: 16/9`. Sur un conteneur `max-width: var(--content-max-width)` (probablement 1280px ou 1440px), une colonne fait environ 400-480px de large. L'image en 16/9 fait donc **225-270px de hauteur**. Sur mobile, une colonne de 320px donne une image de 180px — c'est calibré pour ça. Sur desktop 1280px, la même card s'étale sur 480px de large et son image domine visuellement.

**Problème 2 — `section-padding` sur fond clair sans contrainte de max-width interne**. Le padding de section ajoute de l'espace vertical qui, combiné à des cards hautes, crée une section qui "écrase" la page.

**Problème 3 — Pas de `max-width` sur les cards elles-mêmes**. La card croît librement avec la colonne.

### Verdict tablette 768px — PROBLÈME MINEUR
2 colonnes : les cards font ~340px de large, image 16/9 à ~191px. Acceptable mais encore un peu lourd.

### Verdict mobile 375px — OK
1 colonne, image 16/9 calibrée pour 375px. C'était l'état de départ — c'est correct.

### Corrections CSS

**Correction prioritaire — Ratio d'image adapté au desktop**
```css
/* DANS PropertyCard.css */
/* AVANT */
.property-card__image {
  aspect-ratio: 16 / 9;
}

/* APRÈS — ratio plus compact sur desktop, identique sur mobile */
.property-card__image {
  aspect-ratio: 4 / 3;
}

@media (min-width: 1280px) {
  .property-card__image {
    aspect-ratio: 3 / 2;
  }
}
```

**Alternative plus efficace — Ajouter une hauteur max sur l'image pour toutes les breakpoints**
```css
/* DANS PropertyCard.css */
.property-card__image {
  width: 100%;
  aspect-ratio: 4 / 3;
  max-height: 200px;
  object-fit: cover;
  position: relative;
  background: linear-gradient(135deg, var(--color-calcaire-50), var(--color-stone-200));
}
```

**Correction secondaire — Réduire le gap sur desktop pour des cards plus compactes**
```css
/* DANS FeaturedProjects.css */
/* AVANT */
.featured__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-lg);
}

/* APRÈS — gap identique mais cards moins hautes grâce à la correction image */
/* Aucun changement nécessaire sur la grille si l'image est corrigée */
```

**Correction body padding — réduire le padding interne des cards sur desktop**
```css
/* DANS PropertyCard.css */
/* AVANT */
.property-card__body {
  padding: 16px 20px;
}

/* APRÈS — inchangé, le padding est raisonnable */
/* Pas de correction nécessaire sur le body */
```

---

## 4. ARGUMENTS

### Layout actuel
Grille inline style `repeat(3, 1fr)` avec `gap: --spacing-xl` (32px). Pas de classe CSS dédiée — tout en `style={{}}` JSX. Responsive via injection `<style>` avec un sélecteur fragile `div[style*="repeat(3, 1fr)"]`.

### Verdict desktop 1280px+ — OK (visuellement)
La grille fonctionne à 3 colonnes. Les titres à 1.25rem et les corps en `text-body-sm` sont bien proportionnés. Pas de problème visuel.

**Problème de maintenabilité critique** : le pattern de responsive via `<style>` injecté avec `div[style*="repeat(3, 1fr)"]` est fragile et cassant. Ce sélecteur est shared avec TeamTeaser (même pattern injecté dans le même scope DOM). Si un futur développeur modifie le style inline, le responsive casse silencieusement. Ce n'est pas une correction CSS — c'est une dette technique à traiter.

### Verdict tablette 768px — PROBLÈME POTENTIEL
Aucun breakpoint intermédiaire entre 768px et desktop. Sur 768px, 3 colonnes avec `gap: 32px` dans un conteneur ~720px = colonnes de ~213px chacune. Les titres peuvent wrapper sur 2-3 lignes. Pas bloquant mais serré.

### Verdict mobile 375px — OK (fonctionne mais fragile)
Le style injecté force `grid-template-columns: 1fr !important` sur mobile. Ça fonctionne mais la technique est non recommandée.

### Corrections JSX (dette maintenabilité)

**Correction recommandée — Extraire vers une classe CSS propre**
```jsx
// DANS Arguments.jsx — AVANT (grille inline)
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 'var(--spacing-xl)',
}}>

// APRÈS — utiliser une classe CSS
<div className="arguments__grid">
```

```css
/* NOUVELLE CLASSE À AJOUTER dans un fichier Arguments.css */
.arguments__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xl);
}

@media (max-width: 1023px) {
  .arguments__grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
}
```

**Supprimer le bloc `<style>` injecté dans Arguments.jsx et TeamTeaser.jsx.**

---

## 5. STATS

### Layout actuel
Grille 3 colonnes, `gap: --spacing-2xl` (48px), texte centré. Valeurs en `text-stat`, labels en `text-label`. Fond `--color-bg-primary`. Sur mobile : stack vertical `gap: --spacing-xl`.

### Verdict desktop 1280px+ — OK
Section propre, bien proportionnée. Le centrage des chiffres fonctionne dans une grille 3 colonnes. Gap de 48px entre les items donne de l'aération sans disproportion.

**Nuance** : Stats sur fond `--color-bg-primary` (clair), après la section AvailableProperties également sur fond clair. Deux sections claires consécutives sans rupture visuelle — voir section "Rythme visuel" ci-dessous.

### Verdict tablette 768px — OK
Pas de breakpoint entre 768px et desktop — les 3 colonnes restent à 768px, ce qui est serré mais fonctionnel pour 3 chiffres courts.

### Verdict mobile 375px — OK
Stack vertical correct.

### Corrections
Aucune correction structurelle nécessaire. La Stats est la section la mieux construite de la homepage.

---

## 6. TEAMTEASER

### Layout actuel
Fond `--color-bg-secondary`. Structure inline style : grille 3 colonnes `repeat(3, 1fr)`, `gap: --spacing-xl`. Chaque fondateur : cercle 64×64px (initiales) + nom h3 + track record texte. Responsive via `<style>` injecté (même pattern fragile qu'Arguments).

### Verdict desktop 1280px+ — PROBLÈME MINEUR

**Problème 1 — Cercles d'initiales 64×64px disproportionnés sur desktop**. Sur un conteneur large, 64px de diamètre est un avatar minuscule face aux colonnes de ~380px. Le visuel "carte fondateur" manque d'ancrage — le cercle flotte seul. Il n'y a pas de photo (normal pour une V1), mais les initiales en `1.25rem light` sur un fond `--color-stone-200` sont peu lisibles si le contraste est faible.

**Problème 2 — Pas de séparation visuelle entre les colonnes**. Sur desktop, 3 colonnes de texte sans border ni espace suffisant peuvent se lire comme une continuation de texte plutôt que comme 3 profils distincts.

### Verdict tablette 768px — PROBLÈME (même que Arguments)
3 colonnes sur 768px dans un conteneur ~720px = ~213px par colonne. Le nom "Carl Standertskjold-Nordenstam" wrappera sur 2 lignes en `1.125rem`. Serré.

### Verdict mobile 375px — OK (fonctionne, même fragilité)

### Corrections CSS

**Correction 1 — Agrandir le cercle pour mieux ancrer les profils sur desktop**
```jsx
// DANS TeamTeaser.jsx — AVANT
width: '64px',
height: '64px',

// APRÈS
width: '80px',
height: '80px',
```

**Correction 2 — Ajouter un breakpoint tablette pour passer à 1 colonne plus tôt**
```css
/* Si extrait en CSS propre (recommandé) */
.team-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xl);
}

@media (max-width: 1023px) {
  .team-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
}
```

---

## 7. RYTHME VISUEL DE LA PAGE

### Séquence des fonds (telle qu'implémentée)
1. **Hero** — fond sombre (`--color-bg-dark`) ✓ ancrage fort
2. **AvailableProperties** — fond clair (`--color-bg-primary`) ✓ contraste avec Hero
3. **Stats** — fond clair (`--color-bg-primary`) ✗ **même fond que AvailableProperties** — continuité visuelle, pas de rupture
4. **Arguments** — fond clair (`--color-bg-primary`) ✗ **troisième section claire consécutive** — la page perd son rythme
5. **TeamTeaser** — fond secondaire (`--color-bg-secondary`) — légère variation mais probablement imperceptible si secondary est proche de primary
6. **CTA final** — inconnu (non audité)

**Problème** : après le Hero sombre, la totalité de la page est claire. Il manque une rupture sombre ou une section avec fond accent pour maintenir l'alternance et l'énergie visuelle. Sur une page vitrine premium, 4 sections claires consécutives = page plate.

**Recommandation (sans refonte)** :
```jsx
// Option A — Stats sur fond sombre
// Dans Stats.jsx, changer :
<section className="stats section-padding" ...>
// Background via Stats.css :
.stats { background: var(--color-bg-dark); }
// + Inverser les couleurs de texte (values + labels en --color-text-inverse)

// Option B — Arguments sur fond légèrement décalé
// Dans Arguments.jsx, changer :
style={{ background: 'var(--color-bg-secondary)' }}
// (simple variation de teinte, moins d'impact)
```

**Recommandation prioritaire** : appliquer l'Option A — Stats sur fond sombre. Les chiffres (21, 100%, 3,2M€) ont un impact émotionnel fort. Les mettre sur fond sombre crée un moment de contraste dramatique qui renforce la crédibilité. C'est le pattern utilisé sur versi.fr.

---

## 8. NOTE GLOBALE

**6,5 / 10**

| Dimension | Note | Commentaire |
|---|---|---|
| Direction artistique | 8/10 | Hero correct, typographie light soignée |
| Proportions desktop | 5/10 | PropertyCards trop grandes, Nav surchargée |
| Rythme visuel | 5/10 | 4 sections claires consécutives, pas d'alternance |
| Responsive mobile | 8/10 | Bien construit sur mobile, origin du design visible |
| Maintenabilité CSS | 4/10 | Styles inline + `<style>` injectés dans 2 composants |
| Accessibilité | 7/10 | focus-within sur cards, hamburger avec aria, mais CTA tablette limite touch target |
| Cohérence tokens | 7/10 | Bonne utilisation des variables CSS, quelques valeurs hardcodées (16px, 20px, 64px) |

---

## 9. LES 5 CORRECTIONS CSS LES PLUS IMPACTANTES

**#1 — PropertyCard : changer l'aspect-ratio de l'image** *(impact visuel immédiat, résout le problème principal signalé)*
```css
/* PropertyCard.css */
.property-card__image {
  aspect-ratio: 4 / 3;  /* était 16/9 */
}
@media (min-width: 1280px) {
  .property-card__image {
    aspect-ratio: 3 / 2;  /* encore plus compact sur desktop */
  }
}
```

**#2 — Nav : supprimer le CTA "NOS BIENS" en doublon** *(JSX — réduit la surcharge de la barre)*
```jsx
// Nav.jsx : supprimer cette ligne
<Link to="/nos-biens" className="nav__cta">NOS BIENS</Link>
// Renommer le cta-secondary en cta pour le CTA restant "Proposer un bien"
```

**#3 — Stats : fond sombre pour créer un break visuel** *(recrée le rythme alternance clair/sombre)*
```css
/* Stats.css */
.stats { background: var(--color-bg-dark); }
.stats__value { color: var(--color-text-inverse); }
.stats__label { color: rgba(247, 245, 242, 0.6); }
```

**#4 — Arguments + TeamTeaser : extraire les grilles inline en classes CSS** *(maintenabilité + fix responsive tablette)*
```css
/* Arguments.css (nouveau fichier) */
.arguments__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xl);
}
@media (max-width: 1023px) {
  .arguments__grid { grid-template-columns: 1fr; }
}

/* TeamTeaser.css (nouveau fichier) */
.team-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-2xl);
}
@media (max-width: 1023px) {
  .team-grid { grid-template-columns: 1fr; gap: var(--spacing-lg); }
}
```

**#5 — Hero accent bar : épaisseur 1px → 2px** *(micro-correction, rend le séparateur visible sur retina)*
```css
/* Hero.css */
.hero__accent { height: 2px; }
```

---

## 10. RÉCAPITULATIF PROBLÈMES PAR CRITICITÉ

| Problème | Section | Criticité | Correction |
|---|---|---|---|
| PropertyCard trop haute sur desktop (16/9 sur ~480px) | AvailableProperties | BLOQUANT | Changer aspect-ratio → 4/3 ou 3/2 |
| Nav : CTA "NOS BIENS" en doublon avec lien nav | Nav | MAJEUR | Supprimer le CTA doublon |
| 4 sections claires consécutives — pas de rythme | Page entière | MAJEUR | Stats → fond sombre |
| Grilles inline style + `<style>` injecté fragile | Arguments, TeamTeaser | MAJEUR | Extraire en classes CSS |
| Touch target tablette cta-secondary | Nav | MINEUR | Assurer min-height 44px |
| Cercles initiales 64px trop petits sur desktop | TeamTeaser | MINEUR | Passer à 80px |
| Accent bar 1px invisible sur retina | Hero | MINEUR | Passer à 2px |
| Tablette 768px : 3 colonnes trop serrées (Arguments, Team) | Arguments, TeamTeaser | MINEUR | Breakpoint à 1024px → 1 colonne |

---

**Handoff → @fullstack**

Fichiers à modifier :
- `/versi-immobilier/src/components/PropertyCard.css` — correction aspect-ratio image (#1)
- `/versi-immobilier/src/components/Nav.jsx` — supprimer CTA "NOS BIENS" doublon (#2)
- `/versi-immobilier/src/components/Nav.css` — ajuster styles CTA unique
- `/versi-immobilier/src/components/Stats.css` — fond sombre + couleurs inversées (#3)
- `/versi-immobilier/src/components/Arguments.jsx` — remplacer grille inline par classe `.arguments__grid`
- `/versi-immobilier/src/components/Arguments.css` — créer avec la grille responsive
- `/versi-immobilier/src/components/TeamTeaser.jsx` — remplacer grille inline par classe `.team-grid`, supprimer `<style>` injecté, passer cercles à 80px
- `/versi-immobilier/src/components/TeamTeaser.css` — créer avec la grille responsive
- `/versi-immobilier/src/components/Hero.css` — `.hero__accent { height: 2px; }` (#5)

Ordre d'implémentation recommandé : #1 (visible immédiatement) → #2 → #3 → #4 → #5.

Points d'attention :
- Sur Stats fond sombre : vérifier le contraste WCAG AA des valeurs (`--color-text-inverse` sur `--color-bg-dark`) — le ratio doit être ≥ 4.5:1
- Sur la suppression du CTA "NOS BIENS" Nav : le lien reste dans NAV_ITEMS, l'utilisateur peut toujours accéder à la page via le menu
- Sur le `<style>` injecté dans TeamTeaser : supprimer AUSSI le bloc dans Arguments.jsx — ils partagent le même sélecteur fragile `div[style*="repeat(3, 1fr)"]`
- PropertyCard : si des photos réelles sont ajoutées plus tard, l'`aspect-ratio: 3/2` + `overflow: hidden` (déjà présent sur `.property-card`) gérera automatiquement le crop
