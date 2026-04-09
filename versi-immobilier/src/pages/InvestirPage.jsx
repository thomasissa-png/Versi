import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';

export default function InvestirPage() {
  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        <section className="section-padding" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
          <div className="container" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
            <h1 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-xl)' }}>
              Investir avec un opérateur intégré.
            </h1>
            <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
              Acquisition, transformation, structuration — une équipe qui maîtrise l'ensemble du cycle.
              Pas un intermédiaire : un co-opérateur.
            </p>
            <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-2xl)' }}>
              Pour en savoir plus sur les opportunités ouvertes et le profil des partenaires, visitez versi-invest.fr.
            </p>

            <a
              href="https://versi-invest.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cta"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-accent)',
                color: 'var(--color-bg-dark)',
                padding: '16px 48px',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                minHeight: '52px',
                marginBottom: 'var(--spacing-xl)',
              }}
            >
              Visiter versi-invest.fr
            </a>

            <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
              Versi Invest est une entité du Groupe Versi.
            </p>

            <div style={{ marginTop: 'var(--spacing-2xl)' }}>
              <Link
                to="/"
                className="text-body-sm"
                style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
              >
                ← Revenir sur versi-immobilier.fr
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
