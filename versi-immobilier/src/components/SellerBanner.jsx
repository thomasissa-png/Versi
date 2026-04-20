import { Link } from 'react-router-dom';
import { useFadeIn } from '../hooks/useFadeIn.js';
import './SellerBanner.css';

export default function SellerBanner() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section className="seller-banner section-padding" ref={ref}>
      <div className={`seller-banner__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <p className="text-body-lg seller-banner__text">
          <strong>Vous avez un bien à céder.</strong>
          {' '}Versi Immobilier achète en direct, sur fonds propres. Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée.
        </p>
        <Link to="/vendre" className="seller-banner__cta text-cta">
          Soumettre votre bien
        </Link>
      </div>
    </section>
  );
}
