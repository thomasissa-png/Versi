import { useParams, Link, Navigate } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import { PROJECTS } from '../config/projects.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

export default function RealisationDetailPage() {
  const { id } = useParams();
  const project = PROJECTS.find((p) => p.id === id);
  const { ref, isVisible } = useFadeIn();

  if (!project) {
    return <Navigate to="/realisations" replace />;
  }

  const keyFigures = [
    { label: 'Prix d\'achat', value: project.buyPrice },
    { label: 'Montant travaux', value: project.worksAmount },
    { label: 'Prix de revente', value: project.sellPrice },
    { label: 'Durée opération', value: project.duration },
  ].filter((fig) => fig.value);

  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        <section className="section-padding" ref={ref}>
          <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
            <Link
              to="/realisations"
              className="text-label"
              style={{
                display: 'inline-block',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-xl)',
                textDecoration: 'none',
              }}
            >
              ← RETOUR AUX RÉALISATIONS
            </Link>

            {/* Gallery avant/après placeholder */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-2xl)',
            }}>
              <div style={{ position: 'relative' }}>
                <div className="image-placeholder" style={{ height: '360px', borderRadius: 'var(--radius-sm)' }}>
                  Photo avant — à venir
                </div>
                <span className="text-label" style={{
                  position: 'absolute',
                  bottom: 'var(--spacing-md)',
                  left: 'var(--spacing-md)',
                  background: 'var(--color-bg-dark)',
                  color: 'var(--color-text-inverse)',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  AVANT
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <div className="image-placeholder" style={{ height: '360px', borderRadius: 'var(--radius-sm)' }}>
                  Photo après — à venir
                </div>
                <span className="text-label" style={{
                  position: 'absolute',
                  bottom: 'var(--spacing-md)',
                  left: 'var(--spacing-md)',
                  background: 'var(--color-bg-dark)',
                  color: 'var(--color-text-inverse)',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  APRÈS
                </span>
              </div>
            </div>

            {/* Header */}
            <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)' }}>
              {project.location}
            </span>
            <h1 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-xl)' }}>
              {project.title}
            </h1>

            {/* Key figures */}
            {keyFigures.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${keyFigures.length}, 1fr)`,
                gap: 'var(--spacing-xl)',
                background: 'var(--color-bg-dark)',
                padding: 'var(--spacing-xl)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 'var(--spacing-2xl)',
              }}>
                {keyFigures.map((fig) => (
                  <div key={fig.label} style={{ textAlign: 'center' }}>
                    <span className="text-label" style={{ display: 'block', color: 'var(--color-text-inverse)', opacity: 0.5, marginBottom: 'var(--spacing-sm)' }}>
                      {fig.label}
                    </span>
                    <span className="text-stat" style={{ color: 'var(--color-text-inverse)', fontSize: '1.5rem' }}>
                      {fig.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Details */}
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-xl)',
              marginBottom: 'var(--spacing-2xl)',
              flexWrap: 'wrap',
            }}>
              <div>
                <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>TYPE</span>
                <span className="text-body-md">{project.type}</span>
              </div>
              <div>
                <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>SURFACE</span>
                <span className="text-body-md">{project.surface}</span>
              </div>
              {project.units && (
                <div>
                  <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>LOTS</span>
                  <span className="text-body-md">{project.units}</span>
                </div>
              )}
            </div>

            <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>
              Description de l'opération
            </h2>
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)', lineHeight: 1.65, maxWidth: 'var(--text-max-width-lg)' }}>
              {project.description}
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
