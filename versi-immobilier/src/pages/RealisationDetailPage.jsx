import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import { useProject } from '../hooks/useProject.js';
import { useProjects } from '../hooks/useProjects.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

export default function RealisationDetailPage() {
  const { id } = useParams();
  const { project, photos, loading, error } = useProject(id);
  const { projects: allProjectsRaw } = useProjects('completed');
  const { ref, isVisible } = useFadeIn();
  const [galleryView, setGalleryView] = useState('avant');

  if (loading) {
    return (
      <>
        <Nav />
        <main style={{
          paddingTop: 'var(--nav-height)',
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
            <p className="text-body-lg">Chargement de la réalisation...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !project) {
    return (
      <>
        <Nav />
        <main style={{
          paddingTop: 'var(--nav-height)',
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
            <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
              Cette réalisation n'est plus disponible.
            </p>
            <Link
              to="/realisations"
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
              }}
            >
              Voir toutes nos réalisations
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const keyFigures = [
    { label: 'Prix de vente', value: project.sellPrice || 'Confidentiel' },
    { label: 'Délai offre', value: project.offerDelay ? `J+${project.offerDelay}` : null },
  ].filter((fig) => fig.value);

  const otherProjects = allProjectsRaw.filter(
    (p) => p.id !== id
  ).slice(0, 2);

  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        {/* Hero photo */}
        <div style={{
          width: '100%',
          height: '500px',
          background: 'linear-gradient(135deg, var(--color-charcoal-950), var(--color-mineral-900))',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
          padding: 'var(--spacing-2xl)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 'var(--content-max-width)', width: '100%', margin: '0 auto' }}>
            <h1 className="text-heading-lg" style={{ color: 'var(--color-text-inverse)', marginBottom: 'var(--spacing-sm)' }}>
              {project.title}
            </h1>
            {project.offerDelay && (
              <p className="text-body-sm" style={{ color: 'var(--color-text-inverse)', opacity: 0.8 }}>
                Offre émise J+{project.offerDelay}.{project.signatureDelay && ` Signature acte authentique J+${project.signatureDelay}.`}
              </p>
            )}
          </div>
        </div>

        {/* Key figures band */}
        {keyFigures.length > 0 && (
          <section style={{
            background: 'var(--color-bg-dark)',
          }}>
            <div className="container" style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${keyFigures.length}, 1fr)`,
              gap: 'var(--spacing-xl)',
              padding: 'var(--spacing-2xl) var(--spacing-2xl)',
              textAlign: 'center',
            }}>
              {keyFigures.map((fig) => (
                <div key={fig.label}>
                  <span className="text-label" style={{ display: 'block', color: 'var(--color-text-inverse)', opacity: 0.5, marginBottom: 'var(--spacing-sm)' }}>
                    {fig.label}
                  </span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-inverse)' }}>
                    {fig.value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Content */}
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
              ← Toutes nos réalisations
            </Link>

            {/* Gallery avant/après */}
            <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                <button
                  onClick={() => setGalleryView('avant')}
                  className="text-label"
                  style={{
                    padding: '8px 20px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    background: galleryView === 'avant' ? 'var(--color-charcoal-950)' : 'transparent',
                    color: galleryView === 'avant' ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Avant
                </button>
                <button
                  onClick={() => setGalleryView('apres')}
                  className="text-label"
                  style={{
                    padding: '8px 20px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    background: galleryView === 'apres' ? 'var(--color-charcoal-950)' : 'transparent',
                    color: galleryView === 'apres' ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Après
                </button>
              </div>
              {(() => {
                const avantPhotos = photos.filter((p) => p.category === 'avant');
                const apresPhotos = photos.filter((p) => p.category === 'apres');
                const currentPhotos = galleryView === 'avant' ? avantPhotos : apresPhotos;
                const currentPhoto = currentPhotos[0];
                if (currentPhoto) {
                  return (
                    <img
                      src={currentPhoto.url}
                      alt={currentPhoto.alt || `${project.title} — ${galleryView}`}
                      style={{
                        width: '100%',
                        height: '500px',
                        borderRadius: 'var(--card-radius)',
                        maxWidth: '1080px',
                        objectFit: 'cover',
                      }}
                    />
                  );
                }
                return (
                  <div className="image-placeholder" style={{
                    width: '100%',
                    height: '500px',
                    borderRadius: 'var(--card-radius)',
                    maxWidth: '1080px',
                  }}>
                    {galleryView === 'avant' ? 'Photo avant' : 'Photo après'}
                  </div>
                );
              })()}
            </div>

            {/* Details */}
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-xl)',
              marginBottom: 'var(--spacing-2xl)',
              flexWrap: 'wrap',
            }}>
              <div>
                <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>Type</span>
                <span className="text-body-md">{project.type}</span>
              </div>
              <div>
                <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>Surface</span>
                <span className="text-body-md">{project.surface}</span>
              </div>
              {project.units && (
                <div>
                  <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>Lots</span>
                  <span className="text-body-md">{project.units}</span>
                </div>
              )}
              {project.duration && (
                <div>
                  <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>Durée</span>
                  <span className="text-body-md">{project.duration}</span>
                </div>
              )}
            </div>

            <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>
              La rénovation.
            </h2>
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)', lineHeight: 1.65, maxWidth: 'var(--text-max-width-lg)', marginBottom: 'var(--spacing-3xl)' }}>
              {project.description}
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
              <Link
                to="/vendre"
                className="text-cta"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'var(--color-charcoal-950)',
                  color: 'var(--color-calcaire-50)',
                  padding: '16px 40px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  minHeight: '52px',
                }}
              >
                Soumettre mon bien
              </Link>
              <Link
                to="/realisations"
                className="text-cta"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1px solid var(--color-border)',
                  padding: '16px 40px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)',
                  textDecoration: 'none',
                  minHeight: '52px',
                }}
              >
                Voir les réalisations
              </Link>
            </div>
          </div>
        </section>

        {/* Other realisations */}
        {otherProjects.length > 0 && (
          <section className="section-padding" style={{ background: 'var(--color-bg-primary)' }}>
            <div className="container">
              <h2 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-2xl)' }}>
                D'autres réalisations.
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 'var(--spacing-lg)',
              }}>
                {otherProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
              <div style={{ marginTop: 'var(--spacing-xl)' }}>
                <Link to="/realisations" className="text-cta" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                  Voir toutes nos réalisations
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />

      <style>{`
        @media (max-width: 767px) {
          div[style*="height: 500px"][style*="background: linear-gradient"] {
            height: 300px !important;
          }
          .image-placeholder[style*="height: 500px"] {
            height: 250px !important;
          }
          div[style*="grid-template-columns: repeat(2, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
