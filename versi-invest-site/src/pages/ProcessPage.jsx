import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import './ProcessPage.css';

const STEPS = [
  {
    num: '01',
    title: 'Détection d’opportunité',
    description: 'Les biens analysés proviennent de notre réseau terrain — alimenté par l’activité de marchand de biens du Groupe Versi — ou d’une veille active sur le marché. Chaque bien passe 15+ critères avant d’être présélectionné. Si les chiffres ne tiennent pas, le dossier est écarté avant de vous parvenir.',
    included: 'Recherche active. Analyse préliminaire multi-critères. Dossier de présélection chiffré.',
    notIncluded: 'Sourcing sur portails publics. Prospection hors réseau sur demande spécifique.',
    duration: '2 à 4 semaines selon la disponibilité des opportunités.',
  },
  {
    num: '02',
    title: 'Visite fondateur',
    description: 'Avant de vous présenter quoi que ce soit, un fondateur visite le bien seul. Objectif : valider l’état réel, estimer les travaux, confirmer que le prix est cohérent avec le rendement ciblé. Si la visite ne confirme pas les chiffres, le bien est écarté.',
    included: 'Déplacement d’un fondateur. Analyse technique sur site. Estimation travaux. Validation prix.',
    notIncluded: 'Expertise technique formelle (Versi Invest n’est pas un bureau d’études). Pour les pathologies complexes, nous recommandons un expert indépendant.',
    duration: '1 journée (visite + rapport interne).',
  },
  {
    num: '03',
    title: 'Simulation financière',
    description: 'Si le bien passe la visite fondateur, une simulation complète est produite : rendement brut, net, net-net, cashflow mensuel, TRI, Cash-on-Cash. Chaque charge est listée — taxe foncière, copropriété, assurance PNO, vacance provisionnée. Deux scénarios systématiques : nominal et prudent (+15 % de charges). Si le cashflow ne tient pas en scénario prudent, on ne présente pas le bien.',
    included: 'Simulation financière complète en PDF. Scénario nominal et scénario prudent. Détail de chaque charge.',
    notIncluded: 'Conseil fiscal personnalisé (consulter un expert-comptable pour l’optimisation propre à votre situation).',
    duration: '2 à 3 jours après la visite fondateur.',
  },
  {
    num: '04',
    title: 'Présentation du dossier',
    description: 'Le bien a passé les trois filtres : analyse, visite, simulation. Vous recevez le dossier complet — photos, simulation chiffrée, hypothèses de travaux, scénario central et dégradé. Vous avez tous les éléments pour décider si vous voulez aller plus loin.',
    included: 'Dossier complet avec synthèse chiffrée. Présentation orale par un fondateur. Réponse à toutes vos questions.',
    duration: 'Sous 48h après validation interne.',
  },
  {
    num: '05',
    title: 'Visite avec vous',
    description: 'Vous visitez le bien avec un fondateur — Maxime, Thomas ou Carl. Pas un assistant, pas un commercial. Sur site, on confronte les hypothèses du dossier à la réalité. Vous posez les questions, on répond avec les chiffres.',
    included: 'Déplacement d’un fondateur avec vous. Validation terrain des hypothèses. Compte-rendu de visite.',
    duration: '1 journée.',
  },
  {
    num: '06',
    title: 'Structuration et financement',
    description: 'On identifie le montage adapté à votre situation : nom propre, SCI à l’IS, LMNP. On vous met en relation avec des courtiers partenaires. La simulation produite à l’étape 03 peut être présentée directement à votre conseiller bancaire.',
    included: 'Recommandation de structure juridique. Mise en relation courtier(s). Suivi jusqu’à l’offre de prêt.',
    notIncluded: 'Conseil patrimonial global (Versi Invest n’est pas un CGP). Création de SCI (à déléguer à un notaire — Versi Invest recommande des partenaires).',
    duration: '3 à 6 semaines selon le profil bancaire.',
  },
  {
    num: '07',
    title: 'Acquisition du bien',
    description: 'Offre d’achat, négociation, compromis, signature chez le notaire. On vous suit à chaque étape jusqu’à la remise des clés.',
    included: 'Rédaction de l’offre. Négociation. Suivi notaire et conditions suspensives. Coordination jusqu’à la signature.',
    duration: '2 à 3 mois (délai notaire standard).',
  },
  {
    num: '08',
    title: 'Travaux et mise en location',
    description: 'Si le bien nécessite des travaux ou une mise en location, on prend le relais : sélection des artisans, suivi de chantier, publication d’annonce, sélection du locataire, rédaction du bail. Cette étape est facultative — notre périmètre s’arrête à l’acquisition.',
    included: 'Sélection artisans. Suivi chantier. Publication annonce. Sélection locataire. Bail et état des lieux.',
    notIncluded: 'Gestion locative courante (loyers, relances, sinistres). Versi Invest peut recommander un gestionnaire partenaire.',
    duration: '2 à 4 mois selon l’ampleur.',
    optional: true,
  },
];

export default function ProcessPage() {
  return (
    <>
      <PageHead
        title="Investissement locatif : 8 étapes — Versi Invest"
        description="Détection, visite fondateur, simulation, présentation, visite avec vous, financement, acquisition. Travaux et location en option. 5% côté investisseur."
      />
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content">
        {/* Header */}
        <section className="page-header" aria-label="En-tête de page">
          <div className="container">
            <h1 className="page-header__title">
              De la détection à l’acquisition.
              <br />
              Huit étapes, zéro improvisation.
            </h1>
            <p className="page-header__intro">
              Chaque opération Versi Invest suit le même processus. Vous savez à chaque étape ce qui se passe, ce qui est inclus, et ce qui ne l’est pas.
            </p>
          </div>
        </section>

        {/* Bandeau honoraires */}
        <section className="honoraires" aria-label="Honoraires">
          <div className="container">
            <p className="honoraires__title">
              5% du prix d’acquisition. Facturés à l’investisseur. Zéro côté vendeur.
            </p>
            <p className="honoraires__text">
              Ce n’est pas une clause de style : c’est inscrit dans le mandat signé avant toute présentation de bien. Nos intérêts sont alignés avec les vôtres — si le bien n’est pas à la hauteur, on ne le présente pas.
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="steps section-padding" aria-label="Les 8 étapes">
          <div className="container">
            {STEPS.map((step) => (
              <article key={step.num} className={`step${step.num === '03' ? ' step--featured' : ''}${step.optional ? ' step--optional' : ''}`}>
                <div className="step__header">
                  <span className="step__num">{step.num}</span>
                  <h2 className="step__title">{step.title}</h2>
                  {step.optional && <span className="step__badge">Optionnel</span>}
                </div>
                <p className="step__desc">{step.description}</p>
                {step.metrics && (
                  <div className="step__metrics" aria-label="Indicateurs clés de la simulation">
                    <p className="step__metrics-intro">Trois indicateurs dans chaque simulation :</p>
                    <ul className="step__metrics-list">
                      {step.metrics.map((m) => (
                        <li key={m.label} className="step__metric">
                          <div className="step__metric-header">
                            <strong className="step__metric-label">{m.label}</strong>
                            <span className="step__metric-example">{m.example}</span>
                          </div>
                          <p className="step__metric-definition">{m.definition}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="step__details">
                  <div className="step__detail step__detail--included">
                    <span className="step__detail-label">Ce qui est inclus</span>
                    <p className="step__detail-text">{step.included}</p>
                  </div>
                  {step.notIncluded && (
                    <div className="step__detail step__detail--excluded">
                      <span className="step__detail-label">Ce qui n’est pas inclus</span>
                      <p className="step__detail-text">{step.notIncluded}</p>
                    </div>
                  )}
                  <div className="step__detail">
                    <span className="step__detail-label">Durée estimée</span>
                    <p className="step__detail-text">{step.duration}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="page-cta section-padding" aria-label="Inscription">
          <div className="container page-cta__inner">
            <p className="page-cta__text">
              Chaque bien est simulé charge par charge, scénario dégradé inclus. Les fondateurs suivent chaque dossier personnellement.
            </p>
            <Link to="/contact" className="page-cta__btn">
              S’inscrire sur la liste d’attente
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
