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
        <span className={`hero__surtitre text-label ${loaded ? 'hero__fade hero__fade--0' : 'hero__hidden'}`}>
          MARCHAND DE BIENS — FRANCE
        </span>
        <h1 className={`hero__title text-display ${loaded ? 'hero__fade hero__fade--1' : 'hero__hidden'}`}>
          Acquisition.<br />
          Transformation.<br />
          Revente.
        </h1>
        <div className={`hero__accent ${loaded ? 'hero__fade hero__fade--2' : 'hero__hidden'}`} aria-hidden="true" />
        <p className={`hero__subtitle ${loaded ? 'hero__fade hero__fade--3' : 'hero__hidden'}`}>
          Versi Immobilier achète, transforme et revend des actifs résidentiels
          et mixtes en France. Offre ferme. Décision en 7 jours.
          Sans condition suspensive.
        </p>
        <div className={`hero__ctas ${loaded ? 'hero__fade hero__fade--4' : 'hero__hidden'}`}>
          <Link to="/vendre" className="hero__cta-primary">
            VENDRE UN BIEN
          </Link>
          <Link to="/realisations" className="hero__cta-secondary">
            NOS RÉALISATIONS →
          </Link>
        </div>
      </div>
    </section>
  );
}
