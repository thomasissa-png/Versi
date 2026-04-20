import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import './LegalPage.css';

export default function PolitiqueConfidentialite() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  return (
    <>
      <PageHead
        title="Politique de confidentialité — Versi"
        description="Politique de confidentialité et RGPD du site versi.fr."
        noindex
      />
      <Nav />
      <div className="legal-page">
        <main className="legal-page__content container">
          <h1 className="text-heading-lg legal-page__title">Politique de confidentialité</h1>

          <section className="legal-page__section">
            <h2>Introduction</h2>
            <p>
              Versi attache une importance particulière à la protection de vos données personnelles. La présente politique de confidentialité décrit comment Versi collecte, utilise et protège les informations personnelles que vous nous communiquez lorsque vous utilisez le site versi.fr.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>1. Responsable du traitement</h2>
            <p><strong>Responsable du traitement :</strong> Gradient One (exploitant la marque Versi)</p>
            <p><strong>Adresse :</strong> 54 rue Henri Barbusse, 92000 Nanterre</p>
            <p><strong>Email de contact :</strong> contact@versi.fr</p>
            <p>
              Versi ne dispose pas de Délégué à la Protection des Données (DPO) au sens de l'article 37 du RGPD, la taille de la structure et la nature des traitements ne rendant pas sa désignation obligatoire.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>2. Données collectées et finalités</h2>
            <h3>2.1 Formulaire de contact</h3>
            <p>Lorsque vous remplissez le formulaire de contact, Versi collecte :</p>
            <ul>
              <li><strong>Nom et prénom</strong> — identifier votre demande et personnaliser la réponse</li>
              <li><strong>Adresse email</strong> — vous répondre par email</li>
              <li><strong>Numéro de téléphone</strong> (optionnel) — vous recontacter si vous l'avez indiqué</li>
              <li><strong>Message</strong> — comprendre et traiter votre demande</li>
            </ul>
            <p>
              <strong>Base légale :</strong> intérêt légitime (art. 6.1.f RGPD) — répondre aux demandes de contact émises volontairement par les utilisateurs.
            </p>
            <p>Ces données ne sont pas utilisées à des fins de prospection commerciale non sollicitée, ni cédées à des tiers.</p>

            <h3>2.2 Analytics</h3>
            <p>
              Versi utilise Umami Analytics, une solution respectueuse de la vie privée. Aucun cookie n'est déposé, aucune donnée personnelle identifiable n'est collectée, aucun suivi inter-sites n'est effectué. L'utilisation d'Umami Analytics ne nécessite pas votre consentement.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>3. Durée de conservation</h2>
            <p>
              <strong>Données du formulaire de contact :</strong> 3 ans à compter du dernier contact avec Versi.
            </p>
            <p>
              <strong>Données analytics Umami :</strong> données agrégées anonymes — conservation indéfinie (non personnelles).
            </p>
          </section>

          <section className="legal-page__section">
            <h2>4. Destinataires des données</h2>
            <p>
              Vos données personnelles collectées via le formulaire de contact sont destinées exclusivement aux équipes de Versi (Thomas Issa, Maxime Lemoine, Carl Standertskjold-Nordenstam).
            </p>
            <p>Aucune donnée personnelle n'est vendue, louée ou cédée à des tiers à des fins commerciales.</p>
          </section>

          <section className="legal-page__section">
            <h2>5. Transferts hors Union européenne</h2>
            <p>
              Versi s'efforce de traiter vos données au sein de l'Union européenne. En cas de recours à un prestataire établi hors de l'UE, les transferts sont encadrés par les garanties appropriées prévues par le RGPD (clauses contractuelles types de la Commission européenne ou décision d'adéquation).
            </p>
          </section>

          <section className="legal-page__section">
            <h2>6. Vos droits</h2>
            <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :</p>
            <ul>
              <li><strong>Droit d'accès</strong> (art. 15 RGPD) — obtenir une copie des données vous concernant</li>
              <li><strong>Droit de rectification</strong> (art. 16 RGPD) — corriger des données inexactes</li>
              <li><strong>Droit à l'effacement</strong> (art. 17 RGPD) — demander la suppression de vos données</li>
              <li><strong>Droit à la portabilité</strong> (art. 20 RGPD) — recevoir vos données dans un format structuré</li>
              <li><strong>Droit d'opposition</strong> (art. 21 RGPD) — vous opposer au traitement basé sur l'intérêt légitime</li>
              <li><strong>Droit à la limitation</strong> (art. 18 RGPD) — demander la suspension du traitement</li>
            </ul>
            <p>
              Pour exercer vos droits, contactez-nous à <strong>contact@versi.fr</strong>. Délai de réponse : un mois (prolongeable de deux mois en cas de complexité).
            </p>
          </section>

          <section className="legal-page__section">
            <h2>7. Sécurité des données</h2>
            <p>
              Versi met en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données : transmission via HTTPS, accès limité aux co-fondateurs, aucun stockage dans une base de données publique.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>8. Cookies</h2>
            <p>Le site versi.fr ne dépose aucun cookie publicitaire, cookie de réseaux sociaux ou cookie de profilage comportemental.</p>
            <p>Umami Analytics est utilisé : aucun cookie n'est déposé. Aucun bandeau de consentement n'est requis.</p>
          </section>

          <section className="legal-page__section">
            <h2>9. Réclamation auprès de la CNIL</h2>
            <p>
              Si vous estimez que le traitement de vos données ne respecte pas la réglementation, vous pouvez introduire une réclamation auprès de la CNIL : 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — www.cnil.fr
            </p>
          </section>

          <section className="legal-page__section">
            <h2>10. Modifications</h2>
            <p>
              Versi se réserve le droit de modifier la présente politique à tout moment, notamment en cas d'évolution réglementaire. Dernière mise à jour : avril 2026.
            </p>
          </section>
        </main>
      </div>
      <Footer />
    </>
  );
}
