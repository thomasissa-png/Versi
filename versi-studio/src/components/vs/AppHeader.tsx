'use client';

/**
 * AppHeader — Versi Studio
 *
 * Réplique fidèle du Nav.jsx de versi.fr (src/src/components/Nav.jsx) adapté à Next.js.
 * Identité visuelle Versi : transparent → fond sombre au scroll, logo VERSI uppercase
 * letter-spacing 0.18em font-thin, liens uppercase 0.08em, CTA bordé blanc.
 *
 * Liens nav adaptés au contexte SaaS Versi Studio (pas de scroll sections marketing).
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './AppHeader.css';

const NAV_ITEMS = [
  { label: 'MES PROJETS', href: '/vs/projects' },
  { label: 'NOUVEAU PROJET', href: '/vs' },
];

export default function AppHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <nav className={`vs-nav ${scrolled ? 'vs-nav--scrolled' : ''}`} aria-label="Navigation principale">
      <div className="vs-nav__inner">
        <Link href="/vs" className="vs-nav__logo" aria-label="Versi Studio — Accueil">
          <span className="vs-nav__logo-name">VERSI</span>
          <span className="vs-nav__logo-label">STUDIO</span>
        </Link>

        <ul className="vs-nav__items">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="vs-nav__link">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link href="/vs" className="vs-nav__cta">
          NOUVEAU PROJET
        </Link>

        <button
          type="button"
          className="vs-nav__hamburger"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls="vs-mobile-menu"
          aria-label="Menu de navigation"
        >
          <span className="vs-nav__hamburger-line" />
          <span className="vs-nav__hamburger-line" />
          <span className="vs-nav__hamburger-line" />
        </button>
      </div>

      {menuOpen && (
        <div
          id="vs-mobile-menu"
          className="vs-nav__overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            type="button"
            className="vs-nav__close"
            onClick={() => setMenuOpen(false)}
            aria-label="Fermer le menu"
          >
            <span className="vs-nav__close-line" />
            <span className="vs-nav__close-line" />
          </button>
          <ul className="vs-nav__overlay-items">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="vs-nav__overlay-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
