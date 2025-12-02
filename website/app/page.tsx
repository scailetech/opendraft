// ABOUTME: Main landing page for OpenDraft
// ABOUTME: Section order: Hero → Examples → Trust → Features → Methodology → Agents → Comparison → How It Works → Waitlist → Community → FAQ → Footer

import { ComparisonSection } from "@/components/layout/sections/comparison";
import { FAQSection } from "@/components/layout/sections/faq";
import { FeaturesSection } from "@/components/layout/sections/features";
import { FooterSection } from "@/components/layout/sections/footer";
import { HeroSection } from "@/components/layout/sections/hero";
import { HowItWorksSection } from "@/components/layout/sections/how-it-works";
import { MethodologySection } from "@/components/layout/sections/methodology";
import { AgentsSection } from "@/components/layout/sections/agents";
import { CommunitySection } from "@/components/layout/sections/testimonial";
import { TrustSection } from "@/components/layout/sections/trust";
import { ExamplesSection } from "@/components/layout/sections/examples";
import { WaitlistCTASection } from "@/components/layout/sections/waitlist-cta";

export const metadata = {
  title: "OpenDraft - Free AI Thesis Writing Tool | Generate Drafts in Minutes",
  description: "Free open-source AI thesis writing tool with 19 specialized agents. Generate master's thesis, PhD dissertation & research papers in 20-25 minutes. 95%+ citation accuracy from 200M+ academic papers. See our real 104-page, 27,500+ word example.",
  keywords: "thesis writing AI, academic thesis generator, AI thesis assistant, free thesis tool, dissertation AI, research paper generator, master thesis AI, LaTeX thesis, academic formatting",
  openGraph: {
    type: "website",
    url: "https://opendraft-landing.vercel.app",
    title: "OpenDraft - Free AI Thesis Writing Tool",
    description: "Free open-source AI tool with 19 specialized agents. Generate 20k-word thesis drafts in 20-25 minutes with 95%+ citation accuracy from 200M+ papers. Export to PDF, Word, LaTeX with APA/MLA/Chicago/IEEE styles.",
    images: [
      {
        url: "https://opendraft-landing.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpenDraft - Free AI Thesis Writing Tool with 19 Specialized Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: undefined,
    title: "OpenDraft - Free AI Thesis Writing Tool",
    description: "Free open-source AI thesis writing tool. 19 AI agents, 200M+ papers, 95%+ citation accuracy. Export to PDF/Word/LaTeX. See our 104-page example.",
    images: [
      "https://opendraft-landing.vercel.app/og-image.png",
    ],
  },
};

export default function Home() {
  return (
    <>
      <HeroSection />
      <ExamplesSection />
      <TrustSection />
      <FeaturesSection />
      <MethodologySection />
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
