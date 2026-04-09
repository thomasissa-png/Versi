import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import { CONTACT_EMAIL } from '../config/contact.js';

export default function MentionsLegales() {
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
              Mentions légales
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Éditeur du site</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Versi Immobilier<br />
                  Société par actions simplifiée<br />
                  Capital social : [à compléter]<br />
                  RCS : [à compléter]<br />
                  Siège social : [adresse à compléter]<br />
                  Email : {CONTACT_EMAIL}
                </p>
              </div>

              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Directeur de la publication</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  [Nom du directeur de la publication à compléter]
                </p>
              </div>

              <div>
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>Hébergement</h2>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                  [Nom de l'hébergeur à compléter]<br />
                  [Adresse de l'hébergeur à compléter]
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
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
