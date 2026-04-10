import { Link } from 'react-router-dom';
import { useFadeIn } from '../hooks/useFadeIn.js';
import './SellerBanner.css';

export default function SellerBanner() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section className="seller-banner section-padding" ref={ref}>
      <div className={`seller-banner__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <p className="text-body-lg seller-banner__text">
          <strong>Vous avez un bien à céder ?</strong>
          {' '}Offre d'achat ferme en 7 jours. Sans intermédiaire.
          Sans condition suspensive de financement sous réserve
          d'acceptation du dossier de crédit.
        </p>
        <Link to="/vendre" className="seller-banner__cta text-cta">
          Soumettre mon bien
        </Link>
      </div>
    </section>
  );
}
