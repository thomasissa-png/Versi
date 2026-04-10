import { Link } from 'react-router-dom';
import { useFadeIn } from '../hooks/useFadeIn.js';
import { PROPERTIES } from '../config/properties.js';
import PropertyCard from './PropertyCard.jsx';

export default function AvailableProperties() {
  const { ref, isVisible } = useFadeIn();
  const available = PROPERTIES.filter((p) => p.status !== 'vendu');

  return (
    <section className="featured section-padding" ref={ref}>
      <div className={`featured__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <h2 className="text-heading-lg featured__title">Ce que nous proposons aujourd'hui.</h2>

        {available.length > 0 ? (
          <>
            <div className="featured__grid">
              {available.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
            <div className="featured__cta-wrapper">
              <Link to="/nos-biens" className="text-cta featured__cta">
                Voir tous les biens
              </Link>
            </div>
          </>
        ) : (
          <div className="featured__empty">
            <p className="text-body-lg">Nos biens partent vite.</p>
            <p className="text-body-lg">Inscrivez-vous pour être notifié en avant-première.</p>
            <Link to="/contact" className="text-cta featured__cta">
              Être notifié
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
