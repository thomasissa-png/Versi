import { useState, useEffect, useCallback } from 'react';
import './Hero.css';

export default function Hero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setLoaded(true));
  }, []);

  const handleClick = useCallback((e, href) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, []);

  return (
    <section id="hero" className="hero">
      <div className={`hero__content ${loaded ? 'hero__content--visible' : 'hero__content--hidden'}`}>
        <span className="hero__surtitre text-label">
          OPÉRATEUR IMMOBILIER INTÉGRÉ — FRANCE
        </span>
        <h1 className="hero__title text-display">
          Quatre métiers.<br />
          Un cycle maîtrisé.
        </h1>
        <div className="hero__accent" aria-hidden="true" />
        <p className="hero__subtitle">
          Versi acquiert, transforme et structure des actifs immobiliers en France.
          Un seul opérateur du sourcing à la sortie — pas de délégation, pas de perte de contrôle.
        </p>
        <div className="hero__ctas">
          <a
            href="#approche"
            className="hero__cta-primary"
            onClick={(e) => handleClick(e, '#approche')}
          >
            NOTRE APPROCHE
          </a>
          <a
            href="#contact"
            className="hero__cta-secondary"
            onClick={(e) => handleClick(e, '#contact')}
          >
            NOUS CONTACTER →
          </a>
        </div>
      </div>
    </section>
  );
}
