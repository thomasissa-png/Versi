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
          Des appartements à Lille.
          <br />
          Achetés, rénovés, vendus par leurs propriétaires.
        </h1>
        <div className="hero__accent" aria-hidden="true" />
        <p className="hero__subtitle">
          Versi ne mandate pas d'agent. Versi ne délègue pas les visites.
          <br />
          Vous traitez directement avec ceux qui ont pris chaque décision sur le bien.
        </p>
        <div className="hero__ctas">
          <Link to="/nos-biens" className="hero__cta-primary">
            Voir les biens disponibles
          </Link>
          <Link to="/vendre" className="hero__cta-secondary">
            Vous avez un bien à vendre ? →
          </Link>
        </div>
      </div>
    </section>
  );
}
