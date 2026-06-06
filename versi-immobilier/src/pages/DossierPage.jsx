/**
 * DossierPage — Dossier de pré-commercialisation, page autonome.
 *
 * Route : /dossier/:id
 *
 * C'est un livrable INDÉPENDANT de l'annonce publique /nos-biens/:id.
 * - Pensé pour être partagé en lien à un prospect (mail, WhatsApp).
 * - Pensé pour être imprimé en PDF (window.print + @media print).
 * - PAS de grosse Nav/Footer du site : c'est un document, pas une page de site.
 * - Réutilise PropertyDossier.jsx (rendu riche déjà éprouvé).
 *
 * Si property.dossier est absent → message "Dossier non disponible" + lien
 * vers l'annonce. Pas de crash, pas d'écran blanc.
 */

import { useParams, Link } from 'react-router-dom';
import PageHead from '../components/PageHead.jsx';
import PropertyDossier from '../components/PropertyDossier.jsx';
import { useProperty } from '../hooks/useProperty.js';
import { CONTACT_EMAIL } from '../config/contact.js';

export default function DossierPage() {
  const { id } = useParams();
  const { property, loading, error } = useProperty(id);

  /* ── État : chargement ── */
  if (loading) {
    return (
      <main className="dossier-page dossier-page--state">
        <p className="text-body-lg">Chargement du dossier…</p>
      </main>
    );
  }

  /* ── État : bien introuvable ── */
  if (error || !property) {
    return (
      <main className="dossier-page dossier-page--state">
        <p className="text-body-lg">Ce dossier n’est pas disponible.</p>
        <Link to="/nos-biens" className="text-cta">
          Voir tous nos biens
        </Link>
      </main>
    );
  }

  /* ── État : pas de dossier riche pour ce bien (ex : Lot 3 Muguets) ── */
  if (!property.dossier) {
    return (
      <>
        <PageHead
          title={`Dossier non disponible — ${property.title.slice(0, 40)} | Versi`}
          description="Dossier de pré-commercialisation non disponible pour ce bien."
          noindex
        />
        <main className="dossier-page dossier-page--state">
          <h1 className="text-heading-md">Dossier non disponible</h1>
          <p className="text-body-md">
            Le dossier de pré-commercialisation détaillé n’est pas encore prêt pour ce bien.
            Vous pouvez consulter l’annonce publique en attendant.
          </p>
          <Link to={`/nos-biens/${property.id}`} className="text-cta">
            Voir l’annonce →
          </Link>
        </main>
      </>
    );
  }

  /* ── Dossier prêt — rendu document ── */
  const prixAppel =
    property.dossier?.formules?.brut?.price || property.price;

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <>
      <PageHead
        title={`Dossier de pré-commercialisation — ${property.title.slice(0, 40)} | Versi`}
        description={`Dossier détaillé : ${property.type || 'bien immobilier'}, ${property.surface || ''}, à partir de ${prixAppel}. ${property.dossier?.intro || ''}`}
      />
      <a href="#dossier-content" className="skip-nav">
        Aller au contenu du dossier
      </a>

      {/* ── Barre d'action (masquée à l'impression) ── */}
      <div className="dossier-page__actions" data-print-hide="true">
        <Link to={`/nos-biens/${property.id}`} className="text-label dossier-page__back">
          ← Retour à l’annonce
        </Link>
        <button
          type="button"
          onClick={handlePrint}
          className="dossier-page__print-btn"
          aria-label="Télécharger le dossier en PDF"
        >
          Télécharger en PDF
        </button>
      </div>

      <main id="dossier-content" className="dossier-page">
        {/* ── En-tête sobre du document ── */}
        <header className="dossier-page__header">
          <div className="dossier-page__brand">
            <span className="dossier-page__logo">Versi Immobilier</span>
            <span className="dossier-page__kicker">Dossier de pré-commercialisation</span>
          </div>
          <h1 className="text-heading-lg dossier-page__title">{property.title}</h1>
          <p className="dossier-page__location">
            {property.address || property.location}
            {property.neighborhood && ` — quartier ${property.neighborhood}`}
          </p>
          <p className="dossier-page__price">
            <span className="dossier-page__price-label">À partir de</span>
            <span className="dossier-page__price-value">{prixAppel}</span>
          </p>
        </header>

        {/* ── Corps : dossier riche (composant existant) ── */}
        <div className="dossier-page__body">
          <PropertyDossier dossier={property.dossier} />
        </div>

        {/* ── Pied sobre ── */}
        <footer className="dossier-page__footer">
          <div className="dossier-page__footer-grid">
            <div>
              <p className="text-label">Contact</p>
              <p className="text-body-md">
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
            </div>
            <div>
              <p className="text-label">Bien</p>
              <p className="text-body-md">Réf. {property.id}</p>
            </div>
            <div>
              <p className="text-label">Édition</p>
              <p className="text-body-md">
                {new Date().toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <p className="text-body-sm dossier-page__mentions">
            Document à valeur indicative — Versi Immobilier. Les surfaces, plans et finitions
            peuvent évoluer dans le respect des permis délivrés. Le DPE définitif sera établi
            à la livraison. Prix exprimés hors frais de notaire.
          </p>
        </footer>
      </main>
    </>
  );
}
