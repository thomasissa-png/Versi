import { Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import HomePage from './pages/HomePage.jsx';
import ProcessPage from './pages/ProcessPage.jsx';
import EquipePage from './pages/EquipePage.jsx';
import ReferencesPage from './pages/ReferencesPage.jsx';
import ReferenceDetailPage from './pages/ReferenceDetailPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import BlogPage from './pages/BlogPage.jsx';
import BlogArticlePage from './pages/BlogArticlePage.jsx';
import MentionsLegales from './pages/MentionsLegales.jsx';
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite.jsx';
import NotFound from './pages/NotFound.jsx';

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/comment-ca-marche" element={<ProcessPage />} />
        <Route path="/services" element={<Navigate to="/comment-ca-marche" replace />} />
        <Route path="/references" element={<ReferencesPage />} />
        <Route path="/references/:slug" element={<ReferenceDetailPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogArticlePage />} />
        <Route path="/equipe" element={<EquipePage />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/politique-de-confidentialite" element={<PolitiqueConfidentialite />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
