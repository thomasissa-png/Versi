import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import { useFadeIn } from '../hooks/useFadeIn.js';

const PROCESS_STEPS = [
  {
    number: '01',
    title: 'Sourcer',
    description: 'Nous identifions des actifs résidentiels et mixtes sous-valorisés — via notre réseau de prescripteurs, des partenariats notariaux, ou des contacts directs avec les propriétaires.',
  },
  {
    number: '02',
    title: 'Analyser',
    description: 'Chaque dossier est instruit en interne : visite physique par un fondateur, analyse comparative de marché, modélisation financière. La décision est prise par l\'équipe — pas déléguée à un consultant externe.',
  },
  {
    number: '03',
    title: 'Acquérir',
    description: 'Nous formulons une offre ferme et définitive. Sans condition suspensive de financement. Nous signons ce que nous pouvons tenir.',
  },
  {
    number: '04',
    title: 'Transformer et opérer',
    description: 'De la réhabilitation à la revente ou à la mise en location — chaque opération est suivie jusqu\'à sa sortie. Les réalisations documentées sur ce site en sont la preuve.',
  },
];

const DIFFERENTIATORS = [
  {
    title: 'Offre ferme ou refus — jamais d\'ambiguïté.',
    description: 'Nous ne formulons pas d\'intérêts flottants. Notre réponse est binaire : offre ferme par écrit, ou refus motivé par écrit. Vous savez où vous en êtes sous 7 jours.',
  },
  {
    title: 'Une holding derrière chaque engagement.',
    description: 'Versi Immobilier est l\'entité marchand de biens du Groupe Versi. La structuration financière se fait en interne (Groupe Versi). Notre capacité d\'achat ne dépend pas d\'un crédit bancaire tiers.',
  },
  {
    title: 'Une équipe identifiée, pas un opérateur anonyme.',
    description: 'Les trois fondateurs de Versi Immobilier ont des parcours vérifiables. 15 ans, 13 ans, 14 ans d\'expérience opérationnelle en gestion d\'actifs, structuration commerciale, stratégie produit. Ils sont disponibles en direct — pas derrière un standard.',
  },
];

const TEAM = [
  {
    name: 'Thomas Issa',
    role: 'Co-fondateur',
    track: '15 ans d\'expérience. Opérations TEOS, Sony. 11 actifs locatifs en compte propre à Paris.',
    initials: 'TI',
  },
  {
    name: 'Maxime Lemoine',
    role: 'Co-fondateur',
    track: '13 ans d\'expérience. Head of Sales Sony. 5 immeubles acquis, 24 contrats structurés.',
    initials: 'ML',
  },
  {
    name: 'Carl Standertskjold-Nordenstam',
    role: 'Co-fondateur',
    track: '14 ans d\'expérience. Sony, Algolia, Inbolt. Structuration de projets complexes à l\'international.',
    initials: 'CS',
  },
];

export default function ApprochePage() {
  const { ref: procRef, isVisible: procVisible } = useFadeIn();
  const { ref: diffRef, isVisible: diffVisible } = useFadeIn();
  const { ref: teamRef, isVisible: teamVisible } = useFadeIn();

  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        {/* Header */}
        <section className="section-padding" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="container">
            <h1 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-md)' }}>
              Notre approche.
            </h1>
            <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', maxWidth: 'var(--text-max-width-md)' }}>
              Analyser, structurer, décider. En interne. Sans délégation externe.
            </p>
          </div>
        </section>

        {/* Process */}
        <section className="section-padding" style={{ background: 'var(--color-bg-secondary)' }} ref={procRef}>
          <div className={`container ${procVisible ? 'fade-in' : 'fade-hidden'}`}>
            <h2 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-2xl)' }}>
              Quatre étapes. Zéro délégation.
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--spacing-xl)',
            }}>
              {PROCESS_STEPS.map((step) => (
                <div key={step.number}>
                  <span style={{
                    fontSize: '48px',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-accent)',
                    lineHeight: 1,
                    display: 'block',
                    marginBottom: 'var(--spacing-md)',
                  }}>
                    {step.number}
                  </span>
                  <h3 className="text-heading-md" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    {step.title}
                  </h3>
                  <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Différenciateurs */}
        <section className="section-padding" style={{ background: 'var(--color-bg-primary)' }} ref={diffRef}>
          <div className={`container ${diffVisible ? 'fade-in' : 'fade-hidden'}`}>
            <h2 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-2xl)' }}>
              Ce qui distingue Versi Immobilier.
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--spacing-xl)',
            }}>
              {DIFFERENTIATORS.map((d) => (
                <div key={d.title}>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 'var(--font-weight-regular)',
                    marginBottom: 'var(--spacing-sm)',
                    lineHeight: 1.3,
                  }}>
                    {d.title}
                  </h3>
                  <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {d.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Équipe */}
        <section className="section-padding" style={{ background: 'var(--color-bg-secondary)' }} ref={teamRef}>
          <div className={`container ${teamVisible ? 'fade-in' : 'fade-hidden'}`}>
            <h2 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-md)' }}>
              L'équipe.
            </h2>
            <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-2xl)' }}>
              Trois fondateurs. Pas de comité. Pas d'intermédiaire.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--spacing-xl)',
            }}>
              {TEAM.map((member) => (
                <div key={member.name}>
                  {/* Photo placeholder with initials */}
                  <div style={{
                    width: '100%',
                    aspectRatio: '4/5',
                    maxWidth: '280px',
                    background: 'var(--color-stone-200)',
                    borderRadius: 'var(--card-radius)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--spacing-lg)',
                  }}>
                    <span style={{
                      fontSize: '3rem',
                      fontWeight: 'var(--font-weight-light)',
                      color: 'var(--color-text-muted)',
                    }}>
                      {member.initials}
                    </span>
                  </div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 'var(--font-weight-regular)',
                    marginBottom: 'var(--spacing-xs)',
                  }}>
                    {member.name}
                  </h3>
                  <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)' }}>
                    {member.role}
                  </span>
                  <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {member.track}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Critères d'acquisition */}
        <section className="section-padding" style={{ background: 'var(--color-calcaire-100)' }}>
          <div className="container">
            <h2 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-xl)' }}>
              Nos critères d'acquisition.
            </h2>
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)', maxWidth: 'var(--text-max-width-lg)' }}>
              Versi Immobilier instruits des actifs résidentiels et mixtes entre 250 000 € et 1 000 000 €,
              en France — Paris, Île-de-France, Lille, Lyon, Bordeaux et villes moyennes.
              Immeubles de rapport, maisons, actifs mixtes, biens occupés ou en l'état.
            </p>
          </div>
        </section>

        {/* Lien Groupe Versi */}
        <section className="section-padding" style={{ background: 'var(--color-bg-primary)', textAlign: 'center' }}>
          <div className="container">
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)', maxWidth: 'var(--text-max-width-md)', margin: '0 auto var(--spacing-lg)' }}>
              Versi Immobilier est l'entité marchand de biens du Groupe Versi — une holding immobilière intégrée
              qui couvre l'ensemble du cycle de vie d'un actif.
            </p>
            <a
              href="https://versi.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cta"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                color: 'var(--color-accent)',
                textDecoration: 'none',
              }}
            >
              En savoir plus sur le Groupe Versi
            </a>
          </div>
        </section>

        {/* CTAs bas de page */}
        <section className="section-padding" style={{ background: 'var(--color-bg-dark-alt)', textAlign: 'center' }}>
          <div className="container" style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/vendre"
              className="text-cta"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--color-accent)',
                color: 'var(--color-bg-dark)',
                padding: '16px 40px',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                minHeight: '52px',
              }}
            >
              Soumettre un dossier
            </Link>
            <Link
              to="/contact"
              className="text-cta"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid var(--color-text-inverse)',
                color: 'var(--color-text-inverse)',
                padding: '16px 40px',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                minHeight: '52px',
              }}
            >
              Nous contacter
            </Link>
          </div>
        </section>
      </main>
      <Footer />

      <style>{`
        @media (max-width: 1279px) {
          div[style*="grid-template-columns: repeat(4, 1fr)"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 767px) {
          div[style*="grid-template-columns: repeat(4, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="grid-template-columns: repeat(3, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
