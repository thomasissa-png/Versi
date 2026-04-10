import { useFadeIn } from '../hooks/useFadeIn.js';

const ARGUMENTS = [
  {
    title: 'Nous portons le bien de bout en bout.',
    description:
      'Chaque bien que vous voyez ici, nous l\'avons acheté et piloté — rénové ou avec un projet défini. Vous parlez au propriétaire-vendeur, pas à un agent qui lit une fiche.',
  },
  {
    title: 'Rien n\'est caché.',
    description:
      'Diagnostics complets. Historique des travaux. Garantie décennale sur les parties structurelles. Vous recevez le dossier avant la visite, pas le jour de la signature.',
  },
  {
    title: 'Le prix affiché est le prix.',
    description:
      'Versi vend en direct à l\'acquéreur. Pas de commission d\'agence sur votre achat. Vous traitez avec le propriétaire du bien — celui qui a pris toutes les décisions.',
  },
];

export default function Arguments() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section className="section-padding" style={{ background: 'var(--color-bg-primary)' }} ref={ref}>
      <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--spacing-xl)',
        }}>
          {ARGUMENTS.map((arg) => (
            <div key={arg.title}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 'var(--font-weight-regular)',
                marginBottom: 'var(--spacing-sm)',
                lineHeight: 1.3,
              }}>
                {arg.title}
              </h3>
              <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                {arg.description}
              </p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 767px) {
          div[style*="repeat(3, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
