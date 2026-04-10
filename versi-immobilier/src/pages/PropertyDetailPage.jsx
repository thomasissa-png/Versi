import { useParams, Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import { PROPERTIES } from '../config/properties.js';
import { CONTACT_EMAIL } from '../config/contact.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

const STATUS_LABELS = {
  'disponible': 'Disponible',
  'sous-compromis': 'Sous compromis',
  'vendu': 'Vendu',
};

export default function PropertyDetailPage() {
  const { id } = useParams();
  const property = PROPERTIES.find((p) => p.id === id);
  const { ref, isVisible } = useFadeIn();

  if (!property) {
    return (
      <>
        <Nav />
        <main style={{
          paddingTop: 'var(--nav-height)',
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
            <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
              Ce bien n'est plus disponible.
            </p>
            <Link
              to="/nos-biens"
              className="text-cta"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid var(--color-border)',
                padding: '12px 32px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                textDecoration: 'none',
                minHeight: '44px',
              }}
            >
              Voir tous nos biens
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const otherProperties = PROPERTIES.filter(
    (p) => p.id !== id && p.status === 'disponible'
  ).slice(0, 3);

  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        <section className="section-padding" ref={ref}>
          <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
            <Link
              to="/nos-biens"
              className="text-label"
              style={{
                display: 'inline-block',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-xl)',
                textDecoration: 'none',
              }}
            >
              ← Nos biens
            </Link>

            {/* Gallery placeholder */}
            <div className="property-detail__gallery">
              <div className="image-placeholder" style={{ height: '400px', borderRadius: 'var(--card-radius)', aspectRatio: '4/3' }}>
                Photo principale
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <div className="image-placeholder" style={{ flex: 1, borderRadius: 'var(--card-radius)' }}>
                  Photo 2
                </div>
                <div className="image-placeholder" style={{ flex: 1, borderRadius: 'var(--card-radius)' }}>
                  Photo 3
                </div>
              </div>
            </div>

            <div className="property-detail__layout">
              {/* Left: Details */}
              <div>
                <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)' }}>
                  {property.location}
                </span>
                <h1 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  {property.title}
                </h1>

                <div style={{
                  display: 'flex',
                  gap: 'var(--spacing-xl)',
                  marginBottom: 'var(--spacing-2xl)',
                  flexWrap: 'wrap',
                }}>
                  {[
                    { label: 'Type', value: property.type },
                    { label: 'Surface', value: property.surface },
                    { label: 'Pièces', value: property.rooms },
                    { label: 'DPE', value: property.dpe },
                    { label: 'Étage', value: property.floor },
                    { label: 'État locatif', value: property.tenancy },
                  ].filter(item => item.value).map((item) => (
                    <div key={item.label}>
                      <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>{item.label}</span>
                      <span className="text-body-md">{item.value}</span>
                    </div>
                  ))}
                </div>

                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>
                  Le bien.
                </h2>
                <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-2xl)', lineHeight: 1.65 }}>
                  {property.description}
                </p>

                {/* Features */}
                {property.features && property.features.length > 0 && (
                  <>
                    <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>
                      Caractéristiques.
                    </h2>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 'var(--spacing-sm)',
                      marginBottom: 'var(--spacing-2xl)',
                    }}>
                      {property.features.map((feat) => (
                        <span
                          key={feat}
                          className="text-body-sm"
                          style={{
                            padding: 'var(--spacing-xs) var(--spacing-md)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {/* Travaux */}
                {property.works && property.works.length > 0 && (
                  <>
                    <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>
                      Travaux réalisés.{property.renovationYear && ` Rénovation ${property.renovationYear}.`}
                    </h2>
                    <ul style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 'var(--spacing-sm)',
                      marginBottom: 'var(--spacing-2xl)',
                    }}>
                      {property.works.map((work) => (
                        <li
                          key={work}
                          className="text-body-sm"
                          style={{
                            color: 'var(--color-text-muted)',
                            paddingLeft: 'var(--spacing-md)',
                            position: 'relative',
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              position: 'absolute',
                              left: 0,
                              color: 'var(--color-accent)',
                            }}
                          >
                            —
                          </span>
                          {work}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Emplacement */}
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>
                  Emplacement.
                </h2>
                <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
                  {property.address && (
                    <p className="text-body-md" style={{ marginBottom: 'var(--spacing-sm)' }}>
                      {property.address}
                      {property.neighborhood && ` — quartier ${property.neighborhood}`}
                    </p>
                  )}
                  {property.nearbyTransport && (
                    <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
                      <strong>Transports :</strong> {property.nearbyTransport}
                    </p>
                  )}
                  {property.nearbyAmenities && (
                    <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
                      <strong>À proximité :</strong> {property.nearbyAmenities}
                    </p>
                  )}
                </div>

                {/* Diagnostics & charges */}
                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>
                  Diagnostics et charges.
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 'var(--spacing-sm)',
                  marginBottom: 'var(--spacing-2xl)',
                }}>
                  {property.dpe && (
                    <div>
                      <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>DPE</span>
                      <span className="text-body-md">{property.dpe}</span>
                      {property.dpeNote && (
                        <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>{property.dpeNote}</p>
                      )}
                    </div>
                  )}
                  {property.charges && (
                    <div>
                      <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>Charges de copropriété</span>
                      <span className="text-body-md">{property.charges}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Price + CTA card */}
              <div style={{
                background: 'var(--color-bg-dark)',
                borderRadius: 'var(--card-radius)',
                padding: 'var(--spacing-xl)',
                position: 'sticky',
                top: 'calc(var(--nav-height) + var(--spacing-lg))',
              }}>
                <span className="text-label" style={{ display: 'block', color: 'var(--color-text-inverse)', opacity: 0.5, marginBottom: 'var(--spacing-sm)' }}>
                  Prix
                </span>
                <span style={{
                  display: 'block',
                  fontSize: '2rem',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-inverse)',
                  marginBottom: 'var(--spacing-xs)',
                }}>
                  {property.price}
                </span>
                {property.priceNote && (
                  <span className="text-body-sm" style={{
                    display: 'block',
                    color: 'var(--color-text-inverse)',
                    opacity: 0.6,
                    marginBottom: 'var(--spacing-md)',
                  }}>
                    {property.priceNote}
                  </span>
                )}

                <span style={{
                  display: 'inline-block',
                  fontSize: '12px',
                  fontWeight: 'var(--font-weight-medium)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 'var(--spacing-xl)',
                  background: property.status === 'disponible' ? 'var(--badge-en-vente-bg)' : 'var(--badge-vendu-bg)',
                  color: '#FFFFFF',
                }}>
                  {STATUS_LABELS[property.status] || property.status}
                </span>

                <Link
                  to={`/contact?bien=${encodeURIComponent(property.title)}`}
                  className="text-cta"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: 'var(--color-text-inverse)',
                    color: 'var(--color-bg-dark)',
                    padding: '16px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    minHeight: '44px',
                    transition: 'background-color var(--duration-normal) ease',
                    marginBottom: 'var(--spacing-md)',
                  }}
                >
                  Demander une visite
                </Link>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Bien ' + property.id)}`}
                  className="text-body-sm"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    color: 'var(--color-accent)',
                    textDecoration: 'none',
                  }}
                >
                  Nous écrire
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Other available properties */}
        {otherProperties.length > 0 && (
          <section className="section-padding" style={{ background: 'var(--color-bg-primary)' }}>
            <div className="container">
              <h2 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-2xl)' }}>
                D'autres biens disponibles.
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 'var(--spacing-lg)',
              }}>
                {otherProperties.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
              <div style={{ marginTop: 'var(--spacing-xl)' }}>
                <Link to="/nos-biens" className="text-cta" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                  Voir tous nos biens
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
