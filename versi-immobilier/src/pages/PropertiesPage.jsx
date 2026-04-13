import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import { useProperties } from '../hooks/useProperties.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

const TYPE_OPTIONS = ['Tous', 'Appartement', 'Duplex', 'Maison', 'Immeuble', 'Local mixte'];
const LOCATION_OPTIONS = ['Toutes', 'Hauts-de-France', 'Île-de-France'];
const BUDGET_OPTIONS = [
  { label: 'Tous', min: 0, max: Infinity },
  { label: 'Moins de 150 000 €', min: 0, max: 150000 },
  { label: '150 000 – 300 000 €', min: 150000, max: 300000 },
  { label: '300 000 – 500 000 €', min: 300000, max: 500000 },
  { label: 'Plus de 500 000 €', min: 500000, max: Infinity },
];

export default function PropertiesPage() {
  const { properties: allProperties, loading, error } = useProperties('all');
  const [typeFilter, setTypeFilter] = useState('Tous');
  const [locationFilter, setLocationFilter] = useState('Toutes');
  const [budgetFilter, setBudgetFilter] = useState('Tous');
  const { ref, isVisible } = useFadeIn();

  const available = useMemo(() => allProperties.filter((p) => p.status !== 'vendu'), [allProperties]);
  const sold = useMemo(() => allProperties.filter((p) => p.status === 'vendu'), [allProperties]);

  const filtered = useMemo(() => {
    return available.filter((p) => {
      if (typeFilter !== 'Tous' && p.type !== typeFilter) return false;
      if (locationFilter !== 'Toutes') {
        if (
          !p.city.toLowerCase().includes(locationFilter.toLowerCase()) &&
          !p.location.toLowerCase().includes(locationFilter.toLowerCase())
        ) {
          return false;
        }
      }
      const budget = BUDGET_OPTIONS.find((b) => b.label === budgetFilter);
      if (budget && budget.label !== 'Tous') {
        if (p.priceNum < budget.min || p.priceNum >= budget.max) return false;
      }
      return true;
    });
  }, [available, typeFilter, locationFilter, budgetFilter]);

  const hasActiveFilters =
    typeFilter !== 'Tous' || locationFilter !== 'Toutes' || budgetFilter !== 'Tous';

  const resetFilters = () => {
    setTypeFilter('Tous');
    setLocationFilter('Toutes');
    setBudgetFilter('Tous');
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

            {/* En-tête */}
            <h1 className="text-heading-lg properties-page__header-title">
              Les biens disponibles.
            </h1>
            <p className="text-body-lg properties-page__header-subtitle">
              Appartements et biens mixtes en Hauts-de-France et Île-de-France.
              Dossier complet — diagnostics, historique, garanties — disponible avant la visite.
              Prix de vente : généralement entre 95 000 € et 350 000 €.
            </p>

            {/* Filtres */}
            <div className="properties-page__filters">
              <div className="properties-page__filter-group">
                <label htmlFor="filter-type" className="text-label">
                  Type de bien
                </label>
                <select
                  id="filter-type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="properties-page__select"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="properties-page__filter-group">
                <label htmlFor="filter-location" className="text-label">
                  Localisation
                </label>
                <select
                  id="filter-location"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="properties-page__select"
                >
                  {LOCATION_OPTIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="properties-page__filter-group">
                <label htmlFor="filter-budget" className="text-label">
                  Budget
                </label>
                <select
                  id="filter-budget"
                  value={budgetFilter}
                  onChange={(e) => setBudgetFilter(e.target.value)}
                  className="properties-page__select"
                >
                  {BUDGET_OPTIONS.map((b) => (
                    <option key={b.label} value={b.label}>{b.label}</option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="properties-page__reset-btn"
                  aria-label="Réinitialiser tous les filtres"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            {/* États */}
            {loading ? (
              <div className="properties-page__state">
                <p className="text-body-lg">Chargement des biens…</p>
              </div>
            ) : error ? (
              <div className="properties-page__state">
                <p className="text-body-lg">
                  Une erreur est survenue lors du chargement des biens.
                </p>
              </div>
            ) : allProperties.length === 0 ? (
              <div className="properties-page__state">
                <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-sm)' }}>
                  Nos biens partent vite.
                </p>
                <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  Laissez-nous votre contact — nous vous prévenons avant la mise en ligne.
                </p>
                <Link to="/contact" className="properties-page__state-cta">
                  Être notifié en avant-première
                </Link>
              </div>
            ) : filtered.length > 0 ? (
              <div className="properties-page__grid">
                {filtered.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="properties-page__state">
                <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  Aucun bien disponible avec ces critères.
                </p>
                <button
                  onClick={resetFilters}
                  className="properties-page__state-cta properties-page__state-cta--outline"
                  aria-label="Réinitialiser les filtres"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}

            {/* Vendus */}
            {sold.length > 0 && (
              <div className="properties-page__sold-section">
                <h2 className="text-heading-md" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
                  Vendus.
                </h2>
                <div className="properties-page__sold-grid">
                  {sold.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Bandeau vendeur */}
        <section className="section-padding properties-page__seller-band">
          <div className="container">
            <p className="text-body-lg properties-page__seller-title">
              Vous avez un bien à céder ?
            </p>
            <p className="text-body-md properties-page__seller-sub">
              Offre ferme sous 7 jours. Fonds propres. Aucun mandat.
            </p>
            <Link to="/vendre" className="properties-page__seller-cta">
              Soumettre mon dossier
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
