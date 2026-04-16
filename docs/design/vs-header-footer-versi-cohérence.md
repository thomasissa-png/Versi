# Header + Footer Versi Studio — Cohérence identité marque

> Livrable @design — Mission versi-s20
> Date : 2026-04-16
> Basé sur lecture directe des 3 sites Versi existants (aucune invention).

---

## 1. Synthèse — Pattern Versi unifié détecté

| Site | Fichier Nav | Fichier Footer | Router |
|---|---|---|---|
| versi.fr (src) | `src/src/components/Nav.jsx` | `src/src/components/Footer.jsx` | React Router |
| versi-immobilier | `versi-immobilier/src/components/Nav.jsx` | `versi-immobilier/src/components/Footer.jsx` | React Router |
| versi-invest-site | `versi-invest-site/src/components/Nav.jsx` | `versi-invest-site/src/components/Footer.jsx` | React Router |
| **versi-studio** | **Absent** | **Absent** | **Next.js App Router** |

**Patterns communs identifiés (basés sur versi-invest-site — le plus récent et complet) :**

- Logo : `VERSI` (medium, letter-spacing 0.18em) + label entité (light, letter-spacing 0.12em) — alignés en baseline, UPPERCASE
- Fond header : transparent sur page d'accueil, devient `--color-bg-dark-alt` au scroll (> 40px)
- Fond footer : `--color-bg-dark` (noir profond `#0B0B0B`)
- Texte header et footer : `--color-text-inverse` (#F7F5F2 — calcaire clair)
- Liens nav : UPPERCASE, letter-spacing 0.08em, taille label (12-13px), underline accent sur actif
- CTA nav : border 1px solid inverse + hover background rgba
- Mobile : hamburger 44x44px, overlay plein écran fond sombre, liens en grand, focus trap + Escape
- Tokens CSS partagés : `--color-bg-dark`, `--color-text-inverse`, `--color-accent`, `--color-text-muted`, `--font-weight-medium`, `--font-weight-light`, `--radius-sm`, `--duration-normal`

**Bon à savoir :** Versi Studio utilise Tailwind v4 + Next.js. Les sites existants utilisent React Router + CSS custom. La traduction se fera en classes Tailwind inline avec `style={{ }}` pour les valeurs issues des tokens CSS `@theme`.

---

## 2. Pattern Header Versi (canonique)

- **Logo** : `VERSI` (uppercase, font-weight 500, letter-spacing 0.18em) + label entité (uppercase, font-weight 300, letter-spacing 0.12em), flexbox baseline, gap 8px, pas de séparateur
- **Couleurs** : fond transparent → `var(--color-bg-dark)` au scroll, texte `var(--color-text-inverse)`
- **Typo** : PP Neue Montreal (déjà chargée dans Versi Studio), taille 1.125rem (18px) logo, `var(--font-size-xs)` liens
- **Liens navigation** : UPPERCASE, letter-spacing 0.08em, hover opacity 0.85, lien actif = border-bottom accent
- **CTA bouton** : border 1px, padding 10px 20px, min-height 44px, hover bg rgba(247,245,242,0.08)
- **Hauteur** : 64px (var `--nav-height`)
- **Sticky** : position fixed, z-index 100
- **Responsive mobile** : items masqués < 768px, hamburger affiché, overlay plein écran avec liens grand format + focus trap

---

## 3. Pattern Footer Versi (canonique)

- **Layout** : grille 4 colonnes desktop (1.4fr 1fr 1fr 1fr), 2 colonnes tablette, 1 colonne mobile
- **Fond** : `var(--color-bg-dark)` — noir profond `#0B0B0B`
- **Colonne 1** : Logo + label entité + tagline + email contact + mention groupe "Versi Studio — une entité du Groupe Versi — versi.fr"
- **Colonne 2** : Navigation (liens pages internes)
- **Colonne 3** : Groupe Versi (liens cross-entités)
- **Colonne 4** : Mentions légales + copyright, alignés à droite desktop, centrés mobile
- **Séparateur** : 1px solid `var(--color-border-dark)` avant la grille
- **Disclaimer** : si applicable (Versi Invest a un disclaimer carte pro T) — Versi Studio = non applicable
- **Responsive** : mobile stack 1 colonne, textes centrés, tablette 2 colonnes

---

## 4. Adaptation pour Versi Studio (SaaS outil)

**Spécificités Versi Studio à respecter :**

- **Outil de travail, pas marketing** : les liens de navigation métier (biens disponibles, réalisations, blog) n'ont pas leur place. Remplacer par les liens fonctionnels de l'outil.
- **Identité Versi visible** : logo VERSI STUDIO, fond sombre, typo identique — l'utilisateur reconnaît qu'il est dans l'écosystème Versi
- **Header compact** : hauteur 56px (vs 64px sites marketing) — l'espace de travail est précieux
- **Footer minimal** : 1 ligne seulement (copyright + mentions légales + lien retour versi.fr) — pas de grille 4 colonnes

**Liens header Versi Studio (SaaS outil) :**
- Logo → `/vs/projects` (accueil outil)
- `MES PROJETS` → `/vs/projects`
- Séparateur visuel · (si pertinent selon contexte utilisateur authentifié)
- `PARAMÈTRES` → `/vs/settings` (si page existante)
- Avatar/initiales utilisateur → `/vs/account` ou menu déroulant déconnexion

**Footer Versi Studio (minimal, 1 ligne) :**
- `© 2026 Versi Studio` · `Mentions légales` · `Politique de confidentialité` · `versi.fr ↗`

---

## 5. Brief d'implémentation pour @fullstack

### Fichiers à créer

- `versi-studio/src/components/vs/AppHeader.tsx`
- `versi-studio/src/components/vs/AppFooter.tsx`

### Modifications dans `src/app/layout.tsx`

Importer et envelopper `{children}` :
```tsx
import AppHeader from "@/components/vs/AppHeader";
import AppFooter from "@/components/vs/AppFooter";

// Dans RootLayout, remplacer :
<body className="antialiased">{children}</body>

// Par :
<body className="antialiased">
  <AppHeader />
  <main>{children}</main>
  <AppFooter />
</body>
```

**Attention Next.js App Router** : `AppHeader` peut être un composant serveur si pas de state (scroll behavior nécessite `'use client'`). `AppFooter` est purement statique = composant serveur.

---

### Code AppHeader.tsx (pattern typist)

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AppHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        zIndex: 100,
        backgroundColor: scrolled
          ? 'var(--color-bg-dark)'
          : 'transparent',
        borderBottom: scrolled
          ? '1px solid rgba(247,245,242,0.08)'
          : 'none',
        transition: 'background-color 200ms ease, border-color 200ms ease',
      }}
      aria-label="En-tête Versi Studio"
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-xl)',
        }}
      >
        {/* Logo */}
        <Link
          href="/vs/projects"
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: '1.125rem',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'var(--color-text-inverse)',
            }}
          >
            VERSI
          </span>
          <span
            style={{
              fontSize: '1.125rem',
              fontWeight: 300,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--color-text-inverse)',
            }}
          >
            STUDIO
          </span>
        </Link>

        {/* Navigation outil */}
        <nav
          aria-label="Navigation Versi Studio"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)' }}
        >
          <Link
            href="/vs/projects"
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-inverse)',
              textDecoration: 'none',
              opacity: 0.85,
              transition: 'opacity 150ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
          >
            Mes projets
          </Link>
        </nav>
      </div>
    </header>
  );
}
```

**Note d'implémentation :** le header est sur fond sombre (dark). En conséquence, les pages Versi Studio doivent avoir `padding-top: 56px` sur le `<main>` pour compenser la hauteur du header fixe. Ajouter `style={{ paddingTop: '56px' }}` sur `<main>` dans `layout.tsx`.

**Évolution future :** si Versi Studio intègre une authentification, ajouter un composant `UserMenu` à droite avec avatar/initiales + menu déconnexion.

---

### Code AppFooter.tsx (pattern typist)

```tsx
export default function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        backgroundColor: 'var(--color-bg-dark)',
        borderTop: '1px solid rgba(247,245,242,0.08)',
        padding: 'var(--space-lg) var(--space-xl)',
      }}
      aria-label="Pied de page Versi Studio"
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
        }}
      >
        {/* Copyright + entité */}
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
          }}
        >
          © {currentYear} Versi Studio — une entité du Groupe Versi
        </span>

        {/* Liens légaux + retour versi.fr */}
        <nav
          aria-label="Liens légaux"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}
        >
          <a
            href="/mentions-legales"
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-inverse)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            Mentions légales
          </a>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>·</span>
          <a
            href="/politique-de-confidentialite"
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-inverse)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            Politique de confidentialité
          </a>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>·</span>
          <a
            href="https://versi.fr"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-inverse)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            versi.fr ↗
          </a>
        </nav>
      </div>
    </footer>
  );
}
```

---

## 6. Tokens Versi à vérifier dans globals.css

Les tokens suivants sont déjà présents dans `versi-studio/src/app/globals.css` — aucun ajout nécessaire :

| Token | Valeur | Usage header/footer |
|---|---|---|
| `--color-bg-dark` | `#0B0B0B` | Fond footer, fond header scrollé |
| `--color-text-inverse` | `#F7F5F2` | Texte logo, liens nav |
| `--color-text-muted` | `#6B6560` | Texte secondaire footer |
| `--font-size-xs` | `0.8125rem` | Labels nav, texte footer |
| `--space-xl` | `32px` | Padding horizontal header |
| `--space-lg` | `24px` | Padding vertical footer |
| `--space-md` | `16px` | Gap liens footer |
| `--space-sm` | `8px` | Gap interne footer |

**Token manquant à ajouter dans `@theme` de globals.css :**
```css
--color-border-dark: rgba(247, 245, 242, 0.08);
```
Ce token est utilisé dans les sites Versi pour les séparateurs sur fond sombre. Il est référencé dans les codes ci-dessus via la valeur inline `rgba(247,245,242,0.08)` — si le token est ajouté, @fullstack pourra le substituer.

---

## 7. Points d'attention implémentation

1. **Next.js App Router vs React Router** : le code produit utilise `next/link` (non `react-router-dom`). Les `onMouseEnter/Leave` inline sont un compromis acceptable pour un composant `'use client'` léger. Si le projet adopte une convention CSS modules ou Tailwind utilities, @fullstack peut refactorer les styles inline en classes.

2. **Fond dark sur toutes les pages** : le header est conçu pour apparaître sur fond sombre (texte `color-text-inverse`). Si une page de Versi Studio a un fond clair en haut (fond `--color-bg-default`), le header transparent initial aura un problème de contraste. Solution : forcer `scrolled = true` dès le montage sur ces pages, ou ajouter une prop `forceDark` au composant.

3. **Lien actif** : le code fourni ne marque pas le lien actif (pas de `usePathname` pour garder le composant simple). @fullstack peut ajouter `usePathname()` de `next/navigation` pour l'underline accent sur le lien courant si souhaité.

4. **Pages mentions légales et politique de confidentialité** : les liens sont présents dans le footer. Si ces pages n'existent pas encore dans Versi Studio, les liens peuvent pointer vers les pages des sites Versi existants (ex : `https://versi.fr/mentions-legales`) en attendant.

5. **Focus visible** : le `outline` sur les liens n'est pas explicitement défini dans le code inline. Versi Studio hérite du navigateur par défaut. @fullstack devra ajouter dans `globals.css` : `a:focus-visible { outline: 2px solid var(--color-text-inverse); outline-offset: 2px; }` pour conformité WCAG 2.2 AA.

---

## Handoff

**→ @fullstack** : implémenter `AppHeader.tsx` et `AppFooter.tsx` selon §5. Modifier `layout.tsx` pour intégrer les composants. Ajouter `padding-top: 56px` sur `<main>`. Optionnel : ajouter `--color-border-dark` dans `@theme` de `globals.css`.

**→ @orchestrator** : valider cohérence visuelle avant merge (vérifier contraste texte sur fond sombre WCAG 2.2 AA — ratio `#F7F5F2` sur `#0B0B0B` = 19.5:1, conforme).

**→ @copywriter** : vérifier les labels copy du header et footer (G33 zéro anglicisme) — labels actuels "Mes projets", "Mentions légales", "Politique de confidentialité", "versi.fr" sont conformes.
