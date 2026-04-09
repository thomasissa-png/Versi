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
      <div className="hero__content">
        <h1 className={`hero__title text-display ${loaded ? 'hero__fade hero__fade--0' : 'hero__hidden'}`}>
          Vous avez un bien à céder.
          <br />
          Versi Immobilier vous remet une offre ferme en 7 jours.
        </h1>
        <p className={`hero__subtitle ${loaded ? 'hero__fade hero__fade--1' : 'hero__hidden'}`}>
          Sans condition suspensive de financement. Sans intermédiaire. Sans surprise.
        </p>
        <div className={`hero__ctas ${loaded ? 'hero__fade hero__fade--2' : 'hero__hidden'}`}>
          <Link to="/vendre" className="hero__cta-primary">
            Soumettre mon bien
          </Link>
          <Link to="/realisations" className="hero__cta-secondary">
            Voir nos réalisations
          </Link>
        </div>
      </div>
      <div className={`hero__scroll-indicator ${loaded ? 'hero__fade hero__fade--3' : 'hero__hidden'}`} aria-hidden="true">
        <span className="hero__scroll-line" />
      </div>
    </section>
  );
}
