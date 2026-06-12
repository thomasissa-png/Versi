import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFadeIn } from '../hooks/useFadeIn.js';
import { useProjects } from '../hooks/useProjects.js';
import ProjectCard from './ProjectCard.jsx';
import './FeaturedProjects.css';

export default function FeaturedProjects() {
  const { ref, isVisible } = useFadeIn();
  const { projects, loading, error } = useProjects('completed');

  const featured = useMemo(
    () => projects.filter((p) => p.featured).slice(0, 3),
    [projects]
  );

  return (
    <section className="featured section-padding" ref={ref}>
      <div className={`featured__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <h2 className="text-heading-lg featured__title">Réalisations récentes.</h2>
        <p className="text-body-lg featured__intro">
          Chaque rénovation documentée - adresse, délais, chiffres.
        </p>

        {loading ? (
          <div className="featured__empty">
            <p className="text-body-lg">Chargement des réalisations...</p>
          </div>
        ) : error ? (
          <div className="featured__empty">
            <p className="text-body-lg">Une erreur est survenue lors du chargement.</p>
          </div>
        ) : featured.length > 0 ? (
          <>
            <div className="featured__grid">
              {featured.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
            <div className="featured__cta-wrapper">
              <Link to="/realisations" className="text-cta featured__cta">
                Toutes nos réalisations
              </Link>
            </div>
          </>
        ) : (
          <p className="text-body-lg featured__empty">
            Nos premières réalisations seront bientôt documentées ici.
          </p>
        )}
      </div>
    </section>
  );
}
