import { Link } from 'react-router-dom';
import { useFadeIn } from '../hooks/useFadeIn.js';
import { PROJECTS } from '../config/projects.js';
import ProjectCard from './ProjectCard.jsx';
import './FeaturedProjects.css';

export default function FeaturedProjects() {
  const { ref, isVisible } = useFadeIn();
  const featured = PROJECTS.filter((p) => p.featured).slice(0, 3);

  return (
    <section className="featured section-padding" ref={ref}>
      <div className={`featured__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <h2 className="text-heading-lg featured__title">Réalisations récentes.</h2>
        <p className="text-body-lg featured__intro">
          Chaque rénovation documentée — adresse, délais, chiffres.
        </p>

        {featured.length > 0 ? (
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
