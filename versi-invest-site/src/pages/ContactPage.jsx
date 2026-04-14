import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import './ContactPage.css';

const BUDGET_OPTIONS = [
  { value: '', label: 'Sélectionnez votre budget' },
  { value: '< 100k€', label: 'Moins de 100 000 €' },
  { value: '100-200k€', label: '100 000 € — 200 000 €' },
  { value: '200-500k€', label: '200 000 € — 500 000 €' },
  { value: '500k€+', label: 'Plus de 500 000 €' },
];

const ZONE_OPTIONS = [
  { value: '', label: 'Sélectionnez une zone' },
  { value: 'Hauts-de-France', label: 'Hauts-de-France' },
  { value: 'Île-de-France', label: 'Île-de-France' },
  { value: 'Autre', label: 'Autre' },
];

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    budget: '',
    zone: '',
    first_investment: null,
    message: '',
    consent: false,
  });
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setGlobalError('');
  }, []);

  const handleRadio = useCallback((value) => {
    setForm((prev) => ({ ...prev, first_investment: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.first_investment;
      return next;
    });
  }, []);

  const validate = useCallback(() => {
    const errs = {};
    if (!form.name || form.name.trim().length < 2)
      errs.name = 'Le nom est requis (minimum 2 caractères).';
    if (!form.email || !validateEmail(form.email))
      errs.email = 'Adresse email invalide.';
    if (!form.phone || form.phone.trim().length < 6)
      errs.phone = 'Numéro de téléphone invalide.';
    if (!form.budget) errs.budget = 'Le budget est requis.';
    if (!form.zone) errs.zone = 'La zone de sourcing est requise.';
    if (form.first_investment === null)
      errs.first_investment = 'Ce champ est requis.';
    if (!form.consent) errs.consent = 'Le consentement RGPD est requis.';
    return errs;
  }, [form]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const errs = validate();
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;

      setLoading(true);
      setGlobalError('');

      try {
        const res = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            budget: form.budget,
            zone: form.zone,
            first_investment: form.first_investment,
            message: form.message.trim() || null,
            consent: form.consent,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.errors && data.errors.length > 0) {
            setGlobalError(data.errors.join(' '));
          } else {
            setGlobalError(data.error || 'Une erreur est survenue. Veuillez réessayer.');
          }
          setLoading(false);
          return;
        }

        setSuccess(true);
      } catch {
        setGlobalError('Erreur de connexion. Vérifiez votre connexion internet et réessayez.');
      } finally {
        setLoading(false);
      }
    },
    [form, validate],
  );

  return (
    <>
      <PageHead
        title="S'inscrire — Versi Invest"
        description="Rejoignez la liste d'attente. Un fondateur vous recontacte sous 48h pour un premier échange."
      />
      <Nav />
      <main>
        {/* --- Header --- */}
        <header className="page-header">
          <div className="container">
            <h1 className="page-header__title">
              Inscrivez-vous sur la liste d'attente.
            </h1>
            <p className="page-header__intro">
              Ce formulaire n'est pas une newsletter. C'est une pré-qualification. On vous
              contacte uniquement si votre profil correspond aux opérations que Versi Invest peut
              vous proposer. Pas de démarchage, pas de flux automatique.
            </p>
          </div>
        </header>

        {/* --- Formulaire --- */}
        <section className="contact section-padding" aria-label="Formulaire d'inscription">
          <div className="container">
            <div className="contact__grid">
              {/* Colonne gauche : pourquoi s'inscrire */}
              <div className="contact__info">
                <h2 className="contact__info-title">Ce qui se passe après</h2>
                <p className="contact__info-text">
                  Un fondateur — Maxime, Thomas ou Carl — prend connaissance de votre dossier et
                  vous contacte sous 48h (jours ouvrés) pour un premier échange de 30 minutes.
                </p>
                <p className="contact__info-text">
                  Cet appel n'est pas un entretien de vente. C'est une qualification patrimoniale :
                  on évalue ensemble si votre projet correspond aux opportunités que Versi Invest
                  peut sourcer.
                </p>
                <div className="contact__info-list">
                  <div className="contact__info-item">
                    Accès prioritaire aux biens off-market
                  </div>
                  <div className="contact__info-item">
                    Simulation financière personnalisée
                  </div>
                  <div className="contact__info-item">
                    Accompagnement de A à Z par un fondateur
                  </div>
                  <div className="contact__info-item">
                    Si votre profil ne correspond pas, on vous le dit directement
                  </div>
                </div>
              </div>

              {/* Colonne droite : formulaire ou succès */}
              {success ? (
                <div className="contact__success" role="alert">
                  <div className="contact__success-icon" aria-hidden="true">&#10003;</div>
                  <h2 className="contact__success-title">
                    Votre inscription est enregistrée.
                  </h2>
                  <p className="contact__success-text">
                    Un fondateur — Maxime, Thomas ou Carl — prend connaissance de votre dossier et
                    vous contacte sous 48h (jours ouvrés) pour un premier échange de 30 minutes.
                    Cet appel n'est pas un entretien de vente. C'est une qualification patrimoniale :
                    on évalue ensemble si votre projet correspond aux opportunités que Versi Invest
                    peut sourcer.
                  </p>
                  <p className="contact__success-text">
                    Si votre profil ne correspond pas à nos critères actuels, on vous le dit
                    directement — avec les raisons.
                  </p>
                  <p className="contact__success-email">
                    Une question en attendant ? Écrivez à{' '}
                    <a href="mailto:contact@versi.fr">contact@versi.fr</a>
                  </p>
                </div>
              ) : (
                <form
                  className="contact__form"
                  onSubmit={handleSubmit}
                  noValidate
                >
                  {globalError && (
                    <div className="contact__global-error" role="alert">
                      {globalError}
                    </div>
                  )}

                  {/* Nom */}
                  <div className="contact__field">
                    <label className="contact__label" htmlFor="ct-name">
                      Prénom et nom<span className="contact__required" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="ct-name"
                      className={`contact__input ${errors.name ? 'contact__input--error' : ''}`}
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      autoComplete="name"
                      aria-describedby={errors.name ? 'err-name' : undefined}
                    />
                    {errors.name && (
                      <span id="err-name" className="contact__error" role="alert">
                        {errors.name}
                      </span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="contact__field">
                    <label className="contact__label" htmlFor="ct-email">
                      Adresse email<span className="contact__required" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="ct-email"
                      className={`contact__input ${errors.email ? 'contact__input--error' : ''}`}
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                      aria-describedby={errors.email ? 'err-email' : undefined}
                    />
                    {errors.email && (
                      <span id="err-email" className="contact__error" role="alert">
                        {errors.email}
                      </span>
                    )}
                  </div>

                  {/* Téléphone */}
                  <div className="contact__field">
                    <label className="contact__label" htmlFor="ct-phone">
                      Téléphone<span className="contact__required" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="ct-phone"
                      className={`contact__input ${errors.phone ? 'contact__input--error' : ''}`}
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      required
                      autoComplete="tel"
                      aria-describedby={errors.phone ? 'err-phone' : undefined}
                    />
                    {errors.phone && (
                      <span id="err-phone" className="contact__error" role="alert">
                        {errors.phone}
                      </span>
                    )}
                  </div>

                  {/* Budget */}
                  <div className="contact__field">
                    <label className="contact__label" htmlFor="ct-budget">
                      Budget estimé<span className="contact__required" aria-hidden="true">*</span>
                    </label>
                    <select
                      id="ct-budget"
                      className={`contact__select ${errors.budget ? 'contact__select--error' : ''}`}
                      name="budget"
                      value={form.budget}
                      onChange={handleChange}
                      required
                      aria-describedby={errors.budget ? 'err-budget' : undefined}
                    >
                      {BUDGET_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.budget && (
                      <span id="err-budget" className="contact__error" role="alert">
                        {errors.budget}
                      </span>
                    )}
                  </div>

                  {/* Zone */}
                  <div className="contact__field">
                    <label className="contact__label" htmlFor="ct-zone">
                      Zone de sourcing souhaitée<span className="contact__required" aria-hidden="true">*</span>
                    </label>
                    <select
                      id="ct-zone"
                      className={`contact__select ${errors.zone ? 'contact__select--error' : ''}`}
                      name="zone"
                      value={form.zone}
                      onChange={handleChange}
                      required
                      aria-describedby={errors.zone ? 'err-zone' : undefined}
                    >
                      {ZONE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.zone && (
                      <span id="err-zone" className="contact__error" role="alert">
                        {errors.zone}
                      </span>
                    )}
                  </div>

                  {/* Premier investissement */}
                  <fieldset className="contact__field">
                    <legend className="contact__label">
                      Premier investissement ?<span className="contact__required" aria-hidden="true">*</span>
                    </legend>
                    <div className="contact__radio-group">
                      <label className="contact__radio-label">
                        <input
                          type="radio"
                          name="first_investment"
                          checked={form.first_investment === true}
                          onChange={() => handleRadio(true)}
                        />
                        Oui
                      </label>
                      <label className="contact__radio-label">
                        <input
                          type="radio"
                          name="first_investment"
                          checked={form.first_investment === false}
                          onChange={() => handleRadio(false)}
                        />
                        Non
                      </label>
                    </div>
                    {errors.first_investment && (
                      <span className="contact__error" role="alert">
                        {errors.first_investment}
                      </span>
                    )}
                  </fieldset>

                  {/* Message */}
                  <div className="contact__field">
                    <label className="contact__label" htmlFor="ct-message">
                      Message <span style={{ fontWeight: 'var(--font-weight-regular)', textTransform: 'none', letterSpacing: 'normal' }}>(optionnel)</span>
                    </label>
                    <textarea
                      id="ct-message"
                      className="contact__textarea"
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={4}
                    />
                  </div>

                  {/* RGPD */}
                  <div className="contact__field">
                    <div className="contact__checkbox-wrapper">
                      <input
                        id="ct-consent"
                        type="checkbox"
                        name="consent"
                        checked={form.consent}
                        onChange={handleChange}
                        required
                      />
                      <label htmlFor="ct-consent" className="contact__checkbox-text">
                        J'accepte que Versi Invest conserve mes informations pour me recontacter
                        dans le cadre de ma demande. Ces données ne seront pas transmises à des
                        tiers. Conformément au RGPD, vous pouvez demander la modification ou la
                        suppression de vos données à contact@versi.fr.{' '}
                        <Link to="/politique-de-confidentialite">
                          Politique de confidentialité
                        </Link>
                      </label>
                    </div>
                    {errors.consent && (
                      <span className="contact__error" role="alert">
                        {errors.consent}
                      </span>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="contact__submit"
                    disabled={loading}
                    aria-busy={loading}
                  >
                    {loading ? 'Envoi en cours...' : 'S\'inscrire pour être recontacté'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
