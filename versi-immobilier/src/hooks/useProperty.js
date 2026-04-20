import { useState, useEffect } from 'react';

export function useProperty(id) {
  const [property, setProperty] = useState(null);
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

    fetch(`/api/public/properties/${encodeURIComponent(id)}`)
      .then((r) => {
        if (r.status === 404) {
          setProperty(null);
          setPhotos([]);
          setLoading(false);
          return null;
        }
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        const p = data.property;
        setProperty({
          ...p,
          priceNum: p.price_num,
          priceNote: p.price_note,
          nearbyTransport: p.nearby_transport,
          nearbyAmenities: p.nearby_amenities,
          dpeNote: p.dpe_note,
          renovationYear: p.renovation_year,
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

  return { property, photos, loading, error };
}
