import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

export default function Hero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setLoaded(true));
  }, []);

  return (
    <section className="hero">
      <div className={`hero__content ${loaded ? 'hero__content--visible' : 'hero__content--hidden'}`}>
        <span className="hero__surtitre text-label">
          MARCHAND DE BIENS
        </span>
        <h1 className="hero__title text-display">
          Peu de biens.
          <br />
          Pas d'approximation.
        </h1>
        <div className="hero__accent" aria-hidden="true" />
        <p className="hero__subtitle">
          Des appartements sélectionnés, préparés, disponibles.
        </p>
        <div className="hero__ctas">
          <Link to="/nos-biens" className="hero__cta-primary">
            Voir les biens
          </Link>
          <Link to="/vendre" className="hero__cta-secondary">
            Vous avez un bien à vendre ? →
          </Link>
        </div>
      </div>
    </section>
  );
}
