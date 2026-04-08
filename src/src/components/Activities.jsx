import { useFadeIn } from '../hooks/useFadeIn.js';
import { ENTITIES, ENTITY_SITES_ACTIVE } from '../config/entities.js';
import './Activities.css';

export default function Activities() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section id="activites" className="activities section-padding" ref={ref}>
      <div className="container">
        <span className="text-label activities__label">ACTIVITÉS</span>
        <h2 className="text-heading-lg activities__title">
          Une holding. Quatre entités.
        </h2>
        <div className={`activities__grid ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
          {ENTITIES.map((entity, i) => {
            const isActive = ENTITY_SITES_ACTIVE[entity.id];
            return (
              <article
                key={entity.id}
                className="activities__card"
                style={{ animationDelay: isVisible ? `${i * 100}ms` : undefined }}
              >
                <span className="text-label activities__card-label">{entity.label}</span>
                <h3 className="text-heading-md activities__card-name">{entity.name}</h3>
                <p className="text-body-sm activities__card-desc">{entity.description}</p>
                {isActive ? (
                  <a
                    href={entity.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cta activities__card-cta activities__card-cta--active"
                  >
                    {entity.ctaText} →
                  </a>
                ) : (
                  <span
                    className="text-cta activities__card-cta activities__card-cta--disabled"
                    aria-disabled="true"
                    aria-label={`${entity.name} — site bientôt disponible`}
                  >
                    {entity.ctaTextDisabled}
                  </span>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
