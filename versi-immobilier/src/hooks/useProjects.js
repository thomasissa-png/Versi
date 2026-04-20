import { useState, useEffect } from 'react';

export function useProjects(status = 'completed') {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/public/projects?status=${encodeURIComponent(status)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const mapped = (data.projects || []).map((p) => ({
          ...p,
          buyPrice: p.buy_price,
          worksAmount: p.works_amount,
          sellPrice: p.sell_price,
          offerDelay: p.offer_delay,
          signatureDelay: p.signature_delay,
          sortOrder: p.sort_order,
        }));
        setProjects(mapped);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [status]);

  return { projects, loading, error };
}
