import { Link } from 'react-router-dom';
import './PropertyCard.css';

const STATUS_CONFIG = {
  'disponible': { label: 'Disponible', className: 'property-card__badge--disponible' },
  'sous-compromis': { label: 'Sous compromis', className: 'property-card__badge--sous-compromis' },
  'vendu': { label: 'Vendu', className: 'property-card__badge--vendu' },
};

export default function PropertyCard({ property }) {
  const statusInfo = STATUS_CONFIG[property.status] || { label: property.status, className: '' };
  const hasPhoto = property.mainPhoto || property.photo;

  return (
    <article className="property-card">
      {/* Zone image — aria-hidden, la navigation clavier passe par le titre */}
      <div className="property-card__image-wrap">
        <Link
          to={`/nos-biens/${property.id}`}
          className="property-card__image-link"
          tabIndex="-1"
          aria-hidden="true"
        >
          {hasPhoto ? (
            <img
              src={hasPhoto}
              alt=""
              className="property-card__image property-card__image--photo"
            />
          ) : (
            <div className="property-card__image property-card__placeholder">
              <span className="property-card__placeholder-label">
                Visuel bientôt disponible
              </span>
            </div>
          )}
        </Link>
        {/* Badge positionné sur le conteneur wrap, pas dans le lien */}
        <span
          className={`property-card__badge ${statusInfo.className}`}
          aria-label={`Statut : ${statusInfo.label}`}
        >
          {statusInfo.label}
        </span>
      </div>

      <div className="property-card__body">
        <span className="text-label property-card__location">{property.location}</span>
        <h3 className="property-card__title">
          <Link to={`/nos-biens/${property.id}`} className="property-card__title-link">
            {property.title}
          </Link>
        </h3>
        <div className="property-card__details">
          {property.type && <span className="text-body-sm">{property.type}</span>}
          {property.type && property.surface && <span className="property-card__dot" aria-hidden="true">·</span>}
          {property.surface && <span className="text-body-sm">{property.surface}</span>}
          {property.surface && property.rooms && <span className="property-card__dot" aria-hidden="true">·</span>}
          {property.rooms && <span className="text-body-sm">{property.rooms} pièces</span>}
        </div>
        <span className="property-card__price">{property.price}</span>
        {property.priceNote && (
          <span className="text-body-sm property-card__price-note">
            {property.priceNote.includes('prêt à habiter')
              ? property.priceNote.split('.').find(s => /pr[eê]t\s+[àa]\s+habiter/i.test(s))?.trim()
              : property.priceNote.split('.')[0]?.trim()
            }
          </span>
        )}
        <Link
          to={`/nos-biens/${property.id}`}
          className="text-cta property-card__link"
          aria-label={`Voir ce bien : ${property.title}`}
        >
          Voir ce bien →
        </Link>
      </div>
    </article>
  );
}
