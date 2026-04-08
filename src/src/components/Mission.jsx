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
            Un opérateur intégré.<br />
            Quatre métiers. Un cycle.
          </h2>
          <p className="text-body-lg mission__body">
            Versi est une holding immobilière qui maîtrise l'ensemble du cycle d'une opération — de l'identification de l'actif à sa structuration financière finale, sans passer la main à chaque étape.
          </p>
          <p className="text-body-md mission__body-secondary">
            Nous n'arbitrons pas. Nous opérons. Chaque décision critique reste en interne, portée par les mêmes fondateurs du début à la fin.
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
