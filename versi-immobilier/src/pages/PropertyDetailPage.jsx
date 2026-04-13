import { useParams, Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import { useProperty } from '../hooks/useProperty.js';
import { useProperties } from '../hooks/useProperties.js';
import { CONTACT_EMAIL } from '../config/contact.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

const STATUS_LABELS = {
  'disponible': 'Disponible',
  'sous-compromis': 'Sous compromis',
  'vendu': 'Vendu',
};

const STATUS_BADGE_CLASS = {
  'disponible': 'property-price-card__badge--disponible',
  'sous-compromis': 'property-price-card__badge--sous-compromis',
  'vendu': 'property-price-card__badge--vendu',
};

/* Icône placeholder SVG inline — aucune dépendance externe */
function CameraIcon() {
  return (
    <svg
      className="property-detail__placeholder-icon"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="4" y="12" width="40" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="26" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M18 12l3-6h6l3 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const { property, photos, loading, error } = useProperty(id);
  const { properties: allProperties } = useProperties('disponible');
  const { ref, isVisible } = useFadeIn();

  if (loading) {
    return (
      <>
        <Nav />
        <main className="page-state">
          <div className="page-state__inner">
            <p className="text-body-lg">Chargement du bien…</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !property) {
    return (
      <>
        <Nav />
        <main className="page-state">
          <div className="page-state__inner">
            <p className="text-body-lg page-state__message">
              Ce bien n'est plus disponible.
            </p>
            <Link to="/nos-biens" className="text-cta page-state__link">
              Voir tous nos biens
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const otherProperties = allProperties.filter((p) => p.id !== id).slice(0, 3);

  /* Badge de statut dans la price card */
  const badgeClass = STATUS_BADGE_CLASS[property.status] || '';

  /* Interprétation du price_note pour la double grille prix */
  /* On tente de détecter un format "Avant travaux : X€ / Clé en main : Y€" */
  const parseDualPricing = (note) => {
    if (!note) return null;
    const match = note.match(/avant\s+travaux\s*:?\s*([\d\s€.,-]+).*?cl[eé]\s+en\s+main\s*:?\s*([\d\s€.,-]+)/i);
    if (match) {
      return { avantTravaux: match[1].trim(), cleEnMain: match[2].trim() };
    }
    return null;
  };

  const dualPricing = parseDualPricing(property.priceNote);

  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        <section className="section-padding" ref={ref}>
          <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>

            {/* Back link */}
            <Link to="/nos-biens" className="text-label property-detail__back-link">
              ← Nos biens
            </Link>

            {/* ── Galerie ── */}
            <div className="property-detail__gallery">
              {photos.length > 0 ? (
                <>
                  <img
                    src={photos[0].url}
                    alt={photos[0].alt || property.title}
                    className="property-detail__gallery-main"
                  />
                  <div className="property-detail__gallery-col">
                    {photos[1] ? (
                      <img
                        src={photos[1].url}
                        alt={photos[1].alt || `${property.title} — photo 2`}
                        className="property-detail__gallery-thumb"
                      />
                    ) : (
                      <div className="image-placeholder property-detail__gallery-thumb" />
                    )}
                    {photos[2] ? (
                      <img
                        src={photos[2].url}
                        alt={photos[2].alt || `${property.title} — photo 3`}
                        className="property-detail__gallery-thumb"
                      />
                    ) : (
                      <div className="image-placeholder property-detail__gallery-thumb" />
                    )}
                  </div>
                </>
              ) : (
                /* Placeholder pré-commercialisation — élégant, pas vide */
                <div
                  className="property-detail__placeholder"
                  role="img"
                  aria-label="Visuels bientôt disponibles"
                >
                  <CameraIcon />
                  <span className="property-detail__placeholder-text">
                    Visuels bientôt disponibles
                  </span>
                  <span className="property-detail__placeholder-sub">
                    Rendez-vous pour une visite privée
                  </span>
                </div>
              )}
            </div>

            {/* ── Layout principal ── */}
            <div className="property-detail__layout">

              {/* Colonne gauche — détails */}
              <div>
                <span className="text-label property-detail__meta">
                  {property.location}
                </span>
                <h1 className="text-heading-lg property-detail__title">
                  {property.title}
                </h1>

                {/* Specs strip */}
                <div className="property-detail__specs">
                  {[
                    { label: 'Type', value: property.type },
                    { label: 'Surface', value: property.surface },
                    { label: 'Pièces', value: property.rooms },
                    { label: 'DPE', value: property.dpe },
                    { label: 'Étage', value: property.floor },
                    { label: 'Disponibilité', value: property.tenancy },
                  ].filter((item) => item.value).map((item) => (
                    <div key={item.label} className="property-detail__spec-item">
                      <span className="text-label property-detail__spec-label">{item.label}</span>
                      <span className="property-detail__spec-value">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <h2 className="text-heading-md property-detail__section-title">
                  Le bien.
                </h2>
                <div className="text-body-md property-detail__description">
                  {property.description.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>

                {/* Caractéristiques */}
                {property.features && property.features.length > 0 && (
                  <>
                    <h2 className="text-heading-md property-detail__section-title">
                      Caractéristiques.
                    </h2>
                    <div className="property-detail__features">
                      {property.features.map((feat) => (
                        <span key={feat} className="property-detail__feature-tag">
                          {feat}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {/* Travaux réalisés */}
                {property.works && property.works.length > 0 && (
                  <>
                    <h2 className="text-heading-md property-detail__section-title">
                      Travaux réalisés.{property.renovationYear && ` Rénovation ${property.renovationYear}.`}
                    </h2>
                    <ul className="property-detail__works">
                      {property.works.map((work) => (
                        <li key={work} className="property-detail__work-item">
                          <span aria-hidden="true" className="property-detail__work-bullet">—</span>
                          {work}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Emplacement */}
                <h2 className="text-heading-md property-detail__section-title">
                  Emplacement.
                </h2>
                <div className="property-detail__location-block">
                  {property.address && (
                    <p className="text-body-md property-detail__address">
                      {property.address}
                      {property.neighborhood && ` — quartier ${property.neighborhood}`}
                    </p>
                  )}
                  {property.nearbyTransport && (
                    <p className="text-body-sm property-detail__transport">
                      <strong>Transports :</strong> {property.nearbyTransport}
                    </p>
                  )}
                  {property.nearbyAmenities && (
                    <p className="text-body-sm property-detail__amenities">
                      <strong>À proximité :</strong> {property.nearbyAmenities}
                    </p>
                  )}
                </div>

                {/* Diagnostics & charges — masqué si aucune donnée */}
                {(property.dpe || property.dpeNote || property.charges) && (
                  <>
                    <h2 className="text-heading-md property-detail__section-title">
                      Diagnostics et charges.
                    </h2>
                    <div className="property-detail__diagnostics">
                      {(property.dpe || property.dpeNote) && (
                        <div className="property-detail__diag-item">
                          <span className="text-label property-detail__diag-label">DPE</span>
                          {property.dpe ? (
                            <span className="text-body-md">{property.dpe}</span>
                          ) : null}
                          {property.dpeNote && (
                            <p className="text-body-sm property-detail__diag-note">{property.dpeNote}</p>
                          )}
                        </div>
                      )}
                      {property.charges && (
                        <div className="property-detail__diag-item">
                          <span className="text-label property-detail__diag-label">Charges de copropriété</span>
                          <span className="text-body-md">{property.charges}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* ── Colonne droite — Price card sticky ── */}
              <aside aria-label="Prix et contact">
                <div className="property-price-card">
                  <span className="property-price-card__label">Prix</span>
                  <span className="property-price-card__price">{property.price}</span>

                  {/* Double pricing si priceNote contient "avant travaux / clé en main" */}
                  {dualPricing ? (
                    <div className="property-price-card__dual">
                      <div className="property-price-card__dual-row">
                        <span className="property-price-card__dual-label">Avant travaux</span>
                        <span className="property-price-card__dual-value">{dualPricing.avantTravaux}</span>
                      </div>
                      <div className="property-price-card__dual-row">
                        <span className="property-price-card__dual-label">Clé en main</span>
                        <span className="property-price-card__dual-value">{dualPricing.cleEnMain}</span>
                      </div>
                    </div>
                  ) : property.priceNote ? (
                    <span className="property-price-card__note">{property.priceNote}</span>
                  ) : null}

                  <span className={`property-price-card__badge ${badgeClass}`}>
                    {STATUS_LABELS[property.status] || property.status}
                  </span>

                  <Link
                    to={`/contact?bien=${encodeURIComponent(property.title)}`}
                    className="property-price-card__cta-primary"
                  >
                    Demander une présentation
                  </Link>

                  <hr className="property-price-card__separator" />

                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Renseignements — ' + property.title)}`}
                    className="property-price-card__cta-secondary"
                    aria-label={`Envoyer un email au sujet de ${property.title}`}
                  >
                    Nous écrire
                  </a>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* Autres biens disponibles */}
        {otherProperties.length > 0 && (
          <section className="section-padding other-properties__section">
            <div className="container">
              <h2 className="text-heading-lg other-properties__title">
                D'autres biens disponibles.
              </h2>
              <div className="other-properties__grid">
                {otherProperties.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
              <Link to="/nos-biens" className="text-label other-properties__link">
                Voir tous nos biens →
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
