import { useState, useEffect } from 'react';

/**
 * Hook : récupère la liste des articles de blog publiés.
 * @returns {{ articles: Array, loading: boolean, error: string|null }}
 */
export default function useBlogArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function fetchArticles() {
      try {
        const res = await fetch('/api/blog', { signal: controller.signal });
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setError(data.error || 'Impossible de charger les articles.');
          setArticles([]);
        } else {
          setArticles(data.articles || []);
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

    fetchArticles();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return { articles, loading, error };
}
