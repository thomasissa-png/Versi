import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CONTACT_EMAIL } from '../config/contact.js';
import './Footer.css';

/** Lien footer qui scroll en haut même si on est déjà sur la page cible */
function FooterLink({ to, className, children }) {
  const navigate = useNavigate();
  const handleClick = useCallback((e) => {
    e.preventDefault();
    window.scrollTo(0, 0);
    navigate(to);
  }, [navigate, to]);

  return (
    <Link to={to} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [subscribeMessage, setSubscribeMessage] = useState('');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setSubscribeStatus('loading');
    try {
      const res = await fetch('/api/public/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setSubscribeStatus('success');
      setSubscribeMessage('Inscription confirmée. Vous serez notifié en avant-première.');
      setEmail('');
    } catch {
      setSubscribeStatus('error');
      setSubscribeMessage('Une erreur est survenue. Réessayez ou contactez-nous.');
    }
  };

  return (
    <footer className="footer">
      <div className="footer__subscribe" style={{
        background: 'var(--color-bg-dark)',
        padding: 'var(--spacing-2xl) var(--spacing-lg)',
        textAlign: 'center',
      }}>
        <div className="container" style={{ maxWidth: '480px' }}>
          <p className="text-body-lg" style={{ color: 'var(--color-text-inverse)', marginBottom: 'var(--spacing-sm)' }}>
            Recevez nos biens en avant-première.
          </p>
          <p className="text-body-sm" style={{ color: 'var(--color-text-inverse)', opacity: 0.6, marginBottom: 'var(--spacing-md)' }}>
            Un email par nouveau bien. Pas de spam.
          </p>
          {subscribeStatus === 'success' ? (
            <p className="text-body-md" style={{ color: 'var(--color-accent)' }}>
              {subscribeMessage}
            </p>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <input
                type="email"
                placeholder="Votre email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Adresse email pour inscription"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'var(--color-text-inverse)',
                  fontFamily: 'var(--font-family)',
                  fontSize: '16px',
                  minHeight: '44px',
                }}
              />
              <button
                type="submit"
                disabled={subscribeStatus === 'loading'}
                style={{
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--color-accent)',
                  color: 'var(--color-bg-dark)',
                  fontFamily: 'var(--font-family)',
                  fontSize: '14px',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: subscribeStatus === 'loading' ? 'wait' : 'pointer',
                  minHeight: '44px',
                  whiteSpace: 'nowrap',
                }}
              >
                {subscribeStatus === 'loading' ? 'Envoi...' : "S'inscrire"}
              </button>
            </form>
          )}
          {subscribeStatus === 'error' && (
            <p className="text-body-sm" style={{ color: '#e74c3c', marginTop: 'var(--spacing-sm)' }}>
              {subscribeMessage}
            </p>
          )}
        </div>
      </div>
      <div className="footer__separator" />
      <div className="footer__inner container">
        {/* Colonne 1 — Logo + baseline */}
        <div className="footer__brand">
          <Link to="/" className="footer__logo-link">
            <span className="footer__logo">VERSI</span>
            <span className="footer__logo-label">IMMOBILIER</span>
          </Link>
          <span className="footer__tagline">
            Marchand de biens — Hauts-de-France &amp; Île-de-France
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
            <FooterLink to="/nos-biens" className="footer__nav-link">Nos biens disponibles</FooterLink>
            <FooterLink to="/realisations" className="footer__nav-link">Nos réalisations</FooterLink>
            <FooterLink to="/notre-approche" className="footer__nav-link">Notre approche</FooterLink>
            <FooterLink to="/blog" className="footer__nav-link">Notre regard</FooterLink>
            <FooterLink to="/nos-biens#notification" className="footer__nav-link footer__nav-link--cta">
              Être notifié en avant-première
            </FooterLink>
          </nav>
        </div>

        {/* Colonne 3 — Vendeurs */}
        <div className="footer__col">
          <span className="footer__col-title">Vendeurs</span>
          <nav className="footer__nav" aria-label="Liens vendeurs">
            <FooterLink to="/vendre" className="footer__nav-link">Céder un bien</FooterLink>
            <FooterLink to="/vendre#process" className="footer__nav-link">Notre process</FooterLink>
            <FooterLink to="/contact" className="footer__nav-link">Contact</FooterLink>
          </nav>
        </div>

        {/* Colonne 4 — Légal */}
        <div className="footer__legal-col">
          <div className="footer__legal">
            <FooterLink to="/mentions-legales" className="footer__legal-link">
              Mentions légales
            </FooterLink>
            <span className="footer__legal-sep"> · </span>
            <FooterLink to="/mentions-legales#politique-de-confidentialite" className="footer__legal-link">
              Politique de confidentialité
            </FooterLink>
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
