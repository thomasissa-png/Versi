import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import PropertiesPage from './pages/PropertiesPage.jsx';
import PropertyDetailPage from './pages/PropertyDetailPage.jsx';
import SellPage from './pages/SellPage.jsx';
import RealisationsPage from './pages/RealisationsPage.jsx';
import RealisationDetailPage from './pages/RealisationDetailPage.jsx';
import ApprochePage from './pages/ApprochePage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import MentionsLegales from './pages/MentionsLegales.jsx';
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite.jsx';
import NotFound from './pages/NotFound.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/biens" element={<PropertiesPage />} />
      <Route path="/biens/:id" element={<PropertyDetailPage />} />
      <Route path="/vendre" element={<SellPage />} />
      <Route path="/realisations" element={<RealisationsPage />} />
      <Route path="/realisations/:id" element={<RealisationDetailPage />} />
      <Route path="/approche" element={<ApprochePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/mentions-legales" element={<MentionsLegales />} />
      <Route path="/politique-de-confidentialite" element={<PolitiqueConfidentialite />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
