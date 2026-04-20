import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import PageHead from '../components/PageHead.jsx';
import { useProject } from '../hooks/useProject.js';
import { useProjects } from '../hooks/useProjects.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

export default function RealisationDetailPage() {
  const { id } = useParams();
  const { project, photos, loading, error } = useProject(id);
  const { projects: allProjectsRaw } = useProjects('completed');
  const { ref, isVisible } = useFadeIn();
  const [galleryView, setGalleryView] = useState('apres');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);

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
                padding: 'var(--spacing-sm) var(--spacing-xl)',
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
    { label: 'Durée chantier', value: project.duration || null },
    { label: 'Surface', value: project.surface || null },
  ].filter((fig) => fig.value);

  const otherProjects = allProjectsRaw.filter(
    (p) => p.id !== id
  ).slice(0, 2);

  const avantPhotos = photos.filter((p) => p.category === 'avant');
  const apresPhotos = photos.filter((p) => p.category === 'apres');
  const currentPhotos = galleryView === 'avant' ? avantPhotos : apresPhotos;
  const safeIndex = Math.min(photoIndex, Math.max(0, currentPhotos.length - 1));
  const currentPhoto = currentPhotos[safeIndex];
  const heroPhoto = apresPhotos[0];

  const handleViewChange = (view) => {
    setGalleryView(view);
    setPhotoIndex(0);
    setFadeKey((k) => k + 1);
  };

  const handlePhotoNav = (direction) => {
    const next = safeIndex + direction;
    if (next >= 0 && next < currentPhotos.length) {
      setPhotoIndex(next);
      setFadeKey((k) => k + 1);
    }
  };

  return (
    <>
      <PageHead
        title={`${project.title.slice(0, 30)} — ${project.location || 'Lille'} | Versi Immo`}
        description={`Rénovation ${project.type || 'immobilière'} à ${project.location || 'Hauts-de-France'}. ${project.surface || ''}. Vendu ${project.sellPrice || ''}. Marchand de biens Lille.`}
      />
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        {/* Hero photo */}
        <div
          className="realisation-detail__hero"
          style={heroPhoto ? { backgroundImage: `url(${heroPhoto.url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          <div className="realisation-detail__hero-overlay" aria-hidden="true" />
          <div className="realisation-detail__hero-content">
            <h1 className="text-heading-lg" style={{ color: 'var(--color-text-inverse)', marginBottom: 'var(--spacing-sm)' }}>
              {project.title}
            </h1>
            {project.location && (
              <p className="text-body-sm" style={{ color: 'var(--color-text-inverse)', opacity: 'var(--opacity-readable)' }}>
                {project.location}
              </p>
            )}
          </div>
        </div>

        {/* Key figures band */}
        {keyFigures.length > 0 && (
          <section aria-label="Chiffres clés" style={{ background: 'var(--color-bg-dark)' }}>
            <div
              className="container realisation-detail__key-figures"
              style={{ gridTemplateColumns: `repeat(${keyFigures.length}, 1fr)` }}
            >
              {keyFigures.map((fig) => (
                <div key={fig.label}>
                  <span className="realisation-detail__figure-value">{fig.value}</span>
                  <span className="text-label" style={{ display: 'block', color: 'var(--color-text-inverse)', opacity: 'var(--opacity-readable)' }}>
                    {fig.label}
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
              className="text-label realisation-detail__back-link"
            >
              ← Toutes nos réalisations
            </Link>

            {/* Gallery avant/après */}
            <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
              <div
                className="realisation-detail__gallery-toggle"
                role="tablist"
                aria-label="Afficher les photos avant ou après rénovation"
              >
                <button
                  role="tab"
                  aria-selected={galleryView === 'apres'}
                  aria-controls="gallery-panel"
                  onClick={() => handleViewChange('apres')}
                  className={`text-label realisation-detail__toggle-btn${galleryView === 'apres' ? ' realisation-detail__toggle-btn--active' : ''}`}
                >
                  Après{apresPhotos.length > 0 && ` (${apresPhotos.length})`}
                </button>
                <button
                  role="tab"
                  aria-selected={galleryView === 'avant'}
                  aria-controls="gallery-panel"
                  onClick={() => handleViewChange('avant')}
                  className={`text-label realisation-detail__toggle-btn${galleryView === 'avant' ? ' realisation-detail__toggle-btn--active' : ''}`}
                >
                  Avant{avantPhotos.length > 0 && ` (${avantPhotos.length})`}
                </button>
              </div>

              <div id="gallery-panel" role="tabpanel" aria-live="polite" aria-label={`Photo ${galleryView} rénovation`} className="realisation-detail__gallery-panel">
                {currentPhoto ? (
                  <>
                    <img
                      key={fadeKey}
                      src={currentPhoto.url}
                      alt={currentPhoto.alt || `${project.title} — ${galleryView === 'avant' ? 'avant' : 'après'} rénovation (${safeIndex + 1}/${currentPhotos.length})`}
                      className="realisation-detail__gallery-image realisation-detail__gallery-image--fade-in"
                    />
                    {currentPhotos.length > 1 && (
                      <div className="realisation-detail__gallery-nav">
                        <button
                          onClick={() => handlePhotoNav(-1)}
                          disabled={safeIndex === 0}
                          className="realisation-detail__gallery-nav-btn"
                          aria-label="Photo précédente"
                        >
                          ←
                        </button>
                        <span className="text-label" style={{ color: 'var(--color-text-muted)' }}>
                          {safeIndex + 1} / {currentPhotos.length}
                        </span>
                        <button
                          onClick={() => handlePhotoNav(1)}
                          disabled={safeIndex === currentPhotos.length - 1}
                          className="realisation-detail__gallery-nav-btn"
                          aria-label="Photo suivante"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="image-placeholder realisation-detail__gallery-placeholder">
                    <span className="text-label" style={{ color: 'var(--color-text-muted)' }}>
                      {galleryView === 'avant' ? 'Photos avant rénovation' : 'Photos après rénovation'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="realisation-detail__details" style={{ marginBottom: 'var(--spacing-2xl)' }}>
              <div className="realisation-detail__detail-item">
                <span className="text-label" style={{ color: 'var(--color-text-muted)' }}>Type</span>
                <span className="text-body-md">{project.type}</span>
              </div>
              <div className="realisation-detail__detail-item">
                <span className="text-label" style={{ color: 'var(--color-text-muted)' }}>Surface</span>
                <span className="text-body-md">{project.surface}</span>
              </div>
              {project.units && (
                <div className="realisation-detail__detail-item">
                  <span className="text-label" style={{ color: 'var(--color-text-muted)' }}>Lots</span>
                  <span className="text-body-md">{project.units}</span>
                </div>
              )}
              {project.duration && (
                <div className="realisation-detail__detail-item">
                  <span className="text-label" style={{ color: 'var(--color-text-muted)' }}>Durée chantier</span>
                  <span className="text-body-md">{project.duration}</span>
                </div>
              )}
            </div>

            <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>
              L'opération.
            </h2>
            <div className="text-body-md" style={{ color: 'var(--color-text-muted)', maxWidth: 'var(--text-max-width-lg)', marginBottom: 'var(--spacing-3xl)' }}>
              {project.description.split('\n\n').map((paragraph, i) => (
                <p key={i} style={{ marginBottom: i < project.description.split('\n\n').length - 1 ? 'var(--spacing-md)' : 0 }}>
                  {paragraph}
                </p>
              ))}
            </div>

            {/* CTAs */}
            <div className="realisation-detail__ctas">
              <Link
                to="/nos-biens"
                className="text-cta"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'var(--color-charcoal-950)',
                  color: 'var(--color-calcaire-50)',
                  padding: 'var(--spacing-md) var(--spacing-2xl)',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  minHeight: '52px',
                }}
              >
                Voir les biens disponibles
              </Link>
              <Link
                to="/contact"
                className="text-cta"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1px solid var(--color-border)',
                  padding: 'var(--spacing-md) var(--spacing-2xl)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)',
                  textDecoration: 'none',
                  minHeight: '52px',
                }}
              >
                Nous contacter
              </Link>
            </div>
          </div>
        </section>

        {/* Other realisations */}
        {otherProjects.length > 0 && (
          <section className="section-padding" style={{ background: 'var(--color-bg-subtle)' }}>
            <div className="container">
              <h2 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-2xl)' }}>
                D'autres réalisations.
              </h2>
              <div className="realisation-detail__other-grid">
                {otherProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
              <div style={{ marginTop: 'var(--spacing-xl)' }}>
                <Link
                  to="/realisations"
                  className="text-label realisation-detail__back-link"
                  style={{ marginBottom: 0 }}
                >
                  Voir toutes nos réalisations →
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
