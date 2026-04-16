'use client';

/**
 * AppHeader — Versi Studio
 *
 * Header fixe, fond sombre, identité Versi (logo VERSI STUDIO) + navigation outil.
 * Spec : docs/design/vs-header-footer-versi-cohérence.md (§5)
 * Pattern inspiré de versi-invest-site/src/components/Nav.jsx (le plus récent).
 *
 * Comportement :
 * - Fond transparent au scroll = 0, devient --color-bg-dark au scroll > 20px
 * - Hauteur 56px (outil de travail compact, vs 64px sites marketing)
 * - Logo aligné baseline, gap 8px, UPPERCASE
 * - Navigation minimale (Mes projets) — extensible si auth future
 *
 * Accessibilité :
 * - aria-label sur header et nav
 * - focus-visible hérité de globals.css
 * - touch target CTA >= 44x44px (padding + font-size)
 */

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
          ? '1px solid var(--color-border-dark)'
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
        {/* Logo VERSI STUDIO */}
        <Link
          href="/vs/projects"
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            textDecoration: 'none',
            flexShrink: 0,
          }}
          aria-label="Versi Studio — Accueil"
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
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
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
