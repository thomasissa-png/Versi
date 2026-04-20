import { Link } from 'react-router-dom';
import './ProjectCard.css';

export default function ProjectCard({ project }) {
  return (
    <article className="project-card">
      <div className="project-card__image-wrapper">
        <Link
          to={`/realisations/${project.id}`}
          className="project-card__image-link"
          tabIndex="-1"
          aria-hidden="true"
        >
          {project.cover_url ? (
            <img
              src={project.cover_url}
              alt={project.title}
              className="project-card__image project-card__image--photo"
            />
          ) : (
            <div className="project-card__image image-placeholder">
              <span className="project-card__image-label">
                Photo bientôt disponible
              </span>
            </div>
          )}
        </Link>
      </div>
      <div className="project-card__body">
        <h3 className="project-card__title">
          <Link to={`/realisations/${project.id}`} className="project-card__title-link">
            {project.title}
          </Link>
        </h3>
        <div className="project-card__figures">
          {project.sellPrice && (
            <span className="text-body-sm project-card__figure">
              {project.sellPrice}
            </span>
          )}
          {project.duration && (
            <>
              <span className="project-card__dot" aria-hidden="true">·</span>
              <span className="text-body-sm project-card__figure">
                {project.duration}
              </span>
            </>
          )}
        </div>
        <Link
          to={`/realisations/${project.id}`}
          className="text-cta project-card__link"
        >
          Voir le projet
        </Link>
      </div>
    </article>
  );
}
