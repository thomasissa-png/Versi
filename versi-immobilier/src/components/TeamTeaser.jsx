import { Link } from 'react-router-dom';
import { useFadeIn } from '../hooks/useFadeIn.js';
import './TeamTeaser.css';

const FOUNDERS = [
  { name: 'Thomas Issa', initials: 'TI', track: '15 ans d\'expérience — 11 actifs en compte propre à Paris' },
  { name: 'Maxime Lemoine', initials: 'ML', track: '13 ans d\'expérience — 5 immeubles acquis, 24 contrats structurés' },
  { name: 'Carl Standertskjold-Nordenstam', initials: 'CS', track: '14 ans d\'expérience — structuration de projets complexes' },
];

export default function TeamTeaser() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section className="team-teaser section-padding" ref={ref}>
      <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <h2 className="text-heading-lg team-teaser__heading">
          Trois associés. Chaque bien porté de l'achat à la remise des clés.
        </h2>
        <p className="text-body-lg team-teaser__subtitle">
          Versi ne mandate pas d'intermédiaire. Les trois fondateurs achètent, rénovent, font visiter et négocient eux-mêmes.
        </p>
        <div className="team-teaser__grid">
          {FOUNDERS.map((f) => (
            <div key={f.name} className="team-teaser__member">
              <div className="team-teaser__avatar">
                <span className="team-teaser__initials">
                  {f.initials}
                </span>
              </div>
              <h3 className="team-teaser__name">
                {f.name}
              </h3>
              <p className="team-teaser__track text-body-sm">
                {f.track}
              </p>
            </div>
          ))}
        </div>
        <Link to="/notre-approche" className="text-cta team-teaser__link">
          Découvrir notre approche complète
        </Link>
      </div>
    </section>
  );
}
