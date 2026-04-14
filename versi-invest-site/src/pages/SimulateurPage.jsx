import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import './SimulateurPage.css';

/* --------------------------------------------------------------------------
   Formules de calcul (cf. vi2-functional-specs.md section 2.4)
   -------------------------------------------------------------------------- */

function compute(inputs) {
  const {
    prix,
    apport,
    taux,
    duree,
    loyer,
    charges,
    taxeFonciere,
    vacance,
  } = inputs;

  const honoraires = prix * 0.05;
  const montantEmprunte = prix - apport + honoraires;
  const tauxMensuel = taux / 100 / 12;

  let mensualite = 0;
  if (tauxMensuel > 0 && duree > 0 && montantEmprunte > 0) {
    mensualite =
      (montantEmprunte * tauxMensuel) /
      (1 - Math.pow(1 + tauxMensuel, -(duree * 12)));
  }

  const loyerNet = loyer * (1 - vacance / 100) - charges - taxeFonciere / 12;
  const cashflowBrut = loyer - mensualite;
  const cashflowNet = loyerNet - mensualite;
  const rendementBrut = prix > 0 ? ((loyer * 12) / prix) * 100 : 0;
  const rendementNet = prix > 0 ? ((loyerNet * 12) / prix) * 100 : 0;
  const effortEpargne = Math.max(0, -cashflowNet);

  return {
    honoraires,
    montantEmprunte,
    mensualite,
    cashflowBrut,
    cashflowNet,
    rendementBrut,
    rendementNet,
    effortEpargne,
  };
}

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

function formatEuro(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function formatPercent(value) {
  return value.toFixed(2).replace('.', ',') + ' %';
}

function signClass(value) {
  if (value > 0) return 'simulateur__metric-value--positive';
  if (value < 0) return 'simulateur__metric-value--negative';
  return 'simulateur__metric-value--neutral';
}

/* --------------------------------------------------------------------------
   Composant
   -------------------------------------------------------------------------- */

const INITIAL = {
  prix: '',
  apport: '',
  taux: '3.5',
  duree: '20',
  loyer: '',
  charges: '0',
  taxeFonciere: '0',
  vacance: '8',
};

export default function SimulateurPage() {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [results, setResults] = useState(null);
  const [isPrudent, setIsPrudent] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const validate = useCallback((values) => {
    const errs = {};
    const prix = parseFloat(values.prix);
    const apport = parseFloat(values.apport);
    const taux = parseFloat(values.taux);
    const loyer = parseFloat(values.loyer);
    const charges = parseFloat(values.charges);
    const taxe = parseFloat(values.taxeFonciere);
    const vacance = parseFloat(values.vacance);

    if (!values.prix || isNaN(prix) || prix <= 0)
      errs.prix = 'Le prix doit être supérieur à 0.';
    if (values.apport === '' || isNaN(apport) || apport < 0)
      errs.apport = "L'apport doit être positif ou nul.";
    if (!values.taux || isNaN(taux) || taux <= 0 || taux >= 15)
      errs.taux = 'Le taux doit être entre 0 et 15 %.';
    if (!values.loyer || isNaN(loyer) || loyer <= 0)
      errs.loyer = 'Le loyer doit être supérieur à 0.';
    if (isNaN(charges) || charges < 0)
      errs.charges = 'Les charges doivent être positives ou nulles.';
    if (isNaN(taxe) || taxe < 0)
      errs.taxeFonciere = 'La taxe foncière doit être positive ou nulle.';
    if (isNaN(vacance) || vacance < 0 || vacance > 100)
      errs.vacance = 'Le taux de vacance doit être entre 0 et 100 %.';

    return errs;
  }, []);

  const handleSimulate = useCallback(
    (e) => {
      e.preventDefault();
      const errs = validate(form);
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;

      setIsPrudent(false);
      const inputs = {
        prix: parseFloat(form.prix),
        apport: parseFloat(form.apport),
        taux: parseFloat(form.taux),
        duree: parseInt(form.duree, 10),
        loyer: parseFloat(form.loyer),
        charges: parseFloat(form.charges),
        taxeFonciere: parseFloat(form.taxeFonciere),
        vacance: parseFloat(form.vacance),
      };
      setResults(compute(inputs));
    },
    [form, validate],
  );

  const handlePrudent = useCallback(() => {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsPrudent(true);
    const charges = parseFloat(form.charges);
    const vacance = parseFloat(form.vacance);
    const inputs = {
      prix: parseFloat(form.prix),
      apport: parseFloat(form.apport),
      taux: parseFloat(form.taux),
      duree: parseInt(form.duree, 10),
      loyer: parseFloat(form.loyer),
      charges: charges * 1.15,
      taxeFonciere: parseFloat(form.taxeFonciere),
      vacance: vacance + 8.33,
    };
    setResults(compute(inputs));
  }, [form, validate]);

  return (
    <>
      <PageHead
        title="Simulateur rendement locatif — Versi Invest"
        description="Calculez cashflow net, rendement brut et net, effort d'épargne. Scénario nominal et prudent. Gratuit."
      />
      <Nav />
      <main>
        {/* --- Header --- */}
        <header className="page-header">
          <div className="container">
            <h1 className="page-header__title">
              Les chiffres d'abord.
              <br />
              La décision ensuite.
            </h1>
            <p className="page-header__intro">
              Renseignez les informations ci-dessous. La simulation intègre chaque charge et
              présente systématiquement un scénario prudent — pas uniquement le meilleur cas.
            </p>
          </div>
        </header>

        {/* --- Formulaire + Résultats --- */}
        <section className="simulateur section-padding" aria-label="Simulateur de rendement">
          <div className="container">
            <div className="simulateur__grid">
              {/* Colonne gauche : formulaire */}
              <form
                className="simulateur__form"
                onSubmit={handleSimulate}
                noValidate
              >
                {/* Prix */}
                <div className="simulateur__field">
                  <label className="simulateur__label" htmlFor="sim-prix">
                    Prix d'acquisition (€)
                  </label>
                  <span className="simulateur__hint">
                    En euros, frais d'agence inclus si applicable
                  </span>
                  <input
                    id="sim-prix"
                    className={`simulateur__input ${errors.prix ? 'simulateur__input--error' : ''}`}
                    type="number"
                    name="prix"
                    value={form.prix}
                    onChange={handleChange}
                    placeholder="Ex : 180 000"
                    min="1"
                    required
                    aria-describedby={errors.prix ? 'err-prix' : undefined}
                  />
                  {errors.prix && (
                    <span id="err-prix" className="simulateur__error" role="alert">
                      {errors.prix}
                    </span>
                  )}
                </div>

                {/* Apport */}
                <div className="simulateur__field">
                  <label className="simulateur__label" htmlFor="sim-apport">
                    Apport personnel (€)
                  </label>
                  <input
                    id="sim-apport"
                    className={`simulateur__input ${errors.apport ? 'simulateur__input--error' : ''}`}
                    type="number"
                    name="apport"
                    value={form.apport}
                    onChange={handleChange}
                    placeholder="Ex : 30 000"
                    min="0"
                    required
                    aria-describedby={errors.apport ? 'err-apport' : undefined}
                  />
                  {errors.apport && (
                    <span id="err-apport" className="simulateur__error" role="alert">
                      {errors.apport}
                    </span>
                  )}
                </div>

                {/* Taux */}
                <div className="simulateur__field">
                  <label className="simulateur__label" htmlFor="sim-taux">
                    Taux d'intérêt estimé (%)
                  </label>
                  <input
                    id="sim-taux"
                    className={`simulateur__input ${errors.taux ? 'simulateur__input--error' : ''}`}
                    type="number"
                    name="taux"
                    value={form.taux}
                    onChange={handleChange}
                    step="0.1"
                    min="0.1"
                    max="14.9"
                    required
                    aria-describedby={errors.taux ? 'err-taux' : undefined}
                  />
                  {errors.taux && (
                    <span id="err-taux" className="simulateur__error" role="alert">
                      {errors.taux}
                    </span>
                  )}
                </div>

                {/* Durée */}
                <div className="simulateur__field">
                  <label className="simulateur__label" htmlFor="sim-duree">
                    Durée du crédit
                  </label>
                  <select
                    id="sim-duree"
                    className="simulateur__select"
                    name="duree"
                    value={form.duree}
                    onChange={handleChange}
                  >
                    <option value="15">15 ans</option>
                    <option value="20">20 ans</option>
                    <option value="25">25 ans</option>
                  </select>
                </div>

                {/* Loyer */}
                <div className="simulateur__field">
                  <label className="simulateur__label" htmlFor="sim-loyer">
                    Loyer mensuel estimé (€)
                  </label>
                  <span className="simulateur__hint">Hors charges, en euros</span>
                  <input
                    id="sim-loyer"
                    className={`simulateur__input ${errors.loyer ? 'simulateur__input--error' : ''}`}
                    type="number"
                    name="loyer"
                    value={form.loyer}
                    onChange={handleChange}
                    placeholder="Ex : 1 200"
                    min="1"
                    required
                    aria-describedby={errors.loyer ? 'err-loyer' : undefined}
                  />
                  {errors.loyer && (
                    <span id="err-loyer" className="simulateur__error" role="alert">
                      {errors.loyer}
                    </span>
                  )}
                </div>

                {/* Charges copro */}
                <div className="simulateur__field">
                  <label className="simulateur__label" htmlFor="sim-charges">
                    Charges de copropriété (€/mois)
                  </label>
                  <input
                    id="sim-charges"
                    className={`simulateur__input ${errors.charges ? 'simulateur__input--error' : ''}`}
                    type="number"
                    name="charges"
                    value={form.charges}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    aria-describedby={errors.charges ? 'err-charges' : undefined}
                  />
                  {errors.charges && (
                    <span id="err-charges" className="simulateur__error" role="alert">
                      {errors.charges}
                    </span>
                  )}
                </div>

                {/* Taxe foncière */}
                <div className="simulateur__field">
                  <label className="simulateur__label" htmlFor="sim-taxe">
                    Taxe foncière annuelle (€)
                  </label>
                  <input
                    id="sim-taxe"
                    className={`simulateur__input ${errors.taxeFonciere ? 'simulateur__input--error' : ''}`}
                    type="number"
                    name="taxeFonciere"
                    value={form.taxeFonciere}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    aria-describedby={errors.taxeFonciere ? 'err-taxe' : undefined}
                  />
                  {errors.taxeFonciere && (
                    <span id="err-taxe" className="simulateur__error" role="alert">
                      {errors.taxeFonciere}
                    </span>
                  )}
                </div>

                {/* Vacance */}
                <div className="simulateur__field">
                  <label className="simulateur__label" htmlFor="sim-vacance">
                    Taux de vacance locative (%)
                  </label>
                  <input
                    id="sim-vacance"
                    className={`simulateur__input ${errors.vacance ? 'simulateur__input--error' : ''}`}
                    type="number"
                    name="vacance"
                    value={form.vacance}
                    onChange={handleChange}
                    step="0.1"
                    min="0"
                    max="100"
                    aria-describedby={errors.vacance ? 'err-vacance' : undefined}
                  />
                  {errors.vacance && (
                    <span id="err-vacance" className="simulateur__error" role="alert">
                      {errors.vacance}
                    </span>
                  )}
                </div>

                {/* Boutons */}
                <div className="simulateur__actions">
                  <button type="submit" className="simulateur__btn simulateur__btn--primary">
                    Simuler
                  </button>
                  <button
                    type="button"
                    className={`simulateur__btn simulateur__btn--secondary ${isPrudent ? 'simulateur__btn--active' : ''}`}
                    onClick={handlePrudent}
                    title="Le scénario prudent ajoute 15 % aux charges et provisionne 1 mois de vacance locative par an."
                  >
                    {isPrudent ? 'Scénario prudent actif' : 'Voir le scénario prudent'}
                  </button>
                </div>
              </form>

              {/* Colonne droite : résultats */}
              <div className="simulateur__results" aria-live="polite">
                <h2 className="simulateur__results-title">Résultats</h2>

                {!results ? (
                  <p className="simulateur__results-empty">
                    Renseignez les champs et cliquez sur
                    &laquo;&nbsp;Simuler&nbsp;&raquo; pour voir les résultats.
                  </p>
                ) : (
                  <>
                    <span
                      className={`simulateur__scenario-badge ${
                        isPrudent
                          ? 'simulateur__scenario-badge--prudent'
                          : 'simulateur__scenario-badge--nominal'
                      }`}
                    >
                      {isPrudent ? 'Scénario prudent' : 'Scénario nominal'}
                    </span>

                    <div className="simulateur__metrics">
                      <div className="simulateur__metric">
                        <span className="simulateur__metric-label">Mensualité crédit</span>
                        <span className="simulateur__metric-value simulateur__metric-value--neutral">
                          {formatEuro(results.mensualite)}/mois
                        </span>
                      </div>

                      <div className="simulateur__metric">
                        <span className="simulateur__metric-label">Cashflow brut</span>
                        <span
                          className={`simulateur__metric-value ${signClass(results.cashflowBrut)}`}
                        >
                          {results.cashflowBrut >= 0 ? '+' : ''}
                          {formatEuro(results.cashflowBrut)}/mois
                        </span>
                      </div>

                      <div className="simulateur__metric">
                        <span className="simulateur__metric-label">Cashflow net</span>
                        <span
                          className={`simulateur__metric-value ${signClass(results.cashflowNet)}`}
                        >
                          {results.cashflowNet >= 0 ? '+' : ''}
                          {formatEuro(results.cashflowNet)}/mois
                        </span>
                      </div>

                      <div className="simulateur__metric">
                        <span className="simulateur__metric-label">Rendement brut</span>
                        <span className="simulateur__metric-value simulateur__metric-value--neutral">
                          {formatPercent(results.rendementBrut)}
                        </span>
                      </div>

                      <div className="simulateur__metric">
                        <span className="simulateur__metric-label">Rendement net</span>
                        <span className="simulateur__metric-value simulateur__metric-value--neutral">
                          {formatPercent(results.rendementNet)}
                        </span>
                      </div>

                      {results.effortEpargne > 0 && (
                        <div className="simulateur__metric">
                          <span className="simulateur__metric-label">
                            Effort d'épargne mensuel
                          </span>
                          <span className="simulateur__metric-value simulateur__metric-value--negative">
                            {formatEuro(results.effortEpargne)}/mois
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Disclaimer */}
                    <div className="simulateur__disclaimer">
                      <p className="simulateur__disclaimer-text">
                        Simulation indicative et non contractuelle. Les résultats présentés sont
                        calculés sur la base des informations renseignées et d'hypothèses de marché
                        standard. Ils ne constituent pas un conseil en investissement au sens de la
                        réglementation financière. Les performances passées ne préjugent pas des
                        performances futures. Versi Invest recommande de consulter un
                        expert-comptable ou un conseiller en gestion de patrimoine pour toute
                        décision d'investissement.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* --- CTA --- */}
        <section className="simulateur-cta page-cta section-padding" aria-label="Inscription">
          <div className="container page-cta__inner">
            <p className="page-cta__text">
              Les biens sourcés par Versi Invest passent ce simulateur en scénario prudent — ou ne sont pas présentés. Si vous voulez accéder aux prochaines opportunités, la liste d'attente est ouverte.
            </p>
            <Link to="/contact" className="page-cta__btn">
              Demander à rejoindre la liste →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
