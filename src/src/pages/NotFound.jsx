import { Link } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';
import './NotFound.css';

export default function NotFound() {
  return (
    <>
      <PageHead
        title="Page introuvable - Versi"
        description="La page demandée n'existe pas."
        noindex
      />
      <div className="not-found">
        <div className="not-found__content">
          <h1 className="text-heading-lg not-found__title">Page introuvable.</h1>
          <Link to="/" className="not-found__link text-cta">
            Retour à l'accueil
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
