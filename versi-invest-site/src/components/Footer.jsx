import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Footer.css';

const CONTACT_EMAIL = 'contact@versi.fr';

/** Lien footer : scroll en haut si pas de hash, scroll vers l'ancre si hash */
function FooterLink({ to, className, children }) {
  const navigate = useNavigate();
  const handleClick = useCallback((e) => {
    e.preventDefault();
    const [path, hash] = to.split('#');
    navigate(path || '/');
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [navigate, to]);

  return (
    <Link to={to} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__disclaimer">
        <div className="container">
          <p className="footer__disclaimer-text">
            Versi Invest est titulaire de la carte professionnelle T (transaction immobilière). Les informations présentées sur ce site ne constituent pas un conseil en investissement au sens de la réglementation financière.
          </p>
        </div>
      </div>
      <div className="footer__separator" />
      <div className="footer__inner container">
        {/* Colonne 1 - Logo + baseline */}
        <div className="footer__brand">
          <Link to="/" className="footer__logo-link">
            <span className="footer__logo">VERSI</span>
            <span className="footer__logo-label">INVEST</span>
          </Link>
          <span className="footer__tagline">
            Investissement locatif - Hauts-de-France &amp; Île-de-France
          </span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="footer__email">
            {CONTACT_EMAIL}
          </a>
          <span className="footer__holding">
            Versi Invest - une entité du Groupe Versi -{' '}
            <a href="https://versi.fr" target="_blank" rel="noopener noreferrer" className="footer__holding-link">
              versi.fr
            </a>
          </span>
        </div>

        {/* Colonne 2 - Navigation */}
        <div className="footer__col">
          <span className="footer__col-title">Navigation</span>
          <nav className="footer__nav" aria-label="Liens navigation">
            <FooterLink to="/" className="footer__nav-link">Accueil</FooterLink>
            <FooterLink to="/comment-ca-marche" className="footer__nav-link">Comment ça marche</FooterLink>
            <FooterLink to="/references" className="footer__nav-link">Références</FooterLink>
            <FooterLink to="/equipe" className="footer__nav-link">Équipe</FooterLink>
            <FooterLink to="/blog" className="footer__nav-link">Le regard Versi</FooterLink>
            <FooterLink to="/contact" className="footer__nav-link footer__nav-link--cta">Contact</FooterLink>
          </nav>
        </div>

        {/* Colonne 3 - Groupe Versi */}
        <div className="footer__col">
          <span className="footer__col-title">Groupe Versi</span>
          <nav className="footer__nav" aria-label="Liens Groupe Versi">
            <a href="https://versi.fr" target="_blank" rel="noopener noreferrer" className="footer__nav-link">Versi</a>
            <a href="https://versi-immobilier.fr" target="_blank" rel="noopener noreferrer" className="footer__nav-link">Versi Immobilier</a>
          </nav>
        </div>

        {/* Colonne 4 - Legal */}
        <div className="footer__legal-col">
          <div className="footer__legal">
            <FooterLink to="/mentions-legales" className="footer__legal-link">
              Mentions légales
            </FooterLink>
            <span className="footer__legal-sep"> · </span>
            <FooterLink to="/politique-de-confidentialite" className="footer__legal-link">
              Politique de confidentialité
            </FooterLink>
          </div>
          <span className="footer__copyright">
            © {currentYear} Versi Invest
          </span>
          <span className="footer__copyright">
            Tous droits réservés
          </span>
        </div>
      </div>
    </footer>
  );
}
