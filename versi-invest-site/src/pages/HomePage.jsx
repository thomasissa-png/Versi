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
    title: 'Détection d\'opportunité',
    desc: 'On identifie les biens à fort potentiel via notre réseau terrain — avant ou en dehors des portails publics.',
  },
  {
    num: '02',
    title: 'Visite fondateur',
    desc: 'Un fondateur visite seul. Il valide l\'état du bien, estime les travaux, confirme le prix.',
  },
  {
    num: '03',
    title: 'Simulation financière',
    desc: 'Rendement brut, net, net-net, cashflow mensuel, TRI, Cash-on-Cash. Chaque charge listée, scénario prudent inclus.',
  },
  {
    num: '04',
    title: 'Présentation du bien',
    desc: 'Si les chiffres tiennent, on vous présente le dossier complet avec la simulation.',
  },
  {
    num: '05',
    title: 'Visite avec vous',
    desc: 'Vous visitez le bien avec un fondateur. Questions, chiffres, terrain — en direct.',
  },
  {
    num: '06',
    title: 'Structuration et financement',
    desc: 'Montage adapté à votre situation. Mise en relation courtier. Suivi jusqu\'à l\'offre de prêt.',
  },
  {
    num: '07',
    title: 'Acquisition',
    desc: 'Offre, négociation, signature chez le notaire. On vous suit jusqu\'à la remise des clés.',
  },
  {
    num: '08',
    title: 'Travaux et mise en location',
    desc: 'En option : pilotage chantier, sélection locataire, bail. On peut aller jusqu\'au bout — ou s\'arrêter à l\'acquisition.',
    optional: true,
  },
];

const STATS = [
  { value: '7', label: 'immeubles' },
  { value: '3,2M€', label: 'de volume opéré' },
  { value: '8%+', label: 'rendement brut ciblé' },
];

const FOUNDERS = [
  {
    name: 'Maxime Lemoine',
    initials: 'ML',
    photo: maxImg,
    track: '13 ans en sales et stratégie commerciale. Ex-Head of Sales Europe, Sony.',
    linkedin: 'https://www.linkedin.com/in/maxime-lemoine-34550354/',
  },
  {
    name: 'Thomas Issa',
    initials: 'TI',
    photo: thomasImg,
    track: '15 ans en stratégie et opérations. Ex-Sony, co-fondateur de TEOS (8 pays).',
    linkedin: 'https://www.linkedin.com/in/thomasissa/',
  },
  {
    name: 'Carl Standertskjold-Nordenstam',
    initials: 'CS',
    photo: carlImg,
    track: '14 ans en marketing B2B. Ex-Sony (9 ans), Algolia (4 ans), Head of Marketing Inbolt.',
    linkedin: 'https://www.linkedin.com/in/carlstandertskjold/',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Combien coûte Versi Invest ?',
    a: 'Nos honoraires sont de 5% du prix d\'acquisition, facturés uniquement à l\'investisseur. Zéro rémunération côté vendeur — c\'est inscrit dans le mandat. Ces 5% couvrent le cycle complet : détection, visite, simulation financière, structuration et acquisition.',
  },
  {
    q: 'Pourquoi y a-t-il une liste d\'attente ?',
    a: 'Parce que les bons biens sont rares — et on ne présente que ceux-là. Chaque dossier est analysé et visité par un fondateur en personne. La majorité des biens ne passent pas nos filtres : rendement insuffisant, cashflow fragile, montage trop risqué. On accueille peu d\'investisseurs pour rester en capacité de vraiment servir chacun. Quand un bien correspond à votre profil, on vous contacte.',
  },
  {
    q: 'Quel rendement attendre d\'un investissement locatif avec Versi Invest ?',
    a: 'On cible un rendement brut minimum de 8% sur les biens sourcés en Hauts-de-France et Île-de-France. Chaque simulation inclut rendement brut, net et net-net, avec un scénario prudent à +15% de charges. On ne présente un bien que si les chiffres tiennent en scénario dégradé.',
  },
  {
    q: 'Quels sont les risques d\'un investissement locatif ?',
    a: 'Vacance locative, travaux imprévus, baisse des loyers — les risques existent. C\'est pour ça qu\'on provisionne la vacance locative dans chaque simulation et qu\'on calcule un scénario dégradé à +15% de charges. On ne vous présente que les dossiers qui restent rentables même dans le pire cas raisonnable.',
  },
  {
    q: 'Faut-il un apport minimum pour investir ?',
    a: 'En général, les banques demandent 10 à 20% du prix du bien. Le montant exact dépend de votre profil emprunteur. On réalise une simulation financière complète avec différents niveaux d\'apport dès le premier échange — vous savez exactement où vous en êtes avant de vous engager.',
  },
  {
    q: 'Où sont situés les biens proposés ?',
    a: 'Principalement en Hauts-de-France — Lille, métropole lilloise, villes moyennes à fort rendement. Également en Île-de-France. Notre réseau terrain, alimenté par l\'activité de marchand de biens de Versi Immobilier, nous donne accès à des biens avant ou en dehors des portails publics.',
  },
  {
    q: 'Comment ça se passe après l\'inscription sur la liste d\'attente ?',
    a: 'Un fondateur vous recontacte sous 48h pour un premier échange. On parle de votre situation, vos objectifs, votre capacité d\'investissement. Si un bien correspond à vos critères, on vous envoie le dossier complet avec simulation financière. Vous décidez — pas de pression, pas de relance.',
  },
];

function FounderPhoto({ member }) {
  const [error, setError] = useState(false);

  if (error || !member.photo) {
    return (
      <div className="team-teaser__avatar">
        <span className="team-teaser__initials">{member.initials}</span>
      </div>
    );
  }

  return (
    <img
      src={member.photo}
      alt={`${member.name}, Co-fondateur Versi Invest`}
      className="team-teaser__photo"
      width="400"
      height="500"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

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
        title="Versi Invest — Investissement locatif rentable"
        description="Des biens qui s'autofinancent. Cashflow positif. Une seule commission : 5%. Fondateurs en direct."
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
              Investissement locatif — France
            </span>
            <h1 className="hero__title">
              Biens rares.
              <br />
              En direct.
            </h1>
            <div className="hero__accent" aria-hidden="true" />
            <p className="hero__subtitle">
              Des biens qui s'autofinancent. Cashflow positif. Une seule commission : 5%.
            </p>
            <Link to="/contact" className="hero__cta">
              S'inscrire sur la liste d'attente
            </Link>
          </div>
        </section>

        {/* Trust */}
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
              Groupe Versi →
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
                <div key={step.num} className={`process__card${step.optional ? ' process__card--optional' : ''}${step.metrics ? ' process__card--metrics' : ''}`}>
                  <span className="process__num">{step.num}</span>
                  {step.optional && <span className="process__badge">Optionnel</span>}
                  <h3 className="process__card-title">{step.title}</h3>
                  <p className="process__card-desc">{step.desc}</p>
                  {step.metrics && (
                    <ul className="process__metrics" aria-label="Indicateurs clés">
                      {step.metrics.map((m) => (
                        <li key={m.label} className="process__metric">
                          <span className="process__metric-value">{m.value}</span>
                          <span className="process__metric-label">{m.label}</span>
                          <span className="process__metric-hint">{m.hint}</span>
                        </li>
                      ))}
                    </ul>
                  )}
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

        {/* Fondateurs — exact pattern versi-immobilier TeamTeaser */}
        <section className="team-teaser section-padding" aria-label="Les fondateurs">
          <div className="container">
            <h2 className="text-heading-lg team-teaser__heading">
              Vous parlez aux fondateurs.<br />
              Pas à un commercial.
            </h2>
            <p className="text-body-lg team-teaser__subtitle">
              Maxime, Thomas et Carl suivent chaque dossier du sourcing à l'acquisition. Ils visitent eux-mêmes. Ils répondent en direct.
            </p>
            <div className="team-teaser__grid">
              {FOUNDERS.map((f) => (
                <div key={f.name} className="team-teaser__member">
                  <FounderPhoto member={f} />
                  <h3 className="team-teaser__name">{f.name}</h3>
                  <p className="team-teaser__track text-body-sm">{f.track}</p>
                  {f.linkedin && (
                    <a
                      href={f.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="team-teaser__linkedin"
                      aria-label={`LinkedIn de ${f.name}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.52 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.712-2.165 1.212V6.169H6.55c.032.678 0 7.225 0 7.225h2.4z" />
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
            <Link to="/equipe" className="text-cta team-teaser__link">
              L'équipe en détail
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
                  <div
                    className="faq__answer-wrap"
                    style={{ maxHeight: openFaq === i ? '600px' : '0' }}
                  >
                    <p className="faq__answer">{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="page-cta section-padding" aria-label="Inscription">
          <div className="container page-cta__inner">
            <p className="page-cta__text">
              Chaque bien est simulé charge par charge, scénario dégradé inclus. Les fondateurs suivent chaque dossier personnellement.
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
