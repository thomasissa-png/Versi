import { Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import HomePage from './pages/HomePage.jsx';
import PropertiesPage from './pages/PropertiesPage.jsx';
import PropertyDetailPage from './pages/PropertyDetailPage.jsx';
import SellPage from './pages/SellPage.jsx';
import RealisationsPage from './pages/RealisationsPage.jsx';
import RealisationDetailPage from './pages/RealisationDetailPage.jsx';
import InvestirPage from './pages/InvestirPage.jsx';
import ApprochePage from './pages/ApprochePage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import MentionsLegales from './pages/MentionsLegales.jsx';
import NotFound from './pages/NotFound.jsx';

import AdminLogin from './admin/AdminLogin.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import AdminBiens from './admin/AdminBiens.jsx';
import AdminBienForm from './admin/AdminBienForm.jsx';
import AdminRealisations from './admin/AdminRealisations.jsx';
import AdminRealisationForm from './admin/AdminRealisationForm.jsx';
import AdminInscrits from './admin/AdminInscrits.jsx';
import ProtectedRoute from './admin/ProtectedRoute.jsx';

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/nos-biens" element={<PropertiesPage />} />
        <Route path="/nos-biens/:id" element={<PropertyDetailPage />} />
        <Route path="/vendre" element={<SellPage />} />
        <Route path="/realisations" element={<RealisationsPage />} />
        <Route path="/realisations/:id" element={<RealisationDetailPage />} />
        <Route path="/investir" element={<InvestirPage />} />
        <Route path="/notre-approche" element={<ApprochePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="biens" replace />} />
          <Route path="biens" element={<AdminBiens />} />
          <Route path="biens/nouveau" element={<AdminBienForm />} />
          <Route path="biens/:id/editer" element={<AdminBienForm />} />
          <Route path="realisations" element={<AdminRealisations />} />
          <Route path="realisations/nouveau" element={<AdminRealisationForm />} />
          <Route path="realisations/:id/editer" element={<AdminRealisationForm />} />
          <Route path="inscrits" element={<AdminInscrits />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
