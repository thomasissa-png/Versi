import { useState, useEffect } from 'react';

/**
 * Hook : récupère un article de blog par son slug.
 * @param {string} slug
 * @returns {{ article: object|null, loading: boolean, error: string|null }}
 */
export default function useBlogArticle(slug) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError('Slug manquant.');
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function fetchArticle() {
      try {
        const res = await fetch(`/api/blog/${encodeURIComponent(slug)}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setError(data.error || 'Article non trouvé.');
          setArticle(null);
        } else {
          setArticle(data.article);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        if (err.name !== 'AbortError') {
          setError('Erreur de connexion. Veuillez réessayer.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchArticle();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug]);

  return { article, loading, error };
}
