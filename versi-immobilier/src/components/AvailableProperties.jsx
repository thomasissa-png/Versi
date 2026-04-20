import { Link } from 'react-router-dom';
import { useFadeIn } from '../hooks/useFadeIn.js';
import { useProperties } from '../hooks/useProperties.js';
import PropertyCard from './PropertyCard.jsx';
import './FeaturedProjects.css';

export default function AvailableProperties() {
  const { ref, isVisible } = useFadeIn();
  const { properties: available, loading, error } = useProperties('disponible');

  return (
    <section className="featured section-padding" ref={ref}>
      <div className={`featured__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <h2 className="text-heading-lg featured__title">Ce que nous proposons aujourd'hui.</h2>

        {loading ? (
          <div className="featured__empty">
            <p className="text-body-lg">Chargement des biens...</p>
          </div>
        ) : error ? (
          <div className="featured__empty">
            <p className="text-body-lg">Une erreur est survenue lors du chargement des biens.</p>
          </div>
        ) : available.length > 0 ? (
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
            <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-sm)' }}>Nos biens partent vite.</p>
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)' }}>
              Nos dernières réalisations : Moulins, Fives, Tourcoing, Bois-Blancs. Prix de vente entre 95 000 € et 350 000 €.
            </p>
            <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>Laissez votre contact — nous vous prévenons avant la mise en ligne.</p>
            <Link to="/contact" className="text-cta featured__cta">
              Être notifié
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
