import { Link, useParams } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import { REFERENCES } from '../config/references.js';
import './ReferenceDetailPage.css';

export default function ReferenceDetailPage() {
  const { slug } = useParams();
  const ref = REFERENCES.find((r) => r.slug === slug);

  if (!ref) {
    return (
      <>
        <Nav />
        <main id="main-content">
          <section className="page-header">
            <div className="container">
              <h1 className="page-header__title">Référence introuvable</h1>
              <Link to="/references" className="ref-detail__back">← Toutes les références</Link>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  const d = ref.detail || {};

  return (
    <>
      <PageHead
        title={`${ref.type} ${ref.lots} lots — ${ref.ville} | Versi Invest`}
        description={ref.description}
      />
      <a href="#main-content" className="skip-nav">Aller au contenu principal</a>
      <Nav />
      <main id="main-content">
        {/* Header */}
        <section className="page-header" aria-label="En-tête référence">
          <div className="container">
            <Link to="/references" className="ref-detail__back-top">← Toutes les références</Link>
            <h1 className="page-header__title">
              {ref.type} — {ref.ville} ({ref.departement})
            </h1>
            <p className="page-header__intro">{d.intro || ref.description}</p>
          </div>
        </section>

        {/* Métriques */}
        <section className="ref-detail__metrics section-padding" aria-label="Métriques">
          <div className="container">
            <div className="ref-detail__metrics-grid">
              <div className="ref-detail__metric">
                <span className="ref-detail__metric-value">{ref.rendementBrut.toFixed(1).replace('.', ',')}%</span>
                <span className="ref-detail__metric-label">Rendement brut</span>
              </div>
              <div className="ref-detail__metric">
                <span className="ref-detail__metric-value ref-detail__metric-value--highlight">+{ref.cashflowNet} €</span>
                <span className="ref-detail__metric-label">Cashflow net / mois</span>
              </div>
              <div className="ref-detail__metric">
                <span className="ref-detail__metric-value">{ref.lots}</span>
                <span className="ref-detail__metric-label">Lots</span>
              </div>
              <div className="ref-detail__metric">
                <span className="ref-detail__metric-value">{ref.annee}</span>
                <span className="ref-detail__metric-label">Année</span>
              </div>
            </div>
          </div>
        </section>

        {/* Détail */}
        <section className="ref-detail__body section-padding" aria-label="Détail de l'opération">
          <div className="container">
            <div className="ref-detail__grid">
              {/* Colonne gauche — infos */}
              <div className="ref-detail__info">
                {d.travaux && (
                  <div className="ref-detail__block">
                    <h2 className="ref-detail__block-title">Travaux</h2>
                    <p className="ref-detail__block-text">{d.travaux}</p>
                  </div>
                )}
                {d.structure && (
                  <div className="ref-detail__block">
                    <h2 className="ref-detail__block-title">Structure juridique</h2>
                    <p className="ref-detail__block-text">{d.structure}</p>
                  </div>
                )}
                {d.duree && (
                  <div className="ref-detail__block">
                    <h2 className="ref-detail__block-title">Durée de l'opération</h2>
                    <p className="ref-detail__block-text">{d.duree}</p>
                  </div>
                )}
                {d.resultat && (
                  <div className="ref-detail__block">
                    <h2 className="ref-detail__block-title">Résultat</h2>
                    <p className="ref-detail__block-text">{d.resultat}</p>
                  </div>
                )}
              </div>

              {/* Colonne droite — photos */}
              <div className="ref-detail__photos">
                {d.photos && d.photos.length > 0 ? (
                  d.photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt={`${ref.type} ${ref.ville} — photo ${i + 1}`}
                      className="ref-detail__photo"
                      loading="lazy"
                    />
                  ))
                ) : (
                  <div className="ref-detail__photos-placeholder">
                    <p>Photos disponibles sur demande lors de votre premier échange avec un fondateur.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="page-cta section-padding" aria-label="Contact">
          <div className="container page-cta__inner">
            <p className="page-cta__text">
              Vous souhaitez voir le détail complet de cette opération — simulation, photos, hypothèses de travaux ?
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
