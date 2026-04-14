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
  { value: '8%', label: 'rendement brut minimum ciblé' },
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
    q: 'Comment Versi Invest accède-t-il à des biens off-market ?',
    a: 'Via notre activité de marchand de biens — Versi Immobilier. Ces biens ne passent pas par SeLoger ou le Bon Coin. Ils remontent de notre réseau terrain avant d\'être mis en vente. Versi Invest en est le premier destinataire.',
  },
  {
    q: 'Pourquoi 5% d\'honoraires uniquement côté investisseur ?',
    a: 'Parce que nos intérêts doivent être alignés avec les vôtres. Certains acteurs se rémunèrent des deux côtés — leur recommandation est biaisée structurellement. Chez Versi Invest, zéro rémunération côté vendeur. C\'est dans le mandat.',
  },
  {
    q: 'Comment est calculé le rendement présenté ?',
    a: 'Rendement brut, net (après charges courantes), net-net (après fiscalité estimée). Chaque simulation intègre taxe foncière, charges de copropriété, vacance locative provisionnée et un scénario dégradé à +15% de charges. Vous voyez le pire avant le mieux.',
  },
  {
    q: 'Combien de dossiers gérez-vous simultanément ?',
    a: 'Le volume est intentionnellement limité. Quand les fondateurs sont en capacité, la liste d\'attente est ouverte. Quand ce n\'est plus le cas, elle se ferme. C\'est la raison pour laquelle nous opérons par inscription.',
  },
  {
    q: 'Avez-vous une carte T ?',
    a: 'Oui. Versi Invest est titulaire de la carte professionnelle T (transaction immobilière). Les mentions légales complètes sont disponibles en bas de page.',
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
              Des biens off-market qui s'autofinancent.
              <br />
              Les fondateurs suivent chaque dossier.
            </h1>
            <div className="hero__accent" aria-hidden="true" />
            <p className="hero__subtitle">
              Simulation ligne par ligne, scénario prudent inclus. Rendement cible 8% brut. 5% d'honoraires côté investisseur, zéro côté vendeur.
            </p>
            <Link to="/contact" className="hero__cta">
              S'inscrire sur la liste d'attente
            </Link>
          </div>
        </section>

        {/* Trust — preuve immédiate */}
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
            <a
              href="https://versi.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="trust__link"
            >
              Groupe Versi — dossiers disponibles sur demande →
            </a>
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
            <p className="process__more">
              <Link to="/comment-ca-marche" className="process__more-link">
                Comment ça marche en détail →
              </Link>
            </p>
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
                      width={400}
                      height={533}
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

        {/* Simulateur teaser */}
        <section className="sim-teaser section-padding" aria-label="Simulateur rendement locatif">
          <div className="container sim-teaser__inner">
            <h2 className="sim-teaser__title text-heading-lg">
              Estimez votre cashflow en 30 secondes.
            </h2>
            <p className="sim-teaser__desc">
              Prix d'acquisition, apport, zone géographique. Le simulateur calcule rendement brut, net et cashflow mensuel — scénario prudent inclus, charges réelles intégrées. Pas un outil marketing. Un outil de décision.
            </p>
            <Link to="/simulateur" className="sim-teaser__cta">
              Simuler mon investissement
            </Link>
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
              On ne présente pas un bien si le cashflow ne tient pas en scénario dégradé. Si vous voulez travailler avec des fondateurs qui raisonnent comme ça — la liste d'attente est ouverte.
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
