import { useFadeIn } from '../hooks/useFadeIn.js';
import './Mission.css';

const STATS = [
  { value: '35+', label: 'ACTIFS GÉRÉS EN DIRECT' },
  { value: '3', label: 'IMMEUBLES EN PORTEFEUILLE' },
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
            Chaque opération Versi est pilotée par les mêmes fondateurs de la sourcing à la clé. Pas de sous-traitance de la stratégie. Pas de dilution de la décision.
          </p>
          <p className="text-body-md mission__body-secondary">
            Nous n'arbitrons pas. Nous opérons.
          </p>
        </div>
        <div className="mission__stats">
          {STATS.map((stat, i) => (
            <div key={i} className="mission__stat">
              <span className="text-stat">{stat.value}</span>
              <span className="text-label mission__stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
