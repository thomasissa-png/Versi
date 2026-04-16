/**
 * AppFooter — Versi Studio
 *
 * Réplique fidèle du Footer.jsx de versi.fr (src/src/components/Footer.jsx) adapté à Next.js.
 * Identité visuelle Versi : fond sombre, séparateur top, logo VERSI + baseline,
 * email + entités groupe + mentions légales + copyright.
 */

import Link from 'next/link';
import './AppFooter.css';

const CONTACT_EMAIL = 'contact@versi.fr';

export default function AppFooter() {
  return (
    <footer className="vs-footer">
      <div className="vs-footer__separator" />
      <div className="vs-footer__inner">
        <div className="vs-footer__left">
          <span className="vs-footer__logo">VERSI</span>
          <span className="vs-footer__baseline">Holding immobilière intégrée</span>
        </div>
        <div className="vs-footer__right">
          <a href={`mailto:${CONTACT_EMAIL}`} className="vs-footer__email">
            {CONTACT_EMAIL}
          </a>
          <span className="vs-footer__entities">
            <a
              href="https://versi-immobilier.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="vs-footer__entity-link"
            >
              Versi Immobilier
            </a>
            {' · '}
            <a
              href="https://versi-invest.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="vs-footer__entity-link"
            >
              Versi Invest
            </a>
            {' · Versi Capital · Versi Finance'}
          </span>
          <div className="vs-footer__legal">
            <Link href="/mentions-legales" className="vs-footer__legal-link">
              Mentions légales
            </Link>
            <span className="vs-footer__legal-sep"> · </span>
            <Link href="/politique-de-confidentialite" className="vs-footer__legal-link">
              Politique de confidentialité
            </Link>
          </div>
          <span className="vs-footer__copyright">© 2026 Versi. Tous droits réservés.</span>
        </div>
      </div>
    </footer>
  );
}
