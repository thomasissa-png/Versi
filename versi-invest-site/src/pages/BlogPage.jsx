import { useState } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import useBlogArticles from '../hooks/useBlogArticles.js';
import './BlogPage.css';

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'rendement', label: 'Rendement & cashflow', match: ['rendement', 'cashflow', 'investissement', 'charges'] },
  { key: 'zones', label: 'Zones & marchés', match: ['Lille', 'Hauts-de-France', 'Roubaix', 'Tourcoing', 'immeubles'] },
  { key: 'fiscalite', label: 'Fiscalité', match: ['LMNP', 'SCI', 'fiscalité', 'impôt', 'amortissement'] },
  { key: 'methode', label: 'Méthode Versi', match: ['méthode', 'fondateur', 'simulation', 'scénario'] },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function matchesFilter(article, filter) {
  if (filter.key === 'all') return true;
  const tags = parseTags(article.tags);
  const text = `${article.title} ${article.excerpt || ''} ${tags.join(' ')}`.toLowerCase();
  return filter.match.some((m) => text.includes(m.toLowerCase()));
}

function SkeletonCard() {
  return (
    <div className="blog-card-dark blog-card-dark--skeleton" aria-hidden="true">
      <div className="skeleton-bar-dark" style={{ height: '1.2rem', width: '80%', marginBottom: 'var(--spacing-sm)' }} />
      <div className="skeleton-bar-dark" style={{ height: '0.875rem', width: '100%', marginBottom: 'var(--spacing-xs)' }} />
      <div className="skeleton-bar-dark" style={{ height: '0.875rem', width: '60%' }} />
    </div>
  );
}

function ArticleCard({ article }) {
  const tags = parseTags(article.tags);

  return (
    <Link to={`/blog/${article.slug}`} className="blog-card-dark">
      <div className="blog-card-dark__link">
        <h2 className="blog-card-dark__title">{article.title}</h2>
        {article.excerpt && (
          <p className="blog-card-dark__excerpt">{article.excerpt}</p>
        )}
        <div className="blog-card-dark__footer">
          <time className="blog-card-dark__date" dateTime={article.published_at || article.created_at}>
            {formatDate(article.published_at || article.created_at)}
          </time>
          <span className="blog-card-dark__read">Lire →</span>
        </div>
        {tags.length > 0 && (
          <div className="blog-card-dark__tags">
            {tags.map((t) => (
              <span key={t} className="blog-tag-dark">{t}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function BlogPage() {
  const { articles, loading, error } = useBlogArticles();
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = articles.filter((a) => {
    const filter = FILTERS.find((f) => f.key === activeFilter);
    return filter ? matchesFilter(a, filter) : true;
  });

  return (
    <>
      <PageHead
        title="Blog investissement locatif — Versi Invest"
        description="Rendement, cashflow, zones Hauts-de-France et IDF. Analyses terrain par les fondateurs."
      />
      <a href="#main-content" className="skip-nav">Aller au contenu principal</a>
      <Nav />
      <main id="main-content">
        <header className="page-header">
          <div className="container">
            <h1 className="page-header__title">Ressources investisseurs.</h1>
            <p className="page-header__intro">
              Analyses de marché, cas concrets, points de méthode — rédigés par les fondateurs Versi Invest. Pour les investisseurs qui veulent comprendre comment un dossier se construit.
            </p>
          </div>
        </header>

        <section className="blog section-padding" aria-label="Articles de blog">
          <div className="container">
            {/* Filters */}
            <div className="blog-filters">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`blog-filter-pill${activeFilter === f.key ? ' blog-filter-pill--active' : ''}`}
                  onClick={() => setActiveFilter(f.key)}
                  type="button"
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div className="blog__grid" role="status" aria-label="Chargement">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="blog__error" role="alert">
                <p>{error}</p>
                <button className="blog__error-retry" onClick={() => window.location.reload()} type="button">
                  Réessayer
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && filtered.length === 0 && (
              <div className="blog__empty">
                <p className="blog__empty-text">
                  {activeFilter === 'all'
                    ? 'Les premiers articles arrivent prochainement.'
                    : 'Aucun article dans cette catégorie pour le moment.'}
                </p>
                <Link to="/contact" className="page-cta__btn">
                  S'inscrire sur la liste d'attente
                </Link>
              </div>
            )}

            {/* Articles grid */}
            {!loading && !error && filtered.length > 0 && (
              <div className="blog__grid">
                {filtered.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
