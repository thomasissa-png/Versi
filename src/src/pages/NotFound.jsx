import { Link } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import './NotFound.css';

export default function NotFound() {
  return (
    <>
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
