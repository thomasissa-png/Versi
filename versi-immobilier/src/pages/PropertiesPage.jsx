import { useState, useMemo } from 'react';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import { PROPERTIES } from '../config/properties.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

export default function PropertiesPage() {
  const [statusFilter, setStatusFilter] = useState('tous');
  const [locationFilter, setLocationFilter] = useState('toutes');
  const { ref, isVisible } = useFadeIn();

  const locations = useMemo(() => {
    const locs = [...new Set(PROPERTIES.map((p) => p.location))];
    return locs.sort();
  }, []);

  const filtered = useMemo(() => {
    return PROPERTIES.filter((p) => {
      if (statusFilter !== 'tous' && p.status !== statusFilter) return false;
      if (locationFilter !== 'toutes' && p.location !== locationFilter) return false;
      return true;
    });
  }, [statusFilter, locationFilter]);

  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        <section className="section-padding" ref={ref}>
          <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
            <span className="text-label" style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
              NOS BIENS
            </span>
            <h1 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-2xl)' }}>
              Biens disponibles
            </h1>

            <div style={{
              display: 'flex',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-2xl)',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                <label htmlFor="filter-status" className="text-label" style={{ color: 'var(--color-text-muted)' }}>
                  STATUT
                </label>
                <select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--font-size-body-sm)',
                    color: 'var(--color-text-primary)',
                    minHeight: '44px',
                  }}
                >
                  <option value="tous">Tous</option>
                  <option value="a-vendre">À vendre</option>
                  <option value="vendu">Vendu</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                <label htmlFor="filter-location" className="text-label" style={{ color: 'var(--color-text-muted)' }}>
                  LOCALISATION
                </label>
                <select
                  id="filter-location"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--font-size-body-sm)',
                    color: 'var(--color-text-primary)',
                    minHeight: '44px',
                  }}
                >
                  <option value="toutes">Toutes</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            {filtered.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 'var(--spacing-lg)',
              }}>
                {filtered.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-4xl) var(--spacing-lg)',
                color: 'var(--color-text-muted)',
              }}>
                <p className="text-body-lg">
                  Aucun bien disponible actuellement.
                </p>
                <p className="text-body-sm" style={{ marginTop: 'var(--spacing-sm)' }}>
                  Contactez-nous pour être informé des prochaines opportunités.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
