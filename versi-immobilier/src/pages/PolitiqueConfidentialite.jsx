import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import { CONTACT_EMAIL } from '../config/contact.js';

export default function PolitiqueConfidentialite() {
  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        <section className="section-padding">
          <div className="container" style={{ maxWidth: 'var(--text-max-width-lg)' }}>
            <h1 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-2xl)' }}>
              Politique de confidentialité
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Responsable du traitement</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Versi Immobilier, société par actions simplifiée, est responsable du traitement
                  des données personnelles collectées sur ce site.<br />
                  Contact : {CONTACT_EMAIL}
                </p>
              </div>

              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Données collectées</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Les données personnelles collectées via les formulaires de contact et de vente
                  sont : nom, adresse email, numéro de téléphone (optionnel), et les informations
                  relatives au bien immobilier concerné (localisation, surface, type).
                </p>
              </div>

              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Base légale et finalité</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Le traitement est fondé sur l'intérêt légitime de Versi Immobilier
                  (article 6.1.f du RGPD) dans le cadre de la gestion des demandes de contact
                  et de l'évaluation des biens proposés à la vente.
                </p>
              </div>

              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Durée de conservation</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Les données sont conservées pendant une durée maximale de 3 ans à compter
                  du dernier contact avec la personne concernée.
                </p>
              </div>

              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Destinataires</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Les données collectées sont destinées aux équipes internes de Versi Immobilier.
                  Les formulaires sont hébergés par Formspree (sous-traitant basé aux États-Unis,
                  encadrement par clauses contractuelles types).
                </p>
              </div>

              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Vos droits</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Conformément au RGPD, vous disposez d'un droit d'accès, de rectification,
                  d'effacement, de limitation du traitement, de portabilité et d'opposition.
                  Pour exercer ces droits, contactez-nous à l'adresse : {CONTACT_EMAIL}.
                </p>
              </div>

              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Cookies</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Ce site n'utilise pas de cookies de suivi ou publicitaires.
                  Aucun cookie tiers n'est déposé sur votre navigateur.
                </p>
              </div>

              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Réclamation</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Si vous estimez que le traitement de vos données ne respecte pas la
                  réglementation, vous pouvez introduire une réclamation auprès de la CNIL
                  (Commission Nationale de l'Informatique et des Libertés).
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
