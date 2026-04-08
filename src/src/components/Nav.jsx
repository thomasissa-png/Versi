import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useScrollSpy } from '../hooks/useScrollSpy.js';
import './Nav.css';

const NAV_ITEMS = [
  { label: 'VISION', href: '#mission' },
  { label: 'ACTIVITÉS', href: '#activites' },
  { label: 'ÉQUIPE', href: '#equipe' },
  { label: 'IMPLANTATION', href: '#implantation' },
  { label: 'CONTACT', href: '#contact' },
];

const SECTION_MAP = {
  '#mission': 'mission',
  '#activites': 'activites',
  '#equipe': 'equipe',
  '#implantation': 'implantation',
  '#contact': 'contact',
};

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeSection = useScrollSpy();
  const menuRef = useRef(null);
  const hamburgerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  useEffect(() => {
    if (!isHome) {
      setScrolled(true);
      return;
    }
    const onScroll = () => {
      const heroEl = document.getElementById('hero');
      const threshold = heroEl ? heroEl.offsetHeight - 80 : 400;
      setScrolled(window.scrollY >= threshold);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

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

  const handleNavClick = useCallback((e, href) => {
    e.preventDefault();
    setMenuOpen(false);

    if (!isHome) {
      navigate('/' + href);
      return;
    }

    const target = document.querySelector(href);
    if (target) {
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });

      if (href === '#contact') {
        setTimeout(() => {
          const firstInput = target.querySelector('input[name="nom"]');
          firstInput?.focus();
        }, 600);
      }
    }
  }, [isHome, navigate]);

  return (
    <nav className={`nav ${scrolled ? 'nav--scrolled' : ''}`} aria-label="Navigation principale">
      <div className="nav__inner">
        <a
          href="#hero"
          className="nav__logo"
          onClick={(e) => handleNavClick(e, '#hero')}
        >
          VERSI
        </a>

        <ul className="nav__items">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className={`nav__link ${activeSection === SECTION_MAP[item.href] ? 'nav__link--active' : ''}`}
                onClick={(e) => handleNavClick(e, item.href)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#contact"
          className="nav__cta"
          onClick={(e) => handleNavClick(e, '#contact')}
        >
          NOUS CONTACTER
        </a>

        <button
          ref={hamburgerRef}
          className="nav__hamburger"
          onClick={() => setMenuOpen(true)}
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
            onClick={() => {
              setMenuOpen(false);
              hamburgerRef.current?.focus();
            }}
            aria-label="Fermer le menu"
          >
            <span className="nav__close-line" />
            <span className="nav__close-line" />
          </button>
          <ul className="nav__overlay-items">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="nav__overlay-link"
                  onClick={(e) => handleNavClick(e, item.href)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
