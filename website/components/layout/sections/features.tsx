// ABOUTME: Features section highlighting 6 key value propositions of OpenDraft
// ABOUTME: Single grid layout showing all features - 15 AI agents, 200M+ papers, multi-LLM support, citation validation, exports, cost savings

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { icons } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface FeaturesProps {
  icon: string;
  title: string;
  description: string;
  tooltip: string;
}

const allFeatures: FeaturesProps[] = [
  {
    icon: "Bot",
    title: "15 Specialized AI Agents",
    description:
      "From Scout (research) to Enhancer (final polish), each agent is an expert in one specific phase of academic writing.",
    tooltip: "15 agents across 5 phases: Research (Scout, Scribe, Signal), Structure (Architect, Formatter), Compose (Crafter, Narrator, Thread), Validate (Skeptic, Verifier, Referee), Refine (Voice, Entropy, Polish, Enhancer).",
  },
  {
    icon: "Database",
    title: "225M+ Research Papers",
    description:
      "Integrated access to Semantic Scholar, CrossRef, and arXiv for comprehensive literature reviews.",
    tooltip: "Direct API integration with major academic databases: Semantic Scholar (225M+ papers as of May 2025), CrossRef (167M+ DOI records as of March 2025), and arXiv (2.4M+ preprints).",
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
    title: "Citation Quality Validation",
    description:
      "Verifier agent validates all citations against CrossRef and arXiv databases during the validation phase.",
    tooltip: "Citations are validated by specialized AI agents against CrossRef (DOI database) and arXiv (preprints) during Phase 4 validation. Invalid or low-quality citations are flagged for review.",
  },
  {
    icon: "FileText",
    title: "Export-Ready Draft Formats",
    description:
      "Export to PDF, Word, or LaTeX with proper formatting. Professional styling with citations and bibliography included.",
    tooltip: "Generates formatted PDF (via LaTeX), DOCX (Microsoft Word), and .tex files with academic styling, citations, and bibliography. Human review recommended before submission.",
  },
  {
    icon: "DollarSign",
    title: "99%+ Cheaper Than Professional Writing",
    description:
      "Generate a 20k-word thesis draft for $0.35-$10 in API costs (depending on model and iterations) vs $1,000-$5,000 for professional writing services.",
    tooltip: "Cost estimate based on API pricing: Gemini 2.5 Flash $0.35-$1, Gemini 2.5 Pro $1-$3, Claude Sonnet 4.5 $3-$10 for 20k+ word draft vs $1,000-$5,000 for hiring professional writers. Costs vary based on iterations and complexity. Additional editing recommended.",
  },
];

const FeatureCard = ({ icon, title, description, tooltip }: FeaturesProps) => (
  <Card className="h-full bg-background border border-border/50 hover:border-border hover:shadow-md transition-all duration-cursor">
    <CardHeader className="flex justify-center items-center space-y-4">
      <Icon
        name={icon as keyof typeof icons}
        size={24}
        color="currentColor"
        className="text-accent"
      />
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
      <h2 className="text-lg text-primary text-center mb-2 tracking-wider">
        Features
      </h2>

      <h2 className="text-3xl md:text-4xl text-center font-semibold mb-4">
        Everything You Need for Academic Writing
      </h2>

      <p className="md:w-2/3 mx-auto text-base text-center text-muted-foreground mb-12 leading-relaxed">
        From literature review to export-ready drafts, OpenDraft provides specialized agents,
        research databases, and export tools to accelerate your academic writing.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {allFeatures.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
};
