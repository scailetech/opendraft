// ABOUTME: Features section highlighting 8 key value propositions of OpenDraft
// ABOUTME: Grid layout showing features - AI agents, research, LLMs, citations, formatting, exports, tables/equations, cost

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    title: "19 Specialized AI Agents",
    description:
      "From Scout (research) to Enhancer (final polish), each agent is an expert in one specific phase of academic writing.",
    tooltip: "19 agents across 6 phases: Research (Scout, Scribe, Signal, Deep Research), Structure (Architect, Citation Manager, Formatter), Compose (Crafter, Narrator, Thread), Validate (Skeptic, Verifier, Referee), Refine (Voice, Entropy, Polish, Citation Verifier), Enhance (Enhancer, Abstract Generator). Mix and match based on your needs.",
  },
  {
    icon: "Database",
    title: "200M+ Research Papers",
    description:
      "70-84 queries per thesis across Semantic Scholar, CrossRef, arXiv, and PubMed. 300-600 sources screened per thesis.",
    tooltip: "Direct API integration with Semantic Scholar (200M+ papers), CrossRef (150M+ DOIs), arXiv, and PubMed. Each thesis generates 70-84 targeted queries, screening 300-600 sources to find 50+ high-quality citations.",
  },
  {
    icon: "Sparkles",
    title: "Multi-LLM Support",
    description:
      "Choose from Claude Sonnet 4.5, GPT-4o, or Gemini 2.5 Flash. Switch anytime based on your needs and budget.",
    tooltip: "Claude Sonnet 4.5 (best quality, ~-10), GPT-4o (balanced), or Gemini 2.5 Flash (fastest & cheapest, ~/bin/zsh.35-1). Easily switch LLMs in config without code changes.",
  },
  {
    icon: "FileCheck",
    title: "95%+ Citation Accuracy",
    description:
      "All citations validated against CrossRef and arXiv databases. Skeptic + Referee agents review academic quality.",
    tooltip: "Citations are database-validated during Phase 4 (Validate). Invalid citations are flagged and replaced. Skeptic agent challenges claims, Referee agent checks methodology.",
  },
  {
    icon: "FileText",
    title: "Academic Formatting",
    description:
      "IMRaD, IEEE, APA Style, or Chicago/Turabian. Proper section numbering, headings, and academic conventions.",
    tooltip: "Formatter agent applies your chosen academic format: IMRaD (science journals), IEEE (engineering), APA Style (social sciences), Chicago/Turabian (humanities). Includes proper front matter and structure.",
  },
  {
    icon: "Table2",
    title: "Tables & Equations",
    description:
      "LaTeX equations, data tables, figures, and comprehensive appendices. Multi-language caption support.",
    tooltip: "Enhancer agent adds 3-5 data tables, LaTeX equations, ASCII figures, and detailed appendices. Supports English, German, Spanish, and French table/figure captions.",
  },
  {
    icon: "Download",
    title: "Export-Ready Formats",
    description:
      "PDF (via LaTeX), Word (DOCX), and LaTeX source. APA, MLA, Chicago, or IEEE citation styles.",
    tooltip: "Export to publication-ready PDF, editable Word document, or LaTeX source. Choose from 4 citation styles. All exports include formatted bibliography and references.",
  },
  {
    icon: "DollarSign",
    title: "99% Cheaper & Faster",
    description:
      "20-25 minutes and - vs. 40-80 hours and ,000-,000 for professional writing services.",
    tooltip: "Gemini 2.5 Flash: ~-15 | Claude Sonnet 4.5: ~-35. Compare to professional editing (-2,000) or writing services (,000-5,000). Generate in 20-25 min vs. months of manual work.",
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
        research databases, and professional formatting to accelerate your academic writing.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {allFeatures.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
};
