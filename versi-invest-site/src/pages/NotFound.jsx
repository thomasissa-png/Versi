import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';

export default function NotFound() {
  return (
    <>
      <PageHead
        title="Page introuvable — Versi Invest"
        description="La page demandée n'existe pas."
        noindex
      />
      <Nav />
      <main id="main-content" style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-dark)',
        padding: 'var(--spacing-2xl)',
        textAlign: 'center',
      }}>
        <div>
          <p style={{
            fontSize: '4rem',
            fontWeight: 'var(--font-weight-thin)',
            color: 'var(--color-text-inverse)',
            marginBottom: 'var(--spacing-md)',
          }}>
            404
          </p>
          <p style={{
            fontSize: 'var(--font-size-body-lg)',
            color: 'var(--color-text-inverse)',
            opacity: 'var(--opacity-readable)',
            marginBottom: 'var(--spacing-xl)',
          }}>
            Cette page n'existe pas.
          </p>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '12px 28px',
              border: '1px solid var(--color-text-inverse)',
              color: 'var(--color-text-inverse)',
              fontSize: 'var(--font-size-label)',
              fontWeight: 'var(--font-weight-medium)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              textDecoration: 'none',
              borderRadius: 'var(--radius-sm)',
              minHeight: '44px',
            }}
          >
            Retour à l'accueil
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
