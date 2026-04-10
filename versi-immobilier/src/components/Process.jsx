import { useFadeIn } from '../hooks/useFadeIn.js';
import './Process.css';

const STEPS = [
  {
    number: '01',
    title: 'Vous parcourez le portefeuille.',
    description: 'Biens disponibles à la vente et en précommercialisation à Lille et en région. Chaque fiche détaille l\'opération — adresse, travaux réalisés, prix, disponibilité.',
  },
  {
    number: '02',
    title: 'Vous prenez contact directement.',
    description: 'Un échange avec l\'équipe Versi Immobilier. Pas un agent intermédiaire — l\'opérateur qui a transformé le bien, qui connaît chaque détail de l\'opération.',
  },
  {
    number: '03',
    title: 'Vous signez en sachant ce que vous achetez.',
    description: 'Chaque bien est documenté — historique des travaux, état avant transformation, chiffres de l\'opération. Pas de surprise après la signature.',
  },
];

export default function Process() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section className="process section-padding" ref={ref}>
      <div className={`process__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <h2 className="text-heading-lg process__title">
          Trois étapes pour acquérir sans surprise.
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
