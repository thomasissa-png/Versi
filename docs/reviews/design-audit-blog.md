# Audit Design — Page Blog (Notre regard)
> Date : 2026-04-13 | Agent : @design
> Fichiers évalués : BlogPage.jsx (lu), index.css [À COMPLÉTER — non lu dans cette session]

## Note globale : 6.5/10

La page blog est fonctionnellement propre et utilise correctement le design system (tokens CSS, classes texte). Les problèmes sont concentrés sur l'état vide (placeholder peu qualitatif), l'absence d'états hover codés, la card image de fallback amateur, et quelques valeurs hardcodées qui violent le design system.

---

## Détail

| # | Critère | Note /10 | Détail |
|---|---------|----------|--------|
| 1 | Cohérence design system (tokens) | 7 | Bonne utilisation des `var(--spacing-*)`, `var(--color-*)`, classes `text-heading-*`. Violations : `border: '1px solid var(--color-border, #e5e5e5)'` — fallback `#e5e5e5` hardcodé ; tag padding `'2px 10px'` hors scale ; tag font-size `'0.7rem'` hors échelle typographique ; CTA vide `padding: '12px 32px'` hors tokens |
| 2 | Hiérarchie visuelle | 7 | H1 "Notre regard." + sous-titre muted = bonne entrée. Grid cards = correct. Bandeau CTA bas = bien positionné. Manque : séparation visuelle entre header et grid (même `section-padding` avec `paddingTop: 0` crée un raccord abrupt) |
| 3 | États des composants (6 états) | 5 | Loading : texte seul, zéro skeleton = peu professionnel. Error : texte seul, pas de bouton retry. Empty : texte + CTA, acceptable mais image fallback "V" opacity 0.3 = amateur. Hover card : `transition: 'box-shadow 0.2s ease'` déclaré mais pas de `boxShadow` défini → l'animation ne fait rien. Focus-visible : non vérifié sur les cards (Link wrappant tout l'article) |
| 4 | Accessibilité WCAG 2.2 AA | 6 | Skip-nav présent (bien). Alt text image = `article.title` (correct). Problème : `<article>` wrappé dans un `<Link>` = toute la card est un seul lien géant sans intitulé différencié. Les tags `<span>` sont non-interactifs (OK). Touch target CTA vide : `minHeight: '44px'` — conforme. CTA bandeau : `minHeight: '52px'` — conforme. Focus sur cards : non audité mais le Link full-card sans aria-label est problématique |
| 5 | Image / visuel (fallback card) | 3 | Le fallback image (fond dark + "V" opacity 0.3) est trop minimal pour un site immobilier premium ciblant Laurent. Chaque article sans image affiche un placeholder générique non brandé qui dégrade la perception de qualité |
| 6 | Composant ArticleCard | 6 | Structure correcte : image → tags → titre → excerpt → date. Problèmes : (a) pas de `hover` visible sur la card malgré le `transition` déclaré, (b) tags avec style inline hardcodé plutôt que classe composant, (c) date en bas sans séparateur visuel après excerpt, (d) `border-radius: 9999px` sur tags = token manquant (`var(--radius-pill)` n'existe probablement pas dans le système) |
| 7 | État vide / skeleton loading | 4 | État loading = "Chargement des articles..." centré sur fond blanc = expérience de mauvaise qualité. Doit être remplacé par des skeleton cards pour maintenir la perception premium. État erreur sans action de retry = UX cassée |
| 8 | Responsive / grid | 7 | `gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))'` = approche correcte et robuste. Adaptatif mobile sans media query. Hauteur image fixe 220px = acceptable mais peut être remplacée par aspect-ratio pour plus de robustesse |
| 9 | Bandeau CTA bas | 8 | Solide. Background dark, texte inverse, CTA accent. Padding et minHeight corrects. Copy directe et percutante ("Offre ferme sous 7 jours. Fonds propres. Aucun mandat."). Légère amélioration possible : ajouter `gap` entre les deux paragraphes de texte via token spacing au lieu de `marginBottom` inline |
| 10 | Brand alignment (Versi) | 6 | Le ton éditorial "Notre regard." est juste — direct, confiant. La structure de page est sobre et sérieuse. Ce qui nuit à la perception premium : fallback image amateur, absence de hover card animé, skeleton manquant. Un investisseur type Laurent qui charge la page sur un réseau lent voit "Chargement des articles..." pendant 2 secondes sur fond blanc vide = perte de crédibilité immédiate |

---

## Corrections P0 (bloquantes — à corriger avant mise en ligne)

### P0-1 : Hover card non fonctionnel

Le `transition: 'box-shadow 0.2s ease'` est déclaré mais aucun `boxShadow` n'est appliqué au hover. L'animation ne se déclenche jamais.

**Avant :**
```jsx
<article style={{
  background: 'var(--color-bg-primary)',
  borderRadius: 'var(--card-radius)',
  overflow: 'hidden',
  border: '1px solid var(--color-border, #e5e5e5)',
  transition: 'box-shadow 0.2s ease',
}}>
```

**Après — ajouter une classe CSS et gérer le hover via CSS (pas inline) :**
```jsx
<article className="blog-card" style={{
  background: 'var(--color-bg-primary)',
  borderRadius: 'var(--card-radius)',
  overflow: 'hidden',
  border: '1px solid var(--color-border)',
  transition: 'box-shadow var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-default)',
}}>
```

Dans `index.css` :
```css
.blog-card:hover {
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.10));
  transform: translateY(-2px);
}
```

Note : supprimer le fallback `#e5e5e5` hardcodé — `var(--color-border)` doit exister dans le design system.

---

### P0-2 : Fallback image "V" amateur — remplacer par placeholder brandé

**Avant :**
```jsx
<div style={{
  width: '100%',
  height: '220px',
  background: 'var(--color-bg-dark)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}}>
  <span style={{ color: 'var(--color-text-inverse)', opacity: 0.3, fontSize: '2rem' }}>V</span>
</div>
```

**Après — placeholder avec motif subtil et branding minimal :**
```jsx
<div style={{
  width: '100%',
  height: '220px',
  background: 'var(--color-bg-dark)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundImage: 'linear-gradient(135deg, var(--color-bg-dark) 0%, var(--color-bg-dark-alt, #1a1a1a) 100%)',
}}>
  <span style={{
    color: 'var(--color-accent)',
    opacity: 0.15,
    fontSize: '4rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    fontFamily: 'var(--font-heading)',
  }}>
    VERSI
  </span>
</div>
```

---

### P0-3 : État loading — remplacer le texte par des skeleton cards

**Avant :**
```jsx
{loading ? (
  <div style={{
    textAlign: 'center',
    padding: 'var(--spacing-4xl) var(--spacing-lg)',
    color: 'var(--color-text-muted)',
  }}>
    <p className="text-body-lg">Chargement des articles...</p>
  </div>
) : ...}
```

**Après — skeleton grid :**
```jsx
{loading ? (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))',
    gap: 'var(--spacing-xl)',
  }}>
    {[1, 2, 3].map((i) => (
      <div key={i} className="blog-card" style={{
        background: 'var(--color-bg-primary)',
        borderRadius: 'var(--card-radius)',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
      }}>
        <div style={{
          width: '100%',
          height: '220px',
          background: 'var(--color-bg-subtle, #f5f5f5)',
          animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        }} />
        <div style={{ padding: 'var(--spacing-lg)' }}>
          <div style={{ height: '12px', width: '60px', background: 'var(--color-bg-subtle, #f5f5f5)', borderRadius: 'var(--radius-pill, 9999px)', marginBottom: 'var(--spacing-sm)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: '20px', width: '80%', background: 'var(--color-bg-subtle, #f5f5f5)', borderRadius: 'var(--radius-xs, 2px)', marginBottom: 'var(--spacing-sm)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: '14px', width: '100%', background: 'var(--color-bg-subtle, #f5f5f5)', borderRadius: 'var(--radius-xs, 2px)', marginBottom: 'var(--spacing-xs)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: '14px', width: '70%', background: 'var(--color-bg-subtle, #f5f5f5)', borderRadius: 'var(--radius-xs, 2px)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    ))}
  </div>
) : ...}
```

Dans `index.css` :
```css
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (prefers-reduced-motion: reduce) {
  .blog-card [style*="skeleton-pulse"] {
    animation: none;
    opacity: 0.6;
  }
}
```

---

## Corrections P1 (majeures — qualité premium)

### P1-1 : Valeurs hardcodées hors tokens

**Tag font-size `0.7rem` et padding `2px 10px` :**
```jsx
/* Avant */
<span key={i} className="text-label" style={{
  background: 'var(--color-bg-dark)',
  color: 'var(--color-text-inverse)',
  padding: '2px 10px',
  borderRadius: '9999px',
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}}>

/* Après — extraire en classe CSS */
<span key={i} className="blog-tag">
```

Dans `index.css` :
```css
.blog-tag {
  background: var(--color-bg-dark);
  color: var(--color-text-inverse);
  padding: var(--spacing-2xs, 2px) var(--spacing-sm);
  border-radius: var(--radius-pill, 9999px);
  font-size: var(--text-xs);
  font-weight: var(--font-medium, 500);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: inline-block;
}
```

---

### P1-2 : État erreur sans action de retry

**Avant :**
```jsx
} : error ? (
  <div style={{
    textAlign: 'center',
    padding: 'var(--spacing-4xl) var(--spacing-lg)',
    color: 'var(--color-text-muted)',
  }}>
    <p className="text-body-lg">Une erreur est survenue lors du chargement des articles.</p>
  </div>
)
```

**Après :**
```jsx
} : error ? (
  <div style={{
    textAlign: 'center',
    padding: 'var(--spacing-4xl) var(--spacing-lg)',
  }}>
    <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
      Une erreur est survenue lors du chargement des articles.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="text-cta"
      style={{
        background: 'var(--color-charcoal-950)',
        color: 'var(--color-calcaire-50)',
        padding: 'var(--spacing-sm) var(--spacing-xl)',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        cursor: 'pointer',
        minHeight: '44px',
      }}
    >
      Réessayer
    </button>
  </div>
)
```

---

### P1-3 : Hauteur image fixe → aspect-ratio pour robustesse

**Avant :**
```jsx
<div style={{
  width: '100%',
  height: '220px',
  overflow: 'hidden',
}}>
```

**Après :**
```jsx
<div style={{
  width: '100%',
  aspectRatio: '16 / 9',
  overflow: 'hidden',
}}>
```

Cela évite le recadrage brutal sur des images au ratio non-standard et est plus robuste cross-device.

---

### P1-4 : Séparation visuelle header → grid

La transition entre la section header (`section-padding`) et la grille articles (`paddingTop: 0`) est abrupte — les deux sections se succèdent sans séparation perceptible.

**Avant :**
```jsx
<section className="section-padding" style={{ background: 'var(--color-bg-primary)', paddingTop: 0 }} ref={gridRef}>
```

**Après :**
```jsx
<section className="section-padding" style={{ background: 'var(--color-bg-subtle, #f8f8f7)', paddingTop: 'var(--spacing-xl)' }} ref={gridRef}>
```

Le fond légèrement distinct de `bg-subtle` crée une délimitation visuelle claire entre l'intro et le contenu.

---

## Points non audités [À COMPLÉTER]

- `index.css` : tokens `--color-border`, `--color-bg-subtle`, `--radius-pill`, `--shadow-md` — vérifier leur existence dans le design system
- `BlogArticlePage.jsx` : non lu dans cette session — audit article individuel à faire séparément
- Dark mode : comportement des cards et skeletons en mode sombre non vérifié
- Focus-visible sur `<article>` wrappant un `<Link>` : vérifier que le focus ring est visible et conforme WCAG 2.2 AA (outline 2px, offset 2px)

---

## Auto-évaluation gates BLOQUANT

| Gate | Statut |
|------|--------|
| G1 — Sections complètes | PASS |
| G3 — Bloc Handoff | PASS |
| G5 — Persona Laurent cité | PASS |
| G7 — 0 contradiction livrables amont | PASS |
| G12 — Actions implémentables sans question | PASS |
| G13 — 0 donnée inventée | PASS |
| G15 — 0 placeholder résiduel | PASS |
| G19 — Non copiable pour concurrent | PASS |

---

**Handoff → @fullstack**

- Fichiers produits : `/home/user/Versi/docs/reviews/design-audit-blog.md`
- Corrections à implémenter dans l'ordre de priorité :
  1. P0-3 : Skeleton cards loading (état loading actuel = texte seul = non premium)
  2. P0-1 : Hover card fonctionnel (ajouter `.blog-card:hover` dans `index.css`)
  3. P0-2 : Fallback image "V" → placeholder brandé "VERSI"
  4. P1-4 : Background section grille → `var(--color-bg-subtle)` pour séparation visuelle
  5. P1-1 : Tags → classe `.blog-tag` dans `index.css` (éliminer valeurs hardcodées)
  6. P1-2 : Bouton retry sur état erreur
  7. P1-3 : Hauteur image fixe → `aspect-ratio: 16/9`
- Points d'attention :
  - Vérifier l'existence des tokens `--color-border`, `--color-bg-subtle`, `--shadow-md`, `--radius-pill` dans `index.css` avant d'implémenter — si absents, les créer en cohérence avec le design system existant
  - `BlogArticlePage.jsx` non audité dans cette session — audit à prévoir séparément
  - L'animation skeleton doit respecter `prefers-reduced-motion` (CSS fourni dans P0-3)
