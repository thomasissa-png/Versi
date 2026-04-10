import { useSearchParams, Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import ContactForm from '../components/ContactForm.jsx';
import { CONTACT_EMAIL } from '../config/contact.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const bien = searchParams.get('bien') || '';
  const { ref, isVisible } = useFadeIn();

  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        {/* Header */}
        <section className="section-padding" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="container">
            <h1 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-md)' }}>
              Parlons de votre projet.
            </h1>
            <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', maxWidth: 'var(--text-max-width-md)' }}>
              Vous êtes propriétaire, prescripteur ou investisseur. Écrivez-nous directement.
            </p>
          </div>
        </section>

        {/* Split layout */}
        <section
          className="section-padding"
          style={{ background: 'var(--color-bg-dark-alt)' }}
          ref={ref}
        >
          <div
            className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '40% 60%',
              gap: 'var(--spacing-3xl)',
              alignItems: 'start',
            }}
          >
            {/* Left: contact info */}
            <div>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                style={{
                  display: 'block',
                  fontSize: '1.25rem',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-inverse)',
                  textDecoration: 'none',
                  marginBottom: 'var(--spacing-xl)',
                }}
              >
                {CONTACT_EMAIL}
              </a>

              <p className="text-body-sm" style={{ color: 'var(--color-text-inverse)', opacity: 'var(--opacity-readable)', marginBottom: 'var(--spacing-md)' }}>
                Nous accusons réception sous 24h.
              </p>

              <p className="text-body-sm" style={{ color: 'var(--color-text-inverse)', opacity: 'var(--opacity-readable)', marginBottom: 'var(--spacing-2xl)' }}>
                Paris — Île-de-France<br />
                Lille et villes françaises
              </p>

              <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xl)' }}>
                Versi Immobilier est une entité du Groupe Versi —{' '}
                <a href="https://versi.fr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
                  versi.fr
                </a>
              </p>

              <Link
                to="/vendre"
                className="text-body-sm"
                style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}
              >
                Vous souhaitez soumettre un bien à la vente ?
              </Link>
            </div>

            {/* Right: form */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              padding: 'var(--spacing-2xl)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <ContactForm subject={bien ? `Demande concernant : ${bien}` : ''} />
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <style>{`
        @media (max-width: 767px) {
          .container[style*="grid-template-columns: 40% 60%"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
