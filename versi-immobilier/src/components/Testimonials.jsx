import { useFadeIn } from '../hooks/useFadeIn.js';
import { TESTIMONIALS } from '../config/testimonials.js';
import './Testimonials.css';

export default function Testimonials() {
  const { ref, isVisible } = useFadeIn();

  // Empty state: section entirely hidden per specs
  if (!TESTIMONIALS || TESTIMONIALS.length === 0) {
    return null;
  }

  return (
    <section className="testimonials section-padding" ref={ref}>
      <div className={`testimonials__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <h2 className="text-heading-lg testimonials__title">Ce qu'ils en disent.</h2>
        <div className="testimonials__grid">
          {TESTIMONIALS.map((t, index) => (
            <blockquote key={index} className="testimonials__card">
              <p className="text-body-sm testimonials__quote">&laquo; {t.quote} &raquo;</p>
              <footer className="testimonials__author">
                <cite className="text-label testimonials__name">{t.author}</cite>
                <span className="testimonials__context">{t.context}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
