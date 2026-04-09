import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import { PROJECTS } from '../config/projects.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

export default function RealisationsPage() {
  const { ref, isVisible } = useFadeIn();
  const realisations = PROJECTS.filter((p) => p.status === 'realise');

  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        <section className="section-padding" ref={ref}>
          <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
            <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
              RÉALISATIONS
            </span>
            <h1 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
              Opérations terminées
            </h1>
            <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-2xl)', maxWidth: 'var(--text-max-width-md)' }}>
              Chaque opération suit le même cycle : acquisition, transformation, revente.
              Voici les projets que nous avons menés à terme.
            </p>

            {realisations.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: 'var(--spacing-lg)',
              }}>
                {realisations.map((project) => (
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
                  Nos premières réalisations seront publiées prochainement.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
