import { useState } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import { useFadeIn } from '../hooks/useFadeIn.js';
import thomasPhoto from '../assets/team/thomas.png';
import maxPhoto from '../assets/team/max.png';
import carlPhoto from '../assets/team/carl.png';

const PROCESS_STEPS = [
  {
    number: '01',
    title: 'Sourcer',
    description: 'Réseau de prescripteurs, partenariats notariaux, contacts directs avec les propriétaires.',
  },
  {
    number: '02',
    title: 'Analyser',
    description: 'Visite physique par un fondateur. Analyse de marché. Modélisation financière. La décision est prise par l\'équipe — pas déléguée.',
  },
  {
    number: '03',
    title: 'Acquérir',
    description: 'Offre ferme et définitive. Sans condition suspensive de financement — nous n\'achetons pas à crédit. L\'opération ne dépend d\'aucun accord bancaire tiers.',
  },
  {
    number: '04',
    title: 'Transformer et livrer',
    description: 'Réhabilitation, revente ou mise en location — chaque projet est suivi jusqu\'à la livraison. Les réalisations sur ce site en attestent.',
  },
];

const DIFFERENTIATORS = [
  {
    title: 'Offre ferme ou refus — jamais d\'ambiguïté.',
    description: 'Notre réponse est binaire : offre ferme par écrit, ou refus motivé par écrit. Vous savez où vous en êtes sous 7 jours.',
  },
  {
    title: 'Sans prêt bancaire. Sans condition suspensive.',
    description: 'Versi achète sur fonds propres, via le Groupe Versi. Quand nous formulons une offre, elle tient. Aucun accord de financement tiers ne peut faire tomber une vente.',
  },
  {
    title: 'Joignables en direct.',
    description: 'Les trois fondateurs achètent, rénovent, font visiter et négocient eux-mêmes. Pas de standard, pas d\'assistant — vous parlez à celui qui a pris les décisions.',
  },
];

const TEAM = [
  {
    name: 'Maxime Lemoine',
    role: 'Co-fondateur',
    track: '13 ans d\'expérience. Head of Sales Sony. 5 immeubles acquis, 24 contrats structurés.',
    photo: maxPhoto,
    linkedin: 'https://www.linkedin.com/in/maxime-lemoine-34550354/',
  },
  {
    name: 'Thomas Issa',
    role: 'Co-fondateur',
    track: '15 ans d\'expérience. TEOS, Sony. 13 actifs locatifs en compte propre à Paris.',
    photo: thomasPhoto,
    linkedin: 'https://www.linkedin.com/in/thomasissa/',
  },
  {
    name: 'Carl Standertskjold-Nordenstam',
    role: 'Co-fondateur',
    track: '14 ans d\'expérience. Sony, Algolia, Inbolt. Structuration de projets complexes à l\'international.',
    photo: carlPhoto,
    linkedin: 'https://www.linkedin.com/in/carlstandertskjold/',
  },
];

function FounderPhoto({ member }) {
  const [error, setError] = useState(false);

  if (error || !member.photo) {
    return (
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
        <span style={{ fontSize: '3rem', fontWeight: 'var(--font-weight-light)', color: 'var(--color-text-muted)' }}>
          {member.name.split(' ').map(w => w[0]).join('')}
        </span>
      </div>
    );
  }

  return (
    <img
      src={member.photo}
      alt={`${member.name}, Co-fondateur Versi Immobilier`}
      style={{
        width: '100%',
        aspectRatio: '4/5',
        maxWidth: '280px',
        objectFit: 'cover',
        objectPosition: 'center top',
        borderRadius: 'var(--card-radius)',
        marginBottom: 'var(--spacing-lg)',
      }}
      width="280"
      height="350"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

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
              Comment Versi travaille.
            </h1>
            <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', maxWidth: 'var(--text-max-width-md)' }}>
              Chaque décision prise en interne. Chaque bien porté par les fondateurs.
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
              Trois engagements. Vérifiables.
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
              Thomas, Maxime, Carl.
            </h2>
            <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-2xl)' }}>
              Trois fondateurs. Joignables en direct.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--spacing-xl)',
            }}>
              {TEAM.map((member) => (
                <div key={member.name}>
                  <FounderPhoto member={member} />
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
                  <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)' }}>
                    {member.track}
                  </p>
                  {member.linkedin && (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-text-muted)', display: 'inline-flex', minWidth: '44px', minHeight: '44px', alignItems: 'center' }}
                      aria-label={`LinkedIn de ${member.name}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.52 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.712-2.165 1.212V6.169H6.55c.032.678 0 7.225 0 7.225h2.4z" />
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Critères d'acquisition */}
        <section className="section-padding" style={{ background: 'var(--color-calcaire-100)' }}>
          <div className="container">
            <h2 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-xl)' }}>
              Ce que nous achetons.
            </h2>
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)', maxWidth: 'var(--text-max-width-lg)' }}>
              Versi Immobilier acquiert des biens résidentiels et mixtes entre 250 000 € et 1 000 000 €,
              en France — Paris, Île-de-France, Lille, Lyon, Bordeaux et villes moyennes.
              Immeubles de rapport, maisons, biens mixtes. Biens occupés ou en l'état acceptés.
            </p>
          </div>
        </section>

        {/* Lien Groupe Versi */}
        <section className="section-padding" style={{ background: 'var(--color-bg-primary)', textAlign: 'center' }}>
          <div className="container">
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)', maxWidth: 'var(--text-max-width-md)', margin: '0 auto var(--spacing-lg)' }}>
              Versi Immobilier est l'entité marchand de biens du Groupe Versi, holding immobilière intégrée basée à Lille.
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
          <div className="container">
            <p className="text-heading-md" style={{ color: 'var(--color-text-inverse)', marginBottom: 'var(--spacing-2xl)' }}>
              Un bien à céder ? Un projet à discuter ?
            </p>
          </div>
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
