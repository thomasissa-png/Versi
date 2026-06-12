import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import adminFetch from './adminFetch.js';
import fileToBase64 from './fileToBase64.js';
import ConfirmModal from './ConfirmModal.jsx';
import './admin.css';

const TYPES = ['Appartement', 'Maison', 'Immeuble', 'Local commercial', 'Local mixte', 'Terrain', 'Autre'];
const DPE_VALUES = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
const TENANCY_VALUES = ['', 'Libre', 'Loué'];
const STATUS_OPTIONS = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'archive', label: 'Archivé' },
  { value: 'vendu', label: 'Vendu' },
];

const EMPTY_FORM = {
  title: '',
  city: '',
  location: '',
  neighborhood: '',
  address: '',
  nearby_transport: '',
  nearby_amenities: '',
  type: 'Appartement',
  surface: '',
  rooms: '',
  floor: '',
  tenancy: '',
  renovation_year: '',
  charges: '',
  price: '',
  price_num: '',
  price_note: '',
  dpe: '',
  dpe_note: '',
  status: 'disponible',
  description: '',
  works: [],
  features: [],
};


export default function AdminBienForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmPhotoDelete, setConfirmPhotoDelete] = useState(null);
  const [success, setSuccess] = useState('');
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      adminFetch(`/api/admin/properties/${id}`)
        .then((data) => {
          const p = data.property;
          setForm({
            title: p.title || '',
            city: p.city || '',
            location: p.location || '',
            neighborhood: p.neighborhood || '',
            address: p.address || '',
            nearby_transport: p.nearby_transport || '',
            nearby_amenities: p.nearby_amenities || '',
            type: p.type || 'Appartement',
            surface: p.surface || '',
            rooms: p.rooms != null ? String(p.rooms) : '',
            floor: p.floor || '',
            tenancy: p.tenancy || '',
            renovation_year: p.renovation_year || '',
            charges: p.charges || '',
            price: p.price || '',
            price_num: p.price_num != null ? String(p.price_num) : '',
            price_note: p.price_note || '',
            dpe: p.dpe || '',
            dpe_note: p.dpe_note || '',
            status: p.status || 'disponible',
            description: p.description || '',
            works: Array.isArray(p.works) ? p.works : [],
            features: Array.isArray(p.features) ? p.features : [],
          });
          setPhotos(data.photos || []);
        })
        .catch(() => setError('Erreur de chargement du bien.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleListAdd(field) {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], ''] }));
  }

  function handleListChange(field, index, value) {
    setForm((prev) => {
      const list = [...prev[field]];
      list[index] = value;
      return { ...prev, [field]: list };
    });
  }

  function handleListRemove(field, index) {
    setForm((prev) => {
      const list = [...prev[field]];
      list.splice(index, 1);
      return { ...prev, [field]: list };
    });
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
    setConfirmPhotoDelete(photoId);
  }

  const handleConfirmPhotoDelete = useCallback(async () => {
    const photoId = confirmPhotoDelete;
    setConfirmPhotoDelete(null);
    try {
      await adminFetch(`/api/admin/properties/${id}/photos/${photoId}`, { method: 'DELETE' });
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      setError('Erreur lors de la suppression de la photo.');
    }
  }, [confirmPhotoDelete, id]);

  function validate() {
    const FIELD_LABELS = {
      title: 'Titre', city: 'Ville', location: 'Localisation',
      type: 'Type de bien', surface: 'Surface', price: 'Prix affiché',
      price_num: 'Prix en chiffres', description: 'Description',
    };
    const required = ['title', 'city', 'location', 'type', 'surface', 'price', 'description'];
    for (const field of required) {
      if (!form[field].trim()) {
        return `Le champ « ${FIELD_LABELS[field] || field} » est obligatoire.`;
      }
    }
    if (form.price_num && isNaN(Number(form.price_num))) {
      return 'Le champ « Prix en chiffres » doit être un nombre.';
    }
    if (form.rooms && isNaN(Number(form.rooms))) {
      return 'Le nombre de pièces doit être un nombre.';
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    const body = {
      ...form,
      rooms: form.rooms ? Number(form.rooms) : null,
      price_num: form.price_num ? Number(form.price_num) : null,
      works: form.works.filter((w) => w.trim()),
      features: form.features.filter((f) => f.trim()),
    };

    try {
      let propertyId = id;

      if (isEdit) {
        await adminFetch(`/api/admin/properties/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        const result = await adminFetch('/api/admin/properties', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        propertyId = result.property?.id;
      }

      if (propertyId && newPhotos.length > 0) {
        await Promise.all(newPhotos.map((photo) =>
          adminFetch(`/api/admin/properties/${propertyId}/photos`, {
            method: 'POST',
            body: JSON.stringify(photo),
          })
        ));
      }

      navigate('/admin/biens');
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
      <Link to="/admin/biens" style={{ color: '#666', textDecoration: 'none', fontSize: '14px', marginBottom: '16px', display: 'inline-block' }}>
        ← Retour aux biens
      </Link>
      <div className="admin-section-header">
        <h2>{isEdit ? 'Modifier le bien' : 'Ajouter un bien'}</h2>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {success && <p className="admin-success">{success}</p>}

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
            <label>Localisation <span className="required">*</span></label>
            <input type="text" name="location" value={form.location} onChange={handleChange} placeholder="Lille, Hauts-de-France" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Quartier</label>
            <input type="text" name="neighborhood" value={form.neighborhood} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Adresse</label>
            <input type="text" name="address" value={form.address} onChange={handleChange} />
          </div>
        </div>

        <div className="form-group">
          <label>Transports à proximité</label>
          <input type="text" name="nearby_transport" value={form.nearby_transport} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Commodités à proximité</label>
          <input type="text" name="nearby_amenities" value={form.nearby_amenities} onChange={handleChange} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Type <span className="required">*</span></label>
            <select name="type" value={form.type} onChange={handleChange}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Surface <span className="required">*</span></label>
            <input type="text" name="surface" value={form.surface} onChange={handleChange} placeholder="68 m²" />
          </div>
          <div className="form-group">
            <label>Pièces</label>
            <input type="number" name="rooms" value={form.rooms} onChange={handleChange} min="0" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Étage</label>
            <input type="text" name="floor" value={form.floor} onChange={handleChange} placeholder="2e étage" />
          </div>
          <div className="form-group">
            <label>Situation locative</label>
            <select name="tenancy" value={form.tenancy} onChange={handleChange}>
              {TENANCY_VALUES.map((t) => <option key={t} value={t}>{t || '-'}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Année de rénovation</label>
            <input type="text" name="renovation_year" value={form.renovation_year} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Charges</label>
            <input type="text" name="charges" value={form.charges} onChange={handleChange} placeholder="120 €/mois" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Prix affiché <span className="required">*</span></label>
            <input type="text" name="price" value={form.price} onChange={handleChange} placeholder="185 000 €" />
          </div>
          <div className="form-group">
            <label>Prix en chiffres (pour le tri)</label>
            <input type="number" name="price_num" value={form.price_num} onChange={handleChange} min="0" placeholder="ex : 185000" />
          </div>
        </div>

        <div className="form-group">
          <label>Note de prix</label>
          <input type="text" name="price_note" value={form.price_note} onChange={handleChange} placeholder="Prix net vendeur - frais de notaire en sus" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>DPE</label>
            <select name="dpe" value={form.dpe} onChange={handleChange}>
              {DPE_VALUES.map((d) => <option key={d} value={d}>{d || '-'}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Note DPE</label>
            <input type="text" name="dpe_note" value={form.dpe_note} onChange={handleChange} />
          </div>
        </div>

        <div className="form-group">
          <label>Statut</label>
          <select name="status" value={form.status} onChange={handleChange}>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Description <span className="required">*</span></label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={6} />
        </div>

        {/* Travaux réalisés */}
        <div className="form-group">
          <label>Travaux réalisés</label>
          <div className="dynamic-list">
            {form.works.map((item, i) => (
              <div key={i} className="dynamic-list-item">
                <input
                  type="text"
                  id={`works-${i}`}
                  aria-label={`Travaux réalisés - item ${i + 1}`}
                  value={item}
                  onChange={(e) => handleListChange('works', i, e.target.value)}
                  placeholder="Ex : Réfection électricité"
                />
                <button type="button" className="btn btn-sm btn-danger" onClick={() => handleListRemove('works', i)}>
                  Suppr.
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-sm" onClick={() => handleListAdd('works')} style={{ marginTop: '0.35rem' }}>
            + Ajouter un item
          </button>
        </div>

        {/* Équipements */}
        <div className="form-group">
          <label>Équipements</label>
          <div className="dynamic-list">
            {form.features.map((item, i) => (
              <div key={i} className="dynamic-list-item">
                <input
                  type="text"
                  id={`features-${i}`}
                  aria-label={`Équipements - item ${i + 1}`}
                  value={item}
                  onChange={(e) => handleListChange('features', i, e.target.value)}
                  placeholder="Ex : Parquet massif"
                />
                <button type="button" className="btn btn-sm btn-danger" onClick={() => handleListRemove('features', i)}>
                  Suppr.
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-sm" onClick={() => handleListAdd('features')} style={{ marginTop: '0.35rem' }}>
            + Ajouter un item
          </button>
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
                    aria-label="Supprimer cette photo"
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
          <label>Ajouter des photos (max 5 Mo/photo - JPEG, PNG, WebP)</label>
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
                    aria-label="Supprimer cette photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <Link to="/admin/biens" className="btn">Annuler</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
      {confirmPhotoDelete && (
        <ConfirmModal
          message="Supprimer cette photo ?"
          onConfirm={handleConfirmPhotoDelete}
          onCancel={() => setConfirmPhotoDelete(null)}
        />
      )}
    </div>
  );
}
