import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import PageHead from '../components/PageHead.jsx';
import { useProperty } from '../hooks/useProperty.js';
import { useProperties } from '../hooks/useProperties.js';
import { CONTACT_EMAIL } from '../config/contact.js';
import { useFadeIn } from '../hooks/useFadeIn.js';
// NOTE : PropertyDossier n'est plus importé ici. Le dossier riche vit
// désormais sur sa propre route /dossier/:id (DossierPage.jsx). L'annonce
// publique reste une annonce standard ; quand un bien dispose d'un dossier,
// un bloc CTA renvoie le visiteur vers la page dossier dédiée.

const STATUS_LABELS = {
  'disponible': 'Disponible',
  'sous-compromis': 'Sous compromis',
  'vendu': 'Vendu',
};

const STATUS_BADGE_CLASS = {
  'disponible': 'property-price-card__badge--disponible',
  'sous-compromis': 'property-price-card__badge--sous-compromis',
  'vendu': 'property-price-card__badge--vendu',
};

/* Icône placeholder SVG inline — aucune dépendance externe */
function CameraIcon() {
  return (
    <svg
      className="property-detail__placeholder-icon"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="4" y="12" width="40" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="26" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M18 12l3-6h6l3 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const { property, photos, loading, error } = useProperty(id);
  const { properties: allProperties } = useProperties('disponible');
  const { ref, isVisible } = useFadeIn();

  /* JSON-LD RealEstateListing — GEO R6 */
  useEffect(() => {
    if (!property) return;

    const mainImage = photos.length > 0 ? photos[0].url : undefined;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: property.title,
      description: property.description
        ? property.description.slice(0, 200)
        : undefined,
      url: `https://versi-immobilier.fr/nos-biens/${property.id}`,
      datePosted: property.created_at,
      ...(mainImage && { image: mainImage }),
      offers: {
        '@type': 'Offer',
        price: property.priceNum,
        priceCurrency: 'EUR',
        availability:
          property.status === 'disponible'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/SoldOut',
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: property.city,
        addressRegion: 'Hauts-de-France',
      },
      ...(property.surface && {
        floorSize: {
          '@type': 'QuantitativeValue',
          value: parseInt(property.surface, 10),
          unitCode: 'MTK',
        },
      }),
      ...(property.rooms && { numberOfRooms: property.rooms }),
      seller: { '@id': 'https://versi-immobilier.fr/#organization' },
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    script.id = 'property-jsonld';
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('property-jsonld');
      if (el) el.remove();
    };
  }, [property, photos]);

  if (loading) {
    return (
      <>
        <Nav />
        <main className="page-state">
          <div className="page-state__inner">
            <p className="text-body-lg">Chargement du bien…</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !property) {
    return (
      <>
        <Nav />
        <main className="page-state">
          <div className="page-state__inner">
            <p className="text-body-lg page-state__message">
              Ce bien n'est plus disponible.
            </p>
            <Link to="/nos-biens" className="text-cta page-state__link">
              Voir tous nos biens
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const otherProperties = allProperties.filter((p) => p.id !== id).slice(0, 3);

  /* Badge de statut dans la price card */
  const badgeClass = STATUS_BADGE_CLASS[property.status] || '';

  /* Interprétation du price_note pour la double grille prix */
  /* Détecte "avant travaux" + "prêt à habiter : XXX €" dans la note */
  const parseDualPricing = (note, mainPrice) => {
    if (!note) return null;
    // Format: "Prix avant travaux, ... Option prêt à habiter : 130 000 € ..."
    const isAvantTravaux = /avant\s+travaux/i.test(note);
    const pretMatch = note.match(/pr[eê]t\s+[àa]\s+habiter[^:]*:\s*([\d\s]+\s*€)/i);
    if (isAvantTravaux && pretMatch) {
      return { avantTravaux: mainPrice, pretAHabiter: pretMatch[1].trim() };
    }
    return null;
  };

  const dualPricing = parseDualPricing(property.priceNote, property.price);

  /* ── Enrichissement depuis le dossier de pré-commercialisation ──
     Le champ `property.dossier` (JSONB) est peuplé pour les biens en
     pré-commercialisation (Lot 1 RDC, Lot 2 T3 — pas Lot 3 duplex). On y
     puise un contenu plus riche pour l'annonce, SANS la transformer en
     dossier complet. Les biens sans dossier conservent l'affichage standard. */
  const dossier = property.dossier || null;

  /* Specs strip — préfère la fiche technique du dossier si présente,
     sinon fallback sur les champs standard de l'annonce. */
  const specItems = dossier?.ficheTechnique && Array.isArray(dossier.ficheTechnique) && dossier.ficheTechnique.length > 0
    ? dossier.ficheTechnique.map((row) => ({ label: row.label, value: row.value }))
    : [
        { label: 'Type', value: property.type },
        { label: 'Surface', value: property.surface },
        { label: 'Pièces', value: property.rooms },
        { label: 'DPE', value: property.dpe },
        { label: 'Étage', value: property.floor },
        { label: 'Disponibilité', value: property.tenancy },
      ];

  /* Description — quand un dossier existe, on assemble un texte rédactionnel
     plus riche : leBien (présentation du logement) + pourQui (à qui il s'adresse).
     Sinon, on garde la description standard. */
  const descriptionParagraphs = dossier
    ? [dossier.leBien, dossier.pourQui].filter(Boolean)
    : (property.description ? property.description.split('\n\n') : []);

  /* Caractéristiques — préfère la liste du dossier (plus dense, mieux rédigée),
     sinon fallback sur les features standard. */
  const featuresList = dossier?.caracteristiques && Array.isArray(dossier.caracteristiques) && dossier.caracteristiques.length > 0
    ? dossier.caracteristiques
    : (property.features || []);

  /* Travaux — résumé court depuis l'intro du dossier (pas les 3 phases
     détaillées, qui restent sur la page /dossier/:id). */
  const worksIntro = dossier?.travaux?.intro || null;

  /* Formules de prix — si le dossier expose brut + prêt à habiter, on
     prend ces valeurs (source de vérité), sinon on retombe sur le parsing
     du price_note (dualPricing). */
  const dossierFormules = dossier?.formules?.brut && dossier?.formules?.pretAHabiter
    ? {
        avantTravaux: dossier.formules.brut.price,
        pretAHabiter: dossier.formules.pretAHabiter.price,
        brutLivraison: dossier.formules.brut.livraison || null,
        pretLivraison: dossier.formules.pretAHabiter.livraison || null,
      }
    : null;

  /* Prix principal affiché : on met en avant le prêt-à-habiter du dossier
     (prixVedette) si disponible — c'est ce que le visiteur paie clé en main. */
  const headlinePrice = dossier?.bandeauPrix?.prixVedette || property.price;
  const headlineSubtitle = dossier?.bandeauPrix?.sousTitre || null;
  const headlineNotaire = dossier?.bandeauPrix?.notaire || null;

  /* Hook éditorial + intro contextuelle du dossier — affichés juste sous le
     titre pour donner du punch immédiat à l'annonce (sans dupliquer le
     dossier profond qui reste sur /dossier/:id). */
  const editorialHook = dossier?.hook || null;
  const editorialIntro = dossier?.intro || null;

  /* Intro des formules — courte ligne pédagogique au-dessus du bloc Travaux
     qui explique la logique brut vs prêt-à-habiter (sans dérouler le détail
     des descriptions de chaque formule, qui restent dans le dossier). */
  const formulesIntro = dossier?.formules?.intro || null;

  /* Argument de valeur marché — phrase d'accroche du bloc reperesMarche du
     dossier (ex. « ~ 12 % sous la médiane »). Affichée en encadré accent dans
     la colonne gauche, après les caractéristiques. Le tableau complet des
     comparables reste sur /dossier/:id. */
  const marketArgument = dossier?.reperesMarche?.intro || null;

  /* DPE enrichi — plage exacte issue du dossier (ex. « 71 – 110 kWh/m²/an »),
     plus précise que le seul dpe_note de l'annonce. */
  const dpeProjete = dossier?.dpeProjete || null;

  return (
    <>
      <PageHead
        title={`${property.title.slice(0, 30)} — ${property.city || 'Lille'} | Versi Immo`}
        description={`${property.type || 'Bien immobilier'}, ${property.surface || ''}, ${property.price || ''}. Visite sur demande.`}
      />
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" style={{ paddingTop: 'var(--nav-height)' }}>
        <section className="section-padding" ref={ref}>
          <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>

            {/* Back link */}
            <Link to="/nos-biens" className="text-label property-detail__back-link">
              ← Nos biens
            </Link>

            {/* ── Galerie ── */}
            <div className="property-detail__gallery">
              {photos.length > 0 ? (
                <>
                  <img
                    src={photos[0].url}
                    alt={photos[0].alt || property.title}
                    className="property-detail__gallery-main"
                  />
                  <div className="property-detail__gallery-col">
                    {photos[1] ? (
                      <img
                        src={photos[1].url}
                        alt={photos[1].alt || `${property.title} — photo 2`}
                        className="property-detail__gallery-thumb"
                      />
                    ) : (
                      <div className="image-placeholder property-detail__gallery-thumb" />
                    )}
                    {photos[2] ? (
                      <img
                        src={photos[2].url}
                        alt={photos[2].alt || `${property.title} — photo 3`}
                        className="property-detail__gallery-thumb"
                      />
                    ) : (
                      <div className="image-placeholder property-detail__gallery-thumb" />
                    )}
                  </div>
                </>
              ) : (
                /* Placeholder pré-commercialisation — élégant, pas vide */
                <div
                  className="property-detail__placeholder"
                  role="img"
                  aria-label="Photos bientôt disponibles"
                >
                  <CameraIcon />
                  <span className="property-detail__placeholder-text">
                    Photos bientôt disponibles
                  </span>
                  <span className="property-detail__placeholder-sub">
                    Rendez-vous pour une visite privée
                  </span>
                </div>
              )}
            </div>

            {/* ── Layout principal ── */}
            <div className="property-detail__layout">

              {/* Colonne gauche — détails (annonce publique STANDARD) */}
              <div>
                <span className="text-label property-detail__meta">
                  {property.location}
                </span>
                <h1 className="text-heading-lg property-detail__title">
                  {property.title}
                </h1>

                {/* Hook éditorial — phrase d'accroche du dossier, sous le titre.
                    Donne du punch immédiat à l'annonce. */}
                {editorialHook && (
                  <p className="text-body-lg property-detail__hook">
                    {editorialHook}
                  </p>
                )}

                {/* Intro contextuelle — situe l'immeuble / le projet / la livraison. */}
                {editorialIntro && (
                  <p className="text-body-md property-detail__intro">
                    {editorialIntro}
                  </p>
                )}

                {/* Specs strip — fiche technique du dossier si dispo, sinon champs standard */}
                <div className="property-detail__specs">
                  {specItems.filter((item) => item.value).map((item) => (
                    <div key={item.label} className="property-detail__spec-item">
                      <span className="text-label property-detail__spec-label">{item.label}</span>
                      <span className="property-detail__spec-value">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Description — leBien + pourQui (depuis le dossier), sinon description standard */}
                {descriptionParagraphs.length > 0 && (
                  <>
                    <h2 className="text-heading-md property-detail__section-title">
                      Le bien.
                    </h2>
                    <div className="text-body-md property-detail__description">
                      {descriptionParagraphs.map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                  </>
                )}

                {/* Caractéristiques — liste du dossier si dispo (plus dense), sinon features standard */}
                {featuresList && featuresList.length > 0 && (
                  <>
                    <h2 className="text-heading-md property-detail__section-title">
                      Caractéristiques.
                    </h2>
                    <div className="property-detail__features">
                      {featuresList.map((feat) => (
                        <span key={feat} className="property-detail__feature-tag">
                          {feat}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {/* Argument de valeur marché — phrase d'accroche du dossier
                    (ex. « ~ 12 % sous la médiane des T2 vendus à Lille-Sud »).
                    Encadré accent court. Le tableau des comparables reste sur
                    /dossier/:id. */}
                {marketArgument && (
                  <p className="text-body-md property-detail__accroche">
                    {marketArgument}
                  </p>
                )}

                {/* Formules d'achat — courte intro pédagogique. Le détail des
                    deux formules (brut vs prêt à habiter) reste sur le
                    dossier ; ici on explique simplement la logique. */}
                {formulesIntro && (
                  <>
                    <h2 className="text-heading-md property-detail__section-title">
                      Deux formules d'achat.
                    </h2>
                    <p className="text-body-md property-detail__description">
                      {formulesIntro}
                    </p>
                  </>
                )}

                {/* Travaux — résumé court depuis le dossier (les 3 phases
                    détaillées restent sur /dossier/:id). */}
                {worksIntro && (
                  <>
                    <h2 className="text-heading-md property-detail__section-title">
                      Travaux.
                    </h2>
                    <p className="text-body-md property-detail__description">
                      {worksIntro}
                    </p>
                  </>
                )}

                {/* ── CTA dossier de pré-commercialisation ──
                    Affiché UNIQUEMENT si le bien dispose d'un dossier riche.
                    Renvoie vers /dossier/:id (page autonome + PDF). */}
                {property.dossier && (
                  <div className="property-detail__dossier-cta">
                    <span className="text-label property-detail__dossier-kicker">
                      Dossier de pré-commercialisation
                    </span>
                    <h2 className="text-heading-md property-detail__dossier-title">
                      Tous les détails du projet, dans un dossier dédié.
                    </h2>
                    <p className="text-body-md property-detail__dossier-text">
                      Plans d’architecte, surfaces, formules d’achat, calendrier
                      des travaux, repères marché, performances énergétiques —
                      pour aller plus loin que l’annonce.
                    </p>
                    {/* Lien natif (pas <Link> React) : /dossier/:id est servi
                        par le serveur (HTML du dossier), pas par le routeur SPA.
                        Nouvel onglet pour garder l'annonce ouverte. */}
                    <a
                      href={`/dossier/${encodeURIComponent(property.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="property-detail__dossier-link"
                    >
                      Consulter le dossier complet →
                    </a>
                  </div>
                )}

                {/* Travaux réalisés */}
                {property.works && property.works.length > 0 && (
                  <>
                    <h2 className="text-heading-md property-detail__section-title">
                      Travaux réalisés.{property.renovationYear && ` Rénovation ${property.renovationYear}.`}
                    </h2>
                    <ul className="property-detail__works">
                      {property.works.map((work) => (
                        <li key={work} className="property-detail__work-item">
                          <span aria-hidden="true" className="property-detail__work-bullet">—</span>
                          {work}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Emplacement */}
                <h2 className="text-heading-md property-detail__section-title">
                  Emplacement.
                </h2>
                <div className="property-detail__location-block">
                  {property.address && (
                    <p className="text-body-md property-detail__address">
                      {property.address}
                      {property.neighborhood && ` — quartier ${property.neighborhood}`}
                    </p>
                  )}
                  {property.nearbyTransport && (
                    <p className="text-body-sm property-detail__transport">
                      <strong>Transports :</strong> {property.nearbyTransport}
                    </p>
                  )}
                  {property.nearbyAmenities && (
                    <p className="text-body-sm property-detail__amenities">
                      <strong>À proximité :</strong> {property.nearbyAmenities}
                    </p>
                  )}
                  {/* Carte OpenStreetMap — coordonnées 10 rue des Muguets, Lille */}
                  {property.address && /muguets/i.test(property.address) && (() => {
                    const lat = 50.6150;
                    const lng = 3.0580;
                    const bbox = `${lng - 0.005},${lat - 0.003},${lng + 0.005},${lat + 0.003}`;
                    return (
                      <iframe
                        title="Carte de l'emplacement"
                        className="property-detail__map"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
                      />
                    );
                  })()}
                </div>

                {/* Diagnostics & charges — masqué si aucune donnée.
                    Si le dossier expose un dpeProjete (classe + plage), on
                    utilise ces valeurs (plus précises que dpe_note brut). */}
                {(property.dpe || property.dpeNote || property.charges || dpeProjete) && (
                  <>
                    <h2 className="text-heading-md property-detail__section-title">
                      Diagnostics et charges.
                    </h2>
                    <div className="property-detail__diagnostics">
                      {(property.dpe || property.dpeNote || dpeProjete) && (
                        <div className="property-detail__diag-item">
                          <span className="text-label property-detail__diag-label">
                            {dpeProjete ? 'DPE projeté' : 'DPE'}
                          </span>
                          {dpeProjete ? (
                            <span className="text-body-md">
                              Classe {dpeProjete.classe}
                              {dpeProjete.plage && ` · ${dpeProjete.plage}`}
                              {dpeProjete.unite && ` (${dpeProjete.unite})`}
                            </span>
                          ) : property.dpe ? (
                            <span className="text-body-md">{property.dpe}</span>
                          ) : null}
                          {(dpeProjete?.note || property.dpeNote) && (
                            <p className="text-body-sm property-detail__diag-note">
                              {dpeProjete?.note || property.dpeNote}
                            </p>
                          )}
                        </div>
                      )}
                      {property.charges && (
                        <div className="property-detail__diag-item">
                          <span className="text-label property-detail__diag-label">Charges de copropriété</span>
                          <span className="text-body-md">{property.charges}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* ── Colonne droite — Price card sticky (annonce standard) ── */}
              <aside aria-label="Prix et contact">
                <div className="property-price-card">
                  <span className="property-price-card__label">Prix</span>
                  <span className="property-price-card__price">{headlinePrice}</span>
                  {headlineSubtitle && (
                    <span className="property-price-card__note">{headlineSubtitle}</span>
                  )}

                  {/* Double prix — priorité aux formules du dossier (source
                      de vérité), sinon fallback sur parsing du price_note. */}
                  {dossierFormules ? (
                    <div className="property-price-card__dual">
                      <div className="property-price-card__dual-row">
                        <span className="property-price-card__dual-label">Brut (avant travaux)</span>
                        <span className="property-price-card__dual-value">{dossierFormules.avantTravaux}</span>
                      </div>
                      <div className="property-price-card__dual-row">
                        <span className="property-price-card__dual-label">Prêt à habiter</span>
                        <span className="property-price-card__dual-value">{dossierFormules.pretAHabiter}</span>
                      </div>
                    </div>
                  ) : dualPricing ? (
                    <div className="property-price-card__dual">
                      <div className="property-price-card__dual-row">
                        <span className="property-price-card__dual-label">Avant travaux</span>
                        <span className="property-price-card__dual-value">{dualPricing.avantTravaux}</span>
                      </div>
                      <div className="property-price-card__dual-row">
                        <span className="property-price-card__dual-label">Prêt à habiter</span>
                        <span className="property-price-card__dual-value">{dualPricing.pretAHabiter}</span>
                      </div>
                    </div>
                  ) : property.priceNote ? (
                    <span className="property-price-card__note">{property.priceNote}</span>
                  ) : null}

                  {/* Mention notaire — issue du dossier (bandeauPrix.notaire). */}
                  {headlineNotaire && (
                    <span className="property-price-card__note">{headlineNotaire}</span>
                  )}

                  <span className={`property-price-card__badge ${badgeClass}`}>
                    {STATUS_LABELS[property.status] || property.status}
                  </span>

                  <Link
                    to={`/contact?bien=${encodeURIComponent(property.title)}&bienId=${encodeURIComponent(property.id)}`}
                    className="property-price-card__cta-primary"
                  >
                    Demander une visite
                  </Link>

                  <hr className="property-price-card__separator" />

                  <Link
                    to={`/contact?bien=${encodeURIComponent(property.title)}&bienId=${encodeURIComponent(property.id)}`}
                    className="property-price-card__cta-secondary"
                    aria-label={`Poser une question au sujet de ${property.title}`}
                  >
                    Poser vos questions
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* Autres biens disponibles */}
        {otherProperties.length > 0 && (
          <section className="section-padding other-properties__section">
            <div className="container">
              <h2 className="text-heading-lg other-properties__title">
                D'autres biens disponibles.
              </h2>
              <div className="other-properties__grid">
                {otherProperties.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
              <Link to="/nos-biens" className="text-label other-properties__link">
                Voir tous nos biens →
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
