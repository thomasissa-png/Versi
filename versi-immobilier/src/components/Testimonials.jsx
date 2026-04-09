import { useFadeIn } from '../hooks/useFadeIn.js';
import { TESTIMONIALS } from '../config/testimonials.js';
import './Testimonials.css';

export default function Testimonials() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section className="testimonials section-padding" ref={ref}>
      <div className={`testimonials__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <span className="text-label testimonials__label">PARTENAIRES</span>
        <h2 className="text-heading-lg testimonials__title">Ils travaillent avec nous</h2>
        <div className="testimonials__grid">
          {TESTIMONIALS.map((t, index) => (
            <blockquote key={index} className="testimonials__card">
              <p className="text-body-sm testimonials__quote">"{t.quote}"</p>
              <footer className="testimonials__author">
                <cite className="text-label testimonials__name">{t.name}</cite>
                <span className="testimonials__company">{t.company}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
