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
          MARCHAND DE BIENS — LILLE
        </span>
        <h1 className="hero__title text-display">
          Avant le marché.
          <br />
          Sans les risques.
        </h1>
        <div className="hero__accent" aria-hidden="true" />
        <p className="hero__subtitle">
          Des appartements et maisons rénovés, vendus directement par
          l'opérateur qui les a transformés. Vous savez ce que vous
          achetez avant de signer.
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
