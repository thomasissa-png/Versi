import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import MentionsLegales from './pages/MentionsLegales.jsx';
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite.jsx';
import NotFound from './pages/NotFound.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/mentions-legales" element={<MentionsLegales />} />
      <Route path="/politique-de-confidentialite" element={<PolitiqueConfidentialite />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
