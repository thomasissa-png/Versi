import { useFadeIn } from '../hooks/useFadeIn.js';
import './Process.css';

const STEPS = [
  {
    number: '01',
    title: 'SOURCER',
    description: 'Identification d\'actifs résidentiels et mixtes à fort potentiel de transformation sur le territoire français.',
  },
  {
    number: '02',
    title: 'ANALYSER',
    description: 'Étude de faisabilité technique, juridique et financière. Offre ferme transmise sous 7 jours.',
  },
  {
    number: '03',
    title: 'TRANSFORMER',
    description: 'Rénovation, découpe ou changement de destination. Pilotage des travaux en interne, du permis à la livraison.',
  },
  {
    number: '04',
    title: 'REVENDRE',
    description: 'Commercialisation des lots transformés auprès de particuliers, investisseurs ou institutionnels.',
  },
];

export default function Process() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section className="process section-padding" ref={ref}>
      <div className={`process__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <span className="text-label process__label">NOTRE MÉTHODE</span>
        <h2 className="text-heading-lg process__title">Un cycle maîtrisé</h2>
        <div className="process__steps">
          {STEPS.map((step, index) => (
            <div key={step.number} className="process__step">
              <span className="process__number">{step.number}</span>
              <h3 className="text-heading-md process__step-title">{step.title}</h3>
              <p className="text-body-sm process__step-desc">{step.description}</p>
              {index < STEPS.length - 1 && (
                <div className="process__connector" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
