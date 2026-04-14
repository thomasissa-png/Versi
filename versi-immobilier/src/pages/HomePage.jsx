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
        description="21 appartements rénovés et vendus en direct à Lille depuis 2022. Zéro frais d'agence, diagnostics inclus, garantie décennale. 3,2M€ de volume traité."
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
