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
    title: 'Visite sur site',
    desc: 'Un fondateur est présent sur site avec vous. Pas un commercial. Les fondateurs.',
  },
  {
    num: '03',
    title: 'Simulation financière',
    desc: 'Rendement brut, net, net-net. Chaque charge listée. Scénario central et scénario prudent. Vous voyez les chiffres avant de décider.',
  },
  {
    num: '04',
    title: 'Structuration et financement',
    desc: 'On identifie le montage adapté à votre situation et on vous met en relation avec les bons courtiers. Le dossier de simulation est prêt pour la banque.',
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
            <h1 className="hero__title">
              Des biens qui s'autofinancent.
              <br />
              Fondateurs en direct, de A à Z.
            </h1>
            <p className="hero__subtitle">
              Versi Invest source des biens off-market inaccessibles sur les portails, simule chaque charge ligne par ligne — scénario prudent inclus — et suit votre opération du sourcing à la mise en location. Rendement cible : 8% brut minimum. 5% d'honoraires côté investisseur. Zéro côté vendeur.
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

        {/* Confiance — bandeau bleu */}
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
      </main>
      <Footer />
    </>
  );
}
