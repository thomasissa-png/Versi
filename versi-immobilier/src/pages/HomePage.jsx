import Nav from '../components/Nav.jsx';
import Hero from '../components/Hero.jsx';
import AvailableProperties from '../components/AvailableProperties.jsx';
import Arguments from '../components/Arguments.jsx';
import BuyerFAQ from '../components/BuyerFAQ.jsx';
import Stats from '../components/Stats.jsx';
import TeamTeaser from '../components/TeamTeaser.jsx';
import BlogTeaser from '../components/BlogTeaser.jsx';
import SellerBanner from '../components/SellerBanner.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';

export default function HomePage() {
  return (
    <>
      <PageHead
        title="Versi Immobilier — Appartements rénovés à vendre, Lille et Hauts-de-France"
        description="Des appartements sélectionnés, rénovés et vendus en direct par un marchand de biens. Dossier complet avant visite. Lille et Hauts-de-France."
      />
      <a href="#main-content" className="skip-nav">
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content">
        <Hero />
        <Arguments />
        <BuyerFAQ />
        <AvailableProperties />
        <Stats />
        <TeamTeaser />
        <BlogTeaser />
        <SellerBanner />
      </main>
      <Footer />
    </>
  );
}
