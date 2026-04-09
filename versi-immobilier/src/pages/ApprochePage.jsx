import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import { useFadeIn } from '../hooks/useFadeIn.js';

const STEPS = [
  {
    number: '01',
    title: 'Sourcer',
    description: 'Nous identifions des actifs résidentiels et mixtes à fort potentiel de transformation sur le territoire français. Notre réseau de prescripteurs — agents immobiliers, notaires, courtiers — nous alerte en amont du marché. Nous ciblons des opérations entre 250 000 € et 1 000 000 €.',
  },
  {
    number: '02',
    title: 'Analyser',
    description: 'Chaque bien fait l\'objet d\'une étude de faisabilité technique (structure, urbanisme, réglementation), juridique (servitudes, copropriété, bail) et financière (coût d\'acquisition, budget travaux, prix de sortie). L\'offre ferme est transmise sous 7 jours.',
  },
  {
    number: '03',
    title: 'Transformer',
    description: 'Nous pilotons la transformation en interne : dépôt de permis, sélection des entreprises, suivi de chantier, réception des travaux. Rénovation complète, découpe en lots, changement de destination — chaque opération est calibrée pour maximiser la valeur à la revente.',
  },
  {
    number: '04',
    title: 'Revendre',
    description: 'Les lots transformés sont commercialisés auprès de particuliers, investisseurs ou institutionnels. La stratégie de sortie est définie dès l\'acquisition : vente en bloc, lot par lot, ou combinaison des deux selon le marché local.',
  },
];

const DIFFERENTIATORS = [
  {
    title: 'Offre ferme, sans condition suspensive',
    description: 'Nos offres ne comportent pas de condition suspensive de financement. Le vendeur a la certitude que la vente aboutira. C\'est notre engagement fondamental.',
  },
  {
    title: 'Décision rapide',
    description: 'Nous nous engageons à fournir une réponse — positive ou négative — sous 7 jours ouvrés. Pas d\'attente interminable, pas de relances sans fin.',
  },
  {
    title: 'Opérateur intégré',
    description: 'Versi Immobilier est une entité de la holding Versi. L\'ensemble du cycle — acquisition, financement, transformation, revente — est maîtrisé en interne. Pas de sous-traitance des décisions critiques.',
  },
];

export default function ApprochePage() {
  const { ref: stepsRef, isVisible: stepsVisible } = useFadeIn();
  const { ref: diffRef, isVisible: diffVisible } = useFadeIn();

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
              NOTRE APPROCHE
            </span>
            <h1 className="text-heading-lg" style={{ color: 'var(--color-text-inverse)', marginBottom: 'var(--spacing-lg)' }}>
              Un cycle maîtrisé de bout en bout
            </h1>
            <p className="text-body-lg" style={{
              color: 'var(--color-text-inverse)',
              opacity: 'var(--opacity-readable)',
              maxWidth: 'var(--text-max-width-md)',
              margin: '0 auto',
            }}>
              Du sourcing à la sortie, nous maîtrisons chaque étape de l'opération.
              Pas de délégation des décisions critiques. Un seul interlocuteur.
            </p>
          </div>
        </section>

        {/* Process détaillé */}
        <section className="section-padding" ref={stepsRef}>
          <div className={`container ${stepsVisible ? 'fade-in' : 'fade-hidden'}`}>
            <div style={{
              display: 'grid',
              gap: 'var(--spacing-3xl)',
            }}>
              {STEPS.map((step) => (
                <div key={step.number} style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr',
                  gap: 'var(--spacing-xl)',
                  alignItems: 'start',
                }}>
                  <span style={{
                    fontSize: 'var(--font-size-display-num)',
                    fontWeight: 'var(--font-weight-thin)',
                    color: 'var(--color-text-primary)',
                    opacity: 'var(--opacity-subtle)',
                    lineHeight: 1,
                  }}>
                    {step.number}
                  </span>
                  <div>
                    <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>
                      {step.title}
                    </h2>
                    <p className="text-body-md" style={{ color: 'var(--color-text-muted)', lineHeight: 1.65, maxWidth: 'var(--text-max-width-lg)' }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Différenciateurs */}
        <section
          className="section-padding"
          style={{ background: 'var(--color-bg-dark)' }}
          ref={diffRef}
        >
          <div className={`container ${diffVisible ? 'fade-in' : 'fade-hidden'}`}>
            <span className="text-label" style={{ display: 'block', color: 'var(--color-text-inverse)', opacity: 0.5, marginBottom: 'var(--spacing-lg)' }}>
              DIFFÉRENCIATEURS
            </span>
            <h2 className="text-heading-lg" style={{ color: 'var(--color-text-inverse)', marginBottom: 'var(--spacing-2xl)' }}>
              Ce qui nous distingue
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--spacing-xl)',
            }}>
              {DIFFERENTIATORS.map((d) => (
                <div key={d.title} style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: 'var(--spacing-xl)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <h3 className="text-heading-md" style={{ color: 'var(--color-text-inverse)', marginBottom: 'var(--spacing-md)' }}>
                    {d.title}
                  </h3>
                  <p className="text-body-sm" style={{ color: 'var(--color-text-inverse)', opacity: 'var(--opacity-readable)' }}>
                    {d.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Holding link */}
        <section className="section-padding" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
              Versi Immobilier est une entité de la holding Versi, opérateur immobilier intégré en France.
            </p>
            <a
              href="https://versi.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cta"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid var(--color-border)',
                padding: '12px 32px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                textDecoration: 'none',
                minHeight: '44px',
                transition: 'background-color var(--duration-normal) ease',
              }}
            >
              DÉCOUVRIR VERSI.FR →
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
