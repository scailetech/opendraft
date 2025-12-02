// ABOUTME: Main landing page for OpenDraft
// ABOUTME: Section order: Hero → Examples → Features → AI Agents → Comparison → How It Works → Community → FAQ → Footer

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
  title: "OpenDraft - Free AI Thesis Writing Tool | Generate Drafts in Minutes",
  description: "Free open-source AI thesis writing tool with 19 specialized agents. Generate master's thesis, PhD dissertation & research papers in 20-30 minutes. Database-validated citations from 200M+ academic papers. See our real 104-page, 30,000+ word example.",
  keywords: "thesis writing AI, academic thesis generator, AI thesis assistant, free thesis tool, dissertation AI, research paper generator, master thesis AI",
  openGraph: {
    type: "website",
    url: "https://opendraft-landing.vercel.app",
    title: "OpenDraft - Free AI Thesis Writing Tool",
    description: "Free open-source AI tool with 19 specialized agents. Generate 20k-word thesis drafts in 20-30 minutes with database-validated citations from 200M+ papers. See our real 104-page master's thesis example. FREE tier available.",
    images: [
      {
        url: "https://opendraft-landing.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpenDraft - Free AI Thesis Writing Tool with 15 Specialized Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@AcademicThesisAI",
    title: "OpenDraft - Free AI Thesis Writing Tool",
    description: "Free open-source AI thesis writing tool. 19 AI agents, 200M+ papers, database-validated citations. Generate drafts in minutes. See our 104-page example.",
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
