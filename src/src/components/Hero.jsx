import { useState, useEffect, useCallback } from 'react';
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
      <div className="hero__content">
        <span className={`hero__surtitre text-label ${loaded ? 'hero__fade hero__fade--0' : 'hero__hidden'}`}>
          OPÉRATEUR IMMOBILIER INTÉGRÉ — FRANCE
        </span>
        <h1 className={`hero__title text-display ${loaded ? 'hero__fade hero__fade--1' : 'hero__hidden'}`}>
          Quatre métiers.<br />
          Un cycle maîtrisé.
        </h1>
        <p className={`hero__subtitle ${loaded ? 'hero__fade hero__fade--2' : 'hero__hidden'}`}>
          De l'identification de l'actif à sa structuration financière — sans passer la main.
          Versi opère l'ensemble du cycle en interne.
        </p>
        <div className={`hero__ctas ${loaded ? 'hero__fade hero__fade--3' : 'hero__hidden'}`}>
          <a
            href="#activites"
            className="hero__cta-primary"
            onClick={(e) => handleClick(e, '#activites')}
          >
            NOS ACTIVITÉS
          </a>
          <a
            href="#contact"
            className="hero__cta-secondary"
            onClick={(e) => handleClick(e, '#contact')}
          >
            NOUS CONTACTER →
          </a>
        </div>
        {scrollHintVisible && (
          <div
            className={`hero__scroll-hint ${loaded ? 'hero__fade hero__fade--4' : 'hero__hidden'}`}
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
