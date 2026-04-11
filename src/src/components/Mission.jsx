import { useFadeIn } from '../hooks/useFadeIn.js';
import './Mission.css';

const STATS = [
  { value: '35+', label: 'ACTIFS GÉRÉS EN DIRECT' },
  { value: '5', label: 'IMMEUBLES EN PORTEFEUILLE' },
  { value: '4', label: 'MÉTIERS INTÉGRÉS' },
];

export default function Mission() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section id="mission" className="mission section-padding" ref={ref}>
      <div className={`mission__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <div className="mission__content">
          <span className="text-label mission__label">VISION</span>
          <h2 className="text-heading-lg mission__title">
            Nous ne déléguons pas.<br />
            Nous décidons.
          </h2>
          <p className="text-body-lg mission__body">
            Chaque opération est pilotée par les mêmes fondateurs du premier contact à la dernière signature. Pas d'apporteur d'affaires, pas de bureau d'études sous-traité — les mêmes mains de l'entrée à la sortie.
          </p>
        </div>
        <div className="mission__stats">
          {STATS.map((stat, i) => (
            <div key={i} className="mission__stat">
              <span className="text-stat">{stat.value}</span>
              <span className="text-label mission__stat-label">{stat.label}</span>
            </div>
          ))}
          <p className="text-body-sm mission__stats-context" style={{ gridColumn: '1 / -1', opacity: 0.6, marginTop: '8px' }}>
            Versi gère directement plus de 35 actifs immobiliers en France, détient 5 immeubles en portefeuille et opère à travers 4 métiers intégrés.
          </p>
        </div>
      </div>
    </section>
  );
}
