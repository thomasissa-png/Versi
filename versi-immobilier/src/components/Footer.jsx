import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../config/contact.js';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__separator" />
      <div className="footer__inner container">
        <div className="footer__left">
          <Link to="/" className="footer__logo-link">
            <span className="footer__logo">VERSI</span>
            <span className="footer__logo-label">IMMOBILIER</span>
          </Link>
          <span className="footer__baseline">
            Entité de la holding{' '}
            <a href="https://versi.fr" target="_blank" rel="noopener noreferrer" className="footer__holding-link">
              Versi
            </a>
          </span>
        </div>
        <div className="footer__right">
          <a href={`mailto:${CONTACT_EMAIL}`} className="footer__email">
            {CONTACT_EMAIL}
          </a>
          <nav className="footer__nav" aria-label="Liens rapides">
            <Link to="/biens" className="footer__nav-link">Nos biens</Link>
            <Link to="/vendre" className="footer__nav-link">Vendre un bien</Link>
            <Link to="/realisations" className="footer__nav-link">Réalisations</Link>
            <Link to="/approche" className="footer__nav-link">Notre approche</Link>
          </nav>
          <div className="footer__legal">
            <Link to="/mentions-legales" className="footer__legal-link">
              Mentions légales
            </Link>
            <span className="footer__legal-sep"> · </span>
            <Link to="/politique-de-confidentialite" className="footer__legal-link">
              Politique de confidentialité
            </Link>
          </div>
          <span className="footer__copyright">© 2026 Versi Immobilier. Tous droits réservés.</span>
        </div>
      </div>
    </footer>
  );
}
