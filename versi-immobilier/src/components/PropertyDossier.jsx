/**
 * PropertyDossier - sections du dossier de pré-commercialisation.
 *
 * Chaque section est exportée individuellement pour permettre à
 * PropertyDetailPage de les composer dans l'ordre exact du document
 * source (HTML), avec d'autres sections autour (Emplacement, Le bien,
 * Caractéristiques).
 *
 * Le composant par défaut PropertyDossier rend l'ensemble dans un ordre
 * « dossier autonome » (utile pour un usage standalone), mais l'annonce
 * publique préfère composer les sections elle-même.
 *
 * Structure attendue (camelCase) : voir scripts/seed-properties-muguets.js.
 */

function Section({ title, children }) {
  return (
    <section className="property-dossier__section">
      <h2 className="text-heading-md property-detail__section-title">{title}</h2>
      {children}
    </section>
  );
}

// 1. Plan + tableau des surfaces ---------------------------------------------
export function PlanSection({ planImage, planCaption, surfaces }) {
  if (!planImage && (!surfaces || surfaces.length === 0)) return null;
  return (
    <Section title="Plan.">
      <div className="property-dossier__plan">
        {planImage && (
          <figure className="property-dossier__plan-figure">
            <img
              src={planImage}
              alt={planCaption || 'Plan d’architecte'}
              className="property-dossier__plan-image"
              loading="eager"
            />
            {planCaption && (
              <figcaption className="text-body-sm property-dossier__caption">
                {planCaption}
              </figcaption>
            )}
          </figure>
        )}
        {surfaces && surfaces.length > 0 && (
          <ul className="property-dossier__surfaces">
            {surfaces.map((s) => (
              <li key={s.piece} className="property-dossier__surface-row">
                <span className="property-dossier__surface-piece">{s.piece}</span>
                <span className="property-dossier__surface-aire">{s.aire}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

// 2. Travaux (intro + phases) -------------------------------------------------
export function TravauxSection({ travaux }) {
  if (!travaux || !travaux.phases || travaux.phases.length === 0) return null;
  return (
    <Section title="Travaux.">
      {travaux.intro && (
        <p className="text-body-md property-dossier__intro">{travaux.intro}</p>
      )}
      <ol className="property-dossier__phases">
        {travaux.phases.map((phase) => (
          <li key={phase.num} className="property-dossier__phase">
            <span className="property-dossier__phase-num">{phase.num}</span>
            <div className="property-dossier__phase-body">
              <h3 className="property-dossier__phase-title">{phase.titre}</h3>
              <p className="text-body-md property-dossier__phase-text">{phase.texte}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// 3. État actuel et projet ----------------------------------------------------
export function EtatActuelSection({ etatActuel }) {
  if (!etatActuel || (!etatActuel.avantImage && !etatActuel.intro)) return null;
  return (
    <Section title="État actuel et projet.">
      {etatActuel.intro && (
        <p className="text-body-md property-dossier__intro">{etatActuel.intro}</p>
      )}
      <div className="property-dossier__avant-apres">
        {etatActuel.avantImage && (
          <figure className="property-dossier__avant">
            <img
              src={etatActuel.avantImage}
              alt={etatActuel.avantCaption || 'État actuel - avant travaux'}
              className="property-dossier__avant-image"
              loading="eager"
            />
            {etatActuel.avantCaption && (
              <figcaption className="text-body-sm property-dossier__caption">
                {etatActuel.avantCaption}
              </figcaption>
            )}
          </figure>
        )}
        <figure className="property-dossier__projet">
          {etatActuel.projetImage ? (
            <img
              src={etatActuel.projetImage}
              alt={etatActuel.projetCaption || 'Rendu 3D du logement fini'}
              className="property-dossier__projet-image"
              loading="eager"
            />
          ) : (
            <div
              className="property-dossier__projet-placeholder"
              role="img"
              aria-label="Rendu 3D du projet livré - à venir"
            >
              <span className="property-dossier__projet-badge">À venir</span>
              <span className="property-dossier__projet-text">
                Rendu 3D du logement fini
              </span>
              <span className="property-dossier__projet-subtext">
                Disponible à la fin du chantier
              </span>
            </div>
          )}
          {etatActuel.projetCaption && (
            <figcaption className="text-body-sm property-dossier__caption">
              {etatActuel.projetCaption}
            </figcaption>
          )}
        </figure>
      </div>
      {etatActuel.apresLegende && (
        <p className="text-body-sm property-dossier__apres-legende">
          {etatActuel.apresLegende}
        </p>
      )}
    </Section>
  );
}

// 4. Performances énergétiques (DPE projeté) ---------------------------------
export function DpeSection({ dpeProjete }) {
  if (!dpeProjete) return null;
  return (
    <Section title="Performances énergétiques.">
      {dpeProjete.intro && (
        <p className="text-body-md property-dossier__intro">{dpeProjete.intro}</p>
      )}
      <div className="property-dossier__dpe">
        <div
          className="property-dossier__dpe-classe"
          aria-label={`Classe DPE projetée ${dpeProjete.classe}`}
        >
          <span className="text-label property-dossier__dpe-label">Classe visée</span>
          <span className="property-dossier__dpe-letter">{dpeProjete.classe}</span>
        </div>
        <div className="property-dossier__dpe-meta">
          {dpeProjete.plage && (
            <p className="text-body-md">
              {dpeProjete.plage}
              {dpeProjete.unite && (
                <span className="property-dossier__dpe-unite"> · {dpeProjete.unite}</span>
              )}
            </p>
          )}
          {dpeProjete.note && (
            <p className="text-body-sm property-dossier__dpe-note">{dpeProjete.note}</p>
          )}
        </div>
      </div>
    </Section>
  );
}

// 5. Les deux formules --------------------------------------------------------
export function FormulesSection({ formules }) {
  if (!formules || (!formules.brut && !formules.pretAHabiter)) return null;
  return (
    <Section title="Acheter - les deux formules.">
      {formules.intro && (
        <p className="text-body-md property-dossier__intro">{formules.intro}</p>
      )}
      <div className="property-dossier__formules">
        {formules.brut && (
          <article className="property-dossier__formule">
            <header className="property-dossier__formule-head">
              <span className="text-label property-dossier__formule-label">
                {formules.brut.label || 'Brut'}
              </span>
              <span className="property-dossier__formule-price">
                {formules.brut.price}
              </span>
              {formules.brut.livraison && (
                <span className="text-body-sm property-dossier__formule-livraison">
                  {formules.brut.livraison}
                </span>
              )}
            </header>
            {formules.brut.description && (
              <p className="text-body-md property-dossier__formule-desc">
                {formules.brut.description}
              </p>
            )}
          </article>
        )}
        {formules.pretAHabiter && (
          <article className="property-dossier__formule property-dossier__formule--accent">
            <header className="property-dossier__formule-head">
              <span className="text-label property-dossier__formule-label">
                {formules.pretAHabiter.label || 'Prêt à habiter'}
              </span>
              <span className="property-dossier__formule-price">
                {formules.pretAHabiter.price}
              </span>
              {formules.pretAHabiter.livraison && (
                <span className="text-body-sm property-dossier__formule-livraison">
                  {formules.pretAHabiter.livraison}
                </span>
              )}
            </header>
            {formules.pretAHabiter.description && (
              <p className="text-body-md property-dossier__formule-desc">
                {formules.pretAHabiter.description}
              </p>
            )}
          </article>
        )}
      </div>
      {formules.garanties && (
        <p className="text-body-sm property-dossier__garanties">{formules.garanties}</p>
      )}
    </Section>
  );
}

// 5bis. Architecte ------------------------------------------------------------
// Bloc sobre rendu après Formules, fidèle au PDF "Une architecte sur tout
// le projet" (Louise Holleman, HOLLEMAN INTERIORS).
export function ArchitecteSection({ architecte }) {
  if (!architecte || !architecte.texte) return null;
  return (
    <Section title={architecte.titre || 'Une architecte sur tout le projet.'}>
      <p className="text-body-md property-dossier__intro">{architecte.texte}</p>
    </Section>
  );
}

// 6. Repères marché -----------------------------------------------------------
export function ReperesMarcheSection({ reperesMarche }) {
  if (!reperesMarche || !reperesMarche.rows || reperesMarche.rows.length === 0) return null;
  return (
    <Section title="Repères marché.">
      {reperesMarche.intro && (
        <p className="text-body-md property-dossier__intro">{reperesMarche.intro}</p>
      )}
      <table className="property-dossier__table">
        <thead>
          <tr>
            <th scope="col">Référence</th>
            <th scope="col" className="property-dossier__table-num">Prix / m²</th>
          </tr>
        </thead>
        <tbody>
          {reperesMarche.rows.map((row) => (
            <tr key={row.ref}>
              <td>
                <span className="property-dossier__table-ref">{row.ref}</span>
                {row.sousTitre && (
                  <span className="property-dossier__table-sub">{row.sousTitre}</span>
                )}
              </td>
              <td className="property-dossier__table-num">{row.prixM2}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {reperesMarche.conclusion && (
        <p className="text-body-sm property-dossier__intro">{reperesMarche.conclusion}</p>
      )}
    </Section>
  );
}

// 7. À prévoir ----------------------------------------------------------------
export function APrevoirSection({ aPrevoir }) {
  if (!aPrevoir || !aPrevoir.items || aPrevoir.items.length === 0) return null;
  return (
    <Section title="À prévoir.">
      {aPrevoir.intro && (
        <p className="text-body-md property-dossier__intro">{aPrevoir.intro}</p>
      )}
      <ul className="property-dossier__aprevoir">
        {aPrevoir.items.map((item) => (
          <li key={item.label} className="property-dossier__aprevoir-row">
            <span className="property-dossier__aprevoir-label">{item.label}</span>
            <span className="property-dossier__aprevoir-value">{item.valeur}</span>
          </li>
        ))}
      </ul>
      {aPrevoir.sources && (
        <p className="text-body-sm property-dossier__sources">{aPrevoir.sources}</p>
      )}
    </Section>
  );
}

// 8. Calendrier ---------------------------------------------------------------
export function CalendrierSection({ calendrier }) {
  if (!calendrier || calendrier.length === 0) return null;
  return (
    <Section title="Calendrier.">
      <ol className="property-dossier__timeline">
        {calendrier.map((step) => (
          <li key={step.label} className="property-dossier__timeline-step">
            <div className="property-dossier__timeline-marker" aria-hidden="true" />
            <div className="property-dossier__timeline-body">
              <span className="property-dossier__timeline-label">{step.label}</span>
              <span className="property-dossier__timeline-date">{step.date}</span>
              {step.statut && (
                <span className="property-dossier__timeline-statut">{step.statut}</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// Mentions légales ------------------------------------------------------------
export function MentionsSection({ mentions }) {
  if (!mentions) return null;
  return <p className="text-body-sm property-dossier__mentions">{mentions}</p>;
}

// Composant complet (ordre « dossier autonome ») -----------------------------
export default function PropertyDossier({ dossier }) {
  if (!dossier) return null;
  const {
    planImage,
    planCaption,
    surfaces,
    formules,
    architecte,
    travaux,
    etatActuel,
    dpeProjete,
    reperesMarche,
    aPrevoir,
    calendrier,
    mentions,
  } = dossier;

  return (
    <div className="property-dossier">
      <PlanSection planImage={planImage} planCaption={planCaption} surfaces={surfaces} />
      <FormulesSection formules={formules} />
      <ArchitecteSection architecte={architecte} />
      <TravauxSection travaux={travaux} />
      <EtatActuelSection etatActuel={etatActuel} />
      <DpeSection dpeProjete={dpeProjete} />
      <ReperesMarcheSection reperesMarche={reperesMarche} />
      <APrevoirSection aPrevoir={aPrevoir} />
      <CalendrierSection calendrier={calendrier} />
      <MentionsSection mentions={mentions} />
    </div>
  );
}
