import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import PageHead from '../components/PageHead.jsx';
import { useProjects } from '../hooks/useProjects.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

export default function RealisationsPage() {
  const { projects: allProjects, loading, error } = useProjects('all');
  const { ref, isVisible } = useFadeIn();
  const { ref: gridRef, isVisible: gridVisible } = useFadeIn();

  const completed = useMemo(
    () => allProjects.filter((p) => p.status === 'completed'),
    [allProjects]
  );

  const stats = [
    { value: '5', label: 'rénovations terminées' },
    { value: '3,2M€', label: 'de volume traité' },
  ];

  return (
    <>
      <PageHead
        title="Réalisations — Immeubles et appartements rénovés | Versi Immobilier"
        description="Chaque rénovation documentée : adresse, délais, chiffres. 3,2M€ de volume traité depuis 2022."
      />
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        {/* Header */}
        <section className="section-padding" ref={ref}>
          <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
            <h1 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-md)' }}>
              Réalisations.
            </h1>
            <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-2xl)', maxWidth: 'var(--text-max-width-md)' }}>
              Chaque rénovation documentée — adresse, délais, chiffres. Aucun chiffre inventé.
            </p>

            {/* Stats */}
            <div className="realisations__stats" style={{
              background: 'var(--color-bg-dark)',
              padding: 'var(--spacing-2xl)',
              borderRadius: 'var(--card-radius)',
              marginBottom: 'var(--spacing-3xl)',
              textAlign: 'center',
            }}>
              {stats.map((stat) => (
                <div key={stat.label}>
                  <span className="text-stat" style={{ color: 'var(--color-text-inverse)', display: 'block', marginBottom: 'var(--spacing-sm)' }}>
                    {stat.value}
                  </span>
                  <span className="text-label" style={{ color: 'var(--color-text-inverse)', opacity: 0.5 }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="section-padding" style={{ background: 'var(--color-bg-primary)', paddingTop: 0 }} ref={gridRef}>
          <div className={`container ${gridVisible ? 'fade-in' : 'fade-hidden'}`}>
            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-4xl) var(--spacing-lg)',
                color: 'var(--color-text-muted)',
              }}>
                <p className="text-body-lg">Chargement des réalisations...</p>
              </div>
            ) : error ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-4xl) var(--spacing-lg)',
                color: 'var(--color-text-muted)',
              }}>
                <p className="text-body-lg">Une erreur est survenue lors du chargement des réalisations.</p>
              </div>
            ) : completed.length > 0 ? (
              <div className="realisations__grid">
                {completed.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-4xl) var(--spacing-lg)',
                color: 'var(--color-text-muted)',
              }}>
                <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-sm)' }}>
                  Les premières réalisations arrivent.
                </p>
                <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  En attendant, les biens disponibles sont visibles sur la page des biens.
                </p>
                <Link to="/nos-biens" className="text-cta" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'var(--color-charcoal-950)',
                  color: 'var(--color-calcaire-50)',
                  padding: '12px 32px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  minHeight: '44px',
                }}>
                  Voir les biens disponibles
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Bandeau */}
        <section className="section-padding" style={{ background: 'var(--color-bg-dark-alt)', textAlign: 'center' }}>
          <div className="container">
            <p className="text-body-lg" style={{ color: 'var(--color-text-inverse)', marginBottom: 'var(--spacing-sm)' }}>
              Vous avez un bien à céder ?
            </p>
            <p className="text-body-md" style={{ color: 'var(--color-text-inverse)', opacity: 'var(--opacity-readable)', marginBottom: 'var(--spacing-lg)' }}>
              Offre ferme sous 7 jours. Fonds propres. Aucun mandat.
            </p>
            <Link to="/vendre" className="text-cta" style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--color-accent)',
              color: 'var(--color-bg-dark)',
              padding: '16px 48px',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              minHeight: '52px',
            }}>
              Soumettre mon dossier
            </Link>
          </div>
        </section>
      </main>
      <Footer />

    </>
  );
}
