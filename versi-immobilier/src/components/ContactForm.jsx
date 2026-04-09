import { useState, useCallback } from 'react';
import { FORMSPREE_ENDPOINT, CONTACT_EMAIL } from '../config/contact.js';
import './ContactForm.css';

const INITIAL_FORM = { nom: '', email: '', telephone: '', message: '' };

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

  if (!form.message.trim()) {
    errors.message = 'Ce champ est requis.';
  } else if (form.message.trim().length < 20) {
    errors.message = 'Veuillez saisir au moins 20 caractères.';
  }

  return errors;
}

export default function ContactForm({ subject = '' }) {
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
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom,
          email: form.email,
          telephone: form.telephone,
          message: form.message,
          sujet: subject,
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
  }, [form, honeypot, subject]);

  if (status === 'success') {
    return (
      <div className="contact-form__success" role="status" aria-live="polite">
        <p>Message reçu. Nous vous répondons sous 72h.</p>
      </div>
    );
  }

  return (
    <form
      className="contact-form"
      onSubmit={handleSubmit}
      aria-label="Formulaire de contact"
      noValidate
    >
      <div className="contact-form__field">
        <label htmlFor="contact-nom" className="text-label contact-form__label">NOM</label>
        <input
          type="text"
          id="contact-nom"
          name="nom"
          value={form.nom}
          onChange={handleChange}
          placeholder="Votre nom"
          maxLength={100}
          disabled={status === 'loading'}
          aria-invalid={errors.nom ? 'true' : undefined}
          aria-describedby={errors.nom ? 'error-nom' : undefined}
          className={`contact-form__input ${errors.nom ? 'contact-form__input--error' : ''}`}
        />
        {errors.nom && <span id="error-nom" className="contact-form__error" role="alert">{errors.nom}</span>}
      </div>

      <div className="contact-form__field">
        <label htmlFor="contact-email" className="text-label contact-form__label">EMAIL</label>
        <input
          type="email"
          id="contact-email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Votre adresse email"
          maxLength={254}
          disabled={status === 'loading'}
          aria-invalid={errors.email ? 'true' : undefined}
          aria-describedby={errors.email ? 'error-email' : undefined}
          className={`contact-form__input ${errors.email ? 'contact-form__input--error' : ''}`}
        />
        {errors.email && <span id="error-email" className="contact-form__error" role="alert">{errors.email}</span>}
      </div>

      <div className="contact-form__field">
        <label htmlFor="contact-telephone" className="text-label contact-form__label">TÉLÉPHONE (optionnel)</label>
        <input
          type="tel"
          id="contact-telephone"
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
        <label htmlFor="contact-message" className="text-label contact-form__label">MESSAGE</label>
        <textarea
          id="contact-message"
          name="message"
          value={form.message}
          onChange={handleChange}
          placeholder="Décrivez votre projet ou votre demande"
          maxLength={2000}
          disabled={status === 'loading'}
          aria-invalid={errors.message ? 'true' : undefined}
          aria-describedby={errors.message ? 'error-message' : undefined}
          className={`contact-form__textarea ${errors.message ? 'contact-form__input--error' : ''}`}
        />
        {errors.message && <span id="error-message" className="contact-form__error" role="alert">{errors.message}</span>}
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
        {status === 'loading' ? 'ENVOI EN COURS...' : 'ENVOYER'}
      </button>

      {status === 'error' && (
        <p className="contact-form__form-error" role="alert" aria-live="assertive">
          Problème technique. Contact direct : {CONTACT_EMAIL}.
        </p>
      )}

      <p className="contact-form__rgpd">
        Versi Immobilier traite vos données dans le cadre de votre demande.
        Base légale : intérêt légitime (art. 6.1.f RGPD). Données conservées 3 ans.
        Droit d'accès et de suppression : {CONTACT_EMAIL}.
      </p>
    </form>
  );
}
