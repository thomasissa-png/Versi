import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://versi-invest.fr';

/**
 * Composant SEO centralise — injecte title, description et canonical via react-helmet-async.
 * @param {string} title — balise <title>
 * @param {string} description — meta description
 * @param {boolean} [noindex] — ajoute robots noindex,follow si true
 */
export default function PageHead({ title, description, noindex = false }) {
  const { pathname } = useLocation();
  const canonical = `${SITE_URL}${pathname}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, follow" />}
    </Helmet>
  );
}
