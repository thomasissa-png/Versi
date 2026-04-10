import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import adminFetch from './adminFetch.js';
import './admin.css';

const TYPES = ['Immeuble de rapport', 'Actif mixte', 'Maison', 'Appartement', 'Local commercial', 'Autre'];
const STATUS_VALUES = ['completed', 'in-progress', 'archive'];
const STATUS_LABELS = { completed: 'Terminée', 'in-progress': 'En cours', archive: 'Archivée' };

const EMPTY_FORM = {
  title: '',
  city: '',
  type: 'Immeuble de rapport',
  surface: '',
  units: '',
  status: 'completed',
  buy_price: '',
  works_amount: '',
  sell_price: '',
  offer_delay: '',
  signature_delay: '',
  duration: '',
  description: '',
  featured: false,
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminRealisationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      adminFetch(`/api/admin/projects/${id}`)
        .then((data) => {
          const p = data.project;
          setForm({
            title: p.title || '',
            city: p.city || '',
            type: p.type || 'Immeuble de rapport',
            surface: p.surface || '',
            units: p.units != null ? String(p.units) : '',
            status: p.status || 'completed',
            buy_price: p.buy_price || '',
            works_amount: p.works_amount || '',
            sell_price: p.sell_price || '',
            offer_delay: p.offer_delay != null ? String(p.offer_delay) : '',
            signature_delay: p.signature_delay != null ? String(p.signature_delay) : '',
            duration: p.duration || '',
            description: p.description || '',
            featured: Boolean(p.featured),
          });
          setPhotos(data.photos || []);
        })
        .catch(() => setError('Erreur de chargement de la réalisation.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handlePhotoSelect(e) {
    const files = Array.from(e.target.files || []);
    setPhotoError('');

    for (const file of files) {
      if (file.size > 5242880) {
        setPhotoError(`"${file.name}" dépasse 5 Mo. Fichier ignoré.`);
        continue;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setPhotoError(`"${file.name}" : format non supporté. Utilisez JPEG, PNG ou WebP.`);
        continue;
      }

      try {
        const data = await fileToBase64(file);
        setNewPhotos((prev) => [...prev, {
          data,
          filename: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        }]);
      } catch {
        setPhotoError(`Erreur de lecture de "${file.name}".`);
      }
    }

    e.target.value = '';
  }

  function removeNewPhoto(index) {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleDeleteExistingPhoto(photoId) {
    if (!window.confirm('Supprimer cette photo ?')) return;
    try {
      await adminFetch(`/api/admin/projects/${id}/photos/${photoId}`, { method: 'DELETE' });
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      alert('Erreur lors de la suppression de la photo.');
    }
  }

  function validate() {
    const required = ['title', 'city', 'type', 'surface', 'description'];
    for (const field of required) {
      if (!form[field].trim()) {
        return `Le champ "${field}" est obligatoire.`;
      }
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    const body = {
      ...form,
      units: form.units ? Number(form.units) : null,
      offer_delay: form.offer_delay ? Number(form.offer_delay) : null,
      signature_delay: form.signature_delay ? Number(form.signature_delay) : null,
    };

    try {
      let projectId = id;

      if (isEdit) {
        await adminFetch(`/api/admin/projects/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        const result = await adminFetch('/api/admin/projects', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        projectId = result.project?.id;
      }

      if (projectId && newPhotos.length > 0) {
        for (const photo of newPhotos) {
          await adminFetch(`/api/admin/projects/${projectId}/photos`, {
            method: 'POST',
            body: JSON.stringify(photo),
          });
        }
      }

      navigate('/admin/realisations');
    } catch {
      setError('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="admin-loading">Chargement...</p>;
  }

  return (
    <div>
      <div className="admin-section-header">
        <h2>{isEdit ? 'Modifier la réalisation' : 'Ajouter une réalisation'}</h2>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Titre <span className="required">*</span></label>
          <input type="text" name="title" value={form.title} onChange={handleChange} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Ville <span className="required">*</span></label>
            <input type="text" name="city" value={form.city} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Type <span className="required">*</span></label>
            <select name="type" value={form.type} onChange={handleChange}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Surface <span className="required">*</span></label>
            <input type="text" name="surface" value={form.surface} onChange={handleChange} placeholder="450 m²" />
          </div>
          <div className="form-group">
            <label>Nombre de lots</label>
            <input type="number" name="units" value={form.units} onChange={handleChange} min="0" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Statut</label>
            <select name="status" value={form.status} onChange={handleChange}>
              {STATUS_VALUES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>&nbsp;</label>
            <div className="checkbox-group">
              <input type="checkbox" name="featured" id="featured" checked={form.featured} onChange={handleChange} />
              <label htmlFor="featured" style={{ margin: 0 }}>Mise en avant (Featured)</label>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Prix d'achat</label>
            <input type="text" name="buy_price" value={form.buy_price} onChange={handleChange} placeholder="380 000 €" />
          </div>
          <div className="form-group">
            <label>Coût travaux</label>
            <input type="text" name="works_amount" value={form.works_amount} onChange={handleChange} placeholder="120 000 €" />
          </div>
          <div className="form-group">
            <label>Prix de vente</label>
            <input type="text" name="sell_price" value={form.sell_price} onChange={handleChange} placeholder="620 000 €" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Délai offre (jours)</label>
            <input type="number" name="offer_delay" value={form.offer_delay} onChange={handleChange} min="0" />
          </div>
          <div className="form-group">
            <label>Délai signature (jours)</label>
            <input type="number" name="signature_delay" value={form.signature_delay} onChange={handleChange} min="0" />
          </div>
          <div className="form-group">
            <label>Durée opération</label>
            <input type="text" name="duration" value={form.duration} onChange={handleChange} placeholder="8 mois" />
          </div>
        </div>

        <div className="form-group">
          <label>Description <span className="required">*</span></label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={6} />
        </div>

        {/* Photos existantes (mode édition) */}
        {isEdit && photos.length > 0 && (
          <div className="form-group">
            <label>Photos existantes</label>
            <div className="photo-grid">
              {photos.map((photo) => (
                <div key={photo.id} className="photo-item">
                  <img src={photo.data} alt={photo.filename} />
                  <button
                    type="button"
                    className="photo-remove"
                    onClick={() => handleDeleteExistingPhoto(photo.id)}
                    title="Supprimer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ajout de nouvelles photos */}
        <div className="form-group">
          <label>Ajouter des photos (max 5 Mo/photo — JPEG, PNG, WebP)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handlePhotoSelect}
          />
          {photoError && <p className="form-error">{photoError}</p>}
          {newPhotos.length > 0 && (
            <div className="photo-grid">
              {newPhotos.map((photo, i) => (
                <div key={i} className="photo-item">
                  <img src={photo.data} alt={photo.filename} />
                  <button
                    type="button"
                    className="photo-remove"
                    onClick={() => removeNewPhoto(i)}
                    title="Retirer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <Link to="/admin/realisations" className="btn">Annuler</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
