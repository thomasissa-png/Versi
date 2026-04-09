import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import SellForm from '../components/SellForm.jsx';
import { useFadeIn } from '../hooks/useFadeIn.js';

const ADVANTAGES = [
  {
    title: 'Sans condition suspensive',
    description: 'Nos offres sont fermes. Pas de clause de financement, pas de clause suspensive. La vente se réalise.',
  },
  {
    title: 'Décision en 7 jours',
    description: 'Après réception de votre dossier, nous analysons la faisabilité et transmettons une offre sous 7 jours ouvrés.',
  },
  {
    title: 'Confidentialité garantie',
    description: 'Votre bien n\'est pas mis sur le marché. Nous traitons chaque opération dans la discrétion la plus stricte.',
  },
];

export default function SellPage() {
  const { ref, isVisible } = useFadeIn();

  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        {/* Hero */}
        <section
          className="section-padding"
          style={{ background: 'var(--color-bg-dark)' }}
        >
          <div className="container" style={{ textAlign: 'center' }}>
            <span className="text-label" style={{ display: 'block', color: 'var(--color-text-inverse)', opacity: 0.5, marginBottom: 'var(--spacing-lg)' }}>
              VENDRE UN BIEN
            </span>
            <h1 className="text-heading-lg" style={{ color: 'var(--color-text-inverse)', marginBottom: 'var(--spacing-lg)' }}>
              Recevez une offre ferme en 7 jours
            </h1>
            <p className="text-body-lg" style={{
              color: 'var(--color-text-inverse)',
              opacity: 'var(--opacity-readable)',
              maxWidth: 'var(--text-max-width-md)',
              margin: '0 auto',
            }}>
              Vous êtes propriétaire d'un bien immobilier et souhaitez vendre rapidement,
              sans incertitude et en toute confidentialité. Nous achetons directement.
            </p>
          </div>
        </section>

        {/* Advantages */}
        <section className="section-padding" ref={ref}>
          <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--spacing-xl)',
              marginBottom: 'var(--spacing-4xl)',
            }}>
              {ADVANTAGES.map((adv) => (
                <div key={adv.title} style={{
                  background: 'var(--color-bg-secondary)',
                  padding: 'var(--spacing-xl)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-card)',
                }}>
                  <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>
                    {adv.title}
                  </h2>
                  <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {adv.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Form */}
        <section
          className="section-padding"
          style={{ background: 'var(--color-bg-dark-alt)' }}
        >
          <div className="container" style={{
            display: 'grid',
            gridTemplateColumns: '45% 55%',
            gap: 'var(--spacing-3xl)',
            alignItems: 'start',
          }}>
            <div>
              <span className="text-label" style={{ display: 'block', color: 'var(--color-text-inverse)', opacity: 0.5, marginBottom: 'var(--spacing-lg)' }}>
                VOTRE BIEN
              </span>
              <h2 className="text-heading-lg" style={{ color: 'var(--color-text-inverse)', marginBottom: 'var(--spacing-xl)' }}>
                Décrivez votre actif
              </h2>
              <p className="text-body-md" style={{ color: 'var(--color-text-inverse)', opacity: 'var(--opacity-readable)' }}>
                Renseignez les informations principales de votre bien.
                Notre équipe l'analyse et vous transmet une offre ferme
                sous 7 jours.
              </p>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              padding: 'var(--spacing-2xl)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <SellForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
