import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import { CONTACT_EMAIL } from '../config/contact.js';

export default function MentionsLegales() {
  return (
    <>
      <PageHead
        title="Mentions légales — Versi Immobilier"
        description="Mentions légales de Versi Immobilier, marchand de biens."
        noindex
      />
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        <section className="section-padding">
          <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-2xl)' }}>
              Mentions légales
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Éditeur du site</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Versi Immobilier<br />
                  Société par actions simplifiée (SAS)<br />
                  SIREN : 912 862 612<br />
                  Siège social : 54 rue Henri Barbusse, 92000 Nanterre<br />
                  Email : {CONTACT_EMAIL}
                </p>
              </div>

              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Responsable de la publication</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Thomas Issa — Co-fondateur<br />
                  {CONTACT_EMAIL}
                </p>
              </div>

              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Hébergeur</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Replit, Inc.<br />
                  303 2nd Street, Suite 400 South, San Francisco, CA 94107, États-Unis
                </p>
              </div>

              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Propriété intellectuelle</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  L'ensemble de ce site relève de la législation française et internationale
                  sur le droit d'auteur et la propriété intellectuelle. Tous les droits de
                  reproduction sont réservés, y compris les représentations iconographiques
                  et photographiques.
                </p>
              </div>

              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Limitation de responsabilité</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Les informations contenues sur ce site sont aussi précises que possible
                  et le site est périodiquement mis à jour, mais peut toutefois contenir
                  des inexactitudes, des omissions ou des lacunes. Versi Immobilier ne
                  pourra être tenue responsable des dommages directs et indirects causés
                  au matériel de l'utilisateur lors de l'accès au site.
                </p>
              </div>
            </div>

            {/* Politique de confidentialité */}
            <div id="politique-de-confidentialite" style={{ scrollMarginTop: 'calc(var(--nav-height) + var(--spacing-lg))' }}>
              <h1 className="text-heading-lg" style={{ marginTop: 'var(--spacing-4xl)', marginBottom: 'var(--spacing-2xl)' }}>
                Politique de confidentialité
              </h1>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                <div>
                  <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Responsable de traitement</h2>
                  <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Versi Immobilier — SIREN 912 862 612<br />
                    {CONTACT_EMAIL}
                  </p>
                </div>

                <div>
                  <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Données collectées</h2>
                  <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Via les formulaires de contact et de soumission de bien : prénom, nom,
                    adresse email, numéro de téléphone, adresse du bien (pour le formulaire vendeur),
                    message libre.<br /><br />
                    Aucune donnée sensible au sens de l'article 9 du RGPD n'est collectée.
                  </p>
                </div>

                <div>
                  <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Base légale du traitement</h2>
                  <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Intérêt légitime de Versi Immobilier (art. 6.1.f du Règlement (UE) 2016/679 — RGPD).
                    Le traitement est nécessaire à la réponse aux demandes des visiteurs et à l'instruction
                    des dossiers de vente.
                  </p>
                </div>

                <div>
                  <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Durée de conservation</h2>
                  <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                    3 ans à compter du dernier contact, conformément aux recommandations de la CNIL
                    pour les données de prospects.
                  </p>
                </div>

                <div>
                  <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Destinataires des données</h2>
                  <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Les données collectées via les formulaires sont transmises par email
                    via notre serveur SMTP sécurisé.
                    Elles ne sont pas transmises à des tiers.
                  </p>
                </div>

                <div>
                  <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Vos droits</h2>
                  <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Vous disposez d'un droit d'accès, de rectification, d'opposition et de suppression
                    de vos données personnelles. Pour exercer ces droits, écrivez à : {CONTACT_EMAIL}<br /><br />
                    Vous avez également le droit d'introduire une réclamation auprès de la Commission
                    Nationale de l'Informatique et des Libertés (CNIL) :{' '}
                    <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>
                      www.cnil.fr
                    </a>
                  </p>
                </div>

                <div>
                  <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Cookies et traçage</h2>
                  <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Ce site ne dépose aucun cookie de traçage. Aucune donnée de navigation
                    n'est collectée à des fins publicitaires ou analytiques.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
