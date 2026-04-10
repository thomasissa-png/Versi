import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../config/contact.js';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__separator" />
      <div className="footer__inner container">
        {/* Colonne 1 — Logo + baseline */}
        <div className="footer__brand">
          <Link to="/" className="footer__logo-link">
            <span className="footer__logo">VERSI</span>
            <span className="footer__logo-label">IMMOBILIER</span>
          </Link>
          <span className="footer__tagline">
            Marchand de biens — Lille & France
          </span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="footer__email">
            {CONTACT_EMAIL}
          </a>
          <span className="footer__holding">
            Versi Immobilier est une entité du Groupe Versi —{' '}
            <a href="https://versi.fr" target="_blank" rel="noopener noreferrer" className="footer__holding-link">
              versi.fr
            </a>
          </span>
        </div>

        {/* Colonne 2 — Acquéreurs */}
        <div className="footer__col">
          <span className="footer__col-title">Acquéreurs</span>
          <nav className="footer__nav" aria-label="Liens acquéreurs">
            <Link to="/nos-biens" className="footer__nav-link">Nos biens disponibles</Link>
            <Link to="/realisations" className="footer__nav-link">Nos réalisations</Link>
            <Link to="/notre-approche" className="footer__nav-link">Notre approche</Link>
            <Link to="/nos-biens#notification" className="footer__nav-link footer__nav-link--cta">
              Être notifié en avant-première
            </Link>
          </nav>
        </div>

        {/* Colonne 3 — Vendeurs */}
        <div className="footer__col">
          <span className="footer__col-title">Vendeurs</span>
          <nav className="footer__nav" aria-label="Liens vendeurs">
            <Link to="/vendre" className="footer__nav-link">Céder un bien</Link>
            <Link to="/vendre#process" className="footer__nav-link">Notre process</Link>
            <Link to="/contact" className="footer__nav-link">Contact</Link>
          </nav>
        </div>

        {/* Colonne 4 — Légal */}
        <div className="footer__legal-col">
          <div className="footer__legal">
            <Link to="/mentions-legales" className="footer__legal-link">
              Mentions légales
            </Link>
            <span className="footer__legal-sep"> · </span>
            <Link to="/mentions-legales#politique-de-confidentialite" className="footer__legal-link">
              Politique de confidentialité
            </Link>
          </div>
          <span className="footer__copyright">
            © {currentYear} Versi Immobilier
          </span>
          <span className="footer__copyright">
            Tous droits réservés
          </span>
        </div>
      </div>
    </footer>
  );
}
