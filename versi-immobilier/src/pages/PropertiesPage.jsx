import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import { PROPERTIES } from '../config/properties.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

const TYPE_OPTIONS = ['Tous', 'Appartement', 'Maison', 'Immeuble', 'Local mixte'];
const LOCATION_OPTIONS = ['Toutes', 'Paris', 'Île-de-France', 'Lille', 'Lyon', 'Bordeaux', 'Autre'];
const BUDGET_OPTIONS = [
  { label: 'Tous', min: 0, max: Infinity },
  { label: 'Moins de 150 000 €', min: 0, max: 150000 },
  { label: '150 000 – 300 000 €', min: 150000, max: 300000 },
  { label: '300 000 – 500 000 €', min: 300000, max: 500000 },
  { label: 'Plus de 500 000 €', min: 500000, max: Infinity },
];

export default function PropertiesPage() {
  const [typeFilter, setTypeFilter] = useState('Tous');
  const [locationFilter, setLocationFilter] = useState('Toutes');
  const [budgetFilter, setBudgetFilter] = useState('Tous');
  const { ref, isVisible } = useFadeIn();

  const filtered = useMemo(() => {
    return PROPERTIES.filter((p) => {
      if (typeFilter !== 'Tous' && p.type !== typeFilter) return false;
      if (locationFilter !== 'Toutes') {
        if (!p.city.toLowerCase().includes(locationFilter.toLowerCase()) &&
            !p.location.toLowerCase().includes(locationFilter.toLowerCase())) {
          return false;
        }
      }
      const budget = BUDGET_OPTIONS.find((b) => b.label === budgetFilter);
      if (budget && budget.label !== 'Tous') {
        if (p.priceNum < budget.min || p.priceNum >= budget.max) return false;
      }
      return true;
    });
  }, [typeFilter, locationFilter, budgetFilter]);

  const hasActiveFilters = typeFilter !== 'Tous' || locationFilter !== 'Toutes' || budgetFilter !== 'Tous';

  const resetFilters = () => {
    setTypeFilter('Tous');
    setLocationFilter('Toutes');
    setBudgetFilter('Tous');
  };

  const selectStyle = {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    padding: '10px 16px',
    fontFamily: 'var(--font-family)',
    fontSize: '16px',
    color: 'var(--color-text-primary)',
    minHeight: '44px',
    appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'12\' height=\'8\' viewBox=\'0 0 12 8\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1.5L6 6.5L11 1.5\' stroke=\'%236B6560\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '36px',
    cursor: 'pointer',
  };

  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        <section className="section-padding" ref={ref}>
          <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
            <h1 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-md)' }}>
              Nos biens.
            </h1>
            <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-2xl)', maxWidth: 'var(--text-max-width-md)' }}>
              Actifs résidentiels et mixtes rénovés par Versi Immobilier. Diagnostics complets. Garanties décennales.
            </p>

            {/* Filters */}
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-2xl)',
              flexWrap: 'wrap',
              alignItems: 'end',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="filter-type" className="text-label" style={{ color: 'var(--color-text-muted)' }}>
                  Type de bien
                </label>
                <select
                  id="filter-type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={selectStyle}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="filter-location" className="text-label" style={{ color: 'var(--color-text-muted)' }}>
                  Localisation
                </label>
                <select
                  id="filter-location"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  style={selectStyle}
                >
                  {LOCATION_OPTIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="filter-budget" className="text-label" style={{ color: 'var(--color-text-muted)' }}>
                  Budget
                </label>
                <select
                  id="filter-budget"
                  value={budgetFilter}
                  onChange={(e) => setBudgetFilter(e.target.value)}
                  style={selectStyle}
                >
                  {BUDGET_OPTIONS.map((b) => (
                    <option key={b.label} value={b.label}>{b.label}</option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-label"
                  style={{
                    color: 'var(--color-text-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '10px 0',
                    minHeight: '44px',
                    textDecoration: 'underline',
                    textUnderlineOffset: '4px',
                  }}
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>

            {/* Grid */}
            {PROPERTIES.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-4xl) var(--spacing-lg)',
                color: 'var(--color-text-muted)',
              }}>
                <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  Aucun bien disponible actuellement. Revenez bientôt — ou soumettez votre bien à la vente.
                </p>
                <Link to="/vendre" className="text-cta" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'var(--color-charcoal-950)',
                  color: 'var(--color-calcaire-50)',
                  padding: '12px 32px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  minHeight: '44px',
                }}>
                  Soumettre mon bien
                </Link>
              </div>
            ) : filtered.length > 0 ? (
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
                <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  Aucun bien ne correspond à ces critères.
                </p>
                <button
                  onClick={resetFilters}
                  className="text-cta"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    border: '1px solid var(--color-border)',
                    padding: '12px 32px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-primary)',
                    background: 'none',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Bandeau vendeur bas de page */}
        <section className="section-padding" style={{ background: 'var(--color-bg-dark-alt)', textAlign: 'center' }}>
          <div className="container">
            <p className="text-body-lg" style={{ color: 'var(--color-text-inverse)', marginBottom: 'var(--spacing-lg)' }}>
              Vous avez un bien à céder ?
            </p>
            <Link to="/vendre" className="text-cta" style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--color-accent)',
              color: 'var(--color-bg-dark)',
              padding: '16px 48px',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              minHeight: '52px',
            }}>
              Soumettre mon bien
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
