import { useState, useCallback } from 'react';
import { FORMSPREE_SELL_ENDPOINT, CONTACT_EMAIL } from '../config/contact.js';
import './ContactForm.css';

const INITIAL_FORM = {
  nom: '',
  email: '',
  telephone: '',
  typeBien: '',
  localisation: '',
  surface: '',
  prixSouhaite: '',
  message: '',
};

const BIEN_TYPES = [
  'Immeuble de rapport',
  'Maison individuelle',
  'Appartement',
  'Local commercial',
  'Terrain',
  'Autre',
];

function validate(form) {
  const errors = {};
  if (!form.nom.trim()) {
    errors.nom = 'Ce champ est requis.';
  } else if (form.nom.trim().length < 2) {
    errors.nom = 'Veuillez saisir au moins 2 caractères.';
  }

  if (!form.email.trim()) {
    errors.email = 'Ce champ est requis.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Veuillez saisir une adresse email valide.';
  }

  if (!form.typeBien) {
    errors.typeBien = 'Veuillez sélectionner un type de bien.';
  }

  if (!form.localisation.trim()) {
    errors.localisation = 'Ce champ est requis.';
  }

  if (!form.surface.trim()) {
    errors.surface = 'Ce champ est requis.';
  }

  return errors;
}

export default function SellForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [honeypot, setHoneypot] = useState('');

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (honeypot) {
      setStatus('success');
      return;
    }

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorField = Object.keys(validationErrors)[0];
      document.querySelector(`[name="${firstErrorField}"]`)?.focus();
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch(FORMSPREE_SELL_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom,
          email: form.email,
          telephone: form.telephone,
          type_de_bien: form.typeBien,
          localisation: form.localisation,
          surface_estimee: form.surface,
          prix_souhaite: form.prixSouhaite,
          message: form.message,
          _gotcha: '',
        }),
      });

      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }, [form, honeypot]);

  if (status === 'success') {
    return (
      <div className="contact-form__success" role="status" aria-live="polite">
        <p>Demande reçue. Nous analysons votre bien et revenons vers vous sous 7 jours.</p>
      </div>
    );
  }

  return (
    <form
      className="contact-form"
      onSubmit={handleSubmit}
      aria-label="Formulaire de vente de bien"
      noValidate
    >
      <div className="contact-form__field">
        <label htmlFor="sell-nom" className="text-label contact-form__label">NOM</label>
        <input
          type="text"
          id="sell-nom"
          name="nom"
          value={form.nom}
          onChange={handleChange}
          placeholder="Votre nom"
          maxLength={100}
          disabled={status === 'loading'}
          aria-invalid={errors.nom ? 'true' : undefined}
          aria-describedby={errors.nom ? 'sell-error-nom' : undefined}
          className={`contact-form__input ${errors.nom ? 'contact-form__input--error' : ''}`}
        />
        {errors.nom && <span id="sell-error-nom" className="contact-form__error" role="alert">{errors.nom}</span>}
      </div>

      <div className="contact-form__field">
        <label htmlFor="sell-email" className="text-label contact-form__label">EMAIL</label>
        <input
          type="email"
          id="sell-email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Votre adresse email"
          maxLength={254}
          disabled={status === 'loading'}
          aria-invalid={errors.email ? 'true' : undefined}
          aria-describedby={errors.email ? 'sell-error-email' : undefined}
          className={`contact-form__input ${errors.email ? 'contact-form__input--error' : ''}`}
        />
        {errors.email && <span id="sell-error-email" className="contact-form__error" role="alert">{errors.email}</span>}
      </div>

      <div className="contact-form__field">
        <label htmlFor="sell-telephone" className="text-label contact-form__label">TÉLÉPHONE (optionnel)</label>
        <input
          type="tel"
          id="sell-telephone"
          name="telephone"
          value={form.telephone}
          onChange={handleChange}
          placeholder="Votre numéro"
          maxLength={20}
          disabled={status === 'loading'}
          className="contact-form__input"
        />
      </div>

      <div className="contact-form__field">
        <label htmlFor="sell-typeBien" className="text-label contact-form__label">TYPE DE BIEN</label>
        <select
          id="sell-typeBien"
          name="typeBien"
          value={form.typeBien}
          onChange={handleChange}
          disabled={status === 'loading'}
          aria-invalid={errors.typeBien ? 'true' : undefined}
          aria-describedby={errors.typeBien ? 'sell-error-typeBien' : undefined}
          className={`contact-form__select ${errors.typeBien ? 'contact-form__input--error' : ''}`}
        >
          <option value="">Sélectionnez un type</option>
          {BIEN_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        {errors.typeBien && <span id="sell-error-typeBien" className="contact-form__error" role="alert">{errors.typeBien}</span>}
      </div>

      <div className="contact-form__field">
        <label htmlFor="sell-localisation" className="text-label contact-form__label">LOCALISATION</label>
        <input
          type="text"
          id="sell-localisation"
          name="localisation"
          value={form.localisation}
          onChange={handleChange}
          placeholder="Ville, département"
          maxLength={200}
          disabled={status === 'loading'}
          aria-invalid={errors.localisation ? 'true' : undefined}
          aria-describedby={errors.localisation ? 'sell-error-localisation' : undefined}
          className={`contact-form__input ${errors.localisation ? 'contact-form__input--error' : ''}`}
        />
        {errors.localisation && <span id="sell-error-localisation" className="contact-form__error" role="alert">{errors.localisation}</span>}
      </div>

      <div className="contact-form__field">
        <label htmlFor="sell-surface" className="text-label contact-form__label">SURFACE ESTIMÉE</label>
        <input
          type="text"
          id="sell-surface"
          name="surface"
          value={form.surface}
          onChange={handleChange}
          placeholder="Ex : 250 m²"
          maxLength={50}
          disabled={status === 'loading'}
          aria-invalid={errors.surface ? 'true' : undefined}
          aria-describedby={errors.surface ? 'sell-error-surface' : undefined}
          className={`contact-form__input ${errors.surface ? 'contact-form__input--error' : ''}`}
        />
        {errors.surface && <span id="sell-error-surface" className="contact-form__error" role="alert">{errors.surface}</span>}
      </div>

      <div className="contact-form__field">
        <label htmlFor="sell-prixSouhaite" className="text-label contact-form__label">PRIX SOUHAITÉ (optionnel)</label>
        <input
          type="text"
          id="sell-prixSouhaite"
          name="prixSouhaite"
          value={form.prixSouhaite}
          onChange={handleChange}
          placeholder="Ex : 350 000 €"
          maxLength={50}
          disabled={status === 'loading'}
          className="contact-form__input"
        />
      </div>

      <div className="contact-form__field">
        <label htmlFor="sell-message" className="text-label contact-form__label">MESSAGE (optionnel)</label>
        <textarea
          id="sell-message"
          name="message"
          value={form.message}
          onChange={handleChange}
          placeholder="Informations complémentaires sur votre bien"
          maxLength={2000}
          disabled={status === 'loading'}
          className="contact-form__textarea"
        />
      </div>

      {/* Honeypot */}
      <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
        <label htmlFor="sell-website">Website</label>
        <input
          type="text"
          id="sell-website"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        className="contact-form__submit text-cta"
        disabled={status === 'loading'}
        aria-busy={status === 'loading' ? 'true' : undefined}
      >
        {status === 'loading' ? 'ENVOI EN COURS...' : 'RECEVOIR UNE OFFRE'}
      </button>

      {status === 'error' && (
        <p className="contact-form__form-error" role="alert" aria-live="assertive">
          Problème technique. Contact direct : {CONTACT_EMAIL}.
        </p>
      )}

      <p className="contact-form__rgpd">
        Versi Immobilier traite vos données dans le cadre de votre demande de vente.
        Base légale : intérêt légitime (art. 6.1.f RGPD). Données conservées 3 ans.
        Droit d'accès et de suppression : {CONTACT_EMAIL}.
      </p>
    </form>
  );
}
