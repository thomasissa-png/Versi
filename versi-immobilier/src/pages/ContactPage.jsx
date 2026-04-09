import { useSearchParams } from 'react-router-dom';
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
        <section
          className="section-padding"
          style={{ background: 'var(--color-bg-dark-alt)' }}
          ref={ref}
        >
          <div
            className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '45% 55%',
              gap: 'var(--spacing-3xl)',
              alignItems: 'start',
            }}
          >
            <div>
              <span className="text-label" style={{ display: 'block', color: 'var(--color-text-inverse)', opacity: 0.5, marginBottom: 'var(--spacing-lg)' }}>
                CONTACT
              </span>
              <h1 className="text-heading-lg" style={{ color: 'var(--color-text-inverse)', marginBottom: 'var(--spacing-xl)' }}>
                Un projet.<br />
                Nous répondons.
              </h1>
              <p className="text-body-md" style={{ color: 'var(--color-text-inverse)', opacity: 'var(--opacity-readable)', marginBottom: 'var(--spacing-xl)' }}>
                Que vous souhaitiez vendre un bien, proposer une opportunité ou simplement
                échanger sur un projet, nous revenons vers vous sous 72h.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                style={{
                  color: 'var(--color-accent)',
                  fontSize: 'var(--font-size-body-md)',
                  textDecoration: 'none',
                }}
              >
                {CONTACT_EMAIL}
              </a>
            </div>

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
    </>
  );
}
