import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import maxImg from '../assets/team/max.png';
import thomasImg from '../assets/team/thomas.png';
import carlImg from '../assets/team/carl.png';
import './HomePage.css';

const PROCESS_STEPS = [
  {
    num: '01',
    title: 'Sourcing off-market',
    desc: 'On identifie les biens avant qu\'ils arrivent sur le marché. Notre réseau terrain fait remonter des opportunités que les portails ne voient jamais.',
  },
  {
    num: '02',
    title: 'Visite sur site',
    desc: 'Un fondateur est présent sur site avec vous. Pas un commercial. Les fondateurs.',
  },
  {
    num: '03',
    title: 'Simulation financière',
    desc: 'Rendement brut, net, net-net. Chaque charge listée. Scénario prudent inclus. Vous voyez les chiffres avant de décider.',
  },
  {
    num: '04',
    title: 'Structuration et financement',
    desc: 'On identifie le montage adapté à votre situation et on vous met en relation avec les bons courtiers.',
  },
  {
    num: '05',
    title: 'Acquisition du bien',
    desc: 'Offre, négociation, signature chez le notaire. On vous suit jusqu\'à la remise des clés.',
  },
  {
    num: '06',
    title: 'Travaux et mise en location',
    desc: 'En option : pilotage du chantier, sélection du locataire, rédaction du bail. On peut aller jusqu\'au bout — ou s\'arrêter à l\'acquisition.',
    optional: true,
  },
];

const STATS = [
  { value: '21', label: 'appartements rénovés' },
  { value: '3,2M€', label: 'de volume opéré' },
  { value: '3', label: 'fondateurs' },
];

const FOUNDERS = [
  {
    name: 'Maxime Lemoine',
    role: 'Co-fondateur',
    photo: maxImg,
    specialty: 'Sales & stratégie commerciale',
    track: '13 ans — Ex-Head of Sales Europe, Sony. 3 immeubles, 24 contrats locatifs.',
    linkedin: 'https://www.linkedin.com/in/maxime-lemoine-34550354/',
  },
  {
    name: 'Thomas Issa',
    role: 'Co-fondateur',
    photo: thomasImg,
    specialty: 'Stratégie & opérations',
    track: '15 ans — Ex-Sony, co-fondateur TEOS. 13 actifs locatifs à Paris.',
    linkedin: 'https://www.linkedin.com/in/thomasissa/',
  },
  {
    name: 'Carl Standertskjold-Nordenstam',
    role: 'Co-fondateur',
    photo: carlImg,
    specialty: 'Marketing B2B & relations investisseurs',
    track: '14 ans — Ex-Sony, Algolia, Inbolt. Comptes : Lego, Coca-Cola, Capgemini.',
    linkedin: 'https://www.linkedin.com/in/carlstandertskjold/',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Quel rendement attendre d\'un investissement locatif ?',
    a: 'Le rendement brut varie entre 3% et 10% selon la localisation et le type de bien. Versi Invest cible un rendement brut minimum de 8% sur les biens off-market sourcés en Hauts-de-France et Île-de-France. Chaque simulation intègre un scénario prudent.',
  },
  {
    q: 'Qu\'est-ce qu\'un bien off-market ?',
    a: 'Un bien proposé à la vente sans publication sur les portails publics. Chez Versi Invest, ces biens proviennent du flux d\'opportunités détectées par l\'activité de marchand de biens de Versi Immobilier.',
  },
  {
    q: 'Combien coûte Versi Invest ?',
    a: '5% du prix d\'acquisition, facturés uniquement à l\'investisseur. Aucune rémunération côté vendeur. Ces honoraires couvrent le cycle complet : sourcing, visite, simulation, financement, acquisition — et optionnellement travaux et mise en location.',
  },
  {
    q: 'Faut-il un apport pour investir ?',
    a: 'Un apport de 10% à 20% du prix est généralement demandé par les banques. Le montant dépend de votre profil. Le simulateur Versi Invest permet d\'estimer le cashflow net en fonction de votre apport.',
  },
  {
    q: 'Qu\'est-ce que le cashflow positif ?',
    a: 'Les loyers couvrent l\'intégralité des charges (crédit, copropriété, taxe foncière, assurance, vacance locative) et dégagent un excédent mensuel. C\'est l\'objectif de chaque opération Versi Invest.',
  },
];

export default function HomePage() {
  const heroRef = useRef(null);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.classList.add('hero--visible');
    });
  }, []);

  return (
    <>
      <PageHead
        title="Versi Invest — Investissement locatif accompagné"
        description="Biens off-market qui s'autofinancent. Rendement 8%+ ciblé. Fondateurs en direct, de A à Z. Inscrivez-vous."
      />
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content">
        {/* Hero */}
        <section ref={heroRef} className="hero" aria-label="Présentation Versi Invest">
          <div className="hero__inner container">
            <span className="hero__surtitre text-label">
              Investissement locatif off-market — France
            </span>
            <h1 className="hero__title">
              Des biens qui s'autofinancent.
              <br />
              Fondateurs en direct, de A à Z.
            </h1>
            <p className="hero__subtitle">
              Biens off-market, simulation ligne par ligne, scénario prudent inclus. Rendement cible 8% brut. 5% d'honoraires côté investisseur, zéro côté vendeur.
            </p>
            <Link to="/contact" className="hero__cta">
              S'inscrire sur la liste d'attente
            </Link>
          </div>
        </section>

        {/* Process */}
        <section className="process section-padding" aria-label="Comment ça se passe">
          <div className="container">
            <h2 className="process__title text-heading-lg">
              Comment ça se passe, concrètement.
            </h2>
            <div className="process__grid">
              {PROCESS_STEPS.map((step) => (
                <div key={step.num} className={`process__card${step.optional ? ' process__card--optional' : ''}`}>
                  <span className="process__num">{step.num}</span>
                  {step.optional && <span className="process__badge">Optionnel</span>}
                  <h3 className="process__card-title">{step.title}</h3>
                  <p className="process__card-desc">{step.desc}</p>
                </div>
              ))}
            </div>
            <div className="process__cta-wrap">
              <Link to="/comment-ca-marche" className="process__cta">
                Voir le détail de chaque étape
              </Link>
              <Link to="/services" className="process__cta process__cta--secondary">
                Découvrir nos services
              </Link>
            </div>
          </div>
        </section>

        {/* Simulateur teaser */}
        <section className="sim-teaser section-padding" aria-label="Simulateur rendement locatif">
          <div className="container sim-teaser__inner">
            <h2 className="sim-teaser__title text-heading-lg">
              Estimez votre cashflow en 30 secondes.
            </h2>
            <p className="sim-teaser__desc">
              Renseignez le prix d'acquisition et votre apport. On calcule le rendement brut et le cashflow estimé — avec un scénario prudent intégré.
            </p>
            <Link to="/simulateur" className="sim-teaser__cta">
              Simuler mon investissement
            </Link>
          </div>
        </section>

        {/* Confiance */}
        <section className="trust" aria-label="Track record Groupe Versi">
          <div className="trust__inner container">
            <ul className="trust__stats" role="list">
              {STATS.map((stat) => (
                <li key={stat.label} className="trust__stat">
                  <span className="trust__stat-value text-stat">{stat.value}</span>
                  <span className="trust__stat-label">{stat.label}</span>
                </li>
              ))}
            </ul>
            <p className="trust__subtext">
              Ce n'est pas un argument marketing. C'est le track record de notre activité de marchand de biens — documenté, vérifiable, disponible en cas d'étude sur demande.
            </p>
            <a
              href="https://versi.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="trust__link"
            >
              Découvrir le Groupe Versi →
            </a>
          </div>
        </section>

        {/* Fondateurs */}
        <section className="founders section-padding" aria-label="Les fondateurs">
          <div className="container">
            <span className="text-label founders__label">Équipe</span>
            <h2 className="text-heading-lg founders__title">
              Trois fondateurs. Un seul interlocuteur.
            </h2>
            <div className="founders__grid">
              {FOUNDERS.map((f) => (
                <article key={f.name} className="founders__card">
                  <div className="founders__photo-wrap">
                    <img
                      src={f.photo}
                      alt={`${f.name}, ${f.role} de Versi Invest`}
                      className="founders__photo"
                      width={320}
                      height={320}
                      loading="lazy"
                    />
                  </div>
                  <div className="founders__info">
                    <h3 className="founders__name">{f.name}</h3>
                    <span className="founders__role">{f.role}</span>
                    <p className="founders__specialty">{f.specialty}</p>
                    <p className="founders__track">{f.track}</p>
                    <a
                      href={f.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="founders__linkedin"
                      aria-label={`Profil LinkedIn de ${f.name}`}
                    >
                      LinkedIn →
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq section-padding" aria-label="Questions fréquentes">
          <div className="container">
            <h2 className="text-heading-lg faq__title">Questions fréquentes</h2>
            <div className="faq__list">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="faq__item">
                  <button
                    className="faq__question"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                  >
                    {item.q}
                    <span className="faq__toggle" aria-hidden="true">
                      {openFaq === i ? '−' : '+'}
                    </span>
                  </button>
                  {openFaq === i && (
                    <p className="faq__answer">{item.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="page-cta section-padding" aria-label="Inscription">
          <div className="container page-cta__inner">
            <p className="page-cta__text">
              Vous avez un projet d'investissement locatif.
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
