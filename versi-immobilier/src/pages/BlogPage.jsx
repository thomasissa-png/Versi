import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import { useBlogArticles } from '../hooks/useBlogArticles.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

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
  const { ref, isVisible } = useFadeIn();
  const { ref: gridRef, isVisible: gridVisible } = useFadeIn();

  return (
    <>
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

        {/* Articles grid */}
        <section className="section-padding" style={{ background: 'var(--color-bg-primary)', paddingTop: 0 }} ref={gridRef}>
          <div className={`container ${gridVisible ? 'fade-in' : 'fade-hidden'}`}>
            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-4xl) var(--spacing-lg)',
                color: 'var(--color-text-muted)',
              }}>
                <p className="text-body-lg">Chargement des articles...</p>
              </div>
            ) : error ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-4xl) var(--spacing-lg)',
                color: 'var(--color-text-muted)',
              }}>
                <p className="text-body-lg">Une erreur est survenue lors du chargement des articles.</p>
              </div>
            ) : articles.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))',
                gap: 'var(--spacing-xl)',
              }}>
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
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
                  padding: '12px 32px',
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
              Vous avez un bien à céder ?
            </p>
            <p className="text-body-md" style={{ color: 'var(--color-text-inverse)', opacity: 'var(--opacity-readable)', marginBottom: 'var(--spacing-lg)' }}>
              Offre ferme sous 7 jours. Fonds propres. Aucun mandat.
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
              Soumettre mon dossier
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
    <article style={{
      background: 'var(--color-bg-primary)',
      borderRadius: 'var(--card-radius)',
      overflow: 'hidden',
      border: '1px solid var(--color-border, #e5e5e5)',
      transition: 'box-shadow 0.2s ease',
    }}>
      <Link to={`/blog/${article.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {article.cover_image ? (
          <div style={{
            width: '100%',
            height: '220px',
            overflow: 'hidden',
          }}>
            <img
              src={article.cover_image}
              alt={article.title}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        ) : (
          <div style={{
            width: '100%',
            height: '220px',
            background: 'var(--color-bg-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ color: 'var(--color-text-inverse)', opacity: 0.3, fontSize: '2rem' }}>V</span>
          </div>
        )}
        <div style={{ padding: 'var(--spacing-lg)' }}>
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 'var(--spacing-sm)' }}>
              {tags.map((tag, i) => (
                <span key={i} className="text-label" style={{
                  background: 'var(--color-bg-dark)',
                  color: 'var(--color-text-inverse)',
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          <h2 className="text-heading-sm" style={{ marginBottom: 'var(--spacing-sm)' }}>
            {article.title}
          </h2>
          <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)' }}>
            {article.excerpt}
          </p>
          <span className="text-label" style={{ color: 'var(--color-text-muted)' }}>
            {formatDate(article.published_at)}
          </span>
        </div>
      </Link>
    </article>
  );
}
