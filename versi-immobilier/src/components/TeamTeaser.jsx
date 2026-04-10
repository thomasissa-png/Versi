import { Link } from 'react-router-dom';
import { useFadeIn } from '../hooks/useFadeIn.js';

const FOUNDERS = [
  { name: 'Thomas Issa', initials: 'TI', track: '15 ans d\'expérience — 11 actifs en compte propre à Paris' },
  { name: 'Maxime Lemoine', initials: 'ML', track: '13 ans d\'expérience — 5 immeubles acquis, 24 contrats structurés' },
  { name: 'Carl Standertskjold-Nordenstam', initials: 'CS', track: '14 ans d\'expérience — structuration de projets complexes' },
];

export default function TeamTeaser() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section className="section-padding" style={{ background: 'var(--color-bg-secondary)' }} ref={ref}>
      <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <h2 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-md)' }}>
          Versi Immobilier, c'est trois associés.
        </h2>
        <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-2xl)', maxWidth: 'var(--text-max-width-md)' }}>
          Pas une agence. Pas un fonds. Trois personnes qui ont rénové
          ces appartements et qui vous reçoivent elles-mêmes.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--spacing-xl)',
          marginBottom: 'var(--spacing-2xl)',
        }}>
          {FOUNDERS.map((f) => (
            <div key={f.name}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--color-stone-200)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--spacing-md)',
              }}>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 'var(--font-weight-light)',
                  color: 'var(--color-text-muted)',
                }}>
                  {f.initials}
                </span>
              </div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 'var(--font-weight-regular)',
                marginBottom: 'var(--spacing-xs)',
              }}>
                {f.name}
              </h3>
              <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                {f.track}
              </p>
            </div>
          ))}
        </div>
        <Link
          to="/notre-approche"
          className="text-cta"
          style={{
            color: 'var(--color-accent)',
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
          }}
        >
          Découvrir notre approche complète
        </Link>
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
