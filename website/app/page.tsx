// ABOUTME: Main landing page for OpenDraft
// ABOUTME: Section order: Hero → Examples → Features → AI Agents → Comparison → How It Works → Waitlist CTA → Community → FAQ → Footer

import { ComparisonSection } from "@/components/layout/sections/comparison";
import { FAQSection } from "@/components/layout/sections/faq";
import { FeaturesSection } from "@/components/layout/sections/features";
import { FooterSection } from "@/components/layout/sections/footer";
import { HeroSection } from "@/components/layout/sections/hero";
import { HowItWorksSection } from "@/components/layout/sections/how-it-works";
import { AgentsSection } from "@/components/layout/sections/agents";
import { CommunitySection } from "@/components/layout/sections/testimonial";
import { TrustSection } from "@/components/layout/sections/trust";
import { ExamplesSection } from "@/components/layout/sections/examples";
import { WaitlistCTASection } from "@/components/layout/sections/waitlist-cta";

export const metadata = {
  title: "OpenDraft - Free AI Thesis Writing Tool | 95%+ Citation Accuracy",
  description: "Free open-source AI thesis writing tool with 19 specialized agents. 95%+ citation accuracy via CrossRef verification. Export to PDF, LaTeX, Word. Supports APA, MLA, Chicago, IEEE citation styles. Generate master's thesis & PhD dissertations 10x faster.",
  keywords: "AI thesis writing, academic writing tool, citation verification, LaTeX export, APA citation, MLA citation, Chicago citation, IEEE citation, thesis generator, dissertation writing, research paper AI, academic formatting",
};

export default function Home() {
  return (
    <>
      <HeroSection />
      <ExamplesSection />
      <TrustSection />
      <FeaturesSection />
      <AgentsSection />
      <ComparisonSection />
      <HowItWorksSection />
      <WaitlistCTASection />
      <CommunitySection />
      <FAQSection />
      <FooterSection />
    </>
  );
}
