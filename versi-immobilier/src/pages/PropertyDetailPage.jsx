import { useParams, Link, Navigate } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import { PROPERTIES } from '../config/properties.js';
import { CONTACT_EMAIL } from '../config/contact.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const property = PROPERTIES.find((p) => p.id === id);
  const { ref, isVisible } = useFadeIn();

  if (!property) {
    return <Navigate to="/biens" replace />;
  }

  const otherProperties = PROPERTIES.filter(
    (p) => p.id !== id && p.status === 'a-vendre'
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
              to="/biens"
              className="text-label"
              style={{
                display: 'inline-block',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-xl)',
                textDecoration: 'none',
              }}
            >
              ← RETOUR AUX BIENS
            </Link>

            {/* Gallery placeholder */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-2xl)',
            }}>
              <div className="image-placeholder" style={{ height: '400px', borderRadius: 'var(--radius-sm)' }}>
                Photo à venir
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <div className="image-placeholder" style={{ flex: 1, borderRadius: 'var(--radius-sm)' }}>
                  Photo à venir
                </div>
                <div className="image-placeholder" style={{ flex: 1, borderRadius: 'var(--radius-sm)' }}>
                  Photo à venir
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 380px',
              gap: 'var(--spacing-3xl)',
              alignItems: 'start',
            }}>
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
                  <div>
                    <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>TYPE</span>
                    <span className="text-body-md">{property.type}</span>
                  </div>
                  <div>
                    <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>SURFACE</span>
                    <span className="text-body-md">{property.surface}</span>
                  </div>
                  <div>
                    <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>PIÈCES</span>
                    <span className="text-body-md">{property.rooms}</span>
                  </div>
                </div>

                <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>
                  Description
                </h2>
                <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-2xl)', lineHeight: 1.65 }}>
                  {property.description}
                </p>

                {property.features && property.features.length > 0 && (
                  <>
                    <h2 className="text-heading-md" style={{ marginBottom: 'var(--spacing-md)' }}>
                      Caractéristiques
                    </h2>
                    <ul style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 'var(--spacing-sm)',
                      marginBottom: 'var(--spacing-2xl)',
                    }}>
                      {property.features.map((feature) => (
                        <li
                          key={feature}
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
                            ·
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* Right: Price + CTA card */}
              <div style={{
                background: 'var(--color-bg-dark)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-xl)',
                position: 'sticky',
                top: 'calc(var(--nav-height) + var(--spacing-lg))',
              }}>
                <span className="text-label" style={{ display: 'block', color: 'var(--color-text-inverse)', opacity: 0.5, marginBottom: 'var(--spacing-sm)' }}>
                  PRIX
                </span>
                <span style={{
                  display: 'block',
                  fontSize: '2rem',
                  fontWeight: 'var(--font-weight-light)',
                  color: 'var(--color-text-inverse)',
                  marginBottom: 'var(--spacing-xl)',
                }}>
                  {property.price}
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
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    minHeight: '44px',
                    transition: 'background-color var(--duration-normal) ease',
                  }}
                >
                  NOUS CONTACTER POUR CE BIEN
                </Link>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-body-sm"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    color: 'var(--color-accent)',
                    marginTop: 'var(--spacing-md)',
                    textDecoration: 'none',
                  }}
                >
                  {CONTACT_EMAIL}
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
                Autres biens disponibles
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
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
