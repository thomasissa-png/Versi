import { Link } from 'react-router-dom';
import { useBlogArticles } from '../hooks/useBlogArticles.js';
import { useFadeIn } from '../hooks/useFadeIn.js';
import './BlogTeaser.css';

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BlogTeaser() {
  const { articles, loading, error } = useBlogArticles();
  const { ref, isVisible } = useFadeIn();

  // Ne rien afficher si pas d'articles, erreur ou chargement
  if (loading || error || articles.length === 0) return null;

  const displayed = articles.slice(0, 3);

  return (
    <section className="blog-teaser section-padding" ref={ref}>
      <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <p className="text-label blog-teaser__label">Notre regard</p>
        <h2 className="text-heading-lg blog-teaser__title">
          Derniers articles.
        </h2>
        <p className="text-body-lg blog-teaser__subtitle">
          Rénovation, investissement, marché immobilier dans les Hauts-de-France.
        </p>

        <div className="blog-teaser__grid">
          {displayed.map((article) => (
            <article key={article.id} className="blog-teaser__card">
              <Link
                to={`/blog/${article.slug}`}
                className="blog-teaser__card-link"
              >
                <span className="text-label blog-teaser__date">
                  {formatDate(article.published_at)}
                </span>
                <h3 className="text-heading-sm blog-teaser__card-title">
                  {article.title}
                </h3>
                <p className="text-body-md blog-teaser__excerpt">
                  {article.excerpt}
                </p>
                <span className="text-cta blog-teaser__read">
                  Lire l'article
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    style={{ marginLeft: '6px' }}
                  >
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            </article>
          ))}
        </div>

        <div className="blog-teaser__cta-wrap">
          <Link to="/blog" className="blog-teaser__cta text-cta">
            Tous les articles
          </Link>
        </div>
      </div>
    </section>
  );
}
