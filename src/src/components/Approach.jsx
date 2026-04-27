import { useFadeIn } from '../hooks/useFadeIn.js';
import './Approach.css';

const STEPS = [
  {
    num: '01',
    title: 'SOURCER',
    body: 'Accès direct aux opportunités — réseau terrain, signaux off-market, sourcing en amont des portails publics.',
  },
  {
    num: '02',
    title: 'ANALYSER',
    body: 'Due diligence interne : rentabilité, potentiel de transformation, risque de sortie. Décision en jours, pas en trimestres.',
  },
  {
    num: '03',
    title: 'TRANSFORMER',
    body: 'Maîtrise d’ouvrage en direct. Versi pilote les travaux sans intermédiaire — chaque arbitrage technique reste en interne.',
  },
  {
    num: '04',
    title: 'OPÉRER',
    body: 'Gestion locative ou revente selon la stratégie de sortie définie dès l’acquisition. Chaque sortie est anticipée dès l’entrée.',
  },
];

export default function Approach() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section id="approche" className="approach section-padding" ref={ref}>
      <div className="container">
        <span className="text-label approach__label">APPROCHE</span>
        <h2 className="text-heading-lg approach__title">Quatre étapes. Aucune délégation.</h2>
        <p className="approach__subtitle">Un cycle reproductible. Les mêmes critères, les mêmes exigences, opération après opération.</p>

        <div className={`approach__grid ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className="approach__step"
              style={{ animationDelay: isVisible ? `${i * 100}ms` : undefined }}
            >
              <span className="approach__num">{step.num}</span>
              <h3 className="text-heading-md approach__step-title">{step.title}</h3>
              <p className="text-body-sm approach__step-body">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
