import { Link } from 'react-router-dom';
import './PropertyCard.css';

const STATUS_CONFIG = {
  'disponible': { label: 'Disponible', className: 'property-card__badge--disponible' },
  'sous-compromis': { label: 'Sous compromis', className: 'property-card__badge--sous-compromis' },
  'vendu': { label: 'Vendu', className: 'property-card__badge--vendu' },
};

export default function PropertyCard({ property }) {
  const statusInfo = STATUS_CONFIG[property.status] || { label: property.status, className: '' };

  return (
    <article className="property-card">
      <Link to={`/nos-biens/${property.id}`} className="property-card__image-link">
        <div className="property-card__image image-placeholder">
          <span className="property-card__image-text text-label">Visuel bientôt disponible</span>
          <span className={`property-card__badge ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>
      </Link>
      <div className="property-card__body">
        <span className="text-label property-card__location">{property.location}</span>
        <h3 className="property-card__title">{property.title}</h3>
        <div className="property-card__details">
          <span className="text-body-sm">{property.type}</span>
          <span className="property-card__dot" aria-hidden="true">·</span>
          <span className="text-body-sm">{property.surface}</span>
          <span className="property-card__dot" aria-hidden="true">·</span>
          <span className="text-body-sm">{property.rooms} pièces</span>
        </div>
        <span className="property-card__price">{property.price}</span>
        <Link
          to={`/nos-biens/${property.id}`}
          className="text-cta property-card__link"
        >
          Voir le bien
        </Link>
      </div>
    </article>
  );
}
