import { useState, useEffect } from 'react';

export function useProperties(status = 'disponible') {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/public/properties?status=${encodeURIComponent(status)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const mapped = (data.properties || []).map((p) => ({
          ...p,
          priceNum: p.price_num,
          priceNote: p.price_note,
          nearbyTransport: p.nearby_transport,
          nearbyAmenities: p.nearby_amenities,
          dpeNote: p.dpe_note,
          renovationYear: p.renovation_year,
          sortOrder: p.sort_order,
        }));
        setProperties(mapped);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [status]);

  return { properties, loading, error };
}
