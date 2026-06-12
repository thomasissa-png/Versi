import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import adminFetch from './adminFetch.js';
import './admin.css';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publié' },
  { value: 'archived', label: 'Archivé' },
];

const EMPTY_FORM = {
  title: '',
  excerpt: '',
  content: '',
  cover_image: '',
  author: 'Versi Immobilier',
  tags: [],
  status: 'draft',
};

export default function AdminArticleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      adminFetch(`/api/admin/blog/${id}`)
        .then((data) => {
          const a = data.article;
          setForm({
            title: a.title || '',
            excerpt: a.excerpt || '',
            content: a.content || '',
            cover_image: a.cover_image || '',
            author: a.author || 'Versi Immobilier',
            tags: Array.isArray(a.tags) ? a.tags : [],
            status: a.status || 'draft',
          });
        })
        .catch(() => setError('Erreur de chargement de l\'article.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Tags - dynamic list
  function handleTagAdd() {
    setForm((prev) => ({ ...prev, tags: [...prev.tags, ''] }));
  }

  function handleTagChange(index, value) {
    setForm((prev) => {
      const tags = [...prev.tags];
      tags[index] = value;
      return { ...prev, tags };
    });
  }

  function handleTagRemove(index) {
    setForm((prev) => {
      const tags = [...prev.tags];
      tags.splice(index, 1);
      return { ...prev, tags };
    });
  }

  // Cover image: URL or base64 upload
  function handleCoverFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5242880) {
      setError('Image trop lourde (max 5 Mo).');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format non supporté. Utilisez JPEG, PNG ou WebP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, cover_image: reader.result }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function validate() {
    if (!form.title.trim()) return 'Le champ « Titre » est obligatoire.';
    if (!form.excerpt.trim()) return 'Le champ « Extrait » est obligatoire.';
    if (!form.content.trim()) return 'Le champ « Contenu » est obligatoire.';
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
      tags: form.tags.filter((t) => t.trim()),
    };

    try {
      if (isEdit) {
        await adminFetch(`/api/admin/blog/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await adminFetch('/api/admin/blog', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      navigate('/admin/articles');
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
      <Link to="/admin/articles" style={{ color: '#666', textDecoration: 'none', fontSize: '14px', marginBottom: '16px', display: 'inline-block' }}>
        ← Retour aux articles
      </Link>
      <div className="admin-section-header">
        <h2>{isEdit ? 'Modifier l\'article' : 'Nouvel article'}</h2>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Titre <span className="required">*</span></label>
          <input type="text" name="title" value={form.title} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Extrait <span className="required">*</span></label>
          <textarea name="excerpt" value={form.excerpt} onChange={handleChange} rows={3} placeholder="Résumé affiché dans la liste des articles" />
        </div>

        <div className="form-group">
          <label>Contenu (Markdown) <span className="required">*</span></label>
          <textarea name="content" value={form.content} onChange={handleChange} rows={15} placeholder="## Sous-titre&#10;&#10;Paragraphe de texte...&#10;&#10;**Texte en gras**, *italique*&#10;&#10;- Liste à puces&#10;- Deuxième item" />
        </div>

        <div className="form-group">
          <label>Image de couverture</label>
          <input
            type="text"
            name="cover_image"
            value={form.cover_image}
            onChange={handleChange}
            placeholder="URL de l'image (ou uploadez ci-dessous)"
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCoverFile}
            style={{ marginTop: '0.5rem' }}
          />
          {form.cover_image && (
            <div style={{ marginTop: '0.5rem' }}>
              <img
                src={form.cover_image}
                alt="Aperçu couverture"
                style={{ maxWidth: '300px', maxHeight: '180px', borderRadius: '4px', objectFit: 'cover' }}
              />
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setForm((prev) => ({ ...prev, cover_image: '' }))}
                style={{ marginLeft: '0.5rem' }}
              >
                Retirer
              </button>
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Auteur</label>
            <input type="text" name="author" value={form.author} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Statut</label>
            <select name="status" value={form.status} onChange={handleChange}>
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div className="form-group">
          <label>Tags</label>
          <div className="dynamic-list">
            {form.tags.map((tag, i) => (
              <div key={i} className="dynamic-list-item">
                <input
                  type="text"
                  id={`tag-${i}`}
                  aria-label={`Tag ${i + 1}`}
                  value={tag}
                  onChange={(e) => handleTagChange(i, e.target.value)}
                  placeholder="Ex : Investissement"
                />
                <button type="button" className="btn btn-sm btn-danger" onClick={() => handleTagRemove(i)}>
                  Suppr.
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-sm" onClick={handleTagAdd} style={{ marginTop: '0.35rem' }}>
            + Ajouter un tag
          </button>
        </div>

        <div className="form-actions">
          <Link to="/admin/articles" className="btn">Annuler</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
