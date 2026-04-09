import { useState, useCallback } from 'react';
import { FORMSPREE_ENDPOINT, CONTACT_EMAIL } from '../config/contact.js';
import './ContactForm.css';

const INITIAL_FORM = {
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  objet: '',
  message: '',
};

function validate(form) {
  const errors = {};
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
  if (!form.message.trim()) {
    errors.message = 'Veuillez renseigner votre message.';
  }
  return errors;
}

export default function ContactForm({ subject = '' }) {
  const [form, setForm] = useState({
    ...INITIAL_FORM,
    objet: subject || '',
  });
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
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: form.prenom,
          nom: form.nom,
          email: form.email,
          telephone: form.telephone,
          objet: form.objet,
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
        <p>Votre message a été transmis. Nous accusons réception sous 24h.</p>
      </div>
    );
  }

  const renderField = (name, label, type = 'text', placeholder = '', required = true) => (
    <div className="contact-form__field">
      <label htmlFor={`contact-${name}`} className="contact-form__label">
        {label}{required && <span style={{ color: 'var(--color-error-on-dark)' }} aria-hidden="true"> *</span>}
      </label>
      <input
        type={type}
        id={`contact-${name}`}
        name={name}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={status === 'loading'}
        aria-invalid={errors[name] ? 'true' : undefined}
        aria-describedby={errors[name] ? `contact-error-${name}` : undefined}
        aria-required={required}
        className={`contact-form__input ${errors[name] ? 'contact-form__input--error' : ''}`}
      />
      {errors[name] && <span id={`contact-error-${name}`} className="contact-form__error" role="alert">{errors[name]}</span>}
    </div>
  );

  return (
    <form
      className="contact-form"
      onSubmit={handleSubmit}
      aria-label="Formulaire de contact"
      noValidate
    >
      {renderField('prenom', 'Prénom', 'text', 'Votre prénom')}
      {renderField('nom', 'Nom', 'text', 'Votre nom')}
      {renderField('email', 'Email', 'email', 'votre@email.fr')}
      {renderField('telephone', 'Téléphone', 'tel', 'Ex : 06 12 34 56 78')}

      <div className="contact-form__field">
        <label htmlFor="contact-objet" className="contact-form__label">
          Objet
        </label>
        <input
          type="text"
          id="contact-objet"
          name="objet"
          value={form.objet}
          onChange={handleChange}
          placeholder="Ex : Dossier prescripteur, Question sur un bien..."
          disabled={status === 'loading'}
          className="contact-form__input"
        />
      </div>

      <div className="contact-form__field">
        <label htmlFor="contact-message" className="contact-form__label">
          Message<span style={{ color: 'var(--color-error-on-dark)' }} aria-hidden="true"> *</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          value={form.message}
          onChange={handleChange}
          placeholder="Décrivez votre demande"
          maxLength={2000}
          disabled={status === 'loading'}
          aria-invalid={errors.message ? 'true' : undefined}
          aria-describedby={errors.message ? 'contact-error-message' : undefined}
          aria-required="true"
          className={`contact-form__textarea ${errors.message ? 'contact-form__input--error' : ''}`}
        />
        {errors.message && <span id="contact-error-message" className="contact-form__error" role="alert">{errors.message}</span>}
      </div>

      {/* Honeypot */}
      <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          type="text"
          id="contact-website"
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
        {status === 'loading' ? 'Envoi en cours...' : 'Envoyer'}
      </button>

      {status === 'error' && (
        <p className="contact-form__form-error" role="alert" aria-live="assertive">
          Une erreur est survenue. Écrivez-nous directement à {CONTACT_EMAIL}
        </p>
      )}

      <p className="contact-form__rgpd">
        En soumettant ce formulaire, vous acceptez que Versi Immobilier traite vos données personnelles
        pour répondre à votre demande, sur la base de son intérêt légitime (art. 6.1.f RGPD).
        Données conservées 3 ans. Droits d'accès et suppression : {CONTACT_EMAIL}
      </p>
    </form>
  );
}
