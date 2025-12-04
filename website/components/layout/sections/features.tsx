// ABOUTME: Features section highlighting 8 key value propositions of OpenDraft
// ABOUTME: Enhanced grid with badges, gradient text, and hover effects

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { icons } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Sparkles } from "lucide-react";

interface FeaturesProps {
  icon: string;
  title: string;
  description: string;
  tooltip: string;
}

const allFeatures: FeaturesProps[] = [
  {
    icon: "Bot",
    title: "19 Specialized AI Agents",
    description:
      "From Scout (research) to Enhancer (final polish), each agent is an expert in one specific phase of academic writing.",
    tooltip: "19 agents across 6 phases: Research (Deep Research, Scout, Scribe, Signal), Structure (Architect, Citation Manager, Formatter), Compose (Crafter, Narrator, Thread), Validate (Skeptic, Verifier, Referee), Refine (Citation Verifier, Voice, Entropy, Polish), Enhance (Abstract Generator, Enhancer).",
  },
  {
    icon: "Database",
    title: "200M+ Research Papers",
    description:
      "Integrated access to arXiv, Semantic Scholar, PubMed, and Google Scholar for comprehensive literature reviews.",
    tooltip: "Direct API integration with major academic databases: arXiv (physics/CS), Semantic Scholar (interdisciplinary), PubMed (biomedical), and Google Scholar (all fields).",
  },
  {
    icon: "Sparkles",
    title: "Multi-LLM Support",
    description:
      "Choose from Claude Sonnet 4.5, GPT-4o, or Gemini 2.5 Flash. Switch anytime based on your needs and budget.",
    tooltip: "Claude Sonnet 4.5 (best quality), GPT-4o (balanced), or Gemini 2.5 Flash (fastest & cheapest). Easily switch LLMs in config without code changes.",
  },
  {
    icon: "FileCheck",
    title: "Auto Citation Verification",
    description:
      "Verifier agent fact-checks all citations against CrossRef and arXiv to ensure academic integrity.",
    tooltip: "Every citation is automatically verified against CrossRef (DOI database) and arXiv (preprints). Invalid or hallucinated citations are flagged for your review.",
  },
  {
    icon: "FileText",
    title: "Publication-Ready Exports",
    description:
      "Export to PDF, Word, or LaTeX with proper formatting for journal submission. One-click professional quality.",
    tooltip: "Automatically generates formatted PDF (via LaTeX), DOCX (Microsoft Word), and .tex files with proper academic styling, citations, and bibliography.",
  },
  {
    icon: "DollarSign",
    title: "95% Cheaper Than Editing",
    description:
      "Write a 20k-word master's thesis for $10-50 vs $400-2,000 for professional editing services.",
    tooltip: "Cost estimate based on API pricing: ~$10-50 for a complete thesis (20k+ words) vs $400-2,000 for professional academic editing services.",
  },
  {
    icon: "BookOpen",
    title: "Academic Formatting",
    description:
      "Support for IMRaD, IEEE, APA Style, and Chicago/Turabian. Citation styles: APA, MLA, Chicago, IEEE.",
    tooltip: "Full support for major academic formats: IMRaD (scientific papers), IEEE (technical), APA Style (social sciences), Chicago/Turabian (humanities). Auto-generates bibliography in your preferred citation style.",
  },
  {
    icon: "Table",
    title: "Tables & Equations",
    description:
      "LaTeX math rendering, data tables, figures, and appendices. Complete academic document support.",
    tooltip: "Native LaTeX support for mathematical equations, statistical tables, data visualizations. Properly formatted appendices, lists of figures/tables, and supplementary materials.",
  },
];

const FeatureCard = ({ icon, title, description, tooltip }: FeaturesProps) => (
  <Card className="h-full bg-background border border-border/50 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 group">
    <CardHeader className="flex justify-center items-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
        <Icon
          name={icon as keyof typeof icons}
          size={24}
          color="currentColor"
          className="text-accent"
        />
      </div>
      <div className="flex items-center gap-2 justify-center">
        <CardTitle className="text-lg font-medium text-center">
          {title}
        </CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="size-4 text-accent/70 hover:text-accent cursor-help transition-colors" aria-label="More information" />
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p className="text-sm">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </CardHeader>
    <CardContent className="text-muted-foreground text-center text-sm leading-relaxed">
      {description}
    </CardContent>
  </Card>
);

export const FeaturesSection = () => {
  return (
    <section id="features" className="container py-24 sm:py-32">
      {/* Badge */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-accent">Powerful Features</span>
        </div>
      </div>

      {/* Heading with gradient */}
      <h2 className="text-3xl md:text-4xl text-center font-semibold mb-4">
        Everything You Need for{" "}
        <span className="bg-gradient-to-r from-accent to-emerald-400 bg-clip-text text-transparent">
          Academic Writing
        </span>
      </h2>

      <p className="md:w-2/3 mx-auto text-base text-center text-muted-foreground mb-12 leading-relaxed">
        From literature review to publication-ready papers, OpenDraft provides specialized agents,
        research databases, and export tools to accelerate your academic writing.
      </p>

      {/* Feature grid with subtle category divider */}
      <div className="max-w-6xl mx-auto">
        {/* First row: AI & Research */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {allFeatures.slice(0, 4).map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>

        {/* Second row: Output & Quality */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {allFeatures.slice(4).map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};
