import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import { PROJECTS } from '../config/projects.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

export default function RealisationsPage() {
  const { ref, isVisible } = useFadeIn();
  const { ref: gridRef, isVisible: gridVisible } = useFadeIn();

  const completed = useMemo(
    () => PROJECTS.filter((p) => p.status === 'completed'),
    []
  );

  const avgDelay = useMemo(() => {
    const delays = completed.map((p) => p.offerDelay).filter(Boolean);
    if (delays.length === 0) return null;
    return Math.round(delays.reduce((a, b) => a + b, 0) / delays.length);
  }, [completed]);

  const stats = [
    { value: `${completed.length}`, label: 'rénovations terminées' },
    { value: '3,2M€', label: 'de volume traité' },
    { value: avgDelay ? `${avgDelay} jours` : '—', label: 'délai moyen' },
  ];

  return (
    <>
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
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--spacing-xl)',
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
            {completed.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 'var(--spacing-xl)',
              }}>
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
                <p className="text-body-lg">
                  Nos premières réalisations seront publiées ici dans les prochaines semaines.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Bandeau */}
        <section className="section-padding" style={{ background: 'var(--color-bg-dark-alt)', textAlign: 'center' }}>
          <div className="container">
            <p className="text-body-lg" style={{ color: 'var(--color-text-inverse)', marginBottom: 'var(--spacing-lg)' }}>
              Vous avez un bien à céder ?
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
              Soumettre mon bien
            </Link>
          </div>
        </section>
      </main>
      <Footer />

      <style>{`
        @media (max-width: 767px) {
          div[style*="grid-template-columns: repeat(3, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="grid-template-columns: repeat(2, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
