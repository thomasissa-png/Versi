'use client';

/**
 * AppFooter — Versi Studio
 *
 * Footer minimal 1 ligne : copyright, liens légaux, retour versi.fr.
 * Spec : docs/design/vs-header-footer-versi-cohérence.md (§5)
 * Pattern adapté de versi-invest-site/src/components/Footer.jsx — version allégée
 * (outil SaaS, pas de grille 4 colonnes marketing).
 *
 * Client component (use client) : les handlers onMouseEnter/Leave inline ne sont
 * pas sérialisables côté serveur. Le footer reste statique (pas de state, pas
 * d'effets) — coût RSC négligeable.
 *
 * TODO s21 : créer pages /mentions-legales et /politique-de-confidentialite
 * dédiées Versi Studio. En attendant, les liens pointent vers les pages des
 * sites Versi existants (target="_blank" rel="noopener noreferrer").
 */

export default function AppFooter() {
  const currentYear = new Date().getFullYear();

  const linkStyle = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    textDecoration: 'none',
    transition: 'color 150ms ease',
  };

  const separatorStyle = {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-xs)',
  };

  return (
    <footer
      style={{
        backgroundColor: 'var(--color-bg-dark)',
        borderTop: '1px solid var(--color-border-dark)',
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
            href="https://versi.fr/mentions-legales"
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-inverse)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            Mentions légales
          </a>
          <span style={separatorStyle}>·</span>
          <a
            href="https://versi.fr/politique-de-confidentialite"
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-inverse)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            Politique de confidentialité
          </a>
          <span style={separatorStyle}>·</span>
          <a
            href="https://versi.fr"
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
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
