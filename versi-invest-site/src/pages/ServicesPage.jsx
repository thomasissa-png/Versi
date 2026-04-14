import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import './ServicesPage.css';

const VOLETS = [
  {
    num: '01',
    title: 'Sourcing off-market',
    description: 'Les biens présentés par Versi Invest ne transitent pas par les portails publics. Ils arrivent de notre réseau — alimenté par l\'activité quotidienne de Versi Immobilier, notre branche marchand de biens. Des propriétaires qui cèdent hors publicité. Des immeubles identifiés avant la mise en vente. Un flux que les outils de filtrage ne captent pas.\n\nChaque bien passe une analyse préliminaire sur 15+ critères avant d\'être présenté. Si le rendement brut est inférieur à 8%, le dossier est écarté.',
    included: 'Recherche active sur réseau Versi Immobilier. Analyse préliminaire multi-critères. Dossier de présélection chiffré.',
    notIncluded: 'Sourcing sur portails publics. Prospection hors réseau Versi sur demande spécifique d\'un investisseur.',
  },
  {
    num: '02',
    title: 'Visite accompagnée par un fondateur',
    description: 'Quand vous visitez un bien avec Versi Invest, c\'est un fondateur qui est là — Maxime, Thomas ou Carl. Pas un assistant. L\'objectif de la visite : valider l\'état réel du bien, confronter les hypothèses de la présélection à la réalité terrain, identifier les travaux nécessaires et estimer leur coût. Vous posez toutes vos questions en direct.',
    included: 'Déplacement d\'un fondateur (périmètre Hauts-de-France et Île-de-France). Analyse technique et locative sur site. Rapport de visite écrit sous 48h.',
    notIncluded: 'Expertise technique formelle (Versi Invest n\'est pas bureau d\'études). Pour les biens avec pathologies complexes, nous recommandons un expert indépendant.',
  },
  {
    num: '03',
    title: 'Simulation financière ligne par ligne',
    description: 'Avant toute décision, vous recevez une simulation complète : rendement brut, net, net-net. Cashflow mensuel. Chaque charge détaillée — taxe foncière estimée, charges de copropriété, assurance PNO, vacance locative provisionnée (1 mois/an par défaut), gestion locative si applicable, frais de comptabilité. Deux scénarios systématiques : nominal et prudent (+15% de charges). Si le cashflow ne tient pas en scénario prudent, on ne présente pas le bien.',
    included: 'Simulation financière complète en document PDF. Scénario nominal et scénario prudent. Présentation orale des hypothèses par un fondateur.',
    notIncluded: 'Conseil fiscal personnalisé (Versi Invest recommande de consulter un expert-comptable pour l\'optimisation propre à votre situation). Simulation de TRI sur plus de 10 ans sans données de revente connues.',
  },
  {
    num: '04',
    title: 'Structuration juridique et financement',
    description: 'Nom propre, SCI à l\'IS, LMNP — le montage optimal dépend de votre situation patrimoniale, fiscale et de votre objectif. On analyse avec vous, on recommande une structure, on vous met en relation avec des courtiers partenaires capables de financer des dossiers d\'investissement locatif structurés. La simulation produite à l\'étape précédente peut être présentée directement à votre conseiller bancaire.',
    included: 'Recommandation de structure juridique adaptée. Mise en relation avec courtier(s) partenaire(s). Suivi du dossier jusqu\'à l\'offre de prêt acceptée.',
    notIncluded: 'Conseil patrimonial global (Versi Invest n\'est pas un cabinet de gestion de patrimoine). Création de SCI (à déléguer à un notaire ou avocat — Versi Invest recommande des partenaires).',
  },
  {
    num: '05',
    title: 'Pilotage des travaux de rénovation',
    description: 'Quand un bien nécessite des travaux, Versi Invest pilote l\'opération. Sélection des artisans sur la base du réseau Versi Immobilier, validation des devis, suivi hebdomadaire du chantier, réception avec compte-rendu et levée des réserves. Le bien est livré en état locatif — pas "presque prêt".',
    included: 'Sélection et coordination des artisans. Validation des devis. Suivi de chantier. Réception et levée des réserves. Compte-rendu photo à chaque étape.',
    notIncluded: 'Financement des travaux (intégré dans le plan de financement global). Maîtrise d\'ouvrage déléguée contractuelle (mission de pilotage opérationnel, pas MOE formelle).',
  },
  {
    num: '06',
    title: 'Mise en location initiale',
    description: 'Le cycle Versi Invest se termine quand le locataire est en place. On rédige et publie l\'annonce, on organise et sélectionne les visites, on vérifie les dossiers locataires, on rédige le bail et on réalise l\'état des lieux d\'entrée. Votre bien génère du cashflow dès la première mensualité de loyer.',
    included: 'Rédaction et publication de l\'annonce locative. Organisation des visites. Sélection du locataire. Rédaction du bail conforme. État des lieux d\'entrée.',
    notIncluded: 'Gestion locative courante (loyers mensuels, relances, déclarations). Versi Invest peut recommander un gestionnaire partenaire adapté à la localisation du bien.',
  },
];

export default function ServicesPage() {
  return (
    <>
      <PageHead
        title="Nos services — Versi Invest"
        description="Sourcing, visite, simulation, financement, travaux, location. 5% d'honoraires côté investisseur. Zéro côté vendeur."
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
              Ce que Versi Invest fait.
              <br />
              Et ce qu'elle ne fait pas.
            </h1>
            <p className="page-header__intro">
              Six volets, un seul interlocuteur. Les fondateurs suivent chaque opération — du sourcing à la mise en location. Voici ce qui est inclus dans les 5% d'honoraires, et ce qui ne l'est pas.
            </p>
          </div>
        </section>

        {/* Bandeau honoraires */}
        <section className="honoraires" aria-label="Honoraires">
          <div className="container">
            <p className="honoraires__title">
              5% du prix d'acquisition. Facturés à l'investisseur. Zéro côté vendeur.
            </p>
            <p className="honoraires__text">
              Ce n'est pas une clause de style : c'est inscrit dans le mandat signé avant toute présentation de bien. Nos intérêts sont alignés avec les vôtres — si le bien n'est pas à la hauteur, on ne le présente pas.
            </p>
          </div>
        </section>

        {/* Volets */}
        <section className="volets section-padding" aria-label="Détail des services">
          <div className="container">
            {VOLETS.map((volet) => (
              <article key={volet.num} className="volet">
                <div className="volet__header">
                  <span className="volet__num">{volet.num}</span>
                  <h2 className="volet__title">{volet.title}</h2>
                </div>
                <div className="volet__body">
                  {volet.description.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="volet__desc">{paragraph}</p>
                  ))}
                  <div className="volet__details">
                    <div className="volet__detail volet__detail--included">
                      <span className="volet__detail-label">Inclus</span>
                      <p className="volet__detail-text">{volet.included}</p>
                    </div>
                    <div className="volet__detail volet__detail--excluded">
                      <span className="volet__detail-label">Non inclus</span>
                      <p className="volet__detail-text">{volet.notIncluded}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="page-cta section-padding" aria-label="Inscription">
          <div className="container" style={{ textAlign: 'center' }}>
            <p className="page-cta__text">
              Vous souhaitez accéder aux prochains biens disponibles.
            </p>
            <Link to="/contact" className="page-cta__btn">
              S'inscrire sur la liste d'attente
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
