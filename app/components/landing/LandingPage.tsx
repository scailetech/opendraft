// ABOUTME: Main landing page component for AEO Visibility
// ABOUTME: Composes all landing sections in order with navbar

import { Navbar } from "./sections/navbar";
import { HeroSection } from "./sections/hero";
import { FeaturesSection } from "./sections/features";
import { HowItWorksSection } from "./sections/how-it-works";
import { UseCasesSection } from "./sections/use-cases";
import { FAQSection } from "./sections/faq";
import { CTASection } from "./sections/cta";
import { FooterSection } from "./sections/footer";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <UseCasesSection />
      <FAQSection />
      <CTASection />
      <FooterSection />
    </main>
  );
}
