import Nav from '../components/Nav.jsx';
import Hero from '../components/Hero.jsx';
import AvailableProperties from '../components/AvailableProperties.jsx';
import Arguments from '../components/Arguments.jsx';
import Stats from '../components/Stats.jsx';
import TeamTeaser from '../components/TeamTeaser.jsx';
import SellerBanner from '../components/SellerBanner.jsx';
import Footer from '../components/Footer.jsx';

export default function HomePage() {
  return (
    <>
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content">
        <Hero />
        <AvailableProperties />
        <Arguments />
        <Stats />
        <TeamTeaser />
        <SellerBanner />
      </main>
      <Footer />
    </>
  );
}
