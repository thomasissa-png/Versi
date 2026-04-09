import { useState, useCallback } from 'react';
import { FORMSPREE_SELL_ENDPOINT, CONTACT_EMAIL } from '../config/contact.js';
import './ContactForm.css';

const INITIAL_FORM = {
  adresse: '',
  typeBien: '',
  surface: '',
  situationLocative: '',
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  message: '',
};

const BIEN_TYPES = [
  'Immeuble de rapport',
  'Maison',
  'Actif mixte',
  'Appartement',
  'Autre',
];

const SITUATIONS_LOCATIVES = [
  'Libre',
  'Occupé (locataires en place)',
  'Mixte (partiellement occupé)',
];

function validate(form) {
  const errors = {};

  if (!form.adresse.trim()) {
    errors.adresse = 'Veuillez renseigner l\'adresse du bien.';
  }
  if (!form.typeBien) {
    errors.typeBien = 'Veuillez sélectionner un type de bien.';
  }
  if (!form.surface.trim()) {
    errors.surface = 'Veuillez renseigner la surface.';
  }
  if (!form.situationLocative) {
    errors.situationLocative = 'Veuillez sélectionner la situation locative.';
  }
  if (!form.prenom.trim()) {
    errors.prenom = 'Veuillez renseigner votre prénom.';
  }
  if (!form.nom.trim()) {
    errors.nom = 'Veuillez renseigner votre nom.';
  }
  if (!form.email.trim()) {
    errors.email = 'Veuillez renseigner votre email.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Format d\'email invalide.';
  }
  if (!form.telephone.trim()) {
    errors.telephone = 'Veuillez renseigner votre téléphone.';
  } else if (!/^[\d\s+()./-]{8,20}$/.test(form.telephone.trim())) {
    errors.telephone = 'Format de téléphone invalide.';
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
          adresse_du_bien: form.adresse,
          type_de_bien: form.typeBien,
          surface: form.surface,
          situation_locative: form.situationLocative,
          prenom: form.prenom,
          nom: form.nom,
          email: form.email,
          telephone: form.telephone,
          informations_complementaires: form.message,
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
        <p>Votre dossier a été transmis. Nous accusons réception sous 24h et planifions la suite avec vous.</p>
      </div>
    );
  }

  const renderField = (name, label, type = 'text', placeholder = '', required = true, extraProps = {}) => (
    <div className="contact-form__field">
      <label htmlFor={`sell-${name}`} className="contact-form__label-text">
        {label}{required && <span className="contact-form__required" aria-hidden="true"> *</span>}
      </label>
      <input
        type={type}
        id={`sell-${name}`}
        name={name}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={status === 'loading'}
        aria-invalid={errors[name] ? 'true' : undefined}
        aria-describedby={errors[name] ? `sell-error-${name}` : undefined}
        aria-required={required}
        className={`contact-form__input ${errors[name] ? 'contact-form__input--error' : ''}`}
        {...extraProps}
      />
      {errors[name] && <span id={`sell-error-${name}`} className="contact-form__error" role="alert">{errors[name]}</span>}
    </div>
  );

  return (
    <form
      className="contact-form contact-form--light"
      onSubmit={handleSubmit}
      aria-label="Formulaire de soumission de bien"
      noValidate
    >
      {/* Bien info */}
      {renderField('adresse', 'Adresse du bien', 'text', 'Ex : 12 rue Victor Hugo, 59000 Lille')}

      <div className="contact-form__field">
        <label htmlFor="sell-typeBien" className="contact-form__label-text">
          Type de bien<span className="contact-form__required" aria-hidden="true"> *</span>
        </label>
        <select
          id="sell-typeBien"
          name="typeBien"
          value={form.typeBien}
          onChange={handleChange}
          disabled={status === 'loading'}
          aria-invalid={errors.typeBien ? 'true' : undefined}
          aria-describedby={errors.typeBien ? 'sell-error-typeBien' : undefined}
          aria-required="true"
          className={`contact-form__select contact-form__select--light ${errors.typeBien ? 'contact-form__input--error' : ''}`}
        >
          <option value="">Sélectionnez</option>
          {BIEN_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        {errors.typeBien && <span id="sell-error-typeBien" className="contact-form__error" role="alert">{errors.typeBien}</span>}
      </div>

      {renderField('surface', 'Surface (m²)', 'text', 'Ex : 280')}

      <div className="contact-form__field">
        <label htmlFor="sell-situationLocative" className="contact-form__label-text">
          Situation locative<span className="contact-form__required" aria-hidden="true"> *</span>
        </label>
        <select
          id="sell-situationLocative"
          name="situationLocative"
          value={form.situationLocative}
          onChange={handleChange}
          disabled={status === 'loading'}
          aria-invalid={errors.situationLocative ? 'true' : undefined}
          aria-describedby={errors.situationLocative ? 'sell-error-situationLocative' : undefined}
          aria-required="true"
          className={`contact-form__select contact-form__select--light ${errors.situationLocative ? 'contact-form__input--error' : ''}`}
        >
          <option value="">Sélectionnez</option>
          {SITUATIONS_LOCATIVES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {errors.situationLocative && <span id="sell-error-situationLocative" className="contact-form__error" role="alert">{errors.situationLocative}</span>}
      </div>

      {/* Separator */}
      <div className="contact-form__separator" aria-hidden="true" />

      {/* Personal info */}
      {renderField('prenom', 'Prénom', 'text', 'Votre prénom')}
      {renderField('nom', 'Nom', 'text', 'Votre nom')}
      {renderField('email', 'Email', 'email', 'votre@email.fr')}
      {renderField('telephone', 'Téléphone', 'tel', 'Ex : 06 12 34 56 78')}

      <div className="contact-form__field">
        <label htmlFor="sell-message" className="contact-form__label-text">
          Informations complémentaires
        </label>
        <textarea
          id="sell-message"
          name="message"
          value={form.message}
          onChange={handleChange}
          placeholder="Décrivez brièvement le contexte de la vente, les éventuels travaux déjà réalisés, la présence de locataires..."
          maxLength={2000}
          disabled={status === 'loading'}
          className="contact-form__textarea contact-form__textarea--light"
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
        className="contact-form__submit contact-form__submit--dark text-cta"
        disabled={status === 'loading'}
        aria-busy={status === 'loading' ? 'true' : undefined}
      >
        {status === 'loading' ? 'Envoi en cours...' : 'Soumettre mon dossier'}
      </button>

      {status === 'error' && (
        <p className="contact-form__form-error contact-form__form-error--light" role="alert" aria-live="assertive">
          L'envoi a échoué. Contactez-nous directement à {CONTACT_EMAIL}
        </p>
      )}

      <p className="contact-form__rgpd contact-form__rgpd--light">
        En soumettant ce formulaire, vous acceptez que Versi Immobilier traite vos données personnelles
        dans le cadre de l'instruction de votre dossier, sur la base de son intérêt légitime (art. 6.1.f RGPD).
        Vos données sont conservées 3 ans et ne sont pas transmises à des tiers.
        Droits d'accès, rectification et suppression : {CONTACT_EMAIL}
      </p>
    </form>
  );
}
