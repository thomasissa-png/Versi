import { Link, useParams } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import useBlogArticle from '../hooks/useBlogArticle.js';
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

/**
 * Convertit le contenu texte brut en HTML basique.
 * Supporte les paragraphes (double saut de ligne) et les sous-titres (## / ###).
 */
function renderContent(content) {
  if (!content) return null;

  const paragraphs = content.split(/\n\n+/);

  return paragraphs.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('### ')) {
      return <h3 key={i}>{trimmed.slice(4)}</h3>;
    }
    if (trimmed.startsWith('## ')) {
      return <h2 key={i}>{trimmed.slice(3)}</h2>;
    }

    return <p key={i}>{trimmed}</p>;
  });
}

export default function BlogArticlePage() {
  const { slug } = useParams();
  const { article, loading, error } = useBlogArticle(slug);

  return (
    <>
      <PageHead
        title={
          article
            ? `${article.title} — Versi Invest`
            : 'Article — Versi Invest'
        }
        description={article?.excerpt || 'Article Versi Invest'}
      />
      <Nav />
      <main>
        {/* --- Header --- */}
        <header className="page-header">
          <div className="container">
            {loading && (
              <h1 className="page-header__title">Chargement...</h1>
            )}
            {error && !loading && (
              <h1 className="page-header__title">Article non trouvé</h1>
            )}
            {article && !loading && (
              <>
                <h1 className="page-header__title">{article.title}</h1>
                {article.excerpt && (
                  <p className="page-header__intro">{article.excerpt}</p>
                )}
              </>
            )}
          </div>
        </header>

        {/* --- Article content --- */}
        <section className="article section-padding" aria-label="Article">
          <div className="container">
            <div className="article__content">
              {loading && (
                <div className="blog__loading" role="status">
                  Chargement de l'article...
                </div>
              )}

              {error && !loading && (
                <div className="blog__error" role="alert">
                  <p className="blog__error-text">{error}</p>
                  <Link
                    to="/blog"
                    className="article__back"
                  >
                    &#8592; Retour au blog
                  </Link>
                </div>
              )}

              {article && !loading && (
                <>
                  <div className="article__meta">
                    <span>{article.author || 'Versi Invest'}</span>
                    <span>—</span>
                    <time dateTime={article.published_at || article.created_at}>
                      {formatDate(article.published_at || article.created_at)}
                    </time>
                  </div>

                  <div className="article__body">
                    {renderContent(article.content)}
                  </div>

                  <Link to="/blog" className="article__back">
                    &#8592; Retour au blog
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
