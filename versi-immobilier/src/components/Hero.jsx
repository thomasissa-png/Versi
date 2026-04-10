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
          VERSI IMMOBILIER — LILLE
        </span>
        <h1 className="hero__title text-display">
          On connaît chaque mur.
          <br />
          On vous le vend, en direct.
        </h1>
        <div className="hero__accent" aria-hidden="true" />
        <p className="hero__subtitle">
          Des appartements à Lille, vendus en direct par celui qui les a portés.
          <br />
          Vous parlez au propriétaire — pas à un intermédiaire.
        </p>
        <div className="hero__ctas">
          <Link to="/nos-biens" className="hero__cta-primary">
            Voir les appartements disponibles
          </Link>
          <Link to="/vendre" className="hero__cta-secondary">
            Vous avez un bien à céder →
          </Link>
        </div>
      </div>
    </section>
  );
}
