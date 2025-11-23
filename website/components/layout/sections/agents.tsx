// ABOUTME: AI Agents & Architecture section showcasing 15 specialized agents using Accordion pattern
// ABOUTME: Accordion-based progressive disclosure for better UX - 5 phases with collapsible agent details

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  FileText,
  Lightbulb,
  BookMarked,
  Building2,
  Layout,
  Pencil,
  Link,
  MessageSquare,
  MessageCircleQuestion,
  ShieldCheck,
  Users,
  Mic,
  Shuffle,
  Sparkles,
  Database,
  Code,
  FileCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AgentProps {
  icon: LucideIcon;
  name: string;
  description: string;
  capability: string;
}

const researchAgents: AgentProps[] = [
  {
    icon: Search,
    name: "Scout Agent",
    description: "Research Discovery",
    capability: "Searches 225M+ academic papers across Semantic Scholar, CrossRef, and arXiv to find the most relevant research for your topic.",
  },
  {
    icon: FileText,
    name: "Scribe Agent",
    description: "Paper Summarization",
    capability: "Reads and summarizes research papers into structured notes, extracting key findings, methodologies, and arguments.",
  },
  {
    icon: Lightbulb,
    name: "Signal Agent",
    description: "Gap Analysis",
    capability: "Analyzes existing research to identify gaps, novel angles, and opportunities for original contribution to your field.",
  },
];

const structureAgents: AgentProps[] = [
  {
    icon: Building2,
    name: "Architect Agent",
    description: "Structure Design",
    capability: "Designs your thesis outline, argument flow, and chapter structure based on academic conventions and your research goals.",
  },
  {
    icon: BookMarked,
    name: "Citation Manager Agent",
    description: "Citation Extraction",
    capability: "Extracts all citations from research materials into a structured database for consistent reference management throughout the thesis.",
  },
  {
    icon: Layout,
    name: "Formatter Agent",
    description: "Style Compliance",
    capability: "Applies journal or institution formatting requirements (APA, MLA, Chicago, IEEE, or custom LaTeX templates).",
  },
];

const compositionAgents: AgentProps[] = [
  {
    icon: Pencil,
    name: "Crafter Agent",
    description: "Content Writing",
    capability: "Writes each section of your thesis with proper academic style, integrating citations and maintaining logical flow.",
  },
  {
    icon: Link,
    name: "Thread Agent",
    description: "Coherence Check",
    capability: "Ensures narrative consistency and logical connections between sections, chapters, and arguments throughout your thesis.",
  },
  {
    icon: MessageSquare,
    name: "Narrator Agent",
    description: "Voice Unification",
    capability: "Unifies writing style and tone across all sections to create a seamless, professional academic voice.",
  },
];

const validationAgents: AgentProps[] = [
  {
    icon: MessageCircleQuestion,
    name: "Skeptic Agent",
    description: "Argument Testing",
    capability: "Challenges weak arguments, identifies logical flaws, and suggests improvements to strengthen your thesis claims.",
  },
  {
    icon: ShieldCheck,
    name: "Verifier Agent",
    description: "Citation Verification",
    capability: "Fact-checks every citation against CrossRef and arXiv databases to ensure academic integrity and eliminate hallucinated references.",
  },
  {
    icon: Users,
    name: "Referee Agent",
    description: "Peer Review Simulation",
    capability: "Simulates the peer review process, identifying potential criticisms and areas needing additional evidence or clarification.",
  },
];

const refinementAgents: AgentProps[] = [
  {
    icon: Mic,
    name: "Voice Agent",
    description: "Style Matching",
    capability: "Analyzes and matches your personal writing style to make AI-generated content indistinguishable from your own work.",
  },
  {
    icon: Shuffle,
    name: "Entropy Agent",
    description: "Natural Variation",
    capability: "Adds natural linguistic variation to reduce AI detection scores while maintaining academic quality and coherence.",
  },
  {
    icon: Sparkles,
    name: "Polish Agent",
    description: "Final Refinement",
    capability: "Performs final grammar, spelling, punctuation, and flow improvements to ensure draft-quality output ready for human review.",
  },
  {
    icon: FileCheck,
    name: "Citation Compiler Agent",
    description: "Citation Formatting",
    capability: "Transforms citation IDs into formatted citations and generates the reference list using the specified citation style (APA, MLA, Chicago, IEEE).",
  },
  {
    icon: Sparkles,
    name: "Enhancer Agent",
    description: "Quality Enhancement",
    capability: "Elevates overall thesis quality through advanced linguistic improvements, clarity enhancements, and academic tone refinement.",
  },
];

interface PhaseProps {
  number: number;
  title: string;
  description: string;
  agents: AgentProps[];
}

const phases: PhaseProps[] = [
  {
    number: 1,
    title: "Research & Discovery",
    description: "Find, read, and analyze relevant academic literature from 225M+ papers",
    agents: researchAgents,
  },
  {
    number: 2,
    title: "Structure & Planning",
    description: "Organize research, design outline, and apply formatting standards",
    agents: structureAgents,
  },
  {
    number: 3,
    title: "Composition",
    description: "Write content, ensure coherence, and unify academic voice",
    agents: compositionAgents,
  },
  {
    number: 4,
    title: "Validation",
    description: "Challenge arguments, verify citations, and simulate peer review",
    agents: validationAgents,
  },
  {
    number: 5,
    title: "Refinement & Polish",
    description: "Match your style, add natural variation, perform final polish, and elevate overall quality",
    agents: refinementAgents,
  },
];

const AgentCard = ({ icon: Icon, name, description, capability }: AgentProps) => (
  <Card className="h-full bg-background border border-border/50 hover:border-border transition-colors">
    <CardHeader>
      <div className="flex items-start gap-3">
        <Icon
          size={18}
          className="text-muted-foreground mt-0.5"
        />
        <div className="flex-1">
          <CardTitle className="text-base font-medium mb-1">{name}</CardTitle>
          <CardDescription className="text-xs font-normal">
            {description}
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {capability}
      </p>
    </CardContent>
  </Card>
);

export const AgentsSection = () => {
  return (
    <section id="agents" className="container py-24 sm:py-32">
      <div className="mx-auto text-center mb-4">
        <p className="text-sm text-muted-foreground">
          17 Specialized AI Agents • 100% Open Source (MIT License)
        </p>
      </div>

      <h2 className="text-3xl md:text-5xl text-center font-semibold tracking-tight mb-4">
        5-Phase AI Workflow
      </h2>

      <p className="md:w-2/3 mx-auto text-base text-center text-muted-foreground mb-16 leading-relaxed">
        Each phase uses specialized AI agents that handle specific tasks—from literature discovery to final polish.
      </p>

      {/* Accordion-based phases */}
      <div className="max-w-5xl mx-auto mb-16">
        <Accordion type="multiple" defaultValue={["phase-1"]} className="space-y-4">
          {phases.map((phase) => (
            <AccordionItem key={phase.number} value={`phase-${phase.number}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4 text-left w-full">
                  {/* Phase number badge */}
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-accent text-accent-foreground font-semibold text-base shadow-sm">
                    {phase.number}
                  </div>

                  {/* Phase title and description */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-semibold mb-1">
                      {phase.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {phase.description}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                  {phase.agents.map((agent) => (
                    <AgentCard key={agent.name} {...agent} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Technical Capabilities */}
      <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <Card className="text-center bg-background">
          <CardHeader>
            <div className="mx-auto bg-accent/20 p-3 rounded-full w-fit mb-2">
              <Database size={24} className="text-accent" />
            </div>
            <CardTitle>225M+ Papers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Direct API integration with Semantic Scholar, CrossRef, and arXiv databases
            </p>
          </CardContent>
        </Card>

        <Card className="text-center bg-background">
          <CardHeader>
            <div className="mx-auto bg-accent/20 p-3 rounded-full w-fit mb-2">
              <ShieldCheck size={24} className="text-accent" />
            </div>
            <CardTitle>Citation Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Citations validated by AI agents against CrossRef and arXiv during Phase 4 validation
            </p>
          </CardContent>
        </Card>

        <Card className="text-center bg-background">
          <CardHeader>
            <div className="mx-auto bg-accent/20 p-3 rounded-full w-fit mb-2">
              <Code size={24} className="text-accent" />
            </div>
            <CardTitle>Open Source</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              MIT licensed GitHub repository. Inspect the code, modify it, contribute improvements, or fork for your needs
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
