import Nav from '../components/Nav.jsx';
import Hero from '../components/Hero.jsx';
import Stats from '../components/Stats.jsx';
import FeaturedProjects from '../components/FeaturedProjects.jsx';
import Process from '../components/Process.jsx';
import SellerBanner from '../components/SellerBanner.jsx';
import Testimonials from '../components/Testimonials.jsx';
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
        <Stats />
        <FeaturedProjects />
        <Process />
        <SellerBanner />
        <Testimonials />
      </main>
      <Footer />
    </>
  );
}
