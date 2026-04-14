import { Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import HomePage from './pages/HomePage.jsx';
import ProcessPage from './pages/ProcessPage.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import EquipePage from './pages/EquipePage.jsx';
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
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/equipe" element={<EquipePage />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/politique-de-confidentialite" element={<PolitiqueConfidentialite />} />
        {/* Pages dynamiques ajoutées par l'autre agent */}
        {/* <Route path="/simulateur" element={<SimulateurPage />} /> */}
        {/* <Route path="/references" element={<ReferencesPage />} /> */}
        {/* <Route path="/contact" element={<ContactPage />} /> */}
        {/* <Route path="/blog" element={<BlogPage />} /> */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
