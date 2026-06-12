import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import { useBlogArticles } from '../hooks/useBlogArticles.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'acheter', label: 'Acheter rénové', match: ['acquéreur', 'garanties', 'rénovation'] },
  { key: 'financement', label: 'Financement', match: ['achat immobilier', 'financement', 'primo', 'PTZ', 'DPE', 'énergie'] },
  { key: 'mdb', label: 'Marchand de biens', match: ['marchand de biens', 'précommercialisation', 'questions', 'guide'] },
  { key: 'investir', label: 'Investir à Lille', match: ['Lille', 'investissement', 'rendement', 'patrimoine', 'Hauts-de-France'] },
  { key: 'vendre', label: 'Vendre son bien', match: ['vendeur', 'vente', 'succession', 'estimation', 'cession'] },
];

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BlogPage() {
  const { articles, loading, error } = useBlogArticles();
  const [activeFilter, setActiveFilter] = useState('all');
  const { ref, isVisible } = useFadeIn();
  const { ref: gridRef, isVisible: gridVisible } = useFadeIn();

  const filteredArticles = useMemo(() => {
    if (activeFilter === 'all') return articles;
    const filter = FILTERS.find((f) => f.key === activeFilter);
    if (!filter || !filter.match) return articles;
    return articles.filter((article) => {
      const tags = Array.isArray(article.tags) ? article.tags : [];
      return tags.some((tag) =>
        filter.match.some((m) => tag.toLowerCase().includes(m.toLowerCase()))
      );
    });
  }, [articles, activeFilter]);

  return (
    <>
      <PageHead
        title="Blog immobilier Lille - Achat, rénovation | Versi Immo"
        description="Guides pratiques pour acheter à Lille : marché, prix au m², garanties d'un marchand de biens, financement. Rédigés par l'équipe Versi."
      />
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        {/* Header */}
        <section className="section-padding" ref={ref}>
          <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
            <h1 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-md)' }}>
              Notre regard.
            </h1>
            <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-2xl)', maxWidth: 'var(--text-max-width-md)' }}>
              Rénovation, investissement, marché immobilier dans les Hauts-de-France. Notre regard sur le terrain.
            </p>
          </div>
        </section>

        {/* Filters + Articles grid */}
        <section className="section-padding" style={{ background: 'var(--color-bg-primary)', paddingTop: 'var(--spacing-xl)' }} ref={gridRef}>
          <div className={`container ${gridVisible ? 'fade-in' : 'fade-hidden'}`}>
            {/* Filter pills */}
            {!loading && !error && articles.length > 0 && (
              <div className="blog-filters" role="tablist" aria-label="Filtrer les articles">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    role="tab"
                    aria-selected={activeFilter === filter.key}
                    className={`blog-filter-pill text-label${activeFilter === filter.key ? ' blog-filter-pill--active' : ''}`}
                    onClick={() => setActiveFilter(filter.key)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))',
                gap: 'var(--spacing-lg)',
              }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="blog-card-dark" style={{ borderRadius: 'var(--card-radius)' }}>
                    <div style={{ padding: 'var(--spacing-xl)' }}>
                      <div className="skeleton-bar-dark" style={{ height: '12px', width: '80px', borderRadius: 'var(--radius-pill)', marginBottom: 'var(--spacing-md)' }} />
                      <div className="skeleton-bar-dark" style={{ height: '20px', width: '85%', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--spacing-sm)' }} />
                      <div className="skeleton-bar-dark" style={{ height: '14px', width: '100%', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--spacing-xs)' }} />
                      <div className="skeleton-bar-dark" style={{ height: '14px', width: '60%', borderRadius: 'var(--radius-sm)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-4xl) var(--spacing-lg)',
              }}>
                <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
                  Une erreur est survenue lors du chargement des articles.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-cta"
                  style={{
                    background: 'var(--color-charcoal-950)',
                    color: 'var(--color-calcaire-50)',
                    padding: 'var(--spacing-sm) var(--spacing-xl)',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Réessayer
                </button>
              </div>
            ) : filteredArticles.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))',
                gap: 'var(--spacing-lg)',
              }}>
                {filteredArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : activeFilter !== 'all' ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-3xl) var(--spacing-lg)',
                color: 'var(--color-text-muted)',
              }}>
                <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-md)' }}>
                  Aucun article dans cette catégorie pour le moment.
                </p>
                <button
                  onClick={() => setActiveFilter('all')}
                  className="text-cta"
                  style={{
                    background: 'var(--color-charcoal-950)',
                    color: 'var(--color-calcaire-50)',
                    padding: 'var(--spacing-sm) var(--spacing-xl)',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Voir tous les articles
                </button>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-4xl) var(--spacing-lg)',
                color: 'var(--color-text-muted)',
              }}>
                <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-sm)' }}>
                  Les premiers articles arrivent bientôt.
                </p>
                <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  En attendant, découvrez nos biens disponibles et nos réalisations.
                </p>
                <Link to="/nos-biens" className="text-cta" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'var(--color-charcoal-950)',
                  color: 'var(--color-calcaire-50)',
                  padding: 'var(--spacing-sm) var(--spacing-xl)',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  minHeight: '44px',
                }}>
                  Voir les biens disponibles
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Bandeau */}
        <section className="section-padding" style={{ background: 'var(--color-bg-dark-alt)', textAlign: 'center' }}>
          <div className="container">
            <p className="text-body-lg" style={{ color: 'var(--color-text-inverse)', marginBottom: 'var(--spacing-sm)' }}>
              Vous cherchez un bien rénové à Lille ?
            </p>
            <p className="text-body-md" style={{ color: 'var(--color-text-inverse)', opacity: 'var(--opacity-readable)', marginBottom: 'var(--spacing-lg)' }}>
              Appartements sélectionnés, diagnostics fournis, vente directe sans frais d'agence.
            </p>
            <Link to="/nos-biens" className="text-cta" style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--color-accent)',
              color: 'var(--color-bg-dark)',
              padding: '16px 48px',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              minHeight: '52px',
            }}>
              Voir les biens disponibles
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function ArticleCard({ article }) {
  const tags = Array.isArray(article.tags) ? article.tags : [];

  return (
    <article className="blog-card-dark">
      <Link to={`/blog/${article.slug}`} className="blog-card-dark__link">
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 'var(--spacing-sm)' }}>
            {tags.map((tag, i) => (
              <span key={i} className="blog-tag-dark">
                {tag}
              </span>
            ))}
          </div>
        )}
        <h2 className="text-heading-sm blog-card-dark__title">
          {article.title}
        </h2>
        <p className="text-body-md blog-card-dark__excerpt">
          {article.excerpt}
        </p>
        <div className="blog-card-dark__footer">
          <span className="text-label blog-card-dark__date">
            {formatDate(article.published_at)}
          </span>
          <span className="text-cta blog-card-dark__read">
            Lire
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ marginLeft: '4px' }}>
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </Link>
    </article>
  );
}
