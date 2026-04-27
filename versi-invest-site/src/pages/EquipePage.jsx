import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import maxImg from '../assets/team/max.png';
import thomasImg from '../assets/team/thomas.png';
import carlImg from '../assets/team/carl.png';
import './EquipePage.css';

const FOUNDERS = [
  {
    name: 'Maxime Lemoine',
    role: 'Co-fondateur',
    photo: maxImg,
    bio: '13 ans en sales et stratégie commerciale. Ex-Head of Sales Europe, Sony. Avant Versi : 3 immeubles en portefeuille, 24 contrats locatifs actifs. Il connaît la négociation d’actifs immobiliers comme il connaissait la négociation de comptes — par les chiffres et par le terrain.',
    linkedin: 'https://www.linkedin.com/in/maxime-lemoine-34550354/',
  },
  {
    name: 'Thomas Issa',
    role: 'Co-fondateur',
    photo: thomasImg,
    bio: '15 ans en stratégie et opérations. Ex-Sony, co-fondateur de TEOS (déployé dans 8 pays). Avant Versi : 13 actifs locatifs à Paris. Deux entreprises créées de zéro — l’une à 8M€ de chiffre d’affaires, l’autre à 4M€. Il pilote les opérations Versi Invest comme il a piloté des structures multi-pays : par les processus et par les résultats.',
    linkedin: 'https://www.linkedin.com/in/thomasissa/',
  },
  {
    name: 'Carl Standertskjold-Nordenstam',
    role: 'Co-fondateur',
    photo: carlImg,
    bio: '14 ans en marketing B2B. Ex-Sony (9 ans), Algolia (4 ans), Head of Marketing Inbolt. Comptes signés chez Sony : Lego, Coca-Cola, Capgemini. Chez Versi Invest, il structure la relation avec les investisseurs et les prescripteurs — avec la même rigueur que pour des comptes premium.',
    linkedin: 'https://www.linkedin.com/in/carlstandertskjold/',
  },
];

export default function EquipePage() {
  return (
    <>
      <PageHead
        title="Maxime, Thomas, Carl — Fondateurs Versi Invest"
        description="3 co-fondateurs, ex-Sony et Algolia. 7 immeubles, 3,2M€ de volume opéré. Investissement locatif en direct."
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
              Trois fondateurs. Un seul interlocuteur.
            </h1>
          </div>
        </section>

        {/* Founders */}
        <section className="founders section-padding" aria-label="Les fondateurs">
          <div className="container">
            <div className="founders__grid">
              {FOUNDERS.map((founder) => (
                <article key={founder.name} className="founder">
                  <div className="founder__photo-wrap">
                    <img
                      src={founder.photo}
                      alt={`${founder.name}, ${founder.role} de Versi Invest`}
                      className="founder__photo"
                      width={320}
                      height={320}
                      loading="lazy"
                    />
                  </div>
                  <div className="founder__info">
                    <h2 className="founder__name">{founder.name}</h2>
                    <span className="founder__role">{founder.role}</span>
                    <p className="founder__bio">{founder.bio}</p>
                    <a
                      href={founder.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="founder__linkedin"
                      aria-label={`Profil LinkedIn de ${founder.name} — s’ouvre dans un nouvel onglet`}
                    >
                      LinkedIn →
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Groupe Versi */}
        <section className="groupe section-padding" aria-label="Groupe Versi">
          <div className="container">
            <h2 className="groupe__title text-heading-lg">
              Versi Invest fait partie du Groupe Versi.
            </h2>
            <p className="groupe__text">
              Versi Invest est la branche investissement locatif du Groupe Versi — une holding immobilière multi-entités fondée par Maxime, Thomas et Carl. Le track record du groupe (7 immeubles, 3,2M€ de volume opéré via Versi Immobilier) alimente le flux d’opportunités que Versi Invest propose à ses investisseurs. Ce n’est pas un argument marketing — c’est le flux opérationnel sur lequel repose notre modèle.
            </p>
            <a
              href="https://versi.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="groupe__link"
            >
              Découvrir le Groupe Versi →
            </a>
          </div>
        </section>

        {/* CTA */}
        <section className="page-cta section-padding" aria-label="Prochaines étapes">
          <div className="container page-cta__inner">
            <p className="page-cta__text">
              Vous savez qui nous sommes. Voyez comment nous travaillons.
            </p>
            <div className="page-cta__actions">
              <Link to="/comment-ca-marche" className="page-cta__btn page-cta__btn--secondary">
                Voir les 8 étapes
              </Link>
              <Link to="/contact" className="page-cta__btn">
                S’inscrire — réponse sous 48h
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
