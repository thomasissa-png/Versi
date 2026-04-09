import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../config/contact.js';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__separator" />
      <div className="footer__inner container">
        <div className="footer__left">
          <Link to="/" className="footer__logo-link">
            <span className="footer__logo">VERSI</span>
            <span className="footer__logo-label">IMMOBILIER</span>
          </Link>
          <span className="footer__tagline">
            Marchand de biens
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

        <div className="footer__center">
          <nav className="footer__nav" aria-label="Liens du pied de page">
            <Link to="/nos-biens" className="footer__nav-link">Nos biens</Link>
            <Link to="/vendre" className="footer__nav-link">Vendre un bien</Link>
            <Link to="/realisations" className="footer__nav-link">Réalisations</Link>
            <Link to="/notre-approche" className="footer__nav-link">Notre approche</Link>
            <Link to="/contact" className="footer__nav-link">Contact</Link>
            <Link to="/investir" className="footer__nav-link">Investir avec Versi</Link>
          </nav>
        </div>

        <div className="footer__right">
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
            © {currentYear} Versi Immobilier — SIREN 912 862 612
          </span>
        </div>
      </div>
    </footer>
  );
}
