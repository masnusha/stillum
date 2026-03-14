import LandingHeader  from "./(marketing)/_components/LandingHeader";
import StickyBanner   from "./(marketing)/_components/StickyBanner";
import HeroSection    from "./(marketing)/_components/HeroSection";
import PricingSection from "./(marketing)/_components/PricingSection";
import WaveSection    from "./(marketing)/_components/WaveSection";
import FeaturesSection  from "./(marketing)/_components/FeaturesSection";
import CreatorsSection  from "./(marketing)/_components/CreatorsSection";
import FAQSection       from "./(marketing)/_components/FAQSection";
import Footer           from "./(marketing)/_components/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">

      <LandingHeader />
      <StickyBanner />

      <main className="bg-[#030712] relative overflow-hidden">
        <HeroSection />
        <WaveSection />
        <FeaturesSection />
        <PricingSection />
        <CreatorsSection />
        <FAQSection />
      </main>

      <Footer />

    </div>
  );
}
