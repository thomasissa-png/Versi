import { useState, useEffect } from 'react';

export function useProject(id) {
  const [project, setProject] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/public/projects/${encodeURIComponent(id)}`)
      .then((r) => {
        if (r.status === 404) {
          setProject(null);
          setPhotos([]);
          setLoading(false);
          return null;
        }
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        const p = data.project;
        setProject({
          ...p,
          buyPrice: p.buy_price,
          worksAmount: p.works_amount,
          sellPrice: p.sell_price,
          offerDelay: p.offer_delay,
          signatureDelay: p.signature_delay,
          sortOrder: p.sort_order,
        });
        setPhotos(data.photos || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  return { project, photos, loading, error };
}
