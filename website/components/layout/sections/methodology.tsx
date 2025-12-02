// ABOUTME: Methodology section showing research pipeline and quality metrics
// ABOUTME: Visual funnel (sources → screened → validated → final) + stats badges + capabilities grid

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  CheckCircle2,
  FileCheck,
  ArrowRight,
  Database,
  FileText,
  Table2,
  Calculator,
  Globe,
  type LucideIcon,
} from "lucide-react";

interface FunnelStep {
  icon: LucideIcon;
  count: string;
  label: string;
  description: string;
}

interface StatBadge {
  value: string;
  label: string;
}

interface Capability {
  icon: LucideIcon;
  title: string;
  items: string[];
}

const funnelSteps: FunnelStep[] = [
  {
    icon: Search,
    count: "600+",
    label: "Sources Found",
    description: "70-84 queries across databases",
  },
  {
    icon: Filter,
    count: "200+",
    label: "Screened",
    description: "Relevance & quality filtering",
  },
  {
    icon: CheckCircle2,
    count: "80+",
    label: "Validated",
    description: "Database-verified citations",
  },
  {
    icon: FileCheck,
    count: "50+",
    label: "Final Citations",
    description: "In your thesis",
  },
];

const statBadges: StatBadge[] = [
  { value: "95%+", label: "Citation Accuracy" },
  { value: "70-84", label: "Queries per Thesis" },
  { value: "200M+", label: "Papers Accessible" },
  { value: "6", label: "Quality Phases" },
];

const capabilities: Capability[] = [
  {
    icon: FileText,
    title: "Export Formats",
    items: ["PDF (LaTeX)", "Word (DOCX)", "LaTeX Source"],
  },
  {
    icon: Database,
    title: "Citation Styles",
    items: ["APA", "MLA", "Chicago", "IEEE"],
  },
  {
    icon: Table2,
    title: "Visual Elements",
    items: ["Data Tables", "Figures", "Appendices"],
  },
  {
    icon: Calculator,
    title: "Academic Features",
    items: ["LaTeX Equations", "Numbered Sections", "Bibliography"],
  },
  {
    icon: Globe,
    title: "Formats Supported",
    items: ["IMRaD", "IEEE", "APA Style", "Chicago"],
  },
];

export const MethodologySection = () => {
  return (
    <section id="methodology" className="container py-24 sm:py-32">
      <div className="text-center mb-12">
        <h2 className="text-lg text-primary text-center mb-2 tracking-wider">
          Research Methodology
        </h2>

        <h2 className="text-3xl md:text-4xl text-center font-bold mb-4">
          How We Find & Validate Sources
        </h2>

        <p className="md:w-2/3 mx-auto text-base text-center text-muted-foreground">
          Every thesis goes through a rigorous 6-phase pipeline: Research → Structure → Compose → Validate → Refine → Enhance. Here&apos;s our source screening process.
        </p>
      </div>

      {/* Research Funnel */}
      <div className="max-w-5xl mx-auto mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-2">
          {funnelSteps.map((step, index) => (
            <div key={step.label} className="relative flex flex-col items-center">
              <Card className="w-full bg-gradient-to-b from-background to-muted/30 border-2 border-primary/20 hover:border-primary/50 transition-colors">
                <CardContent className="pt-6 pb-4 text-center">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <step.icon className="size-6 text-primary" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                    {step.count}
                  </div>
                  <div className="font-semibold text-sm mb-1">{step.label}</div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </CardContent>
              </Card>
              {index < funnelSteps.length - 1 && (
                <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 size-6 text-primary/50 z-10" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats Badges */}
      <div className="flex flex-wrap justify-center gap-4 mb-16">
        {statBadges.map((stat) => (
          <Badge
            key={stat.label}
            variant="outline"
            className="px-4 py-2 text-base bg-muted/50 hover:bg-muted transition-colors"
          >
            <span className="font-bold text-primary mr-2">{stat.value}</span>
            <span className="text-muted-foreground">{stat.label}</span>
          </Badge>
        ))}
      </div>

      {/* Capabilities Grid */}
      <div className="max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-center mb-6">
          Output Capabilities
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {capabilities.map((cap) => (
            <Card key={cap.title} className="bg-muted/30 border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <cap.icon className="size-4 text-primary" />
                  <span className="text-sm font-medium">{cap.title}</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {cap.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
