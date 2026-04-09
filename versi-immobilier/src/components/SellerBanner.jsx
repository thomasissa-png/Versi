import { Link } from 'react-router-dom';
import { useFadeIn } from '../hooks/useFadeIn.js';
import './SellerBanner.css';

export default function SellerBanner() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section className="seller-banner section-padding" ref={ref}>
      <div className={`seller-banner__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <h2 className="text-heading-lg seller-banner__title">
          Vous avez un bien à céder ?
        </h2>
        <p className="text-body-lg seller-banner__subtitle">
          Offre ferme sous 7 jours. Sans condition suspensive de financement.
        </p>
        <Link to="/vendre" className="seller-banner__cta text-cta">
          RECEVOIR UNE OFFRE
        </Link>
      </div>
    </section>
  );
}
