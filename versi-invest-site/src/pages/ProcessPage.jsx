import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import './ProcessPage.css';

const STEPS = [
  {
    num: '01',
    title: 'Sourcing off-market',
    description: 'Les biens que nous vous présentons ne sont pas sur SeLoger. Ils arrivent de notre réseau terrain, construit via l\'activité de marchand de biens du Groupe Versi. Un bien est identifié, analysé sur 15+ critères (localisation, état, potentiel locatif, charges, finançabilité), puis pré-sélectionné avant d\'être présenté. Si les chiffres ne tiennent pas, le bien ne passe pas la sélection.',
    included: 'Recherche active sur le réseau Versi Immobilier. Analyse préliminaire. Présélection sur critères de rentabilité. Présentation du dossier avec synthèse chiffrée.',
    duration: '2 à 4 semaines selon la disponibilité des opportunités.',
  },
  {
    num: '02',
    title: 'Visite sur site',
    description: 'Quand un bien passe la présélection, vous visitez avec un fondateur. Pas un assistant, pas un commercial — un des trois co-fondateurs de Versi Invest. Sur site, on valide l\'état réel du bien, on estime les travaux, on vérifie la cohérence du dossier. Vous posez les questions, on répond avec les chiffres.',
    included: 'Déplacement d\'un fondateur. Analyse technique sur site. Rapport de visite écrit. Photos et compte-rendu.',
    duration: '1 journée (visite + rapport sous 48h).',
  },
  {
    num: '03',
    title: 'Simulation financière complète',
    description: 'Avant de décider quoi que ce soit, vous recevez une simulation détaillée : rendement brut, rendement net (après charges), rendement net-net (après imposition), cashflow mensuel ligne par ligne. Chaque charge est listée : taxe foncière, charges de copropriété, assurance PNO, vacance locative provisionnée, gestion locative si applicable. Deux scénarios : nominal et prudent (+15% de charges). Vous voyez les chiffres réels, pas une plaquette optimiste.',
    included: 'Simulation financière complète en document PDF. Scénario nominal et scénario prudent. Détail de chaque charge. Présentation orale par un fondateur.',
    duration: '2 à 3 jours après la visite.',
  },
  {
    num: '04',
    title: 'Structuration et financement',
    description: 'On vous aide à structurer le montage adapté à votre situation : acquisition en nom propre, SCI à l\'IS, LMNP. On vous met en relation avec des courtiers partenaires capables de traiter des dossiers complexes. On suit la négociation jusqu\'à l\'offre de prêt. Le dossier de simulation produit à l\'étape 3 peut être présenté directement au conseiller bancaire.',
    included: 'Recommandation de structure juridique. Mise en relation courtier(s) partenaire(s). Suivi jusqu\'à l\'offre de prêt.',
    notIncluded: 'Conseil patrimonial global (Versi Invest n\'est pas un CGP). Montages d\'assurance-vie ou produits financiers.',
    duration: '3 à 6 semaines selon le profil bancaire et l\'établissement prêteur.',
  },
  {
    num: '05',
    title: 'Pilotage des travaux',
    description: 'Si le bien nécessite une rénovation, on pilote le chantier de A à Z. On sélectionne les artisans, on valide les devis, on suit l\'avancement, on réceptionne les travaux. Cette étape s\'appuie sur le savoir-faire opérationnel du Groupe Versi — 21 appartements rénovés constituent une référence terrain, pas une promesse.',
    included: 'Sélection et coordination des artisans. Suivi hebdomadaire du chantier. Réception des travaux avec compte-rendu. Levée des réserves.',
    notIncluded: 'Financement des travaux (réglé dans la structure du prêt). Maîtrise d\'ouvrage déléguée formelle (Versi Invest assure le pilotage opérationnel, pas une mission MOE contractuelle).',
    duration: '2 à 4 mois selon l\'ampleur de la rénovation.',
  },
  {
    num: '06',
    title: 'Mise en location',
    description: 'On publie l\'annonce, on organise les visites, on sélectionne le locataire, on rédige le bail. À la remise des clés, le bien est en état locatif, le locataire est en place, et vous commencez à percevoir les loyers. Ce n\'est pas de la gestion locative permanente — c\'est la mise en location initiale, qui fait partie intégrante du cycle Versi Invest.',
    included: 'Rédaction et publication de l\'annonce. Organisation des visites locataires. Sélection du dossier locataire. Rédaction du bail. État des lieux d\'entrée.',
    notIncluded: 'Gestion locative courante (loyers, relances, sinistres) — à confier à un gestionnaire de votre choix. Versi Invest peut recommander des partenaires selon la localisation.',
    duration: '2 à 4 semaines après livraison du bien.',
  },
];

export default function ProcessPage() {
  return (
    <>
      <PageHead
        title="Investissement locatif off-market : 6 étapes — Versi Invest"
        description="Sourcing off-market, visite sur site avec un fondateur, simulation financière ligne par ligne, financement, travaux, mise en location. Rendement cible 8%+."
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
              De la recherche à la mise en location.
              <br />
              Six étapes, zéro improvisation.
            </h1>
            <p className="page-header__intro">
              Chaque opération Versi Invest suit le même processus rigoureux. Vous savez à chaque étape ce qui se passe, ce qui est inclus, et ce qui ne l'est pas.
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="steps section-padding" aria-label="Les 6 étapes">
          <div className="container">
            {STEPS.map((step) => (
              <article key={step.num} className="step">
                <div className="step__header">
                  <span className="step__num">{step.num}</span>
                  <h2 className="step__title">{step.title}</h2>
                </div>
                <p className="step__desc">{step.description}</p>
                <div className="step__details">
                  <div className="step__detail">
                    <span className="step__detail-label">Ce qui est inclus</span>
                    <p className="step__detail-text">{step.included}</p>
                  </div>
                  {step.notIncluded && (
                    <div className="step__detail">
                      <span className="step__detail-label">Ce qui n'est pas inclus</span>
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
              Les chiffres tiennent en scénario prudent ou on ne présente pas le bien.
            </p>
            <div className="page-cta__actions">
              <Link to="/simulateur" className="page-cta__btn page-cta__btn--secondary">
                Simuler mon investissement
              </Link>
              <Link to="/contact" className="page-cta__btn">
                S'inscrire — réponse sous 48h
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
