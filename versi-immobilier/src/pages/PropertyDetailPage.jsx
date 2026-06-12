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
// L'annonce publique compose les sections du dossier dans l'ordre exact
// du document source HTML (Emplacement → Le bien → Plan → Caractéristiques
// → Travaux → État actuel → Performances → Formules → Repères marché →
// À prévoir → Calendrier). Les sections sont importées nommément depuis
// PropertyDossier pour garder le design du site et un point de vérité
// unique. Le bloc CTA renvoyant vers /dossier/:id (page autonome + PDF)
// est conservé en fin d'annonce.
import {
  PlanSection,
  TravauxSection,
  EtatActuelSection,
  DpeSection,
  FormulesSection,
  ReperesMarcheSection,
  APrevoirSection,
  CalendrierSection,
} from '../components/PropertyDossier.jsx';

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

/* Icône placeholder SVG inline - aucune dépendance externe */
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

  /* JSON-LD RealEstateListing - GEO R6 */
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
     pré-commercialisation (Lot 1 RDC, Lot 2 T3 - pas Lot 3 duplex). On y
     puise un contenu plus riche pour l'annonce, SANS la transformer en
     dossier complet. Les biens sans dossier conservent l'affichage standard. */
  const dossier = property.dossier || null;

  /* Specs strip - préfère la fiche technique du dossier si présente,
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

  /* Description - quand un dossier existe, on assemble la section « Le bien »
     dans l'ordre exact du HTML source : leBien (1 ou 2 paragraphes) +
     pourQui + accroche. `leBien` accepte un tableau (HTML découpé en
     plusieurs <p>) ou une string (rétrocompat). Sans dossier (Lot 3) :
     split de la description standard. */
  const leBienParagraphs = dossier
    ? (Array.isArray(dossier.leBien)
        ? dossier.leBien.filter(Boolean)
        : (dossier.leBien ? [dossier.leBien] : []))
    : [];
  const descriptionParagraphs = dossier
    ? [...leBienParagraphs, dossier.pourQui, dossier.accroche].filter(Boolean)
    : (property.description ? property.description.split('\n\n') : []);

  /* Caractéristiques - préfère la liste du dossier (plus dense, mieux rédigée),
     sinon fallback sur les features standard. */
  const featuresList = dossier?.caracteristiques && Array.isArray(dossier.caracteristiques) && dossier.caracteristiques.length > 0
    ? dossier.caracteristiques
    : (property.features || []);

  /* Formules de prix - si le dossier expose brut + prêt à habiter, on
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
     (prixVedette) si disponible - c'est ce que le visiteur paie clé en main. */
  const headlinePrice = dossier?.bandeauPrix?.prixVedette || property.price;
  const headlineSubtitle = dossier?.bandeauPrix?.sousTitre || null;
  const headlineNotaire = dossier?.bandeauPrix?.notaire || null;

  /* Hook éditorial + intro contextuelle du dossier - affichés juste sous le
     titre pour donner du punch immédiat à l'annonce (sans dupliquer le
     dossier profond qui reste sur /dossier/:id). */
  const editorialHook = dossier?.hook || null;
  const editorialIntro = dossier?.intro || null;

  /* DPE projeté - utilisé par la section dédiée et par le fallback du
     bloc « Diagnostics et charges » quand le dossier n'est pas présent. */
  const dpeProjete = dossier?.dpeProjete || null;

  return (
    <>
      <PageHead
        title={`${property.title.slice(0, 30)} - ${property.city || 'Lille'} | Versi Immo`}
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
                        alt={photos[1].alt || `${property.title} - photo 2`}
                        className="property-detail__gallery-thumb"
                      />
                    ) : (
                      <div className="image-placeholder property-detail__gallery-thumb" />
                    )}
                    {photos[2] ? (
                      <img
                        src={photos[2].url}
                        alt={photos[2].alt || `${property.title} - photo 3`}
                        className="property-detail__gallery-thumb"
                      />
                    ) : (
                      <div className="image-placeholder property-detail__gallery-thumb" />
                    )}
                  </div>
                </>
              ) : (
                /* Placeholder pré-commercialisation - élégant, pas vide */
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

              {/* ── Colonne gauche - contenu de l'annonce ──
                  Ordre du document source HTML :
                  Hero (titre + hook + intro + fiche technique)
                  1. Emplacement
                  2. Le bien (leBien + pourQui)
                  3. Plan (planImage + surfaces + planCaption)
                  4. Caractéristiques
                  5. Travaux (intro + 3 phases)
                  6. État actuel et projet
                  7. Performances énergétiques (dpeProjete)
                  8. Les deux formules (brut / prêt-à-habiter / garanties)
                  9. Repères marché
                  10. À prévoir
                  11. Calendrier
                  + Diagnostics et charges (annonce standard)
                  + CTA dossier complet / PDF (conservé)

                  Fallback (Lot 3 duplex, sans dossier) :
                  l'annonce standard rend description multi-paragraphes,
                  features, travaux réalisés, emplacement, diagnostics.
              */}
              <div>
                {/* Hero - titre, accroche, fiche technique.
                    Tagline = dossier.tagline si présent (ex. « Lille · Lille-Sud
                    (quartier des fleurs) »), sinon fallback property.location. */}
                <span className="text-label property-detail__meta">
                  {dossier?.tagline || property.location}
                </span>
                <h1 className="text-heading-lg property-detail__title">
                  {property.title}
                </h1>

                {editorialHook && (
                  <p className="text-body-lg property-detail__hook">
                    {editorialHook}
                  </p>
                )}

                {editorialIntro && (
                  <p className="text-body-md property-detail__intro">
                    {editorialIntro}
                  </p>
                )}

                {/* Fiche technique - dossier.ficheTechnique si dispo, sinon
                    champs standard du bien */}
                <div className="property-detail__specs">
                  {specItems.filter((item) => item.value).map((item) => (
                    <div key={item.label} className="property-detail__spec-item">
                      <span className="text-label property-detail__spec-label">{item.label}</span>
                      <span className="property-detail__spec-value">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* ── Bloc prix mobile ── visible uniquement ≤ 768px.
                    Positionné après la fiche technique (specs strip), il
                    donne l'info n°1 (prix) sans attendre la colonne sticky.
                    Ne duplique pas le CTA lourd - juste un lien ancre sobre
                    vers #price-card. Fallback : property.price si pas de
                    dossier. */}
                <div className="property-detail__price-mobile" aria-label="Prix">
                  <div className="property-detail__price-mobile-main">
                    <span className="property-detail__price-mobile-amount">
                      {headlinePrice}
                    </span>
                    {headlineSubtitle && (
                      <span className="property-detail__price-mobile-sub">
                        {headlineSubtitle}
                      </span>
                    )}
                  </div>
                  {dossierFormules && (
                    <span className="property-detail__price-mobile-formules">
                      Brut {dossierFormules.avantTravaux}
                    </span>
                  )}
                  <a
                    href="#price-card"
                    className="property-detail__price-mobile-anchor"
                  >
                    Voir prix et visite →
                  </a>
                </div>

                {/* ── 1. Emplacement ──
                    Avec dossier.emplacement : rendu fidèle au HTML source
                    (2 paragraphes de prose + 3 blocs structurés Adresse /
                    Transports / À proximité). Sans dossier.emplacement
                    (Lot 3) : fallback champs standard nearby_transport /
                    nearby_amenities (longue liste d'équipements). */}
                <h2 className="text-heading-md property-detail__section-title">
                  Emplacement.
                </h2>
                <div className="property-detail__location-block">
                  {dossier?.emplacement ? (
                    <>
                      {Array.isArray(dossier.emplacement.prose) && dossier.emplacement.prose.map((p, i) => (
                        <p key={i} className="text-body-md property-detail__location-prose">
                          {p}
                        </p>
                      ))}
                      <div className="property-detail__location-grid">
                        {['adresse', 'transports', 'proximite'].map((slot) => {
                          const item = dossier.emplacement[slot];
                          if (!item || !item.value) return null;
                          return (
                            <div key={slot} className="property-detail__location-item">
                              <span className="text-label property-detail__location-item-label">
                                {item.label}
                              </span>
                              <span className="property-detail__location-item-value">
                                {item.value}
                              </span>
                              {item.note && (
                                <span className="property-detail__location-item-note">
                                  {item.note}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      {property.address && (
                        <p className="text-body-md property-detail__address">
                          {property.address}
                          {property.neighborhood && ` - quartier ${property.neighborhood}`}
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
                    </>
                  )}
                  {/* Carte OpenStreetMap - coordonnées 10 rue des Muguets */}
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

                {/* ── 2. Le bien ── */}
                {/* Avec dossier : leBien (présentation du logement) +
                    pourQui (à qui il s'adresse). Sans dossier (Lot 3) :
                    description multi-paragraphes du bien. */}
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

                {/* ── 3. Plan (dossier uniquement) ──
                    Image du plan + tableau des surfaces + légende */}
                {dossier && (
                  <PlanSection
                    planImage={dossier.planImage}
                    planCaption={dossier.planCaption}
                    surfaces={dossier.surfaces}
                  />
                )}

                {/* ── 4. Caractéristiques ──
                    Liste du dossier si dispo (plus dense, mieux rédigée),
                    sinon features standard du bien (Lot 3). */}
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

                {/* ── 5. Travaux (dossier uniquement) ──
                    Intro + 3 phases (Le plan / L'enveloppe / Les finitions) */}
                {dossier && <TravauxSection travaux={dossier.travaux} />}

                {/* ── 6. État actuel et projet (dossier uniquement) ──
                    Avant (image + caption) + Projet (placeholder 3D) */}
                {dossier && <EtatActuelSection etatActuel={dossier.etatActuel} />}

                {/* ── 7. Performances énergétiques (dossier uniquement) ──
                    Classe DPE projetée + plage + unité + note */}
                {dossier && <DpeSection dpeProjete={dpeProjete} />}

                {/* ── 8. Les deux formules (dossier uniquement) ──
                    Intro + brut + prêt-à-habiter + garanties */}
                {dossier && <FormulesSection formules={dossier.formules} />}

                {/* ── 9. Repères marché (dossier uniquement) ──
                    Intro + tableau de comparables + conclusion */}
                {dossier && (
                  <ReperesMarcheSection reperesMarche={dossier.reperesMarche} />
                )}

                {/* ── 10. À prévoir (dossier uniquement) ──
                    Intro + items (charges, taxe foncière, frais notaire) */}
                {dossier && <APrevoirSection aPrevoir={dossier.aPrevoir} />}

                {/* ── 11. Calendrier (dossier uniquement) ──
                    Timeline : plans / livraison brut / livraison prêt-à-habiter */}
                {dossier && <CalendrierSection calendrier={dossier.calendrier} />}

                {/* ── Travaux réalisés - fallback annonce standard
                    (bien existant déjà rénové). Inutile pour les lots
                    Muguets en pré-commercialisation. */}
                {property.works && property.works.length > 0 && (
                  <>
                    <h2 className="text-heading-md property-detail__section-title">
                      Travaux réalisés.{property.renovationYear && ` Rénovation ${property.renovationYear}.`}
                    </h2>
                    <ul className="property-detail__works">
                      {property.works.map((work) => (
                        <li key={work} className="property-detail__work-item">
                          <span aria-hidden="true" className="property-detail__work-bullet">-</span>
                          {work}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* ── Diagnostics et charges (toujours, si donnée) ──
                    Masqué si dpeProjete déjà rendu plus haut + pas de
                    données complémentaires (charges, dpe_note hors dossier). */}
                {(property.dpe || (property.dpeNote && !dpeProjete) || property.charges) && (
                  <>
                    <h2 className="text-heading-md property-detail__section-title">
                      Diagnostics et charges.
                    </h2>
                    <div className="property-detail__diagnostics">
                      {(property.dpe || (property.dpeNote && !dpeProjete)) && (
                        <div className="property-detail__diag-item">
                          <span className="text-label property-detail__diag-label">DPE</span>
                          {property.dpe && (
                            <span className="text-body-md">{property.dpe}</span>
                          )}
                          {property.dpeNote && (
                            <p className="text-body-sm property-detail__diag-note">
                              {property.dpeNote}
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

                {/* ── CTA dossier de pré-commercialisation ──
                    Conservé tel quel : renvoie vers /dossier/:id (page
                    autonome HTML + lien PDF). Affiché uniquement si le
                    bien dispose d'un dossier riche. */}
                {property.dossier && (
                  <div className="property-detail__dossier-cta">
                    <span className="text-label property-detail__dossier-kicker">
                      Dossier de pré-commercialisation
                    </span>
                    <h2 className="text-heading-md property-detail__dossier-title">
                      Recevoir le dossier complet.
                    </h2>
                    <p className="text-body-md property-detail__dossier-text">
                      Plans d’architecte haute résolution, formules d’achat,
                      calendrier des travaux, repères marché, performances
                      énergétiques - la version imprimable du dossier.
                    </p>
                    {/* Liens natifs (pas <Link> React) : /dossier/:id et
                        /dossier/:id/pdf sont servis par le serveur Express,
                        pas par le routeur SPA. Nouvel onglet pour garder
                        l'annonce ouverte. */}
                    <a
                      href={`/dossier/${encodeURIComponent(property.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="property-detail__dossier-link"
                    >
                      Consulter le dossier complet →
                    </a>
                    <a
                      href={`/dossier/${encodeURIComponent(property.id)}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="property-detail__dossier-link property-detail__dossier-link--secondary"
                    >
                      Télécharger en PDF
                    </a>
                  </div>
                )}
              </div>

              {/* ── Colonne droite - Price card sticky (annonce standard) ── */}
              <aside aria-label="Prix et contact">
                <div className="property-price-card" id="price-card">
                  <span className="property-price-card__label">Prix</span>
                  <span className="property-price-card__price">{headlinePrice}</span>
                  {headlineSubtitle && (
                    <span className="property-price-card__note">{headlineSubtitle}</span>
                  )}

                  {/* Double prix - priorité aux formules du dossier (source
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

                  {/* Mention notaire - issue du dossier (bandeauPrix.notaire). */}
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
