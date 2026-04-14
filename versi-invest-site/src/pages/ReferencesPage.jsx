import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import { REFERENCES } from '../config/references.js';
import './ReferencesPage.css';

function ReferenceCard({ ref: _ref, reference }) {
  return (
    <article className="ref-card">
      <div className="ref-card__header">
        <span className="ref-card__badge">{reference.type}</span>
        <span className="ref-card__year">{reference.annee}</span>
      </div>

      <h3 className="ref-card__ville">
        {reference.ville}
        <span className="ref-card__dept">({reference.departement})</span>
      </h3>

      <div className="ref-card__metrics">
        <div className="ref-card__metric">
          <span className="ref-card__metric-label">Rendement brut</span>
          <span className="ref-card__metric-value">
            {reference.rendementBrut.toFixed(1).replace('.', ',')} %
          </span>
        </div>
        <div className="ref-card__metric">
          <span className="ref-card__metric-label">Cashflow net</span>
          <span className="ref-card__metric-value ref-card__metric-value--highlight">
            +{reference.cashflowNet} €/mois
          </span>
        </div>
        <div className="ref-card__metric">
          <span className="ref-card__metric-label">Lots</span>
          <span className="ref-card__metric-value">{reference.lots}</span>
        </div>
        <div className="ref-card__metric">
          <span className="ref-card__metric-label">Montage</span>
          <span className="ref-card__metric-value">{reference.montage}</span>
        </div>
      </div>

      <p className="ref-card__desc">{reference.description}</p>
    </article>
  );
}

export default function ReferencesPage() {
  const hasReferences = REFERENCES && REFERENCES.length > 0;

  return (
    <>
      <PageHead
        title="Références investissement — Versi Invest"
        description="Immeubles de rapport, maisons divisées : rendement, cashflow, montage. Cas réels anonymisés."
      />
      <a href="#main-content" className="skip-nav">Aller au contenu principal</a>
      <Nav />
      <main id="main-content">
        {/* --- Header --- */}
        <header className="page-header">
          <div className="container">
            <h1 className="page-header__title">
              Des opérations réelles. Des chiffres vérifiables.
            </h1>
            <p className="page-header__intro">
              Pas de témoignages anonymes. Pas de rendements projetés. Des cas documentés —
              chiffres bruts, type de bien, structure de financement. Ces références sont
              disponibles en détail sur demande.
            </p>
          </div>
        </header>

        {/* --- Grille de références --- */}
        <section
          className="references section-padding"
          aria-label="Références d'investissements"
        >
          <div className="container">
            {hasReferences ? (
              <>
                <div className="references__grid">
                  {REFERENCES.map((ref) => (
                    <ReferenceCard key={ref.id} reference={ref} />
                  ))}
                </div>

                <div className="references__note">
                  <p className="references__note-text">
                    Les chiffres présentés correspondent aux performances réelles des opérations.
                    Prix d'achat, marges et montants de travaux ne sont pas communiqués
                    publiquement (décision fondateurs). Le détail complet de chaque opération est
                    disponible lors d'un premier appel avec un fondateur.
                  </p>
                </div>
              </>
            ) : (
              <div className="references__empty">
                <p className="references__empty-text">
                  Nos premières références investisseurs arrivent bientôt. En attendant, le track
                  record du Groupe Versi — 16 immeubles, 7,2M€ de volume opéré via
                  Versi Immobilier — est disponible sur demande. Inscrivez-vous sur la liste
                  d'attente pour y accéder lors de notre premier appel.
                </p>
                <Link to="/contact" className="page-cta__btn page-cta__btn--blue">
                  S'inscrire sur la liste d'attente
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* --- CTA --- */}
        {hasReferences && (
          <section className="page-cta section-padding" aria-label="Inscription">
            <div className="container page-cta__inner">
              <p className="page-cta__text">
                Vous voulez accéder au détail de ces opérations et aux prochaines opportunités ?
              </p>
              <div className="page-cta__actions">
                <Link to="/comment-ca-marche" className="page-cta__btn page-cta__btn--secondary">
                  Voir les 8 étapes
                </Link>
                <Link to="/contact" className="page-cta__btn">
                  S'inscrire — réponse sous 48h
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
