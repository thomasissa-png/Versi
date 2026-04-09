import { useFadeIn } from '../hooks/useFadeIn.js';
import { PROJECTS } from '../config/projects.js';
import ProjectCard from './ProjectCard.jsx';
import './FeaturedProjects.css';

export default function FeaturedProjects() {
  const { ref, isVisible } = useFadeIn();
  const featured = PROJECTS.filter((p) => p.featured);

  return (
    <section className="featured section-padding" ref={ref}>
      <div className={`featured__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <span className="text-label featured__label">PROJETS</span>
        <h2 className="text-heading-lg featured__title">Opérations récentes</h2>
        <div className="featured__grid">
          {featured.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
