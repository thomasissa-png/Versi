import { useFadeIn } from '../hooks/useFadeIn.js';
import './Arguments.css';

const ARGUMENTS = [
  {
    title: 'Vous achetez à la source.',
    description:
      'Pas d\'intermédiaire entre vous et le bien. Les trois fondateurs ont acheté et piloté chaque appartement — ils en connaissent l\'historique complet. Vous posez une question — vous obtenez une réponse directe.',
  },
  {
    title: 'Rien n\'est caché.',
    description:
      'Diagnostics complets. Historique des travaux. Garantie décennale sur les parties structurelles. Vous recevez le dossier complet avant la visite.',
  },
  {
    title: 'Le prix affiché est le prix.',
    description:
      'Vente directe du propriétaire à l\'acquéreur. Pas de commission d\'agence à votre charge.',
  },
];

export default function Arguments() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section className="arguments section-padding" ref={ref}>
      <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <div className="arguments__grid">
          {ARGUMENTS.map((arg) => (
            <div key={arg.title} className="arguments__item">
              <h3 className="arguments__title">
                {arg.title}
              </h3>
              <p className="arguments__description text-body-sm">
                {arg.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
