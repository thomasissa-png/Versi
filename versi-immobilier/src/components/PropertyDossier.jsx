/**
 * PropertyDossier — rendu riche du dossier de pré-commercialisation.
 *
 * Affiché UNIQUEMENT si `property.dossier` existe (JSONB). Sinon, la
 * fiche standard de PropertyDetailPage est rendue (rétrocompat Lot 3
 * et tout bien sans dossier).
 *
 * Structure attendue (camelCase) : voir docs/dossiers-sources/*.txt et
 * scripts/seed-properties-muguets.js pour la source de vérité du shape.
 *
 * Sections rendues :
 *  1. Plan d’architecte + tableau des surfaces
 *  2. Les deux formules (Brut / Prêt à habiter)
 *  3. Travaux 01 / 02 / 03
 *  4. État actuel & projet (Avant / Projet / Après)
 *  5. Performances énergétiques (DPE projeté)
 *  6. Repères marché
 *  7. À prévoir (charges, taxe foncière, notaire)
 *  8. Calendrier
 */

function Section({ title, children }) {
  return (
    <section className="property-dossier__section">
      <h2 className="text-heading-md property-detail__section-title">{title}</h2>
      {children}
    </section>
  );
}

export default function PropertyDossier({ dossier }) {
  if (!dossier) return null;

  const {
    planImage,
    planCaption,
    surfaces,
    formules,
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
      {/* 1. Plan + surfaces */}
      {(planImage || (surfaces && surfaces.length > 0)) && (
        <Section title="Plan.">
          <div className="property-dossier__plan">
            {planImage && (
              <figure className="property-dossier__plan-figure">
                <img
                  src={planImage}
                  alt={planCaption || 'Plan d’architecte'}
                  className="property-dossier__plan-image"
                  loading="lazy"
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
      )}

      {/* 2. Les deux formules */}
      {formules && (formules.brut || formules.pretAHabiter) && (
        <Section title="Acheter — les deux formules.">
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
      )}

      {/* 3. Travaux */}
      {travaux && travaux.phases && travaux.phases.length > 0 && (
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
      )}

      {/* 4. État actuel & projet */}
      {etatActuel && (etatActuel.avantImage || etatActuel.intro) && (
        <Section title="État actuel et projet.">
          {etatActuel.intro && (
            <p className="text-body-md property-dossier__intro">{etatActuel.intro}</p>
          )}
          <div className="property-dossier__avant-apres">
            {etatActuel.avantImage && (
              <figure className="property-dossier__avant">
                <img
                  src={etatActuel.avantImage}
                  alt={etatActuel.avantCaption || 'État actuel — avant travaux'}
                  className="property-dossier__avant-image"
                  loading="lazy"
                />
                {etatActuel.avantCaption && (
                  <figcaption className="text-body-sm property-dossier__caption">
                    {etatActuel.avantCaption}
                  </figcaption>
                )}
              </figure>
            )}
            <figure className="property-dossier__projet">
              <div
                className="property-dossier__projet-placeholder"
                role="img"
                aria-label="Rendu 3D du projet livré — à venir"
              >
                <span className="property-dossier__projet-badge">À venir</span>
                <span className="property-dossier__projet-text">
                  Rendu 3D du logement fini
                </span>
                <span className="property-dossier__projet-subtext">
                  Disponible à la fin du chantier
                </span>
              </div>
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
      )}

      {/* 5. Performances énergétiques (DPE projeté) */}
      {dpeProjete && (
        <Section title="Performances énergétiques.">
          {dpeProjete.intro && (
            <p className="text-body-md property-dossier__intro">{dpeProjete.intro}</p>
          )}
          <div className="property-dossier__dpe">
            <div className="property-dossier__dpe-classe" aria-label={`Classe DPE projetée ${dpeProjete.classe}`}>
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
      )}

      {/* 6. Repères marché */}
      {reperesMarche && reperesMarche.rows && reperesMarche.rows.length > 0 && (
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
      )}

      {/* 7. À prévoir */}
      {aPrevoir && aPrevoir.items && aPrevoir.items.length > 0 && (
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
      )}

      {/* 8. Calendrier */}
      {calendrier && calendrier.length > 0 && (
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
      )}

      {/* Mentions légales du dossier */}
      {mentions && (
        <p className="text-body-sm property-dossier__mentions">{mentions}</p>
      )}
    </div>
  );
}
