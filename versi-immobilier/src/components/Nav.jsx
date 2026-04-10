import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Nav.css';

const NAV_ITEMS = [
  { label: 'NOS BIENS', href: '/nos-biens' },
  { label: 'RÉALISATIONS', href: '/realisations' },
  { label: 'NOTRE APPROCHE', href: '/notre-approche' },
  { label: 'CONTACT', href: '/contact' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const hamburgerRef = useRef(null);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Focus trap in mobile menu
  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = menuRef.current?.querySelectorAll(
        'a[href], button:not([disabled])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleMenuOpen = useCallback(() => {
    setMenuOpen(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuOpen(false);
    hamburgerRef.current?.focus();
  }, []);

  return (
    <nav
      className={`nav ${scrolled || !isHome ? 'nav--scrolled' : ''}`}
      aria-label="Navigation principale"
    >
      <div className="nav__inner">
        <Link to="/" className="nav__logo">
          <span className="nav__logo-name">VERSI</span>
          <span className="nav__logo-label">IMMOBILIER</span>
        </Link>

        <ul className="nav__items">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className={`nav__link ${location.pathname.startsWith(item.href) ? 'nav__link--active' : ''}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link to="/vendre" className="nav__cta">
          Céder un bien
        </Link>

        <button
          ref={hamburgerRef}
          className="nav__hamburger"
          onClick={handleMenuOpen}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label="Menu de navigation"
        >
          <span className="nav__hamburger-line" />
          <span className="nav__hamburger-line" />
          <span className="nav__hamburger-line" />
        </button>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          ref={menuRef}
          className="nav__overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            className="nav__close"
            onClick={handleMenuClose}
            aria-label="Fermer le menu"
          >
            <span className="nav__close-line" />
            <span className="nav__close-line" />
          </button>
          <ul className="nav__overlay-items">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className="nav__overlay-link"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/vendre"
                className="nav__overlay-cta"
              >
                CÉDER UN BIEN
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
