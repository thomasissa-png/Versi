# Audit animations Hero — versi.fr
**Agent** : @design | **Date** : 2026-04-09

## Note globale : 7/10

Solide mais pas encore au niveau d'un opérateur immobilier premium. L'architecture de l'animation est juste — cascade logique, fade-up discret, pas de fioritures. Ce qui retient de passer à 9/10 : le timing est trop uniforme (mécanique), le translateY est sous-calibré et identique sur tous les éléments sans hiérarchie de mouvement, et deux défauts de finition bloquants (easing générique, prefers-reduced-motion absent = bug d'accessibilité réel). Rien de bloquant sur la structure, tout est corrigeable en moins d'une heure.

---

## Détail par critère

| Critère | Note | Commentaire |
|---|---|---|
| Qualité perçue | 7/10 | Le fade-up discret et le grain SVG en pseudo-élément donnent une touche de matière. Mais le `ease-out` générique sur `heroFadeIn` et le stagger mathématique en font une animation interchangeable avec 500 autres sites React. Propre, pas distinctif. |
| Timing et rythme | 6/10 | Stagger en multiples rigides de 120ms (0 → 120 → 240 → 360 → 480ms). Mécanique de métronome. Le saut à 700ms sur le chevron est le seul moment de respiration — bonne intuition, mal exploitée. Un tempo premium varie légèrement entre les éléments pour simuler un rythme humain. |
| Mouvement | 6/10 | `translateY(10px)` uniforme sur tous les éléments sans hiérarchie. Sur un titre display de 60px+, 10px représente moins de 17% de sa hauteur — imperceptible sur desktop. Et le surtitre, le titre et le sous-titre bougent tous du même 10px, alors que le titre est l'élément central qui devrait avoir le mouvement le plus affirmé. |
| Cohérence | 8/10 | La séquence surtitre → titre → accent → sous-titre → CTAs → chevron est narrativement correcte. L'accent (trait 48px) joue son rôle de pause visuelle entre le titre et le sous-titre. Le chevron traité séparément avec plus de délai est la bonne décision. Seul reproche : les deux CTAs arrivent dans un même div avec une seule classe de fade — on perd le stagger primaire → secondaire qui renforcerait la hiérarchie d'action. |
| Finition | 5/10 | Deux manques sérieux. (1) Pas de `prefers-reduced-motion` : quand l'utilisateur a désactivé les animations système, les éléments restent bloqués en `opacity: 0` (via `hero__hidden`) car l'animation est coupée mais la classe hidden n'est pas overridée — tout le Hero devient invisible. C'est un bug d'accessibilité, pas une mauvaise pratique. (2) L'easing `ease-out` est le fallback du navigateur — aucune signature propre au projet. Un `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) donnerait une entrée plus vive et une fin plus posée, cohérent avec le positionnement "maîtrise". Pas de `:focus-visible` non plus sur les CTAs dans le CSS. |
| Impact émotionnel | 7/10 | Pour Laurent (48 ans, family office, juge en 10 secondes), le résultat inspire une confiance correcte — ni cheap, ni flashy. Mais "correct" n'est pas "mémorable". La marque affirme maîtrise et contrôle — l'animation devrait manifester cette maîtrise par une précision dans les choix (des délais qui semblent voulus, pas calculés par `n × 120ms`). Actuellement l'animation parle, pas encore avec autorité. |

---

## Ce qui fonctionne

**Architecture de la cascade** : 6 éléments animés individuellement, chacun avec sa propre classe `hero__fade--N`. Le conteneur `hero__content` n'a aucune animation — c'est exactement la bonne approche. La séquence est narrativement cohérente et logique.

**Amplitude contenue (10px)** : pour une marque institutionnelle, ne pas exagérer le translateY est le bon instinct. Un Startup ferait 40px avec bounce. Ici le choix de la discrétion est juste — il est juste sous-calibré et surtout non hiérarchisé, pas mal calibré dans le principe.

**Grain SVG en pseudo-élément** : détail de finition qui casse le fond flat et ajoute de la matière. Invisible pour l'utilisateur lambda, ressenti inconsciemment. Le genre de détail qu'un DA premium inclut et qu'un développeur seul n'aurait pas eu.

**Déclenchement via `requestAnimationFrame`** : évite le FOUC. Technique propre.

**Scroll hint traité à part** : délai 700ms + pulse infinie à 1000ms. Rythme doux, non intrusif. La disparition au scroll (threshold 50px, passive listener, cleanup correct) est irréprochable.

**Touch targets CTAs** : `min-height: 44px` sur les deux liens — conformes WCAG mobile.

---

## Ce qui empêche le 10/10

**1. Bug d'accessibilité prefers-reduced-motion** — priorité absolue. Quand `prefers-reduced-motion: reduce` est actif, le navigateur coupe les animations CSS mais les éléments gardent la classe `hero__hidden` (opacity: 0). Résultat : le Hero entier est invisible pour ces utilisateurs.

**2. Stagger mécanique 120ms × n** — sonne algorithmique, pas designé. Un rythme premium varie de quelques dizaines de millisecondes pour simuler une cadence humaine.

**3. translateY uniforme sans hiérarchie de mouvement** — le titre principal devrait bouger plus (16-20px) que les éléments secondaires (8-10px). Actuellement tout fait 10px, l'œil ne perçoit pas de hiérarchie dans le mouvement.

**4. Easing générique** — `ease-out` sur `heroFadeIn` est le choix par défaut. Un easing expo-out donnerait une signature propre au projet.

**5. CTAs non staggerés** — le CTA primaire et secondaire arrivent ensemble dans un même div. Un stagger de 80ms entre les deux renforcerait la hiérarchie visuelle primaire → secondaire.

**6. Pas de `:focus-visible` sur les CTAs** — les transitions hover sont définies mais aucun état focus clavier visible. Manquant pour la conformité WCAG 2.2 AA.

---

## Recommandations concrètes

### R1 — Corriger le bug prefers-reduced-motion (P0 — bug d'accessibilité)

```css
/* Ajouter à la fin de Hero.css */
@media (prefers-reduced-motion: reduce) {
  .hero__hidden {
    opacity: 1; /* rendre visible immédiatement, pas d'animation */
  }
  .hero__fade {
    animation: none;
    opacity: 1;
  }
  .hero__scroll-hint {
    animation: none;
    opacity: 0.6;
  }
}
```

### R2 — Easing expo-out et keyframe dédiée au titre (P1)

```css
/* AVANT */
.hero__fade {
  animation: heroFadeIn var(--duration-slow) ease-out forwards;
}

@keyframes heroFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* APRÈS */
.hero__fade {
  animation: heroFadeIn var(--duration-slow) cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes heroFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Keyframe dédiée pour le titre — amplitude plus forte */
@keyframes heroFadeInTitle {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero__fade--1 {
  animation-name: heroFadeInTitle;
}
```

### R3 — Stagger revu pour casser la mécanique 120ms (P1)

```css
/* AVANT — mécanique, trop régulier */
.hero__fade--0 { animation-delay: 0ms; }
.hero__fade--1 { animation-delay: 120ms; }
.hero__fade--2 { animation-delay: 240ms; }
.hero__fade--3 { animation-delay: 360ms; }
.hero__fade--4 { animation-delay: 480ms; }
.hero__fade--5 { animation-delay: 700ms; }

/* APRÈS — rythme légèrement irrégulier, respire davantage */
.hero__fade--0  { animation-delay: 0ms; }
.hero__fade--1  { animation-delay: 100ms; }
.hero__fade--2  { animation-delay: 220ms; }
.hero__fade--3  { animation-delay: 360ms; }
.hero__fade--4  { animation-delay: 520ms; }  /* CTA primaire */
.hero__fade--4b { animation-delay: 600ms; }  /* CTA secondaire — voir R4 */
.hero__fade--5  { animation-delay: 780ms; }
```

### R4 — Découpler les CTAs pour stagger individuel (P1)

Dans `Hero.jsx`, supprimer la classe fade sur le wrapper et l'appliquer sur chaque CTA :

```jsx
/* AVANT */
<div className={`hero__ctas ${loaded ? 'hero__fade hero__fade--4' : 'hero__hidden'}`}>
  <a href="#approche" className="hero__cta-primary" ...>NOTRE APPROCHE</a>
  <a href="#contact" className="hero__cta-secondary" ...>NOUS CONTACTER →</a>
</div>

/* APRÈS */
<div className="hero__ctas">
  <a
    href="#approche"
    className={`hero__cta-primary ${loaded ? 'hero__fade hero__fade--4' : 'hero__hidden'}`}
    onClick={(e) => handleClick(e, '#approche')}
  >
    NOTRE APPROCHE
  </a>
  <a
    href="#contact"
    className={`hero__cta-secondary ${loaded ? 'hero__fade hero__fade--4b' : 'hero__hidden'}`}
    onClick={(e) => handleClick(e, '#contact')}
  >
    NOUS CONTACTER →
  </a>
</div>
```

### R5 — Ajouter focus-visible sur les CTAs (P2)

```css
/* Ajouter dans Hero.css */
.hero__cta-primary:focus-visible {
  outline: 2px solid var(--color-text-inverse);
  outline-offset: 4px;
}

.hero__cta-secondary:focus-visible {
  outline: 2px solid var(--color-text-inverse);
  outline-offset: 4px;
}
```

---

## Projection post-corrections

| Critère | Avant | Après R1-R5 |
|---|---|---|
| Qualité perçue | 7/10 | 8/10 |
| Timing et rythme | 6/10 | 8/10 |
| Mouvement | 6/10 | 8/10 |
| Cohérence | 8/10 | 9/10 |
| Finition | 5/10 | 9/10 |
| Impact émotionnel | 7/10 | 9/10 |
| **Global** | **7/10** | **8.5/10** |

Le 10/10 est réservé aux animations qui ont une signature propre au projet — morphing, parallaxe contextuelle, micro-interactions sur les CTAs. Pour une holding institutionnelle ciblant Laurent, 8.5/10 est le target juste : aller au-delà risque de basculer dans "trop travaillé" et perdre la crédibilité perçue. L'objectif n'est pas d'impressionner — c'est de confirmer en 10 secondes que les gens en face savent ce qu'ils font.

---

## Handoff → @fullstack

- Fichiers à modifier : `src/src/components/Hero.jsx`, `src/src/components/Hero.css`
- Corrections par priorité :
  - **P0** : R1 — bug `prefers-reduced-motion` (contenu Hero invisible pour les utilisateurs avec animations désactivées système — bug d'accessibilité réel, pas théorique)
  - **P1** : R2 — easing `cubic-bezier(0.16, 1, 0.3, 1)` + keyframe dédiée titre avec `translateY(20px)`
  - **P1** : R3 — revoir les delays du stagger pour casser le 120ms mécanique
  - **P1** : R4 — découpler les deux CTAs dans des éléments séparés avec classes `hero__fade--4` et `hero__fade--4b`
  - **P2** : R5 — focus-visible clavier sur les deux CTAs
- Test de validation R1 : activer "Réduire le mouvement" dans les réglages système (macOS : Accessibilité → Mouvement, iOS : Général → Accessibilité) et vérifier que le Hero est entièrement lisible sans animation
- Aucune dépendance externe — toutes les corrections sont localisées dans 2 fichiers
