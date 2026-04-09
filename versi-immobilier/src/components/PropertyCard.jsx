import { Link } from 'react-router-dom';
import './PropertyCard.css';

const STATUS_LABELS = {
  'a-vendre': 'À vendre',
  'vendu': 'Vendu',
};

export default function PropertyCard({ property }) {
  const isAvailable = property.status === 'a-vendre';

  return (
    <article className={`property-card ${!isAvailable ? 'property-card--sold' : ''}`}>
      <div className="property-card__image image-placeholder">
        Photo à venir
        {!isAvailable && (
          <span className="property-card__sold-badge">VENDU</span>
        )}
      </div>
      <div className="property-card__body">
        <div className="property-card__meta">
          <span className="text-label property-card__location">{property.location}</span>
          <span className={`text-label property-card__status property-card__status--${property.status}`}>
            {STATUS_LABELS[property.status] || property.status}
          </span>
        </div>
        <h3 className="text-heading-md property-card__title">{property.title}</h3>
        <div className="property-card__details">
          <span className="text-body-sm">{property.type}</span>
          <span className="property-card__dot" aria-hidden="true">·</span>
          <span className="text-body-sm">{property.surface}</span>
          <span className="property-card__dot" aria-hidden="true">·</span>
          <span className="text-body-sm">{property.rooms} pièces</span>
        </div>
        <span className="property-card__price">{property.price}</span>
        {isAvailable && (
          <Link
            to={`/biens/${property.id}`}
            className="text-cta property-card__link"
          >
            VOIR LE BIEN →
          </Link>
        )}
      </div>
    </article>
  );
}
