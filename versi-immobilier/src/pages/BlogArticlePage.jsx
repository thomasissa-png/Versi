import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import { useBlogArticle } from '../hooks/useBlogArticle.js';
import { useFadeIn } from '../hooks/useFadeIn.js';

// ---------------------------------------------------------------------------
// Simple Markdown → HTML parser (no external dependency)
// Supports: h2, h3, h4, bold, italic, links, unordered lists, ordered lists,
//           blockquotes, images, code (inline), horizontal rules, paragraphs
// ---------------------------------------------------------------------------
function parseMarkdown(md) {
  if (!md) return '';

  // Normalize line endings
  let text = md.replace(/\r\n/g, '\n');

  // Escape HTML (will unescape markdown constructs below)
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Split into lines for block-level parsing
  const lines = text.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Headings
    if (/^####\s+(.+)$/.test(line)) {
      result.push(`<h4>${inlineMarkdown(line.replace(/^####\s+/, ''))}</h4>`);
      i++;
      continue;
    }
    if (/^###\s+(.+)$/.test(line)) {
      result.push(`<h3>${inlineMarkdown(line.replace(/^###\s+/, ''))}</h3>`);
      i++;
      continue;
    }
    if (/^##\s+(.+)$/.test(line)) {
      result.push(`<h2>${inlineMarkdown(line.replace(/^##\s+/, ''))}</h2>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      result.push('<hr>');
      i++;
      continue;
    }

    // Blockquote
    if (/^&gt;\s?(.*)$/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^&gt;\s?(.*)$/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^&gt;\s?/, ''));
        i++;
      }
      result.push(`<blockquote>${quoteLines.map((l) => `<p>${inlineMarkdown(l)}</p>`).join('')}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[-*]\s+(.+)$/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+(.+)$/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      result.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+(.+)$/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+(.+)$/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      result.push(`<ol>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ol>`);
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-special lines
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{2,4}\s/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^&gt;\s?/.test(lines[i]) &&
      !/^---+$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      result.push(`<p>${inlineMarkdown(paraLines.join('<br>'))}</p>`);
    }
  }

  return result.join('');
}

// Inline markdown: bold, italic, links, images, inline code
function inlineMarkdown(text) {
  let s = text;
  // Images: ![alt](src)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" style="max-width:100%;border-radius:8px;margin:8px 0;">');
  // Links: [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // Bold + italic: ***text***
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold: **text**
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code: `code`
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BlogArticlePage() {
  const { slug } = useParams();
  const { article, loading, error } = useBlogArticle(slug);
  const { ref, isVisible } = useFadeIn();

  // JSON-LD Schema.org BlogPosting
  useEffect(() => {
    if (!article) return;

    const siteUrl = window.location.origin;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.excerpt,
      author: [
        { '@type': 'Organization', name: 'Versi Immobilier', url: siteUrl },
        { '@type': 'Person', name: 'Maxime Lemoine' },
        { '@type': 'Person', name: 'Thomas Issa' },
        { '@type': 'Person', name: 'Carl Standertskjold-Nordenstam' },
      ],
      publisher: {
        '@type': 'Organization',
        name: 'Versi Immobilier',
        url: siteUrl,
      },
      datePublished: article.published_at || article.created_at,
      dateModified: article.updated_at || article.published_at || article.created_at,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${siteUrl}/blog/${article.slug}`,
      },
    };

    if (article.cover_image) {
      jsonLd.image = article.cover_image;
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    script.id = 'blog-jsonld';
    document.head.appendChild(script);

    // Update page title
    const prevTitle = document.title;
    document.title = `${article.title} — Versi Immobilier`;

    return () => {
      const el = document.getElementById('blog-jsonld');
      if (el) el.remove();
      document.title = prevTitle;
    };
  }, [article]);

  const tags = article && Array.isArray(article.tags) ? article.tags : [];
  const htmlContent = article ? parseMarkdown(article.content) : '';

  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        <section className="section-padding" ref={ref}>
          <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`} style={{ maxWidth: '780px', margin: '0 auto' }}>
            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-4xl) var(--spacing-lg)',
                color: 'var(--color-text-muted)',
              }}>
                <p className="text-body-lg">Chargement de l'article...</p>
              </div>
            ) : error || !article ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-4xl) var(--spacing-lg)',
                color: 'var(--color-text-muted)',
              }}>
                <p className="text-body-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  Article introuvable.
                </p>
                <Link to="/blog" className="text-cta" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'var(--color-charcoal-950)',
                  color: 'var(--color-calcaire-50)',
                  padding: '12px 32px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  minHeight: '44px',
                }}>
                  Tous les articles
                </Link>
              </div>
            ) : (
              <>
                {/* Back link */}
                <Link to="/blog" style={{
                  color: 'var(--color-text-muted)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  display: 'inline-block',
                  marginBottom: 'var(--spacing-lg)',
                }}>
                  ← Tous les articles
                </Link>

                {/* Meta */}
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  {tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 'var(--spacing-sm)' }}>
                      {tags.map((tag, i) => (
                        <span key={i} className="blog-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="text-label" style={{ color: 'var(--color-text-muted)' }}>
                    {formatDate(article.published_at)} — {article.author}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  {article.title}
                </h1>

                {/* Cover image */}
                {article.cover_image && (
                  <div style={{
                    width: '100%',
                    borderRadius: 'var(--card-radius)',
                    overflow: 'hidden',
                    marginBottom: 'var(--spacing-xl)',
                  }}>
                    <img
                      src={article.cover_image}
                      alt={article.title}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                      }}
                    />
                  </div>
                )}

                {/* Content */}
                <div
                  className="blog-article-content"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                  style={{
                    lineHeight: 1.8,
                    fontSize: '1.05rem',
                    color: 'var(--color-text-primary)',
                  }}
                />

                {/* Footer navigation */}
                <div style={{
                  borderTop: '1px solid var(--color-border)',
                  marginTop: 'var(--spacing-2xl)',
                  paddingTop: 'var(--spacing-lg)',
                }}>
                  <Link to="/blog" style={{
                    color: 'var(--color-text-muted)',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                  }}>
                    ← Tous les articles
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
