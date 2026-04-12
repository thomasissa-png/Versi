import { useState, useCallback } from 'react';
import { generateListing } from './adminFetch.js';
import './AdminBienForm.css';

const TYPE_OPTIONS = [
  'Appartement',
  'Maison',
  'Local professionnel',
  'Immeuble',
  'Terrain',
  'Parking',
];

const ETAT_OPTIONS = [
  'Neuf',
  'Rénové',
  'Bon état',
  'À rafraîchir',
  'À rénover',
  'Brut',
];

const DPE_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

const INITIAL_FORM = {
  adresse: '',
  surface: '',
  nbPieces: '',
  type: '',
  prix: '',
  etage: '',
  dpe: '',
  etat: '',
  titre: '',
  description: '',
  ville: '',
  codePostal: '',
};

export default function AdminBienForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [generateSuccess, setGenerateSuccess] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'adresse') {
      setGenerateSuccess(false);
      setGenerateError('');
    }
  }, []);

  const canGenerate = form.adresse.trim().length > 0 && !generating;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    setGenerating(true);
    setGenerateError('');
    setGenerateSuccess(false);

    try {
      const result = await generateListing({
        adresse: form.adresse,
        surface: form.surface || undefined,
        nbPieces: form.nbPieces || undefined,
        type: form.type || undefined,
        prix: form.prix || undefined,
        etage: form.etage || undefined,
        dpe: form.dpe || undefined,
        etat: form.etat || undefined,
      });

      setForm((prev) => ({
        ...prev,
        titre: result.title || prev.titre,
        description: result.description || prev.description,
        ville: result.city || prev.ville,
        codePostal: result.postcode || prev.codePostal,
        type: result.type_normalized || prev.type,
      }));
      setGenerateSuccess(true);
    } catch (err) {
      setGenerateError(err.message || 'Erreur lors de la génération. Réessayez.');
    } finally {
      setGenerating(false);
    }
  }, [canGenerate, form]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    // Sauvegarde du bien — à connecter au backend quand l'endpoint CRUD sera prêt
    console.log('Bien à sauvegarder :', form);
  }, [form]);

  return (
    <form
      className="admin-bien-form"
      onSubmit={handleSubmit}
      aria-label="Formulaire de gestion de bien"
    >
      <h2 className="admin-bien-form__title">Gestion du bien</h2>

      {/* --- Section : Informations du bien --- */}
      <fieldset className="admin-bien-form__fieldset">
        <legend className="admin-bien-form__legend">Informations du bien</legend>

        <div className="admin-bien-form__grid">
          <div className="admin-bien-form__field admin-bien-form__field--full">
            <label htmlFor="bien-adresse" className="admin-bien-form__label">
              Adresse <span className="admin-bien-form__required">*</span>
            </label>
            <input
              type="text"
              id="bien-adresse"
              name="adresse"
              value={form.adresse}
              onChange={handleChange}
              placeholder="Ex : 10 rue des Muguets, 59000 Lille"
              className="admin-bien-form__input"
              required
            />
          </div>

          <div className="admin-bien-form__field">
            <label htmlFor="bien-type" className="admin-bien-form__label">Type de bien</label>
            <select
              id="bien-type"
              name="type"
              value={form.type}
              onChange={handleChange}
              className="admin-bien-form__select"
            >
              <option value="">Sélectionner</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="admin-bien-form__field">
            <label htmlFor="bien-surface" className="admin-bien-form__label">Surface (m²)</label>
            <input
              type="number"
              id="bien-surface"
              name="surface"
              value={form.surface}
              onChange={handleChange}
              placeholder="Ex : 68"
              min="1"
              className="admin-bien-form__input"
            />
          </div>

          <div className="admin-bien-form__field">
            <label htmlFor="bien-nbPieces" className="admin-bien-form__label">Nombre de pièces</label>
            <input
              type="number"
              id="bien-nbPieces"
              name="nbPieces"
              value={form.nbPieces}
              onChange={handleChange}
              placeholder="Ex : 3"
              min="1"
              className="admin-bien-form__input"
            />
          </div>

          <div className="admin-bien-form__field">
            <label htmlFor="bien-prix" className="admin-bien-form__label">Prix (€ net vendeur)</label>
            <input
              type="number"
              id="bien-prix"
              name="prix"
              value={form.prix}
              onChange={handleChange}
              placeholder="Ex : 185000"
              min="0"
              className="admin-bien-form__input"
            />
          </div>

          <div className="admin-bien-form__field">
            <label htmlFor="bien-etage" className="admin-bien-form__label">Étage</label>
            <input
              type="text"
              id="bien-etage"
              name="etage"
              value={form.etage}
              onChange={handleChange}
              placeholder="Ex : 2e étage"
              className="admin-bien-form__input"
            />
          </div>

          <div className="admin-bien-form__field">
            <label htmlFor="bien-dpe" className="admin-bien-form__label">DPE</label>
            <select
              id="bien-dpe"
              name="dpe"
              value={form.dpe}
              onChange={handleChange}
              className="admin-bien-form__select"
            >
              <option value="">Non renseigné</option>
              {DPE_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="admin-bien-form__field">
            <label htmlFor="bien-etat" className="admin-bien-form__label">État</label>
            <select
              id="bien-etat"
              name="etat"
              value={form.etat}
              onChange={handleChange}
              className="admin-bien-form__select"
            >
              <option value="">Non renseigné</option>
              {ETAT_OPTIONS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* --- Bouton Générer l'annonce --- */}
      <div className="admin-bien-form__generate-section">
        <button
          type="button"
          className="admin-bien-form__generate-btn"
          onClick={handleGenerate}
          disabled={!canGenerate}
          aria-busy={generating ? 'true' : undefined}
        >
          {generating ? (
            <>
              <span className="admin-bien-form__spinner" aria-hidden="true" />
              Génération en cours…
            </>
          ) : (
            '✦ Générer l\'annonce'
          )}
        </button>
        <p className="admin-bien-form__generate-hint">
          Renseignez au minimum l'adresse. Plus vous remplissez de champs, meilleure sera l'annonce générée.
        </p>
        {generateSuccess && (
          <button
            type="button"
            className="admin-bien-form__regenerate-btn"
            onClick={handleGenerate}
            disabled={!canGenerate}
            aria-busy={generating ? 'true' : undefined}
          >
            {generating ? 'Régénération…' : 'Régénérer'}
          </button>
        )}
        {generateError && (
          <p className="admin-bien-form__generate-error" role="alert">
            {generateError}
          </p>
        )}
        {generateSuccess && (
          <p className="admin-bien-form__generate-success" role="status">
            Annonce générée avec succès. Vous pouvez la modifier avant de sauvegarder.
          </p>
        )}
        {generateSuccess && (
          <p className="admin-bien-form__ia-warning" role="note">
            Les informations de quartier sont générées par IA — vérifiez-les avant publication.
          </p>
        )}
      </div>

      {/* --- Section : Annonce (titre + description générés/éditables) --- */}
      <fieldset className="admin-bien-form__fieldset">
        <legend className="admin-bien-form__legend">Annonce</legend>

        <div className="admin-bien-form__field">
          <label htmlFor="bien-titre" className="admin-bien-form__label">Titre de l'annonce</label>
          <input
            type="text"
            id="bien-titre"
            name="titre"
            value={form.titre}
            onChange={handleChange}
            placeholder="Généré automatiquement ou saisie manuelle"
            className="admin-bien-form__input"
          />
        </div>

        <div className="admin-bien-form__field">
          <label htmlFor="bien-description" className="admin-bien-form__label">Description</label>
          <textarea
            id="bien-description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Généré automatiquement ou saisie manuelle"
            rows={12}
            className="admin-bien-form__textarea"
          />
        </div>
      </fieldset>

      {/* --- Section : Localisation (auto-remplie par le géocodage) --- */}
      <fieldset className="admin-bien-form__fieldset">
        <legend className="admin-bien-form__legend">Localisation</legend>

        <div className="admin-bien-form__grid">
          <div className="admin-bien-form__field">
            <label htmlFor="bien-ville" className="admin-bien-form__label">Ville</label>
            <input
              type="text"
              id="bien-ville"
              name="ville"
              value={form.ville}
              onChange={handleChange}
              placeholder="Auto-rempli par la génération"
              className="admin-bien-form__input"
            />
          </div>

          <div className="admin-bien-form__field">
            <label htmlFor="bien-codePostal" className="admin-bien-form__label">Code postal</label>
            <input
              type="text"
              id="bien-codePostal"
              name="codePostal"
              value={form.codePostal}
              onChange={handleChange}
              placeholder="Auto-rempli par la génération"
              className="admin-bien-form__input"
            />
          </div>
        </div>
      </fieldset>

      {/* --- Sauvegarde --- */}
      <div className="admin-bien-form__actions">
        <button
          type="button"
          className="admin-bien-form__save-btn admin-bien-form__save-btn--disabled"
          disabled
          title="Fonctionnalité bientôt disponible"
        >
          Enregistrer le bien
        </button>
      </div>
    </form>
  );
}
