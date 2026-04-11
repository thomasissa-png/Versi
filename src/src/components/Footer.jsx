import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../config/contact.js';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__separator" />
      <div className="footer__inner container">
        <div className="footer__left">
          <span className="footer__logo">VERSI</span>
          <span className="footer__baseline">Holding immobilière intégrée</span>
        </div>
        <div className="footer__right">
          <a href={`mailto:${CONTACT_EMAIL}`} className="footer__email">
            {CONTACT_EMAIL}
          </a>
          <span className="footer__entities">
            <a href="https://versi-immobilier.fr" target="_blank" rel="noopener noreferrer" className="footer__entity-link">Versi Immobilier</a> · Versi Invest · Versi Capital · Versi Finance
          </span>
          <div className="footer__legal">
            <Link to="/mentions-legales" className="footer__legal-link">
              Mentions légales
            </Link>
            <span className="footer__legal-sep"> · </span>
            <Link to="/politique-de-confidentialite" className="footer__legal-link">
              Politique de confidentialité
            </Link>
          </div>
          <span className="footer__copyright">© 2026 Versi. Tous droits réservés.</span>
        </div>
      </div>
    </footer>
  );
}
