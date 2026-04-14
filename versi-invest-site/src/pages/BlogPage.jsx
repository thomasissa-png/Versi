import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import useBlogArticles from '../hooks/useBlogArticles.js';
import './BlogPage.css';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function ArticleCard({ article }) {
  return (
    <Link to={`/blog/${article.slug}`} className="blog-card">
      {article.image_url ? (
        <img
          className="blog-card__image"
          src={article.image_url}
          alt=""
          loading="lazy"
        />
      ) : (
        <div className="blog-card__image--placeholder" aria-hidden="true">
          Versi Invest
        </div>
      )}
      <div className="blog-card__body">
        <div className="blog-card__meta">
          <span>{article.author || 'Versi Invest'}</span>
          <span>—</span>
          <time dateTime={article.published_at || article.created_at}>
            {formatDate(article.published_at || article.created_at)}
          </time>
        </div>
        <h2 className="blog-card__title">{article.title}</h2>
        {article.excerpt && (
          <p className="blog-card__excerpt">{article.excerpt}</p>
        )}
        <span className="blog-card__read" aria-hidden="true">
          Lire l'article
        </span>
      </div>
    </Link>
  );
}

export default function BlogPage() {
  const { articles, loading, error } = useBlogArticles();

  return (
    <>
      <PageHead
        title="Blog — Versi Invest"
        description="Ressources investisseurs : analyses de marché, cas concrets et points de méthode rédigés par les fondateurs Versi Invest."
      />
      <Nav />
      <main>
        {/* --- Header --- */}
        <header className="page-header">
          <div className="container">
            <h1 className="page-header__title">Ressources investisseurs.</h1>
            <p className="page-header__intro">
              Des analyses de marché, des cas concrets et des points de méthode — rédigés par les
              fondateurs Versi Invest. Pas de contenu générique sur &laquo;&nbsp;comment devenir
              rentier&nbsp;&raquo;. Des contenus pour les investisseurs qui veulent comprendre
              comment un dossier se construit.
            </p>
          </div>
        </header>

        {/* --- Content --- */}
        <section className="blog section-padding" aria-label="Articles de blog">
          <div className="container">
            {loading && (
              <div className="blog__loading" role="status">
                Chargement des articles...
              </div>
            )}

            {error && !loading && (
              <div className="blog__error" role="alert">
                <p className="blog__error-text">{error}</p>
                <button
                  className="blog__error-retry"
                  onClick={() => window.location.reload()}
                  type="button"
                >
                  Réessayer
                </button>
              </div>
            )}

            {!loading && !error && articles.length === 0 && (
              <div className="blog__empty">
                <p className="blog__empty-text">
                  Les premiers articles arrivent prochainement. En attendant, inscrivez-vous sur la
                  liste d'attente pour être notifié de leur publication — et accéder aux biens
                  disponibles en priorité.
                </p>
                <Link
                  to="/contact"
                  className="page-cta__btn"
                  style={{ background: 'var(--color-accent-blue)', color: 'var(--color-text-inverse)' }}
                >
                  S'inscrire sur la liste d'attente
                </Link>
              </div>
            )}

            {!loading && !error && articles.length > 0 && (
              <div className="blog__grid">
                {articles.map((article) => (
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
