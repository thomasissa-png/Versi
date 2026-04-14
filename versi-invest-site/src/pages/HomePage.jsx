import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import './HomePage.css';

const PROCESS_STEPS = [
  {
    num: '01',
    title: 'Sourcing off-market',
    desc: 'On identifie les biens avant qu\'ils arrivent sur le marché. Notre réseau terrain fait remonter des opportunités que les portails ne voient jamais.',
  },
  {
    num: '02',
    title: 'Visite accompagnée',
    desc: 'Un fondateur vous accompagne sur site. Pas un commercial. Les fondateurs.',
  },
  {
    num: '03',
    title: 'Simulation financière',
    desc: 'Rendement brut, net, net-net. Chaque charge listée. Scénario central et scénario prudent. Vous voyez les chiffres avant de décider.',
  },
  {
    num: '04',
    title: 'Structuration et financement',
    desc: 'On structure le montage avec vous : nom propre, SCI, LMNP. On vous met en relation avec les bons courtiers.',
  },
  {
    num: '05',
    title: 'Pilotage travaux',
    desc: 'Si rénovation il y a, on sélectionne les artisans, on suit le chantier, on réceptionne les travaux.',
  },
  {
    num: '06',
    title: 'Mise en location',
    desc: 'On publie l\'annonce, on sélectionne le locataire, on rédige le bail. Votre bien est loué avant que vous n\'ayez à chercher.',
  },
];

const STATS = [
  { value: '21', label: 'appartements rénovés' },
  { value: '3,2M€', label: 'de volume opéré' },
  { value: '3', label: 'fondateurs' },
];

export default function HomePage() {
  const heroRef = useRef(null);

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
        title="Versi Invest — Investissement locatif clé en main | Hauts-de-France et Île-de-France"
        description="Des biens qui s'autofinancent. Sourcing off-market, simulation financière, pilotage travaux, mise en location. Fondateurs en direct, de A à Z."
      />
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content">
        {/* Hero */}
        <section ref={heroRef} className="hero" aria-label="Présentation Versi Invest">
          <div className="hero__inner container">
            <h1 className="hero__title">
              Des biens qui s'autofinancent.
              <br />
              Fondateurs en direct, de A à Z.
            </h1>
            <p className="hero__subtitle">
              Versi Invest source des biens off-market inaccessibles sur les portails, simule chaque charge honnêtement, et suit votre opération du sourcing à la mise en location. Les fondateurs sont votre seul interlocuteur.
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
                <div key={step.num} className="process__card">
                  <span className="process__num">{step.num}</span>
                  <h3 className="process__card-title">{step.title}</h3>
                  <p className="process__card-desc">{step.desc}</p>
                </div>
              ))}
            </div>
            <div className="process__cta-wrap">
              <Link to="/comment-ca-marche" className="process__cta">
                Voir le détail de chaque étape
              </Link>
            </div>
          </div>
        </section>

        {/* Confiance — bandeau bleu */}
        <section className="trust" aria-label="Track record Groupe Versi">
          <div className="trust__inner container">
            <div className="trust__stats">
              {STATS.map((stat) => (
                <div key={stat.label} className="trust__stat">
                  <span className="trust__stat-value text-stat">{stat.value}</span>
                  <span className="trust__stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
            <p className="trust__text">
              Groupe Versi — 21 appartements rénovés, 3,2M€ de volume opéré.
            </p>
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
      </main>
      <Footer />
    </>
  );
}
