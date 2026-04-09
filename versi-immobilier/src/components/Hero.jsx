import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

export default function Hero() {
  const [loaded, setLoaded] = useState(false);
  const [scrollHintVisible, setScrollHintVisible] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (hasScrolled) return;
    const onScroll = () => {
      if (window.scrollY > 50) {
        setScrollHintVisible(false);
        setHasScrolled(true);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hasScrolled]);

  return (
    <section className="hero">
      <div className="hero__content">
        <span className={`hero__surtitre text-label ${loaded ? 'hero__fade hero__fade--0' : 'hero__hidden'}`}>
          MARCHAND DE BIENS — FRANCE
        </span>
        <h1 className={`hero__title text-display ${loaded ? 'hero__fade hero__fade--1' : 'hero__hidden'}`}>
          Vous avez un bien à céder.
          <br />
          Offre ferme en 7 jours.
        </h1>
        <div className={`hero__accent ${loaded ? 'hero__fade hero__fade--2' : 'hero__hidden'}`} aria-hidden="true" />
        <p className={`hero__subtitle ${loaded ? 'hero__fade hero__fade--3' : 'hero__hidden'}`}>
          Sans condition suspensive de financement. Sans intermédiaire. Sans surprise.
        </p>
        <div className={`hero__ctas ${loaded ? 'hero__fade hero__fade--4' : 'hero__hidden'}`}>
          <Link to="/vendre" className="hero__cta-primary">
            Soumettre mon bien
          </Link>
          <Link to="/realisations" className="hero__cta-secondary">
            Voir nos réalisations →
          </Link>
        </div>
        {scrollHintVisible && (
          <div
            className={`hero__scroll-hint ${loaded ? 'hero__fade hero__fade--5' : 'hero__hidden'}`}
            aria-hidden="true"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        )}
      </div>
    </section>
  );
}
