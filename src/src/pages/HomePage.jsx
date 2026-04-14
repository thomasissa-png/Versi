import Nav from '../components/Nav.jsx';
import Hero from '../components/Hero.jsx';
import Mission from '../components/Mission.jsx';
import Activities from '../components/Activities.jsx';
import Approach from '../components/Approach.jsx';
import Location from '../components/Location.jsx';
import Team from '../components/Team.jsx';
import Contact from '../components/Contact.jsx';
import FAQ from '../components/FAQ.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';

export default function HomePage() {
  return (
    <>
      <PageHead
        title="Versi — Holding immobilière | Paris et Lille"
        description="Versi regroupe 4 entités couvrant le cycle complet d'une opération immobilière : acquisition, transformation, détention, structuration."
      />
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content">
        <Hero />
        <Mission />
        <Activities />
        <Approach />
        <Location />
        <Team />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
