import { Link } from 'react-router-dom';
import { useFadeIn } from '../hooks/useFadeIn.js';
import './SellerBanner.css';

export default function SellerBanner() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section className="seller-banner section-padding" ref={ref}>
      <div className={`seller-banner__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <p className="text-body-lg seller-banner__text">
          Votre bien n'a pas trouvé preneur ? Vous êtes sous pression temporelle ?
          Nous instruisons chaque dossier — et nous décidons en 7 jours.
        </p>
        <Link to="/vendre" className="seller-banner__cta text-cta">
          Soumettre mon bien
        </Link>
      </div>
    </section>
  );
}
