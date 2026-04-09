import { useState, useCallback } from 'react';
import { useFadeIn } from '../hooks/useFadeIn.js';
import { CONTACT_ENDPOINT, CONTACT_EMAIL } from '../config/contact.js';
import './Contact.css';

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

export default function Contact() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [honeypot, setHoneypot] = useState('');
  const { ref, isVisible } = useFadeIn();

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

    // Honeypot check
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
      const res = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom,
          email: form.email,
          telephone: form.telephone,
          message: form.message,
          _honeypot: honeypot,
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

  return (
    <section id="contact" className="contact section-padding" ref={ref}>
      <div className={`contact__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <div className="contact__text">
          <span className="text-label contact__label">CONTACT</span>
          <h2 className="text-heading-lg contact__title">
            Un projet. Un actif.<br />
            Nous répondons.
          </h2>
          <p className="contact__subtitle">
            Vous avez un actif à céder, un projet de co-investissement ou une opportunité à qualifier. Décrivez-le — nous revenons sous 72h.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="contact__email">
            {CONTACT_EMAIL}
          </a>
        </div>

        <div className="contact__form-wrapper">
          {status === 'success' ? (
            <div className="contact__success" role="status" aria-live="polite">
              <p>Message reçu. Nous vous répondons sous 72h.</p>
            </div>
          ) : (
            <form
              className="contact__form"
              onSubmit={handleSubmit}
              aria-label="Formulaire de contact Versi"
              noValidate
            >
              <div className="contact__field">
                <label htmlFor="contact-nom" className="text-label contact__field-label">NOM</label>
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
                  className={`contact__input ${errors.nom ? 'contact__input--error' : ''}`}
                />
                {errors.nom && <span id="error-nom" className="contact__error" role="alert">{errors.nom}</span>}
              </div>

              <div className="contact__field">
                <label htmlFor="contact-email" className="text-label contact__field-label">EMAIL</label>
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
                  className={`contact__input ${errors.email ? 'contact__input--error' : ''}`}
                />
                {errors.email && <span id="error-email" className="contact__error" role="alert">{errors.email}</span>}
              </div>

              <div className="contact__field">
                <label htmlFor="contact-telephone" className="text-label contact__field-label">TÉLÉPHONE (optionnel)</label>
                <input
                  type="tel"
                  id="contact-telephone"
                  name="telephone"
                  value={form.telephone}
                  onChange={handleChange}
                  placeholder="Votre numéro"
                  maxLength={20}
                  disabled={status === 'loading'}
                  className="contact__input"
                />
              </div>

              <div className="contact__field">
                <label htmlFor="contact-message" className="text-label contact__field-label">MESSAGE</label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Décrivez votre actif ou votre projet"
                  maxLength={2000}
                  disabled={status === 'loading'}
                  aria-invalid={errors.message ? 'true' : undefined}
                  aria-describedby={errors.message ? 'error-message' : undefined}
                  className={`contact__textarea ${errors.message ? 'contact__input--error' : ''}`}
                />
                {errors.message && <span id="error-message" className="contact__error" role="alert">{errors.message}</span>}
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
                className="contact__submit text-cta"
                disabled={status === 'loading'}
                aria-busy={status === 'loading' ? 'true' : undefined}
              >
                {status === 'loading' ? 'ENVOI EN COURS...' : 'TRANSMETTRE'}
              </button>

              {status === 'error' && (
                <p className="contact__form-error" role="alert" aria-live="assertive">
                  Problème technique. Contact direct : {CONTACT_EMAIL}.
                </p>
              )}

              <p className="contact__rgpd">
                Versi traite vos données dans le cadre de votre demande.
                Base légale : intérêt légitime (art. 6.1.f RGPD). Données conservées 3 ans. Droit d'accès et de suppression : {CONTACT_EMAIL}.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
