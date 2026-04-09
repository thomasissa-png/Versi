import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import SellForm from '../components/SellForm.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import { PROJECTS } from '../config/projects.js';
import { useFadeIn } from '../hooks/useFadeIn.js';
import './SellPage.css';

const ENGAGEMENTS = [
  {
    title: 'Une offre ferme, pas une estimation.',
    description: 'Nous ne pratiquons pas l\'estimation gratuite pour générer des contacts. Notre retour est soit une offre ferme et définitive, soit un refus motivé par écrit. Aucune zone grise.',
  },
  {
    title: 'Sans condition suspensive de financement.',
    description: 'Versi Immobilier achète en fonds propres ou avec un financement déjà structuré en interne — Groupe Versi. Vous n\'attendez pas l\'accord d\'un banquier que vous ne connaissez pas. Quand nous signons, nous achetons.',
  },
  {
    title: '7 jours, pas 7 semaines.',
    description: 'De la réception de votre dossier à notre offre : 7 jours calendaires. Visite, analyse de marché, modélisation financière — tout est géré en interne. Aucune délégation externe.',
  },
];

const PROCESS_STEPS = [
  {
    number: '01',
    title: 'Vous soumettez votre dossier.',
    description: 'Adresse, type de bien, surface, situation locative. Le formulaire ci-dessous ou un email à contact@versi-immobilier.fr. Nous accusons réception sous 24h.',
    delay: 'Accusé de réception sous 24h.',
  },
  {
    number: '02',
    title: 'Nous instruisons le dossier.',
    description: 'Visite physique planifiée sous 48 à 72h. Analyse comparative de marché. Modélisation financière. La décision est prise par l\'équipe Versi Immobilier — pas par un consultant externe.',
    delay: 'Visite planifiée sous 48–72h.',
  },
  {
    number: '03',
    title: 'Offre ferme ou refus motivé.',
    description: 'Nous vous remettons une offre d\'achat ferme et définitive par écrit, sous 7 jours calendaires à compter de la réception du dossier. Sans condition suspensive de financement. Si le dossier ne correspond pas à nos critères, nous vous en informons par écrit avec les raisons.',
    delay: 'Réponse écrite sous 7 jours calendaires.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Est-ce que Versi Immobilier va m\'acheter en dessous du prix du marché ?',
    answer: 'Notre offre est calculée sur la valeur de transformation du bien — pas sur votre méconnaissance du marché. Nous vous expliquons la logique de notre prix. Si nos chiffres ne vous conviennent pas, vous êtes libre de refuser. Aucune obligation.',
  },
  {
    question: 'Comment êtes-vous certains de ne pas vous rétracter après la signature du compromis ?',
    answer: 'Notre due diligence — visite, analyse, modélisation — se fait avant la signature. Quand nous signons un compromis, nous achetons. Notre offre est ferme parce que nous avons fait le travail en amont.',
  },
  {
    question: 'J\'ai des locataires en place. Est-ce un problème ?',
    answer: 'Pas du tout. Nous rachetons des actifs avec locataires en place — c\'est notre métier. Vous n\'avez aucune démarche à effectuer vis-à-vis de vos locataires avant la signature.',
  },
  {
    question: 'Pourquoi ne pas passer par une agence ? Je pourrais peut-être obtenir un meilleur prix.',
    answer: 'Une agence peut vous promettre un prix plus élevé. Mais dans 12 mois, avec 5% de frais d\'agence, et sans certitude que l\'acheteur finalise. Versi Immobilier achète en direct, en 7 jours, sans frais à votre charge. La question n\'est pas le prix affiché — c\'est le prix réellement encaissé, au bout du compte.',
  },
  {
    question: 'Qui êtes-vous ? Comment savoir si Versi Immobilier est sérieux ?',
    answer: 'Versi Immobilier est l\'entité marchand de biens du Groupe Versi — 3,2M€ de volume traité. Nos trois fondateurs sont identifiés avec leurs parcours complets, vérifiables sur LinkedIn. Les réalisations documentées sur ce site sont la preuve de ce que nous avons fait. Vérifiez.',
  },
];

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sell-faq__item">
      <button
        className="sell-faq__question"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{item.question}</span>
        <span className={`sell-faq__chevron ${open ? 'sell-faq__chevron--open' : ''}`} aria-hidden="true">
          &#x25BE;
        </span>
      </button>
      {open && (
        <div className="sell-faq__answer">
          <p className="text-body-sm">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function SellPage() {
  const { ref: engRef, isVisible: engVisible } = useFadeIn();
  const { ref: procRef, isVisible: procVisible } = useFadeIn();
  const { ref: critRef, isVisible: critVisible } = useFadeIn();
  const location = useLocation();

  const featuredProjects = PROJECTS.filter((p) => p.featured).slice(0, 2);

  // Scroll to #formulaire on load if hash present
  useEffect(() => {
    if (location.hash === '#formulaire') {
      setTimeout(() => {
        const el = document.getElementById('formulaire');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location.hash]);

  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        {/* Hero vendeur */}
        <section className="sell-hero section-padding">
          <div className="container" style={{ textAlign: 'center' }}>

            <h1 className="text-display sell-hero__title">
              Soumettez votre bien. Offre ferme en 7 jours.
            </h1>
            <p className="text-body-lg sell-hero__subtitle">
              Sans condition suspensive de financement. Refus motivé par écrit si le dossier ne correspond pas à nos critères.
            </p>
            <a href="#formulaire" className="sell-hero__cta text-cta">
              Soumettre mon bien
            </a>
          </div>
        </section>

        {/* 3 engagements */}
        <section className="sell-section--secondary section-padding" ref={engRef}>
          <div className={`container ${engVisible ? 'fade-in' : 'fade-hidden'}`}>
            <h2 className="text-heading-lg sell-section-title">
              Trois engagements. Aucune zone grise.
            </h2>
            <div className="sell-engagements">
              {ENGAGEMENTS.map((eng) => (
                <div key={eng.title} className="sell-engagement">
                  <h3 className="sell-engagement__title">{eng.title}</h3>
                  <p className="text-body-sm sell-engagement__desc">{eng.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2 réalisations */}
        {featuredProjects.length > 0 && (
          <section className="sell-section--primary section-padding">
            <div className="container">
              <h2 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-xl)' }}>
                Ce que nous avons fait concrètement.
              </h2>
              <div className="sell-realisations-grid">
                {featuredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
              <div style={{ marginTop: 'var(--spacing-xl)' }}>
                <Link to="/realisations" className="sell-realisations-link text-cta">
                  Toutes nos réalisations
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Process détaillé */}
        <section className="sell-section--primary section-padding" ref={procRef}>
          <div className={`container ${procVisible ? 'fade-in' : 'fade-hidden'}`}>
            <h2 className="text-heading-lg sell-section-title">
              Trois étapes. Sept jours.
            </h2>
            <div className="sell-process">
              {PROCESS_STEPS.map((step) => (
                <div key={step.number} className="sell-process__step">
                  <span className="sell-process__number">{step.number}</span>
                  <div>
                    <h3 className="sell-process__title">{step.title}</h3>
                    <p className="text-body-sm sell-process__desc">{step.description}</p>
                    <span className="sell-process__delay">{step.delay}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Critères */}
        <section className="sell-section--secondary section-padding" ref={critRef}>
          <div className={`container ${critVisible ? 'fade-in' : 'fade-hidden'}`}>
            <h2 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-xl)' }}>
              Quels biens instruisons-nous ?
            </h2>
            <div className="sell-criteria">
              <div className="sell-criteria__list">
                <ul>
                  <li>Immeubles de rapport — 3 à 15 logements</li>
                  <li>Maisons avec terrain ou dépendances</li>
                  <li>Actifs mixtes — rez-de-chaussée commercial et logements au-dessus</li>
                  <li>Biens avec locataires en place — pas un obstacle à l'acquisition</li>
                  <li>Biens à rénover ou à céder en l'état</li>
                </ul>
              </div>
              <div className="sell-criteria__geo">
                <p className="text-body-md">
                  Actifs entre 250 000 € et 1 000 000 €. Paris, Île-de-France, Lille, Lyon, Bordeaux et villes moyennes françaises.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Prescripteurs */}
        <section className="sell-prescripteurs section-padding">
          <div className="container">
            <div className="sell-prescripteurs__inner">
              <h2 className="text-heading-md sell-prescripteurs__title">
                Vous êtes agent immobilier, notaire ou courtier ?
              </h2>
              <p className="text-body-sm sell-prescripteurs__desc">
                Vous avez un dossier qui ne correspond pas à votre portefeuille acheteurs habituel ? Transmettez-le à Versi Immobilier. Retour qualifié sous 48h. Discutons du partenariat en direct.
              </p>
              <Link to="/contact" className="sell-prescripteurs__cta text-cta">
                Nous contacter directement
              </Link>
            </div>
          </div>
        </section>

        {/* Formulaire */}
        <section className="sell-form-section section-padding" id="formulaire">
          <div className="container">
            <div className="sell-form-wrapper">
              <h2 className="text-heading-lg sell-form__title">
                Soumettez votre bien.
              </h2>
              <p className="text-body-sm sell-form__desc">
                Nous accusons réception sous 24h. Si votre dossier entre dans nos critères, nous planifions la visite dans les 48h suivantes.
              </p>
              <SellForm />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="sell-section--secondary section-padding">
          <div className="container">
            <div className="sell-faq">
              <h2 className="text-heading-lg sell-section-title">
                Questions fréquentes.
              </h2>
              {FAQ_ITEMS.map((item) => (
                <FaqItem key={item.question} item={item} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
