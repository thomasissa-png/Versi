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
          Vous avez un bien à céder.
          <br />
          Offre ferme en 7 jours.
        </h1>
        <div className="hero__accent" aria-hidden="true" />
        <p className="hero__subtitle">
          Sans condition suspensive de financement. Sans intermédiaire. Sans surprise.
        </p>
        <div className="hero__ctas">
          <Link to="/vendre" className="hero__cta-primary">
            Soumettre mon bien
          </Link>
          <Link to="/realisations" className="hero__cta-secondary">
            Voir nos réalisations →
          </Link>
        </div>
      </div>
    </section>
  );
}
