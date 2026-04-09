import { Link } from 'react-router-dom';
import './ProjectCard.css';

const STATUS_LABELS = {
  'realise': 'Réalisé',
  'en-cours': 'En cours',
  'a-venir': 'À venir',
};

export default function ProjectCard({ project }) {
  return (
    <article className="project-card">
      <div className="project-card__image image-placeholder">
        Photo à venir
      </div>
      <div className="project-card__body">
        <div className="project-card__meta">
          <span className="text-label project-card__location">{project.location}</span>
          <span className={`text-label project-card__status project-card__status--${project.status}`}>
            {STATUS_LABELS[project.status] || project.status}
          </span>
        </div>
        <h3 className="text-heading-md project-card__title">{project.title}</h3>
        <div className="project-card__details">
          <span className="text-body-sm">{project.type}</span>
          <span className="project-card__dot" aria-hidden="true">·</span>
          <span className="text-body-sm">{project.surface}</span>
          {project.units && (
            <>
              <span className="project-card__dot" aria-hidden="true">·</span>
              <span className="text-body-sm">{project.units} lots</span>
            </>
          )}
        </div>
        <Link
          to={`/realisations/${project.id}`}
          className="text-cta project-card__link"
        >
          VOIR LE PROJET →
        </Link>
      </div>
    </article>
  );
}
