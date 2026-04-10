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
          MARCHAND DE BIENS — FRANCE
        </span>
        <h1 className="hero__title text-display">
          Avant le marché.
          <br />
          Sans les risques.
        </h1>
        <div className="hero__accent" aria-hidden="true" />
        <p className="hero__subtitle">
          Des biens sourcés, transformés et documentés par un opérateur
          intégré. Disponibles à la vente et en précommercialisation à Lille.
        </p>
        <div className="hero__ctas">
          <Link to="/nos-biens" className="hero__cta-primary">
            Voir les biens disponibles
          </Link>
          <Link to="/vendre" className="hero__cta-secondary">
            Vous avez un bien à céder →
          </Link>
        </div>
      </div>
    </section>
  );
}
