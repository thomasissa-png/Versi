import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import useBlogArticle from '../hooks/useBlogArticle.js';
import './BlogPage.css';

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

/**
 * Markdown → HTML renderer (no external dependency, pattern versi-immobilier).
 * Supports: h2-h4, bold, italic, links, lists, blockquotes, code, hr, images, tables.
 */
function renderMarkdown(md) {
  if (!md) return null;

  // Strip H1 if present (already displayed as page title)
  const content = md.replace(/^# [^\n]+\n*/m, '');

  const blocks = content.split(/\n\n+/);
  const elements = [];

  blocks.forEach((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      elements.push(<hr key={i} />);
      return;
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      elements.push(<h4 key={i}>{inlineMarkdown(trimmed.slice(5))}</h4>);
      return;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(<h3 key={i}>{inlineMarkdown(trimmed.slice(4))}</h3>);
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(<h2 key={i}>{inlineMarkdown(trimmed.slice(3))}</h2>);
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      const text = trimmed.replace(/^> /gm, '');
      elements.push(<blockquote key={i}><p>{inlineMarkdown(text)}</p></blockquote>);
      return;
    }

    // Unordered list
    if (/^[-*] /.test(trimmed)) {
      const items = trimmed.split('\n').filter((l) => /^[-*] /.test(l.trim()));
      elements.push(
        <ul key={i}>
          {items.map((item, j) => (
            <li key={j}>{inlineMarkdown(item.replace(/^[-*] /, ''))}</li>
          ))}
        </ul>
      );
      return;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const code = trimmed.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '');
      elements.push(
        <pre key={i}><code>{code}</code></pre>
      );
      return;
    }

    // Table
    if (trimmed.includes('|') && trimmed.split('\n').length >= 2) {
      const rows = trimmed.split('\n').filter((r) => r.trim() && !r.trim().match(/^\|[-:|]+\|$/));
      if (rows.length >= 1) {
        const headerCells = rows[0].split('|').map((c) => c.trim()).filter(Boolean);
        const bodyRows = rows.slice(1);
        elements.push(
          <table key={i}>
            <thead>
              <tr>{headerCells.map((c, j) => <th key={j}>{inlineMarkdown(c)}</th>)}</tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => {
                const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
                return <tr key={ri}>{cells.map((c, ci) => <td key={ci}>{inlineMarkdown(c)}</td>)}</tr>;
              })}
            </tbody>
          </table>
        );
        return;
      }
    }

    // Default: paragraph
    elements.push(<p key={i}>{inlineMarkdown(trimmed)}</p>);
  });

  return elements;
}

function inlineMarkdown(text) {
  if (!text) return text;
  // Bold
  let result = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Inline code
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  if (result === text) return text;
  return <span dangerouslySetInnerHTML={{ __html: result }} />;
}

export default function BlogArticlePage() {
  const { slug } = useParams();
  const { article, loading, error } = useBlogArticle(slug);
  const tags = article ? parseTags(article.tags) : [];

  return (
    <>
      <PageHead
        title={article ? `${article.title} — Versi Invest` : 'Article — Versi Invest'}
        description={article?.excerpt || 'Article Versi Invest'}
      />

      {/* BlogPosting Schema.org */}
      {article && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: article.title,
              description: article.excerpt || '',
              author: {
                '@type': 'Organization',
                name: article.author || 'Versi Invest',
                url: 'https://versi-invest.fr',
              },
              publisher: { '@id': 'https://versi-invest.fr/#organization' },
              datePublished: article.published_at || article.created_at,
              dateModified: article.updated_at || article.published_at || article.created_at,
              mainEntityOfPage: `https://versi-invest.fr/blog/${slug}`,
              inLanguage: 'fr-FR',
            })}
          </script>
        </Helmet>
      )}

      <a href="#main-content" className="skip-nav">Aller au contenu principal</a>
      <Nav />
      <main id="main-content">
        <header className="page-header">
          <div className="container">
            {loading && <h1 className="page-header__title">Chargement...</h1>}
            {error && !loading && <h1 className="page-header__title">Article non trouvé</h1>}
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

        <section className="article section-padding" aria-label="Article">
          <div className="container">
            <div className="blog-article-content">
              {loading && (
                <div role="status" style={{ textAlign: 'center', padding: 'var(--spacing-2xl) 0' }}>
                  Chargement de l'article...
                </div>
              )}

              {error && !loading && (
                <div className="blog__error" role="alert">
                  <p>{error}</p>
                  <Link to="/blog" className="article__back">← Retour au blog</Link>
                </div>
              )}

              {article && !loading && (
                <>
                  <div className="article__meta">
                    <span>{article.author || 'Versi Invest'}</span>
                    <span className="article__meta-sep">·</span>
                    <time dateTime={article.published_at || article.created_at}>
                      {formatDate(article.published_at || article.created_at)}
                    </time>
                  </div>

                  {tags.length > 0 && (
                    <div className="article__tags">
                      {tags.map((t) => (
                        <span key={t} className="blog-tag">{t}</span>
                      ))}
                    </div>
                  )}

                  <div className="article__body">
                    {renderMarkdown(article.content)}
                  </div>

                  {/* CTA box */}
                  <div className="article__cta-box">
                    <p className="article__cta-text">
                      Vous avez un projet d'investissement locatif ? Les fondateurs Versi Invest vous répondent en direct.
                    </p>
                    <Link to="/contact" className="page-cta__btn">
                      S'inscrire sur la liste d'attente
                    </Link>
                  </div>

                  <div className="article__nav">
                    <Link to="/blog" className="article__back">← Tous les articles</Link>
                  </div>
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
