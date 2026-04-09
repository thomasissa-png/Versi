import { useFadeIn } from '../hooks/useFadeIn.js';
import './Process.css';

const STEPS = [
  {
    number: '01',
    title: 'Vous soumettez votre dossier.',
    description: 'Adresse, type de bien, surface, situation locative. En ligne ou par email. Nous accusons réception sous 24h.',
  },
  {
    number: '02',
    title: 'Nous instruisons.',
    description: 'Visite du bien, analyse du marché, modélisation financière. Entièrement géré en interne — aucune délégation externe.',
  },
  {
    number: '03',
    title: 'Nous vous remettons une offre ferme.',
    description: 'Offre d\'achat ferme et définitive sous 7 jours calendaires. Sans condition suspensive de financement. Ou refus motivé par écrit.',
  },
];

export default function Process() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section className="process section-padding" ref={ref}>
      <div className={`process__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <h2 className="text-heading-lg process__title">
          Trois étapes. Sept jours. Une offre ferme.
        </h2>
        <div className="process__steps">
          {STEPS.map((step, index) => (
            <div key={step.number} className="process__step">
              <span className="process__number">{step.number}</span>
              <h3 className="process__step-title">{step.title}</h3>
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
