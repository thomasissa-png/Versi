import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import './LegalPage.css';

export default function PolitiqueConfidentialite() {
  return (
    <>
      <PageHead
        title="Politique de confidentialité - Versi Invest"
        description="Traitement des données personnelles, droits RGPD, cookies, analytics Umami."
      />
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content">
        <section className="page-header" aria-label="En-tête de page">
          <div className="container">
            <h1 className="page-header__title">Politique de confidentialité</h1>
          </div>
        </section>

        <section className="legal section-padding" aria-label="Politique de confidentialité">
          <div className="container">
            <article className="legal__content">
              <h2>Introduction</h2>
              <p>
                Versi Invest, filiale de <strong>SAS Gradient One</strong>, traite vos données personnelles selon les principes du RGPD, décrits ci-dessous.
              </p>
              <p>
                La présente politique de confidentialité décrit comment Versi Invest collecte, utilise et protège les informations personnelles que vous nous communiquez lorsque vous utilisez le site Versi Invest, notamment via le formulaire de qualification investisseur.
              </p>

              <h2>1. Responsable du traitement</h2>
              <p>
                <strong>Responsable du traitement :</strong> SAS Gradient One (Groupe Versi / Versi Invest)
              </p>
              <p>
                <strong>Email de contact :</strong> contact@versi.fr
              </p>
              <p>
                Versi Invest ne dispose pas de Délégué à la Protection des Données (DPO) obligatoire au sens de l'article 37 du RGPD, la nature des traitements ne relevant pas des catégories visées à l'art. 37.1. Pour toute question relative à vos données personnelles : contact@versi.fr - ce contact fait office de point de contact RGPD.
              </p>

              <h2>2. Données collectées et finalités</h2>

              <h3 style={{ fontSize: '1rem', marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-sm)' }}>
                2.1 Formulaire de qualification investisseur
              </h3>
              <p>
                Lorsque vous remplissez le formulaire de qualification disponible sur le site Versi Invest, nous collectons les informations suivantes :
              </p>
              <div className="legal__table-wrap">
                <table className="legal__table">
                  <thead>
                    <tr>
                      <th>Donnée</th>
                      <th>Finalité</th>
                      <th>Base légale</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Nom et prénom</td>
                      <td>Identifier votre profil et personnaliser le suivi</td>
                      <td>Mesures précontractuelles (art. 6.1.b RGPD)</td>
                    </tr>
                    <tr>
                      <td>Adresse email</td>
                      <td>Vous recontacter et vous envoyer votre simulation</td>
                      <td>Mesures précontractuelles (art. 6.1.b RGPD)</td>
                    </tr>
                    <tr>
                      <td>Numéro de téléphone</td>
                      <td>Prise de contact pour qualifier votre projet</td>
                      <td>Mesures précontractuelles (art. 6.1.b RGPD)</td>
                    </tr>
                    <tr>
                      <td>Budget d'acquisition</td>
                      <td>Qualifier votre capacité d'investissement et identifier des biens adaptés</td>
                      <td>Mesures précontractuelles (art. 6.1.b RGPD)</td>
                    </tr>
                    <tr>
                      <td>Consentement communications</td>
                      <td>Vous envoyer des informations sur l'offre Versi Invest</td>
                      <td>Consentement (art. 6.1.a RGPD)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                <strong>Ces données sont utilisées exclusivement pour vous suivre dans votre projet d'investissement immobilier locatif. Elles ne sont pas cédées à des tiers à des fins commerciales.</strong>
              </p>

              <h3 style={{ fontSize: '1rem', marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-sm)' }}>
                2.2 Analytics - Umami
              </h3>
              <p>
                Versi Invest utilise <strong>Umami Analytics</strong> pour mesurer l'audience du site. Umami est une solution d'analyse d'audience respectueuse de la vie privée :
              </p>
              <ul className="legal__list">
                <li>Aucun cookie d'identification n'est déposé sur votre navigateur</li>
                <li>Aucune donnée personnelle identifiable n'est collectée</li>
                <li>Aucun suivi inter-sites n'est effectué</li>
              </ul>
              <p>
                Lorsque Umami est configuré en mode anonymisé, <strong>aucun consentement cookies n'est requis</strong>, conformément aux lignes directrices CNIL sur les solutions d'analyse d'audience exemptées.
              </p>

              <h3 style={{ fontSize: '1rem', marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-sm)' }}>
                2.3 Données non collectées
              </h3>
              <p>Versi Invest ne collecte pas :</p>
              <ul className="legal__list">
                <li>Données de santé</li>
                <li>Données bancaires (RIB, numéro de carte)</li>
                <li>Données relatives à des infractions ou condamnations</li>
                <li>Données concernant des mineurs de moins de 16 ans</li>
              </ul>

              <h2>3. Durée de conservation</h2>
              <div className="legal__table-wrap">
                <table className="legal__table">
                  <thead>
                    <tr>
                      <th>Catégorie</th>
                      <th>Durée</th>
                      <th>Fondement</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Prospects qualifiés non convertis</td>
                      <td>3 ans à compter du dernier contact</td>
                      <td>Référentiel CNIL prospects</td>
                    </tr>
                    <tr>
                      <td>Clients (données liées à la mission)</td>
                      <td>5 ans à compter de la fin de la mission</td>
                      <td>Prescription contractuelle (art. 2224 C. civ.)</td>
                    </tr>
                    <tr>
                      <td>Données de simulation financière</td>
                      <td>3 ans à compter de la simulation</td>
                      <td>Référentiel CNIL prospects</td>
                    </tr>
                    <tr>
                      <td>Logs analytics Umami</td>
                      <td>13 mois glissants</td>
                      <td>Recommandation CNIL</td>
                    </tr>
                    <tr>
                      <td>Preuve de consentement marketing</td>
                      <td>Jusqu'au retrait + 3 ans</td>
                      <td>Art. 7.1 RGPD</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2>4. Sous-traitants et transferts hors UE</h2>
              <div className="legal__table-wrap">
                <table className="legal__table">
                  <thead>
                    <tr>
                      <th>Sous-traitant</th>
                      <th>Rôle</th>
                      <th>Localisation</th>
                      <th>Garanties</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Replit Inc.</td>
                      <td>Hébergement du site</td>
                      <td>États-Unis</td>
                      <td>Clauses contractuelles types UE (décision 2021/914)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Les transferts vers les États-Unis sont encadrés par les Clauses Contractuelles Types adoptées par la Commission européenne. <strong>Aucun transfert de données à des partenaires commerciaux sans votre consentement explicite préalable.</strong>
              </p>

              <h2>5. Vos droits</h2>
              <p>Conformément au RGPD (art. 15 à 22), vous disposez des droits suivants :</p>
              <ul className="legal__list">
                <li><strong>Droit d'accès</strong> : obtenir une copie de vos données traitées</li>
                <li><strong>Droit de rectification</strong> : corriger des données inexactes ou incomplètes</li>
                <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données, sauf obligation légale</li>
                <li><strong>Droit à la limitation</strong> : suspendre le traitement dans certains cas</li>
                <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
                <li><strong>Droit d'opposition</strong> : vous opposer aux traitements fondés sur l'intérêt légitime</li>
                <li><strong>Droit de retrait du consentement</strong> : retirer votre consentement à tout moment sans remettre en cause les traitements antérieurs</li>
              </ul>
              <p>
                <strong>Pour exercer vos droits :</strong> contact@versi.fr - délai de réponse : 1 mois (prorogeable à 3 mois en cas de demande complexe).
              </p>
              <p>
                <strong>Réclamation :</strong> vous pouvez introduire une réclamation auprès de la <strong>CNIL</strong> - <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a> - 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07.
              </p>

              <h2>6. Sécurité des données</h2>
              <p>Versi Invest met en oeuvre les mesures techniques et organisationnelles appropriées pour protéger vos données :</p>
              <ul className="legal__list">
                <li>Connexion sécurisée HTTPS sur l'ensemble du site</li>
                <li>Accès aux données limité aux personnes habilitées</li>
                <li>Authentification sécurisée sur les outils de traitement</li>
              </ul>

              <h2>7. Cookies</h2>
              <p>
                <strong>Le site Versi Invest ne dépose pas de cookies de traçage publicitaire ou de profilage.</strong>
              </p>
              <p>
                Umami Analytics fonctionne sans cookies d'identification. Aucun bandeau de consentement cookies n'est requis. Les éventuels cookies techniques strictement nécessaires au fonctionnement du site ne nécessitent pas de consentement (exemption CNIL).
              </p>

              <h2>8. Modifications de la politique</h2>
              <p>
                Versi Invest se réserve le droit de modifier la présente politique à tout moment. En cas de modification substantielle, vous serez informé par email ou par notification sur le site. La date de dernière mise à jour est indiquée en bas de page.
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
