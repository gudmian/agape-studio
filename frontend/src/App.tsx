import { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/sections/HeroSection';
import { PortfolioSection } from './components/sections/PortfolioSection';
import { ServicesSection } from './components/sections/ServicesSection';
import { ProcessSection } from './components/sections/ProcessSection';
import { ContactSection } from './components/sections/ContactSection';
import { SiteContentProvider } from './content/SiteContentProvider';
import { useSiteContent } from './content/siteContentContext';

function SiteMetadata() {
  const { meta } = useSiteContent();

  useEffect(() => {
    document.title = meta.title;
    const existingDescriptionTag = document.querySelector('meta[name="description"]');
    if (existingDescriptionTag) {
      existingDescriptionTag.setAttribute('content', meta.description);
      return;
    }

    const descriptionTag = document.createElement('meta');
    descriptionTag.setAttribute('name', 'description');
    descriptionTag.setAttribute('content', meta.description);
    document.head.appendChild(descriptionTag);
  }, [meta.description, meta.title]);

  return null;
}

export default function App() {
  return (
    <SiteContentProvider>
      <SiteMetadata />
      <Header />
      <main>
        <HeroSection />
        <PortfolioSection />
        <ServicesSection />
        <ProcessSection />
        <ContactSection />
      </main>
      <Footer />
    </SiteContentProvider>
  );
}
