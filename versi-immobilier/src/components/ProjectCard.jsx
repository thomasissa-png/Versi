import { useState } from 'react';
import { Link } from 'react-router-dom';
import './ProjectCard.css';

export default function ProjectCard({ project }) {
  const [view, setView] = useState('apres');

  return (
    <article className="project-card">
      <div className="project-card__image-wrapper">
        <div className="project-card__image image-placeholder">
          <span className="project-card__image-label">
            {view === 'avant' ? 'Photo avant' : 'Photo après'}
          </span>
        </div>
        <div className="project-card__toggle" role="tablist" aria-label="Basculer avant/après">
          <button
            role="tab"
            aria-selected={view === 'apres'}
            className={`project-card__tab ${view === 'apres' ? 'project-card__tab--active' : ''}`}
            onClick={() => setView('apres')}
          >
            Après
          </button>
          <button
            role="tab"
            aria-selected={view === 'avant'}
            className={`project-card__tab ${view === 'avant' ? 'project-card__tab--active' : ''}`}
            onClick={() => setView('avant')}
          >
            Avant
          </button>
        </div>
      </div>
      <div className="project-card__body">
        <h3 className="project-card__title">{project.title}</h3>
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
