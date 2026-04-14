import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import './LegalPage.css';

export default function MentionsLegales() {
  return (
    <>
      <PageHead
        title="Mentions légales — Versi Invest"
        description="Informations légales du site versi-invest.fr. Éditeur, hébergeur, droits."
      />
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content">
        <section className="page-header" aria-label="En-tête de page">
          <div className="container">
            <h1 className="page-header__title">Mentions légales</h1>
          </div>
        </section>

        <section className="legal section-padding" aria-label="Mentions légales">
          <div className="container">
            <article className="legal__content">
              <h2>Éditeur du site</h2>
              <p>
                Le site Versi Invest est édité par <strong>Versi Invest</strong>, entité en cours d'immatriculation, filiale du Groupe Versi.
              </p>
              <p><strong>Maison mère pendant la période transitoire d'immatriculation :</strong></p>
              <p>
                <strong>SAS Gradient One</strong> (dénomination commerciale : Groupe Versi)
              </p>
              <ul className="legal__list">
                <li>Forme juridique : Société par Actions Simplifiée (SAS)</li>
                <li>Email : contact@versi.fr</li>
              </ul>

              <h2>Directeur de la publication</h2>
              <p>
                Thomas Issa, co-fondateur de Versi Invest
              </p>
              <p className="legal__note">
                Le directeur de la publication est une personne physique, conformément à la Loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique.
              </p>

              <h2>Hébergeur</h2>
              <p>Le site Versi Invest est hébergé par :</p>
              <p><strong>Replit Inc.</strong></p>
              <ul className="legal__list">
                <li>Adresse : 101 2nd St, Suite 1000, San Francisco, CA 94105, États-Unis</li>
                <li>Site web : replit.com</li>
              </ul>

              <h2>Activité réglementée</h2>
              <p>
                Versi Invest exerce une activité d'investissement immobilier locatif relevant de la Loi n° 70-9 du 2 janvier 1970, dite Loi Hoguet.
              </p>
              <p>
                <strong>Carte professionnelle "Transactions sur immeubles et fonds de commerce"</strong> : en cours d'obtention auprès de la Chambre de Commerce et d'Industrie (CCI).
              </p>
              <p>
                Pendant la période d'obtention de la carte professionnelle, Versi Invest limite son activité aux prestations de conseil en stratégie d'investissement et de simulation financière, conformément à la réglementation en vigueur.
              </p>

              <h2>Honoraires</h2>
              <p>
                Versi Invest perçoit des honoraires exclusivement auprès de l'investisseur (acheteur), au titre de sa mission de suivi. Aucun honoraire n'est perçu auprès du vendeur.
              </p>
              <p>
                Les honoraires sont fixés à <strong>5% du prix d'acquisition TTC</strong> et sont précisés dans le mandat signé préalablement à toute mission. Toute rémunération est conditionnée à la signature d'un acte authentique de vente, conformément à la Loi Hoguet.
              </p>

              <h2>Avertissement — Simulation financière</h2>
              <p>
                Les simulations financières produites par Versi Invest sont fournies <strong>à titre indicatif uniquement</strong>, sur la base de données saisies et d'hypothèses de marché non garanties. Elles ne constituent pas un conseil en investissement, une promesse de rendement ou une garantie de résultat. Versi Invest n'est pas conseiller en investissements financiers (CIF) et n'est pas soumis à la réglementation AMF. L'investissement immobilier locatif comporte des risques, dont la vacance locative et la fluctuation des prix de marché.
              </p>

              <h2>Médiation de la consommation</h2>
              <p>
                En cas de litige non résolu à l'amiable avec Versi Invest, le client consommateur peut recourir gratuitement au médiateur de la consommation. Conformément à l'article L. 612-1 du Code de la consommation, tout professionnel ayant conclu un contrat avec un consommateur doit adhérer à un dispositif de médiation et en communiquer les coordonnées dans ses CGU et sur son site.
              </p>

              <h2>Propriété intellectuelle</h2>
              <p>
                L'ensemble des contenus présents sur le site Versi Invest (textes, images, logos, simulations, graphiques) est la propriété exclusive de SAS Gradient One / Versi Invest, sauf mentions contraires. Toute reproduction, représentation, modification ou exploitation, totale ou partielle, sans autorisation préalable écrite est interdite et constitue une contrefaçon sanctionnée par les articles L. 335-2 et suivants du Code de la propriété intellectuelle.
              </p>

              <h2>Protection des données personnelles</h2>
              <p>
                Le traitement des données personnelles collectées sur le site Versi Invest est régi par la <a href="/politique-de-confidentialite">politique de confidentialité</a>.
              </p>
              <p>
                Conformément au Règlement (UE) 2016/679 (RGPD), vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition concernant vos données personnelles. Pour exercer ces droits : contact@versi.fr
              </p>

              <h2>Liens hypertextes</h2>
              <p>
                Le site Versi Invest peut contenir des liens vers des sites tiers. Versi Invest n'est pas responsable du contenu de ces sites et ne peut être tenu responsable des dommages résultant de leur utilisation.
              </p>

              <h2>Droit applicable</h2>
              <p>
                Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français sont seuls compétents, sous réserve des règles impératives applicables aux consommateurs.
              </p>

              <p className="legal__updated">Dernière mise à jour : avril 2026</p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
