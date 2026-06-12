import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import './LegalPage.css';

export default function MentionsLegales() {
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
        title="Mentions légales - Versi"
        description="Mentions légales du site versi.fr, holding immobilière."
        noindex
      />
      <Nav />
      <div className="legal-page">
        <main className="legal-page__content container">
          <h1 className="text-heading-lg legal-page__title">Mentions légales</h1>

          <section className="legal-page__section">
            <h2>Éditeur du site</h2>
            <p>
              Le site versi.fr est édité par <strong>Gradient One</strong>, maison mère de Versi,
              détenue par Thomas Issa, Maxime Lemoine et Carl Standertskjold-Nordenstam.
            </p>
            <ul>
              <li><strong>Raison sociale</strong> : Gradient One</li>
              <li><strong>Siège social</strong> : 54 rue Henri Barbusse, 92000 Nanterre</li>
              <li><strong>SIREN</strong> : 881 249 718</li>
              <li><strong>RCS</strong> : Nanterre</li>
              <li><strong>Email</strong> : contact@versi.fr</li>
            </ul>
          </section>

          <section className="legal-page__section">
            <h2>Directeur de la publication</h2>
            <p>Thomas Issa, co-fondateur.</p>
          </section>

          <section className="legal-page__section">
            <h2>Hébergeur</h2>
            <p>Le site versi.fr est hébergé par Replit Inc., 350 Bush Street, Suite 200, San Francisco, CA 94104, États-Unis.</p>
          </section>

          <section className="legal-page__section">
            <h2>Propriété intellectuelle</h2>
            <p>
              L'ensemble des contenus présents sur le site versi.fr - textes, graphismes, logo, structure, iconographie - est la propriété exclusive de Versi ou fait l'objet d'autorisations d'utilisation accordées à Versi.
            </p>
            <p>
              Toute reproduction, représentation, modification, publication, adaptation ou exploitation de tout ou partie des contenus du site, quel que soit le moyen ou le procédé utilisé, est interdite sauf autorisation écrite préalable de Versi.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>Crédits photographiques</h2>
            <p>Portraits des fondateurs : © Gradient One - tous droits réservés.</p>
            <p>Carte de France (section Implantation) : illustration vectorielle originale © Gradient One.</p>
          </section>

          <section className="legal-page__section">
            <h2>Responsabilité</h2>
            <p>
              Versi s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur le site versi.fr. Toutefois, Versi ne garantit pas l'exhaustivité, l'exactitude ou l'actualité des informations publiées et ne saurait être tenu responsable des erreurs ou omissions.
            </p>
            <p>
              Les informations disponibles sur ce site sont fournies à titre indicatif et ne constituent pas une offre contractuelle, un conseil en investissement ou une sollicitation commerciale.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>Données personnelles et cookies</h2>
            <p>
              Le traitement des données personnelles collectées via ce site est détaillé dans notre{' '}
              <Link to="/politique-de-confidentialite">Politique de confidentialité</Link>.
            </p>
            <p>Pour toute question relative à vos données personnelles, contactez-nous à : contact@versi.fr</p>
            <p>
              Vous disposez du droit de déposer une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) - 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 - www.cnil.fr
            </p>
          </section>

          <section className="legal-page__section">
            <h2>Droit applicable et juridiction</h2>
            <p>
              Le présent site et les mentions légales sont soumis au droit français. En cas de litige relatif à l'utilisation du site, les tribunaux français seront seuls compétents.
            </p>
          </section>
        </main>
      </div>
      <Footer />
    </>
  );
}
