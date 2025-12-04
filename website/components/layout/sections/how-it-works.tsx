// ABOUTME: How It Works - card-based design with icons
// ABOUTME: Visual step progression with connectors

import { Settings, Sliders, Sparkles, Download, ArrowRight } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: Settings,
    title: "Setup",
    time: "10 min",
    desc: "Clone the repo, install dependencies, and add your API key.",
    details: ["Git clone", "npm install", "Add API key"],
  },
  {
    num: "02",
    icon: Sliders,
    title: "Configure",
    time: "2 min",
    desc: "Choose your AI model and customize agent settings.",
    details: ["Pick LLM", "Set topic", "Choose format"],
  },
  {
    num: "03",
    icon: Sparkles,
    title: "Generate",
    time: "15-25 min",
    desc: "AI researches, writes, and verifies citations automatically.",
    details: ["70-84 queries", "600+ sources", "50+ citations"],
  },
  {
    num: "04",
    icon: Download,
    title: "Export",
    time: "5 min",
    desc: "Review your thesis and export to PDF, Word, or LaTeX.",
    details: ["Review draft", "Make edits", "Download files"],
  },
];

export const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 sm:py-32 border-t border-border/50">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-medium text-accent mb-3">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Four simple steps
          </h2>
          <p className="text-muted-foreground">
            No coding experience required. From setup to thesis in under an hour.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={step.num} className="relative">
                {/* Connector arrow */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-12 -right-3 z-10">
                    <ArrowRight className="w-6 h-6 text-border" />
                  </div>
                )}

                {/* Card */}
                <div className="bg-card border border-border rounded-xl p-6 h-full hover:border-accent/50 transition-colors">
                  {/* Icon and number */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-accent" />
                    </div>
                    <span className="font-mono text-2xl font-bold text-muted-foreground/30">
                      {step.num}
                    </span>
                  </div>

                  {/* Title and time */}
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-mono">
                      {step.time}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-4">{step.desc}</p>

                  {/* Details list */}
                  <ul className="space-y-1">
                    {step.details.map((detail) => (
                      <li key={detail} className="text-xs text-muted-foreground flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-accent" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total time */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-accent/10 border border-accent/20">
            <span className="text-sm text-muted-foreground">Total time:</span>
            <span className="font-mono text-lg font-semibold text-accent">~45 minutes</span>
            <span className="text-sm text-muted-foreground">for a complete thesis draft</span>
          </div>
        </div>
      </div>
    </section>
  );
};
